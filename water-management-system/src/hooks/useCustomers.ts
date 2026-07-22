import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { demoCustomers, demoCustomerTypes } from '../lib/demoData'
import { appendDemoCollection, readDemoCollection } from '../lib/demoMutableStore'
import { isDemoRuntime, shouldUseRealtime } from '../lib/runtimeMode'

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

export interface CreateCustomerInput {
  name: string
  phone?: string
  email?: string
  address?: string
  customer_type_id: string
  status?: 'active' | 'inactive' | 'suspended'
}

function firstOrNull<T>(value: T | T[] | null | undefined): T | undefined {
  if (Array.isArray(value)) return value[0]
  return value ?? undefined
}

export function useCustomers() {
  const [data, setData] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)

      if (isDemoRuntime()) {
        const mutable = readDemoCollection<Customer>('customers')
        setData([...mutable, ...(demoCustomers as Customer[])])
        setError(null)
        return
      }

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

      const normalized = (data || []).map((row: any) => ({
        ...row,
        customer_types: firstOrNull(row.customer_types),
      })) as Customer[]

      setData(normalized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load customers')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    if (!shouldUseRealtime()) {
      return
    }

    const channel = supabase
      .channel('customers_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const addCustomer = useCallback(
    async (input: CreateCustomerInput) => {
      try {
        if (isDemoRuntime()) {
          const now = new Date().toISOString()
          const customerType = demoCustomerTypes.find((type) => type.id === input.customer_type_id)
          const record: Customer = {
            id: `demo-cust-${crypto.randomUUID()}`,
            name: input.name,
            phone: input.phone,
            email: input.email,
            address: input.address,
            customer_type_id: input.customer_type_id,
            status: input.status || 'active',
            created_at: now,
            updated_at: now,
            customer_types: customerType
              ? {
                  id: customerType.id,
                  name: customerType.name,
                  tariff_rate_per_liter: customerType.tariff_rate_per_liter,
                }
              : undefined,
          }

          appendDemoCollection<Customer>('customers', record)
          await load()
          return { ok: true as const }
        }

        const { error } = await supabase.from('customers').insert({
          name: input.name,
          phone: input.phone || null,
          email: input.email || null,
          address: input.address || null,
          customer_type_id: input.customer_type_id,
          status: input.status || 'active',
        })

        if (error) throw error
        await load()
        return { ok: true as const }
      } catch (err) {
        return { ok: false as const, error: err instanceof Error ? err.message : 'Failed to add customer' }
      }
    },
    [load]
  )

  return { data, loading, error, refresh: load, addCustomer }
}
