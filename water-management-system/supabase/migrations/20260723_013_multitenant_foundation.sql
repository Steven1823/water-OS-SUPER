-- Migration: 20260723_013_multitenant_foundation
-- Description: Production-grade multi-tenant foundation, security hardening, and domain expansion

begin;

-- -----------------------------------------------------------------------------
-- Extensions
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto;
create extension if not exists citext;

-- -----------------------------------------------------------------------------
-- Shared helper functions
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.business_id
  from public.profiles p
  where p.id = auth.uid()
  limit 1
$$;

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.business_id = target_business_id
  )
$$;

create or replace function public.has_business_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.business_id = public.current_business_id()
      and p.role = any(allowed_roles)
  )
$$;

-- -----------------------------------------------------------------------------
-- Core tenant and identity tables
-- -----------------------------------------------------------------------------
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text,
  phone text,
  email citext,
  address text,
  subscription_plan text not null default 'starter',
  subscription_status text not null default 'trial' check (subscription_status in ('trial', 'active', 'past_due', 'cancelled', 'suspended')),
  trial_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists uq_businesses_email on public.businesses(email) where email is not null;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete restrict,
  full_name text not null,
  avatar text,
  role text not null check (role in ('owner', 'admin', 'cashier', 'technician', 'meter_reader', 'staff')),
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_profiles_business_id on public.profiles(business_id);
create index if not exists idx_profiles_role on public.profiles(role);

create table if not exists public.registration_keys (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  used_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_registration_keys_business_code on public.registration_keys(business_id, code);
create index if not exists idx_registration_keys_expires_at on public.registration_keys(expires_at);

-- -----------------------------------------------------------------------------
-- Align existing tables to multi-tenant and common metadata
-- -----------------------------------------------------------------------------
-- Existing table: business_profiles
alter table if exists public.business_profiles
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists deleted_at timestamptz;

-- Existing table: customer_types
alter table if exists public.customer_types
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table if exists public.customer_types
  drop constraint if exists customer_types_name_key;
create unique index if not exists uq_customer_types_business_name
  on public.customer_types(business_id, lower(name));

-- Existing table: customers
alter table if exists public.customers
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists customer_number text,
  add column if not exists id_number text,
  add column if not exists gps_coordinates point,
  add column if not exists notes text,
  add column if not exists deleted_at timestamptz;

create unique index if not exists uq_customers_business_customer_number
  on public.customers(business_id, customer_number)
  where customer_number is not null;
create index if not exists idx_customers_business_id on public.customers(business_id);

-- Existing table: machines
alter table if exists public.machines
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz,
  add column if not exists device_key text,
  add column if not exists firmware text,
  add column if not exists last_seen timestamptz,
  add column if not exists signal_strength integer,
  add column if not exists battery numeric;

create unique index if not exists uq_machines_business_serial
  on public.machines(business_id, serial_number);
create index if not exists idx_machines_business_id on public.machines(business_id);

-- Existing table: meters
alter table if exists public.meters
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists meter_number text,
  add column if not exists installation_date date,
  add column if not exists gps point,
  add column if not exists battery numeric,
  add column if not exists signal_strength integer,
  add column if not exists deleted_at timestamptz;

update public.meters
set installation_date = coalesce(installation_date, install_date)
where installation_date is null;

update public.meters
set meter_number = coalesce(meter_number, serial_number)
where meter_number is null;

create unique index if not exists uq_meters_business_meter_number
  on public.meters(business_id, meter_number)
  where meter_number is not null;
create index if not exists idx_meters_business_id on public.meters(business_id);

-- Existing table: meter_readings
alter table if exists public.meter_readings
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists meter_value numeric,
  add column if not exists reading_at timestamptz,
  add column if not exists reading_source text check (reading_source in ('manual', 'automatic', 'iot')),
  add column if not exists consumption numeric,
  add column if not exists reader_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.meter_readings
set meter_value = coalesce(meter_value, reading_value),
    reading_at = coalesce(reading_at, reading_date::timestamptz),
    reading_source = coalesce(reading_source, source)
where meter_value is null
   or reading_at is null
   or reading_source is null;

create index if not exists idx_meter_readings_business_meter_date
  on public.meter_readings(business_id, meter_id, reading_at desc);

-- Existing table: tariffs (new)
create table if not exists public.tariffs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_type_id uuid references public.customer_types(id) on delete set null,
  name text not null,
  water_price numeric not null check (water_price >= 0),
  minimum_charge numeric not null default 0 check (minimum_charge >= 0),
  sewer_charge numeric not null default 0 check (sewer_charge >= 0),
  garbage_charge numeric not null default 0 check (garbage_charge >= 0),
  vat_rate numeric not null default 0 check (vat_rate >= 0 and vat_rate <= 1),
  penalty_rate numeric not null default 0 check (penalty_rate >= 0 and penalty_rate <= 1),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint ck_tariffs_effective_range check (effective_to is null or effective_to >= effective_from)
);

