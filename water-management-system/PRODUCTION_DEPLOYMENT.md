# Production Deployment & Monitoring Guide

## 🚀 Pre-Production Checklist

### Security
- [ ] Change default `DEVICE_SHARED_SECRET` to unique random value (>32 chars)
- [ ] Enable Row-Level Security (RLS) on all tables:
  ```sql
  ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
  ALTER TABLE readings ENABLE ROW LEVEL SECURITY;
  ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
  ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
  ```
- [ ] Create RLS policies (see schema.sql)
- [ ] Use environment variables for ALL secrets (never hardcode)
- [ ] Rotate secrets quarterly
- [ ] Implement HMAC signing for device payload (upgrade from basic auth)

### Database
- [ ] Enable automatic backups in Supabase
  - Supabase console → Settings → Backups
  - Set to Daily or Weekly
- [ ] Test backup restore process
- [ ] Set up database size monitoring
- [ ] Archive old data (> 1 year) to cold storage
- [ ] Set up automated jobs for data cleanup

### Performance
- [ ] Load test with all your machines sending simultaneously:
  ```bash
  # Test with 100 devices at once
  for i in {1..100}; do
    node simulate-device.js --machine-id WM-$(printf '%04d' $i) &
  done
  ```
- [ ] Monitor Edge Function invocation times (target: <500ms)
- [ ] Add caching layer if response > 1000ms:
  ```typescript
  // In Edge Function, add edge cache headers
  response.headers.set('Cache-Control', 'public, max-age=10');
  ```
- [ ] Monitor database connection pool (Supabase limits to 16 by default)

### Monitoring & Alerts
- [ ] Set up Supabase email alerts:
  - Go to Settings → Alerts
  - Enable for: Database errors, Function failures
- [ ] Create custom monitoring dashboard:
  ```sql
  -- Monitor Edge Function health
  SELECT 
    DATE(created_at) as date,
    COUNT(*) as invocations,
    COUNT(*) FILTER(WHERE status = 'success') as successful,
    AVG(execution_time) as avg_time_ms
  FROM edge_functions_logs
  GROUP BY date
  ORDER BY date DESC;
  ```
- [ ] Alert on offline machines > 30 minutes
- [ ] Alert on low tank < 20%
- [ ] Alert on failed Edge Function invocations

### Deployment
- [ ] Deploy frontend to production (Vercel, Netlify, etc.)
- [ ] Use custom domain (not localhost)
- [ ] Enable CORS on Edge Function for production domain
- [ ] Set up SSL/TLS (automatic with most hosts)
- [ ] Create CI/CD pipeline for code changes
- [ ] Document rollback procedure
- [ ] Have backup database ready for failover

---

## 📊 Production Monitoring Queries

### Daily Revenue Report
```sql
-- Run daily via scheduled job or manually
SELECT 
  DATE(sold_at)::date as date,
  m.name as machine,
  SUM(s.liters) as liters_sold,
  SUM(s.amount_paid) as revenue,
  COUNT(*) as transactions
FROM sales s
JOIN machines m ON s.machine_id = m.id
WHERE DATE(sold_at) >= NOW()::date - INTERVAL '30 days'
GROUP BY date, machine
ORDER BY date DESC, revenue DESC;
```

### Machine Uptime Report
```sql
-- Show which machines are offline
SELECT 
  m.name,
  m.serial_number,
  m.status,
  m.last_seen_at,
  EXTRACT(EPOCH FROM (NOW() - m.last_seen_at))/3600 as hours_offline
FROM machines m
WHERE m.status = 'offline'
ORDER BY m.last_seen_at ASC;
```

### Alert Frequency
```sql
-- Track alert trends (useful for early warning)
SELECT 
  DATE(created_at)::date as date,
  type as alert_type,
  COUNT(*) as count,
  COUNT(*) FILTER(WHERE resolved = true) as resolved
FROM alerts
GROUP BY date, alert_type
ORDER BY date DESC, count DESC;
```

### Battery Health
```sql
-- Monitor battery voltage across fleet
SELECT 
  m.name,
  AVG(r.battery_voltage) as avg_battery_v,
  MIN(r.battery_voltage) as min_battery_v,
  MAX(r.battery_voltage) as max_battery_v,
  COUNT(*) as readings
FROM readings r
JOIN machines m ON r.machine_id = m.id
WHERE r.reported_at >= NOW() - INTERVAL '7 days'
GROUP BY m.id, m.name
ORDER BY avg_battery_v ASC;  -- Show lowest first
```

