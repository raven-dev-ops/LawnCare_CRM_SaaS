'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CrewMemberInput {
  name: string
  email?: string | null
  phone?: string | null
  role?: string
  active?: boolean
}

interface CrewMemberUpdateInput extends CrewMemberInput {
  id: string
}

export async function createCrewMember(input: CrewMemberInput) {
  const supabase = await createClient()

  try {
    const payload = {
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role: input.role?.trim() || 'crew',
      active: input.active ?? true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('crew_members')
      .insert(payload)
      .select()
      .single()

    if (error || !data) {
      console.error('Create crew member error:', error)
      return { error: 'Failed to create crew member.' }
    }

    revalidatePath('/crew')
    revalidatePath('/routes')
    revalidatePath('/schedule')

    return { success: true, member: data }
  } catch (error) {
    console.error('Create crew member error:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

export async function updateCrewMember(input: CrewMemberUpdateInput) {
  const supabase = await createClient()

  try {
    const payload = {
      name: input.name.trim(),
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      role: input.role?.trim() || 'crew',
      active: input.active ?? true,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('crew_members')
      .update(payload)
      .eq('id', input.id)
      .select()
      .single()

    if (error || !data) {
      console.error('Update crew member error:', error)
      return { error: 'Failed to update crew member.' }
    }

    revalidatePath('/crew')
    revalidatePath('/routes')
    revalidatePath('/schedule')

    return { success: true, member: data }
  } catch (error) {
    console.error('Update crew member error:', error)
    return { error: 'An unexpected error occurred.' }
  }
}

export async function deleteCrewMember(id: string) {
  const supabase = await createClient()

  try {
    const { error } = await supabase
      .from('crew_members')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete crew member error:', error)
      return { error: 'Failed to delete crew member.' }
    }

    revalidatePath('/crew')
    revalidatePath('/routes')
    revalidatePath('/schedule')

    return { success: true }
  } catch (error) {
    console.error('Delete crew member error:', error)
    return { error: 'An unexpected error occurred.' }
  }
}
