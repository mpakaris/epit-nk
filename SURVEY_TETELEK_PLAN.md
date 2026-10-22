# Survey Tételek + Contractor Price Library

## Context

Survey and Quote are ~90% congruent. The missing link is **tételek on survey entries** —
structured line items that flow Survey → Quote → Project. The goal is a contractor who
measures a room, gets tételek auto-generated from notes + AI, then converts to a priced
quote in minutes.

---

## Phase 1 — Tételek on Survey Entries

### DB Migration

New table `survey_entry_items`:

```sql
CREATE TABLE survey_entry_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  entry_id        UUID NOT NULL REFERENCES survey_entries(id) ON DELETE CASCADE,
  survey_id       UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
  owner_id        UUID REFERENCES auth.users(id),
  created_by      UUID REFERENCES auth.users(id),

  description     TEXT NOT NULL,          -- "Csempe rakás"
  quantity        NUMERIC,                -- 45
  unit            TEXT,                   -- 'm²' | 'm' | 'db' | 'óra' | 'zsák'
  notes           TEXT,                   -- optional detail

  source          TEXT DEFAULT 'manual',  -- 'manual' | 'user_note' | 'ai_suggestion'
  is_confirmed    BOOLEAN DEFAULT true,   -- false = AI suggestion, shown greyed out

  -- Link back to catalogue item when sourced from library
  catalogue_item_id UUID REFERENCES catalogue_items(id) ON DELETE SET NULL,

  -- Link to quote_entry when this tétel was imported into a quote
  quote_entry_id  UUID REFERENCES quote_entries(id) ON DELETE SET NULL,

  sort_order      INT DEFAULT 0
);
```

### API Routes

- `GET  /api/surveys/[id]/items`          — list all tételek for a survey (grouped by entry)
- `POST /api/surveys/[id]/items`          — create a tétel manually
- `PUT  /api/surveys/[id]/items/[itemId]` — edit / confirm an AI suggestion
- `DELETE /api/surveys/[id]/items/[itemId]`

### UI — Survey Entry Card

Add a **Tételek** section below the description in each room card (collapsed by default):

```
🏠 Konyha (3×3m, 9m²)
  ▼ Tételek (3 db)
    ✅ Csempe bontás         9 m²
    ✅ Síit transport        1 db
    ✅ Fugázás               9 m²
    ── AI javaslatok ──────────────
    ○  Aljzatkiegyenlítés   9 m²   [+ Elfogad]
    ○  Ragasztó             2 zsák [+ Elfogad]
```

AI suggestions shown with dashed border / muted colour. One tap to confirm.

---

## Phase 2 — AI Generation from Notes

### Trigger

Button on each survey entry: **"Tételek generálása"** — opt-in, not automatic.

### What the AI does

1. **Parse user notes** → extract explicit tasks mentioned (bontas, fugazas, tisztitas, etc.)
2. **Suggest implicit tasks** based on room type + measurements (max 5–10 suggestions)
3. **Calculate quantities** from `size_m2`, `height_m`, `wall_m2` where applicable

### API Route

`POST /api/surveys/[id]/entries/[entryId]/generate-items`

Request body: `{ locale: 'hu' }`

Response:
```json
{
  "from_notes": [
    { "description": "Csempe bontás", "quantity": 9, "unit": "m²", "source": "user_note" },
    { "description": "Síit transport", "quantity": 1, "unit": "db",  "source": "user_note" }
  ],
  "suggestions": [
    { "description": "Aljzatkiegyenlítés", "quantity": 9,  "unit": "m²",  "source": "ai_suggestion" },
    { "description": "Ragasztó",           "quantity": 2,  "unit": "zsák", "source": "ai_suggestion" },
    { "description": "Fugázó anyag",       "quantity": 1,  "unit": "zsák", "source": "ai_suggestion" }
  ]
}
```

### AI prompt structure

```
Te egy tapasztalt magyar építőipari szakember asszisztense vagy.

Helyiség: {name}, {width}×{length}m ({size_m2} m²), {height}m belmagasság
Megjegyzés a felhasználótól: "{description}"

1. Sorold fel az összes munkát, amelyet a felhasználó EXPLICIT említett a megjegyzésben.
   (source: user_note)

2. Javasolj MAX 8 önálló munkafázist, amely a helyiség típusából és a megjegyzésből
   logikusan következik, de nincs benne explicitly. Csak azt javasolj, ami szinte
   biztosan szükséges lesz. (source: ai_suggestion)

3. Minden tételnél add meg a mennyiséget és egységet a méretek alapján.
   Pl. csempe/festés → m², anyag → zsák/kg/db.

Válaszolj JSON-ban.
```

