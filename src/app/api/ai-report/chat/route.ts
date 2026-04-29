import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/features/auth/permissions'
import OpenAI from 'openai'
import { getMemberDisplayName } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY || 'dummy-key',
  baseURL: process.env.LITELLM_BASE_URL,
})

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storeId, messages } = await req.json()

    if (!storeId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const canViewAiReports = await hasPermission(user.id, storeId, 'view_ai_reports')
    if (!canViewAiReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // 이번 달 기준 데이터 집계 (재쿼리 비용 최소화 위해 고정 기준 사용)
    const today = new Date()
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

    const startDateStr = monthStart.toISOString().split('T')[0]
    const endDateStr = monthEnd.toISOString().split('T')[0]

    // 1. 이번 달 출퇴근 요약 (+ 스케줄 비교 지각 확인)
    const { data: rawAttendance } = await supabase
      .from('store_attendance')
      .select('target_date, status, clock_in_time, clock_out_time, is_late, schedule:schedules(start_time), member:store_members!inner(name, profile:profiles(full_name))')
      .eq('store_id', storeId)
      .gte('target_date', startDateStr)
      .lte('target_date', endDateStr)

    const formatToKSTFull = (utcString: string | null) => {
      if (!utcString) return null;
      const date = new Date(utcString);
      date.setHours(date.getHours() + 9);
      return date.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)';
    }

    const attendance = rawAttendance?.map(a => {
      const memberData = Array.isArray(a.member) ? a.member[0] : a.member;
      
      return { 
        status: a.status, 
        is_late: a.is_late || false,
        staff_name: memberData ? (memberData as any).name || (memberData as any).profile?.full_name || '성명 미상' : '성명 미상',
        clock_in_time_kst: formatToKSTFull(a.clock_in_time)
      }
    }) || [];

    // 2. 전체 자산 상태 요약
    const { data: assets } = await supabase
      .from('store_assets')
      .select('status')
      .eq('store_id', storeId)
      .is('deleted_at', null)

    // 3. 미결제 거래처 전체
    const { data: vendors } = await supabase
      .from('vendor_transactions')
      .select('payment_status')
      .eq('store_id', storeId)
      .in('payment_status', ['unpaid', 'partial'])
      .is('deleted_at', null)

    // 4. 이번 달 업무 완료율
    const { data: tasks } = await supabase
      .from('tasks')
      .select('status')
      .eq('store_id', storeId)
      .gte('due_date', startDateStr)
      .lte('due_date', endDateStr)
      .is('deleted_at', null)

    const contextPackage = {
      period: '이번 달',
      attendance: {
        total: attendance?.length || 0,
        late: attendance?.filter(a => a.is_late).length || 0,
        absent: attendance?.filter(a => a.status === 'absent').length || 0,
      },
      assets: {
        total: assets?.length || 0,
        needsRepair: assets?.filter(a => a.status === 'repair').length || 0,
      },
      vendors: {
        unpaidTransactions: vendors?.length || 0,
      },
      tasks: {
        total: tasks?.length || 0,
        done: tasks?.filter(t => t.status === 'done').length || 0,
      }
    }

    const systemPrompt = `
당신은 소상공인 매장의 운영 데이터를 분석하는 AI 어시스턴트입니다.
점주의 질문에 데이터를 근거로 간결하게 답변하세요.
추측이 필요한 경우 "데이터 기준으로는" 또는 "가능성이 있어요" 표현을 사용하세요.
답변은 3-5문장 이내로 간결하게, 구체적인 수치를 포함하세요.

현재 매장 운영 데이터 (이번 달 기준):
${JSON.stringify(contextPackage, null, 2)}
`

    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash-preview',
      max_tokens: 3000,
      stream: true,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
    })

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of response) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              controller.enqueue(new TextEncoder().encode(content))
            }
          }
        } catch (e) {
          console.error('Stream reading error:', e)
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream)

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}