create unique index if not exists uq_tariffs_business_name_effective
  on public.tariffs(business_id, lower(name), effective_from);

-- Existing table: bills
alter table if exists public.bills
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists bill_number text,
  add column if not exists tariff_id uuid references public.tariffs(id) on delete set null,
  add column if not exists reading_id uuid references public.meter_readings(id) on delete set null,
  add column if not exists units numeric,
  add column if not exists water_charges numeric default 0,
  add column if not exists sewer_charges numeric default 0,
  add column if not exists garbage_charges numeric default 0,
  add column if not exists tax numeric default 0,
  add column if not exists discount numeric default 0,
  add column if not exists penalty numeric default 0,
  add column if not exists total numeric,
  add column if not exists deleted_at timestamptz;

update public.bills
set units = coalesce(units, liters_billed),
    water_charges = coalesce(water_charges, amount),
    total = coalesce(total, amount)
where units is null or total is null;

create unique index if not exists uq_bills_business_bill_number
  on public.bills(business_id, bill_number)
  where bill_number is not null;
create index if not exists idx_bills_business_id on public.bills(business_id);
create index if not exists idx_bills_business_status_due on public.bills(business_id, status, due_date);

-- Existing table: invoices (new)
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  bill_id uuid not null references public.bills(id) on delete cascade,
  invoice_number text not null,
  pdf_url text,
  issued_at timestamptz not null default now(),
  status text not null default 'issued' check (status in ('issued', 'sent', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, invoice_number),
  unique (bill_id)
);

-- Existing table: payments
alter table if exists public.payments
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists customer_id uuid references public.customers(id) on delete set null,
  add column if not exists received_by uuid references public.profiles(id) on delete set null,
  add column if not exists transaction_reference text,
  add column if not exists payment_date timestamptz,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

update public.payments
set payment_date = coalesce(payment_date, paid_at)
where payment_date is null;

create index if not exists idx_payments_business_id on public.payments(business_id);
create index if not exists idx_payments_business_date on public.payments(business_id, payment_date desc);
create unique index if not exists uq_payments_business_receipt
  on public.payments(business_id, receipt_number)
  where receipt_number is not null;

-- Existing table: receipts (new)
create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  receipt_number text not null,
  rendered_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, receipt_number),
  unique (payment_id)
);

-- Inventory expansion
create table if not exists public.inventory_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, lower(name))
);

alter table if exists public.suppliers
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

create unique index if not exists uq_suppliers_business_name
  on public.suppliers(business_id, lower(name));
create index if not exists idx_suppliers_business_id on public.suppliers(business_id);

alter table if exists public.stock_items
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists category_id uuid references public.inventory_categories(id) on delete set null,
  add column if not exists sku text,
  add column if not exists deleted_at timestamptz;

create unique index if not exists uq_stock_items_business_sku
  on public.stock_items(business_id, sku)
  where sku is not null;
create index if not exists idx_stock_items_business_id on public.stock_items(business_id);

create table if not exists public.purchase_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  supplier_id uuid not null references public.suppliers(id) on delete restrict,
  order_number text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'ordered', 'received', 'cancelled')),
  order_date date not null default current_date,
  expected_date date,
  total_amount numeric not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, order_number)
);

