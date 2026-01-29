'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useFilterStore } from '@/stores/filter-store'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Building2,
  Target,
  Filter,
  ChevronDown,
  Check,
  LayoutGrid,
  Table2
} from 'lucide-react'
import type { Company, OpportunityWithCompany } from '@/types/database'

const navItems = [
  { href: '/dashboard/timeline', label: 'Timeline', icon: LayoutGrid },
  { href: '/dashboard/table', label: 'Table', icon: Table2 },
]

export function SidebarFilters() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [opportunities, setOpportunities] = useState<OpportunityWithCompany[]>([])
  const supabase = createClient()
  const pathname = usePathname()

  const {
    sidebarCollapsed,
    toggleSidebar,
    opportunityMode,
    selectedOpportunityIds,
    companyMode,
    selectedCompanyIds,
    setOpportunityMode,
    toggleOpportunity,
    setSelectedOpportunities,
    setCompanyMode,
    toggleCompany,
    setSelectedCompanies,
    clearFilters,
  } = useFilterStore()

  useEffect(() => {
    const fetchData = async () => {
      const [companiesRes, opportunitiesRes] = await Promise.all([
        supabase.from('companies').select('*').order('name'),
        supabase.from('opportunities').select('*, companies(*)').order('name'),
      ])

      if (companiesRes.data) setCompanies(companiesRes.data)
      if (opportunitiesRes.data) setOpportunities(opportunitiesRes.data as OpportunityWithCompany[])
    }

    fetchData()
  }, [supabase])

  const hasActiveFilters = companyMode === 'select' || opportunityMode === 'select'

  // Collapsed view
  if (sidebarCollapsed) {
    return (
      <aside className="w-14 border-r bg-gray-50 flex flex-col items-center py-4 transition-all duration-300">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="mb-4"
          title="Expand sidebar"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* Page Navigation - Collapsed */}
        <div className="space-y-1 mb-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-10 h-10",
                    isActive && "bg-blue-100 text-blue-600"
                  )}
                  title={item.label}
                >
                  <Icon className="h-5 w-5" />
                </Button>
              </Link>
            )
          })}
        </div>

        <Separator className="w-8 mb-4" />

        <div className="space-y-3">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative",
              companyMode === 'select' && "text-blue-600"
            )}
            title="Companies filter"
          >
            <Building2 className="h-4 w-4" />
            {companyMode === 'select' && selectedCompanyIds.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {selectedCompanyIds.length}
              </span>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "relative",
              opportunityMode === 'select' && "text-blue-600"
            )}
            title="Opportunities filter"
          >
            <Target className="h-4 w-4" />
            {opportunityMode === 'select' && selectedOpportunityIds.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {selectedOpportunityIds.length}
              </span>
            )}
          </Button>
        </div>
      </aside>
    )
  }

  // Expanded view
  return (
    <aside className="w-64 border-r bg-gray-50 p-4 overflow-y-auto transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <h2 className="font-semibold text-sm uppercase text-gray-500">Filters</h2>
        </div>
        <div className="flex items-center gap-1">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 px-2 text-xs">
              <X className="h-3 w-3 mr-1" />
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-7 w-7"
            title="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Page Navigation - Expanded */}
      <div className="space-y-1 mb-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-2",
                  isActive && "bg-blue-100 text-blue-600 hover:bg-blue-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          )
        })}
      </div>

      <Separator className="mb-4" />

      {/* Companies Filter */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4 text-gray-400" />
          Companies
        </h3>

        <MultiSelectFilter
          mode={companyMode}
          selectedIds={selectedCompanyIds}
          items={companies.map(c => ({ id: c.id, label: c.name }))}
          onModeChange={setCompanyMode}
          onToggle={toggleCompany}
          onSelectAll={() => setSelectedCompanies(companies.map(c => c.id))}
          onClearAll={() => setSelectedCompanies([])}
          placeholder="Select companies..."
          allLabel="All Companies"
          selectLabel="Select Companies"
        />
      </div>

      <Separator className="my-4" />

      {/* Opportunities Filter */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Target className="h-4 w-4 text-gray-400" />
          Opportunities
        </h3>

        <MultiSelectFilter
          mode={opportunityMode}
          selectedIds={selectedOpportunityIds}
          items={opportunities.map(o => ({
            id: o.id,
            label: o.name,
            sublabel: o.companies?.name || o.company || undefined
          }))}
          onModeChange={setOpportunityMode}
          onToggle={toggleOpportunity}
          onSelectAll={() => setSelectedOpportunities(opportunities.map(o => o.id))}
          onClearAll={() => setSelectedOpportunities([])}
          placeholder="Select opportunities..."
          allLabel="All Opportunities"
          selectLabel="Select Opportunities"
        />
      </div>

      <Separator className="my-4" />

      {/* Legend */}
      <div className="space-y-3">
        <h3 className="font-medium text-sm">Status Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>Done</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-400" />
            <span>In-Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-400" />
            <span>Paused/On-Hold</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Planned</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-700" />
            <span>Not-Go</span>
          </div>
        </div>
      </div>

      <Separator className="my-4" />

      <div className="space-y-3">
        <h3 className="font-medium text-sm">Indicator Legend</h3>
        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span>Green - On Track</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400" />
            <span>Amber - In Progress</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Red - Needs Attention</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

// Multi-select filter component with popover
interface MultiSelectFilterProps {
  mode: 'all' | 'select'
  selectedIds: string[]
  items: { id: string; label: string; sublabel?: string }[]
  onModeChange: (mode: 'all' | 'select') => void
  onToggle: (id: string) => void
  onSelectAll: () => void
  onClearAll: () => void
  placeholder: string
  allLabel: string
  selectLabel: string
}

function MultiSelectFilter({
  mode,
  selectedIds,
  items,
  onModeChange,
  onToggle,
  onSelectAll,
  onClearAll,
  placeholder,
  allLabel,
  selectLabel,
}: MultiSelectFilterProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="space-y-2">
      {/* All option */}
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors",
          mode === 'all' ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
        )}
        onClick={() => onModeChange('all')}
      >
        <div className={cn(
          "w-4 h-4 rounded-full border-2 flex items-center justify-center",
          mode === 'all' ? "border-blue-600 bg-blue-600" : "border-gray-300"
        )}>
          {mode === 'all' && <Check className="h-3 w-3 text-white" />}
        </div>
        <span className="text-sm">{allLabel}</span>
      </div>

      {/* Select option with popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div
            className={cn(
              "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
              mode === 'select' ? "bg-blue-50 border border-blue-200" : "hover:bg-gray-100"
            )}
            onClick={() => {
              if (mode !== 'select') {
                onModeChange('select')
              }
              setOpen(true)
            }}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                mode === 'select' ? "border-blue-600 bg-blue-600" : "border-gray-300"
              )}>
                {mode === 'select' && <Check className="h-3 w-3 text-white" />}
              </div>
              <span className="text-sm">{selectLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              {mode === 'select' && selectedIds.length > 0 && (
                <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  {selectedIds.length}
                </span>
              )}
              <ChevronDown className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start" sideOffset={4}>
          {/* Header with actions */}
          <div className="flex items-center justify-between p-2 border-b bg-gray-50">
            <span className="text-xs font-medium text-gray-500">
              {selectedIds.length} of {items.length} selected
            </span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onSelectAll}
              >
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={onClearAll}
              >
                None
              </Button>
            </div>
          </div>

          {/* Scrollable list */}
          <div className="max-h-64 overflow-y-auto p-2 space-y-1">
            {items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-2 p-2 rounded cursor-pointer transition-colors",
                  selectedIds.includes(item.id) ? "bg-blue-50" : "hover:bg-gray-50"
                )}
                onClick={() => onToggle(item.id)}
              >
                <Checkbox
                  checked={selectedIds.includes(item.id)}
                  className="pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{item.label}</div>
                  {item.sublabel && (
                    <div className="text-xs text-gray-500 truncate">{item.sublabel}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="p-2 border-t bg-gray-50">
            <Button
              size="sm"
              className="w-full h-8"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
