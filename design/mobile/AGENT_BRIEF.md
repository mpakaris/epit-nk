# Agent brief — implement the mobile Pods UI (Dashboard + Survey)

Read `/CLAUDE.md` first; its rules win over this brief wherever they conflict, except where this brief says "decision required".
`AGENTS.md` warns this Next.js differs from training data: read `node_modules/next/dist/docs/` before touching routing.

## 0. Goal
Replace the **visual layer** of Dashboard and Survey on phones. Keep every existing function (see FUNCTION_MAP.md). Do not change APIs, data scoping, permissions, or audit logging unless a function-map row says so.

## 1. Mobile and desktop are separate trees (decision required)
The owner wants mobile and desktop completely separated. Today they are mixed via `useMobile()` branches and `.show-mobile/.hide-mobile` CSS inside shared pages.
Recommended approach (avoids URL rewrites, which break production RSC per CLAUDE.md):
- Same URLs. Do **not** add rewrites in `proxy.js`.
- Server-side decision in `src/app/[locale]/layout.jsx` (and each page's `page.js`): read `sec-ch-ua-mobile` / `user-agent` via `headers()`, with a `viewport=mobile|desktop` cookie override, and render either `components/mobile/...` shell + screen or the existing desktop one.
- New code lives in `src/components/mobile/pods/` (shell, dock, pod, header, sheets) and `src/app/[locale]/<route>/mobile/` screen components. Desktop files are not edited except to be wrapped by the selector.
- Only shared: `src/lib/*`, `AppContext`, API routes, `messages/*.json`.
- The 768 px boundary stays. CLAUDE.md rule 1 says use `useMobile()`; this change deliberately replaces JS branching with server selection for these routes. If unsure, stop and ask the owner before merging.
- Add a short note to CLAUDE.md describing the split once agreed.

## 2. Colour system
Two independent colour channels. Never mix them.
1. **Workspace identity** (Személyes / each collective): pod strip, dock "+" button, workspace chip. Tokens `--m-ws-*`. Today `collectiveColor(id)` hashes the id to a dark hsl; the design uses a small curated palette (cobalt, orange, …). Decision required: persist a palette key per collective, or map by hash to the palette.
2. **Document type**: Survey = teal, Offer = violet, Project = slate-navy (the most serious, near-black). The document screen header, deep body, primary accents and keypad use the type colour. Tokens `--m-survey*`, `--m-offer*`, `--m-project*` in `tokens.css`. Only Survey is designed in this drop.
Always via CSS variables (rule 7). Replace the hardcoded hexes in the design files with tokens.

## 3. Build order
1. Tokens + mobile shell: `.m-root`, floating dock (raised "+"), bottom sheet (reuse `components/mobile/BottomSheet.jsx`; restyle only if needed, never add a third overlay type — rule 2), rounded header `0 0 32px 32px` on every screen.
2. Dashboard (`A-Pods`) incl. the extra functions listed in §Dashboard.
3. Survey list → new survey → detail → room editor → items → floor-plan.
Ship each as its own PR, mobile only, desktop untouched.

## 4. Dashboard (functions that must exist; see FUNCTION_MAP)
Pod stack (personal + collectives) with counts, calendar/upcoming, quick actions via dock "+", pending invitations banner, pending transfer-requests banner, stats (total cost, active projects, invoices), latest activity, latest projects/surveys/quotes. Banner rows follow rule 11 (icon+text on line 1, action on line 2 on mobile).

## 5. Hard rules checklist
- No hardcoded strings: every label in `messages/hu|en|de.json` (all three at once); run `npx vitest run tests/i18n.test.js`.
- Touch targets ≥ 48 px (buttons 56–60 px), bottom bars use `env(safe-area-inset-bottom)`.
- `navPrefix` on every link/push (demo mode). Demo pages re-export real pages, so the mobile selector must work under `/demo`.
- Soft delete, `deleted_at` filters, double permission check, subscription gate on creation, `formatMoney(amount, userCurrency)`.
- Contributors cannot create documents in collectives or change status (permission table in CLAUDE.md); hide or disable accordingly, API stays authoritative.
- New fetches check `res.ok` and surface errors via `AlertModal`.
- Superadmin/god-mode behaviour unchanged.
- Any schema change needs a numbered migration (rule 18). None is expected for this scope.

## 6. Superseded
`okos-mobile-ui-brief.md` (slate/blue/green tokens, 5-item floating nav) and the visual parts of `components/mobile/FloatingNav.jsx`, `WorkspacePicker.jsx`, `WorkspaceSectionHeader.jsx` are superseded for the routes in this scope. Keep their logic; restyle or replace.

## 7. Verify
`npm run lint`, `npx vitest run`, then run the dev server at a 390×844 viewport: pods switch, create a survey in personal and in a collective, edit a room with the keypad, add an item via dictation, run floor-plan analysis, transfer and delete a survey. Also check one desktop viewport is unchanged.