create table if not exists public.purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  purchase_order_id uuid not null references public.purchase_orders(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  quantity numeric not null check (quantity > 0),
  unit_cost numeric not null check (unit_cost >= 0),
  line_total numeric generated always as (quantity * unit_cost) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (purchase_order_id, stock_item_id)
);

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  movement_type text not null check (movement_type in ('incoming', 'outgoing', 'transfer', 'damage')),
  quantity numeric not null check (quantity > 0),
  from_location text,
  to_location text,
  reference_type text,
  reference_id uuid,
  notes text,
  moved_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_movements_business_item_date
  on public.stock_movements(business_id, stock_item_id, created_at desc);

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  stock_item_id uuid not null references public.stock_items(id) on delete restrict,
  adjustment_type text not null check (adjustment_type in ('count_correction', 'damage', 'theft', 'expiry', 'writeoff')),
  quantity_delta numeric not null,
  reason text,
  approved_by uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Maintenance expansion
alter table if exists public.leak_reports
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists latitude numeric,
  add column if not exists longitude numeric,
  add column if not exists photos jsonb not null default '[]'::jsonb,
  add column if not exists assigned_technician uuid references public.profiles(id) on delete set null,
  add column if not exists timeline jsonb not null default '[]'::jsonb,
  add column if not exists deleted_at timestamptz;

create index if not exists idx_leak_reports_business_id on public.leak_reports(business_id);
create index if not exists idx_leak_reports_business_status on public.leak_reports(business_id, status, severity);

alter table if exists public.repairs
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists repair_number text,
  add column if not exists technician_id uuid references public.profiles(id) on delete set null,
  add column if not exists completion_date date,
  add column if not exists deleted_at timestamptz;

update public.repairs
set completion_date = coalesce(completion_date, resolved_at::date)
where completion_date is null and resolved_at is not null;

create unique index if not exists uq_repairs_business_repair_number
  on public.repairs(business_id, repair_number)
  where repair_number is not null;
create index if not exists idx_repairs_business_id on public.repairs(business_id);

-- Employee and IAM expansion
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, lower(name))
);

alter table if exists public.roles
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists deleted_at timestamptz;

alter table if exists public.roles
  drop constraint if exists roles_name_key;
create unique index if not exists uq_roles_business_name
  on public.roles(business_id, lower(name));

alter table if exists public.employees
  add column if not exists business_id uuid references public.businesses(id) on delete cascade,
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists department_id uuid references public.departments(id) on delete set null,
  add column if not exists employee_number text,
  add column if not exists deleted_at timestamptz;

create unique index if not exists uq_employees_business_employee_number
  on public.employees(business_id, employee_number)
  where employee_number is not null;
create unique index if not exists uq_employees_business_email
  on public.employees(business_id, lower(email));
create index if not exists idx_employees_business_id on public.employees(business_id);

create table if not exists public.permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, code)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  work_date date not null,
  check_in timestamptz,
  check_out timestamptz,
  status text not null default 'present' check (status in ('present', 'absent', 'leave', 'late')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (employee_id, work_date)
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_activity_logs_business_created
  on public.activity_logs(business_id, created_at desc);

-- Notifications and observability
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  channel text not null default 'in_app' check (channel in ('in_app', 'sms', 'email', 'push')),
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'read')),
  sent_at timestamptz,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  alert_type text not null,
  threshold numeric,
  is_active boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  body text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  level text not null check (level in ('debug', 'info', 'warn', 'error', 'critical')),
  source text not null,
  message text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_system_logs_level_created
  on public.system_logs(level, created_at desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete set null,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  table_name text not null,
  operation text not null check (operation in ('insert', 'update', 'delete')),
  row_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_business_created
  on public.audit_logs(business_id, created_at desc);

-- Edge function support tables
create table if not exists public.mpesa_transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  request_id text,
  checkout_request_id text,
  merchant_request_id text,
  phone text,
  amount numeric not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'success', 'failed', 'cancelled')),
  result_code text,
  result_desc text,
  callback_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_mpesa_transactions_business_status
  on public.mpesa_transactions(business_id, status, created_at desc);

create table if not exists public.outbound_messages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete set null,
  destination text not null,
  channel text not null check (channel in ('sms', 'email')),
  subject text,
  body text not null,
  provider text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed')),
  provider_message_id text,
  sent_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_outbound_messages_business_status
  on public.outbound_messages(business_id, status, created_at desc);

create table if not exists public.job_runs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  job_name text not null,
  status text not null default 'queued' check (status in ('queued', 'running', 'success', 'failed')),
  started_at timestamptz,
  finished_at timestamptz,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Data backfill for required business_id in legacy rows
