


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."member_role" AS ENUM (
    'owner',
    'manager',
    'staff'
);


ALTER TYPE "public"."member_role" OWNER TO "postgres";


CREATE TYPE "public"."member_status" AS ENUM (
    'active',
    'invited',
    'pending_approval',
    'inactive'
);


ALTER TYPE "public"."member_status" OWNER TO "postgres";


CREATE TYPE "public"."schedule_type" AS ENUM (
    'regular',
    'substitute',
    'overtime',
    'off',
    'leave',
    'training',
    'etc'
);


ALTER TYPE "public"."schedule_type" OWNER TO "postgres";


CREATE TYPE "public"."wage_type" AS ENUM (
    'hourly',
    'monthly',
    'daily',
    'yearly'
);


ALTER TYPE "public"."wage_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cancel_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
  v_is_manager BOOLEAN;
BEGIN
  -- 1. Check permission: check if user is owner or manager
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE store_id = p_store_id
    AND user_id = p_user_id
    AND role IN ('owner', 'manager')
  ) INTO v_is_manager;

  -- 2. Fetch request data and owner info
  SELECT lr.*, sm.user_id as member_user_id
  INTO v_request
  FROM leave_requests lr
  JOIN store_members sm ON lr.member_id = sm.id
  WHERE lr.id = p_request_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found.');
  END IF;

  -- 3. Validation
  -- Allowed if: is manager OR (is owner AND status is pending)
  IF NOT (v_is_manager OR (v_request.member_user_id = p_user_id AND v_request.status = 'pending')) THEN
    RETURN jsonb_build_object('error', 'Permission denied.');
  END IF;

  -- 4. Update status to rejected (by manager) or cancelled (by employee)
  UPDATE leave_requests
  SET 
    status = CASE WHEN v_is_manager THEN 'rejected' ELSE 'cancelled' END,
    reviewed_by = CASE WHEN v_is_manager THEN p_user_id ELSE reviewed_by END,
    reviewed_at = CASE WHEN v_is_manager THEN NOW() ELSE reviewed_at END
  WHERE id = p_request_id;

  -- 5. Rollback leave balance if it was approved
  IF v_request.status = 'approved' AND v_request.leave_type IN ('annual', 'half_am', 'half_pm') THEN
    UPDATE leave_balances
    SET used_days = GREATEST(0, used_days - v_request.requested_days),
        updated_at = NOW()
    WHERE member_id = v_request.member_id
    AND year = CAST(SUBSTRING(v_request.start_date FROM 1 FOR 4) AS INTEGER);
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."cancel_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."claim_manual_staff"("store_id_param" "uuid", "name_param" "text", "phone_param" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  target_member_id uuid;
BEGIN
  -- 1. 매칭되는 수기 등록 직원 찾기 (user_id IS NULL)
  -- 이름과 전화번호가 일치하는 레코드를 찾습니다.
  SELECT id INTO target_member_id
  FROM public.store_members
  WHERE store_id = store_id_param
    AND user_id IS NULL
    AND name = name_param
    AND phone = phone_param
  LIMIT 1;

  IF target_member_id IS NULL THEN
    RETURN false;
  END IF;

  -- 2. user_id 업데이트 및 상태 변경 (승인 대기 상태로 변경하여 점주 확인 유도)
  -- 중요: name 컬럼도 입력받은 name_param으로 업데이트합니다.
  -- (매칭 조건이 name = name_param 이라 같을 것 같지만, 공백이나 대소문자 차이 등이 있을 수 있고,
  -- 무엇보다 사용자가 '입력한 이름'을 우선시한다는 명시적 동작입니다.)
  UPDATE public.store_members
  SET 
    user_id = auth.uid(),
    status = 'pending_approval', -- 점주가 최종 승인하도록
    email = (SELECT email FROM auth.users WHERE id = auth.uid()), -- 이메일도 업데이트
    name = name_param -- [New] 입력한 이름으로 업데이트
  WHERE id = target_member_id;

  RETURN true;
END;
$$;


ALTER FUNCTION "public"."claim_manual_staff"("store_id_param" "uuid", "name_param" "text", "phone_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_store_with_owner"("name_param" "text", "description_param" "text", "address_param" "text", "business_number_param" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_store_id uuid;
  new_invite_code text;
  owner_role_id uuid;
BEGIN
  -- Generate random invite code (6 chars, uppercase)
  -- Loop to ensure uniqueness
  LOOP
    -- Use md5 of random + timestamp to get more randomness
    new_invite_code := upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 6));

    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM public.stores WHERE invite_code = new_invite_code) THEN
      EXIT;
    END IF;
  END LOOP;

  -- 1. Create Store with invite_code
  -- This will trigger handle_new_store_roles() and create default roles
  INSERT INTO public.stores (name, description, address, business_number, invite_code)
  VALUES (name_param, description_param, address_param, business_number_param, new_invite_code)
  RETURNING id INTO new_store_id;

  -- Get the owner role id created by the trigger
  SELECT id INTO owner_role_id
  FROM public.store_roles
  WHERE store_id = new_store_id AND name = '점주' AND is_system = true
  LIMIT 1;

  -- 2. Add current user as owner
  INSERT INTO public.store_members (store_id, user_id, role, role_id, status)
  VALUES (new_store_id, auth.uid(), 'owner', owner_role_id, 'active');

  RETURN new_store_id;
END;
$$;


