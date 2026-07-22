import { useRepairs } from '../hooks/useRepairs'
import '../styles/list-page.css'

export function RepairsPage() {
  const { data, loading, error } = useRepairs()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Repairs</h1>
        <button className="btn btn-primary">+ Report Repair</button>
      </div>

      {loading && <p className="loading">Loading repairs...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No repairs found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Machine</th>
                <th>Meter</th>
                <th>Description</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {data.map((repair) => (
                <tr key={repair.id}>
                  <td className="font-weight-600">{repair.machines?.name || '-'}</td>
                  <td>{repair.meters?.serial_number || '-'}</td>
                  <td>{repair.description}</td>
                  <td><span className={`badge badge-${repair.status}`}>{repair.status}</span></td>
                  <td><span className={`badge badge-${repair.priority}`}>{repair.priority}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
