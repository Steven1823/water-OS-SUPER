-- Migration: 20260723_014_seed_multitenant_demo_data
-- Description: Seed realistic demo data for multi-tenant dashboard analytics

begin;

-- -----------------------------------------------------------------------------
-- Demo businesses
-- -----------------------------------------------------------------------------
insert into public.businesses (
  id, name, primary_color, phone, email, address, subscription_plan, subscription_status, trial_end
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'AquaFlow Utilities',
    '#0A7D6A',
    '+254700100100',
    'ops@aquaflow.demo',
    'Westlands, Nairobi',
    'growth',
    'active',
    now() + interval '30 days'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'BlueRiver Water Co',
    '#1E5AA8',
    '+254700200200',
    'team@blueriver.demo',
    'Mombasa Road, Nairobi',
    'starter',
    'trial',
    now() + interval '14 days'
  )
on conflict (id) do update
set
  name = excluded.name,
  primary_color = excluded.primary_color,
  phone = excluded.phone,
  email = excluded.email,
  address = excluded.address,
  subscription_plan = excluded.subscription_plan,
  subscription_status = excluded.subscription_status,
  trial_end = excluded.trial_end,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Customer types per business
-- -----------------------------------------------------------------------------
insert into public.customer_types (business_id, name, tariff_rate_per_liter, description)
select b.id, t.name, t.rate, t.description
from public.businesses b
cross join (
  values
    ('Residential', 0.75::numeric, 'Household domestic use'),
    ('Commercial', 1.10::numeric, 'Shops and offices'),
    ('Industrial', 1.45::numeric, 'High-volume industrial use'),
    ('Institution', 0.95::numeric, 'Schools and hospitals'),
    ('Government', 0.90::numeric, 'Government facilities'),
    ('Bulk', 1.25::numeric, 'Bulk tanker or wholesale')
) as t(name, rate, description)
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Inventory categories
-- -----------------------------------------------------------------------------
insert into public.inventory_categories (business_id, name, description)
select b.id, c.name, c.description
from public.businesses b
cross join (
  values
    ('Pipes', 'PVC, HDPE, GI piping stock'),
    ('Fittings', 'Connectors, couplings, elbows'),
    ('Meters', 'Spare meter units and sensors'),
    ('Chemicals', 'Water treatment chemicals'),
    ('Tools', 'Field maintenance tools')
) as c(name, description)
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Roles and permissions
-- -----------------------------------------------------------------------------
insert into public.roles (business_id, name, description, permissions)
select b.id, r.name, r.description, r.permissions
from public.businesses b
cross join (
  values
    ('owner', 'Business owner role', '{"all": true}'::jsonb),
    ('admin', 'Operational administrator', '{"users": true, "billing": true, "inventory": true}'::jsonb),
    ('cashier', 'Cash collection role', '{"billing": true, "payments": true}'::jsonb),
    ('technician', 'Maintenance role', '{"maintenance": true}'::jsonb),
    ('meter_reader', 'Meter reading role', '{"meters": true, "readings": true}'::jsonb),
    ('staff', 'General staff role', '{"dashboard": true}'::jsonb)
) as r(name, description, permissions)
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.permissions (business_id, code, description)
select b.id, p.code, p.description
from public.businesses b
cross join (
  values
    ('billing.generate', 'Generate customer bills'),
    ('payments.receive', 'Receive and post payments'),
    ('meters.read', 'Capture meter readings'),
    ('maintenance.manage', 'Manage repairs and leak reports'),
    ('inventory.manage', 'Manage inventory and procurement'),
    ('reports.view', 'View analytics and operational reports')
) as p(code, description)
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.departments (business_id, name, description)
select b.id, d.name, d.description
from public.businesses b
cross join (
  values
    ('Operations', 'Field and service operations'),
    ('Billing', 'Billing and collections'),
    ('Maintenance', 'Repairs and leak response'),
    ('Inventory', 'Stores and procurement')
) as d(name, description)
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Machines (5 total)
-- -----------------------------------------------------------------------------
insert into public.machines (
  business_id,
  serial_number,
  name,
  device_key,
  status,
  firmware,
  last_seen,
  signal_strength,
  battery,
  location_lat,
  location_lng,
  tank_capacity_liters
)
values
  ('11111111-1111-1111-1111-111111111111', 'AQ-001', 'AquaFlow Kiosk 001', 'dev_aq_001', 'online', '1.4.2', now() - interval '7 minutes', -71, 92, -1.267, 36.812, 5000),
  ('11111111-1111-1111-1111-111111111111', 'AQ-002', 'AquaFlow Kiosk 002', 'dev_aq_002', 'online', '1.4.2', now() - interval '4 minutes', -68, 88, -1.271, 36.805, 7000),
  ('11111111-1111-1111-1111-111111111111', 'AQ-003', 'AquaFlow Kiosk 003', 'dev_aq_003', 'maintenance', '1.3.9', now() - interval '2 hours', -79, 55, -1.280, 36.798, 5000),
  ('22222222-2222-2222-2222-222222222222', 'BR-001', 'BlueRiver Kiosk 001', 'dev_br_001', 'online', '1.4.1', now() - interval '5 minutes', -70, 90, -1.330, 36.870, 6000),
  ('22222222-2222-2222-2222-222222222222', 'BR-002', 'BlueRiver Kiosk 002', 'dev_br_002', 'offline', '1.4.0', now() - interval '1 day', -93, 22, -1.345, 36.882, 6000)
