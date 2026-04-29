


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



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."asset_status" AS ENUM (
    'active',
    'needs_inspection',
    'in_repair',
    'disposed',
    'under_repair',
    'as_submitted'
);


ALTER TYPE "public"."asset_status" OWNER TO "postgres";


CREATE TYPE "public"."attendance_request_status" AS ENUM (
    'pending',
    'approved',
    'rejected'
);


ALTER TYPE "public"."attendance_request_status" OWNER TO "postgres";


CREATE TYPE "public"."attendance_status" AS ENUM (
    'working',
    'completed',
    'absent'
);


ALTER TYPE "public"."attendance_status" OWNER TO "postgres";


CREATE TYPE "public"."contract_status" AS ENUM (
    'draft',
    'sent',
    'viewed',
    'signed',
    'expired',
    'canceled'
);


ALTER TYPE "public"."contract_status" OWNER TO "postgres";


CREATE TYPE "public"."leave_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'canceled'
);


ALTER TYPE "public"."leave_status" OWNER TO "postgres";


CREATE TYPE "public"."member_status" AS ENUM (
    'active',
    'invited',
    'pending_approval',
    'inactive'
);


ALTER TYPE "public"."member_status" OWNER TO "postgres";


CREATE TYPE "public"."payroll_status" AS ENUM (
    'draft',
    'confirmed',
    'paid'
);


ALTER TYPE "public"."payroll_status" OWNER TO "postgres";


CREATE TYPE "public"."task_status" AS ENUM (
    'pending',
    'in_progress',
    'on_hold',
    'completed',
    'verified'
);


ALTER TYPE "public"."task_status" OWNER TO "postgres";


CREATE TYPE "public"."wage_type" AS ENUM (
    'hourly',
    'monthly',
    'daily',
    'yearly'
);


ALTER TYPE "public"."wage_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_announcements"("store_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM store_members sm
    LEFT JOIN store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
    AND sm.user_id = auth.uid()
    AND sm.status = 'active'
    AND (
        sm.role = 'owner'
        OR (sr.permissions ? 'manage_store')
        OR (sr.permissions ? 'manage_announcements')
    )
  );
END;
$$;


