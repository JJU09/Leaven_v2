-- ==========================================
-- Migration: Add phone column to profiles
-- Description: 유저의 통합 연락처 관리를 위해 profiles 테이블에 phone 컬럼을 추가합니다.
-- ==========================================

-- 1. profiles 테이블에 phone 컬럼 추가
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. 컬럼 설명 추가 (유지보수를 위한 코멘트)
COMMENT ON COLUMN public.profiles.phone IS '유저의 기본 연락처 (통합 관리용)';
