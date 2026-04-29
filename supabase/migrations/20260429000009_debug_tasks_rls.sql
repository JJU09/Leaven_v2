CREATE OR REPLACE FUNCTION public.get_tasks_debug_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  policies json;
  triggers json;
BEGIN
  SELECT json_agg(row_to_json(p)) INTO policies
  FROM (
    SELECT polname, polcmd, polqual, polwithcheck 
    FROM pg_policy 
    WHERE polrelid = 'public.tasks'::regclass
  ) p;
  
  SELECT json_agg(row_to_json(t)) INTO triggers
  FROM (
    SELECT tgname 
    FROM pg_trigger 
    WHERE tgrelid = 'public.tasks'::regclass AND tgisinternal = false
  ) t;
  
  RETURN json_build_object('policies', policies, 'triggers', triggers);
END;
$$;
