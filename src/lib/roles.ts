import { createClient } from '@/lib/supabase/server'

export type UserRole = 'admin' | 'staff'

type RoleResult = {
  role: UserRole
  userId: string | null
}

export async function getUserRole(): Promise<RoleResult> {
  if (process.env.SUPABASE_AUTH_DISABLED === 'true') {
    return { role: 'admin', userId: null }
  }

  const supabase = await createClient()
  const { data, error: userError } = await supabase.auth.getUser()

  if (userError) {
    console.error('Auth user lookup failed:', userError)
  }

  const user = data.user
  if (!user) {
    return { role: 'staff', userId: null }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Role lookup failed:', error)
    return { role: 'staff', userId: user.id }
  }

  return { role: profile?.role === 'admin' ? 'admin' : 'staff', userId: user.id }
}

export async function requireAdmin() {
  const { role } = await getUserRole()
  if (role !== 'admin') {
    return { ok: false, error: 'Admin access required.' }
  }
  return { ok: true }
}
