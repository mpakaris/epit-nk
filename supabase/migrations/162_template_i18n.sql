-- Migration 162: i18n for platform template names, descriptions, entry names, and trade labels

ALTER TABLE public.templates        ADD COLUMN IF NOT EXISTS trade_i18n       JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.templates        ADD COLUMN IF NOT EXISTS name_i18n        JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.templates        ADD COLUMN IF NOT EXISTS description_i18n JSONB NOT NULL DEFAULT '{}';
ALTER TABLE public.template_entries ADD COLUMN IF NOT EXISTS name_i18n        JSONB NOT NULL DEFAULT '{}';

-- ─── Helper: update one entry by template name + sort_order ─────────────────
-- All UPDATEs below use a CTE to find the template_id from the HU name.

DO $$
DECLARE tid UUID;
BEGIN

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Padlóburkolás – csempézés
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Padlóburkolás – csempézés';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Fliesenleger","en":"tiler"}',
  name_i18n='{"hu":"Padlóburkolás – csempézés","de":"Bodenfliesenverlegung","en":"Floor tiling"}',
  description_i18n='{"hu":"Teljes padlócsempézési folyamat bontástól fugázásig","de":"Kompletter Bodenfliesenprozess von Abbruch bis Verfugung","en":"Complete floor tiling process from demolition to grouting"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Bontás és elszállítás","de":"Abbruch und Abtransport","en":"Demolition and disposal"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Alap előkészítés","de":"Untergrundvorbereitung","en":"Surface preparation"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Aljzatkiegyenlítő anyag","de":"Ausgleichsmasse","en":"Leveling compound"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Aljzatkiegyenlítés munka","de":"Ausgleichen (Arbeit)","en":"Leveling work"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Grundozó","de":"Grundierung","en":"Primer"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Grundozás","de":"Grundieren","en":"Priming"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Ragasztó (csemperagasztó)","de":"Fliesenkleber","en":"Tile adhesive"}' WHERE template_id=tid AND sort_order=7;
UPDATE template_entries SET name_i18n='{"hu":"Csempe fektetés","de":"Fliesen verlegen","en":"Tile laying"}' WHERE template_id=tid AND sort_order=8;
UPDATE template_entries SET name_i18n='{"hu":"Fugázó anyag","de":"Fugenmörtel","en":"Grout"}' WHERE template_id=tid AND sort_order=9;
UPDATE template_entries SET name_i18n='{"hu":"Fugázás","de":"Verfugen","en":"Grouting"}' WHERE template_id=tid AND sort_order=10;
UPDATE template_entries SET name_i18n='{"hu":"Végső takarítás","de":"Endreinigung","en":"Final cleaning"}' WHERE template_id=tid AND sort_order=11;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Falicsempézés
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Falicsempézés';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Fliesenleger","en":"tiler"}',
  name_i18n='{"hu":"Falicsempézés","de":"Wandfliesenverlegung","en":"Wall tiling"}',
  description_i18n='{"hu":"Falra kerülő csempézés teljes folyamata","de":"Vollständiger Prozess der Wandfliesenverlegung","en":"Complete wall tiling process"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Bontás és elszállítás","de":"Abbruch und Abtransport","en":"Demolition and disposal"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Alap előkészítés","de":"Untergrundvorbereitung","en":"Surface preparation"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Grundozó","de":"Grundierung","en":"Primer"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Grundozás","de":"Grundieren","en":"Priming"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Ragasztó (fali csempe)","de":"Fliesenkleber (Wand)","en":"Tile adhesive (wall)"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Csempe fektetés (fal)","de":"Wandfliesen verlegen","en":"Wall tile laying"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Fugázó anyag","de":"Fugenmörtel","en":"Grout"}' WHERE template_id=tid AND sort_order=7;