-- -----------------------------------------------------------------------------
insert into public.businesses (name, subscription_plan, subscription_status)
select 'Default Utility Business', 'starter', 'trial'
where not exists (select 1 from public.businesses);

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.business_profiles bp
set business_id = sb.id
from seed_business sb
where bp.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.customer_types t
set business_id = sb.id
from seed_business sb
where t.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.customers c
set business_id = sb.id
from seed_business sb
where c.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.machines m
set business_id = sb.id
from seed_business sb
where m.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.meters m
set business_id = coalesce(m.business_id, c.business_id)
from public.customers c
where m.customer_id = c.id
  and m.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.meter_readings mr
set business_id = coalesce(mr.business_id, m.business_id, sb.id)
from public.meters m, seed_business sb
where mr.meter_id = m.id
  and mr.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.bills b
set business_id = coalesce(b.business_id, c.business_id, sb.id),
    customer_id = coalesce(b.customer_id, c.id)
from public.customers c, seed_business sb
where b.customer_id = c.id
  and b.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.payments p
set business_id = coalesce(p.business_id, b.business_id, sb.id),
    customer_id = coalesce(p.customer_id, b.customer_id)
from public.bills b, seed_business sb
where p.bill_id = b.id
  and p.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.suppliers s
set business_id = sb.id
from seed_business sb
where s.business_id is null;

update public.stock_items si
set business_id = coalesce(si.business_id, s.business_id)
from public.suppliers s
where si.supplier_id = s.id
  and si.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.stock_items si
set business_id = sb.id
from seed_business sb
where si.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.leak_reports lr
set business_id = coalesce(lr.business_id, m.business_id, me.business_id, sb.id)
from public.machines m
left join public.meters me on me.id = lr.meter_id,
seed_business sb
where (lr.machine_id = m.id or lr.machine_id is null)
  and lr.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.repairs r
set business_id = coalesce(r.business_id, m.business_id, me.business_id, sb.id)
from public.machines m
left join public.meters me on me.id = r.meter_id,
seed_business sb
where (r.machine_id = m.id or r.machine_id is null)
  and r.business_id is null;

with seed_business as (
  select id from public.businesses order by created_at asc limit 1
)
update public.roles r
set business_id = sb.id
from seed_business sb
where r.business_id is null;

update public.employees e
set business_id = coalesce(e.business_id, r.business_id)
from public.roles r
where e.role_id = r.id
  and e.business_id is null;

-- Enforce business_id on tenant tables after backfill
alter table if exists public.customer_types alter column business_id set not null;
alter table if exists public.customers alter column business_id set not null;
alter table if exists public.machines alter column business_id set not null;
alter table if exists public.meters alter column business_id set not null;
alter table if exists public.meter_readings alter column business_id set not null;
alter table if exists public.bills alter column business_id set not null;
alter table if exists public.payments alter column business_id set not null;
alter table if exists public.suppliers alter column business_id set not null;
alter table if exists public.stock_items alter column business_id set not null;
alter table if exists public.leak_reports alter column business_id set not null;
alter table if exists public.repairs alter column business_id set not null;
alter table if exists public.roles alter column business_id set not null;
alter table if exists public.employees alter column business_id set not null;

-- -----------------------------------------------------------------------------
-- Bill/payment consistency function
-- -----------------------------------------------------------------------------
create or replace function public.recompute_bill_financials(target_bill_id uuid)
returns void
language plpgsql
as $$
declare
  paid_total numeric;
  bill_total numeric;
begin
  select coalesce(sum(amount), 0)
  into paid_total
  from public.payments
  where bill_id = target_bill_id
    and deleted_at is null;

  select coalesce(total, amount, 0)
  into bill_total
  from public.bills
  where id = target_bill_id;

  update public.bills
  set status = case
    when paid_total >= bill_total and bill_total > 0 then 'paid'
    when paid_total > 0 then 'partial'
    when due_date < current_date then 'overdue'
    else 'pending'
  end,
  updated_at = now()
  where id = target_bill_id;
end;
$$;

