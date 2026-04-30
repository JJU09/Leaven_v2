-- 모든 store_assets 관련 기존 UPDATE 및 DELETE 정책을 완전히 삭제하고 깔끔하게 재생성합니다.
DROP POLICY IF EXISTS "Manage store assets (UPDATE)" ON public.store_assets;
DROP POLICY IF EXISTS "Manage store assets (DELETE)" ON public.store_assets;

-- UPDATE: 수정 전/후 모두 매장 멤버여야 함.
-- 소프트 삭제(deleted_at 갱신)를 허용하기 위해 WITH CHECK 에서는 deleted_at 조건을 제외합니다.
CREATE POLICY "Manage store assets (UPDATE)" ON public.store_assets 
FOR UPDATE 
USING (
    public.is_store_member(store_id) AND deleted_at IS NULL
)
WITH CHECK (
    public.is_store_member(store_id)
);

-- DELETE: 실제로 행을 지우는 경우(Hard delete)에 대비해 정책 유지
CREATE POLICY "Manage store assets (DELETE)" ON public.store_assets 
FOR DELETE 
USING (
    public.is_store_member(store_id)
);