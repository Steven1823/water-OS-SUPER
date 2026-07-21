import { useCustomers } from '../hooks/useCustomers'
import '../styles/list-page.css'

export function CustomersPage() {
  const { data, loading, error } = useCustomers()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary">+ Add Customer</button>
      </div>

      {loading && <p className="loading">Loading customers...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && data.length === 0 && <p className="empty-state">No customers found. Create one to get started.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-weight-600">{customer.name}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.customer_types?.name || '-'}</td>
                  <td>
                    <span className={`badge badge-${customer.status}`}>{customer.status}</span>
                  </td>
                  <td>{new Date(customer.created_at).toLocaleDateString()}</td>
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
