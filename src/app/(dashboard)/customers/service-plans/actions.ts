'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CustomerProductInsert, CustomerProductUpdate } from '@/types/database.types'

const DAY_MS = 24 * 60 * 60 * 1000

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addMonths(date: Date, months: number) {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function advanceDate(date: Date, frequency: string) {
  switch (frequency) {
    case 'weekly':
      return new Date(date.getTime() + 7 * DAY_MS)
    case 'bi-weekly':
      return new Date(date.getTime() + 14 * DAY_MS)
    case 'monthly':
      return addMonths(date, 1)
    case 'quarterly':
      return addMonths(date, 3)
    case 'seasonal':
      return addMonths(date, 3)
    case 'yearly':
      return addMonths(date, 12)
    default:
      return date
  }
}

function computeNextServiceDate(
  startDate: string,
  frequency: string,
  lastServiceDate?: string | null
) {
  const baseIso = lastServiceDate || startDate
  const base = new Date(`${baseIso}T00:00:00`)

  if (frequency === 'once') {
    return formatDate(base)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let next = base
  if (lastServiceDate) {
    next = advanceDate(base, frequency)
  } else {
    while (next < today) {
      next = advanceDate(next, frequency)
    }
  }

  return formatDate(next)
}

interface CreatePlanInput {
  customerId: string
  productId: string
  frequency: CustomerProductInsert['frequency']
  startDate: string
  endDate?: string | null
  customCost?: number | null
  autoRenew?: boolean
  active?: boolean
  notes?: string | null
}

interface UpdatePlanInput {
  id: string
  customerId: string
  productId: string
  frequency: CustomerProductInsert['frequency']
  startDate: string
  endDate?: string | null
  customCost?: number | null
  autoRenew?: boolean
  active?: boolean
  notes?: string | null
  lastServiceDate?: string | null
}

export async function createCustomerServicePlan(input: CreatePlanInput) {
  const supabase = await createClient()

  try {
    const nextServiceDate = computeNextServiceDate(
      input.startDate,
      input.frequency
    )

    const payload: CustomerProductInsert = {
      customer_id: input.customerId,
      product_id: input.productId,
      frequency: input.frequency,
      custom_cost: input.customCost ?? null,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      auto_renew: input.autoRenew ?? true,
      active: input.active ?? true,
      notes: input.notes ?? null,
      next_service_date: nextServiceDate,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('customer_products')
      .insert(payload)
      .select(`
        id,
        frequency,
        custom_cost,
        start_date,
        end_date,
        auto_renew,
        active,
        next_service_date,
        service:products_services (
          id,
          name,
          base_cost
        )
      `)
      .single()

    if (error || !data) {
      console.error('Create service plan error:', error)
      return { error: 'Failed to create service plan.' }
    }

    revalidatePath(`/customers/${input.customerId}`)
    revalidatePath('/schedule')

    return { success: true, plan: data }
  } catch (error) {
    console.error('Create service plan error:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

export async function updateCustomerServicePlan(input: UpdatePlanInput) {
  const supabase = await createClient()

  try {
    const nextServiceDate = computeNextServiceDate(
      input.startDate,
      input.frequency,
      input.lastServiceDate ?? null
    )

    const payload: CustomerProductUpdate = {
      product_id: input.productId,
      frequency: input.frequency,
      custom_cost: input.customCost ?? null,
      start_date: input.startDate,
      end_date: input.endDate ?? null,
      auto_renew: input.autoRenew ?? true,
      active: input.active ?? true,
      notes: input.notes ?? null,
      next_service_date: nextServiceDate,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('customer_products')
      .update(payload)
      .eq('id', input.id)
      .select(`
        id,
        frequency,
        custom_cost,
        start_date,
        end_date,
        auto_renew,
        active,
        next_service_date,
        service:products_services (
          id,
          name,
          base_cost
        )
      `)
      .single()

    if (error || !data) {
      console.error('Update service plan error:', error)
      return { error: 'Failed to update service plan.' }
    }

    revalidatePath(`/customers/${input.customerId}`)
    revalidatePath('/schedule')

    return { success: true, plan: data }
  } catch (error) {
    console.error('Update service plan error:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

export async function deleteCustomerServicePlan(planId: string, customerId: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('customer_products')
      .delete()
      .eq('id', planId)

    if (error) {
      console.error('Delete service plan error:', error)
      return { error: 'Failed to delete service plan.' }
    }

    revalidatePath(`/customers/${customerId}`)
    revalidatePath('/schedule')

    return { success: true }
  } catch (error) {
    console.error('Delete service plan error:', error)
    return { error: 'An unexpected error occurred.' }
  }
}
