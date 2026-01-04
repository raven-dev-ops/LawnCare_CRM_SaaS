'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ServiceHistory } from '@/types/database.types'

interface ServiceHistoryInput {
  customerId: string
  serviceDate: string
  serviceType: string
  cost?: number | null
  durationMinutes?: number | null
  notes?: string | null
  customerRating?: number | null
  routeStopId?: string | null
  photos?: string[] | null
}

interface ServiceHistoryUpdateInput {
  id: string
  customerId: string
  serviceDate: string
  serviceType: string
  cost?: number | null
  durationMinutes?: number | null
  notes?: string | null
  customerRating?: number | null
  photos?: string[] | null
}

export async function createServiceHistory(input: ServiceHistoryInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_history')
    .insert({
      customer_id: input.customerId,
      route_stop_id: input.routeStopId || null,
      service_date: input.serviceDate,
      service_type: input.serviceType,
      cost: input.cost ?? 0,
      duration_minutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      customer_rating: input.customerRating ?? null,
      photos: input.photos ?? null,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating service history:', error)
    return { error: 'Failed to create service history.' }
  }

  revalidatePath(`/customers/${input.customerId}`)

  return { success: true, entry: data as ServiceHistory }
}

export async function updateServiceHistory(input: ServiceHistoryUpdateInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('service_history')
    .update({
      service_date: input.serviceDate,
      service_type: input.serviceType,
      cost: input.cost ?? 0,
      duration_minutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      customer_rating: input.customerRating ?? null,
      photos: input.photos ?? null,
    })
    .eq('id', input.id)
    .select()
    .single()

  if (error || !data) {
    console.error('Error updating service history:', error)
    return { error: 'Failed to update service history.' }
  }

  revalidatePath(`/customers/${input.customerId}`)

  return { success: true, entry: data as ServiceHistory }
}

export async function deleteServiceHistory(id: string, customerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('service_history')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting service history:', error)
    return { error: 'Failed to delete service history.' }
  }

  revalidatePath(`/customers/${customerId}`)

  return { success: true }
}
