# 매장 관리자 대시보드 페이지 구현

## 기술 스택 & 전제 조건
- Next.js (App Router), TypeScript, Tailwind CSS, Supabase
- 컴포넌트 라이브러리: shadcn/ui
- 상태관리: TanStack Query (서버 상태)
- 기존 프로젝트에 stores, store_assets, vendors, vendor_transactions,
  staff, attendance, leave_requests 테이블이 있고
  store_id는 컨텍스트에서 가져옴
- 라우트: /dashboard

---

## 페이지 목표
관리자가 접속 즉시 "오늘 매장에서 뭐가 문제인가"를 3초 안에 파악할 수 있어야 한다.
모든 데이터는 오늘 하루 기준이며, 각 카드는 해당 상세 페이지로 이동하는 링크를 포함한다.

---

## 데이터 소스 & 쿼리

### 1. 상단 메트릭 4개 (병렬 fetch)

// 오늘 출근 현황
// staff 중 오늘 출근 예정인 인원 vs 실제 출근(attendance) 인원
SELECT COUNT(*) FROM staff
WHERE store_id = $storeId AND is_active = true AND work_today = true

SELECT COUNT(*) FROM attendance
WHERE store_id = $storeId
  AND date = today
  AND clock_in IS NOT NULL

// 이번 주 승인된 연차
SELECT COUNT(*) FROM leave_requests
WHERE store_id = $storeId
  AND status = 'approved'
  AND leave_date BETWEEN thisWeekStart AND thisWeekEnd

// 30일 이내 점검 필요 자산
SELECT COUNT(*) FROM store_assets
WHERE store_id = $storeId
  AND deleted_at IS NULL
  AND (
    next_inspection_date BETWEEN today AND today+30
    OR warranty_expiry_date BETWEEN today AND today+30
  )

// 30일 이내 계약 만료 거래처
SELECT COUNT(*) FROM vendors
WHERE store_id = $storeId
  AND deleted_at IS NULL
  AND contract_end_date BETWEEN today AND today+30
  AND is_auto_renewal = false

### 2. 알림·할일 목록
우선순위: 긴급(red) → 주의(amber) → 정보(blue) 순 정렬

수집 대상:
- warranty_expiry_date 또는 next_inspection_date가 30일 이내인 store_assets
  → type: 'asset_warning', severity: D-day 기준 (≤14: red, ≤30: amber)
- contract_end_date 30일 이내 + is_auto_renewal=false인 vendors
  → type: 'vendor_contract', severity: D-day 기준
- status='pending'인 leave_requests
  → type: 'leave_pending', severity: 'amber'
- 오늘 clock_in이 없고 출근 예정 시각이 지난 staff
  → type: 'attendance_late', severity: 'amber'

클라이언트에서 severity 순 + D-day 오름차순으로 정렬.
최대 10건 표시, 초과 시 "N건 더 보기" 텍스트.

### 3. 오늘 출퇴근 현황
supabase
  .from('staff')
  .select(`
    id, name, role,
    attendance!inner(clock_in, clock_out, date),
    leave_requests(status, leave_date)
  `)
  .eq('store_id', storeId)
  .eq('is_active', true)
  .eq('attendance.date', today)

상태 판별 로직 (클라이언트):
- leave_requests에 오늘 날짜 + status='approved' → '연차'
- clock_in 있음 → '출근'
- 출근 예정 시각 초과 + clock_in 없음 → '지각'
- 출근 예정 시각 미도래 → '미확인'

### 4. 이번 주 근무 인원 (바 차트)
월~금 각 날짜별 출근 예정 인원 vs 실제 출근 인원
supabase
  .from('attendance')
  .select('date, COUNT(*)')
  .eq('store_id', storeId)
  .gte('date', thisWeekMonday)
  .lte('date', thisWeekFriday)
  .not('clock_in', 'is', null)
  .group('date')

### 5. 연차 현황
// 이번 달 신청 목록
supabase
  .from('leave_requests')
  .select('*, staff(name, role)')
  .eq('store_id', storeId)
  .gte('leave_date', startOfMonth)
  .lte('leave_date', endOfMonth)
  .order('leave_date', { ascending: true })

// 잔여 연차 (staff별)
supabase
  .from('staff')
  .select('id, name, annual_leave_total, annual_leave_used')
  .eq('store_id', storeId)
  .eq('is_active', true)

### 6. 자산 현황 요약
supabase
  .from('store_assets')
  .select('id, status, next_inspection_date, warranty_expiry_date, name')
  .eq('store_id', storeId)
  .is('deleted_at', null)

클라이언트에서:
- status별 카운트 집계
- 점검 임박 (next_inspection_date 또는 warranty_expiry_date ≤ today+30) 목록 → D-day 오름차순 최대 3건

### 7. 거래처 현황 요약
supabase
  .from('vendors')
  .select('id, name, contract_end_date, is_auto_renewal, contract_type')
  .eq('store_id', storeId)
  .is('deleted_at', null)

supabase
  .from('vendor_transactions')
  .select('id, vendor_id, amount, payment_status, transaction_date, vendors(name)')
  .eq('store_id', storeId)
  .in('payment_status', ['unpaid', 'partial'])
  .is('deleted_at', null)
  .order('transaction_date', { ascending: true })
  .limit(3)

---

## 컴포넌트 구조

### 레이아웃
- 상단 인사말 바: "좋은 아침이에요, {점주명}님" + 오늘 날짜/시각 + 영업 상태 뱃지
- 메트릭 카드 4개 (2×2 또는 4열 가로)
- 2열 그리드: [알림·할일] [출퇴근 현황]
- 2열 그리드: [주간 근무 바 차트] [연차·휴가 현황]
- 2열 그리드: [자산 현황] [거래처 현황]

