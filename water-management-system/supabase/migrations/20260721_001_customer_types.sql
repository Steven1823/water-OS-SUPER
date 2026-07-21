-- Migration: 20260721_001_customer_types
-- Description: Create customer_types lookup table for tariff management

create table if not exists public.customer_types (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  tariff_rate_per_liter numeric not null check (tariff_rate_per_liter > 0),
  description text,
  created_at timestamptz not null default now()
);

create index if not exists idx_customer_types_name on public.customer_types (name);

-- RLS
alter table public.customer_types enable row level security;

create policy "Allow authenticated users to read customer_types"
  on public.customer_types
  for select
  using (true);

create policy "Allow staff to manage customer_types"
  on public.customer_types
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

comment on table public.customer_types is 'Customer classification for billing (residential, commercial, industrial)';
comment on column public.customer_types.tariff_rate_per_liter is 'Price per liter in the smallest currency unit (e.g., cents)';
