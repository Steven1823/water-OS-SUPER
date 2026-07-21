-- Migration: 20260721_009_maintenance
-- Description: Create maintenance tables (repairs, leak reports)

create table if not exists public.repairs (
  id uuid primary key default uuid_generate_v4(),
  machine_id uuid references public.machines(id) on delete set null,
  meter_id uuid references public.meters(id) on delete set null,
  description text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'completed', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  reported_by uuid,  -- staff member who reported
  assigned_to uuid,  -- staff member assigned to fix
  reported_at timestamptz not null default now(),
  started_at timestamptz,
  resolved_at timestamptz,
  notes text,
  cost numeric check (cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_repairs_machine_id on public.repairs (machine_id);
create index if not exists idx_repairs_meter_id on public.repairs (meter_id);
create index if not exists idx_repairs_status on public.repairs (status);
create index if not exists idx_repairs_priority on public.repairs (priority);
create index if not exists idx_repairs_reported_at on public.repairs (reported_at desc);

create table if not exists public.leak_reports (
  id uuid primary key default uuid_generate_v4(),
  machine_id uuid references public.machines(id) on delete set null,
  meter_id uuid references public.meters(id) on delete set null,
  description text not null,
  severity text not null check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'reported' check (status in ('reported', 'confirmed', 'repaired', 'false_alarm')),
  estimated_loss_liters numeric,  -- liters per day lost to leak
  reported_by uuid,  -- customer or staff
  assigned_to uuid,  -- staff assigned to investigate
  reported_at timestamptz not null default now(),
  investigated_at timestamptz,
  resolved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leak_reports_machine_id on public.leak_reports (machine_id);
create index if not exists idx_leak_reports_meter_id on public.leak_reports (meter_id);
create index if not exists idx_leak_reports_status on public.leak_reports (status);
create index if not exists idx_leak_reports_severity on public.leak_reports (severity);
create index if not exists idx_leak_reports_reported_at on public.leak_reports (reported_at desc);

-- RLS
alter table public.repairs enable row level security;

create policy "Allow authenticated users to read repairs"
  on public.repairs
  for select
  using (true);

create policy "Allow staff to manage repairs"
  on public.repairs
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

alter table public.leak_reports enable row level security;

create policy "Allow authenticated users to read leak_reports"
  on public.leak_reports
  for select
  using (true);

create policy "Allow staff to manage leak_reports"
  on public.leak_reports
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

comment on table public.repairs is 'Maintenance records for machine and meter repairs';
comment on column public.repairs.status is 'open, in_progress, completed, cancelled';
comment on column public.repairs.priority is 'low, normal, high, urgent';
comment on table public.leak_reports is 'Suspected or confirmed water leaks reported by customers or staff';
comment on column public.leak_reports.severity is 'low, medium, high, critical';
comment on column public.leak_reports.status is 'reported, confirmed, repaired, false_alarm';
