import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoStockItems } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export function useStockItems() {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoRuntime()) {
        setData(demoStockItems)
        setError(null)
        return
      }

      const { data, error } = await supabase
        .from('stock_items')
        .select('*, suppliers(id,name)')
        .order('name')

      if (error) throw error
      const normalized = (data || []).map((row: any) => ({
        ...row,
        suppliers: Array.isArray(row.suppliers) ? row.suppliers[0] : row.suppliers,
      }))
      setData(normalized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stock items')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
