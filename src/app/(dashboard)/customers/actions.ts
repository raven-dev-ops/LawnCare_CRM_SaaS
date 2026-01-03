'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getShopLocation } from '@/lib/settings'
import { haversineMilesKm } from '@/lib/geo'
import { geocodeAddress } from '@/lib/geocoding'

interface CreateCustomerInput {
  name: string
  address: string
  type: 'Residential' | 'Commercial' | 'Workshop'
  cost: number
  day: string | null
  has_additional_work: boolean
  additional_work_cost: number | null
}

interface UpdateCustomerInput extends CreateCustomerInput {
  id: string
}


export async function createCustomer(input: CreateCustomerInput) {
  const supabase = await createClient()

  try {
    // Geocode the address
    const geocode = await geocodeAddress(input.address)

    interface CustomerInsert {
      name: string
      address: string
      type: string
      cost: number
      day: string | null
      has_additional_work: boolean
      additional_work_cost: number | null
      latitude?: number
      longitude?: number
      distance_from_shop_miles?: number
      distance_from_shop_km?: number
    }

    const customerData: CustomerInsert = {
      name: input.name,
      address: input.address,
      type: input.type,
      cost: input.cost,
      day: input.day === 'unscheduled' ? null : input.day,
      has_additional_work: input.has_additional_work,
      additional_work_cost: input.additional_work_cost,
    }

    // Add geocoding data if available
    if (geocode) {
      customerData.latitude = geocode.latitude
      customerData.longitude = geocode.longitude

      const shopLocation = await getShopLocation()
      const distance = haversineMilesKm(
        shopLocation.lat,
        shopLocation.lng,
        geocode.latitude,
        geocode.longitude
      )
      customerData.distance_from_shop_miles = distance.miles
      customerData.distance_from_shop_km = distance.km
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to create customer: ' + error.message }
    }

    revalidatePath('/customers')
    return { success: true, customer: data }
  } catch (error) {
    console.error('Create customer error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateCustomer(input: UpdateCustomerInput) {
  const supabase = await createClient()

  try {
    // Get existing customer to check if address changed
    const { data: existing } = await supabase
      .from('customers')
      .select('address')
      .eq('id', input.id)
      .single()

    interface CustomerUpdate {
      name: string
      address: string
      type: string
      cost: number
      day: string | null
      has_additional_work: boolean
      additional_work_cost: number | null
      updated_at: string
      latitude?: number
      longitude?: number
      distance_from_shop_miles?: number
      distance_from_shop_km?: number
    }

    const customerData: CustomerUpdate = {
      name: input.name,
      address: input.address,
      type: input.type,
      cost: input.cost,
      day: input.day === 'unscheduled' ? null : input.day,
      has_additional_work: input.has_additional_work,
      additional_work_cost: input.additional_work_cost,
      updated_at: new Date().toISOString(),
    }

    // Re-geocode if address changed
    if (existing && existing.address !== input.address) {
      const geocode = await geocodeAddress(input.address)

      if (geocode) {
        customerData.latitude = geocode.latitude
        customerData.longitude = geocode.longitude

        const shopLocation = await getShopLocation()
        const distance = haversineMilesKm(
          shopLocation.lat,
          shopLocation.lng,
          geocode.latitude,
          geocode.longitude
        )
        customerData.distance_from_shop_miles = distance.miles
        customerData.distance_from_shop_km = distance.km
      }
    }

    const { data, error } = await supabase
      .from('customers')
      .update(customerData)
      .eq('id', input.id)
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return { error: 'Failed to update customer: ' + error.message }
    }

    revalidatePath('/customers')
    return { success: true, customer: data }
  } catch (error) {
    console.error('Update customer error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteCustomer(customerId: string) {
  const supabase = await createClient()

  try {
    // Check if customer is in any routes
    const { data: routeStops, error: routeCheckError } = await supabase
      .from('route_stops')
      .select('route_id, routes(day_of_week)')
      .eq('customer_id', customerId)

    if (routeCheckError) {
      console.error('Route check error:', routeCheckError)
      return { error: 'Failed to check route dependencies' }
    }

    // Delete route stops first (cascade)
    if (routeStops && routeStops.length > 0) {
      const { error: deleteStopsError } = await supabase
        .from('route_stops')
        .delete()
        .eq('customer_id', customerId)

      if (deleteStopsError) {
        console.error('Delete route stops error:', deleteStopsError)
        return { error: 'Failed to remove customer from routes' }
      }
    }

    // Delete the customer
    const { error: deleteError } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId)

    if (deleteError) {
      console.error('Delete customer error:', deleteError)
      return { error: 'Failed to delete customer: ' + deleteError.message }
    }

    revalidatePath('/customers')
    return {
      success: true,
      removedFromRoutes: routeStops?.length || 0
    }
  } catch (error) {
    console.error('Delete customer error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function checkCustomerRoutes(customerId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('route_stops')
      .select(`
        route_id,
        routes (
          day_of_week,
          date
        )
      `)
      .eq('customer_id', customerId)

    if (error) {
      console.error('Check routes error:', error)
      return { error: 'Failed to check routes' }
    }

    return { success: true, routes: data || [] }
  } catch (error) {
    console.error('Check customer routes error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
