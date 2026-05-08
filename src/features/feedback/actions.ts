'use client'

import { createClient } from '@/lib/supabase/client'

export interface FeedbackData {
  type: 'bug' | 'feature' | 'etc'
  content: string
  imageFile?: File | null
  storeId?: string
  metadata?: Record<string, any>
}

export async function submitFeedback(data: FeedbackData) {
  const supabase = createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('인증되지 않은 사용자입니다.')

  let imageUrl = null

  // 1. 이미지가 있다면 스토리지에 업로드
  if (data.imageFile) {
    const fileExt = data.imageFile.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}.${fileExt}`
    
    const { error: uploadError } = await supabase.storage
      .from('feedbacks')
      .upload(fileName, data.imageFile)

    if (uploadError) {
      console.error('Image upload error:', uploadError)
      throw new Error('이미지 업로드 중 오류가 발생했습니다.')
    }

    const { data: { publicUrl } } = supabase.storage
      .from('feedbacks')
      .getPublicUrl(fileName)
      
    imageUrl = publicUrl
  }

  // 2. DB에 피드백 저장
  const { error: insertError } = await supabase
    .from('feedbacks')
    .insert({
      user_id: user.id,
      store_id: data.storeId || null,
      type: data.type,
      content: data.content,
      image_url: imageUrl,
      metadata: data.metadata || {},
    })

  if (insertError) {
    console.error('Feedback insert error:', insertError)
    throw new Error('피드백 저장 중 오류가 발생했습니다.')
  }

  return { success: true }
}