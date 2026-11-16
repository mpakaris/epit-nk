# OkosSzaki — mobile design handoff ("Pods")

Reference designs for the new mobile UI. Scope of this first drop: **Dashboard + Survey, mobile only.**

- `screens/*.dc.html` — design sources (Design Component files). Open them in a browser via any static server, or read them as spec: layout, sizes, copy, states and behaviour are all in the markup and the `<script>` block of each file. `_shared.css` holds the shared classes.
- `tokens.css` — colour/shape/touch tokens to port into the app (scoped under `.m-root`).
- `DESIGN_SPEC.md` — what the design is and why: concept, colour, layout system, per-screen behaviour, states, a11y, known deviations. Read first.
- `AGENT_BRIEF.md` — what to build, in what order, and the rules.
- `FUNCTION_MAP.md` — every screen → existing repo files, APIs and i18n namespaces (the functions are kept; only the UI changes).

## Screens in this drop
| File | Screen | Repo route |
|---|---|---|
| `A-Pods.dc.html` | Dashboard / home (pod stack, calendar, dock) | `/dashboard` |
| `S1-Lista.dc.html` | Survey list (pods, filters, ⋯ sheet, transfer, delete) | `/felmeres` |
| `F1-UjFelmeres.dc.html` | New survey (workspace choice → form, new-client GDPR sheet) | `/felmeres/uj` |
| `S3-Reszletek.dc.html` | Survey detail (status, property, floor plans, rooms, areas, linked docs, locked) | `/felmeres/[id]` |
| `S4-Helyiseg.dc.html` | Room editor with keypad | `/felmeres/[id]` (entry) |
| `S5-Tetelek.dc.html` | Items + dictation/AI + item drawer | `/felmeres/[id]` (items) |
| `S6-Alaprajz.dc.html` | Floor-plan AI analysis | `/felmeres/[id]` (layout) |

### Offer module (drop 2)
| File | Screen | Repo route |
|---|---|---|
| `O1-Lista.dc.html` | Offer list | `/ajanlatok` |
| `O2-UjAjanlat.dc.html` | New offer (destination, survey picker, client, VAT) | `/ajanlatok/uj` |
| `O3-Reszletek.dc.html` | Offer detail (totals, portal, sections, status, history, copy) | `/ajanlatok/[id]` |
| `O4-Tetelek.dc.html` | Item editor (dictation, AI, batch delete) | `/ajanlatok/[id]` |
| `O5-Helyiseg.dc.html` | New/edit room | `/ajanlatok/[id]` |
| `O6-Muveletek.dc.html` | Send, accept → project, reject | `/ajanlatok/[id]` |
| `O7-Pdf.dc.html` | Preview / PDF | `/ajanlatok/[id]/nyomtatas` |
Offer is designed but **not in the first implementation scope** (Dashboard + Survey first). The O-files contain "Demó:" helper buttons (role switch, step advance) — do not implement those.

## Known gaps in this drop (be explicit, do not guess)
1. `A-Pods.dc.html` is the approved home look, but it does **not yet** show the repo dashboard functions: pending collective invitations, pending transfer requests, stat cards (total cost / active projects / invoices), latest-activity feed. Build them in the same visual language (see AGENT_BRIEF §Dashboard); a design pass for them is still open.
2. Offer and Project colours are proposed tokens; their screens are not designed yet.
3. Floor-plan / strings in the HTML are demo Hungarian copy. Real UI strings must come from `messages/*.json` (see brief).
