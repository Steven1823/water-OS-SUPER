-- Demo seed for water-management-system
-- Applies to current single-tenant schema (no business_id columns).
-- Safe to re-run: removes prior demo rows by deterministic prefixes.

begin;

-- Cleanup old demo rows (order matters for FK constraints)
delete from public.payments where receipt_number like 'DEMO-%';
delete from public.bills where notes like 'DEMO:%';
delete from public.meter_readings where notes like 'DEMO:%';
delete from public.repairs where description like 'DEMO:%';
delete from public.leak_reports where description like 'DEMO:%';
delete from public.stock_items where name like 'Demo %';
delete from public.suppliers where name like 'Demo %';
delete from public.meters where serial_number like 'DMTR-%';
delete from public.customers where email like '%@demo-water.local';
delete from public.sales where payment_method = 'demo';
delete from public.readings where machine_id in (
  select id from public.machines where serial_number like 'DEMO-MACH-%'
);
delete from public.alerts where machine_id in (
  select id from public.machines where serial_number like 'DEMO-MACH-%'
);
delete from public.machines where serial_number like 'DEMO-MACH-%';

-- Customer types
insert into public.customer_types (name, tariff_rate_per_liter, description)
values
  ('Demo Residential', 0.25, 'DEMO: households'),
  ('Demo Commercial', 0.35, 'DEMO: small businesses'),
  ('Demo Institution', 0.2, 'DEMO: institutions')
on conflict (name) do update
set tariff_rate_per_liter = excluded.tariff_rate_per_liter,
    description = excluded.description;

-- Machines
insert into public.machines (serial_number, name, address, tank_capacity_liters, daily_target_liters, status, last_seen_at)
values
  ('DEMO-MACH-001', 'Demo Machine East', 'Demo Estate Block A', 5000, 1800, 'online', now() - interval '10 minutes'),
  ('DEMO-MACH-002', 'Demo Machine West', 'Demo Market Gate 2', 4000, 1400, 'online', now() - interval '20 minutes');

-- Customers
with ct as (
  select id, name from public.customer_types where name in ('Demo Residential', 'Demo Commercial', 'Demo Institution')
)
insert into public.customers (name, phone, email, address, customer_type_id, status)
select * from (
  select 'Amina Wanjiku', '+254700100100', 'amina@demo-water.local', 'Demo Estate H12', (select id from ct where name = 'Demo Residential'), 'active'
  union all
  select 'Kariuki Kiosk', '+254700100101', 'kiosk@demo-water.local', 'Demo Market Stall 9', (select id from ct where name = 'Demo Commercial'), 'active'
  union all
  select 'Sunrise Academy', '+254700100102', 'academy@demo-water.local', 'Demo Ward 3', (select id from ct where name = 'Demo Institution'), 'active'
  union all
  select 'Mwangi Family', '+254700100103', 'mwangi@demo-water.local', 'Demo Estate H18', (select id from ct where name = 'Demo Residential'), 'active'
) as seed(name, phone, email, address, customer_type_id, status);

-- Meters
with mach as (
  select id, serial_number from public.machines where serial_number like 'DEMO-MACH-%'
), cust as (
  select id, email from public.customers where email like '%@demo-water.local'
)
insert into public.meters (serial_number, customer_id, machine_id, install_date, status)
select * from (
  select 'DMTR-0001', (select id from cust where email = 'amina@demo-water.local'), (select id from mach where serial_number = 'DEMO-MACH-001'), current_date - 120, 'active'
  union all
  select 'DMTR-0002', (select id from cust where email = 'kiosk@demo-water.local'), (select id from mach where serial_number = 'DEMO-MACH-001'), current_date - 95, 'active'
  union all
  select 'DMTR-0003', (select id from cust where email = 'academy@demo-water.local'), (select id from mach where serial_number = 'DEMO-MACH-002'), current_date - 160, 'active'
  union all
  select 'DMTR-0004', (select id from cust where email = 'mwangi@demo-water.local'), (select id from mach where serial_number = 'DEMO-MACH-002'), current_date - 70, 'active'
) as seed(serial_number, customer_id, machine_id, install_date, status);

