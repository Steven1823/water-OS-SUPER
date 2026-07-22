import { useEffect, useState } from 'react'
import { useBusinessProfile } from '../hooks/useBusinessProfile'
import { supabase } from '../lib/supabaseClient'
import { isPasskeySupported, registerDevicePasskey, verifyDevicePasskey } from '../lib/passkeyAuth'
import '../styles/list-page.css'

export function SettingsPage() {
  const { profile, loading } = useBusinessProfile()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  useEffect(() => {
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data.user?.email) {
          setEmail(data.user.email)
        }
      })
      .catch(() => {
        setEmail('')
      })
  }, [])

  const handleSetupPasskey = async () => {
    setWorking(true)
    setMessage(null)
    try {
      await registerDevicePasskey(email)
      setMessage('Passkey setup complete for this device.')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to set up passkey')
    } finally {
      setWorking(false)
    }
  }

  const handleVerifyPasskey = async () => {
    setWorking(true)
    setMessage(null)
    const result = await verifyDevicePasskey(email || undefined)
    setMessage(result.ok ? `Passkey verified for ${result.email}` : result.error)
    setWorking(false)
  }

  return (
    <div className="page-section">
      <div className="page-header">
        <h1>Settings</h1>
        <button className="btn btn-primary">Save Branding</button>
      </div>

      {loading && <p className="loading">Loading business settings...</p>}

      {message && <p className="loading">{message}</p>}

      {!loading && (
        <>
          <div className="table-container">
            <table className="data-table">
              <tbody>
                <tr>
                  <th>Business Name</th>
                  <td>{profile?.business_name || 'Not configured'}</td>
                </tr>
                <tr>
                  <th>Tagline</th>
                  <td>{profile?.tagline || 'Not configured'}</td>
                </tr>
                <tr>
                  <th>Currency</th>
                  <td>{profile?.currency_code || 'KES'}</td>
                </tr>
                <tr>
                  <th>Logo URL</th>
                  <td>{profile?.logo_url || 'Not configured'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="table-container" style={{ padding: 16, display: 'grid', gap: 10 }}>
            <h2 style={{ margin: 0, fontSize: 18 }}>Account Security</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
              Register and verify a device passkey for quicker secure access checks.
            </p>
            <input className="global-search" placeholder="Account email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled={working || !isPasskeySupported()} onClick={handleSetupPasskey}>Set Up Passkey</button>
              <button className="btn btn-secondary" disabled={working || !isPasskeySupported()} onClick={handleVerifyPasskey}>Verify Passkey</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
