import { usePayments } from '../hooks/usePayments'
import '../styles/list-page.css'

export function PaymentsPage() {
  const { data, loading, error } = usePayments()

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Payments</h1>
        <button className="btn btn-primary">+ Record Payment</button>
      </div>

      {loading && <p className="loading">Loading payments...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && data.length === 0 && <p className="empty-state">No payments found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Bill ID</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Paid At</th>
                <th>Receipt</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-weight-600">{payment.bill_id.slice(0, 8)}...</td>
                  <td>{formatAmount(payment.amount)}</td>
                  <td>
                    <span className={`badge badge-${payment.method}`}>{payment.method}</span>
                  </td>
                  <td>{new Date(payment.paid_at).toLocaleDateString()}</td>
                  <td>{payment.receipt_number || '-'}</td>
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
