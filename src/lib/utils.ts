import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 사용자 정보 표시 시 profiles 테이블의 정보를 최우선으로 사용하기 위한 유틸리티 함수
 */
export function getMemberDisplayName(member: any): string {
  if (!member) return '이름 없음'
  
  // profiles.full_name (또는 profile.full_name, user.full_name) 이 있으면 최우선
  if (member.profiles?.full_name) return member.profiles.full_name
  if (member.profile?.full_name) return member.profile.full_name
  if (member.user?.full_name) return member.user.full_name
  
  // 없으면 store_members 의 수기 등록 name 사용
  if (member.name) return member.name
  
  return '이름 없음'
}
