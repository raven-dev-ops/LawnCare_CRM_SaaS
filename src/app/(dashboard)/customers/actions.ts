'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import { getShopLocation } from '@/lib/settings'
import { haversineMilesKm } from '@/lib/geo'
import { geocodeAddress } from '@/lib/geocoding'
import { z } from 'zod'

interface CreateCustomerInput {
  name: string
  address: string
  phone?: string | null
  email?: string | null
  type: 'Residential' | 'Commercial' | 'Workshop'
  cost: number
  day: string | null
  has_additional_work: boolean
  additional_work_cost: number | null
}

interface UpdateCustomerInput extends CreateCustomerInput {
  id: string
}


const ImportRowSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().email().max(200).nullable().optional(),
  type: z.enum(['Residential', 'Commercial', 'Workshop']).optional(),
  cost: z.number().nonnegative().optional(),
  day: z
    .enum([
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
      'Workshop',
    ])
    .nullable()
    .optional(),
  route_order: z.number().int().nullable().optional(),
  distance_from_shop_km: z.number().nullable().optional(),
  distance_from_shop_miles: z.number().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  has_additional_work: z.boolean().optional(),
  additional_work_cost: z.number().nullable().optional(),
})

function normalizeCustomerKey(name: string, address: string) {
  return `${name}`.toLowerCase().replace(/\s+/g, '') + '|' + `${address}`.toLowerCase().replace(/\s+/g, '')
}


export async function createCustomer(input: CreateCustomerInput) {
  const supabase = await createClient()

  try {
    let geocodeFailed = false
    const geocode = await geocodeAddress(input.address)

    if (!geocode) {
      geocodeFailed = true
    }

    interface CustomerInsert {
      name: string
      address: string
      type: string
      phone?: string | null
      email?: string | null
      cost: number
      day: string | null
      has_additional_work: boolean
      additional_work_cost: number | null
      latitude?: number
      longitude?: number
      distance_from_shop_miles?: number
      distance_from_shop_km?: number
    }

    const normalizedPhone = input.phone?.trim() || null
    const normalizedEmail = input.email?.trim().toLowerCase() || null

    const customerData: CustomerInsert = {
      name: input.name,
      address: input.address,
      phone: normalizedPhone,
      email: normalizedEmail,
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
    return { success: true, customer: data, geocodeFailed }
  } catch (error) {
    console.error('Create customer error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateCustomer(input: UpdateCustomerInput) {
  const supabase = await createClient()

  try {
    let geocodeFailed = false
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
      phone?: string | null
      email?: string | null
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

    const normalizedPhone = input.phone?.trim() || null
    const normalizedEmail = input.email?.trim().toLowerCase() || null

    const customerData: CustomerUpdate = {
      name: input.name,
      address: input.address,
      phone: normalizedPhone,
      email: normalizedEmail,
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
      } else {
        geocodeFailed = true
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
    return { success: true, customer: data, geocodeFailed }
  } catch (error) {
    console.error('Update customer error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteCustomer(customerId: string) {
  const supabase = await createClient()

  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

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

export async function importCustomers(input: {
  rows: Array<z.infer<typeof ImportRowSchema>>
  skipDuplicates?: boolean
  dryRun?: boolean
}) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const supabase = await createClient()
  const rows = input.rows || []
  const skipDuplicates = input.skipDuplicates ?? true
  const dryRun = input.dryRun ?? false

  if (rows.length === 0) {
    return { error: 'No rows provided for import.' }
  }

  const parsedRows: Array<z.infer<typeof ImportRowSchema>> = []
  const rowErrors: Array<{ index: number; message: string }> = []

  rows.forEach((row, index) => {
    const parsed = ImportRowSchema.safeParse(row)
    if (!parsed.success) {
      rowErrors.push({ index: index + 1, message: 'Invalid row data.' })
      return
    }
    parsedRows.push(parsed.data)
  })

  const { data: existingCustomers, error: existingError } = await supabase
    .from('customers')
    .select('name, address')

  if (existingError) {
    console.error('Existing customer lookup failed:', existingError)
    return { error: 'Failed to check duplicates.' }
  }

  const existingKeys = new Set(
    (existingCustomers || [])
      .filter((customer) => customer.name && customer.address)
      .map((customer) => normalizeCustomerKey(customer.name, customer.address))
  )
  const seenKeys = new Set<string>()
  let duplicateCount = 0

  const insertRows = parsedRows
    .filter((row) => {
      const key = normalizeCustomerKey(row.name, row.address)
      const isDuplicate = existingKeys.has(key) || seenKeys.has(key)
      seenKeys.add(key)
      if (isDuplicate) {
        duplicateCount += 1
        return !skipDuplicates
      }
      return true
    })
    .map((row) => {
      const hasAdditional = row.has_additional_work ?? false
      return {
        name: row.name.trim(),
        address: row.address.trim(),
        phone: row.phone?.trim() || null,
        email: row.email?.trim().toLowerCase() || null,
        type: row.type ?? 'Residential',
        cost: typeof row.cost === 'number' ? row.cost : 0,
        day: row.day ?? null,
        route_order: row.route_order ?? null,
        distance_from_shop_km: row.distance_from_shop_km ?? null,
        distance_from_shop_miles: row.distance_from_shop_miles ?? null,
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        has_additional_work: hasAdditional,
        additional_work_cost: hasAdditional ? row.additional_work_cost ?? 0 : null,
      }
    })

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      validCount: parsedRows.length,
      duplicateCount,
      errorCount: rowErrors.length,
      totalCount: rows.length,
    }
  }

  if (insertRows.length === 0) {
    return {
      success: true,
      importedCount: 0,
      duplicateCount,
      errorCount: rowErrors.length,
      totalCount: rows.length,
    }
  }

  const { error } = await supabase.from('customers').insert(insertRows)

  if (error) {
    console.error('Import failed:', error)
    return { error: 'Failed to import customers.' }
  }

  revalidatePath('/customers')

  return {
    success: true,
    importedCount: insertRows.length,
    duplicateCount,
    errorCount: rowErrors.length,
    totalCount: rows.length,
  }
}
