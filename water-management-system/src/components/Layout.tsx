import { Outlet, Link, useLocation } from 'react-router-dom'
import '../styles/layout.css'

export function Layout() {
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="layout-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <h1>💧 Water Utility</h1>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-label">Dashboard</p>
            <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
              📊 Overview
            </Link>
          </div>

          <div className="nav-section">
            <p className="nav-label">Operations</p>
            <Link to="/connect-machine" className={`nav-item ${isActive('/connect-machine') ? 'active' : ''}`}>
              ➕ Connect Machine
            </Link>
            <Link to="/machines" className={`nav-item ${isActive('/machines') ? 'active' : ''}`}>
              🤖 Machines
            </Link>
            <Link to="/customers" className={`nav-item ${isActive('/customers') ? 'active' : ''}`}>
              👥 Customers
            </Link>
            <Link to="/meters" className={`nav-item ${isActive('/meters') ? 'active' : ''}`}>
              📏 Meters
            </Link>
            <Link to="/readings" className={`nav-item ${isActive('/readings') ? 'active' : ''}`}>
              📖 Readings
            </Link>
            <Link to="/maintenance" className={`nav-item ${isActive('/maintenance') ? 'active' : ''}`}>
              🔧 Maintenance
            </Link>
          </div>

          <div className="nav-section">
            <p className="nav-label">Billing & Revenue</p>
            <Link to="/billing" className={`nav-item ${isActive('/billing') ? 'active' : ''}`}>
              📄 Bills
            </Link>
            <Link to="/payments" className={`nav-item ${isActive('/payments') ? 'active' : ''}`}>
              💳 Payments
            </Link>
            <Link to="/reports" className={`nav-item ${isActive('/reports') ? 'active' : ''}`}>
              📈 Reports
            </Link>
          </div>

          <div className="nav-section">
            <p className="nav-label">Admin</p>
            <Link to="/staff" className={`nav-item ${isActive('/staff') ? 'active' : ''}`}>
              👔 Staff
            </Link>
            <Link to="/inventory" className={`nav-item ${isActive('/inventory') ? 'active' : ''}`}>
              📦 Inventory
            </Link>
          </div>
        </nav>

        <div className="sidebar-footer">
          <p>v1.0.0</p>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="top-bar-left">
            <h2 id="page-title">Dashboard</h2>
          </div>
          <div className="top-bar-right">
            <span>Signed in as Staff</span>
          </div>
        </header>

        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
