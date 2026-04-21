-- =================================================================================
-- LEAVEN V2 INITIAL UNIFIED SCHEMA (PATCHED)
-- 변경 내역 vs 원본:
--   [추가] store_members.wage_type 컬럼 — 기획서의 wage_type 반영
--   [추가] public.leave_balances 테이블 — 기획서 7-2 누락 항목
--   [추가] public.store_attendance_requests 테이블 — 기획서 7-2 누락 항목
--   [추가] leave_balances 트리거 및 RLS 정책
--   [추가] store_attendance_requests 트리거 및 RLS 정책
-- =================================================================================

-- 1. 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUM 타입 정의
CREATE TYPE public.member_status AS ENUM ('active', 'invited', 'pending_approval', 'inactive');
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'verified');
CREATE TYPE public.attendance_status AS ENUM ('working', 'completed', 'absent');
CREATE TYPE public.contract_status AS ENUM ('draft', 'sent', 'viewed', 'signed', 'expired', 'canceled');
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected', 'canceled');
CREATE TYPE public.asset_status AS ENUM ('active', 'needs_inspection', 'in_repair', 'disposed');
-- [추가] 출퇴근 수정 요청 상태
CREATE TYPE public.attendance_request_status AS ENUM ('pending', 'approved', 'rejected');
-- [추가] 급여 형태 (시급/월급/일급)
CREATE TYPE public.wage_type AS ENUM ('hourly', 'monthly', 'daily');

-- ==========================================
-- [도메인 1] 계정 및 플랫폼
-- ==========================================
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    is_platform_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- [도메인 2] 매장(Tenant) 및 역할(RBAC)
-- ==========================================
CREATE TABLE public.stores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    address TEXT,
    business_number TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    attendance_radius INTEGER DEFAULT 100,
    operating_hours JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.store_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#808080',
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    hierarchy_level INTEGER NOT NULL DEFAULT 0,
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_store_roles_store_id ON public.store_roles(store_id);

CREATE TABLE public.store_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id),
    role_id UUID NOT NULL REFERENCES public.store_roles(id),
    status public.member_status NOT NULL DEFAULT 'pending_approval',
    -- [변경] wage_type 추가: 기획서 7-2의 wage_type 컬럼 반영
    -- hourly(시급제, 기본값), monthly(월급제), daily(일급제)
    wage_type public.wage_type NOT NULL DEFAULT 'hourly',
    base_hourly_wage INTEGER DEFAULT 0,  -- wage_type=hourly 시 사용 (원 단위)
    base_monthly_wage INTEGER DEFAULT 0, -- wage_type=monthly 시 사용 (원 단위)
    joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_store_members_user_id ON public.store_members(user_id);
CREATE INDEX idx_store_members_store_id ON public.store_members(store_id);
-- 퇴사자 재입사 방어: 삭제되지 않은 멤버 내에서만 (매장+유저) 고유
CREATE UNIQUE INDEX idx_unique_active_member ON public.store_members(store_id, user_id) WHERE deleted_at IS NULL;

-- ==========================================
-- [도메인 3] HR, 스케줄, 연차 및 전자계약
-- ==========================================
CREATE TABLE public.schedules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.store_members(id),
    plan_date DATE NOT NULL,
    start_time TIME WITHOUT TIME ZONE NOT NULL,
    end_time TIME WITHOUT TIME ZONE NOT NULL,
    break_minutes INTEGER DEFAULT 0,
    is_ai_recommended BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_schedules_store_id ON public.schedules(store_id);
CREATE INDEX idx_schedules_member_id ON public.schedules(member_id);

CREATE TABLE public.store_attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.store_members(id),
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    target_date DATE NOT NULL,
    clock_in_time TIMESTAMPTZ,
    clock_out_time TIMESTAMPTZ,
    break_start_time TIMESTAMPTZ,
    break_end_time TIMESTAMPTZ,
    total_break_minutes INTEGER DEFAULT 0,
    status public.attendance_status DEFAULT 'working',
    snapshot_hourly_wage INTEGER,
    payroll_meta JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_attendance_member_id ON public.store_attendance(member_id);
