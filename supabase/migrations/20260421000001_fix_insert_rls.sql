-- ==========================================
-- Migration: Add missing INSERT RLS policies
-- Description: Allows authenticated users to create stores, initial roles, and join as members.
-- ==========================================

-- 1. stores 테이블: 인증된 사용자는 누구나 매장을 생성(INSERT)할 수 있음
CREATE POLICY "Users can create stores" 
ON public.stores 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 2. store_roles 테이블: 누구나(매장 생성 시점에 아직 멤버 등록 전이므로) 인증된 사용자면 역할 생성이 가능하도록 허용
-- (실제 보안 제어는 앱 단 로직이나, 매장 소유 여부로 제어하는 것이 이상적이나 생성 시점의 닭과 계란 문제를 피하기 위해 넓게 엽니다)
CREATE POLICY "Users can insert roles" 
ON public.store_roles 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. store_members 테이블: 인증된 사용자면 멤버 등록(INSERT)이 가능하도록 허용
CREATE POLICY "Users can join as member" 
ON public.store_members 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);