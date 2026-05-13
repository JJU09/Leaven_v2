# Leaven v2 Project Context

## Domain Glossary (핵심 도메인 용어)

*   **Store (매장/지점)**: 시스템의 최상위 테넌트(Tenant). 모든 비즈니스 데이터는 Store에 종속됩니다.
*   **Store Member (매장 멤버/직원)**: Store에 소속된 사용자(Profile). 
*   **Role (권한/직급)**: 매장 내 직원의 권한 레벨 및 직급. `store_roles` 테이블에서 관리됩니다.
*   **Attendance (근태)**: 직원의 출퇴근 기록. 지각(`is_late`) 여부 및 근태 요청(`attendance_requests`)을 포함합니다.
*   **Schedule (일정/시프트)**: 직원의 근무 예정 시간표. AI 기반 초안(`ai-draft`) 및 대량 생성 기능을 지원합니다.
*   **Leave (휴가)**: 직원의 휴가 신청(`Leave Request`) 및 잔여 연차(`Leave Balance`).
*   **Task (업무)**: 직원에게 할당된 작업. 체크리스트, 상태(진행/대기/완료), 보류(`on_hold`) 상태를 가집니다.
*   **Announcement (공지사항)**: 매장 내 소통 채널. AI 요약 기능 및 읽음 확인(`Reads`) 기능을 포함합니다.
*   **Asset (자산)**: 매장의 비품 및 관리 대상 자산.
*   **Vendor (거래처)**: 매장과 거래하는 외부 업체. 거래 내역(`Transactions`)과 은행 정보(`Bank`)를 포함합니다.
*   **Contract (근로계약)**: ModuSign과 연동되는 직원의 전자 근로계약.
*   **Payroll (급여)**: 시급/일급/연봉 등 다양한 급여 체계(`Wage Type`)를 바탕으로 계산되는 급여 정보.
    * `GrossPay` (세전총액), `NetPay` (실지급액), `Deduction` (공제액) 개념을 포함합니다.
    * `Confirm` (급여 확정) 시 변경 불가능한 스냅샷 데이터로 보존됩니다.
*   **AI Report (AI 리포트)**: 매장 운영 현황을 일간/주간/월간 단위로 요약해주는 지능형 보고서.

## Architecture & Data Flow

### Technical Stack
*   **Framework**: Next.js 15 (App Router)
*   **Language**: TypeScript (Strict mode)
*   **Styling**: Tailwind CSS + shadcn/ui
*   **Database & Auth**: Supabase (PostgreSQL + RLS)
*   **AI**: OpenAI API
*   **State Management**: React Query (TanStack Query)

### Folder Structure (Feature-Sliced Design Approach)
*   `src/app/`: 라우팅 및 페이지 컴포넌트. 비즈니스 로직은 최소화하고 레이아웃과 페이지 구성에 집중.
*   `src/features/`: 도메인별 핵심 로직. `actions.ts`(Server Actions), `components/`(도메인 특화 UI), `types.ts` 등이 포함됨.
*   `src/components/ui/`: 프로젝트 전반에서 재사용되는 기반 UI 컴포넌트 (Design System).
*   `src/lib/`: 외부 라이브러리 설정(Supabase, OpenAI) 및 핵심 유틸리티.
*   `src/shared/`: 특정 도메인에 속하지 않는 공통 유틸리티, 훅, 레이아웃 컴포넌트.

### Data Flow
1.  **Read**: 클라이언트 컴포넌트에서 React Query를 사용하거나 서버 컴포넌트에서 Supabase를 직접 호출하여 데이터 조회.
2.  **Write**: `src/features/[domain]/actions.ts`의 Server Action을 통해 데이터 변경 수행.
3.  **Security**: Supabase의 Row Level Security(RLS) 정책이 모든 DB 접근의 권한 검사(Store ID 기준)를 강제함.
4.  **AI Integration**: `src/app/api/ai-report/` 등의 경로에서 복잡한 프롬프트 엔지니어링 및 데이터 정제 후 AI 결과 반환.

## Core Rules & Principles
*   모든 데이터 조회 및 조작은 반드시 `store_id`를 기준으로 격리되어야 함.
*   UI 컴포넌트는 `src/components/ui`의 기본 요소를 조합하여 일관성을 유지함.
*   비즈니스 로직의 변경은 가급적 해당 도메인의 `features/` 폴더 내에서 완결함.