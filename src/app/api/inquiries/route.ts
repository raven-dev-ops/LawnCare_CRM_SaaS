import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyRecaptchaToken } from '@/lib/recaptcha'
import { getSettings } from '@/lib/settings'
import { sendInquiryNotifications } from '@/lib/notifications'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { z } from 'zod'

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000 // 5 minutes
const RATE_LIMIT_MAX_REQUESTS = 10
const recaptchaMinScoreRaw = Number(process.env.RECAPTCHA_MIN_SCORE)
const RECAPTCHA_MIN_SCORE = Number.isFinite(recaptchaMinScoreRaw)
  ? recaptchaMinScoreRaw
  : 0.5
const MAX_SERVICES = 12

const InquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().trim().min(1).max(200),
  propertyType: z.enum(['Residential', 'Commercial', 'Other']).optional().nullable(),
  lotSize: z.string().trim().max(120).optional().nullable(),
  servicesInterested: z
    .array(z.string().trim().max(60))
    .max(MAX_SERVICES)
    .optional()
    .nullable(),
  preferredContactMethod: z
    .enum(['email', 'phone', 'text'])
    .optional()
    .nullable(),
  preferredContactTime: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  recaptchaToken: z.string().optional().nullable(),
  honeypot: z.string().max(200).optional().nullable(),
})

type RateLimitResult = {
  limited: boolean
  retryAfterMs?: number
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || null
  }
  const realIp = request.headers.get('x-real-ip')
  return realIp || null
}

function logBlockedSubmission(payload: {
  reason: string
  ip: string | null
  details?: Record<string, unknown>
}) {
  console.warn(
    JSON.stringify({
      event: 'inquiry_blocked',
      timestamp: new Date().toISOString(),
      ...payload,
    })
  )
}

function getServiceSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return null
  }

  return createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

