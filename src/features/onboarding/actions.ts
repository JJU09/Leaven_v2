'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureDefaultRoles } from '@/features/store/roles'

export async function createStore(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const businessNumber = formData.get('business_number') as string
  const description = formData.get('description') as string

  // 1. 매장 생성
  const { data: newStore, error: storeError } = await supabase
    .from('stores')
    .insert({
      name,
      description,
      address,
      business_number: businessNumber,
      leave_calc_type: 'hire_date',
    })
    .select('id')
    .single()

  if (storeError || !newStore) {
    console.error('Store creation error:', storeError)
    return { error: storeError?.message || '매장 생성에 실패했습니다.' }
  }

  const storeId = newStore.id

  // 2. 기본 직급(역할) 생성 및 점주 역할 ID 가져오기
  const { ownerRoleId } = await ensureDefaultRoles(storeId)
  
  if (!ownerRoleId) {
    console.error('Failed to create or retrieve owner role')
    return { error: '기본 직급 생성에 실패했습니다.' }
  }

  // 3. 점주 프로필 가져오기 및 필요시 생성 (프로필이 비어있다면)
  let { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  const fallbackName = user.user_metadata?.full_name || '점주'
  if (!profile || !profile.full_name) {
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fallbackName,
    })
    profile = { full_name: fallbackName, phone: profile?.phone || null }
  }

  const ownerName = profile?.full_name || fallbackName
  const ownerPhone = profile?.phone || ''
  const ownerEmail = user.email || ''

  // 4. 매장 멤버로 점주 등록 - profile 연동을 위해 수기 등록용 이름(name)에도 초기값 세팅
  const { error: memberError } = await supabase
    .from('store_members')
    .insert({
      store_id: storeId,
      user_id: user.id,
      role_id: ownerRoleId,
      status: 'active',
      wage_type: 'monthly', // 점주 기본값
      name: ownerName,
      phone: ownerPhone,
      email: ownerEmail,
      role: 'owner',
    })

  if (memberError) {
    console.error('Owner member creation error:', memberError)
    return { error: '점주 계정 등록에 실패했습니다.' }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/home')
  redirect('/home') // 변경: dashboard -> home
}

// 1. 초대/소속 상태 조회 (단일 매장 호환용 - deprecated 예정)
export async function getInvitationStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { status: 'none' as const }

  const { data: members, error } = await supabase
    .from('store_members')
    .select(`
      id,
      role_info:store_roles(name),
      status,
      store:stores (
        id,
        name,
        description
      )
    `)
    .eq('user_id', user.id)

  if (error || !members || members.length === 0) return { status: 'none' as const }

  // active인 멤버가 있으면 우선 반환, 없으면 invited, 없으면 pending_approval
  const member = members.find(m => m.status === 'active') 
    || members.find(m => m.status === 'invited')
    || members.find(m => m.status === 'pending_approval')
    || members[0]

  if (!member) return { status: 'none' as const }

  const store = Array.isArray(member.store) ? member.store[0] : member.store

  return {
    status: member.status,
    store: store as { id: string; name: string; description: string },
    // @ts-ignore - Supabase type inference issue with nested join
    role: Array.isArray(member.role_info) ? member.role_info[0]?.name : member.role_info?.name,
  }
}

