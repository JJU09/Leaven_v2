'use client'

import { useState } from 'react'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarIcon, RefreshCw, BarChart3, Users, Package2, Loader2, Info, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useWeeklyReport } from '../../_hooks/use-weekly-report'
import { ReportCard } from '../shared/report-card'
import { InsightItem } from '../shared/insight-item'
import { RecommendationList } from '../shared/recommendation-list'
import { Skeleton } from '@/components/ui/skeleton'
import { CheckCircle2 } from 'lucide-react'

export function WeeklyReport({ storeId }: { storeId: string }) {
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 })) // 이번 주 월요일
  const targetDateStr = format(selectedWeekStart, 'yyyy-MM-dd')
  
  const { report, isLoading, isGenerating, isError, generateReport } = useWeeklyReport(storeId, targetDateStr)

  const weekOptions = Array.from({ length: 4 }).map((_, i) => {
    const start = startOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    const end = endOfWeek(subWeeks(new Date(), i), { weekStartsOn: 1 })
    return {
      label: `${format(start, 'M월 w주차')} (${format(start, 'M/d')} ~ ${format(end, 'M/d')})`,
      value: start
    }
  })

  return (
    <div className="flex flex-col gap-6 h-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className="w-[240px] justify-start text-left font-normal bg-card"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {weekOptions.find(o => o.value.getTime() === selectedWeekStart.getTime())?.label || '주차 선택'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[240px] p-2" align="start">
              <div className="flex flex-col gap-1">
                {weekOptions.map((option, i) => (
                  <Button
                    key={i}
                    variant={option.value.getTime() === selectedWeekStart.getTime() ? "default" : "ghost"}
                    className="justify-start w-full"
                    onClick={() => setSelectedWeekStart(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
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
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-[250px] rounded-xl w-full" />
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
          <h3 className="text-lg font-medium mb-2">주간 리포트가 없습니다</h3>
          <p className="text-muted-foreground max-w-md mb-6 leading-relaxed">
            상단의 '리포트 생성하기' 버튼을 눌러<br/>
            해당 주간의 데이터 기반 AI 분석 결과를 확인하세요.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 pb-10">
          <ReportCard 
            title="주간 운영 요약" 
            icon={<BarChart3 className="w-5 h-5" />}
            summary={report.content.summary.text}
          >
            <div className="space-y-3">
              {report.content.summary.insights.map((insight: any, idx: number) => (
                <InsightItem key={idx} type={insight.type} text={insight.text} />
              ))}
            </div>
          </ReportCard>

          <ReportCard
            title="인력 트렌드"
            icon={<Users className="w-5 h-5" />}
          >
            <div className="space-y-3">
              {report.content.staffing.insights.map((insight: any, idx: number) => (
                <InsightItem key={idx} type={insight.type} text={insight.text} />
              ))}
              {report.content.staffing.hotDays && report.content.staffing.hotDays.length > 0 && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg border text-sm flex items-center gap-2">
                  <span className="font-medium shrink-0">🔥 바쁜 요일:</span>
                  <span className="text-muted-foreground">{report.content.staffing.hotDays.join(', ')}</span>
                </div>
              )}
            </div>
          </ReportCard>

          {report.content.tasks && (
            <ReportCard
              title="주간 업무 현황"
              icon={<CheckCircle2 className="w-5 h-5" />}
              summary={report.content.tasks.summary}
            >
              <div className="space-y-3">
                {report.content.tasks.insights.map((insight: any, idx: number) => (
                  <InsightItem key={idx} type={insight.type} text={insight.text} />
                ))}
              </div>
            </ReportCard>
          )}

          {report.content.assetsAndVendors && report.content.assetsAndVendors.insights.length > 0 && (
            <ReportCard 
              title="자산 및 거래처 동향" 
              icon={<Package2 className="w-5 h-5" />}
            >
              <div className="space-y-3">
                {report.content.assetsAndVendors.insights.map((insight: any, idx: number) => (
                  <InsightItem key={idx} type={insight.type} text={insight.text} />
                ))}
              </div>
            </ReportCard>
          )}

          <div className={cn("md:col-span-2 mt-2", (!report.content.assetsAndVendors || report.content.assetsAndVendors.insights.length === 0) && "md:col-span-2")}>
            <RecommendationList items={report.content.recommendations} />
          </div>
        </div>
      )}
    </div>
  )
}