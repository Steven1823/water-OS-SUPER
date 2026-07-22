import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBills } from '../hooks/useBills'
import { supabase } from '../lib/supabaseClient'
import { isDemoRuntime } from '../lib/runtimeMode'
import '../styles/list-page.css'

export function GenerateBillsPage() {
  const navigate = useNavigate()
  const { data } = useBills()
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const pending = data.filter((bill) => bill.status === 'pending' || bill.status === 'partial' || bill.status === 'overdue').length

  const triggerBilling = async () => {
    setRunning(true)
    setMessage(null)

    if (isDemoRuntime()) {
      setMessage('Demo mode: billing run simulated successfully.')
      setRunning(false)
      return
    }

    const { error } = await supabase.functions.invoke('generate-bills')

    if (error) {
      setMessage(`Billing run failed: ${error.message}`)
    } else {
      setMessage('Billing run completed successfully.')
    }

    setRunning(false)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Generate Bills</h1>
        <div>
          <button className="btn btn-secondary" onClick={() => navigate('/billing')} style={{ marginRight: 8 }}>Open Bills Ledger</button>
          <button className="btn btn-primary" onClick={triggerBilling} disabled={running}>{running ? 'Running...' : 'Run Billing Cycle'}</button>
        </div>
      </div>

      {message && <p className="loading">{message}</p>}

      <div className="table-container">
        <table className="data-table">
          <tbody>
            <tr>
              <td className="font-weight-600">Billing Status</td>
              <td>{pending} open bills currently require collection follow-up.</td>
            </tr>
            <tr>
              <td className="font-weight-600">Recommended Cycle</td>
              <td>Generate monthly bills after meter readings are finalized.</td>
            </tr>
            <tr>
              <td className="font-weight-600">Next Step</td>
              <td>Use the existing edge function workflow and verify totals in Bills.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
