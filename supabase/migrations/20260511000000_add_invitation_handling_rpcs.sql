-- 초대 수락 RPC (Security Definer로 권한 우회)
-- 점장이 초대한 경우이므로 수락 즉시 active 상태로 변경
CREATE OR REPLACE FUNCTION accept_invitation(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE store_members
  SET 
    status = 'active',
    joined_at = NOW()
  WHERE 
    store_id = p_store_id 
    AND user_id = auth.uid() 
    AND status = 'invited';

  IF NOT FOUND THEN
    RAISE EXCEPTION '초대 정보를 찾을 수 없거나 이미 처리되었습니다.';
  END IF;
END;
$$;

-- 초대 거절 RPC (Security Definer로 권한 우회)
-- 수기 등록 정보를 보존하기 위해 user_id만 null로 밀고 다시 active(수기상태)로 원복
CREATE OR REPLACE FUNCTION reject_invitation(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE store_members
  SET 
    user_id = NULL,
    status = 'active'
  WHERE 
    store_id = p_store_id 
    AND user_id = auth.uid() 
    AND status = 'invited';

  IF NOT FOUND THEN
    RAISE EXCEPTION '초대 정보를 찾을 수 없거나 이미 처리되었습니다.';
  END IF;
END;
$$;

-- 가입 요청 취소 RPC (Security Definer로 권한 우회)
-- 직원이 직접 신청(pending_approval)한 경우이므로 레코드 삭제
CREATE OR REPLACE FUNCTION cancel_join_request(p_store_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM store_members
  WHERE 
    store_id = p_store_id 
    AND user_id = auth.uid() 
    AND status = 'pending_approval';

  IF NOT FOUND THEN
    RAISE EXCEPTION '가입 요청 정보를 찾을 수 없거나 이미 처리되었습니다.';
  END IF;
END;
$$;