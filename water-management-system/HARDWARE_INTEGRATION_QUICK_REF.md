# Hardware Integration - Quick Reference

## 🎯 System Overview

```
Physical Water Machine
     ↓ (HTTPS POST every 15 min)
Supabase Edge Function (/ingest-reading)
     ↓
PostgreSQL Database
     ↓ (Real-time subscriptions)
Web Dashboard (http://localhost:5173)
```

## 📦 What's Included

| Component | Location | Status |
|-----------|----------|--------|
| **Firmware (ESP32 + Flow Sensor)** | `firmware/water_machine_cellular.ino` | ✅ Ready |
| **Backend API (Edge Function)** | `supabase/functions/ingest-reading/index.ts` | ✅ Ready |
| **Database Schema** | `supabase/schema.sql` | ✅ Ready |
| **Frontend Dashboard** | `src/` components + `useMachines` hook | ✅ Ready |
| **Device Simulator** | `simulate-device.js` | ✅ Ready |
| **Test Data Loader** | `load-test-data.js` | ✅ Ready |

## 🚀 Quick Start (15 minutes)

### 1. Create Supabase Project
- Go to [supabase.com](https://supabase.com)
- Create project → Note your **Project URL** and **Anon Key**

### 2. Deploy Database
- Supabase → SQL Editor
- Copy `supabase/schema.sql` → Run

### 3. Set Credentials
```bash
# Update .env.local
VITE_SUPABASE_URL=https://your-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Deploy Edge Function
```bash
cd supabase
supabase functions deploy ingest-reading
supabase secrets set DEVICE_SHARED_SECRET="your-secret"
```

### 5. Load Test Data
```bash
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-key"
node load-test-data.js
```

### 6. View Dashboard
- Open `http://localhost:5173`
- Should see machines with generated data

## 🧪 Test Hardware Integration

### Option A: Simulate Device Readings
```bash
# Single reading
node simulate-device.js --machine-id WM-0001 --liters 1000 --tank 75

# Continuous (15-sec intervals)
node simulate-device.js --machine-id WM-0001 --continuous
```

### Option B: Real Device (After Firmware Flash)
- Flash `firmware/water_machine_cellular.ino` to ESP32
- Configure credentials in firmware
- Power up → Device auto-sends every 15 minutes

## 📊 Payload Format

Device sends to `/ingest-reading`:
```json
{
  "serial_number": "WM-0001",
  "liters_dispensed_total": 1234.56,
  "tank_level_percent": 65,
  "battery_voltage": 12.8,
  "signal_rssi": -87
}
```

Auth header: `x-device-key: WM-0001:your-device-secret`

## 🔑 Authentication

- **Device→Edge Function:** Shared secret in `x-device-key` header
- **Upgrade production:** Per-device secrets in `machines` table

## 📋 Configuration Checklist

```
☐ Supabase project created
☐ Database schema deployed
☐ Dashboard credentials updated (.env.local)
☐ Edge function deployed
☐ Machines registered in database
☐ Firmware configured (APN, serial, secret)
☐ Flow sensor calibrated (PULSES_PER_LITER)
☐ Firmware flashed to ESP32
☐ Test with simulate-device.js
☐ Verify dashboard updates in real-time
```

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Dashboard blank | Update `.env.local` with real Supabase keys |
| Simulator: 401 error | Check `DEVICE_SHARED_SECRET` matches Supabase |
| Simulator: 404 error | Register machine in `machines` table |
| Firmware won't compile | Install TinyGSM + ArduinoJson libraries |
| No real-time updates | Check Supabase subscription in `useMachines.ts` |

## 📚 Detailed Documentation

See `HARDWARE_INTEGRATION_SETUP.md` for:
- Step-by-step setup instructions
- Flow sensor calibration process
- Database schema details
- Complete data flow diagram
- Production deployment checklist
- Advanced configuration

## 🔗 Key Files Reference

```
Project Root
├── firmware/
│   └── water_machine_cellular.ino        ← Flash to ESP32
├── supabase/
│   ├── schema.sql                        ← Deploy to database
│   └── functions/ingest-reading/
│       └── index.ts                      ← Edge function
├── src/
│   ├── lib/supabaseClient.ts             ← DB connection
│   ├── hooks/useMachines.ts              ← Real-time updates
│   └── components/Dashboard.tsx          ← Main UI
├── .env.local                            ← Your credentials (create this)
├── simulate-device.js                    ← Test tool
├── load-test-data.js                     ← Test data tool
├── HARDWARE_INTEGRATION_SETUP.md         ← Full guide
└── README.md                             ← Project overview
```

## 💡 Common Tasks

### Add a new machine
```sql
INSERT INTO machines (serial_number, name, address, tank_capacity_liters)
VALUES ('WM-0004', 'New Location', 'Address', 5000);
```

### Check today's revenue
```sql
SELECT sum(amount_paid) FROM sales WHERE sold_at >= date_trunc('day', now());
```

### View offline machines
```sql
SELECT name, last_seen_at FROM machines WHERE status = 'offline';
```

### Generate test readings
```bash
node load-test-data.js
```

### Monitor real-time reads
```sql
SELECT * FROM readings ORDER BY reported_at DESC LIMIT 10;
```

## 🌍 Deployment Flow

```
1. Physical Machine (Water ATM)
   - Flow meter → ESP32 GPIO
   - SIM card + Modem → Cellular network
   
2. Device sends HTTPS POST every 15 minutes
   → Supabase Edge Function
   
3. Edge Function processes:
   - Authenticates device
   - Computes delta (water sold)
   - Records in database
   - Triggers alerts if needed
   
4. Database updates trigger subscriptions
   → React hooks receive real-time updates
   
5. Dashboard shows live data
   - Liters sold today
   - Revenue
   - Machine status
   - Alerts
```

---

**Ready to deploy? Start with step 1 in "Quick Start" above!** 🚀
