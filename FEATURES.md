# Features Showcase

## CRM Core
- Customer management with table and map views
- Filters, search, and CSV import/export
- Google Sheets integration for import/export
- Customer geocoding and distance metrics
- Customer notes and communication log

## Routing and Scheduling
- Routes and route stops grouped by day
- Route optimization via Google Directions (up to 23 stops)
- Nearest-neighbor fallback when Directions is unavailable
- Schedule, crew, and service history views

## Public Inquiries
- Public inquiry form at `/inquiry`
- Optional reCAPTCHA validation and spam scoring
- Rate limiting (service role required)
- Optional notifications via email or SMS

## Invoices and Payments
- Invoice detail view with line items
- Stripe checkout session creation
- Webhook to record payments and update invoice status
- Manual payment entry support

## Analytics and Settings
- Dashboard metrics and quick views
- Business profile and notification settings
- Role-based access with admin-only imports
- Admin audit logs for key changes
- CSV exports for KPIs, routes, and service history

## UI and Design
- Responsive layout with sidebar navigation
- shadcn/ui + Radix UI components
- Tailwind CSS styling with consistent badges and cards

## Scripts and Utilities
- Geocode customers for map accuracy
- Generate demo routes for seeded data
- Reoptimize routes with Google Directions

## Route Optimization Notes
- Routes use Google Directions optimization for up to 23 stops per request.
- Larger routes are optimized in chunks with a nearest-neighbor fallback.
- Chunked routes trade optimality for reliability; distance/time values are approximations when Directions data is unavailable.
