'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PHASES, STATUS_CONFIG, INDICATOR_CONFIG } from '@/lib/constants'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, Trash2, Plus, X, Link as LinkIcon, Paperclip, ZoomIn } from 'lucide-react'
import { FileUpload } from '@/components/ui/file-upload'
import { Separator } from '@/components/ui/separator'
import type { Attachment } from '@/types/database'
import { cn } from '@/lib/utils'
import type { Company, OpportunityWithCompany, OpportunityStatus, IndicatorStatus, PhaseNumber } from '@/types/database'

interface OpportunityModalProps {
  open: boolean
  onClose: () => void
  opportunity: OpportunityWithCompany | null
  companies: Company[]
  onSave: () => void
}

export function OpportunityModal({
  open,
  onClose,
  opportunity,
  companies,
  onSave,
}: OpportunityModalProps) {
  const supabase = createClient()
  const isEditing = !!opportunity

  const [formData, setFormData] = useState({
    company_id: '',
    company: '',  // Text field for company name
    name: '',
    description: '',
    estimated_som: '',
    status: 'planned' as OpportunityStatus,
    messaging_indicator: 'red' as IndicatorStatus,
    campaign_indicator: 'red' as IndicatorStatus,
    pricing_indicator: 'red' as IndicatorStatus,
    sales_alignment_indicator: 'red' as IndicatorStatus,
    next_steps: '',
    target_date: null as Date | null,
    phase: 0,  // Number, not string
  })

  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [demoLinks, setDemoLinks] = useState<string[]>([])
  const [newLink, setNewLink] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [uploading, setUploading] = useState(false)
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  useEffect(() => {
    if (opportunity) {
      setFormData({
        company_id: opportunity.company_id || '',
        company: opportunity.company || '',
        name: opportunity.name,
        description: opportunity.description || '',
        estimated_som: opportunity.estimated_som?.toString() || '',
        status: (opportunity.status as OpportunityStatus) || 'planned',
        messaging_indicator: opportunity.messaging_indicator || 'red',
        campaign_indicator: opportunity.campaign_indicator || 'red',
        pricing_indicator: opportunity.pricing_indicator || 'red',
        sales_alignment_indicator: opportunity.sales_alignment_indicator || 'red',
        next_steps: opportunity.next_steps || '',
        target_date: opportunity.target_date ? new Date(opportunity.target_date) : null,
        phase: typeof opportunity.phase === 'number' ? opportunity.phase : parseInt(String(opportunity.phase)) || 0,
      })
      setDemoLinks(opportunity.demo_links || [])
      // Fetch attachments
      fetchAttachments(opportunity.id)
    } else {
      setFormData({
        company_id: companies[0]?.id || '',
        company: companies[0]?.name || '',
        name: '',
        description: '',
        estimated_som: '',
        status: 'planned',
        messaging_indicator: 'red',
        campaign_indicator: 'red',
        pricing_indicator: 'red',
        sales_alignment_indicator: 'red',
        next_steps: '',
        target_date: null,
        phase: 0,
      })
      setDemoLinks([])
      setAttachments([])
    }
  }, [opportunity, companies])

  const fetchAttachments = async (opportunityId: string) => {
    const { data } = await supabase
      .from('attachments')
      .select('*')
      .eq('opportunity_id', opportunityId)
      .order('uploaded_at', { ascending: false })
    setAttachments(data || [])
  }

  const handleAddLink = () => {
    if (newLink.trim()) {
      // Add https:// if no protocol specified
      let url = newLink.trim()
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      setDemoLinks([...demoLinks, url])
      setNewLink('')
    }
  }

  const handleRemoveLink = (index: number) => {
    setDemoLinks(demoLinks.filter((_, i) => i !== index))
  }

  const handleFileUpload = async (file: File) => {
    if (!opportunity) return
    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const filePath = `${opportunity.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('Attachments')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Storage upload error:', uploadError)
        alert(`Upload failed: ${uploadError.message}. Make sure the 'attachments' storage bucket exists and has proper policies.`)
        throw uploadError
      }

      // Save to database
      const { error: dbError } = await supabase.from('attachments').insert({
        opportunity_id: opportunity.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
      } as never)

      if (dbError) {
        console.error('Database insert error:', dbError)
        alert(`Failed to save attachment record: ${dbError.message}`)
        throw dbError
      }

      // Refresh attachments list
      fetchAttachments(opportunity.id)
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteAttachment = async (attachment: Attachment) => {
    await supabase.storage.from('Attachments').remove([attachment.file_path])
    await supabase.from('attachments').delete().eq('id', attachment.id)
    setAttachments(attachments.filter(a => a.id !== attachment.id))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Find company name from selected company_id
      const selectedCompany = companies.find(c => c.id === formData.company_id)

      const data: Record<string, unknown> = {
        company_id: formData.company_id || null,
        company: selectedCompany?.name || formData.company || null,
        name: formData.name,
        description: formData.description || null,
        estimated_som: formData.estimated_som ? parseFloat(formData.estimated_som) : null,
        status: formData.status as string,
        messaging_indicator: formData.messaging_indicator,
        campaign_indicator: formData.campaign_indicator,
        pricing_indicator: formData.pricing_indicator,
        sales_alignment_indicator: formData.sales_alignment_indicator,
        next_steps: formData.next_steps || null,
        target_date: formData.target_date ? format(formData.target_date, 'yyyy-MM-dd') : null,
        phase: formData.phase,
        demo_links: demoLinks.length > 0 ? demoLinks : null,
      }

      if (isEditing && opportunity) {
        await supabase.from('opportunities').update(data as never).eq('id', opportunity.id)
      } else {
        // Generate a unique ID since the table requires it
        const newId = crypto.randomUUID()
        await supabase.from('opportunities').insert({ ...data, id: newId } as never)
      }

      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to save opportunity:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!opportunity) return
    if (!confirm('Are you sure you want to delete this opportunity?')) return

    setDeleting(true)
    try {
      await supabase.from('opportunities').delete().eq('id', opportunity.id)
      onSave()
      onClose()
    } catch (error) {
      console.error('Failed to delete opportunity:', error)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Opportunity' : 'Create New Opportunity'}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Company */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Company</Label>
            <Select
              value={formData.company_id}
              onValueChange={(value) => {
                const selectedCompany = companies.find(c => c.id === value)
                setFormData({
                  ...formData,
                  company_id: value,
                  company: selectedCompany?.name || ''
                })
              }}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Name</Label>
            <Input
              className="col-span-3"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Opportunity name"
            />
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Description</Label>
            <Textarea
              className="col-span-3"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Opportunity description"
              rows={3}
            />
          </div>

          {/* Phase */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Phase</Label>
            <Select
              value={String(formData.phase)}
              onValueChange={(value) => setFormData({ ...formData, phase: parseInt(value) })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PHASES.map((phase) => (
                  <SelectItem key={phase.number} value={phase.number}>
                    Phase {phase.number}: {phase.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated SOM */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Est. 1-yr SOM</Label>
            <div className="col-span-3 flex items-center gap-2">
              <span className="text-gray-500">$</span>
              <Input
                type="number"
                value={formData.estimated_som}
                onChange={(e) => setFormData({ ...formData, estimated_som: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as OpportunityStatus })}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      <span className={cn('w-3 h-3 rounded-full', config.bgColor)} />
                      {config.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Indicators */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Messaging</Label>
            <IndicatorSelect
              value={formData.messaging_indicator}
              onChange={(value) => setFormData({ ...formData, messaging_indicator: value })}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Campaign</Label>
            <IndicatorSelect
              value={formData.campaign_indicator}
              onChange={(value) => setFormData({ ...formData, campaign_indicator: value })}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Pricing</Label>
            <IndicatorSelect
              value={formData.pricing_indicator}
              onChange={(value) => setFormData({ ...formData, pricing_indicator: value })}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Sales Align</Label>
            <IndicatorSelect
              value={formData.sales_alignment_indicator}
              onChange={(value) => setFormData({ ...formData, sales_alignment_indicator: value })}
            />
          </div>

          {/* Next Steps */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2">Next Steps</Label>
            <Textarea
              className="col-span-3"
              value={formData.next_steps}
              onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
              placeholder="Next steps..."
              rows={2}
            />
          </div>

          {/* Target Date */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Target Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'col-span-3 justify-start text-left font-normal',
                    !formData.target_date && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.target_date
                    ? format(formData.target_date, 'PPP')
                    : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.target_date || undefined}
                  onSelect={(date) => setFormData({ ...formData, target_date: date || null })}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <Separator className="my-2" />

          {/* Demos */}
          <div className="grid grid-cols-4 items-start gap-4">
            <Label className="text-right pt-2 flex items-center gap-1">
              <LinkIcon className="h-4 w-4" />
              Demos
            </Label>
            <div className="col-span-3 space-y-2">
              {demoLinks.map((link, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={link}
                    readOnly
                    className="flex-1 text-sm text-blue-600"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleRemoveLink(idx)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={newLink}
                  onChange={(e) => setNewLink(e.target.value)}
                  placeholder="https://example.com/demo"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddLink())}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLink}
                  disabled={!newLink.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* Files - only show when editing */}
          {isEditing && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2 flex items-center gap-1">
                <Paperclip className="h-4 w-4" />
                Files
                {attachments.length > 0 && (
                  <span className="ml-1 bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">
                    {attachments.length}
                  </span>
                )}
              </Label>
              <div className="col-span-3 space-y-3">
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    {attachments.map((att) => {
                      const isImage = att.file_type?.startsWith('image/')
                      const publicUrl = supabase.storage.from('Attachments').getPublicUrl(att.file_path).data.publicUrl
                      return (
                        <div
                          key={att.id}
                          className="flex items-center gap-3 p-2 border rounded-md bg-green-50 border-green-200 group"
                        >
                          {isImage ? (
                            <div
                              className="relative w-10 h-10 cursor-pointer"
                              onClick={() => setPreviewImage(publicUrl)}
                            >
                              <img
                                src={publicUrl}
                                alt={att.file_name}
                                className="w-10 h-10 object-cover rounded"
                              />
                              <div className="absolute inset-0 bg-black/0 hover:bg-black/30 rounded flex items-center justify-center transition-colors">
                                <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover:opacity-100" />
                              </div>
                            </div>
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center text-gray-400">
                              <Paperclip className="h-4 w-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                "text-sm font-medium truncate block",
                                isImage && "cursor-pointer hover:text-blue-600"
                              )}
                              onClick={() => isImage && setPreviewImage(publicUrl)}
                            >
                              {att.file_name}
                            </span>
                            <span className="text-xs text-green-600">Uploaded</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-gray-400 hover:text-red-600"
                            onClick={() => handleDeleteAttachment(att)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                )}
                <FileUpload
                  onUpload={handleFileUpload}
                  disabled={uploading}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {isEditing && (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name || !formData.company_id}>
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

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
    </Dialog>
  )
}

function IndicatorSelect({
  value,
  onChange,
}: {
  value: IndicatorStatus
  onChange: (value: IndicatorStatus) => void
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as IndicatorStatus)}>
      <SelectTrigger className="col-span-3">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(INDICATOR_CONFIG).map(([key, config]) => (
          <SelectItem key={key} value={key}>
            <span className="flex items-center gap-2">
              <span className={cn('w-3 h-3 rounded-full', config.bgColor)} />
              <span className="capitalize">{key}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
