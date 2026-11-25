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

### Project module (drop 3)
| File | Screen | Repo route |
|---|---|---|
| `P1-Lista.dc.html` | Project list | `/projektek` |
| `P2-UjProjekt.dc.html` | New project | `/projektek/uj` |
| `P3-Reszletek.dc.html` | Detail: finances, burndown, members, rooms, status flow, history | `/projektek/[id]` |
| `P4-Kiadasok.dc.html` | Invoices + labour list and editors | `/projektek/[id]` |
| `P5-SzamlaUj.dc.html` | Add invoice (photo → OCR/AI → review) | `/projektek/[id]/feltoltes` |
| `P6-Naplo.dc.html` | Diary list, entry, share links | `/projektek/[id]` · `/naplo/...` |
| `P7-Fizetes.dc.html` | Payment plan (3-step add) | `/projektek/[id]` |
| `P8-Portal.dc.html` | Client-portal sharing | `/projektek/[id]` |
Not in the first implementation scope. "Demó:" buttons are mock helpers, do not build them.

### Clients module (drop 4) — rose, colour PROPOSED
| File | Screen | Route |
|---|---|---|
| `C1-Lista.dc.html` | List: Saját / Velem megosztott, search, action sheet, delete confirm | `/ugyfelek` |
| `C2-Urlap.dc.html` | New / edit client: GDPR consent, sharing with collectives + share consent | `/ugyfelek/uj`, create modal |
| `C3-Reszletek.dc.html` | Detail: stats, contact, tabs Ajánlatok/Projektek/Felmérések/Üzenetek, portal block | `/ugyfelek/[id]`, `ClientDetailModal` |
| `C4-Uzenetek.dc.html` | Message threads (quote thread / general), reply, new message | detail → Üzenetek |
| `C5-Portal.dc.html` | Portal link: copy / open / preview, own-view label, no-email warning | detail → portal block |

### Profile module (drop 4) — stone, colour PROPOSED
| File | Screen | Route |
|---|---|---|
| `U1-Attekintes.dc.html` | Overview hub, trial banner, danger row | `/profil` |
| `U2-Adatok.dc.html` | Display name, e-mail, invoice header (name, company, address, tax, bank, website) | `/profil#szamla` |
| `U3-Alapertekek.dc.html` | Offer defaults (VAT, validity, payment, deposit, warranty, footnote) + ÁSZF PDF upload/replace/delete | `/profil#szamla`, `#aszf` |
| `U4-Elofizetes.dc.html` / `U4b-Proba.dc.html` | Subscription: Premium state / trial+Basic state, cancel, restore, collective subs, result modals | `/profil#elofizetes` |
| `U5-Nyelv.dc.html` | Language (hu/de/en), write-once currency, collective workspaces link | `/profil#preferences` |
| `U6-Biztonsag.dc.html` | Password change, logout, delete account (type TÖRLÉS) | `/profil` |

### Dashboard additions (drop 5)
| File | Screen | Route |
|---|---|---|
| `H1-Kezdolap.dc.html` | Full home: invitation + transfer banners (with list sheets), Folytasd cards, 3 stat cards, latest activity, Projektek / latest surveys / latest quotes, "Új dokumentum" sheet | `/dashboard` |
| `H2-Kezdolap-ures.dc.html` | Empty state for a new user ("Hol tartasz most?", three create tiles, createFirst* rows) | `/dashboard` |

## Known gaps in this drop (be explicit, do not guess)
1. `A-Pods.dc.html` is the approved home look, but it does **not yet** show the repo dashboard functions: pending collective invitations, pending transfer requests, stat cards (total cost / active projects / invoices), latest-activity feed. Build them in the same visual language (see AGENT_BRIEF §Dashboard); a design pass for them is still open.
2. Offer and Project colours are proposed tokens; their screens are not designed yet.
3. Floor-plan / strings in the HTML are demo Hungarian copy. Real UI strings must come from `messages/*.json` (see brief).

- Drop 4: the Clients (rose) and Profile (stone) colours are **proposals**. C2 is shown in create mode; edit mode reuses it (title "Ügyfél szerkesztése", CTA "Módosítás"). Client portal public page `/clients/[id]` and `/portal` (OTP) are not designed yet. Shared clients (C1 second tab) are read-only: no edit/delete actions.
- Drop 5: invitation/transfer banners in the repo only link to `/kollektivak` ("Megtekintés"); the sheets in H1 are a preview list whose button goes there too — accept/decline stays on that page. Collective context shows per-collective sections with an "Összes" link each (`/osszes?workspace=<id>`); not drawn separately. Dashboard still uses the A-Pods dock/pods for workspace switching.
