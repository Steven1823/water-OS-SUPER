# Architecture — Water Management System (Extended)

## 1. Goal

Build an enterprise water utility management system with:
- IoT fleet tracking (water dispensing machines)
- Customer billing and payment management
- Meter reading collection (manual + automatic)
- Revenue tracking and analytics
- Staff management and inventory control
- Real-time dashboard with multi-module support

## 2. System Architecture (Updated)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React 19 + Vite)                         │
│                                                                              │
│  ┌─ Sidebar Navigation ─────────────────────────────────────────────────┐  │
│  │ Dashboard │ Customers │ Meters │ Readings │ Billing │ Payments │     │  │
│  │ Maintenance │ Reports │ Staff │ Inventory                           │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌─ Dashboard Page ──────────────────────────────────────────────────┐   │
│  │ • 6 KPI Cards (from v_dashboard_summary)                        │   │
│  │ • 4 Charts: Revenue, Consumption, Bill Status, Payment Methods  │   │
│  │ • Real-time subscriptions to bills, payments, customers         │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌─ List Pages ──────────────────────────────────────────────────────┐   │
│  │ Customers → useCustomers() → v_customers join customer_types    │   │
│  │ Meters → useMeters() → v_meters join customers                  │   │
│  │ Bills → useBills() → v_bills join customers + meters            │   │
│  │ Payments → usePayments() → v_payments join bills                │   │
│  │ Readings → useMeterReadings() → v_meter_readings join meters    │   │
│  └────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │ (HTTPS + WebSocket)
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SUPABASE (PostgreSQL + Auth + Realtime)                   │
│                                                                              │
│  ┌─ Auth Layer ──────────────────┐                                         │
│  │ JWT tokens                    │                                         │
│  │ RLS policies by role (staff)  │                                         │
│  └───────────────────────────────┘                                         │
│                                                                              │
│  ┌─ Data Layer (Tables) ─────────────────────────────────────────────────┐ │
│  │ • customer_types (tariff lookup)                                      │ │
│  │ • customers (customer records)                                        │ │
│  │ • meters (meter assignments to customers)                            │ │
│  │ • meter_readings (consumption data)                                  │ │
│  │ • bills (billing records)                                            │ │
│  │ • payments (payment tracking)                                        │ │
│  │ • employees + roles (staff management)                               │ │
│  │ • stock_items + suppliers (inventory)                                │ │
│  │ • repairs + leak_reports (maintenance)                               │ │
│  │ • machines + readings + sales + alerts (legacy IoT)                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Analytics Layer (SQL Views) ──────────────────────────────────────────┐ │
│  │ • v_dashboard_summary (6 KPI metrics)                                 │ │
│  │ • v_revenue_last_12_months (monthly revenue)                         │ │
│  │ • v_consumption_last_12_months (monthly consumption)                 │ │
│  │ • v_bill_status_breakdown (pending/paid/overdue counts)              │ │
│  │ • v_payment_method_breakdown (mpesa/cash/bank/cheque)                │ │
│  │ • v_customer_growth_last_12_months (monthly new customers)           │ │
│  │ • v_customer_receivables (outstanding balances)                      │ │
│  │ • v_meters_by_customer (active meter count per customer)             │ │
│  │ • v_repair_summary (open repairs by priority/status)                 │ │
│  │ • v_leak_summary (leak reports by severity)                          │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Functions (Edge Functions / Deno) ───────────────────────────────────┐ │
│  │ • ingest-reading (IoT device telemetry ingestion)                     │ │
│  │ • generate-bills (monthly billing engine)                             │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                              │
│  ┌─ Triggers & Automation ───────────────────────────────────────────────┐ │
│  │ • Automatic bill status update on payment insertion                  │ │
│  │ • Scheduled cron: generate-bills (1st of each month)                 │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   HARDWARE / EXTERNAL SYSTEMS                                │
│                                                                              │
│  • Water Machines (ESP32 + Flow Sensor + SIM7000)                           │
│  • Meter Database (external CRM, ERP, or manual imports)                    │
│  • Payment Providers (M-Pesa integration, bank reconciliation)              │
│  • Reporting Export (PDF invoices, CSV exports)                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3. Data Model

