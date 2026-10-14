-- ============================================================
-- 042_seed_testo_website.sql
-- Seeds a full premium Festő website for testo@testo.com
-- Run AFTER 041_website_premium.sql
-- ============================================================

DO $$
DECLARE
  v_user_id   uuid;
  v_trade_id  uuid;
  v_website_id uuid;
BEGIN

  -- Resolve user
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'testo@testo.com' LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User testo@testo.com not found in auth.users';
  END IF;

  -- Resolve trade
  SELECT id INTO v_trade_id FROM public.trades WHERE name_hu = 'Festő' LIMIT 1;

  -- Upsert website
  INSERT INTO public.user_websites
    (user_id, trade_id, slug, status, is_premium, published_at, theme, updated_at)
  VALUES (
    v_user_id,
    v_trade_id,
    'kovacs-peter-festo',
    'published',
    true,
    now(),
    '{
      "color_scheme": "ocean",
      "typography": "modern",
      "banners": []
    }'::jsonb,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    trade_id     = EXCLUDED.trade_id,
    slug         = EXCLUDED.slug,
    status       = EXCLUDED.status,
    is_premium   = EXCLUDED.is_premium,
    published_at = EXCLUDED.published_at,
    theme        = EXCLUDED.theme,
    updated_at   = now()
  RETURNING id INTO v_website_id;

  -- Clear old sections
  DELETE FROM public.website_sections WHERE website_id = v_website_id;

  -- ── Hero ──────────────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'hero', true, '{
    "tagline":  "Megbízható festési munkák – 15 éves tapasztalattal",
    "subtitle": "Belső és külső festés, tapétázás, glettelés – garanciával, határidőre. Budapest és 35 km-es körzet."
  }', 0);

  -- ── Rólam ─────────────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'about', true, '{
    "text": "Kovács Péterként 2008 óta dolgozom festő-mázoló szakmában Budapesten és vonzáskörzetében. Az évek során több száz lakás, iroda és üzleti tér festési, tapétázási és glettelési munkáját végeztem el sikeresen.\n\nMunkáimat pontosság, minőségi anyaghasználat és megbízhatóság jellemzi. Kizárólag tanúsított, minőségi festékekkel dolgozom – Dulux, Caparol és Tikkurila termékekkel. Minden elvégzett munkára 2 év garanciát vállalok.\n\nRendszeres ügyfeleim visszatérő bizalma a legjobb visszajelzés számomra. Ha megbízható, precíz szakembert keresel, szívesen segítek!"
  }', 1);

  -- ── Szolgáltatások ────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'services', true, '{
    "items": [
      {"title": "Belső festés",          "description": "Falak és mennyezetek festése alapozással, fedőréteggel. Teljes körű előkészítéssel."},
      {"title": "Külső homlokzatfestés", "description": "Épületek külső falfelületeinek festése és felújítása időjárásálló anyagokkal."},
      {"title": "Glettelés és simítás",  "description": "Falfelületek simítása, repedések javítása, tökéletes alapfelület kialakítása."},
      {"title": "Tapétázás",             "description": "Hagyományos és modern tapéták felhelyezése, eltávolítása és alapozása."},
      {"title": "Lakásfelújítás",        "description": "Teljes körű lakásfelújítás koordinálása festési munkálatokkal."},
      {"title": "Irodafestés",           "description": "Irodák, üzletek és kereskedelmi terek gyors festése hétvégén is."},
      {"title": "Díszítőfestés",         "description": "Struktúrált falak, mintás felületek, lazúrozás és különleges dekoratív technikák."},
      {"title": "Speciális bevonatok",   "description": "Tűzálló, nedvességálló és penészgátló festékek felvitele különleges helyiségekbe."}
    ]
  }', 2);

  -- ── Képesítések ───────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'certifications', true, '{
    "items": [
      {"title": "Mesterfestő-mázoló bizonyítvány",  "issuer": "Magyar Kereskedelmi és Iparkamara",  "year": "2015"},
      {"title": "OKJ Festő-mázoló képesítés",        "issuer": "Állami Szakképzési Intézet",         "year": "2009"},
      {"title": "Dulux Professzionális Alkalmazó",   "issuer": "AkzoNobel Magyarország Kft.",        "year": "2018"},
      {"title": "Caparol Partner Festő",             "issuer": "Caparol Magyarország",               "year": "2019"},
      {"title": "Tűzálló bevonatok kezelője",        "issuer": "Tűzvédelmi Szakmai Szövetség",       "year": "2021"},
      {"title": "Magasban végzett munka tanúsítvány","issuer": "Munkavédelmi Hatóság",               "year": "2022"}
    ]
  }', 3);

  -- ── Galéria (üres – képeket manuálisan tölt fel) ──────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'gallery', true, '{"items": []}', 4);

  -- ── Áraink ────────────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'pricing', true, '{
    "items": [
      {
        "title": "Belső festés",
        "vat": "net",
        "entries": [
          {"label": "Alapfestés (1 réteg)",  "price": "800",  "unit": "m²"},
          {"label": "Fedőfestés (2 réteg)",  "price": "1500", "unit": "m²"},
          {"label": "Mennyezetfestés",        "price": "1800", "unit": "m²"}
        ]
      },
      {
        "title": "Glettelés",
        "vat": "net",
        "entries": [
          {"label": "Vékonyglettezés",  "price": "1200", "unit": "m²"},
          {"label": "Teljes glettezés", "price": "2200", "unit": "m²"},
          {"label": "Javítóglettezés",  "price": "600",  "unit": "m²"}
        ]
      },
      {
        "title": "Tapétázás",
        "vat": "net",
        "entries": [
          {"label": "Tapéta felhelyezése",      "price": "900",  "unit": "m²"},
          {"label": "Régi tapéta eltávolítása", "price": "400",  "unit": "m²"},
          {"label": "Üvegszövet tapéta",        "price": "1100", "unit": "m²"}
        ]
      },
      {
        "title": "Külső festés",
        "vat": "net",
        "entries": [
          {"label": "Homlokzatfestés",     "price": "2200", "unit": "m²"},
          {"label": "Alapozás + 2 réteg",  "price": "3500", "unit": "m²"}
        ]
      },
      {
        "title": "Díszítőfestés",
        "vat": "net",
        "entries": [
          {"label": "Struktúrált felület", "price": "3800", "unit": "m²"},
          {"label": "Egyedi dekor",        "price": "4500", "unit": "m²"}
        ]
      },
      {
        "title": "Egyéb",
        "vat": "net",
        "entries": [
          {"label": "Helyszíni felmérés",           "price": "0",    "unit": "átalány"},
          {"label": "Kiszállás (30 km-en túl)",     "price": "5000", "unit": "átalány"}
        ]
      }
    ]
  }', 5);

  -- ── Vélemények ────────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'testimonials', true, '{
    "items": [
      {"name": "Horváth Mariann",  "text": "Péter gyorsan, pontosan és alaposan végezte el a lakásunk festését. A végeredmény tökéletes, minden sarokig rendben. Csak ajánlani tudom!"},
      {"name": "Szabó Gábor",      "text": "Irodánk teljes felújítását bízta cégünk Péterre. Hétvégén dolgozott, hogy a munkánkat ne zavarja – hétfőre minden készen volt. Profi hozzáállás."},
      {"name": "Tóth Éva",         "text": "A tapétázást és festést is elvégezte. Nagyon türelmes volt, a mintaillesztés tökéletes. Látszik, hogy komoly szakember. Visszahívjuk a jövőben is!"},
      {"name": "Nagy Zoltán",      "text": "Már másodszor dolgozunk együtt. Mindig időben érkezik, a munkaterületet rendben hagyja maga után. Megbízható, precíz mester."},
      {"name": "Fekete Ildikó",    "text": "Péter feljavította a repedezett falakat és utána festette is. A glettelés minősége kiemelkedő. Árai is versenyképesek."},
      {"name": "Kovács András",    "text": "Gyors, precíz és barátságos. A teljes lakást 3 nap alatt elvégezte. Az árajánlat pontosan annyi volt, mint amennyit fizettem."},
      {"name": "Molnár Réka",      "text": "Struktúrált falat kértem a nappaliba – tökéletes lett! Péter szép munkát végez és jó tanácsokat adott az anyagok kiválasztásához."},
      {"name": "Varga Tibor",      "text": "Homlokzatfestésre kértük fel, nagyon profin dolgozott. Az állványzatot is ő szerezte be, minden engedéllyel. Szomszédainknak is ajánlottuk."}
    ]
  }', 6);

  -- ── GYIK ──────────────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'faq', true, '{
    "items": [
      {"question": "Hogyan zajlik az árajánlat?",        "answer": "Ingyenes, kötelezettségmentes helyszíni felmérés után adok írásos árajánlatot, általában 24 órán belül."},
      {"question": "Milyen festékeket használsz?",       "answer": "Kizárólag minőségi, bevizsgált festékekkel dolgozom: Dulux, Caparol és Tikkurila termékekkel."},
      {"question": "Van garancia a munkára?",            "answer": "Igen, minden elvégzett munkára 2 év garanciát vállalok. Ha ez idő alatt bármilyen probléma merül fel, ingyenesen javítom."},
      {"question": "Hogyan zajlik a fizetés?",           "answer": "Az anyagköltségre 30% előleget kérek a munka megkezdése előtt. A fennmaradó összeget a munka átvételekor, készpénzben vagy átutalással lehet rendezni."},
      {"question": "Mennyi ideig tart egy lakás festése?","answer": "Egy 60–80 m²-es lakás festése általában 3–5 munkanapot vesz igénybe, a falak állapotától és a munkák mértékétől függően."},
      {"question": "Hétvégén is lehet dolgozni?",        "answer": "Igen, irodáknál és üzleteknél szívesen dolgozom hétvégén is. Lakásoknál egyéni megállapodás szerint."}
    ]
  }', 7);

  -- ── Munkaterület ──────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'service_area', true, '{
    "lat": 47.4979,
    "lng": 19.0402,
    "radius_km": 35
  }', 8);

  -- ── Kapcsolat ─────────────────────────────────────────────
  INSERT INTO public.website_sections (website_id, section_type, enabled, content, order_index) VALUES
  (v_website_id, 'contact', true, '{
    "phone":     "+36 70 123 45 67",
    "email":     "kovacs.peter.festo@gmail.com",
    "whatsapp":  "+36 70 123 45 67",
    "viber":     "+36 70 123 45 67",
    "tiktok":    "@kovacspeterfesto",
    "instagram": "@kovacspeterfesto"
  }', 9);

  RAISE NOTICE 'Website seeded successfully. ID: %', v_website_id;

END $$;
