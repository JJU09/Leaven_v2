CREATE OR REPLACE FUNCTION public.test_soft_delete_task(task_id UUID, user_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res json;
BEGIN
  -- We shouldn't use security definer if we want to test RLS properly
  -- Let's just create a non-security definer RPC to run as the user
  RETURN json_build_object('msg', 'Use non-security definer RPC for RLS test');
END;
$$;

CREATE OR REPLACE FUNCTION public.test_rls_soft_delete(task_id UUID)
RETURNS json
LANGUAGE plpgsql
-- NOT SECURITY DEFINER -> runs as caller
AS $$
DECLARE
  rows_affected INT;
  err_msg TEXT;
  err_detail TEXT;
BEGIN
  BEGIN
    UPDATE public.tasks 
    SET deleted_at = NOW() 
    WHERE id = task_id;
    
    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    
    RETURN json_build_object('success', true, 'rows_affected', rows_affected);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS err_msg = MESSAGE_TEXT, err_detail = PG_EXCEPTION_DETAIL;
    RETURN json_build_object('success', false, 'error', err_msg, 'detail', err_detail);
  END;
END;
$$;
