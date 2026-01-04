-- Enable Supabase Vault for encrypted secrets
create extension if not exists supabase_vault with schema vault;

alter table public.google_sheets_connections
  add column if not exists access_token_secret_id uuid,
  add column if not exists refresh_token_secret_id uuid;

do $$
declare
  existing record;
  access_secret uuid;
  refresh_secret uuid;
begin
  select access_token, refresh_token
    into existing
    from public.google_sheets_connections
    where singleton = true;

  if not found then
    return;
  end if;

  if existing.access_token is not null then
    access_secret := vault.create_secret(
      existing.access_token,
      'google_sheets_access_token',
      'Google Sheets access token'
    );
  end if;

  if existing.refresh_token is not null then
    refresh_secret := vault.create_secret(
      existing.refresh_token,
      'google_sheets_refresh_token',
      'Google Sheets refresh token'
    );
  end if;

  if access_secret is not null or refresh_secret is not null then
    update public.google_sheets_connections
      set access_token_secret_id = access_secret,
          refresh_token_secret_id = refresh_secret
      where singleton = true;
  end if;
end
$$;

alter table public.google_sheets_connections
  drop column if exists access_token,
  drop column if exists refresh_token;

create or replace function public.store_google_sheets_tokens(
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date timestamptz
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_access uuid;
  existing_refresh uuid;
  next_access uuid;
  next_refresh uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin required';
  end if;

  select access_token_secret_id, refresh_token_secret_id
    into existing_access, existing_refresh
    from public.google_sheets_connections
    where singleton = true;

  if access_token is not null then
    if existing_access is null then
      next_access := vault.create_secret(
        access_token,
        'google_sheets_access_token',
        'Google Sheets access token'
      );
    else
      perform vault.update_secret(
        existing_access,
        access_token,
        'google_sheets_access_token',
        'Google Sheets access token'
      );
      next_access := existing_access;
    end if;
  else
    next_access := existing_access;
  end if;

  if refresh_token is not null then
    if existing_refresh is null then
      next_refresh := vault.create_secret(
        refresh_token,
        'google_sheets_refresh_token',
        'Google Sheets refresh token'
      );
    else
      perform vault.update_secret(
        existing_refresh,
        refresh_token,
        'google_sheets_refresh_token',
        'Google Sheets refresh token'
      );
      next_refresh := existing_refresh;
    end if;
  else
    next_refresh := existing_refresh;
  end if;

  insert into public.google_sheets_connections (
    singleton,
    access_token_secret_id,
    refresh_token_secret_id,
    scope,
    token_type,
    expiry_date
  )
  values (
    true,
    next_access,
    next_refresh,
    scope,
    token_type,
    expiry_date
  )
  on conflict (singleton) do update
    set access_token_secret_id = excluded.access_token_secret_id,
        refresh_token_secret_id = excluded.refresh_token_secret_id,
        scope = excluded.scope,
        token_type = excluded.token_type,
        expiry_date = excluded.expiry_date,
        updated_at = now();
end
$$;

create or replace function public.get_google_sheets_tokens()
returns table (
  access_token text,
  refresh_token text,
  scope text,
  token_type text,
  expiry_date timestamptz
)
language plpgsql
security definer
set search_path = public, vault
as $$
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin required';
  end if;

  return query
  select
    (select decrypted_secret from vault.decrypted_secrets where id = g.access_token_secret_id),
    (select decrypted_secret from vault.decrypted_secrets where id = g.refresh_token_secret_id),
    g.scope,
    g.token_type,
    g.expiry_date
  from public.google_sheets_connections g
  where g.singleton = true;
end
$$;

create or replace function public.clear_google_sheets_connection()
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_access uuid;
  existing_refresh uuid;
begin
  if not public.is_admin(auth.uid()) then
    raise exception 'admin required';
  end if;

  select access_token_secret_id, refresh_token_secret_id
    into existing_access, existing_refresh
    from public.google_sheets_connections
    where singleton = true;

  if existing_access is not null then
    delete from vault.secrets where id = existing_access;
  end if;

  if existing_refresh is not null then
    delete from vault.secrets where id = existing_refresh;
  end if;

  delete from public.google_sheets_connections where singleton = true;
end
$$;

grant execute on function public.store_google_sheets_tokens(text, text, text, text, timestamptz) to authenticated, service_role;
grant execute on function public.get_google_sheets_tokens() to authenticated, service_role;
grant execute on function public.clear_google_sheets_connection() to authenticated, service_role;
