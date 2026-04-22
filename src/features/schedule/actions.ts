'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/features/auth/permissions'
import { toUTCISOString, getCurrentISOString, getNextDateString, getDiffInMinutes, addMinutesToTime, toKSTISOString } from '@/shared/lib/date-utils'

// 스케줄 조회 (기간) 및 해당 기간의 승인된 휴가 정보 함께 반환
export async function getSchedules(storeId: string, startDate: string, endDate: string) {
  const supabase = await createClient()

  // 1. 스케줄 기본 정보 조회
  const { data: schedules, error: scheduleError } = await supabase
    .from('schedules')
    .select(`
      id,
      store_id,
      plan_date,
      start_time,
      end_time,
      schedule_type,
      member_id,
      member:store_members!schedules_member_id_fkey (name, user_id, profile:profiles(full_name, avatar_url)),
      tasks!schedule_id(
        id,
        title,
        description,
        status,
        checklist,
        start_time,
        end_time,
        task_type
      )
    `)
    .eq('store_id', storeId)
    .gte('plan_date', startDate.split('T')[0])
    .lte('plan_date', endDate.split('T')[0])

  if (scheduleError) {
    console.error('Error fetching schedules:', scheduleError)
    return []
  }

  // 2. 해당 기간의 승인된 휴가 정보 조회 (SSOT)
  const { data: leaves, error: leaveError } = await supabase
    .from('leave_requests')
    .select('member_id, start_date, end_date, leave_type, reason')
    .eq('store_id', storeId)
    .eq('status', 'approved')
    .gte('end_date', startDate.split('T')[0])
    .lte('start_date', endDate.split('T')[0])

  if (leaveError) {
    console.error('Error fetching leaves:', leaveError)
    return schedules
  }

  // 스케줄 객체에 관련 휴가 정보를 붙여서 반환
  return schedules.map((sch: any) => {
    let startIso = sch.start_time;
    if (startIso && !startIso.includes('T') && sch.plan_date) {
      startIso = `${sch.plan_date}T${startIso}`;
    }
    let endIso = sch.end_time;
    if (endIso && !endIso.includes('T') && sch.plan_date) {
      if (endIso < sch.start_time) {
        const nextDate = new Date(sch.plan_date);
        nextDate.setDate(nextDate.getDate() + 1);
        const y = nextDate.getFullYear();
        const m = String(nextDate.getMonth() + 1).padStart(2, '0');
        const d = String(nextDate.getDate()).padStart(2, '0');
        endIso = `${y}-${m}-${d}T${endIso}`;
      } else {
        endIso = `${sch.plan_date}T${endIso}`;
      }
    }

    return {
      ...sch,
      start_time: startIso,
      end_time: endIso,
      approved_leaves: leaves // 프론트엔드에서 필터링하여 사용
    }
  })
}

