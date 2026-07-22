import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoRoles } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export function useRoles() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoRuntime()) {
        setData(demoRoles)
        setError(null)
        return
      }

      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description, permissions')
        .order('name')

      if (error) throw error
      setData(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
