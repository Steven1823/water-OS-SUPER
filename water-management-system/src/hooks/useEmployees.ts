import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoEmployees } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export function useEmployees() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoRuntime()) {
        setData(demoEmployees)
        setError(null)
        return
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*, roles(id,name)')
        .order('name')

      if (error) throw error
      const normalized = (data || []).map((row: any) => ({
        ...row,
        roles: Array.isArray(row.roles) ? row.roles[0] : row.roles,
      }))
      setData(normalized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load employees')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
