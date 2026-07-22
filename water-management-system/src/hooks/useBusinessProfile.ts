import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoBusinessProfile } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export interface BusinessProfile {
  id: string
  business_name: string
  tagline: string | null
  logo_url: string | null
  currency_code: string
  updated_at?: string
}

export function useBusinessProfile() {
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)

    if (isDemoRuntime()) {
      setProfile(demoBusinessProfile)
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('business_profiles')
      .select('id, business_name, tagline, logo_url, currency_code, updated_at')
      .limit(1)
      .maybeSingle()

    if (data) {
      setProfile(data as BusinessProfile)
    } else {
      setProfile(null)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { profile, loading, refresh: load }
}