### Lookup Tables
- **customer_types**: Tariff classifications (residential, commercial, industrial)
  - Fields: id (UUID), name, tariff_rate_per_liter (numeric), description, created_at

### Core Entity Tables
- **customers**: Water utility customers
  - Fields: id, name, phone, email, address, customer_type_id (FK), status, created_at, updated_at
  - Status: active, inactive, suspended
  - RLS: Readable by all authenticated users; writable by staff

- **meters**: Individual water meters assigned to customers
  - Fields: id, serial_number (unique), customer_id (FK), machine_id (FK, optional), install_date, status, created_at, updated_at
  - Status: active, inactive, faulty, removed
  - Machine link: Optional connection to legacy water dispensing machine

- **meter_readings**: Monthly/periodic consumption readings
  - Fields: id, meter_id (FK), reading_value (numeric), reading_date, recorded_by, source, notes, created_at
  - Source: manual (staff-recorded), automatic (from machine)

### Billing Tables
- **bills**: Generated monthly bills
  - Fields: id, customer_id (FK), meter_id (FK), period_start, period_end, liters_billed, amount, status, due_date, notes, created_at, updated_at
  - Status: pending, paid, partial, overdue, cancelled
  - Amount calculated as: liters_billed × customer_types.tariff_rate_per_liter

- **payments**: Payment records
  - Fields: id, bill_id (FK), amount, method, paid_at, receipt_number, notes, created_at
  - Method: mpesa, cash, bank_transfer, cheque, other
  - Trigger: Updates bill status to 'paid' if total payments ≥ bill.amount, else 'partial'

### Staff & Admin Tables
- **roles**: Role definitions (admin, staff, field_officer, manager)
  - Fields: id, name, description, permissions (jsonb), created_at

- **employees**: Staff members
  - Fields: id, name, email, phone, role_id (FK), status, hire_date, created_at, updated_at
  - Status: active, inactive, on_leave

### Operational Tables
- **stock_items**: Inventory
  - Fields: id, name, category, quantity, unit, reorder_level, unit_cost, supplier_id (FK), last_restocked_at, created_at, updated_at

- **suppliers**: Equipment/parts suppliers
  - Fields: id, name, contact_person, phone, email, address, status, created_at

- **repairs**: Maintenance tickets
  - Fields: id, machine_id (FK), meter_id (FK), description, status, priority, reported_by, assigned_to, reported_at, started_at, resolved_at, notes, cost, created_at, updated_at
  - Status: open, in_progress, completed, cancelled
  - Priority: low, normal, high, urgent

- **leak_reports**: Suspected/confirmed leaks
  - Fields: id, machine_id (FK), meter_id (FK), description, severity, status, estimated_loss_liters, reported_by, assigned_to, reported_at, investigated_at, resolved_at, notes, created_at, updated_at
  - Severity: low, medium, high, critical
  - Status: reported, confirmed, repaired, false_alarm

### Legacy IoT Tables (for existing machines)
- **machines**: Water dispensing device records
- **readings**: Device telemetry (pulse counts, sensor data)
- **sales**: Transaction records from devices
- **alerts**: System events/faults

## 4. Frontend Architecture

### React Components
- **Layout** (persistent sidebar + top bar)
- **StatCard** (reusable KPI card)
- **DashboardPage** (6 KPI cards + 4 charts)
- **List pages**: Customers, Meters, Bills, Payments, Readings, Maintenance, Reports, Staff, Inventory

