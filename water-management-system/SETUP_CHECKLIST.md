# Hardware Integration - Setup Checklist & Status

## 📋 Pre-Deployment Verification

### ✅ Project Structure Verified
```
✓ firmware/water_machine_cellular/water_machine_cellular.ino exists
✓ supabase/schema.sql exists
✓ supabase/functions/ingest-reading/index.ts exists
✓ src/lib/supabaseClient.ts properly configured
✓ src/hooks/useMachines.ts has real-time subscription
✓ Dashboard components ready (Dashboard.tsx, MachineCard.tsx, etc.)
✓ Helper scripts created (simulate-device.js, load-test-data.js)
```

---

## 🔧 Setup Checklist

### Phase 1: Supabase Project (5 min)
- [ ] Create Supabase account at https://supabase.com
- [ ] Create new project called "water-management"
- [ ] Wait for database to initialize
- [ ] Copy Project URL (note: https://your-ref.supabase.co)
- [ ] Copy Anon Public Key from Project Settings → API

### Phase 2: Deploy Database (5 min)
- [ ] Go to Supabase SQL Editor
- [ ] Create new query
- [ ] Paste entire contents of `supabase/schema.sql`
- [ ] Click Run
- [ ] Verify all tables created (check Tables tab)
- [ ] Verify view `v_machine_today` created

### Phase 3: Configure Dashboard (3 min)
- [ ] Create `.env.local` file in project root if not exists
- [ ] Update with your Supabase credentials:
  ```
  VITE_SUPABASE_URL=https://your-project-ref.supabase.co
  VITE_SUPABASE_ANON_KEY=your-actual-anon-key-here
  ```
- [ ] Save file
- [ ] Refresh browser at http://localhost:5173
- [ ] Verify no "Missing VITE_SUPABASE" errors in console
- [ ] Dashboard still shows but with no data (expected)

### Phase 4: Deploy Edge Function (5 min)
- [ ] Install Supabase CLI if not present: `npm install -g supabase`
- [ ] In terminal: `cd supabase`
- [ ] Run: `supabase functions deploy ingest-reading`
- [ ] Verify deployment succeeded
- [ ] In Supabase console, go to Functions → ingest-reading
- [ ] Set secret: `DEVICE_SHARED_SECRET=your-long-random-secret-string`
  - Use: `supabase secrets set DEVICE_SHARED_SECRET="..."`
  - Or via Supabase UI: Settings → Secrets
- [ ] Copy your Edge Function URL: `https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading`

### Phase 5: Register Test Machines (3 min)
- [ ] In Supabase, go to SQL Editor → New query
- [ ] Run this SQL:
  ```sql
  INSERT INTO machines (serial_number, name, address, tank_capacity_liters)
  VALUES 
    ('WM-0001', 'Test Machine 1', 'Location 1', 5000),
    ('WM-0002', 'Test Machine 2', 'Location 2', 5000);
  ```
- [ ] Verify rows inserted (check Tables → machines)

### Phase 6: Configure Firmware (10 min)
**Skip this if testing with simulator only**
- [ ] Open `firmware/water_machine_cellular/water_machine_cellular.ino` in Arduino IDE
- [ ] Update configuration (lines ~28-31):
  ```cpp
  const char* APN            = "safaricom";    // Your telco's APN
  const char* SERIAL_NUMBER  = "WM-0001";     // Must match machines table
  const char* DEVICE_SECRET  = "your-long-random-secret-string";
  const char* INGEST_HOST    = "your-project-ref.functions.supabase.co";
  ```
- [ ] Calibrate flow sensor (see detailed guide):
  - [ ] Run 5L through sensor
  - [ ] Record pulse count from Serial Monitor
  - [ ] Calculate: PULSES_PER_LITER = pulses / 5
  - [ ] Update `const float PULSES_PER_LITER = X.X;`
- [ ] Install required libraries from Arduino Library Manager:
  - [ ] TinyGSM (vshymanskyy/TinyGSM)
  - [ ] ArduinoJson
- [ ] Connect ESP32 via USB
- [ ] Select Board: ESP32 Dev Module
- [ ] Select COM port
- [ ] Click Upload
- [ ] Verify "Uploading..." completes successfully

### Phase 7: Test Integration (10 min)
- [ ] Generate test data with: `node load-test-data.js`
  - Requires: `SUPABASE_SERVICE_ROLE_KEY` environment variable
  - Or run: `node load-test-data.js` and provide keys when prompted
- [ ] Refresh browser at http://localhost:5173
- [ ] Verify dashboard shows:
  - [ ] Fleet overview stats (should have data now)
  - [ ] Machine cards with names and locations
  - [ ] Sales/revenue data
  - [ ] Machines showing "online" status
- [ ] Run simulator: `node simulate-device.js --machine-id WM-0001 --continuous`
- [ ] Watch dashboard in real-time:
  - [ ] Liters dispensed increasing
  - [ ] Revenue changing
  - [ ] Timestamp updating
- [ ] Stop simulator (Ctrl+C)
- [ ] Wait 5 minutes
- [ ] Verify machine status changes to "offline"
- [ ] Check Supabase for new `readings` and `sales` records

---

## 🚀 Deployment Checklist

### Before Going Live
- [ ] Database backups configured in Supabase
- [ ] Edge function monitoring enabled
- [ ] Row-level security (RLS) policies reviewed
- [ ] All machines registered in database with correct serial numbers
- [ ] Each machine has unique firmware build with correct configuration
- [ ] Firmware flash tested on actual ESP32 hardware
- [ ] Cellular connectivity verified at actual deployment locations
- [ ] SIM cards activated with appropriate APN
- [ ] Flow sensors physically installed and calibrated
- [ ] Tank level sensors (if used) calibrated
- [ ] Power supply (12V solar/battery) tested
- [ ] Device alert thresholds configured for your use case

### Production Monitoring
- [ ] Set up Supabase email alerts for:
  - [ ] Database errors
  - [ ] Function failures
  - [ ] Offline machines > 24 hours
- [ ] Create dashboard queries for:
  - [ ] Daily revenue by machine
  - [ ] Water sold vs. target
  - [ ] Machine uptime %
  - [ ] Alert frequency
- [ ] Set up automated tasks:
  - [ ] Daily revenue reports
  - [ ] Weekly maintenance alerts
  - [ ] Monthly tank cleaning reminders

---

## 🧪 Verification Tests

### Test 1: Database Connection
**Run in browser console:**
```javascript
// Should return the supabase instance
console.log(window.supabase)
```
**Expected:** Supabase client object logged

---

### Test 2: View Raw Data
**SQL in Supabase:**
```sql
SELECT * FROM v_machine_today;
```
**Expected:** Rows with machines and today's stats

---

### Test 3: Simulate Device Reading
**Terminal:**
```bash
node simulate-device.js --machine-id WM-0001 --liters 1000 --tank 75
```
**Expected:** 
```
✅ Success: X.XX L recorded
```

---

### Test 4: Real-time Update
**Terminal 1:**
```bash
node simulate-device.js --machine-id WM-0001 --continuous
```
**Browser:** Watch http://localhost:5173
**Expected:** Dashboard updates every ~15 seconds without page refresh

---

### Test 5: Database Record Creation
**SQL Query:**
```sql
SELECT * FROM readings ORDER BY reported_at DESC LIMIT 1;
SELECT * FROM sales ORDER BY sold_at DESC LIMIT 1;
SELECT * FROM alerts WHERE resolved = false;
```
**Expected:** New rows appear after each device reading

---

## 📊 Key Metrics to Monitor

After deployment, track these metrics:

```sql
-- Daily revenue
SELECT DATE(sold_at) as day, SUM(amount_paid) as revenue 
FROM sales 
GROUP BY DATE(sold_at) 
ORDER BY day DESC;

-- Machine uptime (last 7 days)
SELECT name, COUNT(*) as reports, 
       MAX(reported_at) as last_report
FROM readings r
JOIN machines m ON r.machine_id = m.id
WHERE r.reported_at > now() - interval '7 days'
GROUP BY m.name;

-- Alert frequency
SELECT type, COUNT(*) as count, 
       COUNT(*) FILTER(WHERE resolved = false) as active
FROM alerts
WHERE created_at > now() - interval '30 days'
GROUP BY type;

-- Water dispensed (cumulative)
SELECT m.name, 
       COALESCE(MAX(r.liters_dispensed_total), 0) as total_liters,
       COALESCE(SUM(s.liters), 0) as sold_today
FROM machines m
LEFT JOIN readings r ON r.machine_id = m.id
LEFT JOIN sales s ON s.machine_id = m.id 
         AND s.sold_at >= date_trunc('day', now())
GROUP BY m.name;
```

---

## 🆘 Emergency Troubleshooting

### Dashboard won't load
1. Check browser console (F12) for errors
2. Verify `.env.local` has correct credentials
3. Verify Supabase project is active (not paused)
4. Try clearing browser cache (Ctrl+Shift+Delete)
5. Restart dev server: kill npm, run `npm run dev` again

### Device can't connect to Edge Function
1. Verify WiFi/cellular connection working
2. Check firmware has correct INGEST_HOST
3. Verify DEVICE_SECRET matches Supabase secret
4. Test with curl:
   ```bash
   curl -X POST https://your-ref.functions.supabase.co/functions/v1/ingest-reading \
     -H "x-device-key: WM-0001:secret" \
     -H "Content-Type: application/json" \
     -d '{"serial_number":"WM-0001","liters_dispensed_total":100}'
   ```

### No real-time updates on dashboard
1. Check Supabase subscription in browser console
2. Verify RLS policies allow read access
3. Try refreshing page manually
4. Check browser network tab for subscription errors

### Simulator says "unknown device"
1. Verify machine exists in database:
   ```sql
   SELECT * FROM machines WHERE serial_number = 'WM-0001';
   ```
2. If not found, insert it:
   ```sql
   INSERT INTO machines (serial_number, name, address, tank_capacity_liters)
   VALUES ('WM-0001', 'Test', 'Location', 5000);
   ```

---

## 📞 Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **TinyGSM Docs:** https://github.com/vshymanskyy/TinyGSM
- **Arduino JSON:** https://github.com/bblanchon/ArduinoJson
- **Project Architecture:** See `HARDWARE_INTEGRATION_SETUP.md`
- **Quick Reference:** See `HARDWARE_INTEGRATION_QUICK_REF.md`

---

**Last Updated:** 2026-07-21
**Status:** ✅ Ready for Testing
