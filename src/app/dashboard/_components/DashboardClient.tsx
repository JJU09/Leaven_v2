'use client'

import { useDashboard } from '../_hooks/useDashboard'
import { DashboardGreeting } from './DashboardGreeting'
import { MetricCard } from './MetricCard'
import { AlertList } from './AlertList'
import { AttendanceList } from './AttendanceList'
import { WeeklyScheduleChart } from './WeeklyScheduleChart'
import { LeavePanel } from './LeavePanel'
import { AssetSummaryCard } from './AssetSummaryCard'
import { VendorSummaryCard } from './VendorSummaryCard'
import { Users, Palmtree, Monitor, Building2 } from 'lucide-react'

interface DashboardClientProps {
  storeId: string
  storeName: string
  userName: string
}

export default function DashboardClient({ storeId, storeName, userName }: DashboardClientProps) {
  const { data, isLoading } = useDashboard(storeId)

  if (isLoading || !data) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-slate-400">대시보드 데이터를 불러오는 중입니다...</div>
      </div>
    )
  }

  const { metrics, alerts, hasMoreAlerts, weeklyData, monthLeaves, staffLeaves, assetsSummary, vendorsSummary, vendorTransactions } = data

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      <DashboardGreeting storeName={storeName} userName={userName} />
      
      {/* 4 Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard 
          title="오늘 출근 현황" 
          value={metrics.attendance.value} 
          total={metrics.attendance.total}
          subText={metrics.attendance.value < metrics.attendance.total ? '미출근 인원이 있습니다' : '전원 출근'}
          subType={metrics.attendance.value < metrics.attendance.total ? 'warn' : 'ok'}
          icon={Users}
        />
        <MetricCard 
          title="이번 주 연차" 
          value={metrics.leavesThisWeek.value}
          subText="승인된 연차 수"
          icon={Palmtree}
        />
        <MetricCard 
          title="점검/만료 자산" 
          value={metrics.assetsWarning.value}
          subText="30일 이내 임박"
          subType={metrics.assetsWarning.value > 0 ? 'danger' : 'ok'}
          icon={Monitor}
        />
        <MetricCard 
          title="만료 거래처" 
          value={metrics.vendorsWarning.value}
          subText="30일 이내 계약 만료"
          subType={metrics.vendorsWarning.value > 0 ? 'danger' : 'ok'}
          icon={Building2}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 알림·할일 */}
        <div className="h-[400px]">
          <AlertList alerts={alerts} hasMore={hasMoreAlerts} />
        </div>
        
        {/* 오늘 출퇴근 현황 */}
        <div className="h-[400px]">
          <AttendanceList storeId={storeId} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 주간 근무 바 차트 */}
        <div className="h-[350px]">
          <WeeklyScheduleChart data={weeklyData} />
        </div>
        
        {/* 연차·휴가 현황 */}
        <div className="h-[350px]">
          <LeavePanel monthLeaves={monthLeaves} staffLeaves={staffLeaves} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-10">
        {/* 자산 현황 요약 */}
        <div className="h-[350px]">
          <AssetSummaryCard assets={assetsSummary} />
        </div>
        
        {/* 거래처 현황 요약 */}
        <div className="h-[350px]">
          <VendorSummaryCard vendors={vendorsSummary} transactions={vendorTransactions} />
        </div>
      </div>

    </div>
  )
}