ALTER FUNCTION "public"."can_manage_announcements"("store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_manage_tasks"("store_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.store_members sm
    JOIN public.store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
      AND sm.user_id = auth.uid()
      AND (
        sr.hierarchy_level >= 100 -- Owner always has permission
        OR sr.permissions ? 'manage_tasks'
      )
  );
END;
$$;


ALTER FUNCTION "public"."can_manage_tasks"("store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_unassigned_role_if_not_exists"("p_store_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_role_id uuid;
BEGIN
    -- '미지정' 직급이 이미 있는지 확인
    SELECT id INTO v_role_id
    FROM store_roles
    WHERE store_id = p_store_id AND name = '미지정'
    LIMIT 1;

    -- 없다면 생성
    IF v_role_id IS NULL THEN
        INSERT INTO store_roles (
            store_id, 
            name, 
            color, 
            is_system, 
            hierarchy_level, 
            permissions
        ) VALUES (
            p_store_id, 
            '미지정', 
            '#cbd5e1', 
            true, 
            -1, 
            '[]'::jsonb
        ) RETURNING id INTO v_role_id;
    END IF;

    RETURN v_role_id;
END;
$$;


ALTER FUNCTION "public"."create_unassigned_role_if_not_exists"("p_store_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_store"("store_id_param" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Check if the current user is the owner (or has permission)
  -- For safety, we can check if the user is the creator of the store
  -- or if they have 'manage_store' permission.
  
  IF NOT EXISTS (
    SELECT 1 FROM stores 
    WHERE id = store_id_param 
    AND created_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only the store creator can delete the store';
  END IF;

  -- Due to foreign key constraints with ON DELETE CASCADE, 
  -- deleting the store will delete related records.
  -- Or if ON DELETE CASCADE is not fully set up, we might need to delete them manually.
  -- Assuming cascade is set up, we just delete the store:
  DELETE FROM stores WHERE id = store_id_param;
END;
$$;


ALTER FUNCTION "public"."delete_store"("store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER := 0;
  is_unique BOOLEAN := FALSE;
BEGIN
  WHILE NOT is_unique LOOP
    result := '';
    FOR i IN 1..8 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    
    PERFORM 1 FROM public.stores WHERE invite_code = result;
    IF NOT FOUND THEN
      is_unique := TRUE;
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$;


ALTER FUNCTION "public"."generate_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_current_member_id"("store_id_param" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_member_id UUID;
BEGIN
  SELECT id INTO v_member_id
  FROM public.store_members
  WHERE store_id = store_id_param
    AND user_id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL
  LIMIT 1;
  
  RETURN v_member_id;
END;
$$;


ALTER FUNCTION "public"."get_current_member_id"("store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role_permission"("store_id_param" "uuid", "permission_code" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members sm
    JOIN public.store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
    AND sm.user_id = auth.uid()
    AND sm.status = 'active'
    AND sm.deleted_at IS NULL
    AND sr.deleted_at IS NULL
    AND (
      sr.permissions ? permission_code
      OR sr.hierarchy_level >= 100
    )
  );
END;
$$;


ALTER FUNCTION "public"."has_role_permission"("store_id_param" "uuid", "permission_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_store_permission"("store_id_param" "uuid", "permission_param" "text") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.store_members sm
    JOIN public.store_roles sr ON sm.role_id = sr.id
    WHERE sm.store_id = store_id_param
      AND sm.user_id = auth.uid()
      AND sm.status = 'active'
      AND sm.deleted_at IS NULL
      AND (
        sr.hierarchy_level >= 100 -- Owner always has permission
        OR sr.permissions ? permission_param -- Check if JSONB array contains the permission
      )
  );
END;
$$;


ALTER FUNCTION "public"."has_store_permission"("store_id_param" "uuid", "permission_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_store_member"("store_id_param" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.store_members
    WHERE store_id = store_id_param
    AND user_id = auth.uid()
    AND status = 'active'
    AND deleted_at IS NULL
  );
END;
$$;


ALTER FUNCTION "public"."is_store_member"("store_id_param" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_store_invite_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_store_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_modified_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_modified_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_invite_code"("code" "text") RETURNS TABLE("id" "uuid", "name" "text", "description" "text", "address" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.description, s.address
  FROM public.stores s
  WHERE s.invite_code = code AND s.deleted_at IS NULL;
END;
$$;


ALTER FUNCTION "public"."verify_invite_code"("code" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "report_type" "text" NOT NULL,
    "period_key" "text" NOT NULL,
    "content" "jsonb" NOT NULL,
    "generated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "ai_reports_report_type_check" CHECK (("report_type" = ANY (ARRAY['daily'::"text", 'weekly'::"text"])))
);


ALTER TABLE "public"."ai_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."announcement_reads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "announcement_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "read_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."announcement_reads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asset_maintenance_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "maintenance_date" "date" NOT NULL,
    "maintenance_type" "text",
    "cost" integer DEFAULT 0,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "next_inspection_date" "date",
    "performed_by" "text",
    CONSTRAINT "chk_maintenance_type" CHECK (("maintenance_type" = ANY (ARRAY['regular'::"text", 'breakdown'::"text", 'replacement'::"text"])))
);


ALTER TABLE "public"."asset_maintenance_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."asset_status_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "asset_id" "uuid" NOT NULL,
    "from_status" "public"."asset_status",
    "to_status" "public"."asset_status" NOT NULL,
    "changed_by" "text",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."asset_status_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_balances" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "total_days" numeric(5,1),
    "used_days" numeric(5,1) DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."leave_balances" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."leave_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "leave_type" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "reason" "text",
    "status" "public"."leave_status" DEFAULT 'pending'::"public"."leave_status",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "reject_reason" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "attachment_url" "text",
    "requested_days" numeric(4,1) DEFAULT 1 NOT NULL,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid"
);


ALTER TABLE "public"."leave_requests" OWNER TO "postgres";


COMMENT ON COLUMN "public"."leave_requests"."resolved_at" IS '승인/반려/취소 처리된 일시';



COMMENT ON COLUMN "public"."leave_requests"."resolved_by" IS '요청을 처리한 관리자의 user_id';



CREATE TABLE IF NOT EXISTS "public"."member_contracts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "modusign_document_id" "text",
    "contract_type" "text" NOT NULL,
    "status" "public"."contract_status" DEFAULT 'draft'::"public"."contract_status",
    "contract_file_url" "text",
    "sent_at" timestamp with time zone,
    "signed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."member_contracts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payroll_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "staff_id" "uuid" NOT NULL,
    "period_year" integer NOT NULL,
    "period_month" integer NOT NULL,
    "wage_type" "public"."wage_type" NOT NULL,
    "work_days" integer DEFAULT 0 NOT NULL,
    "work_hours" numeric(10,2) DEFAULT 0 NOT NULL,
    "overtime_hours" numeric(10,2) DEFAULT 0 NOT NULL,
    "base_pay" integer DEFAULT 0 NOT NULL,
    "overtime_pay" integer DEFAULT 0 NOT NULL,
    "weekly_holiday_pay" integer DEFAULT 0 NOT NULL,
    "gross_pay" integer DEFAULT 0 NOT NULL,
    "income_tax" integer DEFAULT 0 NOT NULL,
    "local_income_tax" integer DEFAULT 0 NOT NULL,
    "national_pension" integer DEFAULT 0 NOT NULL,
    "health_insurance" integer DEFAULT 0 NOT NULL,
    "employment_insurance" integer DEFAULT 0 NOT NULL,
    "long_term_care" integer DEFAULT 0 NOT NULL,
    "total_deduction" integer DEFAULT 0 NOT NULL,
    "net_pay" integer DEFAULT 0 NOT NULL,
    "status" "public"."payroll_status" DEFAULT 'draft'::"public"."payroll_status" NOT NULL,
    "confirmed_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."payroll_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "full_name" "text",
    "avatar_url" "text",
    "is_platform_admin" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "phone" "text"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."phone" IS '유저의 기본 연락처 (통합 관리용)';



CREATE TABLE IF NOT EXISTS "public"."schedules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "member_id" "uuid" NOT NULL,
    "plan_date" "date" NOT NULL,
    "start_time" time without time zone NOT NULL,
    "end_time" time without time zone NOT NULL,
    "break_minutes" integer DEFAULT 0,
    "is_ai_recommended" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "schedule_type" "text" DEFAULT 'regular'::"text"
);


ALTER TABLE "public"."schedules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "announcement_type" "text" DEFAULT 'notice'::"text",
    "target_member_ids" "uuid"[],
    "ai_summary" "jsonb",
    CONSTRAINT "store_announcements_announcement_type_check" CHECK (("announcement_type" = ANY (ARRAY['notice'::"text", 'handover'::"text"])))
);


ALTER TABLE "public"."store_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_assets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "vendor_id" "uuid",
    "name" "text" NOT NULL,
    "category" "text",
    "model_name" "text",
    "manufacturer" "text",
    "serial_number" "text",
    "purchase_date" "date",
    "purchase_amount" integer DEFAULT 0,
    "warranty_expiry_date" "date",
    "next_inspection_date" "date",
    "status" "public"."asset_status" DEFAULT 'active'::"public"."asset_status",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "installation_location" "text",
    "as_vendor_name" "text",
    "as_contact" "text",
    "as_url" "text",
    "as_usage_count" integer DEFAULT 0,
    "notes" "text"
);


ALTER TABLE "public"."store_assets" OWNER TO "postgres";


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
    "status" "public"."attendance_status" DEFAULT 'working'::"public"."attendance_status",
    "snapshot_hourly_wage" integer,
    "payroll_meta" "jsonb",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "is_late" boolean DEFAULT false
);


ALTER TABLE "public"."store_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_attendance_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "attendance_id" "uuid",
    "member_id" "uuid" NOT NULL,
    "requested_clock_in" timestamp with time zone,
    "requested_clock_out" timestamp with time zone,
    "reason" "text",
    "status" "public"."attendance_request_status" DEFAULT 'pending'::"public"."attendance_request_status" NOT NULL,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "reject_reason" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "target_date" "date" NOT NULL
);


ALTER TABLE "public"."store_attendance_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_handovers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "target_role_id" "uuid",
    "content" "text" NOT NULL,
    "ai_summary" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."store_handovers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."store_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "role_id" "uuid" NOT NULL,
    "status" "public"."member_status" DEFAULT 'pending_approval'::"public"."member_status" NOT NULL,
    "wage_type" "public"."wage_type" DEFAULT 'hourly'::"public"."wage_type" NOT NULL,
    "base_hourly_wage" integer DEFAULT 0,
    "base_monthly_wage" integer DEFAULT 0,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "name" "text",
    "email" "text",
    "phone" "text",
    "employment_type" "text" DEFAULT 'parttime'::"text",
    "address" "text",
    "birth_date" "date",
    "emergency_contact" "text",
    "hired_at" "date",
    "contract_end_date" "date",
    "work_hours" "text",
    "work_schedules" "jsonb" DEFAULT '[]'::"jsonb",
    "custom_pay_day" integer,
    "weekly_holiday" integer,
    "insurance_status" "jsonb" DEFAULT '{"health": false, "national": false, "employment": false, "industrial": false}'::"jsonb",
    "custom_wage_settings" "jsonb",
    "memo" "text",
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "resigned_at" timestamp with time zone,
    "contract_status" "text",
    "modusign_document_id" "text",
    "role" "text" DEFAULT 'staff'::"text",
    "base_yearly_wage" integer DEFAULT 0,
    "base_daily_wage" integer DEFAULT 0
);


ALTER TABLE "public"."store_members" OWNER TO "postgres";


COMMENT ON COLUMN "public"."store_members"."base_yearly_wage" IS 'Base yearly wage for yearly wage type employees';



COMMENT ON COLUMN "public"."store_members"."base_daily_wage" IS 'Base daily wage for daily wage type employees';



CREATE TABLE IF NOT EXISTS "public"."store_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "color" "text" DEFAULT '#808080'::"text",
    "permissions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "hierarchy_level" integer DEFAULT 0 NOT NULL,
    "is_system" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "parent_id" "uuid"
);


ALTER TABLE "public"."store_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "address" "text",
    "business_number" "text",
    "latitude" double precision,
    "longitude" double precision,
    "attendance_radius" integer DEFAULT 100,
    "operating_hours" "jsonb",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_by" "uuid" DEFAULT "auth"."uid"(),
    "wage_start_day" integer DEFAULT 1,
    "wage_end_day" integer DEFAULT 0,
    "pay_day" integer,
    "wage_exceptions" "jsonb" DEFAULT '{}'::"jsonb",
    "leave_calc_type" "text" DEFAULT 'monthly'::"text",
    "invite_code" "text",
    "owner_name" "text",
    "store_phone" "text",
    "zip_code" "text",
    "address_detail" "text",
    "image_url" "text",
    "stamp_image_url" "text"
);


ALTER TABLE "public"."stores" OWNER TO "postgres";


COMMENT ON COLUMN "public"."stores"."wage_start_day" IS 'Day of the month when wage period starts';



COMMENT ON COLUMN "public"."stores"."wage_end_day" IS 'Day of the month when wage period ends (0 for end of month)';



COMMENT ON COLUMN "public"."stores"."pay_day" IS 'Day of the month when wages are paid';



COMMENT ON COLUMN "public"."stores"."wage_exceptions" IS 'Custom wage settings for different employment types';



COMMENT ON COLUMN "public"."stores"."leave_calc_type" IS 'Calculation type for leave days (e.g., monthly, annual)';



CREATE TABLE IF NOT EXISTS "public"."tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "is_routine" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "user_id" "uuid",
    "schedule_id" "uuid",
    "assigned_date" "date",
    "status" "public"."task_status" DEFAULT 'pending'::"public"."task_status" NOT NULL,
    "completion_note" "text",
    "completed_at" timestamp with time zone,
    "assigned_role_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "checklist" "jsonb" DEFAULT '[]'::"jsonb",
    "task_type" "text" DEFAULT 'always'::"text",
    "start_time" timestamp with time zone,
    "due_date" "date",
    "priority" "text" DEFAULT 'normal'::"text",
    "assigner_id" "uuid",
    "is_done" boolean DEFAULT false,
    "done_at" timestamp with time zone,
    "end_time" timestamp with time zone,
    "is_all_day" boolean DEFAULT false,
    "assignee_ids" "uuid"[] DEFAULT '{}'::"uuid"[],
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "repeat_settings" "jsonb",
    "notification_settings" "jsonb" DEFAULT '{"beforeDeadline": true, "notifyAssignees": true, "notifyManagerOnComplete": false}'::"jsonb"
);


