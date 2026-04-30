import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/features/auth/permissions'
import OpenAI from 'openai'
import { getMemberDisplayName } from '@/lib/utils'
import { SupabaseClient } from '@supabase/supabase-js'

const openai = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY || 'dummy-key',
  baseURL: process.env.LITELLM_BASE_URL,
})

// ----------------------------------------------------------------------------
// A. 유틸 함수
// ----------------------------------------------------------------------------
function getKSTToday() {
  const d = new Date()
  d.setHours(d.getHours() + 9)
  return d.toISOString().split('T')[0]
}

function toKSTFull(utcString: string | null) {
  if (!utcString) return null
  const date = new Date(utcString)
  date.setHours(date.getHours() + 9)
  return date.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)'
}

// ----------------------------------------------------------------------------
// B. Tool 정의
// ----------------------------------------------------------------------------
const tools = [
  {
    type: 'function' as const,
    function: {
      name: 'fetchStoreData',
      description: '매장 운영 데이터를 지정 날짜 범위로 조회합니다. 특정 기간을 언급하거나 요약 데이터만으로 답변이 불충분할 때 호출하세요. 필요한 dataTypes만 선택하여 요청하세요.',
      parameters: {
        type: 'object',
        properties: {
          startDate: {
            type: 'string',
            description: '조회 시작일 (YYYY-MM-DD, KST 기준)'
          },
          endDate: {
            type: 'string',
            description: '조회 종료일 (YYYY-MM-DD, KST 기준)'
          },
          dataTypes: {
            type: 'array',
            items: {
              type: 'string',
              enum: ['attendance', 'leaves', 'tasks', 'assets', 'vendors', 'staffs']
            },
            description: '조회할 데이터 종류 목록'
          }
        },
        required: ['startDate', 'endDate', 'dataTypes']
      }
    }
  }
]

// ----------------------------------------------------------------------------
// C. executeFetchStoreData 함수
// ----------------------------------------------------------------------------
async function executeFetchStoreData(
  supabase: SupabaseClient<any, "public", any>,
  storeId: string,
  startDate: string,
  endDate: string,
  dataTypes: string[]
) {
  const result: Record<string, any> = {}

  if (dataTypes.includes('attendance')) {
    const { data } = await supabase
      .from('store_attendance')
      .select('target_date, status, clock_in_time, clock_out_time, is_late, member:store_members!store_attendance_member_id_fkey!inner(id, user_id, name, profile:profiles(full_name))')
      .eq('store_id', storeId)
      .gte('target_date', startDate)
      .lte('target_date', endDate)

    result.attendance = {
      total: data?.length || 0,
      late: data?.filter(a => a.is_late).length || 0,
      absent: data?.filter(a => a.status === 'absent').length || 0,
      records: data?.map(a => {
        const m = Array.isArray(a.member) ? a.member[0] : a.member
        const member = m ? { ...m, profile: Array.isArray(m.profile) ? m.profile[0] : m.profile } : null
        return {
          target_date: a.target_date,
          status: a.status,
          is_late: a.is_late,
          staff_name: member ? getMemberDisplayName(member) : '성명 미상',
          clock_in_time_kst: toKSTFull(a.clock_in_time)
        }
      }) || []
    }
  }

  if (dataTypes.includes('leaves')) {
    const { data } = await supabase
      .from('leave_requests')
      .select('start_date, end_date, requested_days, status, member:store_members!leave_requests_member_id_fkey!inner(id, user_id, name, profile:profiles(full_name))')
      .eq('store_id', storeId)
      .gte('start_date', startDate)
      .lte('start_date', endDate)

    result.leaves = {
      total: data?.length || 0,
      approved: data?.filter(l => l.status === 'approved').length || 0,
      records: data?.map(l => {
        const m = Array.isArray(l.member) ? l.member[0] : l.member
        const member = m ? { ...m, profile: Array.isArray(m.profile) ? m.profile[0] : m.profile } : null
        return {
          start_date: l.start_date,
          end_date: l.end_date,
          requested_days: l.requested_days,
          status: l.status,
          staff_name: member ? getMemberDisplayName(member) : '성명 미상'
        }
      }) || []
    }
  }

  if (dataTypes.includes('tasks')) {
    const { data } = await supabase
      .from('tasks')
      .select('title, status, is_done, due_date, assignee_ids')
      .eq('store_id', storeId)
      .gte('due_date', startDate)
      .lte('due_date', endDate)
      .is('deleted_at', null)

    const { data: storeMembers } = await supabase
      .from('store_members')
      .select('id, user_id, name, profile:profiles(full_name)')
      .eq('store_id', storeId)

    const memberMap = new Map(
      storeMembers?.map(m => {
        const profileData = Array.isArray(m.profile) ? m.profile[0] : m.profile
        return [m.id, getMemberDisplayName({ ...m, profile: profileData })]
      }) || []
    )

    const kstDateStr = getKSTToday()

    const tasksData = data?.map(t => {
      const assignees = (t.assignee_ids as string[]) || []
      const staffNames = assignees.map(id => memberMap.get(id) || '성명 미상')
      const isCompleted = t.status === 'completed' || t.status === 'verified' || t.is_done

      let isOverdue = false
      if (!isCompleted && t.due_date) {
        if (t.due_date < kstDateStr) {
          isOverdue = true
        }
      }

      return {
        title: t.title,
        status: t.status,
        is_completed: isCompleted,
        is_overdue: isOverdue,
        due_date: t.due_date,
        assignees: staffNames,
      }
    }) || []

    result.tasks = {
      total: tasksData.length,
      completed: tasksData.filter(t => t.is_completed).length,
      overdue: tasksData.filter(t => t.is_overdue).length,
      records: tasksData
    }
  }

  if (dataTypes.includes('assets')) {
    const { data } = await supabase
      .from('store_assets')
      .select('name, status')
      .eq('store_id', storeId)
      .is('deleted_at', null)

    result.assets = {
      total: data?.length || 0,
      needsRepair: data?.filter(a => a.status === 'repair').length || 0,
      records: data || []
    }
  }

  if (dataTypes.includes('vendors')) {
    const { data } = await supabase
      .from('vendor_transactions')
      .select('amount, payment_status, vendors(name)')
      .eq('store_id', storeId)
      .in('payment_status', ['unpaid', 'partial'])
      .is('deleted_at', null)

    result.vendors = {
      unpaidTransactions: data?.length || 0,
      records: data || []
    }
  }

  if (dataTypes.includes('staffs')) {
    const { data } = await supabase
      .from('store_members')
      .select('status, contract_status, name, user_id, profile:profiles(full_name)')
      .eq('store_id', storeId)
      .is('deleted_at', null)
      .is('resigned_at', null)

    result.staffs = {
      totalActive: data?.filter(s => s.status === 'active').length || 0,
      missingContracts: data?.filter(s => !['signed', 'none'].includes(s.contract_status || 'none') || s.contract_status === null).length || 0,
      records: data?.map(s => {
        const formattedMemberData = {
          ...s,
          profile: Array.isArray(s.profile) ? s.profile[0] : s.profile
        }
        return {
          staff_name: getMemberDisplayName(formattedMemberData),
          status: s.status,
          contract_status: s.contract_status
        }
      }) || []
    }
  }

  return result
}

