# Modal / Sheet Cancel Button Cleanup

**Rule:** `Modal` (default export) always renders an X in the header — any pure close/cancel button inside is redundant and should be removed. `ConfirmModal` and `AlertModal` use `ModalBase` (no X) — add an X to each, then remove the cancel/OK-only button.

---

## 1. `src/components/Modal.jsx`
- `ConfirmModal` — add X button to header, remove the "Mégse" button
- `AlertModal` — add X button to header, remove the "OK" button

## 2. `src/app/ajanlatok/[id]/page.js` *(Modal → has X)*
- Line 1080 — remove "Bezárás" (convert success state)
- Line 1096 — remove "Bezárás" (convert error state)
- Line 1235 — remove "Mégse" (send confirm modal)
- Line 1526 — remove "Mégse" (duplicate modal)

## 3. `src/app/projektek/ProjectsListClient.jsx` *(Modal → has X)*
- Line 445 — remove "Mégse" (new client inline form); also resets `newClientError` — wire that reset into the modal's `onClose` before removing the button
- Line 476 — remove "Mégse" (create project modal)

## 4. `src/app/ugyfelek/page.js` *(Modal → has X)*
- Line 453 — remove "Mégse"

## 5. `src/app/kollektivak/page.js` *(Modal → has X)*
- Lines 1338, 1354, 1505, 1520, 1546, 1580, 1685 — remove "Bezárás"/"Mégse" buttons; verify each is a pure close and not a two-choice confirm before removing

---

## Skip / Deferred

- **`router.back()` buttons** — navigation, not modal close; keep them
- **Inline edit cancel buttons** (`InvoiceDetailDrawer`, `TételekSection`, `SectionAddForm`, `katalogus/page.js`) — "Mégse" cancels the edit state, not just the modal; wire the modal's `onClose` to the same cleanup function first, then remove the button
- **Admin pages (`/admin/*`)** — lower priority, do last
