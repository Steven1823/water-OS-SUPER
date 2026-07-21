#!/usr/bin/env node
/**
 * Populate database with test machines and sample readings
 * Run this after deploying the schema to get realistic test data
 */

const https = require("https");

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing environment variables:");
  console.error("   Set VITE_SUPABASE_URL");
  console.error("   Set SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// Parse URL
const urlParts = SUPABASE_URL.match(/https:\/\/([^.]+)\./);
const projectRef = urlParts ? urlParts[1] : null;

if (!projectRef) {
  console.error("❌ Invalid SUPABASE_URL format");
  process.exit(1);
}

const API_HOST = `${projectRef}.supabase.co`;

// Make API request
async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_HOST,
      path: `/rest/v1${path}`,
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        apikey: SUPABASE_SERVICE_KEY,
        Prefer: "return=representation",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data || "null"));
        } else {
          reject(new Error(`${res.statusCode}: ${data}`));
        }
      });
    });

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test data
const TEST_MACHINES = [
  {
    serial_number: "WM-0001",
    name: "Kilimani Estate - Tap 1",
    location_lat: -1.282,
    location_lng: 36.761,
    address: "Kilimani, Nairobi",
    tank_capacity_liters: 5000,
  },
  {
    serial_number: "WM-0002",
    name: "Kilimani Estate - Tap 2",
    location_lat: -1.283,
    location_lng: 36.762,
    address: "Kilimani, Nairobi",
    tank_capacity_liters: 5000,
  },
  {
    serial_number: "WM-0003",
    name: "Eastleigh Water Point",
    location_lat: -1.301,
    location_lng: 36.823,
    address: "Eastleigh, Nairobi",
    tank_capacity_liters: 3000,
  },
];

async function main() {
  console.log("🌊 Water Management System - Test Data Loader\n");

  try {
    // Insert machines
    console.log("📝 Inserting test machines...");
    for (const machine of TEST_MACHINES) {
      try {
        const result = await makeRequest("POST", "/machines", machine);
        console.log(`   ✅ ${machine.serial_number}: ${machine.name}`);
      } catch (err) {
        console.error(`   ⚠️  ${machine.serial_number}: ${err.message}`);
      }
    }

    // Get inserted machines to get their IDs
    console.log("\n📊 Generating sample readings...");
    const machines = await makeRequest("GET", "/machines?select=id,serial_number");

    if (!machines || machines.length === 0) {
      console.error("❌ No machines found in database");
      process.exit(1);
    }

    // Generate sample readings for each machine
    for (const machine of machines) {
      let currentLiters = 1000 + Math.random() * 2000;

      // Generate 5 readings per machine (simulating past 75 minutes)
      for (let i = 0; i < 5; i++) {
        const delta = 10 + Math.random() * 20;
        currentLiters += delta;

        const reading = {
          machine_id: machine.id,
          liters_dispensed_total: parseFloat(currentLiters.toFixed(2)),
          liters_since_last_report: parseFloat(delta.toFixed(2)),
          tank_level_percent: 40 + Math.random() * 40,
          battery_voltage: 12.5 + Math.random() * 0.5,
          signal_rssi: -80 - Math.floor(Math.random() * 20),
        };

        try {
          await makeRequest("POST", "/readings", reading);
          console.log(
            `   ✅ ${machine.serial_number}: ${reading.liters_since_last_report.toFixed(1)}L`
          );
        } catch (err) {
          console.error(`   ❌ Error: ${err.message}`);
        }

        // Small delay between requests
        await new Promise((r) => setTimeout(r, 100));
      }
    }

    // Generate some alerts
    console.log("\n🚨 Creating sample alerts...");
    for (const machine of machines) {
      const alerts = [
        {
          machine_id: machine.id,
          type: "low_tank",
          message: "Tank at 15%",
          resolved: false,
        },
      ];

      for (const alert of alerts) {
        try {
          await makeRequest("POST", "/alerts", alert);
          console.log(`   ✅ Alert: ${alert.type} for ${machine.serial_number}`);
        } catch (err) {
          console.error(`   ❌ Error: ${err.message}`);
        }
      }
    }

    console.log(
      "\n✨ Test data loaded successfully!\n   Visit http://localhost:5173 to see the dashboard"
    );
  } catch (err) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    process.exit(1);
  }
}

main();
