'use server'

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/roles'
import { createGoogleSheetsOAuthClient, getGoogleSheetsScopes, getSheetsClient } from '@/lib/google-sheets'

interface FetchSheetInput {
  spreadsheetId: string
  sheetName?: string | null
}

export async function getGoogleSheetsAuthUrl() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const oauthClient = createGoogleSheetsOAuthClient()
  if (!oauthClient) {
    return { error: 'Missing Google Sheets OAuth configuration.' }
  }

  const url = oauthClient.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: getGoogleSheetsScopes(),
  })

  return { url }
}

export async function disconnectGoogleSheets() {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc('clear_google_sheets_connection')

  if (error) {
    console.error('Disconnect Google Sheets error:', error)
    return { error: 'Failed to disconnect Google Sheets.' }
  }

  return { success: true }
}

export async function fetchGoogleSheetPreview(input: FetchSheetInput) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.ok) {
    return { error: adminCheck.error }
  }

  const oauthClient = createGoogleSheetsOAuthClient()
  if (!oauthClient) {
    return { error: 'Missing Google Sheets OAuth configuration.' }
  }

  const supabase = await createClient()
  const { data: tokenRows, error: connectionError } = await supabase.rpc('get_google_sheets_tokens')

  if (connectionError) {
    console.error('Fetch Google Sheets connection error:', connectionError)
  }

  const connection = Array.isArray(tokenRows) ? tokenRows[0] : tokenRows

  if (!connection?.access_token) {
    return { error: 'Connect Google Sheets before importing.' }
  }

  oauthClient.setCredentials({
    access_token: connection.access_token || undefined,
    refresh_token: connection.refresh_token || undefined,
    scope: connection.scope || undefined,
    token_type: connection.token_type || undefined,
    expiry_date: connection.expiry_date ? new Date(connection.expiry_date).getTime() : undefined,
  })

  const sheets = getSheetsClient(oauthClient)

  let sheetName = input.sheetName?.trim() || ''
  if (!sheetName) {
    const metadata = await sheets.spreadsheets.get({ spreadsheetId: input.spreadsheetId })
    sheetName = metadata.data.sheets?.[0]?.properties?.title || ''
  }

  if (!sheetName) {
    return { error: 'Unable to determine a sheet name. Provide one in the form.' }
  }

  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: input.spreadsheetId,
    range: sheetName,
  })

  const values = valuesResponse.data.values || []
  if (values.length === 0) {
    return { error: 'Sheet is empty or inaccessible.' }
  }

  const maxRows = 500
  const limited = values.slice(0, maxRows + 1)
  const [headers, ...rows] = limited

  return {
    headers: headers.map((cell) => String(cell ?? '')),
    rows: rows.map((row) => row.map((cell) => String(cell ?? ''))),
    sheetName,
  }
}
