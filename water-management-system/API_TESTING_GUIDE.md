# Hardware Integration API Testing Guide

## 🧪 Testing the Ingest Endpoint

The Edge Function endpoint accepts POST requests with device telemetry.

### 1. Test with cURL (from terminal)

#### Single Reading
```bash
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "x-device-key: WM-0001:your-device-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "serial_number": "WM-0001",
    "liters_dispensed_total": 1234.56,
    "tank_level_percent": 75,
    "battery_voltage": 12.8,
    "signal_rssi": -87
  }'
```

#### Expected Success Response (200)
```json
{
  "ok": true,
  "liters_recorded": 45.23
}
```

#### Test: Missing Authentication
```bash
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "Content-Type: application/json" \
  -d '{"serial_number": "WM-0001", "liters_dispensed_total": 100}'
```
**Expected:** 401 Unauthorized

#### Test: Wrong Secret
```bash
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "x-device-key: WM-0001:wrong-secret" \
  -H "Content-Type: application/json" \
  -d '{"serial_number": "WM-0001", "liters_dispensed_total": 100}'
```
**Expected:** 401 Unauthorized

#### Test: Unknown Device
```bash
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "x-device-key: WM-9999:your-device-secret" \
  -H "Content-Type: application/json" \
  -d '{"serial_number": "WM-9999", "liters_dispensed_total": 100}'
```
**Expected:** 404 Not Found (device doesn't exist in database)

#### Test: With Payment Info (for coin acceptor)
```bash
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "x-device-key: WM-0001:your-device-secret" \
  -H "Content-Type: application/json" \
  -d '{
    "serial_number": "WM-0001",
    "liters_dispensed_total": 1280.99,
    "tank_level_percent": 68,
    "battery_voltage": 12.5,
    "signal_rssi": -85,
    "amount_paid": 50,
    "payment_method": "cash"
  }'
```
**Expected:** 200 OK with recorded liters

---

## 📮 Postman Collection

Import this into Postman to test API endpoints:

```json
{
  "info": {
    "name": "Water Management API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Valid Reading",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "x-device-key",
            "value": "WM-0001:{{device_secret}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"serial_number\": \"WM-0001\",\n  \"liters_dispensed_total\": 1234.56,\n  \"tank_level_percent\": 75,\n  \"battery_voltage\": 12.8,\n  \"signal_rssi\": -87\n}"
        },
        "url": {
          "raw": "https://{{project_ref}}.functions.supabase.co/functions/v1/ingest-reading",
          "protocol": "https",
          "host": ["{{project_ref}}", "functions", "supabase", "co"],
          "path": ["functions", "v1", "ingest-reading"]
        }
      }
    },
    {
      "name": "With Payment",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "x-device-key",
            "value": "WM-0001:{{device_secret}}"
          },
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"serial_number\": \"WM-0001\",\n  \"liters_dispensed_total\": 1280.99,\n  \"tank_level_percent\": 68,\n  \"battery_voltage\": 12.5,\n  \"signal_rssi\": -85,\n  \"amount_paid\": 50,\n  \"payment_method\": \"cash\"\n}"
        },
        "url": {
          "raw": "https://{{project_ref}}.functions.supabase.co/functions/v1/ingest-reading",
          "protocol": "https",
          "host": ["{{project_ref}}", "functions", "supabase", "co"],
          "path": ["functions", "v1", "ingest-reading"]
        }
      }
    }
  ]
}
```

**Variables to set in Postman:**
- `{{project_ref}}` = your-project-ref (e.g., eabcdefghijklmno)
- `{{device_secret}}` = your-device-secret
- `{{device_key}}` = serial_number:secret

---

## 3. Test Sequence (Realistic Device Behavior)

This simulates a real device sending readings over time:

```bash
# Device wakes up every 15 minutes
# First reading: 1000L total
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "x-device-key: WM-0001:your-device-secret" \
  -H "Content-Type: application/json" \
  -d '{"serial_number":"WM-0001","liters_dispensed_total":1000,"tank_level_percent":80,"battery_voltage":13.2}'

# 15 minutes later: sold 15L more
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "x-device-key: WM-0001:your-device-secret" \
  -H "Content-Type: application/json" \
  -d '{"serial_number":"WM-0001","liters_dispensed_total":1015,"tank_level_percent":79.7,"battery_voltage":13.1}'

# 15 minutes later: sold 12L more
curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
  -H "x-device-key: WM-0001:your-device-secret" \
  -H "Content-Type: application/json" \
  -d '{"serial_number":"WM-0001","liters_dispensed_total":1027,"tank_level_percent":79.4,"battery_voltage":13.0}'
```

Each request should return:
- First: `"liters_recorded": 1000` (initial reading)
- Second: `"liters_recorded": 15` (delta since last)
- Third: `"liters_recorded": 12` (delta since last)

---

## 4. Verify Data in Database

After sending readings via API, verify they were recorded:

```sql
-- Check raw readings table
SELECT * FROM readings 
WHERE machine_id = (SELECT id FROM machines WHERE serial_number = 'WM-0001')
ORDER BY reported_at DESC 
LIMIT 5;

-- Check sales/revenue
SELECT * FROM sales
WHERE machine_id = (SELECT id FROM machines WHERE serial_number = 'WM-0001')
ORDER BY sold_at DESC 
LIMIT 5;

-- Check if low tank alert was triggered
SELECT * FROM alerts 
WHERE machine_id = (SELECT id FROM machines WHERE serial_number = 'WM-0001')
AND type = 'low_tank';

-- Check machine status updated
SELECT serial_number, status, last_seen_at FROM machines WHERE serial_number = 'WM-0001';
```

---

## 🔍 Performance Testing

### Load Test (simulate many devices)

```bash
#!/bin/bash
# Simulate 50 devices sending readings simultaneously

for i in {1..50}; do
  SERIAL="WM-$(printf '%04d' $i)"
  LITERS=$(echo "1000 + $RANDOM % 100" | bc)
  
  curl -X POST https://your-project-ref.functions.supabase.co/functions/v1/ingest-reading \
    -H "x-device-key: $SERIAL:your-device-secret" \
    -H "Content-Type: application/json" \
    -d "{\"serial_number\":\"$SERIAL\",\"liters_dispensed_total\":$LITERS}" \
    &
done

wait
echo "All 50 devices sent data!"
```

### Monitor Supabase Function Execution Time

In Supabase console:
1. Go to Functions → ingest-reading
2. Click "Invocations"
3. See response times and any errors
4. Typical: 50-200ms per invocation

---

## 🐛 Error Response Examples

### 401: Unauthorized
```json
{"error": "unauthorized"}
```
**Cause:** Wrong or missing x-device-key header
**Fix:** Verify device secret matches DEVICE_SHARED_SECRET

### 400: Serial Mismatch
```json
{"error": "serial mismatch"}
```
**Cause:** serial_number in body doesn't match x-device-key
**Fix:** Ensure both match

### 404: Unknown Device
```json
{"error": "unknown device"}
```
**Cause:** Serial number not registered in machines table
**Fix:** Run INSERT into machines table

### 500: Database Error
```json
{"error": "database error message"}
```
**Cause:** Database connectivity or constraint violation
**Fix:** Check Supabase dashboard, verify machine_id exists

---

## 📊 Dashboard Verification

After API tests, verify data appears on dashboard:

1. **Open** http://localhost:5173
2. **Check:**
   - [ ] Fleet overview stats updated
   - [ ] Machine cards show new data
   - [ ] Liters today increased
   - [ ] Revenue changed (if amount_paid sent)
   - [ ] Last report timestamp recent
3. **Verify Real-time:**
   - [ ] Changes appear without page refresh
   - [ ] No console errors
   - [ ] Machine status shows "online"

---

## 🔄 Integration Checklist

Before marking API complete:

- [ ] Single API call succeeds (200 response)
- [ ] Authentication properly enforced (401 when wrong)
- [ ] Database records created (verify in SQL)
- [ ] Dashboard shows data in real-time
- [ ] Multiple devices work independently
- [ ] Battery/tank level tracked
- [ ] Payment info captured (if sent)
- [ ] Alerts triggered (low tank < 15%)
- [ ] Machine status updates to "online"
- [ ] Load test handles 50+ devices

---

## 📈 Next Steps

1. **Test with real ESP32 firmware** (after calibration)
2. **Monitor Edge Function logs** for errors
3. **Set up alerts** for offline devices
4. **Create analytics dashboard** with revenue reports
5. **Configure backup retention** for data safety
