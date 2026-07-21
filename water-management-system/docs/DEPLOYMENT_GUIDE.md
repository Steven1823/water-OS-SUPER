# Deployment & Setup Guide

## Prerequisites

- Node.js 18+ and npm
- Supabase account and CLI installed
- Environment variables: Supabase URL, anon key
- Optional: Vercel account for hosting

## Step 1: Setup Local Development Environment

### 1.1 Clone and Install Dependencies

```bash
cd water-management-system
npm install
```

This will install:
- React 19, React Router 7
- Recharts for charts
- Supabase JS client
- TypeScript, Vite

### 1.2 Create Environment File

Create `.env.local` in the root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these values from your Supabase project settings > API.

### 1.3 Start Development Server

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

---

## Step 2: Deploy Database Migrations

### 2.1 Initialize Supabase Project

```bash
supabase init
```

This creates a local environment linked to your project.

### 2.2 Apply Migrations

```bash
supabase db push
```

This runs all 10 migration files in order:
1. `20260721_001_customer_types.sql` - Tariff lookup
2. `20260721_002_customers.sql` - Customer records
3. `20260721_003_meters.sql` - Meter assignments
4. `20260721_004_meter_readings.sql` - Consumption data
5. `20260721_005_billing.sql` - Bill records
6. `20260721_006_payments.sql` - Payment tracking + trigger
7. `20260721_007_staff_management.sql` - Employees & roles
8. `20260721_008_inventory.sql` - Stock items & suppliers
9. `20260721_009_maintenance.sql` - Repairs & leak reports
10. `20260721_010_dashboard_views.sql` - 10 SQL views for KPIs

Check migration status in Supabase Dashboard > SQL Editor > Migrations.

### 2.3 Verify Schema

In Supabase Dashboard, check:
- Tables: customers, meters, bills, payments, meter_readings, etc.
- Views: v_dashboard_summary, v_revenue_last_12_months, etc.
- Triggers: trg_update_bill_status_on_payment

---

## Step 3: Deploy Edge Functions

### 3.1 Set Environment Variables

In Supabase Dashboard > Settings > Functions > Environment Variables:

