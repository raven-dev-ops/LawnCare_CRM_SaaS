'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateInquiryDetails } from '@/app/(dashboard)/inquiries/actions'
import type { Inquiry } from '@/types/database.types'
import { toast } from 'sonner'

interface InquiryQuotePanelProps {
  inquiryId: string
  status: Inquiry['status']
  preferredContactMethod?: string | null
  preferredContactTime?: string | null
  quoteAmount?: number | null
  internalNotes?: string | null
  convertedCustomerId?: string | null
}

export function InquiryQuotePanel({
  inquiryId,
  status,
  preferredContactMethod,
  preferredContactTime,
  quoteAmount,
  internalNotes,
  convertedCustomerId,
}: InquiryQuotePanelProps) {
  const [quoteValue, setQuoteValue] = useState<string>(
    quoteAmount != null ? String(Number(quoteAmount).toFixed(2)) : ''
  )
  const [notesValue, setNotesValue] = useState<string>(internalNotes || '')
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    const trimmedQuote = quoteValue.trim()
    const parsedQuote = trimmedQuote === '' ? null : Number(trimmedQuote)

    if (parsedQuote != null && Number.isNaN(parsedQuote)) {
      toast.error('Enter a valid quote amount')
      return
    }

    setIsSaving(true)
    const result = await updateInquiryDetails({
      inquiryId,
      quoteAmount: parsedQuote,
      internalNotes: notesValue.trim() ? notesValue.trim() : null,
    })
    setIsSaving(false)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success('Inquiry details updated')
  }

  return (
    <div className="space-y-3 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <span>Status</span>
        <span className="font-medium text-foreground capitalize">
          {status.replace('_', ' ')}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span>Preferred contact</span>
        <span className="font-medium text-foreground">
          {preferredContactMethod || 'Not specified'}
        </span>
      </div>
      {preferredContactTime && (
        <div className="flex items-center justify-between">
          <span>Best time</span>
          <span className="font-medium text-foreground">
            {preferredContactTime}
          </span>
        </div>
      )}

      <div className="space-y-2 pt-2 border-t">
        <div className="text-xs font-medium text-foreground">Quote amount</div>
        <Input
          value={quoteValue}
          onChange={(event) => setQuoteValue(event.target.value)}
          placeholder="0.00"
          inputMode="decimal"
        />
      </div>

      <div className="space-y-2">
        <div className="text-xs font-medium text-foreground">Internal notes</div>
        <Textarea
          value={notesValue}
          onChange={(event) => setNotesValue(event.target.value)}
          placeholder="Notes visible to staff only"
          rows={4}
        />
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        <Button
          size="sm"
          className="bg-emerald-500 hover:bg-emerald-600"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => toast.info('Send quote coming soon')}
        >
          Send quote
        </Button>
      </div>

      {convertedCustomerId && (
        <div className="pt-2 border-t">
          <span>Converted: </span>
          <a
            href="/customers"
            className="font-medium text-emerald-700 hover:underline"
          >
            View in Customers
          </a>
        </div>
      )}
    </div>
  )
}