ALTER TABLE "public"."tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "transaction_date" "date" NOT NULL,
    "description" "text",
    "amount" integer DEFAULT 0 NOT NULL,
    "payment_status" "text" DEFAULT 'unpaid'::"text" NOT NULL,
    "statement_file_url" "text",
    "tax_invoice_file_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "chk_payment_status" CHECK (("payment_status" = ANY (ARRAY['unpaid'::"text", 'paid'::"text", 'partial'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."vendor_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "store_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text",
    "manager_name" "text",
    "contact_number" "text",
    "email" "text",
    "contract_start_date" "date",
    "contract_end_date" "date",
    "is_auto_renewal" boolean DEFAULT false,
    "contract_file_url" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "deleted_at" timestamp with time zone,
    "address" "text",
    "business_number" "text",
    "bank_account" "text",
    "direct_contact" "text",
    "contract_type" "text",
    "contract_amount" integer DEFAULT 0,
    "payment_cycle" "text",
    "notes" "text",
    CONSTRAINT "chk_contract_type" CHECK (("contract_type" = ANY (ARRAY['delivery'::"text", 'lease'::"text", 'service'::"text"]))),
    CONSTRAINT "chk_payment_cycle" CHECK (("payment_cycle" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'yearly'::"text", 'per_case'::"text"])))
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_reports"
    ADD CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ai_reports"
    ADD CONSTRAINT "ai_reports_store_id_period_key_key" UNIQUE ("store_id", "period_key");



