import { useState } from 'react'
import { useBills } from '../hooks/useBills'
import { useCustomers } from '../hooks/useCustomers'
import { useMeters } from '../hooks/useMeters'
import '../styles/list-page.css'

export function BillingPage() {
  const { data, loading, error, addBill } = useBills()
  const { data: customers } = useCustomers()
  const { data: meters } = useMeters()
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    customer_id: '',
    meter_id: '',
    period_start: new Date().toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
    liters_billed: '0',
    amount: '0',
    due_date: new Date().toISOString().slice(0, 10),
  })

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = await addBill({
      customer_id: form.customer_id,
      meter_id: form.meter_id,
      period_start: form.period_start,
      period_end: form.period_end,
      liters_billed: Number(form.liters_billed),
      amount: Number(form.amount),
      due_date: form.due_date,
    })

    if (result.ok) {
      setMessage('Bill added successfully.')
      setShowForm(false)
      return
    }
    setMessage(result.error || 'Failed to add bill')
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount / 100)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Bills</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>+ Add Bill</button>
      </div>

      {message && <p className="loading">{message}</p>}

      {showForm && (
        <form className="table-container" style={{ padding: 16, display: 'grid', gap: 10 }} onSubmit={handleCreate}>
          <select className="global-search" value={form.customer_id} required onChange={(event) => setForm((prev) => ({ ...prev, customer_id: event.target.value }))}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          <select className="global-search" value={form.meter_id} required onChange={(event) => setForm((prev) => ({ ...prev, meter_id: event.target.value }))}>
            <option value="">Select meter</option>
            {meters.map((meter) => (
              <option key={meter.id} value={meter.id}>{meter.serial_number}</option>
            ))}
          </select>
          <input className="global-search" type="date" value={form.period_start} required onChange={(event) => setForm((prev) => ({ ...prev, period_start: event.target.value }))} />
          <input className="global-search" type="date" value={form.period_end} required onChange={(event) => setForm((prev) => ({ ...prev, period_end: event.target.value }))} />
          <input className="global-search" type="number" min="0" value={form.liters_billed} required onChange={(event) => setForm((prev) => ({ ...prev, liters_billed: event.target.value }))} placeholder="Liters billed" />
          <input className="global-search" type="number" min="0" value={form.amount} required onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))} placeholder="Amount" />
          <input className="global-search" type="date" value={form.due_date} required onChange={(event) => setForm((prev) => ({ ...prev, due_date: event.target.value }))} />
          <button className="btn btn-primary" type="submit">Save Bill</button>
        </form>
      )}

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
