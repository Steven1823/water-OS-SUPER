import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoCustomerTypes } from '../lib/demoData'
import { isDemoRuntime } from '../lib/runtimeMode'

export interface CustomerTypeRecord {
  id: string
  name: string
  tariff_rate_per_liter: number
  description?: string | null
}

export function useCustomerTypes() {
  const [data, setData] = useState<CustomerTypeRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoRuntime()) {
        setData(demoCustomerTypes as CustomerTypeRecord[])
        setError(null)
        return
      }

      const { data, error } = await supabase
        .from('customer_types')
        .select('id, name, tariff_rate_per_liter, description')
        .order('name')

      if (error) throw error
      setData((data || []) as CustomerTypeRecord[])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customer types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, refresh: load }
}