ALTER TABLE ONLY "public"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_announcement_id_member_id_key" UNIQUE ("announcement_id", "member_id");



ALTER TABLE ONLY "public"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_maintenance_logs"
    ADD CONSTRAINT "asset_maintenance_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."asset_status_logs"
    ADD CONSTRAINT "asset_status_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_member_id_year_key" UNIQUE ("member_id", "year");



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_contracts"
    ADD CONSTRAINT "member_contracts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_records"
    ADD CONSTRAINT "payroll_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_assets"
    ADD CONSTRAINT "store_assets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_handovers"
    ADD CONSTRAINT "store_handovers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."store_roles"
    ADD CONSTRAINT "store_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payroll_records"
    ADD CONSTRAINT "unique_staff_period" UNIQUE ("staff_id", "period_year", "period_month");



ALTER TABLE ONLY "public"."vendor_transactions"
    ADD CONSTRAINT "vendor_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



CREATE INDEX "ai_reports_store_type_date_idx" ON "public"."ai_reports" USING "btree" ("store_id", "report_type", "generated_at" DESC);



CREATE INDEX "idx_announcements_store_id" ON "public"."store_announcements" USING "btree" ("store_id");



CREATE INDEX "idx_asset_maintenance_logs_asset_id" ON "public"."asset_maintenance_logs" USING "btree" ("asset_id", "maintenance_date" DESC);



CREATE INDEX "idx_asset_status_logs_asset_id" ON "public"."asset_status_logs" USING "btree" ("asset_id", "created_at" DESC);



CREATE INDEX "idx_attendance_member_id" ON "public"."store_attendance" USING "btree" ("member_id");



CREATE INDEX "idx_attendance_requests_member_id" ON "public"."store_attendance_requests" USING "btree" ("member_id");



CREATE INDEX "idx_attendance_requests_store_id" ON "public"."store_attendance_requests" USING "btree" ("store_id");



CREATE INDEX "idx_contracts_member_id" ON "public"."member_contracts" USING "btree" ("member_id");



CREATE INDEX "idx_leave_balances_member_id" ON "public"."leave_balances" USING "btree" ("member_id");



CREATE INDEX "idx_leave_balances_store_id" ON "public"."leave_balances" USING "btree" ("store_id");



CREATE INDEX "idx_leave_requests_member_id" ON "public"."leave_requests" USING "btree" ("member_id");



CREATE INDEX "idx_payroll_records_period" ON "public"."payroll_records" USING "btree" ("store_id", "period_year", "period_month");



CREATE INDEX "idx_payroll_records_staff_id" ON "public"."payroll_records" USING "btree" ("staff_id");



CREATE INDEX "idx_payroll_records_store_id" ON "public"."payroll_records" USING "btree" ("store_id");



CREATE INDEX "idx_schedules_member_id" ON "public"."schedules" USING "btree" ("member_id");



CREATE INDEX "idx_schedules_store_id" ON "public"."schedules" USING "btree" ("store_id");



CREATE INDEX "idx_store_members_store_id" ON "public"."store_members" USING "btree" ("store_id");



CREATE INDEX "idx_store_members_user_id" ON "public"."store_members" USING "btree" ("user_id");



CREATE INDEX "idx_store_roles_store_id" ON "public"."store_roles" USING "btree" ("store_id");



CREATE INDEX "idx_tasks_assigned_date" ON "public"."tasks" USING "btree" ("assigned_date");



CREATE INDEX "idx_tasks_store_id" ON "public"."tasks" USING "btree" ("store_id");



CREATE INDEX "idx_tasks_user_id" ON "public"."tasks" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_unique_active_member" ON "public"."store_members" USING "btree" ("store_id", "user_id") WHERE ("deleted_at" IS NULL);



