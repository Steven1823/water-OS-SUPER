import { useLeakReports } from '../hooks/useLeakReports'
import '../styles/list-page.css'

export function LeakReportsPage() {
  const { data, loading, error } = useLeakReports()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Leak Reports</h1>
        <button className="btn btn-primary">+ New Leak Report</button>
      </div>

      {loading && <p className="loading">Loading leak reports...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No leak reports found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Meter</th>
                <th>Description</th>
                <th>Severity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((leak) => (
                <tr key={leak.id}>
                  <td className="font-weight-600">{leak.machines?.name || '-'}</td>
                  <td>{leak.meters?.serial_number || '-'}</td>
                  <td>{leak.description}</td>
                  <td><span className={`badge badge-${leak.severity}`}>{leak.severity}</span></td>
                  <td><span className={`badge badge-${leak.status}`}>{leak.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
