-- Migration: 20260721_007_staff_management
-- Description: Create staff management tables (employees, roles)

create table if not exists public.roles (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  description text,
  permissions jsonb not null default '{"can_read": true}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_roles_name on public.roles (name);

create table if not exists public.employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  phone text,
  role_id uuid not null references public.roles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'inactive', 'on_leave')),
  hire_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_employees_email on public.employees (email);
create index if not exists idx_employees_role_id on public.employees (role_id);
create index if not exists idx_employees_status on public.employees (status);

-- RLS
alter table public.roles enable row level security;

create policy "Allow authenticated users to read roles"
  on public.roles
  for select
  using (true);

create policy "Allow admin to manage roles"
  on public.roles
  for all
  using (auth.jwt() -> 'role' = '"admin"'::jsonb)
  with check (auth.jwt() -> 'role' = '"admin"'::jsonb);

alter table public.employees enable row level security;

create policy "Allow authenticated users to read employees"
  on public.employees
  for select
  using (true);

create policy "Allow staff to view employees"
  on public.employees
  for select
  using (auth.jwt() -> 'role' = '"staff"'::jsonb or auth.jwt() -> 'role' = '"admin"'::jsonb);

create policy "Allow admin to manage employees"
  on public.employees
  for all
  using (auth.jwt() -> 'role' = '"admin"'::jsonb)
  with check (auth.jwt() -> 'role' = '"admin"'::jsonb);

comment on table public.roles is 'Role definitions (admin, staff, field_officer, manager)';
comment on column public.roles.permissions is 'JSONB object with permission flags (can_read, can_write, can_bill, etc.)';
comment on table public.employees is 'Staff members with assigned roles';