create or replace function public.trg_recompute_bill_on_payment()
returns trigger
language plpgsql
as $$
begin
  perform public.recompute_bill_financials(coalesce(new.bill_id, old.bill_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_update_bill_status_on_payment on public.payments;
drop trigger if exists trg_recompute_bill_on_payment_insert on public.payments;
drop trigger if exists trg_recompute_bill_on_payment_update on public.payments;
drop trigger if exists trg_recompute_bill_on_payment_delete on public.payments;

create trigger trg_recompute_bill_on_payment_insert
after insert on public.payments
for each row execute function public.trg_recompute_bill_on_payment();

create trigger trg_recompute_bill_on_payment_update
after update on public.payments
for each row execute function public.trg_recompute_bill_on_payment();

create trigger trg_recompute_bill_on_payment_delete
after delete on public.payments
for each row execute function public.trg_recompute_bill_on_payment();

-- -----------------------------------------------------------------------------
-- Updated-at triggers for all domain tables with updated_at
-- -----------------------------------------------------------------------------
do $$
declare
  tbl text;
  tables text[] := array[
    'businesses', 'profiles', 'registration_keys', 'business_profiles',
    'customer_types', 'customers', 'machines', 'meters', 'meter_readings',
    'tariffs', 'bills', 'invoices', 'payments', 'receipts',
    'inventory_categories', 'suppliers', 'stock_items', 'purchase_orders',
    'purchase_order_items', 'stock_movements', 'stock_adjustments',
    'leak_reports', 'repairs', 'departments', 'roles', 'employees',
    'permissions', 'role_permissions', 'attendance', 'activity_logs',
    'notifications', 'alert_rules', 'announcements', 'system_logs',
    'audit_logs', 'mpesa_transactions', 'outbound_messages', 'job_runs'
  ];
begin
  foreach tbl in array tables loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = tbl
        and column_name = 'updated_at'
    ) then
      execute format('drop trigger if exists trg_set_updated_at_%I on public.%I', tbl, tbl);
      execute format('create trigger trg_set_updated_at_%I before update on public.%I for each row execute function public.set_updated_at()', tbl, tbl);
    end if;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Reporting views (security_invoker so RLS is respected)
-- -----------------------------------------------------------------------------
create or replace view public.v_dashboard_summary
with (security_invoker = true)
as
select
  public.current_business_id() as business_id,
  (select count(*) from public.customers c where c.business_id = public.current_business_id() and c.deleted_at is null and c.status = 'active') as total_customers,
  (select count(*) from public.meters m where m.business_id = public.current_business_id() and m.deleted_at is null and m.status = 'active') as active_meters,
  (select count(*) from public.bills b where b.business_id = public.current_business_id() and b.deleted_at is null and b.status in ('pending', 'partial', 'overdue')) as open_bills,
  (select coalesce(sum(p.amount), 0) from public.payments p where p.business_id = public.current_business_id() and p.deleted_at is null and date_trunc('month', p.payment_date) = date_trunc('month', now())) as month_revenue,
  (select coalesce(sum(b.units), 0) from public.bills b where b.business_id = public.current_business_id() and b.deleted_at is null and date_trunc('month', b.period_end) = date_trunc('month', now())) as month_consumption_units;

create or replace view public.v_monthly_revenue
with (security_invoker = true)
as
select
  p.business_id,
  date_trunc('month', p.payment_date)::date as month,
  sum(p.amount) as revenue
from public.payments p
where p.deleted_at is null
group by p.business_id, date_trunc('month', p.payment_date);

create or replace view public.v_customer_growth
with (security_invoker = true)
as
select
  c.business_id,
  date_trunc('month', c.created_at)::date as month,
  count(*) as customers_added
from public.customers c
where c.deleted_at is null
group by c.business_id, date_trunc('month', c.created_at);

create or replace view public.v_water_consumption
with (security_invoker = true)
as
select
  b.business_id,
  date_trunc('month', b.period_end)::date as month,
  sum(coalesce(b.units, b.liters_billed, 0)) as units_consumed
from public.bills b
where b.deleted_at is null
group by b.business_id, date_trunc('month', b.period_end);

create or replace view public.v_payment_summary
with (security_invoker = true)
as
select
  p.business_id,
  coalesce(p.method, 'unknown') as payment_method,
  count(*) as payments_count,
  sum(p.amount) as total_amount
from public.payments p
where p.deleted_at is null
group by p.business_id, coalesce(p.method, 'unknown');

create or replace view public.v_bill_status
with (security_invoker = true)
as
select
  b.business_id,
  b.status,
  count(*) as bill_count,
  sum(coalesce(b.total, b.amount, 0)) as bill_total
from public.bills b
where b.deleted_at is null
group by b.business_id, b.status;

create or replace view public.v_inventory_summary
with (security_invoker = true)
as
select
  si.business_id,
  count(*) as items_count,
  sum(si.quantity) as total_units,
  sum(si.quantity * si.unit_cost) as inventory_value
from public.stock_items si
where si.deleted_at is null
group by si.business_id;

create or replace view public.v_leak_statistics
with (security_invoker = true)
as
select
  lr.business_id,
  lr.severity,
  lr.status,
  count(*) as leaks_count,
  coalesce(sum(lr.estimated_loss_liters), 0) as estimated_loss_liters
from public.leak_reports lr
where lr.deleted_at is null
group by lr.business_id, lr.severity, lr.status;

create or replace view public.v_repair_statistics
with (security_invoker = true)
as
select
  r.business_id,
  r.status,
  r.priority,
  count(*) as repairs_count,
  coalesce(sum(r.cost), 0) as total_cost
from public.repairs r
where r.deleted_at is null
group by r.business_id, r.status, r.priority;

create or replace view public.v_employee_summary
with (security_invoker = true)
as
select
  e.business_id,
  e.status,
  count(*) as employees_count
from public.employees e
where e.deleted_at is null
group by e.business_id, e.status;

-- -----------------------------------------------------------------------------
-- RLS and tenant policies
-- -----------------------------------------------------------------------------
alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.registration_keys enable row level security;
alter table public.business_profiles enable row level security;
alter table public.customer_types enable row level security;
alter table public.customers enable row level security;
alter table public.machines enable row level security;
alter table public.meters enable row level security;
alter table public.meter_readings enable row level security;
alter table public.tariffs enable row level security;
alter table public.bills enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.inventory_categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.stock_items enable row level security;
alter table public.purchase_orders enable row level security;
alter table public.purchase_order_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.stock_adjustments enable row level security;
alter table public.leak_reports enable row level security;
alter table public.repairs enable row level security;
alter table public.departments enable row level security;
alter table public.roles enable row level security;
alter table public.employees enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.attendance enable row level security;
alter table public.activity_logs enable row level security;
alter table public.notifications enable row level security;
alter table public.alert_rules enable row level security;
alter table public.announcements enable row level security;
alter table public.system_logs enable row level security;
alter table public.audit_logs enable row level security;
alter table public.mpesa_transactions enable row level security;
alter table public.outbound_messages enable row level security;
alter table public.job_runs enable row level security;

do $$
declare
  t text;
  tenant_tables text[] := array[
    'registration_keys', 'business_profiles',
    'customer_types', 'customers', 'machines', 'meters', 'meter_readings',
    'tariffs', 'bills', 'invoices', 'payments', 'receipts',
    'inventory_categories', 'suppliers', 'stock_items', 'purchase_orders',
    'purchase_order_items', 'stock_movements', 'stock_adjustments',
    'leak_reports', 'repairs', 'departments', 'roles', 'employees',
    'permissions', 'role_permissions', 'attendance', 'activity_logs',
    'notifications', 'alert_rules', 'announcements', 'system_logs',
    'audit_logs', 'mpesa_transactions', 'outbound_messages', 'job_runs'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('drop policy if exists %I_select on public.%I', t, t);
    execute format('drop policy if exists %I_insert on public.%I', t, t);
    execute format('drop policy if exists %I_update on public.%I', t, t);
    execute format('drop policy if exists %I_delete on public.%I', t, t);

    execute format('create policy %I_select on public.%I for select using ((business_id = public.current_business_id()) or auth.role() = ''service_role'')', t, t);
    execute format('create policy %I_insert on public.%I for insert with check ((business_id = public.current_business_id()) or auth.role() = ''service_role'')', t, t);
    execute format('create policy %I_update on public.%I for update using ((business_id = public.current_business_id()) or auth.role() = ''service_role'') with check ((business_id = public.current_business_id()) or auth.role() = ''service_role'')', t, t);
    execute format('create policy %I_delete on public.%I for delete using ((business_id = public.current_business_id()) or auth.role() = ''service_role'')', t, t);
  end loop;
end $$;

-- businesses policies
 drop policy if exists businesses_select on public.businesses;
 drop policy if exists businesses_insert on public.businesses;
 drop policy if exists businesses_update on public.businesses;
 drop policy if exists businesses_delete on public.businesses;

create policy businesses_select on public.businesses
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.business_id = businesses.id
  )
  or auth.role() = 'service_role'
);

