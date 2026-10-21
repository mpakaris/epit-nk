import LegalLayout from '@/components/LegalLayout';

export const metadata = { title: 'Általános Szerződési Feltételek – OkosSzaki' };

const S = {
  h2: { fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: '2.25rem 0 0.6rem', letterSpacing: '-0.01em' },
  p:  { margin: '0 0 0.85rem' },
  ul: { paddingLeft: '1.25rem', margin: '0.4rem 0 0.85rem' },
  li: { marginBottom: '0.35rem' },
  box:{ background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 10, padding: '0.9rem 1.1rem', margin: '1rem 0', fontSize: '0.85rem', color: '#475569', lineHeight: 1.7 },
};

export default function AszfPage() {
  return (
    <LegalLayout title="Általános Szerződési Feltételek" lastUpdated="2026. október 19.">

      <div style={S.box}>
        Kérjük, olvassa el figyelmesen az alábbi Általános Szerződési Feltételeket (ÁSZF). Az OkosSzaki platformra való regisztrációval a felhasználó elfogadja az ÁSZF rendelkezéseit.
      </div>

      {/* 1 */}
      <h2 style={S.h2}>1. A szerződő felek és a szolgáltatás tárgya</h2>
      <p style={S.p}><strong>Szolgáltató:</strong> MPPM Consulting Kft. (1082 Budapest, Kisfaludy utca 28/b · Adószám: HU26289892) – a továbbiakban „OkosSzaki" vagy „Szolgáltató".</p>
      <p style={S.p}><strong>Felhasználó:</strong> minden természetes vagy jogi személy, aki az OkosSzaki platformon regisztrál – a továbbiakban „Felhasználó".</p>
      <p style={S.p}>Az OkosSzaki egy felhőalapú SaaS-platform, amely kivitelezők, iparosok és kisvállalkozók számára projektmenedzsment, árajánlat-kezelés, felmérési és naplózási funkciókat, valamint ügyfélportált biztosít.</p>

      {/* 2 */}
      <h2 style={S.h2}>2. Regisztráció és fiókkezelés</h2>
      <ul style={S.ul}>
        <li style={S.li}>Regisztráció érvényes e-mail-cím és jelszó megadásával lehetséges.</li>
        <li style={S.li}>A Felhasználó köteles valós adatokat megadni, és azokat naprakészen tartani.</li>
        <li style={S.li}>A fiók személyes – jelszavát ne ossza meg harmadik felekkel.</li>
        <li style={S.li}>Egy természetes személy egyszerre több fiókot is létrehozhat, de visszaélésszerű felhasználás esetén a Szolgáltató bármelyik fiókot jogosult felfüggeszteni.</li>
        <li style={S.li}>A regisztrációhoz kötelező elfogadni az <a href="/adatkezeles" style={{ color: '#2563eb' }}>Adatkezelési Tájékoztatót</a> és jelen ÁSZF-et.</li>
      </ul>

      {/* 3 */}
      <h2 style={S.h2}>3. Előfizetési csomagok és díjak</h2>
      <p style={S.p}>Az OkosSzaki az alábbi előfizetési szinteket kínálja:</p>
      <ul style={S.ul}>
        <li style={S.li}><strong>Ingyenes (Basic):</strong> korlátozott számú projekt, árajánlat és felmérés. Mindig ingyenes, bankkártya nem szükséges.</li>
        <li style={S.li}><strong>Prémium:</strong> korlátlan projektek, ajánlatok, felmérések, teljes weboldal-funkció. Havi előfizetéssel érhető el.</li>
        <li style={S.li}><strong>Kollektív:</strong> csapatmunka funkciók, megosztott munkaterület több résztvevővel. A Prémium csomag feletti kiegészítő díjjal érhető el, ülőhelyek szerint skálázható.</li>
      </ul>
      <p style={S.p}>Az aktuális árak az <a href="/#pricing" style={{ color: '#2563eb' }}>okosszaki.hu/#pricing</a> oldalon találhatók. A Szolgáltató fenntartja az árváltoztatás jogát; a módosításról a Felhasználókat legalább 30 nappal előre e-mailben értesíti.</p>

      {/* 4 */}
      <h2 style={S.h2}>4. Fizetési feltételek</h2>
      <ul style={S.ul}>
        <li style={S.li}>A Prémium és Kollektív csomagok díja havonta, előre fizetendő.</li>
        <li style={S.li}>Fizetés bankkártyával, online fizetési szolgáltatón keresztül történik.</li>
        <li style={S.li}>A sikertelen fizetés esetén a Felhasználó fiókja az ingyenes szintre kerül vissza; az adatok megőrzésre kerülnek.</li>
        <li style={S.li}>Az előfizetés bármikor lemondható; a már kifizetett időszakra visszatérítés nem jár, de a funkciók az időszak végéig elérhetők maradnak.</li>
        <li style={S.li}>Áfát a Szolgáltató a hatályos magyar jogszabályok szerint számít fel.</li>
      </ul>

      {/* 5 */}
      <h2 style={S.h2}>5. A Felhasználó kötelezettségei és tiltott tevékenységek</h2>
      <p style={S.p}>A Felhasználó vállalja, hogy:</p>
      <ul style={S.ul}>
        <li style={S.li}>kizárólag jogszerű célra és tevékenységre használja a platformot;</li>
        <li style={S.li}>nem tölt fel jogsértő, becsületsértő, félrevezető vagy mások személyes adatait jogosulatlanul tartalmazó anyagot;</li>
        <li style={S.li}>a rendszert nem terheli automatizált szkriptekkel, tömeges adatgyűjtéssel vagy biztonsági tesztelési célú forgalommal;</li>
        <li style={S.li}>harmadik felek (ügyfelei) személyes adatait a vonatkozó adatvédelmi jogszabályoknak – különös tekintettel a GDPR-ra – megfelelően kezeli;</li>
        <li style={S.li}>a fiókon belül kezelt adatokért – így az ügyféladatokért, naplóbejegyzésekért és számlafotókért – maga felel.</li>
      </ul>

      <div style={S.box}>
        <strong>Ügyféladatok feltöltése — a Felhasználó felelőssége</strong><br /><br />
        Az OkosSzaki platformra feltöltött ügyféladatok (név, cím, e-mail, telefonszám stb.) tekintetében a Felhasználó önálló <strong>adatkezelőnek</strong> minősül a GDPR értelmében; az MPPM Consulting Kft. csupán adatfeldolgozóként jár el.<br /><br />
        A Felhasználó köteles az ügyfelei személyes adatait kizárólag akkor rögzíteni az OkosSzakiben, ha erre jogszerű alapja van — például az ügyfél előzetes tájékoztatásán és beleegyezésén, vagy a köztük fennálló szerződéses kapcsolaton alapuló jogos érdeken. Az ügyfél adatainak rögzítésekor a platform egy jelölőnégyzettel kéri a Felhasználó nyilatkozatát arról, hogy ez a feltétel teljesül. Az MPPM Consulting Kft. e nyilatkozatot nem ellenőrzi és arról bizonyítékot nem kér; a valóságnak megfelelő kitöltés a Felhasználó kizárólagos felelőssége. Valótlan nyilatkozat esetén a Felhasználó teljes jogi felelősséggel tartozik az ebből eredő adatvédelmi jogsértésekért.
      </div>

      <div style={S.box}>
        <strong>Kollektív munkaterület — az üzemeltető felelőssége</strong><br /><br />
        A Kollektív csomag keretében létrehozott közös munkaterület (<em>kollektív</em>) üzemeltetője (a továbbiakban: <strong>kollektív tulajdonos</strong>) felelős a kollektívában kezelt valamennyi adatért, beleértve a kollektíva tagjainak (közreműködők) tevékenységét is.<br /><br />
        A kollektív munkaterületen bizonyos ügyféladatok — elsősorban az ügyfél neve és e-mail-címe — megosztásra kerülhetnek a kollektíva tagjaival, amennyiben ez az ügyfél érdekében végzett funkciók ellátásához szükséges (pl. árajánlat elkészítése és kiküldése). Ez az adatmegosztás a szükséges minimumra korlátozódik, és kizárólag a közös munkavégzés céljára történik.<br /><br />
        A kollektív tulajdonos köteles:
        <ul style={{ paddingLeft: '1.1rem', margin: '0.6rem 0 0', lineHeight: 1.8 }}>
          <li>ügyfeleit tájékoztatni arról, hogy adataik a kollektíva tagjaival megosztásra kerülhetnek;</li>
          <li>gondoskodni arról, hogy a kollektíva tagjai is betartsák az adatvédelmi előírásokat;</li>
          <li>a kollektíva tagjainak hozzáférését a szükséges adatokra korlátozni.</li>
        </ul>
      </div>

      {/* 6 */}
      <h2 style={S.h2}>6. A Szolgáltató kötelezettségei és rendelkezésre állás</h2>
      <ul style={S.ul}>
        <li style={S.li}>Az OkosSzaki igyekszik évi 99,5%-os rendelkezésre állást biztosítani; a karbantartási időablakok kivételével.</li>
        <li style={S.li}>Az adatok biztonsági mentése naponta automatikusan megtörténik.</li>
        <li style={S.li}>A Szolgáltató e-mailes ügyfélszolgálatot biztosít (<a href="mailto:hello@okosszaki.hu" style={{ color: '#2563eb' }}>hello@okosszaki.hu</a>); a válaszidő jellemzően 2 munkanapon belül.</li>
        <li style={S.li}>A Szolgáltató jogosult a platformot fejleszteni, funkciókat hozzáadni vagy módosítani, feltéve, hogy ez nem csökkenti lényegesen az előfizetett csomag értékét.</li>
      </ul>

      {/* 7 */}
      <h2 style={S.h2}>7. Szellemi tulajdon</h2>
      <p style={S.p}>Az OkosSzaki platform teljes forráskódja, dizájnja, márkaneve és logója az MPPM Consulting Kft. kizárólagos tulajdona. A felhasználók által a platformra feltöltött tartalmak (fotók, szövegek, adatok) a Felhasználó tulajdonát képezik; a Szolgáltató ezekre kizárólag a szolgáltatás nyújtásához szükséges mértékű, nem kizárólagos felhasználási jogot igényel.</p>

      {/* 8 */}
      <h2 style={S.h2}>8. Felelősség korlátozása</h2>
      <p style={S.p}>A Szolgáltató nem vállal felelősséget:</p>
      <ul style={S.ul}>
        <li style={S.li}>a Felhasználó által bevitt helytelen vagy hiányos adatokból eredő károkért;</li>
        <li style={S.li}>vis maior eseményekből (természeti katasztrófa, internetes infrastruktúra-leállás) eredő kiesésért;</li>
        <li style={S.li}>harmadik feles integrációk (pl. e-mail-kézbesítési hibák, OCR pontossága) teljesítményéért;</li>
        <li style={S.li}>elmaradt haszonért vagy közvetett károkért, kivéve a szándékos vagy súlyosan gondatlan károkozást.</li>
      </ul>
      <p style={S.p}>A Szolgáltató teljes felelőssége bármely egyedi kárért nem haladhatja meg a Felhasználó által az adott naptári évben ténylegesen megfizetett előfizetési díj összegét.</p>

      {/* 9 */}
      <h2 style={S.h2}>9. A szerződés megszűnése</h2>
      <ul style={S.ul}>
        <li style={S.li}><strong>A Felhasználó részéről:</strong> a fiók bármikor törölhető a profilbeállításokon belül. A törlés után 30 napig az adatok visszaállíthatók, ezt követően véglegesen törlődnek.</li>
        <li style={S.li}><strong>A Szolgáltató részéről:</strong> az ÁSZF súlyos megsértése esetén a Szolgáltató azonnali hatályú felmondási joggal rendelkezik. Egyéb esetekben 30 napos felmondási idő érvényes.</li>
        <li style={S.li}>Az előfizetési díj arányos visszatérítése a Felhasználó hibájából eredő felmondás esetén nem jár.</li>
      </ul>

      {/* 10 */}
      <h2 style={S.h2}>10. Az ÁSZF módosítása</h2>
      <p style={S.p}>A Szolgáltató jogosult az ÁSZF-et módosítani. A módosításokról a Felhasználókat e-mailben, legalább 30 nappal a hatályba lépés előtt értesíti. Ha a Felhasználó az értesítéstől számított 30 napon belül nem mondja fel a fiókját, a módosítást elfogadottnak kell tekinteni.</p>

      {/* 11 */}
      <h2 style={S.h2}>11. Alkalmazandó jog és vitarendezés</h2>
      <p style={S.p}>Jelen ÁSZF-re a magyar jog irányadó, különös tekintettel a Polgári Törvénykönyvről szóló 2013. évi V. törvényre és az elektronikus kereskedelemről szóló 2001. évi CVIII. törvényre.</p>
      <p style={S.p}>A felek vitájukat elsősorban egyeztetéssel próbálják rendezni. Eredménytelen egyeztetés esetén a Budapesti IV. és XV. Kerületi Bíróság, illetve hatáskörtől függően a Fővárosi Törvényszék kizárólagos illetékességét kötik ki.</p>
      <p style={S.p}>Fogyasztói jogvita esetén lehetőség van az <a href="https://www.bekeltetes.hu" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Online Vitarendezési Platformhoz</a> fordulni.</p>

      <div style={S.box}>
        Kapcsolat: <a href="mailto:hello@okosszaki.hu" style={{ color: '#2563eb' }}>hello@okosszaki.hu</a> · MPPM Consulting Kft. · 1082 Budapest, Kisfaludy utca 28/b
      </div>

    </LegalLayout>
  );
}