### Custom Hooks (Real-time via Supabase subscriptions)
- `useCustomers()` - Fetches from `customers` join `customer_types`
- `useMeters()` - Fetches from `meters` join `customers` (optional customer filter)
- `useBills()` - Fetches from `bills` join `customers` + `meters` (optional filters)
- `usePayments()` - Fetches from `payments` join `bills` (optional bill filter)
- `useMeterReadings()` - Fetches from `meter_readings` join `meters` (optional meter filter)
- `useDashboardMetrics()` - Loads all 10 analytics views in parallel

### Styling
- Design tokens: `--flow` (primary cyan), `--ink` (secondary slate) from `index.css`
- Dark theme: backgrounds (#020617, #0f172a), text (#e2e8f0, #cbd5e1)
- Responsive sidebar: Desktop (250px) → Mobile (horizontal)
- Badge components for status indicators (active, pending, overdue, paid, etc.)

### Routing (React Router v7)
```
/ → Dashboard
/customers → Customers page
/meters → Meters page
/readings → Meter Readings page
/billing → Bills page
/payments → Payments page
/maintenance → Maintenance & Repairs page
/reports → Analytics & Reports page
/staff → Staff Management page
/inventory → Inventory Management page
```

## 5. Backend Architecture

### Edge Functions (Deno)
- **ingest-reading**: IoT device telemetry endpoint
  - POST /functions/v1/ingest-reading
  - Auth: x-device-key header
  - Computes deltas (lifetime - last known)
  - Updates: machines, readings, sales tables; generates alerts
  - Fraud-proof: Only delta calculation, not gross liters

- **generate-bills**: Monthly billing engine
  - POST /functions/v1/generate-bills
  - Auth: x-api-key header
  - Logic:
    1. Validates no bills exist for current period (prevent duplicates)
    2. For each active customer, find active meters
    3. Sum meter_readings from billing period per meter
    4. Calculate bill amount: liters × customer_types.tariff_rate_per_liter
    5. Insert bills with status='pending' and 14-day due date
  - Error handling: Skips customers/meters with issues, logs errors
  - Callable: On-demand from UI + scheduled via pg_cron (1st of month, 00:00 UTC)

### Database Triggers
- **trg_update_bill_status_on_payment**: Auto-update bill status when payment inserted
  - If sum(payments) ≥ bill.amount: status = 'paid'
  - Else if sum(payments) > 0: status = 'partial'

### RLS (Row-Level Security)
- Authenticated users can read all public data
- Staff role required for create/update/delete operations
- Policies enforced at table level

## 6. Data Flow Diagrams

### New Customer Onboarding
```
Staff Portal
  ↓ (create customer)
customers table (status = 'active')
  ↓
meters table (linked to customer)
  ↓
meter_readings (manual entry or auto-sync from machine)
  ↓
Dashboard reflects new customer in v_dashboard_summary KPIs
```

### Monthly Billing Process
```
generate-bills edge function (triggered 1st of month)
  ↓
For each active customer:
  - Find active meters
  - Sum meter_readings from period
  ↓
Calculate amount = liters × tariff_rate_per_liter
  ↓
Insert bills (status='pending', due_date=14 days from period end)
  ↓
Dashboard shows:
  - bills_generated_this_month KPI
  - pending_bills_count KPI
  - v_bill_status_breakdown view
```

### Payment Recording
```
Staff records payment in UI
  ↓ (insert into payments table)
Trigger: trg_update_bill_status_on_payment
  ↓
If sum(payments) ≥ bill.amount:
  Update bill.status = 'paid'
  ↓
Dashboard reflects:
  - payments_received_this_month KPI
  - bill status change (pending → paid)
  - v_payment_method_breakdown updated
```

### IoT Telemetry Ingestion (Legacy)
```
Water Machine (ESP32)
  ↓ (HTTPS POST /ingest-reading with x-device-key)
ingest-reading edge function
  ↓
Validate device key + serial number
  ↓
Compute delta: current_count - last_known_count = liters_sold
  ↓
Insert into:
  - readings (device telemetry)
  - sales (transaction record)
  - alerts (if tank low, offline, battery low, etc.)
  ↓
Dashboard (Realtime):
  - Machine card updates (status, tank %, revenue)
  - SalesChart updates (new transaction)
  - AlertsPanel updates (new alerts)
```

## 7. Assumptions & Constraints

### Currency & Tariffs
- **Currency**: KES (Kenyan Shillings)
- **Tariff Structure**: Per customer_type, applied as rate_per_liter
  - Example: Residential = KES 10/liter, Commercial = KES 15/liter
- **Calculation**: `bill.amount = bill.liters_billed × customer_types.tariff_rate_per_liter`

### Billing
- **Period**: Monthly (1st to end of month)
- **Due Date**: 14 days after period end (configurable)
- **Statuses**: pending, paid, partial (part-paid), overdue (unpaid past due_date), cancelled
- **Minimum Reading**: If only one meter reading in period, use that value; if two+, compute delta

### Payments
- **Partial Payments**: Allowed; bill remains 'pending' until fully paid
- **Methods**: M-Pesa, cash, bank transfer, cheque, other
- **Reconciliation**: Manual (staff-recorded) or automatic (payment provider integration)

### Meter Readings
- **Source**: manual (staff records) or automatic (from linked machine)
- **Frequency**: Daily, weekly, or monthly (configurable per meter)
- **Historical Lookup**: If meter linked to machine, can sync from machines.readings table

### Staff & Security
- **Roles**: Admin (full access), Staff (CRUD on customers/meters/bills/payments), Field Officer (read-only + record readings)
- **RLS**: Based on auth.jwt() → 'role' claim
- **Data Isolation**: Staff can manage all customers (no customer-specific restrictions yet)

### External Integrations (Future)
- **Payment Providers**: M-Pesa API for mobile money reconciliation
- **Messaging**: SMS notifications for payment reminders, bill issues
- **Reporting**: PDF invoice generation, CSV exports for accounting
- **CRM**: Integration with existing customer database

## 8. Deployment & Infrastructure

### Tech Stack
- **Frontend**: React 19, React Router 7, Recharts, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL), Edge Functions (Deno)
- **Database**: PostgreSQL 15+ with RLS, Triggers, Views, Indexes
- **Authentication**: Supabase JWT
- **Real-time**: Supabase Realtime (WebSocket, postgres_changes)
- **Hosting**: Vercel (frontend), Supabase (backend)

