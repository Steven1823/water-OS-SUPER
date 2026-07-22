import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isDemoRuntime, shouldUseRealtime } from '../lib/runtimeMode'

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

function monthStartKey(value: string): string {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
}

function inCurrentMonth(value: string): boolean {
  const date = new Date(value)
  const now = new Date()
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
}

function isWithinDays(value: string, days: number): boolean {
  const date = new Date(value)
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return date >= cutoff
}

function queryError(label: string, err: unknown): Error {
  if (err && typeof err === 'object') {
    const maybe = err as { message?: string; details?: string; hint?: string; code?: string }
    const parts = [maybe.message, maybe.details, maybe.hint, maybe.code].filter(Boolean)
    return new Error(`${label}: ${parts.join(' | ') || 'unknown error'}`)
  }
  if (err instanceof Error) {
    return new Error(`${label}: ${err.message}`)
  }
  return new Error(`${label}: unknown error`)
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

  const loadFromBaseTables = useCallback(async () => {
    const [customersRes, metersRes, billsRes, paymentsRes] = await Promise.all([
      supabase.from('customers').select('created_at, status'),
      supabase.from('meters').select('status'),
      supabase.from('bills').select('status, due_date, liters_billed, period_end, created_at'),
      supabase.from('payments').select('amount, method, paid_at'),
    ])

    if (customersRes.error) throw queryError('customers', customersRes.error)
    if (metersRes.error) throw queryError('meters', metersRes.error)
    if (billsRes.error) throw queryError('bills', billsRes.error)
    if (paymentsRes.error) throw queryError('payments', paymentsRes.error)

    const customers = customersRes.data || []
    const meters = metersRes.data || []
    const bills = billsRes.data || []
    const payments = paymentsRes.data || []

    const totalCustomers = customers.filter((row: any) => row.status === 'active').length
    const activeMeters = meters.filter((row: any) => row.status === 'active').length
    const billsGeneratedThisMonth = bills.filter(
      (row: any) =>
        inCurrentMonth(row.created_at) && ['pending', 'partial', 'overdue'].includes(row.status)
    ).length
    const paymentsThisMonth = payments.filter((row: any) => inCurrentMonth(row.paid_at)).length
    const pendingBills = bills.filter(
      (row: any) =>
        ['pending', 'overdue'].includes(row.status) && new Date(row.due_date) < new Date()
    ).length
    const waterThisMonth = bills
      .filter((row: any) => inCurrentMonth(row.period_end))
      .reduce((acc: number, row: any) => acc + Number(row.liters_billed || 0), 0)

    const revenueMap = new Map<string, number>()
    payments
      .filter((row: any) => isWithinDays(row.paid_at, 365))
      .forEach((row: any) => {
        const key = monthStartKey(row.paid_at)
        revenueMap.set(key, (revenueMap.get(key) || 0) + Number(row.amount || 0))
      })

    const consumptionMap = new Map<string, number>()
    bills
      .filter((row: any) => isWithinDays(row.period_end, 365))
      .forEach((row: any) => {
        const key = monthStartKey(row.period_end)
        consumptionMap.set(key, (consumptionMap.get(key) || 0) + Number(row.liters_billed || 0))
      })

    const billStatusMap = new Map<string, number>()
    bills
      .filter((row: any) => isWithinDays(row.created_at, 30))
      .forEach((row: any) => {
        billStatusMap.set(row.status, (billStatusMap.get(row.status) || 0) + 1)
      })

    const paymentMethodMap = new Map<string, { count: number; total_amount: number }>()
    payments
      .filter((row: any) => isWithinDays(row.paid_at, 30))
      .forEach((row: any) => {
        const current = paymentMethodMap.get(row.method) || { count: 0, total_amount: 0 }
        paymentMethodMap.set(row.method, {
          count: current.count + 1,
          total_amount: current.total_amount + Number(row.amount || 0),
        })
      })

    const customerGrowthMap = new Map<string, number>()
    customers
      .filter((row: any) => isWithinDays(row.created_at, 365))
      .forEach((row: any) => {
        const key = monthStartKey(row.created_at)
        customerGrowthMap.set(key, (customerGrowthMap.get(key) || 0) + 1)
      })

    const summaryData: DashboardSummary = {
      total_customers: totalCustomers,
      active_meters: activeMeters,
      bills_generated_this_month: billsGeneratedThisMonth,
      payments_received_this_month: paymentsThisMonth,
      pending_bills_count: pendingBills,
      total_water_consumption_this_month: waterThisMonth,
    }

    const revenueData: RevenueLast12Months[] = Array.from(revenueMap.entries())
      .map(([month, revenue]) => ({ month, revenue }))
      .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())

    const consumptionData: ConsumptionLast12Months[] = Array.from(consumptionMap.entries())
      .map(([month, total_liters]) => ({ month, total_liters }))
      .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())

    const billStatusData: BillStatusBreakdown[] = Array.from(billStatusMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)

    const paymentMethodData: PaymentMethodBreakdown[] = Array.from(paymentMethodMap.entries())
      .map(([method, data]) => ({ method, count: data.count, total_amount: data.total_amount }))
      .sort((a, b) => b.count - a.count)

    const customerGrowthData: CustomerGrowthLast12Months[] = Array.from(customerGrowthMap.entries())
      .map(([month, new_customers]) => ({ month, new_customers }))
      .sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime())

    setSummary(summaryData)
    setRevenue(revenueData)
    setConsumption(consumptionData)
    setBillStatus(billStatusData)
    setPaymentMethods(paymentMethodData)
    setCustomerGrowth(customerGrowthData)
    setError(null)
  }, [])

  const loadDemoFallback = useCallback(() => {
    const demoSummary: DashboardSummary = {
      total_customers: 128,
      active_meters: 94,
      bills_generated_this_month: 118,
      payments_received_this_month: 102,
      pending_bills_count: 16,
      total_water_consumption_this_month: 248760,
    }

    const demoRevenue: RevenueLast12Months[] = [
      { month: '2025-08-01', revenue: 184000 },
      { month: '2025-09-01', revenue: 202500 },
      { month: '2025-10-01', revenue: 217300 },
      { month: '2025-11-01', revenue: 231900 },
      { month: '2025-12-01', revenue: 246100 },
      { month: '2026-01-01', revenue: 254400 },
      { month: '2026-02-01', revenue: 239200 },
      { month: '2026-03-01', revenue: 261800 },
      { month: '2026-04-01', revenue: 278900 },
      { month: '2026-05-01', revenue: 283700 },
      { month: '2026-06-01', revenue: 291400 },
      { month: '2026-07-01', revenue: 308900 },
    ]

    const demoConsumption: ConsumptionLast12Months[] = [
      { month: '2025-08-01', total_liters: 165000 },
      { month: '2025-09-01', total_liters: 171500 },
      { month: '2025-10-01', total_liters: 176300 },
      { month: '2025-11-01', total_liters: 183100 },
      { month: '2025-12-01', total_liters: 191200 },
      { month: '2026-01-01', total_liters: 196800 },
      { month: '2026-02-01', total_liters: 189500 },
      { month: '2026-03-01', total_liters: 201100 },
      { month: '2026-04-01', total_liters: 208900 },
      { month: '2026-05-01', total_liters: 214700 },
      { month: '2026-06-01', total_liters: 221300 },
      { month: '2026-07-01', total_liters: 248760 },
    ]

    const demoBillStatus: BillStatusBreakdown[] = [
      { status: 'paid', count: 74 },
      { status: 'pending', count: 16 },
      { status: 'overdue', count: 18 },
      { status: 'partial', count: 10 },
    ]

    const demoPaymentMethods: PaymentMethodBreakdown[] = [
      { method: 'mpesa', count: 74, total_amount: 161200 },
      { method: 'cash', count: 18, total_amount: 26400 },
      { method: 'bank_transfer', count: 10, total_amount: 19800 },
    ]

    const demoCustomerGrowth: CustomerGrowthLast12Months[] = [
      { month: '2025-08-01', new_customers: 4 },
      { month: '2025-09-01', new_customers: 6 },
      { month: '2025-10-01', new_customers: 5 },
      { month: '2025-11-01', new_customers: 8 },
      { month: '2025-12-01', new_customers: 7 },
      { month: '2026-01-01', new_customers: 6 },
      { month: '2026-02-01', new_customers: 8 },
      { month: '2026-03-01', new_customers: 9 },
      { month: '2026-04-01', new_customers: 11 },
      { month: '2026-05-01', new_customers: 10 },
      { month: '2026-06-01', new_customers: 12 },
      { month: '2026-07-01', new_customers: 14 },
    ]

    setSummary(demoSummary)
    setRevenue(demoRevenue)
    setConsumption(demoConsumption)
    setBillStatus(demoBillStatus)
    setPaymentMethods(demoPaymentMethods)
    setCustomerGrowth(demoCustomerGrowth)
    setError(null)
  }, [])

  const load = useCallback(async () => {
    try {
      setLoading(true)

      if (isDemoRuntime()) {
        loadDemoFallback()
        setLoading(false)
        return
      }

      const [summaryRes, revenueRes, consumptionRes, billStatusRes, paymentMethodsRes, customerGrowthRes] =
        await Promise.all([
          supabase.from('v_dashboard_summary').select('*').limit(1).single(),
          supabase.from('v_revenue_last_12_months').select('*').order('month', { ascending: false }),
          supabase.from('v_consumption_last_12_months').select('*').order('month', { ascending: false }),
          supabase.from('v_bill_status_breakdown').select('*'),
          supabase.from('v_payment_method_breakdown').select('*'),
          supabase.from('v_customer_growth_last_12_months').select('*').order('month', { ascending: false })
        ])

      const viewErrors = [
        summaryRes.error,
        revenueRes.error,
        consumptionRes.error,
        billStatusRes.error,
        paymentMethodsRes.error,
        customerGrowthRes.error,
      ].filter(Boolean)

      const missingView = viewErrors.some((err: any) => err?.code === 'PGRST205')

      if (missingView) {
        await loadFromBaseTables()
        setLoading(false)
        return
      }

      if (summaryRes.error) throw queryError('v_dashboard_summary', summaryRes.error)
      if (revenueRes.error) throw queryError('v_revenue_last_12_months', revenueRes.error)
      if (consumptionRes.error) throw queryError('v_consumption_last_12_months', consumptionRes.error)
      if (billStatusRes.error) throw queryError('v_bill_status_breakdown', billStatusRes.error)
      if (paymentMethodsRes.error) throw queryError('v_payment_method_breakdown', paymentMethodsRes.error)
      if (customerGrowthRes.error) throw queryError('v_customer_growth_last_12_months', customerGrowthRes.error)

      setSummary(summaryRes.data || null)
      setRevenue(revenueRes.data || [])
      setConsumption(consumptionRes.data || [])
      setBillStatus(billStatusRes.data || [])
      setPaymentMethods(paymentMethodsRes.data || [])
      setCustomerGrowth(customerGrowthRes.data || [])
      setError(null)
    } catch (err) {
      if (isDemoRuntime()) {
        loadDemoFallback()
        return
      }

      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Failed to load dashboard metrics')
      }
    } finally {
      setLoading(false)
    }
  }, [loadDemoFallback, loadFromBaseTables])

  useEffect(() => {
    load()

    if (!shouldUseRealtime()) {
      return
    }

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
