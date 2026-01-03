const RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'

export async function verifyRecaptchaToken(token: string | undefined) {
  const secret = process.env.RECAPTCHA_SECRET_KEY

  if (!secret) {
    return { ok: true, score: null, enabled: false }
  }

  if (!token) {
    return { ok: false, score: null, enabled: true, error: 'missing_token' }
  }

  try {
    const params = new URLSearchParams()
    params.append('secret', secret)
    params.append('response', token)

    const res = await fetch(RECAPTCHA_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })

    if (!res.ok) {
      return { ok: false, score: null, enabled: true, error: 'verify_failed' }
    }

    const data = (await res.json()) as {
      success?: boolean
      score?: number
    }

    return {
      ok: !!data.success,
      score: typeof data.score === 'number' ? data.score : null,
      enabled: true,
    }
  } catch {
    return { ok: false, score: null, enabled: true, error: 'verify_error' }
  }
}
