# Deployment & Testing Checklist

Complete step-by-step guide to deploy the water management system to production and test all features end-to-end.

## 📋 Pre-Deployment Checklist

### Environment & Code Quality
- [ ] All TypeScript compiles without errors: `npx tsc --noEmit`
- [ ] No console errors in development: `npm run dev`
- [ ] All `.env` and `.vscode/` files are in `.gitignore` (not committed)
- [ ] No hardcoded credentials in source code
- [ ] All imports are correct (no red squiggles in VS Code)

### Security Review
- [ ] Device secrets are bcrypt hashed (never plaintext stored)
- [ ] RLS policies enabled on all tables in Supabase
- [ ] Staff role required for provisioning functions
- [ ] JWT authentication on all Edge Functions
- [ ] DEVICE_SHARED_SECRET env var is removed (using per-machine secrets now)

### Documentation Review
- [ ] README.md is clear and complete
- [ ] ARCHITECTURE.md explains system design
- [ ] HARDWARE_INTEGRATION.md has provisioning guide
- [ ] GITHUB_PUSH_GUIDE.md is ready for team
- [ ] All code comments are up-to-date

---

## 🚀 Production Deployment

### Step 1: Frontend Deployment

#### Option A: Vercel (Recommended for React/Vite)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy --prod

# Vercel will:
# - Build the project (npm run build)
# - Deploy dist/ to CDN
# - Provide a production URL
# - Set up automatic deployments on git push
```

#### Option B: Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist

# Or enable automatic deployments:
# 1. Connect your GitHub repo on Netlify dashboard
# 2. Set build command: npm run build
# 3. Set publish directory: dist
```

#### Option C: Supabase Hosting
```bash
# Build locally first
npm run build

# Deploy via Supabase CLI
supabase projects list
supabase link --project-ref YOUR_PROJECT_REF
# (Supabase Hosting is limited; Vercel/Netlify recommended)
```

#### Environment Variables (Production)
In your hosting dashboard (Vercel/Netlify):
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**Do NOT include sensitive keys** — only the ANON key is needed (used by browser).

### Step 2: Edge Functions Deployment

```bash
# Ensure you're linked to the right Supabase project
npx supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
npx supabase functions deploy ingest-reading
npx supabase functions deploy provision-machine
npx supabase functions deploy regenerate-secret
npx supabase functions deploy generate-bills

# Verify deployments
npx supabase functions list

# View logs
npx supabase functions logs ingest-reading
```

### Step 3: Database & Migrations

#### Option A: Manual via Supabase Dashboard
1. Go to Supabase dashboard
2. SQL Editor → New Query
3. Copy-paste contents of `supabase/schema.sql`
4. Run the query
5. Verify tables and views are created

#### Option B: Via CLI
```bash
npx supabase db pull
npx supabase db push
```

#### Post-Migration
1. Verify tables exist: Tables → Should see 10+ tables
2. Verify views exist: Views → Should see 10 analytics views
3. Check RLS is enabled: Auth Policies → All tables should have policies

### Step 4: Configure Cron Jobs (Optional - For Automated Billing)

In Supabase dashboard (Extensions → cron):

```sql
SELECT cron.schedule(
  'generate-monthly-bills',
  '0 1 1 * *',  -- 1 AM on 1st of each month
  $$SELECT http_post(
    'https://your-project.functions.supabase.co/functions/v1/generate-bills',
    '{}',
    'application/json'
  )$$
);
```

---

## ✅ Testing Checklist

### 1. Authentication Flow
- [ ] Can create new Supabase auth account
- [ ] Can log in with email/password
- [ ] JWT token is stored in browser localStorage
- [ ] Can log out (clears token)
- [ ] Redirects to login if token expires

### 2. Dashboard
- [ ] Page loads without errors
- [ ] 6 KPI cards display (machines count, revenue, consumption, etc.)
- [ ] All 4 charts render (revenue trend, consumption trend, bill status, payment methods)
- [ ] Data auto-updates when new readings arrive (Realtime subscription works)
- [ ] Responsive on mobile (sidebar collapses, grid adapts)

### 3. Connect Machine Wizard
- [ ] Navigate to Operations → ➕ Connect Machine
- [ ] **Step 1 - Form**: Fill in machine details, click "Next"
- [ ] **Step 2 - Credentials**: 
  - [ ] Serial number displayed
  - [ ] Device secret shown (unique value)
  - [ ] Copy buttons work (feedback shows "✓ Copied")
  - [ ] cURL command appears and is correct
  - [ ] Warning: "Won't be shown again" is displayed
