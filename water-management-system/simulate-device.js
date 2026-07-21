#!/usr/bin/env node
/**
 * Hardware Integration Test Script
 * Simulates water machine devices sending readings to the Supabase Edge Function
 * 
 * Usage:
 *   node simulate-device.js --machine-id WM-0001 --liters 100 --tank 50
 *   node simulate-device.js --continuous (runs every 15 seconds)
 */

const https = require("https");
const http = require("http");

// Configuration - UPDATE THESE
const SUPABASE_PROJECT_REF = "your-project-ref"; // e.g., "eabcdefghijklmno"
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";
const DEVICE_SHARED_SECRET = process.env.DEVICE_SHARED_SECRET || "your-long-random-string";
const INGEST_HOST = `${SUPABASE_PROJECT_REF}.functions.supabase.co`;
const INGEST_PATH = "/functions/v1/ingest-reading";

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultVal) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : defaultVal;
};

const machineId = getArg("machine-id", "WM-0001");
const initialLiters = parseFloat(getArg("liters", "1000.5"));
const tankLevel = parseFloat(getArg("tank", "75"));
const isContinuous = args.includes("--continuous");

let currentLitersTotal = initialLiters;

// Simulate a device reading
function generateReading() {
  // Simulate selling 5-20 liters per report
  const litersSinceLast = Math.random() * 15 + 5;
  currentLitersTotal += litersSinceLast;

  return {
    serial_number: machineId,
    liters_dispensed_total: parseFloat(currentLitersTotal.toFixed(2)),
    tank_level_percent: tankLevel + (Math.random() - 0.5) * 5, // small variation
    battery_voltage: 12.8 + (Math.random() - 0.5) * 0.5,
    signal_rssi: -80 - Math.floor(Math.random() * 20),
  };
}

// Send reading to Edge Function
async function sendReading(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const authHeader = `${payload.serial_number}:${DEVICE_SHARED_SECRET}`;

    const options = {
      hostname: INGEST_HOST,
      path: INGEST_PATH,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
        "x-device-key": authHeader,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    };

    console.log(`\n📡 Sending reading from ${machineId}...`);
    console.log(`   Liters total: ${payload.liters_dispensed_total}`);
    console.log(`   Tank level: ${payload.tank_level_percent?.toFixed(1)}%`);
    console.log(`   Battery: ${payload.battery_voltage?.toFixed(1)}V`);

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            console.log(`✅ Success: ${response.liters_recorded?.toFixed(2)} L recorded`);
            resolve(response);
          } catch (e) {
            console.log(`✅ Success (${res.statusCode})`);
            resolve({ statusCode: res.statusCode });
          }
        } else {
          console.error(`❌ Error ${res.statusCode}: ${data}`);
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", (err) => {
      console.error(`❌ Request failed: ${err.message}`);
      reject(err);
    });

    req.write(body);
    req.end();
  });
}

// Main flow
async function main() {
  if (!SUPABASE_PROJECT_REF || SUPABASE_PROJECT_REF === "your-project-ref") {
    console.error("\n❌ Configuration incomplete!");
    console.error("   Set SUPABASE_PROJECT_REF in the script or provide .env file");
    console.error("   Set VITE_SUPABASE_ANON_KEY environment variable");
    console.error("   Set DEVICE_SHARED_SECRET environment variable");
    process.exit(1);
  }

  console.log("🌊 Water Machine Simulator");
  console.log(`   Machine ID: ${machineId}`);
  console.log(`   Target: https://${INGEST_HOST}${INGEST_PATH}`);
  console.log(`   Continuous mode: ${isContinuous}`);

  try {
    // Send initial reading
    const reading = generateReading();
    await sendReading(reading);

    if (isContinuous) {
      console.log("\n⏰ Continuous mode: sending readings every 15 seconds (Ctrl+C to stop)\n");
      setInterval(async () => {
        try {
          const reading = generateReading();
          await sendReading(reading);
        } catch (err) {
          console.error(`Error sending reading: ${err.message}`);
        }
      }, 15000);
    } else {
      console.log("\n✨ Done!");
    }
  } catch (err) {
    console.error(`Fatal: ${err.message}`);
    process.exit(1);
  }
}

main();
