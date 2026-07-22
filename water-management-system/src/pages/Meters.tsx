import { useState } from 'react'
import { useMeters } from '../hooks/useMeters'
import { useCustomers } from '../hooks/useCustomers'
import '../styles/list-page.css'

export function MetersPage() {
  const { data, loading, error, addMeter } = useMeters()
  const { data: customers } = useCustomers()
  const [showForm, setShowForm] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    serial_number: '',
    customer_id: '',
    install_date: new Date().toISOString().slice(0, 10),
  })

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = await addMeter(form)
    if (result.ok) {
      setMessage('Meter added successfully.')
      setForm({ serial_number: '', customer_id: '', install_date: new Date().toISOString().slice(0, 10) })
      setShowForm(false)
      return
    }
    setMessage(result.error || 'Failed to add meter')
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Meters</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>+ Add Meter</button>
      </div>

      {message && <p className="loading">{message}</p>}

      {showForm && (
        <form className="table-container" style={{ padding: 16, display: 'grid', gap: 10 }} onSubmit={handleCreate}>
          <input className="global-search" placeholder="Serial number" value={form.serial_number} required onChange={(event) => setForm((prev) => ({ ...prev, serial_number: event.target.value }))} />
          <select className="global-search" value={form.customer_id} required onChange={(event) => setForm((prev) => ({ ...prev, customer_id: event.target.value }))}>
            <option value="">Select customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>{customer.name}</option>
            ))}
          </select>
          <input className="global-search" type="date" value={form.install_date} required onChange={(event) => setForm((prev) => ({ ...prev, install_date: event.target.value }))} />
          <button className="btn btn-primary" type="submit">Save Meter</button>
        </form>
      )}

      {loading && <p className="loading">Loading meters...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && data.length === 0 && <p className="empty-state">No meters found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Serial Number</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Install Date</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((meter) => (
                <tr key={meter.id}>
                  <td className="font-weight-600">{meter.serial_number}</td>
                  <td>{meter.customers?.name || '-'}</td>
                  <td>
                    <span className={`badge badge-${meter.status}`}>{meter.status}</span>
                  </td>
                  <td>{new Date(meter.install_date).toLocaleDateString()}</td>
                  <td>{new Date(meter.created_at).toLocaleDateString()}</td>
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