UPDATE template_entries SET name_i18n='{"hu":"Fugázás","de":"Verfugen","en":"Grouting"}' WHERE template_id=tid AND sort_order=8;
UPDATE template_entries SET name_i18n='{"hu":"Szilikon tömítés saroknál","de":"Silikonfuge an Ecken","en":"Silicone seal at corners"}' WHERE template_id=tid AND sort_order=9;
UPDATE template_entries SET name_i18n='{"hu":"Végső takarítás","de":"Endreinigung","en":"Final cleaning"}' WHERE template_id=tid AND sort_order=10;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Festés – belső falak
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Festés – belső falak';
UPDATE templates SET
  trade_i18n='{"hu":"festő","de":"Maler","en":"painter"}',
  name_i18n='{"hu":"Festés – belső falak","de":"Wandanstrich – innen","en":"Interior wall painting"}',
  description_i18n='{"hu":"Beltéri fal alapozástól 2. rétegig","de":"Innenwand von Grundierung bis 2. Anstrich","en":"Interior wall from primer to 2nd coat"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Felület előkészítés (csiszolás)","de":"Untergrundvorbereitung (Schleifen)","en":"Surface preparation (sanding)"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Gitt (felületi tömítő)","de":"Spachtelmasse","en":"Filler"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Gittelés","de":"Spachteln","en":"Filling"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Alapozó","de":"Grundierung","en":"Primer"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Alapozás","de":"Grundieren","en":"Priming"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Falfesték (1. réteg)","de":"Wandfarbe (1. Schicht)","en":"Wall paint (1st coat)"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"1. réteg festés","de":"1. Anstrich","en":"1st coat painting"}' WHERE template_id=tid AND sort_order=7;
UPDATE template_entries SET name_i18n='{"hu":"Falfesték (2. réteg)","de":"Wandfarbe (2. Schicht)","en":"Wall paint (2nd coat)"}' WHERE template_id=tid AND sort_order=8;
UPDATE template_entries SET name_i18n='{"hu":"2. réteg festés","de":"2. Anstrich","en":"2nd coat painting"}' WHERE template_id=tid AND sort_order=9;

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Festés – mennyezet
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Festés – mennyezet';
UPDATE templates SET
  trade_i18n='{"hu":"festő","de":"Maler","en":"painter"}',
  name_i18n='{"hu":"Festés – mennyezet","de":"Deckenanstrich","en":"Ceiling painting"}',
  description_i18n='{"hu":"Mennyezetfestés alapozással és 2 réteggel","de":"Deckenanstrich mit Grundierung und 2 Schichten","en":"Ceiling painting with primer and 2 coats"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Felület előkészítés","de":"Untergrundvorbereitung","en":"Surface preparation"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Gitt","de":"Spachtelmasse","en":"Filler"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Gittelés","de":"Spachteln","en":"Filling"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Alapozó","de":"Grundierung","en":"Primer"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Alapozás","de":"Grundieren","en":"Priming"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Mennyezetfesték (1. réteg)","de":"Deckenfarbe (1. Schicht)","en":"Ceiling paint (1st coat)"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"1. réteg festés","de":"1. Anstrich","en":"1st coat painting"}' WHERE template_id=tid AND sort_order=7;
UPDATE template_entries SET name_i18n='{"hu":"Mennyezetfesték (2. réteg)","de":"Deckenfarbe (2. Schicht)","en":"Ceiling paint (2nd coat)"}' WHERE template_id=tid AND sort_order=8;
UPDATE template_entries SET name_i18n='{"hu":"2. réteg festés","de":"2. Anstrich","en":"2nd coat painting"}' WHERE template_id=tid AND sort_order=9;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Gipszkarton falépítés
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Gipszkarton falépítés';
UPDATE templates SET
  trade_i18n='{"hu":"gipszkartonos","de":"Trockenbauer","en":"drywaller"}',
  name_i18n='{"hu":"Gipszkarton falépítés","de":"Trockenbau – Wandaufbau","en":"Drywall partition"}',
  description_i18n='{"hu":"Válaszfal fémvázas gipszkarton burkolattal","de":"Trennwand mit Metallständer und Gipskarton","en":"Metal-framed drywall partition"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"UW profil (talplemez)","de":"UW-Profil (Boden/Deckschiene)","en":"UW profile (bottom/top track)"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"CW profil (merevítő)","de":"CW-Profil (Ständer)","en":"CW profile (stud)"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Gipszkarton lap 12,5 mm","de":"Gipskartonplatte 12,5 mm","en":"Plasterboard 12.5 mm"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Gipszkarton szerelés","de":"Gipskarton montieren","en":"Plasterboard installation"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Üveggyapot szigetelés","de":"Glaswolle-Dämmung","en":"Glass wool insulation"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Ragasztószalag","de":"Klebeband","en":"Adhesive tape"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Gitt (fugázó)","de":"Fugenmasse","en":"Joint filler"}' WHERE template_id=tid AND sort_order=7;
