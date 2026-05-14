-- Create store_subscriptions table
CREATE TABLE IF NOT EXISTS public.store_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE UNIQUE,
    plan_id TEXT NOT NULL DEFAULT 'free',
    status TEXT NOT NULL DEFAULT 'active',
    billing_key TEXT,
    customer_key TEXT NOT NULL UNIQUE,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    canceled_at TIMESTAMPTZ,
    past_due_since TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS public.payment_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES public.store_subscriptions(id) ON DELETE CASCADE,
    payment_key TEXT,
    order_id TEXT NOT NULL UNIQUE,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL,
    payment_method TEXT,
    receipt_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Setup RLS for store_subscriptions
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their subscriptions"
    ON public.store_subscriptions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.store_id = store_subscriptions.store_id
            AND sm.profile_id = auth.uid()
            AND sm.role = 'owner'
        )
    );

-- Setup RLS for payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners can view their payment history"
    ON public.payment_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            WHERE sm.store_id = payment_history.store_id
            AND sm.profile_id = auth.uid()
            AND sm.role = 'owner'
        )
    );

-- Add triggers for updated_at
CREATE TRIGGER set_updated_at_store_subscriptions
    BEFORE UPDATE ON public.store_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Automatically create a free subscription when a store is created
CREATE OR REPLACE FUNCTION public.handle_new_store_subscription()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.store_subscriptions (store_id, customer_key, plan_id, status)
    VALUES (NEW.id, 'cust_' || NEW.id, 'free', 'active');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_store_created_create_subscription
    AFTER INSERT ON public.stores
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_store_subscription();

-- Backfill subscriptions for existing stores
INSERT INTO public.store_subscriptions (store_id, customer_key, plan_id, status)
SELECT id, 'cust_' || id, 'free', 'active'
FROM public.stores
ON CONFLICT (store_id) DO NOTHING;