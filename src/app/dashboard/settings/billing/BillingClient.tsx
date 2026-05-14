'use client';

import { useState } from 'react';
import { loadTossPayments } from '@tosspayments/payment-sdk';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { SubscriptionPlan, StoreSubscription } from '@/features/subscription/types';
import { subscribeToPlan, cancelSubscription } from '@/features/subscription/actions';

const TOSS_CLIENT_KEY = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY || '';

const PLANS = [
  {
    id: 'free' as SubscriptionPlan,
    name: 'Free',
    price: 0,
    description: '초기 매장을 위한 핵심 관리 기능',
    features: ['직원 3명, 자산 5개 등록', '기본 근태 및 스케줄 관리', 'AI 기능 미지원'],
  },
  {
    id: 'basic' as SubscriptionPlan,
    name: 'Basic',
    price: 19900,
    description: 'AI와 함께하는 스마트한 매장 운영',
    features: ['직원 무제한 등록', '스케줄 AI 초안 자동 생성', '인수인계 AI 요약', '일간/주간 AI 리포트 제공'],
  },
  {
    id: 'pro' as SubscriptionPlan,
    name: 'Pro',
    price: 39900,
    description: '제약 없는 관리와 실시간 AI 매니저',
    features: ['자산 관리 무제한', '거래처 관리 무제한', '실시간 AI 챗 패널', 'Basic의 모든 기능 포함'],
  },
  {
    id: 'enterprise' as SubscriptionPlan,
    name: 'Enterprise',
    price: null, // Indicates custom pricing
    description: '다점포 프랜차이즈를 위한 완벽한 솔루션',
    features: ['다점포 통합 관리 대시보드', '전 지점 통합 AI 분석', '프랜차이즈 권한 제어', '맞춤형 API 연동'],
  },
];

interface BillingClientProps {
  storeId: string;
  initialSubscription: StoreSubscription | null;
}

export function BillingClient({ storeId, initialSubscription }: BillingClientProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubscribe = async (planId: SubscriptionPlan) => {
    if (!storeId) {
      toast.error('매장 정보를 불러올 수 없습니다. 새로고침 후 다시 시도해 주세요.');
      return;
    }
    
    if (!TOSS_CLIENT_KEY) {
      toast.error('결제 연동 설정이 누락되었습니다. (TOSS_CLIENT_KEY)');
      return;
    }
    
    if (planId === 'free') {
      try {
        setIsProcessing(true);
        await cancelSubscription(storeId);
        toast.success('구독이 해지되었습니다. 다음 결제일부터 Free 요금제로 전환됩니다.');
        // 서버 컴포넌트 렌더링에 의존하므로 강제 새로고침 필요
        window.location.reload();
      } catch (error) {
        toast.error('구독 해지에 실패했습니다.');
        setIsProcessing(false);
      }
      return;
    }

    try {
      setIsProcessing(true);
      const tossPayments = await loadTossPayments(TOSS_CLIENT_KEY);
      
      tossPayments.requestBillingAuth('카드', {
        customerKey: initialSubscription?.customer_key || `cust_${storeId}`,
        successUrl: `${window.location.origin}/api/webhooks/toss/success?planId=${planId}&storeId=${storeId}`,
        failUrl: `${window.location.origin}/dashboard/settings/billing?error=auth_failed`,
      });
      // 리다이렉트되므로 isProcessing(false) 호출 안함
    } catch (error) {
      console.error(error);
      toast.error('결제 창을 여는 데 실패했습니다.');
      setIsProcessing(false);
    }
  };

  const currentPlan = (initialSubscription?.plan_id as SubscriptionPlan) || 'free';

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">요금제 관리</h2>
        <p className="text-muted-foreground mt-2">
          매장 규모에 맞는 최적의 요금제를 선택하세요.
        </p>
      </div>

      {initialSubscription?.status === 'past_due' && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md font-medium">
          결제에 실패하여 유예 기간(3일)이 적용 중입니다. 결제 수단을 업데이트해주세요.
        </div>
      )}

      {initialSubscription?.cancel_at_period_end && (
        <div className="bg-muted p-4 rounded-md font-medium">
          구독이 해지되었습니다. {new Date(initialSubscription.current_period_end || '').toLocaleDateString()}까지 이용 가능합니다.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id;
          
          return (
            <Card 
              key={plan.id} 
              className={isCurrentPlan ? 'border-primary shadow-md' : ''}
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  {plan.name}
                  {isCurrentPlan && (
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                      현재 사용 중
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {plan.price === null ? '별도 문의' : plan.price === 0 ? '무료' : `₩${plan.price.toLocaleString()}`}
                  </span>
                  {plan.price !== null && plan.price > 0 && <span className="text-muted-foreground">/월</span>}
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-sm">
                      <Check className="h-4 w-4 text-primary mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.id === 'enterprise' ? (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => {
                      toast.info('도입 문의는 고객센터(1588-0000)로 연락 부탁드립니다.');
                    }}
                  >
                    도입 문의하기
                  </Button>
                ) : (
                  <Button 
                    className="w-full" 
                    variant={isCurrentPlan ? "outline" : "default"}
                    disabled={isCurrentPlan || isProcessing || initialSubscription?.cancel_at_period_end}
                    onClick={() => handleSubscribe(plan.id)}
                  >
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isCurrentPlan 
                      ? '현재 요금제' 
                      : plan.id === 'free' 
                        ? '구독 해지' 
                        : '선택하기'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}