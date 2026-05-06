import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/features/auth/permissions'
import OpenAI from 'openai'
import { getMemberDisplayName } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY || 'dummy-key',
  baseURL: process.env.LITELLM_BASE_URL,
})

// ✅ 'YYYY-MM' 문자열 파싱
function parseMonthStr(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split('-').map(Number)
  return { year, month }
}

// ✅ 해당 월의 시작일과 마지막일 'YYYY-MM-DD' 반환
function getMonthRange(targetMonth: string): { startStr: string; endStr: string } {
  const { year, month } = parseMonthStr(targetMonth)
  
  // 1일
  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const startStr = startDate.toISOString().split('T')[0]
  
  // 다음달 1일 - 1밀리초 = 이번달 마지막일
  const endDate = new Date(Date.UTC(year, month, 0))
  const endStr = endDate.toISOString().split('T')[0]
  
  return { startStr, endStr }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storeId, targetMonth, forceRefresh } = await req.json()

    if (!storeId || !targetMonth) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const canViewAiReports = await hasPermission(user.id, storeId, 'view_ai_reports')
    if (!canViewAiReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // ✅ 월간 키 생성 (예: monthly:2026-05)
    const periodKey = `monthly:${targetMonth}`

    // 캐시 확인
    if (!forceRefresh) {
      const { data: cachedReport } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('store_id', storeId)
        .eq('report_type', 'monthly')
        .eq('period_key', periodKey)
        .single()

      if (cachedReport) {
        return NextResponse.json(cachedReport)
      }
    }

    const { startStr, endStr } = getMonthRange(targetMonth)

    // 이번 달 출퇴근
    const { data: rawAttendance } = await supabase
      .from('store_attendance')
      .select('target_date, status, member_id, clock_in_time, clock_out_time, is_late, schedule:schedules(start_time), member:store_members!store_attendance_member_id_fkey!inner(id, user_id, name, profile:profiles(full_name))')
      .eq('store_id', storeId)
      .gte('target_date', startStr)
      .lte('target_date', endStr)

    const formatToKSTFull = (utcString: string | null) => {
      if (!utcString) return null
      const date = new Date(utcString)
      date.setHours(date.getHours() + 9)
      return date.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)'
    }

    const attendanceData = rawAttendance?.map(a => {
      const sched = a.schedule as any
      const scheduleStartTime = Array.isArray(sched) ? sched[0]?.start_time : sched?.start_time
      const memberData = Array.isArray(a.member) ? a.member[0] : a.member
      const formattedMemberData = memberData
        ? { ...memberData, profile: Array.isArray(memberData.profile) ? memberData.profile[0] : memberData.profile }
        : null

      return {
        target_date: a.target_date,
        status: a.status,
        staff_name: formattedMemberData ? getMemberDisplayName(formattedMemberData) : '성명 미상',
        scheduled_start_time: scheduleStartTime,
        clock_in_time_kst: formatToKSTFull(a.clock_in_time),
        clock_out_time_kst: formatToKSTFull(a.clock_out_time),
        is_late: a.is_late || false,
      }
    }) || []

    // 이번 달 업무
    const { data: rawTasks } = await supabase
      .from('tasks')
      .select('id, title, status, is_done, due_date, assignee_ids')
      .eq('store_id', storeId)
      .gte('due_date', startStr)
      .lte('due_date', endStr)
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

    const kstDateObj = new Date(new Date().getTime() + 9 * 60 * 60 * 1000)
    const kstDateStr = kstDateObj.toISOString().split('T')[0]

    const tasksData = rawTasks?.map(t => {
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

    const contextPackage = {
      monthRange: { start: startStr, end: endStr },
      attendance: attendanceData,
      tasks: {
        total: tasksData.length,
        completed: tasksData.filter(t => t.is_completed).length,
        overdue: tasksData.filter(t => t.is_overdue).length,
        records: tasksData,
      },
    }

    const systemPrompt = `
당신은 소상공인 매장의 월간 운영 데이터를 분석하는 AI 어시스턴트입니다.
아래 월간 운영 데이터를 바탕으로 매장 관리자에게 유용한 월간 리포트를 작성하세요.
주의: 데이터에 포함된 모든 시간(UTC)은 한국 시간(KST, UTC+9) 기준으로 해석해서 분석하세요.
(예: UTC 07:00 -> KST 16:00, UTC 19:44 -> KST 04:44 (다음날))

지침:
1. 출퇴근 데이터(attendance)에 'scheduled_start_time'과 'clock_in_time_kst'가 함께 제공됩니다.
   만약 직원의 출근 시간(clock_in_time_kst)의 시간(HH:mm)이 예정된 시간(scheduled_start_time)보다 늦다면, 이 직원은 반드시 "지각"으로 분류해야 합니다.
2. 각 직원의 이름(staff_name)을 사용하여 누구인지 구체적으로 명시하세요.
3. 데이터가 방대할 수 있으므로, 큰 흐름과 중요한 이슈 위주로 요약하세요.

**매우 중요: 응답은 마크다운 백틱(\`\`\`json)이나 부가 설명 없이 오직 순수한 JSON 객체 하나만 출력해야 합니다. 파싱이 끊기지 않도록 구조를 엄수하세요.**

{
  "summary": {
    "text": "월간 종합 요약 (지각, 근태 트렌드, 업무 달성률 등 특이사항 포함, 한국 시간 기준 4-5문장)",
    "insights": [
      { "type": "warning|good|bad|info", "text": "인사이트 내용 (시간 포함 시 KST 변환해서 작성)" }
    ]
  },
  "staffing": {
    "insights": [
      { "type": "warning|good|bad|info", "text": "인력 운영 인사이트 내용 (가장 지각이 잦은 직원, 근태 우수자 등)" }
    ],
    "hotDays": ["금요일", "토요일"]
  },
  "tasks": {
    "summary": "이번 달 업무 수행 현황 요약 (완료율, 지연 상태 등 반영, 2-3문장 내외)",
    "insights": [
      { "type": "warning|good|bad|info", "text": "구체적인 업무 관련 인사이트 내용" }
    ]
  },
  "assetsAndVendors": {
    "insights": [
      { "type": "info", "text": "자산이나 거래처에 특이사항이 없다면 잘 유지되고 있다고 작성하세요." }
    ]
  },
  "recommendations": [
    { "title": "다음 달 대비 액션", "description": "구체적 설명" }
  ]
}

오늘 날짜(KST): ${kstDateStr}
데이터:
${JSON.stringify(contextPackage, null, 2)}
`.trim()

    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash-preview',
      max_tokens: 4000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '이번 달 운영 리포트를 생성해주세요.' },
      ],
    })

    const textContent = response.choices[0]?.message?.content || ''
    let reportContent

    try {
      let cleanText = textContent.trim()
      if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json/, '')
      if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```/, '')
      if (cleanText.endsWith('```')) cleanText = cleanText.replace(/```$/, '')
      cleanText = cleanText.trim()

      const startIndex = cleanText.indexOf('{')
      const endIndex = cleanText.lastIndexOf('}')
      if (startIndex === -1 || endIndex === -1) throw new Error('No JSON object found in response')

      reportContent = JSON.parse(cleanText.substring(startIndex, endIndex + 1))
    } catch (e) {
      console.error('Failed to parse AI response:', textContent, e)
      reportContent = {
        summary: { text: '데이터를 요약할 수 없습니다.', insights: [] },
        staffing: { insights: [], hotDays: [] },
        tasks: { summary: '데이터를 요약할 수 없습니다.', insights: [] },
        assetsAndVendors: { insights: [] },
        recommendations: [],
      }
    }

    const { data: savedReport, error: upsertError } = await supabase
      .from('ai_reports')
      .upsert(
        {
          store_id: storeId,
          report_type: 'monthly',
          period_key: periodKey,
          content: reportContent,
          generated_at: new Date().toISOString(),
        },
        { onConflict: 'store_id, period_key' }
      )
      .select()
      .single()

    if (upsertError) {
      console.error('Failed to save report to db:', upsertError)
      return NextResponse.json({
        store_id: storeId,
        report_type: 'monthly',
        period_key: periodKey,
        content: reportContent,
        generated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json(savedReport)

  } catch (error) {
    console.error('Monthly AI Report generation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}