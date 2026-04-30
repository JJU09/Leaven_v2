import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/features/auth/permissions'
import OpenAI from 'openai'
import { getMemberDisplayName } from '@/lib/utils'

const openai = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY || 'dummy-key',
  baseURL: process.env.LITELLM_BASE_URL,
})

// ✅ 'YYYY-MM-DD' 문자열을 타임존 오염 없이 파싱
function parseDateStrSafe(dateStr: string): { year: number; month: number; day: number } {
  const [year, month, day] = dateStr.split('-').map(Number)
  return { year, month, day }
}

// ✅ 날짜에 N일을 더해 'YYYY-MM-DD' 반환 (타임존 무관)
function addDaysToDateStr(dateStr: string, days: number): string {
  const { year, month, day } = parseDateStrSafe(dateStr)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return d.toISOString().split('T')[0]
}

// ✅ ISO 주차 계산 (타임존 오염 없이)
function getISOWeekNumber(dateStr: string): { year: number; week: number } {
  const { year, month, day } = parseDateStrSafe(dateStr)
  // 목요일 기준 ISO 주차 계산
  const d = new Date(Date.UTC(year, month - 1, day))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  return { year: d.getUTCFullYear(), week: weekNo }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { storeId, targetDate, forceRefresh } = await req.json()

    if (!storeId || !targetDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const canViewAiReports = await hasPermission(user.id, storeId, 'view_ai_reports')
    if (!canViewAiReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // ✅ 주차 키 생성 (타임존 안전)
    const { year, week } = getISOWeekNumber(targetDate)
    const periodKey = `weekly:${year}-W${week}`

    // 캐시 확인
    if (!forceRefresh) {
      const { data: cachedReport } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('store_id', storeId)
        .eq('report_type', 'weekly')
        .eq('period_key', periodKey)
        .single()

      if (cachedReport) {
        return NextResponse.json(cachedReport)
      }
    }

    // ✅ 주간 범위 계산 — 문자열 연산만 사용, toISOString() 제거
    // targetDate는 프론트에서 월요일 'YYYY-MM-DD'로 보장됨
    const startStr = targetDate                    // 월요일
    const endStr = addDaysToDateStr(targetDate, 6) // 일요일

    // 이번 주 출퇴근
    const { data: rawAttendance } = await supabase
      .from('store_attendance')
      .select('target_date, status, member_id, clock_in_time, clock_out_time, is_late, schedule:schedules(start_time), member:store_members!store_attendance_member_id_fkey!inner(id, user_id, name, profile:profiles(full_name))')
      .eq('store_id', storeId)
      .gte('target_date', startStr)  // ✅ 타임존 오염 없음
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

    // 이번 주 업무
    const { data: rawTasks } = await supabase
      .from('tasks')
      .select('id, title, status, is_done, due_date, assignee_ids')
      .eq('store_id', storeId)
      .gte('due_date', startStr)  // ✅ 타임존 오염 없음
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
      weekRange: { start: startStr, end: endStr }, // ✅ 정확한 날짜
      attendance: attendanceData,
      tasks: {
        total: tasksData.length,
        completed: tasksData.filter(t => t.is_completed).length,
        overdue: tasksData.filter(t => t.is_overdue).length,
        records: tasksData,
      },
    }

    // 이하 systemPrompt, AI 호출, upsert 로직은 기존과 동일
    const systemPrompt = `
당신은 소상공인 매장의 주간 운영 데이터를 분석하는 AI 어시스턴트입니다.
아래 주간 운영 데이터를 바탕으로 매장 관리자에게 유용한 주간 리포트를 작성하세요.
주의: 데이터에 포함된 모든 시간(UTC)은 한국 시간(KST, UTC+9) 기준으로 해석해서 분석하세요.
(예: UTC 07:00 -> KST 16:00, UTC 19:44 -> KST 04:44 (다음날))

지침:
1. 출퇴근 데이터(attendance)에 'scheduled_start_time'과 'clock_in_time_kst'가 함께 제공됩니다.
   만약 직원의 출근 시간(clock_in_time_kst)의 시간(HH:mm)이 예정된 시간(scheduled_start_time)보다 늦다면, 이 직원은 반드시 "지각"으로 분류해야 합니다.
2. 각 직원의 이름(staff_name)을 사용하여 누구인지 구체적으로 명시하세요.

**매우 중요: 응답은 마크다운 백틱(\`\`\`json)이나 부가 설명 없이 오직 순수한 JSON 객체 하나만 출력해야 합니다. 파싱이 끊기지 않도록 구조를 엄수하세요.**

{
  "summary": {
    "text": "주간 종합 요약 (지각 등 특이사항 포함, 한국 시간 기준 3-4문장)",
    "insights": [
      { "type": "warning|good|bad|info", "text": "인사이트 내용 (시간 포함 시 KST 변환해서 작성)" }
    ]
  },
  "staffing": {
    "insights": [
      { "type": "warning|good|bad|info", "text": "인력 운영 인사이트 내용" }
    ],
    "hotDays": ["화요일", "수요일"]
  },
  "tasks": {
    "summary": "이번 주 업무 수행 현황 요약 (완료율, 지연 상태 등 반영, 2문장 내외)",
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
    { "title": "다음 주 대비 액션", "description": "구체적 설명" }
  ]
}

오늘 날짜(KST): ${kstDateStr}
데이터:
${JSON.stringify(contextPackage, null, 2)}
`.trim()

    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash-preview',
      max_tokens: 3000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '이번 주 운영 리포트를 생성해주세요.' },
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
          report_type: 'weekly',
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
        report_type: 'weekly',
        period_key: periodKey,
        content: reportContent,
        generated_at: new Date().toISOString(),
      })
    }

    return NextResponse.json(savedReport)

  } catch (error) {
    console.error('Weekly AI Report generation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}