import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.LITELLM_API_KEY || 'dummy-key',
  baseURL: process.env.LITELLM_BASE_URL,
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { storeId, startDate, endDate, staffIds, staffList, storeOpeningHours, approvedLeaves, options } = body

    if (!storeId || !startDate || !endDate || !staffIds || staffIds.length === 0) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // 옵션 파싱
    const requireManager = options?.requireManager ?? true
    const prioritizeDefault = options?.prioritizeDefault ?? true

    // 1. 해당 기간 동안 이미 등록된 스케줄을 가져옵니다. (AI가 빈자리를 파악하기 위해)
    const { data: existingSchedules } = await supabase
      .from('schedules')
      .select('member_id, plan_date, start_time, end_time')
      .eq('store_id', storeId)
      .gte('plan_date', startDate)
      .lte('plan_date', endDate)

    // 2. 휴무일(Closed) 추출 및 요일별 날짜 맵핑
    const daysMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    const closedDaysOfWeek: string[] = [] // ['sun', 'sat' ...]
    
    if (storeOpeningHours) {
      for (const [day, info] of Object.entries(storeOpeningHours)) {
        if ((info as any)?.closed === true) {
          closedDaysOfWeek.push(day)
        }
      }
    }

    // 날짜별 요일 파악하여 closed 날짜 강제 제외 리스트 만들기
    const closedDates: string[] = []
    let currDate = new Date(startDate)
    const endObj = new Date(endDate)
    const dateToDayMap: Record<string, string> = {}

    while (currDate <= endObj) {
      const dStr = currDate.toISOString().split('T')[0]
      const dDayName = daysMap[currDate.getDay()]
      dateToDayMap[dStr] = dDayName
      
      if (closedDaysOfWeek.includes(dDayName)) {
        closedDates.push(dStr)
      }
      
      currDate.setDate(currDate.getDate() + 1)
    }

    // 3. OpenAI 프롬프트 구성 (Step-by-Step 구조화 및 강제 규칙 적용)
    const systemPrompt = `
You are an expert workforce scheduling AI for a retail store or restaurant.
Your task is to generate a complete schedule for the staff members by EXACTLY following the 3 steps below.

### Inputs provided:
1. Target Date Range: ${startDate} to ${endDate}
2. Date to Day-of-week Mapping: ${JSON.stringify(dateToDayMap)}
3. Store Opening Hours: ${JSON.stringify(storeOpeningHours)}
4. CRITICAL CLOSED DATES: ${JSON.stringify(closedDates)}
5. Staff List (includes default 'work_schedules' array for each day of week (0=sun, 1=mon, ...), roles, and IDs): ${JSON.stringify(staffList)}
6. Approved Leaves (staff who cannot work on these dates): ${JSON.stringify(approvedLeaves)}
7. Existing Schedules: ${JSON.stringify(existingSchedules)}

### STEP-BY-STEP INSTRUCTIONS:

**STEP 1: Copy Default Work Schedules (MANDATORY)**
- Iterate through every date from ${startDate} to ${endDate}.
- If the date is in CRITICAL CLOSED DATES, SKIP IT completely.
- For each staff member, check their 'work_schedules' array. If they have a schedule for that day of the week (where is_holiday: false), you MUST create a shift for them exactly as defined in their 'work_schedules' (start_time and end_time).
- Exception: If the staff member has an approved leave on that date, skip them.
- Exception: If the staff member already has an Existing Schedule on that date and time, do not duplicate it.
- **CRITICAL**: Do NOT omit any default work schedules unless they fall on a closed date or approved leave. Do NOT change their hours.

**STEP 2: Identify Coverage Gaps**
- Now look at the shifts generated in Step 1.
- Check the Store Opening Hours for each date. Is there any time during the opening hours where NO staff member is scheduled?
${requireManager ? '- Also check: Is there any time during opening hours where NO MANAGER (hierarchy_level 1 or 2, or role "manager"/"owner") is scheduled?' : ''}

**STEP 3: Fill Gaps Sparingly (Only if necessary)**
- If and ONLY IF there are gaps identified in Step 2, you may create additional shifts to cover those gaps.
- When creating extra shifts, assign them to staff members who do not have an approved leave.
- DO NOT create extra shifts on days or times where coverage is already sufficient. 
- DO NOT schedule a single staff member for more than 12 hours in one day.

### CRITICAL RULES (MUST FOLLOW):
1. ABSOLUTELY NO SCHEDULES on CRITICAL CLOSED DATES: ${JSON.stringify(closedDates)}.
2. Output format MUST be a pure JSON array of objects, with no markdown, no \`\`\`json blocks, and no extra text.
3. Each object represents a single shift: { "member_id": "...", "plan_date": "YYYY-MM-DD", "start_time": "HH:mm:00", "end_time": "HH:mm:00" }
4. Generate the final combined array (Step 1 + Step 3) now.
`

    // 3. OpenAI API 호출 (LiteLLM 경유)
    const response = await openai.chat.completions.create({
      model: 'gemini/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the schedule as a JSON array.' }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    let resultText = response.choices[0]?.message?.content || '{"schedules": []}'
    
    // 마크다운 백틱 제거 (Gemini 등이 json 모드여도 백틱을 반환할 때를 대비)
    let cleanText = resultText.trim()
    if (cleanText.startsWith('```json')) cleanText = cleanText.replace(/^```json/, '')
    if (cleanText.startsWith('```')) cleanText = cleanText.replace(/^```/, '')
    if (cleanText.endsWith('```')) cleanText = cleanText.replace(/```$/, '')
    resultText = cleanText.trim()
    
    // 혹시라도 gpt가 그냥 배열을 뱉었을 경우와 객체 안에 뱉었을 경우 처리
    let parsedSchedules = []
    try {
      const parsed = JSON.parse(resultText)
      if (Array.isArray(parsed)) {
        parsedSchedules = parsed
      } else if (parsed.schedules && Array.isArray(parsed.schedules)) {
        parsedSchedules = parsed.schedules
      } else {
        // 객체의 값들 중 배열인 것을 찾음
        for (const key in parsed) {
            if(Array.isArray(parsed[key])) {
                parsedSchedules = parsed[key];
                break;
            }
        }
      }
    } catch (e) {
      console.error('Failed to parse AI output:', resultText)
      return NextResponse.json({ error: 'AI 반환 결과 파싱 실패' }, { status: 500 })
    }

    // 4. 데이터 정제 (스토어 ID 및 타입 추가)
    const finalSchedules = parsedSchedules.map((sch: any) => ({
      store_id: storeId,
      member_id: sch.member_id,
      plan_date: sch.plan_date,
      start_time: sch.start_time.length === 5 ? `${sch.start_time}:00` : sch.start_time,
      end_time: sch.end_time.length === 5 ? `${sch.end_time}:00` : sch.end_time,
      schedule_type: 'regular'
    }))

    return NextResponse.json({ schedules: finalSchedules })

  } catch (error: any) {
    console.error('AI Schedule generation error:', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}