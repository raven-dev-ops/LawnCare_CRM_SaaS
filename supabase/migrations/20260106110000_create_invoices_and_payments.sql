-- Create sequence for invoice numbers
create sequence if not exists public.invoice_number_seq;

-- Create invoices table
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  invoice_number integer not null default nextval('public.invoice_number_seq'),
  status text not null default 'draft' check (status in ('draft', 'sent', 'partial', 'paid', 'overdue', 'void')),
  issue_date date not null default current_date,
  due_date date,
  currency text not null default 'USD',
  subtotal numeric(10, 2) not null default 0,
  tax numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  amount_paid numeric(10, 2) not null default 0,
  notes text,
  stripe_invoice_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists invoices_invoice_number_idx on public.invoices(invoice_number);
create index if not exists invoices_customer_id_idx on public.invoices(customer_id);
create index if not exists invoices_status_idx on public.invoices(status);

create trigger update_invoices_updated_at
  before update on public.invoices
  for each row
  execute function update_updated_at_column();

alter table public.invoices enable row level security;

drop policy if exists "Invoices: select authenticated" on public.invoices;
drop policy if exists "Invoices: insert authenticated" on public.invoices;
drop policy if exists "Invoices: update authenticated" on public.invoices;
drop policy if exists "Invoices: delete admin" on public.invoices;

create policy "Invoices: select authenticated" on public.invoices
  for select
  using (auth.role() = 'authenticated');

create policy "Invoices: insert authenticated" on public.invoices
  for insert
  with check (auth.role() = 'authenticated');

create policy "Invoices: update authenticated" on public.invoices
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Invoices: delete admin" on public.invoices
  for delete
  using (public.is_admin(auth.uid()));

-- Create invoice line items table
create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  product_id uuid references public.products_services(id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(10, 2) not null default 0,
  total numeric(10, 2) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists invoice_line_items_invoice_id_idx on public.invoice_line_items(invoice_id);

create trigger update_invoice_line_items_updated_at
  before update on public.invoice_line_items
  for each row
  execute function update_updated_at_column();

alter table public.invoice_line_items enable row level security;

drop policy if exists "Invoice items: select authenticated" on public.invoice_line_items;
drop policy if exists "Invoice items: insert authenticated" on public.invoice_line_items;
drop policy if exists "Invoice items: update authenticated" on public.invoice_line_items;
drop policy if exists "Invoice items: delete admin" on public.invoice_line_items;

create policy "Invoice items: select authenticated" on public.invoice_line_items
  for select
  using (auth.role() = 'authenticated');

create policy "Invoice items: insert authenticated" on public.invoice_line_items
  for insert
  with check (auth.role() = 'authenticated');

create policy "Invoice items: update authenticated" on public.invoice_line_items
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Invoice items: delete admin" on public.invoice_line_items
  for delete
  using (public.is_admin(auth.uid()));

-- Create payments table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  method text not null default 'manual' check (method in ('cash', 'check', 'card', 'bank_transfer', 'stripe', 'manual', 'other')),
  status text not null default 'succeeded' check (status in ('pending', 'succeeded', 'failed', 'refunded')),
  paid_at timestamptz default now(),
  reference text,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists payments_invoice_id_idx on public.payments(invoice_id);
create index if not exists payments_status_idx on public.payments(status);

create trigger update_payments_updated_at
  before update on public.payments
  for each row
  execute function update_updated_at_column();

alter table public.payments enable row level security;

drop policy if exists "Payments: select authenticated" on public.payments;
drop policy if exists "Payments: insert authenticated" on public.payments;
drop policy if exists "Payments: update authenticated" on public.payments;
drop policy if exists "Payments: delete admin" on public.payments;

create policy "Payments: select authenticated" on public.payments
  for select
  using (auth.role() = 'authenticated');

create policy "Payments: insert authenticated" on public.payments
  for insert
  with check (auth.role() = 'authenticated');

create policy "Payments: update authenticated" on public.payments
  for update
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Payments: delete admin" on public.payments
  for delete
  using (public.is_admin(auth.uid()));
