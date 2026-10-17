# Kollektíva Meghívó — Teljes Folyamat

## Áttekintés

A kollektíva meghívó rendszer lehetővé teszi, hogy a tulajdonos e-mailben hívjon meg embereket a munkaterületébe — függetlenül attól, hogy a meghívott már regisztrált felhasználó-e, vagy sem.

---

## Szereplők

| Szereplő | Leírás |
|---|---|
| **Tulajdonos** | A kollektíva létrehozója, aki meghív |
| **Létező felhasználó** | Már van TecTon fiókja |
| **Új felhasználó** | Még nincs TecTon fiókja |

---

## 1. Meghívó küldése

**Oldal:** `/kollektivak`  
**API:** `POST /api/collectives/[id]/invite`

### Folyamat

1. A tulajdonos megadja a meghívott e-mail címét a meghívási modálban.
2. A szerver ellenőrzi:
   - Tagja-e már a kollektívának? → `409` hiba
   - Van-e már függőben lévő meghívó erre az e-mailre? → `409` hiba (egyedi index: `collective_invitations(collective_id, email) WHERE status = 'pending'`)
3. Létrejön egy `collective_invitations` sor:
   - `status = 'pending'`
   - `token = gen_random_uuid()` (titkos, e-mailben kerül elküldésre)
   - `user_id` feltöltve, ha a meghívott már létező felhasználó
4. E-mail elküldése.

### E-mail tartalma

| Eset | Tárgy | CTA gomb |
|---|---|---|
| Létező felhasználó | `[Tulajdonos] invited you to join [Kollektíva]` | **Bejelentkezés és csatlakozás** |
| Új felhasználó | `[Tulajdonos] invited you to join [Kollektíva]` | **Fiók létrehozása és csatlakozás** |

Az e-mail két gombot tartalmaz:
- **Zöld — Elfogadás:** `https://app.tecteon.com/invitations/[token]`
- **Piros — Visszautasítás:** `https://app.tecteon.com/invitations/[token]?decline=1`

---

## 2. A meghívó oldal (`/invitations/[token]`)

Nyilvános oldal, sidebar nélkül. Az oldal betöltésekor párhuzamosan lekéri a meghívó adatait és az aktuális munkamenetet.

### Állapotok

```
loading
  ↓ (API hívás)
  ├── retracted     → "Ez a meghívó már nem érvényes"
  ├── accepted      → "Sikeresen csatlakoztál!"
  ├── declined      → "Meghívó visszautasítva"
  ├── ?decline=1    → azonnal decline API hívás → done_decline (form soha nem jelenik meg)
  ├── accept_direct → már be van jelentkezve a helyes e-maillel → Elfogad gomb
  ├── login         → létező felhasználó, nincs bejelentkezve → jelszó form
  └── register      → új felhasználó → regisztrációs form
```

### Esetenként

#### Esetem 1: Visszautasítás (e-mail linkről)
- URL: `/invitations/[token]?decline=1`
- Az oldal betöltésekor, még a form megjelenítése előtt, azonnal meghívja a decline API-t
- Eredmény: visszautasítás képernyő, a tulajdonos értesítő e-mailt kap

#### Eset 2: Már bejelentkezett felhasználó (helyes e-mail)
- Megjelenik az "Elfogadás" gomb közvetlenül
- Kattintás → `POST /api/invitations/[token]/accept`

#### Eset 3: Létező felhasználó, nincs bejelentkezve
- Megjelenik: e-mail (zárolt) + jelszó mező
- Bejelentkezés → `POST /api/invitations/[token]/accept`

#### Eset 4: Új felhasználó
- Megjelenik: e-mail (zárolt) + teljes név + jelszó + jelszó megerősítése
- Regisztráció → `POST /api/invitations/[token]/register` (admin API, azonnali e-mail megerősítés nélkül)
- Bejelentkezés → `POST /api/invitations/[token]/accept`

---

## 3. Elfogadás

**API:** `POST /api/invitations/[token]/accept`  
**Auth:** kötelező (JWT session)

### Lépések

1. Token alapján meghívó lekérése
2. Állapot ellenőrzése: `retracted` → `410`, nem `pending` → `409`
3. Bejelentkezett felhasználó e-mailjének egyeztetése a meghívóéval
4. `collective_members` sor létrehozása: `role = 'contributor'`, `status = 'active'`
5. Meghívó státusza: `accepted`, `responded_at` kitöltve
6. **E-mail a tulajdonosnak:** *"[Meghívott] elfogadta a meghívót és csatlakozott a [Kollektíva] kollektívához."*
7. Workspace-switcher tooltip reset (localStorage/sessionStorage) → az új tag rögtön látja a workspace-váltó tippet

---

## 4. Visszautasítás

**API:** `POST /api/invitations/[token]/decline`  
**Auth:** nem szükséges — a token maga az azonosítás

