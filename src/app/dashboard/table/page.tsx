'use client'

import { useOpportunities } from '@/hooks/use-opportunities'
import { TableView } from '@/components/dashboard/table-view'
import { OpportunityModal } from '@/components/dashboard/opportunity-modal'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, HelpCircle, X } from 'lucide-react'
import { useState } from 'react'

export default function TablePage() {
  const { opportunities, companies, loading, error, refetch } = useOpportunities()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showHelper, setShowHelper] = useState(true)

  const handleCreateNew = () => {
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <Button variant="outline" size="sm" onClick={refetch} className="mt-2">
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Opportunity Pipeline</h1>
          <p className="text-gray-500 text-sm">Table view with inline editing</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHelper(!showHelper)}
            className={showHelper ? 'bg-blue-50' : ''}
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreateNew}>
            <Plus className="h-4 w-4 mr-2" />
            Add Opportunity
          </Button>
        </div>
      </div>

      {/* Helper Banner */}
      {showHelper && (
        <div className="flex items-center gap-4 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
          <span className="flex items-center gap-1.5">
            <span className="font-medium">Click cells</span> to edit
          </span>
          <span className="text-blue-300">•</span>
          <span className="flex items-center gap-1.5">
            <span className="font-medium">Headers</span> to sort
          </span>
          <span className="text-blue-300">•</span>
          <span className="flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" /> for column info
          </span>
          <span className="text-blue-300">•</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span>indicators</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 ml-auto text-blue-600 hover:text-blue-800 hover:bg-blue-100"
            onClick={() => setShowHelper(false)}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <TableView
        opportunities={opportunities}
        companies={companies}
        onRefresh={refetch}
      />

      <OpportunityModal
        open={isModalOpen}
        onClose={handleCloseModal}
        opportunity={null}
        companies={companies}
        onSave={refetch}
      />
    </div>
  )
}
