'use client';

import { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SubscriptionPlan } from '../types';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  storeId: string;
  requiredPlan?: SubscriptionPlan;
  requiredFeature?: 'staff' | 'asset' | 'ai_report' | 'task';
  children: ReactNode;
  fallback?: ReactNode;
}

const FEATURE_REQUIREMENTS: Record<string, SubscriptionPlan[]> = {
  ai_report: ['basic', 'pro', 'enterprise'],
  task: ['basic', 'pro', 'enterprise'],
  asset: ['pro', 'enterprise'],
};

export function SubscriptionGuard({ 
  storeId, 
  requiredPlan,
  requiredFeature,
  children, 
  fallback 
}: SubscriptionGuardProps) {
  const supabase = createClient();

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['subscription', storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_subscriptions')
        .select('plan_id, status')
        .eq('store_id', storeId)
        .single();
        
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentPlan = (subscription?.plan_id as SubscriptionPlan) || 'free';
  const status = subscription?.status || 'active';

  let isAllowed = true;

  if (requiredPlan) {
    // Basic hierarchy check: enterprise > pro > basic > free
    const planWeights: Record<SubscriptionPlan, number> = {
      free: 0,
      basic: 1,
      pro: 2,
      enterprise: 3
    };
    
    if (planWeights[currentPlan] < planWeights[requiredPlan]) {
      isAllowed = false;
    }
  }

  if (requiredFeature && FEATURE_REQUIREMENTS[requiredFeature]) {
    if (!FEATURE_REQUIREMENTS[requiredFeature].includes(currentPlan)) {
      isAllowed = false;
    }
  }

  // Block access if subscription is canceled
  if (status === 'canceled') {
    isAllowed = false;
  }

  if (!isAllowed) {
    if (fallback) return <>{fallback}</>;

    return (
      <Card className="w-full max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>요금제 업그레이드 필요</CardTitle>
          <CardDescription>
            이 기능을 사용하려면 요금제 업그레이드가 필요합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-end">
          <Link href={`/dashboard/settings/billing`}>
            <Button>요금제 확인하기</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}