### Water Dispensed Trends
```sql
-- Compare week-over-week
SELECT 
  DATE(sold_at)::date as date,
  EXTRACT(WEEK FROM sold_at) as week,
  SUM(liters) as liters_sold,
  COUNT(*) as transactions
FROM sales
WHERE DATE(sold_at) >= NOW()::date - INTERVAL '60 days'
GROUP BY DATE(sold_at), EXTRACT(WEEK FROM sold_at)
ORDER BY date DESC;
```

---

## 🔔 Critical Alerts to Set Up

### 1. Machine Offline > 2 Hours
```typescript
// In a Deno cron function (runs hourly)
const offlineMinutes = 120;
const { data: offline } = await supabase
  .from("machines")
  .select("*")
  .lt("last_seen_at", new Date(Date.now() - offlineMinutes * 60000))
  .eq("status", "offline");

if (offline?.length > 0) {
  // Send email alert
  await supabase.functions.invoke("send-alert", {
    body: { 
      subject: `${offline.length} machines offline`,
      machines: offline.map(m => `${m.name} (${m.serial_number})`)
    }
  });
}
```

### 2. Low Tank Alert
```typescript
// Already handled by Edge Function on ingest-reading
// Triggers when tank_level_percent < 15
// Action: Send maintenance request email
```

### 3. Revenue Below Target
```sql
-- Check daily revenue vs. target
SELECT 
  m.name,
  COALESCE(SUM(s.amount_paid), 0) as revenue_today,
  m.daily_target_liters * 50 as target_revenue,  -- Assume KES 50 per liter
  CASE 
    WHEN COALESCE(SUM(s.amount_paid), 0) < m.daily_target_liters * 50 THEN 'LOW'
    ELSE 'OK'
  END as status
FROM machines m
LEFT JOIN sales s ON s.machine_id = m.id AND DATE(s.sold_at) = DATE(NOW())
WHERE m.daily_target_liters > 0
GROUP BY m.id, m.name
HAVING COALESCE(SUM(s.amount_paid), 0) < m.daily_target_liters * 50;
```

### 4. Sensor Error (abnormal readings)
```typescript
// Detect if sensor is stuck or faulty
const { data: readings } = await supabase
  .from("readings")
  .select("*")
  .eq("machine_id", machineId)
  .order("reported_at", { ascending: false })
  .limit(5);

// Check if liters are increasing linearly (anomaly detection)
const deltas = readings.map((r, i) => 
  i > 0 ? r.liters_dispensed_total - readings[i-1].liters_dispensed_total : 0
);

if (deltas.some(d => d > 1000)) {
  // Alert: impossible liters in single reading
  console.error("Sensor anomaly detected:", readings[0]);
}
```

---

## 📈 Dashboards to Create

### 1. Fleet Overview (Real-time)
```
┌─────────────────────────────────────────┐
│ LIVE FLEET STATUS                       │
├─────────────────────────────────────────┤
│ Total Machines: 50                      │
│ Online: 48 (96%)  🟢                    │
│ Offline: 2 (4%)   🔴                    │
│                                         │
│ Today's Metrics:                        │
│ Liters: 4,234 L                        │
│ Revenue: KES 211,700                    │
│ Avg per machine: 85.2 L                 │
└─────────────────────────────────────────┘
```

### 2. Machine Details (Per Machine)
```
Machine: Kilimani ATM #1 (WM-0001)
Status: Online
Last Report: 3 min ago
Today's Sales: 156.3 L | KES 7,815
Tank Level: 62%
Battery: 12.8V
Signal: -87 dBm
```

### 3. Revenue Trends (Weekly)
```
Week        | Liters   | Revenue   | Machines
2026-07-14  | 28,450   | 1.42M KES | 50 online
2026-07-07  | 26,340   | 1.32M KES | 49 online
2026-06-30  | 31,200   | 1.56M KES | 50 online
```

### 4. Alerts & Incidents (Last 30 days)
```
Date       | Type        | Machine     | Status
2026-07-21 | low_tank    | WM-003      | Active ⚠️
2026-07-21 | offline     | WM-012      | Resolved ✓
2026-07-20 | low_battery | WM-015      | Resolved ✓
2026-07-19 | offline     | WM-008      | Resolved ✓
```

