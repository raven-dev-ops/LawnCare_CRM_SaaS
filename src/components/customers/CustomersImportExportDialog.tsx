'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import type { Customer } from '@/types/database.types'
import { buildCsv, buildCustomerExportRows, CUSTOMER_EXPORT_HEADERS } from '@/lib/customers-csv'
import { importCustomers } from '@/app/(dashboard)/customers/actions'
import { getGoogleSheetsAuthUrl, fetchGoogleSheetPreview, disconnectGoogleSheets } from '@/app/(dashboard)/customers/google-sheets/actions'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const IMPORT_FIELDS = [
  { key: 'name', label: 'Name', required: true, aliases: ['name'] },
  { key: 'address', label: 'Address', required: true, aliases: ['address'] },
  { key: 'type', label: 'Type', required: false, aliases: ['type'] },
  { key: 'cost', label: 'Cost', required: false, aliases: ['cost', 'price'] },
  { key: 'day', label: 'Day', required: false, aliases: ['day', 'serviceday', 'service_day'] },
  { key: 'route_order', label: 'Order', required: false, aliases: ['order', 'routeorder', 'route_order'] },
  {
    key: 'distance_from_shop_km',
    label: 'Distance from shop_km',
    required: false,
    aliases: ['distancefromshopkm', 'distance_from_shop_km'],
  },
  {
    key: 'distance_from_shop_miles',
    label: 'distance_from_shop_miles',
    required: false,
    aliases: ['distancefromshopmiles', 'distance_from_shop_miles'],
  },
  {
    key: 'has_additional_work',
    label: 'Additional Work',
    required: false,
    aliases: ['additionalwork', 'additional_work'],
  },
  {
    key: 'additional_work_cost',
    label: 'Additional Work cost',
    required: false,
    aliases: ['additionalworkcost', 'additional_work_cost'],
  },
  { key: 'phone', label: 'Phone', required: false, aliases: ['phone', 'phonenumber'] },
  { key: 'email', label: 'Email', required: false, aliases: ['email', 'emailaddress'] },
  { key: 'latitude', label: 'Latitude', required: false, aliases: ['latitude', 'lat'] },
  { key: 'longitude', label: 'Longitude', required: false, aliases: ['longitude', 'lng', 'long'] },
] as const

type ImportFieldKey = typeof IMPORT_FIELDS[number]['key']

type Weekday = Exclude<Customer['day'], null>

type ImportDay = Weekday | 'unscheduled'

type ImportRow = {
  name: string
  address: string
  phone?: string | null
  email?: string | null
  type?: 'Residential' | 'Commercial' | 'Workshop'
  cost?: number
  day?: ImportDay | null
  route_order?: number | null
  distance_from_shop_km?: number | null
  distance_from_shop_miles?: number | null
  latitude?: number | null
  longitude?: number | null
  has_additional_work?: boolean
  additional_work_cost?: number | null
}

type ParsedRow = {
  index: number
  data: ImportRow | null
  errors: string[]
  duplicate: boolean
}

type CustomersImportExportDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  customers: Customer[]
  isAdmin: boolean
  googleSheetsConnected?: boolean
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function normalizeKey(name: string, address: string) {
  return `${name}`.toLowerCase().replace(/\s+/g, '') + '|' + `${address}`.toLowerCase().replace(/\s+/g, '')
}

function extractSpreadsheetId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const match = trimmed.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  return match ? match[1] : trimmed
}

function parseCsv(content: string) {
  const rows: string[][] = []
  let row: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i]

    if (char === '"') {
      if (inQuotes && content[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === ',' && !inQuotes) {
      row.push(current.trim())
      current = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && content[i + 1] === '\n') {
        i += 1
      }
      row.push(current.trim())
      if (row.some((cell) => cell.length > 0)) {
        rows.push(row)
      }
      row = []
      current = ''
      continue
    }

    current += char
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current.trim())
    if (row.some((cell) => cell.length > 0)) {
      rows.push(row)
    }
  }

  const headers = rows.shift() ?? []
  return { headers, rows }
}

function buildInitialMapping(headers: string[]) {
  const normalizedHeaders = headers.map(normalizeHeader)
  const mapping: Record<ImportFieldKey, number | null> = {} as Record<
    ImportFieldKey,
    number | null
  >

  IMPORT_FIELDS.forEach((field) => {
    const candidates = [normalizeHeader(field.label), ...field.aliases]
    const index = normalizedHeaders.findIndex((header) => candidates.includes(header))
    mapping[field.key] = index >= 0 ? index : null
  })

  return mapping
}