CREATE UNIQUE INDEX "idx_unique_working_attendance" ON "public"."store_attendance" USING "btree" ("member_id", "target_date") WHERE (("status" = 'working'::"public"."attendance_status") AND ("deleted_at" IS NULL));



CREATE INDEX "idx_vendor_transactions_store_id" ON "public"."vendor_transactions" USING "btree" ("store_id", "transaction_date" DESC);



CREATE INDEX "idx_vendor_transactions_vendor_id" ON "public"."vendor_transactions" USING "btree" ("vendor_id", "transaction_date" DESC);



CREATE OR REPLACE TRIGGER "trigger_set_store_invite_code" BEFORE INSERT ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."set_store_invite_code"();



CREATE OR REPLACE TRIGGER "update_announcements_modtime" BEFORE UPDATE ON "public"."store_announcements" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_asset_maintenance_logs_modtime" BEFORE UPDATE ON "public"."asset_maintenance_logs" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_attendance_requests_modtime" BEFORE UPDATE ON "public"."store_attendance_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_leave_balances_modtime" BEFORE UPDATE ON "public"."leave_balances" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_leave_requests_modtime" BEFORE UPDATE ON "public"."leave_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_member_contracts_modtime" BEFORE UPDATE ON "public"."member_contracts" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_payroll_records_updated_at" BEFORE UPDATE ON "public"."payroll_records" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_profiles_modtime" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_schedules_modtime" BEFORE UPDATE ON "public"."schedules" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_store_assets_modtime" BEFORE UPDATE ON "public"."store_assets" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_store_attendance_modtime" BEFORE UPDATE ON "public"."store_attendance" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_store_handovers_modtime" BEFORE UPDATE ON "public"."store_handovers" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_store_members_modtime" BEFORE UPDATE ON "public"."store_members" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_store_roles_modtime" BEFORE UPDATE ON "public"."store_roles" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_stores_modtime" BEFORE UPDATE ON "public"."stores" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_tasks_modtime" BEFORE UPDATE ON "public"."tasks" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



CREATE OR REPLACE TRIGGER "update_vendors_modtime" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_modified_column"();



ALTER TABLE ONLY "public"."ai_reports"
    ADD CONSTRAINT "ai_reports_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "public"."store_announcements"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."announcement_reads"
    ADD CONSTRAINT "announcement_reads_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_maintenance_logs"
    ADD CONSTRAINT "asset_maintenance_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."store_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."asset_status_logs"
    ADD CONSTRAINT "asset_status_logs_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "public"."store_assets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_balances"
    ADD CONSTRAINT "leave_balances_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."store_members"("id");



ALTER TABLE ONLY "public"."leave_requests"
    ADD CONSTRAINT "leave_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_contracts"
    ADD CONSTRAINT "member_contracts_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_contracts"
    ADD CONSTRAINT "member_contracts_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_records"
    ADD CONSTRAINT "payroll_records_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payroll_records"
    ADD CONSTRAINT "payroll_records_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id");



ALTER TABLE ONLY "public"."schedules"
    ADD CONSTRAINT "schedules_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_announcements"
    ADD CONSTRAINT "store_announcements_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_assets"
    ADD CONSTRAINT "store_assets_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_assets"
    ADD CONSTRAINT "store_assets_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id");



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "public"."store_attendance"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "public"."store_members"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."store_members"("id");



ALTER TABLE ONLY "public"."store_attendance_requests"
    ADD CONSTRAINT "store_attendance_requests_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_attendance"
    ADD CONSTRAINT "store_attendance_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_handovers"
    ADD CONSTRAINT "store_handovers_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."store_members"("id");



ALTER TABLE ONLY "public"."store_handovers"
    ADD CONSTRAINT "store_handovers_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_handovers"
    ADD CONSTRAINT "store_handovers_target_role_id_fkey" FOREIGN KEY ("target_role_id") REFERENCES "public"."store_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."store_roles"("id");



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."store_members"
    ADD CONSTRAINT "store_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."store_roles"
    ADD CONSTRAINT "store_roles_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."store_roles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."store_roles"
    ADD CONSTRAINT "store_roles_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stores"
    ADD CONSTRAINT "stores_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_assigner_id_fkey" FOREIGN KEY ("assigner_id") REFERENCES "public"."store_members"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "public"."schedules"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tasks"
    ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_transactions"
    ADD CONSTRAINT "vendor_transactions_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_transactions"
    ADD CONSTRAINT "vendor_transactions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE CASCADE;



CREATE POLICY "Allow creator to view store roles" ON "public"."store_roles" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."stores"
  WHERE (("stores"."id" = "store_roles"."store_id") AND ("stores"."created_by" = "auth"."uid"())))));



CREATE POLICY "Allow creator to view their store" ON "public"."stores" FOR SELECT USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Delete schedules" ON "public"."schedules" FOR DELETE USING ("public"."has_store_permission"("store_id", 'manage_schedule'::"text"));



CREATE POLICY "Delete store members" ON "public"."store_members" FOR DELETE USING ("public"."has_role_permission"("store_id", 'manage_staff'::"text"));



CREATE POLICY "Delete store roles" ON "public"."store_roles" FOR DELETE USING ("public"."has_role_permission"("store_id", 'manage_roles'::"text"));



CREATE POLICY "Delete tasks" ON "public"."tasks" FOR DELETE USING ("public"."can_manage_tasks"("store_id"));



