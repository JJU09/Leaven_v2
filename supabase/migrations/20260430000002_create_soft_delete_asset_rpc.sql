-- 자산 소프트 삭제용 RPC 생성
-- Next.js 서버 액션 환경에서 RLS(특히 WITH CHECK)와 auth.uid() 평가 시 발생하는 충돌을 우회하고
-- 명시적인 보안 검증을 통해 안전하게 삭제 처리를 하기 위한 함수입니다.

CREATE OR REPLACE FUNCTION public.soft_delete_asset(
  p_asset_id UUID,
  p_store_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- RLS를 우회하여 아래 코드 내에서 명시적으로 권한을 검증함
SET search_path = public
AS $$
BEGIN
  -- 1. 매장 멤버(권한) 검증
  IF NOT public.is_store_member(p_store_id) THEN
    RAISE EXCEPTION 'permission denied: user is not an active member of the store';
  END IF;

  -- 2. 자산 존재 여부 및 이미 삭제되었는지 검증 (소속 매장의 자산인지도 함께 검증)
  IF NOT EXISTS (
    SELECT 1 FROM public.store_assets 
    WHERE id = p_asset_id 
      AND store_id = p_store_id 
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'asset not found, already deleted, or belongs to another store';
  END IF;

  -- 3. 소프트 삭제 처리 (deleted_at 업데이트)
  UPDATE public.store_assets
  SET deleted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_asset_id
    AND store_id = p_store_id;

END;
$$;