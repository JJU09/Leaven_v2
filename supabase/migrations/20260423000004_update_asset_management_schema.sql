-- ==========================================
-- asset_status ENUM 재정의
-- ==========================================
-- 기존 ENUM이 있다면 먼저 확인 후 추가
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'needs_inspection';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'under_repair';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'as_submitted';
ALTER TYPE public.asset_status ADD VALUE IF NOT EXISTS 'disposed';
-- 'active' 는 기존에 있다고 가정

-- ==========================================
-- store_assets 컬럼 추가
-- ==========================================
ALTER TABLE public.store_assets
    ADD COLUMN IF NOT EXISTS installation_location TEXT,
    ADD COLUMN IF NOT EXISTS as_vendor_name        TEXT,
    ADD COLUMN IF NOT EXISTS as_contact            TEXT,
    ADD COLUMN IF NOT EXISTS as_url                TEXT,
    ADD COLUMN IF NOT EXISTS as_usage_count        INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS notes                 TEXT;

-- ==========================================
-- asset_maintenance_logs 컬럼 추가 + ENUM 전환
-- ==========================================
ALTER TABLE public.asset_maintenance_logs
    ADD COLUMN IF NOT EXISTS next_inspection_date DATE,
    ADD COLUMN IF NOT EXISTS performed_by         TEXT;

-- maintenance_type을 CHECK 제약으로 안전하게 제한
ALTER TABLE public.asset_maintenance_logs
    ADD CONSTRAINT chk_maintenance_type
    CHECK (maintenance_type IN ('regular', 'breakdown', 'replacement'));

-- ==========================================
-- asset_status_logs — 신규 (상태 변경 이력)
-- ==========================================
CREATE TABLE IF NOT EXISTS public.asset_status_logs (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    asset_id    UUID NOT NULL REFERENCES public.store_assets(id) ON DELETE CASCADE,
    from_status public.asset_status,               -- NULL 허용: 최초 등록 시
    to_status   public.asset_status NOT NULL,
    changed_by  TEXT,                              -- 추후 staff_id FK로 교체 가능
    note        TEXT,
    created_at  TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 조회 성능용 인덱스
CREATE INDEX IF NOT EXISTS idx_asset_status_logs_asset_id
    ON public.asset_status_logs(asset_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_asset_maintenance_logs_asset_id
    ON public.asset_maintenance_logs(asset_id, maintenance_date DESC);