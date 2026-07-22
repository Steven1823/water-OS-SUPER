import { useStockItems } from '../hooks/useStockItems'
import '../styles/list-page.css'

export function StockPage() {
  const { data, loading, error } = useStockItems()

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Stock</h1>
        <button className="btn btn-primary">+ Add Stock Item</button>
      </div>

      {loading && <p className="loading">Loading stock...</p>}
      {error && <p className="error-message">Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p className="empty-state">No stock items found.</p>}

      {!loading && !error && data.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Reorder Level</th>
                <th>Supplier</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="font-weight-600">{item.name}</td>
                  <td>{item.category}</td>
                  <td>{item.quantity}</td>
                  <td>{item.reorder_level}</td>
                  <td>{item.suppliers?.name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
