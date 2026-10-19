'use client';

import React from 'react';
import LandingHeader from '@/components/LandingHeader';
import CookieBanner from '@/components/CookieBanner';

const PHOTO_URL = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/platform/about-me.webp`;

export default function AboutPage() {
  return (
    <div style={{
      position: 'fixed', inset: 0, overflowY: 'auto',
      background: '#f8fafc', zIndex: 9999,
      fontFamily: "'Inter', 'Plus Jakarta Sans', system-ui, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>

      <LandingHeader activePage="about" />

      {/* ── Hero band ── */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)', color: '#fff', padding: '4rem 1.25rem 5rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '1.25rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.75rem', borderRadius: 999, background: 'rgba(37,99,235,0.35)', border: '1px solid rgba(37,99,235,0.5)', color: '#93c5fd', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Rólunk
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0, maxWidth: 640 }}>
            A Balaton partján sétálva jött az ötlet.
          </h1>
          <p style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.65)', maxWidth: 520, lineHeight: 1.7, margin: 0 }}>
            Niko Mpakaris – fejlesztő, vállalkozó és az Epitek alapítója.
          </p>
        </div>
      </div>

      {/* ── Photo + intro card ── */}
      <div style={{ maxWidth: 900, margin: '-3.5rem auto 0', padding: '0 1.25rem', position: 'relative', zIndex: 2 }}>
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(15,23,42,0.12)', overflow: 'hidden', display: 'flex', flexDirection: 'row', flexWrap: 'wrap' }}>

          {/* Photo */}
          <div style={{ width: 260, flexShrink: 0, minHeight: 320, background: '#e2e8f0', position: 'relative' }}>
            <img
              src={PHOTO_URL}
              alt="Niko Mpakaris"
              style={{ width: '100%', height: '100%', minHeight: 320, objectFit: 'cover', display: 'block' }}
            />
          </div>

          {/* Quote */}
          <div style={{ flex: 1, minWidth: 280, padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem', color: '#2563eb', lineHeight: 1, fontFamily: 'Georgia, serif' }}>"</div>
            <p style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.65, margin: 0 }}>
              Gábor egy este azt írta: „Niko, megint eltűnt egy számla a WhatsApp-csoportban."
              Másnap elkezdtem kódolni. Egy héttel később ő már tesztelte.
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>Niko Mpakaris</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Alapító, Epitek</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Story ── */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '4rem 1.25rem 1.5rem', fontSize: '0.95rem', color: '#1e293b', lineHeight: 1.85 }}>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: '0 0 1rem' }}>
          Hogy kezdődött
        </h2>
        <p>
          2026 elején keresett meg egy régi barátom, Gábor. Csövező, önálló vállalkozó — ha Budapesten problémás a vezeték, Gábor az, akit hívnak. Azt mondta: van egy kisebb csapata, akikkel közösen dolgoznak projekteken, és az egész kommunikáció — számlák, fotók, anyaglisták — szét van szórva Viber-csoportokban, WhatsApp-üzenetekben és Facebook-megjegyzésekben.
        </p>
        <p>
          „Minden héten eltűnik valami. Megkérdezem Pistát, hogy megvette-e a csöveket, ő meg azt mondja, hogy ő azt hitte, én veszem. Aztán kettőt veszünk." Ismerős?
        </p>
        <p>
          Leültem és elkezdtem valami egyszerűt összerakni. Két nap alatt volt egy projekt-nézet. Négy nap alatt számlafeltöltés képpel. Egy hét múlva Gábor már élesben próbálta. Második héten megkérdezte: „Be lehetne küldeni az ajánlatot az ügyfélnek e-mailben, PDF-ként?" — egy héttel később ez is megvolt.
        </p>
        <p>
          <em>„Ez pontosan az, amit kerestem"</em> — ezzel a mondattal lett az Epitek.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: '2.5rem 0 1rem' }}>
          Miért csináltuk
        </h2>
        <p>
          Nem azért, hogy meggazdagodjunk. Magyarország-szerte ezrek dolgoznak úgy, mint Gábor: reggeltől estig kézzel, terepen, tele elkötelezettséggel a munkájukkal — de az adminisztráció, az árajánlatok, az ügyfelekkel való kommunikáció minden napjukból elvisz néhány felesleges, idegesítő órát.
        </p>
        <p>
          Az elveszett számlafotók, a „melyik Viber-csoportban volt az az összeg?", a kézzel írt nyomtatott árajánlatok, a telefonon diktált munkadíjak — ezek nem szakmai problémák, hanem szerszámhiány. Rossz szerszámmal lassabb és drágább minden.
        </p>
        <p>
          Az Epitek az a hiányzó szerszám.
        </p>

        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: '2.5rem 0 1rem' }}>
          Mire büszkék vagyunk
        </h2>

        {[
          ['Egy hely, minden adat', 'Vége az elveszett számlaképeknek és a WhatsApp-csoportokban eltemetett fotóknak. Projektek, számlák, naplóbejegyzések, mérések, árajánlatok — minden egy helyen, kereshető, rendezett.'],
          ['Profi megjelenés minden vállalkozónak', 'Egy csövező vagy kőműves ugyanolyan profi ajánlatot küldhet az ügyfélnek — PDF-ben, e-mailben —, mint egy nagy kivitelező cég. Az ügyfél egy linken keresztül látja a projekt állapotát, a fotókat, a naplót. Kérdés nélkül.'],
          ['Csapatmunka, felesleges súrlódás nélkül', 'Ha egy csapat közösen dolgozik, mindenki ugyanazokat az adatokat látja — ki, mit, mennyiért végzett. Nincs félreértés, nincs kétszeres anyagvásárlás, nincs elveszett elszámolás.'],
          ['Ingyenes induláshoz', 'Egy kisvállalkozónak nem kell havi tízezer forintot fizetnie azért, hogy profin nézzen ki az ügyfelei előtt. Az alap csomag ingyenes. Prémiumra váltani csak akkor érdemes, ha a munka megkívánja.'],
        ].map(([title, body]) => (
          <div key={title} style={{ display: 'flex', gap: '1rem', margin: '1.25rem 0', padding: '1.1rem 1.25rem', background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 6, borderRadius: 3, background: '#2563eb', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '0.3rem' }}>{title}</div>
              <div style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.7 }}>{body}</div>
            </div>
          </div>
        ))}

        <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.03em', margin: '2.5rem 0 1rem' }}>
          Hova tartunk
        </h2>
        <p>
          Gábor ma is aktív felhasználó. Időnként ír, hogy kellene ez vagy az — legtöbbször benne is van a következő frissítésben. Ez az együttműködés az Epitek legjobb minőségbiztosítása.
        </p>
        <p>
          A cél nem változott: segíteni azoknak, akik kézzel dolgoznak, hogy a fejük tele legyen a szakmájukkal — az adminisztráció meg menjen szinte magától.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          Ha kérdésed van, vagy elmondanád, mire lenne szükséged, írj: <a href="mailto:hello@epitek.hu" style={{ color: '#2563eb', fontWeight: 700 }}>hello@epitek.hu</a>
        </p>

      </div>

      <CookieBanner />

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#fff', padding: '1.25rem 1.5rem', marginTop: '3rem' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>© {new Date().getFullYear()} MPPM Consulting Kft. – Epitek</span>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <a href="/impressum"   target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}>Impresszum</a>
            <a href="/adatkezeles" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}>Adatkezelés</a>
            <a href="/aszf"        target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#64748b', textDecoration: 'none' }}>ÁSZF</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
