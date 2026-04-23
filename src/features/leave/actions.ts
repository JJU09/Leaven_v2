'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { unstable_noStore as noStore } from 'next/cache'
import { requirePermission } from '@/features/auth/permissions'
import { toUTCISOString } from '@/shared/lib/date-utils'

export async function getLeaveBalances(storeId: string, year: number) {
  noStore()
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('leave_balances')
    .select(`
      *,
      member:store_members!inner(id, name, user_id, profiles(full_name), role:store_roles(name))
    `)
    .eq('store_id', storeId)
    .eq('year', year)

  if (error) {
    console.error('Error fetching leave balances:', error)
    return []
  }

  return data
}

export async function getLeaveRequests(storeId: string) {
  noStore()
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      member:store_members!leave_requests_member_id_fkey!inner(id, name, user_id, profiles(full_name), role:store_roles(name))
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    
  if (error) {
    console.error('Error fetching leave requests:', error)
    return []
  }
  
  return data
}

export async function createLeaveRequest(
  storeId: string,
  memberId: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  requestedDays: number,
  reason: string,
  attachmentUrl?: string
) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      store_id: storeId,
      member_id: memberId,
      leave_type: leaveType,
      start_date: startDate,
      end_date: endDate,
      requested_days: requestedDays,
      reason: reason,
      attachment_url: attachmentUrl,
      status: 'pending'
    })
    .select()
    .single()
    
  if (error) {
    console.error('Error creating leave request:', error)
    return { error: '휴가 신청 중 오류가 발생했습니다.' }
  }
  
  revalidatePath('/dashboard/leave')
  return { success: true, data }
}

