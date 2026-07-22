interface StoredPasskey {
  email: string
  credentialId: string
  createdAt: string
}

const STORAGE_KEY = 'wms_passkeys'

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const out = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i)
  }
  return out
}

function readStoredPasskeys(): StoredPasskey[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredPasskey[]) : []
  } catch {
    return []
  }
}

function writeStoredPasskeys(records: StoredPasskey[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records))
}

function requireWebAuthn() {
  if (!window.PublicKeyCredential || !navigator.credentials) {
    throw new Error('Passkeys are not supported in this browser.')
  }
}

export function isPasskeySupported(): boolean {
  return Boolean(window.PublicKeyCredential && navigator.credentials)
}

export async function registerDevicePasskey(email: string): Promise<void> {
  requireWebAuthn()

  if (!email.trim()) {
    throw new Error('Enter an email first before setting up a passkey.')
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32))
  const userId = new TextEncoder().encode(email.toLowerCase())

  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'WaterFlow OS',
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: email,
        displayName: email,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
    },
  })) as PublicKeyCredential | null

  if (!credential) {
    throw new Error('Passkey creation was cancelled.')
  }

  const rawId = new Uint8Array(credential.rawId)
  const credentialId = toBase64Url(rawId)

  const existing = readStoredPasskeys().filter((item) => item.email.toLowerCase() !== email.toLowerCase())
  existing.push({
    email,
    credentialId,
    createdAt: new Date().toISOString(),
  })
  writeStoredPasskeys(existing)
}

export async function verifyDevicePasskey(email?: string): Promise<{ ok: true; email: string } | { ok: false; error: string }> {
  try {
    requireWebAuthn()

    const records = readStoredPasskeys()
    const record = email
      ? records.find((item) => item.email.toLowerCase() === email.toLowerCase())
      : records[0]

    if (!record) {
      return { ok: false, error: 'No passkey is set up for this device yet.' }
    }

    const challenge = crypto.getRandomValues(new Uint8Array(32))
    const allowCredentialId = fromBase64Url(record.credentialId)

    const assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        timeout: 60000,
        allowCredentials: [
          {
            id: allowCredentialId,
            type: 'public-key',
          },
        ],
        userVerification: 'preferred',
      },
    })) as PublicKeyCredential | null

    if (!assertion) {
      return { ok: false, error: 'Passkey verification was cancelled.' }
    }

    return { ok: true, email: record.email }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Passkey verification failed.' }
  }
}