export function CustomersImportExportDialog({
  open,
  onOpenChange,
  customers,
  isAdmin,
  googleSheetsConnected,
}: CustomersImportExportDialogProps) {
  const router = useRouter()
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<string[][]>([])
  const [fileName, setFileName] = useState('')
  const [mapping, setMapping] = useState<Record<ImportFieldKey, number | null>>(
    buildInitialMapping([])
  )
  const [skipDuplicates, setSkipDuplicates] = useState(true)
  const [isImporting, setIsImporting] = useState(false)
  const [sheetUrl, setSheetUrl] = useState('')
  const [sheetName, setSheetName] = useState('')
  const [loadedSheetName, setLoadedSheetName] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isDisconnecting, setIsDisconnecting] = useState(false)
  const [isLoadingSheet, setIsLoadingSheet] = useState(false)

  const existingKeys = useMemo(() => {
    const keys = new Set<string>()
    customers.forEach((customer) => {
      if (customer.name && customer.address) {
        keys.add(normalizeKey(customer.name, customer.address))
      }
    })
    return keys
  }, [customers])

  const mappingErrors = useMemo(() => {
    return IMPORT_FIELDS.filter((field) => field.required && mapping[field.key] == null)
  }, [mapping])

  const parsedRows = useMemo<ParsedRow[]>(() => {
    if (!rows.length) return []

    const seenKeys = new Set<string>()
    const dayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Unscheduled'] as const
    const typeOptions = ['Residential', 'Commercial', 'Workshop'] as const

    return rows.map((row, index) => {
      const errors: string[] = []
      const getValue = (key: ImportFieldKey) => {
        const idx = mapping[key]
        return idx == null ? '' : row[idx] ?? ''
      }

      const name = getValue('name').trim()
      const address = getValue('address').trim()

      if (!name) errors.push('Missing name')
      if (!address) errors.push('Missing address')

      const typeRaw = getValue('type').trim()
      const normalizedType = typeOptions.find(
        (option) => option.toLowerCase() === typeRaw.toLowerCase()
      )
      if (typeRaw && !normalizedType) {
        errors.push('Invalid type')
      }

      const dayRaw = getValue('day').trim()
      const dayRawLower = dayRaw.toLowerCase()
      const normalizedDay = dayOptions.find(
        (option) => option.toLowerCase() === dayRawLower
      )
      const isWorkshopDay = dayRawLower === 'workshop'
      if (dayRaw && !normalizedDay && !isWorkshopDay) {
        errors.push('Invalid day')
      }

      const parseNumber = (value: string, label: string) => {
        if (!value) return null
        const cleaned = value.replace(/[$,]/g, '').trim()
        if (!cleaned) return null
        const parsed = Number(cleaned)
        if (Number.isNaN(parsed)) {
          errors.push(`${label} is not a number`)
          return null
        }
        return parsed
      }

      const cost = parseNumber(getValue('cost'), 'Cost')
      const routeOrder = parseNumber(getValue('route_order'), 'Order')
      const distanceKm = parseNumber(getValue('distance_from_shop_km'), 'Distance km')
      const distanceMiles = parseNumber(getValue('distance_from_shop_miles'), 'Distance miles')
      const latitude = parseNumber(getValue('latitude'), 'Latitude')
      const longitude = parseNumber(getValue('longitude'), 'Longitude')

      const additionalRaw = getValue('has_additional_work').trim().toLowerCase()
      let hasAdditional = false
      if (additionalRaw) {
        if (['yes', 'true', '1', 'y'].includes(additionalRaw)) {
          hasAdditional = true
        } else if (!['no', 'false', '0', 'n'].includes(additionalRaw)) {
          errors.push('Additional Work must be yes/no')
        }
      }

      const additionalCost = parseNumber(getValue('additional_work_cost'), 'Additional work cost')

      const emailRaw = getValue('email').trim()
      if (emailRaw && !EMAIL_PATTERN.test(emailRaw)) {
        errors.push('Invalid email')
      }

      const phoneRaw = getValue('phone').trim()

      const key = name && address ? normalizeKey(name, address) : ''
      const duplicate = key ? existingKeys.has(key) || seenKeys.has(key) : false
      if (key) {
        seenKeys.add(key)
      }

      const data: ImportRow = {
        name,
        address,
        phone: phoneRaw || null,
        email: emailRaw || null,
        type: normalizedType ?? undefined,
        cost: cost ?? undefined,
        day: !isWorkshopDay && normalizedDay && normalizedDay !== 'Unscheduled'
          ? (normalizedDay as Weekday)
          : null,
        route_order: routeOrder == null ? null : Math.round(routeOrder),
        distance_from_shop_km: distanceKm,
        distance_from_shop_miles: distanceMiles,
        latitude,
        longitude,
        has_additional_work: hasAdditional,
        additional_work_cost: hasAdditional ? additionalCost ?? null : null,
      }

      return {
        index: index + 1,
        data,
        errors,
        duplicate,
      }
    })
  }, [rows, mapping, existingKeys])

  const summary = useMemo(() => {
    const errorCount = parsedRows.filter((row) => row.errors.length > 0).length
    const duplicateCount = parsedRows.filter((row) => row.duplicate).length
    const validCount = parsedRows.filter((row) => row.errors.length === 0).length

    return { errorCount, duplicateCount, validCount, total: parsedRows.length }
  }, [parsedRows])

  const canImport = isAdmin && mappingErrors.length === 0 && parsedRows.length > 0

  const handleExport = () => {
    const rowsToExport = buildCustomerExportRows(customers)

    const csv = buildCsv(CUSTOMER_EXPORT_HEADERS, rowsToExport)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'customers_export.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleTemplate = () => {
    const csv = buildCsv(CUSTOMER_EXPORT_HEADERS, [])
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'customers_template.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const applyImportData = (nextHeaders: string[], nextRows: string[][], name: string) => {
    setHeaders(nextHeaders)
    setRows(nextRows)
    setFileName(name)
    setMapping(buildInitialMapping(nextHeaders))
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const content = await file.text()
    const parsed = parseCsv(content)
    applyImportData(parsed.headers, parsed.rows, file.name)
  }

  const handleGoogleConnect = async () => {
    if (!isAdmin) {
      toast.error('Admin access required.')
      return
    }

    setIsConnecting(true)
    const result = await getGoogleSheetsAuthUrl()
    setIsConnecting(false)

    if (result?.error || !result?.url) {
      toast.error(result?.error || 'Unable to start Google OAuth.')
      return
    }

    window.location.assign(result.url)
  }

  const handleGoogleDisconnect = async () => {
    setIsDisconnecting(true)
    const result = await disconnectGoogleSheets()
    setIsDisconnecting(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    toast.success('Google Sheets disconnected.')
    setLoadedSheetName(null)
    router.refresh()
  }

  const handleLoadGoogleSheet = async () => {
    const spreadsheetId = extractSpreadsheetId(sheetUrl)
    if (!spreadsheetId) {
      toast.error('Enter a Google Sheets URL or ID.')
      return
    }

    if (!googleSheetsConnected) {
      toast.error('Connect Google Sheets first.')
      return
    }

    setIsLoadingSheet(true)
    const result = await fetchGoogleSheetPreview({
      spreadsheetId,
      sheetName: sheetName || null,
    })
    setIsLoadingSheet(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    applyImportData(result.headers || [], result.rows || [], `Google Sheets: ${result.sheetName || spreadsheetId}`)
    setLoadedSheetName(result.sheetName || spreadsheetId)
    toast.success('Sheet data loaded. Switch to Import to map fields.')
  }

  const handleImport = async (dryRun: boolean) => {
    if (!canImport) {
      toast.error('Map required fields before importing.')
      return
    }

    const validRows = parsedRows
      .filter((row) => row.data && row.errors.length === 0)
      .map((row) => row.data as ImportRow)

    if (validRows.length === 0) {
      toast.error('No valid rows to import.')
      return
    }

    setIsImporting(true)
    const result = await importCustomers({
      rows: validRows,
      skipDuplicates,
      dryRun,
    })
    setIsImporting(false)

    if (result?.error) {
      toast.error(result.error)
      return
    }

    if (dryRun) {
      toast.success(
        `Dry run complete: ${result.validCount ?? 0} valid, ${result.duplicateCount ?? 0} duplicates, ${result.errorCount ?? 0} errors.`
      )
      return
    }

    toast.success(`Imported ${result.importedCount ?? 0} customers.`)
    router.refresh()
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen)
    if (!nextOpen) {
      setHeaders([])
      setRows([])
      setFileName('')
      setMapping(buildInitialMapping([]))
      setSkipDuplicates(true)
      setSheetUrl('')
      setSheetName('')
      setLoadedSheetName(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Customer Import / Export</DialogTitle>
          <DialogDescription>
            Export customers to CSV or import from your spreadsheet template.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export">
          <TabsList>
            <TabsTrigger value="export">Export</TabsTrigger>
            {isAdmin ? <TabsTrigger value="import">Import</TabsTrigger> : null}
            {isAdmin ? <TabsTrigger value="google">Google Sheets</TabsTrigger> : null}
          </TabsList>

          <TabsContent value="export" className="space-y-4">
            <div className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm text-muted-foreground">
                Export includes distance, add-on, and contact fields for easy editing in Google Sheets.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={handleExport}>Download CSV</Button>
              <Button variant="outline" onClick={handleTemplate}>
                Download Template
              </Button>
            </div>
          </TabsContent>

          {isAdmin ? (
            <TabsContent value="import" className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="csv-file">CSV File</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
                {fileName ? (
                  <p className="text-xs text-muted-foreground">Loaded {fileName}</p>
                ) : null}
              </div>

              {headers.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold">Field Mapping</h3>
                    <p className="text-xs text-muted-foreground">
                      Map your CSV columns to customer fields.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {IMPORT_FIELDS.map((field) => {
                      const mappedIndex = mapping[field.key]
                      const selectValue = mappedIndex == null ? 'ignore' : String(mappedIndex)
                      const isMissing = field.required && mappedIndex == null

                      return (
                        <div key={field.key} className="grid gap-3 md:grid-cols-[220px_1fr] md:items-center">
                          <Label className={isMissing ? 'text-red-600' : ''}>
                            {field.label}
                            {field.required ? ' *' : ''}
                          </Label>
                          <Select
                            value={selectValue}
                            onValueChange={(value) => {
                              setMapping((prev) => ({
                                ...prev,
                                [field.key]: value === 'ignore' ? null : Number(value),
                              }))
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Ignore" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ignore">Ignore</SelectItem>
                              {headers.map((header, index) => (
                                <SelectItem key={`${header}-${index}`} value={String(index)}>
                                  {header || `Column ${index + 1}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch checked={skipDuplicates} onCheckedChange={setSkipDuplicates} />
                      <Label>Skip duplicates</Label>
                    </div>
                  </div>

                  <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
                    <div>Total rows: {summary.total}</div>
                    <div>Valid rows: {summary.validCount}</div>
                    <div>Duplicates: {summary.duplicateCount}</div>
                    <div>Errors: {summary.errorCount}</div>
                  </div>

                  {mappingErrors.length > 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Map required fields before importing.
                    </div>
                  ) : null}

                  {parsedRows.length > 0 ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold">Preview (first 10 rows)</div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Row</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parsedRows.slice(0, 10).map((row) => (
                            <TableRow key={row.index}>
                              <TableCell>{row.index}</TableCell>
                              <TableCell>{row.data?.name || '-'}</TableCell>
                              <TableCell>{row.data?.address || '-'}</TableCell>
                              <TableCell>
                                {row.errors.length > 0
                                  ? row.errors.join(', ')
                                  : row.duplicate
                                  ? 'Duplicate'
                                  : 'Ready'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleImport(true)}
                      disabled={!canImport || isImporting}
                    >
                      {isImporting ? 'Running...' : 'Dry Run'}
                    </Button>
                    <Button
                      onClick={() => handleImport(false)}
                      disabled={!canImport || isImporting}
                    >
                      {isImporting ? 'Importing...' : 'Import Customers'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </TabsContent>
          ) : null}
          {isAdmin ? (
            <TabsContent value="google" className="space-y-6">
              <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
                Connect Google Sheets to pull a sheet and reuse the import mapping.
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge
                  variant="secondary"
                  className={googleSheetsConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}
                >
                  {googleSheetsConnected ? 'Connected' : 'Not connected'}
                </Badge>
                <Button
                  variant="outline"
                  onClick={handleGoogleConnect}
                  disabled={isConnecting}
                >
                  {isConnecting ? 'Connecting...' : googleSheetsConnected ? 'Reconnect' : 'Connect Google Sheets'}
                </Button>
                {googleSheetsConnected ? (
                  <Button
                    variant="outline"
                    onClick={handleGoogleDisconnect}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Spreadsheet URL or ID</Label>
                  <Input
                    value={sheetUrl}
                    onChange={(event) => setSheetUrl(event.target.value)}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sheet name (optional)</Label>
                  <Input
                    value={sheetName}
                    onChange={(event) => setSheetName(event.target.value)}
                    placeholder="Sheet1"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleLoadGoogleSheet}
                  disabled={!googleSheetsConnected || isLoadingSheet}
                >
                  {isLoadingSheet ? 'Loading...' : 'Load sheet'}
                </Button>
                {loadedSheetName ? (
                  <span className="text-xs text-muted-foreground">Loaded: {loadedSheetName}</span>
                ) : null}
              </div>

              <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
                After loading, switch to Import to map fields and run a dry run.
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
