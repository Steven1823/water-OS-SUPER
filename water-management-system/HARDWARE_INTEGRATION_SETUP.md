# Hardware Integration Setup & Verification Guide

## ✅ What's Already Implemented

Your water management system has a **complete end-to-end hardware integration**:

### 1. **Firmware (ESP32 + Water Flow Sensor)**
✓ Located at: `firmware/water_machine_cellular/water_machine_cellular.ino`
✓ Measures water flow via pulse counting from hall-effect sensor
✓ Connects to Supabase via cellular (SIM7000/SIM800L)
✓ Reports every 15 minutes with device telemetry
✓ Supports deep sleep for battery-powered sites

### 2. **Backend API (Supabase Edge Function)**
✓ Located at: `supabase/functions/ingest-reading/index.ts`
✓ Authenticates devices via shared secret
✓ Computes water sold (delta from lifetime total)
✓ Creates sales records with optional payment info
✓ Generates alerts (low tank, offline, etc.)
✓ Updates machine status in real-time

### 3. **Database Schema**
✓ Located at: `supabase/schema.sql`
✓ `machines` table - device registry
✓ `readings` table - raw telemetry (append-only)
✓ `sales` table - transaction log
✓ `alerts` table - system alerts
✓ `v_machine_today` view - dashboard data
✓ Row-level security policies ready

### 4. **Frontend Dashboard**
✓ Real-time updates via Supabase RealtimeDatabase
✓ Live machine status, liters sold, revenue tracking
✓ Alert display system
✓ Responsive UI showing fleet overview

---

## 🔧 Setup Steps

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Create a new project:
   - Name it "water-management"
   - Choose a region close to your machines
   - Set a strong password
3. Wait for project to initialize (~5 minutes)
4. Go to **Project Settings** → **API** and copy:
   - `Project URL` → `VITE_SUPABASE_URL`
   - `anon public key` → `VITE_SUPABASE_ANON_KEY`

### Step 2: Deploy Database Schema

1. In Supabase, go to **SQL Editor**
2. Create a new query
3. Copy entire contents of `supabase/schema.sql` into the editor
4. Click **Run** to create all tables and views

### Step 3: Update Dashboard Credentials

Update `.env.local` with your Supabase credentials:
```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

Refresh browser at `http://localhost:5173` — dashboard should now connect to your database.

### Step 4: Deploy Edge Function

```bash
cd supabase
supabase functions deploy ingest-reading
supabase secrets set DEVICE_SHARED_SECRET="your-long-random-secret-string"
```

Your ingest endpoint is now: `https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading`

### Step 5: Register Machines in Database

In Supabase **SQL Editor**, add your water machines:

```sql
INSERT INTO machines (serial_number, name, address, tank_capacity_liters)
VALUES 
  ('WM-0001', 'Kilimani Estate ATM #1', 'Kilimani, Nairobi', 5000),
  ('WM-0002', 'Kilimani Estate ATM #2', 'Kilimani, Nairobi', 5000),
  ('WM-0003', 'Eastleigh Depot', 'Eastleigh, Nairobi', 3000);
```

### Step 6: Configure Firmware

Edit `firmware/water_machine_cellular/water_machine_cellular.ino`:

```cpp
// Line ~28-31 - Update these for your deployment:
const char* APN            = "your-telco-apn";                    // e.g., "safaricom" for Safaricom Kenya
const char* SERIAL_NUMBER  = "WM-0001";                          // Must match machines table
const char* DEVICE_SECRET  = "your-long-random-secret-string";   // Same as DEVICE_SHARED_SECRET
const char* INGEST_HOST    = "your-project-ref.functions.supabase.co";
const char* INGEST_PATH    = "/functions/v1/ingest-reading";

// Line ~33 - Calibrate for your flow sensor:
const float PULSES_PER_LITER = 450.0;  // Run calibration test first!
```

#### Calibrating the Flow Sensor

Before deploying:

1. Power up the ESP32 + flow meter without the modem
2. Run exactly 5L of water through the meter into a measuring container
3. Check Serial Monitor for `totalPulses` count
4. Calculate: `PULSES_PER_LITER = totalPulses / 5`
5. Update the firmware with the actual value

### Step 7: Flash Firmware to ESP32

