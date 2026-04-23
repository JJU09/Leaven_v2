import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'

export type PermissionCode =
  // 📦 매장 및 시스템
  | 'manage_store'
  | 'manage_roles'
  | 'view_dashboard'
  // 👥 인사 및 근로
  | 'view_staff'
  | 'manage_staff'
  | 'view_salary'
  | 'manage_payroll'
  // ⏰ 일정 및 근태
  | 'view_schedule'
  | 'manage_schedule'
  | 'view_attendance'
  | 'manage_attendance'
  | 'view_leave'
  | 'manage_leave'
  // 📊 운영 및 업무
  | 'view_tasks'
  | 'manage_tasks'
  | 'view_sales'
  | 'manage_inventory'
  | 'manage_menu'
  // 📢 공지사항
  | 'view_announcements'
  | 'manage_announcements'

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  점주: [
    'manage_store', 'manage_roles', 'view_dashboard', 
    'view_staff', 'manage_staff', 'view_salary', 'manage_payroll',
    'view_schedule', 'manage_schedule', 'view_attendance', 'manage_attendance',
    'view_leave', 'manage_leave', 'view_tasks', 'manage_tasks',
    'view_sales', 'manage_inventory', 'manage_menu',
    'view_announcements', 'manage_announcements'
  ],
  매니저: [
    'view_dashboard', 'view_staff', 'view_schedule', 'manage_schedule',
    'view_attendance', 'manage_attendance', 'view_leave', 'manage_leave', 'view_tasks', 'manage_tasks',
    'view_announcements', 'manage_announcements'
  ],
  직원: [
    'view_staff', 'view_schedule', 'view_attendance', 'view_leave', 'view_tasks', 'view_announcements'
  ]
}

// 캐싱을 통해 동일한 요청 내에서 중복 DB 조회를 방지
export const getStoreMemberRole = cache(async (userId: string, storeId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('store_members')
    .select('role_id, status, role_info:store_roles(name, permissions)')
    .eq('user_id', userId)
    .eq('store_id', storeId)
    .single()
  
  if (error || !data) return null
  return data // Returns { role_id: string | null, status: string, role_info: any }
})

export async function hasPermission(
  userId: string,
  storeId: string,
  permission: PermissionCode
): Promise<boolean> {
  const member = await getStoreMemberRole(userId, storeId)
  
  if (!member) return false

  // 비활성(inactive)이거나 승인 대기(pending_approval) 상태인 경우 권한 제한
  if (member.status !== 'active') {
    // 관리 권한(manage_*)이나 민감한 조회 권한(view_salary 등)은 모두 차단
    if (permission.startsWith('manage_') || permission === 'view_salary') {
      return false
    }
  }
  
  // role 값을 안전하게 추출 (role_info 기반)
  const roleInfo = Array.isArray(member.role_info) ? member.role_info[0] : member.role_info
  const roleName = roleInfo?.name || 'staff'

  // 1. Owner always has full permissions (활성 상태일 때만 위에서 통과됨. owner가 active가 아닌 경우는 드물지만 방어적 프로그래밍)
  if (roleName === '점주' || roleName === 'owner') return true 

  // 2. Check JSONB permissions from store_roles
  if (roleInfo && roleInfo.permissions) {
    const perms = roleInfo.permissions;
    if (Array.isArray(perms) && perms.includes(permission)) {
      return true;
    }
  }

  return false
}

export async function requirePermission(
  userId: string,
  storeId: string,
  permission: PermissionCode
) {
  const allowed = await hasPermission(userId, storeId, permission)
  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`)
  }
}