# media_items — Implementation Spec

## Background

R2 images are shared across surveys, offers, and projects. A single R2 object (`r2_key`) can be
referenced by multiple DB rows. Before deleting from R2, we must check if any other row still
references that key. If yes — delete only the DB row. If no — delete DB row + R2 object.

`survey_media` (existing table) is left untouched. All new document media (quotes, projects) goes
into the new `media_items` table (migration 119, already written).

---

## Key column names

**`survey_media`** (existing — do not modify):
- `id`, `survey_id`, `drive_file_id` (= r2_key), `drive_view_url` (= cdn_url), `thumbnail_url`,
  `mime_type`, `entry_id` (survey_entry_id), `uploaded_by`, `created_at`

**`media_items`** (new):
- `id`, `r2_key`, `cdn_url`, `thumbnail_url`, `mime_type`, `file_size_kb`
- `owner_type` ('quote_section' | 'project_room' | 'diary_entry'), `owner_id`
- `document_type` ('quote' | 'project'), `document_id`
- `created_by`, `created_at`, `sort_order`

---

## Step 1 — Apply migration

Run `supabase/migrations/119_media_items.sql` via the Supabase SQL editor.
No code changes needed for this step.

---

## Step 2 — `src/lib/mediaUsage.js` (new file)

Create this utility with two exported functions:

### `checkWhereImageIsUsed(adminClient, r2Key)`

Queries BOTH `survey_media` (column: `drive_file_id`) AND `media_items` (column: `r2_key`).
Returns `{ total: number, surveyRefs: [], mediaRefs: [] }`.

```js
export async function checkWhereImageIsUsed(admin, r2Key) {
  const [{ data: surveyRefs }, { data: mediaRefs }] = await Promise.all([
    admin.from('survey_media').select('id, survey_id, entry_id').eq('drive_file_id', r2Key),
    admin.from('media_items').select('id, owner_type, owner_id, document_type, document_id').eq('r2_key', r2Key),
  ]);
  return {
    total: (surveyRefs?.length || 0) + (mediaRefs?.length || 0),
    surveyRefs: surveyRefs || [],
    mediaRefs: mediaRefs || [],
  };
}
```

### `safeDeleteMediaItem(adminClient, mediaItemId)`

Deletes a `media_items` row. Deletes the R2 object only if it is the last reference.

```js
import { deleteFromR2 } from '@/lib/r2';

export async function safeDeleteMediaItem(admin, mediaItemId) {
  const { data: item } = await admin
    .from('media_items').select('r2_key').eq('id', mediaItemId).single();
  if (!item) return;

  const { total } = await checkWhereImageIsUsed(admin, item.r2_key);

  await admin.from('media_items').delete().eq('id', mediaItemId);

  if (total === 1) {
    try { await deleteFromR2(item.r2_key); } catch {}
  }
}
```

---

## Step 3 — Update survey media delete route

File: `src/app/api/surveys/[id]/media/[mediaId]/route.js`

Currently calls `deleteFromR2(media.drive_file_id)` unconditionally after deleting the DB row.

**Change:** use `checkWhereImageIsUsed` before deciding whether to call `deleteFromR2`.

```js
// After: await admin.from('survey_media').delete().eq('id', mediaId)
// Replace the unconditional deleteFromR2 with:

import { checkWhereImageIsUsed } from '@/lib/mediaUsage';

const r2Key = media.drive_file_id;
await admin.from('survey_media').delete().eq('id', mediaId);

const { total } = await checkWhereImageIsUsed(admin, r2Key);
if (total === 0) {
  try { await deleteFromR2(r2Key); } catch {}
}
```

Note: `total` is checked AFTER deleting the survey_media row (so if result is 0, this was the
only reference).

---

## Step 4 — Copy survey media → offer on new offer creation

File: `src/app/ajanlatok/uj/page.js`

Currently, after creating quote sections from survey entries, no media is copied.

**Add** after the section creation loop (inside the `if (surveyId)` block):

```js
// After all sections are created, copy survey_media rows for each entry
// into media_items so the offer owns its own pointer to the same R2 objects.
if (surveyId) {
  const res = await fetch(`/api/quotes/${quote.id}/copy-survey-media`, { method: 'POST' });
  // Fire-and-forget — don't block the redirect on failure
}
```

---

