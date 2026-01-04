import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuditLogsView } from '@/components/audit/AuditLogsView'
import type { AuditLog } from '@/types/database.types'

describe('AuditLogsView', () => {
  it('shows empty state when no logs exist', () => {
    render(<AuditLogsView logs={[]} />)
    expect(screen.getByText(/no audit log entries yet/i)).toBeInTheDocument()
  })

  it('renders audit log entries', () => {
    const logs: AuditLog[] = [
      {
        id: 'log-1',
        actor_id: 'user-1',
        action: 'create',
        entity_type: 'customer',
        entity_id: 'customer-1',
        before_data: null,
        after_data: { name: 'Acme' },
        created_at: new Date('2026-01-08T10:00:00Z').toISOString(),
      },
    ]

    render(<AuditLogsView logs={logs} />)
    expect(screen.getAllByText(/audit logs/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/create/i)).toBeInTheDocument()
    expect(screen.getByText(/customer/i)).toBeInTheDocument()
  })
})
