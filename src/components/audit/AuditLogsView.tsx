import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { AuditLog } from '@/types/database.types'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString()
}

function formatId(value: string | null) {
  if (!value) return 'N/A'
  return `${value.slice(0, 6)}...${value.slice(-4)}`
}

export function AuditLogsView({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>Change history for key CRM actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">
            {logs.length} entries
          </div>
        </CardContent>
      </Card>

      {logs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-sm text-muted-foreground">
            No audit log entries yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{log.action}</Badge>
                    <span className="text-sm font-medium">{log.entity_type}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Entity: {formatId(log.entity_id)}</span>
                  <span>Actor: {formatId(log.actor_id)}</span>
                </div>
                <details className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <summary className="cursor-pointer text-xs font-medium text-slate-700">
                    View changes
                  </summary>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-600">Before</div>
                      <pre className="mt-2 max-h-64 overflow-auto rounded bg-white p-2 text-xs text-slate-700">
                        {JSON.stringify(log.before_data, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-600">After</div>
                      <pre className="mt-2 max-h-64 overflow-auto rounded bg-white p-2 text-xs text-slate-700">
                        {JSON.stringify(log.after_data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </details>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
