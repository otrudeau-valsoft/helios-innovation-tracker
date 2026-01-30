import type { OpportunityStatus, IndicatorStatus, PhaseNumber } from '@/types/database'

export const COMPANIES = [
  'Alessa',
  'Alltrust',
  'Cadis',
  'Carrus',
  'Cott',
  'Credex',
  'DCS',
  'E-Finances',
  'Finartis',
  'Keystone',
  'Lilee',
  'Monkeysoft',
  'Nova',
  'Polygon',
] as const

export const STATUS_CONFIG: Record<OpportunityStatus, { label: string; color: string; bgColor: string }> = {
  done: { label: 'Done', color: 'text-white', bgColor: 'bg-green-500' },
  in_progress: { label: 'In-Progress', color: 'text-black', bgColor: 'bg-yellow-400' },
  paused: { label: 'Paused/On-Hold', color: 'text-white', bgColor: 'bg-orange-400' },
  planned: { label: 'Planned', color: 'text-white', bgColor: 'bg-red-500' },
  not_go: { label: 'Not-Go', color: 'text-white', bgColor: 'bg-red-700' },
}

export const INDICATOR_CONFIG: Record<IndicatorStatus, { color: string; bgColor: string }> = {
  green: { color: 'text-white', bgColor: 'bg-green-500' },
  amber: { color: 'text-black', bgColor: 'bg-amber-400' },
  red: { color: 'text-white', bgColor: 'bg-red-500' },
}

export const INDICATOR_LABELS = {
  messaging_indicator: 'Msg',
  campaign_indicator: 'Camp',
  pricing_indicator: 'Price',
  sales_alignment_indicator: 'Sales',
} as const

export interface Phase {
  number: PhaseNumber
  name: string
  shortName: string
  duration: string
  bgColor: string
  headerBgColor: string
}

export const PHASES: Phase[] = [
  { number: '0', name: 'Identification & Assessment', shortName: 'I&A', duration: 'Ongoing', bgColor: 'bg-blue-50', headerBgColor: 'bg-blue-400' },
  { number: '1', name: 'Discovery/PoC Light', shortName: 'Discovery', duration: '1 Week', bgColor: 'bg-sky-100', headerBgColor: 'bg-sky-500' },
  { number: '2', name: 'Proof-of-Concept', shortName: 'PoC', duration: '2-4 Weeks', bgColor: 'bg-violet-100', headerBgColor: 'bg-violet-500' },
  { number: '3', name: 'MVP Pilot', shortName: 'MVP', duration: '4-6 Weeks', bgColor: 'bg-amber-100', headerBgColor: 'bg-amber-500' },
  { number: '4', name: 'Full Operational Deployment', shortName: 'Full Deploy', duration: 'Ongoing', bgColor: 'bg-emerald-100', headerBgColor: 'bg-emerald-600' },
]

export const getPhaseByNumber = (num: PhaseNumber): Phase => {
  return PHASES.find(p => p.number === num) || PHASES[0]
}
