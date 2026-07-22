import '../styles/list-page.css'
import { isDemoRuntime } from '../lib/runtimeMode'

const demoReports = [
  { title: 'Revenue Summary', note: 'Monthly collections, pending balances, and growth trend' },
  { title: 'Consumption Analysis', note: 'Water usage by customer type and machine' },
  { title: 'Operations Snapshot', note: 'Service uptime, maintenance queues, and alerts' },
]

export function ReportsPage() {
  const demo = isDemoRuntime()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Reports</h1>
        <button className="btn btn-secondary">Export CSV</button>
      </div>

      {demo ? (
        <div className="kpi-grid">
          {demoReports.map((report) => (
            <div key={report.title} className="surface" style={{ padding: 18 }}>
              <h3 style={{ margin: '0 0 8px' }}>{report.title}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)' }}>{report.note}</p>
              <button className="btn btn-primary" style={{ marginTop: 14 }}>Open Report</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-state">Analytics and reports module - coming soon</p>
      )}
    </div>
  )
}
