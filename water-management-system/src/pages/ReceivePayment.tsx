import { usePayments } from '../hooks/usePayments'
import '../styles/list-page.css'

export function ReceivePaymentPage() {
  const { data, loading, error } = usePayments()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Receive Payment</h1>
        <button className="btn btn-primary">+ Record Payment</button>
      </div>

      {loading && <p className="loading">Loading payment queue...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No payment activity found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Paid At</th>
              </tr>
            </thead>
            <tbody>
              {data.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-weight-600">{payment.receipt_number || '-'}</td>
                  <td><span className={`badge badge-${payment.method}`}>{payment.method}</span></td>
                  <td>{Number(payment.amount).toLocaleString()}</td>
                  <td>{new Date(payment.paid_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