## Step 5 — New API route: `POST /api/quotes/[id]/copy-survey-media`

File: `src/app/api/quotes/[id]/copy-survey-media/route.js`

Logic:
1. Auth check (owner or collective owner)
2. Load the quote (need `survey_id`)
3. Load all `quote_sections` for this quote that have a `survey_entry_id`
4. For each section, load `survey_media` rows where `entry_id = survey_entry_id`
5. Insert each into `media_items` with:
   - `r2_key = survey_media.drive_file_id`
   - `cdn_url = survey_media.drive_view_url`
   - `thumbnail_url = survey_media.thumbnail_url`
   - `mime_type = survey_media.mime_type`
   - `owner_type = 'quote_section'`
   - `owner_id = quote_section.id`
   - `document_type = 'quote'`
   - `document_id = quote.id`
   - `created_by = user.id`
   - `sort_order` = original sort order if available
6. Skip any `r2_key` that already exists in `media_items` for this `owner_id` (idempotent)
7. Return `{ copied: N }`

---

## Step 6 — New API route: `POST /api/media-items/[id]/delete`

File: `src/app/api/media-items/[id]/route.js` (DELETE method)

Logic:
1. Auth check — user must own the document referenced by `document_id`
2. Call `safeDeleteMediaItem(admin, id)` from `@/lib/mediaUsage`
3. Return `{ ok: true }`

---

## Step 7 — Update `SectionMediaGrid` to use `media_items`

File: `src/components/SectionMediaGrid.jsx`

Currently reads photos from `surveyEntriesBySurvey[surveyId]` — this works when the section
has a linked survey entry. But now the offer owns its own `media_items` rows.

**Add a prop** `mediaItems?: Array` that, when provided, overrides the survey-based lookup:

```jsx
export default function SectionMediaGrid({ surveyId, surveyEntryId, isLocked, triggerUpload = 0, mediaItems }) {
  // ...
  const surveyMedia = (surveyEntriesBySurvey[surveyId] || []).find(e => e.id === surveyEntryId)?.media || [];
  const media = mediaItems ?? surveyMedia;
  // rest unchanged
```

In `SectionCard`, pass `media_items` for the section once the data is loaded. Load them via
`/api/media-items?owner_type=quote_section&owner_id=sectionId` or include them in the quote
data fetch (`/api/entity/data`).

**Easiest path:** add `media_items` to the `GET /api/quotes/[id]` response so they arrive with
the quote data. Or add to `/api/entity/data`. Discuss with team which is preferred.

---

## Step 8 — Wire offer → project copy (future, but plan now)

When `convertQuoteToProject` is called:
- Copy `media_items WHERE document_type='quote' AND document_id=quoteId`
- Insert new rows with `owner_type='project_room'`, `document_type='project'`, `document_id=newProjectId`
- `owner_id` mapping: quote_section.id → project_room.id (requires the room to be created first)

This step is NOT part of this implementation ticket. Document it here for the next agent.

---

## What NOT to change

- `survey_media` table — do not alter columns or data
- `SectionPhotoZone` upload logic — still creates `survey_media` rows for surveys
- The survey → offer display currently works via `survey_entry_id` reference — this continues to
  work as fallback. `media_items` adds proper ownership on top of it.
- Do not remove the `hasMedia` check in `SectionCard` — it is still needed to decide whether to
  show the gallery zone

---

## Files touched summary

| File | Action |
|---|---|
| `supabase/migrations/119_media_items.sql` | ✅ Already written — apply via Supabase SQL editor |
| `src/lib/mediaUsage.js` | CREATE — `checkWhereImageIsUsed`, `safeDeleteMediaItem` |
| `src/app/api/surveys/[id]/media/[mediaId]/route.js` | EDIT — use `checkWhereImageIsUsed` before R2 delete |
| `src/app/ajanlatok/uj/page.js` | EDIT — call copy-survey-media after section creation |
| `src/app/api/quotes/[id]/copy-survey-media/route.js` | CREATE — copy survey_media → media_items |
| `src/app/api/media-items/[id]/route.js` | CREATE — DELETE handler using safeDeleteMediaItem |
| `src/components/SectionMediaGrid.jsx` | EDIT — accept `mediaItems` prop override |
| `src/app/api/quotes/[id]/route.js` or `/api/entity/data` | EDIT — include media_items in quote data response |