UPDATE template_entries SET name_i18n='{"hu":"Felület kidolgozás","de":"Oberflächenbearbeitung","en":"Surface finishing"}' WHERE template_id=tid AND sort_order=8;

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Gipszkarton álmennyezet
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Gipszkarton álmennyezet';
UPDATE templates SET
  trade_i18n='{"hu":"gipszkartonos","de":"Trockenbauer","en":"drywaller"}',
  name_i18n='{"hu":"Gipszkarton álmennyezet","de":"Abgehängte Decke","en":"Suspended ceiling"}',
  description_i18n='{"hu":"Fémvázas álmennyezet gipszkarton lapokkal","de":"Metallunterkonstruktion mit Gipskartonplatten","en":"Metal-framed suspended ceiling with plasterboard"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"CD profil (főtartó)","de":"CD-Profil (Hauptträger)","en":"CD profile (main runner)"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"UD profil (kereti)","de":"UD-Profil (Randprofil)","en":"UD profile (perimeter)"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Rögzítő elem (bőgő)","de":"Abhänger","en":"Hanger"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Gipszkarton lap 12,5 mm","de":"Gipskartonplatte 12,5 mm","en":"Plasterboard 12.5 mm"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Gipszkarton szerelés","de":"Gipskarton montieren","en":"Plasterboard installation"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Gitt (fugázó)","de":"Fugenmasse","en":"Joint filler"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Felület kidolgozás","de":"Oberflächenbearbeitung","en":"Surface finishing"}' WHERE template_id=tid AND sort_order=7;

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Vakolás – gépvakolás
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Vakolás – gépvakolás';
UPDATE templates SET
  trade_i18n='{"hu":"kőműves","de":"Maurer","en":"mason"}',
  name_i18n='{"hu":"Vakolás – gépvakolás","de":"Maschinelles Verputzen","en":"Machine plastering"}',
  description_i18n='{"hu":"Belső falfelület gépi alapvakolása","de":"Maschinelles Grundputzen der Innenwand","en":"Machine base plastering of interior wall"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Felület előkészítés","de":"Untergrundvorbereitung","en":"Surface preparation"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Alapvakolat anyag","de":"Grundputz (Material)","en":"Base plaster (material)"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Gépvakolás","de":"Maschinelles Verputzen","en":"Machine plastering"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Felső simítás","de":"Glattputzen","en":"Finishing coat"}' WHERE template_id=tid AND sort_order=4;

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. Vakolás – kézzel
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Vakolás – kézi';
UPDATE templates SET
  trade_i18n='{"hu":"kőműves","de":"Maurer","en":"mason"}',
  name_i18n='{"hu":"Vakolás – kézi","de":"Handverputzen","en":"Manual plastering"}',
  description_i18n='{"hu":"Belső falfelület kézi vakolása","de":"Handverputzen der Innenwand","en":"Manual plastering of interior wall"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Felület előkészítés","de":"Untergrundvorbereitung","en":"Surface preparation"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Alapozó","de":"Grundierung","en":"Primer"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Vakolat anyag","de":"Putz (Material)","en":"Plaster (material)"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Vakolás","de":"Verputzen","en":"Plastering"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Simítóvakolat","de":"Feinputz","en":"Fine plaster"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Simítás","de":"Glätten","en":"Smoothing"}' WHERE template_id=tid AND sort_order=6;

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. Laminált padló fektetése
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Laminált padló fektetése';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Bodenleger","en":"floor layer"}',
  name_i18n='{"hu":"Laminált padló fektetése","de":"Laminatbodenverlegung","en":"Laminate flooring"}',
  description_i18n='{"hu":"Laminált padló alátéttel és láblécel","de":"Laminatboden mit Trittschalldämmung und Sockelleiste","en":"Laminate flooring with underlay and skirting"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Régi padló bontása","de":"Alten Boden entfernen","en":"Old floor removal"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Aljzat előkészítés","de":"Untergrundvorbereitung","en":"Subfloor preparation"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Alátét (hangcsillapító)","de":"Trittschalldämmung","en":"Acoustic underlay"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Laminált padló","de":"Laminatboden","en":"Laminate flooring"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Fektetés","de":"Verlegen","en":"Laying"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Lábléc","de":"Sockelleiste","en":"Skirting board"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Lábléc szerelés","de":"Sockelleiste montieren","en":"Skirting board installation"}' WHERE template_id=tid AND sort_order=7;

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. Vinyl / SPC padló
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Vinyl / SPC padló fektetése';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Bodenleger","en":"floor layer"}',
  name_i18n='{"hu":"Vinyl / SPC padló fektetése","de":"Vinyl-/SPC-Bodenverlegung","en":"Vinyl / SPC flooring"}',
  description_i18n='{"hu":"Kattintós vinyl/SPC padló alátéttel","de":"Klick-Vinyl/SPC-Boden mit Dämmunterlage","en":"Click vinyl/SPC flooring with underlay"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Aljzat előkészítés","de":"Untergrundvorbereitung","en":"Subfloor preparation"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Alátét","de":"Dämmunterlage","en":"Underlay"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Vinyl / SPC padló","de":"Vinyl-/SPC-Boden","en":"Vinyl / SPC flooring"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Fektetés","de":"Verlegen","en":"Laying"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Lábléc","de":"Sockelleiste","en":"Skirting board"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Lábléc szerelés","de":"Sockelleiste montieren","en":"Skirting board installation"}' WHERE template_id=tid AND sort_order=6;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. Parketta fektetése
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Parketta fektetése';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Bodenleger","en":"floor layer"}',
  name_i18n='{"hu":"Parketta fektetése","de":"Parkett verlegen","en":"Parquet flooring"}',
  description_i18n='{"hu":"Parketta alátéttel, láblécel","de":"Parkett mit Dämmunterlage und Sockelleiste","en":"Parquet flooring with underlay and skirting"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Régi padló bontása","de":"Alten Boden entfernen","en":"Old floor removal"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Aljzat csiszolás / egyengetés","de":"Untergrundschleifen / Egalisieren","en":"Subfloor sanding / leveling"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Alátét","de":"Dämmunterlage","en":"Underlay"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Parketta","de":"Parkett","en":"Parquet"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Fektetés","de":"Verlegen","en":"Laying"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Lábléc","de":"Sockelleiste","en":"Skirting board"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Lábléc szerelés","de":"Sockelleiste montieren","en":"Skirting board installation"}' WHERE template_id=tid AND sort_order=7;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. Hőszigetelés – homlokzat (EPS)
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Hőszigetelés – homlokzat (EPS)';
UPDATE templates SET
  trade_i18n='{"hu":"kőműves","de":"Maurer","en":"mason"}',
  name_i18n='{"hu":"Hőszigetelés – homlokzat (EPS)","de":"Fassadendämmung (EPS)","en":"Exterior EPS insulation"}',
  description_i18n='{"hu":"EPS alapú külső hőszigeteléses rendszer (ETICS)","de":"EPS-Außendämmsystem (WDVS/ETICS)","en":"EPS-based exterior insulation composite system (ETICS)"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"EPS tábla 10 cm","de":"EPS-Platte 10 cm","en":"EPS board 10 cm"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Ragasztó + dübel","de":"Kleber + Dübel","en":"Adhesive + anchors"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Üvegszövet armírozás","de":"Glasgittermatte (Armierung)","en":"Fibreglass mesh reinforcement"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Alapvakolat","de":"Grundputz","en":"Base render"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Vékonyszintes vakolat","de":"Dünnschichtputz","en":"Thin-coat render"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Ragasztás + armírozás munka","de":"Kleben + Armieren (Arbeit)","en":"Bonding + reinforcing work"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Vakolás munka","de":"Verputzen (Arbeit)","en":"Rendering work"}' WHERE template_id=tid AND sort_order=7;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. Vízszigetelés – fürdőszoba
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Vízszigetelés – fürdőszoba';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Fliesenleger","en":"tiler"}',
  name_i18n='{"hu":"Vízszigetelés – fürdőszoba","de":"Abdichtung – Badezimmer","en":"Bathroom waterproofing"}',
  description_i18n='{"hu":"Nedves tér vízszigetelése csempézés előtt","de":"Abdichtung Nassbereich vor der Fliesenverlegung","en":"Wet room waterproofing before tiling"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Felület előkészítés","de":"Untergrundvorbereitung","en":"Surface preparation"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Vízszigetelő folyadék","de":"Abdichtungsanstrich","en":"Waterproofing liquid"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Szalagos tömítés (sarok)","de":"Dichtungsband (Ecken)","en":"Sealing tape (corners)"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Vízszigetelés alkalmazás","de":"Abdichtung auftragen","en":"Waterproofing application"}' WHERE template_id=tid AND sort_order=4;

