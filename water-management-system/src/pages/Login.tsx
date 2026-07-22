import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { isDemoModeEnabled, setDemoModeEnabled } from '../lib/demoMode'
import { isPasskeySupported, registerDevicePasskey, verifyDevicePasskey } from '../lib/passkeyAuth'
import { hasPasskeyAccess, unlockPasskeyAccess } from '../lib/passkeyAccess'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [passkeySecret, setPasskeySecret] = useState('')
  const [passkeyAccessUnlocked, setPasskeyAccessUnlocked] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.innerWidth <= 920)

  useEffect(() => {
    const onResize = () => setIsMobileViewport(window.innerWidth <= 920)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    if (isDemoModeEnabled()) {
      navigate('/', { replace: true })
      return
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          navigate('/', { replace: true })
        }
      })
      .catch(() => {
        // Keep user on login if hosted auth is unreachable.
      })
  }, [navigate])

  useEffect(() => {
    setPasskeyAccessUnlocked(hasPasskeyAccess(email))
  }, [email])

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (isSignUp) {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      setMessage('Account created. If email confirmation is enabled, check your inbox to verify the account.')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    setDemoModeEnabled(false)
    navigate('/', { replace: true })
  }

  const handleSetupPasskey = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    if (!passkeyAccessUnlocked) {
      setError('Passkey setup requires a paid access key. Enter and activate your key first.')
      setLoading(false)
      return
    }

    try {
      await registerDevicePasskey(email)
      setMessage('Passkey created on this device. You can verify it before signing in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set up passkey.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnlockPasskeyAccess = () => {
    setError(null)
    setMessage(null)

    const result = unlockPasskeyAccess(email, passkeySecret)
    if (!result.ok) {
      setError(result.error)
      return
    }

    setPasskeyAccessUnlocked(true)
    setPasskeySecret('')
    setMessage('Passkey access activated for this email on this device.')
  }

  const handleVerifyPasskey = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const result = await verifyDevicePasskey(email || undefined)
    if (!result.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    setEmail(result.email)
    setMessage(`Passkey verified for ${result.email}. Enter your password to complete sign-in.`)
    setLoading(false)
  }

  const handleTryDemo = async () => {
    setLoading(true)
    setError(null)

    const demoEmail = import.meta.env.VITE_DEMO_EMAIL as string | undefined
    const demoPassword = import.meta.env.VITE_DEMO_PASSWORD as string | undefined

    if (demoEmail && demoPassword) {
      const { error: demoSignInError } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      })

      if (demoSignInError) {
        // Fall back to offline demo mode if hosted auth is unavailable.
        if (!/network|failed|resolve|fetch|timeout/i.test(demoSignInError.message)) {
          setError(`Demo sign-in failed: ${demoSignInError.message}`)
          setLoading(false)
          return
        }
      }
    }

    setDemoModeEnabled(true)
    setLoading(false)
    navigate('/', { replace: true })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: isMobileViewport ? '1fr' : 'minmax(320px, 480px) minmax(320px, 560px)',
        alignItems: 'stretch',
        justifyContent: 'center',
        background:
          'radial-gradient(circle at 15% 15%, rgba(6, 182, 212, 0.16), transparent 28%), radial-gradient(circle at 85% 10%, rgba(255, 255, 255, 0.08), transparent 22%), linear-gradient(145deg, #06131f, #0b1c2d)',
        color: 'var(--text-primary)',
        padding: isMobileViewport ? '12px' : '24px',
        gap: isMobileViewport ? '12px' : '24px',
      }}
    >
      <section
        style={{
          border: '1px solid var(--line-soft)',
          borderRadius: '24px',
          padding: isMobileViewport ? '20px' : '32px',
          background: 'rgba(7, 21, 34, 0.72)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: isMobileViewport ? 'auto' : '520px',
        }}
      >
        <div>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '16px',
              display: 'grid',
              placeItems: 'center',
              background: 'linear-gradient(145deg, #0ea5e9, #14b8a6)',
              color: '#fff',
              fontWeight: 700,
              marginBottom: '20px',
            }}
          >
            W
          </div>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Utility Command Center
          </p>
          <h1 style={{ margin: '10px 0 12px', fontSize: isMobileViewport ? '30px' : '40px', lineHeight: 1.05 }}>
            Operate billing, service delivery, and field telemetry from one control room.
          </h1>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '15px', lineHeight: 1.7 }}>
            WaterFlow OS gives operations teams one view of customers, machines, revenue collection, and service continuity. Use your production account or launch the seeded demo workspace.
          </p>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {['Live billing visibility', 'Customer + meter records', 'Demo-safe analytics fallback'].map((item) => (
              <span
                key={item}
                style={{
                  borderRadius: '999px',
                  padding: '8px 12px',
                  border: '1px solid var(--line-soft)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
          <div style={{ display: 'grid', gap: '10px' }}>
            <div style={{ borderLeft: '2px solid var(--flow)', paddingLeft: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)' }}>Try Demo</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>
                Opens the redesigned shell with fallback dashboard analytics when backend views are unavailable.
              </p>
            </div>
            <div style={{ borderLeft: '2px solid var(--amber)', paddingLeft: '10px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)' }}>Hosted Supabase required for live data</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-dim)' }}>
                This environment still cannot validate full local Supabase because Docker is unavailable.
              </p>
            </div>
          </div>
        </div>
      </section>

      <form
        onSubmit={handleSignIn}
        style={{
          width: '100%',
          maxWidth: isMobileViewport ? '100%' : '460px',
          background: 'var(--bg-panel)',
          border: '1px solid var(--line-soft)',
          borderRadius: '24px',
          padding: isMobileViewport ? '20px' : '32px',
          display: 'grid',
          gap: '16px',
          boxShadow: '0 20px 40px rgba(2, 12, 20, 0.24)',
          backdropFilter: 'blur(10px)',
          alignSelf: 'center',
        }}
      >
        <div>
          <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '12px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isSignUp ? 'Sign Up' : 'Sign In'}
          </p>
          <h2 style={{ margin: '8px 0 8px', fontSize: isMobileViewport ? '24px' : '30px', color: 'var(--text-primary)' }}>
            {isSignUp ? 'Create your account' : 'Access your workspace'}
          </h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '14px' }}>
            {isSignUp ? 'Create a login, then optionally attach a passkey for this device.' : 'Sign in to your account, or explore using demo data.'}
          </p>
        </div>

        <label style={{ display: 'grid', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            style={{
              background: 'var(--bg-control)',
              color: 'var(--text-primary)',
              border: '1px solid var(--line-soft)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          />
        </label>

        <label style={{ display: 'grid', gap: '6px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            style={{
              background: 'var(--bg-control)',
              color: 'var(--text-primary)',
              border: '1px solid var(--line-soft)',
              borderRadius: '12px',
              padding: '12px 14px',
            }}
          />
        </label>

        {error && (
          <p
            style={{
              margin: 0,
              color: '#fecaca',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
            }}
          >
            {error}
          </p>
        )}

        {message && (
          <p
            style={{
              margin: 0,
              color: '#bbf7d0',
              background: 'rgba(34, 197, 94, 0.15)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '12px',
              padding: '12px 14px',
              fontSize: '13px',
            }}
          >
            {message}
          </p>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              background: 'linear-gradient(140deg, rgba(14, 165, 233, 0.9), rgba(8, 145, 178, 0.85))',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              fontWeight: 600,
              flex: 1,
            }}
          >
            {loading ? 'Working...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={handleTryDemo}
            style={{
              background: 'var(--bg-control)',
              color: 'var(--text-primary)',
              border: '1px solid var(--line-soft)',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Try Demo
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={loading || !isPasskeySupported()}
            onClick={handleSetupPasskey}
            style={{
              background: 'var(--bg-control)',
              color: 'var(--text-primary)',
              border: '1px solid var(--line-soft)',
              borderRadius: '12px',
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            {passkeyAccessUnlocked ? 'Set Up Passkey' : 'Passkey Locked'}
          </button>
          <button
            type="button"
            disabled={loading || !isPasskeySupported()}
            onClick={handleVerifyPasskey}
            style={{
              background: 'var(--bg-control)',
              color: 'var(--text-primary)',
              border: '1px solid var(--line-soft)',
              borderRadius: '12px',
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            Verify Passkey
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsSignUp((value) => !value)
              setError(null)
              setMessage(null)
            }}
            style={{
              background: 'transparent',
              color: 'var(--text-muted)',
              border: '1px dashed var(--line-soft)',
              borderRadius: '12px',
              padding: '10px 14px',
              cursor: 'pointer',
            }}
          >
            {isSignUp ? 'Have an account? Sign in' : 'Need an account? Sign up'}
          </button>
        </div>

        <div
          style={{
            border: '1px solid var(--line-soft)',
            borderRadius: '12px',
            padding: '12px',
            display: 'grid',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.02)',
          }}
        >
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-dim)' }}>
            Passkey Access Key {passkeyAccessUnlocked ? 'Activated' : 'Required'}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="password"
              placeholder="Enter issued access key"
              value={passkeySecret}
              onChange={(event) => setPasskeySecret(event.target.value)}
              style={{
                flex: 1,
                minWidth: '180px',
                background: 'var(--bg-control)',
                color: 'var(--text-primary)',
                border: '1px solid var(--line-soft)',
                borderRadius: '10px',
                padding: '10px 12px',
              }}
            />
            <button
              type="button"
              onClick={handleUnlockPasskeyAccess}
              disabled={loading || passkeyAccessUnlocked}
              style={{
                border: '1px solid var(--line-soft)',
                borderRadius: '10px',
                background: passkeyAccessUnlocked ? 'rgba(34, 197, 94, 0.2)' : 'var(--bg-control)',
                color: 'var(--text-primary)',
                padding: '10px 12px',
                cursor: 'pointer',
              }}
            >
              {passkeyAccessUnlocked ? 'Activated' : 'Activate Key'}
            </button>
          </div>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-dim)' }}>
            Passkey setup is only available after account payment and issuance of a valid access key.
          </p>
        </div>

        <p style={{ margin: 0, color: 'var(--text-dim)', fontSize: '12px', lineHeight: 1.6 }}>
          Passkey verification is device-scoped and used as a secure local identity check before password sign-in. Demo mode is intended for UI and workflow evaluation.
        </p>
      </form>
    </div>
  )
}
