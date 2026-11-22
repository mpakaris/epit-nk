# OkosSzaki — desktop SaaS design handoff ("Pods", ≥ 768 px)

Same visual language as `design/mobile/`: dark rounded sidebar with workspace pods, a module-coloured rounded header band (`0 0 32px 32px`), dark module body with white cards, pill buttons, sheets become centred modals (CLAUDE.md rule 2: `Modal`, never a third overlay). Colours: tokens in `design/mobile/tokens.css` (survey teal, offer violet, project slate-navy, clients rose*, profile stone*; *proposals). Canvas size 1440×900.

| File | Screen | Route |
|---|---|---|
| `DD1-Kezdolap` | Dashboard: invitation + transfer banners, quick create, stats, latest projects/surveys/offers, activity, "Új dokumentum" modal | `/dashboard` |
| `DS1-Lista` | Survey table + preview panel (open, create quote, share, delete) | `/felmeres` |
| `DS2-Reszletek` | Survey detail, overview: ONE surface. Header holds title, counters, primary action "Ajánlat készítése" and a ⋯ actions modal (share, PDF, client, delete). Body = room **pods** (name, area, item count, first 3 items, "+N további"), search across all items, "Új helyiség" pod | `/felmeres/[id]` |
| `DS3-Pod-nyitva` | Same page with a pod open: pod strip for switching rooms (+ "Összes" back), **items table is the main content** (quick-add row with dictation, inline edit/delete/reorder, search); measurements, note and photos are a collapsed secondary bar | `/felmeres/[id]` |
| `DO1-Lista` | Offer table, status filters, totals strip | `/ajanlatok` |
| `DO2-Szerkeszto` | Offer editor: sections with entries, totals, status flow, send modal (e-mail + PDF), client/terms | `/ajanlatok/[id]` |
| `DP1-Lista` | Project cards with spend vs quote progress | `/projektek` |
| `DP2-Reszletek` | Project detail: financials, burndown, cost split, tabs Kiadások/Munkaóra/Napló/Fizetési terv/Portál, status, team, client | `/projektek/[id]` |
| `DC1-Ugyfelek` | Clients master-detail (own/shared, tabs incl. messages, portal block) + new-client modal with GDPR/sharing | `/ugyfelek` |
| `DU1-Beallitasok` | Profile settings: personal, invoice header, offer defaults, ÁSZF, language/currency | `/profil` |
| `DU2-Elofizetes` | Subscription, collectives, security, danger zone, cancel and delete modals | `/profil#elofizetes` |

## Rules for the implementer
- Behaviour and function lists are in `design/mobile/FUNCTION_MAP.md` (same functions, different layout). The repo is the source of truth; desktop must expose **every** function the mobile map lists for that module.
- Desktop and mobile stay separate trees (see `design/mobile/AGENT_BRIEF.md` §1). Desktop files may only be changed in the desktop PRs.
- Sidebar: workspace pods = Személyes + collectives (counts), nav = existing routes; the user card links to `/profil`. Nav items for modules without a designed screen (Üzenetek, Naptár, Ötletek, Katalógus, Weboldalam, Kollektívák) keep their current pages restyled only with the shell.
- Example amounts/names are mock data and are not reconciled across boards (e.g. the offer editor total differs from the list).
- Not drawn: desktop room-editor keypad (use native inputs), invoice upload (`P5`), diary/payment-plan editors, floor-plan analysis, contributor-restricted variants, collective-context dashboard, public `/clients/[id]`.
- Standards: tokens only, `navPrefix`, i18n keys in hu/en/de, soft delete, double permission checks, ≥ 44 px targets.

## Detail-page pattern (survey now; offer detail should copy it)
Replaces the earlier 3-card layout (section list | details | action card). Rules: one working surface; sections are pods on the page, a click opens the pod in place; items/tasks are primary, measurements secondary and collapsed; actions live in the header (primary button + ⋯ modal), not in a side card; switching sections happens via the pod strip, no separate nav column. The offer editor (`DO2`) has not been redrawn yet — apply the same pattern with offer sections as pods (entries table primary; client, terms, totals and status in the header/bar).
