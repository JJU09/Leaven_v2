-- ==========================================
-- vendors 컬럼 추가
-- ==========================================
ALTER TABLE public.vendors
    ADD COLUMN IF NOT EXISTS address          TEXT,
    ADD COLUMN IF NOT EXISTS business_number  TEXT,
    ADD COLUMN IF NOT EXISTS bank_account     TEXT,
    ADD COLUMN IF NOT EXISTS direct_contact   TEXT,
    ADD COLUMN IF NOT EXISTS contract_type    TEXT
        CONSTRAINT chk_contract_type
        CHECK (contract_type IN ('delivery', 'lease', 'service')),
    ADD COLUMN IF NOT EXISTS contract_amount  INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_cycle    TEXT
        CONSTRAINT chk_payment_cycle
        CHECK (payment_cycle IN ('monthly', 'quarterly', 'yearly', 'per_case')),
    ADD COLUMN IF NOT EXISTS notes            TEXT;

-- ==========================================
-- vendor_transactions — 신규
-- ==========================================
CREATE TABLE IF NOT EXISTS public.vendor_transactions (
    id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    store_id             UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
    vendor_id            UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    transaction_date     DATE NOT NULL,
    description          TEXT,
    amount               INTEGER NOT NULL DEFAULT 0,
    payment_status       TEXT NOT NULL DEFAULT 'unpaid'
        CONSTRAINT chk_payment_status
        CHECK (payment_status IN ('unpaid', 'paid', 'partial', 'cancelled')),
    statement_file_url   TEXT,   -- 거래명세서
    tax_invoice_file_url TEXT,   -- 세금계산서
    created_at           TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at           TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_vendor_transactions_vendor_id
    ON public.vendor_transactions(vendor_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_vendor_transactions_store_id
    ON public.vendor_transactions(store_id, transaction_date DESC);

-- ==========================================
-- vendor_transactions RLS
-- ==========================================
ALTER TABLE public.vendor_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for store members"
    ON public.vendor_transactions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members
            WHERE store_members.store_id = vendor_transactions.store_id
            AND store_members.user_id = auth.uid()
            AND store_members.status = 'active'
        )
    );

CREATE POLICY "Enable insert for store members"
    ON public.vendor_transactions
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.store_members
            WHERE store_members.store_id = store_id
            AND store_members.user_id = auth.uid()
            AND store_members.status = 'active'
        )
    );

CREATE POLICY "Enable update for store members"
    ON public.vendor_transactions
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members
            WHERE store_members.store_id = vendor_transactions.store_id
            AND store_members.user_id = auth.uid()
            AND store_members.status = 'active'
        )
    );

CREATE POLICY "Enable delete for store members"
    ON public.vendor_transactions
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members
            WHERE store_members.store_id = vendor_transactions.store_id
            AND store_members.user_id = auth.uid()
            AND store_members.status = 'active'
        )
    );