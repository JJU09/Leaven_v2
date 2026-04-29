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

    const { storeId, targetDate, forceRefresh } = await req.json()

    if (!storeId || !targetDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const canViewAiReports = await hasPermission(user.id, storeId, 'view_ai_reports')
    if (!canViewAiReports) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 })
    }

    // 주간 키 생성 (연도-주차)
    const d = new Date(targetDate)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() + 4 - (d.getDay() || 7))
    const yearStart = new Date(d.getFullYear(), 0, 1)
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    const periodKey = `weekly:${d.getFullYear()}-W${weekNo}`

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

    // 이번 주 범위 구하기 (월-일)
    const weekStart = new Date(targetDate)
    weekStart.setHours(0,0,0,0) // 월요일로 넘어온다고 가정

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23,59,59,999)

    // 이번 주 출퇴근 전체 (+ 지각 여부 파악을 위해 스케줄/출근시간 포함)
    const { data: rawAttendance } = await supabase
      .from('store_attendance')
      .select('target_date, status, member_id, clock_in_time, clock_out_time, is_late, schedule:schedules(start_time), member:store_members!inner(name, profile:profiles(full_name))')
      .eq('store_id', storeId)
      .gte('target_date', weekStart.toISOString().split('T')[0])
      .lte('target_date', weekEnd.toISOString().split('T')[0])

    const formatToKSTFull = (utcString: string | null) => {
      if (!utcString) return null;
      const date = new Date(utcString);
      date.setHours(date.getHours() + 9);
      return date.toISOString().replace('T', ' ').substring(0, 19) + ' (KST)';
    }

    const attendanceData = rawAttendance?.map(a => {
      const sched = a.schedule as any; 
      const scheduleStartTime = Array.isArray(sched) ? sched[0]?.start_time : sched?.start_time;
      
      const memberData = Array.isArray(a.member) ? a.member[0] : a.member;

      return {
        target_date: a.target_date,
        status: a.status,
        staff_name: memberData ? (memberData as any).name || (memberData as any).profile?.full_name || '성명 미상' : '성명 미상',
        scheduled_start_time: scheduleStartTime,
        clock_in_time_kst: formatToKSTFull(a.clock_in_time),
        clock_out_time_kst: formatToKSTFull(a.clock_out_time),
        is_late: a.is_late || false
      }
    }) || [];

    // 이번 주 업무 전체
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('status, due_date')
      .eq('store_id', storeId)
      .gte('due_date', weekStart.toISOString().split('T')[0])
      .lte('due_date', weekEnd.toISOString().split('T')[0])
      .is('deleted_at', null)

    const contextPackage = {
      weekRange: { start: weekStart.toISOString().split('T')[0], end: weekEnd.toISOString().split('T')[0] },
      attendance: attendanceData || [],
      tasks: tasksData || []
    }

    const kstDateStr = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]

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
`

    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash-preview',
      max_tokens: 3000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '이번 주 운영 리포트를 생성해주세요.' }
      ],
    })

    const textContent = response.choices[0]?.message?.content || ''
    let reportContent;
    
    try {
      // 좀 더 견고한 JSON 추출 로직 (불필요한 마크다운, 공백 등 제거)
      let cleanText = textContent.trim();
      if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json/, '');
      if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```/, '');
      if (cleanText.endsWith('```')) cleanText = cleanText.replace(/```$/, '');
      cleanText = cleanText.trim();
      
      const startIndex = cleanText.indexOf('{');
      const endIndex = cleanText.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
         throw new Error("No JSON object found in response");
      }
      
      const jsonStr = cleanText.substring(startIndex, endIndex + 1);
      reportContent = JSON.parse(jsonStr)
    } catch (e) {
      console.error('Failed to parse AI response:', textContent, e)
      reportContent = {
        summary: { text: "데이터를 요약할 수 없습니다.", insights: [] },
        staffing: { insights: [], hotDays: [] },
        assetsAndVendors: { insights: [] },
        recommendations: []
      }
    }

    // 결과 저장 (UPSERT)
    const { data: savedReport, error: upsertError } = await supabase
      .from('ai_reports')
      .upsert({
        store_id: storeId,
        report_type: 'weekly',
        period_key: periodKey,
        content: reportContent,
        generated_at: new Date().toISOString()
      }, { onConflict: 'store_id, period_key' })
      .select()
      .single()

    if (upsertError) {
      console.error('Failed to save report to db:', upsertError)
      return NextResponse.json({
        store_id: storeId,
        report_type: 'weekly',
        period_key: periodKey,
        content: reportContent,
        generated_at: new Date().toISOString()
      })
    }

    return NextResponse.json(savedReport)

  } catch (error) {
    console.error('Weekly AI Report generation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}