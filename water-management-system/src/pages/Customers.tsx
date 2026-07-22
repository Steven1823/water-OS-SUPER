import { useState } from 'react'
import { useCustomers } from '../hooks/useCustomers'
import { useCustomerTypes } from '../hooks/useCustomerTypes'
import '../styles/list-page.css'

export function CustomersPage() {
  const { data, loading, error, addCustomer } = useCustomers()
  const { data: customerTypes } = useCustomerTypes()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    customer_type_id: 'residential',
  })
  const [message, setMessage] = useState<string | null>(null)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const result = await addCustomer(form)
    if (result.ok) {
      setMessage('Customer added successfully.')
      setForm({ name: '', phone: '', email: '', address: '', customer_type_id: 'residential' })
      setShowForm(false)
      return
    }
    setMessage(result.error || 'Failed to add customer')
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Customers</h1>
        <button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}>+ Add Customer</button>
      </div>

      {message && <p className="loading">{message}</p>}

      {showForm && (
        <form className="table-container" style={{ padding: 16, display: 'grid', gap: 10 }} onSubmit={handleCreate}>
          <input className="global-search" placeholder="Name" value={form.name} required onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          <input className="global-search" placeholder="Phone" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <input className="global-search" placeholder="Email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          <input className="global-search" placeholder="Address" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
          <select className="global-search" value={form.customer_type_id} onChange={(event) => setForm((prev) => ({ ...prev, customer_type_id: event.target.value }))}>
            {customerTypes.map((type) => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" type="submit">Save Customer</button>
        </form>
      )}

      {loading && <p className="loading">Loading customers...</p>}
      {error && <p className="error-message">Error: {error}</p>}

      {!loading && !error && data.length === 0 && <p className="empty-state">No customers found. Create one to get started.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((customer) => (
                <tr key={customer.id}>
                  <td className="font-weight-600">{customer.name}</td>
                  <td>{customer.phone || '-'}</td>
                  <td>{customer.email || '-'}</td>
                  <td>{customer.customer_types?.name || '-'}</td>
                  <td>
                    <span className={`badge badge-${customer.status}`}>{customer.status}</span>
                  </td>
                  <td>{new Date(customer.created_at).toLocaleDateString()}</td>
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
