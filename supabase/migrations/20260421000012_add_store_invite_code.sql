-- 1. stores 테이블에 invite_code 컬럼 추가
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS invite_code TEXT;

-- 2. 랜덤 8자리 영문/숫자 코드 생성 함수
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
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

-- 3. 기존 매장에 invite_code 부여
DO $$
DECLARE
  store_record RECORD;
BEGIN
  FOR store_record IN SELECT id FROM public.stores WHERE invite_code IS NULL LOOP
    UPDATE public.stores SET invite_code = generate_invite_code() WHERE id = store_record.id;
  END LOOP;
END;
$$;

-- 4. UNIQUE 제약 조건 추가
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_invite_code_key'
  ) THEN
    ALTER TABLE public.stores ADD CONSTRAINT stores_invite_code_key UNIQUE (invite_code);
  END IF;
END;
$$;

-- 5. INSERT 시 자동으로 invite_code 할당하는 트리거 함수
CREATE OR REPLACE FUNCTION set_store_invite_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$;

-- 6. 트리거 생성
DROP TRIGGER IF EXISTS trigger_set_store_invite_code ON public.stores;
CREATE TRIGGER trigger_set_store_invite_code
  BEFORE INSERT ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION set_store_invite_code();

-- 7. verify_invite_code RPC 함수 생성
CREATE OR REPLACE FUNCTION verify_invite_code(code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  address TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.name, s.description, s.address
  FROM public.stores s
  WHERE s.invite_code = code AND s.deleted_at IS NULL;
END;
$$;

-- 권한 부여
GRANT EXECUTE ON FUNCTION verify_invite_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_invite_code(TEXT) TO anon;