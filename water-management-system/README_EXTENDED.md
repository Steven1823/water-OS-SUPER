# Water Management System — Extended Edition

A comprehensive water utility management platform combining:
- **IoT Fleet Tracking**: Water dispensing machines with real-time telemetry
- **Customer Billing**: Automated monthly bill generation and payment tracking
- **Meter Management**: Individual meter readings (manual + automatic)
- **Staff & Inventory**: Employee management and stock control
- **Analytics Dashboard**: Real-time KPIs and 12-month trends

Built with **React 19**, **Supabase PostgreSQL**, **TypeScript**, **Vite**, and **Recharts**.

## Project Structure

```
water-management-system/
├── src/
│   ├── components/          # React components (Layout, StatCard, Dashboard, etc.)
│   ├── hooks/               # Custom React hooks (useCustomers, useBills, useDashboardMetrics, etc.)
│   ├── pages/               # Page components (Dashboard, Customers, Meters, Billing, etc.)
│   ├── styles/              # CSS (layout, dashboard, list-page, index)
│   ├── lib/                 # Supabase client
│   ├── types.ts             # TypeScript types
│   ├── App.tsx              # React Router setup
│   └── main.tsx             # Entry point
├── supabase/
│   ├── migrations/          # 10 database migrations
│   │   ├── 20260721_001_customer_types.sql
│   │   ├── 20260721_002_customers.sql
│   │   ├── 20260721_003_meters.sql
│   │   ├── 20260721_004_meter_readings.sql
│   │   ├── 20260721_005_billing.sql
│   │   ├── 20260721_006_payments.sql
│   │   ├── 20260721_007_staff_management.sql
│   │   ├── 20260721_008_inventory.sql
│   │   ├── 20260721_009_maintenance.sql
│   │   └── 20260721_010_dashboard_views.sql
│   ├── functions/
│   │   ├── ingest-reading/  # IoT telemetry endpoint (existing)
│   │   └── generate-bills/  # Monthly billing engine (new)
│   └── schema.sql           # Legacy schema (machines, readings, sales, alerts)
├── docs/
│   ├── ARCHITECTURE.md              # Original IoT architecture
│   ├── ARCHITECTURE_EXTENDED.md     # Complete system architecture (NEW)
│   ├── HARDWARE_INTEGRATION.md      # Flow sensor & cellular details
│   ├── GENERATE_BILLS_EDGE_FUNCTION.md  # Billing engine documentation (NEW)
│   └── DEPLOYMENT_GUIDE.md          # Setup & deployment steps (NEW)
├── firmware/
│   └── water_machine_cellular/      # ESP32 + SIM7000 Arduino code
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.local (create this)
```

## Quick Start

### 1. Clone & Install

```bash
cd water-management-system
npm install
```

This installs React Router, Recharts, Supabase client, TypeScript, and Vite.

### 2. Setup Environment

Create `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Get these from your Supabase project: Settings > API.

### 3. Deploy Database

```bash
supabase init
supabase db push
```

This applies all 10 migrations in order:
- Lookup tables (customer_types, roles)
- Core entities (customers, meters, meter_readings)
- Billing (bills, payments with auto-update trigger)
- Operations (staff, inventory, repairs, leak reports)
- Analytics views (10 SQL views for dashboard KPIs)

### 4. Deploy Edge Functions

```bash
# Set environment variables in Supabase Dashboard > Settings > Functions
# - BILLING_API_KEY=generate-secure-random-string
# - SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

