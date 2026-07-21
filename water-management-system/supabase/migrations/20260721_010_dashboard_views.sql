-- Migration: 20260721_010_dashboard_views
-- Description: Create SQL views for dashboard KPIs and analytics

-- Dashboard summary: key metrics
create or replace view public.v_dashboard_summary as
select
  (select count(*) from public.customers where status = 'active') as total_customers,
  (select count(*) from public.meters where status = 'active') as active_meters,
  (select count(*) from public.bills 
   where date_trunc('month', created_at) = date_trunc('month', now())
   and status in ('pending', 'partial', 'overdue')) as bills_generated_this_month,
  (select count(*) from public.payments 
   where date_trunc('month', paid_at) = date_trunc('month', now())) as payments_received_this_month,
  (select count(*) from public.bills 
   where status in ('pending', 'overdue') 
   and due_date < current_date) as pending_bills_count,
  (select coalesce(sum(liters_billed), 0) from public.bills 
   where date_trunc('month', period_end) = date_trunc('month', now())) as total_water_consumption_this_month;

-- Revenue last 12 months
create or replace view public.v_revenue_last_12_months as
select
  date_trunc('month', paid_at)::date as month,
  sum(amount) as revenue
from public.payments
where paid_at >= now() - interval '12 months'
group by date_trunc('month', paid_at)
order by month desc;

-- Water consumption last 12 months
create or replace view public.v_consumption_last_12_months as
select
  date_trunc('month', period_end)::date as month,
  sum(liters_billed) as total_liters
from public.bills
where period_end >= current_date - interval '12 months'
group by date_trunc('month', period_end)
order by month desc;

-- Bill status breakdown
create or replace view public.v_bill_status_breakdown as
select
  status,
  count(*) as count
from public.bills
where created_at >= now() - interval '30 days'
group by status
order by count desc;

-- Payment method breakdown
create or replace view public.v_payment_method_breakdown as
select
  method,
  count(*) as count,
  sum(amount) as total_amount
from public.payments
where paid_at >= now() - interval '30 days'
group by method
order by count desc;

-- Customer growth last 12 months
create or replace view public.v_customer_growth_last_12_months as
select
  date_trunc('month', created_at)::date as month,
  count(*) as new_customers
from public.customers
where created_at >= now() - interval '12 months'
group by date_trunc('month', created_at)
order by month desc;

-- Outstanding receivables by customer
create or replace view public.v_customer_receivables as
select
  c.id,
  c.name,
  c.phone,
  c.email,
  coalesce(sum(case when b.status in ('pending', 'partial', 'overdue') then b.amount else 0 end), 0) as amount_outstanding,
  coalesce(count(case when b.status in ('pending', 'partial', 'overdue') then 1 end), 0) as bills_outstanding,
  max(case when b.status = 'overdue' then b.due_date else null end) as oldest_overdue_date
from public.customers c
left join public.bills b on c.id = b.customer_id
where c.status = 'active'
group by c.id, c.name, c.phone, c.email
having coalesce(sum(case when b.status in ('pending', 'partial', 'overdue') then b.amount else 0 end), 0) > 0
order by amount_outstanding desc;

-- Active meters per customer
create or replace view public.v_meters_by_customer as
select
  c.id as customer_id,
  c.name as customer_name,
  count(m.id) as meter_count,
  sum(case when m.status = 'active' then 1 else 0 end) as active_meters,
  sum(case when m.status = 'faulty' then 1 else 0 end) as faulty_meters
from public.customers c
left join public.meters m on c.id = m.customer_id
group by c.id, c.name
order by meter_count desc;

-- Repair status summary
create or replace view public.v_repair_summary as
select
  status,
  priority,
  count(*) as count
from public.repairs
where resolved_at is null
group by status, priority
order by
  case when priority = 'urgent' then 1 when priority = 'high' then 2 else 3 end,
  case when status = 'open' then 1 when status = 'in_progress' then 2 else 3 end;

-- Leak reports summary
create or replace view public.v_leak_summary as
select
  severity,
  status,
  count(*) as count,
  coalesce(sum(estimated_loss_liters), 0) as estimated_daily_loss_liters
from public.leak_reports
where resolved_at is null or status != 'false_alarm'
group by severity, status
order by
  case when severity = 'critical' then 1 when severity = 'high' then 2 when severity = 'medium' then 3 else 4 end,
  case when status = 'reported' then 1 when status = 'confirmed' then 2 else 3 end;

comment on view public.v_dashboard_summary is 'Key KPI metrics for dashboard';
comment on view public.v_revenue_last_12_months is 'Monthly revenue aggregation';
comment on view public.v_consumption_last_12_months is 'Monthly water consumption';
comment on view public.v_bill_status_breakdown is 'Bills by status (pending, paid, overdue, etc)';
comment on view public.v_payment_method_breakdown is 'Payment breakdown by method';
comment on view public.v_customer_growth_last_12_months is 'New customers per month';
comment on view public.v_customer_receivables is 'Outstanding balances by customer';
comment on view public.v_meters_by_customer is 'Meter count and status per customer';
comment on view public.v_repair_summary is 'Open repairs grouped by status and priority';
comment on view public.v_leak_summary is 'Leak reports grouped by severity and status';
