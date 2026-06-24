
-- ============================================================
-- 1. Fix "Owners can update their bar" RLS policy
--    The original subquery had an ambiguous self-reference that
--    PostgreSQL resolved as bars_1.id = bars_1.id (always true).
--    We use an explicit alias `b` so the WHERE clause correctly
--    compares the subquery row to the outer (new) row being checked.
-- ============================================================
DROP POLICY IF EXISTS "Owners can update their bar" ON public.bars;
CREATE POLICY "Owners can update their bar" ON public.bars
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id
    AND status = (SELECT b.status FROM public.bars b WHERE b.id = bars.id)
  );

-- ============================================================
-- 2. Seed World Cup 2026 group-stage matches
--    Times are stored in UTC. Argentina is UTC-3 (no DST in June).
--    The provided schedule was off by -1h; corrected hours are used.
--    e.g. listed 15:00 ART → actual 16:00 ART → 19:00 UTC
-- ============================================================
INSERT INTO public.matches (kickoff_at, home_team, away_team, home_code, away_code, stage, group_name) VALUES

-- Sábado 13 de junio 2026
('2026-06-13 19:00:00+00', 'Catar',      'Suiza',              'QAT', 'SUI', 'Fase de Grupos', 'Grupo B'),
('2026-06-13 22:00:00+00', 'Brasil',     'Marruecos',          'BRA', 'MAR', 'Fase de Grupos', 'Grupo C'),
('2026-06-14 01:00:00+00', 'Haití',      'Escocia',            'HAI', 'SCO', 'Fase de Grupos', 'Grupo C'),
('2026-06-14 04:00:00+00', 'Australia',  'Turquía',            'AUS', 'TUR', 'Fase de Grupos', 'Grupo D'),

-- Domingo 14 de junio 2026
('2026-06-14 17:00:00+00', 'Alemania',        'Curazao',   'GER', 'CUW', 'Fase de Grupos', 'Grupo E'),
('2026-06-14 20:00:00+00', 'Países Bajos',    'Japón',     'NED', 'JPN', 'Fase de Grupos', 'Grupo F'),
('2026-06-14 23:00:00+00', 'Costa de Marfil', 'Ecuador',   'CIV', 'ECU', 'Fase de Grupos', 'Grupo E'),
('2026-06-15 02:00:00+00', 'Suecia',          'Túnez',     'SWE', 'TUN', 'Fase de Grupos', 'Grupo F'),

-- Lunes 15 de junio 2026
('2026-06-15 16:00:00+00', 'España',       'Cabo Verde',   'ESP', 'CPV', 'Fase de Grupos', 'Grupo H'),
('2026-06-15 19:00:00+00', 'Bélgica',      'Egipto',       'BEL', 'EGY', 'Fase de Grupos', 'Grupo G'),
('2026-06-15 22:00:00+00', 'Arabia Saudí', 'Uruguay',      'KSA', 'URU', 'Fase de Grupos', 'Grupo H'),
('2026-06-16 01:00:00+00', 'RI de Irán',   'Nueva Zelanda','IRN', 'NZL', 'Fase de Grupos', 'Grupo G'),

-- Martes 16 de junio 2026
('2026-06-16 19:00:00+00', 'Francia',    'Senegal',  'FRA', 'SEN', 'Fase de Grupos', 'Grupo I'),
('2026-06-16 22:00:00+00', 'Irak',       'Noruega',  'IRQ', 'NOR', 'Fase de Grupos', 'Grupo I'),
('2026-06-17 01:00:00+00', 'Argentina',  'Argelia',  'ARG', 'ALG', 'Fase de Grupos', 'Grupo J'),
('2026-06-17 04:00:00+00', 'Austria',    'Jordania', 'AUT', 'JOR', 'Fase de Grupos', 'Grupo J'),

-- Miércoles 17 de junio 2026
('2026-06-17 17:00:00+00', 'Portugal',   'RD Congo',  'POR', 'COD', 'Fase de Grupos', 'Grupo K'),
('2026-06-17 20:00:00+00', 'Inglaterra', 'Croacia',   'ENG', 'CRO', 'Fase de Grupos', 'Grupo L'),
('2026-06-17 23:00:00+00', 'Ghana',      'Panamá',    'GHA', 'PAN', 'Fase de Grupos', 'Grupo L'),
('2026-06-18 02:00:00+00', 'Uzbekistán', 'Colombia',  'UZB', 'COL', 'Fase de Grupos', 'Grupo K'),