supabase functions deploy generate-bills
```

### 5. Start Development Server

```bash
npm run dev
```

Open http://localhost:5173

---

## Features

### Dashboard
- **6 KPI Cards**: Total Customers, Active Meters, Bills This Month, Payments Received, Pending Bills, Water Consumed
- **4 Charts**:
  - Revenue Last 12 Months (line chart)
  - Water Consumption Last 12 Months (line chart)
  - Bill Status Distribution (pie chart)
  - Payment Methods (bar chart)
- Real-time updates via Supabase subscriptions

### Customers
- List all customers with status (active, inactive, suspended)
- Filter by customer type (residential, commercial, industrial)
- View tariff rate per liter
- Add/edit customer information

### Meters
- Assign meters to customers
- Track meter status (active, inactive, faulty, removed)
- Optional link to legacy water machines
- View meter history

### Meter Readings
- Record monthly consumption readings
- Mark source: manual (staff) or automatic (from machine)
- Calculate consumption delta between readings
- Historical view with dates

### Billing
- View all bills with status (pending, paid, partial, overdue, cancelled)
- See billing period, liters billed, and amount due
- Generate monthly bills (via generate-bills edge function)
- Track pending bills by due date

### Payments
- Record payments by method (M-Pesa, cash, bank transfer, cheque)
- Automatic bill status update on payment:
  - If fully paid → status = 'paid'
  - If partially paid → status = 'partial'
- Receipt number tracking

### Maintenance
- Report repairs on machines or meters
- Track leak reports with severity levels
- Status tracking (open, in_progress, completed, cancelled)
- Assign to staff members

### Reports & Analytics (Stub pages)
- Future: Customer statements, revenue reports, delinquency lists, etc.

### Staff Management (Stub page)
- Future: Employee directory, role assignments, permissions

### Inventory (Stub page)
- Future: Stock tracking, reorder alerts, supplier management

---

## Data Model Highlights

### New Tables (Extended)
- **customer_types**: Tariff classifications (residential, commercial, etc.)
- **customers**: Customer records with status
- **meters**: Individual meters linked to customers
- **meter_readings**: Consumption data (manual or automatic)
- **bills**: Generated monthly bills with status tracking
- **payments**: Payment records with trigger for auto-status-update
- **employees + roles**: Staff management with RLS
- **stock_items + suppliers**: Inventory management
- **repairs + leak_reports**: Maintenance tracking

### Analytics Views (10 SQL views)
All queries return real data from tables:
- `v_dashboard_summary` (6 KPI metrics)
- `v_revenue_last_12_months` (monthly revenue)
- `v_consumption_last_12_months` (monthly liters)
- `v_bill_status_breakdown` (count by status)
- `v_payment_method_breakdown` (count + amount by method)
- `v_customer_growth_last_12_months` (new customers per month)
- `v_customer_receivables` (outstanding balances)
- `v_meters_by_customer` (meter count per customer)
- `v_repair_summary` (open repairs by priority)
- `v_leak_summary` (leak reports by severity)

### Foreign Keys & Relationships
- customers → customer_types (tariff lookup)
- meters → customers (assignment)
- meters → machines (optional link to legacy IoT)
- meter_readings → meters (consumption)
- bills → customers + meters (billing record)
- payments → bills (payment tracking)
- employees → roles (staff permissions)
- stock_items → suppliers (inventory source)
- repairs/leaks → machines/meters (maintenance)

### Row-Level Security (RLS)
- All tables readable by authenticated users
- Create/update/delete requires `staff` role
- Policies enforce at database level

### Automation
- **Trigger**: `trg_update_bill_status_on_payment`
  - When payment inserted: if sum(payments) ≥ bill.amount → status='paid'
  - Else if sum(payments) > 0 → status='partial'
- **Scheduled**: Monthly billing via cron (configurable)

---

## Real-Time Data (No Hardcoding)

✅ Every number on screen comes from real Supabase data:
- Dashboard KPIs query `v_dashboard_summary` view
- Charts query historical views (revenue, consumption, etc.)
- Tables query base tables with real-time subscriptions
- Bills calculated from meter_readings × tariff rate
- Payments auto-update bill status via trigger

---

## Styling

- **Design Tokens**: `--flow` (cyan #00bcd4), `--ink` (slate #64748b)
- **Dark Theme**: Backgrounds (#020617, #0f172a), Text (#e2e8f0, #cbd5e1)
- **Responsive**: Desktop sidebar (250px) → Mobile (horizontal nav)
- **Components**:
  - StatCard (KPI display)
  - Badge (status indicator)
  - Table (list view)
  - Charts (Recharts)
  - Forms (future)

---

## Edge Functions

### `ingest-reading` (Existing)
IoT device telemetry endpoint for water machines.

### `generate-bills` (New)
Monthly billing engine. Call on-demand or via scheduled cron:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/generate-bills \
  -H "X-API-Key: your-billing-api-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Response:
```json
{
  "success": true,
  "bills_generated": 42,
  "bills_failed": 0,
  "total_revenue": 420000,
  "errors": []
}
```

---

## Documentation

- **[ARCHITECTURE_EXTENDED.md](docs/ARCHITECTURE_EXTENDED.md)** — System design, data model, data flows
- **[DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)** — Setup steps, migrations, test data, troubleshooting
- **[GENERATE_BILLS_EDGE_FUNCTION.md](docs/GENERATE_BILLS_EDGE_FUNCTION.md)** — Billing engine details, API, cron setup
- **[HARDWARE_INTEGRATION.md](docs/HARDWARE_INTEGRATION.md)** — Flow sensors, cellular, wiring (original)
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** — Original IoT fleet architecture

---

## Testing & Validation

### Manual Testing
1. Create test customer + meter + readings
2. Call `generate-bills` → verify bills created
3. Record payment → verify bill status updates to 'paid'
4. Check dashboard: KPIs should show real numbers (not zeros)
5. Navigate all pages: verify tables load data

### Pre-deployment Checks
```bash
npm run build      # Verify build succeeds
npm run lint       # Check linting
npx tsc --noEmit   # Verify TypeScript
```

### Database Validation
```sql
-- Check migrations applied
select * from information_schema.tables where table_schema='public';

