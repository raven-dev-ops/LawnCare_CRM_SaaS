import { google } from 'googleapis'

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || ''
const REDIRECT_URI = process.env.GOOGLE_SHEETS_REDIRECT_URI || ''

const SHEETS_SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

export function createGoogleSheetsOAuthClient() {
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
    return null
  }

  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export function getGoogleSheetsScopes() {
  return SHEETS_SCOPES
}

export function getSheetsClient(auth: InstanceType<typeof google.auth.OAuth2>) {
  return google.sheets({ version: 'v4', auth })
}
