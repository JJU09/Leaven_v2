import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useMemo } from 'react'
import { format, addDays } from 'date-fns'
import { 
  getToday, 
  getThisWeekMonday, 
  getThisWeekFriday, 
  getDday
} from '../_utils/dateHelpers'
import { AlertItem, sortAlerts } from '../_utils/alertBuilder'
import { getMemberDisplayName } from '@/lib/utils'

export function useDashboard(storeId: string, canManage: boolean = false) {
  const supabase = createClient()

  // [1] 정적 데이터 쿼리 (거의 바뀌지 않는 데이터)
  const staticQuery = useQuery({
    queryKey: ['dashboard', storeId, 'static'],
    queryFn: async () => {
      // 순차 1, 2: 유저 및 매장 정보 확인
      const { data: { user } } = await supabase.auth.getUser()
      const { data: currentMember } = user 
        ? await supabase.from('store_members').select('id').eq('store_id', storeId).eq('user_id', user.id).single()
        : { data: null }

      // 병렬: 자산, 거래처 관련 쿼리
      const [
        { data: assets },
        { data: vendors },
        { data: vendorTransactions }
      ] = await Promise.all([
        supabase.from('store_assets').select('id, status, next_inspection_date, warranty_expiry_date, name').eq('store_id', storeId).is('deleted_at', null),
        supabase.from('vendors').select('id, name, contract_end_date, is_auto_renewal, contract_type').eq('store_id', storeId).is('deleted_at', null),
        supabase.from('vendor_transactions').select('id, vendor_id, amount, payment_status, transaction_date, vendors(name)').eq('store_id', storeId).in('payment_status', ['unpaid', 'partial']).is('deleted_at', null).order('transaction_date', { ascending: true }).limit(3)
      ])

      return { user, currentMember, assets, vendors, vendorTransactions }
    },
    staleTime: 10 * 60 * 1000, // 10분 캐싱
    refetchOnWindowFocus: false, // 창 포커스 시 재요청 안함
    enabled: !!storeId,
  })

  // [2] 라이브 데이터 쿼리 (자주 바뀌는 데이터)
  const liveQuery = useQuery({
    queryKey: ['dashboard', storeId, 'live', canManage],
    queryFn: async () => {
      const todayDateStr = format(getToday(), 'yyyy-MM-dd')
      const todayPlus30Str = format(addDays(getToday(), 30), 'yyyy-MM-dd')
      const mondayStr = format(getThisWeekMonday(), 'yyyy-MM-dd')
      const fridayStr = format(getThisWeekFriday(), 'yyyy-MM-dd')
      const sevenDaysAgoStr = format(addDays(getToday(), -7), 'yyyy-MM-dd')

      const currentMember = staticQuery.data?.currentMember

      let monthLeavesQuery = supabase.from('leave_requests')
        .select('id, start_date, end_date, status, member:store_members!leave_requests_member_id_fkey(name, profiles(full_name), role:store_roles(name))')
        .eq('store_id', storeId)
        .eq('status', 'pending')
        .gte('start_date', todayDateStr)
        .lte('start_date', todayPlus30Str)
        .order('start_date', { ascending: true })

      if (!canManage && currentMember) {
        monthLeavesQuery = monthLeavesQuery.eq('member_id', currentMember.id)
      }

      const [
        { data: attendanceToday },
        { data: pendingLeaves },
        { data: weeklyAttendance },
        { data: monthLeaves },
        { data: schedulesToday },
        { data: recentHandovers },
        { data: myReads }
      ] = await Promise.all([
        supabase.from('store_attendance').select('id').eq('store_id', storeId).eq('target_date', todayDateStr).not('clock_in_time', 'is', null),
        supabase.from('leave_requests').select('id, status').eq('store_id', storeId).eq('status', 'pending'),
        supabase.from('store_attendance').select('target_date').eq('store_id', storeId).gte('target_date', mondayStr).lte('target_date', fridayStr).not('clock_in_time', 'is', null),
        monthLeavesQuery,
        supabase.from('schedules').select('id, member_id, start_time').eq('store_id', storeId).eq('plan_date', todayDateStr),
        supabase.from('store_announcements').select('id, title, ai_summary, target_member_ids, created_at, author:store_members!store_announcements_author_id_fkey(user:profiles!store_members_user_id_fkey(full_name))').eq('store_id', storeId).eq('announcement_type', 'handover').gte('created_at', sevenDaysAgoStr).order('created_at', { ascending: false }),
        currentMember ? supabase.from('announcement_reads').select('announcement_id').eq('member_id', currentMember.id) : Promise.resolve({ data: [] })
      ])

      return { attendanceToday, pendingLeaves, weeklyAttendance, monthLeaves, schedulesToday, recentHandovers, myReads }
    },
    staleTime: 1 * 60 * 1000, // 1분 캐싱
    refetchOnWindowFocus: true, // 창 포커스 시 즉각 갱신
    refetchInterval: 5 * 60 * 1000, // 5분 주기
    enabled: !!storeId && (!!staticQuery.data || staticQuery.isError), // staticQuery 성공/실패 여부 결정 후 실행
  })

  // [3] 두 쿼리 결과 병합 및 가공 (기존과 동일한 반환 구조 유지)
  const combinedData = useMemo(() => {
    if (!staticQuery.data || !liveQuery.data) return null

    const { currentMember, assets, vendors, vendorTransactions } = staticQuery.data
    const { attendanceToday, pendingLeaves, weeklyAttendance, monthLeaves, schedulesToday, recentHandovers, myReads } = liveQuery.data

    const readAnnouncementIds = new Set(myReads?.map(r => r.announcement_id) || [])

    // 메트릭 계산
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
      leavesPending: { value: pendingLeaves?.length || 0 },
      assetsWarning: { value: assetWarningCount },
      vendorsWarning: { value: vendorWarningCount }
    }

    // 알림 목록 구성
    const rawAlerts: AlertItem[] = []
    
    if (canManage) {
      assets?.forEach(a => {
        const insp = a.next_inspection_date ? getDday(a.next_inspection_date) : null
        const warr = a.warranty_expiry_date ? getDday(a.warranty_expiry_date) : null
        let minDday = 9999
        if (insp !== null && insp >= 0 && insp <= 30) minDday = Math.min(minDday, insp)
        if (warr !== null && warr >= 0 && warr <= 30) minDday = Math.min(minDday, warr)
        if (minDday <= 30) {
          rawAlerts.push({
            id: `asset-${a.id}`, type: 'asset_warning', severity: minDday <= 14 ? 'red' : 'amber',
            dDay: minDday, title: `자산 점검 임박: ${a.name}`, subText: `점검/보증 기한이 ${minDday}일 남았습니다.`,
            actionLabel: '자산 확인', actionHref: `/dashboard/assets?highlight=${a.id}`
          })
        }
      })

      vendors?.forEach(v => {
        if (v.is_auto_renewal || !v.contract_end_date) return
        const dday = getDday(v.contract_end_date)
        if (dday !== null && dday >= 0 && dday <= 30) {
          rawAlerts.push({
            id: `vendor-${v.id}`, type: 'vendor_contract', severity: dday <= 14 ? 'red' : 'amber',
            dDay: dday, title: `계약 만료 임박: ${v.name}`, subText: `계약이 ${dday}일 후 만료됩니다.`,
            actionLabel: '거래처 확인', actionHref: `/dashboard/vendors?highlight=${v.id}`
          })
        }
      })

      pendingLeaves?.forEach(l => {
        rawAlerts.push({
          id: `leave-${l.id}`, type: 'leave_pending', severity: 'amber',
          title: '연차 승인 대기', subText: '새로운 연차 신청이 있습니다.',
          actionLabel: '승인/반려', actionHref: `/dashboard/leave?id=${l.id}`
        })
      })
    }

    if (currentMember) {
      recentHandovers?.forEach(h => {
        if (h.target_member_ids && Array.isArray(h.target_member_ids) && h.target_member_ids.includes(currentMember.id) && !readAnnouncementIds.has(h.id)) {
          const authorData = Array.isArray(h.author) ? h.author[0] : h.author
          const authorName = authorData ? getMemberDisplayName(authorData) : '동료'
          
          let summaryText = '클릭하여 내용을 확인하세요.'
          if (h.ai_summary) {
            const summaryData = h.ai_summary as any
            if (summaryData.text) summaryText = summaryData.text
            else if (typeof h.ai_summary === 'string') summaryText = h.ai_summary
          }

          rawAlerts.push({
            id: `handover-${h.id}`, type: 'handover_notice', severity: 'blue',
            title: `[인수인계] ${authorName}님이 남김: ${h.title}`, subText: summaryText,
            actionLabel: '인수인계 확인', actionHref: `/dashboard/announcements`
          })
        }
      })
    }

    const weeklyData = { monday: 0, tuesday: 0, wednesday: 0, thursday: 0, friday: 0 }
    weeklyAttendance?.forEach(a => {
      const day = new Date(a.target_date).getDay()
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
      assetsSummary: assets || [],
      vendorsSummary: vendors || [],
      vendorTransactions: vendorTransactions || []
    }
  }, [staticQuery.data, liveQuery.data, canManage])

  return {
    data: combinedData,
    isLoading: staticQuery.isLoading || liveQuery.isLoading,
    isFetching: staticQuery.isFetching || liveQuery.isFetching,
    isError: staticQuery.isError || liveQuery.isError,
    refetch: () => {
      staticQuery.refetch()
      liveQuery.refetch()
    }
  }
}
