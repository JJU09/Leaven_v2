# AI 리포트 페이지 구현

## 기술 스택 & 전제 조건
- Next.js (App Router), TypeScript, Tailwind CSS, Supabase
- 컴포넌트 라이브러리: shadcn/ui
- 상태관리: TanStack Query
- AI: Anthropic Claude API (claude-sonnet-4-5)
- 기존 프로젝트에 stores, staff, attendance, leave_requests,
  tasks, store_assets, vendors, vendor_transactions,
  payroll_records 테이블 있음
- store_id, 현재 로그인 staff_id는 컨텍스트에서 가져옴
- 라우트: /dashboard/ai-report

---

## 페이지 구조

탭 3개로 구성:
[일간 리포트] [주간 리포트] [AI 질의]

AI 질의 탭은 항상 마지막 위치.
탭 전환 시 이전 탭 상태 유지 (unmount 하지 않음).

---

## 공통: 데이터 집계 함수

리포트 생성 전 필요한 데이터를 Supabase에서 집계해서
"컨텍스트 패키지"로 만든다.
이 패키지를 Claude API 요청 시 system prompt에 포함.

### 일간 컨텍스트 패키지

// 1. 출퇴근 현황
supabase
  .from('attendance')
  .select('*, staff(name, role)')
  .eq('store_id', storeId)
  .eq('date', targetDate)

// 2. 해당일 연차
supabase
  .from('leave_requests')
  .select('*, staff(name)')
  .eq('store_id', storeId)
  .eq('leave_date', targetDate)
  .eq('status', 'approved')

// 3. 오늘 업무 현황
supabase
  .from('tasks')
  .select('*, assignee:staff!assignee_id(name)')
  .eq('store_id', storeId)
  .eq('due_date', targetDate)
  .is('deleted_at', null)

// 4. 자산 점검 임박 (30일 이내)
supabase
  .from('store_assets')
  .select('name, next_inspection_date, warranty_expiry_date, status')
  .eq('store_id', storeId)
  .is('deleted_at', null)
  .or(`next_inspection_date.lte.${thirtyDaysLater},warranty_expiry_date.lte.${thirtyDaysLater}`)

// 5. 미결제 거래
supabase
  .from('vendor_transactions')
  .select('amount, transaction_date, vendors(name)')
  .eq('store_id', storeId)
  .in('payment_status', ['unpaid', 'partial'])
  .is('deleted_at', null)

패키지 구성:
{
  date: targetDate,
  attendance: { total, present, late, absent, onLeave, records },
  tasks: { total, done, overdue, byAssignee },
  assets: { urgent },          // D-30 이내
  unpaidTransactions: { count, totalAmount, items }
}

### 주간 컨텍스트 패키지

일간 패키지 + 추가:

// 주간 출퇴근 집계
.gte('date', weekStart).lte('date', weekEnd)
→ 요일별 출근 수, 연장근무 시간 합산

// 지난 주 비교용
.gte('date', lastWeekStart).lte('date', lastWeekEnd)

// 이번 주 급여 추정 (payroll_records 또는 attendance 기반)
→ 연장수당 증감 계산

// 이번 주 업무 완료율
→ 전주 대비 비교

패키지 구성:
{
  weekRange: { start, end },
  attendance: {
    avgRate, totalOvertime,
    byDay: [{ day, count, overtime }],
    lastWeek: { avgRate, totalOvertime }
  },
  tasks: { completionRate, lastWeek: { completionRate } },
  payroll: { estimatedExtra, lastWeek: { estimatedExtra } },
  assets: { urgent },
  contracts: { expiringSoon },
  unpaidTransactions: { count, totalAmount }
}

---

## 탭 1 — 일간 리포트

### UI 구성
- 날짜 선택 select (오늘 기본, 최근 7일 선택 가능)
- "리포트 재생성" 버튼
- AI 생성 시각 표시 ("AI 분석 · YYYY-MM-DD HH:mm 생성")
- 리포트 카드 목록 (도메인별)
- 각 카드: 제목 + 도메인 뱃지 + AI 요약 텍스트 + 인사이트 목록

### 카드 구성
1. 출퇴근 카드 — 오늘 출근 현황 요약 + 지각/결근 인사이트
2. 업무 처리 카드 — 완료율 + 직원별 진행률 바 + 기한 초과 인사이트
3. 자산·거래처 카드 — 주의 필요 항목 인사이트 (있을 때만 표시)
4. AI 제안 카드 — 번호 매긴 액션 추천 목록

