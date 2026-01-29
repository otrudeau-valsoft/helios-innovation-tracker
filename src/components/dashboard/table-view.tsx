'use client'

import { useState, useCallback, useOptimistic, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PHASES, STATUS_CONFIG, INDICATOR_CONFIG } from '@/lib/constants'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { CalendarIcon, ChevronDown, ChevronUp, ChevronsUpDown, Trash2, Check, X, HelpCircle } from 'lucide-react'
import type { Company, OpportunityWithCompany, OpportunityStatus, IndicatorStatus } from '@/types/database'

// Column descriptions for tooltips
const COLUMN_DESCRIPTIONS: Record<string, { title: string; description: string }> = {
  phase: {
    title: 'Phase',
    description: 'Current stage in the AI opportunity lifecycle: Phase 0 (Identification), Phase 1 (Discovery), Phase 2 (PoC), Phase 3 (MVP Pilot), Phase 4 (Full Deployment)'
  },
  company: {
    title: 'Company',
    description: 'The Helios portfolio company associated with this AI opportunity'
  },
  name: {
    title: 'Opportunity',
    description: 'Name or title of the AI initiative or project'
  },
  description: {
    title: 'Description',
    description: 'Brief description of the opportunity scope and objectives'
  },
  estimated_som: {
    title: '1-yr SOM',
    description: 'Estimated 1-year Serviceable Obtainable Market - the projected revenue potential within the first year'
  },
  status: {
    title: 'Status',
    description: 'Current status: Done (complete), In-Progress (active work), Paused (on hold), Planned (scheduled), Not-Go (rejected)'
  },
  messaging: {
    title: 'Messaging',
    description: 'Readiness of marketing messaging and value proposition. Green = Ready, Amber = In Progress, Red = Needs Attention'
  },
  campaign: {
    title: 'Campaign',
    description: 'Marketing campaign readiness and execution status. Green = Ready, Amber = In Progress, Red = Needs Attention'
  },
  pricing: {
    title: 'Pricing',
    description: 'Pricing strategy and model readiness. Green = Ready, Amber = In Progress, Red = Needs Attention'
  },
  sales: {
    title: 'Sales Alignment',
    description: 'Sales team readiness and alignment with the opportunity. Green = Ready, Amber = In Progress, Red = Needs Attention'
  },
  next_steps: {
    title: 'Next Steps',
    description: 'Immediate action items or next milestones for this opportunity'
  },
  target_date: {
    title: 'Target Date',
    description: 'Target completion or milestone date for the current phase'
  }
}

type SortField = 'name' | 'company' | 'estimated_som' | 'status' | 'phase' | 'target_date'
type SortDirection = 'asc' | 'desc'

interface TableViewProps {
  opportunities: OpportunityWithCompany[]
  companies: Company[]
  onRefresh: () => void
}

