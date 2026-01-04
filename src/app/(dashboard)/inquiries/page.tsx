import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Inbox, Plus } from 'lucide-react'
import { InquiriesTable } from '@/components/inquiries/InquiriesTable'
import Link from 'next/link'

export const metadata = {
  title: 'Inquiries | Lawn Care CRM',
  description: 'Manage customer inquiries and leads',
}

export default async function InquiriesPage() {
  const supabase = await createClient()

  const { data: inquiries, error } = await supabase
    .from('inquiries')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-white px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inquiries</h1>
            <p className="text-muted-foreground">Track and convert new customer leads</p>
          </div>
          <Button
            className="bg-emerald-500 hover:bg-emerald-600"
            asChild
          >
            <Link href="/inquiry">
              <Plus className="mr-2 h-4 w-4" />
              New Inquiry
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-slate-50 p-8">
        <div className="max-w-6xl mx-auto space-y-4">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader className="py-3">
                <CardTitle className="flex items-center gap-2 text-sm text-red-700">
                  <Inbox className="h-4 w-4" />
                  Failed to load inquiries
                </CardTitle>
              </CardHeader>
            </Card>
          )}
          <InquiriesTable inquiries={inquiries || []} />
        </div>
      </div>
    </div>
  )
}