---

## Phase 3 — Contractor Price Library

### DB Migration

```sql
CREATE TABLE catalogue_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  owner_id        UUID REFERENCES auth.users(id),       -- personal catalogue
  collective_id   UUID REFERENCES collectives(id),       -- or team catalogue

  trade           TEXT,    -- 'csempés' | 'festő' | 'gipszkartonos' | 'általános'
  name            TEXT NOT NULL,   -- "Csempe rakás"
  unit            TEXT NOT NULL,   -- 'm²'
  labour_price    NUMERIC,         -- 8500 Ft/unit
  
  materials       JSONB,   -- [{ name, qty_per_unit, unit, price_per_unit }]
  -- e.g. [{ name: "Csempe", qty_per_unit: 1.1, unit: "m²" },
  --        { name: "Ragasztó", qty_per_unit: 4.5, unit: "kg" }]

  notes           TEXT,
  is_active       BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0
);
```

### UI — `/katalogus` page

Simple CRUD table. Columns: Név | Egység | Munka díj | Anyagok | Ár/egység.
Grouped by trade. Importable from CSV.

### Voice-driven catalogue entry (WhatsApp)

The entire price table can be built by voice — no app needed. The contractor
dictates their rates on-site, in the car, wherever. The AI structures it.

**Example voice input:**
> "Csempe rakás nyolcezerötszáz forint négyzetméterenként, anyag: másfél négyzetméter
> csempe per négyzetméter, négy és fél kiló ragasztó, egy kiló fugázó.
> Festés kétezer forint, anyag: negyed liter festék négyzetméterenként."

**AI output → catalogue rows:**
```
Csempe rakás | m² | 8 500 Ft | csempe: 1.5 m², ragasztó: 4.5 kg, fugázó: 1 kg
Festés       | m² | 2 000 Ft | festék: 0.25 l
```

**WhatsApp tool: `upsert_catalogue_item`**
- Recognises labour price per unit + material list from free-form speech
- Handles Hungarian number words ("nyolcezerötszáz" → 8500)
- If item name already exists in catalogue → updates it (upsert)
- If new → creates it
- Replies with a confirmation summary for the user to verify

**Why this matters:** A drywaller dictates his full rate card in one 2-minute voice
message. From that point every quote auto-fills. The catalogue is built once,
maintained by voice when prices change.

### Integration with Tételek

When user picks a tétel from catalogue:
- `description` ← catalogue item name
- `quantity` ← calculated from room measurements × `qty_per_unit`
- `unit` ← from catalogue
- `catalogue_item_id` ← linked for future price updates

When catalogue prices change → option to **recalculate open quotes** that reference it.

---

## Phase 4 — Survey → Quote Import (improved)

Currently: one-time import that loses the link.

Improvement:
- Quote section can reference `survey_entry_id`
- `survey_entry_items` with `source='confirmed'` auto-populate the quote section's tételek
- Measurements stay live-linked — if survey room is corrected, quote section updates

### API change

`POST /api/quotes/[id]/import-survey` — enhanced to also import `survey_entry_items`
and store `source_survey_entry_id` on each `quote_entries` row.

---

## WhatsApp Bot Integration

### New tool: `generate_entry_items`

```js
{
  name: 'generate_entry_items',
  description: 'Tételek generálása egy felmérés helyiségéhez a megjegyzés és méretek alapján.',
  parameters: {
    survey_id: string,
    room_name: string,
  }
}
```

Flow: User sends note to Fürdőszoba → agent asks "Generáljam a tételeket?" → user says igen
→ agent calls `generate_entry_items` → returns confirmed + suggested items
→ agent replies with structured list, asks user to confirm suggestions.

---

## Build Order

| # | Task | Notes |
|---|---|---|
| 1 | Migration: `survey_entry_items` | Foundation for everything |
| 2 | API CRUD for survey items | Simple REST |
| 3 | UI: Tételek section in survey entry card | Below description, collapsible |
| 4 | AI generation endpoint | OpenAI structured output |
| 5 | UI: "Generálás" button + suggestion review | Confirm/dismiss UI |
| 6 | Migration: `catalogue_items` | Phase 3 start |
| 7 | `/katalogus` page (CRUD) | Simple table UI |
| 8 | Auto-fill from catalogue | On tétel creation |
| 9 | Improved Survey→Quote import | Live link |
| 10 | WhatsApp `generate_entry_items` tool | Bot integration |
| 11 | WhatsApp `upsert_catalogue_item` tool | Build price library by voice |