CREATE POLICY "Enable delete for manage_vendor permission" ON "public"."vendors" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM ("public"."store_members" "sm"
     LEFT JOIN "public"."store_roles" "sr" ON (("sm"."role_id" = "sr"."id")))
  WHERE (("sm"."store_id" = "vendors"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sr"."name" = ANY (ARRAY['점주'::"text", 'owner'::"text", '매니저'::"text"])) OR ("sr"."permissions" ? 'manage_vendor'::"text"))))));



CREATE POLICY "Enable delete for store members" ON "public"."vendor_transactions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "vendor_transactions"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."status" = 'active'::"public"."member_status")))));



CREATE POLICY "Enable insert for manage_vendor permission" ON "public"."vendors" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."store_members" "sm"
     LEFT JOIN "public"."store_roles" "sr" ON (("sm"."role_id" = "sr"."id")))
  WHERE (("sm"."store_id" = "vendors"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sr"."name" = ANY (ARRAY['점주'::"text", 'owner'::"text", '매니저'::"text"])) OR ("sr"."permissions" ? 'manage_vendor'::"text"))))));



CREATE POLICY "Enable insert for store members" ON "public"."vendor_transactions" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "store_members"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."status" = 'active'::"public"."member_status")))));



CREATE POLICY "Enable read access for store members" ON "public"."vendor_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "vendor_transactions"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."status" = 'active'::"public"."member_status")))));



CREATE POLICY "Enable read access for view_vendor permission" ON "public"."vendors" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."store_members" "sm"
     LEFT JOIN "public"."store_roles" "sr" ON (("sm"."role_id" = "sr"."id")))
  WHERE (("sm"."store_id" = "vendors"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sr"."name" = ANY (ARRAY['점주'::"text", 'owner'::"text", '매니저'::"text", '직원'::"text"])) OR ("sr"."permissions" ? 'view_vendor'::"text"))))));



CREATE POLICY "Enable update for manage_vendor permission" ON "public"."vendors" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM ("public"."store_members" "sm"
     LEFT JOIN "public"."store_roles" "sr" ON (("sm"."role_id" = "sr"."id")))
  WHERE (("sm"."store_id" = "vendors"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sr"."name" = ANY (ARRAY['점주'::"text", 'owner'::"text", '매니저'::"text"])) OR ("sr"."permissions" ? 'manage_vendor'::"text"))))));



CREATE POLICY "Enable update for store members" ON "public"."vendor_transactions" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "vendor_transactions"."store_id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."status" = 'active'::"public"."member_status")))));



CREATE POLICY "Insert announcement reads" ON "public"."announcement_reads" FOR INSERT WITH CHECK ((("member_id" IN ( SELECT "store_members"."id"
   FROM "public"."store_members"
  WHERE ("store_members"."user_id" = "auth"."uid"()))) AND "public"."is_store_member"(( SELECT "store_announcements"."store_id"
   FROM "public"."store_announcements"
  WHERE ("store_announcements"."id" = "announcement_reads"."announcement_id")))));



CREATE POLICY "Insert attendance" ON "public"."store_attendance" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."store_members" "sm"
  WHERE (("sm"."id" = "store_attendance"."member_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status")))) OR (EXISTS ( SELECT 1
   FROM ("public"."store_members" "sm"
     JOIN "public"."store_roles" "sr" ON (("sm"."role_id" = "sr"."id")))
  WHERE (("sm"."store_id" = "store_attendance"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sr"."hierarchy_level" = 100) OR (("sr"."permissions" ->> 'manage_attendance'::"text") = 'true'::"text")))))));



CREATE POLICY "Insert schedules" ON "public"."schedules" FOR INSERT WITH CHECK ("public"."has_store_permission"("store_id", 'manage_schedule'::"text"));



CREATE POLICY "Insert store roles" ON "public"."store_roles" FOR INSERT WITH CHECK ("public"."has_role_permission"("store_id", 'manage_roles'::"text"));



CREATE POLICY "Insert tasks" ON "public"."tasks" FOR INSERT WITH CHECK (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "Manage asset logs (DELETE)" ON "public"."asset_maintenance_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."store_assets" "a"
  WHERE (("a"."id" = "asset_maintenance_logs"."asset_id") AND "public"."is_store_member"("a"."store_id")))));



CREATE POLICY "Manage asset logs (INSERT)" ON "public"."asset_maintenance_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_assets" "a"
  WHERE (("a"."id" = "asset_maintenance_logs"."asset_id") AND "public"."is_store_member"("a"."store_id")))));



CREATE POLICY "Manage asset logs (UPDATE)" ON "public"."asset_maintenance_logs" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."store_assets" "a"
  WHERE (("a"."id" = "asset_maintenance_logs"."asset_id") AND "public"."is_store_member"("a"."store_id"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_assets" "a"
  WHERE (("a"."id" = "asset_maintenance_logs"."asset_id") AND "public"."is_store_member"("a"."store_id")))));



CREATE POLICY "Manage asset status logs (INSERT)" ON "public"."asset_status_logs" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_assets" "a"
  WHERE (("a"."id" = "asset_status_logs"."asset_id") AND "public"."is_store_member"("a"."store_id")))));



CREATE POLICY "Manage store assets (DELETE)" ON "public"."store_assets" FOR DELETE USING ("public"."is_store_member"("store_id"));



CREATE POLICY "Manage store assets (INSERT)" ON "public"."store_assets" FOR INSERT WITH CHECK ("public"."is_store_member"("store_id"));