async function checkRateLimit(ip: string | null): Promise<RateLimitResult> {
  if (!ip) {
    return { limited: false }
  }

  const service = getServiceSupabase()
  if (!service) {
    console.error('Rate limit unavailable: SUPABASE_SERVICE_ROLE_KEY missing')
    return { limited: true, retryAfterMs: RATE_LIMIT_WINDOW_MS }
  }

  const now = new Date()
  const nowIso = now.toISOString()

  const { data, error } = await service
    .from('inquiry_rate_limits')
    .select('window_start, request_count')
    .eq('ip', ip)
    .maybeSingle()

  if (error) {
    console.error('Rate limit lookup failed:', error)
    return { limited: false }
  }

  if (!data) {
    const { error: insertError } = await service
      .from('inquiry_rate_limits')
      .insert({
        ip,
        window_start: nowIso,
        request_count: 1,
      })

    if (insertError) {
      console.error('Rate limit insert failed:', insertError)
    }

    return { limited: false }
  }

  const windowStartMs = new Date(data.window_start).getTime()
  const nowMs = now.getTime()
  const elapsed = nowMs - windowStartMs

  if (Number.isNaN(windowStartMs) || elapsed >= RATE_LIMIT_WINDOW_MS) {
    const { error: resetError } = await service
      .from('inquiry_rate_limits')
      .update({
        window_start: nowIso,
        request_count: 1,
      })
      .eq('ip', ip)

    if (resetError) {
      console.error('Rate limit reset failed:', resetError)
    }

    return { limited: false }
  }

  if (data.request_count >= RATE_LIMIT_MAX_REQUESTS) {
    return { limited: true, retryAfterMs: RATE_LIMIT_WINDOW_MS - elapsed }
  }

  const { error: updateError } = await service
    .from('inquiry_rate_limits')
    .update({ request_count: data.request_count + 1 })
    .eq('ip', ip)

  if (updateError) {
    console.error('Rate limit update failed:', updateError)
  }

  return { limited: false }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  const body = await request.json().catch(() => null)

  if (!body) {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const parsed = InquirySchema.safeParse(body)
  if (!parsed.success) {
    console.warn(
      JSON.stringify({
        event: 'inquiry_validation_failed',
        timestamp: new Date().toISOString(),
        ip,
        issues: parsed.error.flatten().fieldErrors,
      })
    )
    return NextResponse.json({ error: 'Invalid submission.' }, { status: 400 })
  }

  const rateLimit = await checkRateLimit(ip)
  if (rateLimit.limited) {
    logBlockedSubmission({
      reason: 'rate_limit',
      ip,
      details: {
        windowMs: RATE_LIMIT_WINDOW_MS,
        maxRequests: RATE_LIMIT_MAX_REQUESTS,
        retryAfterMs: rateLimit.retryAfterMs,
      },
    })
    const retryAfterSeconds = rateLimit.retryAfterMs
      ? Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000))
      : undefined

    return NextResponse.json(
      { error: 'Too many submissions. Please try again later.' },
      {
        status: 429,
        headers: retryAfterSeconds
          ? { 'Retry-After': String(retryAfterSeconds) }
          : undefined,
      }
    )
  }

  const data = parsed.data
  const spamReasons: string[] = []
  let spamScore = 0

  const honeypotValue = data.honeypot?.trim()
  if (honeypotValue) {
    spamScore += 10
    spamReasons.push('honeypot')
  }

  const recaptchaResult = await verifyRecaptchaToken(data.recaptchaToken || undefined)
  if (recaptchaResult.enabled) {
    if (!recaptchaResult.ok) {
      spamScore += 5
      spamReasons.push('recaptcha_failed')
    }
    if (
      typeof recaptchaResult.score === 'number' &&
      recaptchaResult.score < RECAPTCHA_MIN_SCORE
    ) {
      spamScore += 2
      spamReasons.push('recaptcha_low_score')
    }
  }

  const notesText = data.notes?.toLowerCase() || ''
  if (notesText.includes('http://') || notesText.includes('https://')) {
    spamScore += 1
    spamReasons.push('link_in_notes')
  }

  if (spamScore >= 3) {
    logBlockedSubmission({
      reason: 'spam',
      ip,
      details: {
        spamScore,
        spamReasons,
        recaptchaScore: recaptchaResult.score,
      },
    })
    return NextResponse.json(
      { error: 'Unable to submit inquiry.' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const services = (data.servicesInterested || []).map((service) => service.trim()).filter(Boolean)
  const cleanedNotes = data.notes?.trim() || null
  const cleanedPhone = data.phone?.trim() || null
  const cleanedEmail = data.email.trim().toLowerCase()
  const cleanedLotSize = data.lotSize?.trim() || null
  const cleanedPreferredTime = data.preferredContactTime?.trim() || null

  const { error } = await supabase.from('inquiries').insert({
    name: data.name.trim(),
    email: cleanedEmail,
    phone: cleanedPhone,
    address: data.address.trim(),
    property_type: data.propertyType || null,
    lot_size: cleanedLotSize,
    services_interested: services.length > 0 ? services : null,
    preferred_contact_method: data.preferredContactMethod || null,
    preferred_contact_time: cleanedPreferredTime,
    status: 'pending',
    notes: cleanedNotes,
    source: 'Website',
  })

  if (error) {
    console.error('Error inserting inquiry:', error)
    return NextResponse.json(
      { error: 'Failed to submit inquiry.' },
      { status: 500 }
    )
  }

  try {
    const settings = await getSettings()
    await sendInquiryNotifications(
      {
        name: data.name.trim(),
        email: cleanedEmail,
        phone: cleanedPhone,
        address: data.address.trim(),
        propertyType: data.propertyType || null,
        lotSize: cleanedLotSize,
        servicesInterested: services.length > 0 ? services : null,
        preferredContactMethod: data.preferredContactMethod || null,
        preferredContactTime: cleanedPreferredTime,
        notes: cleanedNotes,
      },
      settings
    )
  } catch (notifyError) {
    console.error('Inquiry notification error:', notifyError)
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
