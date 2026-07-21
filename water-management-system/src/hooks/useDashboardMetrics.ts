import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface DashboardSummary {
  total_customers: number
  active_meters: number
  bills_generated_this_month: number
  payments_received_this_month: number
  pending_bills_count: number
  total_water_consumption_this_month: number
}

export interface RevenueLast12Months {
  month: string
  revenue: number
}

export interface ConsumptionLast12Months {
  month: string
  total_liters: number
}

export interface BillStatusBreakdown {
  status: string
  count: number
}

export interface PaymentMethodBreakdown {
  method: string
  count: number
  total_amount: number
}

export interface CustomerGrowthLast12Months {
  month: string
  new_customers: number
}

export function useDashboardMetrics() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [revenue, setRevenue] = useState<RevenueLast12Months[]>([])
  const [consumption, setConsumption] = useState<ConsumptionLast12Months[]>([])
  const [billStatus, setBillStatus] = useState<BillStatusBreakdown[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdown[]>([])
  const [customerGrowth, setCustomerGrowth] = useState<CustomerGrowthLast12Months[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [summaryRes, revenueRes, consumptionRes, billStatusRes, paymentMethodsRes, customerGrowthRes] =
        await Promise.all([
          supabase.from('v_dashboard_summary').select('*').limit(1).single(),
          supabase.from('v_revenue_last_12_months').select('*').order('month', { ascending: false }),
          supabase.from('v_consumption_last_12_months').select('*').order('month', { ascending: false }),
          supabase.from('v_bill_status_breakdown').select('*'),
          supabase.from('v_payment_method_breakdown').select('*'),
          supabase.from('v_customer_growth_last_12_months').select('*').order('month', { ascending: false })
        ])

      if (summaryRes.error) throw summaryRes.error
      if (revenueRes.error) throw revenueRes.error
      if (consumptionRes.error) throw consumptionRes.error
      if (billStatusRes.error) throw billStatusRes.error
      if (paymentMethodsRes.error) throw paymentMethodsRes.error
      if (customerGrowthRes.error) throw customerGrowthRes.error

      setSummary(summaryRes.data || null)
      setRevenue(revenueRes.data || [])
      setConsumption(consumptionRes.data || [])
      setBillStatus(billStatusRes.data || [])
      setPaymentMethods(paymentMethodsRes.data || [])
      setCustomerGrowth(customerGrowthRes.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()

    // Subscribe to changes in related tables
    const billsChannel = supabase
      .channel('bills_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => load())
      .subscribe()

    const paymentsChannel = supabase
      .channel('payments_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => load())
      .subscribe()

    const customersChannel = supabase
      .channel('customers_dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(billsChannel)
      supabase.removeChannel(paymentsChannel)
      supabase.removeChannel(customersChannel)
    }
  }, [load])

  return { summary, revenue, consumption, billStatus, paymentMethods, customerGrowth, loading, error, refresh: load }
}