### MetricCard
props: label, value, total?, subText, subType('ok'|'warn'|'danger')
- subType에 따라 서브텍스트 색상 변경
- value/total 형태일 때 total을 muted로 표시

### AlertList
- 알림 항목: dot색상(red/amber/blue) + 제목 + 서브텍스트 + 액션 링크
- 액션 링크 클릭 시 해당 페이지로 router.push
  - asset_warning → /dashboard/assets?highlight={assetId}
  - vendor_contract → /dashboard/vendors?highlight={vendorId}
  - leave_pending → /dashboard/staff/leaves?id={requestId}
  - attendance_late → /dashboard/staff/attendance

### AttendanceList
- 직원별 행: 아바타(이름 이니셜, 직급별 색상) + 이름 + 직급 + 상태뱃지 + 시각
- 상태뱃지: 출근(green) / 지각(amber) / 연차(blue) / 퇴근(gray) / 미확인(gray outline)
- 실시간 갱신: 30초마다 TanStack Query refetch (refetchInterval: 30_000)

### WeeklyScheduleChart
- 순수 CSS 가로 바 차트 (Chart.js 불필요)
- 오늘 날짜 바를 진한 파랑(#185FA5)으로 강조, 나머지는 연한 파랑(#B5D4F4)
- 바 내부에 "N명" 텍스트 표시
- 오른쪽에 "N/전체" 카운터

### LeavePanel
상단: 이번 달 신청 목록 (신청자명 + 날짜 + 일수 + 승인상태뱃지)
  - 대기 중인 항목 클릭 시 /dashboard/staff/leaves로 이동
하단: 잔여 연차 바 (직원별 used/total 비율 바, 80%↑ red, 60%↑ amber, 나머지 blue)

### AssetSummaryCard
상단: 전체/정상/점검중/폐기 카운터 미니 그리드
하단: D-day 임박 자산 최대 3건 목록
  - D-day 계산: differenceInDays(inspectionDate, today)
  - ≤14 → red 뱃지, ≤30 → amber 뱃지

### VendorSummaryCard
상단: 전체/만료임박/미결제 카운터 미니 그리드
중단: 계약 만료 임박 거래처 목록
하단: 미결제 거래 목록 (거래처명 + 날짜 + 금액)

---

## 데이터 갱신 전략

| 데이터 | refetchInterval |
|---|---|
| 출퇴근 현황 | 30초 |
| 알림·할일 | 5분 |
| 메트릭 카드 | 5분 |
| 자산·거래처 요약 | 없음 (수동 or 페이지 포커스) |
| 주간 스케줄 | 없음 |
| 연차 현황 | 없음 |

TanStack Query 설정:
- staleTime: 60_000 (기본)
- refetchOnWindowFocus: true
- 출퇴근: refetchInterval: 30_000

---

## 알림 우선순위 정렬 로직

type AlertItem = {
  type: 'asset_warning' | 'vendor_contract' | 'leave_pending' | 'attendance_late'
  severity: 'red' | 'amber' | 'blue'
  dDay?: number        // D-day (숫자가 작을수록 긴급)
  title: string
  subText: string
  actionLabel: string
  actionHref: string
}

정렬 순서:
1. severity: red → amber → blue
2. severity 동일 시 dDay 오름차순
3. dDay 없는 항목은 severity 그룹 맨 뒤

---

## 날짜 유틸리티

모든 날짜 계산은 date-fns 사용:
- today: startOfDay(new Date())
- thisWeekMonday: startOfWeek(today, { weekStartsOn: 1 })
- thisWeekFriday: endOfWeek(today, { weekStartsOn: 1 }) - 2days
- startOfMonth: startOfMonth(today)
- dDay: differenceInDays(targetDate, today)
  → 양수: 미래, 음수: 만료

---

## 파일 구조

app/dashboard/
  page.tsx                          # 서버 컴포넌트, 초기 prefetch
  _components/
    DashboardGreeting.tsx           # 인사말 + 날짜 + 영업상태
    MetricCard.tsx
    AlertList.tsx
    AttendanceList.tsx
    WeeklyScheduleChart.tsx
    LeavePanel.tsx
    AssetSummaryCard.tsx
    VendorSummaryCard.tsx
  _hooks/
    useDashboard.ts                 # 병렬 쿼리 묶음
    useAttendanceToday.ts           # 30초 refetch
  _utils/
    alertBuilder.ts                 # 각 소스 → AlertItem 변환 + 정렬
    dateHelpers.ts                  # 공통 날짜 유틸

---

## 주의사항

- 모든 Supabase 쿼리에 deleted_at IS NULL 조건 필수
- 날짜 비교는 항상 서버 타임존(UTC) 기준으로 처리,
  클라이언트 표시만 로컬 타임존 변환 (date-fns-tz 사용)
- 메트릭 숫자는 toLocaleString('ko-KR') 포맷
- 금액 표시는 toLocaleString('ko-KR') + '원'
- 알림 목록이 비어 있으면 "오늘 처리할 알림이 없어요" 빈 상태 표시
- 출퇴근 카드가 비어 있으면 "오늘 출근 예정 직원이 없어요" 빈 상태 표시
- 각 카드 우측 상단 "전체 보기 →" 링크는 Next.js Link 컴포넌트로 구현
- store_id Row Level Security로 타 매장 데이터 접근 차단 확인
- 모든 쿼리 키 패턴: ['dashboard', storeId, 'metric' | 'alerts' | 'attendance' | ...]