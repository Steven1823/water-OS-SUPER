import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
  customer_type_id: string
  status: 'active' | 'inactive' | 'suspended'
  created_at: string
  updated_at: string
  customer_types?: {
    id: string
    name: string
    tariff_rate_per_liter: number
  }
}

export function useCustomers() {
  const [data, setData] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('customers')
        .select(
          `
          id,
          name,
          phone,
          email,
          address,
          customer_type_id,
          status,
          created_at,
          updated_at,
          customer_types (
            id,
            name,
            tariff_rate_per_liter
          )
        `
        )
        .order('created_at', { ascending: false })

      if (error) throw error
      setData(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('customers_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  return { data, loading, error, refresh: load }
}
