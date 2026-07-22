import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { isDemoRuntime } from '../lib/runtimeMode'

export function useAlertCount() {
  const [count, setCount] = useState(0)

  const load = useCallback(async () => {
    if (isDemoRuntime()) {
      setCount(2)
      return
    }

    const { count: unresolved } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false)

    setCount(unresolved ?? 0)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { count, refresh: load }
}
