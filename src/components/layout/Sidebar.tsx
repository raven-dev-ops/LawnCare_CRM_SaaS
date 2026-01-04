'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRole } from '@/components/auth/RoleProvider'
import {
  LayoutDashboard,
  Users,
  UserCog,
  MapPin,
  Calendar,
  Receipt,
  BarChart3,
  Settings,
  Inbox,
  LogIn,
  LogOut,
  Wrench,
  X,
} from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Crew', href: '/crew', icon: UserCog },
  { name: 'Services', href: '/services', icon: Wrench },
  { name: 'Routes', href: '/routes', icon: MapPin },
  { name: 'Schedule', href: '/schedule', icon: Calendar },
  { name: 'Invoices', href: '/invoices', icon: Receipt },
  { name: 'Inquiries', href: '/inquiries', icon: Inbox },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings, requiresAdmin: true },
]

interface SidebarProps {
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Sidebar({ isOpen = false, onOpenChange }: SidebarProps) {
  const pathname = usePathname() || '/'
  const router = useRouter()
  const { role, isAdmin, isLoading: isRoleLoading } = useRole()

  const [userName, setUserName] = useState<string>('')
  const [isLoadingUser, setIsLoadingUser] = useState(true)
  const [isSignedIn, setIsSignedIn] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user
      setUserName(user?.user_metadata?.full_name || user?.email || '')
      setIsSignedIn(Boolean(user))
      setIsLoadingUser(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      setUserName(user?.user_metadata?.full_name || user?.email || '')
      setIsSignedIn(Boolean(user))
      setIsLoadingUser(false)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  const initials = useMemo(() => {
    const name = userName.trim()
    if (!name) return '??'
    const parts = name.split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }, [userName])

  const roleLabel = isLoadingUser || isRoleLoading
    ? 'Checking role'
    : !isSignedIn
    ? 'Not signed in'
    : role === 'admin'
    ? 'Admin'
    : 'Staff'

  const handleSignOut = async () => {
    setIsSigningOut(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
      return
    }
    closeSidebar()
    router.push('/login')
    router.refresh()
  }

  const closeSidebar = () => onOpenChange?.(false)

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between gap-2 border-b border-slate-700 px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">GreenRoute</h1>
            <p className="text-xs text-slate-400">Lawn Care CRM</p>
          </div>
        </div>
        {onOpenChange ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden text-slate-200 hover:text-white hover:bg-slate-700/70"
            onClick={closeSidebar}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          if (item.requiresAdmin && !isAdmin) {
            return null
          }
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={closeSidebar}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 transition-all',
                  isActive
                    ? 'text-white'
                    : 'text-slate-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-3 rounded-lg bg-slate-700/50 p-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-sm font-bold text-white">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {isLoadingUser ? 'Loading...' : userName || 'Guest'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {isLoadingUser ? 'Checking session' : roleLabel}
            </p>
          </div>
        </div>
        <div className="mt-3">
          {isSignedIn ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start text-slate-200 hover:text-white hover:bg-slate-700/70"
              onClick={handleSignOut}
              disabled={isSigningOut}
            >
              <LogOut className="h-4 w-4" />
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start text-slate-200 hover:text-white hover:bg-slate-700/70"
            >
              <Link href="/login" onClick={closeSidebar}>
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  )

  const baseSidebarClass =
    'flex h-full flex-col bg-gradient-to-b from-slate-900 to-slate-800 border-r border-slate-700'

  return (
    <>
      <aside className={cn(baseSidebarClass, 'hidden w-64 md:flex')}>
        {sidebarContent}
      </aside>
      <div
        className={cn(
          'fixed inset-0 z-40 md:hidden',
          isOpen ? 'visible' : 'invisible pointer-events-none'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-black/50 transition-opacity',
            isOpen ? 'opacity-100' : 'opacity-0'
          )}
          onClick={closeSidebar}
          role="button"
          tabIndex={-1}
          aria-label="Close navigation overlay"
        />
        <aside
          className={cn(
            baseSidebarClass,
            'relative h-full w-72 max-w-[80%] transform transition-transform',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          {sidebarContent}
        </aside>
      </div>
    </>
  )
}