// 스케줄 생성 (다중 인원, 반복 지원)
export async function createSchedule(storeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch (error) {
    return { error: '권한이 없습니다.' }
  }

  // 데이터 추출
  const userIdsJson = formData.get('userIds') as string
  let userIds: string[] = []
  try {
    userIds = JSON.parse(userIdsJson)
  } catch (e) {
    return { error: 'Invalid user selection' }
  }

  if (!userIds || userIds.length === 0) {
    return { error: '직원을 선택해주세요.' }
  }

  const startDateStr = formData.get('date') as string
  const startTimeStr = formData.get('startTime') as string
  const endTimeStr = formData.get('endTime') as string
  const scheduleType = formData.get('schedule_type') as string
  
  const isRecurring = formData.get('isRecurring') === 'on'
  const repeatEndDateStr = formData.get('repeatEndDate') as string
  const repeatDaysJson = formData.get('repeatDays') as string // ["1", "3", "5"] (월,수,금)
  
  let targetDates: string[] = [startDateStr]

  // 반복 설정 시 날짜 목록 생성
  if (isRecurring && repeatEndDateStr && repeatDaysJson) {
    try {
      const repeatDays = JSON.parse(repeatDaysJson).map(Number) // [1, 3, 5]
      const start = new Date(startDateStr)
      const end = new Date(repeatEndDateStr)
      
      targetDates = [] // 초기화 (시작일도 조건에 맞는지 체크하기 위해)
      
      for (let d = start; d <= end; d.setDate(d.getDate() + 1)) {
        if (repeatDays.includes(d.getDay())) {
          targetDates.push(d.toISOString().split('T')[0])
        }
      }
    } catch (e) {
      console.error('Error parsing repeat options:', e)
      return { error: '반복 설정 오류' }
    }
  }

  if (targetDates.length === 0) {
    return { error: '생성할 날짜가 없습니다.' }
  }

  let createdCount = 0

  for (const date of targetDates) {
    // 스키마에 맞게 plan_date, start_time, end_time 설정
    const planDate = date
    // 시간이 자정을 넘기는 경우, 일단 end_time은 endTimeStr 그대로 저장 (데이터베이스 제약조건이나 정책에 따라 조정 가능)
    // 현재 schedules 테이블 스키마:
    // plan_date: DATE
    // start_time: TIME WITHOUT TIME ZONE
    // end_time: TIME WITHOUT TIME ZONE
    const startTimeOnly = startTimeStr + ':00' // 'HH:mm' -> 'HH:mm:ss'
    const endTimeOnly = endTimeStr + ':00'

    // 1. 스케줄 본체 생성 (현재 스키마에선 member_id 필요)
    const { data: schedule, error: scheduleError } = await supabase
        .from('schedules')
        .insert({
            store_id: storeId,
            member_id: userIds[0],
            plan_date: planDate,
            start_time: startTimeOnly,
            end_time: endTimeOnly,
            schedule_type: scheduleType || 'regular',
        })
        .select()
        .single()
    
    if (scheduleError) {
        console.error('Schedule Create Error:', scheduleError)
        const fs = require('fs')
        fs.writeFileSync('/tmp/leaven_schedule_error.txt', JSON.stringify(scheduleError))
        return { error: scheduleError.message }
    }

    // 2. 스케줄을 단일 담당자로 생성하였으므로 member 연결 로직 생략
    // (다중 할당이 필요한 경우 스케줄 row를 각각 생성해야 함)

    createdCount++
  }

  revalidatePath('/dashboard/schedule')
  return { success: true, count: createdCount }
}

