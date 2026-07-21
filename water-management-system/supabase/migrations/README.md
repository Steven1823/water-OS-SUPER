# Supabase Migrations Guide

## Naming Convention

Migration files are named with the format:
```
YYYYMMDD_NNN_descriptive_name.sql
```

Where:
- `YYYYMMDD` = date (e.g., 20260721)
- `NNN` = sequence number (001, 002, 003...)
- `descriptive_name` = table or feature (e.g., customer_types, meter_management)

## How to Apply Migrations

### Automatic (Recommended)
```bash
cd supabase
supabase db push
```
This applies all pending migrations in order.

### Manual (if needed)
```bash
# Apply a specific migration
psql postgresql://user:password@host/db < migrations/YYYYMMDD_NNN_name.sql
```

## Migration Order

Migrations must be applied in sequence because of foreign key dependencies:
1. Lookup tables first (customer_types, roles)
2. Core tables (customers, employees)
3. Operational tables (meters, meter_readings)
4. Billing/Payment tables (bills, payments)
5. Maintenance tables (repairs, leak_reports)

The `supabase db push` command handles this automatically.

## Important Notes

- **DO NOT edit existing migrations** — if you need to fix one, create a new migration
- **Each migration should be idempotent** — include `IF NOT EXISTS` clauses
- **Test locally first** — use `supabase start` and apply migrations to your local DB
- **Always include indexes** — for filtering/sorting performance
- **Always include RLS policies** — for security
- **Always include comments** — explain what each table does

## Rolling Back

If a migration fails:
```bash
# Reset database to initial state
supabase db reset

# Or manually drop the offending table and re-apply
```

**After a reset, all migrations will be reapplied in order.**
