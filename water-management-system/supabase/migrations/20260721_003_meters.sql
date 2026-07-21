-- Migration: 20260721_003_meters
-- Description: Create meters table linking customers to machines and capturing meter data

create table if not exists public.meters (
  id uuid primary key default uuid_generate_v4(),
  serial_number text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  machine_id uuid references public.machines(id) on delete set null,
  install_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'inactive', 'faulty', 'removed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_meters_serial_number on public.meters (serial_number);
create index if not exists idx_meters_customer_id on public.meters (customer_id);
create index if not exists idx_meters_machine_id on public.meters (machine_id);
create index if not exists idx_meters_status on public.meters (status);

-- RLS
alter table public.meters enable row level security;

create policy "Allow authenticated users to read meters"
  on public.meters
  for select
  using (true);

create policy "Allow staff to manage meters"
  on public.meters
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

comment on table public.meters is 'Water meters assigned to customers, optionally linked to physical machines';
comment on column public.meters.machine_id is 'Optional link to a physical water dispensing machine from the machines table';
comment on column public.meters.status is 'active, inactive, faulty, removed';
