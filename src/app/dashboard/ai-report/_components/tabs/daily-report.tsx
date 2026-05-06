'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, RefreshCw, Users, ClipboardList, Package2, Loader2, Info, Sparkles, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDailyReport } from '../../_hooks/use-daily-report'
import { ReportCard } from '../shared/report-card'
import { InsightItem } from '../shared/insight-item'
import { RecommendationList } from '../shared/recommendation-list'
import { Skeleton } from '@/components/ui/skeleton'

export function DailyReport({ storeId }: { storeId: string }) {
  const [date, setDate] = useState<Date>(new Date())
  const targetDateStr = format(date, 'yyyy-MM-dd')
  
  const { report, isLoading, isGenerating, isError, generateReport } = useDailyReport(storeId, targetDateStr)

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] justify-start text-left font-normal bg-card",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko }) : <span>날짜 선택</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => newDate && setDate(newDate)}
                initialFocus
                locale={ko}
                disabled={(d) => d > new Date() || d < new Date(new Date().setDate(new Date().getDate() - 30))}
              />
            </PopoverContent>
          </Popover>
          
          {report?.generated_at && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 bg-muted px-2 py-1 rounded-md hidden sm:flex">
              <Info className="w-3 h-3" />
              AI 분석 · {format(new Date(report.generated_at), 'yyyy-MM-dd HH:mm')} 생성
            </span>
          )}
        </div>

        <Button 
          onClick={generateReport} 
          disabled={isLoading || isGenerating}
          variant={report ? "outline" : "default"}
          className="shrink-0"
        >
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              리포트 생성 중...
            </>
          ) : (
            <>
              <RefreshCw className={cn("mr-2 h-4 w-4", report && "text-muted-foreground")} />
              {report ? '리포트 재생성' : '리포트 생성하기'}
            </>
          )}
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[200px] rounded-xl w-full" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-xl border-dashed bg-card/50 min-h-[400px]">
          <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-4">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium mb-2">리포트 생성 오류</h3>
          <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
            AI 리포트를 생성하는 중 문제가 발생했습니다.<br/>
            재생성 버튼을 눌러 다시 시도해주세요.
          </p>
          <Button onClick={generateReport}>다시 시도</Button>
        </div>
      ) : !report ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border rounded-xl border-dashed bg-card/50 min-h-[400px]">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <Sparkles className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-medium mb-2">오늘의 리포트가 없습니다</h3>
          <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
            상단의 '리포트 생성하기' 버튼을 눌러<br/>
            현재 매장 데이터 기반의 AI 분석 결과를 확인하세요.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 pb-6">
          {report.content.summary && (
            <ReportCard 
              title="일간 운영 요약" 
              icon={<BarChart3 className="w-5 h-5" />}
              summary={report.content.summary.text}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {report.content.summary.insights?.map((insight: any, idx: number) => (
                  <InsightItem key={idx} type={insight.type} text={insight.text} />
                ))}
              </div>
            </ReportCard>
          )}

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
            <ReportCard 
              title="출퇴근 현황" 
              icon={<Users className="w-5 h-5" />}
              summary={report.content.attendance.summary}
            >
              <div className="space-y-2">
                {report.content.attendance.insights.map((insight: any, idx: number) => (
                  <InsightItem key={idx} type={insight.type} text={insight.text} />
                ))}
              </div>
            </ReportCard>

            <ReportCard 
              title="오늘의 업무" 
              icon={<ClipboardList className="w-5 h-5" />}
              summary={report.content.tasks.summary}
            >
              <div className="space-y-2">
                {report.content.tasks.insights.map((insight: any, idx: number) => (
                  <InsightItem key={idx} type={insight.type} text={insight.text} />
                ))}
              </div>
            </ReportCard>

            <ReportCard 
              title="자산 및 거래처 동향" 
              icon={<Package2 className="w-5 h-5" />}
            >
              <div className="space-y-2">
                {report.content.assets && report.content.assets.insights.length > 0 ? (
                  report.content.assets.insights.map((insight: any, idx: number) => (
                    <InsightItem key={idx} type={insight.type} text={insight.text} />
                  ))
                ) : (
                  <div className="text-[13px] text-muted-foreground p-2 text-center border rounded-md border-dashed">
                    특이사항 없음
                  </div>
                )}
              </div>
            </ReportCard>
          </div>

          <RecommendationList items={report.content.recommendations} />
        </div>
      )}
    </div>
  )
}