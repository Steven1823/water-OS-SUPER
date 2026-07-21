-- Migration: 20260721_002_customers
-- Description: Create customers table with links to customer_types

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  phone text,
  email text,
  address text,
  customer_type_id uuid not null references public.customer_types(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'inactive', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_name on public.customers (name);
create index if not exists idx_customers_status on public.customers (status);
create index if not exists idx_customers_customer_type_id on public.customers (customer_type_id);
create index if not exists idx_customers_created_at on public.customers (created_at desc);

-- RLS
alter table public.customers enable row level security;

create policy "Allow authenticated users to read customers"
  on public.customers
  for select
  using (true);

create policy "Allow staff to manage customers"
  on public.customers
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

comment on table public.customers is 'Water utility customers (households, businesses, institutions)';
comment on column public.customers.status is 'active, inactive (no service), suspended (unpaid)';
