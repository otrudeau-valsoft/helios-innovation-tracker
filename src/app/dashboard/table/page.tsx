'use client'

import { useOpportunities } from '@/hooks/use-opportunities'
import { TableView } from '@/components/dashboard/table-view'
import { OpportunityModal } from '@/components/dashboard/opportunity-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

      {/* Helper Section */}
      {showHelper && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="py-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-medium text-blue-900">Quick Guide</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li><strong>Click on any cell</strong> to edit it inline (text fields open an input)</li>
                    <li><strong>Dropdowns</strong> are used for Phase, Company, Status, and Indicators</li>
                    <li><strong>Hover over column headers</strong> with <HelpCircle className="h-3 w-3 inline" /> icons to see descriptions</li>
                    <li><strong>Click column headers</strong> to sort (click again to reverse)</li>
                    <li><strong>Indicator colors:</strong> 🟢 Green = On Track, 🟡 Amber = In Progress, 🔴 Red = Needs Attention</li>
                    <li><strong>Press Enter</strong> to save edits, <strong>Escape</strong> to cancel</li>
                  </ul>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-blue-600 hover:text-blue-800"
                onClick={() => setShowHelper(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
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
