import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoBills, demoCustomers, demoMeters } from '../lib/demoData'
import { appendDemoCollection, readDemoCollection } from '../lib/demoMutableStore'
import { isDemoRuntime, shouldUseRealtime } from '../lib/runtimeMode'

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

export interface CreateBillInput {
  customer_id: string
  meter_id: string
  period_start: string
  period_end: string
  liters_billed: number
  amount: number
  due_date: string
  status?: 'pending' | 'paid' | 'partial' | 'overdue' | 'cancelled'
  notes?: string
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export function useBills(customerId?: string, status?: string) {
  const [data, setData] = useState<Bill[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)

      if (isDemoRuntime()) {
        const mutable = readDemoCollection<Bill>('bills')
        let filtered = [...mutable, ...(demoBills as Bill[])]
        if (customerId) {
          filtered = filtered.filter((bill) => bill.customer_id === customerId)
        }
        if (status) {
          filtered = filtered.filter((bill) => bill.status === status)
        }
        setData(filtered as Bill[])
        setError(null)
        return
      }

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

      const normalized = (data || []).map((row: any) => ({
        ...row,
        customers: firstOrNull(row.customers),
        meters: firstOrNull(row.meters),
      })) as Bill[]

      setData(normalized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bills')
    } finally {
      setLoading(false)
    }
  }, [customerId, status])

  useEffect(() => {
    load()

    if (!shouldUseRealtime()) {
      return
    }

    const channel = supabase
      .channel('bills_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const addBill = useCallback(
    async (input: CreateBillInput) => {
      try {
        if (isDemoRuntime()) {
          const now = new Date().toISOString()
          const demoCustomer = demoCustomers.find((customer) => customer.id === input.customer_id)
          const demoMeter = demoMeters.find((meter) => meter.id === input.meter_id)
          const record: Bill = {
            id: `demo-bill-${crypto.randomUUID()}`,
            customer_id: input.customer_id,
            meter_id: input.meter_id,
            period_start: input.period_start,
            period_end: input.period_end,
            liters_billed: input.liters_billed,
            amount: input.amount,
            status: input.status || 'pending',
            due_date: input.due_date,
            notes: input.notes,
            created_at: now,
            updated_at: now,
            customers: demoCustomer ? { id: demoCustomer.id, name: demoCustomer.name } : undefined,
            meters: demoMeter ? { id: demoMeter.id, serial_number: demoMeter.serial_number } : undefined,
          }

          appendDemoCollection<Bill>('bills', record)
          await load()
          return { ok: true as const }
        }

        const { error } = await supabase.from('bills').insert({
          customer_id: input.customer_id,
          meter_id: input.meter_id,
          period_start: input.period_start,
          period_end: input.period_end,
          liters_billed: input.liters_billed,
          amount: input.amount,
          status: input.status || 'pending',
          due_date: input.due_date,
          notes: input.notes || null,
        })

        if (error) throw error
        await load()
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : 'Failed to add bill' }
      }
    },
    [load]
  )

  return { data, loading, error, refresh: load, addBill }
}