### Lépések

1. Token alapján meghívó lekérése
2. Meghívó státusza: `declined`, `responded_at` kitöltve
3. **E-mail a tulajdonosnak:** *"[Meghívott] visszautasította a meghívót a [Kollektíva] kollektívához."*

---

## 5. Meghívó visszavonása (Retract)

**API:** `DELETE /api/collectives/invitations/[id]`  
**Auth:** csak tulajdonos/admin

- Státusz: `pending` → `retracted`
- Ha a meghívott ezután próbálja megnyitni a linket: *"Ez a meghívó már nem érvényes"*
- A regisztrációs API és az elfogadási API is ellenőrzi a `retracted` státuszt

---

## 6. Újraküldés / Újra meghívás

| Eset | Gomb | API |
|---|---|---|
| Függőben lévő meghívó | **Újraküldés** | `POST /api/collectives/[id]/invite` (új meghívó sor) |
| Visszautasított meghívó | **Újra meghívás** | `POST /api/collectives/[id]/invite` (új meghívó sor) |

Az egyedi `pending` index csak egyidejű duplikációt akadályoz meg — visszautasított meghívó után új `pending` sor hozható létre.

---

## 7. Tag eltávolítása / Tiltása (elfogadás után)

**API:** `PATCH /api/collectives/[id]/members/[memberId]` — tiltás/feloldás  
**API:** `DELETE /api/collectives/[id]/members/[memberId]` — eltávolítás

| Művelet | Hatás | E-mail a tagnak |
|---|---|---|
| **Tiltás** | `status = 'blocked'`, `active_collective_id` törlése | *"[Tulajdonos] letiltotta a hozzáférésedet a [Kollektíva] kollektívához."* |
| **Tiltás feloldása** | `status = 'active'` | — |
| **Eltávolítás** | Sor törlése | *"[Tulajdonos] eltávolított téged a [Kollektíva] kollektívából."* |
| **Kilépés (saját)** | Sor törlése | E-mail a **tulajdonosnak**: *"[Tag] elhagyta a kollektívát."* |

---

## 8. Fiók törlése

**API:** `DELETE /api/auth/account`  
**Hol:** `/profil` oldal → Veszélyes zóna → "TÖRLÉS" megerősítés

1. Megkeresi az összes kollektívát, amelynek tagja
2. Minden kollektíva tulajdonosának e-mailt küld: *"[Tag] törölte fiókját és elhagyta a [Kollektíva] kollektívát."*
3. Profil soft-delete (`deleted_at`)
4. Auth user ban (876 000 óra)

---

## Adatbázis táblák

### `collective_invitations`
```sql
id            UUID PK  DEFAULT gen_random_uuid()
collective_id UUID FK  → collectives(id)
invited_by    UUID FK  → profiles(id)
email         TEXT
token         UUID     UNIQUE  DEFAULT gen_random_uuid()
status        TEXT     CHECK ('pending','accepted','declined','retracted')
user_id       UUID FK  → profiles(id)  NULLABLE
created_at    TIMESTAMPTZ
responded_at  TIMESTAMPTZ
```

**Egyedi index:** `(collective_id, email) WHERE status = 'pending'`

### `collective_members`
```sql
collective_id UUID FK  → collectives(id)
user_id       UUID FK  → profiles(id)
role          TEXT     CHECK ('owner','admin','contributor')
status        TEXT     CHECK ('invited','active','blocked')
created_at    TIMESTAMPTZ
PRIMARY KEY (collective_id, user_id)
```

---

## E-mail sablonok (`src/lib/emailTemplates.js`)

| Sablon ID | Küldő | Fogadó | Esemény |
|---|---|---|---|
| `collective_invitation` | Rendszer | Meghívott | Meghívó küldésekor |
| `invitation_accepted` | Rendszer | Tulajdonos | Elfogadáskor |
| `invitation_declined` | Rendszer | Tulajdonos | Visszautasításkor |
| `member_left` | Rendszer | Tulajdonos | Tag önkéntes kilépésekor |
| `member_removed` | Rendszer | Tag | Tulajdonos eltávolítja |
| `member_blocked` | Rendszer | Tag | Tulajdonos tiltja |
| `member_account_deleted` | Rendszer | Tulajdonos | Tag törli fiókját |

---

## Migrációk

| Fájl | Tartalom |
|---|---|
| `062_collective_subscription_tiers.sql` | `subscription_type`, `seat_count` a `collectives` táblában |
| `063_collectives_id_default.sql` | `gen_random_uuid()` default a `collectives.id`-hoz |
| `064_collective_invitations.sql` | `collective_invitations` tábla + indexek |
| `065_invitation_retracted_status.sql` | `retracted` status hozzáadása |
| `066_collective_member_blocked.sql` | `blocked` status hozzáadása a `collective_members`-hez |
