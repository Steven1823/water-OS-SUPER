import '../styles/list-page.css'
import { useEmployees } from '../hooks/useEmployees'

export function StaffPage() {
  const { data, loading, error } = useEmployees()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Staff Management</h1>
        <button className="btn btn-primary">+ Add Employee</button>
      </div>

      {loading && <p className="loading">Loading employees...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No employees found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Status</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {data.map((staff) => (
                <tr key={staff.id}>
                  <td className="font-weight-600">{staff.name}</td>
                  <td>{staff.roles?.name || '-'}</td>
                  <td><span className={`badge badge-${staff.status}`}>{staff.status}</span></td>
                  <td>{staff.email || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