-- ══════════════════════════════════════════════════════════════════════════════
-- 14. Vízvezeték alapmunka
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Vízvezeték alapmunka';
UPDATE templates SET
  trade_i18n='{"hu":"vízszerelő","de":"Klempner","en":"plumber"}',
  name_i18n='{"hu":"Vízvezeték alapmunka","de":"Sanitär-Rohinstallation","en":"Plumbing rough-in"}',
  description_i18n='{"hu":"Belső hideg-meleg vízvezeték kiépítése","de":"Inneninstallation Kalt- und Warmwasserleitung","en":"Interior cold and hot water pipe installation"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Vágás, áttörés","de":"Schneiden, Durchbrüche","en":"Cutting, penetrations"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"PEX / PP cső anyag","de":"PEX-/PP-Rohr (Material)","en":"PEX / PP pipe (material)"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Szerelvény csomag (könyökök, T-idomok)","de":"Fittingspaket (Bögen, T-Stücke)","en":"Fittings pack (elbows, T-pieces)"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Cső fektetés és rögzítés","de":"Rohr verlegen und befestigen","en":"Pipe laying and fixing"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Próbanyomás és átadás","de":"Druckprüfung und Übergabe","en":"Pressure test and handover"}' WHERE template_id=tid AND sort_order=5;

