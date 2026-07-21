# Hardware Integration - Troubleshooting Guide

## 🔴 Critical Issues

### Device can't connect to Supabase Edge Function

**Symptoms:**
- Firmware hangs on `modem.waitForNetwork()`
- No data appears in dashboard
- Serial Monitor shows "No cellular network"

**Diagnosis:**
```cpp
// Check these in firmware
Serial.println(modem.getSignalQuality());  // Should be -50 to -100 (closer to -50 is better)
Serial.println(modem.isNetworkConnected()); // Should be true after network wait
Serial.println(modem.isGprsConnected());    // Should be true after GPRS connect
```

**Solutions:**
1. **Check SIM card:**
   - [ ] SIM is active (not expired)
   - [ ] APN is correct for your telco (ask your SIM provider)
   - [ ] SIM has data balance
   - [ ] SIM is not locked to specific device

2. **Check modem:**
   - [ ] SIM7000 is powered (red LED on)
   - [ ] Antenna connected properly
   - [ ] TX/RX wires correctly soldered (no cold joints)
   - [ ] PWRKEY pulse is >1 second

3. **Check location:**
   - [ ] Device is in area with cellular coverage
   - [ ] Not in basement/Faraday cage
   - [ ] Try moving to different location to test

4. **Fallback to 2G:**
   - Update firmware from SIM7000 to SIM800L:
   ```cpp
   #define TINY_GSM_MODEM_SIM800L  // Change this line
   ```

5. **Test modem directly:**
   - Connect modem to separate ESP32 with AT command terminal
   - Send: `AT` → should get `OK`
   - Send: `AT+CSQ` → should get signal quality

---

### Edge Function returns 401 (Unauthorized)

**Symptoms:**
- Firmware Serial Monitor shows "TLS connect failed"
- cURL test returns: `{"error": "unauthorized"}`

**Diagnosis:**
Check the exact x-device-key header value:
```cpp
String authHeader = String(SERIAL_NUMBER) + ":" + String(DEVICE_SECRET);
Serial.print("Auth header: ");
Serial.println(authHeader);  // Log this to verify format
```

**Solutions:**
1. **Verify secret matches:**
   ```bash
   # In Supabase, check this is set
   supabase secrets get DEVICE_SHARED_SECRET
   ```
   - Must be EXACTLY the same as in firmware
   - Check for leading/trailing spaces
   - Case-sensitive!

2. **Verify serial number matches:**
   ```sql
   SELECT serial_number FROM machines;
   ```
   - Must match `const char* SERIAL_NUMBER` in firmware
   - Check spelling exactly

3. **Verify header format:**
   - Should be: `WM-0001:your-long-secret`
   - NOT: `"WM-0001:your-long-secret"` (no quotes)
   - NOT: `Basic WM-0001:...` (no encoding needed)

4. **Test with cURL:**
   ```bash
   curl -X POST https://your-ref.functions.supabase.co/functions/v1/ingest-reading \
     -H "x-device-key: WM-0001:your-exact-secret" \
     -H "Content-Type: application/json" \
     -d '{"serial_number":"WM-0001","liters_dispensed_total":100}'
   ```

---

### Edge Function returns 404 (Unknown Device)

**Symptoms:**
- cURL returns: `{"error": "unknown device"}`
- Dashboard shows no machines
- SQL shows empty machines table

**Solutions:**
1. **Register machine in database:**
   ```sql
   INSERT INTO machines (serial_number, name, address, tank_capacity_liters)
   VALUES ('WM-0001', 'Test Machine', 'Location', 5000);
   ```

2. **Verify it was inserted:**
   ```sql
   SELECT * FROM machines WHERE serial_number = 'WM-0001';
   ```
   - Should return 1 row
   - Check serial_number exactly matches firmware

3. **Check machine ID:**
   ```sql
   SELECT id, serial_number FROM machines;
   ```
   - Ensure ID is UUID and not NULL

---

## 🟡 Data Issues

### Dashboard shows "Loading machines…" forever

**Symptoms:**
- Dashboard loads but shows nothing
- Console shows: "Missing VITE_SUPABASE_URL"
- Or: "supabaseUrl is required"

**Solutions:**
1. **Check .env.local exists:**
   ```bash
   ls -la .env.local
   ```

2. **Check credentials are correct:**
   ```
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-key-here
   ```
   - NOT `https://` → check for typo
   - NOT `placeholder` → use real key
   - NOT trailing slash or special chars

