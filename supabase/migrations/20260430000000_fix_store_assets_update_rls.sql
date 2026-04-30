-- 기존 UPDATE 정책 삭제
DROP POLICY IF EXISTS "Manage store assets (UPDATE)" ON public.store_assets;

-- 수정된 UPDATE 정책 생성
-- USING 절의 deleted_at IS NULL 조건으로 이미 삭제된 자산(복구 등)에 대한 접근은 차단
-- WITH CHECK 절에서는 deleted_at 조건을 제거하여 소프트 삭제(deleted_at 세팅)를 허용
CREATE POLICY "Manage store assets (UPDATE)" ON public.store_assets 
FOR UPDATE 
USING (
    public.is_store_member(store_id) AND deleted_at IS NULL
)
WITH CHECK (
    public.is_store_member(store_id)
    -- deleted_at 조건 제거: 소프트 삭제(UPDATE deleted_at)를 허용하기 위함
);