// 1.1 사용자 초대 목록 조회 (New)
export async function getUserInvitations() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: invitations } = await supabase
    .from('store_members')
    .select(`
      id,
      role_info:store_roles(name),
      status,
      invited_at:joined_at,
      store:stores (
        id,
        name,
        description
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'invited')
    .order('joined_at', { ascending: false })

  if (!invitations) return []

  return invitations.map(invitation => ({
    ...invitation,
    store: Array.isArray(invitation.store) ? invitation.store[0] : invitation.store
  }))
}

// 2. 초대 수락
export async function acceptInvitation(storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // 직원이 초대를 수락하더라도 점주의 최종 확인 전까지는 'pending_approval'(합류 대기) 상태로 둡니다.
  const { error } = await supabase
    .from('store_members')
    .update({ status: 'pending_approval', joined_at: new Date().toISOString() })
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .eq('status', 'invited')

  if (error) {
    return { error: '초대 수락 중 오류가 발생했습니다: ' + error.message }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/home')
  redirect('/home')
}

// 2.1 초대 거절 (New)
export async function rejectInvitation(storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('store_members')
    .delete()
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .eq('status', 'invited')

  if (error) return { error: error.message }

  revalidatePath('/home')
  return { success: true }
}

// 3. 가입 요청 취소
export async function cancelRequest(storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('store_members')
    .delete()
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .eq('status', 'pending_approval')

  if (error) return { error: error.message }

  revalidatePath('/home')
}

// 4. 매장 코드로 매장 찾기 (RPC 사용)
export async function verifyInviteCode(code: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase.rpc('verify_invite_code', { code })

  if (error) return { error: error.message }
  if (!data || data.length === 0) return { error: '유효하지 않은 매장 코드입니다.' }

  return { store: data[0] }
}

// 5. 매장 코드로 가입 요청
export async function joinStoreByCode(code: string, name: string, phone: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // 1. 매장 찾기
  const verifyResult = await verifyInviteCode(code)
  if (verifyResult.error || !verifyResult.store) {
    return { error: verifyResult.error || '매장을 찾을 수 없습니다.' }
  }

  const storeId = verifyResult.store.id

  // 2. 중복 신청 확인 (모든 상태를 포함하여 검사)
  const { data: existing } = await supabase
    .from('store_members')
    .select('id, status')
    .eq('store_id', storeId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // 이미 존재하는 멤버라면, 상황에 따라 다르게 처리
    if (existing.status === 'active') {
      return { error: '이미 해당 매장의 직원입니다.' }
    } else if (existing.status === 'pending_approval') {
      // 이미 승인 대기중이면 굳이 에러를 띄우지 않고 홈으로 보내버림
      return { success: true }
    } else if (existing.status === 'invited') {
      // 초대 상태라면 pending_approval로 업데이트 해줌
      await supabase
        .from('store_members')
        .update({ status: 'pending_approval' })
        .eq('id', existing.id)
      revalidatePath('/', 'layout')
      revalidatePath('/home')
      return { success: true }
    } else {
      return { error: '이미 해당 매장에 가입 요청 내역이 존재합니다.' }
    }
  }

  // 3. 프로필 정보 업데이트
  // 직원이 입력한 정보가 최신이라고 가정하고, 프로필이 비어있으면 업데이트합니다.
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone')
    .eq('id', user.id)
    .single()

  const updates: { full_name?: string; phone?: string, id?: string } = {}
  if (!profile?.full_name) updates.full_name = name
  if (!profile?.phone) updates.phone = phone

  if (Object.keys(updates).length > 0) {
    await supabase
      .from('profiles')
      .upsert({ id: user.id, ...updates }, { onConflict: 'id' })
  }
  
  // 방금 업데이트했거나 기존에 있던 프로필 정보
  const finalProfileName = updates.full_name || profile?.full_name || name
  const finalProfilePhone = updates.phone || profile?.phone || phone

  // 4. 수기 등록 직원 매칭 시도
  // 이름과 전화번호가 일치하는 수기 등록 직원(user_id is null)이 있으면 해당 레코드를 승계합니다.
  let claimed = false
  try {
    const { data: claimResult, error: claimError } = await supabase.rpc('claim_manual_staff', {
      store_id_param: storeId,
      name_param: name,
      phone_param: phone,
    })

    if (claimError) {
      console.error('Claim manual staff error:', claimError)
    } else {
      claimed = !!claimResult
    }
  } catch (err) {
    console.error('Exception during claim_manual_staff:', err)
  }

  // 매칭 성공 시 종료
  if (claimed) {
    // 수기 등록 직원의 경우 프로필 데이터(이름, 전화번호, 이메일)로 스토어 멤버 정보 동기화
    await supabase
      .from('store_members')
      .update({ name: finalProfileName, phone: finalProfilePhone, email: user.email || '' })
      .eq('store_id', storeId)
      .eq('user_id', user.id)

    revalidatePath('/', 'layout')
    revalidatePath('/home')
    return { success: true }
  }

  // 5. 가입 요청 (Pending Approval) - 매칭된 직원이 없을 경우
  // V2 스키마: role_id가 필수이므로 매장의 기본 '미지정' 직급을 찾아 연결
  let { data: defaultRole } = await supabase
    .from('store_roles')
    .select('id')
    .eq('store_id', storeId)
    .eq('name', '미지정')
    .single()
    
  let roleId = defaultRole?.id
  
  // 만약 미지정 역할이 없다면, RPC를 사용해서 RLS를 우회하여 '미지정' 역할을 강제로 생성합니다.
  if (!roleId) {
    const { data: rpcRoleId, error: rpcError } = await supabase.rpc('create_unassigned_role_if_not_exists', {
      p_store_id: storeId
    })

    if (rpcError) {
      console.error('RPC create_unassigned_role_if_not_exists failed:', rpcError)
    } else if (rpcRoleId) {
      roleId = rpcRoleId
    }
  }

  if (!roleId) {
    console.error('Failed to get or create unassigned role for store:', storeId)
    return { error: '매장 정보(기본 직급)가 아직 완전히 설정되지 않았습니다. 점장님이 매장에 한 번 접속해야 완료됩니다.' }
  }

  const { error } = await supabase.from('store_members').insert({
    store_id: storeId,
    user_id: user.id,
    role_id: roleId,
    status: 'pending_approval',
    joined_at: new Date().toISOString(),
    name: finalProfileName,
    phone: finalProfilePhone,
    email: user.email || '',
  })

  if (error) {
    // 혹시라도 동시성 문제로 unique 제약 조건 에러가 난다면, 이미 가입된 것으로 간주하고 성공 처리
    if (error.code === '23505' || error.message.includes('duplicate key')) {
      revalidatePath('/', 'layout')
      revalidatePath('/home')
      return { success: true }
    }
    return { error: '가입 요청 중 오류가 발생했습니다: ' + error.message }
  }

  revalidatePath('/', 'layout')
  revalidatePath('/home')
  return { success: true }
}
