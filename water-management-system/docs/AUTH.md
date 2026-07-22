# Authentication

## Current state in this repository

This project now includes a basic authentication gate in the frontend:

- Unauthenticated users are redirected to /login.
- Login page supports email/password sign-in via Supabase Auth.
- A Try Demo button is available beside real sign-in.

Note: Registration-key onboarding and invitation flows are not yet implemented in this codebase. See docs/TEST_REPORT.md for verified results and gaps.

## Environment variables

Add these values in .env.local:

- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_DEMO_EMAIL (optional but recommended)
- VITE_DEMO_PASSWORD (optional but recommended)

If VITE_DEMO_EMAIL and VITE_DEMO_PASSWORD are set, Try Demo signs into that fixed demo account.
If they are not set, Try Demo still enters UI demo mode, but database access depends on active Supabase session.

## Demo mode

### Provisioning approach

Demo data is provisioned through SQL seed script:

- supabase/seed-demo.sql

The script creates deterministic demo rows across:

- customer_types
- customers
- machines
- meters
- meter_readings
- bills (mixed statuses)
- payments (mixed methods)
- stock_items/suppliers
- repairs
- leak_reports
- readings/sales/alerts

### Isolation/reset model

This implementation uses reset-on-reseed, not strict read-only RLS.

- Demo identity is a dedicated demo account (configured by VITE_DEMO_EMAIL + VITE_DEMO_PASSWORD).
- Demo UI mode is flagged in browser local storage and always shows a persistent banner.
- Data cleanup and reseed is handled by rerunning supabase/seed-demo.sql.

Important limitation in this repository:

- The database schema currently has no business_id/tenant_id columns, so tenant-scoped isolation is not available yet.
- RLS currently allows all authenticated users to read shared tables.

Because of that, this demo mode is intended for development testing only until multi-tenant schema/RLS is added.

### Manual reseed

Run against your active Supabase DB (local or hosted):

```bash
npx supabase db reset
# or run only the demo seed script through SQL editor / psql
```

Then execute:

```sql
-- in Supabase SQL editor
\i supabase/seed-demo.sql
```

If your SQL editor does not support \i, paste the script contents directly and run.
