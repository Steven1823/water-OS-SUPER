import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Bill {
  id: string
  customer_id: string
  meter_id: string
  period_start: string
  period_end: string
  liters_billed: number
  amount: number
  status: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  due_date: string
  notes?: string
  created_at: string
  updated_at: string
  customers?: {
    id: string
    name: string
  }
  meters?: {
    id: string
    serial_number: string
  }
}

export function useBills(customerId?: string, status?: string) {
  const [data, setData] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('bills')
        .select(
          `
          id,
          customer_id,
          meter_id,
          period_start,
          period_end,
          liters_billed,
          amount,
          status,
          due_date,
          notes,
          created_at,
          updated_at,
          customers (
            id,
            name
          ),
          meters (
            id,
            serial_number
          )
        `
        )
        .order('created_at', { ascending: false })

      if (customerId) {
        query = query.eq('customer_id', customerId)
      }
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error } = await query

      if (error) throw error
      setData(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills')
    } finally {
      setLoading(false)
    }
  }, [customerId, status])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('bills_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  return { data, loading, error, refresh: load }
}
