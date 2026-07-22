import { useBills } from '../hooks/useBills'
import '../styles/list-page.css'

export function InvoicesPage() {
  const { data, loading, error } = useBills()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Invoices</h1>
        <button className="btn btn-primary">+ New Invoice</button>
      </div>

      {loading && <p className="loading">Loading invoices...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No invoices available.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Invoice ID</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map((bill) => (
                <tr key={bill.id}>
                  <td className="font-weight-600">{bill.id.slice(0, 8)}...</td>
                  <td>{bill.customers?.name || '-'}</td>
                  <td>{Number(bill.amount).toLocaleString()}</td>
                  <td><span className={`badge badge-${bill.status}`}>{bill.status}</span></td>
                  <td>{new Date(bill.due_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