### Claude API 호출

POST /api/ai-report/daily

// app/api/ai-report/daily/route.ts
const systemPrompt = `
당신은 소상공인 매장의 운영 데이터를 분석하는 AI 어시스턴트입니다.
아래 오늘의 운영 데이터를 바탕으로 간결하고 실용적인 리포트를 생성하세요.

응답은 반드시 아래 JSON 형식으로만 출력하세요. 다른 텍스트 없이 JSON만 출력.

{
  "attendance": {
    "summary": "출퇴근 현황 요약 (2-3문장)",
    "insights": [
      { "type": "warning|good|bad|info", "text": "인사이트 내용" }
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

데이터:
${JSON.stringify(contextPackage, null, 2)}
`

const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-sonnet-4-5',
    max_tokens: 1000,
    messages: [{ role: 'user', content: '오늘의 운영 리포트를 생성해주세요.' }],
    system: systemPrompt
  })
})

응답 파싱:
const text = data.content[0].text
const report = JSON.parse(text)   // JSON.parse로 안전하게 파싱

### 캐싱 전략

생성된 리포트를 Supabase에 저장해서 재진입 시 재생성 불필요.

CREATE TABLE IF NOT EXISTS public.ai_reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  report_type  TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly')),
  period_key   TEXT NOT NULL,   -- 'daily:2025-01-23' | 'weekly:2025-W04'
  content      JSONB NOT NULL,  -- Claude 응답 JSON 저장
  generated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(store_id, period_key)
);

조회 로직:
1. ai_reports에서 해당 period_key 조회
2. 있으면 캐시 반환 (generated_at 표시)
3. 없거나 "재생성" 클릭 시 → Claude API 호출 → UPSERT 저장

---

## 탭 2 — 주간 리포트

일간 리포트와 동일한 구조, 다른 컨텍스트 패키지.

### 주차 선택
- select: 현재 주 기준 최근 4주 선택 가능
- 주차 표시: "2025년 1월 3주차 (1/20 – 1/26)"

### 카드 구성
1. 주간 운영 요약 카드 — 출근율, 연장근무, 업무완료율 종합
2. 인력 트렌드 카드 — 요일별 근무 인원 바 차트 (CSS 바, Chart.js 불필요)
3. 자산·거래처 주간 동향 카드
4. AI 제안 카드

### Claude API 호출

POST /api/ai-report/weekly

systemPrompt에 주간 컨텍스트 패키지 포함.
JSON 응답 스키마를 주간용으로 조정:
{
  "summary": {
    "text": "주간 종합 요약 (3-4문장)",
    "insights": [...]
  },
  "staffing": {
    "insights": [...],
    "hotDays": ["화요일", "수요일"]  // 연장근무 집중 요일
  },
  "assetsAndVendors": {
    "insights": [...]
  },
  "recommendations": [...]
}

---

## 탭 3 — AI 질의

### UI 구성
- 컨텍스트 바: 현재 참조 중인 데이터 범위를 칩으로 표시
  → 출퇴근(N월), 급여(N월), 자산 현황, 거래처 현황, 업무 완료율
- 대화 메시지 목록 (user / ai 말풍선)
- 빠른 질문 칩 4개 (하드코딩):
  - "가장 자주 고장난 자산이 뭐야?"
  - "이번 달 지각이 많은 직원은?"
  - "미결제 거래처 현황 알려줘"
  - "업무 완료율이 낮은 이유가 뭐야?"
- 텍스트 입력창 + 전송 버튼

### 대화 상태 관리
useState로 messages 배열 관리. 페이지 이탈 시 초기화 (세션 내 유지만).

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

### Claude API 호출 (스트리밍)

POST /api/ai-report/chat

// 매 질문마다 컨텍스트 패키지를 새로 집계해서 포함
// (이번 달 기준 고정 집계 — 재쿼리 비용 최소화)

const systemPrompt = `
당신은 소상공인 매장의 운영 데이터를 분석하는 AI 어시스턴트입니다.
점주의 질문에 데이터를 근거로 간결하게 답변하세요.
추측이 필요한 경우 "데이터 기준으로는" 또는 "가능성이 있어요" 표현을 사용하세요.
답변은 3-5문장 이내로 간결하게, 구체적인 수치를 포함하세요.

현재 매장 운영 데이터:
${JSON.stringify(contextPackage, null, 2)}
`

