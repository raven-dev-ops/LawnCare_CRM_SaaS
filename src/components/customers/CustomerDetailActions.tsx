'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Customer } from '@/types/database.types'
import { CustomerDialog } from '@/components/customers/CustomerDialog'
import { DeleteCustomerDialog } from '@/components/customers/DeleteCustomerDialog'

interface CustomerDetailActionsProps {
  customer: Customer
}

export function CustomerDetailActions({ customer }: CustomerDetailActionsProps) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        className="bg-emerald-500 hover:bg-emerald-600"
        onClick={() => setEditOpen(true)}
      >
        Edit Customer
      </Button>
      <Button
        variant="outline"
        className="border-red-200 text-red-700 hover:bg-red-50"
        onClick={() => setDeleteOpen(true)}
      >
        Delete
      </Button>

      <CustomerDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        customer={customer}
      />
      <DeleteCustomerDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        customer={customer}
        onSuccess={() => router.push('/customers')}
      />
    </div>
  )
}
