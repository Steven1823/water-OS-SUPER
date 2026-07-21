import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface Payment {
  id: string
  bill_id: string
  amount: number
  method: 'mpesa' | 'cash' | 'bank_transfer' | 'cheque' | 'other'
  paid_at: string
  receipt_number?: string
  notes?: string
  created_at: string
  bills?: {
    id: string
    customer_id: string
    amount: number
    status: string
  }
}

export function usePayments(billId?: string) {
  const [data, setData] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('payments')
        .select(
          `
          id,
          bill_id,
          amount,
          method,
          paid_at,
          receipt_number,
          notes,
          created_at,
          bills (
            id,
            customer_id,
            amount,
            status
          )
        `
        )
        .order('paid_at', { ascending: false })

      if (billId) {
        query = query.eq('bill_id', billId)
      }

      const { data, error } = await query

      if (error) throw error
      setData(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [billId])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('payments_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  return { data, loading, error, refresh: load }
}
