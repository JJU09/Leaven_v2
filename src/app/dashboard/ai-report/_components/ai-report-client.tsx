'use client'

import * as React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DailyReport } from './tabs/daily-report'
import { WeeklyReport } from './tabs/weekly-report'
import { AiChat } from './tabs/ai-chat'
import { CalendarDays, CalendarRange, Sparkles } from 'lucide-react'

interface AiReportClientProps {
  storeId: string
}

export default function AiReportClient({ storeId }: AiReportClientProps) {
  return (
    <Tabs defaultValue="daily" className="w-full h-full flex flex-col">
      <div className="border-b px-4 py-2 bg-muted/20">
        <TabsList className="grid w-full max-w-[400px] grid-cols-3">
          <TabsTrigger value="daily" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span className="hidden sm:inline">일간 리포트</span>
            <span className="sm:hidden">일간</span>
          </TabsTrigger>
          <TabsTrigger value="weekly" className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4" />
            <span className="hidden sm:inline">주간 리포트</span>
            <span className="sm:hidden">주간</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">AI 질의</span>
            <span className="sm:hidden">질의</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <div className="flex-1 overflow-auto bg-muted/5 relative">
        <TabsContent value="daily" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden p-4 sm:p-6">
          <DailyReport storeId={storeId} />
        </TabsContent>
        
        <TabsContent value="weekly" className="h-full m-0 data-[state=active]:block data-[state=inactive]:hidden p-4 sm:p-6">
          <WeeklyReport storeId={storeId} />
        </TabsContent>
        
        <TabsContent value="chat" className="h-full m-0 data-[state=active]:flex data-[state=inactive]:hidden flex-col p-0">
          <AiChat storeId={storeId} />
        </TabsContent>
      </div>
    </Tabs>
  )
}