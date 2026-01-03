require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleMapsKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseKey || !googleMapsKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Shop location
const SHOP_LOCATION = {
  lat: 38.7839,
  lng: -90.4974,
  address: '16 Cherokee Dr, St Peters, MO 63376'
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function optimizeRoute(customers) {
  if (customers.length === 0) return null;
  if (customers.length === 1) {
    return {
      distance: customers[0].distance_from_shop_miles * 2, // Round trip
      duration: Math.round(customers[0].distance_from_shop_miles * 3), // Rough estimate: 20mph avg
      waypoints: [{ lat: customers[0].latitude, lng: customers[0].longitude }],
      waypointOrder: [0]
    };
  }

  // Build waypoints for Google Directions API
  const waypoints = customers.map(c => ({
    location: { lat: c.latitude, lng: c.longitude },
    stopover: true
  }));

  const origin = `${SHOP_LOCATION.lat},${SHOP_LOCATION.lng}`;
  const destination = origin; // Round trip back to shop

  // For more than 25 waypoints, we need to split (Google limit)
  if (waypoints.length > 23) {
    console.log('   ⚠️  More than 23 waypoints, using simple optimization');
    return simpleOptimization(customers);
  }

  const waypointsParam = waypoints
    .map(wp => `${wp.location.lat},${wp.location.lng}`)
    .join('|');

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&waypoints=optimize:true|${waypointsParam}&key=${googleMapsKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.routes.length > 0) {
      const route = data.routes[0];
      const leg = route.legs[0];

      // Get total distance and duration
      let totalDistance = 0;
      let totalDuration = 0;
      route.legs.forEach(leg => {
        totalDistance += leg.distance.value; // meters
        totalDuration += leg.duration.value; // seconds
      });

      return {
        distance: totalDistance / 1609.34, // Convert to miles
        duration: Math.round(totalDuration / 60), // Convert to minutes
        waypoints: waypoints.map(wp => wp.location),
        waypointOrder: data.routes[0].waypoint_order || []
      };
    } else {
      console.log(`   ⚠️  Directions API error: ${data.status}, using simple optimization`);
      return simpleOptimization(customers);
    }
  } catch (error) {
    console.error(`   ❌ Error calling Directions API:`, error.message);
    return simpleOptimization(customers);
  }
}

function simpleOptimization(customers) {
  // Simple nearest-neighbor algorithm
  const unvisited = [...customers];
  const ordered = [];
  let current = SHOP_LOCATION;

  while (unvisited.length > 0) {
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    unvisited.forEach((customer, index) => {
      const distance = calculateDistance(
        current.lat,
        current.lng,
        customer.latitude,
        customer.longitude
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    const nearest = unvisited.splice(nearestIndex, 1)[0];
    ordered.push(nearest);
    current = { lat: nearest.latitude, lng: nearest.longitude };
  }

  // Calculate total distance
  let totalDistance = 0;
  let prev = SHOP_LOCATION;

  ordered.forEach(customer => {
    totalDistance += calculateDistance(
      prev.lat,
      prev.lng,
      customer.latitude,
      customer.longitude
    );
    prev = { lat: customer.latitude, lng: customer.longitude };
  });

  // Add return to shop
  totalDistance += calculateDistance(
    prev.lat,
    prev.lng,
    SHOP_LOCATION.lat,
    SHOP_LOCATION.lng
  );

  return {
    distance: totalDistance,
    duration: Math.round(totalDistance * 3), // 20mph average
    waypoints: ordered.map(c => ({ lat: c.latitude, lng: c.longitude })),
    waypointOrder: ordered.map((_, i) => i)
  };
}

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function generateRoutes() {
  console.log('🗺️  Starting route generation...\n');

  // Get customers grouped by day
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .not('day', 'is', null)
    .order('day')
    .order('route_order');

  if (error) {
    console.error('❌ Error fetching customers:', error);
    process.exit(1);
  }

  // Group by day
  const customersByDay = customers.reduce((acc, customer) => {
    const day = customer.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(customer);
    return acc;
  }, {});

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let routesCreated = 0;

  for (const day of daysOfWeek) {
    const dayCustomers = customersByDay[day];
    if (!dayCustomers || dayCustomers.length === 0) {
      console.log(`📅 ${day}: No customers, skipping\n`);
      continue;
    }

    console.log(`📅 ${day}: ${dayCustomers.length} customers`);

    // Check if route already exists
    const { data: existingRoute } = await supabase
      .from('routes')
      .select('id')
      .eq('day_of_week', day)
      .eq('status', 'planned')
      .single();

    if (existingRoute) {
      console.log(`   ℹ️  Route already exists, skipping\n`);
      continue;
    }

    // Optimize route
    console.log('   🔄 Optimizing route...');
    const optimization = await optimizeRoute(dayCustomers);

    if (!optimization) {
      console.log('   ❌ Optimization failed\n');
      continue;
    }

    // Calculate revenue
    const totalRevenue = dayCustomers.reduce((sum, c) => {
      return sum + Number(c.cost) + (Number(c.additional_work_cost) || 0);
    }, 0);

    // Estimate fuel cost ($0.15/mile)
    const fuelCost = optimization.distance * 0.15;

    // Create route
    const { data: route, error: routeError } = await supabase
      .from('routes')
      .insert({
        date: new Date().toISOString().split('T')[0], // Today's date
        day_of_week: day,
        status: 'planned',
        total_distance_miles: optimization.distance,
        total_distance_km: optimization.distance * 1.60934,
        total_duration_minutes: optimization.duration,
        estimated_fuel_cost: fuelCost,
        optimized_waypoints: {
          waypoints: optimization.waypoints,
          order: optimization.waypointOrder
        }
      })
      .select()
      .single();

    if (routeError) {
      console.error('   ❌ Error creating route:', routeError);
      continue;
    }

    console.log(`   ✅ Route created (${optimization.distance.toFixed(1)} mi, ${optimization.duration} min)`);

    // Create route stops in optimized order
    const orderedCustomers = optimization.waypointOrder.map(index => dayCustomers[index]);

    for (let i = 0; i < orderedCustomers.length; i++) {
      const customer = orderedCustomers[i];
      const { error: stopError } = await supabase
        .from('route_stops')
        .insert({
          route_id: route.id,
          customer_id: customer.id,
          stop_order: i + 1,
          status: 'pending',
          estimated_duration_minutes: 30 // Default 30 min per stop
        });

      if (stopError) {
        console.error(`   ⚠️  Error creating stop for ${customer.name}:`, stopError);
      }
    }

    console.log(`   📍 Created ${orderedCustomers.length} route stops`);
    console.log(`   💰 Revenue: $${totalRevenue.toFixed(2)} | Fuel: $${fuelCost.toFixed(2)}\n`);

    routesCreated++;

    // Rate limiting
    await sleep(500);
  }

  console.log('='.repeat(50));
  console.log(`✅ Routes created: ${routesCreated}`);
  console.log('='.repeat(50));
  console.log('\n🎉 Routes are ready!');
  console.log('   Visit: http://localhost:3000/routes\n');
}

generateRoutes().catch(console.error);
