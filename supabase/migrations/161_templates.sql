-- Migration 161: templates + template_entries
-- Platform work templates with parametric entry rates per m², perimeter, wall_area, or fixed

CREATE TABLE IF NOT EXISTS public.templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  collective_id UUID REFERENCES collectives(id) ON DELETE CASCADE,

  trade         TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  is_platform   BOOLEAN NOT NULL DEFAULT false,
  sort_order    INT  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.template_entries (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id         UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  sort_order          INT  NOT NULL DEFAULT 0,

  name                TEXT    NOT NULL,
  entry_type          TEXT    NOT NULL CHECK (entry_type IN ('material','labour','equipment','transport','other')),
  unit                TEXT    NOT NULL,
  qty_formula         TEXT    NOT NULL DEFAULT 'area'
                        CHECK (qty_formula IN ('area','perimeter','wall_area','fixed')),
  qty_rate            NUMERIC NOT NULL DEFAULT 1,
  suggested_price_huf NUMERIC
);

-- RLS (rule §14)
ALTER TABLE public.templates        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deny_all_direct_access" ON public.templates
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);
CREATE POLICY "deny_all_direct_access" ON public.template_entries
  AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false);

-- Indexes
CREATE INDEX IF NOT EXISTS templates_platform_idx
  ON public.templates (trade, sort_order) WHERE is_platform = true;
CREATE INDEX IF NOT EXISTS templates_personal_idx
  ON public.templates (owner_id) WHERE collective_id IS NULL AND is_platform = false;
CREATE INDEX IF NOT EXISTS template_entries_template_idx
  ON public.template_entries (template_id, sort_order);

-- ─── Seed: 20 platform templates ────────────────────────────────────────────

DO $$
DECLARE
  t1  UUID; t2  UUID; t3  UUID; t4  UUID; t5  UUID;
  t6  UUID; t7  UUID; t8  UUID; t9  UUID; t10 UUID;
  t11 UUID; t12 UUID; t13 UUID; t14 UUID; t15 UUID;
  t16 UUID; t17 UUID; t18 UUID; t19 UUID; t20 UUID;
BEGIN

-- 1. Padlóburkolás – csempézés
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Padlóburkolás – csempézés','Teljes padlócsempézési folyamat bontástól fugázásig',1) RETURNING id INTO t1;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t1,1,'Bontás és elszállítás','labour','h','area',0.25,4000),
  (t1,2,'Alap előkészítés','labour','h','area',0.10,4000),
  (t1,3,'Aljzatkiegyenlítő anyag','material','kg','area',3.5,180),
  (t1,4,'Aljzatkiegyenlítés munka','labour','h','area',0.15,4000),
  (t1,5,'Grundozó','material','l','area',0.15,1200),
  (t1,6,'Grundozás','labour','h','area',0.08,4000),
  (t1,7,'Ragasztó (csemperagasztó)','material','kg','area',4.5,250),
  (t1,8,'Csempe fektetés','labour','h','area',0.60,4500),
  (t1,9,'Fugázó anyag','material','kg','area',0.40,800),
  (t1,10,'Fugázás','labour','h','area',0.15,4500),
  (t1,11,'Végső takarítás','labour','h','area',0.08,4000);

-- 2. Falicsempézés
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Falicsempézés','Falra kerülő csempézés teljes folyamata',2) RETURNING id INTO t2;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t2,1,'Bontás és elszállítás','labour','h','wall_area',0.30,4000),
  (t2,2,'Alap előkészítés','labour','h','wall_area',0.12,4000),
  (t2,3,'Grundozó','material','l','wall_area',0.15,1200),
  (t2,4,'Grundozás','labour','h','wall_area',0.08,4000),
  (t2,5,'Ragasztó (fali csempe)','material','kg','wall_area',5.0,250),
  (t2,6,'Csempe fektetés (fal)','labour','h','wall_area',0.75,4500),
  (t2,7,'Fugázó anyag','material','kg','wall_area',0.50,800),
  (t2,8,'Fugázás','labour','h','wall_area',0.18,4500),
  (t2,9,'Szilikon tömítés saroknál','material','fm','perimeter',0.5,900),
  (t2,10,'Végső takarítás','labour','h','wall_area',0.06,4000);