-- ══════════════════════════════════════════════════════════════════════════════
-- 15. Elektromos alapmunka
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Elektromos alapmunka';
UPDATE templates SET
  trade_i18n='{"hu":"villanyszerelő","de":"Elektriker","en":"electrician"}',
  name_i18n='{"hu":"Elektromos alapmunka","de":"Elektro-Rohinstallation","en":"Electrical rough-in"}',
  description_i18n='{"hu":"Belső elektromos hálózat kiépítése","de":"Innenelektrische Leitungsinstallation","en":"Interior electrical wiring installation"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Vágás, barázdázás","de":"Schneiden, Schlitzen","en":"Cutting, chasing"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Kábel NYM-J 3×1.5","de":"Kabel NYM-J 3×1,5","en":"Cable NYM-J 3×1.5"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Kábel NYM-J 3×2.5","de":"Kabel NYM-J 3×2,5","en":"Cable NYM-J 3×2.5"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Kötődoboz befalazás","de":"Einbaudose einmauern","en":"Junction box installation"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Fektetés és rögzítés","de":"Verlegen und befestigen","en":"Laying and fixing"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Szerelésvédelmi próba","de":"Schutzmaßnahmenprüfung","en":"Protection measure test"}' WHERE template_id=tid AND sort_order=6;

