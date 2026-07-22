interface StoredPasskeyAccess {
  email: string
  unlockedAt: string
}

const PASSKEY_ACCESS_STORAGE_KEY = 'wms_passkey_access'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function readAccessRecords(): StoredPasskeyAccess[] {
  try {
    const raw = window.localStorage.getItem(PASSKEY_ACCESS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as StoredPasskeyAccess[]) : []
  } catch {
    return []
  }
}

function writeAccessRecords(records: StoredPasskeyAccess[]) {
  window.localStorage.setItem(PASSKEY_ACCESS_STORAGE_KEY, JSON.stringify(records))
}

function configuredAccessKeys(): string[] {
  const single = (import.meta.env.VITE_PASSKEY_ACCESS_KEY as string | undefined)?.trim()
  const many = (import.meta.env.VITE_PASSKEY_ACCESS_KEYS as string | undefined)
    ?.split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  const keys = [single, ...(many || [])].filter(Boolean) as string[]
  return Array.from(new Set(keys))
}

export function hasPasskeyAccess(email: string): boolean {
  const normalized = normalizeEmail(email)
  if (!normalized) return false
  return readAccessRecords().some((record) => normalizeEmail(record.email) === normalized)
}

export function unlockPasskeyAccess(email: string, secretKey: string): { ok: true } | { ok: false; error: string } {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) {
    return { ok: false, error: 'Enter your email first.' }
  }

  const key = secretKey.trim()
  if (!key) {
    return { ok: false, error: 'Enter the passkey access key you were issued.' }
  }

  const allowedKeys = configuredAccessKeys()
  if (allowedKeys.length === 0) {
    return {
      ok: false,
      error:
        'Passkey access keys are not configured yet. Set VITE_PASSKEY_ACCESS_KEY or VITE_PASSKEY_ACCESS_KEYS in .env.local.',
    }
  }

  if (!allowedKeys.includes(key)) {
    return { ok: false, error: 'Invalid passkey access key.' }
  }

  const existing = readAccessRecords().filter((record) => normalizeEmail(record.email) !== normalizedEmail)
  existing.push({
    email: normalizedEmail,
    unlockedAt: new Date().toISOString(),
  })
  writeAccessRecords(existing)

  return { ok: true }
}
