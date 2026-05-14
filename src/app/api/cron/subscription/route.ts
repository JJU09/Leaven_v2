import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requestBillingPayment } from '@/features/subscription/toss';
import { SubscriptionPlan } from '@/features/subscription/types';
import { addMonths, isBefore, differenceInDays } from 'date-fns';

const CRON_SECRET = process.env.CRON_SECRET;

const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 19900,
  pro: 39900,
  enterprise: 0,
};

export async function GET(request: Request) {
  // 1. Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Use service role key to bypass RLS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date();

  try {
    // 2. Find subscriptions that need renewal
    // Active subscriptions where current_period_end is before now
    const { data: renewals, error: renewalError } = await supabase
      .from('store_subscriptions')
      .select('*')
      .eq('status', 'active')
      .lt('current_period_end', now.toISOString());

    if (renewalError) throw renewalError;

    // 3. Find past_due subscriptions that are still in grace period (3 days)
    const { data: pastDue, error: pastDueError } = await supabase
      .from('store_subscriptions')
      .select('*')
      .eq('status', 'past_due');

    if (pastDueError) throw pastDueError;

    const results = {
      renewed: 0,
      failed: 0,
      downgraded: 0,
    };

    // Process renewals
    for (const sub of renewals || []) {
      if (sub.plan_id === 'free' || sub.plan_id === 'enterprise' || sub.cancel_at_period_end) {
        // Handle cancellations or free/enterprise plans
        if (sub.cancel_at_period_end) {
          await supabase
            .from('store_subscriptions')
            .update({
              plan_id: 'free',
              status: 'active',
              billing_key: null,
              cancel_at_period_end: false,
              canceled_at: null,
            })
            .eq('id', sub.id);
        } else {
           // Free/Enterprise just gets next period
           await supabase
            .from('store_subscriptions')
            .update({
              current_period_start: now.toISOString(),
              current_period_end: addMonths(now, 1).toISOString(),
            })
            .eq('id', sub.id);
        }
        continue;
      }

      // Try payment for basic/pro
      try {
        const amount = PLAN_PRICES[sub.plan_id as SubscriptionPlan];
        const orderId = `renewal_${sub.store_id}_${Date.now()}`;
        
        const paymentResult = await requestBillingPayment(
          sub.billing_key,
          sub.customer_key,
          amount,
          orderId,
          `Leaven ${sub.plan_id} plan renewal`
        );

        // Record success
        await supabase.from('payment_history').insert({
          store_id: sub.store_id,
          subscription_id: sub.id,
          payment_key: paymentResult.paymentKey,
          order_id: orderId,
          amount: paymentResult.totalAmount,
          status: paymentResult.status,
        });

        // Update subscription
        await supabase
          .from('store_subscriptions')
          .update({
            current_period_start: now.toISOString(),
            current_period_end: addMonths(now, 1).toISOString(),
            past_due_since: null,
          })
          .eq('id', sub.id);
          
        results.renewed++;
      } catch (error) {
        // Payment failed -> set to past_due, start grace period
        await supabase
          .from('store_subscriptions')
          .update({
            status: 'past_due',
            past_due_since: now.toISOString(),
          })
          .eq('id', sub.id);
          
        results.failed++;
      }
    }

    // Process past_due retries and downgrades
    for (const sub of pastDue || []) {
      if (!sub.past_due_since) continue;
      
      const pastDueDays = differenceInDays(now, new Date(sub.past_due_since));
      
      if (pastDueDays > 3) {
        // Grace period expired -> Downgrade to free
        await supabase
          .from('store_subscriptions')
          .update({
            plan_id: 'free',
            status: 'active',
            billing_key: null,
            past_due_since: null,
          })
          .eq('id', sub.id);
          
        results.downgraded++;
      } else {
        // Still in grace period -> Retry payment
        try {
          const amount = PLAN_PRICES[sub.plan_id as SubscriptionPlan];
          const orderId = `retry_${sub.store_id}_${Date.now()}`;
          
          const paymentResult = await requestBillingPayment(
            sub.billing_key,
            sub.customer_key,
            amount,
            orderId,
            `Leaven ${sub.plan_id} plan retry`
          );

          // Record success
          await supabase.from('payment_history').insert({
            store_id: sub.store_id,
            subscription_id: sub.id,
            payment_key: paymentResult.paymentKey,
            order_id: orderId,
            amount: paymentResult.totalAmount,
            status: paymentResult.status,
          });

          // Recover subscription
          await supabase
            .from('store_subscriptions')
            .update({
              status: 'active',
              current_period_start: now.toISOString(),
              current_period_end: addMonths(now, 1).toISOString(),
              past_due_since: null,
            })
            .eq('id', sub.id);
            
          results.renewed++;
        } catch (error) {
          // Retry failed again, leave as past_due
          results.failed++;
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Subscription cron failed:', error);
    return NextResponse.json({ success: false, error: 'Cron job failed' }, { status: 500 });
  }
}