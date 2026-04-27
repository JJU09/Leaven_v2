'use client'

import { useEffect, useState } from 'react'
import { Megaphone } from 'lucide-react'
import { getStoreAnnouncements, markAnnouncementAsRead } from '@/features/announcement/actions'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'

interface TaskAnnouncementBannerProps {
  storeId: string;
}

export function TaskAnnouncementBanner({ storeId }: TaskAnnouncementBannerProps) {
  const [latestAnnouncement, setLatestAnnouncement] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchAnnouncements() {
      try {
        const data = await getStoreAnnouncements(storeId);
        if (data && data.length > 0) {
          setLatestAnnouncement(data[0]);
        }
      } catch (error) {
        console.error('Failed to fetch announcements for banner', error);
      }
    }
    
    if (storeId) {
      fetchAnnouncements();
    }
  }, [storeId]);

  const handleView = async () => {
    setIsModalOpen(true);
    if (latestAnnouncement?.announcement_type === 'handover') {
      try {
        await markAnnouncementAsRead(latestAnnouncement.id, storeId);
      } catch (e) {
        console.error('Failed to mark as read', e);
      }
    }
  };

  if (!latestAnnouncement) return null;

  return (
    <>
      <div
        onClick={handleView}
        className="flex items-center gap-2 bg-blue-50/50 border border-blue-100 text-blue-800 px-4 py-3 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors shadow-sm"
      >
        <Megaphone className="h-4 w-4 shrink-0 text-blue-500" />
        <span className="font-semibold text-sm shrink-0">
          {latestAnnouncement.announcement_type === 'handover' ? '[인수인계]' : '[공지]'}
        </span>
        <span className="text-sm truncate flex-1">{latestAnnouncement.title}</span>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden bg-white border-slate-200">
          <VisuallyHidden>
            <DialogTitle>공지사항 상세 내용</DialogTitle>
          </VisuallyHidden>
          <div className="flex flex-col h-full">
            <div className="flex flex-col gap-4 px-6 md:px-10 py-8 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                {latestAnnouncement.announcement_type === 'handover' ? (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-none">
                    인수인계
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">
                    공지
                  </Badge>
                )}
                <span className="text-sm text-slate-500">
                  {format(new Date(latestAnnouncement.created_at), 'yyyy년 MM월 dd일 HH:mm')}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
                {latestAnnouncement.title}
              </h2>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-600">
                    {(latestAnnouncement.author?.full_name || '관')[0]}
                  </span>
                  {latestAnnouncement.author?.full_name || '관리자'}
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-10 bg-white">
              <div className="text-base md:text-lg text-slate-700 leading-relaxed whitespace-pre-wrap break-all min-h-[200px]">
                {latestAnnouncement.content}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50/50">
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>닫기</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}