export async function resolveLeaveRequest(requestId: string, storeId: string, status: 'approved' | 'rejected') {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증되지 않은 사용자입니다.' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch {
    return { error: '요청을 처리할 권한이 없습니다.' }
  }

  // 1. 요청 정보 가져오기
  const { data: request, error: requestError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .eq('store_id', storeId)
    .single()

  if (requestError || !request) {
    return { error: '요청을 찾을 수 없습니다.' }
  }

  if (request.status !== 'pending') {
    return { error: '이미 처리된 요청입니다.' }
  }

  const year = new Date(request.start_date).getFullYear()

  // 2. 상태 업데이트
  const { error: updateError } = await adminClient
    .from('leave_requests')
    .update({ 
      status, 
      resolved_by: user.id, 
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error resolving leave request:', updateError)
    return { error: '상태 업데이트 중 오류가 발생했습니다.' }
  }

  // 3. 승인인 경우 연차 차감 (수동 롤백 패턴 적용)
  if (status === 'approved') {
    // 잔여 연차 조회
    const { data: balance, error: balanceError } = await adminClient
      .from('leave_balances')
      .select('*')
      .eq('store_id', storeId)
      .eq('member_id', request.member_id)
      .eq('year', year)
      .single()

    if (!balanceError && balance) {
      // 연차 차감 로직 (사용일수 증가)
      const newUsedDays = Number(balance.used_days) + Number(request.requested_days)
      
      const { error: deductError } = await adminClient
        .from('leave_balances')
        .update({ 
          used_days: newUsedDays,
          updated_at: new Date().toISOString()
        })
        .eq('id', balance.id)

      if (deductError) {
        // 보상 트랜잭션: 연차 차감 실패 시 승인 상태를 다시 pending으로 롤백
        console.error('Error deducting leave balance, rolling back status:', deductError)
        await adminClient
          .from('leave_requests')
          .update({ 
            status: 'pending',
            resolved_by: null,
            resolved_at: null
          })
          .eq('id', requestId)
        
        return { error: '연차 차감 중 오류가 발생하여 승인이 취소되었습니다.' }
      }
    } else {
      // 연차 정보가 없는 경우 새로 생성 (총 연차는 null로 두어 클라이언트 자동 계산 사용)
      const { error: insertError } = await adminClient
        .from('leave_balances')
        .insert({
          store_id: storeId,
          member_id: request.member_id,
          year: year,
          total_days: null,
          used_days: request.requested_days
        })

      if (insertError) {
        console.error('Error inserting leave balance, rolling back status:', insertError)
        await adminClient
          .from('leave_requests')
          .update({ 
            status: 'pending',
            resolved_by: null,
            resolved_at: null
          })
          .eq('id', requestId)
        
        return { error: '연차 차감 중 오류가 발생하여 승인이 취소되었습니다.' }
      }
    }
  }

  revalidatePath('/dashboard/leave')
  revalidatePath('/dashboard/schedule')
  return { success: true }
}

export async function revokeLeaveRequest(requestId: string, storeId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증되지 않은 사용자입니다.' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch {
    return { error: '요청을 처리할 권한이 없습니다.' }
  }

  // 1. 요청 정보 가져오기
  const { data: request, error: requestError } = await supabase
    .from('leave_requests')
    .select('*')
    .eq('id', requestId)
    .eq('store_id', storeId)
    .single()

  if (requestError || !request) {
    return { error: '요청을 찾을 수 없습니다.' }
  }

  if (request.status !== 'approved') {
    return { error: '승인된 요청만 취소할 수 있습니다.' }
  }

  const year = new Date(request.start_date).getFullYear()

  // 2. 상태 업데이트 (rejected로 변경)
  const { error: updateError } = await adminClient
    .from('leave_requests')
    .update({ 
      status: 'rejected', 
      resolved_by: user.id, 
      resolved_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error revoking leave request:', updateError)
    return { error: '상태 업데이트 중 오류가 발생했습니다.' }
  }

  // 3. 연차 복구 (수동 롤백 패턴 적용)
  const { data: balance, error: balanceError } = await adminClient
    .from('leave_balances')
    .select('*')
    .eq('store_id', storeId)
    .eq('member_id', request.member_id)
    .eq('year', year)
    .single()

  if (!balanceError && balance) {
    // 연차 복구 로직 (사용일수 감소)
    const newUsedDays = Math.max(0, Number(balance.used_days) - Number(request.requested_days))
    
    const { error: refundError } = await adminClient
      .from('leave_balances')
      .update({ 
        used_days: newUsedDays,
        updated_at: new Date().toISOString()
      })
      .eq('id', balance.id)

    if (refundError) {
      // 보상 트랜잭션: 연차 복구 실패 시 취소 상태를 다시 approved로 롤백
      console.error('Error refunding leave balance, rolling back status:', refundError)
      await adminClient
        .from('leave_requests')
        .update({ 
          status: 'approved',
          // 원래 승인자 정보 유지가 베스트지만, 데이터가 없으므로 현재 사용자 유지
        })
        .eq('id', requestId)
      
      return { error: '연차 복구 중 오류가 발생하여 취소가 실패했습니다.' }
    }
  }

  revalidatePath('/dashboard/leave')
  revalidatePath('/dashboard/schedule')
  return { success: true }
}

export async function cancelLeaveRequest(requestId: string, storeId: string) {
  const supabase = await createClient()
  const adminClient = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증되지 않은 사용자입니다.' }

  // 1. 요청 정보 가져오기 및 본인 확인
  const { data: request, error: requestError } = await supabase
    .from('leave_requests')
    .select('*, member:store_members!inner(user_id)')
    .eq('id', requestId)
    .eq('store_id', storeId)
    .single()

  if (requestError || !request) {
    return { error: '요청을 찾을 수 없거나 권한이 없습니다.' }
  }

  // Array 형태로 반환되는 것을 방지하기 위해 any 캐스팅 후 처리
  const member = request.member as any
  const memberUserId = Array.isArray(member) ? member[0]?.user_id : member?.user_id

  if (memberUserId !== user.id) {
    return { error: '본인의 휴가 신청만 취소할 수 있습니다.' }
  }

  if (request.status !== 'pending') {
    return { error: '대기 중인 요청만 취소할 수 있습니다.' }
  }

  // 2. 상태 업데이트 (cancelled로 변경)
  const { error: updateError } = await adminClient
    .from('leave_requests')
    .update({ 
      status: 'cancelled', 
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  if (updateError) {
    console.error('Error cancelling leave request:', updateError)
    return { error: '휴가 취소 중 오류가 발생했습니다.' }
  }

  // [기획자 핵심 로직] 스케줄 테이블을 직접 수정하지 않고 Path Revalidation만 수행
  // 렌더링 시점에 leave_requests의 상태를 대조하므로 SSOT(Single Source of Truth)가 유지됩니다.
  revalidatePath('/dashboard/leave')
  revalidatePath('/dashboard/schedule')
  return { success: true }
}

export async function updateLeaveBalance(storeId: string, memberId: string, year: number, totalDays: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증되지 않은 사용자입니다.' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch {
    return { error: '잔여 연차를 수정할 권한이 없습니다.' }
  }

  // 먼저 해당 직원의 연차 데이터가 있는지 확인
  const { data: existingBalance } = await supabase
    .from('leave_balances')
    .select('id')
    .eq('store_id', storeId)
    .eq('member_id', memberId)
    .eq('year', year)
    .maybeSingle()

  if (existingBalance) {
    // 업데이트
    const { error } = await supabase
      .from('leave_balances')
      .update({ total_days: totalDays, updated_at: new Date().toISOString() })
      .eq('id', existingBalance.id)
      
    if (error) return { error: '연차 정보 수정 실패' }
  } else {
    // 신규 생성
    const { error } = await supabase
      .from('leave_balances')
      .insert({
        store_id: storeId,
        member_id: memberId,
        year: year,
        total_days: totalDays,
        used_days: 0 // 새로 추가하는 것이므로 사용일수는 0일로 시작
      })

    if (error) return { error: '새로운 연차 정보 생성 실패' }
  }
  
  revalidatePath('/dashboard/leave')
  return { success: true }
}

export async function resetAllLeaveBalances(storeId: string, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: '인증되지 않은 사용자입니다.' }

  try {
    await requirePermission(user.id, storeId, 'manage_schedule')
  } catch {
    return { error: '권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('leave_balances')
    .update({ 
      total_days: null, 
      updated_at: new Date().toISOString() 
    })
    .eq('store_id', storeId)
    .eq('year', year)

  if (error) {
    console.error('Error resetting leave balances:', error)
    return { error: '연차 초기화 중 오류가 발생했습니다.' }
  }

  revalidatePath('/dashboard/leave')
  return { success: true }
}