- [ ] **Step 3 - Waiting**:
  - [ ] Spinner animates while waiting
  - [ ] Can run cURL test command from credentials
  - [ ] After test reading, dashboard shows "✓ Connected" (green)
  - [ ] Machine appears in Machines list

### 4. Machines Management
- [ ] Navigate to Operations → 🤖 Machines
- [ ] Table shows all provisioned machines
- [ ] Status badges are color-coded (green=active, cyan=connected, yellow=offline, red=maintenance)
- [ ] Click "Manage" button on any machine
- [ ] Modal actions work:
  - [ ] **Regenerate Secret**: New secret generates, old one invalid
  - [ ] **Activate**: Machine status changes to "active"
  - [ ] **Mark Maintenance**: Machine status changes to "under_maintenance"

### 5. Customers Page
- [ ] Navigate to Customers
- [ ] Table loads with customer list (or "No customers found" if empty)
- [ ] Can see customer name, type, created date
- [ ] Responsive table design on mobile

### 6. Meters Page
- [ ] Navigate to Meters
- [ ] Table shows meter serial number, customer, status, install date
- [ ] Real-time updates when new meters are added

### 7. Readings Page
- [ ] Navigate to Readings
- [ ] Shows most recent meter readings
- [ ] Displays timestamp, machine, liters, tank level
- [ ] Auto-updates as new readings arrive

### 8. Billing Page
- [ ] Navigate to Billing
- [ ] Shows bills with customer, amount, status, due date
- [ ] Status badges: pending (orange), paid (green), overdue (red), partial (orange)
- [ ] Real-time updates

### 9. Payments Page
- [ ] Navigate to Payments
- [ ] Shows payment records with date, customer, amount, method
- [ ] Payment method badges color-coded

### 10. Reports Page
- [ ] Navigate to Reports
- [ ] Page loads (currently stub, can add custom reports later)

### 11. Sidebar Navigation
- [ ] All 11 navigation links visible
- [ ] Active link is highlighted (cyan color)
- [ ] Mobile: Sidebar collapses to hamburger menu
- [ ] Mobile: Hamburger menu opens/closes sidebar

### 12. Responsive Design
- [ ] Desktop (1200px+): Full layout, sidebar visible
- [ ] Tablet (768px): Sidebar visible, grid adapts
- [ ] Mobile (< 768px): Sidebar hidden, horizontal navigation, stack layout

### 13. Real-Time Updates
- [ ] Open dashboard on two browser tabs
- [ ] Send reading from one tab (cURL or test machine)
- [ ] Other tab updates in real-time (no page refresh needed)
- [ ] Machine status changes from "offline" to "connected"

### 14. Edge Function Security
- [ ] **ingest-reading**:
  - [ ] Rejects request with invalid x-device-key header (401)
  - [ ] Rejects request with wrong device secret (401)
  - [ ] Accepts request with correct secret (200 OK)
  - [ ] Machine status flips from "offline" to "connected" on first reading
- [ ] **provision-machine**:
  - [ ] Requires staff role (401 if not staff)
  - [ ] Rejects duplicate serial numbers (400)
  - [ ] Generates unique secrets each time
  - [ ] Returns secret plaintext only once
- [ ] **regenerate-secret**:
  - [ ] Old secret no longer works after regeneration (401)
  - [ ] New secret works immediately
  - [ ] Requires staff role (401 if not staff)

### 15. Build & Performance
- [ ] Production build completes: `npm run build`
- [ ] Build output is < 1MB (after gzip)
- [ ] No warnings in build output
- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices, SEO)

### 16. Error Handling
- [ ] Network error (no internet): Shows graceful message
- [ ] Invalid credentials: Shows login page
- [ ] Database error: Shows user-friendly message (not stack trace)
- [ ] Edge Function timeout: Shows retry button
- [ ] Missing .env: Shows warning in console, app doesn't crash

---

## 🔧 Testing Device Connectivity

### Test 1: Bench Test with cURL
```bash
# Get credentials from dashboard provisioning
SERIAL="WM-TEST-001"
SECRET="your-32-byte-hex-secret"
HOST="your-project.supabase.co"

# Send test reading
curl -X POST "https://${HOST}/functions/v1/ingest-reading" \
  -H "Content-Type: application/json" \
  -H "x-device-key: ${SERIAL}:${SECRET}" \
  -d '{
    "serial_number": "'${SERIAL}'",
    "liters_dispensed_total": 100,
    "tank_level_percent": 85,
    "flow_rate_lpm": 2.5,
    "battery_voltage": 4.2,
    "signal_rssi": -75
  }'

# Expected response: {"ok":true,"liters_recorded":100}
```

