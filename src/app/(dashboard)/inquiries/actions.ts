'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { geocodeAddress } from '@/lib/geocoding'
import { getShopLocation } from '@/lib/settings'
import { haversineMilesKm } from '@/lib/geo'
import type { Inquiry, InquiryUpdate, Customer } from '@/types/database.types'

type InquiryStatus = Inquiry['status']

interface UpdateInquiryDetailsInput {
  inquiryId: string
  quoteAmount?: number | null
  internalNotes?: string | null
}

export async function updateInquiryDetails(input: UpdateInquiryDetailsInput) {
  const supabase = await createClient()

  const updates: InquiryUpdate = {}

  if (input.quoteAmount !== undefined) {
    updates.quote_amount = input.quoteAmount
  }

  if (input.internalNotes !== undefined) {
    updates.internal_notes = input.internalNotes
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'No updates provided.' }
  }

  const { error } = await supabase
    .from('inquiries')
    .update(updates)
    .eq('id', input.inquiryId)

  if (error) {
    console.error('Error updating inquiry details:', error)
    return { error: 'Failed to update inquiry details.' }
  }

  revalidatePath('/inquiries')
  revalidatePath(`/inquiries/${input.inquiryId}`)

  return { success: true }
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  const supabase = await createClient()

  const updates: InquiryUpdate = {
    status,
  }

  if (status === 'contacted') {
    updates.contacted_at = new Date().toISOString()
  }

  const { error } = await supabase
    .from('inquiries')
    .update(updates)
    .eq('id', id)

  if (error) {
    console.error('Error updating inquiry status:', error)
    return { error: 'Failed to update inquiry.' }
  }

  revalidatePath('/inquiries')
  return { success: true }
}

interface ConvertInquiryInput {
  inquiryId: string
  type?: Customer['type']
  cost?: number
  day?: Customer['day']
}

export async function convertInquiryToCustomer(input: ConvertInquiryInput) {
  const supabase = await createClient()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', input.inquiryId)
    .single()

  if (error || !inquiry) {
    console.error('Error loading inquiry:', error)
    return { error: 'Inquiry not found.' }
  }

  if (inquiry.converted_customer_id) {
    return { success: true, customerId: inquiry.converted_customer_id as string }
  }

  const propertyType = inquiry.property_type as Customer['type'] | null
  const customerType: Customer['type'] =
    input.type ??
    (propertyType === 'Commercial' ? 'Commercial' : 'Residential')

  const cost =
    typeof input.cost === 'number' && !Number.isNaN(input.cost)
      ? input.cost
      : 0

  const geocode = await geocodeAddress(inquiry.address)

  if (!geocode) {
    return { error: 'Unable to geocode this address. Please verify it and try again.' }
  }

  const shopLocation = await getShopLocation()
  const distance = haversineMilesKm(
    shopLocation.lat,
    shopLocation.lng,
    geocode.latitude,
    geocode.longitude
  )

  const { data: customer, error: insertError } = await supabase
    .from('customers')
    .insert({
      name: inquiry.name,
      address: inquiry.address,
      type: customerType,
      cost,
      day: input.day ?? null,
      has_additional_work: false,
      additional_work_cost: null,
      latitude: geocode.latitude,
      longitude: geocode.longitude,
      distance_from_shop_miles: distance.miles,
      distance_from_shop_km: distance.km,
    })
    .select()
    .single()

  if (insertError || !customer) {
    console.error('Error creating customer from inquiry:', insertError)
    return { error: 'Failed to create customer.' }
  }

  const { error: updateError } = await supabase
    .from('inquiries')
    .update({
      status: 'converted',
      converted_customer_id: customer.id,
    })
    .eq('id', input.inquiryId)

  if (updateError) {
    console.error('Error linking inquiry to customer:', updateError)
    return { error: 'Customer created, but failed to link inquiry.' }
  }

  revalidatePath('/inquiries')
  revalidatePath('/customers')

  return { success: true, customerId: customer.id as string }
}
