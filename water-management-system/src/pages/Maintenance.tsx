import '../styles/list-page.css'
import { useRepairs } from '../hooks/useRepairs'
import { useLeakReports } from '../hooks/useLeakReports'

export function MaintenancePage() {
  const repairs = useRepairs()
  const leaks = useLeakReports()

  const loading = repairs.loading || leaks.loading
  const error = repairs.error || leaks.error
  const rows = [
    ...repairs.data.map((repair) => ({
      id: `repair-${repair.id}`,
      machine: repair.machines?.name || '-',
      type: 'Repair',
      status: repair.status,
      owner: repair.assigned_to || '-',
      updated: repair.reported_at,
    })),
    ...leaks.data.map((leak) => ({
      id: `leak-${leak.id}`,
      machine: leak.machines?.name || '-',
      type: 'Leak Report',
      status: leak.status,
      owner: leak.assigned_to || '-',
      updated: leak.reported_at,
    })),
  ].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Maintenance</h1>
        <button className="btn btn-primary">+ Report Repair</button>
      </div>

      {loading && <p className="loading">Loading maintenance activity...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && rows.length === 0 && <p className="empty-state">No maintenance records found.</p>}

      {!loading && !error && rows.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Type</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => (
                <tr key={item.id}>
                  <td className="font-weight-600">{item.machine}</td>
                  <td>{item.type}</td>
                  <td><span className={`badge badge-${item.status}`}>{item.status}</span></td>
                  <td>{item.owner}</td>
                  <td>{new Date(item.updated).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
