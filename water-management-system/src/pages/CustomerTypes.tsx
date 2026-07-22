import { useCustomerTypes } from '../hooks/useCustomerTypes'
import '../styles/list-page.css'

export function CustomerTypesPage() {
  const { data, loading, error } = useCustomerTypes()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Customer Types</h1>
        <button className="btn btn-primary">+ Add Type</button>
      </div>

      {loading && <p className="loading">Loading customer types...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No customer types found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Tariff / Liter</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {data.map((type) => (
                <tr key={type.id}>
                  <td className="font-weight-600">{type.name}</td>
                  <td>{Number(type.tariff_rate_per_liter).toFixed(2)}</td>
                  <td>{type.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