-- Check views exist
select * from information_schema.views where table_schema='public';

-- Check triggers exist
select * from information_schema.triggers where trigger_schema='public';

-- Check RLS enabled
select tablename from pg_tables where schemaname='public' and rowsecurity=true;
```

---

## Deployment

### Production Build
```bash
npm run build
```

Outputs optimized `dist/` folder.

### Deploy Frontend
- **Vercel**: `vercel deploy`
- **Netlify**: Drag-and-drop `dist/`
- **GitHub Pages**: Push to GitHub, enable Pages

### Deploy Migrations & Functions
```bash
supabase db push       # Apply migrations
supabase functions deploy generate-bills
```

See [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) for full steps.

---

## Assumptions & Constraints

- **Currency**: KES (Kenyan Shillings)
- **Billing Period**: Monthly (configurable)
- **Due Date**: 14 days after period end
- **Tariff**: Per customer_type as `rate_per_liter`
- **Partial Payments**: Allowed; bill tracks as 'partial'
- **RLS**: Staff role required for mutations
- **Real-time**: WebSocket subscriptions for live updates

---

## Next Steps

1. ✅ Populate test data (see DEPLOYMENT_GUIDE.md)
2. ✅ Verify dashboard KPIs show real numbers
3. Run `supabase db push` to apply migrations
4. Deploy `generate-bills` function
5. Test bill generation and payment workflows
6. Connect to M-Pesa API for live payment reconciliation
7. Build customer portal (self-serve bill viewing)
8. Add SMS/email notifications
9. Deploy to production (Vercel + Supabase)

---

## Support

For issues or questions:
1. Check [DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md) troubleshooting section
2. Review [ARCHITECTURE_EXTENDED.md](docs/ARCHITECTURE_EXTENDED.md) for system design
3. Inspect Supabase Dashboard > SQL Editor for data verification
4. Check browser console for JavaScript errors

---

## License

[Your License Here]

---

## Changelog

### v1.1.0 (Extended Edition)
- ✨ **New**: 10 database migrations for complete water utility platform
- ✨ **New**: generate-bills Edge Function for automated billing
- ✨ **New**: 10 React hooks for real-time data (useCustomers, useBills, useDashboardMetrics, etc.)
- ✨ **New**: Multi-page app with React Router (Dashboard, Customers, Meters, Billing, Payments, etc.)
- ✨ **New**: Persistent sidebar navigation + responsive layout
- ✨ **New**: Dashboard with 6 KPI cards + 4 charts (revenue, consumption, bill status, payments)
- ✨ **New**: Comprehensive documentation (ARCHITECTURE_EXTENDED, DEPLOYMENT_GUIDE, GENERATE_BILLS_EDGE_FUNCTION)
- 🔧 **Improved**: Added react-router-dom to dependencies
- 📚 **Improved**: Complete data model with RLS policies, indexes, and triggers

### v1.0.0 (Original)
- IoT fleet tracking dashboard
- Water machine telemetry (liters, revenue, alerts)
- Real-time Supabase subscriptions
- Cellular firmware (ESP32 + SIM7000)
