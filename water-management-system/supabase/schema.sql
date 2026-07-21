-- ============================================================
-- Water Management System — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- machines: one row per physical dispensing unit
-- ------------------------------------------------------------
create table if not exists machines (
  id uuid primary key default uuid_generate_v4(),
  serial_number text unique not null,        -- printed on the device / SIM label
  name text not null,                        -- e.g. "Kilimani Estate ATM #3"
  location_lat double precision,
  location_lng double precision,
  address text,
  tank_capacity_liters numeric not null default 5000,
  status text not null default 'offline' check (status in ('online','offline','maintenance','fault')),
  last_seen_at timestamptz,
  daily_target_liters numeric default 0,     -- optional, for gauges/targets
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- readings: raw telemetry pushed by the device (append-only)
-- Each row = one report cycle from the flow sensor/controller
-- ------------------------------------------------------------
create table if not exists readings (
  id bigint generated always as identity primary key,
  machine_id uuid not null references machines(id) on delete cascade,
  liters_dispensed_total numeric not null,   -- lifetime counter reported by device
  liters_since_last_report numeric not null, -- delta since previous report (what was "sold")
  tank_level_percent numeric,                -- optional, if a level sensor is fitted
  flow_rate_lpm numeric,                     -- instantaneous flow rate, optional
  battery_voltage numeric,                   -- for solar/battery powered sites
  signal_rssi integer,                       -- cellular/LoRa signal strength
  reported_at timestamptz not null default now()
);

create index if not exists idx_readings_machine_time
  on readings (machine_id, reported_at desc);

-- ------------------------------------------------------------
-- sales: derived/priced records (1 row per dispense transaction
-- if the machine reports per-transaction, OR aggregated hourly —
-- pick the granularity your controller supports)
-- ------------------------------------------------------------
create table if not exists sales (
  id bigint generated always as identity primary key,
  machine_id uuid not null references machines(id) on delete cascade,
  liters numeric not null,
  amount_paid numeric,                       -- if machine has a coin/mpesa acceptor
  payment_method text,                       -- 'cash','mpesa','prepaid_card', etc
  reading_id bigint references readings(id), -- links back to the raw telemetry
  sold_at timestamptz not null default now()
);

create index if not exists idx_sales_machine_time
  on sales (machine_id, sold_at desc);

-- ------------------------------------------------------------
-- alerts: low tank, offline device, tamper, fault codes
-- ------------------------------------------------------------
create table if not exists alerts (
  id bigint generated always as identity primary key,
  machine_id uuid not null references machines(id) on delete cascade,
  type text not null check (type in ('offline','low_tank','fault','tamper','low_battery')),
  message text,
  resolved boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- ------------------------------------------------------------
-- Handy view: today's totals per machine (used by the dashboard)
-- ------------------------------------------------------------
create or replace view v_machine_today as
select
  m.id as machine_id,
  m.name,
  m.status,
  m.last_seen_at,
  coalesce(sum(s.liters), 0) as liters_today,
  coalesce(sum(s.amount_paid), 0) as revenue_today
from machines m
left join sales s
  on s.machine_id = m.id
  and s.sold_at >= date_trunc('day', now())
group by m.id, m.name, m.status, m.last_seen_at;

-- ------------------------------------------------------------
-- Row Level Security (adjust policies to your auth model)
-- ------------------------------------------------------------
alter table machines enable row level security;
alter table readings enable row level security;
alter table sales    enable row level security;
alter table alerts   enable row level security;

-- Dashboard users (authenticated) can read everything
create policy "authenticated read machines" on machines for select using (auth.role() = 'authenticated');
create policy "authenticated read readings" on readings for select using (auth.role() = 'authenticated');
create policy "authenticated read sales"    on sales    for select using (auth.role() = 'authenticated');
create policy "authenticated read alerts"   on alerts   for select using (auth.role() = 'authenticated');

-- Devices insert readings using a service-role key (server-side / Edge Function),
-- so no public insert policy is needed on `readings`. See docs/HARDWARE_INTEGRATION.md.

-- ------------------------------------------------------------
-- Realtime: expose these tables to Supabase Realtime so the
-- dashboard can subscribe to live changes
-- ------------------------------------------------------------
alter publication supabase_realtime add table machines;
alter publication supabase_realtime add table readings;
alter publication supabase_realtime add table alerts;
