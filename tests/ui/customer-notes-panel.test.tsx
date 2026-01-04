import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CustomerNotesPanel } from '@/components/customers/CustomerNotesPanel'
import type { CustomerNote } from '@/types/database.types'
import { createCustomerNote, deleteCustomerNote } from '@/app/(dashboard)/customers/notes/actions'

vi.mock('@/app/(dashboard)/customers/notes/actions', () => ({
  createCustomerNote: vi.fn(),
  deleteCustomerNote: vi.fn(),
}))

describe('CustomerNotesPanel', () => {
  it('adds a note and renders it', async () => {
    const user = userEvent.setup()
    const note: CustomerNote = {
      id: 'note-1',
      customer_id: 'customer-1',
      channel: 'note',
      message: 'Left a voicemail',
      created_by: 'user-1',
      created_at: new Date('2026-01-08T10:00:00Z').toISOString(),
    }

    vi.mocked(createCustomerNote).mockResolvedValue({ success: true, note })

    render(<CustomerNotesPanel customerId="customer-1" notes={[]} />)

    await user.type(screen.getByLabelText(/message/i), 'Left a voicemail')
    await user.click(screen.getByRole('button', { name: /add note/i }))

    expect(createCustomerNote).toHaveBeenCalledWith({
      customerId: 'customer-1',
      channel: 'note',
      message: 'Left a voicemail',
    })
    expect(await screen.findByText('Left a voicemail')).toBeInTheDocument()
  })

  it('disables delete for non-admin users', () => {
    const notes: CustomerNote[] = [
      {
        id: 'note-1',
        customer_id: 'customer-1',
        channel: 'note',
        message: 'Intro call',
        created_by: 'user-1',
        created_at: new Date('2026-01-08T10:00:00Z').toISOString(),
      },
    ]

    render(<CustomerNotesPanel customerId="customer-1" notes={notes} />)

    const deleteButtons = screen.getAllByRole('button', { name: /delete \(admin only\)/i })
    expect(deleteButtons[0]).toBeDisabled()
    expect(deleteCustomerNote).not.toHaveBeenCalled()
  })
})
