import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DashboardPage } from './pages/Dashboard'
import { CustomersPage } from './pages/Customers'
import { MetersPage } from './pages/Meters'
import { ReadingsPage } from './pages/Readings'
import { MaintenancePage } from './pages/Maintenance'
import { BillingPage } from './pages/Billing'
import { PaymentsPage } from './pages/Payments'
import { ReportsPage } from './pages/Reports'
import { StaffPage } from './pages/Staff'
import { InventoryPage } from './pages/Inventory'
import { MachinesPage } from './pages/Machines'
import ConnectMachine from './pages/ConnectMachine'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/meters" element={<MetersPage />} />
          <Route path="/readings" element={<ReadingsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/machines" element={<MachinesPage />} />
          <Route path="/connect-machine" element={<ConnectMachine />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
