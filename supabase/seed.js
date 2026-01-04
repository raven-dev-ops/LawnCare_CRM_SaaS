require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const DAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
}

const SAMPLE_CUSTOMERS = [
  {
    name: 'Green Valley HOA',
    address: '123 Meadow Ln, St Peters, MO',
    type: 'Commercial',
    cost: 250,
    day: 'Monday',
    route_order: 1,
    distance_from_shop_km: 3.4,
    distance_from_shop_miles: 2.1,
    has_additional_work: true,
    additional_work_cost: 45,
  },
  {
    name: 'Maple Ridge Apartments',
    address: '9800 Maple Ridge Dr, St Peters, MO',
    type: 'Commercial',
    cost: 320,
    day: 'Monday',
    route_order: 2,
    distance_from_shop_km: 5.6,
    distance_from_shop_miles: 3.5,
    has_additional_work: false,
    additional_work_cost: null,
  },
  {
    name: 'Jordan Residence',
    address: '42 Brookfield Ct, St Peters, MO',
    type: 'Residential',
    cost: 55,
    day: 'Tuesday',
    route_order: 1,
    distance_from_shop_km: 1.9,
    distance_from_shop_miles: 1.2,
    has_additional_work: false,
    additional_work_cost: null,
  },
  {
    name: 'Woodside Plaza',
    address: '2100 Woodside Blvd, St Peters, MO',
    type: 'Commercial',
    cost: 410,
    day: 'Tuesday',
    route_order: 2,
    distance_from_shop_km: 6.4,
    distance_from_shop_miles: 4.0,
    has_additional_work: true,
    additional_work_cost: 80,
  },
  {
    name: 'Stonebrook Estates',
    address: '17 Stonebrook Way, St Peters, MO',
    type: 'Residential',
    cost: 75,
    day: 'Wednesday',
    route_order: 1,
    distance_from_shop_km: 8.4,
    distance_from_shop_miles: 5.2,
    has_additional_work: false,
    additional_work_cost: null,
  },
  {
    name: 'Oak Creek Bakery',
    address: '88 Oak St, St Peters, MO',
    type: 'Commercial',
    cost: 180,
    day: 'Wednesday',
    route_order: 2,
    distance_from_shop_km: 4.1,
    distance_from_shop_miles: 2.6,
    has_additional_work: false,
    additional_work_cost: null,
  },
  {
    name: 'Riverbend Residence',
    address: '17 Riverbend Rd, St Peters, MO',
    type: 'Residential',
    cost: 65,
    day: null,
    route_order: null,
    distance_from_shop_km: 1.6,
    distance_from_shop_miles: 1.0,
    has_additional_work: false,
    additional_work_cost: null,
  },
]

function getSeedCustomers() {
  return SAMPLE_CUSTOMERS
}

function getUpcomingDate(dayName) {
  const today = new Date()
  const todayIndex = today.getDay()
  const targetIndex = DAY_INDEX[dayName] ?? todayIndex
  const diff = (targetIndex - todayIndex + 7) % 7
  const target = new Date(today)
  target.setDate(today.getDate() + diff)
  return target.toISOString().split('T')[0]
}

function sortForRoute(customers) {
  return [...customers].sort((a, b) => {
    const orderA = a.route_order ?? Number.MAX_SAFE_INTEGER
    const orderB = b.route_order ?? Number.MAX_SAFE_INTEGER
    if (orderA !== orderB) return orderA - orderB
    return a.name.localeCompare(b.name)
  })
}

async function resetTables(supabase) {
  console.log('Clearing existing routes and customers...')

  const tables = ['route_stops', 'routes', 'customers']
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      console.error(`Failed to clear ${table}:`, error)
      process.exit(1)
    }
  }
}

async function insertCustomers(supabase, customers) {
  console.log(`Seeding ${customers.length} customers...`)
  const { data, error } = await supabase
    .from('customers')
    .insert(customers)
    .select()

  if (error) {
    console.error('Error seeding customers:', error)
    process.exit(1)
  }

  console.log('Customers inserted.')
  return data
}

async function insertRoutes(supabase, customers) {
  const grouped = customers.reduce((acc, customer) => {
    if (!customer.day) {
      return acc
    }
    if (!acc[customer.day]) {
      acc[customer.day] = []
    }
    acc[customer.day].push(customer)
    return acc
  }, {})

  const orderedDays = Object.keys(grouped).sort(
    (a, b) => (DAY_INDEX[a] ?? 7) - (DAY_INDEX[b] ?? 7)
  )

  let routesCreated = 0
  for (const day of orderedDays) {
    const dayCustomers = sortForRoute(grouped[day])
    if (dayCustomers.length === 0) continue

    const distance = dayCustomers.reduce(
      (sum, customer) => sum + (customer.distance_from_shop_miles || 0),
      0
    )
    const duration = dayCustomers.length * 30 + Math.round(distance * 3)
    const fuelCost = Number((distance * 0.15).toFixed(2))
    const date = getUpcomingDate(day)

    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert({
        date,
        day_of_week: day,
        status: 'planned',
        total_distance_miles: Number(distance.toFixed(1)),
        total_distance_km: Number((distance * 1.60934).toFixed(1)),
        total_duration_minutes: duration,
        estimated_fuel_cost: fuelCost,
      })
      .select()
      .single()

    if (routeError || !route) {
      console.error(`Error creating ${day} route:`, routeError)
      process.exit(1)
    }

    const stopsPayload = dayCustomers.map((customer, index) => ({
      route_id: route.id,
      customer_id: customer.id,
      stop_order: customer.route_order ?? index + 1,
      status: 'pending',
      estimated_duration_minutes: 30,
    }))

    const { error: stopsError } = await supabase
      .from('route_stops')
      .insert(stopsPayload)

    if (stopsError) {
      console.error(`Error creating route stops for ${day}:`, stopsError)
      process.exit(1)
    }

    routesCreated += 1
    console.log(
      `- ${day}: ${dayCustomers.length} stops | ${distance.toFixed(
        1
      )} mi | $${fuelCost.toFixed(2)} fuel`
    )
  }

  if (routesCreated === 0) {
    console.warn('No routes created. Do your customers have a day assigned?')
  } else {
    console.log(`Routes created: ${routesCreated}`)
  }
}

async function seedDatabase() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    console.error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables'
    )
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const customers = getSeedCustomers()

  if (customers.length === 0) {
    console.error('No seed customers available.')
    process.exit(1)
  }

  await resetTables(supabase)
  const inserted = await insertCustomers(supabase, customers)
  await insertRoutes(supabase, inserted)

  console.log('\nSeed complete!')
}

seedDatabase().catch((error) => {
  console.error('Unexpected error while seeding:', error)
  process.exit(1)
})
