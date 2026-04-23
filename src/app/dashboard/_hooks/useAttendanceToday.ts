import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { getToday } from '../_utils/dateHelpers'
import { format } from 'date-fns'

export type AttendanceStatus = '근무 중' | '결근 / 미출근' | '연차' | '퇴근 완료' | '출근 전'

export type TodayAttendanceItem = {
  id: string
  name: string
  role: string | null
  status: AttendanceStatus
  time?: string
  scheduleTime?: string
  avatarColor?: string
}

export function useAttendanceToday(storeId: string) {
  const supabase = createClient()
  const todayDateStr = format(getToday(), 'yyyy-MM-dd')

  return useQuery({
    queryKey: ['dashboard', storeId, 'attendance', todayDateStr],
    queryFn: async () => {
      // 1. 오늘 출퇴근 기록 및 관련된 멤버 정보 가져오기
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('store_attendance')
        .select(`
          member_id, clock_in_time, clock_out_time, target_date, status,
          member:store_members(
            id, name, status, role_info:store_roles(name, color), profile:profiles(full_name),
            leave_requests!leave_requests_member_id_fkey(status, start_date, end_date)
          )
        `)
        .eq('store_id', storeId)
        .eq('target_date', todayDateStr)

      if (attendanceError) throw attendanceError

      // 2. 오늘 스케줄 및 관련된 멤버 정보 가져오기
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('schedules')
        .select(`
          member_id, start_time, end_time, plan_date,
          member:store_members(
            id, name, status, role_info:store_roles(name, color), profile:profiles(full_name),
            leave_requests!leave_requests_member_id_fkey(status, start_date, end_date)
          )
        `)
        .eq('store_id', storeId)
        .eq('plan_date', todayDateStr)
      
      if (scheduleError) throw scheduleError

      // 출퇴근 또는 스케줄이 있는 직원만 Map에 담기
      const memberMap = new Map<string, any>()
      
      attendanceData?.forEach(a => {
        const memberObj = Array.isArray(a.member) ? a.member[0] : a.member
        if (memberObj) {
          memberMap.set(a.member_id, memberObj)
        }
      })

      scheduleData?.forEach(s => {
        const memberObj = Array.isArray(s.member) ? s.member[0] : s.member
        if (memberObj && !memberMap.has(s.member_id)) {
          memberMap.set(s.member_id, memberObj)
        }
      })

      const now = new Date()
      const result: TodayAttendanceItem[] = []
      
      for (const [memberId, member] of memberMap.entries()) {
        const profileFullName = Array.isArray(member.profile) ? member.profile[0]?.full_name : (member.profile as any)?.full_name
        const staffName = member.name || profileFullName || '이름 없음'
        const roleName = member.role_info ? (Array.isArray(member.role_info) ? member.role_info[0]?.name : (member.role_info as any).name) : '직원'
        const roleColor = member.role_info ? (Array.isArray(member.role_info) ? member.role_info[0]?.color : (member.role_info as any).color) : undefined

        // 연차 확인
        const todayLeave = member.leave_requests ? (Array.isArray(member.leave_requests) ? member.leave_requests : [member.leave_requests]).find(
          (lr: any) => lr.start_date <= todayDateStr && lr.end_date >= todayDateStr && lr.status === 'approved'
        ) : undefined

        const attendance = attendanceData?.find(a => a.member_id === memberId)
        const schedule = scheduleData?.find(s => s.member_id === memberId)
        
        // 연차 처리
        if (todayLeave) {
          result.push({ id: memberId, name: staffName, role: roleName, status: '연차', avatarColor: roleColor })
          continue
        }
        
        let status: AttendanceStatus = '출근 전'
        let timeStr = undefined
        let scheduleTimeStr = undefined
        
        if (schedule) {
          scheduleTimeStr = `${schedule.start_time.substring(0, 5)} ~ ${schedule.end_time.substring(0, 5)}`
        }

        if (attendance) {
          if (attendance.status === 'completed' || attendance.clock_out_time) {
             status = '퇴근 완료'
             timeStr = attendance.clock_out_time ? format(new Date(attendance.clock_out_time), 'HH:mm') : undefined
          } else if (attendance.status === 'working' || attendance.clock_in_time) {
            status = '근무 중'
            timeStr = attendance.clock_in_time ? format(new Date(attendance.clock_in_time), 'HH:mm') : undefined
          }
        } else if (schedule) {
          // 출근 기록 없고 스케줄만 있을 때 지각 여부 판별
          const schTime = new Date(`${schedule.plan_date}T${schedule.start_time}`).getTime()
          if (now.getTime() > schTime + (5 * 60 * 1000)) {
            status = '결근 / 미출근'
          }
        }

        result.push({ 
          id: memberId, 
          name: staffName, 
          role: roleName, 
          status, 
          time: timeStr,
          scheduleTime: scheduleTimeStr,
          avatarColor: roleColor
        })
      }

      // 정렬: 결근/미출근 -> 근무 중 -> 출근 전 -> 퇴근 완료 -> 연차
      const statusWeight = { '결근 / 미출근': 1, '근무 중': 2, '출근 전': 3, '퇴근 완료': 4, '연차': 5 }
      return result.sort((a, b) => statusWeight[a.status] - statusWeight[b.status])
    },
    refetchInterval: 30000, // 30초마다 갱신
    enabled: !!storeId,
  })
}