create policy businesses_insert on public.businesses
for insert
with check (auth.role() = 'service_role');

create policy businesses_update on public.businesses
for update
using (
  auth.role() = 'service_role'
  or (
    businesses.id = public.current_business_id()
    and public.has_business_role(array['owner', 'admin'])
  )
)
with check (
  auth.role() = 'service_role'
  or (
    businesses.id = public.current_business_id()
    and public.has_business_role(array['owner', 'admin'])
  )
);

create policy businesses_delete on public.businesses
for delete
using (auth.role() = 'service_role');

-- profiles policies
 drop policy if exists profiles_select on public.profiles;
 drop policy if exists profiles_insert on public.profiles;
 drop policy if exists profiles_update on public.profiles;
 drop policy if exists profiles_delete on public.profiles;

create policy profiles_select on public.profiles
for select
using (
  id = auth.uid()
  or (business_id = public.current_business_id() and public.has_business_role(array['owner', 'admin']))
  or auth.role() = 'service_role'
);

create policy profiles_insert on public.profiles
for insert
with check (
  auth.role() = 'service_role'
  or (
    business_id = public.current_business_id()
    and public.has_business_role(array['owner', 'admin'])
  )
);

create policy profiles_update on public.profiles
for update
using (
  id = auth.uid()
  or (business_id = public.current_business_id() and public.has_business_role(array['owner', 'admin']))
  or auth.role() = 'service_role'
)
with check (
  business_id = public.current_business_id()
  or auth.role() = 'service_role'
);