-- Meter readings (cumulative values across two periods)
with m as (
  select id, serial_number from public.meters where serial_number like 'DMTR-%'
)
insert into public.meter_readings (meter_id, reading_value, reading_date, source, notes)
select * from (
  select (select id from m where serial_number = 'DMTR-0001'), 1200, current_date - 35, 'manual', 'DEMO: baseline'
  union all
  select (select id from m where serial_number = 'DMTR-0001'), 1540, current_date - 5, 'manual', 'DEMO: current'
  union all
  select (select id from m where serial_number = 'DMTR-0002'), 860, current_date - 35, 'manual', 'DEMO: baseline'
  union all
  select (select id from m where serial_number = 'DMTR-0002'), 1125, current_date - 5, 'manual', 'DEMO: current'
  union all
  select (select id from m where serial_number = 'DMTR-0003'), 2280, current_date - 35, 'manual', 'DEMO: baseline'
  union all
  select (select id from m where serial_number = 'DMTR-0003'), 2795, current_date - 5, 'manual', 'DEMO: current'
  union all
  select (select id from m where serial_number = 'DMTR-0004'), 640, current_date - 35, 'manual', 'DEMO: baseline'
  union all
  select (select id from m where serial_number = 'DMTR-0004'), 910, current_date - 5, 'manual', 'DEMO: current'
) as seed(meter_id, reading_value, reading_date, source, notes);

-- Bills with multiple statuses
with cust as (
  select id, email from public.customers where email like '%@demo-water.local'
), m as (
  select id, serial_number from public.meters where serial_number like 'DMTR-%'
)
insert into public.bills (customer_id, meter_id, period_start, period_end, liters_billed, amount, status, due_date, notes, created_at)
select * from (
  select (select id from cust where email = 'amina@demo-water.local'), (select id from m where serial_number = 'DMTR-0001'), current_date - 30, current_date - 1, 340, 85, 'pending', current_date + 10, 'DEMO: monthly bill', now() - interval '7 days'
  union all
  select (select id from cust where email = 'kiosk@demo-water.local'), (select id from m where serial_number = 'DMTR-0002'), current_date - 30, current_date - 1, 265, 92.75, 'partial', current_date + 5, 'DEMO: monthly bill', now() - interval '6 days'
  union all
  select (select id from cust where email = 'academy@demo-water.local'), (select id from m where serial_number = 'DMTR-0003'), current_date - 30, current_date - 1, 515, 103, 'paid', current_date + 3, 'DEMO: monthly bill', now() - interval '5 days'
  union all
  select (select id from cust where email = 'mwangi@demo-water.local'), (select id from m where serial_number = 'DMTR-0004'), current_date - 60, current_date - 31, 270, 67.5, 'overdue', current_date - 14, 'DEMO: prior bill', now() - interval '33 days'
) as seed(customer_id, meter_id, period_start, period_end, liters_billed, amount, status, due_date, notes, created_at);

-- Payments in different methods
with b as (
  select id, notes from public.bills where notes like 'DEMO:%'
)
insert into public.payments (bill_id, amount, method, paid_at, receipt_number, notes)
select * from (
  select (select id from b order by id limit 1 offset 1), 45, 'cash', now() - interval '4 days', 'DEMO-CASH-001', 'DEMO: partial payment'
  union all
  select (select id from b order by id limit 1 offset 2), 103, 'mpesa', now() - interval '3 days', 'DEMO-MPESA-001', 'DEMO: full payment'
  union all
  select (select id from b order by id limit 1 offset 0), 20, 'bank_transfer', now() - interval '1 day', 'DEMO-BANK-001', 'DEMO: advance payment'
) as seed(bill_id, amount, method, paid_at, receipt_number, notes);

-- Machine telemetry and sales for dashboard charts
with mach as (
  select id, serial_number from public.machines where serial_number like 'DEMO-MACH-%'
)
insert into public.readings (machine_id, liters_dispensed_total, liters_since_last_report, tank_level_percent, flow_rate_lpm, battery_voltage, signal_rssi, reported_at)
select * from (
  select (select id from mach where serial_number = 'DEMO-MACH-001'), 7800, 120, 63, 10.1, 12.2, -79, now() - interval '2 hours'
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-001'), 7925, 125, 59, 10.5, 12.1, -82, now() - interval '45 minutes'
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-002'), 6450, 110, 47, 9.6, 12.0, -84, now() - interval '3 hours'
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-002'), 6585, 135, 41, 10.0, 11.9, -86, now() - interval '30 minutes'
) as seed(machine_id, liters_dispensed_total, liters_since_last_report, tank_level_percent, flow_rate_lpm, battery_voltage, signal_rssi, reported_at);