3. **Restart dev server:**
   ```bash
   # Kill existing server
   Ctrl+C in terminal
   
   # Clear cache
   rm -rf node_modules/.vite
   
   # Restart
   npm run dev
   ```

4. **Clear browser cache:**
   - Chrome: Ctrl+Shift+Delete → Clear all → Reload

---

### No data appears in dashboard after device sends reading

**Symptoms:**
- Simulator shows: `✅ Success: X.XX L recorded`
- But dashboard still shows 0 liters
- Machine shows offline

**Solutions:**
1. **Check data was recorded:**
   ```sql
   SELECT * FROM readings ORDER BY reported_at DESC LIMIT 1;
   SELECT * FROM sales ORDER BY sold_at DESC LIMIT 1;
   ```
   - Should see recent rows
   - If empty, Edge Function didn't process

2. **Check Edge Function logs:**
   - Supabase console → Functions → ingest-reading → Invocations
   - Look for errors (red responses)
   - Common error: machine not found in database

3. **Verify subscription is active:**
   - Open browser console (F12)
   - Look for `postgres_changes` subscription
   - Should see connection without errors
   - Try manually calling `refresh()` in useMachines

4. **Check row-level security (RLS):**
   ```sql
   SELECT * FROM machines;  -- Should work
   SELECT * FROM readings;  -- Should work
   ```
   - If empty, RLS policies might be blocking

---

### Liters don't add up (delta calculation wrong)

**Symptoms:**
- First reading shows all liters as delta
- Second reading shows wrong delta
- Math doesn't match

**Example of what went wrong:**
```
Reading 1: total = 1000L → liters_recorded = 1000L ✓ (correct, first reading)
Reading 2: total = 1020L → liters_recorded = 20L ✓ (correct, delta)
Reading 3: total = 1015L → liters_recorded = 0L ⚠️ (wrong! counter went backwards)
```

**Solutions:**
1. **Device counter reset:**
   - Check if firmware restarted (lost RTC_DATA)
   - Solution: Use persistent storage instead of RTC memory
   ```cpp
   // Use EEPROM instead
   EEPROM.put(0, litersDispensedTotal);  // Save to flash
   EEPROM.get(0, litersDispensedTotal);  // Load on startup
   ```

2. **Check firmware calibration:**
   ```
   Expected: liters = pulse_count / 450  (example with 450 pulses/liter)
   Wrong: liters = pulse_count * 450     (factor is inverted!)
   ```
   - Verify PULSES_PER_LITER is correct value (should be 300-600 for most sensors)

3. **Check for sensor noise:**
   - Add debounce on GPIO 27:
   ```cpp
   volatile unsigned long lastPulseTime = 0;
   void IRAM_ATTR onFlowPulse() {
     if (millis() - lastPulseTime > 5) {  // 5ms debounce
       pulseCountThisWake++;
       lastPulseTime = millis();
     }
   }
   ```

---

## 🟠 Performance Issues

### Dashboard is slow or lags

**Symptoms:**
- Dashboard takes 5+ seconds to load data
- Updates are delayed by 30+ seconds
- Browser becomes unresponsive

**Solutions:**
1. **Check Supabase function performance:**
   - Supabase console → Functions → ingest-reading → Invocations
   - Look at execution time (should be <500ms)
   - If > 1000ms, database query is slow

2. **Optimize dashboard queries:**
   - In `src/hooks/useMachines.ts`, add limits:
   ```typescript
   .select("*")
   .order("name")
   .limit(100)  // Don't fetch ALL data
   ```

3. **Check browser performance:**
   - Chrome DevTools → Performance tab
   - Record while loading dashboard
   - Look for long tasks (red bars)
   - Check for memory leaks

4. **Reduce real-time subscriptions:**
   - Each subscription adds overhead
   - In `useMachines.ts`, consider batching channels

---

### Memory leak in React component

**Symptoms:**
- Dashboard uses more memory over time
- Browser slows down after running for hours
- "white screen" after extended use

**Solution:**
Ensure cleanup in useEffect:
```typescript
useEffect(() => {
  // ... subscription code ...
  
  return () => {
    // CRITICAL: Clean up subscription on unmount
    supabase.removeChannel(channel);
  };
}, [load]);
```

---

## 🟢 Firmware Issues

### Firmware won't upload to ESP32

**Symptoms:**
- Arduino IDE: "Failed to connect to ESP32"
- Or: "Error: ESP32 not detected"

