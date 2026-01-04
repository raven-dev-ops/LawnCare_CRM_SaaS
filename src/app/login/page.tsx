import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LoginForm from '@/components/auth/LoginForm'

const DEFAULT_REDIRECT = '/'
const SUPABASE_AUTH_DISABLED = process.env.SUPABASE_AUTH_DISABLED === 'true'

type LoginPageProps = {
  searchParams?: Promise<{
    redirectedFrom?: string
    reason?: string
  }>
}

function getSafeRedirect(target?: string) {
  if (!target || !target.startsWith('/') || target.startsWith('//')) {
    return DEFAULT_REDIRECT
  }
  return target
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const redirectTo = getSafeRedirect(resolvedSearchParams?.redirectedFrom)

  if (!SUPABASE_AUTH_DISABLED) {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()

    if (data.user) {
      redirect(redirectTo)
    }
  }

  const message =
    resolvedSearchParams?.reason === 'auth-required'
      ? 'Please sign in to continue. Your session may have expired.'
      : undefined

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <LoginForm redirectTo={redirectTo} message={message} />
    </div>
  )
}

