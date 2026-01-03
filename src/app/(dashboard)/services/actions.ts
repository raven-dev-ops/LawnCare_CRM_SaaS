'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/roles'
import { revalidatePath } from 'next/cache'
import type { ProductInsert, ProductUpdate } from '@/types/database.types'

export type ServicePlan = {
  id: string
  frequency: string
  custom_cost: number | null
  start_date: string
  end_date: string | null
  active: boolean
  customer: {
    id: string
    name: string
    address: string
  } | null
}

interface ServiceInput {
  name: string
  description?: string | null
  type: ProductInsert['type']
  unit: ProductInsert['unit']
  base_cost: number
  active: boolean
}

function normalizeDescription(value?: string | null) {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export async function createService(input: ServiceInput) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const supabase = await createClient()

  try {
    const payload: ProductInsert = {
      name: input.name.trim(),
      description: normalizeDescription(input.description),
      type: input.type,
      unit: input.unit,
      base_cost: input.base_cost,
      active: input.active,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('products_services')
      .insert(payload)
      .select()
      .single()

    if (error) {
      console.error('Create service error:', error)
      return { error: 'Failed to create service: ' + error.message }
    }

    revalidatePath('/services')
    return { success: true, service: data }
  } catch (error) {
    console.error('Create service error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function updateService(serviceId: string, input: ServiceInput) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const supabase = await createClient()

  try {
    const payload: ProductUpdate = {
      name: input.name.trim(),
      description: normalizeDescription(input.description),
      type: input.type,
      unit: input.unit,
      base_cost: input.base_cost,
      active: input.active,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('products_services')
      .update(payload)
      .eq('id', serviceId)
      .select()
      .single()

    if (error) {
      console.error('Update service error:', error)
      return { error: 'Failed to update service: ' + error.message }
    }

    revalidatePath('/services')
    return { success: true, service: data }
  } catch (error) {
    console.error('Update service error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function toggleServiceActive(serviceId: string, active: boolean) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('products_services')
      .update({ active, updated_at: new Date().toISOString() })
      .eq('id', serviceId)
      .select()
      .single()

    if (error) {
      console.error('Toggle service error:', error)
      return { error: 'Failed to update service: ' + error.message }
    }

    revalidatePath('/services')
    return { success: true, service: data }
  } catch (error) {
    console.error('Toggle service error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function deleteService(serviceId: string) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const supabase = await createClient()

  try {
    const { count, error: countError } = await supabase
      .from('customer_products')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', serviceId)

    if (countError) {
      console.error('Service plan count error:', countError)
      return { error: 'Failed to check linked plans.' }
    }

    if (count && count > 0) {
      return { error: 'Remove linked recurring plans before deleting this service.' }
    }

    const { error } = await supabase
      .from('products_services')
      .delete()
      .eq('id', serviceId)

    if (error) {
      console.error('Delete service error:', error)
      return { error: 'Failed to delete service: ' + error.message }
    }

    revalidatePath('/services')
    return { success: true }
  } catch (error) {
    console.error('Delete service error:', error)
    return { error: 'An unexpected error occurred' }
  }
}

export async function getServicePlans(serviceId: string) {
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from('customer_products')
      .select(`
        id,
        frequency,
        custom_cost,
        start_date,
        end_date,
        active,
        customer:customers (
          id,
          name,
          address
        )
      `)
      .eq('product_id', serviceId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch service plans error:', error)
      return { error: 'Failed to load linked plans.' }
    }

    return { success: true, plans: (data || []) as ServicePlan[] }
  } catch (error) {
    console.error('Fetch service plans error:', error)
    return { error: 'An unexpected error occurred' }
  }
}
