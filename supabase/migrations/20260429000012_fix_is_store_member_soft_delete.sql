-- RLS 오류 원인 파악됨: Update 후의 'new row'가 WITH CHECK 조건을 통과해야 하는데, 
-- 우리의 UPDATE 조건은 `is_store_member(store_id)` 임.
-- 그러나 is_store_member() 함수 내부를 보면:
-- AND deleted_at IS NULL 조건이 들어있음! (점포 멤버가 active이고 탈퇴/삭제되지 않았는지 검사)
-- 문제 발생 이유: is_store_member 내부 쿼리는 기본적으로 SELECT 이므로 
-- 만약 우리가 tasks.deleted_at = NOW()로 업데이트하는 순간, 
-- 트랜잭션 문맥상 아직 완벽하게 격리되지 않은 경우 뭔가 충돌하거나, 
-- 혹은 RLS WITH CHECK에서 is_store_member() 내부의 조회 쿼리가 무언가 영향을 받을 수 있음.
-- 하지만 is_store_member는 store_members 테이블을 조회하는 것이므로 tasks 테이블과는 무관함.

-- 진짜 원인:
-- RLS "View tasks" 정책에 `deleted_at IS NULL`이 있음.
-- PostgreSQL RLS에서 UPDATE 구문을 실행할 때, 행을 읽어오는 단계(SELECT)에서 
-- "View tasks" 정책을 만족해야 업데이트 대상을 찾을 수 있음.
-- 대상은 찾아짐 (deleted_at이 아직 NULL이므로).
-- 하지만, UPDATE 후 반환되는 데이터 (RETURNING)가 있거나 내부적으로 PostgREST가 
-- 변경된 행을 반환하기 위해 SELECT를 다시 수행할 때, 
-- 업데이트되어 deleted_at이 더 이상 NULL이 아니게 된 행은 "View tasks" 정책을 통과하지 못함!
-- PostgREST는 자기가 방금 업데이트한 행을 SELECT로 다시 읽을 수 없으면 
-- "new row violates row-level security policy" (42501) 혹은 유사한 오류를 던짐.

-- 해결책:
-- PostgREST나 Supabase 클라이언트를 통한 UPDATE의 경우, 
-- 업데이트 결과가 SELECT 정책을 만족하지 않으면 오류가 발생할 수 있습니다 (방금 지워졌으므로 안보임).
-- 이를 피하려면, 
-- 1) 클라이언트에서 `.update({...}).eq(...).select()` 와 같이 반환을 요구하지 않도록 하거나
-- 2) View tasks 정책을 `deleted_at IS NULL`에 의존하지 않도록 하거나
-- 3) 삭제 행위 전용 RPC (delete_task)를 생성하여 RLS 우회 처리하는 것이 가장 안전합니다.
-- 이미 deleteTasksByPeriod는 RPC로 되어있습니다! 단일 삭제도 RPC로 만들어 호출하는 것이 확실합니다.

CREATE OR REPLACE FUNCTION public.soft_delete_task(task_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- RLS 우회
AS $$
DECLARE
  v_store_id UUID;
  rows_affected INT;
BEGIN
  -- 1. 권한 확인을 위해 store_id 조회
  SELECT store_id INTO v_store_id FROM public.tasks WHERE id = task_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Task not found');
  END IF;

  -- 2. 해당 점포의 관리자(manage_tasks 권한)인지 확인
  -- (actions.ts에서 이미 확인하고 들어오지만 DB 레벨에서 한번 더 보호)
  IF NOT public.can_manage_tasks(v_store_id) THEN
    RETURN json_build_object('success', false, 'error', 'Permission denied');
  END IF;

  -- 3. 실제 소프트 삭제 실행
  UPDATE public.tasks 
  SET deleted_at = NOW() 
  WHERE id = task_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN json_build_object('success', true, 'rows_affected', rows_affected);
END;
$$;