-- 3. Festés – belső falak
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'festő','Festés – belső falak','Beltéri fal alapozástól 2. rétegig',3) RETURNING id INTO t3;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t3,1,'Felület előkészítés (csiszolás)','labour','h','wall_area',0.10,4000),
  (t3,2,'Gitt (felületi tömítő)','material','kg','wall_area',0.30,400),
  (t3,3,'Gittelés','labour','h','wall_area',0.12,4000),
  (t3,4,'Alapozó','material','l','wall_area',0.10,900),
  (t3,5,'Alapozás','labour','h','wall_area',0.08,4000),
  (t3,6,'Falfesték (1. réteg)','material','l','wall_area',0.15,1500),
  (t3,7,'1. réteg festés','labour','h','wall_area',0.10,4000),
  (t3,8,'Falfesték (2. réteg)','material','l','wall_area',0.15,1500),
  (t3,9,'2. réteg festés','labour','h','wall_area',0.10,4000);

-- 4. Festés – mennyezet
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'festő','Festés – mennyezet','Mennyezetfestés alapozással és 2 réteggel',4) RETURNING id INTO t4;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t4,1,'Felület előkészítés','labour','h','area',0.12,4000),
  (t4,2,'Gitt','material','kg','area',0.30,400),
  (t4,3,'Gittelés','labour','h','area',0.15,4000),
  (t4,4,'Alapozó','material','l','area',0.12,900),
  (t4,5,'Alapozás','labour','h','area',0.10,4000),
  (t4,6,'Mennyezetfesték (1. réteg)','material','l','area',0.15,1500),
  (t4,7,'1. réteg festés','labour','h','area',0.12,4000),
  (t4,8,'Mennyezetfesték (2. réteg)','material','l','area',0.15,1500),
  (t4,9,'2. réteg festés','labour','h','area',0.12,4000);

-- 5. Gipszkarton falépítés
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'gipszkartonos','Gipszkarton falépítés','Válaszfal fémvázas gipszkarton burkolattal',5) RETURNING id INTO t5;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t5,1,'UW profil (talplemez)','material','fm','perimeter',1.0,1200),
  (t5,2,'CW profil (merevítő)','material','db','area',0.4,1500),
  (t5,3,'Gipszkarton lap 12,5 mm','material','m²','area',2.1,1800),
  (t5,4,'Gipszkarton szerelés','labour','h','area',0.60,4000),
  (t5,5,'Üveggyapot szigetelés','material','m²','area',1.05,1600),
  (t5,6,'Ragasztószalag','material','m','perimeter',2.0,300),
  (t5,7,'Gitt (fugázó)','material','kg','area',0.40,350),
  (t5,8,'Felület kidolgozás','labour','h','area',0.25,4000);

-- 6. Gipszkarton álmennyezet
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'gipszkartonos','Gipszkarton álmennyezet','Fémvázas álmennyezet gipszkarton lapokkal',6) RETURNING id INTO t6;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t6,1,'CD profil (főtartó)','material','fm','area',1.2,1300),
  (t6,2,'UD profil (kereti)','material','fm','perimeter',1.0,1200),
  (t6,3,'Rögzítő elem (bőgő)','material','db','area',1.5,400),
  (t6,4,'Gipszkarton lap 12,5 mm','material','m²','area',1.1,1800),
  (t6,5,'Gipszkarton szerelés','labour','h','area',0.65,4000),
  (t6,6,'Gitt (fugázó)','material','kg','area',0.30,350),
  (t6,7,'Felület kidolgozás','labour','h','area',0.20,4000);

-- 7. Vakolás – gépvakolás
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'kőműves','Vakolás – gépvakolás','Belső falfelület gépi alapvakolása',7) RETURNING id INTO t7;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t7,1,'Felület előkészítés','labour','h','wall_area',0.08,4000),
  (t7,2,'Alapvakolat anyag','material','kg','wall_area',12.0,90),
  (t7,3,'Gépvakolás','labour','h','wall_area',0.30,4500),
  (t7,4,'Felső simítás','labour','h','wall_area',0.10,4500);

-- 8. Vakolás – kézzel
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'kőműves','Vakolás – kézi','Belső falfelület kézi vakolása',8) RETURNING id INTO t8;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t8,1,'Felület előkészítés','labour','h','wall_area',0.10,4000),
  (t8,2,'Alapozó','material','l','wall_area',0.10,1000),
  (t8,3,'Vakolat anyag','material','kg','wall_area',14.0,100),
  (t8,4,'Vakolás','labour','h','wall_area',0.50,5000),
  (t8,5,'Simítóvakolat','material','kg','wall_area',3.0,450),
  (t8,6,'Simítás','labour','h','wall_area',0.20,5000);

