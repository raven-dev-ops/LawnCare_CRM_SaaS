import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createGoogleSheetsOAuthClient } from '@/lib/google-sheets'

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  const redirectBase = `${APP_URL}/customers`

  if (error) {
    return NextResponse.redirect(`${redirectBase}?googleSheets=error`)
  }

  if (!code) {
    return NextResponse.redirect(`${redirectBase}?googleSheets=missing_code`)
  }

  const oauthClient = createGoogleSheetsOAuthClient()
  if (!oauthClient) {
    return NextResponse.redirect(`${redirectBase}?googleSheets=config_missing`)
  }

  const supabase = await createClient()
  const { data: authData } = await supabase.auth.getUser()
  const user = authData.user

  if (!user) {
    return NextResponse.redirect(`${redirectBase}?googleSheets=auth_required`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') {
    return NextResponse.redirect(`${redirectBase}?googleSheets=admin_required`)
  }

  const { data: existingTokens, error: tokensError } = await supabase
    .rpc('get_google_sheets_tokens')

  if (tokensError) {
    console.error('Google Sheets token fetch error:', tokensError)
  }

  const existing = Array.isArray(existingTokens) ? existingTokens[0] : existingTokens

  try {
    const { tokens } = await oauthClient.getToken(code)
    const refreshToken = tokens.refresh_token || existing?.refresh_token || null
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null

    const { error: upsertError } = await supabase
      .rpc('store_google_sheets_tokens', {
        access_token: tokens.access_token || null,
        refresh_token: refreshToken,
        scope: tokens.scope || null,
        token_type: tokens.token_type || null,
        expiry_date: expiryDate,
      })

    if (upsertError) {
      console.error('Google Sheets token upsert error:', upsertError)
      return NextResponse.redirect(`${redirectBase}?googleSheets=save_failed`)
    }
  } catch (tokenError) {
    console.error('Google Sheets token exchange error:', tokenError)
    return NextResponse.redirect(`${redirectBase}?googleSheets=token_error`)
  }

  return NextResponse.redirect(`${redirectBase}?googleSheets=connected`)
}