on conflict (business_id, serial_number) do update
set
  name = excluded.name,
  device_key = excluded.device_key,
  status = excluded.status,
  firmware = excluded.firmware,
  last_seen = excluded.last_seen,
  signal_strength = excluded.signal_strength,
  battery = excluded.battery,
  location_lat = excluded.location_lat,
  location_lng = excluded.location_lng,
  tank_capacity_liters = excluded.tank_capacity_liters,
  updated_at = now();

-- -----------------------------------------------------------------------------
-- Suppliers and stock items
-- -----------------------------------------------------------------------------
insert into public.suppliers (business_id, name, contact_person, phone, email, address, status)
select b.id, s.name, s.contact_person, s.phone, s.email, s.address, 'active'
from public.businesses b
cross join (
  values
    ('HydroParts Ltd', 'Mercy Wanjiku', '+254711100111', 'sales@hydroparts.demo', 'Industrial Area, Nairobi'),
    ('MeterWorks Kenya', 'Paul Mwangi', '+254722200222', 'orders@meterworks.demo', 'Thika Road, Nairobi'),
    ('PipeSource East', 'Ali Hassan', '+254733300333', 'supply@pipesource.demo', 'Mombasa, Kenya')
) as s(name, contact_person, phone, email, address)
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.stock_items (
  business_id,
  name,
  category,
  category_id,
  quantity,
  unit,
  reorder_level,
  unit_cost,
  supplier_id,
  sku,
  last_restocked_at
)
select
  b.id,
  i.name,
  i.category,
  c.id,
  i.quantity,
  i.unit,
  i.reorder_level,
  i.unit_cost,
  s.id,
  i.sku,
  now() - (i.idx || ' days')::interval
from public.businesses b
join lateral (
  values
    (1, '50mm PVC Pipe', 'Pipes', 120::int, 'piece', 40::int, 850::numeric, 'SKU-PIP-050'),
    (2, '32mm Elbow Joint', 'Fittings', 280::int, 'piece', 100::int, 120::numeric, 'SKU-FIT-032E'),
    (3, 'Smart Meter Module', 'Meters', 65::int, 'piece', 20::int, 4200::numeric, 'SKU-MTR-SM01'),
    (4, 'Chlorine Pack', 'Chemicals', 48::int, 'bag', 15::int, 1800::numeric, 'SKU-CHE-CL01'),
    (5, 'Pressure Gauge', 'Tools', 35::int, 'piece', 12::int, 950::numeric, 'SKU-TOL-PG01')
) as i(idx, name, category, quantity, unit, reorder_level, unit_cost, sku) on true
join public.inventory_categories c
  on c.business_id = b.id and lower(c.name) = lower(i.category)
