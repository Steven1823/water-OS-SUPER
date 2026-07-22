import { usePayments } from '../hooks/usePayments'
import '../styles/list-page.css'

export function ReceiptsPage() {
  const { data, loading, error } = usePayments()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Receipts</h1>
        <button className="btn btn-primary">+ Export Receipts</button>
      </div>

      {loading && <p className="loading">Loading receipts...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No receipts found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Receipt Number</th>
                <th>Bill ID</th>
                <th>Method</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {data.map((payment) => (
                <tr key={payment.id}>
                  <td className="font-weight-600">{payment.receipt_number || '-'}</td>
                  <td>{payment.bill_id.slice(0, 8)}...</td>
                  <td><span className={`badge badge-${payment.method}`}>{payment.method}</span></td>
                  <td>{Number(payment.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
