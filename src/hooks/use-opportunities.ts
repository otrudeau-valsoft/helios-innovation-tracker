'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useFilterStore } from '@/stores/filter-store'
import type { OpportunityWithCompany, Company } from '@/types/database'

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<OpportunityWithCompany[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()
  const { companyMode, selectedCompanyIds, opportunityMode, selectedOpportunityIds } = useFilterStore()

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('*')
        .order('name')

      if (companiesError) throw companiesError
      setCompanies(companiesData || [])

      // Build opportunities query - join with companies and attachments tables
      let query = supabase
        .from('opportunities')
        .select('*, companies(*), attachments(*)')
        .order('phase')
        .order('sort_order')

      // Apply company filter
      if (companyMode === 'select' && selectedCompanyIds.length > 0) {
        query = query.in('company_id', selectedCompanyIds)
      }

      // Apply opportunity filter
      if (opportunityMode === 'select' && selectedOpportunityIds.length > 0) {
        query = query.in('id', selectedOpportunityIds)
      }

      const { data: oppsData, error: oppsError } = await query

      if (oppsError) throw oppsError
      setOpportunities((oppsData as OpportunityWithCompany[]) || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }, [supabase, companyMode, selectedCompanyIds, opportunityMode, selectedOpportunityIds])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('opportunities-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'opportunities' },
        () => {
          fetchData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchData])

  return { opportunities, companies, loading, error, refetch: fetchData }
}
