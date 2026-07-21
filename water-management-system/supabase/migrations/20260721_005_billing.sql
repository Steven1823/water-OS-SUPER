-- Migration: 20260721_005_billing
-- Description: Create bills table for customer billing records

create table if not exists public.bills (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references public.customers(id) on delete restrict,
  meter_id uuid not null references public.meters(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  liters_billed numeric not null check (liters_billed >= 0),
  amount numeric not null check (amount >= 0),
  status text not null default 'pending' check (status in ('pending', 'paid', 'partial', 'overdue', 'cancelled')),
  due_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bills_customer_id on public.bills (customer_id);
create index if not exists idx_bills_meter_id on public.bills (meter_id);
create index if not exists idx_bills_status on public.bills (status);
create index if not exists idx_bills_due_date on public.bills (due_date);
create index if not exists idx_bills_created_at on public.bills (created_at desc);

-- RLS
alter table public.bills enable row level security;

create policy "Allow authenticated users to read bills"
  on public.bills
  for select
  using (true);

create policy "Allow staff to manage bills"
  on public.bills
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

comment on table public.bills is 'Generated bills for customer consumption during a billing period';
comment on column public.bills.status is 'pending (awaiting payment), paid (fully paid), partial (part-paid), overdue (unpaid past due_date), cancelled';
comment on column public.bills.amount is 'Total amount due in smallest currency unit';