### Deployment Steps
1. Create Supabase project
2. Run migrations: `supabase db push`
3. Set Edge Function secrets: `BILLING_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy Edge Function: `supabase functions deploy generate-bills`
5. Set up scheduled cron job: `select cron.schedule(...)`
6. Deploy React app: `npm run build && vercel deploy`

## 9. Testing Strategy

### Unit Tests
- Edge Function logic (delta calculation, tariff application, error handling)
- React hook data fetching (useCustomers, useBills, etc.)

### Integration Tests
- Bill generation workflow (customers → meters → readings → bills)
- Payment workflow (payment insertion → bill status update)
- Real-time subscription updates

### Manual Testing
1. Create test customer + meters + readings
2. Manually call generate-bills; verify bills created
3. Record payment; verify bill status updates
4. Check dashboard KPIs reflect real data (not zeros)
5. Test all page navigation and data tables load

## 10. Known Limitations & Future Work

- [ ] Multi-tenant support (currently single utility)
- [ ] Customer portal (self-serve bill/payment viewing)
- [ ] Advanced tariff structures (seasonal rates, tiered pricing)
- [ ] Automatic M-Pesa payment reconciliation
- [ ] SMS notifications (payment reminders, bill issues)
- [ ] PDF invoice generation
- [ ] Detailed usage history & trends per customer
- [ ] Leak detection & anomaly alerts
- [ ] Staff permission scoping (regional managers, field officers)
- [ ] Audit logging (who changed what, when)