-- Jueves 18 de junio 2026
('2026-06-18 16:00:00+00', 'República Checa', 'Sudáfrica',         'CZE', 'RSA', 'Fase de Grupos', 'Grupo A'),
('2026-06-18 19:00:00+00', 'Suiza',           'Bosnia y Herzegovina','SUI', 'BIH', 'Fase de Grupos', 'Grupo B'),
('2026-06-18 22:00:00+00', 'Canadá',          'Catar',             'CAN', 'QAT', 'Fase de Grupos', 'Grupo B'),
('2026-06-19 01:00:00+00', 'México',          'República de Corea','MEX', 'KOR', 'Fase de Grupos', 'Grupo A'),

-- Viernes 19 de junio 2026
('2026-06-19 19:00:00+00', 'Estados Unidos', 'Australia', 'USA', 'AUS', 'Fase de Grupos', 'Grupo D'),
('2026-06-19 22:00:00+00', 'Escocia',        'Marruecos', 'SCO', 'MAR', 'Fase de Grupos', 'Grupo C'),
('2026-06-20 01:00:00+00', 'Brasil',         'Haití',     'BRA', 'HAI', 'Fase de Grupos', 'Grupo C'),
('2026-06-20 04:00:00+00', 'Turquía',        'Paraguay',  'TUR', 'PAR', 'Fase de Grupos', 'Grupo D'),

-- Sábado 20 de junio 2026
('2026-06-20 17:00:00+00', 'Países Bajos',    'Suecia',          'NED', 'SWE', 'Fase de Grupos', 'Grupo F'),
('2026-06-20 20:00:00+00', 'Alemania',        'Costa de Marfil', 'GER', 'CIV', 'Fase de Grupos', 'Grupo E'),
('2026-06-21 02:00:00+00', 'Ecuador',         'Curazao',         'ECU', 'CUW', 'Fase de Grupos', 'Grupo E'),
('2026-06-21 04:00:00+00', 'Túnez',           'Japón',           'TUN', 'JPN', 'Fase de Grupos', 'Grupo F'),

-- Domingo 21 de junio 2026
('2026-06-21 16:00:00+00', 'España',       'Arabia Saudí',  'ESP', 'KSA', 'Fase de Grupos', 'Grupo H'),
('2026-06-21 19:00:00+00', 'Bélgica',      'RI de Irán',    'BEL', 'IRN', 'Fase de Grupos', 'Grupo G'),
('2026-06-21 22:00:00+00', 'Uruguay',      'Cabo Verde',    'URU', 'CPV', 'Fase de Grupos', 'Grupo H'),
('2026-06-22 01:00:00+00', 'Nueva Zelanda','Egipto',        'NZL', 'EGY', 'Fase de Grupos', 'Grupo G'),

-- Lunes 22 de junio 2026
('2026-06-22 17:00:00+00', 'Argentina', 'Austria',  'ARG', 'AUT', 'Fase de Grupos', 'Grupo J'),
('2026-06-22 21:00:00+00', 'Francia',   'Irak',     'FRA', 'IRQ', 'Fase de Grupos', 'Grupo I'),
('2026-06-23 00:00:00+00', 'Noruega',   'Senegal',  'NOR', 'SEN', 'Fase de Grupos', 'Grupo I'),
('2026-06-23 03:00:00+00', 'Jordania',  'Argelia',  'JOR', 'ALG', 'Fase de Grupos', 'Grupo J'),

-- Martes 23 de junio 2026
('2026-06-23 17:00:00+00', 'Portugal',   'Uzbekistán', 'POR', 'UZB', 'Fase de Grupos', 'Grupo K'),
('2026-06-23 20:00:00+00', 'Inglaterra', 'Ghana',      'ENG', 'GHA', 'Fase de Grupos', 'Grupo L'),
('2026-06-23 23:00:00+00', 'Panamá',     'Croacia',    'PAN', 'CRO', 'Fase de Grupos', 'Grupo L'),
('2026-06-24 02:00:00+00', 'Colombia',   'RD Congo',   'COL', 'COD', 'Fase de Grupos', 'Grupo K'),