1. Download [Arduino IDE](https://www.arduino.cc/en/software) or [PlatformIO](https://platformio.org/)
2. Install required libraries:
   - TinyGSM (vshymanskyy/TinyGSM)
   - ArduinoJson
   - esp_sleep (built-in)
3. Connect ESP32 via USB
4. Select Board: **ESP32 Dev Module**
5. Select COM port
6. Click **Upload**

---

## 🧪 Testing the Integration

### Test 1: Simulate Device Reading (No Hardware Needed)

```bash
cd water-management-system

# Set environment variables
$env:VITE_SUPABASE_ANON_KEY = "your-anon-key"
$env:DEVICE_SHARED_SECRET = "your-shared-secret"

# Send a single test reading
node simulate-device.js --machine-id WM-0001 --liters 1000 --tank 75

# Expected output:
# 📡 Sending reading from WM-0001...
# ✅ Success: X.XX L recorded
```

### Test 2: Continuous Simulation

```bash
# Simulate device sending readings every 15 seconds
node simulate-device.js --machine-id WM-0001 --continuous
```

Watch the dashboard at `http://localhost:5173` — you should see:
- Liters dispensed today increasing
- Revenue updating (if you include `amount_paid` in payload)
- Machine status changing to "online"

### Test 3: Check Dashboard Real-time Updates

1. Open `http://localhost:5173`
2. Run `node simulate-device.js --machine-id WM-0001 --continuous` in terminal
3. Dashboard should update automatically every time a reading arrives
4. Stop with Ctrl+C and verify machine goes offline after ~5 min

### Test 4: Verify Database Records

In Supabase **SQL Editor**:

```sql
-- Check last 5 readings from WM-0001
SELECT * FROM readings 
WHERE machine_id = (SELECT id FROM machines WHERE serial_number = 'WM-0001')
ORDER BY reported_at DESC 
LIMIT 5;

-- Check sales/revenue for today
SELECT * FROM sales
WHERE sold_at >= date_trunc('day', now())
ORDER BY sold_at DESC;

-- Check if any alerts were triggered
SELECT * FROM alerts
WHERE created_at >= now() - interval '1 hour'
AND resolved = false;
```

---

## 📋 Deployment Checklist

- [ ] Supabase project created and database schema deployed
- [ ] `.env.local` updated with real credentials
- [ ] Edge function deployed with `DEVICE_SHARED_SECRET`
- [ ] Machines registered in `machines` table
- [ ] Firmware configured with APN, serial number, device secret
- [ ] Flow sensor calibrated (`PULSES_PER_LITER`)
- [ ] Firmware uploaded to ESP32
- [ ] Simulation test passes
- [ ] Dashboard shows real-time data
- [ ] Offline alert triggers after 5 minutes of no reports

---

## 🐛 Troubleshooting

### Dashboard shows "Loading machines…"
**Cause:** Missing/invalid Supabase credentials
**Fix:** Update `.env.local` with correct credentials and restart dev server

### Simulate script says "Error 401: unauthorized"
**Cause:** Device secret mismatch
**Fix:** Verify `DEVICE_SHARED_SECRET` env variable matches what's set in Supabase

### Simulate script says "Error 404: unknown device"
**Cause:** Serial number not registered in `machines` table
**Fix:** Run the INSERT statement from "Step 5" to add the machine

### Firmware won't compile
**Cause:** Missing libraries
**Fix:** Install: TinyGSM, ArduinoJson from Arduino Library Manager

### Firmware sends reading but doesn't appear in dashboard
**Cause:** Supabase credentials in firmware don't match
**Fix:** Ensure firmware uses correct `INGEST_HOST` and credentials

---

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Physical Water Machine                                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ESP32 Microcontroller                                │ │
│  │ ├─ Flow Sensor (GPIO 27) → pulse counting          │ │
│  │ ├─ SIM7000 Modem (RX2/TX2) → cellular connection  │ │
│  │ └─ Battery level (ADC) + Tank level sensor         │ │
│  └────────────────────────────────────────────────────────┘ │
│                           │                                  │
│          Every 15 min, sends HTTPS POST with:              │
│          - serial_number: "WM-0001"                        │
│          - liters_dispensed_total: 1234.56                │
│          - tank_level_percent: 65                         │
│          - battery_voltage: 12.8                          │
│          - signal_rssi: -87                               │
│                           ▼                                 │
└─────────────────────────────────────────────────────────────┘
                            ║
                  ┌─────────────────────┐
                  │  Internet/Cellular  │
                  │   (LTE-M/2G)        │
                  └─────────────────────┘
                            ║
                            ▼
            ┌───────────────────────────────┐
            │  Supabase Edge Function       │
            │ /functions/v1/ingest-reading  │
            │                               │
            │ ├─ Authenticate device       │
            │ ├─ Look up in machines table │
            │ ├─ Compute delta (sold qty) │
            │ ├─ Insert into readings      │
            │ ├─ Insert into sales         │
            │ └─ Create alerts if needed   │
            └───────────────────────────────┘
                            ║
                            ▼
            ┌───────────────────────────────┐
            │  Supabase PostgreSQL DB       │
            │                               │
            │ ├─ machines (registry)        │
            │ ├─ readings (raw telemetry)  │
            │ ├─ sales (transactions)       │
            │ ├─ alerts (system events)     │
            │ └─ v_machine_today (view)     │
            └───────────────────────────────┘
                            ║
                 ┌──────────────────────┐
                 │   Real-time Subs     │
                 │  (Supabase Updates)  │
                 └──────────────────────┘
                            ║
                            ▼
            ┌───────────────────────────────┐
            │  Web Browser Dashboard        │
            │  http://localhost:5173        │
            │                               │
            │ ├─ Fleet overview stats       │
            │ ├─ Machine status list        │
            │ ├─ Revenue charts             │
            │ ├─ Active alerts              │
            │ └─ Real-time updates          │
            └───────────────────────────────┘
```

---

## 🚀 Next Steps

After setup verification:

1. **Deploy to production:**
   - Set up Supabase backups
   - Configure email alerts for low tank/offline
   - Deploy frontend to Vercel/Netlify
   - Set up monitoring dashboard

2. **Scale to multiple machines:**
   - Register each physical device
   - Flash firmware with unique serial numbers
   - Test each device individually
   - Monitor for connectivity issues

3. **Add payment tracking:**
   - Wire coin acceptor to ESP32
   - Include `amount_paid` in device payload
   - Track revenue per machine/time period

4. **Enhance monitoring:**
   - Add leak detection (continuous flow > threshold)
   - Battery level alerts
   - Signal strength correlation with location
   - Maintenance scheduling

