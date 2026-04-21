'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getStoreAnnouncements(storeId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('store_announcements')
    .select(`
      *,
      author:store_members!author_id (
        id,
        profile:profiles(full_name)
      )
    `)
    .eq('store_id', storeId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching announcements:', JSON.stringify(error, null, 2))
    return []
  }

  if (!data || data.length === 0) return []

  // Map the announcements to include the correct author name
  return data.map((item: any) => {
    const profile = Array.isArray(item.author?.profile) ? item.author.profile[0] : item.author?.profile
    const displayName = profile?.full_name || '이름 없음'

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

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const isPinned = formData.get('is_pinned') === 'true'

  if (!title) {
    return { error: 'Title is required' }
  }

  const { error } = await supabase
    .from('store_announcements')
    .insert({
      store_id: storeId,
      title,
      content,
      is_pinned: isPinned,
      author_id: user.id
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

  const title = formData.get('title') as string
  const content = formData.get('content') as string
  const isPinned = formData.get('is_pinned') === 'true'

  if (!title) {
    return { error: 'Title is required' }
  }

  const { error } = await supabase
    .from('store_announcements')
    .update({
      title,
      content,
      is_pinned: isPinned,
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