-- Fix current_entity_id() to respect the user's actively selected entity.
-- Previously it only read profiles.entity_id (personal/home entity).
-- Users who switched to a collective entity have profiles.current_entity_id set,
-- but RLS policies were ignoring it — blocking inserts/selects across the app.
CREATE OR REPLACE FUNCTION public.current_entity_id()
RETURNS UUID LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE(current_entity_id, entity_id)
  FROM public.profiles
  WHERE id = auth.uid();
$$;