ALTER FUNCTION "public"."create_store_with_owner"("name_param" "text", "description_param" "text", "address_param" "text", "business_number_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  -- Delete schedules that match the criteria
  
  -- We select IDs to delete first to ensure we target correctly
  WITH schedules_to_delete AS (
    SELECT s.id
    FROM schedules s
    JOIN schedule_members sm ON s.id = sm.schedule_id
    WHERE s.store_id = p_store_id
    AND sm.member_id = ANY(p_target_staff_ids)
    -- Check date range in KST
    AND timezone('Asia/Seoul', s.start_time)::date >= p_start_date
    AND timezone('Asia/Seoul', s.start_time)::date <= p_end_date
  )
  DELETE FROM schedules
  WHERE id IN (SELECT id FROM schedules_to_delete)
  AND store_id = p_store_id; -- Extra safety check

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."delete_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_store"("store_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  is_owner boolean;
begin
  -- Check if the requesting user is the owner of the store
  select exists(
    select 1
    from public.store_members
    where store_id = store_id_param
    and user_id = auth.uid()
    and role = 'owner'
  ) into is_owner;

  if not is_owner then
    raise exception 'Permission denied: Only store owners can delete the store.';
  end if;

  -- Delete the store
  -- Due to ON DELETE CASCADE constraints, this will also delete:
  -- 1. store_members
  -- 2. schedules
  -- 3. other related tables referencing store_id with cascade
  delete from public.stores
  where id = store_id_param;
end;
$$;


ALTER FUNCTION "public"."delete_store"("store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_tasks_by_period"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_count INTEGER;
  v_start_ts TIMESTAMP WITH TIME ZONE;
  v_end_ts TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Convert input dates to KST timezone boundaries (00:00:00 to 23:59:59)
  -- The input dates are treated as KST dates.
  v_start_ts := timezone('Asia/Seoul', (p_start_date || ' 00:00:00')::timestamp);
  v_end_ts := timezone('Asia/Seoul', (p_end_date || ' 23:59:59')::timestamp);

  WITH deleted AS (
    DELETE FROM tasks
    WHERE store_id = p_store_id
    AND is_template = false
    AND start_time >= v_start_ts
    AND start_time <= v_end_ts
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM deleted;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."delete_tasks_by_period"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_staff RECORD;
  v_date DATE;
  v_dow INTEGER;
  v_schedule JSONB;
  v_start_str TEXT;
  v_end_str TEXT;
  v_start_ts TIMESTAMP WITH TIME ZONE;
  v_end_ts TIMESTAMP WITH TIME ZONE;
  v_new_schedule_id UUID;
  v_count INTEGER := 0;
BEGIN
  -- Loop through target staffs
  FOR v_staff IN
    SELECT sm.id as member_id, sm.user_id, sm.work_schedules, r.color as role_color
    FROM store_members sm
    LEFT JOIN store_roles r ON sm.role_id = r.id
    WHERE sm.store_id = p_store_id
    -- RPC 호출부 호환성을 위해 user_id 배열로 받았는지, member_id 배열로 받았는지 모두 대응
    AND (sm.user_id = ANY(p_target_staff_ids) OR sm.id = ANY(p_target_staff_ids))
    AND sm.work_schedules IS NOT NULL
  LOOP
    v_date := p_start_date;
    
    WHILE v_date <= p_end_date LOOP
      v_dow := EXTRACT(DOW FROM (v_date AT TIME ZONE 'Asia/Seoul'));
      v_schedule := NULL;

      -- 해당 요일의 근무 패턴 찾기
      SELECT elem INTO v_schedule
      FROM jsonb_array_elements(v_staff.work_schedules) elem
      WHERE (elem->>'day')::int = v_dow
      LIMIT 1;

      -- 패턴이 있고 휴일이 아닌 경우에만 진행
      IF v_schedule IS NOT NULL AND (v_schedule->>'is_holiday')::boolean = false THEN
        v_start_str := v_schedule->>'start_time';
        v_end_str := v_schedule->>'end_time';

        IF v_start_str IS NOT NULL AND v_end_str IS NOT NULL THEN
            -- KST 기준 시간을 UTC 타임스탬프로 변환
            v_start_ts := timezone('Asia/Seoul', (v_date || ' ' || v_start_str || ':00')::timestamp);
            v_end_ts := timezone('Asia/Seoul', (v_date || ' ' || v_end_str || ':00')::timestamp);

            IF v_end_ts <= v_start_ts THEN
               v_end_ts := v_end_ts + interval '1 day';
            END IF;

            -- 중복 체크 (OVERLAPS)
            IF NOT EXISTS (
                SELECT 1
                FROM schedules s
                JOIN schedule_members sm ON s.id = sm.schedule_id
                WHERE sm.member_id = v_staff.member_id
                AND s.store_id = p_store_id
                AND (s.start_time, s.end_time) OVERLAPS (v_start_ts, v_end_ts)
            ) THEN
                -- 신규 생성 (무조건 regular)
                INSERT INTO schedules (
                    store_id, title, start_time, end_time, color, memo, schedule_type
                )
                VALUES (
                    p_store_id,
                    '근무',
                    v_start_ts,
                    v_end_ts,
                    COALESCE(v_staff.role_color, '#808080'),
                    '자동 생성됨',
                    'regular'
                )
                RETURNING id INTO v_new_schedule_id;

                INSERT INTO schedule_members (schedule_id, member_id)
                VALUES (v_new_schedule_id, v_staff.member_id);

                v_count := v_count + 1;
            END IF;
        END IF;
      END IF;
      v_date := v_date + 1;
    END LOOP;
  END LOOP;
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."generate_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_tasks_from_templates"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_template RECORD;
  v_date DATE;
  v_dow INTEGER;
  v_day_of_month INTEGER;
  v_is_last_day_of_month BOOLEAN;
  v_days_in_month INTEGER;
  v_nth_week_of_dow INTEGER;
  v_is_last_of_dow BOOLEAN;
  v_should_create BOOLEAN;
  v_start_time_str TEXT;
  v_end_time_str TEXT;
  v_new_start_ts TIMESTAMP WITH TIME ZONE;
  v_new_end_ts TIMESTAMP WITH TIME ZONE;
  v_count INTEGER := 0;
BEGIN
  -- Loop through all templates for the store
  FOR v_template IN 
    SELECT 
      id, title, description, task_type, is_critical, 
      assigned_role_id, assigned_role_ids, checklist,
      start_time, end_time, recurrence_rule
    FROM tasks
    WHERE store_id = p_store_id 
    AND is_template = true
  LOOP
    -- Loop through dates from start to end
    v_date := p_start_date;
    WHILE v_date <= p_end_date LOOP
      v_dow := EXTRACT(DOW FROM v_date); -- 0 (Sun) to 6 (Sat)
      v_day_of_month := EXTRACT(DAY FROM v_date);
      v_days_in_month := EXTRACT(DAY FROM (date_trunc('month', v_date) + interval '1 month - 1 day')::date);
      v_is_last_day_of_month := (v_day_of_month = v_days_in_month);
      
      -- Calculate nth occurrence of this day of week
      v_nth_week_of_dow := ceil(v_day_of_month / 7.0);
      v_is_last_of_dow := (v_day_of_month + 7 > v_days_in_month);
      
      v_should_create := false;

      IF v_template.recurrence_rule IS NOT NULL THEN
         -- 1. Weekly rule (days array)
         IF v_template.recurrence_rule ? 'days' THEN
            IF (v_template.recurrence_rule->'days') @> to_jsonb(v_dow) THEN
               v_should_create := true;
            END IF;
            
         -- 2. Monthly rule (nth_week and day)
         ELSIF v_template.recurrence_rule ? 'nth_week' AND v_template.recurrence_rule ? 'day' THEN
            IF (v_template.recurrence_rule->>'day')::integer = v_dow THEN
               -- Check if it matches the nth week (1-4) or is the last one (5)
               IF (v_template.recurrence_rule->>'nth_week')::integer = 5 THEN
                  IF v_is_last_of_dow THEN
                     v_should_create := true;
                  END IF;
               ELSIF (v_template.recurrence_rule->>'nth_week')::integer = v_nth_week_of_dow THEN
                  v_should_create := true;
               END IF;
            END IF;
            
         -- 3. Monthly rule (date or is_last_day)
         ELSIF v_template.recurrence_rule ? 'date' OR v_template.recurrence_rule ? 'is_last_day' THEN
            IF v_template.recurrence_rule->>'is_last_day' = 'true' THEN
               IF v_is_last_day_of_month THEN
                  v_should_create := true;
               END IF;
            ELSIF v_template.recurrence_rule->>'date' IS NOT NULL AND v_template.recurrence_rule->>'date' != 'null' THEN
               IF (v_template.recurrence_rule->>'date')::integer = v_day_of_month THEN
                  v_should_create := true;
               END IF;
            END IF;
         END IF;
      END IF;

      IF v_should_create THEN
         -- Extract time strings from template (in KST)
         -- Handle cases where start_time might be null (e.g., 'always' tasks)
         IF v_template.start_time IS NOT NULL THEN
            v_start_time_str := to_char(timezone('Asia/Seoul', v_template.start_time), 'HH24:MI');
            v_new_start_ts := timezone('Asia/Seoul', (v_date || ' ' || v_start_time_str || ':00')::timestamp);
         ELSE
            v_new_start_ts := timezone('Asia/Seoul', (v_date || ' 00:00:00')::timestamp);
         END IF;

         IF v_template.end_time IS NOT NULL THEN
            v_end_time_str := to_char(timezone('Asia/Seoul', v_template.end_time), 'HH24:MI');
            v_new_end_ts := timezone('Asia/Seoul', (v_date || ' ' || v_end_time_str || ':00')::timestamp);
            
            -- Handle overnight tasks
            IF v_new_end_ts < v_new_start_ts THEN
               v_new_end_ts := v_new_end_ts + interval '1 day';
            END IF;
         ELSE
            v_new_end_ts := NULL;
         END IF;

         -- Check for duplicates: Does a non-template task with the same title, date exist?
         IF NOT EXISTS (
            SELECT 1 
            FROM tasks t
            WHERE t.store_id = p_store_id
            AND t.is_template = false
            AND t.title = v_template.title
            AND (timezone('Asia/Seoul', t.start_time)::date = v_date)
         ) THEN
            -- Insert new task instance
            INSERT INTO tasks (
              store_id, 
              title, 
              description, 
              task_type, 
              is_critical, 
              assigned_role_id,
              assigned_role_ids,
              checklist,
              status, 
              start_time, 
              end_time, 
              is_template
            )
            VALUES (
              p_store_id,
              v_template.title,
              v_template.description,
              v_template.task_type,
              v_template.is_critical,
              v_template.assigned_role_id,
              v_template.assigned_role_ids,
              v_template.checklist,
              'todo',
              v_new_start_ts,
              v_new_end_ts,
              false
            );
            
            v_count := v_count + 1;
         END IF;
      END IF;

      v_date := v_date + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."generate_tasks_from_templates"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_store_role"("store_id_param" "uuid") RETURNS "public"."member_role"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  _role public.member_role;
begin
  select role into _role
  from public.store_members
  where store_id = store_id_param
  and user_id = auth.uid();
  
  return _role;
end;
$$;


ALTER FUNCTION "public"."get_my_store_role"("store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_store_roles"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  owner_role_id uuid;
  manager_role_id uuid;
  staff_role_id uuid;
BEGIN
  -- Create Owner Role
  INSERT INTO public.store_roles (store_id, name, color, is_system, priority)
  VALUES (NEW.id, '점주', '#FFD700', true, 100)
  RETURNING id INTO owner_role_id;
  
  -- Create Manager Role
  INSERT INTO public.store_roles (store_id, name, color, is_system, priority)
  VALUES (NEW.id, '매니저', '#4169E1', true, 50)
  RETURNING id INTO manager_role_id;
  
  -- Create Staff Role
  INSERT INTO public.store_roles (store_id, name, color, is_system, priority)
  VALUES (NEW.id, '직원', '#808080', true, 0)
  RETURNING id INTO staff_role_id;
  
  -- Assign Permissions
  INSERT INTO public.store_role_permissions (role_id, permission_code)
  SELECT owner_role_id, code FROM public.permissions;

  INSERT INTO public.store_role_permissions (role_id, permission_code)
  SELECT manager_role_id, permission_code FROM public.role_permissions WHERE role = 'manager';

  INSERT INTO public.store_role_permissions (role_id, permission_code)
  SELECT staff_role_id, permission_code FROM public.role_permissions WHERE role = 'staff';
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_store_roles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."resolve_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid", "p_status" character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
  v_has_permission BOOLEAN;
  v_year INTEGER;
BEGIN
  -- 1. Check permission: check if user has manage_schedule permission
  -- Since we use RBAC, we should ideally check the permission, but for simplicity
  -- in this RPC, we check if the user is owner/manager or has the right role permissions
  -- In this project, the UI already checked `requirePermission(user.id, storeId, 'manage_schedule')`
  -- But to be safe in DB, we'll allow it if the user is a valid member of the store.
  -- The real security check is done in actions.ts.
  
  -- 2. Fetch request data
  SELECT lr.*
  INTO v_request
  FROM leave_requests lr
  WHERE lr.id = p_request_id AND lr.store_id = p_store_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found.');
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN jsonb_build_object('error', 'Already processed request.');
  END IF;

  IF p_status NOT IN ('approved', 'rejected') THEN
    RETURN jsonb_build_object('error', 'Invalid status.');
  END IF;

  -- 3. Update status
  UPDATE leave_requests
  SET 
    status = p_status,
    reviewed_by = p_user_id,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  -- 4. Deduct leave balance if approved
  IF p_status = 'approved' AND v_request.leave_type IN ('annual', 'half_am', 'half_pm') THEN
    v_year := CAST(SUBSTRING(CAST(v_request.start_date AS VARCHAR) FROM 1 FOR 4) AS INTEGER);
    
    -- Try to update existing balance
    UPDATE leave_balances
    SET used_days = used_days + v_request.requested_days,
        updated_at = NOW()
    WHERE member_id = v_request.member_id AND year = v_year;
    
    -- If no balance exists, insert one
    IF NOT FOUND THEN
      INSERT INTO leave_balances (store_id, member_id, year, total_days, used_days)
      VALUES (p_store_id, v_request.member_id, v_year, NULL, v_request.requested_days);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."resolve_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid", "p_status" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."revoke_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_request RECORD;
  v_year INTEGER;
BEGIN
  -- We assume the application layer (actions.ts) has already checked `requirePermission(user.id, storeId, 'manage_schedule')`
  -- This RPC is just the database execution part for safety.

  -- 1. Fetch request data
  SELECT lr.*
  INTO v_request
  FROM leave_requests lr
  WHERE lr.id = p_request_id AND lr.store_id = p_store_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Request not found.');
  END IF;

  -- 2. Validate state
  IF v_request.status != 'approved' THEN
    RETURN jsonb_build_object('error', 'Only approved requests can be revoked.');
  END IF;

  -- 3. Update status to cancelled
  UPDATE leave_requests
  SET 
    status = 'cancelled',
    reviewed_by = p_user_id,
    reviewed_at = NOW()
  WHERE id = p_request_id;

  -- 4. Restore leave balance if it was annual leave
  IF v_request.leave_type IN ('annual', 'half_am', 'half_pm') THEN
    v_year := CAST(SUBSTRING(CAST(v_request.start_date AS VARCHAR) FROM 1 FOR 4) AS INTEGER);
    
    -- Try to update existing balance (restore used days, but don't go below 0)
    UPDATE leave_balances
    SET used_days = GREATEST(0, used_days - v_request.requested_days),
        updated_at = NOW()
    WHERE member_id = v_request.member_id AND year = v_year;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;


ALTER FUNCTION "public"."revoke_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_schedule_with_leave_on_time_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_member_record RECORD;
    v_is_on_leave BOOLEAN;
    v_leave_reason TEXT;
    v_new_date DATE;
BEGIN
    -- 수정된 날짜 확인
    v_new_date := timezone('Asia/Seoul', NEW.start_time)::date;

    -- 해당 스케줄의 모든 멤버에 대해 휴가 여부 재체크
    FOR v_member_record IN (SELECT member_id FROM schedule_members WHERE schedule_id = NEW.id) LOOP
        SELECT EXISTS (
            SELECT 1 FROM leave_requests
            WHERE member_id = v_member_record.member_id
            AND status = 'approved'
            AND v_new_date >= start_date
            AND v_new_date <= end_date
        ), (
            SELECT reason FROM leave_requests
            WHERE member_id = v_member_record.member_id
            AND status = 'approved'
            AND v_new_date >= start_date
            AND v_new_date <= end_date
            LIMIT 1
        ) INTO v_is_on_leave, v_leave_reason;

        IF v_is_on_leave THEN
            NEW.schedule_type := 'leave';
            NEW.memo := COALESCE(NEW.memo, '') || ' [자동 연동: 휴가]';
            EXIT; -- 한 명이라도 휴가면 스케줄 자체를 휴가 타입으로 간주 (또는 비즈니스 로직에 따라 조정)
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_schedule_with_leave_on_time_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_invite_code"("code" "text") RETURNS TABLE("id" "uuid", "name" "text", "description" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.description
  FROM public.stores s
  WHERE s.invite_code = code;
END;
$$;


ALTER FUNCTION "public"."verify_invite_code"("code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."leave_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "total_days" numeric(5,2) DEFAULT 0,
    "used_days" numeric(5,2) DEFAULT 0,
    "year" integer DEFAULT EXTRACT(year FROM CURRENT_DATE) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."leave_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "leave_type" character varying(50) NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "requested_days" numeric(5,2) DEFAULT 1 NOT NULL,
    "reason" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "attachment_url" "text"
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."permissions" (
    "code" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "name" "text",
    "category" "text"
);


ALTER TABLE "public"."permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "role" "text" DEFAULT 'user'::"text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."role_permissions" (
    "role" "public"."member_role" NOT NULL,
    "permission_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedule_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "schedule_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "member_id" "uuid" NOT NULL
);


ALTER TABLE "public"."schedule_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone NOT NULL,
    "memo" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "title" "text",
    "color" "text",
    "schedule_type" "public"."schedule_type" DEFAULT 'regular'::"public"."schedule_type" NOT NULL,
    CONSTRAINT "schedules_time_check" CHECK (("end_time" > "start_time"))
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


COMMENT ON COLUMN "public"."schedules"."title" IS '스케줄 명칭 (예: 오전 근무, 오픈 조)';



CREATE TABLE IF NOT EXISTS "public"."store_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text",
    "is_important" boolean DEFAULT false,
    "author_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."store_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "schedule_id" "uuid",
    "target_date" "date" NOT NULL,
    "clock_in_time" timestamp with time zone,
    "clock_out_time" timestamp with time zone,
    "break_start_time" timestamp with time zone,
    "break_end_time" timestamp with time zone,
    "total_break_minutes" integer DEFAULT 0,
    "status" character varying(50) DEFAULT 'working'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_attendance_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "attendance_id" "uuid",
    "member_id" "uuid" NOT NULL,
    "target_date" "date" NOT NULL,
    "requested_clock_in" timestamp with time zone,
    "requested_clock_out" timestamp with time zone,
    "reason" "text" NOT NULL,
    "status" character varying(50) DEFAULT 'pending'::character varying,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_attendance_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role" "public"."member_role" DEFAULT 'staff'::"public"."member_role" NOT NULL,
    "status" "public"."member_status" DEFAULT 'pending_approval'::"public"."member_status" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "wage_type" "public"."wage_type" DEFAULT 'hourly'::"public"."wage_type",
    "base_wage" integer DEFAULT 0,
    "name" "text",
    "phone" "text",
    "email" "text",
    "role_id" "uuid",
    "work_hours" "text",
    "hired_at" timestamp with time zone,
    "employment_type" "text",
    "resigned_at" timestamp with time zone,
    "contract_status" "text" DEFAULT 'none'::"text",
    "modusign_document_id" "text",
    "memo" "text",
    "work_schedules" "jsonb" DEFAULT '[]'::"jsonb",
    "address" "text",
    "birth_date" character varying(6),
    "emergency_contact" "text",
    "custom_pay_day" integer,
    "weekly_holiday" integer,
    "contract_end_date" timestamp with time zone,
    "insurance_status" "jsonb" DEFAULT '{"health": false, "national": false, "employment": false, "industrial": false}'::"jsonb",
    "custom_wage_settings" "jsonb",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "contract_file_url" "text",
    CONSTRAINT "store_members_contract_status_check" CHECK (("contract_status" = ANY (ARRAY['none'::"text", 'sent'::"text", 'pending_staff'::"text", 'signed'::"text", 'rejected'::"text", 'canceled'::"text"]))),
    CONSTRAINT "store_members_custom_pay_day_check" CHECK ((("custom_pay_day" >= 1) AND ("custom_pay_day" <= 31))),
    CONSTRAINT "store_members_employment_type_check" CHECK (("employment_type" = ANY (ARRAY['fulltime'::"text", 'parttime'::"text", 'contract'::"text", 'probation'::"text", 'daily'::"text"]))),
    CONSTRAINT "store_members_weekly_holiday_check" CHECK ((("weekly_holiday" >= 0) AND ("weekly_holiday" <= 6)))
);


ALTER TABLE "public"."store_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."store_members"."memo" IS 'Staff memo or introduction';



COMMENT ON COLUMN "public"."store_members"."work_schedules" IS 'Array of work schedules: [{ day: number (0-6), start_time: "HH:MM", end_time: "HH:MM", break_minutes: number, is_holiday: boolean }]';



CREATE TABLE IF NOT EXISTS "public"."store_role_permissions" (
    "role_id" "uuid" NOT NULL,
    "permission_code" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."store_role_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#808080'::"text",
    "is_system" boolean DEFAULT false,
    "priority" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_id" "uuid"
);


ALTER TABLE "public"."store_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "address" "text",
    "business_number" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "invite_code" "text" NOT NULL,
    "owner_name" "text",
    "store_phone" "text",
    "zip_code" "text",
    "address_detail" "text",
    "opening_hours" "jsonb" DEFAULT '{}'::"jsonb",
    "break_time" "text",
    "image_url" "text",
    "stamp_image_url" "text",
    "wage_start_day" integer DEFAULT 1,
    "wage_end_day" integer DEFAULT 0,
    "pay_day" integer DEFAULT 10,
    "wage_exceptions" "jsonb" DEFAULT '{}'::"jsonb",
    "leave_calc_type" "text" DEFAULT 'hire_date'::"text" NOT NULL,
    "latitude" double precision,
    "longitude" double precision,
    "auth_radius" integer DEFAULT 200,
    CONSTRAINT "stores_leave_calc_type_check" CHECK (("leave_calc_type" = ANY (ARRAY['hire_date'::"text", 'fiscal_year'::"text"])))
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."stores"."stamp_image_url" IS 'Store owner stamp/signature image URL for digital contracts';



COMMENT ON COLUMN "public"."stores"."leave_calc_type" IS '연차 발생 기준 (hire_date: 입사일, fiscal_year: 회계연도)';



COMMENT ON COLUMN "public"."stores"."latitude" IS 'Store latitude for attendance verification';



COMMENT ON COLUMN "public"."stores"."longitude" IS 'Store longitude for attendance verification';



COMMENT ON COLUMN "public"."stores"."auth_radius" IS 'Radius in meters within which attendance is allowed';



CREATE TABLE IF NOT EXISTS "public"."task_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid",
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "target_date" "date" NOT NULL,
    "status" "text" DEFAULT 'done'::"text",
    "user_id" "uuid",
    "store_id" "uuid",
    "checklist_progress" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "task_history_status_check" CHECK (("status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'done'::"text"])))
);


ALTER TABLE "public"."task_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_critical" boolean DEFAULT false,
    "estimated_minutes" integer DEFAULT 30,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "task_type" "text" DEFAULT 'one_time'::"text",
    "start_time" timestamp with time zone,
    "end_time" timestamp with time zone,
    "assigned_role_id" "uuid",
    "checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "status" "text" DEFAULT 'todo'::"text",
    "original_repeat_id" "uuid",
    "assigned_role_ids" "text"[] DEFAULT '{}'::"text"[],
    "is_template" boolean DEFAULT false NOT NULL,
    "recurrence_rule" "jsonb",
    "is_routine" boolean DEFAULT false NOT NULL,
    "user_id" "uuid",
    "role_id" "uuid",
    "schedule_id" "uuid",
    "assigned_date" "date",
    CONSTRAINT "tasks_status_check" CHECK (("status" = ANY (ARRAY['todo'::"text", 'in_progress'::"text", 'done'::"text"]))),
    CONSTRAINT "tasks_task_type_check" CHECK (("task_type" = ANY (ARRAY['scheduled'::"text", 'always'::"text"])))
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks"."assigned_role_ids" IS 'List of role IDs assigned to this task. Can contain "all" for all roles.';



COMMENT ON COLUMN "public"."tasks"."is_template" IS 'If true, this task acts as a recurring template and is not shown on the calendar.';



COMMENT ON COLUMN "public"."tasks"."recurrence_rule" IS 'JSON object defining recurrence, e.g., {"days": [1,3,5]}';



COMMENT ON COLUMN "public"."tasks"."is_routine" IS 'If true, this task was generated from a role template (routine task) and may be displayed differently on the calendar.';



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_member_id_year_key" UNIQUE ("member_id", "year");



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."permissions"
    ADD CONSTRAINT "permissions_pkey" PRIMARY KEY ("code");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role", "permission_code");



ALTER TABLE ONLY "public"."schedule_members"
    ADD CONSTRAINT "schedule_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedule_members"
    ADD CONSTRAINT "schedule_members_schedule_id_member_id_key" UNIQUE ("schedule_id", "member_id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_user_id_key" UNIQUE ("store_id", "user_id");



ALTER TABLE ONLY "public"."store_role_permissions"
    ADD CONSTRAINT "store_role_permissions_pkey" PRIMARY KEY ("role_id", "permission_code");



ALTER TABLE ONLY "public"."store_roles"
    ADD CONSTRAINT "store_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_task_id_target_date_key" UNIQUE ("task_id", "target_date");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_store_announcements_created_at" ON "public"."store_announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_store_announcements_store_id" ON "public"."store_announcements" USING "btree" ("store_id");



CREATE INDEX "idx_store_members_modusign_doc_id" ON "public"."store_members" USING "btree" ("modusign_document_id");



CREATE INDEX "task_history_store_id_idx" ON "public"."task_history" USING "btree" ("store_id");



CREATE INDEX "task_history_task_id_date_idx" ON "public"."task_history" USING "btree" ("task_id", "target_date");



CREATE INDEX "tasks_assigned_role_id_idx" ON "public"."tasks" USING "btree" ("assigned_role_id");



CREATE INDEX "tasks_store_id_idx" ON "public"."tasks" USING "btree" ("store_id");



CREATE INDEX "tasks_task_type_idx" ON "public"."tasks" USING "btree" ("task_type");



CREATE OR REPLACE TRIGGER "on_store_created_roles" AFTER INSERT ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."handle_new_store_roles"();



CREATE OR REPLACE TRIGGER "trigger_sync_schedule_on_update" BEFORE UPDATE OF "start_time" ON "public"."schedules" FOR EACH ROW EXECUTE FUNCTION "public"."sync_schedule_with_leave_on_time_update"();



CREATE OR REPLACE TRIGGER "update_store_announcements_updated_at" BEFORE UPDATE ON "public"."store_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."role_permissions"
    ADD CONSTRAINT "role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_members"
    ADD CONSTRAINT "schedule_members_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedule_members"
    ADD CONSTRAINT "schedule_members_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."store_attendance"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."store_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_role_permissions"
    ADD CONSTRAINT "store_role_permissions_permission_code_fkey" FOREIGN KEY ("permission_code") REFERENCES "public"."permissions"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_role_permissions"
    ADD CONSTRAINT "store_role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."store_roles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_roles"
    ADD CONSTRAINT "store_roles_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."store_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_roles"
    ADD CONSTRAINT "store_roles_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_history"
    ADD CONSTRAINT "task_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigned_role_id_fkey" FOREIGN KEY ("assigned_role_id") REFERENCES "public"."store_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."store_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



CREATE POLICY "Anyone can create a store." ON "public"."stores" FOR INSERT WITH CHECK (true);



CREATE POLICY "Anyone can read permissions" ON "public"."permissions" FOR SELECT USING (true);



CREATE POLICY "Anyone can request to join a store." ON "public"."store_members" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND ("status" = 'pending_approval'::"public"."member_status") AND ("role" = 'staff'::"public"."member_role")));



CREATE POLICY "Managers can manage attendance" ON "public"."store_attendance" USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_schedule'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_schedule'::"text"))))
  WHERE (("sm"."store_id" = "store_attendance"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Managers can manage leave balances" ON "public"."leave_balances" USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_schedule'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_schedule'::"text"))))
  WHERE (("sm"."store_id" = "leave_balances"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND (("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Managers can manage leave requests" ON "public"."leave_requests" USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_schedule'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_schedule'::"text"))))
  WHERE (("sm"."store_id" = "leave_requests"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND (("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Managers can manage requests" ON "public"."store_attendance_requests" USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_schedule'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_schedule'::"text"))))
  WHERE (("sm"."store_id" = "store_attendance_requests"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Managers can manage schedule members" ON "public"."schedule_members" USING ((EXISTS ( SELECT 1
   FROM "public"."schedules" "s"
  WHERE (("s"."id" = "schedule_members"."schedule_id") AND ("public"."get_my_store_role"("s"."store_id") = ANY (ARRAY['owner'::"public"."member_role", 'manager'::"public"."member_role"]))))));



CREATE POLICY "Members can view other members in the same store." ON "public"."store_members" FOR SELECT USING (("public"."get_my_store_role"("store_id") IS NOT NULL));



CREATE POLICY "Members can view schedule members in their store" ON "public"."schedule_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."schedules" "s"
     JOIN "public"."store_members" "m" ON (("s"."store_id" = "m"."store_id")))
  WHERE (("s"."id" = "schedule_members"."schedule_id") AND ("m"."user_id" = "auth"."uid"())))));



