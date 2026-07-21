import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // Get Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.substring(7);

    // Verify user and check staff role
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check if user has staff role
    const { data: employee } = await supabase
      .from("employees")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!employee || employee.role !== "staff") {
      return new Response(
        JSON.stringify({
          error: "Only staff members can regenerate machine secrets",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { machine_id, reason } = await req.json();

    if (!machine_id || !reason) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: machine_id, reason",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify machine exists
    const { data: machine, error: machineError } = await supabase
      .from("machines")
      .select("id, serial_number, device_secret_hash")
      .eq("id", machine_id)
      .single();

    if (machineError || !machine) {
      return new Response(
        JSON.stringify({ error: "Machine not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Generate new 32-byte random secret
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const deviceSecret = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Hash the new secret with bcrypt (salt rounds: 12)
    const deviceSecretHash = await bcrypt.hash(deviceSecret, 12);

    // Update machine with new secret hash
    const { error: updateError } = await supabase
      .from("machines")
      .update({
        device_secret_hash: deviceSecretHash,
        device_provisioned_at: new Date().toISOString(),
        device_provisioned_by: user.id,
      })
      .eq("id", machine_id);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update machine" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Return new secret (only shown once)
    return new Response(
      JSON.stringify({
        success: true,
        machine_id,
        serial_number: machine.serial_number,
        device_secret: deviceSecret,
        regenerated_at: new Date().toISOString(),
        reason,
        ingest_host: Deno.env.get("INGEST_HOST") || "https://your-project.supabase.co",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