-- 출근 "따닥" 동시성 방어
CREATE UNIQUE INDEX idx_unique_working_attendance ON public.store_attendance(member_id, target_date) WHERE status = 'working' AND deleted_at IS NULL;

-- [추가] 출퇴근 수정 요청 테이블
-- 기획서 7-2: store_attendance_requests — 누락/오류 기록에 대한 직원 수정 요청 및 결재 상태
CREATE TABLE public.store_attendance_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    attendance_id UUID REFERENCES public.store_attendance(id) ON DELETE SET NULL, -- NULL이면 신규 출근 기록 생성 요청
    member_id UUID NOT NULL REFERENCES public.store_members(id) ON DELETE CASCADE,
    requested_clock_in TIMESTAMPTZ,   -- 직원이 요청하는 출근 시각
    requested_clock_out TIMESTAMPTZ,  -- 직원이 요청하는 퇴근 시각
    reason TEXT,                       -- 수정 사유
    status public.attendance_request_status NOT NULL DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.store_members(id), -- 결재자(점주/점장)
    reviewed_at TIMESTAMPTZ,
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_attendance_requests_member_id ON public.store_attendance_requests(member_id);
CREATE INDEX idx_attendance_requests_store_id ON public.store_attendance_requests(store_id);

-- [추가] 연차 잔여일수 테이블
-- 기획서 7-2: leave_balances — 직원별 연도별 부여 총 휴가 일수 및 사용 일수
CREATE TABLE public.leave_balances (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.store_members(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,           -- 해당 연도 (예: 2026)
    total_days NUMERIC(5,1) NOT NULL DEFAULT 0, -- 부여 총 일수 (반차 지원을 위해 소수점 허용)
    used_days NUMERIC(5,1) NOT NULL DEFAULT 0,  -- 사용 일수
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(member_id, year) -- 한 멤버당 연도별 1개 레코드
);
CREATE INDEX idx_leave_balances_member_id ON public.leave_balances(member_id);
CREATE INDEX idx_leave_balances_store_id ON public.leave_balances(store_id);

CREATE TABLE public.member_contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.store_members(id) ON DELETE CASCADE,
    modusign_document_id TEXT,
    contract_type TEXT NOT NULL,
    status public.contract_status DEFAULT 'draft',
    contract_file_url TEXT,
    sent_at TIMESTAMPTZ,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_contracts_member_id ON public.member_contracts(member_id);

CREATE TABLE public.leave_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.store_members(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status public.leave_status DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.store_members(id),
    reviewed_at TIMESTAMPTZ,
    reject_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_leave_requests_member_id ON public.leave_requests(member_id);

-- ==========================================
-- [도메인 4] 업무 관리, 인수인계, 공지사항
-- ==========================================
CREATE TABLE public.store_announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.store_members(id),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_announcements_store_id ON public.store_announcements(store_id);

CREATE TABLE public.announcement_reads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id UUID NOT NULL REFERENCES public.store_announcements(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.store_members(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(announcement_id, member_id)
);

CREATE TABLE public.tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_routine BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.task_assignments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    member_id UUID REFERENCES public.store_members(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES public.schedules(id) ON DELETE SET NULL,
    assigned_date DATE NOT NULL,
    status public.task_status NOT NULL DEFAULT 'pending',
    completion_note TEXT,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.store_handovers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.store_members(id),
    target_role_id UUID REFERENCES public.store_roles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    ai_summary JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- ==========================================
-- [도메인 5 & 6] 거래처 및 자산 관리
-- ==========================================
CREATE TABLE public.vendors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    manager_name TEXT,
    contact_number TEXT,
    email TEXT,
    contract_start_date DATE,
    contract_end_date DATE,
    is_auto_renewal BOOLEAN DEFAULT false,
    contract_file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.store_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    category TEXT,
    model_name TEXT,
    manufacturer TEXT,
    serial_number TEXT,
    purchase_date DATE,
    purchase_amount INTEGER DEFAULT 0,
    warranty_expiry_date DATE,
    next_inspection_date DATE,
    status public.asset_status DEFAULT 'active',
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE public.asset_maintenance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id UUID NOT NULL REFERENCES public.store_assets(id) ON DELETE CASCADE,
    maintenance_date DATE NOT NULL,
    maintenance_type TEXT,
    cost INTEGER DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMPTZ
);

-- =================================================================================
-- 🚀 [자동화 로직] 함수 및 트리거 (Functions & Triggers)
-- =================================================================================

-- 회원가입 자동화
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- updated_at 갱신 함수
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 모든 테이블에 트리거 적용
CREATE TRIGGER update_profiles_modtime BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_stores_modtime BEFORE UPDATE ON public.stores FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_store_roles_modtime BEFORE UPDATE ON public.store_roles FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_store_members_modtime BEFORE UPDATE ON public.store_members FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_schedules_modtime BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_store_attendance_modtime BEFORE UPDATE ON public.store_attendance FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
-- [추가] 새 테이블 트리거
CREATE TRIGGER update_attendance_requests_modtime BEFORE UPDATE ON public.store_attendance_requests FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_leave_balances_modtime BEFORE UPDATE ON public.leave_balances FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_member_contracts_modtime BEFORE UPDATE ON public.member_contracts FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_leave_requests_modtime BEFORE UPDATE ON public.leave_requests FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_announcements_modtime BEFORE UPDATE ON public.store_announcements FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_tasks_modtime BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_task_assignments_modtime BEFORE UPDATE ON public.task_assignments FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_store_handovers_modtime BEFORE UPDATE ON public.store_handovers FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_vendors_modtime BEFORE UPDATE ON public.vendors FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_store_assets_modtime BEFORE UPDATE ON public.store_assets FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();
CREATE TRIGGER update_asset_maintenance_logs_modtime BEFORE UPDATE ON public.asset_maintenance_logs FOR EACH ROW EXECUTE PROCEDURE public.update_modified_column();

-- =================================================================================
-- 🛡️ [보안 정책] RLS (Row Level Security) 설정
-- =================================================================================

-- 1. RLS 활성화
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_attendance_requests ENABLE ROW LEVEL SECURITY; -- [추가]
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;            -- [추가]
ALTER TABLE public.member_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 2. 매장 소속 확인 헬퍼 함수 (캐싱으로 N+1 쿼리 최적화)
CREATE OR REPLACE FUNCTION public.is_store_member(store_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = store_id_param
    AND user_id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL
  );
END;
$$;

-- 3. 테넌트 격리 읽기(SELECT) 정책
CREATE POLICY "View allowed stores" ON public.stores FOR SELECT USING (public.is_store_member(id) AND deleted_at IS NULL);
CREATE POLICY "View store roles" ON public.store_roles FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View store members" ON public.store_members FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View schedules" ON public.schedules FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View attendance" ON public.store_attendance FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
-- [추가] 출퇴근 수정 요청: 같은 매장 멤버만 조회 가능
CREATE POLICY "View attendance requests" ON public.store_attendance_requests FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
-- [추가] 연차 잔여일수: 같은 매장 멤버만 조회 가능
CREATE POLICY "View leave balances" ON public.leave_balances FOR SELECT USING (public.is_store_member(store_id));
CREATE POLICY "View contracts" ON public.member_contracts FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View leave requests" ON public.leave_requests FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View announcements" ON public.store_announcements FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View announcement reads" ON public.announcement_reads FOR SELECT USING (public.is_store_member((SELECT store_id FROM public.store_announcements WHERE id = announcement_id)));
CREATE POLICY "View tasks" ON public.tasks FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View task assignments" ON public.task_assignments FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View handovers" ON public.store_handovers FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View vendors" ON public.vendors FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View store assets" ON public.store_assets FOR SELECT USING (public.is_store_member(store_id) AND deleted_at IS NULL);
CREATE POLICY "View asset logs" ON public.asset_maintenance_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.store_assets WHERE store_assets.id = asset_maintenance_logs.asset_id AND public.is_store_member(store_assets.store_id)) AND deleted_at IS NULL
);