// 스트리밍 응답 처리
const response = await fetch('/api/ai-report/chat', {
  method: 'POST',
  body: JSON.stringify({ messages, systemPrompt })
})

const reader = response.body.getReader()
// 청크 단위로 읽어서 마지막 AI 메시지에 실시간 append

// app/api/ai-report/chat/route.ts
const stream = await anthropic.messages.stream({
  model: 'claude-sonnet-4-5',
  max_tokens: 1000,
  system: systemPrompt,
  messages: userMessages  // role/content 배열
})

return new Response(stream.toReadableStream())

### 컨텍스트 패키지 (Chat용)

매 질문 시 아래 데이터를 집계해서 system에 포함:
- 이번 달 출퇴근 요약 (지각 횟수, 출근율)
- 이번 달 급여 요약 (총액, 연장수당)
- 전체 자산 상태 요약 (정상/점검/수리 수)
- 전체 거래처 요약 (계약 만료 임박, 미결제)
- 이번 달 업무 완료율

// Promise.all로 병렬 집계
const [attendance, payroll, assets, vendors, tasks] = await Promise.all([
  fetchAttendanceSummary(storeId, thisMonth),
  fetchPayrollSummary(storeId, thisYear, thisMonth),
  fetchAssetSummary(storeId),
  fetchVendorSummary(storeId),
  fetchTaskSummary(storeId, thisMonth)
])

---

## API Routes 구조

app/api/ai-report/
  daily/route.ts      # 일간 리포트 생성 + 캐시
  weekly/route.ts     # 주간 리포트 생성 + 캐시
  chat/route.ts       # 스트리밍 Chat 응답

공통 유틸:
lib/ai-report/
  contextBuilder.ts   # 컨텍스트 패키지 집계 함수
  promptTemplates.ts  # system prompt 템플릿
  reportCache.ts      # ai_reports 캐시 read/write

---

## 파일 구조

app/dashboard/ai-report/
  page.tsx
  _components/
    ReportTabs.tsx               # 탭 전환
    DailyReport.tsx              # 일간 리포트 탭
    WeeklyReport.tsx             # 주간 리포트 탭
    AiChat.tsx                   # AI 질의 탭
    ReportCard.tsx               # 개별 리포트 카드
    InsightItem.tsx              # 인사이트 아이템 (타입별 아이콘)
    RecommendationList.tsx       # AI 제안 목록
    WeeklyBarChart.tsx           # 요일별 근무 바 차트 (CSS)
    ChatMessage.tsx              # 말풍선 컴포넌트
    ContextBar.tsx               # 참조 데이터 칩 바
    QuickChips.tsx               # 빠른 질문 칩
  _hooks/
    useDailyReport.ts            # 일간 리포트 조회/생성
    useWeeklyReport.ts           # 주간 리포트 조회/생성
    useAiChat.ts                 # Chat 스트리밍 상태 관리
  _utils/
    periodUtils.ts               # 주차 계산, 날짜 포맷

---

## DB 스키마 추가

CREATE TABLE IF NOT EXISTS public.ai_reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  report_type  TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly')),
  period_key   TEXT NOT NULL,
  content      JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(store_id, period_key)
);

CREATE INDEX ON public.ai_reports(store_id, report_type, generated_at DESC);

---

## 주의사항

- Claude API 키는 서버사이드 API Route에서만 사용
  클라이언트에 절대 노출 금지 (ANTHROPIC_API_KEY env)
- 리포트 생성 중 로딩 상태: 카드 skeleton 표시
- Chat 스트리밍 중 입력창 비활성화, 전송 버튼 "생성 중..." 표시
- JSON 파싱 실패 시 에러 카드 표시
  ("리포트 생성 중 오류가 발생했어요. 재생성 버튼을 눌러주세요.")
- 컨텍스트 패키지가 너무 크면 토큰 초과 가능
  → 각 도메인 데이터를 요약 수치로만 전달 (raw 레코드 전체 금지)
- Chat 대화 이력은 최대 10턴만 API에 전달 (토큰 절약)
  이전 대화는 화면에 보이지만 API에는 최근 10턴만 포함
- ai_reports UNIQUE 충돌 시 onConflict: 'store_id, period_key'로
  content + generated_at 업데이트
- 모든 금액은 toLocaleString('ko-KR') + '원' 포맷
- 날짜는 KST 기준 처리