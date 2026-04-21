'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { DEFAULT_ROLE_PERMISSIONS } from '@/features/auth/permissions'

export type Role = {
  id: string
  store_id: string
  name: string
  color: string
  is_system: boolean
  hierarchy_level: number
  parent_id: string | null
  created_at: string
}

export type Permission = {
  code: string
  name: string
  description: string
  category: string
}

export async function getStoreRoles(storeId: string) {
  noStore()
  const supabase = await createClient()
  
  try {
    const { data: roles, error } = await supabase
      .from('store_roles')
      .select('*')
      .eq('store_id', storeId)
      .order('hierarchy_level', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('getStoreRoles error:', error)
      return []
    }
    return roles as Role[]
  } catch (err) {
    console.error('getStoreRoles exception:', err)
    return []
  }
}

const STATIC_PERMISSIONS: Permission[] = [
  { code: 'manage_store', name: '매장 관리', description: '매장 정보 설정 및 삭제', category: '매장 및 시스템' },
  { code: 'manage_roles', name: '직급 및 권한 관리', description: '직급 생성 및 메뉴 접근 권한 설정', category: '매장 및 시스템' },
  { code: 'view_dashboard', name: '대시보드 조회', description: '매장 현황 및 요약 정보 조회', category: '매장 및 시스템' },
  { code: 'view_staff', name: '직원 정보 조회', description: '직원 목록 및 기본 정보 조회', category: '인사 및 근로' },
  { code: 'manage_staff', name: '직원 관리', description: '직원 초대, 정보 수정, 근로계약 관리', category: '인사 및 근로' },
  { code: 'view_salary', name: '급여 정보 조회', description: '본인 및 직원의 시급/월급 등 급여 정보 조회', category: '인사 및 근로' },
  { code: 'manage_payroll', name: '급여 정산 관리', description: '급여 계산, 명세서 발급 및 정산 내역 관리', category: '인사 및 근로' },
  { code: 'view_schedule', name: '일정 조회', description: '전체 직원의 근무 일정 조회', category: '일정 및 근태' },
  { code: 'manage_schedule', name: '일정 관리', description: '근무 일정 등록, 수정 및 삭제', category: '일정 및 근태' },
  { code: 'view_attendance', name: '근태 내역 조회', description: '직원들의 출퇴근 기록 및 근태 내역 조회', category: '일정 및 근태' },
  { code: 'manage_attendance', name: '근태 기록 관리', description: '출퇴근 기록 수정 및 근태 이상 관리', category: '일정 및 근태' },
  { code: 'view_leave', name: '휴가 내역 조회', description: '직원들의 휴가 사용 내역 및 잔여 연차 조회', category: '일정 및 근태' },
  { code: 'manage_leave', name: '휴가 관리', description: '휴가 신청 승인/반려 및 연차 일수 관리', category: '일정 및 근태' },
  { code: 'view_tasks', name: '업무 조회', description: '할 일 및 업무 일지 조회', category: '운영 및 업무' },
  { code: 'manage_tasks', name: '업무 관리', description: '업무 지시, 템플릿 생성 및 결과 확인', category: '운영 및 업무' },
  { code: 'view_sales', name: '매출 조회', description: '매장 매출 내역 및 통계 조회', category: '운영 및 업무' },
  { code: 'manage_inventory', name: '재고/발주 관리', description: '재고 현황 조회 및 발주 처리', category: '운영 및 업무' },
  { code: 'manage_menu', name: '메뉴 관리', description: '판매 상품 및 메뉴 설정 관리', category: '운영 및 업무' }
];

export async function getStorePermissions() {
  return STATIC_PERMISSIONS;
}

export async function getRolePermissions(roleId: string) {
  noStore()
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('store_roles')
    .select('permissions')
    .eq('id', roleId)
    .single()

  if (error) throw error
  return (data?.permissions || []) as string[]
}

export async function createRole(storeId: string, name: string, color: string, parentId?: string | null) {
  const supabase = await createClient()
  
  // Get max hierarchy_level to add to the bottom (but above staff)
  // Or just add with 0 hierarchy_level? Let's add with 10 (above staff 0, below manager 50)
  
  const { data, error } = await supabase
    .from('store_roles')
    .insert({
      store_id: storeId,
      name,
      color,
      is_system: false,
      hierarchy_level: 10,
      parent_id: parentId || null
    })
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath(`/dashboard/settings`)
  revalidatePath(`/dashboard/roles`)
  return { data }
}

