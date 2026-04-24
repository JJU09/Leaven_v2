'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { createAnnouncement, updateAnnouncement } from '../actions'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AnnouncementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  initialData?: {
    id: string
    title: string
    content: string
    announcement_type?: 'notice' | 'handover'
    target_member_ids?: string[] | null
  } | null
  storeMembers?: { id: string; name: string }[]
}

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

import { useEffect } from 'react'

export function AnnouncementDialog({ open, onOpenChange, storeId, initialData, storeMembers = [] }: AnnouncementDialogProps) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState<'notice' | 'handover'>('notice')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  const isEditing = !!initialData

  useEffect(() => {
    if (open) {
      if (initialData?.announcement_type) {
        setType(initialData.announcement_type)
      } else {
        setType('notice')
      }
      
      if (initialData?.target_member_ids) {
        setSelectedMemberIds(initialData.target_member_ids)
      } else {
        setSelectedMemberIds([])
      }
    }
  }, [open, initialData])

  const toggleMember = (memberId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(memberId) 
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    )
  }

  const removeMember = (memberId: string) => {
    setSelectedMemberIds(prev => prev.filter(id => id !== memberId))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (type === 'handover' && selectedMemberIds.length === 0) {
      toast.error('인수인계를 받을 대상을 1명 이상 선택해주세요.')
      return
    }
    
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    
    if (type === 'handover') {
      formData.set('target_member_ids', JSON.stringify(selectedMemberIds))
    }

    try {
      let result
      if (isEditing) {
        result = await updateAnnouncement(initialData.id, storeId, formData)
      } else {
        result = await createAnnouncement(storeId, formData)
      }

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(isEditing ? '공지사항이 수정되었습니다.' : '공지사항이 등록되었습니다.')
        onOpenChange(false)
      }
    } catch (error) {
      console.error(error)
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-[800px] w-[95vw] h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-slate-200">
        <VisuallyHidden>
          <DialogTitle>{isEditing ? '공지사항 수정' : '새 공지사항 작성'}</DialogTitle>
        </VisuallyHidden>
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          {/* Header Actions */}
          <div className="flex items-center justify-end px-6 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" className="text-slate-500" onClick={() => onOpenChange(false)} disabled={loading}>
                취소
              </Button>
              <Button type="submit" disabled={loading} className="bg-slate-800 hover:bg-slate-900 text-white">
                {loading ? '저장 중...' : isEditing ? '수정하기' : '등록하기'}
              </Button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6 md:p-10 md:px-16 flex flex-col gap-6">
            <div className="flex items-center space-x-6 px-2">
              <RadioGroup defaultValue="notice" name="announcement_type" value={type} onValueChange={(val: any) => setType(val)} className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="notice" id="type-notice" />
                  <Label htmlFor="type-notice" className="text-base cursor-pointer">일반 공지</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="handover" id="type-handover" />
                  <Label htmlFor="type-handover" className="text-base cursor-pointer">인수인계</Label>
                </div>
              </RadioGroup>
            </div>

            {type === 'handover' && (
              <div className="flex flex-col gap-2 px-2 bg-slate-50 p-4 rounded-lg border border-slate-100">
                <Label className="text-sm font-semibold text-slate-700">수신 대상 (인수인계 받을 사람)</Label>
                
                {/* Selected Members Display */}
                {selectedMemberIds.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedMemberIds.map(id => {
                      const member = storeMembers.find(m => m.id === id)
                      if (!member) return null
                      return (
                        <Badge key={id} variant="secondary" className="bg-white border-slate-200 text-slate-700 flex items-center gap-1 py-1 px-2">
                          {member.name}
                          <button 
                            type="button" 
                            onClick={() => removeMember(id)}
                            className="text-slate-400 hover:text-slate-600 ml-1 focus:outline-none"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
                
                <Select onValueChange={toggleMember} value="">
                  <SelectTrigger className="w-full sm:w-[300px] bg-white">
                    <SelectValue placeholder="직원 선택..." />
                  </SelectTrigger>
                  <SelectContent>
                    {storeMembers.filter(m => !selectedMemberIds.includes(m.id)).length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">선택 가능한 직원이 없습니다.</div>
                    ) : (
                      storeMembers
                        .filter(m => !selectedMemberIds.includes(m.id))
                        .map(member => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Input
              id="title"
              name="title"
              placeholder="제목 없음"
              defaultValue={initialData?.title || ''} 
              required 
              className="w-full text-3xl md:text-4xl font-bold text-slate-800 placeholder:text-slate-300 border-none shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 px-0 bg-transparent rounded-none h-auto py-2"
            />
            
            <textarea
              id="content"
              name="content"
              placeholder="여기에 내용을 입력하세요..."
              defaultValue={initialData?.content || ''}
              className="w-full flex-1 min-h-[300px] text-base md:text-lg text-slate-600 placeholder:text-slate-300 border-none outline-none focus:ring-0 px-0 resize-none bg-transparent whitespace-pre-wrap break-all"
            />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}