export const STATIC_PERMISSIONS = [
  // 📌 메인
  { code: 'view_dashboard', name: '대시보드 조회', description: '매장 현황 및 요약 정보 조회', category: '메인' },

  { code: 'view_announcements', name: '공지사항 조회', description: '매장 공지사항 조회', category: '메인' },
  { code: 'manage_announcements', name: '공지사항 관리', description: '매장 공지사항 작성 및 관리', category: '메인' },

  // 👥 HR 관리
  { code: 'view_staff', name: '직원 관리 조회', description: '직원 목록 및 기본 정보 조회', category: 'HR 관리' },
  { code: 'manage_staff', name: '직원 관리 관리', description: '직원 초대, 정보 수정, 근로계약 관리', category: 'HR 관리' },

  { code: 'view_attendance', name: '출퇴근 관리 조회', description: '직원들의 출퇴근 기록 및 근태 내역 조회', category: 'HR 관리' },
  { code: 'manage_attendance', name: '출퇴근 관리 관리', description: '출퇴근 기록 수정 및 근태 이상 관리', category: 'HR 관리' },

  { code: 'view_leave', name: '휴가 및 연차 조회', description: '직원들의 휴가 사용 내역 및 잔여 연차 조회', category: 'HR 관리' },
  { code: 'manage_leave', name: '휴가 및 연차 관리', description: '휴가 신청 승인/반려 및 연차 일수 관리', category: 'HR 관리' },

  { code: 'view_salary', name: '급여 정산 조회 (준비 중)', description: '본인 및 직원의 시급/월급 등 급여 정보 조회', category: 'HR 관리' },
  { code: 'manage_salary', name: '급여 정산 관리 (준비 중)', description: '급여 계산, 명세서 발급 및 정산 내역 관리', category: 'HR 관리' },

  // ⏰ 업무 및 일정 관리
  { code: 'view_schedule', name: '스케줄 관리 조회', description: '전체 직원의 근무 일정 조회', category: '업무 및 일정 관리' },
  { code: 'manage_schedule', name: '스케줄 관리 관리', description: '근무 일정 등록, 수정 및 삭제', category: '업무 및 일정 관리' },

  { code: 'view_tasks', name: '업무 관리 조회', description: '할 일 및 업무 일지 조회', category: '업무 및 일정 관리' },
  { code: 'manage_tasks', name: '업무 관리 관리', description: '업무 지시, 템플릿 생성 및 결과 확인', category: '업무 및 일정 관리' },

  // 📦 자산 및 거래처 관리
  { code: 'view_asset', name: '자산 관리 조회', description: '매장 자산 및 유지보수 내역 조회', category: '자산 및 거래처 관리' },
  { code: 'manage_asset', name: '자산 관리 관리', description: '자산 등록, 수정 및 유지보수 이력 관리', category: '자산 및 거래처 관리' },

  { code: 'view_vendor', name: '거래처 관리 조회', description: '매장 거래처 및 계약/결제 내역 조회', category: '자산 및 거래처 관리' },
  { code: 'manage_vendor', name: '거래처 관리 관리', description: '거래처 등록, 수정 및 거래 내역 관리', category: '자산 및 거래처 관리' },

  // ⚙️ 시스템 설정
  { code: 'manage_store', name: '매장 관리', description: '매장 정보 설정 및 삭제', category: '시스템 설정' },
  { code: 'manage_roles', name: '직급 및 권한 관리', description: '직급 생성 및 메뉴 접근 권한 설정', category: '시스템 설정' }
] as const;

export type PermissionCode = typeof STATIC_PERMISSIONS[number]['code'];

export type Permission = {
  code: string;
  name: string;
  description: string;
  category: string;
};

export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionCode[]> = {
  점주: [
    'manage_store', 'manage_roles',
    'view_dashboard', 
    'view_staff', 'manage_staff',
    'view_salary', 'manage_salary',
    'view_schedule', 'manage_schedule',
    'view_attendance', 'manage_attendance',
    'view_leave', 'manage_leave',
    'view_tasks', 'manage_tasks',
    'view_asset', 'manage_asset',
    'view_vendor', 'manage_vendor',
    'view_announcements', 'manage_announcements'
  ],
  매니저: [
    'view_dashboard', 
    'view_staff', 
    'view_schedule', 'manage_schedule',
    'view_attendance', 'manage_attendance', 
    'view_leave', 'manage_leave', 
    'view_tasks', 'manage_tasks',
    'view_asset', 'manage_asset', 
    'view_vendor', 'manage_vendor',
    'view_announcements', 'manage_announcements'
  ],
  직원: [
    'view_staff', 
    'view_schedule', 
    'view_attendance', 
    'view_leave', 
    'view_tasks', 
    'view_asset', 
    'view_vendor', 
    'view_announcements'
  ]
}