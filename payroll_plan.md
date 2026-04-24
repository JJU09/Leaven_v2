## DB 스키마

-- store_members (기존 컬럼 + 추가 컬럼)
wage_type('hourly'|'daily'|'monthly'|'yearly'),
base_hourly_wage, base_daily_wage, base_monthly_wage, base_yearly_wage

-- payroll_records
id, store_id, staff_id(FK→store_members),
period_year, period_month, wage_type,
work_days, work_hours, overtime_hours, weekly_holiday_pay,
base_pay, overtime_pay, gross_pay,
income_tax, local_income_tax,
national_pension, health_insurance,
employment_insurance, long_term_care,
total_deduction, net_pay,
status('draft'|'confirmed'|'paid'),
confirmed_at, paid_at, note,
created_at, updated_at

UNIQUE(staff_id, period_year, period_month)

---

## 페이지 레이아웃 (/dashboard/payroll)

### 상단 헤더
- 페이지 제목 "급여 정산"
- 미확정 건수 뱃지
- "명세서 일괄 출력" 버튼
- "급여 일괄 확정" 버튼 (draft → confirmed 일괄 전환, 확인 Dialog 필수)

### 요약 메트릭 카드 4개
- 이번 달 총 급여 (gross_pay 합산)
- 공제 합계 (total_deduction 합산)
- 실수령 합계 (net_pay 합산)
- 정산 현황 (confirmed+paid 수 / 전체)

### 툴바
- 월 선택 select (기본값: 현재 월)
- 급여 유형 필터 (시급/일급/월급/연봉)
- 상태 필터 (미확정/확정/지급완료)
- 우측: 정산 기간 텍스트 표시

### 급여 목록 테이블
컬럼:
| 체크박스 | 직원(아바타+이름+직급) | 유형 뱃지 | 근무일수 | 총 근무시간 |
| 기본급 | 추가수당 | 공제액 | 실수령액 | 상태 뱃지 |

- 금액 컬럼 우측 정렬, toLocaleString('ko-KR') 포맷
- 추가수당 없으면 '—', 있으면 green '+N원'
- 공제액 없으면 '—', 있으면 red '-N원'
- 행 클릭 시 하단 상세 패널 열림

---

## 자동 계산 로직

### 정산 생성 시 (월 선택 → "정산 생성" or 자동)
해당 월의 attendance 레코드를 집계:

1. work_days: clock_in IS NOT NULL인 날짜 수
2. work_hours: SUM(clock_out - clock_in) in hours
3. overtime_hours (시급/일급만):
   - 일 8시간 초과분 합산
   - SUM(MAX(daily_hours - 8, 0))

4. base_pay 계산:
   - hourly: work_hours × staff.base_hourly_wage
   - daily: work_days × staff.base_daily_wage
   - monthly: staff.base_monthly_wage (고정)
   - yearly: ROUND(staff.base_yearly_wage / 12)

5. overtime_pay (시급/일급만):
   - overtime_hours × base_hourly_wage × 1.5
   - monthly/yearly: base_hourly_wage 기반으로 계산

6. weekly_holiday_pay (시급만):
   - 주 15시간 이상 근무한 주 × (1일 평균 근무시간 × base_hourly_wage)
   - 단순화: 주 15h 이상 충족한 주 수 × base_hourly_wage × 8

7. gross_pay = base_pay + overtime_pay + weekly_holiday_pay

8. total_deduction, net_pay: 공제 입력 전까지 0으로 초기화

모든 계산은 서버사이드 함수(Supabase RPC or API Route)에서 처리.

---

## 상세 패널 (행 클릭 시 하단 슬라이드)

헤더: 아바타 + 직원명 + 급여 유형 + [닫기] [명세서 출력] [확정하기] 버튼

2열 레이아웃:

좌측 — 근무 내역:
근무일수, 총 근무시간, 연장근무시간, 주휴수당 발생 여부
(월급/연봉은 주휴수당 '해당없음' 표시)

우측 — 급여 계산:
기본급, 연장수당, 소득세(-), 4대보험(-) 각 항목
→ 소득세/보험 항목은 수정 가능 (인라인 number input)
→ 수정 시 net_pay 실시간 재계산

하단 합계 바:
gross_pay - total_deduction = net_pay 수식 표시 + 최종 실수령액

공제 수동 조정 안내 인포박스:
"소득세·4대보험 금액을 직접 수정할 수 있어요."

액션 버튼:
[이전 달 비교] [이 직원 급여 확정]

