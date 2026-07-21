import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

export interface MeterReading {
  id: string
  meter_id: string
  reading_value: number
  reading_date: string
  recorded_by?: string
  source: 'manual' | 'automatic'
  notes?: string
  created_at: string
  meters?: {
    id: string
    serial_number: string
  }
}

export function useMeterReadings(meterId?: string) {
  const [data, setData] = useState<MeterReading[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('meter_readings')
        .select(
          `
          id,
          meter_id,
          reading_value,
          reading_date,
          recorded_by,
          source,
          notes,
          created_at,
          meters (
            id,
            serial_number
          )
        `
        )
        .order('reading_date', { ascending: false })

      if (meterId) {
        query = query.eq('meter_id', meterId)
      }

      const { data, error } = await query

      if (error) throw error
      setData(data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load meter readings')
    } finally {
      setLoading(false)
    }
  }, [meterId])

  useEffect(() => {
    load()

    const channel = supabase
      .channel('meter_readings_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meter_readings' }, () => load())
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  return { data, loading, error, refresh: load }
}
