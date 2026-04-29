CREATE OR REPLACE FUNCTION public.get_tasks_policy_expr()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  res json;
BEGIN
  SELECT json_agg(row_to_json(p)) INTO res
  FROM (
    SELECT 
      polname,
      polcmd,
      pg_get_expr(polqual, polrelid) as using_expr,
      pg_get_expr(polwithcheck, polrelid) as with_check_expr
    FROM pg_policy 
    WHERE polrelid = 'public.tasks'::regclass
  ) p;
  
  RETURN res;
END;
$$;
