-- Migration: 20260722_012_business_profiles
-- Description: Business profile for data-driven branding and settings

create table if not exists public.business_profiles (
  id uuid primary key default uuid_generate_v4(),
  business_name text not null,
  tagline text,
  logo_url text,
  currency_code text not null default 'KES',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

create policy "Allow authenticated users to read business_profiles"
  on public.business_profiles
  for select
  using (true);

create policy "Allow admin to manage business_profiles"
  on public.business_profiles
  for all
  using (auth.jwt() -> 'role' = '"admin"'::jsonb)
  with check (auth.jwt() -> 'role' = '"admin"'::jsonb);

insert into public.business_profiles (business_name, tagline, currency_code)
select 'WaterFlow Utility Services', 'Reliable water operations for every community', 'KES'
where not exists (select 1 from public.business_profiles);

comment on table public.business_profiles is 'Top-level business branding and operational preferences';
