import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { StatCard } from '../components/StatCard'
import { useCurrentUserProfile } from '../hooks/useCurrentUserProfile'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../styles/dashboard.css'

export function DashboardPage() {
  const navigate = useNavigate()
  const { summary, revenue, consumption, billStatus, paymentMethods, customerGrowth, loading, error } = useDashboardMetrics()
  const { profile } = useCurrentUserProfile()
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())

  if (loading) {
    return (
      <div className="dashboard-container">
        <section className="kpi-section">
          <h2>Operational KPIs</h2>
          <div className="kpi-grid" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="dashboard-skeleton" />
            ))}
          </div>
        </section>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="dashboard-container">
        <p className="dashboard-message error-message">Failed to load dashboard: {error}</p>
      </div>
    )
  }

  const COLORS = ['#0891b2', '#14b8a6', '#f59e0b', '#ef4444', '#1d4ed8']

  const totalRevenue = revenue.reduce((acc, row) => acc + Number(row.revenue ?? 0), 0)
  const trendClass = summary.pending_bills_count > 20 ? 'delta-down' : 'delta-up'

  const availableYears = Array.from(
    new Set(
      [...revenue, ...consumption].map((row) => new Date(row.month).getFullYear()).filter((value) => !Number.isNaN(value))
    )
  ).sort((a, b) => b - a)

  const byYear = <T extends { month: string }>(rows: T[]) =>
    rows.filter((row) => new Date(row.month).getFullYear() === selectedYear)

  const formatMonth = (value: string) =>
    new Date(value).toLocaleDateString(undefined, { month: 'short' })

  const filteredRevenue = byYear(revenue).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  const filteredConsumption = byYear(consumption).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
  const filteredGrowth = byYear(customerGrowth).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

  const growthCurrent = filteredGrowth[filteredGrowth.length - 1]?.new_customers ?? 0
  const growthPrevious = filteredGrowth[filteredGrowth.length - 2]?.new_customers ?? 0

  const totalBillStatuses = billStatus.reduce((acc, item) => acc + item.count, 0)
  const billStatusPct = billStatus.map((item) => ({
    ...item,
    pct: totalBillStatuses > 0 ? Math.round((item.count / totalBillStatuses) * 100) : 0,
  }))

  const totalPaymentMethods = paymentMethods.reduce((acc, item) => acc + item.count, 0)
  const paymentMethodPct = paymentMethods.map((item) => ({
    ...item,
    pct: totalPaymentMethods > 0 ? Math.round((item.count / totalPaymentMethods) * 100) : 0,
  }))

  const kpis = [
    {
      label: 'Total Customers',
      value: summary.total_customers,
      delta: growthPrevious > 0 ? Math.round(((growthCurrent - growthPrevious) / growthPrevious) * 100) : growthCurrent > 0 ? 100 : 0,
      icon: 'C',
      accent: 'flow' as const,
    },
    {
      label: 'Active Meters',
      value: summary.active_meters,
      delta:
        summary.total_customers > 0
          ? Math.round((summary.active_meters / summary.total_customers) * 100) - 100
          : 0,
      icon: 'T',
      accent: 'flow' as const,
    },
    {
      label: 'Bills This Month',
      value: summary.bills_generated_this_month,
      delta:
        summary.total_customers > 0
          ? Math.round((summary.bills_generated_this_month / summary.total_customers) * 100) - 100
          : 0,
      icon: 'B',
      accent: 'amber' as const,
    },
    {
      label: 'Payments Received',
      value: summary.payments_received_this_month,
      delta:
        summary.bills_generated_this_month > 0
          ? Math.round((summary.payments_received_this_month / summary.bills_generated_this_month) * 100) - 100
          : 0,
      icon: 'P',
      accent: 'flow' as const,
    },
    {
      label: 'Pending Bills',
      value: summary.pending_bills_count,
      delta:
        summary.bills_generated_this_month > 0
          ? Math.round((summary.pending_bills_count / summary.bills_generated_this_month) * 100)
          : 0,
      icon: '!',
      accent: 'danger' as const,
    },
    {
      label: 'Water Consumption',
      value: summary.total_water_consumption_this_month.toLocaleString(),
      delta:
        filteredConsumption.length > 1
          ? Math.round(
              ((filteredConsumption[filteredConsumption.length - 1].total_liters -
                filteredConsumption[filteredConsumption.length - 2].total_liters) /
                Math.max(filteredConsumption[filteredConsumption.length - 2].total_liters, 1)) *
                100
            )
          : 0,
      icon: 'W',
      unit: 'L',
      accent: 'flow' as const,
    },
  ]

  const firstName = profile.name.split(' ')[0]

  return (
    <div className="dashboard-container">
      <section className="dashboard-overview">
        <div className="overview-card">
          <p className="overview-greeting">Welcome back, {firstName}</p>
          <p className="overview-title">Current Month Revenue</p>
          <div className="overview-main">
            <span className="overview-value">KES {totalRevenue.toLocaleString()}</span>
          </div>
          <p className="overview-sub">Payments captured this month: {summary.payments_received_this_month}</p>
          <span className={trendClass}>
            {summary.pending_bills_count > 20 ? 'Outstanding bills rising' : 'Collection performance stable'}
          </span>
        </div>

        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <p className="chart-subtitle">Common operations for daily utility control</p>
          <div className="quick-list">
            <button type="button" onClick={() => navigate('/customers')}>Add Customer</button>
            <button type="button" onClick={() => navigate('/readings')}>Record Meter Reading</button>
            <button type="button" onClick={() => navigate('/generate-bills')}>Generate Bills</button>
            <button type="button" onClick={() => navigate('/receive-payment')}>Receive Payment</button>
            <button type="button" onClick={() => navigate('/reports')}>Open Reports</button>
            <button type="button" onClick={() => navigate('/leak-reports')}>Leak Reports</button>
          </div>
        </div>
      </section>

      <section className="kpi-section">
        <h2>Operational KPIs</h2>
        <div className="kpi-grid">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="kpi-card-wrap">
              <StatCard label={kpi.label} value={kpi.value} icon={kpi.icon} unit={kpi.unit} accent={kpi.accent} />
              <p className={`kpi-delta ${kpi.delta >= 0 ? 'up' : 'down'}`}>{kpi.delta >= 0 ? '+' : ''}{kpi.delta}% vs previous period</p>
            </div>
          ))}
        </div>
      </section>

      <section className="analytics-grid">
        <div className="chart-stack">
          <div className="chart-container">
            <h3>Revenue Trend</h3>
            <p className="chart-subtitle">Monthly revenue trajectory over the last 12 months</p>
            <div className="chart-filter-row">
              <label htmlFor="revenue-year">Year</label>
              <select id="revenue-year" value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))}>
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {filteredRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={filteredRevenue.map((row) => ({ ...row, label: formatMonth(row.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" />
                  <YAxis stroke="var(--text-dim)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: '1px solid var(--line-soft)', color: 'var(--text-primary)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="var(--flow)" strokeWidth={2.5} dot={{ fill: 'var(--flow)' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-message">No revenue data available</div>
            )}
          </div>

          <div className="chart-container">
            <h3>Water Consumption Trend</h3>
            <p className="chart-subtitle">Monthly distributed liters</p>
            {filteredConsumption.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={filteredConsumption.map((row) => ({ ...row, label: formatMonth(row.month) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--line-soft)" />
                  <XAxis dataKey="label" stroke="var(--text-dim)" />
                  <YAxis stroke="var(--text-dim)" />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: '1px solid var(--line-soft)', color: 'var(--text-primary)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="total_liters" name="Liters" stroke="#22c55e" strokeWidth={2.5} dot={{ fill: '#22c55e' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-message">No consumption data available</div>
            )}
          </div>
        </div>

        <div className="chart-stack">
          <div className="chart-container">
            <h3>Bill Status Distribution</h3>
            <p className="chart-subtitle">Current receivables profile</p>
            {billStatusPct.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie dataKey="count" data={billStatusPct} cx="50%" cy="50%" labelLine={false} label={({ name, payload }) => `${name}: ${payload.pct}%`} outerRadius={88}>
                    {billStatusPct.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: '1px solid var(--line-soft)', color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-message">No bill status data available</div>
            )}
          </div>

          <div className="chart-container">
            <h3>Payment Methods</h3>
            <p className="chart-subtitle">Payment method share by transaction count</p>
            {paymentMethodPct.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie dataKey="count" data={paymentMethodPct} cx="50%" cy="50%" labelLine={false} label={({ name, payload }) => `${name}: ${payload.pct}%`} outerRadius={88}>
                    {paymentMethodPct.map((_, index) => (
                      <Cell key={`payment-cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-panel-solid)', border: '1px solid var(--line-soft)', color: 'var(--text-primary)' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="dashboard-message">No payment method data available</div>
            )}
          </div>

          <aside className="activity-panel">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <h4>Billing cycle generated</h4>
                <p>{summary.bills_generated_this_month} bills created for this month.</p>
              </div>
              <div className="activity-item">
                <h4>Collection update</h4>
                <p>{summary.payments_received_this_month} payments recorded in active period.</p>
              </div>
              <div className="activity-item">
                <h4>Service continuity</h4>
                <p>{summary.active_meters} meters currently active.</p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  )
}
