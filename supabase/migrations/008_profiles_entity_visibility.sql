-- Allow users to see all profiles within their own entity.
-- Previously they could only see themselves + shared-project members,
-- which left the member list empty when creating quotes.

DROP POLICY IF EXISTS "Profiles: view own or admin" ON public.profiles;
CREATE POLICY "Profiles: view own or admin"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.profiles me
      WHERE me.id = auth.uid() AND me.entity_id = profiles.entity_id
    )
  );
