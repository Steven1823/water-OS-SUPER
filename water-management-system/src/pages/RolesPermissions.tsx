import { useRoles } from '../hooks/useRoles'
import '../styles/list-page.css'

export function RolesPermissionsPage() {
  const { data, loading, error } = useRoles()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Roles & Permissions</h1>
        <button className="btn btn-primary">+ Add Role</button>
      </div>

      {loading && <p className="loading">Loading roles...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No roles found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Role</th>
                <th>Description</th>
                <th>Permission Keys</th>
              </tr>
            </thead>
            <tbody>
              {data.map((role) => (
                <tr key={role.id}>
                  <td className="font-weight-600">{role.name}</td>
                  <td>{role.description || '-'}</td>
                  <td>{Object.keys(role.permissions || {}).join(', ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