left join lateral (
  select sp.id
  from public.suppliers sp
  where sp.business_id = b.id
  order by sp.created_at
  limit 1
) s on true
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Employees (20 total)
-- -----------------------------------------------------------------------------
insert into public.employees (
  business_id,
  employee_number,
  name,
  email,
  phone,
  role_id,
  department_id,
  status,
  hire_date
)
select
  b.id,
  format('%s-EMP-%s', case when b.id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(gs::text, 3, '0')),
  format('%s Employee %s', case when b.id = '11111111-1111-1111-1111-111111111111' then 'AquaFlow' else 'BlueRiver' end, gs),
  format('employee%s.%s@demo.local', gs, case when b.id = '11111111-1111-1111-1111-111111111111' then 'aq' else 'br' end),
  format('+2547%08s', (10000000 + gs)::text),
  r.id,
  d.id,
  'active',
  current_date - ((gs * 9) % 700)
from public.businesses b
join generate_series(1, 10) gs on true
join lateral (
  select id
  from public.roles
  where business_id = b.id and name in ('admin', 'cashier', 'technician', 'meter_reader', 'staff')
  order by name
  offset ((gs - 1) % 5)
  limit 1
) r on true
join lateral (
  select id
  from public.departments
  where business_id = b.id
  order by name
  offset ((gs - 1) % 4)
  limit 1
) d on true
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Customers (50 total)
-- -----------------------------------------------------------------------------
insert into public.customers (
  business_id,
  customer_number,
  name,
  id_number,
  phone,
  email,
  address,
  gps_coordinates,
  customer_type_id,
  status,
  notes
)
select
  b.id,
  format('%s-CUST-%s', case when b.id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(gs::text, 4, '0')),
  format('%s Customer %s', case when b.id = '11111111-1111-1111-1111-111111111111' then 'AquaFlow' else 'BlueRiver' end, gs),
  format('ID%s%s', case when b.id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(gs::text, 6, '0')),
  format('+2547%08s', (20000000 + gs)::text),
  format('customer%s.%s@demo.local', gs, case when b.id = '11111111-1111-1111-1111-111111111111' then 'aq' else 'br' end),
  format('Zone %s, Block %s', ((gs - 1) % 10) + 1, ((gs - 1) % 5) + 1),
  point(36.70 + ((gs % 15)::numeric / 100), -1.20 - ((gs % 15)::numeric / 100)),
  ct.id,
  case when gs % 17 = 0 then 'suspended' when gs % 11 = 0 then 'inactive' else 'active' end,
  'Seeded demo customer for analytics'
from public.businesses b
join generate_series(1, 25) gs on true
join lateral (
  select id
  from public.customer_types
  where business_id = b.id
  order by name
  offset ((gs - 1) % 6)
  limit 1
) ct on true
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Meters (80 total)
-- -----------------------------------------------------------------------------
insert into public.meters (
  business_id,
  serial_number,
  meter_number,
  customer_id,
  machine_id,
  install_date,
  installation_date,
  status,
  gps,
  battery,
  signal_strength
)
select
  c.business_id,
  format('%s-MTR-%s', case when c.business_id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(gs::text, 4, '0')),
  format('%s-MTR-%s', case when c.business_id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(gs::text, 4, '0')),
  c.id,
  m.id,
  current_date - ((gs * 7) % 900),
  current_date - ((gs * 7) % 900),
  case when gs % 19 = 0 then 'faulty' when gs % 23 = 0 then 'inactive' else 'active' end,
  point(36.72 + ((gs % 20)::numeric / 100), -1.22 - ((gs % 20)::numeric / 100)),
  (65 + (gs % 35))::numeric,
  -60 - (gs % 30)
from (
  select
    c.id,
    c.business_id,
    row_number() over (partition by c.business_id order by c.created_at, c.id) as rn
  from public.customers c
  where c.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
) c
join generate_series(1, 40) gs on gs = c.rn
left join lateral (
  select mm.id
  from public.machines mm
  where mm.business_id = c.business_id
  order by mm.created_at
  offset ((gs - 1) % 3)
  limit 1
) m on true
on conflict do nothing;

-- Add second meters to first 30 customers for 80 total
insert into public.meters (
  business_id,
  serial_number,
  meter_number,
  customer_id,
  machine_id,
  install_date,
  installation_date,
  status,
  gps,
  battery,
  signal_strength
)
select
  c.business_id,
  format('%s-MTRX-%s', case when c.business_id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(c.rn::text, 4, '0')),
  format('%s-MTRX-%s', case when c.business_id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(c.rn::text, 4, '0')),
  c.id,
  m.id,
  current_date - ((c.rn * 11) % 700),
  current_date - ((c.rn * 11) % 700),
  'active',
  point(36.75 + ((c.rn % 10)::numeric / 100), -1.25 - ((c.rn % 10)::numeric / 100)),
  (70 + (c.rn % 25))::numeric,
  -58 - (c.rn % 24)
