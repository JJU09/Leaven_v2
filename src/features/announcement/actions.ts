'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { hasPermission } from '@/features/auth/permissions'
import { summarizeHandover } from '@/lib/openai'

export async function getStoreAnnouncements(storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  const canManage = await hasPermission(user.id, storeId, 'manage_announcements')

  const { data: memberData } = await supabase
    .from('store_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('store_id', storeId)
    .single()

  const memberId = memberData?.id

  const { data, error } = await supabase
    .from('store_announcements')
    .select(`
      id,
      title,
      content,
      created_at,
      announcement_type,
      target_member_ids,
      author:store_members!store_announcements_author_id_fkey (
        id,
        user:profiles!store_members_user_id_fkey(full_name)
      )
    `)
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching announcements:', JSON.stringify(error, null, 2))
    return []
  }

  if (!data || data.length === 0) return []

  let filteredData = data
  if (!canManage && memberId) {
    filteredData = data.filter(item => {
      if (!item.announcement_type || item.announcement_type === 'notice') return true
      if (item.announcement_type === 'handover') {
        const authorId = Array.isArray(item.author) ? item.author[0]?.id : (item.author as any)?.id;
        if (authorId === memberId) return true
        if (item.target_member_ids && Array.isArray(item.target_member_ids) && item.target_member_ids.includes(memberId)) return true
        return false
      }
      return true
    })
  }

  // Map the announcements to include the correct author name
  return filteredData.map((item: any) => {
    const userProfile = Array.isArray(item.author?.user) ? item.author.user[0] : item.author?.user
    const displayName = userProfile?.full_name || '이름 없음'

    return {
      ...item,
      author: {
        id: item.author?.id,
        full_name: displayName
      }
    }
  })
}

export async function createAnnouncement(storeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const canManage = await hasPermission(user.id, storeId, 'manage_announcements')
  if (!canManage) {
    return { error: '권한이 없습니다.' }
  }

  // 사용자의 해당 매장 멤버 ID 조회
  const { data: memberData } = await supabase
    .from('store_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('store_id', storeId)
    .single()

  if (!memberData) {
    return { error: '매장 멤버 정보를 찾을 수 없습니다.' }
  }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const announcement_type = (formData.get('announcement_type') as string) || 'notice'
  const target_member_ids_str = formData.get('target_member_ids') as string

  let target_member_ids = null
  if (announcement_type === 'handover' && target_member_ids_str) {
    try {
      target_member_ids = JSON.parse(target_member_ids_str)
    } catch(e) {
      target_member_ids = null
    }
  }

  if (!title) {
    return { error: 'Title is required' }
  }

  let ai_summary = null
  if (announcement_type === 'handover' && content) {
    ai_summary = await summarizeHandover(content)
  }

  const { error } = await supabase
    .from('store_announcements')
    .insert({
      store_id: storeId,
      title,
      content,
      author_id: memberData.id,
      announcement_type,
      target_member_ids,
      ai_summary
    })

  if (error) {
    console.error('Error creating announcement:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/my-tasks')
  return { success: true }
}

export async function updateAnnouncement(id: string, storeId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const canManage = await hasPermission(user.id, storeId, 'manage_announcements')
  if (!canManage) {
    return { error: '권한이 없습니다.' }
  }

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const announcement_type = (formData.get('announcement_type') as string) || 'notice'
  const target_member_ids_str = formData.get('target_member_ids') as string

  let target_member_ids = null
  if (announcement_type === 'handover' && target_member_ids_str) {
    try {
      target_member_ids = JSON.parse(target_member_ids_str)
    } catch(e) {
      target_member_ids = null
    }
  }

  if (!title) {
    return { error: 'Title is required' }
  }

  let ai_summary = null
  if (announcement_type === 'handover' && content) {
    ai_summary = await summarizeHandover(content)
  }

  const { error } = await supabase
    .from('store_announcements')
    .update({
      title,
      content,
      announcement_type,
      target_member_ids,
      ai_summary
    })
    .eq('id', id)
    .eq('store_id', storeId) // Security check

  if (error) {
    console.error('Error updating announcement:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/my-tasks')
  return { success: true }
}

export async function deleteAnnouncement(id: string, storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const canManage = await hasPermission(user.id, storeId, 'manage_announcements')
  if (!canManage) {
    return { error: '권한이 없습니다.' }
  }

  const { error } = await supabase
    .from('store_announcements')
    .delete()
    .eq('id', id)
    .eq('store_id', storeId) // Security check

  if (error) {
    console.error('Error deleting announcement:', error)
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  revalidatePath('/dashboard/my-tasks')
  return { success: true }
}

export async function markAnnouncementAsRead(announcementId: string, storeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Unauthorized' }

  // Get user's member ID for this store
  const { data: memberData } = await supabase
    .from('store_members')
    .select('id')
    .eq('user_id', user.id)
    .eq('store_id', storeId)
    .single()

  if (!memberData) return { error: 'Member not found' }

  // Check if already read
  const { data: existing } = await supabase
    .from('announcement_reads')
    .select('id')
    .eq('announcement_id', announcementId)
    .eq('member_id', memberData.id)
    .single()

  if (existing) return { success: true } // Already read

  // Insert read record
  const { error } = await supabase
    .from('announcement_reads')
    .insert({
      announcement_id: announcementId,
      member_id: memberData.id
    })

  if (error) {
    console.error('Error marking as read:', error)
    return { error: error.message }
  }

  // Revalidate dashboard to update alerts
  revalidatePath('/dashboard')
  return { success: true }
}
