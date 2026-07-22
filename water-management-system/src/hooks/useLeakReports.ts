import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoLeakReports } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export function useLeakReports() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoRuntime()) {
        setData(demoLeakReports)
        setError(null)
        return
      }

      const { data, error } = await supabase
        .from('leak_reports')
        .select('*, machines(id,name), meters(id,serial_number)')
        .order('reported_at', { ascending: false })

      if (error) throw error
      const normalized = (data || []).map((row: any) => ({
        ...row,
        machines: Array.isArray(row.machines) ? row.machines[0] : row.machines,
        meters: Array.isArray(row.meters) ? row.meters[0] : row.meters,
      }))
      setData(normalized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leak reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