---

## 🔄 Maintenance Procedures

### Weekly
- [ ] Check offline machines (why are they down?)
- [ ] Review battery levels (any trending low?)
- [ ] Verify all reading data is flowing
- [ ] Check database storage growth

### Monthly
- [ ] Generate revenue report
- [ ] Review alert patterns (any trends?)
- [ ] Update device firmware if fixes available
- [ ] Audit security: check access logs, rotate secrets

### Quarterly
- [ ] Performance audit (load test)
- [ ] Database optimization (analyze query performance)
- [ ] Update documentation with new learnings
- [ ] Plan for infrastructure scaling
- [ ] Security audit (penetration test)

### Annually
- [ ] Disaster recovery drill (restore from backup)
- [ ] Major firmware release / upgrade
- [ ] Hardware replacement review (aging devices)
- [ ] Contract renewal (telco, hosting, etc.)

---

## 📱 Mobile App Integration (Optional Future)

The API is already mobile-ready. To add mobile app:

1. **Mobile client can call same Edge Function:**
   ```
   POST /ingest-reading
   - Add API key header for mobile app auth (different from device auth)
   - Same JSON payload as device
   ```

2. **Create mobile dashboard in React Native/Flutter:**
   - Use same Supabase real-time subscriptions
   - Show fleet overview, machine details, revenue
   - Accept manual readings (for cases where device fails)

3. **Enable manual data entry:**
   ```sql
   -- Add column to track data source
   ALTER TABLE sales ADD COLUMN data_source TEXT;
   -- values: 'device', 'manual', 'correction'
   ```

---

## 🔐 Security Hardening (Production)

### Upgrade from Shared Secret to Per-Device HMAC

**Current (vulnerable):**
```
All devices use: x-device-key: WM-0001:shared-secret
```

**Better (per-device):**
```
Each device has: stored in machines table
x-device-key: WM-0001:hmac-signature
(signature = HMAC-SHA256(payload, device-specific-secret))
```

**Implementation:**
1. Add `device_secret` column to machines table
2. Store unique secret per device (not shared)
3. In firmware, compute HMAC of payload
4. In Edge Function, verify HMAC

### Rate Limiting

```typescript
// Add to Edge Function to prevent spam
const rateLimiter = new Map();
const MAX_REQUESTS_PER_MINUTE = 10;

const key = req.headers.get("x-device-key");
const now = Date.now();
const limit = rateLimiter.get(key) || [];

const recent = limit.filter(t => now - t < 60000);
if (recent.length >= MAX_REQUESTS_PER_MINUTE) {
  return new Response("Rate limited", { status: 429 });
}
recent.push(now);
rateLimiter.set(key, recent);
```

### IP Whitelisting (Optional)

If all devices connect from known IP ranges:
```sql
-- Add to machines table
ALTER TABLE machines ADD COLUMN allowed_ips TEXT[];

-- Check in Edge Function
const clientIp = req.headers.get("cf-connecting-ip");
if (!machine.allowed_ips?.includes(clientIp)) {
  return new Response("IP not allowed", { status: 403 });
}
```

---

## 🆘 Incident Response Plan

### If Database Goes Down
1. **Immediate:**
   - Devices keep local count (will resend on recovery)
   - Dashboard shows cached data (last 24h)
   - Alert operations team

2. **Recovery:**
   - Restore from backup (should take <30 min)
   - Verify all devices reconnect
   - Check for data loss

3. **Prevention:**
   - Setup Supabase high-availability
   - Use Supabase replication to backup DB
   - Test restore procedure monthly

### If Edge Function Fails
1. **Immediate:**
   - Devices get 5xx response
   - Firmware retries after 1 minute
   - Dashboard can't ingest new data

2. **Recovery:**
   - Check Supabase function logs
   - Redeploy function
   - Monitor invocations return to normal

3. **Prevention:**
   - Set up function error alerts
   - Keep backup version of function deployed
   - Load test before major changes

### If Firmware Bug Found
1. **Immediate:**
   - Document issue
   - Disable affected devices if critical
   - Start investigating

2. **Fix:**
   - Develop and test new firmware locally
   - Flash update to test machine
   - Verify data now correct

3. **Rollout:**
   - Update all machines in fleet (staggered)
   - Monitor for new issues
   - Document lessons learned

---

**Last Updated:** 2026-07-21
**Status:** Production deployment ready
