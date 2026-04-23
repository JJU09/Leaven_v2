-- ==========================================
-- vendors RLS Policies
-- ==========================================
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- 1. Read (SELECT) - view_vendor 권한 또는 점주/매니저/직원
CREATE POLICY "Enable read access for view_vendor permission"
    ON public.vendors
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            LEFT JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = vendors.store_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'active'
            AND (
                sr.name IN ('점주', 'owner', '매니저', '직원') OR 
                sr.permissions ? 'view_vendor'
            )
        )
    );

-- 2. Insert (INSERT) - manage_vendor 권한 또는 점주/매니저
CREATE POLICY "Enable insert for manage_vendor permission"
    ON public.vendors
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            LEFT JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = vendors.store_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'active'
            AND (
                sr.name IN ('점주', 'owner', '매니저') OR 
                sr.permissions ? 'manage_vendor'
            )
        )
    );

-- 3. Update (UPDATE) - manage_vendor 권한 또는 점주/매니저
CREATE POLICY "Enable update for manage_vendor permission"
    ON public.vendors
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            LEFT JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = vendors.store_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'active'
            AND (
                sr.name IN ('점주', 'owner', '매니저') OR 
                sr.permissions ? 'manage_vendor'
            )
        )
    );

-- 4. Delete (DELETE) - manage_vendor 권한 또는 점주/매니저
CREATE POLICY "Enable delete for manage_vendor permission"
    ON public.vendors
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.store_members sm
            LEFT JOIN public.store_roles sr ON sm.role_id = sr.id
            WHERE sm.store_id = vendors.store_id
            AND sm.user_id = auth.uid()
            AND sm.status = 'active'
            AND (
                sr.name IN ('점주', 'owner', '매니저') OR 
                sr.permissions ? 'manage_vendor'
            )
        )
    );