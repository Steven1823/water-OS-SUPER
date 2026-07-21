import { useMeters } from '../hooks/useMeters'
import '../styles/list-page.css'

export function MetersPage() {
  const { data, loading, error } = useMeters()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Meters</h1>
        <button className="btn btn-primary">+ Add Meter</button>
      </div>

      {loading && <p className="loading">Loading meters...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && data.length === 0 && <p className="empty-state">No meters found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Install Date</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((meter) => (
                <tr key={meter.id}>
                  <td className="font-weight-600">{meter.serial_number}</td>
                  <td>{meter.customers?.name || '-'}</td>
                  <td>
                    <span className={`badge badge-${meter.status}`}>{meter.status}</span>
                  </td>
                  <td>{new Date(meter.install_date).toLocaleDateString()}</td>
                  <td>{new Date(meter.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
