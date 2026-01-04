import type { Customer } from '@/types/database.types'

export const CUSTOMER_EXPORT_HEADERS = [
  'Name',
  'Address',
  'Type',
  'Cost',
  'Day',
  'Order',
  'Distance from shop_km',
  'distance_from_shop_miles',
  'Additional Work',
  'Additional Work cost',
  'Phone',
  'Email',
  'Latitude',
  'Longitude',
]

function escapeCsvValue(value: string | number | null | undefined) {
  if (value === undefined || value === null) return ''
  const stringValue = String(value)
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

export function buildCsv(headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvValue).join(','))
  return lines.join('\n')
}

export function buildCustomerExportRows(customers: Customer[]) {
  return customers.map((customer) => [
    customer.name,
    customer.address,
    customer.type,
    String(customer.cost ?? ''),
    customer.day ?? '',
    customer.route_order?.toString() ?? '',
    customer.distance_from_shop_km?.toString() ?? '',
    customer.distance_from_shop_miles?.toString() ?? '',
    customer.has_additional_work ? 'Yes' : 'No',
    customer.additional_work_cost?.toString() ?? '',
    customer.phone ?? '',
    customer.email ?? '',
    customer.latitude?.toString() ?? '',
    customer.longitude?.toString() ?? '',
  ])
}