from (
  select
    c.id,
    c.business_id,
    row_number() over (order by c.created_at, c.id) as rn
  from public.customers c
  where c.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
) c
left join lateral (
  select mm.id
  from public.machines mm
  where mm.business_id = c.business_id
  order by mm.created_at desc
  limit 1
) m on true
where c.rn <= 30
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Meter readings (500 total)
-- -----------------------------------------------------------------------------
insert into public.meter_readings (
  business_id,
  meter_id,
  reading_value,
  meter_value,
  reading_date,
  reading_at,
  source,
  reading_source,
  consumption,
  notes
)
select
  m.business_id,
  m.id,
  (1000 + (x * 15) + (row_number() over (partition by m.id order by x)))::numeric,
  (1000 + (x * 15) + (row_number() over (partition by m.id order by x)))::numeric,
  (current_date - ((x % 180)))::date,
  now() - ((x % 180) || ' days')::interval,
  case when x % 5 = 0 then 'automatic' else 'manual' end,
  case when x % 7 = 0 then 'iot' when x % 5 = 0 then 'automatic' else 'manual' end,
  (12 + (x % 40))::numeric,
  'Seeded periodic consumption reading'
from (
  select id, business_id, row_number() over (order by created_at, id) as rn
  from public.meters
  where business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
  limit 80
) m
join generate_series(1, 7) x on true
where (m.rn - 1) * 7 + x <= 500
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Tariffs
-- -----------------------------------------------------------------------------
insert into public.tariffs (
  business_id,
  customer_type_id,
  name,
  water_price,
  minimum_charge,
  sewer_charge,
  garbage_charge,
  vat_rate,
  penalty_rate,
  effective_from,
  is_active
)
select
  ct.business_id,
  ct.id,
  ct.name || ' Standard Tariff',
  ct.tariff_rate_per_liter,
  350,
  120,
  80,
  0.16,
  0.05,
  current_date - interval '180 days',
  true
from public.customer_types ct
where ct.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Bills and invoices
-- -----------------------------------------------------------------------------
insert into public.bills (
  business_id,
  bill_number,
  customer_id,
  meter_id,
  tariff_id,
  period_start,
  period_end,
  liters_billed,
  units,
  water_charges,
  sewer_charges,
  garbage_charges,
  tax,
  discount,
  penalty,
  amount,
  total,
  status,
  due_date,
  notes
)
select
  m.business_id,
  format('%s-BILL-%s', case when m.business_id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad((row_number() over (partition by m.business_id order by m.id, g))::text, 6, '0')),
  m.customer_id,
  m.id,
  t.id,
  (date_trunc('month', now()) - (g || ' months')::interval)::date,
  ((date_trunc('month', now()) - ((g - 1) || ' months')::interval) - interval '1 day')::date,
  (30 + (g * 3) + ((row_number() over (partition by m.business_id order by m.id)) % 40))::numeric,
  (30 + (g * 3) + ((row_number() over (partition by m.business_id order by m.id)) % 40))::numeric,
  (900 + (g * 55) + ((row_number() over (partition by m.business_id order by m.id)) % 300))::numeric,
  120,
  80,
  160,
  case when g % 6 = 0 then 100 else 0 end,
  case when g > 2 then 50 else 0 end,
  (900 + (g * 55) + ((row_number() over (partition by m.business_id order by m.id)) % 300) + 120 + 80 + 160 - case when g % 6 = 0 then 100 else 0 end + case when g > 2 then 50 else 0 end)::numeric,
  (900 + (g * 55) + ((row_number() over (partition by m.business_id order by m.id)) % 300) + 120 + 80 + 160 - case when g % 6 = 0 then 100 else 0 end + case when g > 2 then 50 else 0 end)::numeric,
  case when g = 1 then 'pending' when g = 2 then 'partial' when g = 5 then 'overdue' else 'paid' end,
  (current_date + ((7 - g) * 3))::date,
  'Seeded monthly billing record'
