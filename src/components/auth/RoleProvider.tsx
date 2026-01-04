'use client'

import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type UserRole = 'admin' | 'staff'

const SUPABASE_AUTH_DISABLED =
  process.env.NEXT_PUBLIC_SUPABASE_AUTH_DISABLED === 'true'

type RoleContextValue = {
  role: UserRole
  isAdmin: boolean
  isLoading: boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole>('staff')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (SUPABASE_AUTH_DISABLED) {
      setRole('admin')
      setIsLoading(false)
      return
    }

    const supabase = createClient()

    const loadRole = async (userId: string | null) => {
      setIsLoading(true)
      if (!userId) {
        setRole('staff')
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        console.error('Role lookup failed:', error)
        setRole('staff')
      } else if (data?.role === 'admin') {
        setRole('admin')
      } else {
        setRole('staff')
      }

      setIsLoading(false)
    }

    supabase.auth.getUser().then(({ data }) => {
      loadRole(data.user?.id ?? null)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      loadRole(session?.user?.id ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      role,
      isAdmin: role === 'admin',
      isLoading,
    }),
    [role, isLoading]
  )

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  return (
    context ?? {
      role: 'staff' as const,
      isAdmin: false,
      isLoading: true,
    }
  )
}
