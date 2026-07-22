import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoEmployees } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export interface CurrentUserProfile {
  name: string
  role: string
  email: string | null
  isOnline: boolean
}

export function useCurrentUserProfile() {
  const [profile, setProfile] = useState<CurrentUserProfile>({
    name: 'Operations User',
    role: 'Staff',
    email: null,
    isOnline: true,
  })

  const load = useCallback(async () => {
    if (isDemoRuntime()) {
      const demoUser = demoEmployees[0]
      setProfile({
        name: demoUser.name,
        role: demoUser.roles.name,
        email: demoUser.email,
        isOnline: true,
      })
      return
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      setProfile({ name: 'Guest', role: 'Viewer', email: null, isOnline: false })
      return
    }

    const email = user.email ?? null
    const defaultName =
      (user.user_metadata?.full_name as string | undefined) ||
      email?.split('@')[0] ||
      'User'

    const { data: employee } = await supabase
      .from('employees')
      .select('name, roles(name)')
      .eq('email', email)
      .maybeSingle()

    setProfile({
      name: employee?.name ?? defaultName,
      role: (employee as any)?.roles?.name ?? 'Staff',
      email,
      isOnline: true,
    })
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { profile, refresh: load }
}