```
BILLING_API_KEY=generate-a-secure-random-string-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Get `SUPABASE_SERVICE_ROLE_KEY` from Settings > API Keys > Service Role.

### 3.2 Deploy generate-bills Function

```bash
supabase functions deploy generate-bills
```

Verify deployment in Supabase Dashboard > Functions > generate-bills.

### 3.3 Test the Function

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-bills \
  -H "X-API-Key: your-billing-api-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response (example):
```json
{
  "success": true,
  "bills_generated": 0,
  "bills_failed": 0,
  "total_revenue": 0,
  "errors": []
}
```

---

## Step 4: Setup Scheduled Billing (Optional)

### 4.1 Enable pg_cron Extension

In Supabase Dashboard > SQL Editor, run:

```sql
create extension if not exists pg_cron;
```

### 4.2 Create Monthly Billing Schedule

```sql
select cron.schedule(
  'monthly_billing_1st_of_month',
  '0 0 1 * *',  -- First day of each month at 00:00 UTC
  $$
  select net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/generate-bills',
    headers := jsonb_build_object(
      'x-api-key', 'your-billing-api-key',
      'content-type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

### 4.3 Verify Cron Job

```sql
select * from cron.job;
```

Should see `monthly_billing_1st_of_month` in the list.

---

## Step 5: Populate Test Data

Run this SQL in Supabase Dashboard > SQL Editor to create test data:

```sql
-- Create test customer type
insert into public.customer_types (name, tariff_rate_per_liter, description)
values ('Residential', 10, 'Household customers') on conflict do nothing;

-- Get customer_type_id
with ct as (
  select id from public.customer_types where name = 'Residential'
)
-- Create test customers
insert into public.customers (name, phone, email, address, customer_type_id, status)
select 'John Doe', '254712345678', 'john@example.com', '123 Main St', ct.id, 'active'
from ct
on conflict do nothing;

-- Get customer_id
with cust as (
  select id from public.customers where name = 'John Doe'
)
-- Create test meter
insert into public.meters (serial_number, customer_id, install_date, status)
select 'METER-001', cust.id, current_date, 'active'
from cust
on conflict (serial_number) do nothing;

-- Get meter_id
with m as (
  select id from public.meters where serial_number = 'METER-001'
)
-- Create test meter readings for this month
insert into public.meter_readings (meter_id, reading_value, reading_date, source, notes)
select m.id, 1000, (current_date - interval '10 days')::date, 'manual', 'Opening reading'
from m
union all
select m.id, 3500, current_date, 'manual', 'Closing reading'
from m;

-- Check what we created
select 'Customers' as entity, count(*) as count from public.customers
union all
select 'Meters', count(*) from public.meters
union all
select 'Meter Readings', count(*) from public.meter_readings;
```

---

## Step 6: Generate Test Bill

### 6.1 Via Edge Function

Call the generate-bills function:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-bills \
  -H "X-API-Key: your-billing-api-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response (example):
```json
{
  "success": true,
  "bills_generated": 1,
  "bills_failed": 0,
  "total_revenue": 25000,
  "errors": []
}
```

### 6.2 Verify Bill Created

In Supabase Dashboard > SQL Editor:

```sql
select * from public.bills order by created_at desc limit 1;
```

Expected: 1 bill for John Doe, 2500 liters (3500 - 1000), amount = 25000 (2500 × 10).

---

## Step 7: Record Test Payment

### 7.1 Insert Payment

```sql
with b as (
  select id from public.bills order by created_at desc limit 1
)
insert into public.payments (bill_id, amount, method, paid_at, receipt_number)
select b.id, 25000, 'cash', now(), 'RECEIPT-001'
from b;
```

### 7.2 Verify Bill Status Updated

```sql
select id, amount, status from public.bills order by created_at desc limit 1;
```

Expected: status = 'paid' (trigger auto-updated it when payment was recorded).

---

## Step 8: Check Dashboard KPIs

1. Open http://localhost:5173 in browser
2. Dashboard should show:
   - **Total Customers**: 1
   - **Active Meters**: 1
   - **Bills This Month**: 1
   - **Payments Received**: 1
   - **Pending Bills**: 0
   - **Water Consumed**: 2500 L

3. Charts should display:
   - Revenue Last 12 Months: 25000 KES
   - Water Consumption: 2500 L
   - Bill Status: 1 paid
   - Payment Methods: 1 cash transaction

If you see zeros, check:
- Migrations applied successfully
- Test data inserted
- Supabase credentials in `.env.local` are correct
- Browser console for errors

---

## Step 9: Deploy to Production

### 9.1 Build React App

```bash
npm run build
```

This creates `dist/` folder ready for hosting.

### 9.2 Deploy to Vercel (Recommended)

```bash
npm install -g vercel
vercel
```

Follow prompts to connect your GitHub repo and deploy.

### 9.3 Alternative: Deploy to Other Hosts

- **Netlify**: Drag-and-drop `dist/` or connect GitHub
- **GitHub Pages**: Push to GitHub, enable Pages in settings
- **Self-hosted**: Copy `dist/` to your web server

### 9.4 Update Environment Variables on Host

Set production `.env` variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

---

## Step 10: Setup Continuous Deployment (Optional)

### 10.1 GitHub Actions for Migrations

Create `.github/workflows/db-deploy.yml`:

```yaml
name: Deploy DB Migrations
on:
  push:
    branches: [main]
    paths:
      - 'supabase/migrations/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

### 10.2 GitHub Actions for Functions

Create `.github/workflows/functions-deploy.yml`:

```yaml
name: Deploy Edge Functions
on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
      - run: supabase functions deploy generate-bills
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

---

## Troubleshooting

### Issue: Dashboard shows all zeros

**Solutions:**
1. Check if migrations ran: `supabase db show`
2. Verify test data: Query `select * from customers;` in SQL Editor
3. Check dashboard views: `select * from v_dashboard_summary;`
4. Inspect browser console for JavaScript errors

### Issue: Bills don't generate

**Solutions:**
1. Verify customers have active meters: `select * from meters where status='active';`
2. Check meter has readings: `select * from meter_readings;`
3. Manually call generate-bills: `curl ...` from Step 6.1
4. Check Edge Function logs: Supabase Dashboard > Functions > generate-bills

### Issue: Real-time updates not working

**Solutions:**
1. Verify Realtime enabled: Supabase Dashboard > Configuration > Realtime
2. Check RLS policies: All SELECT policies should include `using (true)` for read access
3. Inspect browser network tab for WebSocket connections
4. Try refreshing the page

### Issue: Permission denied on functions

**Solutions:**
1. Verify RLS policies exist: `select * from auth.access_audit_log;` (if enabled)
2. Check BILLING_API_KEY matches: Must be identical in header and env var
3. Verify SERVICE_ROLE_KEY is set in Function environment
4. Test with curl first, then debug React app

---

## Security Checklist

- [ ] Rotate BILLING_API_KEY to a secure value
- [ ] Never commit `.env.local` to Git (add to `.gitignore`)
- [ ] Verify SUPABASE_SERVICE_ROLE_KEY is set only in Edge Function env, not frontend
- [ ] Enable MFA on Supabase account
- [ ] Set up Row-Level Security (RLS) for all tables (included in migrations)
- [ ] Use HTTPS everywhere (automatic with Vercel/Supabase)
- [ ] Review RLS policies regularly for unauthorized access
- [ ] Monitor Supabase logs for suspicious activity

---

## Next Steps

1. Connect to live M-Pesa API for payment reconciliation
2. Build customer portal for self-serve bill viewing
3. Add SMS notifications for payment reminders
4. Setup email invoice delivery
5. Create staff management UI (add/edit employees & roles)
6. Build advanced reporting (PDF exports, etc.)
7. Implement multi-tenant support for multiple water utilities