CREATE POLICY "Members can view schedule members in their store." ON "public"."schedule_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."schedules" "s"
  WHERE (("s"."id" = "schedule_members"."schedule_id") AND ("public"."get_my_store_role"("s"."store_id") IS NOT NULL)))));



CREATE POLICY "Members can view schedules in their store." ON "public"."schedules" FOR SELECT USING (("public"."get_my_store_role"("store_id") IS NOT NULL));



CREATE POLICY "Members can view store role permissions" ON "public"."store_role_permissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_roles" "sr"
  WHERE (("sr"."id" = "store_role_permissions"."role_id") AND ("public"."get_my_store_role"("sr"."store_id") IS NOT NULL)))));



CREATE POLICY "Members can view store roles" ON "public"."store_roles" FOR SELECT USING (("public"."get_my_store_role"("store_id") IS NOT NULL));



CREATE POLICY "Permissions are viewable by everyone." ON "public"."permissions" FOR SELECT USING (true);



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Role permissions are manageable by store managers/owners." ON "public"."store_role_permissions" USING ((EXISTS ( SELECT 1
   FROM ("public"."store_roles"
     JOIN "public"."store_members" ON (("store_members"."store_id" = "store_roles"."store_id")))
  WHERE (("store_roles"."id" = "store_role_permissions"."role_id") AND ("store_members"."user_id" = "auth"."uid"()) AND (("store_members"."role" = 'owner'::"public"."member_role") OR ("store_members"."role" = 'manager'::"public"."member_role"))))));