-- ══════════════════════════════════════════════════════════════════════════════
-- 16. Lábazatburkolás
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Lábazatburkolás';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Fliesenleger","en":"tiler"}',
  name_i18n='{"hu":"Lábazatburkolás","de":"Sockelfliesenverlegung","en":"Skirting tiling"}',
  description_i18n='{"hu":"Lábazati csempe / kő fektetés és fugázás","de":"Sockelfliesenverlegung und Verfugung","en":"Skirting tile / stone laying and grouting"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Felület előkészítés","de":"Untergrundvorbereitung","en":"Surface preparation"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Ragasztó","de":"Kleber","en":"Adhesive"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Fektetés","de":"Verlegen","en":"Laying"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Fugázó anyag","de":"Fugenmörtel","en":"Grout"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Fugázás","de":"Verfugen","en":"Grouting"}' WHERE template_id=tid AND sort_order=5;

-- ══════════════════════════════════════════════════════════════════════════════
-- 17. Festés – homlokzat
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Festés – homlokzat';
UPDATE templates SET
  trade_i18n='{"hu":"festő","de":"Maler","en":"painter"}',
  name_i18n='{"hu":"Festés – homlokzat","de":"Fassadenanstrich","en":"Exterior painting"}',
  description_i18n='{"hu":"Külső falfelület felújítása és festése","de":"Fassadenrenovierung und Anstrich","en":"Exterior wall renovation and painting"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Felület tisztítás","de":"Oberflächenreinigung","en":"Surface cleaning"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Javítóvakolat","de":"Reparaturputz","en":"Repair plaster"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Javítás munka","de":"Reparaturarbeiten","en":"Repair work"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Alapozó","de":"Grundierung","en":"Primer"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Alapozás","de":"Grundieren","en":"Priming"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Homlokzatfesték (1. réteg)","de":"Fassadenfarbe (1. Schicht)","en":"Facade paint (1st coat)"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"1. réteg festés","de":"1. Anstrich","en":"1st coat painting"}' WHERE template_id=tid AND sort_order=7;
UPDATE template_entries SET name_i18n='{"hu":"Homlokzatfesték (2. réteg)","de":"Fassadenfarbe (2. Schicht)","en":"Facade paint (2nd coat)"}' WHERE template_id=tid AND sort_order=8;
UPDATE template_entries SET name_i18n='{"hu":"2. réteg festés","de":"2. Anstrich","en":"2nd coat painting"}' WHERE template_id=tid AND sort_order=9;

-- ══════════════════════════════════════════════════════════════════════════════
-- 18. Terasz / erkély burkolás
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Terasz / erkély burkolás';
UPDATE templates SET
  trade_i18n='{"hu":"burkoló","de":"Fliesenleger","en":"tiler"}',
  name_i18n='{"hu":"Terasz / erkély burkolás","de":"Terrassen-/Balkonbelag","en":"Terrace / balcony tiling"}',
  description_i18n='{"hu":"Kültéri burkolat lejtéssel, vízszigeteléssel","de":"Außenbelag mit Gefälle und Abdichtung","en":"Outdoor tiling with slope and waterproofing"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Régi burkolat bontása","de":"Alten Belag entfernen","en":"Old cladding removal"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Aljzat javítóanyag","de":"Untergrundausbesserung","en":"Subfloor repair material"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Lejtésbeton anyag","de":"Gefällebeton (Material)","en":"Slope concrete (material)"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Lejtés kialakítás","de":"Gefälle herstellen","en":"Creating the slope"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Vízszigetelő folyadék","de":"Abdichtungsanstrich","en":"Waterproofing liquid"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Vízszigetelés alkalmazás","de":"Abdichtung auftragen","en":"Waterproofing application"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Fagyálló ragasztó","de":"Frostbeständiger Kleber","en":"Frost-resistant adhesive"}' WHERE template_id=tid AND sort_order=7;
