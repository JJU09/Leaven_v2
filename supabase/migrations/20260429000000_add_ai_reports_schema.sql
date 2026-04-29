CREATE TABLE IF NOT EXISTS public.ai_reports (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id     UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  report_type  TEXT NOT NULL CHECK (report_type IN ('daily', 'weekly')),
  period_key   TEXT NOT NULL,
  content      JSONB NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(store_id, period_key)
);

CREATE INDEX IF NOT EXISTS ai_reports_store_type_date_idx ON public.ai_reports(store_id, report_type, generated_at DESC);

ALTER TABLE public.ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store members can view ai_reports"
  ON public.ai_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = ai_reports.store_id
      AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Store members can insert ai_reports"
  ON public.ai_reports FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = ai_reports.store_id
      AND store_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Store members can update ai_reports"
  ON public.ai_reports FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.store_members
      WHERE store_members.store_id = ai_reports.store_id
      AND store_members.user_id = auth.uid()
    )
  );
