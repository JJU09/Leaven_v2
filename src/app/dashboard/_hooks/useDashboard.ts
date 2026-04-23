import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { format, addDays } from 'date-fns'
import { 
  getToday, 
  getThisWeekMonday, 
  getThisWeekFriday, 
  getStartOfMonth, 
  getEndOfMonth,
  getDday
} from '../_utils/dateHelpers'
import { AlertItem, sortAlerts } from '../_utils/alertBuilder'

export function useDashboard(storeId: string) {
  const supabase = createClient()
  
  return useQuery({
    queryKey: ['dashboard', storeId, 'summary'],
    queryFn: async () => {
      const todayDateStr = format(getToday(), 'yyyy-MM-dd')
      const todayPlus30Str = format(addDays(getToday(), 30), 'yyyy-MM-dd')
      const mondayStr = format(getThisWeekMonday(), 'yyyy-MM-dd')
      const fridayStr = format(getThisWeekFriday(), 'yyyy-MM-dd')
      const startOfMonthStr = format(getStartOfMonth(), 'yyyy-MM-dd')
      const endOfMonthStr = format(getEndOfMonth(), 'yyyy-MM-dd')

      // Fetch all required data in parallel
      const [
        { data: attendanceToday },
        { data: thisWeekLeaves },
        { data: assets },
        { data: vendors },
        { data: pendingLeaves },
        { data: weeklyAttendance },
        { data: monthLeaves },
        { data: staffLeaves },
        { data: vendorTransactions },
        { data: schedulesToday }
      ] = await Promise.all([
        supabase.from('attendance').select('id').eq('store_id', storeId).eq('date', todayDateStr).not('clock_in', 'is', null),
        supabase.from('leave_requests').select('id').eq('store_id', storeId).eq('status', 'approved').gte('start_date', mondayStr).lte('start_date', fridayStr),
        supabase.from('store_assets').select('id, status, next_inspection_date, warranty_expiry_date, name').eq('store_id', storeId).is('deleted_at', null),
        supabase.from('vendors').select('id, name, contract_end_date, is_auto_renewal, contract_type').eq('store_id', storeId).is('deleted_at', null),
        supabase.from('leave_requests').select('id, status').eq('store_id', storeId).eq('status', 'pending'),
        supabase.from('attendance').select('date').eq('store_id', storeId).gte('date', mondayStr).lte('date', fridayStr).not('clock_in', 'is', null),
        supabase.from('leave_requests').select('*, member:store_members!leave_requests_member_id_fkey(name, profiles(full_name), role:store_roles(name))').eq('store_id', storeId).eq('status', 'pending').gte('start_date', startOfMonthStr).lte('start_date', endOfMonthStr).order('start_date', { ascending: true }),
        supabase.from('leave_balances').select('*, member:store_members!inner(id, status, name, profiles(full_name))').eq('store_id', storeId).eq('year', new Date().getFullYear()).eq('member.status', 'active'),
        supabase.from('vendor_transactions').select('id, vendor_id, amount, payment_status, transaction_date, vendors(name)').eq('store_id', storeId).in('payment_status', ['unpaid', 'partial']).is('deleted_at', null).order('transaction_date', { ascending: true }).limit(3),
        supabase.from('schedules').select('id, member_id, start_time').eq('store_id', storeId).eq('date', todayDateStr)
      ])

      // 1. 상단 메트릭 계산
      const scheduledCount = schedulesToday?.length || 0
      const clockedInCount = attendanceToday?.length || 0
      
      const assetWarningCount = (assets || []).filter(a => {
        const insp = a.next_inspection_date ? getDday(a.next_inspection_date) : null
        const warr = a.warranty_expiry_date ? getDday(a.warranty_expiry_date) : null
        return (insp !== null && insp >= 0 && insp <= 30) || (warr !== null && warr >= 0 && warr <= 30)
      }).length

      const vendorWarningCount = (vendors || []).filter(v => {
        if (v.is_auto_renewal || !v.contract_end_date) return false
        const dday = getDday(v.contract_end_date)
        return dday !== null && dday >= 0 && dday <= 30
      }).length

      const metrics = {
        attendance: { value: clockedInCount, total: scheduledCount },
        leavesThisWeek: { value: thisWeekLeaves?.length || 0 },
        assetsWarning: { value: assetWarningCount },
        vendorsWarning: { value: vendorWarningCount }
      }

      // 2. 알림·할일 목록 구성
      const rawAlerts: AlertItem[] = []
      
      // 자산 경고
      assets?.forEach(a => {
        const insp = a.next_inspection_date ? getDday(a.next_inspection_date) : null
        const warr = a.warranty_expiry_date ? getDday(a.warranty_expiry_date) : null
        
        let minDday = 9999
        if (insp !== null && insp >= 0 && insp <= 30) minDday = Math.min(minDday, insp)
        if (warr !== null && warr >= 0 && warr <= 30) minDday = Math.min(minDday, warr)

        if (minDday <= 30) {
          rawAlerts.push({
            id: `asset-${a.id}`,
            type: 'asset_warning',
            severity: minDday <= 14 ? 'red' : 'amber',
            dDay: minDday,
            title: `자산 점검 임박: ${a.name}`,
            subText: `점검/보증 기한이 ${minDday}일 남았습니다.`,
            actionLabel: '자산 확인',
            actionHref: `/dashboard/assets?highlight=${a.id}`
          })
        }
      })

      // 거래처 경고
      vendors?.forEach(v => {
        if (v.is_auto_renewal || !v.contract_end_date) return
        const dday = getDday(v.contract_end_date)
        
        if (dday !== null && dday >= 0 && dday <= 30) {
          rawAlerts.push({
            id: `vendor-${v.id}`,
            type: 'vendor_contract',
            severity: dday <= 14 ? 'red' : 'amber',
            dDay: dday,
            title: `계약 만료 임박: ${v.name}`,
            subText: `계약이 ${dday}일 후 만료됩니다.`,
            actionLabel: '거래처 확인',
            actionHref: `/dashboard/vendors?highlight=${v.id}`
          })
        }
      })

      // 연차 대기
      pendingLeaves?.forEach(l => {
        rawAlerts.push({
          id: `leave-${l.id}`,
          type: 'leave_pending',
          severity: 'amber',
          title: '연차 승인 대기',
          subText: '새로운 연차 신청이 있습니다.',
          actionLabel: '승인/반려',
          actionHref: `/dashboard/leave?id=${l.id}`
        })
      })

      // 주간 근무자 집계
      const weeklyData = {
        monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0
      }
      weeklyAttendance?.forEach(a => {
        const day = new Date(a.date).getDay()
        if (day === 1) weeklyData.monday++
        if (day === 2) weeklyData.tuesday++
        if (day === 3) weeklyData.wednesday++
        if (day === 4) weeklyData.thursday++
        if (day === 5) weeklyData.friday++
      })

      return {
        metrics,
        alerts: sortAlerts(rawAlerts).slice(0, 10),
        hasMoreAlerts: rawAlerts.length > 10,
        weeklyData,
        monthLeaves: monthLeaves || [],
        staffLeaves: staffLeaves || [],
        assetsSummary: assets || [],
        vendorsSummary: vendors || [],
        vendorTransactions: vendorTransactions || []
      }
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    enabled: !!storeId,
  })
}