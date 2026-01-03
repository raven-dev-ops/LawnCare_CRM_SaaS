require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const googleMapsKey = process.env.GOOGLE_MAPS_SERVER_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!googleMapsKey) {
  console.error('❌ Missing GOOGLE_MAPS_SERVER_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Sleep function to avoid rate limiting
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address
      };
    } else {
      console.error(`   ⚠️  Geocoding failed: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`   ❌ Error geocoding:`, error.message);
    return null;
  }
}

async function calculateDistance(lat1, lng1, lat2, lng2) {
  // Haversine formula
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

async function geocodeCustomers() {
  console.log('🗺️  Starting customer geocoding...\n');

  // Get all customers without coordinates
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')
    .or('latitude.is.null,longitude.is.null');

  if (error) {
    console.error('❌ Error fetching customers:', error);
    process.exit(1);
  }

  if (!customers || customers.length === 0) {
    console.log('✅ All customers already have coordinates!');
    return;
  }

  console.log(`📍 Found ${customers.length} customers to geocode\n`);

  // Shop location (St. Charles, MO - you can update this)
  const shopLocation = {
    lat: 38.7839,
    lng: -90.4974,
    address: '16 Cherokee Dr, St Peters, MO 63376' // From your CSV
  };

  console.log(`🏠 Shop location: ${shopLocation.address}\n`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    console.log(`[${i + 1}/${customers.length}] ${customer.name}`);
    console.log(`   📍 ${customer.address}`);

    const geo = await geocodeAddress(customer.address);

    if (geo) {
      // Calculate distance from shop
      const distanceMiles = await calculateDistance(
        shopLocation.lat,
        shopLocation.lng,
        geo.latitude,
        geo.longitude
      );

      const distanceKm = distanceMiles * 1.60934;

      // Update customer with coordinates
      const { error: updateError } = await supabase
        .from('customers')
        .update({
          latitude: geo.latitude,
          longitude: geo.longitude,
          distance_from_shop_miles: distanceMiles,
          distance_from_shop_km: distanceKm
        })
        .eq('id', customer.id);

      if (updateError) {
        console.error(`   ❌ Error updating customer:`, updateError);
        failCount++;
      } else {
        console.log(`   ✅ Geocoded: ${geo.latitude.toFixed(6)}, ${geo.longitude.toFixed(6)}`);
        console.log(`   📏 Distance from shop: ${distanceMiles.toFixed(2)} mi\n`);
        successCount++;
      }
    } else {
      console.log(`   ❌ Failed to geocode\n`);
      failCount++;
    }

    // Rate limiting - wait 200ms between requests
    if (i < customers.length - 1) {
      await sleep(200);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully geocoded: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(50));

  if (successCount > 0) {
    console.log('\n🎉 Customers are now ready to view on the map!');
    console.log('   Visit: http://localhost:3000/customers');
    console.log('   Click the "Map" view toggle to see them!\n');
  }
}

geocodeCustomers().catch(console.error);
