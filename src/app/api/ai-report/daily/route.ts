import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { hasPermission } from '@/features/auth/permissions'
import { fetchDailyContext } from '@/lib/ai-report/contextBuilder'
import OpenAI from 'openai'

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

    const periodKey = `daily:${targetDate}`

    // 캐시 확인 (강제 리프레시가 아닐 경우)
    if (!forceRefresh) {
      const { data: cachedReport } = await supabase
        .from('ai_reports')
        .select('*')
        .eq('store_id', storeId)
        .eq('report_type', 'daily')
        .eq('period_key', periodKey)
        .single()

      if (cachedReport) {
        return NextResponse.json(cachedReport)
      }
    }

    // 컨텍스트 수집
    const contextPackage = await fetchDailyContext(supabase, storeId, targetDate)

    // KST(한국 시간) 변환 로직 추가 (출근 시간 비교용 등)
    const kstDateStr = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0]

    const systemPrompt = `
당신은 소상공인 매장의 운영 데이터를 분석하는 AI 어시스턴트입니다.
아래 오늘의 운영 데이터를 바탕으로 간결하고 실용적인 리포트를 생성하세요.
주의: 데이터에 포함된 모든 시간(UTC)은 한국 시간(KST, UTC+9) 기준으로 해석해서 분석하세요.
(예: UTC 07:00 -> KST 16:00, UTC 19:44 -> KST 04:44 (다음날))

지침:
1. 출퇴근 데이터(attendance)에 'scheduled_start_time'과 'clock_in_time_kst'가 함께 제공됩니다.
   만약 직원의 출근 시간(clock_in_time_kst)의 시간(HH:mm)이 예정된 시간(scheduled_start_time)보다 늦다면, 이 직원은 반드시 "지각"으로 분류하고 요약에 명시해야 합니다.
2. 스케줄 정보가 없는 직원은 출근 여부만 확인합니다.

**매우 중요: 응답은 마크다운 백틱(\`\`\`json)이나 부가 설명 없이 오직 순수한 JSON 객체 하나만 출력해야 합니다. 파싱이 끊기지 않도록 구조를 엄수하세요.**

{
  "attendance": {
    "summary": "출퇴근 현황 요약 (지각자 발생 시 반드시 언급, 한국 시간 기준 2-3문장)",
    "insights": [
      { "type": "warning|good|bad|info", "text": "인사이트 내용 (시간 포함 시 KST 변환해서 작성)" }
    ]
  },
  "tasks": {
    "summary": "업무 처리 현황 요약 (1-2문장)",
    "insights": [
      { "type": "warning|good|bad|info", "text": "인사이트 내용" }
    ]
  },
  "assets": {
    "insights": [
      { "type": "warning|good|bad|info", "text": "인사이트 내용" }
    ]
  },
  "recommendations": [
    { "title": "액션 제목", "description": "구체적 설명" }
  ]
}

오늘 날짜(KST): ${kstDateStr}
운영 데이터:
${JSON.stringify(contextPackage, null, 2)}
`

    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash-preview',
      max_tokens: 3000,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '오늘의 운영 리포트를 생성해주세요.' }
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
      // 파싱 실패 시 빈 껍데기(Fallback) 데이터를 반환하여 클라이언트 화면 깨짐 방지
      reportContent = {
        attendance: { summary: "데이터를 요약할 수 없습니다.", insights: [] },
        tasks: { summary: "데이터를 요약할 수 없습니다.", insights: [] },
        assets: { insights: [] },
        recommendations: []
      }
    }

    // 결과 저장 (UPSERT)
    const { data: savedReport, error: upsertError } = await supabase
      .from('ai_reports')
      .upsert({
        store_id: storeId,
        report_type: 'daily',
        period_key: periodKey,
        content: reportContent,
        generated_at: new Date().toISOString()
      }, { onConflict: 'store_id, period_key' })
      .select()
      .single()

    if (upsertError) {
      console.error('Failed to save report to db:', upsertError)
      // 저장이 실패해도 일단 생성된 결과는 반환
      return NextResponse.json({
        store_id: storeId,
        report_type: 'daily',
        period_key: periodKey,
        content: reportContent,
        generated_at: new Date().toISOString()
      })
    }

    return NextResponse.json(savedReport)

  } catch (error) {
    console.error('Daily AI Report generation error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}