-- Fix broken RLS: prevent bar owners from changing their bar's status
DROP POLICY IF EXISTS "Owners can update their bar" ON public.bars;

CREATE POLICY "Owners can update their bar"
ON public.bars
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (
  auth.uid() = owner_id
  AND status = (SELECT b.status FROM public.bars b WHERE b.id = bars.id)
);

-- Remove duplicated email column from profiles (auth.users already stores it)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update handle_new_user to no longer write email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;