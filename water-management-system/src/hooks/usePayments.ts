import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoBills, demoPayments } from '../lib/demoData'
import { appendDemoCollection, readDemoCollection } from '../lib/demoMutableStore'
import { isDemoRuntime, shouldUseRealtime } from '../lib/runtimeMode'

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

export interface CreatePaymentInput {
  bill_id: string
  amount: number
  method: 'mpesa' | 'cash' | 'bank_transfer' | 'cheque' | 'other'
  paid_at: string
  receipt_number?: string
  notes?: string
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export function usePayments(billId?: string) {
  const [data, setData] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)

      if (isDemoRuntime()) {
        const mutable = readDemoCollection<Payment>('payments')
        const all = [...mutable, ...(demoPayments as Payment[])]
        const filtered = billId ? all.filter((payment) => payment.bill_id === billId) : all
        setData(filtered as Payment[])
        setError(null)
        return
      }

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

      const normalized = (data || []).map((row: any) => ({
        ...row,
        bills: firstOrNull(row.bills),
      })) as Payment[]

      setData(normalized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payments')
    } finally {
      setLoading(false)
    }
  }, [billId])

  useEffect(() => {
    load()

    if (!shouldUseRealtime()) {
      return
    }

    const channel = supabase
      .channel('payments_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const addPayment = useCallback(
    async (input: CreatePaymentInput) => {
      try {
        if (isDemoRuntime()) {
          const now = new Date().toISOString()
          const bill = demoBills.find((item) => item.id === input.bill_id)
          const record: Payment = {
            id: `demo-payment-${crypto.randomUUID()}`,
            bill_id: input.bill_id,
            amount: input.amount,
            method: input.method,
            paid_at: input.paid_at,
            receipt_number: input.receipt_number,
            notes: input.notes,
            created_at: now,
            bills: bill
              ? { id: bill.id, customer_id: bill.customer_id, amount: bill.amount, status: bill.status }
              : undefined,
          }

          appendDemoCollection<Payment>('payments', record)
          await load()
          return { ok: true as const }
        }

        const { error } = await supabase.from('payments').insert({
          bill_id: input.bill_id,
          amount: input.amount,
          method: input.method,
          paid_at: input.paid_at,
          receipt_number: input.receipt_number || null,
          notes: input.notes || null,
        })

        if (error) throw error
        await load()
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : 'Failed to add payment' }
      }
    },
    [load]
  )

  return { data, loading, error, refresh: load, addPayment }
}
