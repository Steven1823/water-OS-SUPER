import { useBills } from '../hooks/useBills'
import '../styles/list-page.css'

export function BillingPage() {
  const { data, loading, error } = useBills()

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Bills</h1>
        <button className="btn btn-primary">+ Generate Bills</button>
      </div>

      {loading && <p className="loading">Loading bills...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && data.length === 0 && <p className="empty-state">No bills found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Period</th>
                <th>Liters</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((bill) => (
                <tr key={bill.id}>
                  <td className="font-weight-600">{bill.customers?.name || '-'}</td>
                  <td>{new Date(bill.period_start).toLocaleDateString()} - {new Date(bill.period_end).toLocaleDateString()}</td>
                  <td>{bill.liters_billed.toFixed(0)} L</td>
                  <td>{formatAmount(bill.amount)}</td>
                  <td>
                    <span className={`badge badge-${bill.status}`}>{bill.status}</span>
                  </td>
                  <td>{new Date(bill.due_date).toLocaleDateString()}</td>
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
