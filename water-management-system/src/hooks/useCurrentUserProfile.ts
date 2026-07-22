import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoBusinessProfile, demoEmployees } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export interface CurrentUserProfile {
  name: string
  role: string
  email: string | null
  isOnline: boolean
  businessName: string | null
}

export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<CurrentUserProfile>({
    name: 'Operations User',
    role: 'Staff',
    email: null,
    isOnline: true,
    businessName: null,
  })

  const load = useCallback(async () => {
    if (isDemoRuntime()) {
      const demoUser = demoEmployees[0]
      setProfile({
        name: demoUser.name,
        role: demoUser.roles.name,
        email: demoUser.email,
        isOnline: true,
        businessName: demoBusinessProfile.business_name,
      })
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setProfile({ name: 'Guest', role: 'Viewer', email: null, isOnline: false, businessName: null })
      return
    }

    const email = user.email ?? null
    const defaultName =
      (user.user_metadata?.full_name as string | undefined) ||
      email?.split('@')[0] ||
      'User'

    const { data: appProfile } = await supabase
      .from('profiles')
      .select('full_name, role, businesses(name)')
      .eq('id', user.id)
      .maybeSingle()

    const profileName = (appProfile as { full_name?: string } | null)?.full_name
    const profileRole = (appProfile as { role?: string } | null)?.role
    const profileBusiness =
      ((appProfile as { businesses?: { name?: string } | null } | null)?.businesses?.name ?? null)

    let employeeName: string | null = null
    let employeeRole: string | null = null

    if (!profileName || !profileRole) {
      const { data: employee } = await supabase
        .from('employees')
        .select('name, roles(name)')
        .eq('email', email)
        .maybeSingle()

      employeeName = (employee as { name?: string } | null)?.name ?? null
      employeeRole = (employee as { roles?: { name?: string } | null } | null)?.roles?.name ?? null
    }

    setProfile({
      name: profileName ?? employeeName ?? defaultName,
      role: profileRole ?? employeeRole ?? 'Staff',
      email,
      isOnline: true,
      businessName: profileBusiness,
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { profile, refresh: load }
}
