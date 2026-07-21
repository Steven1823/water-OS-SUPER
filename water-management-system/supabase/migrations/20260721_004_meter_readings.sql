-- Migration: 20260721_004_meter_readings
-- Description: Create meter_readings table for consumption tracking

create table if not exists public.meter_readings (
  id uuid primary key default uuid_generate_v4(),
  meter_id uuid not null references public.meters(id) on delete cascade,
  reading_value numeric not null check (reading_value >= 0),
  reading_date date not null,
  recorded_by uuid,  -- references auth.users.id, but nullable for system-generated
  source text not null default 'manual' check (source in ('manual', 'automatic')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_meter_readings_meter_id on public.meter_readings (meter_id);
create index if not exists idx_meter_readings_reading_date on public.meter_readings (reading_date desc);
create index if not exists idx_meter_readings_source on public.meter_readings (source);

-- RLS
alter table public.meter_readings enable row level security;

create policy "Allow authenticated users to read meter_readings"
  on public.meter_readings
  for select
  using (true);

create policy "Allow staff to insert/update meter_readings"
  on public.meter_readings
  for insert
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

create policy "Allow staff to update own readings"
  on public.meter_readings
  for update
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

comment on table public.meter_readings is 'Monthly/periodic consumption readings from each meter';
comment on column public.meter_readings.source is 'manual (staff-recorded), automatic (from linked machine)';
comment on column public.meter_readings.reading_value is 'Cumulative liters read from the meter';