CREATE POLICY "Manage store assets (UPDATE)" ON "public"."store_assets" FOR UPDATE USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL))) WITH CHECK (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "Manage store members" ON "public"."store_members" FOR UPDATE USING ("public"."has_role_permission"("store_id", 'manage_staff'::"text")) WITH CHECK ("public"."has_role_permission"("store_id", 'manage_staff'::"text"));



CREATE POLICY "Managers can update leave requests" ON "public"."leave_requests" FOR UPDATE USING ("public"."has_store_permission"("store_id", 'manage_leave'::"text")) WITH CHECK ("public"."has_store_permission"("store_id", 'manage_leave'::"text"));



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Store admins can delete payroll records" ON "public"."payroll_records" FOR DELETE USING ("public"."has_store_permission"("store_id", 'manage_payroll'::"text"));



CREATE POLICY "Store admins can insert payroll records" ON "public"."payroll_records" FOR INSERT WITH CHECK ("public"."has_store_permission"("store_id", 'manage_payroll'::"text"));



CREATE POLICY "Store admins can update payroll records" ON "public"."payroll_records" FOR UPDATE USING ("public"."has_store_permission"("store_id", 'manage_payroll'::"text"));



CREATE POLICY "Store admins can view all payroll records" ON "public"."payroll_records" FOR SELECT USING ("public"."has_store_permission"("store_id", 'manage_payroll'::"text"));



CREATE POLICY "Store members can insert ai_reports" ON "public"."ai_reports" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "ai_reports"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Store members can update ai_reports" ON "public"."ai_reports" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "ai_reports"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Store members can view ai_reports" ON "public"."ai_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "ai_reports"."store_id") AND ("store_members"."user_id" = "auth"."uid"())))));



CREATE POLICY "Store members with manage announcements permission can delete" ON "public"."store_announcements" FOR DELETE USING ("public"."can_manage_announcements"("store_id"));



CREATE POLICY "Store members with manage announcements permission can insert" ON "public"."store_announcements" FOR INSERT WITH CHECK ("public"."can_manage_announcements"("store_id"));



CREATE POLICY "Store members with manage announcements permission can update" ON "public"."store_announcements" FOR UPDATE USING ("public"."can_manage_announcements"("store_id")) WITH CHECK ("public"."can_manage_announcements"("store_id"));



CREATE POLICY "Update attendance" ON "public"."store_attendance" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."store_members" "sm"
  WHERE (("sm"."id" = "store_attendance"."member_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status")))) OR (EXISTS ( SELECT 1
   FROM ("public"."store_members" "sm"
     JOIN "public"."store_roles" "sr" ON (("sm"."role_id" = "sr"."id")))
  WHERE (("sm"."store_id" = "store_attendance"."store_id") AND ("sm"."user_id" = "auth"."uid"()) AND ("sm"."status" = 'active'::"public"."member_status") AND (("sr"."hierarchy_level" = 100) OR (("sr"."permissions" ->> 'manage_attendance'::"text") = 'true'::"text")))))));



CREATE POLICY "Update schedules" ON "public"."schedules" FOR UPDATE USING ("public"."has_store_permission"("store_id", 'manage_schedule'::"text")) WITH CHECK ("public"."has_store_permission"("store_id", 'manage_schedule'::"text"));



CREATE POLICY "Update store roles" ON "public"."store_roles" FOR UPDATE USING ("public"."has_role_permission"("store_id", 'manage_roles'::"text"));



CREATE POLICY "Update tasks" ON "public"."tasks" FOR UPDATE USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL) AND ("public"."can_manage_tasks"("store_id") OR ("auth"."uid"() = ANY ("assignee_ids"))))) WITH CHECK ("public"."is_store_member"("store_id"));



CREATE POLICY "Users can create stores" ON "public"."stores" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can insert leave requests" ON "public"."leave_requests" FOR INSERT WITH CHECK (("public"."is_store_member"("store_id") AND (("member_id" = "public"."get_current_member_id"("store_id")) OR "public"."has_store_permission"("store_id", 'manage_leave'::"text"))));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert roles" ON "public"."store_roles" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can join as member" ON "public"."store_members" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own payroll records" ON "public"."payroll_records" FOR SELECT USING (("staff_id" IN ( SELECT "store_members"."id"
   FROM "public"."store_members"
  WHERE ("store_members"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users with manage_store permission can update store" ON "public"."stores" FOR UPDATE USING ("public"."has_store_permission"("id", 'manage_store'::"text")) WITH CHECK ("public"."has_store_permission"("id", 'manage_store'::"text"));



CREATE POLICY "View allowed stores" ON "public"."stores" FOR SELECT USING (("public"."is_store_member"("id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View announcement reads" ON "public"."announcement_reads" FOR SELECT USING ("public"."is_store_member"(( SELECT "store_announcements"."store_id"
   FROM "public"."store_announcements"
  WHERE ("store_announcements"."id" = "announcement_reads"."announcement_id"))));



CREATE POLICY "View announcements" ON "public"."store_announcements" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View asset logs" ON "public"."asset_maintenance_logs" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."store_assets"
  WHERE (("store_assets"."id" = "asset_maintenance_logs"."asset_id") AND "public"."is_store_member"("store_assets"."store_id")))) AND ("deleted_at" IS NULL)));



CREATE POLICY "View asset status logs" ON "public"."asset_status_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."store_assets" "a"
  WHERE (("a"."id" = "asset_status_logs"."asset_id") AND "public"."is_store_member"("a"."store_id")))));



CREATE POLICY "View associated stores" ON "public"."stores" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."store_members"
  WHERE (("store_members"."store_id" = "stores"."id") AND ("store_members"."user_id" = "auth"."uid"()) AND ("store_members"."deleted_at" IS NULL)))) AND ("deleted_at" IS NULL)));



