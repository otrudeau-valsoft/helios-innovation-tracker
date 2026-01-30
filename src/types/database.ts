export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Status can be any of these values (stored as text in DB)
export type OpportunityStatus = 'done' | 'in_progress' | 'paused' | 'planned' | 'not_go'
export type IndicatorStatus = 'green' | 'amber' | 'red'
export type PhaseNumber = '0' | '1' | '2' | '3' | '4'

export interface Database {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      opportunities: {
        Row: {
          id: string
          parent_id: string | null
          company: string | null
          company_id: string | null
          name: string
          description: string | null
          phase: number
          stage: string | null
          status: string
          arr: number | null
          nrr: number | null
          estimated_som: number | null
          som_currency: string | null
          next_steps: string | null
          target_date: string | null
          issues: string | null
          unlocks: string | null
          messaging_indicator: IndicatorStatus | null
          campaign_indicator: IndicatorStatus | null
          pricing_indicator: IndicatorStatus | null
          sales_alignment_indicator: IndicatorStatus | null
          rating_messaging: string | null
          rating_campaign: string | null
          rating_pricing: string | null
          rating_sales_alignment: string | null
          rating_implementation: string | null
          rating_workflow: string | null
          rating_enablement: string | null
          rating_kpis: string | null
          rating_next_steps: string | null
          rating_target_date: string | null
          sort_order: number
          created_at: string
          updated_at: string
          customer: string | null
          demo_links: string[] | null
        }
        Insert: {
          id: string  // Required - no default
          parent_id?: string | null
          company?: string | null
          company_id?: string | null
          name: string
          description?: string | null
          phase?: number
          stage?: string | null
          status?: string
          arr?: number | null
          nrr?: number | null
          estimated_som?: number | null
          som_currency?: string | null
          next_steps?: string | null
          target_date?: string | null
          issues?: string | null
          unlocks?: string | null
          messaging_indicator?: IndicatorStatus | null
          campaign_indicator?: IndicatorStatus | null
          pricing_indicator?: IndicatorStatus | null
          sales_alignment_indicator?: IndicatorStatus | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          customer?: string | null
          demo_links?: string[] | null
        }
        Update: {
          id?: string
          parent_id?: string | null
          company?: string | null
          company_id?: string | null
          name?: string
          description?: string | null
          phase?: number
          stage?: string | null
          status?: string
          arr?: number | null
          nrr?: number | null
          estimated_som?: number | null
          som_currency?: string | null
          next_steps?: string | null
          target_date?: string | null
          issues?: string | null
          unlocks?: string | null
          messaging_indicator?: IndicatorStatus | null
          campaign_indicator?: IndicatorStatus | null
          pricing_indicator?: IndicatorStatus | null
          sales_alignment_indicator?: IndicatorStatus | null
          sort_order?: number
          created_at?: string
          updated_at?: string
          customer?: string | null
          demo_links?: string[] | null
        }
      }
      attachments: {
        Row: {
          id: string
          opportunity_id: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          opportunity_id: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          opportunity_id?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
      }
    }
    Enums: {
      indicator_status: IndicatorStatus
    }
  }
}

export type Company = Database['public']['Tables']['companies']['Row']
export type Opportunity = Database['public']['Tables']['opportunities']['Row']
export type OpportunityInsert = Database['public']['Tables']['opportunities']['Insert']
export type OpportunityUpdate = Database['public']['Tables']['opportunities']['Update']

export interface OpportunityWithCompany extends Opportunity {
  companies?: Company | null  // Supabase returns this as 'companies' when using select with join
  attachments?: Attachment[]  // For joined queries
}

export type Attachment = Database['public']['Tables']['attachments']['Row']
export type AttachmentInsert = Database['public']['Tables']['attachments']['Insert']

// Demo link with optional label - stored as "label|url" or just "url"
export interface DemoLink {
  label: string
  url: string
}

// Parse a demo link string into label and url
export function parseDemoLink(link: string): DemoLink {
  const pipeIndex = link.indexOf('|')
  if (pipeIndex > 0 && pipeIndex < link.length - 1) {
    return {
      label: link.substring(0, pipeIndex),
      url: link.substring(pipeIndex + 1)
    }
  }
  // No label, use URL as label (show domain or full URL)
  return { label: '', url: link }
}

// Serialize a demo link back to string
export function serializeDemoLink(link: DemoLink): string {
  if (link.label && link.label.trim()) {
    return `${link.label}|${link.url}`
  }
  return link.url
}

// Get display text for a demo link
export function getDemoLinkDisplay(link: DemoLink): string {
  if (link.label && link.label.trim()) {
    return link.label
  }
  // Extract domain from URL for display
  try {
    const url = new URL(link.url)
    return url.hostname.replace('www.', '')
  } catch {
    return link.url
  }
}