-- Miércoles 24 de junio 2026 (simultáneas)
('2026-06-24 19:00:00+00', 'Suiza',                  'Canadá',             'SUI', 'CAN', 'Fase de Grupos', 'Grupo B'),
('2026-06-24 19:00:00+00', 'Bosnia y Herzegovina',   'Catar',              'BIH', 'QAT', 'Fase de Grupos', 'Grupo B'),
('2026-06-24 22:00:00+00', 'Escocia',                'Brasil',             'SCO', 'BRA', 'Fase de Grupos', 'Grupo C'),
('2026-06-24 22:00:00+00', 'Marruecos',              'Haití',              'MAR', 'HAI', 'Fase de Grupos', 'Grupo C'),
('2026-06-25 01:00:00+00', 'República Checa',        'México',             'CZE', 'MEX', 'Fase de Grupos', 'Grupo A'),
('2026-06-25 01:00:00+00', 'Sudáfrica',              'República de Corea', 'RSA', 'KOR', 'Fase de Grupos', 'Grupo A'),

-- Jueves 25 de junio 2026 (simultáneas)
('2026-06-25 20:00:00+00', 'Curazao',         'Costa de Marfil', 'CUW', 'CIV', 'Fase de Grupos', 'Grupo E'),
('2026-06-25 20:00:00+00', 'Ecuador',         'Alemania',        'ECU', 'GER', 'Fase de Grupos', 'Grupo E'),
('2026-06-25 23:00:00+00', 'Japón',           'Suecia',          'JPN', 'SWE', 'Fase de Grupos', 'Grupo F'),
('2026-06-25 23:00:00+00', 'Túnez',           'Países Bajos',    'TUN', 'NED', 'Fase de Grupos', 'Grupo F'),
('2026-06-26 02:00:00+00', 'Turquía',         'Estados Unidos',  'TUR', 'USA', 'Fase de Grupos', 'Grupo D'),
('2026-06-26 02:00:00+00', 'Paraguay',        'Australia',       'PAR', 'AUS', 'Fase de Grupos', 'Grupo D'),

-- Viernes 26 de junio 2026 (simultáneas)
('2026-06-26 19:00:00+00', 'Noruega',      'Francia',      'NOR', 'FRA', 'Fase de Grupos', 'Grupo I'),
('2026-06-26 19:00:00+00', 'Senegal',      'Irak',         'SEN', 'IRQ', 'Fase de Grupos', 'Grupo I'),
('2026-06-27 00:00:00+00', 'Cabo Verde',   'Arabia Saudí', 'CPV', 'KSA', 'Fase de Grupos', 'Grupo H'),
('2026-06-27 00:00:00+00', 'Uruguay',      'España',       'URU', 'ESP', 'Fase de Grupos', 'Grupo H'),
('2026-06-27 03:00:00+00', 'Egipto',       'RI de Irán',   'EGY', 'IRN', 'Fase de Grupos', 'Grupo G'),
('2026-06-27 03:00:00+00', 'Nueva Zelanda','Bélgica',      'NZL', 'BEL', 'Fase de Grupos', 'Grupo G'),

-- Sábado 27 de junio 2026 (simultáneas)
('2026-06-27 21:00:00+00', 'Panamá',    'Inglaterra', 'PAN', 'ENG', 'Fase de Grupos', 'Grupo L'),
('2026-06-27 21:00:00+00', 'Croacia',   'Ghana',      'CRO', 'GHA', 'Fase de Grupos', 'Grupo L'),
('2026-06-27 23:30:00+00', 'Colombia',  'Portugal',   'COL', 'POR', 'Fase de Grupos', 'Grupo K'),
('2026-06-27 23:30:00+00', 'RD Congo',  'Uzbekistán', 'COD', 'UZB', 'Fase de Grupos', 'Grupo K'),
('2026-06-28 02:00:00+00', 'Argelia',   'Austria',    'ALG', 'AUT', 'Fase de Grupos', 'Grupo J'),
('2026-06-28 02:00:00+00', 'Jordania',  'Argentina',  'JOR', 'ARG', 'Fase de Grupos', 'Grupo J')

ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Set ailenrgrimaldi@gmail.com as admin
--    Looks up the user by email in auth.users and inserts the
--    admin role. Safe to run multiple times (ON CONFLICT).
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'ailenrgrimaldi@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