**Solutions:**
1. **Check USB cable:**
   - [ ] Cable supports data (not just charging)
   - [ ] Try different USB port
   - [ ] Try different USB cable

2. **Check COM port:**
   - [ ] Select correct port in Arduino IDE (Tools → Port)
   - [ ] On Windows: COM3, COM4, etc.
   - [ ] If not shown, install [CH340 driver](https://sparks.gogo.co.nz/ch340.html)

3. **Check board settings:**
   - [ ] Board: ESP32 Dev Module
   - [ ] Upload Speed: 115200
   - [ ] Flash Frequency: 40MHz
   - [ ] Partition Scheme: Default 4MB

4. **Manual ESP32 reset:**
   - Press and hold IO0 button
   - Press Reset button
   - Release IO0
   - Try upload again

---

### Serial Monitor shows garbage characters

**Symptoms:**
```
▒▒▒▒  ▒▒▒▒▒▒▒▒▒▒
Ñ ▒▒▒▒▒▒▒▒▒▒ ▒
▒▒
```

**Solution:**
Check baud rate matches firmware:
```cpp
Serial.begin(115200);  // Must match Serial Monitor setting
```
- In Arduino IDE: Tools → Serial Monitor → 115200 baud

---

### Flow sensor pulses not being counted

**Symptoms:**
- `totalPulses` stays at 0
- No "pulse detected" messages in Serial Monitor
- Water flows but counter doesn't increment

**Solutions:**
1. **Test sensor directly:**
   ```cpp
   void setup() {
     pinMode(27, INPUT_PULLUP);
     Serial.begin(115200);
   }
   
   void loop() {
     Serial.println(digitalRead(27));  // Should toggle 0/1 when water flows
     delay(100);
   }
   ```
   - Put this in Arduino IDE → Upload
   - Watch Serial Monitor while water flows
   - Should see 0s and 1s changing

2. **Check wiring:**
   - [ ] Yellow wire (pulse) → GPIO 27
   - [ ] Red wire (5V) → 5V
   - [ ] Black wire (GND) → GND
   - [ ] NOT reversed (reversed = won't detect)

3. **Check sensor model:**
   - Different models have different pinouts
   - YF-S201: Red=5V, Yellow=Pulse, Black=GND
   - YF-B1: Same as above
   - Verify on sensor datasheet

4. **Add pull-up resistor:**
   If pulses still not detected:
   ```
   GPIO 27 ----┬---- 5V (via 10k resistor)
               │
            Pulse wire from sensor
   ```

---

## 🔵 Calibration Issues

### Flow meter reads wrong liters

**Symptoms:**
- Device reports 500L but only 400L actually flowed
- Or: 100L reported but 150L flowed
- Inaccuracy gets worse at low or high flow rates

**Solutions:**
1. **Recalibrate:**
   - Run exactly 5L through sensor into measuring cup
   - Record `totalPulses` from Serial Monitor
   - Calculate: `PULSES_PER_LITER = totalPulses / 5`
   - Update firmware and re-flash

2. **Calibrate at multiple flow rates:**
   - Low flow (50L/min): count pulses for 2L
   - Medium flow (100L/min): count pulses for 5L
   - High flow (200L/min): count pulses for 10L
   - Average the results
   - Use averaged PULSES_PER_LITER

3. **Check for sensor drift:**
   - Calibrate again after 1 month
   - If significantly different, sensor may be wear out
   - Hall-effect sensors degrade with time (magnetic field weakens)

---

## 📞 Get Help

### Collect Diagnostics

Before posting for help, collect:

```bash
# 1. Firmware info
- What ESP32 board exactly? (Dev board, M5Stack, etc.)
- SIM modem: SIM7000 or SIM800L?
- Flow sensor model: YF-S201? YF-DN50? Other?

# 2. Error logs
- Full Serial Monitor output (copy/paste)
- Supabase function invocation error
- Browser console errors (F12)

# 3. Configuration
- What APN are you using?
- Is Supabase credentials correct?
- Has device been registered in machines table?

# 4. Network
- What country/network operator?
- Does device have clear sky view (for cellular)?
- Any firewalls or proxies between device and Supabase?
```

### Quick Reference Commands

```bash
# Test basic connectivity
curl -I https://your-project-ref.functions.supabase.co

# Test API endpoint
curl https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading

# Check device database
supabase db list
supabase db inspect

# View function logs (if deployed)
supabase functions list
supabase functions get-logs ingest-reading
```

---

**Last Updated:** 2026-07-21
**Status:** Comprehensive troubleshooting guide ready
