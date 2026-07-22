import { useState } from 'react'
import { usePayments } from '../hooks/usePayments'
import { useBills } from '../hooks/useBills'
import '../styles/list-page.css'

export function PaymentsPage() {
  const { data, loading, error, addPayment } = usePayments()
  const { data: bills } = useBills()
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    bill_id: '',
    amount: '0',
    method: 'mpesa' as 'mpesa' | 'cash' | 'bank_transfer' | 'cheque' | 'other',
    paid_at: new Date().toISOString().slice(0, 10),
    receipt_number: '',
  })

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = await addPayment({
      bill_id: form.bill_id,
      amount: Number(form.amount),
      method: form.method,
      paid_at: form.paid_at,
      receipt_number: form.receipt_number,
    })

    if (result.ok) {
      setMessage('Payment recorded successfully.')
      setShowForm(false)
      return
    }
    setMessage(result.error || 'Failed to record payment')
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Payments</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>+ Record Payment</button>
      </div>

      {message && <p className="loading">{message}</p>}

      {showForm && (
        <form className="table-container" style={{ padding: 16, display: 'grid', gap: 10 }} onSubmit={handleCreate}>
          <select className="global-search" value={form.bill_id} required onChange={(event) => setForm((prev) => ({ ...prev, bill_id: event.target.value }))}>
            <option value="">Select bill</option>
            {bills.map((bill) => (
              <option key={bill.id} value={bill.id}>{bill.id.slice(0, 8)}... - {bill.customers?.name || 'Unknown'}</option>
            ))}
          </select>
          <input className="global-search" type="number" min="0" value={form.amount} required onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Amount" />
          <select className="global-search" value={form.method} onChange={(event) => setForm((prev) => ({ ...prev, method: event.target.value as any }))}>
            <option value="mpesa">mpesa</option>
            <option value="cash">cash</option>
            <option value="bank_transfer">bank_transfer</option>
            <option value="cheque">cheque</option>
            <option value="other">other</option>
          </select>
          <input className="global-search" type="date" value={form.paid_at} required onChange={(event) => setForm((prev) => ({ ...prev, paid_at: event.target.value }))} />
          <input className="global-search" placeholder="Receipt number" value={form.receipt_number} onChange={(event) => setForm((prev) => ({ ...prev, receipt_number: event.target.value }))} />
          <button className="btn btn-primary" type="submit">Save Payment</button>
        </form>
      )}

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