export async function updateRole(storeId: string, roleId: string, data: { name?: string, color?: string, parent_id?: string | null }) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('store_roles')
    .update(data)
    .eq('id', roleId)
    .eq('store_id', storeId) // Security check

  if (error) return { error: error.message }
  
  revalidatePath(`/dashboard/settings`)
  revalidatePath(`/dashboard/roles`)
  return { success: true }
}

// 역할 삭제 전, 해당 역할을 사용 중인 직원 목록을 확인하는 함수
export async function checkRoleUsage(storeId: string, roleId: string) {
  const supabase = await createClient()
  
  const { data: usingMembers, error } = await supabase
    .from('store_members')
    .select('id, status, profile:profiles(full_name)')
    .eq('role_id', roleId)
    .eq('store_id', storeId)

  if (error) {
    return { error: error.message }
  }

  const affectedMembers = (usingMembers || []).map(m => {
    const profileInfo = Array.isArray(m.profile) ? m.profile[0] : m.profile
    const prof = profileInfo as any
    return {
      id: m.id,
      name: prof?.full_name || '이름 없음',
      status: m.status
    }
  })
  
  return { affectedMembers }
}

export async function deleteRole(storeId: string, roleId: string) {
  const supabase = await createClient()
  
  // Check if it's the owner role (hierarchy_level >= 100)
  const { data: role } = await supabase.from('store_roles').select('hierarchy_level').eq('id', roleId).single()
  if (role && role.hierarchy_level >= 100) {
    return { error: '최고 관리자(점주) 역할은 삭제할 수 없습니다.' }
  }

  // ON DELETE SET NULL 제약조건이 있으므로 store_roles 에서 삭제하면
  // 해당 역할을 가지고 있던 store_members 의 role_id 는 자동으로 null(역할 미설정)이 됩니다.
  
  const { error } = await supabase
    .from('store_roles')
    .delete()
    .eq('id', roleId)
    .eq('store_id', storeId)

  if (error) return { error: error.message }
  
  revalidatePath(`/dashboard/settings`)
  revalidatePath(`/dashboard/roles`)
  return { success: true }
}

export async function updateRolePermissions(storeId: string, roleId: string, permissionCodes: string[]) {
  const supabase = await createClient()
  
  // Security check: ensure role belongs to store
  const { data: role } = await supabase
    .from('store_roles')
    .select('id')
    .eq('id', roleId)
    .eq('store_id', storeId)
    .single()
    
  if (!role) return { error: 'Role not found' }

  const { error: updateError } = await supabase
    .from('store_roles')
    .update({ permissions: permissionCodes })
    .eq('id', roleId)
    .eq('store_id', storeId)
  
  if (updateError) return { error: updateError.message }
  
  revalidatePath(`/dashboard/settings`)
  revalidatePath(`/dashboard/roles`)
  return { success: true }
}

export async function ensureDefaultRoles(storeId: string) {
  const supabase = await createClient()

  // 1. Check if roles exist
  const { data: existingRoles } = await supabase
    .from('store_roles')
    .select('id, name')
    .eq('store_id', storeId)
  
  if (existingRoles && existingRoles.length > 0) {
    return { 
      ownerRoleId: existingRoles.find(r => r.name === '점주')?.id 
    }
  }

  // 2. Create default roles
  const defaultRoles = [
    {
      store_id: storeId,
      name: '점주',
      color: '#7c3aed', // Violet
      is_system: true,
      hierarchy_level: 100,
      permissions: DEFAULT_ROLE_PERMISSIONS['점주']
    },
    {
      store_id: storeId,
      name: '매니저',
      color: '#4f46e5', // Indigo
      is_system: false,
      hierarchy_level: 50,
      permissions: DEFAULT_ROLE_PERMISSIONS['매니저']
    },
    {
      store_id: storeId,
      name: '직원',
      color: '#808080', // Gray
      is_system: false,
      hierarchy_level: 0,
      permissions: DEFAULT_ROLE_PERMISSIONS['직원']
    }
  ]
  
  const { data: createdRoles, error } = await supabase
    .from('store_roles')
    .insert(defaultRoles)
    .select()

  if (error) {
    console.error('Failed to create default roles:', error)
    return {}
  }
  
  return {
    ownerRoleId: createdRoles?.find(r => r.name === '점주')?.id
  }
}
