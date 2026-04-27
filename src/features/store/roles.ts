'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath, unstable_noStore as noStore } from 'next/cache'
import { DEFAULT_ROLE_PERMISSIONS, STATIC_PERMISSIONS, Permission } from '@/features/auth/permissions'

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

export async function getStoreRoles(storeId: string) {
  noStore()
  const supabase = await createClient()
  
  try {
    const { data: roles, error } = await supabase
      .from('store_roles')
      .select('*')
      .eq('store_id', storeId)
      .neq('hierarchy_level', -1) // 미지정(-1) 직급은 제외
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

export async function getStorePermissions() {
  return STATIC_PERMISSIONS as unknown as Permission[];
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
  
  // 기존 역할이 있는 경우 '미지정' 역할이 있는지 확인
  let unassignedRoleId: string | undefined;
  let ownerRoleId: string | undefined;
  let staffRoleId: string | undefined;

  if (existingRoles && existingRoles.length > 0) {
    ownerRoleId = existingRoles.find(r => r.name === '점주')?.id;
    staffRoleId = existingRoles.find(r => r.name === '직원')?.id;
    unassignedRoleId = existingRoles.find(r => r.name === '미지정')?.id;

    // 점주나 직원은 있는데 미지정이 없다면 미지정만 생성
    if (!unassignedRoleId) {
      const { data: newUnassignedRole, error: insertError } = await supabase
        .from('store_roles')
        .insert({
          store_id: storeId,
          name: '미지정',
          color: '#cbd5e1', // Slate 300
          is_system: true,
          hierarchy_level: -1, // 직급 체계 최하단
          permissions: [] // 권한 없음
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Failed to create unassigned role:', insertError);
      }
      
      if (newUnassignedRole) {
        unassignedRoleId = newUnassignedRole.id;
      }
    }

    // 만약 점주, 직원이 모두 있었다면 여기서 리턴
    // (완전 빈 상태가 아니라면 기존 세팅 유지)
    if (ownerRoleId && staffRoleId && unassignedRoleId) {
      return { ownerRoleId, staffRoleId, unassignedRoleId };
    }
  }

  // 2. Create default roles (빈 매장일 경우 전체 생성)
  // 위에서 부분적으로 있었던 건 무시하고(주로 빈 껍데기일 때) 전체 생성을 시도하거나, 
  // 없는 것들만 채워넣는 방식이지만, 보통 매장 생성 시 일괄 생성되므로 배열 전체 삽입 시도.
  if (!existingRoles || existingRoles.length === 0) {
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
      },
      {
        store_id: storeId,
        name: '미지정',
        color: '#cbd5e1', // Slate 300
        is_system: true,
        hierarchy_level: -1,
        permissions: []
      }
    ]
    
    const { data: createdRoles, error } = await supabase
      .from('store_roles')
      .insert(defaultRoles)
      .select()

    if (error) {
      console.error('Failed to create default roles:', error)
      return { ownerRoleId, staffRoleId, unassignedRoleId } // 위에서 찾은게 있으면 반환
    }
    
    return {
      ownerRoleId: createdRoles?.find(r => r.name === '점주')?.id,
      staffRoleId: createdRoles?.find(r => r.name === '직원')?.id,
      unassignedRoleId: createdRoles?.find(r => r.name === '미지정')?.id
    }
  }

  return { ownerRoleId, staffRoleId, unassignedRoleId }
}