CREATE POLICY "View attendance" ON "public"."store_attendance" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View attendance requests" ON "public"."store_attendance_requests" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View contracts" ON "public"."member_contracts" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View handovers" ON "public"."store_handovers" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View leave balances" ON "public"."leave_balances" FOR SELECT USING ("public"."is_store_member"("store_id"));



CREATE POLICY "View leave requests" ON "public"."leave_requests" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View own store members" ON "public"."store_members" FOR SELECT USING ((("user_id" = "auth"."uid"()) AND ("deleted_at" IS NULL)));



CREATE POLICY "View schedules" ON "public"."schedules" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View store assets" ON "public"."store_assets" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View store members" ON "public"."store_members" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View store roles" ON "public"."store_roles" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View tasks" ON "public"."tasks" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



CREATE POLICY "View vendors" ON "public"."vendors" FOR SELECT USING (("public"."is_store_member"("store_id") AND ("deleted_at" IS NULL)));



ALTER TABLE "public"."ai_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."announcement_reads" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."asset_maintenance_logs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_balances" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."leave_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."member_contracts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."payroll_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."schedules" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_assets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_attendance_requests" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_handovers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_members" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."store_roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."can_manage_announcements"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_announcements"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_announcements"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_manage_tasks"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_manage_tasks"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_manage_tasks"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_unassigned_role_if_not_exists"("p_store_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_unassigned_role_if_not_exists"("p_store_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_unassigned_role_if_not_exists"("p_store_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_store"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_store"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_store"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_current_member_id"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_current_member_id"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_current_member_id"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role_permission"("store_id_param" "uuid", "permission_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role_permission"("store_id_param" "uuid", "permission_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role_permission"("store_id_param" "uuid", "permission_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_store_permission"("store_id_param" "uuid", "permission_param" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_store_permission"("store_id_param" "uuid", "permission_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_store_permission"("store_id_param" "uuid", "permission_param" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_store_member"("store_id_param" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_store_member"("store_id_param" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_store_member"("store_id_param" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_store_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_store_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_store_invite_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_modified_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_invite_code"("code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."verify_invite_code"("code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_invite_code"("code" "text") TO "service_role";


















GRANT ALL ON TABLE "public"."ai_reports" TO "anon";
GRANT ALL ON TABLE "public"."ai_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_reports" TO "service_role";



GRANT ALL ON TABLE "public"."announcement_reads" TO "anon";
GRANT ALL ON TABLE "public"."announcement_reads" TO "authenticated";
GRANT ALL ON TABLE "public"."announcement_reads" TO "service_role";



GRANT ALL ON TABLE "public"."asset_maintenance_logs" TO "anon";
GRANT ALL ON TABLE "public"."asset_maintenance_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_maintenance_logs" TO "service_role";



GRANT ALL ON TABLE "public"."asset_status_logs" TO "anon";
GRANT ALL ON TABLE "public"."asset_status_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."asset_status_logs" TO "service_role";



GRANT ALL ON TABLE "public"."leave_balances" TO "anon";
GRANT ALL ON TABLE "public"."leave_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_balances" TO "service_role";



GRANT ALL ON TABLE "public"."leave_requests" TO "anon";
GRANT ALL ON TABLE "public"."leave_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."leave_requests" TO "service_role";



GRANT ALL ON TABLE "public"."member_contracts" TO "anon";
GRANT ALL ON TABLE "public"."member_contracts" TO "authenticated";
GRANT ALL ON TABLE "public"."member_contracts" TO "service_role";



GRANT ALL ON TABLE "public"."payroll_records" TO "anon";
GRANT ALL ON TABLE "public"."payroll_records" TO "authenticated";
GRANT ALL ON TABLE "public"."payroll_records" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."schedules" TO "anon";
GRANT ALL ON TABLE "public"."schedules" TO "authenticated";
GRANT ALL ON TABLE "public"."schedules" TO "service_role";



GRANT ALL ON TABLE "public"."store_announcements" TO "anon";
GRANT ALL ON TABLE "public"."store_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."store_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."store_assets" TO "anon";
GRANT ALL ON TABLE "public"."store_assets" TO "authenticated";
GRANT ALL ON TABLE "public"."store_assets" TO "service_role";



GRANT ALL ON TABLE "public"."store_attendance" TO "anon";
GRANT ALL ON TABLE "public"."store_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."store_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."store_attendance_requests" TO "anon";
GRANT ALL ON TABLE "public"."store_attendance_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."store_attendance_requests" TO "service_role";



GRANT ALL ON TABLE "public"."store_handovers" TO "anon";
GRANT ALL ON TABLE "public"."store_handovers" TO "authenticated";
GRANT ALL ON TABLE "public"."store_handovers" TO "service_role";



GRANT ALL ON TABLE "public"."store_members" TO "anon";
GRANT ALL ON TABLE "public"."store_members" TO "authenticated";
GRANT ALL ON TABLE "public"."store_members" TO "service_role";



GRANT ALL ON TABLE "public"."store_roles" TO "anon";
GRANT ALL ON TABLE "public"."store_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."store_roles" TO "service_role";



GRANT ALL ON TABLE "public"."stores" TO "anon";
GRANT ALL ON TABLE "public"."stores" TO "authenticated";
GRANT ALL ON TABLE "public"."stores" TO "service_role";



GRANT ALL ON TABLE "public"."tasks" TO "anon";
GRANT ALL ON TABLE "public"."tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_transactions" TO "anon";
GRANT ALL ON TABLE "public"."vendor_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";









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































