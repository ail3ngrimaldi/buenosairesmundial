
-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'bar_owner');
CREATE TYPE public.bar_status AS ENUM ('pending', 'approved', 'rejected');

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- has_role SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Bars
CREATE TABLE public.bars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  neighborhood TEXT NOT NULL,
  zona TEXT NOT NULL CHECK (zona IN ('CABA','Zona Norte','Zona Sur','Zona Oeste')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  instagram TEXT,
  cover_image_url TEXT,
  features TEXT[] NOT NULL DEFAULT '{}',
  status public.bar_status NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX bars_status_idx ON public.bars(status);
CREATE INDEX bars_owner_idx ON public.bars(owner_id);
GRANT SELECT, INSERT, UPDATE ON public.bars TO authenticated;
GRANT SELECT ON public.bars TO anon;
GRANT ALL ON public.bars TO service_role;
ALTER TABLE public.bars ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved bars are public" ON public.bars FOR SELECT USING (status = 'approved');
CREATE POLICY "Owners can view their bar" ON public.bars FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can update their bar" ON public.bars FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id AND status = (SELECT status FROM public.bars WHERE id = bars.id));
CREATE POLICY "Owners can create their bar" ON public.bars FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND status = 'pending');
CREATE POLICY "Admins can view all bars" ON public.bars FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update bars" ON public.bars FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER bars_updated_at BEFORE UPDATE ON public.bars FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Matches
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kickoff_at TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_code TEXT NOT NULL,
  away_code TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Fase de Grupos',
  group_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX matches_kickoff_idx ON public.matches(kickoff_at);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Matches are public" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Admins manage matches" ON public.matches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Bar matches (broadcasts)
CREATE TABLE public.bar_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bar_id UUID NOT NULL REFERENCES public.bars(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(bar_id, match_id)
);
CREATE INDEX bar_matches_bar_idx ON public.bar_matches(bar_id);
CREATE INDEX bar_matches_match_idx ON public.bar_matches(match_id);
GRANT SELECT, INSERT, DELETE ON public.bar_matches TO authenticated;
GRANT SELECT ON public.bar_matches TO anon;
GRANT ALL ON public.bar_matches TO service_role;
ALTER TABLE public.bar_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bar matches public for approved bars" ON public.bar_matches FOR SELECT USING (EXISTS (SELECT 1 FROM public.bars b WHERE b.id = bar_matches.bar_id AND b.status = 'approved'));
CREATE POLICY "Owners view own bar matches" ON public.bar_matches FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.bars b WHERE b.id = bar_matches.bar_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owners insert their broadcasts" ON public.bar_matches FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.bars b WHERE b.id = bar_matches.bar_id AND b.owner_id = auth.uid()));
CREATE POLICY "Owners delete their broadcasts" ON public.bar_matches FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.bars b WHERE b.id = bar_matches.bar_id AND b.owner_id = auth.uid()));
CREATE POLICY "Admins manage bar matches" ON public.bar_matches FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
