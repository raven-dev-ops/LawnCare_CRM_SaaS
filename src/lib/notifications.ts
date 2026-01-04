import type { SettingsValues } from '@/lib/settings'

interface InquiryNotificationPayload {
  name: string
  email: string
  phone: string | null
  address: string
  propertyType: string | null
  lotSize: string | null
  servicesInterested: string[] | null
  preferredContactMethod: string | null
  preferredContactTime: string | null
  notes: string | null
}

const DEFAULT_RETRY_ATTEMPTS = 2
const DEFAULT_RETRY_DELAY_MS = 500

async function withRetry<T>(
  action: () => Promise<T>,
  label: string,
  attempts = DEFAULT_RETRY_ATTEMPTS,
  delayMs = DEFAULT_RETRY_DELAY_MS
) {
  let lastError: unknown

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await action()
    } catch (error) {
      lastError = error
      console.error(`${label} attempt ${attempt} failed`, error)
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  throw lastError
}

function buildInquiryText(payload: InquiryNotificationPayload) {
  const lines = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.phone ? `Phone: ${payload.phone}` : null,
    `Address: ${payload.address}`,
    payload.propertyType ? `Property Type: ${payload.propertyType}` : null,
    payload.lotSize ? `Lot Size: ${payload.lotSize}` : null,
    payload.servicesInterested && payload.servicesInterested.length > 0
      ? `Services: ${payload.servicesInterested.join(', ')}`
      : null,
    payload.preferredContactMethod
      ? `Preferred Contact: ${payload.preferredContactMethod}`
      : null,
    payload.preferredContactTime
      ? `Preferred Time: ${payload.preferredContactTime}`
      : null,
    payload.notes ? `Notes: ${payload.notes}` : null,
  ].filter(Boolean)

  return lines.join('\n')
}

function buildInquirySms(payload: InquiryNotificationPayload) {
  const parts = [
    `New inquiry: ${payload.name}`,
    payload.phone || payload.email,
    payload.address,
  ].filter(Boolean)

  return parts.join(' - ').slice(0, 480)
}

async function sendSendGridEmail({
  toEmail,
  fromEmail,
  fromName,
  subject,
  text,
}: {
  toEmail: string
  fromEmail: string
  fromName: string
  subject: string
  text: string
}) {
  const apiKey = process.env.SENDGRID_API_KEY

  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is missing')
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: toEmail }],
        },
      ],
      from: {
        email: fromEmail,
        name: fromName,
      },
      subject,
      content: [
        {
          type: 'text/plain',
          value: text,
        },
      ],
    }),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`SendGrid error ${response.status}: ${details}`)
  }
}

async function sendTwilioSms({
  to,
  from,
  body,
}: {
  to: string
  from: string
  body: string
}) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN

  if (!accountSid || !authToken) {
    throw new Error('TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing')
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`
  const params = new URLSearchParams({
    To: to,
    From: from,
    Body: body,
  })

  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(`Twilio error ${response.status}: ${details}`)
  }
}

export async function sendInquiryNotifications(
  payload: InquiryNotificationPayload,
  settings: SettingsValues
) {
  const emailEnabled = settings.notifyNewInquiryEmail
  const smsEnabled = settings.notifyNewInquirySms

  const emailTo = process.env.INQUIRY_NOTIFICATION_EMAIL
  const smsTo = process.env.INQUIRY_NOTIFICATION_PHONE
  const sendGridFrom = process.env.SENDGRID_FROM_EMAIL
  const sendGridFromName =
    process.env.SENDGRID_FROM_NAME || settings.businessName
  const twilioFrom = process.env.TWILIO_FROM_NUMBER

  const subject = `New inquiry: ${payload.name}`
  const text = buildInquiryText(payload)
  const smsBody = buildInquirySms(payload)

  if (emailEnabled) {
    if (!emailTo || !sendGridFrom) {
      console.warn('Email notification skipped: missing email configuration')
    } else {
      try {
        await withRetry(
          () =>
            sendSendGridEmail({
              toEmail: emailTo,
              fromEmail: sendGridFrom,
              fromName: sendGridFromName,
              subject,
              text,
            }),
          'sendgrid_email'
        )
      } catch (error) {
        console.error('Email notification failed:', error)
      }
    }
  }

  if (smsEnabled) {
    if (!smsTo || !twilioFrom) {
      console.warn('SMS notification skipped: missing SMS configuration')
    } else {
      try {
        await withRetry(
          () => sendTwilioSms({ to: smsTo, from: twilioFrom, body: smsBody }),
          'twilio_sms'
        )
      } catch (error) {
        console.error('SMS notification failed:', error)
      }
    }
  }
}