### Test 2: Real Device Firmware
1. Flash firmware to ESP32 with correct credentials
2. Monitor serial output for:
   ```
   Initializing flow sensor...
   Connecting to cellular...
   Connected! Signal: -75
   Posting to ingest-reading...
   Success: 100 liters recorded
   ```
3. Check dashboard updates in real-time

### Test 3: Secret Regeneration
1. Provision machine → get secret
2. Run cURL with secret (should work)
3. Regenerate secret in dashboard → get new secret
4. Run cURL with old secret (should fail: 401)
5. Run cURL with new secret (should work)

### Test 4: Machine Status Flow
1. Provision machine (status = "offline")
2. Send first reading via cURL
3. Dashboard updates to "connected"
4. Machine appears in 🤖 Machines list
5. Regenerate secret, machine status persists

---

## 📊 Load Testing (Optional)

For production readiness, test with simulated load:

```bash
# Send 100 readings rapidly (simulate fleet of machines)
for i in {1..100}; do
  SERIAL="WM-LOAD-$(printf "%03d" $i)"
  curl -X POST "https://${HOST}/functions/v1/ingest-reading" \
    -H "Content-Type: application/json" \
    -H "x-device-key: ${SERIAL}:${SECRET}" \
    -d '{"serial_number":"'${SERIAL}'","liters_dispensed_total":'$((RANDOM % 10000))'}'&
done
wait

# Verify all requests succeeded
# Check Supabase Functions → Logs for any errors
```

---

## 🔒 Security Testing

### Test 1: Environment Variable Exposure
- [ ] `.env.local` is NOT in git history
- [ ] `.vscode/` folder is NOT in git history
- [ ] `node_modules/` is NOT in git history
- [ ] Verify: `git ls-files | grep -E "\.env|\.vscode"`

### Test 2: Credentials in Code
- [ ] No Supabase keys hardcoded in source files
- [ ] Verify: `grep -r "VITE_SUPABASE" src/ docs/`

### Test 3: Device Secret Hashing
```sql
-- Query Supabase SQL Editor
SELECT id, serial_number, device_secret_hash FROM machines LIMIT 1;
-- device_secret_hash should be bcrypt hash ($2b$...), NOT plaintext
```

### Test 4: RLS Policies
- [ ] Try accessing another customer's data (should fail)
- [ ] Verify RLS is enabled on all tables:
  ```sql
  SELECT * FROM pg_policies WHERE schemaname = 'public';
  ```

---

## 📞 Post-Launch Monitoring

### Set Up Alerts
1. Supabase Dashboard → Monitoring
2. Set alert for:
   - [ ] Edge Function errors > 5% per minute
   - [ ] Database connection errors
   - [ ] API latency > 1 second

### Monitor Key Metrics
1. **Dashboard KPIs**:
   - [ ] Total machines connected
   - [ ] Daily revenue
   - [ ] Average consumption
   - [ ] Bill status breakdown

2. **System Health**:
   - [ ] Ingest-reading function logs (no 401/403 errors)
   - [ ] Device connectivity (machines sending readings regularly)
   - [ ] Database query performance (queries < 500ms)

### Regular Maintenance
- [ ] Weekly: Check for failed readings, disconnected machines
- [ ] Monthly: Review billing reports, payment reconciliation
- [ ] Quarterly: Database performance review, archive old readings

---

## 📝 Rollback Plan (If Issues Occur)

### Frontend Rollback
```bash
# Revert to previous version
git revert HEAD
npm run build
vercel deploy --prod
```

### Edge Function Rollback
```bash
# Revert function code
git checkout HEAD~1 supabase/functions/ingest-reading/
npx supabase functions deploy ingest-reading
```

### Database Rollback
1. Keep database backup before major changes
2. If data corrupted, restore from backup
3. Test restoration process weekly

---

## ✨ Success Criteria

You're ready for production when:
- ✅ All 16 testing items pass
- ✅ No TypeScript errors
- ✅ No console errors in production build
- ✅ Device connectivity test succeeds
- ✅ All Edge Functions deploy successfully
- ✅ Real-time updates work across tabs
- ✅ Responsive design passes mobile check
- ✅ Security tests pass (no secrets exposed)
- ✅ Lighthouse score > 90
- ✅ Team has access to documentation

---

## 📞 Deployment Support

If you encounter issues during deployment:

1. Check [GITHUB_PUSH_GUIDE.md](GITHUB_PUSH_GUIDE.md) for setup
2. Review [ARCHITECTURE.md](docs/ARCHITECTURE.md) for system overview
3. Consult [HARDWARE_INTEGRATION.md](docs/HARDWARE_INTEGRATION.md) for device issues
4. Check Supabase docs: https://supabase.com/docs

---

**You're ready to launch! 🚀**
