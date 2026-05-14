'use server';

import { createClient } from '@/lib/supabase/server';
import { issueBillingKey, requestBillingPayment } from './toss';
import { SubscriptionPlan } from './types';
import { addMonths } from 'date-fns';

const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 19900,
  pro: 39900,
  enterprise: 0, // Custom pricing
};

export async function subscribeToPlan(storeId: string, planId: SubscriptionPlan, authKey: string) {
  const supabase = await createClient();

  // 1. Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from('store_subscriptions')
    .select('*')
    .eq('store_id', storeId)
    .single();

  if (subError || !subscription) {
    throw new Error('Subscription not found');
  }

  // 2. Issue billing key from Toss
  const billingInfo = await issueBillingKey(authKey, subscription.customer_key);

  // 3. Process initial payment if price > 0
  const amount = PLAN_PRICES[planId];
  let paymentResult = null;
  const orderId = `order_${storeId}_${Date.now()}`;

  if (amount > 0) {
    paymentResult = await requestBillingPayment(
      billingInfo.billingKey,
      subscription.customer_key,
      amount,
      orderId,
      `Leaven ${planId} plan (1 month)`
    );

    // Record payment history
    await supabase.from('payment_history').insert({
      store_id: storeId,
      subscription_id: subscription.id,
      payment_key: paymentResult.paymentKey,
      order_id: orderId,
      amount: paymentResult.totalAmount,
      status: paymentResult.status,
      payment_method: paymentResult.method,
      receipt_url: paymentResult.card.receiptUrl,
    });
  }

  // 4. Update subscription
  const currentPeriodStart = new Date();
  const currentPeriodEnd = addMonths(currentPeriodStart, 1);

  const { error: updateError } = await supabase
    .from('store_subscriptions')
    .update({
      plan_id: planId,
      status: 'active',
      billing_key: billingInfo.billingKey,
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      cancel_at_period_end: false,
      canceled_at: null,
      past_due_since: null,
    })
    .eq('id', subscription.id);

  if (updateError) {
    throw new Error('Failed to update subscription');
  }

  return { success: true };
}

export async function cancelSubscription(storeId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('store_subscriptions')
    .update({
      cancel_at_period_end: true,
      canceled_at: new Date().toISOString(),
    })
    .eq('store_id', storeId);

  if (error) {
    throw new Error('Failed to cancel subscription');
  }

  return { success: true };
}