-- 9. Laminált padló fektetése
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Laminált padló fektetése','Laminált padló alátéttel és láblécel',9) RETURNING id INTO t9;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t9,1,'Régi padló bontása','labour','h','area',0.20,4000),
  (t9,2,'Aljzat előkészítés','labour','h','area',0.10,4000),
  (t9,3,'Alátét (hangcsillapító)','material','m²','area',1.10,600),
  (t9,4,'Laminált padló','material','m²','area',1.08,NULL),
  (t9,5,'Fektetés','labour','h','area',0.35,4500),
  (t9,6,'Lábléc','material','fm','perimeter',1.05,1800),
  (t9,7,'Lábléc szerelés','labour','h','perimeter',0.08,4500);

-- 10. Vinyl / SPC padló
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Vinyl / SPC padló fektetése','Kattintós vinyl/SPC padló alátéttel',10) RETURNING id INTO t10;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t10,1,'Aljzat előkészítés','labour','h','area',0.10,4000),
  (t10,2,'Alátét','material','m²','area',1.05,500),
  (t10,3,'Vinyl / SPC padló','material','m²','area',1.08,NULL),
  (t10,4,'Fektetés','labour','h','area',0.25,4500),
  (t10,5,'Lábléc','material','fm','perimeter',1.05,1600),
  (t10,6,'Lábléc szerelés','labour','h','perimeter',0.07,4500);

-- 11. Parketta fektetése
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Parketta fektetése','Parketta alátéttel, láblécel',11) RETURNING id INTO t11;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t11,1,'Régi padló bontása','labour','h','area',0.20,4000),
  (t11,2,'Aljzat csiszolás / egyengetés','labour','h','area',0.15,4500),
  (t11,3,'Alátét','material','m²','area',1.10,700),
  (t11,4,'Parketta','material','m²','area',1.08,NULL),
  (t11,5,'Fektetés','labour','h','area',0.40,5000),
  (t11,6,'Lábléc','material','fm','perimeter',1.05,2200),
  (t11,7,'Lábléc szerelés','labour','h','perimeter',0.08,4500);

-- 12. Hőszigetelés – homlokzat EPS
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'kőműves','Hőszigetelés – homlokzat (EPS)','EPS alapú külső hőszigeteléses rendszer (ETICS)',12) RETURNING id INTO t12;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t12,1,'EPS tábla 10 cm','material','m²','wall_area',1.05,2200),
  (t12,2,'Ragasztó + dübel','material','m²','wall_area',1.00,800),
  (t12,3,'Üvegszövet armírozás','material','m²','wall_area',1.15,450),
  (t12,4,'Alapvakolat','material','kg','wall_area',4.00,180),
  (t12,5,'Vékonyszintes vakolat','material','kg','wall_area',3.50,350),
  (t12,6,'Ragasztás + armírozás munka','labour','h','wall_area',0.40,4500),
  (t12,7,'Vakolás munka','labour','h','wall_area',0.30,4500);

-- 13. Vízszigetelés – fürdőszoba
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Vízszigetelés – fürdőszoba','Nedves tér vízszigetelése csempézés előtt',13) RETURNING id INTO t13;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t13,1,'Felület előkészítés','labour','h','area',0.10,4000),
  (t13,2,'Vízszigetelő folyadék','material','kg','area',1.50,2800),
  (t13,3,'Szalagos tömítés (sarok)','material','m','perimeter',1.10,600),
  (t13,4,'Vízszigetelés alkalmazás','labour','h','area',0.25,4500);

-- 14. Vízvezeték alapmunka
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'vízszerelő','Vízvezeték alapmunka','Belső hideg-meleg vízvezeték kiépítése',14) RETURNING id INTO t14;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t14,1,'Vágás, áttörés','labour','h','fixed',4,5000),
  (t14,2,'PEX / PP cső anyag','material','fm','fixed',25,400),
  (t14,3,'Szerelvény csomag (könyökök, T-idomok)','material','db','fixed',20,500),
  (t14,4,'Cső fektetés és rögzítés','labour','h','fixed',8,5000),
  (t14,5,'Próbanyomás és átadás','labour','h','fixed',2,5000);

-- 15. Elektromos alapmunka
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'villanyszerelő','Elektromos alapmunka','Belső elektromos hálózat kiépítése',15) RETURNING id INTO t15;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t15,1,'Vágás, barázdázás','labour','h','wall_area',0.15,5000),
  (t15,2,'Kábel NYM-J 3×1.5','material','fm','wall_area',2.0,350),
  (t15,3,'Kábel NYM-J 3×2.5','material','fm','wall_area',0.5,550),
  (t15,4,'Kötődoboz befalazás','material','db','area',0.4,350),
  (t15,5,'Fektetés és rögzítés','labour','h','wall_area',0.20,5000),
  (t15,6,'Szerelésvédelmi próba','labour','h','fixed',2,5000);

