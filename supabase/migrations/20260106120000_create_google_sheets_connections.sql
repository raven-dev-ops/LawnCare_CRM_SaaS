-- Create google sheets connection table
create table if not exists public.google_sheets_connections (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger update_google_sheets_connections_updated_at
  before update on public.google_sheets_connections
  for each row
  execute function update_updated_at_column();

alter table public.google_sheets_connections enable row level security;

drop policy if exists "Google Sheets: select admin" on public.google_sheets_connections;
drop policy if exists "Google Sheets: insert admin" on public.google_sheets_connections;
drop policy if exists "Google Sheets: update admin" on public.google_sheets_connections;
drop policy if exists "Google Sheets: delete admin" on public.google_sheets_connections;

create policy "Google Sheets: select admin" on public.google_sheets_connections
  for select
  using (public.is_admin(auth.uid()));

create policy "Google Sheets: insert admin" on public.google_sheets_connections
  for insert
  with check (public.is_admin(auth.uid()));

create policy "Google Sheets: update admin" on public.google_sheets_connections
  for update
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

create policy "Google Sheets: delete admin" on public.google_sheets_connections
  for delete
  using (public.is_admin(auth.uid()));
