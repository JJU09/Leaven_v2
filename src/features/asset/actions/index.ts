'use server';

import { createClient } from '@/lib/supabase/server';
import { 
  AssetDetail, 
  AssetStatus, 
  AssetWithVendor, 
  GetAssetsParams, 
  StoreAsset,
  AssetMaintenanceLog
} from '../types';

export async function getAssets({
  storeId,
  page = 1,
  limit = 10,
  search,
  category,
  status,
  location
}: GetAssetsParams) {
  const supabase = await createClient();
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('store_assets')
    .select('*, vendors(id, name, contact_number)', { count: 'exact' })
    .eq('store_id', storeId)
    .is('deleted_at', null);

  if (search) {
    query = query.or(`name.ilike.%${search}%,serial_number.ilike.%${search}%`);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (status) {
    query = query.eq('status', status);
  }
  if (location) {
    query = query.eq('installation_location', location);
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    console.error('getAssets error:', error);
    throw new Error('자산 목록을 불러오는데 실패했습니다.');
  }

  return {
    data: data as unknown as AssetWithVendor[],
    count: count || 0,
  };
}

export async function getAssetSummary(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('store_assets')
    .select('status')
    .eq('store_id', storeId)
    .is('deleted_at', null);

  if (error) {
    console.error('getAssetSummary error:', error);
    throw new Error('자산 요약을 불러오는데 실패했습니다.');
  }

  const total = data.length;
  const active = data.filter(a => a.status === 'active').length;
  const issue = data.filter(a => ['needs_inspection', 'under_repair', 'as_submitted'].includes(a.status)).length;
  const disposed = data.filter(a => a.status === 'disposed').length;

  return { total, active, issue, disposed };
}

export async function getUniqueLocations(storeId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('store_assets')
    .select('installation_location')
    .eq('store_id', storeId)
    .is('deleted_at', null)
    .not('installation_location', 'is', null);

  if (error) {
    console.error('getUniqueLocations error:', error);
    throw new Error('위치 목록을 불러오는데 실패했습니다.');
  }

  const locations = Array.from(new Set(data.map(item => item.installation_location))).filter(Boolean);
  return locations as string[];
}

export async function getAssetDetail(assetId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('store_assets')
    .select(`
      *,
      vendors(id, name, contact_number, email),
      asset_maintenance_logs(*),
      asset_status_logs(*)
    `)
    .eq('id', assetId)
    .single();

  if (error) {
    console.error('getAssetDetail error:', error);
    throw new Error('자산 상세 정보를 불러오는데 실패했습니다.');
  }

  // Fetch user names for status logs
  if (data.asset_status_logs && data.asset_status_logs.length > 0) {
    const userIds = Array.from(new Set(data.asset_status_logs.map((log: any) => log.changed_by).filter(Boolean)));
    
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
        
      if (profiles) {
        const profileMap = profiles.reduce((acc: any, profile: any) => {
          acc[profile.id] = profile.full_name;
          return acc;
        }, {});
        
        data.asset_status_logs = data.asset_status_logs.map((log: any) => ({
          ...log,
          changer_name: log.changed_by ? profileMap[log.changed_by] : null
        }));
      }
    }
  }

  // Sort logs in memory since subquery ordering can sometimes be tricky
  if (data.asset_maintenance_logs) {
    data.asset_maintenance_logs.sort((a: any, b: any) => 
      new Date(b.maintenance_date).getTime() - new Date(a.maintenance_date).getTime()
    );
  }
  if (data.asset_status_logs) {
    data.asset_status_logs.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return data as unknown as AssetDetail;
}

export async function updateAssetStatus(
  assetId: string, 
  fromStatus: AssetStatus, 
  toStatus: AssetStatus, 
  changedBy: string,
  note?: string
) {
  const supabase = await createClient();

  // 1. 상태 로그 기록
  const { error: logError } = await supabase
    .from('asset_status_logs')
    .insert({
      asset_id: assetId,
      from_status: fromStatus,
      to_status: toStatus,
      changed_by: changedBy,
      note: note
    });

  if (logError) {
    console.error('insert status log error:', logError);
    throw new Error('상태 변경 이력 기록에 실패했습니다.');
  }

  // 2. 자산 상태 업데이트
  const { error: updateError } = await supabase
    .from('store_assets')
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq('id', assetId);

  if (updateError) {
    console.error('update asset status error:', updateError);
    throw new Error('자산 상태 변경에 실패했습니다.');
  }

  return { success: true };
}

export async function createMaintenanceLog(log: Partial<AssetMaintenanceLog>) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('asset_maintenance_logs')
    .insert([log]);

  if (error) {
    console.error('createMaintenanceLog error:', error);
    throw new Error('유지보수 이력 등록에 실패했습니다.');
  }

  return { success: true };
}

export async function createAsset(asset: Partial<StoreAsset>, userId: string) {
  const supabase = await createClient();

  // 자산 등록
  const { data, error } = await supabase
    .from('store_assets')
    .insert([{...asset, status: asset.status || 'active'}])
    .select()
    .single();

  if (error) {
    console.error('createAsset error:', error);
    throw new Error('자산 등록에 실패했습니다.');
  }

  // 초기 상태 로그 기록
  await supabase
    .from('asset_status_logs')
    .insert({
      asset_id: data.id,
      from_status: null,
      to_status: asset.status || 'active',
      changed_by: userId,
      note: '최초 등록'
    });

  return data as StoreAsset;
}

export async function updateAsset(assetId: string, updates: Partial<StoreAsset>) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('store_assets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', assetId);

  if (error) {
    console.error('updateAsset error:', error);
    throw new Error('자산 수정에 실패했습니다.');
  }

  return { success: true };
}

export async function deleteAsset(assetId: string) {
  const supabase = await createClient();

  // 소프트 삭제
  const { error } = await supabase
    .from('store_assets')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', assetId);

  if (error) {
    console.error('deleteAsset error:', error);
    throw new Error('자산 삭제에 실패했습니다.');
  }

  return { success: true };
}