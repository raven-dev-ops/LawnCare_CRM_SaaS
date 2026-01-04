import type { SupabaseClient } from '@supabase/supabase-js'
import type { Json } from '@/types/database.types'

interface AuditLogInput {
  action: string
  entityType: string
  entityId?: string | null
  beforeData?: Json | null
  afterData?: Json | null
}

export async function logAuditEvent(
  supabase: SupabaseClient<any>,
  input: AuditLogInput
) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId ?? null,
      before_data: input.beforeData ?? null,
      after_data: input.afterData ?? null,
    })

  if (error) {
    console.error('Audit log insert failed:', error)
  }
}
