import { createClient } from '@/lib/supabase/server';
import { SubscriptionPlan } from './types';

export const SUBSCRIPTION_LIMITS = {
  free: {
    staffCount: 3,
    assetCount: 5,
  },
  basic: {
    staffCount: Infinity,
    assetCount: 5,
  },
  pro: {
    staffCount: Infinity,
    assetCount: Infinity,
  },
  enterprise: {
    staffCount: Infinity,
    assetCount: Infinity,
  },
} as const;

export async function checkSubscriptionLimit(
  storeId: string, 
  type: 'staffCount' | 'assetCount'
): Promise<{ allowed: boolean; message?: string }> {
  const supabase = await createClient();

  // 1. Get current subscription plan
  const { data: subscription } = await supabase
    .from('store_subscriptions')
    .select('plan_id, status')
    .eq('store_id', storeId)
    .single();

  const planId = (subscription?.plan_id as SubscriptionPlan) || 'free';
  const limit = SUBSCRIPTION_LIMITS[planId][type];

  if (limit === Infinity) {
    return { allowed: true };
  }

  // 2. Count current usage based on type
  let currentCount = 0;

  if (type === 'staffCount') {
    const { count } = await supabase
      .from('store_members')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .is('deleted_at', null);
    
    currentCount = count || 0;
  } else if (type === 'assetCount') {
    const { count } = await supabase
      .from('store_assets')
      .select('*', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .is('deleted_at', null);
      
    currentCount = count || 0;
  }

  // 3. Check if limit is reached
  if (currentCount >= limit) {
    const typeLabel = type === 'staffCount' ? '직원' : '자산';
    return { 
      allowed: false, 
      message: `${planId.toUpperCase()} 요금제는 ${typeLabel}을(를) 최대 ${limit}개까지만 등록할 수 있습니다. 요금제를 업그레이드해주세요.` 
    };
  }

  return { allowed: true };
}