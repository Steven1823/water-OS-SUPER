import '../styles/list-page.css'
import { useStockItems } from '../hooks/useStockItems'

export function InventoryPage() {
  const { data, loading, error } = useStockItems()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Inventory Management</h1>
        <button className="btn btn-primary">+ Add Stock Item</button>
      </div>

      {loading && <p className="loading">Loading inventory...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No inventory items found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Supplier</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="font-weight-600">{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{item.suppliers?.name || '-'}</td>
                  <td><span className={`badge badge-${item.quantity <= item.reorder_level ? 'low_stock' : 'in_stock'}`}>{item.quantity <= item.reorder_level ? 'low_stock' : 'in_stock'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