// ----------------------------------------------------------------------------
// D. SSE 헬퍼
// ----------------------------------------------------------------------------
function sseChunk(text: string): Uint8Array {
  return new TextEncoder().encode(`data: ${text}\n\n`)
}

// ----------------------------------------------------------------------------
// E. POST 핸들러 로직
// ----------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storeId, messages, clientDate } = await req.json()

    if (!storeId || !messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const canViewAiReports = await hasPermission(user.id, storeId, 'view_ai_reports')
    if (!canViewAiReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    const todayKST = clientDate ?? getKSTToday()
    
    // 이번 달 계산 (todayKST 기준)
    const [y, m] = todayKST.split('-').map(Number)
    const monthStartStr = `${y}-${String(m).padStart(2, '0')}-01`
    const nextMonth = new Date(y, m, 1)
    nextMonth.setDate(nextMonth.getDate() - 1)
    const monthEndStr = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-${String(nextMonth.getDate()).padStart(2, '0')}`

    // 3. 경량 요약 컨텍스트 구성
    const [attRes, tasksRes, assetsRes, vendorsRes] = await Promise.all([
      supabase.from('store_attendance').select('status, is_late').eq('store_id', storeId).gte('target_date', monthStartStr).lte('target_date', monthEndStr),
      supabase.from('tasks').select('status, is_done').eq('store_id', storeId).gte('due_date', monthStartStr).lte('due_date', monthEndStr).is('deleted_at', null),
      supabase.from('store_assets').select('status').eq('store_id', storeId).is('deleted_at', null),
      supabase.from('vendor_transactions').select('payment_status').eq('store_id', storeId).in('payment_status', ['unpaid', 'partial']).is('deleted_at', null)
    ])

    const summaryContext = {
      thisMonth: {
        attendance: {
          total: attRes.data?.length || 0,
          late: attRes.data?.filter(a => a.is_late).length || 0,
          absent: attRes.data?.filter(a => a.status === 'absent').length || 0
        },
        tasks: {
          total: tasksRes.data?.length || 0,
          completed: tasksRes.data?.filter(t => t.status === 'completed' || t.status === 'verified' || t.is_done).length || 0
        },
        assets: {
          total: assetsRes.data?.length || 0,
          needsRepair: assetsRes.data?.filter(a => a.status === 'repair').length || 0
        },
        vendors: {
          unpaidCount: vendorsRes.data?.length || 0
        }
      }
    }

    // 4. 시스템 프롬프트 구성
    const systemMessage = {
      role: 'system',
      content: `당신은 소상공인 매장의 운영 데이터를 분석하는 AI 어시스턴트입니다.

[오늘 날짜 (KST)]: ${todayKST}

[날짜 계산 기준]
- "오늘" = ${todayKST}
- "어제" = 오늘에서 1일 뺀 날짜
- "이번 주" = 이번 주 월요일부터 오늘까지
- "지난주" = 저번 주 월요일부터 일요일까지
- "이번 달" = 이번 달 1일부터 말일까지
- "지난달" = 저번 달 1일부터 말일까지

[행동 지침]
1. 아래 제공된 [이번 달 요약 데이터]만으로 사용자의 질문에 충분히 답변할 수 있다면, 절대 Tool(fetchStoreData)을 호출하지 말고 즉시 답변을 작성하세요.
2. 사용자가 "이번 주", "어제" 등 특정 날짜/기간의 상세 데이터를 요구하거나, 특정 직원의 이름 등 요약 데이터에 없는 세부 정보가 필요할 때만 \`fetchStoreData\`를 호출하세요.
3. \`fetchStoreData\` 호출 시, 질문과 관련 없는 데이터(dataTypes)는 절대 요청하지 마세요. (예: 지각에 대해 물어보면 'attendance'만 요청)
4. 답변은 3~5문장 내외로 작성하며, 구체적 수치를 반드시 포함하고 핵심만 간결하게 전달하세요.
5. 데이터에 명확히 없는 내용을 추측할 때는 "데이터 기준으로는" 또는 "가능성이 있어요" 같은 표현을 사용하세요.

[이번 달 요약 데이터]
${JSON.stringify(summaryContext, null, 2)}`
    }

    // 5. AI 1차 호출 (스트리밍 아님)
    const firstResponse = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash-preview',
      max_tokens: 3000,
      tools: tools,
      tool_choice: 'auto',
      messages: [systemMessage, ...messages],
    })

    const firstChoice = firstResponse.choices[0]

    // 6. Tool 호출 없는 경우
    if (firstChoice.finish_reason !== 'tool_calls' || !firstChoice.message.tool_calls) {
      const stream = new ReadableStream({
        async start(controller) {
          const content = firstChoice.message.content || ''
          // 30자 단위로 청크 분할하여 스트리밍 효과
          for (let i = 0; i < content.length; i += 30) {
            controller.enqueue(sseChunk(content.slice(i, i + 30)))
            await new Promise(r => setTimeout(r, 20))
          }
          controller.enqueue(sseChunk('[DONE]'))
          controller.close()
        }
      })

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
      })
    }

    // 7. Tool 호출 있는 경우
    const toolCall = firstChoice.message.tool_calls[0] as OpenAI.Chat.Completions.ChatCompletionMessageToolCall
    const { startDate, endDate, dataTypes } = JSON.parse(toolCall.function.arguments)

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // a. 로딩 상태 알림
          controller.enqueue(sseChunk(`[TOOL:${startDate} ~ ${endDate} 데이터 조회중]`))

          // b. 데이터 조회
          const toolResult = await executeFetchStoreData(supabase, storeId, startDate, endDate, dataTypes)

          // c. 2차 AI 호출 (stream: true)
          const secondResponse = await openai.chat.completions.create({
            model: 'gemini/gemini-3-flash-preview',
            max_tokens: 3000,
            stream: true,
            messages: [
              systemMessage,
              ...messages,
              firstChoice.message,
              { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(toolResult) }
            ] as any
          })

          // d. 2차 스트리밍 청크 전달
          for await (const chunk of secondResponse) {
            const text = chunk.choices[0]?.delta?.content || ''
            if (text) {
              controller.enqueue(sseChunk(text))
            }
          }

          // e. 완료
          controller.enqueue(sseChunk('[DONE]'))
        } catch (error) {
          console.error('Tool execution / 2nd stream error:', error)
          controller.enqueue(sseChunk('오류가 발생하여 데이터를 조회하지 못했습니다.'))
          controller.enqueue(sseChunk('[DONE]'))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' }
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}