create policy profiles_delete on public.profiles
for delete
using (
  (business_id = public.current_business_id() and public.has_business_role(array['owner']))
  or auth.role() = 'service_role'
);

-- Remove legacy broad policies where present
 drop policy if exists "Allow authenticated users to read customer_types" on public.customer_types;
 drop policy if exists "Allow staff to manage customer_types" on public.customer_types;
 drop policy if exists "Allow authenticated users to read customers" on public.customers;
 drop policy if exists "Allow staff to manage customers" on public.customers;
 drop policy if exists "Allow authenticated users to read meters" on public.meters;
 drop policy if exists "Allow staff to manage meters" on public.meters;
 drop policy if exists "Allow authenticated users to read meter_readings" on public.meter_readings;
 drop policy if exists "Allow staff to insert/update meter_readings" on public.meter_readings;
 drop policy if exists "Allow staff to update own readings" on public.meter_readings;
 drop policy if exists "Allow authenticated users to read bills" on public.bills;
 drop policy if exists "Allow staff to manage bills" on public.bills;
 drop policy if exists "Allow authenticated users to read payments" on public.payments;
 drop policy if exists "Allow staff to manage payments" on public.payments;
 drop policy if exists "Allow authenticated users to read roles" on public.roles;
 drop policy if exists "Allow admin to manage roles" on public.roles;
 drop policy if exists "Allow authenticated users to read employees" on public.employees;
 drop policy if exists "Allow staff to view employees" on public.employees;
 drop policy if exists "Allow admin to manage employees" on public.employees;
 drop policy if exists "Allow authenticated users to read suppliers" on public.suppliers;
 drop policy if exists "Allow staff to manage suppliers" on public.suppliers;
 drop policy if exists "Allow authenticated users to read stock_items" on public.stock_items;
 drop policy if exists "Allow staff to manage stock_items" on public.stock_items;
 drop policy if exists "Allow authenticated users to read repairs" on public.repairs;
 drop policy if exists "Allow staff to manage repairs" on public.repairs;
 drop policy if exists "Allow authenticated users to read leak_reports" on public.leak_reports;
 drop policy if exists "Allow staff to manage leak_reports" on public.leak_reports;
 drop policy if exists "Allow authenticated users to read business_profiles" on public.business_profiles;
 drop policy if exists "Allow admin to manage business_profiles" on public.business_profiles;

commit;