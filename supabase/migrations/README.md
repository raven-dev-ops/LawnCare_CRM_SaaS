# Database Migrations

This directory contains all database migrations for the Lawn Care CRM system.

## Migration Files

### 20251007200401_create_lawn_care_schema.sql
**Initial schema** - Creates the `customers` table with:
- Customer information (name, address, type)
- Cost and service details
- Day routing and route ordering
- Distance tracking (km and miles)
- Additional work flags
- RLS policies for security
- Indexes for performance

### 20251007200402_create_products_and_services.sql
**Service catalog** - Creates the `products_services` table for:
- Service types (mowing, trimming, fertilizing, etc.)
- Pricing models (per sqft, per hour, flat, per acre)
- Service descriptions
- Active/inactive status

### 20251007200403_create_customer_products.sql
**Recurring services** - Creates the `customer_products` table for:
- Linking customers to specific services
- Service frequency (weekly, bi-weekly, monthly, etc.)
- Custom pricing per customer
- Auto-renewal tracking
- Next service date calculations

### 20260108120000_create_customer_notes.sql
**Customer notes** - Creates the `customer_notes` table for:
- CRM communication log entries
- Channel tagging (call, email, sms, in-person)
- Admin/staff visibility with RLS policies

### 20260108123000_create_audit_logs.sql
**Audit logs** - Creates the `audit_logs` table for:
- Change tracking with before/after JSON
- Actor attribution
- Admin-only read access via RLS

### 20251007200404_create_routes.sql
**Daily routes** - Creates the `routes` table for:
- Planned daily service routes
- Driver assignments
- Route timing (start/end times)
- Distance and duration tracking
- Fuel cost estimates
- Google Maps optimized waypoints (JSONB)
- Route status tracking

### 20251007200405_create_route_stops.sql
**Route stops** - Creates the `route_stops` table (junction table) for:
- Linking routes to customers
- Stop ordering and sequencing
- Scheduled vs actual arrival/departure times
- Service duration tracking
- Skip reasons and notes
- Stop status tracking

### 20251007200406_create_service_history.sql
**Service records** - Creates the `service_history` table for:
- Completed service records
- Cost and duration tracking
- Weather conditions at time of service
- Before/after photos
- Customer ratings and feedback
- Employee tracking

### 20251007200407_create_inquiries.sql
**Lead capture** - Creates the `inquiries` table for:
- Public form submissions
- Contact information
- Property details and service interests
- Lead status tracking (pending → contacted → quoted → converted)
- Conversion tracking to customers
- Public insert policy (no auth required)

### 20251007200408_create_views_and_helpers.sql
**Database utilities** - Creates:
- **Views**:
  - `customer_metrics`: Aggregated customer analytics (LTV, service count, ratings)
  - `route_statistics`: Route performance metrics
- **Functions**:
  - `calculate_distance_miles()`: Haversine formula for distance calculation
  - `get_customers_by_day()`: Get customers by scheduled day
  - `update_route_orders()`: Batch update route ordering
- **Enhancements**:
  - Adds `latitude` and `longitude` columns to customers table

## Running Migrations

### Against Supabase Cloud (Production)
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your Supabase project
supabase link --project-ref <project-ref>

# Push migrations to production
supabase db push
```

### Against Local Supabase (Development)
```bash
# Start local Supabase
supabase start

# Reset and run all migrations
supabase db reset

# Or push new migrations only
supabase db push
```

## Migration Order

Migrations run in alphabetical/timestamp order:
1. Customers table (base table)
2. Products/Services (independent table)
3. Customer Products (depends on customers + products)
4. Routes (independent table)
5. Route Stops (depends on routes + customers)
6. Service History (depends on customers, route_stops, products)
7. Inquiries (independent table)
8. Views and Helper Functions (depends on all tables)

## Row Level Security (RLS)

All tables have RLS enabled with policies:
- **Authenticated users**: Full CRUD access
- **Service role**: Read-only access
- **Inquiries table**: Public insert allowed (for form submissions)

## Indexes

Performance indexes created on:
- Foreign key columns
- Frequently queried columns (status, date, day)
- Geospatial columns (latitude, longitude)

## Triggers

Auto-update triggers on all tables for `updated_at` timestamp using the `update_updated_at_column()` function.
