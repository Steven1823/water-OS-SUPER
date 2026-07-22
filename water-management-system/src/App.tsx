import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { Layout } from './components/Layout'
import { supabase } from './lib/supabaseClient'
import { isDemoModeEnabled } from './lib/demoMode'
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
import { LoginPage } from './pages/Login'
import ConnectMachine from './pages/ConnectMachine'
import { CustomerTypesPage } from './pages/CustomerTypes'
import { GenerateBillsPage } from './pages/GenerateBills'
import { InvoicesPage } from './pages/Invoices'
import { ReceivePaymentPage } from './pages/ReceivePayment'
import { ReceiptsPage } from './pages/Receipts'
import { StockPage } from './pages/Stock'
import { SuppliersPage } from './pages/Suppliers'
import { RepairsPage } from './pages/Repairs'
import { LeakReportsPage } from './pages/LeakReports'
import { RolesPermissionsPage } from './pages/RolesPermissions'
import { SettingsPage } from './pages/Settings'

function RequireAuth({ session, loading }: { session: Session | null; loading: boolean }) {
  if (loading) {
    return <div style={{ padding: '24px', color: '#cbd5e1' }}>Checking session...</div>
  }

  if (!session && !isDemoModeEnabled()) {
    return <Navigate to="/login" replace />
  }

  return <Layout />
}

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isDemoModeEnabled()) {
      setSession(null)
      setLoading(false)
      return
    }

    let isMounted = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session)
          setLoading(false)
        }
      })
      .catch(() => {
        if (isMounted) {
          setSession(null)
          setLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth session={session} loading={loading} />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customer-types" element={<CustomerTypesPage />} />
          <Route path="/meters" element={<MetersPage />} />
          <Route path="/readings" element={<ReadingsPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/repairs" element={<RepairsPage />} />
          <Route path="/leak-reports" element={<LeakReportsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/generate-bills" element={<GenerateBillsPage />} />
          <Route path="/invoices" element={<InvoicesPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/receive-payment" element={<ReceivePaymentPage />} />
          <Route path="/receipts" element={<ReceiptsPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/staff" element={<StaffPage />} />
          <Route path="/roles-permissions" element={<RolesPermissionsPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/machines" element={<MachinesPage />} />
          <Route path="/connect-machine" element={<ConnectMachine />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
