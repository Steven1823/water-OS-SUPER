// Supabase Edge Function: ingest-reading
//
// This is the single HTTP endpoint every water machine calls (over
// cellular/NB-IoT) to report how much water it has dispensed.
//
// Deploy:
//   supabase functions deploy ingest-reading
//
// Device calls:
//   POST https://<project-ref>.functions.supabase.co/ingest-reading
//   Headers: x-device-key: <serial_number>:<device_secret>
//   Body (JSON): see `Payload` type below
//
// Authentication: Each machine has a unique per-machine device secret
// generated during provisioning (via provision-machine function). The
// secret is hashed with bcrypt and stored in device_secret_hash.
// This function verifies the plaintext secret against the hash.
//
// Why an Edge Function instead of letting devices talk to Postgres
// directly: it lets us (a) authenticate devices without giving them
// the Supabase service key, (b) compute the "liters since last
// report" delta server-side so a compromised/buggy device can't
// forge sales totals, and (c) fan out alerts (low tank, offline).

import { createClient } from "npm:@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface Payload {
  serial_number: string;
  liters_dispensed_total: number; // lifetime counter from the pulse-counter
  tank_level_percent?: number;
  flow_rate_lpm?: number;
  battery_voltage?: number;
  signal_rssi?: number;
  amount_paid?: number;
  payment_method?: string;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const supabase = createClient(supabaseUrl, serviceKey);

    // --- Authenticate the device using per-machine secret ---------------
    const authHeader = req.headers.get("x-device-key") ?? "";
    const [serial, providedSecret] = authHeader.split(":");

    if (!serial || !providedSecret) {
      return new Response(
        JSON.stringify({ error: "Missing or malformed x-device-key header" }),
        { status: 401, headers: { "content-type": "application/json" } }
      );
    }

    // --- Look up the machine and verify secret ----------------------------
    const { data: machine, error: machineErr } = await supabase
      .from("machines")
      .select("id, tank_capacity_liters, device_secret_hash, status")
      .eq("serial_number", serial)
      .single();

    if (machineErr || !machine) {
      return new Response(JSON.stringify({ error: "Unknown device" }), {
        status: 404,
        headers: { "content-type": "application/json" },
      });
    }

    // Verify the provided secret against the bcrypt hash
    const secretValid = await bcrypt.compare(
      providedSecret,
      machine.device_secret_hash || ""
    );

    if (!secretValid) {
      return new Response(JSON.stringify({ error: "Invalid device secret" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    }

    // Reject if machine is not in active or connected state
    if (machine.status !== "active" && machine.status !== "connected") {
      return new Response(
        JSON.stringify({
          error: `Device is in ${machine.status} state. Operator must activate it first.`,
        }),
        { status: 403, headers: { "content-type": "application/json" } }
      );
    }

    const payload = (await req.json()) as Payload;
    if (payload.serial_number !== serial) {
      return new Response(JSON.stringify({ error: "Serial number mismatch" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }

  // --- Compute delta since last reading -------------------------------
  const { data: lastReading } = await supabase
    .from("readings")
    .select("liters_dispensed_total")
    .eq("machine_id", machine.id)
    .order("reported_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previousTotal = lastReading?.liters_dispensed_total ?? payload.liters_dispensed_total;
  let delta = payload.liters_dispensed_total - previousTotal;
  // Guard against counter resets / rollovers (treat as 0 delta, flag for review)
  if (delta < 0) delta = 0;

  // --- Insert the raw reading -----------------------------------------
  const { data: reading, error: readingErr } = await supabase
    .from("readings")
    .insert({
      machine_id: machine.id,
      liters_dispensed_total: payload.liters_dispensed_total,
      liters_since_last_report: delta,
      tank_level_percent: payload.tank_level_percent,
      flow_rate_lpm: payload.flow_rate_lpm,
      battery_voltage: payload.battery_voltage,
      signal_rssi: payload.signal_rssi,
    })
    .select()
    .single();

  if (readingErr) {
    return new Response(JSON.stringify({ error: readingErr.message }), {
      status: 500,
    });
  }

  // --- Record the sale, if any water was actually dispensed -----------
  if (delta > 0) {
    await supabase.from("sales").insert({
      machine_id: machine.id,
      liters: delta,
      amount_paid: payload.amount_paid ?? null,
      payment_method: payload.payment_method ?? null,
      reading_id: reading.id,
    });
  }

    // --- Update machine status / heartbeat + flip to connected if first reading
    await supabase
      .from("machines")
      .update({
        status: machine.status === "offline" ? "connected" : machine.status,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", machine.id);

    // --- Low tank alert --------------------------------------------------
    if (
      payload.tank_level_percent !== undefined &&
      payload.tank_level_percent < 15
    ) {
      await supabase.from("alerts").insert({
        machine_id: machine.id,
        type: "low_tank",
        message: `Tank at ${payload.tank_level_percent}%`,
      });
    }

    return new Response(
      JSON.stringify({ ok: true, liters_recorded: delta }),
      {
        status: 200,
        headers: { "content-type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Ingest error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }
});
