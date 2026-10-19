import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Impresszum – Epitek' };

const S = {
  h2: { fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '2rem 0 0.6rem', letterSpacing: '-0.01em' },
  table: { width: '100%', borderCollapse: 'collapse', marginBottom: '0.5rem' },
  td:  { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top' },
  tdL: { padding: '0.5rem 0.75rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'top', color: '#64748b', fontWeight: 600, width: '38%', whiteSpace: 'nowrap' },
  box: { background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1rem 1.25rem', margin: '1.25rem 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.7 },
};

export default function ImpressumPage() {
  return (
    <LegalLayout title="Impresszum" lastUpdated="2026. október 19.">

      <div style={S.box}>
        Az Epitek egy felhőalapú projektmenedzsment és ajánlatkezelő platform, amelyet az MPPM Consulting Kft. fejleszt és üzemeltet magyarországi kivitelezők, iparosok és vállalkozók számára.
      </div>

      {/* ── Üzemeltető ── */}
      <h2 style={S.h2}>1. Üzemeltető / Adatkezelő</h2>
      <table style={S.table}>
        <tbody>
          {[
            ['Cégnév',          'MPPM Consulting Kft.'],
            ['Székhely',        '1082 Budapest, Kisfaludy utca 28/b'],
            ['Adószám',         'HU26289892'],
            ['E-mail',          'hello@epitek.hu'],
            ['Weboldal',        'epitek.hu'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={S.tdL}>{k}</td>
              <td style={S.td}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Tárhelyszolgáltató ── */}
      <h2 style={S.h2}>2. Tárhelyszolgáltató</h2>
      <table style={S.table}>
        <tbody>
          {[
            ['Cégnév',   'Vercel Inc.'],
            ['Cím',      '340 Pine Street, Suite 701, San Francisco, CA 94104, USA'],
            ['Weboldal', 'vercel.com'],
            ['Megjegyzés', 'Az adatok az Európai Unión belüli adatközpontokban tárolódnak. Az adattovábbítás az EU–US Standard Szerződéses Záradékok alapján történik.'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={S.tdL}>{k}</td>
              <td style={S.td}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Adatbázis ── */}
      <h2 style={S.h2}>3. Adatbázis- és hitelesítésszolgáltató</h2>
      <table style={S.table}>
        <tbody>
          {[
            ['Cégnév',   'Supabase Inc.'],
            ['Cím',      '970 Toa Payoh North, #07-04, Singapore 318992'],
            ['Weboldal', 'supabase.com'],
            ['Megjegyzés', 'Az adatbázis az EU frankfurti régiójában üzemel (eu-central-1). GDPR-megfelelő adatfeldolgozási megállapodás (DPA) érvényes.'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={S.tdL}>{k}</td>
              <td style={S.td}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Fájltárhely ── */}
      <h2 style={S.h2}>4. Fájltároló szolgáltató</h2>
      <table style={S.table}>
        <tbody>
          {[
            ['Cégnév',   'Cloudflare, Inc.'],
            ['Cím',      '101 Townsend St., San Francisco, CA 94107, USA'],
            ['Weboldal', 'cloudflare.com'],
            ['Megjegyzés', 'A felhasználók által feltöltött képek és videók Cloudflare R2 tárhelyen kerülnek tárolásra, európai régióban.'],
          ].map(([k, v]) => (
            <tr key={k}>
              <td style={S.tdL}>{k}</td>
              <td style={S.td}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Szerzői jog ── */}
      <h2 style={S.h2}>5. Szerzői jog</h2>
      <p>Az Epitek platform teljes tartalma — a forráskód, a grafikai elemek, a szövegek és a márkanév — az MPPM Consulting Kft. szellemi tulajdonát képezik. Engedély nélküli másolásuk, terjesztésük vagy felhasználásuk tilos.</p>

      {/* ── Képek ── */}
      <h2 style={S.h2}>6. Képek és illusztrációk</h2>
      <p>A platformon és a marketing anyagokban szereplő egyes képek az <a href="https://unsplash.com" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', fontWeight: 700 }}>Unsplash</a> képadatbázisából származnak, és az <a href="https://unsplash.com/license" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Unsplash License</a> feltételei szerint kerülnek felhasználásra. Az Unsplash License ingyenes, kereskedelmi célú felhasználást is engedélyez, forrásmegjelölés nélkül — a képek szerzőire azonban itt szeretnénk köszönetet mondani.</p>

      {/* ── Kapcsolat ── */}
      <h2 style={S.h2}>7. Kapcsolat</h2>
      <p>Kérdésekkel, észrevételekkel az alábbi e-mail-címen kereshet minket: <a href="mailto:hello@epitek.hu" style={{ color: '#2563eb', fontWeight: 700 }}>hello@epitek.hu</a></p>

    </LegalLayout>
  );
}
