import { createClient } from '@supabase/supabase-js'
import { unstable_cache } from 'next/cache'

// supabase-js 순수 클라이언트를 생성하는 헬퍼 함수
const createStaticClient = (accessToken: string) => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      },
      auth: {
        persistSession: false
      }
    }
  )
}

// 1. 프로필 조회 캐싱
export const getCachedProfile = (userId: string, accessToken: string) => 
  unstable_cache(
    async () => {
      const supabase = createStaticClient(accessToken)
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('id', userId)
        .single()
      return data
    },
    ['dashboard-profile', userId],
    { tags: ['profile'], revalidate: 300 }
  )()

// 2. 내 멤버 정보 상세 조회 캐싱
export const getCachedMyMember = (userId: string, storeId: string, accessToken: string) => 
  unstable_cache(
    async () => {
      const supabase = createStaticClient(accessToken)
      const { data } = await supabase
        .from('store_members')
        .select(`
          id,
          user_id,
          store_id,
          status,
          name,
          profile:profiles(full_name),
          role_info:store_roles(id, name, color, hierarchy_level, is_system)
        `)
        .eq('user_id', userId)
        .eq('store_id', storeId)
        .single()
      return data
    },
    ['dashboard-my-member', userId, storeId],
    { tags: ['store-members'], revalidate: 300 }
  )()

// 3. 직원 목록 조회 캐싱
export const getCachedStaffList = (storeId: string, accessToken: string) => 
  unstable_cache(
    async () => {
      const supabase = createStaticClient(accessToken)
      const { data } = await supabase
        .from('store_members')
        .select(`
          id,
          status,
          name,
          profile:profiles(full_name, email, avatar_url),
          role_info:store_roles(id, name, color, hierarchy_level, is_system)
        `)
        .eq('store_id', storeId)
      return data
    },
    ['dashboard-staff-list', storeId],
    { tags: ['store-members'], revalidate: 300 }
  )()