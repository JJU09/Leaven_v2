'use client'

import { useState, useMemo } from 'react'
import { Plus, Edit2, Trash2, Megaphone, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { AnnouncementDialog } from './announcement-dialog'
import { deleteAnnouncement, markAnnouncementAsRead } from '../actions'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Announcement {
  id: string
  title: string
  content: string
  created_at: string
  announcement_type?: 'notice' | 'handover'
  target_member_ids?: string[] | null
  author?: {
    id: string
    full_name?: string
  }
}

interface AnnouncementListProps {
  storeId: string
  announcements: Announcement[]
  canManage: boolean
  storeMembers?: { id: string; name: string }[]
}

export function AnnouncementList({ storeId, announcements, canManage, storeMembers }: AnnouncementListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingData, setEditingData] = useState<Announcement | null>(null)
  
  const [viewingData, setViewingData] = useState<Announcement | null>(null)

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleCreate = () => {
    setEditingData(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (e: React.MouseEvent, announcement: Announcement) => {
    e.stopPropagation()
    setEditingData(announcement)
    setIsDialogOpen(true)
  }

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    setIsDeleteDialogOpen(true)
  }

  const handleView = async (announcement: Announcement) => {
    setViewingData(announcement)
    
    // Mark as read if it's a handover
    if (announcement.announcement_type === 'handover') {
      try {
        await markAnnouncementAsRead(announcement.id, storeId)
      } catch (err) {
        console.error('Failed to mark announcement as read', err)
      }
    }
  }

  const handleDeleteClickWrapper = (id: string) => {
    setDeletingId(id)
    setIsDeleteDialogOpen(true)
  }

  const [searchQuery, setSearchQuery] = useState('')

  const confirmDelete = async () => {
    if (!deletingId) return
    
    setIsDeleting(true)
    try {
      const result = await deleteAnnouncement(deletingId, storeId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('공지사항이 삭제되었습니다.')
        setIsDeleteDialogOpen(false)
      }
    } catch (error) {
      console.error(error)
      toast.error('오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
      setDeletingId(null)
    }
  }

  const filteredAnnouncements = useMemo(() => {
    let filtered = announcements

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(a => 
        a.title.toLowerCase().includes(query) || 
        a.content.toLowerCase().includes(query)
      )
    }

    return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [announcements, searchQuery])

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-800">인계 및 공지</h2>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="검색어 입력..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 w-full sm:w-50 border-slate-200"
              />
          </div>
          {canManage && (
            <Button size="sm" onClick={handleCreate} className="h-9 whitespace-nowrap">
              <Plus className="h-4 w-4 mr-1" /> 작성
            </Button>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {filteredAnnouncements.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-slate-400 p-12 text-center h-full">
            <Megaphone className="h-8 w-8 mb-3 opacity-30" />
            <p className="text-sm">검색 결과가 없거나 등록된 공지사항이 없습니다.</p>
          </div>
        ) : (
          <div className="flex flex-col divide-y divide-slate-100">
            {/* Table Header (Desktop only) */}
            <div className="hidden md:flex items-center py-3 px-4 bg-slate-50 text-xs font-medium text-slate-500">
              <div className="w-20 shrink-0 text-center px-2">구분</div>
              <div className="flex-1 min-w-0 px-2">제목</div>
              <div className="w-30 shrink-0 text-center">작성자</div>
              <div className="w-30 shrink-0 text-center">작성일</div>
              {canManage && <div className="w-20 shrink-0"></div>}
            </div>

            {filteredAnnouncements.map((announcement) => (
              <div 
                key={announcement.id} 
                onClick={() => handleView(announcement)}
                className="flex flex-col md:flex-row md:items-center p-4 transition-colors hover:bg-slate-50 group relative cursor-pointer"
              >
                {/* Type (Desktop) */}
                <div className="hidden md:flex w-20 shrink-0 justify-center px-2">
                  {announcement.announcement_type === 'handover' ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none w-full justify-center">
                      인수인계
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 w-full justify-center">
                      공지
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0 md:px-2 mb-2 md:mb-0">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Type (Mobile) */}
                    <div className="md:hidden shrink-0">
                      {announcement.announcement_type === 'handover' ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">
                          인수인계
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                          공지
                        </Badge>
                      )}
                    </div>
                    <h4 className="text-base font-medium text-slate-800 truncate">{announcement.title}</h4>
                  </div>
                  {/* For mobile: content preview */}
                  <p className="md:hidden text-xs text-slate-500 mt-1 line-clamp-1">{announcement.content}</p>
                </div>
                
                {/* Meta info (Author & Date) */}
                <div className="flex items-center gap-3 text-sm text-slate-500 md:w-60 md:shrink-0 justify-start md:justify-center">
                  <div className="md:w-30 md:text-center truncate">
                    {announcement.author?.full_name || '관리자'}
                  </div>
                  <div className="md:w-30 md:text-center shrink-0">
                    {format(new Date(announcement.created_at), 'yyyy-MM-dd')}
                  </div>
                </div>

                {/* Actions */}
                {canManage && (
                  <div className="absolute right-4 top-4 md:static md:w-20 md:shrink-0 md:flex md:justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 bg-white md:bg-transparent rounded-md shadow-sm md:shadow-none border md:border-none p-1 md:p-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-800 hover:bg-slate-200" onClick={(e) => handleEdit(e, announcement)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100" onClick={(e) => handleDeleteClick(e, announcement.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnnouncementDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        storeId={storeId} 
        initialData={editingData} 
        storeMembers={storeMembers}
      />

      <Dialog open={!!viewingData} onOpenChange={(open) => !open && setViewingData(null)}>
        <DialogContent className="sm:max-w-175 w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-slate-200">
          <VisuallyHidden>
            <DialogTitle>공지사항 상세 내용</DialogTitle>
          </VisuallyHidden>
          {viewingData && (
            <div className="flex flex-col h-full">
              <div className="flex flex-col gap-4 px-6 md:px-10 py-8 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-3">
                  {viewingData.announcement_type === 'handover' ? (
                    <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">
                      인수인계
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                      공지
                    </Badge>
                  )}
                  <span className="text-sm text-slate-500">
                    {format(new Date(viewingData.created_at), 'yyyy년 MM월 dd일 HH:mm')}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                  {viewingData.title}
                </h2>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                    <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                      {(viewingData.author?.full_name || '관')[0]}
                    </span>
                    {viewingData.author?.full_name || '관리자'}
                  </div>
                  {viewingData.announcement_type === 'handover' && viewingData.target_member_ids && viewingData.target_member_ids.length > 0 && (
                    <div className="text-xs text-slate-500 flex items-center gap-1.5">
                      <span className="font-medium">수신:</span>
                      {viewingData.target_member_ids.map(id => storeMembers?.find(m => m.id === id)?.name).filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
                <div className="text-base md:text-lg text-slate-700 leading-relaxed whitespace-pre-wrap break-all min-h-50">
                  {viewingData.content}
                </div>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <Button variant="outline" onClick={() => setViewingData(null)}>
                  닫기
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말 이 공지사항을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
