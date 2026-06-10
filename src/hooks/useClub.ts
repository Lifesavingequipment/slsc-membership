import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Club } from '../types/database'

export function useClub() {
  const [club, setClub] = useState<Club | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('clubs')
      .select('*')
      .limit(1)
      .single()
      .then(({ data }) => {
        setClub(data)
        setLoading(false)
      })
  }, [])

  return { club, loading }
}
