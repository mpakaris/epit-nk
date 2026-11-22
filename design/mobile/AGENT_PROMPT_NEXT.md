# Prompt for the implementation agent — next drop

Copy everything below the line into the agent.

---

You are continuing the mobile "Pods" redesign of Epitek (OkosSzaki). Dashboard and Survey (/felmeres) are already implemented. Design handoff lives on branch `design/mobile-pods` in `design/mobile/`. Fetch that branch and read, in this order: `README.md`, `AGENT_BRIEF.md`, `DESIGN_SPEC.md`, `FUNCTION_MAP.md`, `tokens.css`, then the screen files in `screens/` (open each `.dc.html`; the `<x-dc>` markup is the layout, the last `<script type="text/x-dc">` shows the states and interactions). `/CLAUDE.md` rules still win; `AGENTS.md` still applies (read `node_modules/next/dist/docs/` before touching routing).

## Step 0 — reconcile what is already built (do first, report before coding)
1. Compare the shipped Dashboard and Survey against `A-Pods`, `H1-Kezdolap`, `H2-Kezdolap-ures` and `S1`–`S6`/`F1`. List every gap (missing function, wrong token, hardcoded value, missing i18n key, touch target < 48px). Dashboard additions that are new in this drop: invitation + transfer-request banners, Folytasd cards, three stat cards, latest-activity feed, Projektek / latest surveys / latest offers lists, empty state. Fix these gaps as the first PR ("dashboard parity").
2. Reuse the mobile shell, dock, pod, header, sheet and bar components you already created. Do not fork them. Add new shared pieces (avatar, switch row, checkbox card, toast) to `components/mobile/pods/` only if two or more screens need them.
3. Keep the mobile/desktop separation exactly as already agreed and implemented for Dashboard/Survey. Do not change desktop files.

## Order of work (one PR per module, mobile only)
1. Dashboard parity (step 0).
2. **Offers** `/ajanlatok` — `O1`–`O7` (violet).
3. **Projects** `/projektek` — `P1`–`P8` (slate-navy, the most serious).
4. **Clients** `/ugyfelek` — `C1`–`C5` (rose).
5. **Profile** `/profil` — `U1`–`U6` incl. `U4b` (stone).

## Decisions needed from the owner — ask once, before step 2
- Clients (rose `#B8456B`) and Profile (stone `#44413B`) colours are **proposals** by the designer. Ask whether to keep them. Until answered, implement them only through the tokens `--m-clients-*` / `--m-profile-*` so a change is one edit.
- Collective colours: the design uses a curated palette; the repo hashes the id (`collectiveColor`). Keep whatever was decided for the Dashboard, and stay consistent.

## Per-module rules
- Every function in `FUNCTION_MAP.md` for that module must exist. The design shows the visual treatment; the repo code is the source of truth for behaviour, APIs, validation and permissions. If a screen in the design lacks something the repo does, build it in the same style and tell me.
- Do not implement helper chips/buttons that only exist to demo states (anything labelled "Demó:", the client switcher chips on `C5`, plan switching). Real state comes from data.
- Design deviations (fix, do not copy): survey delete mock says "permanent" but the app soft-deletes; C2 shows create mode only — edit mode reuses it (title `Ügyfél szerkesztése`, CTA `Módosítás`); in `U2`/`U3` the profile form is one form with one `PATCH /api/auth/profile` even though the design splits it across two screens (phone and default VAT sit in the invoice form in the repo); shared clients (second tab of C1) are read-only.
- Clients stay personal (`owner_id`, GDPR); contributors never create/manage clients; only owner/admin change quote status or trigger client-facing actions. Hide or disable accordingly and keep the API check.
- Profile: currency is write-once; SA language toggle stays cookie-only (GM-7); subscription actions keep their Creem flows, `logAudit` calls and rate limits untouched; delete-account keeps the TÖRLÉS confirmation.
- Strings: add keys to `messages/hu.json`, `en.json`, `de.json` together; the design's Hungarian text is a starting point, reuse existing keys first (names listed in `FUNCTION_MAP.md`). Run `npx vitest run tests/i18n.test.js`.
- Tokens only (rule 7), `navPrefix` everywhere (demo pages re-export real pages), `useMobile`-vs-server selection as already implemented, only `Modal` / `BottomSheet` / `AlertModal` / `ConfirmModal` overlays, soft delete + `deleted_at` filters, subscription gate on creation, `formatMoney(amount, userCurrency)`, `res.ok` checks with `AlertModal`.
- No schema changes expected. If you find one is needed, stop and write the migration per rule 18.

## Out of scope (no designs yet — do not invent)
`/uzenetek`, `/naptar`, `/otletek`, `/katalogus`, `/kollektivak`, `/elofizetes`, `/weboldalam`, public `/clients/[id]`, `/portal`, collective-context dashboard sections. Leave them on the current UI.

## Verify per PR
`npm run lint`, `npx vitest run`, dev server at 390×844: walk every screen of the module in personal and collective context, as owner and as contributor, in HU/EN/DE, and in `/demo`. In the PR description list: screens done, functions checked against FUNCTION_MAP, deviations from the design, open questions.

---

# Desktop addendum (separate PRs, after the mobile module of the same name is done)

Desktop designs live in `design/desktop/` (read `README.md` first; screens in `design/desktop/screens/`, 1440×900). Same Pods language as mobile: workspace-pod sidebar, module-coloured rounded header, dark module body, white cards, pill buttons; sheets become centred `Modal`s (never a third overlay). Functions are the same as on mobile — use `design/mobile/FUNCTION_MAP.md`; the repo is the source of truth for behaviour.

Order: Dashboard (`DD1`), Survey (`DS1`, `DS2`, `DS3`), Offers (`DO1`, `DO2`), Projects (`DP1`, `DP2`), Clients (`DC1`), Profile (`DU1`, `DU2`).

**Detail-page pattern (survey is final; offer must follow it).** `/felmeres/[id]` = `DS2` + `DS3`: one working surface, no section column and no side action card. Sections are coloured pods; a click opens the pod in place; a pod strip switches sections (with "Összes" back). The items table is the main content (quick-add row with dictation, inline edit/duplicate/delete/reorder, search). Measurements, note and photos are a collapsed secondary bar. Actions are in the header: one primary button + a ⋯ modal (share, PDF, client, delete). Row actions are 40 px round filled icon buttons: edit dark blue `#1E3A8A`, duplicate grey `#5A5F68`, delete red `#C62828`, each with an `aria-label`. Pod colours are stable per section (stored or index-derived).

**Offer detail is NOT yet redrawn.** `DO2` still shows the old layout. When implementing `/ajanlatok/[id]`, apply the survey pattern: offer sections as pods, entries table primary, client/terms/totals/status in the header or a slim bar. Ask the owner before building it; a redraw is pending.

Rules unchanged: desktop and mobile stay separate trees (do not edit mobile files in desktop PRs), tokens only, `navPrefix`, i18n keys in hu/en/de, soft delete, double permission checks, ≥ 44 px targets, mock numbers in the designs are not reconciled across boards.
