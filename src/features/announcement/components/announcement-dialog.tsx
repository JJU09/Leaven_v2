'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { createAnnouncement, updateAnnouncement } from '../actions'
import { toast } from 'sonner'

interface AnnouncementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  storeId: string
  initialData?: {
    id: string
    title: string
    content: string
  } | null
}

import { VisuallyHidden } from '@radix-ui/react-visually-hidden'

export function AnnouncementDialog({ open, onOpenChange, storeId, initialData }: AnnouncementDialogProps) {
  const [loading, setLoading] = useState(false)
  
  const isEditing = !!initialData

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)

    const formData = new FormData(e.currentTarget)

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
      <DialogContent className="sm:max-w-[800px] w-[95vw] h-[90vh] sm:h-[80vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-slate-200">
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
            <input 
              id="title" 
              name="title" 
              placeholder="제목 없음" 
              defaultValue={initialData?.title || ''} 
              required 
              className="w-full text-3xl md:text-4xl font-bold text-slate-800 placeholder:text-slate-300 border-none outline-none focus:ring-0 px-0 bg-transparent"
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