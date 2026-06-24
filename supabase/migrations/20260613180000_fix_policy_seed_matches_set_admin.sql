
-- ============================================================
-- 1. Fix "Owners can update their bar" RLS policy
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
-- 2. Seed World Cup 2026 matches (group stage, known teams)
--    All times in UTC (Argentina ART = UTC-3)
-- ============================================================
INSERT INTO public.matches (kickoff_at, home_team, away_team, home_code, away_code, stage, group_name) VALUES

-- Domingo 21 de junio
('2026-06-21 16:00:00+00', 'Espana',        'Arabia Saudi',   'ESP', 'KSA', 'Fase de Grupos', 'Grupo H'),
('2026-06-21 19:00:00+00', 'Belgica',       'RI de Iran',     'BEL', 'IRN', 'Fase de Grupos', 'Grupo G'),
('2026-06-21 22:00:00+00', 'Uruguay',       'Cabo Verde',     'URU', 'CPV', 'Fase de Grupos', 'Grupo H'),
('2026-06-22 01:00:00+00', 'Nueva Zelanda', 'Egipto',         'NZL', 'EGY', 'Fase de Grupos', 'Grupo G'),

-- Lunes 22 de junio
('2026-06-22 17:00:00+00', 'Argentina', 'Austria',  'ARG', 'AUT', 'Fase de Grupos', 'Grupo J'),
('2026-06-22 21:00:00+00', 'Francia',   'Irak',     'FRA', 'IRQ', 'Fase de Grupos', 'Grupo I'),
('2026-06-23 00:00:00+00', 'Noruega',   'Senegal',  'NOR', 'SEN', 'Fase de Grupos', 'Grupo I'),

-- Martes 23 de junio
('2026-06-23 17:00:00+00', 'Portugal',   'Uzbekistan',            'POR', 'UZB', 'Fase de Grupos', 'Grupo K'),
('2026-06-23 20:00:00+00', 'Inglaterra', 'Ghana',                 'ENG', 'GHA', 'Fase de Grupos', 'Grupo L'),
('2026-06-23 23:00:00+00', 'Panama',     'Croacia',               'PAN', 'CRO', 'Fase de Grupos', 'Grupo L'),
('2026-06-24 02:00:00+00', 'Colombia',   'Rep Democratica Congo', 'COL', 'COD', 'Fase de Grupos', 'Grupo K'),
('2026-06-24 03:00:00+00', 'Jordania',   'Argelia',               'JOR', 'ALG', 'Fase de Grupos', 'Grupo J'),

-- Miercoles 24 de junio (simultaneas)
('2026-06-24 19:00:00+00', 'Bosnia y Herzegovina', 'Catar',              'BIH', 'QAT', 'Fase de Grupos', 'Grupo B'),
('2026-06-24 19:00:00+00', 'Suiza',                'Canada',             'SUI', 'CAN', 'Fase de Grupos', 'Grupo B'),
('2026-06-24 22:00:00+00', 'Escocia',              'Brasil',             'SCO', 'BRA', 'Fase de Grupos', 'Grupo C'),
('2026-06-24 22:00:00+00', 'Marruecos',            'Haiti',              'MAR', 'HAI', 'Fase de Grupos', 'Grupo C'),
('2026-06-25 01:00:00+00', 'Sudafrica',            'Republica de Corea', 'RSA', 'KOR', 'Fase de Grupos', 'Grupo A'),
('2026-06-25 01:00:00+00', 'Republica Checa',      'Mexico',             'CZE', 'MEX', 'Fase de Grupos', 'Grupo A'),

-- Jueves 25 de junio (simultaneas)
('2026-06-25 20:00:00+00', 'Curazao',  'Costa de Marfil', 'CUW', 'CIV', 'Fase de Grupos', 'Grupo E'),
('2026-06-25 20:00:00+00', 'Ecuador',  'Alemania',        'ECU', 'GER', 'Fase de Grupos', 'Grupo E'),
('2026-06-25 23:00:00+00', 'Japon',    'Suecia',          'JPN', 'SWE', 'Fase de Grupos', 'Grupo F'),
('2026-06-25 23:00:00+00', 'Tunez',    'Paises Bajos',    'TUN', 'NED', 'Fase de Grupos', 'Grupo F'),
('2026-06-26 02:00:00+00', 'Paraguay', 'Australia',       'PAR', 'AUS', 'Fase de Grupos', 'Grupo D'),
('2026-06-26 02:00:00+00', 'Turquia',  'Estados Unidos',  'TUR', 'USA', 'Fase de Grupos', 'Grupo D'),

-- Viernes 26 de junio (simultaneas)
('2026-06-26 19:00:00+00', 'Senegal',     'Irak',         'SEN', 'IRQ', 'Fase de Grupos', 'Grupo I'),
('2026-06-26 19:00:00+00', 'Noruega',     'Francia',      'NOR', 'FRA', 'Fase de Grupos', 'Grupo I'),
('2026-06-27 00:00:00+00', 'Cabo Verde',  'Arabia Saudi', 'CPV', 'KSA', 'Fase de Grupos', 'Grupo H'),
('2026-06-27 00:00:00+00', 'Uruguay',     'Espana',       'URU', 'ESP', 'Fase de Grupos', 'Grupo H'),

-- Sabado 27 de junio (simultaneas)
('2026-06-27 21:00:00+00', 'Croacia',   'Ghana',      'CRO', 'GHA', 'Fase de Grupos', 'Grupo L'),
('2026-06-27 21:00:00+00', 'Panama',    'Inglaterra', 'PAN', 'ENG', 'Fase de Grupos', 'Grupo L'),
('2026-06-27 23:30:00+00', 'RD Congo',  'Uzbekistan', 'COD', 'UZB', 'Fase de Grupos', 'Grupo K'),
('2026-06-27 23:30:00+00', 'Colombia',  'Portugal',   'COL', 'POR', 'Fase de Grupos', 'Grupo K'),
('2026-06-28 02:00:00+00', 'Argelia',   'Austria',    'ALG', 'AUT', 'Fase de Grupos', 'Grupo J'),
('2026-06-28 02:00:00+00', 'Jordania',  'Argentina',  'JOR', 'ARG', 'Fase de Grupos', 'Grupo J'),
('2026-06-28 03:00:00+00', 'Nueva Zelanda', 'Belgica', 'NZL', 'BEL', 'Fase de Grupos', 'Grupo G'),
('2026-06-28 03:00:00+00', 'Egipto',        'RI de Iran', 'EGY', 'IRN', 'Fase de Grupos', 'Grupo G')

ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. Set ailenrgrimaldi@gmail.com as admin
-- ============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'ailenrgrimaldi@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