with mach as (
  select id, serial_number from public.machines where serial_number like 'DEMO-MACH-%'
)
insert into public.sales (machine_id, liters, amount_paid, payment_method, sold_at)
select * from (
  select (select id from mach where serial_number = 'DEMO-MACH-001'), 120, 30, 'demo', now() - interval '2 hours'
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-001'), 125, 31.25, 'demo', now() - interval '45 minutes'
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-002'), 110, 27.5, 'demo', now() - interval '3 hours'
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-002'), 135, 33.75, 'demo', now() - interval '30 minutes'
) as seed(machine_id, liters, amount_paid, payment_method, sold_at);

insert into public.alerts (machine_id, type, message, resolved, created_at)
select id, 'low_tank', 'DEMO: tank below 15% threshold', false, now() - interval '20 minutes'
from public.machines
where serial_number = 'DEMO-MACH-002';

-- Inventory
insert into public.suppliers (name, contact_person, phone, email, address, status)
values
  ('Demo Pipe Supplies', 'Jane Njeri', '+254711000001', 'supplier1@demo-water.local', 'Demo Industrial Area', 'active'),
  ('Demo Meter Works', 'Peter Otieno', '+254711000002', 'supplier2@demo-water.local', 'Demo Highway', 'active');

with s as (
  select id, name from public.suppliers where name like 'Demo %'
)
insert into public.stock_items (name, category, quantity, unit, reorder_level, unit_cost, supplier_id, last_restocked_at)
select * from (
  select 'Demo HDPE Pipe 50mm', 'pipes', 120, 'piece', 40, 18.5, (select id from s where name = 'Demo Pipe Supplies'), now() - interval '10 days'
  union all
  select 'Demo Brass Coupler', 'fittings', 35, 'piece', 50, 4.25, (select id from s where name = 'Demo Pipe Supplies'), now() - interval '14 days'
  union all
  select 'Demo Replacement Meter', 'meters', 8, 'piece', 5, 62, (select id from s where name = 'Demo Meter Works'), now() - interval '7 days'
) as seed(name, category, quantity, unit, reorder_level, unit_cost, supplier_id, last_restocked_at);

-- Repairs and leak reports
with mach as (
  select id, serial_number from public.machines where serial_number like 'DEMO-MACH-%'
), m as (
  select id, serial_number from public.meters where serial_number like 'DMTR-%'
)
insert into public.repairs (machine_id, meter_id, description, status, priority, reported_at, started_at, notes, cost)
select * from (
  select (select id from mach where serial_number = 'DEMO-MACH-001'), (select id from m where serial_number = 'DMTR-0002'), 'DEMO: Replace worn pump relay', 'in_progress', 'high', now() - interval '2 days', now() - interval '1 day', 'DEMO: technician onsite', 1200
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-002'), (select id from m where serial_number = 'DMTR-0004'), 'DEMO: Meter housing seal replacement', 'open', 'normal', now() - interval '16 hours', null, 'DEMO: waiting parts', null
) as seed(machine_id, meter_id, description, status, priority, reported_at, started_at, notes, cost);

with mach as (
  select id, serial_number from public.machines where serial_number like 'DEMO-MACH-%'
), m as (
  select id, serial_number from public.meters where serial_number like 'DMTR-%'
)
insert into public.leak_reports (machine_id, meter_id, description, severity, status, estimated_loss_liters, reported_at, notes)
select * from (
  select (select id from mach where serial_number = 'DEMO-MACH-002'), (select id from m where serial_number = 'DMTR-0003'), 'DEMO: suspected underground leak near service line', 'high', 'confirmed', 320, now() - interval '3 days', 'DEMO: pressure test indicates leak'
  union all
  select (select id from mach where serial_number = 'DEMO-MACH-001'), (select id from m where serial_number = 'DMTR-0001'), 'DEMO: damp patch reported by customer', 'medium', 'reported', 95, now() - interval '20 hours', 'DEMO: pending inspection'
) as seed(machine_id, meter_id, description, severity, status, estimated_loss_liters, reported_at, notes);

commit;
