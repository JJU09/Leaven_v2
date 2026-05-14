import { NextResponse } from 'next/server';
import { subscribeToPlan } from '@/features/subscription/actions';
import { SubscriptionPlan } from '@/features/subscription/types';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const customerKey = searchParams.get('customerKey');
  const authKey = searchParams.get('authKey');
  const planId = searchParams.get('planId') as SubscriptionPlan;
  const storeId = searchParams.get('storeId');

  if (!customerKey || !authKey || !planId || !storeId) {
    return NextResponse.redirect(
      new URL('/dashboard/settings/billing?error=invalid_request', request.url)
    );
  }

  try {
    await subscribeToPlan(storeId, planId, authKey);
    return NextResponse.redirect(
      new URL('/dashboard/settings/billing?success=true', request.url)
    );
  } catch (error) {
    console.error('Failed to process toss billing auth:', error);
    return NextResponse.redirect(
      new URL('/dashboard/settings/billing?error=processing_failed', request.url)
    );
  }
}