-- Migration: 20260721_011_device_secret_hash
-- Description: Add per-machine device secret hash for authentication

alter table public.machines
add column if not exists device_secret_hash text unique,
add column if not exists device_provisioned_at timestamptz,
add column if not exists device_provisioned_by uuid;

-- Create index for faster lookups
create index if not exists idx_machines_device_secret_hash on public.machines (device_secret_hash);

comment on column public.machines.device_secret_hash is 'Bcrypt hash of the per-machine device secret; used to authenticate ingest-reading requests';
comment on column public.machines.device_provisioned_at is 'Timestamp when machine was registered via the Connect Machine flow';
comment on column public.machines.device_provisioned_by is 'Staff member (user id) who provisioned this machine';