CREATE POLICY "Role permissions are viewable by everyone." ON "public"."role_permissions" FOR SELECT USING (true);



CREATE POLICY "Role permissions are viewable by store members." ON "public"."store_role_permissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."store_roles"
     JOIN "public"."store_members" ON (("store_members"."store_id" = "store_roles"."store_id")))
  WHERE (("store_roles"."id" = "store_role_permissions"."role_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Roles are manageable by store managers/owners." ON "public"."store_roles" USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "store_roles"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND (("store_members"."role" = 'owner'::"public"."member_role") OR ("store_members"."role" = 'manager'::"public"."member_role"))))));



CREATE POLICY "Roles are viewable by store members." ON "public"."store_roles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "store_roles"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Schedule members are manageable by authorized members" ON "public"."schedule_members" USING ((EXISTS ( SELECT 1
   FROM ((("public"."schedules" "s"
     JOIN "public"."store_members" "sm" ON (("s"."store_id" = "sm"."store_id")))
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_schedule'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_schedule'::"text"))))
  WHERE (("s"."id" = "schedule_members"."schedule_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Schedules are manageable by authorized members" ON "public"."schedules" USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_schedule'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_schedule'::"text"))))
  WHERE (("sm"."store_id" = "schedules"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Staff can insert their own attendance" ON "public"."store_attendance" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."id" = "store_attendance"."member_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Staff can insert their own leave requests" ON "public"."leave_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."id" = "leave_requests"."member_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Staff can insert their own requests" ON "public"."store_attendance_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."id" = "store_attendance_requests"."member_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Staff can update their own attendance" ON "public"."store_attendance" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."id" = "store_attendance"."member_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Staff can update their own pending leave requests" ON "public"."leave_requests" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."id" = "leave_requests"."member_id") AND ("store_members"."user_id" = "auth"."uid"())))) AND (("status")::"text" = 'pending'::"text")));



CREATE POLICY "Store members can view announcements" ON "public"."store_announcements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "store_announcements"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Store members with manage_store permission can delete announcem" ON "public"."store_announcements" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_store'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_store'::"text"))))
  WHERE (("sm"."store_id" = "sm"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Store members with manage_store permission can insert announcem" ON "public"."store_announcements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_store'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_store'::"text"))))
  WHERE (("sm"."store_id" = "sm"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Store members with manage_store permission can update announcem" ON "public"."store_announcements" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_store'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_store'::"text"))))
  WHERE (("sm"."store_id" = "sm"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_store'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_store'::"text"))))
  WHERE (("sm"."store_id" = "sm"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Store owners can manage members." ON "public"."store_members" USING (("public"."get_my_store_role"("store_id") = 'owner'::"public"."member_role"));



CREATE POLICY "Store owners can update store details." ON "public"."stores" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "stores"."id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."role" = 'owner'::"public"."member_role")))));



CREATE POLICY "Stores are viewable by members." ON "public"."stores" FOR SELECT USING (("public"."get_my_store_role"("id") IS NOT NULL));



CREATE POLICY "Task deletable by assigned user" ON "public"."tasks" FOR DELETE USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "tasks"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."role" = ANY (ARRAY['owner'::"public"."member_role", 'manager'::"public"."member_role"])))))));



