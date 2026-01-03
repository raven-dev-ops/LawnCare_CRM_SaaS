-- Store inquiry rate limiting counters per IP
create table if not exists public.inquiry_rate_limits (
  ip text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz default now()
);

create trigger update_inquiry_rate_limits_updated_at
  before update on public.inquiry_rate_limits
  for each row
  execute function update_updated_at_column();

alter table public.inquiry_rate_limits enable row level security;

create policy "Enable service role access" on public.inquiry_rate_limits
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