export function TableView({ opportunities, companies, onRefresh }: TableViewProps) {
  const [sortField, setSortField] = useState<SortField>('phase')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Optimistic state for opportunities
  const [optimisticOpportunities, setOptimisticOpportunities] = useOptimistic(
    opportunities,
    (state, update: { id: string; field: string; value: unknown }) => {
      return state.map((opp) =>
        opp.id === update.id ? { ...opp, [update.field]: update.value } : opp
      )
    }
  )

  const supabase = createClient()

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedOpportunities = [...optimisticOpportunities].sort((a, b) => {
    let comparison = 0
    switch (sortField) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
        break
      case 'company':
        comparison = (a.companies?.name || a.company || '').localeCompare(b.companies?.name || b.company || '')
        break
      case 'estimated_som':
        comparison = (a.estimated_som || 0) - (b.estimated_som || 0)
        break
      case 'status':
        comparison = String(a.status || '').localeCompare(String(b.status || ''))
        break
      case 'phase':
        comparison = (a.phase ?? 0) - (b.phase ?? 0)
        break
      case 'target_date':
        comparison = (a.target_date || '').localeCompare(b.target_date || '')
        break
    }
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const updateField = useCallback(
    async (id: string, field: string, value: unknown) => {
      // Optimistically update the UI
      startTransition(() => {
        setOptimisticOpportunities({ id, field, value })
      })

      // Actually persist to database
      await supabase.from('opportunities').update({ [field]: value } as never).eq('id', id)

      // Refresh in background to sync any server-side changes
      startTransition(() => {
        onRefresh()
      })

      setEditingId(null)
      setEditingField(null)
    },
    [supabase, onRefresh, setOptimisticOpportunities, startTransition]
  )

  const deleteOpportunity = useCallback(
    async (id: string) => {
      if (!confirm('Are you sure you want to delete this opportunity?')) return
      await supabase.from('opportunities').delete().eq('id', id)
      onRefresh()
    },
    [supabase, onRefresh]
  )

  const SortHeader = ({ field, children, className, tooltipKey }: { field: SortField; children: React.ReactNode; className?: string; tooltipKey?: string }) => {
    const info = COLUMN_DESCRIPTIONS[tooltipKey || field]
    return (
      <TableHead
        className={cn("cursor-pointer hover:bg-gray-100 select-none", className)}
        onClick={() => handleSort(field)}
      >
        <div className="flex items-center gap-1">
          {children}
          {info && (
            <Tooltip>
              <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{info.title}</p>
                <p className="text-xs text-gray-500">{info.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {sortField === field ? (
            sortDirection === 'asc' ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )
          ) : (
            <ChevronsUpDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </TableHead>
    )
  }

  // Header with tooltip but no sorting
  const HeaderWithTooltip = ({ children, tooltipKey, className }: { children: React.ReactNode; tooltipKey: string; className?: string }) => {
    const info = COLUMN_DESCRIPTIONS[tooltipKey]
    return (
      <TableHead className={className}>
        <div className="flex items-center gap-1">
          {children}
          {info && (
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{info.title}</p>
                <p className="text-xs text-gray-500">{info.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </TableHead>
    )
  }

  // Get phase info for display
  const getPhaseInfo = (phaseNum: number) => {
    const phase = PHASES.find(p => p.number === String(phaseNum))
    return phase || PHASES[0]
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-lg overflow-hidden border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <SortHeader field="phase" className="w-28" tooltipKey="phase">Phase</SortHeader>
              <SortHeader field="company" tooltipKey="company">Company</SortHeader>
              <SortHeader field="name" tooltipKey="name">Opportunity</SortHeader>
              <HeaderWithTooltip tooltipKey="description">Description</HeaderWithTooltip>
              <SortHeader field="estimated_som" tooltipKey="estimated_som">1-yr SOM</SortHeader>
              <SortHeader field="status" tooltipKey="status">Status</SortHeader>
              <HeaderWithTooltip tooltipKey="messaging" className="text-center">Msg</HeaderWithTooltip>
              <HeaderWithTooltip tooltipKey="campaign" className="text-center">Camp</HeaderWithTooltip>
              <HeaderWithTooltip tooltipKey="pricing" className="text-center">Price</HeaderWithTooltip>
              <HeaderWithTooltip tooltipKey="sales" className="text-center">Sales</HeaderWithTooltip>
              <HeaderWithTooltip tooltipKey="next_steps">Next Steps</HeaderWithTooltip>
              <SortHeader field="target_date" tooltipKey="target_date">Target Date</SortHeader>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {sortedOpportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={13} className="text-center text-gray-500 py-8">
                No opportunities found
              </TableCell>
            </TableRow>
          ) : (
            sortedOpportunities.map((opp) => (
              <OpportunityRow
                key={opp.id}
                opportunity={opp}
                companies={companies}
                editingId={editingId}
                editingField={editingField}
                setEditingId={setEditingId}
                setEditingField={setEditingField}
                updateField={updateField}
                deleteOpportunity={deleteOpportunity}
                getPhaseInfo={getPhaseInfo}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
    </TooltipProvider>
  )
}

interface OpportunityRowProps {
  opportunity: OpportunityWithCompany
  companies: Company[]
  editingId: string | null
  editingField: string | null
  setEditingId: (id: string | null) => void
  setEditingField: (field: string | null) => void
  updateField: (id: string, field: string, value: unknown) => void
  deleteOpportunity: (id: string) => void
  getPhaseInfo: (phaseNum: number) => { number: string; name: string; shortName: string; headerBgColor: string }
}

function OpportunityRow({
  opportunity,
  companies,
  editingId,
  editingField,
  setEditingId,
  setEditingField,
  updateField,
  deleteOpportunity,
  getPhaseInfo,
}: OpportunityRowProps) {
  const isEditing = editingId === opportunity.id
  const [tempValue, setTempValue] = useState<string>('')

  const startEditing = (field: string, currentValue: string) => {
    setEditingId(opportunity.id)
    setEditingField(field)
    setTempValue(currentValue)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingField(null)
    setTempValue('')
  }

  const saveEditing = () => {
    if (editingField) {
      let value: unknown = tempValue
      if (editingField === 'estimated_som') {
        value = tempValue ? parseFloat(tempValue) : null
      }
      updateField(opportunity.id, editingField, value)
    }
  }

  const companyName = opportunity.companies?.name || opportunity.company || ''
  const phaseInfo = getPhaseInfo(opportunity.phase ?? 0)

  return (
    <TableRow className="hover:bg-gray-50">
      {/* Phase */}
      <TableCell>
        <Select
          value={String(opportunity.phase ?? 0)}
          onValueChange={(value) => updateField(opportunity.id, 'phase', parseInt(value))}
        >
          <SelectTrigger className="h-8 w-full border hover:border-gray-400 cursor-pointer">
            <span className={cn(
              'px-2 py-0.5 rounded text-xs font-medium text-white',
              phaseInfo.headerBgColor
            )}>
              {phaseInfo.shortName}
            </span>
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {PHASES.map((p) => (
              <SelectItem key={p.number} value={p.number}>
                <div className="flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full', p.headerBgColor)} />
                  <span>Phase {p.number}: {p.shortName}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Company */}
      <TableCell>
        <Select
          value={opportunity.company_id || ''}
          onValueChange={(value) => {
            const selectedCompany = companies.find(c => c.id === value)
            updateField(opportunity.id, 'company_id', value)
            if (selectedCompany) {
              updateField(opportunity.id, 'company', selectedCompany.name)
            }
          }}
        >
          <SelectTrigger className="w-full h-8 hover:border-gray-400 cursor-pointer">
            <SelectValue placeholder={companyName || 'Select'} />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Name */}
      <TableCell>
        {isEditing && editingField === 'name' ? (
          <div className="flex items-center gap-1">
            <Input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="h-8 w-40"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing()
                if (e.key === 'Escape') cancelEditing()
              }}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditing}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span
            className="cursor-pointer hover:text-blue-600 font-medium"
            onClick={() => startEditing('name', opportunity.name)}
          >
            {opportunity.name}
          </span>
        )}
      </TableCell>

      {/* Description */}
      <TableCell className="max-w-40">
        {isEditing && editingField === 'description' ? (
          <div className="flex items-center gap-1">
            <Input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing()
                if (e.key === 'Escape') cancelEditing()
              }}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditing}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span
            className="cursor-pointer hover:text-blue-600 text-sm text-gray-600 line-clamp-2"
            onClick={() => startEditing('description', opportunity.description || '')}
          >
            {opportunity.description || '-'}
          </span>
        )}
      </TableCell>

      {/* SOM */}
      <TableCell
        className="cursor-pointer hover:bg-gray-100"
        onClick={() => {
          if (!isEditing || editingField !== 'estimated_som') {
            startEditing('estimated_som', opportunity.estimated_som?.toString() || '')
          }
        }}
      >
        {isEditing && editingField === 'estimated_som' ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Input
              type="number"
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="h-8 w-24"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing()
                if (e.key === 'Escape') cancelEditing()
              }}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditing}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span className="hover:text-blue-600 block min-w-[60px]">
            {opportunity.estimated_som
              ? `$${opportunity.estimated_som.toLocaleString()}`
              : '-'}
          </span>
        )}
      </TableCell>

      {/* Status */}
      <TableCell>
        <StatusSelect
          value={opportunity.status}
          onChange={(value) => updateField(opportunity.id, 'status', value)}
        />
      </TableCell>

      {/* Indicators */}
      <IndicatorCell
        value={opportunity.messaging_indicator || 'red'}
        onChange={(value) => updateField(opportunity.id, 'messaging_indicator', value)}
      />
      <IndicatorCell
        value={opportunity.campaign_indicator || 'red'}
        onChange={(value) => updateField(opportunity.id, 'campaign_indicator', value)}
      />
      <IndicatorCell
        value={opportunity.pricing_indicator || 'red'}
        onChange={(value) => updateField(opportunity.id, 'pricing_indicator', value)}
      />
      <IndicatorCell
        value={opportunity.sales_alignment_indicator || 'red'}
        onChange={(value) => updateField(opportunity.id, 'sales_alignment_indicator', value)}
      />

      {/* Next Steps */}
      <TableCell className="max-w-40">
        {isEditing && editingField === 'next_steps' ? (
          <div className="flex items-center gap-1">
            <Input
              value={tempValue}
              onChange={(e) => setTempValue(e.target.value)}
              className="h-8"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEditing()
                if (e.key === 'Escape') cancelEditing()
              }}
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={saveEditing}>
              <Check className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={cancelEditing}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <span
            className="cursor-pointer hover:text-blue-600 text-sm text-gray-600 line-clamp-2"
            onClick={() => startEditing('next_steps', opportunity.next_steps || '')}
          >
            {opportunity.next_steps || '-'}
          </span>
        )}
      </TableCell>

      {/* Target Date */}
      <TableCell>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-8 px-2 text-xs">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {opportunity.target_date
                ? format(new Date(opportunity.target_date), 'MMM d, yyyy')
                : 'Set date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={opportunity.target_date ? new Date(opportunity.target_date) : undefined}
              onSelect={(date) =>
                updateField(
                  opportunity.id,
                  'target_date',
                  date ? format(date, 'yyyy-MM-dd') : null
                )
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </TableCell>

      {/* Delete */}
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => deleteOpportunity(opportunity.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

function IndicatorCell({
  value,
  onChange,
}: {
  value: IndicatorStatus
  onChange: (value: IndicatorStatus) => void
}) {
  const safeValue = value && INDICATOR_CONFIG[value] ? value : 'red'
  const config = INDICATOR_CONFIG[safeValue]

  return (
    <TableCell className="text-center px-1">
      <Select value={safeValue} onValueChange={onChange}>
        <SelectTrigger className="w-14 h-8 border hover:border-gray-400 mx-auto px-2 gap-1 cursor-pointer">
          <span className={cn('w-4 h-4 rounded-full flex-shrink-0', config.bgColor)} />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          {Object.entries(INDICATOR_CONFIG).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <span className={cn('w-3 h-3 rounded-full', cfg.bgColor)} />
                <span className="capitalize">{key}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </TableCell>
  )
}

function StatusSelect({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const DEFAULT_CONFIG = { label: 'Unknown', color: 'text-gray-700', bgColor: 'bg-gray-200' }
  const normalizedValue = value?.toLowerCase().replace(/[^a-z_]/g, '_')
  const isKnownStatus = normalizedValue && STATUS_CONFIG[normalizedValue as keyof typeof STATUS_CONFIG]
  const config = isKnownStatus ? STATUS_CONFIG[normalizedValue as keyof typeof STATUS_CONFIG] : DEFAULT_CONFIG
  const displayLabel = isKnownStatus ? config.label : (value || 'Unknown')

  return (
    <Select value={isKnownStatus ? normalizedValue : 'planned'} onValueChange={onChange}>
      <SelectTrigger className="w-full h-8 hover:border-gray-400 cursor-pointer">
        <div className="flex items-center gap-2">
          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', config.bgColor)} />
          <span className="text-xs truncate">{displayLabel}</span>
        </div>
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full', cfg.bgColor)} />
              {cfg.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
