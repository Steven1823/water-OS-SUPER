import { useMeterReadings } from '../hooks/useMeterReadings'
import '../styles/list-page.css'

export function ReadingsPage() {
  const { data, loading, error } = useMeterReadings()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Meter Readings</h1>
        <button className="btn btn-primary">+ Record Reading</button>
      </div>

      {loading && <p className="loading">Loading readings...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && data.length === 0 && <p className="empty-state">No readings found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Meter</th>
                <th>Reading Value</th>
                <th>Reading Date</th>
                <th>Source</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((reading) => (
                <tr key={reading.id}>
                  <td className="font-weight-600">{reading.meters?.serial_number || '-'}</td>
                  <td>{reading.reading_value.toFixed(2)} L</td>
                  <td>{new Date(reading.reading_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge badge-${reading.source}`}>{reading.source}</span>
                  </td>
                  <td>{new Date(reading.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-sm btn-secondary">View</button>
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
