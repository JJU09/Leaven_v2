import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requirePermission } from '@/features/auth/permissions'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { schedules } = body

    if (!schedules || !Array.isArray(schedules) || schedules.length === 0) {
      return NextResponse.json({ error: 'No schedules provided' }, { status: 400 })
    }

    const storeId = schedules[0].store_id

    try {
      await requirePermission(user.id, storeId, 'manage_schedule')
    } catch (error) {
      return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('schedules')
      .insert(schedules)
      .select('id')

    if (error) {
      console.error('Bulk insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, count: data.length })

  } catch (error: any) {
    console.error('Schedule bulk create error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}