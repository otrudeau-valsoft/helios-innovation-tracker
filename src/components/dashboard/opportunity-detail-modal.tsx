'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatusPill } from './status-pill'
import { createClient } from '@/lib/supabase/client'
import { getPhaseByNumber, INDICATOR_CONFIG } from '@/lib/constants'
import { format } from 'date-fns'
import type { OpportunityWithCompany, Attachment, PhaseNumber, IndicatorStatus } from '@/types/database'
import { parseDemoLink, getDemoLinkDisplay } from '@/types/database'
import {
  ExternalLink,
  Paperclip,
  Calendar,
  DollarSign,
  Download,
  FileText,
  Image as ImageIcon,
  File,
  X,
  Edit,
  Trash2,
  Plus,
  Link as LinkIcon,
  ZoomIn
} from 'lucide-react'

interface OpportunityDetailModalProps {
  open: boolean
  onClose: () => void
  opportunity: OpportunityWithCompany | null
  onEdit?: () => void
  onRefresh?: () => void
}

export function OpportunityDetailModal({
  open,
  onClose,
  opportunity,
  onEdit,
  onRefresh
}: OpportunityDetailModalProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open && opportunity) {
      fetchAttachments()
    }
  }, [open, opportunity])

  const fetchAttachments = async () => {
    if (!opportunity) return
    setLoading(true)
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('opportunity_id', opportunity.id)
      .order('uploaded_at', { ascending: false })
    setAttachments(data || [])
    setLoading(false)
  }

  const handleDeleteAttachment = async (attachmentId: string, filePath: string) => {
    // Delete from storage
    await supabase.storage.from('Attachments').remove([filePath])
    // Delete from database
    await supabase.from('attachments').delete().eq('id', attachmentId)
    // Refresh list
    fetchAttachments()
    onRefresh?.()
  }

  const getFileIcon = (fileType: string | null) => {
    if (fileType?.startsWith('image/')) return <ImageIcon className="h-5 w-5" />
    if (fileType === 'application/pdf') return <FileText className="h-5 w-5" />
    return <File className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (!opportunity) return null

  const phase = getPhaseByNumber(String(opportunity.phase) as PhaseNumber)
  const demoLinks = opportunity.demo_links || []

  const indicators = [
    { key: 'messaging_indicator', label: 'Messaging', value: opportunity.messaging_indicator },
    { key: 'campaign_indicator', label: 'Campaign', value: opportunity.campaign_indicator },
    { key: 'pricing_indicator', label: 'Pricing', value: opportunity.pricing_indicator },
    { key: 'sales_alignment_indicator', label: 'Sales', value: opportunity.sales_alignment_indicator },
  ]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                  {opportunity.companies?.name || opportunity.company}
                </Badge>
                <StatusPill status={opportunity.status} size="sm" />
              </div>
              <DialogTitle className="text-xl font-semibold">
                {opportunity.name}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <Badge className={`${phase.headerBgColor} text-white`}>
                  {phase.shortName}
                </Badge>
                {opportunity.estimated_som && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    {(opportunity.estimated_som / 1000).toFixed(0)}k
                  </span>
                )}
                {opportunity.target_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {format(new Date(opportunity.target_date), 'MMM d, yyyy')}
                  </span>
                )}
              </div>
            </div>
            {onEdit && (
              <Button variant="outline" size="sm" onClick={onEdit} className="gap-1">
                <Edit className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Description */}
          {opportunity.description && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{opportunity.description}</p>
            </div>
          )}

          {/* Indicators */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Status Indicators</h4>
            <div className="flex gap-4">
              {indicators.map(ind => {
                const config = ind.value ? INDICATOR_CONFIG[ind.value as IndicatorStatus] : null
                return (
                  <div key={ind.key} className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded-full ${config?.bgColor || 'bg-gray-200'}`}
                    />
                    <span className="text-sm text-gray-600">{ind.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Demos */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Demos
              {demoLinks.length > 0 && (
                <Badge variant="secondary" className="text-xs">{demoLinks.length}</Badge>
              )}
            </h4>
            {demoLinks.length > 0 ? (
              <div className="space-y-2">
                {demoLinks.map((linkStr, idx) => {
                  const link = parseDemoLink(linkStr)
                  return (
                    <a
                      key={idx}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                      title={link.url}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {getDemoLinkDisplay(link)}
                    </a>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No demos added</p>
            )}
          </div>

          <Separator />

          {/* Files */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Files
              {attachments.length > 0 && (
                <Badge variant="secondary" className="text-xs">{attachments.length}</Badge>
              )}
            </h4>
            {loading ? (
              <p className="text-sm text-gray-400">Loading...</p>
            ) : attachments.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {attachments.map(att => {
                  const isImage = att.file_type?.startsWith('image/')
                  const publicUrl = supabase.storage.from('Attachments').getPublicUrl(att.file_path).data.publicUrl

                  return (
                    <div
                      key={att.id}
                      className="border rounded-lg p-3 flex items-start gap-3 group hover:border-blue-300 transition-colors"
                    >
                      {isImage ? (
                        <div
                          className="relative w-12 h-12 cursor-pointer"
                          onClick={() => setPreviewImage(publicUrl)}
                        >
                          <img
                            src={publicUrl}
                            alt={att.file_name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 rounded flex items-center justify-center transition-colors">
                            <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                          {getFileIcon(att.file_type)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${isImage ? 'cursor-pointer hover:text-blue-600' : ''}`}
                          onClick={() => isImage && setPreviewImage(publicUrl)}
                        >
                          {att.file_name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(att.file_size)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isImage && (
                          <button
                            onClick={() => setPreviewImage(publicUrl)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="View full size"
                          >
                            <ZoomIn className="h-4 w-4" />
                          </button>
                        )}
                        <a
                          href={publicUrl}
                          download={att.file_name}
                          className="p-1 text-gray-400 hover:text-blue-600"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att.id, att.file_path)}
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No files</p>
            )}

          </div>

          {/* Next Steps */}
          {opportunity.next_steps && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Next Steps</h4>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{opportunity.next_steps}</p>
              </div>
            </>
          )}
        </div>
      </DialogContent>

      {/* Full-screen Image Preview - rendered outside dialog via portal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8"
          onClick={() => setPreviewImage(null)}
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
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
    </Dialog>
  )
}
