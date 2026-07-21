# Water Management System

A fleet-monitoring dashboard for water dispensing machines: track liters
dispensed and revenue per machine in near real time, backed by
Supabase, with a Vite + React dashboard and cellular-connected
firmware for remote sites without WiFi.

```
water-management-system/
  src/                         Vite + React + TypeScript dashboard
  supabase/
    schema.sql                  Database schema (run this first)
    functions/ingest-reading/    Edge Function devices report to
  firmware/water_machine_cellular/  ESP32 + SIM7000 firmware (Arduino)
  docs/
    ARCHITECTURE.md              How the whole system fits together
    HARDWARE_INTEGRATION.md       Flow sensors, cellular vs LoRa, wiring
```

Read `docs/ARCHITECTURE.md` for the full picture and
`docs/HARDWARE_INTEGRATION.md` for the flow-sensor/cellular details.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/schema.sql`.
3. Deploy the ingest endpoint and other Edge Functions:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase functions deploy ingest-reading
   npx supabase functions deploy provision-machine
   npx supabase functions deploy regenerate-secret
   ```
   Note: The old `DEVICE_SHARED_SECRET` environment variable is no longer used.
   Each machine now gets a unique per-machine device secret via the dashboard.

## 2. Run the dashboard

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + anon key
npm run dev
```

Open the printed local URL.

## 3. Provision a new machine

Machines are now provisioned via the dashboard **without touching SQL**:

1. In the dashboard, go to **Operations** → **➕ Connect Machine**
2. Enter the machine details (name, serial number, address, tank capacity, daily target)
3. Click "Generate Credentials" — the dashboard will create a unique device secret for this machine
4. Copy the serial number, device secret, and ingest host
5. Flash these to your firmware (see next section)
6. Power on the machine — it will send its first reading within the report cycle
7. The dashboard will flip to "Connected" and the machine appears in the **🤖 Machines** list

For testing, you can use the ready-to-run cURL command from the credentials display:

```bash
curl -X POST "https://<project-ref>.functions.supabase.co/functions/v1/ingest-reading" \
  -H "Content-Type: application/json" \
  -H "x-device-key: WM-0001:<device-secret-from-dashboard>" \
  -d '{"serial_number":"WM-0001","liters_dispensed_total":12.5,"tank_level_percent":80}'
```

Replace `<device-secret-from-dashboard>` with the actual secret from step 3.

## 4. Build for production

```bash
npm run build
```

Outputs static files to `dist/` — deploy to Vercel, Netlify, Supabase
Hosting, or any static host.
