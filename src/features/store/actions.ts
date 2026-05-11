'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { hasPermission } from '@/features/auth/permissions'

export async function setCurrentStore(storeId: string) {
  const cookieStore = await cookies()
  cookieStore.set('leaven_current_store_id', storeId)
  revalidatePath('/dashboard')
}

export async function updateStore(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  const cookieStore = await cookies()
  const storeId = cookieStore.get('leaven_current_store_id')?.value

  if (!storeId) {
    return { error: 'No store selected' }
  }

  // 사용자의 매장 권한 검사 (manage_store)
  const hasManagePermission = await hasPermission(user.id, storeId, 'manage_store')

  if (!hasManagePermission) {
    return { error: 'Permission denied' }
  }

  const updateData: any = {
    updated_at: new Date().toISOString(),
  }

  // String fields
  if (formData.has('name')) updateData.name = formData.get('name') as string
  if (formData.has('address')) updateData.address = formData.get('address') as string
  if (formData.has('business_number')) updateData.business_number = formData.get('business_number') as string
  if (formData.has('description')) updateData.description = formData.get('description') as string
  if (formData.has('owner_name')) updateData.owner_name = formData.get('owner_name') as string
  if (formData.has('store_phone')) updateData.store_phone = formData.get('store_phone') as string
  if (formData.has('zip_code')) updateData.zip_code = formData.get('zip_code') as string
  if (formData.has('address_detail')) updateData.address_detail = formData.get('address_detail') as string
  if (formData.has('image_url')) updateData.image_url = formData.get('image_url') as string
  if (formData.has('stamp_image_url')) updateData.stamp_image_url = formData.get('stamp_image_url') as string
  if (formData.has('leave_calc_type')) updateData.leave_calc_type = formData.get('leave_calc_type') as string

  // Number fields
  if (formData.has('latitude')) updateData.latitude = parseFloat(formData.get('latitude') as string)
  if (formData.has('longitude')) updateData.longitude = parseFloat(formData.get('longitude') as string)
  if (formData.has('auth_radius')) updateData.attendance_radius = parseInt(formData.get('auth_radius') as string, 10)
  if (formData.has('wage_start_day')) updateData.wage_start_day = parseInt(formData.get('wage_start_day') as string, 10)
  if (formData.has('wage_end_day')) updateData.wage_end_day = parseInt(formData.get('wage_end_day') as string, 10)
  if (formData.has('pay_day')) updateData.pay_day = parseInt(formData.get('pay_day') as string, 10)

  // JSON fields
  if (formData.has('wage_exceptions')) {
    try {
      updateData.wage_exceptions = JSON.parse(formData.get('wage_exceptions') as string)
    } catch (e) {
      console.error('Error parsing wage exceptions:', e)
    }
  }

  if (formData.has('opening_hours')) {
    try {
      updateData.operating_hours = JSON.parse(formData.get('opening_hours') as string)
    } catch (e) {
      console.error('Error parsing opening hours:', e)
    }
  }

  const { error } = await supabase
    .from('stores')
    .update(updateData)
    .eq('id', storeId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard', 'layout')
  return { success: true }
}

export async function getUserStores() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const { data: stores, error } = await supabase
    .from('store_members')
    .select(`
      role_info:store_roles(name),
      role_id,
      status,
      store:stores (
        id,
        name,
        address
      )
    `)
    .eq('user_id', user.id)
    // 초대를 제외한 내역 (가입 대기, 활성, 비활성) 모두 조회
    .neq('status', 'invited')
    .order('joined_at', { ascending: false })

  if (error) {
    console.error('Error fetching stores:', error)
    return []
  }

  if (!stores) return []

  return stores.map((member: any) => ({
    ...member,
    role: Array.isArray(member.role_info) ? member.role_info[0] : member.role_info,
    store: Array.isArray(member.store) ? member.store[0] : member.store
  }))
}

export async function deleteStore(storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  // RPC 호출하여 매장 삭제 (권한 체크는 RPC 내부에서 수행)
  const { error } = await supabase.rpc('delete_store', {
    store_id_param: storeId
  })

  if (error) {
    console.error('Error deleting store:', error)
    return { error: error.message }
  }

  // 현재 선택된 매장 쿠키 삭제
  const cookieStore = await cookies()
  cookieStore.delete('leaven_current_store_id')

  revalidatePath('/dashboard')
  return { success: true }
}

export async function getStoreRoles(storeId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('store_roles')
    .select('*')
    .eq('store_id', storeId)
    .order('hierarchy_level', { ascending: true })

  if (error) {
    console.error('Error fetching store roles:', error)
    return []
  }

  return data
}

export async function getStoreSettings(storeId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('stores')
    .select('invite_code, wage_start_day, wage_end_day, pay_day, wage_exceptions, leave_calc_type')
    .eq('id', storeId)
    .single()
    
  if (error) {
    console.error('Error fetching store settings:', error)
    return null
  }
  
  return data
}
