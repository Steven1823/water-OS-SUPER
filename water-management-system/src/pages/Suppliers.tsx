import { useSuppliers } from '../hooks/useSuppliers'
import '../styles/list-page.css'

export function SuppliersPage() {
  const { data, loading, error } = useSuppliers()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Suppliers</h1>
        <button className="btn btn-primary">+ Add Supplier</button>
      </div>

      {loading && <p className="loading">Loading suppliers...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No suppliers found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Contact Person</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((supplier) => (
                <tr key={supplier.id}>
                  <td className="font-weight-600">{supplier.name}</td>
                  <td>{supplier.contact_person || '-'}</td>
                  <td>{supplier.phone || '-'}</td>
                  <td>{supplier.email || '-'}</td>
                  <td><span className={`badge badge-${supplier.status}`}>{supplier.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
