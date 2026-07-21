import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Meter {
  id: string
  serial_number: string
  customer_id: string
  machine_id?: string
  install_date: string
  status: 'active' | 'inactive' | 'faulty' | 'removed'
  created_at: string
  updated_at: string
  customers?: {
    id: string
    name: string
    phone?: string
  }
}

export function useMeters(customerId?: string) {
  const [data, setData] = useState<Meter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('meters')
        .select(
          `
          id,
          serial_number,
          customer_id,
          machine_id,
          install_date,
          status,
          created_at,
          updated_at,
          customers (
            id,
            name,
            phone
          )
        `
        )
        .order('created_at', { ascending: false })

      if (customerId) {
        query = query.eq('customer_id', customerId)
      }

      const { data, error } = await query

      if (error) throw error
      setData(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meters')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('meters_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meters' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  return { data, loading, error, refresh: load }
}
