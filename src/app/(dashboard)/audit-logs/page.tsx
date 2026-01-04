import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/roles'
import { AuditLogsView } from '@/components/audit/AuditLogsView'

export const metadata = {
  title: 'Audit Logs | Lawn Care CRM',
  description: 'Administrative audit history',
}

export default async function AuditLogsPage() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Admin access required.
      </div>
    )
  }

  const supabase = await createClient()

  const { data: logs } = await supabase
    .from('audit_logs')
    .select('id, actor_id, action, entity_type, entity_id, before_data, after_data, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return <AuditLogsView logs={logs || []} />
}
