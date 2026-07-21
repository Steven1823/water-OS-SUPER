-- Migration: 20260721_006_payments
-- Description: Create payments table and trigger to update bill status

create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  bill_id uuid not null references public.bills(id) on delete restrict,
  amount numeric not null check (amount > 0),
  method text not null check (method in ('mpesa', 'cash', 'bank_transfer', 'cheque', 'other')),
  paid_at timestamptz not null default now(),
  receipt_number text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_payments_bill_id on public.payments (bill_id);
create index if not exists idx_payments_paid_at on public.payments (paid_at desc);
create index if not exists idx_payments_method on public.payments (method);

-- RLS
alter table public.payments enable row level security;

create policy "Allow authenticated users to read payments"
  on public.payments
  for select
  using (true);

create policy "Allow staff to manage payments"
  on public.payments
  for all
  using (auth.jwt() -> 'role' = '"staff"'::jsonb)
  with check (auth.jwt() -> 'role' = '"staff"'::jsonb);

-- Trigger function to update bill status based on payment amount
create or replace function public.update_bill_status_on_payment()
returns trigger as $$
declare
  paid_total numeric;
  bill_amount numeric;
begin
  -- Sum all payments for this bill
  select sum(amount) into paid_total from public.payments where bill_id = new.bill_id;
  select amount into bill_amount from public.bills where id = new.bill_id;
  
  -- Update bill status
  if paid_total >= bill_amount then
    update public.bills set status = 'paid', updated_at = now() where id = new.bill_id;
  elsif paid_total > 0 then
    update public.bills set status = 'partial', updated_at = now() where id = new.bill_id;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger trg_update_bill_status_on_payment
after insert on public.payments
for each row
execute function public.update_bill_status_on_payment();

comment on table public.payments is 'Payment records for bills; trigger automatically updates bill status';
comment on column public.payments.method is 'Payment method: mpesa, cash, bank_transfer, cheque, other';
comment on column public.payments.receipt_number is 'External receipt/reference number from payment provider';
