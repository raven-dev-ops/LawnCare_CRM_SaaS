'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { CustomerNote } from '@/types/database.types'

const CHANNELS = new Set(['note', 'call', 'email', 'sms', 'in_person', 'other'])

interface CreateCustomerNoteInput {
  customerId: string
  channel: string
  message: string
}

export async function createCustomerNote(input: CreateCustomerNoteInput) {
  const supabase = await createClient()
  const message = input.message.trim()
  const channel = CHANNELS.has(input.channel) ? input.channel : 'note'

  if (!message) {
    return { error: 'Message is required.' }
  }

  const { data, error } = await supabase
    .from('customer_notes')
    .insert({
      customer_id: input.customerId,
      channel,
      message,
    })
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating customer note:', error)
    return { error: 'Failed to create customer note.' }
  }

  revalidatePath(`/customers/${input.customerId}`)

  return { success: true, note: data as CustomerNote }
}

export async function deleteCustomerNote(noteId: string, customerId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('customer_notes')
    .delete()
    .eq('id', noteId)

  if (error) {
    console.error('Error deleting customer note:', error)
    return { error: 'Failed to delete customer note.' }
  }

  revalidatePath(`/customers/${customerId}`)

  return { success: true }
}
