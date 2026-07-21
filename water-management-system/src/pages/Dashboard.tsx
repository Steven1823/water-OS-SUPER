import { useDashboardMetrics } from '../hooks/useDashboardMetrics'
import { StatCard } from './StatCard'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import '../styles/dashboard.css'

export function DashboardPage() {
  const { summary, revenue, consumption, billStatus, paymentMethods, loading, error } = useDashboardMetrics()

  if (loading) {
    return (
      <div className="page-section">
        <p>Loading dashboard metrics...</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="page-section">
        <p className="error-message">Failed to load dashboard: {error}</p>
      </div>
    )
  }

  const COLORS = ['#00bcd4', '#4caf50', '#ff9800', '#f44336', '#9c27b0']

  return (
    <div className="dashboard-container">
      {/* KPI Cards */}
      <section className="kpi-section">
        <h2>Key Performance Indicators</h2>
        <div className="kpi-grid">
          <StatCard label="Total Customers" value={summary.total_customers} icon="👥" />
          <StatCard label="Active Meters" value={summary.active_meters} icon="📏" />
          <StatCard label="Bills This Month" value={summary.bills_generated_this_month} icon="📄" />
          <StatCard label="Payments Received" value={summary.payments_received_this_month} icon="💳" />
          <StatCard label="Pending Bills" value={summary.pending_bills_count} icon="⏳" />
          <StatCard label="Water Consumed (L)" value={summary.total_water_consumption_this_month.toLocaleString()} icon="💧" />
        </div>
      </section>

      {/* Charts */}
      <section className="charts-section">
        <div className="chart-container">
          <h3>Revenue Last 12 Months</h3>
          {revenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#00bcd4" strokeWidth={2} dot={{ fill: '#00bcd4' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>No revenue data available</p>
          )}
        </div>

        <div className="chart-container">
          <h3>Water Consumption Last 12 Months</h3>
          {consumption.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={consumption}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                <Legend />
                <Line type="monotone" dataKey="total_liters" stroke="#4caf50" strokeWidth={2} dot={{ fill: '#4caf50' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p>No consumption data available</p>
          )}
        </div>

        <div className="chart-container">
          <h3>Bill Status Distribution</h3>
          {billStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie dataKey="count" data={billStatus} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ${value}`} outerRadius={100}>
                  {billStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p>No bill status data available</p>
          )}
        </div>

        <div className="chart-container">
          <h3>Payment Methods</h3>
          {paymentMethods.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paymentMethods}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="method" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                <Legend />
                <Bar dataKey="count" fill="#00bcd4" radius={[8, 8, 0, 0]} />
                <Bar dataKey="total_amount" fill="#4caf50" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p>No payment method data available</p>
          )}
        </div>
      </section>
    </div>
  )
}
