-- Migration: 20260721_008_inventory
-- Description: Create inventory management tables (stock items, suppliers)

create table if not exists public.suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  contact_person text,
  phone text,
  email text,
  address text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create index if not exists idx_suppliers_name on public.suppliers (name);
create index if not exists idx_suppliers_status on public.suppliers (status);

create table if not exists public.stock_items (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  category text not null,  -- 'pipes', 'fittings', 'meters', 'chemicals', 'tools', etc.
  quantity integer not null default 0 check (quantity >= 0),
  unit text not null,  -- 'piece', 'box', 'bag', 'liter', etc.
  reorder_level integer not null default 10,
  unit_cost numeric not null check (unit_cost > 0),
  supplier_id uuid references public.suppliers(id) on delete set null,
  last_restocked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_stock_items_name on public.stock_items (name);
create index if not exists idx_stock_items_category on public.stock_items (category);
create index if not exists idx_stock_items_quantity on public.stock_items (quantity);
create index if not exists idx_stock_items_supplier_id on public.stock_items (supplier_id);

-- RLS
alter table public.suppliers enable row level security;

create policy "Allow authenticated users to read suppliers"
  on public.suppliers
  for select
  using (true);

create policy "Allow staff to manage suppliers"
  on public.suppliers
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

alter table public.stock_items enable row level security;

create policy "Allow authenticated users to read stock_items"
  on public.stock_items
  for select
  using (true);

create policy "Allow staff to manage stock_items"
  on public.stock_items
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

comment on table public.suppliers is 'Equipment and spare parts suppliers';
comment on table public.stock_items is 'Inventory items (pipes, fittings, chemicals, tools)';
comment on column public.stock_items.reorder_level is 'Threshold to trigger purchase order';
