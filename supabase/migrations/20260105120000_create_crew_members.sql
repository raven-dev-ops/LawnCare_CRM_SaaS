-- Create crew members table
create table if not exists public.crew_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  role text not null default 'crew',
  active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create trigger update_crew_members_updated_at
  before update on public.crew_members
  for each row
  execute function update_updated_at_column();

alter table public.crew_members enable row level security;

drop policy if exists "Crew: select authenticated" on public.crew_members;
drop policy if exists "Crew: insert authenticated" on public.crew_members;
drop policy if exists "Crew: update authenticated" on public.crew_members;
drop policy if exists "Crew: delete admin" on public.crew_members;

create policy "Crew: select authenticated" on public.crew_members
  for select
  using (auth.role() = 'authenticated');

create policy "Crew: insert authenticated" on public.crew_members
  for insert
  with check (auth.role() = 'authenticated');

create policy "Crew: update authenticated" on public.crew_members
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Crew: delete admin" on public.crew_members
  for delete
  using (public.is_admin(auth.uid()));

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'routes_driver_id_fkey'
  ) then
    alter table public.routes
      add constraint routes_driver_id_fkey
      foreign key (driver_id)
      references public.crew_members(id)
      on delete set null;
  end if;
end $$;
