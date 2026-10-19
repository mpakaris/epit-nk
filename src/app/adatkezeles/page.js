import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Adatkezelési Tájékoztató – Epitek' };

const S = {
  h2:  { fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '2.25rem 0 0.6rem', letterSpacing: '-0.01em' },
  h3:  { fontSize: '0.9rem',  fontWeight: 700, color: '#334155', margin: '1.25rem 0 0.35rem' },
  p:   { margin: '0 0 0.85rem' },
  ul:  { paddingLeft: '1.25rem', margin: '0.4rem 0 0.85rem' },
  li:  { marginBottom: '0.35rem' },
  box: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '0.9rem 1.1rem', margin: '1rem 0', fontSize: '0.85rem', color: '#1e3a5f', lineHeight: 1.7 },
  warn:{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '0.9rem 1.1rem', margin: '1rem 0', fontSize: '0.85rem', color: '#78350f', lineHeight: 1.7 },
  table: { width: '100%', borderCollapse: 'collapse', margin: '0.5rem 0 1rem', fontSize: '0.85rem' },
  th: { background: '#f1f5f9', padding: '0.5rem 0.75rem', textAlign: 'left', fontWeight: 700, color: '#475569', borderBottom: '1px solid #e2e8f0' },
  td: { padding: '0.55rem 0.75rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', color: '#334155' },
};