UPDATE template_entries SET name_i18n='{"hu":"Burkolat fektetés","de":"Bodenbelag verlegen","en":"Floor covering laying"}' WHERE template_id=tid AND sort_order=8;
UPDATE template_entries SET name_i18n='{"hu":"Fagyálló fugázó anyag","de":"Frostbeständiger Fugenmörtel","en":"Frost-resistant grout"}' WHERE template_id=tid AND sort_order=9;
UPDATE template_entries SET name_i18n='{"hu":"Fugázás","de":"Verfugen","en":"Grouting"}' WHERE template_id=tid AND sort_order=10;

-- ══════════════════════════════════════════════════════════════════════════════
-- 19. Ablakcsere (1 ablak)
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Ablakcsere (1 ablak)';
UPDATE templates SET
  trade_i18n='{"hu":"ács","de":"Zimmerer","en":"carpenter"}',
  name_i18n='{"hu":"Ablakcsere (1 ablak)","de":"Fensterwechsel (1 Fenster)","en":"Window replacement (1 window)"}',
  description_i18n='{"hu":"Egy ablak teljes csere folyamata (párkánnyal)","de":"Kompletter Austausch eines Fensters (mit Fensterbrett)","en":"Complete replacement of one window (with sill)"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Régi ablak eltávolítás","de":"Altes Fenster ausbauen","en":"Old window removal"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Pántos / betoncsavar rögzítés","de":"Rahmendübel","en":"Frame anchor screws"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Ablak beépítés","de":"Fenster einbauen","en":"Window installation"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"PU hab tömítés","de":"PU-Schaum abdichten","en":"PU foam sealing"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Belső könyöklő","de":"Innenfensterbank","en":"Interior window sill"}' WHERE template_id=tid AND sort_order=5;
UPDATE template_entries SET name_i18n='{"hu":"Külső alu párkány","de":"Außenfensterbank Alu","en":"Exterior aluminium sill"}' WHERE template_id=tid AND sort_order=6;
UPDATE template_entries SET name_i18n='{"hu":"Párkány szerelés","de":"Fensterbrett montieren","en":"Sill installation"}' WHERE template_id=tid AND sort_order=7;

-- ══════════════════════════════════════════════════════════════════════════════
-- 20. Ajtócsere (1 ajtó)
-- ══════════════════════════════════════════════════════════════════════════════
SELECT id INTO tid FROM templates WHERE is_platform=true AND name='Ajtócsere (1 ajtó)';
UPDATE templates SET
  trade_i18n='{"hu":"ács","de":"Zimmerer","en":"carpenter"}',
  name_i18n='{"hu":"Ajtócsere (1 ajtó)","de":"Türwechsel (1 Tür)","en":"Door replacement (1 door)"}',
  description_i18n='{"hu":"Egy beltéri ajtó teljes csere folyamata","de":"Kompletter Austausch einer Innentür","en":"Complete replacement of one interior door"}'
WHERE id=tid;
UPDATE template_entries SET name_i18n='{"hu":"Régi ajtó eltávolítás","de":"Alte Tür ausbauen","en":"Old door removal"}' WHERE template_id=tid AND sort_order=1;
UPDATE template_entries SET name_i18n='{"hu":"Zártos ajtókeret beépítés","de":"Türzarge einbauen","en":"Door frame installation"}' WHERE template_id=tid AND sort_order=2;
UPDATE template_entries SET name_i18n='{"hu":"Ajtólap felszerelés","de":"Türblatt montieren","en":"Door leaf installation"}' WHERE template_id=tid AND sort_order=3;
UPDATE template_entries SET name_i18n='{"hu":"Zár / kilincs szerelés","de":"Schloss/Klinke montieren","en":"Lock/handle installation"}' WHERE template_id=tid AND sort_order=4;
UPDATE template_entries SET name_i18n='{"hu":"Küszöb / élvédő","de":"Schwelle / Kantenschutz","en":"Threshold / edge protection"}' WHERE template_id=tid AND sort_order=5;

END $$;
