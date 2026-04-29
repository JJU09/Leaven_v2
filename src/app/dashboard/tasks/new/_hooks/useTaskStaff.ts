import { useQuery } from '@tanstack/react-query';
import { getStaffList } from '@/features/staff/actions';

export function useTaskStaff(storeId: string | null) {
  return useQuery({
    queryKey: ['staff', storeId],
    queryFn: async () => {
      if (!storeId) return [];
      const staffList = await getStaffList(storeId);
      
      // Filter out invited users and return formatted data
      return staffList
        .filter(staff => staff.status !== 'invited')
        .map(staff => ({
          id: staff.id,
          name: staff.profile.full_name,
          role: staff.role_info?.name || '직원',
          avatar_url: staff.profile.avatar_url,
        }));
    },
    enabled: !!storeId,
  });
}