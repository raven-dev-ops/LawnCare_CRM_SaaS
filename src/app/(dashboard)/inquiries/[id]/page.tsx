import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InquiryQuotePanel } from '@/components/inquiries/InquiryQuotePanel'
import { ArrowLeft, Inbox, MapPin, Phone, Mail } from 'lucide-react'
import type { Inquiry } from '@/types/database.types'

const STATUS_LABELS: Record<Inquiry['status'], string> = {
  pending: 'Pending',
  contacted: 'Contacted',
  quoted: 'Quoted',
  converted: 'Converted',
  declined: 'Declined',
  spam: 'Spam',
}

export const metadata = {
  title: 'Inquiry Details | Lawn Care CRM',
  description: 'View and manage an individual inquiry',
}

export default async function InquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: inquiry, error } = await supabase
    .from('inquiries')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !inquiry) {
    notFound()
  }

  const createdAt = inquiry.created_at
    ? new Date(inquiry.created_at).toLocaleString()
    : null
  const contactedAt = inquiry.contacted_at
    ? new Date(inquiry.contacted_at).toLocaleString()
    : null

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <a href="/inquiries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Inquiries
              </a>
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {inquiry.name}
              </h1>
              <p className="text-sm text-muted-foreground">
                Inquiry details and conversion status
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="capitalize">
            {STATUS_LABELS[inquiry.status]}
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        <div className="max-w-5xl mx-auto grid gap-6 md:grid-cols-3">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Contact & Property
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium">Contact</div>
                <div className="flex flex-col gap-1 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3" />
                    <span>{inquiry.email}</span>
                  </div>
                  {inquiry.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{inquiry.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-medium">Address</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span>{inquiry.address}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {inquiry.property_type || 'Property type not specified'}
                  {inquiry.lot_size ? ` · ${inquiry.lot_size}` : ''}
                </div>
              </div>

              <div className="space-y-1">
                <div className="font-medium">Services interested in</div>
                {inquiry.services_interested && inquiry.services_interested.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {inquiry.services_interested.map((service) => (
                      <Badge key={service} variant="outline" className="text-xs">
                        {service}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Not specified
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="font-medium">Notes from customer</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {inquiry.notes || 'No additional notes provided.'}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs text-muted-foreground">
                <div>
                  <div className="font-medium text-foreground">Submitted</div>
                  <div>{createdAt || 'Unknown'}</div>
                </div>
                <div>
                  <div className="font-medium text-foreground">Contacted</div>
                  <div>{contactedAt || 'Not yet contacted'}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quote & Conversion</CardTitle>
              </CardHeader>
              <CardContent>
                <InquiryQuotePanel
                  inquiryId={inquiry.id}
                  status={inquiry.status}
                  preferredContactMethod={inquiry.preferred_contact_method}
                  preferredContactTime={inquiry.preferred_contact_time}
                  quoteAmount={inquiry.quote_amount}
                  internalNotes={inquiry.internal_notes}
                  convertedCustomerId={inquiry.converted_customer_id}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