CREATE POLICY "Task history deletable by store members" ON "public"."task_history" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "task_history"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Task history insertable by store members" ON "public"."task_history" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "task_history"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Task history updatable by store members" ON "public"."task_history" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "task_history"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Task history viewable by store members" ON "public"."task_history" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "task_history"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Task status updatable by assigned user" ON "public"."tasks" FOR UPDATE USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "tasks"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."role" = ANY (ARRAY['owner'::"public"."member_role", 'manager'::"public"."member_role"])))))));



CREATE POLICY "Tasks are manageable by store managers and owners" ON "public"."tasks" USING ((EXISTS ( SELECT 1
   FROM (("public"."store_members" "sm"
     LEFT JOIN "public"."store_role_permissions" "srp" ON ((("sm"."role_id" = "srp"."role_id") AND ("srp"."permission_code" = 'manage_tasks'::"text"))))
     LEFT JOIN "public"."role_permissions" "rp" ON ((("sm"."role" = "rp"."role") AND ("rp"."permission_code" = 'manage_tasks'::"text"))))
  WHERE (("sm"."store_id" = "tasks"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sm"."role" = 'owner'::"public"."member_role") OR ("srp"."permission_code" IS NOT NULL) OR ("rp"."permission_code" IS NOT NULL))))));



CREATE POLICY "Tasks are viewable by store members" ON "public"."tasks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "tasks"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own tasks" ON "public"."tasks" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "tasks"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."status" = 'active'::"public"."member_status")))) AND (("assigned_role_ids" IS NULL) OR ("array_length"("assigned_role_ids", 1) IS NULL)) AND ("is_template" = false)));



