type DemoCollection = 'customers' | 'meters' | 'bills' | 'payments'

const PREFIX = 'wms_demo_mutable'

function keyFor(collection: DemoCollection): string {
  return `${PREFIX}:${collection}`
}

export function readDemoCollection<T>(collection: DemoCollection): T[] {
  try {
    const raw = window.localStorage.getItem(keyFor(collection))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as T[]) : []
  } catch {
    return []
  }
}

export function writeDemoCollection<T>(collection: DemoCollection, rows: T[]): void {
  window.localStorage.setItem(keyFor(collection), JSON.stringify(rows))
}

export function appendDemoCollection<T>(collection: DemoCollection, row: T): T[] {
  const current = readDemoCollection<T>(collection)
  const next = [row, ...current]
  writeDemoCollection(collection, next)
  return next
}
