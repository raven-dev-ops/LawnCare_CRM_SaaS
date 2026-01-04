# Features Showcase

## Customer Management

### Table View
- Header with stats and primary actions
- Real-time search and filters (day, type)
- Table and map toggle
- Data columns: customer, address, type, day, cost, distance
- Color-coded badges for customer types and service days
- Row actions menu (edit, map, call, email, delete)

### Map View
- Google Maps with clustered markers
- Marker colors by customer type
- Info windows with address, badges, cost, and distance
- Legend with counts and filters

## Routing and Scheduling
- Routes and route stops grouped by day
- Route optimization via Google Directions (up to 23 stops)
- Chunked optimization fallback for larger routes
- Schedule and service history views

## Inquiries and Lead Capture
- Public inquiry form
- Optional reCAPTCHA validation
- Rate limiting (service role required)
- Optional notifications via email/SMS

## Invoices and Payments
- Invoice detail view with line items
- Stripe checkout session creation
- Webhook to record payments and update invoice status
- Manual payment entry when needed

## Analytics
- Dashboard metrics and quick views
- Revenue and operational summaries from database views

## Navigation
- Sidebar navigation with active route styling
- Logo branding and user profile area

## Design System

### Colors
- Primary: Emerald-500 (#10b981)
- Background: Slate-50
- Sidebar: Slate-900 to Slate-800 gradient
- Cards: White with subtle shadows
- Borders: Slate-200/300

### Typography
- Headings: Bold with tight tracking
- Body: Geist
- Monospace: Geist Mono

### Components
- Rounded corners and gradient stat cards
- Hover states and transitions on interactive elements
- shadcn/ui + Radix UI primitives

## Responsive Behavior
- Desktop: full sidebar, 4-column stats grid
- Tablet: collapsible sidebar, 2-column stats grid
- Mobile: stacked cards and full-width map

## Accessibility
- Semantic HTML and ARIA labels
- Keyboard navigation and visible focus states
- Color contrast targets WCAG AA

## Performance
- Server-side data fetching
- Client-side filtering (no re-fetch)
- Lazy loading for map components
- Turbopack for dev builds

## Future Enhancements
- Drag-and-drop route ordering
- Bulk selection in table
- Export to PDF
- Dark mode support
- Customer photos
- Toast and empty state improvements
- Onboarding tour

## Route Optimization Notes
- Routes use Google Directions optimization for up to 23 stops per request.
- Larger routes are optimized in chunks with a nearest-neighbor fallback.
- Chunked routes trade optimality for reliability; distance/time values are approximations when Directions data is unavailable.