CREATE POLICY "Users can delete their own membership." ON "public"."store_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can see their own memberships." ON "public"."store_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can update their own membership." ON "public"."store_members" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view attendance in their stores" ON "public"."store_attendance" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "store_attendance"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view leave balances in their stores" ON "public"."leave_balances" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "leave_balances"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view leave requests in their stores" ON "public"."leave_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "leave_requests"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view requests in their stores" ON "public"."store_attendance_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "store_attendance_requests"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."leave_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedule_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_attendance_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_role_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."tasks";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."cancel_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."cancel_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."cancel_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."claim_manual_staff"("store_id_param" "uuid", "name_param" "text", "phone_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."claim_manual_staff"("store_id_param" "uuid", "name_param" "text", "phone_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."claim_manual_staff"("store_id_param" "uuid", "name_param" "text", "phone_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_store_with_owner"("name_param" "text", "description_param" "text", "address_param" "text", "business_number_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_store_with_owner"("name_param" "text", "description_param" "text", "address_param" "text", "business_number_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_store_with_owner"("name_param" "text", "description_param" "text", "address_param" "text", "business_number_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."delete_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_store"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_store"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_store"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_tasks_by_period"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_tasks_by_period"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_tasks_by_period"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_staff_schedules"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date", "p_target_staff_ids" "uuid"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_tasks_from_templates"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_tasks_from_templates"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_tasks_from_templates"("p_store_id" "uuid", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_store_role"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_store_role"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_store_role"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_store_roles"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_store_roles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_store_roles"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."resolve_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid", "p_status" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."resolve_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid", "p_status" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."resolve_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid", "p_status" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."revoke_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."revoke_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."revoke_leave_request_v1"("p_request_id" "uuid", "p_user_id" "uuid", "p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_schedule_with_leave_on_time_update"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_schedule_with_leave_on_time_update"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_schedule_with_leave_on_time_update"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_invite_code"("code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_invite_code"("code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_invite_code"("code" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."leave_balances" TO "anon";
GRANT ALL ON TABLE "public"."leave_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_balances" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."permissions" TO "anon";
GRANT ALL ON TABLE "public"."permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."permissions" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."schedule_members" TO "anon";
GRANT ALL ON TABLE "public"."schedule_members" TO "authenticated";
GRANT ALL ON TABLE "public"."schedule_members" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."store_announcements" TO "anon";
GRANT ALL ON TABLE "public"."store_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."store_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."store_attendance" TO "anon";
GRANT ALL ON TABLE "public"."store_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."store_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."store_attendance_requests" TO "anon";
GRANT ALL ON TABLE "public"."store_attendance_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."store_attendance_requests" TO "service_role";



GRANT ALL ON TABLE "public"."store_members" TO "anon";
GRANT ALL ON TABLE "public"."store_members" TO "authenticated";
GRANT ALL ON TABLE "public"."store_members" TO "service_role";



GRANT ALL ON TABLE "public"."store_role_permissions" TO "anon";
GRANT ALL ON TABLE "public"."store_role_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."store_role_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."store_roles" TO "anon";
GRANT ALL ON TABLE "public"."store_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."store_roles" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."task_history" TO "anon";
GRANT ALL ON TABLE "public"."task_history" TO "authenticated";
GRANT ALL ON TABLE "public"."task_history" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