from (
  select id, business_id, customer_id
  from public.meters
  where business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
  order by created_at, id
  limit 40
) m
join generate_series(1, 3) g on true
left join lateral (
  select tr.id
  from public.tariffs tr
  where tr.business_id = m.business_id
  order by tr.created_at
  limit 1
) t on true
on conflict do nothing;

insert into public.invoices (
  business_id,
  bill_id,
  invoice_number,
  pdf_url,
  issued_at,
  status
)
select
  b.business_id,
  b.id,
  replace(b.bill_number, 'BILL', 'INV'),
  'https://example.invalid/invoices/' || b.id || '.pdf',
  b.created_at + interval '1 hour',
  case when b.status = 'cancelled' then 'cancelled' else 'issued' end
from public.bills b
where b.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Payments and receipts
-- -----------------------------------------------------------------------------
insert into public.payments (
  business_id,
  bill_id,
  customer_id,
  amount,
  method,
  transaction_reference,
  receipt_number,
  payment_date,
  paid_at,
  notes
)
select
  b.business_id,
  b.id,
  b.customer_id,
  case
    when b.status = 'paid' then b.total
    when b.status = 'partial' then round(b.total * 0.55, 2)
    else round(b.total * 0.25, 2)
  end,
  case
    when (row_number() over (order by b.created_at, b.id)) % 4 = 0 then 'cash'
    when (row_number() over (order by b.created_at, b.id)) % 4 = 1 then 'mpesa'
    when (row_number() over (order by b.created_at, b.id)) % 4 = 2 then 'bank_transfer'
    else 'cheque'
  end,
  'TXN-' || substring(replace(b.id::text, '-', '') from 1 for 12),
  'RCT-' || substring(replace(b.id::text, '-', '') from 1 for 10),
  b.created_at + interval '10 days',
  b.created_at + interval '10 days',
  'Seeded payment record'
from public.bills b
where b.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
  and b.status in ('paid', 'partial', 'pending')
on conflict do nothing;

insert into public.receipts (
  business_id,
  payment_id,
  receipt_number,
  rendered_data
)
select
  p.business_id,
  p.id,
  coalesce(p.receipt_number, 'RCT-' || substring(replace(p.id::text, '-', '') from 1 for 10)),
  jsonb_build_object(
    'amount', p.amount,
    'method', p.method,
    'transaction_reference', p.transaction_reference,
    'issued_at', p.payment_date
  )
from public.payments p
where p.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Leak reports and repairs
-- -----------------------------------------------------------------------------
insert into public.leak_reports (
  business_id,
  machine_id,
  meter_id,
  description,
  severity,
  status,
  estimated_loss_liters,
  latitude,
  longitude,
  photos,
  timeline,
  reported_at,
  notes
)
select
  m.business_id,
  m.id,
  mt.id,
  format('Leak report %s for %s', gs, m.name),
  case when gs % 5 = 0 then 'critical' when gs % 3 = 0 then 'high' when gs % 2 = 0 then 'medium' else 'low' end,
  case when gs % 4 = 0 then 'confirmed' when gs % 7 = 0 then 'repaired' else 'reported' end,
  (50 + (gs * 12))::numeric,
  m.location_lat,
  m.location_lng,
  '[]'::jsonb,
  jsonb_build_array(jsonb_build_object('event', 'reported', 'at', now() - (gs || ' days')::interval)),
  now() - (gs || ' days')::interval,
  'Seeded leak monitoring case'
from (
  select id, business_id, name, location_lat, location_lng,
         row_number() over (partition by business_id order by created_at, id) as rn
  from public.machines
  where business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
) m
join generate_series(1, 10) gs on true
left join lateral (
  select id
  from public.meters mm
  where mm.business_id = m.business_id
  order by mm.created_at
  offset ((gs - 1) % 10)
  limit 1
) mt on true
where m.rn <= 1
on conflict do nothing;

