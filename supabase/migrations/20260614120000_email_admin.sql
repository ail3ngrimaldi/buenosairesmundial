-- ============================================================
-- Email-based admin access (robust fallback, independent of user_roles)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((auth.jwt() ->> 'email') = 'ailenrgrimaldi@gmail.com', false)
      OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin');
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon, authenticated;

-- Allow the admin (by email or role) to read & update every bar
CREATE POLICY "Admin can view all bars" ON public.bars
  FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admin can update all bars" ON public.bars
  FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
