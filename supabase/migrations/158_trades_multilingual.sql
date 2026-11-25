-- Migration 158: add name_de and name_en columns to trades
-- Required by: desktop/mobile trade selector showing app language

ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS name_de TEXT;
ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS name_en TEXT;

-- Populate DE translations
UPDATE public.trades SET name_de = 'Maler'                     WHERE slug_prefix = 'festo';
UPDATE public.trades SET name_de = 'Elektriker'                WHERE slug_prefix = 'villanyszerelo';
UPDATE public.trades SET name_de = 'Sanitärinstallateur'       WHERE slug_prefix = 'vizszerelo';
UPDATE public.trades SET name_de = 'Bodenbelagsleger'          WHERE slug_prefix = 'burkolo';
UPDATE public.trades SET name_de = 'Maurer'                    WHERE slug_prefix = 'komuves';
UPDATE public.trades SET name_de = 'Zimmermann'                WHERE slug_prefix = 'acs';
UPDATE public.trades SET name_de = 'Tischler'                  WHERE slug_prefix = 'asztalos';
UPDATE public.trades SET name_de = 'Trockenbauer'              WHERE slug_prefix = 'gipszkartonos';
UPDATE public.trades SET name_de = 'Dachdecker'                WHERE slug_prefix = 'tetofedo';
UPDATE public.trades SET name_de = 'Isolierer'                 WHERE slug_prefix = 'szigetelo';
UPDATE public.trades SET name_de = 'Parkettleger'              WHERE slug_prefix = 'parkettas';
UPDATE public.trades SET name_de = 'Klimaanlagenmonteur'       WHERE slug_prefix = 'klimaszerelo';
UPDATE public.trades SET name_de = 'Schweißer'                 WHERE slug_prefix = 'hegeszto';
UPDATE public.trades SET name_de = 'Gärtner'                   WHERE slug_prefix = 'kertesz';
UPDATE public.trades SET name_de = 'Generalunternehmer'        WHERE slug_prefix = 'altalanos-kivitelezo';
UPDATE public.trades SET name_de = 'Verputzer'                 WHERE slug_prefix = 'vakolo';
UPDATE public.trades SET name_de = 'Fliesenleger'              WHERE slug_prefix = 'csempezo';
UPDATE public.trades SET name_de = 'Maler und Lackierer'       WHERE slug_prefix = 'festo-mazolo';
UPDATE public.trades SET name_de = 'Dachfenstermonteur'        WHERE slug_prefix = 'tetoablak-szerelo';
UPDATE public.trades SET name_de = 'Schlosser'                 WHERE slug_prefix = 'lakatos';

-- Populate EN translations
UPDATE public.trades SET name_en = 'Painter'                   WHERE slug_prefix = 'festo';
UPDATE public.trades SET name_en = 'Electrician'               WHERE slug_prefix = 'villanyszerelo';
UPDATE public.trades SET name_en = 'Plumber'                   WHERE slug_prefix = 'vizszerelo';
UPDATE public.trades SET name_en = 'Flooring installer'        WHERE slug_prefix = 'burkolo';
UPDATE public.trades SET name_en = 'Bricklayer'                WHERE slug_prefix = 'komuves';
UPDATE public.trades SET name_en = 'Carpenter'                 WHERE slug_prefix = 'acs';
UPDATE public.trades SET name_en = 'Joiner'                    WHERE slug_prefix = 'asztalos';
UPDATE public.trades SET name_en = 'Drywall installer'         WHERE slug_prefix = 'gipszkartonos';
UPDATE public.trades SET name_en = 'Roofer'                    WHERE slug_prefix = 'tetofedo';
UPDATE public.trades SET name_en = 'Insulator'                 WHERE slug_prefix = 'szigetelo';
UPDATE public.trades SET name_en = 'Parquet layer'             WHERE slug_prefix = 'parkettas';
UPDATE public.trades SET name_en = 'HVAC installer'            WHERE slug_prefix = 'klimaszerelo';
UPDATE public.trades SET name_en = 'Welder'                    WHERE slug_prefix = 'hegeszto';
UPDATE public.trades SET name_en = 'Gardener'                  WHERE slug_prefix = 'kertesz';
UPDATE public.trades SET name_en = 'General contractor'        WHERE slug_prefix = 'altalanos-kivitelezo';
UPDATE public.trades SET name_en = 'Plasterer'                 WHERE slug_prefix = 'vakolo';
UPDATE public.trades SET name_en = 'Tile setter'               WHERE slug_prefix = 'csempezo';
UPDATE public.trades SET name_en = 'Painter and decorator'     WHERE slug_prefix = 'festo-mazolo';
UPDATE public.trades SET name_en = 'Skylight installer'        WHERE slug_prefix = 'tetoablak-szerelo';
UPDATE public.trades SET name_en = 'Metal worker'              WHERE slug_prefix = 'lakatos';