// 스케줄 시간 수정 (드래그 앤 드롭 등) 및 개별 업무(Task) 시간 이동
export async function updateScheduleTime(
  storeId: string,
  scheduleId: string,
  newStart: string, // ISO String
  newEnd: string,   // ISO String
  moveTasks: boolean = false
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch (error) {
    return { error: '권한이 없습니다.' }
  }

  // newStart, newEnd는 ISO 문자열로 넘어오므로 분리 필요
  const planDate = newStart.split('T')[0]
  const startTimeOnly = newStart.split('T')[1].substring(0, 8)
  const endTimeOnly = newEnd.split('T')[1].substring(0, 8)

  // 기존 스케줄 정보를 가져와 시간 차이(delta)를 분 단위로 계산 (moveTasks가 true일 때만)
  let deltaMinutes = 0;
  if (moveTasks) {
    const { data: oldSchedule } = await supabase
      .from('schedules')
      .select('plan_date, start_time')
      .eq('id', scheduleId)
      .single()

    if (oldSchedule?.start_time && oldSchedule?.plan_date) {
      const oldStartIso = `${oldSchedule.plan_date}T${oldSchedule.start_time}Z`
      const newStartIso = `${planDate}T${startTimeOnly}Z`
      deltaMinutes = getDiffInMinutes(oldStartIso, newStartIso)
    }
  }

  // 스케줄 업데이트
  const { error } = await supabase
    .from('schedules')
    .update({
      plan_date: planDate,
      start_time: startTimeOnly,
      end_time: endTimeOnly,
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('store_id', storeId) 

  if (error) {
    return { error: error.message }
  }

  // 개별 업무 시간 연동 이동 로직
  if (moveTasks && deltaMinutes !== 0) {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, start_time, end_time, assigned_date')
      .eq('schedule_id', scheduleId)
      .eq('store_id', storeId)
      .eq('is_template', false)

    if (tasks && tasks.length > 0) {
      for (const task of tasks) {
        if (task.start_time) {
          try {
            const updates: any = {}
            
            // start_time 업데이트
            const tStart = new Date(task.start_time)
            tStart.setUTCMinutes(tStart.getUTCMinutes() + deltaMinutes)
            updates.start_time = tStart.toISOString()

            // end_time 업데이트
            if (task.end_time) {
              const tEnd = new Date(task.end_time)
              tEnd.setUTCMinutes(tEnd.getUTCMinutes() + deltaMinutes)
              updates.end_time = tEnd.toISOString()
            }

            await supabase
              .from('tasks')
              .update(updates)
              .eq('id', task.id)

          } catch (e) {
            console.error('Task time update error:', e)
          }
        }
      }
    }
  }

  revalidatePath('/dashboard/schedule')
  return { success: true }
}

// 스케줄 수정 (다이얼로그)
export async function updateSchedule(storeId: string, scheduleId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch (error) {
    return { error: '권한이 없습니다.' }
  }

  // 데이터 추출
  const userIdsJson = formData.get('userIds') as string
  let userIds: string[] = []
  try {
    userIds = JSON.parse(userIdsJson)
  } catch (e) {
    return { error: 'Invalid user selection' }
  }

  if (!userIds || userIds.length === 0) {
    return { error: '직원을 선택해주세요.' }
  }

  const date = formData.get('date') as string
  const startTimeStr = formData.get('startTime') as string
  const endTimeStr = formData.get('endTime') as string
  const scheduleType = formData.get('schedule_type') as string

  const planDate = date
  const startTimeOnly = startTimeStr + ':00'
  const endTimeOnly = endTimeStr + ':00'

  // 기존 스케줄 정보를 가져와 날짜 차이 확인
  const { data: oldSchedule } = await supabase
    .from('schedules')
    .select('plan_date')
    .eq('id', scheduleId)
    .single()

  const oldDateStr = oldSchedule?.plan_date || date

  // 1. 스케줄 정보 업데이트
  const { error: updateError } = await supabase
    .from('schedules')
    .update({
      plan_date: planDate,
      start_time: startTimeOnly,
      end_time: endTimeOnly,
      schedule_type: scheduleType || 'regular',
      updated_at: new Date().toISOString(),
    })
    .eq('id', scheduleId)
    .eq('store_id', storeId)

  if (updateError) {
    return { error: updateError.message }
  }

  // 날짜가 변경되었거나 직원이 변경되었을 경우 해당 스케줄에 속한 tasks 업데이트
  
  // 1. 기존 멤버 파악 (기존 스케줄의 담당자를 알아내서 새 userIds와 비교)
  // 새 스키마에서는 schedules 테이블에 member_id가 있습니다.
  // oldSchedule이 위에서 조회되었으므로 다시 쓸 수 있습니다. (select에 member_id 추가 필요)
  
  const { data: currentSchedule } = await supabase
    .from('schedules')
    .select('start_time, member_id')
    .eq('id', scheduleId)
    .single()

  const oldMemberIds = currentSchedule?.member_id ? [currentSchedule.member_id] : []
  
  // 단일 담당자 변경 체크
  const isMemberChanged = userIds.length > 0 && (oldMemberIds.length !== userIds.length || !oldMemberIds.includes(userIds[0]))

  // schedules 정보 업데이트 시 member_id도 업데이트 (update 구문 덮어쓰기)
  await supabase
    .from('schedules')
    .update({ member_id: userIds[0] })
    .eq('id', scheduleId)

  // 날짜가 변경되었거나 직원이 변경되었을 경우 해당 스케줄에 속한 tasks 업데이트
  if (oldDateStr !== date || isMemberChanged) {
    const deltaMs = new Date(date).getTime() - new Date(oldDateStr).getTime()
    const deltaMinutes = Math.round(deltaMs / 60000)

    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, start_time, end_time, assigned_date, user_id')
      .eq('schedule_id', scheduleId)
      .eq('store_id', storeId)
      .eq('is_template', false)

    if (tasks && tasks.length > 0) {
      let newUserId: string | null = null;
      if (isMemberChanged && userIds.length > 0) {
          const { data: newMemberData } = await supabase
              .from('store_members')
              .select('user_id')
              .eq('id', userIds[0])
              .single()
          if (newMemberData && newMemberData.user_id) {
              newUserId = newMemberData.user_id
          }
      }

      const assignmentsToUpdate = []

      for (const task of tasks) {
        const updates: any = { id: task.id }
        let hasChanges = false;

        if (oldDateStr !== date) {
           updates.assigned_date = date
           hasChanges = true;
        }

        if (isMemberChanged && newUserId) {
            updates.user_id = newUserId
            hasChanges = true;
        }
        
        if (oldDateStr !== date && task.start_time && deltaMinutes !== 0) {
            try {
              const tStart = new Date(task.start_time)
              tStart.setUTCMinutes(tStart.getUTCMinutes() + deltaMinutes)
              updates.start_time = tStart.toISOString()

              if (task.end_time) {
                const tEnd = new Date(task.end_time)
                tEnd.setUTCMinutes(tEnd.getUTCMinutes() + deltaMinutes)
                updates.end_time = tEnd.toISOString()
              }
              hasChanges = true;
            } catch(e) {
                console.error("Task time update error:", e)
            }
        }

        if (hasChanges) { 
            assignmentsToUpdate.push(updates)
        }
      }

      if (assignmentsToUpdate.length > 0) {
          await Promise.all(
            assignmentsToUpdate.map(updateObj => 
              supabase.from('tasks').update(updateObj).eq('id', updateObj.id)
            )
          )
      }
    }
  }

  // 2. 멤버 동기화 로직은 단일 member_id 업데이트로 대체되었으므로 삭제

  revalidatePath('/dashboard/schedule')
  revalidatePath('/dashboard/my-tasks')
  return { success: true }
}

// 현재 로그인한 사용자의 현재 시간 기준 스케줄 조회
export async function getCurrentSchedule(storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // KST 기준 현재 날짜와 시간
  const now = new Date()
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  const todayStr = kstNow.toISOString().split('T')[0] // YYYY-MM-DD
  const currentTimeStr = kstNow.toISOString().split('T')[1].substring(0, 8) // HH:mm:ss

  console.log(`[getCurrentSchedule] Checking for user ${user.id} at date: ${todayStr}, time: ${currentTimeStr}`)

  // First get the member_id for the current user in this store
  const { data: memberData } = await supabase
    .from('store_members')
    .select('id')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .single()
    
  if (!memberData) return null

  // member_id가 일치하고 현재 날짜가 plan_date이며 시간이 start_time과 end_time 사이에 있는 스케줄 조회
  const { data, error } = await supabase
    .from('schedules')
    .select(`
      id,
      plan_date,
      start_time,
      end_time,
      member_id
    `)
    .eq('store_id', storeId)
    .eq('member_id', memberData.id)
    .eq('plan_date', todayStr)
    .lte('start_time', currentTimeStr)
    .gte('end_time', currentTimeStr)
    .limit(1)
    .maybeSingle() // 여러 개 겹칠 경우 하나만

  if (error) {
    console.error('Error fetching current schedule:', error)
    return null
  }

  console.log(`[getCurrentSchedule] Result:`, data ? `Found schedule ${data.id}` : 'No schedule found')
  return data
}

// 스케줄 삭제
export async function deleteSchedule(storeId: string, scheduleId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch (error) {
    return { error: '권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('store_id', storeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/schedule')
  return { success: true }
}

// 자동 스케줄 생성 (직원 근무 패턴 기반)
export async function generateStaffSchedules(
  storeId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  targetStaffIds: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch (error) {
    return { error: '권한이 없습니다.' }
  }

  // Call RPC
  const { data, error } = await supabase.rpc('generate_staff_schedules', {
    p_store_id: storeId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_target_staff_ids: targetStaffIds
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/schedule')
  return { success: true, count: data }
}

// 스케줄 일괄 삭제 (직원, 기간)
export async function deleteStaffSchedules(
  storeId: string,
  startDate: string, // YYYY-MM-DD
  endDate: string,   // YYYY-MM-DD
  targetStaffIds: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch (error) {
    return { error: '권한이 없습니다.' }
  }

  // Call RPC
  const { data, error } = await supabase.rpc('delete_staff_schedules', {
    p_store_id: storeId,
    p_start_date: startDate,
    p_end_date: endDate,
    p_target_staff_ids: targetStaffIds
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/schedule')
  return { success: true, count: data }
}