-- 16. Lábazatburkolás
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Lábazatburkolás','Lábazati csempe / kő fektetés és fugázás',16) RETURNING id INTO t16;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t16,1,'Felület előkészítés','labour','h','perimeter',0.10,4000),
  (t16,2,'Ragasztó','material','kg','perimeter',1.50,250),
  (t16,3,'Fektetés','labour','h','perimeter',0.30,4500),
  (t16,4,'Fugázó anyag','material','kg','perimeter',0.15,800),
  (t16,5,'Fugázás','labour','h','perimeter',0.12,4500);

-- 17. Festés – homlokzat
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'festő','Festés – homlokzat','Külső falfelület felújítása és festése',17) RETURNING id INTO t17;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t17,1,'Felület tisztítás','labour','h','wall_area',0.08,4000),
  (t17,2,'Javítóvakolat','material','kg','wall_area',1.00,350),
  (t17,3,'Javítás munka','labour','h','wall_area',0.10,4500),
  (t17,4,'Alapozó','material','l','wall_area',0.15,1200),
  (t17,5,'Alapozás','labour','h','wall_area',0.10,4500),
  (t17,6,'Homlokzatfesték (1. réteg)','material','l','wall_area',0.18,1800),
  (t17,7,'1. réteg festés','labour','h','wall_area',0.12,4500),
  (t17,8,'Homlokzatfesték (2. réteg)','material','l','wall_area',0.18,1800),
  (t17,9,'2. réteg festés','labour','h','wall_area',0.12,4500);

-- 18. Terasz / erkély burkolás
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'burkoló','Terasz / erkély burkolás','Kültéri burkolat lejtéssel, vízszigeteléssel',18) RETURNING id INTO t18;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t18,1,'Régi burkolat bontása','labour','h','area',0.30,4000),
  (t18,2,'Aljzat javítóanyag','material','kg','area',2.00,350),
  (t18,3,'Lejtésbeton anyag','material','kg','area',15.0,90),
  (t18,4,'Lejtés kialakítás','labour','h','area',0.40,4500),
  (t18,5,'Vízszigetelő folyadék','material','kg','area',1.50,2800),
  (t18,6,'Vízszigetelés alkalmazás','labour','h','area',0.25,4500),
  (t18,7,'Fagyálló ragasztó','material','kg','area',5.00,300),
  (t18,8,'Burkolat fektetés','labour','h','area',0.65,4500),
  (t18,9,'Fagyálló fugázó anyag','material','kg','area',0.40,1200),
  (t18,10,'Fugázás','labour','h','area',0.18,4500);

-- 19. Ablakcsere (per piece — fixed)
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'ács','Ablakcsere (1 ablak)','Egy ablak teljes csere folyamata (párkánnyal)',19) RETURNING id INTO t19;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t19,1,'Régi ablak eltávolítás','labour','h','fixed',1.5,5000),
  (t19,2,'Pántos / betoncsavar rögzítés','material','db','fixed',8,350),
  (t19,3,'Ablak beépítés','labour','h','fixed',2.5,5000),
  (t19,4,'PU hab tömítés','material','db','fixed',1,2500),
  (t19,5,'Belső könyöklő','material','db','fixed',1,NULL),
  (t19,6,'Külső alu párkány','material','db','fixed',1,NULL),
  (t19,7,'Párkány szerelés','labour','h','fixed',1,5000);

-- 20. Ajtócsere (per piece — fixed)
INSERT INTO templates (is_platform,trade,name,description,sort_order) VALUES
  (true,'ács','Ajtócsere (1 ajtó)','Egy beltéri ajtó teljes csere folyamata',20) RETURNING id INTO t20;
INSERT INTO template_entries (template_id,sort_order,name,entry_type,unit,qty_formula,qty_rate,suggested_price_huf) VALUES
  (t20,1,'Régi ajtó eltávolítás','labour','h','fixed',1,5000),
  (t20,2,'Zártos ajtókeret beépítés','labour','h','fixed',3,5500),
  (t20,3,'Ajtólap felszerelés','labour','h','fixed',1.5,5500),
  (t20,4,'Zár / kilincs szerelés','labour','h','fixed',1,5500),
  (t20,5,'Küszöb / élvédő','material','db','fixed',1,NULL);

END $$;