insert into public.repairs (
  business_id,
  repair_number,
  machine_id,
  meter_id,
  technician_id,
  description,
  status,
  priority,
  reported_at,
  started_at,
  resolved_at,
  completion_date,
  cost,
  notes
)
select
  m.business_id,
  format('%s-REP-%s', case when m.business_id = '11111111-1111-1111-1111-111111111111' then 'AQ' else 'BR' end, lpad(gs::text, 5, '0')),
  m.id,
  mt.id,
  tech.profile_id,
  format('Repair task %s for %s', gs, m.name),
  case when gs % 5 = 0 then 'completed' when gs % 3 = 0 then 'in_progress' else 'open' end,
  case when gs % 6 = 0 then 'urgent' when gs % 4 = 0 then 'high' else 'normal' end,
  now() - (gs || ' days')::interval,
  now() - ((gs - 1) || ' days')::interval,
  case when gs % 5 = 0 then now() - ((gs - 2) || ' days')::interval else null end,
  case when gs % 5 = 0 then (current_date - (gs % 20)) else null end,
  (1500 + gs * 220)::numeric,
  'Seeded maintenance repair case'
from (
  select id, business_id, name,
         row_number() over (partition by business_id order by created_at, id) as rn
  from public.machines
  where business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
) m
join generate_series(1, 10) gs on true
left join lateral (
  select id
  from public.meters mm
  where mm.business_id = m.business_id
  order by mm.created_at desc
  offset ((gs - 1) % 10)
  limit 1
) mt on true
left join lateral (
  select p.id as profile_id
  from public.profiles p
  where p.business_id = m.business_id and p.role = 'technician'
  limit 1
) tech on true
where m.rn <= 1
on conflict do nothing;

-- -----------------------------------------------------------------------------
-- Attendance, movements, adjustments, notifications, logs
-- -----------------------------------------------------------------------------
insert into public.attendance (business_id, employee_id, work_date, check_in, check_out, status, notes)
select
  e.business_id,
  e.id,
  current_date - gs,
  (date_trunc('day', now()) - (gs || ' days')::interval) + interval '08:05',
  (date_trunc('day', now()) - (gs || ' days')::interval) + interval '17:10',
  case when gs % 9 = 0 then 'late' else 'present' end,
  'Seeded attendance row'
from public.employees e
join generate_series(1, 5) gs on true
where e.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.stock_movements (
  business_id,
  stock_item_id,
  movement_type,
  quantity,
  from_location,
  to_location,
  reference_type,
  notes
)
select
  si.business_id,
  si.id,
  case when gs % 4 = 0 then 'damage' when gs % 3 = 0 then 'transfer' when gs % 2 = 0 then 'outgoing' else 'incoming' end,
  (2 + (gs % 8))::numeric,
  'Main Warehouse',
  'Field Store A',
  'seed',
  'Seeded stock movement'
from public.stock_items si
join generate_series(1, 4) gs on true
where si.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.stock_adjustments (
  business_id,
  stock_item_id,
  adjustment_type,
  quantity_delta,
  reason
)
select
  si.business_id,
  si.id,
  case when gs % 2 = 0 then 'count_correction' else 'damage' end,
  case when gs % 2 = 0 then 3 else -2 end,
  'Seeded stock adjustment'
from public.stock_items si
join generate_series(1, 2) gs on true
where si.business_id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.notifications (
  business_id,
  title,
  message,
  channel,
  status,
  metadata
)
select
  b.id,
  n.title,
  n.message,
  n.channel,
  'queued',
  '{}'::jsonb
from public.businesses b
cross join (
  values
    ('Billing cycle generated', 'Monthly bills were generated successfully.', 'in_app'),
    ('Low stock warning', 'At least one stock item is below reorder level.', 'in_app'),
    ('Leak response pending', 'A high severity leak requires technician dispatch.', 'sms')
) as n(title, message, channel)
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.announcements (business_id, title, body, starts_at, ends_at)
select
  b.id,
  'Planned maintenance window',
  'Platform maintenance planned on Sunday between 01:00 and 03:00 EAT.',
  now() + interval '2 days',
  now() + interval '3 days'
from public.businesses b
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.activity_logs (business_id, action, entity_type, metadata)
select
  b.id,
  'seed.bootstrap',
  'database',
  jsonb_build_object('source', '20260723_014_seed_multitenant_demo_data')
from public.businesses b
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.system_logs (business_id, level, source, message, payload)
select
  b.id,
  'info',
  'seed',
  'Demo seed completed for business',
  jsonb_build_object('business_id', b.id)
from public.businesses b
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

insert into public.audit_logs (business_id, table_name, operation, new_data)
select
  b.id,
  'businesses',
  'insert',
  jsonb_build_object('name', b.name)
from public.businesses b
where b.id in ('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222')
on conflict do nothing;

commit;