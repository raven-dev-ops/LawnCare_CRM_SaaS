# Development Guide

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- Google Maps API key

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**

   The `.env` file contains your Supabase credentials. Add your Google Maps API key:
   ```env
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

   To get a Google Maps API key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable these APIs:
     - Maps JavaScript API
     - Directions API
     - Distance Matrix API
     - Places API
     - Geocoding API
   - Create credentials → API Key
   - Copy the key to your `.env` file

3. **Run database migrations**

   Push migrations to Supabase (the CLI no longer supports global npm installs, so run it through `npx` or install via another package manager per the [Supabase docs](https://github.com/supabase/cli#install-the-cli)):
   ```bash
   # Verify CLI availability
   npx supabase --version

   # Link to your project
   npx supabase link --project-ref saxtqposxmdxbcmpc

   # Push migrations
   npx supabase db push
   ```

4. **Seed the database** (optional)

   Seeds customers plus demo weekly routes/stops so the Dashboard and Routes pages show live data. Re-running the script clears existing customers/routes first.
   ```bash
   npm run seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/        # Dashboard layout group
│   │   ├── page.tsx        # Dashboard home
│   │   ├── customers/      # Customer management
│   │   └── layout.tsx      # Shared dashboard layout
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   ├── customers/          # Customer-specific components
│   │   ├── CustomersView.tsx    # Main view with filters
│   │   ├── CustomersTable.tsx   # Table view
│   │   └── CustomersMap.tsx     # Interactive map
│   ├── layout/             # Layout components
│   │   └── Sidebar.tsx     # Navigation sidebar
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── supabase/           # Supabase client utilities
│   │   ├── client.ts       # Browser client
│   │   ├── server.ts       # Server client
│   │   └── middleware.ts   # Auth middleware
│   └── utils.ts            # Utility functions
└── types/
    └── database.types.ts   # TypeScript types from DB
```

## Features Implemented

### ✅ Phase 1 Complete

**Foundation**
- Next.js 15 with App Router
- TypeScript configured
- Tailwind CSS v4
- Supabase integration (client, server, middleware)
- shadcn/ui component library

**Database**
- Complete schema with 7 tables
- Row Level Security (RLS) policies
- Database views for analytics
- Helper functions for routing
- Full TypeScript types

**Customer Management**
- 🎨 Modern, clean UI with gradient accents
- 📊 Table view with sorting and filtering
- 🗺️ Interactive Google Maps view
- 🔍 Real-time search
- 🏷️ Filter by day, type
- 📈 Live statistics (total customers, revenue, etc.)
- 🎯 Color-coded badges for days and types
- 💫 Smooth view transitions
- 📱 Responsive design

**Navigation**
- Sidebar with route highlighting
- Dashboard layout
- Icon-based navigation

## Key Technologies

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Maps**: @vis.gl/react-google-maps
- **Icons**: Lucide React

## Environment Variables

```env
# Supabase
SUPABASE_URL=                    # Your Supabase project URL
SUPABASE_SERVICE_ROLE_KEY=       # Service role key (server-side only)
SUPABASE_ANON_KEY=               # Anonymous key
NEXT_PUBLIC_SUPABASE_URL=        # Public URL for client
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anon key for client

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY= # Google Maps JavaScript API key

# reCAPTCHA (optional - for inquiry form)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
```

## Available Scripts

```bash
npm run dev          # Start development server (Turbopack)
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run seed         # Seed database from CSV
```

## Database Migrations

Migrations are in `supabase/migrations/`:
- `20251007200401` - Customers table
- `20251007200402` - Products & services catalog
- `20251007200403` - Customer products (recurring)
- `20251007200404` - Routes
- `20251007200405` - Route stops
- `20251007200406` - Service history
- `20251007200407` - Inquiries (lead capture)
- `20251007200408` - Views & helper functions

## Row Level Security (RLS)

Intended access model:
- `anon`: insert-only on `inquiries` via the public form.
- `authenticated`: full read/write access to CRM tables (customers, routes, route_stops, service_history, inquiries, products/services).
- `service_role`: server-only; bypasses RLS for admin/background workflows.

### RLS Regression Checklist

Using the anon key, confirm these reads are denied:
- `select` from `customers`
- `select` from `routes`
- `select` from `route_stops`
- `select` from `service_history`
- `select` from `inquiries`

## Next Steps

### Immediate (Phase 2)
- [ ] Customer detail page
- [ ] Add/Edit customer form with address autocomplete
- [ ] Route planning interface
- [ ] Weekly schedule view

### Future Features
- [ ] Service history tracking
- [ ] Before/after photos
- [ ] Customer portal
- [ ] Invoice generation
- [ ] SMS/Email notifications
- [ ] Weather integration
- [ ] Real-time driver tracking
- [ ] Analytics dashboard

## Troubleshooting

**Map not showing?**
- Check that `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set in `.env`
- Verify Maps JavaScript API is enabled in Google Cloud Console
- Ensure API key has no restrictions or allows localhost

**Customers not loading?**
- Check Supabase connection in `.env`
- Verify migrations have been run
- Check that customers table has data (run seed script)

**Build errors?**
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npx tsc --noEmit`

## Contributing

This is a client project. For questions or issues, contact the development team.