---

## 공제액 수동 입력 UX

상세 패널에서 공제 항목(income_tax, national_pension 등) 클릭 시
인라인 number input으로 전환.

변경 즉시:
1. total_deduction = 모든 공제 항목 합산 (클라이언트 계산)
2. net_pay = gross_pay - total_deduction (클라이언트 계산)
3. 500ms debounce 후 payroll_records UPDATE (Supabase)

---

## 상태 전환

draft → confirmed:
- 단건: 상세 패널 "확정하기" 버튼
- 일괄: 테이블 체크박스 선택 후 "일괄 확정" → 확인 Dialog
- confirmed_at = now() 기록

confirmed → paid:
- 테이블 행 ··· 메뉴에서 "지급 완료 처리"
- paid_at = now() 기록

paid 상태는 수정 불가 (읽기 전용)

---

## 명세서 출력

단건 또는 일괄로 급여 명세서 PDF 생성.
브라우저 window.print() 기반으로 구현.
print-only CSS로 명세서 레이아웃 별도 정의.

명세서 포함 내용:
- 매장명, 직원명, 정산 기간
- 근무 내역 (일수, 시간, 연장)
- 급여 내역 (기본급, 수당 항목별)
- 공제 내역 (항목별)
- 실수령액
- 확정일, 지급일

---

## Supabase 쿼리 패턴

// 월별 목록 조회
supabase
  .from('payroll_records')
  .select('*, store_members(id, user_id, role_id, wage_type, base_hourly_wage, base_daily_wage, base_monthly_wage, base_yearly_wage)')
  .eq('store_id', storeId)
  .eq('period_year', year)
  .eq('period_month', month)
  .order('store_members(id)', { ascending: true })

// 정산 자동 생성 (월 변경 시)
// attendance 집계 후 payroll_records UPSERT
supabase
  .from('payroll_records')
  .upsert({
    store_id, staff_id, period_year, period_month,
    wage_type, work_days, work_hours, overtime_hours,
    base_pay, overtime_pay, weekly_holiday_pay, gross_pay,
    status: 'draft'
  }, { onConflict: 'staff_id, period_year, period_month' })

// 공제 수동 업데이트
supabase
  .from('payroll_records')
  .update({
    income_tax, local_income_tax, national_pension,
    health_insurance, employment_insurance, long_term_care,
    total_deduction, net_pay, updated_at: now()
  })
  .eq('id', recordId)

// 일괄 확정
supabase
  .from('payroll_records')
  .update({ status: 'confirmed', confirmed_at: now() })
  .in('id', selectedIds)
  .eq('status', 'draft')

---

## 파일 구조

app/dashboard/payroll/
  page.tsx
  _components/
    PayrollSummaryCards.tsx      # 요약 메트릭 4개
    PayrollTable.tsx             # 목록 테이블
    PayrollDetailPanel.tsx       # 하단 상세 패널
    DeductionEditor.tsx          # 공제 인라인 편집
    PayrollConfirmDialog.tsx     # 일괄 확정 확인 Dialog
    PayrollPrintView.tsx         # 명세서 출력 레이아웃
  _hooks/
    usePayroll.ts                # 월별 목록 조회
    usePayrollDetail.ts          # 단건 상세
    usePayrollMutations.ts       # upsert/update/confirm/paid
    usePayrollCalculator.ts      # 자동 계산 로직
  _utils/
    payrollCalculator.ts         # 급여 계산 순수 함수
    deductionCalculator.ts       # 공제 합산 + net_pay 계산
  _types/
    payroll.types.ts

---

## 주의사항
- paid 상태 레코드는 어떤 필드도 수정 불가, 모든 input disabled
- UNIQUE(staff_id, period_year, period_month) 충돌 시
  upsert onConflict로 처리 (기존 draft 덮어쓰기 허용)
- 금액은 모두 INTEGER (원 단위), 소수점 없음
- 연장수당 계산 시 base_hourly_wage가 0이면 계산 건너뜀
- 월급/연봉의 base_hourly_wage는 (월급 × 12) ÷ (209 × 12) 공식으로
  직원 등록 시 자동 계산해서 저장
  (209시간 = 주 40시간 기준 월 소정근로시간)
- 모든 mutation 후 ['payroll', storeId, year, month] 쿼리 키 invalidate
- 정산 생성은 해당 월이 완전히 끝난 후에만 가능하도록
  period_month < 현재 월 조건 체크