import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoCustomers, demoMeters } from '../lib/demoData'
import { appendDemoCollection, readDemoCollection } from '../lib/demoMutableStore'
import { isDemoRuntime, shouldUseRealtime } from '../lib/runtimeMode'

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

export interface CreateMeterInput {
  serial_number: string
  customer_id: string
  install_date: string
  status?: 'active' | 'inactive' | 'faulty' | 'removed'
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export function useMeters(customerId?: string) {
  const [data, setData] = useState<Meter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)

      if (isDemoRuntime()) {
        const mutable = readDemoCollection<Meter>('meters')
        const full = [...mutable, ...(demoMeters as Meter[])]
        const filtered = customerId ? full.filter((meter) => meter.customer_id === customerId) : full
        setData(filtered as Meter[])
        setError(null)
        return
      }

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

      const normalized = (data || []).map((row: any) => ({
        ...row,
        customers: firstOrNull(row.customers),
      })) as Meter[]

      setData(normalized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meters')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => {
    load()

    if (!shouldUseRealtime()) {
      return
    }

    const channel = supabase
      .channel('meters_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meters' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const addMeter = useCallback(
    async (input: CreateMeterInput) => {
      try {
        if (isDemoRuntime()) {
          const now = new Date().toISOString()
          const demoCustomer = demoCustomers.find((customer) => customer.id === input.customer_id)
          const record: Meter = {
            id: `demo-meter-${crypto.randomUUID()}`,
            serial_number: input.serial_number,
            customer_id: input.customer_id,
            install_date: input.install_date,
            status: input.status || 'active',
            created_at: now,
            updated_at: now,
            customers: demoCustomer
              ? {
                  id: demoCustomer.id,
                  name: demoCustomer.name,
                  phone: demoCustomer.phone,
                }
              : undefined,
          }

          appendDemoCollection<Meter>('meters', record)
          await load()
          return { ok: true as const }
        }

        const { error } = await supabase.from('meters').insert({
          serial_number: input.serial_number,
          customer_id: input.customer_id,
          install_date: input.install_date,
          status: input.status || 'active',
        })

        if (error) throw error
        await load()
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : 'Failed to add meter' }
      }
    },
    [load]
  )

  return { data, loading, error, refresh: load, addMeter }
}
