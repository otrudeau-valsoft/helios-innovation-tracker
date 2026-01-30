'use client'

import { useState, useCallback, useOptimistic, useTransition, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PHASES, STATUS_CONFIG, INDICATOR_CONFIG } from '@/lib/constants'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useFilterStore, DEFAULT_COLUMN_WIDTHS } from '@/stores/filter-store'
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
import { CalendarIcon, ChevronDown, ChevronUp, ChevronsUpDown, Trash2, Check, X, HelpCircle, Link as LinkIcon, Paperclip, ChevronRight, FileText, GripVertical, Plus, ExternalLink, Pencil, Download } from 'lucide-react'
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
  },
  demo_links: {
    title: 'Demo',
    description: 'Demo links and recordings for this opportunity'
  },
  attachments: {
    title: 'Files',
    description: 'Attached files, screenshots, and documents'
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
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const { columnWidths, setColumnWidth, resetColumnWidths } = useFilterStore()
  const resizingRef = useRef<{ column: string; startX: number; startWidth: number } | null>(null)

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

  // Column resize handlers
  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault()
    resizingRef.current = {
      column,
      startX: e.clientX,
      startWidth: columnWidths[column] || DEFAULT_COLUMN_WIDTHS[column] || 100,
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return
    const delta = e.clientX - resizingRef.current.startX
    const newWidth = Math.max(30, resizingRef.current.startWidth + delta)
    setColumnWidth(resizingRef.current.column, newWidth)
  }

  const handleMouseUp = () => {
    resizingRef.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  // Resizable header component
  const ResizableHeader = ({
    column,
    children,
    className,
    sortable = false,
    field,
    tooltipKey
  }: {
    column: string
    children: React.ReactNode
    className?: string
    sortable?: boolean
    field?: SortField
    tooltipKey?: string
  }) => {
    const width = columnWidths[column] || DEFAULT_COLUMN_WIDTHS[column] || 100
    const info = COLUMN_DESCRIPTIONS[tooltipKey || column]

    return (
      <TableHead
        className={cn(
          "relative select-none group",
          sortable && "cursor-pointer hover:bg-gray-100",
          className
        )}
        style={{ width: `${width}px`, minWidth: `${width}px`, maxWidth: `${width}px` }}
        onClick={sortable && field ? () => handleSort(field) : undefined}
      >
        <div className="flex items-center gap-0.5 pr-2">
          {children}
          {info && (
            <Tooltip>
              <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                <HelpCircle className="h-3 w-3 text-gray-400 hover:text-gray-600 flex-shrink-0" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="font-medium">{info.title}</p>
                <p className="text-xs text-gray-500">{info.description}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {sortable && field && (
            sortField === field ? (
              sortDirection === 'asc' ? (
                <ChevronUp className="h-3 w-3 flex-shrink-0" />
              ) : (
                <ChevronDown className="h-3 w-3 flex-shrink-0" />
              )
            ) : (
              <ChevronsUpDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
            )
          )}
        </div>
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize bg-transparent hover:bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity"
          onMouseDown={(e) => handleMouseDown(column, e)}
          onClick={(e) => e.stopPropagation()}
        />
      </TableHead>
    )
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="rounded-lg overflow-hidden border text-xs">
        <Table className="table-fixed">
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-[24px] px-0.5"></TableHead>
              <ResizableHeader column="phase" sortable field="phase" tooltipKey="phase" className="px-1">Phase</ResizableHeader>
              <ResizableHeader column="company" sortable field="company" tooltipKey="company" className="px-1">Company</ResizableHeader>
              <ResizableHeader column="name" sortable field="name" tooltipKey="name" className="px-1">Opportunity</ResizableHeader>
              <ResizableHeader column="som" sortable field="estimated_som" tooltipKey="estimated_som" className="px-1">SOM</ResizableHeader>
              <ResizableHeader column="status" sortable field="status" tooltipKey="status" className="px-1">Status</ResizableHeader>
              <ResizableHeader column="m" tooltipKey="messaging" className="text-center px-0">Mes.</ResizableHeader>
              <ResizableHeader column="c" tooltipKey="campaign" className="text-center px-0">Camp.</ResizableHeader>
              <ResizableHeader column="p" tooltipKey="pricing" className="text-center px-0">Price.</ResizableHeader>
              <ResizableHeader column="s" tooltipKey="sales" className="text-center px-0">Sales</ResizableHeader>
              <ResizableHeader column="nextSteps" tooltipKey="next_steps" className="px-1">Next Steps</ResizableHeader>
              <ResizableHeader column="demo" tooltipKey="demo_links" className="text-center px-0">Demo</ResizableHeader>
              <ResizableHeader column="files" tooltipKey="attachments" className="text-center px-0">Files</ResizableHeader>
              <ResizableHeader column="target" sortable field="target_date" tooltipKey="target_date" className="px-1">Target</ResizableHeader>
              <TableHead className="w-[28px] px-0"></TableHead>
            </TableRow>
          </TableHeader>
        <TableBody>
          {sortedOpportunities.length === 0 ? (
            <TableRow>
              <TableCell colSpan={15} className="text-center text-gray-500 py-8">
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
                isExpanded={expandedRowId === opp.id}
                onToggleExpand={() => setExpandedRowId(expandedRowId === opp.id ? null : opp.id)}
                columnWidths={columnWidths}
                supabase={supabase}
                onPreviewImage={setPreviewImage}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>

    {/* Full-screen Image Preview */}
    {previewImage && (
      <div
        className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8"
        onClick={() => setPreviewImage(null)}
      >
        <button
          className="absolute top-6 right-6 text-white hover:text-gray-300 z-10"
          onClick={() => setPreviewImage(null)}
        >
          <X className="h-10 w-10" />
        </button>
        <img
          src={previewImage}
          alt="Preview"
          className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
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
  isExpanded: boolean
  onToggleExpand: () => void
  columnWidths: Record<string, number>
  supabase: ReturnType<typeof createClient>
  onPreviewImage: (url: string) => void
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
  isExpanded,
  onToggleExpand,
  columnWidths,
  supabase,
  onPreviewImage,
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

  const demoLinksCount = opportunity.demo_links?.length || 0
  const attachmentsCount = opportunity.attachments?.length || 0

  const hasExpandableContent = opportunity.description || opportunity.next_steps

  // Get width for a column
  const w = (col: string) => columnWidths[col] || DEFAULT_COLUMN_WIDTHS[col] || 100

  return (
    <>
      <TableRow className={cn("hover:bg-gray-50 h-8", isExpanded && "bg-blue-50")}>
        {/* Expand button */}
        <TableCell className="px-0 py-0.5" style={{ width: 24 }}>
          {hasExpandableContent ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={onToggleExpand}
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", isExpanded && "rotate-90")} />
            </Button>
          ) : (
            <span className="w-5 h-5 block" />
          )}
        </TableCell>

        {/* Phase */}
        <TableCell className="px-1 py-0.5 overflow-hidden" style={{ width: w('phase'), maxWidth: w('phase') }}>
          <Select
            value={String(opportunity.phase ?? 0)}
            onValueChange={(value) => updateField(opportunity.id, 'phase', parseInt(value))}
          >
            <SelectTrigger className="h-6 w-full border-0 bg-transparent hover:bg-gray-100 cursor-pointer text-[10px] px-0.5 gap-0">
              <span className={cn(
                'px-1.5 py-0.5 rounded text-[9px] font-medium text-white whitespace-nowrap',
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
                    <span className="text-xs">{p.shortName}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Company */}
        <TableCell className="px-1 py-0.5 overflow-hidden" style={{ width: w('company'), maxWidth: w('company') }}>
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
            <SelectTrigger className="w-full h-6 border-0 bg-transparent hover:bg-gray-100 cursor-pointer text-[10px] px-0.5 gap-0">
              <span className="truncate text-[10px]">{companyName || 'Select'}</span>
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-xs">
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>

        {/* Name */}
        <TableCell className="px-1 py-0.5 overflow-hidden" style={{ width: w('name'), maxWidth: w('name') }}>
          {isEditing && editingField === 'name' ? (
            <div className="flex items-center gap-0.5">
              <Input
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="h-5 text-[10px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditing()
                  if (e.key === 'Escape') cancelEditing()
                }}
              />
              <Button size="icon" variant="ghost" className="h-4 w-4 flex-shrink-0" onClick={saveEditing}>
                <Check className="h-2.5 w-2.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-4 w-4 flex-shrink-0" onClick={cancelEditing}>
                <X className="h-2.5 w-2.5" />
              </Button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="cursor-pointer hover:text-blue-600 font-medium text-[10px] truncate block"
                  onClick={() => startEditing('name', opportunity.name)}
                >
                  {opportunity.name}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <p className="text-xs">{opportunity.name}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </TableCell>

        {/* SOM */}
        <TableCell className="px-1 py-0.5" style={{ width: w('som'), maxWidth: w('som') }}>
          {isEditing && editingField === 'estimated_som' ? (
            <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
              <Input
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="h-5 w-12 text-[10px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEditing()
                  if (e.key === 'Escape') cancelEditing()
                }}
              />
              <Button size="icon" variant="ghost" className="h-4 w-4" onClick={saveEditing}>
                <Check className="h-2.5 w-2.5" />
              </Button>
            </div>
          ) : (
            <span
              className="cursor-pointer hover:text-blue-600 text-[10px] block"
              onClick={() => startEditing('estimated_som', opportunity.estimated_som?.toString() || '')}
            >
              {opportunity.estimated_som
                ? `$${(opportunity.estimated_som / 1000).toFixed(0)}k`
                : <span className="text-gray-400">-</span>}
            </span>
          )}
        </TableCell>

        {/* Status */}
        <TableCell className="px-1 py-0.5" style={{ width: w('status'), maxWidth: w('status') }}>
          <StatusSelect
            value={opportunity.status}
            onChange={(value) => updateField(opportunity.id, 'status', value)}
          />
        </TableCell>

        {/* Indicators */}
        <IndicatorCell
          value={opportunity.messaging_indicator || 'red'}
          onChange={(value) => updateField(opportunity.id, 'messaging_indicator', value)}
          width={w('m')}
        />
        <IndicatorCell
          value={opportunity.campaign_indicator || 'red'}
          onChange={(value) => updateField(opportunity.id, 'campaign_indicator', value)}
          width={w('c')}
        />
        <IndicatorCell
          value={opportunity.pricing_indicator || 'red'}
          onChange={(value) => updateField(opportunity.id, 'pricing_indicator', value)}
          width={w('p')}
        />
        <IndicatorCell
          value={opportunity.sales_alignment_indicator || 'red'}
          onChange={(value) => updateField(opportunity.id, 'sales_alignment_indicator', value)}
          width={w('s')}
        />

        {/* Next Steps */}
        <TableCell className="px-1 py-0.5 overflow-hidden" style={{ width: w('nextSteps'), maxWidth: w('nextSteps') }}>
          {opportunity.next_steps ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-gray-600 truncate block cursor-default">
                  {opportunity.next_steps}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-sm">
                <p className="text-xs whitespace-pre-wrap">{opportunity.next_steps}</p>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-gray-300 text-[10px]">-</span>
          )}
        </TableCell>

        {/* Demo Links - Clickable */}
        <TableCell className="text-center px-0 py-0.5" style={{ width: w('demo'), maxWidth: w('demo') }}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-6 px-1 text-[9px] cursor-pointer",
                  demoLinksCount > 0 ? "text-blue-500 hover:text-blue-700" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <LinkIcon className="h-3 w-3" />
                {demoLinksCount > 0 && <span className="ml-0.5">{demoLinksCount}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" side="bottom" align="center">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs">Demos</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => {
                      const newLink = prompt('Enter demo link URL:')
                      if (newLink) {
                        const currentLinks = opportunity.demo_links || []
                        updateField(opportunity.id, 'demo_links', [...currentLinks, newLink])
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {demoLinksCount > 0 ? (
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {opportunity.demo_links?.map((link, i) => (
                      <div key={i} className="flex items-center gap-1 group">
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-blue-600 hover:underline flex-1 truncate flex items-center gap-1"
                        >
                          <ExternalLink className="h-2.5 w-2.5 flex-shrink-0" />
                          {link}
                        </a>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-4 w-4 opacity-0 group-hover:opacity-100 text-red-500"
                          onClick={() => {
                            const newLinks = opportunity.demo_links?.filter((_, idx) => idx !== i) || []
                            updateField(opportunity.id, 'demo_links', newLinks)
                          }}
                        >
                          <X className="h-2.5 w-2.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 text-center py-2">No demo links yet</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>

        {/* Attachments - Clickable with image preview */}
        <TableCell className="text-center px-0 py-0.5" style={{ width: w('files'), maxWidth: w('files') }}>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-6 px-1 text-[9px] cursor-pointer",
                  attachmentsCount > 0 ? "text-blue-500 hover:text-blue-700" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Paperclip className="h-3 w-3" />
                {attachmentsCount > 0 && <span className="ml-0.5">{attachmentsCount}</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" side="bottom" align="center">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-xs">Files</span>
                  <span className="text-[10px] text-gray-400">(Upload via edit)</span>
                </div>
                {attachmentsCount > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {opportunity.attachments?.map((att) => {
                      const isImage = att.file_type?.startsWith('image/')
                      const publicUrl = supabase.storage.from('Attachments').getPublicUrl(att.file_path).data.publicUrl
                      return (
                        <div key={att.id} className="flex items-center gap-2 group p-1 rounded hover:bg-gray-50">
                          {isImage ? (
                            <img
                              src={publicUrl}
                              alt={att.file_name}
                              className="w-10 h-10 object-cover rounded cursor-pointer hover:opacity-80"
                              onClick={() => onPreviewImage(publicUrl)}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                              <FileText className="h-4 w-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                "text-[10px] text-gray-600 truncate block",
                                isImage && "cursor-pointer hover:text-blue-600"
                              )}
                              onClick={() => isImage && onPreviewImage(publicUrl)}
                            >
                              {att.file_name}
                            </span>
                          </div>
                          <a
                            href={publicUrl}
                            download={att.file_name}
                            className="text-blue-500 hover:text-blue-700 p-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Download className="h-3 w-3" />
                          </a>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-[10px] text-gray-400 text-center py-2">No files yet</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </TableCell>

        {/* Target Date */}
        <TableCell className="px-0 py-0.5" style={{ width: w('target'), maxWidth: w('target') }}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="h-6 px-1 text-[9px] w-full justify-start">
                {opportunity.target_date
                  ? format(new Date(opportunity.target_date), 'MMM d')
                  : <span className="text-gray-400">-</span>}
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
        <TableCell className="px-0 py-0.5" style={{ width: 28 }}>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={() => deleteOpportunity(opportunity.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </TableCell>
      </TableRow>

      {/* Expanded row for full details */}
      {isExpanded && (
        <TableRow className="bg-blue-50/50 border-t-0">
          <TableCell colSpan={15} className="py-3 px-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              {opportunity.description && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Description
                  </h4>
                  <p className="text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">
                    {opportunity.description}
                  </p>
                </div>
              )}
              {opportunity.next_steps && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    Next Steps
                  </h4>
                  <p className="text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">
                    {opportunity.next_steps}
                  </p>
                </div>
              )}
              {opportunity.demo_links && opportunity.demo_links.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <LinkIcon className="h-3 w-3" />
                    Demo Links
                  </h4>
                  <div className="space-y-1 bg-white p-2 rounded border">
                    {opportunity.demo_links.map((link, i) => (
                      <a
                        key={i}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline block truncate"
                      >
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function IndicatorCell({
  value,
  onChange,
  width,
}: {
  value: IndicatorStatus
  onChange: (value: IndicatorStatus) => void
  width?: number
}) {
  const safeValue = value && INDICATOR_CONFIG[value] ? value : 'red'
  const config = INDICATOR_CONFIG[safeValue]

  return (
    <TableCell className="text-center px-0 py-0.5" style={{ width: width || 32, maxWidth: width || 32 }}>
      <Select value={safeValue} onValueChange={onChange}>
        <SelectTrigger className="w-7 h-6 border-0 bg-transparent hover:bg-gray-100 mx-auto px-0 gap-0 cursor-pointer justify-center">
          <span className={cn('w-3.5 h-3.5 rounded-full flex-shrink-0', config.bgColor)} />
        </SelectTrigger>
        <SelectContent position="popper" sideOffset={4}>
          {Object.entries(INDICATOR_CONFIG).map(([key, cfg]) => (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <span className={cn('w-3 h-3 rounded-full', cfg.bgColor)} />
                <span className="capitalize text-xs">{key}</span>
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
      <SelectTrigger className="w-full h-6 border-0 bg-transparent hover:bg-gray-100 cursor-pointer text-xs px-1 gap-1">
        <div className="flex items-center gap-1">
          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', config.bgColor)} />
          <span className="text-[10px] truncate">{displayLabel}</span>
        </div>
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={4}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <SelectItem key={key} value={key}>
            <div className="flex items-center gap-2">
              <span className={cn('w-2 h-2 rounded-full', cfg.bgColor)} />
              <span className="text-xs">{cfg.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
