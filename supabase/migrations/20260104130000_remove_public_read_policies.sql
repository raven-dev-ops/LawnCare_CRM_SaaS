-- Remove overly broad service role policies that inadvertently exposed data to anon users.
drop policy if exists "Enable read access for service role" on public.customers;
drop policy if exists "Enable read access for service role" on public.products_services;
drop policy if exists "Enable read access for service role" on public.customer_products;
drop policy if exists "Enable read access for service role" on public.routes;
drop policy if exists "Enable read access for service role" on public.route_stops;
drop policy if exists "Enable read access for service role" on public.service_history;
drop policy if exists "Enable read access for service role" on public.inquiries;
