import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isDemoRuntime } from '../lib/runtimeMode'

export function useNotificationCount() {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (isDemoRuntime()) {
      setCount(3)
      return
    }

    const { count: unread, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .in('status', ['queued', 'sent'])

    // Keep the shell stable even when optional notification tables are not present.
    if (error) {
      setCount(0)
      return
    }

    setCount(unread ?? 0)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { count, refresh: load }
}