export default function AdatkezelesPage() {
  return (
    <LegalLayout title="Adatkezelési Tájékoztató" lastUpdated="2026. október 19.">

      <div style={S.box}>
        Ez a tájékoztató az MPPM Consulting Kft. által üzemeltetett Epitek platform adatkezelési gyakorlatát ismerteti az Általános Adatvédelmi Rendelet (EU) 2016/679 (GDPR) előírásainak megfelelően.
      </div>

      {/* 1 */}
      <h2 style={S.h2}>1. Az adatkezelő adatai</h2>
      <p style={S.p}><strong>Neve:</strong> MPPM Consulting Kft.<br />
      <strong>Székhely:</strong> 1082 Budapest, Kisfaludy utca 28/b<br />
      <strong>Adószám:</strong> HU26289892<br />
      <strong>Adatvédelmi kapcsolattartó:</strong> <a href="mailto:hello@epitek.hu" style={{ color: '#2563eb' }}>hello@epitek.hu</a></p>

      {/* 2 */}
      <h2 style={S.h2}>2. A kezelt személyes adatok köre</h2>

      <h3 style={S.h3}>2.1 Regisztrációs adatok</h3>
      <ul style={S.ul}>
        <li style={S.li}>Teljes név (megjelenítési név)</li>
        <li style={S.li}>E-mail-cím</li>
        <li style={S.li}>Jelszó (titkosítva, egyirányú hash formátumban tárolva)</li>
        <li style={S.li}>Regisztráció időpontja és az ÁSZF elfogadásának időbélyege</li>
      </ul>

      <h3 style={S.h3}>2.2 A felhasználó által bevitt üzleti adatok</h3>
      <p style={S.p}>A platform rendeltetésszerű használatakor a felhasználó üzleti adatokat tölt fel, amelyek személyes adatokat is tartalmazhatnak:</p>
      <ul style={S.ul}>
        <li style={S.li}>Ügyféladatok (név, cím, e-mail, telefonszám)</li>
        <li style={S.li}>Projektadatok (helyszín, leírás, pénzügyi összegek)</li>
        <li style={S.li}>Naplóbejegyzések és helyszíni fotók/videók</li>
        <li style={S.li}>Számlafotók és azok szövegkivonata (OCR)</li>
        <li style={S.li}>Árajánlatok tételei és kalkulációi</li>
      </ul>
      <div style={S.warn}>
        <strong>Fontos — adatkezelői felelősség megosztása:</strong> Ezeket az adatokat a Felhasználó (vállalkozó) maga tölti fel. Az MPPM Consulting Kft. kizárólag <strong>adatfeldolgozóként</strong> jár el; az ügyféladatok tekintetében <strong>adatkezelőnek a Felhasználó minősül</strong>, és ő felelős azért, hogy jogszerű alapon (pl. az ügyfél beleegyezése vagy szerződéses jogos érdek alapján) rögzíti ezeket az adatokat.<br /><br />
        Az Epitek az ügyfél adatainak felvitelekor egy jelölőnégyzettel kéri a Felhasználó kifejezett nyilatkozatát arról, hogy az érintett ügyfél tájékoztatása és – ahol szükséges – hozzájárulása rendelkezésre áll. Az MPPM Consulting Kft. e nyilatkozat valóságtartalmát nem vizsgálja és annak igazolását nem kéri; a felelősség teljes egészében a Felhasználót terheli.
      </div>

      <h3 style={S.h3}>2.3 Adatmegosztás kollektív munkaterületen</h3>
      <p style={S.p}>Amennyiben a Felhasználó Kollektív csomagot használ, egyes ügyféladatok — kiemelten az <strong>ügyfél neve és e-mail-címe</strong> — megosztásra kerülhetnek a kollektíva többi tagjával, ha ez az ügyfél számára végzett feladatok (pl. árajánlat készítése és kiküldése) elvégzéséhez szükséges. Ez az adatmegosztás:</p>
      <ul style={S.ul}>
        <li style={S.li}>a szükséges minimumra korlátozódik (csak a feladat elvégzéséhez elengedhetetlen adatok kerülnek megosztásra);</li>
        <li style={S.li}>kizárólag a kollektíva tagjain belül történik, harmadik féllel nem kerül megosztásra;</li>
        <li style={S.li}>a kollektíva tulajdonosának felelőssége, hogy ügyfeleit erről előzetesen tájékoztassa.</li>
      </ul>
      <p style={S.p}>A kollektíva tulajdonosa az összes, a kollektív munkaterületen kezelt adat vonatkozásában adatkezelőként felel — beleértve a tagok által bevitt ügyféladatokat is.</p>

      <h3 style={S.h3}>2.3 Technikai adatok</h3>
      <ul style={S.ul}>
        <li style={S.li}>Naplófájlok (IP-cím, böngésző, időbélyeg) – automatikusan, a Vercel infrastrukturális szintjén</li>
        <li style={S.li}>Munkamenet-azonosítók (session token, süti) az azonosításhoz</li>
      </ul>

      {/* 3 */}
      <h2 style={S.h2}>3. Az adatkezelés jogalapja és célja</h2>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Adatkategória</th>
            <th style={S.th}>Jogalap (GDPR 6. cikk)</th>
            <th style={S.th}>Cél</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Regisztrációs adatok', '(b) Szerződés teljesítése', 'Fiók létrehozása és hozzáférés biztosítása'],
            ['Üzleti adatok', '(b) Szerződés teljesítése', 'A platform funkciók nyújtása'],
            ['Számlafotók (OCR)', '(a) Hozzájárulás', 'Automatikus szövegkivonat – a felhasználó döntése alapján'],
            ['Technikai naplók', '(f) Jogos érdek', 'Biztonsági monitoring, hibakeresés'],
            ['GDPR hozzájárulás időbélyeg', '(c) Jogi kötelezettség', 'Megfelelőség igazolása'],
          ].map(([a, b, c]) => (
            <tr key={a}>
              <td style={S.td}>{a}</td>
              <td style={S.td}>{b}</td>
              <td style={S.td}>{c}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 4 */}
      <h2 style={S.h2}>4. Adatfeldolgozók</h2>
      <p style={S.p}>Az Epitek az alábbi harmadik feles szolgáltatókat veszi igénybe. Minden esetben írásbeli adatfeldolgozói megállapodás (DPA) áll fenn.</p>

      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Szolgáltató</th>
            <th style={S.th}>Szerepkör</th>
            <th style={S.th}>Adattárolás helye</th>
            <th style={S.th}>GDPR alap</th>
          </tr>
        </thead>
        <tbody>
          {[
            ['Vercel Inc.', 'Webalkalmazás-hosting, CDN', 'EU (Frankfurt)', 'Standard Szerz. Záradék (SCC)'],
            ['Supabase Inc.', 'Adatbázis, autentikáció', 'EU (Frankfurt, eu-central-1)', 'DPA + SCC'],
            ['Cloudflare, Inc.', 'Fájltárhely (R2)', 'EU régió', 'DPA + SCC'],
            ['Google Cloud (opcionális)', 'OCR – számlafelismerés', 'USA', 'SCC – csak felhasználói aktiválás esetén'],
          ].map(([a, b, c, d]) => (
            <tr key={a}>
              <td style={S.td}><strong>{a}</strong></td>
              <td style={S.td}>{b}</td>
              <td style={S.td}>{c}</td>
              <td style={S.td}>{d}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={S.box}>
        Az EU-n kívüli adatfeldolgozókkal (Vercel, Google Cloud) csak Standard Szerződéses Záradékok (SCC) alapján kerül sor adattovábbításra, amely az EDPB iránymutatásainak megfelelő kiegészítő intézkedéseket tartalmaz.
      </div>

      {/* 5 */}
      <h2 style={S.h2}>5. Adatmegőrzési idők</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>Fiókadatok:</strong> a fiók törléséig, majd 30 napig (visszavonható törlés)</li>
        <li style={S.li}><strong>Feltöltött fájlok:</strong> a felhasználó által való törlésig, illetve a fiók megszűnéséig</li>
        <li style={S.li}><strong>Audit naplók:</strong> 12 hónap</li>
        <li style={S.li}><strong>Pénzügyi adatok (számlák):</strong> 8 év (a számvitelről szóló 2000. évi C. törvény alapján)</li>
        <li style={S.li}><strong>Technikai naplók:</strong> max. 30 nap (Vercel infrastruktúra szintjén)</li>
      </ul>

      {/* 6 */}
      <h2 style={S.h2}>6. Az érintett jogai</h2>
      <p style={S.p}>A GDPR 15–22. cikkei alapján az alábbi jogokat gyakorolhatja:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Hozzáférési jog (15. cikk):</strong> tájékoztatást kérhet a kezelt adatairól</li>
        <li style={S.li}><strong>Helyesbítési jog (16. cikk):</strong> pontatlan adatok kijavítását kérheti</li>
        <li style={S.li}><strong>Törlési jog (17. cikk):</strong> kérheti adatai törlését („elfeledtetési jog")</li>
        <li style={S.li}><strong>Az adatkezelés korlátozásához való jog (18. cikk)</strong></li>
        <li style={S.li}><strong>Adathordozhatóság (20. cikk):</strong> adatait géppel olvasható formátumban kiadhatjuk</li>
        <li style={S.li}><strong>Tiltakozás joga (21. cikk):</strong> jogos érdeken alapuló adatkezelés ellen tiltakozhat</li>
        <li style={S.li}><strong>Hozzájárulás visszavonása (7. cikk):</strong> a hozzájáruláson alapuló adatkezelést bármikor visszavonhatja</li>
      </ul>
      <p style={S.p}>Kérelmét az <a href="mailto:hello@epitek.hu" style={{ color: '#2563eb' }}>hello@epitek.hu</a> e-mail-címre küldje. A kérelemre 30 napon belül válaszolunk.</p>

      {/* 7 */}
      <h2 style={S.h2}>7. Panasz benyújtása</h2>
      <p style={S.p}>Ha úgy véli, hogy adatkezelésünk sérti a GDPR-t, panaszt tehet a felügyeleti hatóságnál:</p>
      <p style={S.p}>
        <strong>Nemzeti Adatvédelmi és Információszabadság Hatóság (NAIH)</strong><br />
        1055 Budapest, Falk Miksa utca 9–11.<br />
        <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>naih.hu</a> · ugyfelszolgalat@naih.hu
      </p>

    </LegalLayout>
  );
}
