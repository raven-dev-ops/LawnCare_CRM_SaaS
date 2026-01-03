-- Data integrity constraints and indexes

alter table public.customers
  add constraint customers_cost_nonnegative check (cost >= 0),
  add constraint customers_additional_work_cost_nonnegative check (additional_work_cost is null or additional_work_cost >= 0),
  add constraint customers_distance_km_nonnegative check (distance_from_shop_km is null or distance_from_shop_km >= 0),
  add constraint customers_distance_miles_nonnegative check (distance_from_shop_miles is null or distance_from_shop_miles >= 0),
  add constraint customers_route_order_nonnegative check (route_order is null or route_order >= 0);

create unique index if not exists customers_email_unique
  on public.customers (lower(email))
  where email is not null;

alter table public.routes
  add constraint routes_total_distance_km_nonnegative check (total_distance_km is null or total_distance_km >= 0),
  add constraint routes_total_distance_miles_nonnegative check (total_distance_miles is null or total_distance_miles >= 0),
  add constraint routes_total_duration_minutes_nonnegative check (total_duration_minutes is null or total_duration_minutes >= 0),
  add constraint routes_estimated_fuel_cost_nonnegative check (estimated_fuel_cost is null or estimated_fuel_cost >= 0),
  add constraint routes_average_duration_minutes_nonnegative check (average_duration_minutes is null or average_duration_minutes >= 0);

alter table public.route_stops
  add constraint route_stops_stop_order_positive check (stop_order >= 1),
  add constraint route_stops_estimated_duration_nonnegative check (estimated_duration_minutes is null or estimated_duration_minutes >= 0),
  add constraint route_stops_actual_duration_nonnegative check (actual_duration_minutes is null or actual_duration_minutes >= 0);

alter table public.service_history
  add constraint service_history_cost_nonnegative check (cost >= 0),
  add constraint service_history_duration_nonnegative check (duration_minutes is null or duration_minutes >= 0);

alter table public.products_services
  add constraint products_services_base_cost_nonnegative check (base_cost >= 0);

alter table public.customer_products
  add constraint customer_products_custom_cost_nonnegative check (custom_cost is null or custom_cost >= 0),
  add constraint customer_products_date_order check (end_date is null or end_date >= start_date);

alter table public.route_times
  add constraint route_times_duration_nonnegative check (duration_minutes >= 0);

alter table public.inquiries
  add constraint inquiries_quote_amount_nonnegative check (quote_amount is null or quote_amount >= 0);
