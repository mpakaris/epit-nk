// Static demo data — served without DB or auth so the demo preview works at
// /szakemberek/nemes-peter-felujito?preview=1

const DEMO_WEBSITE = {
  id:           'demo-website-0000',
  slug:         'nemes-peter-felujito',
  owner_name:   'Nemes Péter',
  trade:        { name_hu: 'Felújítási szakember' },
  status:       'published',
  published_at: '2025-03-10T08:00:00Z',
  is_premium:   true,
  theme: {
    color_scheme: 'slate',
    typography: 'modern',
    banners: [
      { image_id: 'bf083873-5550-4d31-a09e-53bce9d6095e', image_url: 'https://pub-2d791068241e4c61bad18331f484ab29.r2.dev/library/general/1792410398760-hhhf2u.webp' },
      { image_id: '37d2396a-16f0-4fda-84b4-051b4ab85a12', image_url: 'https://pub-2d791068241e4c61bad18331f484ab29.r2.dev/library/general/1792410398070-iwln6n.webp' },
    ],
  },
  user_id:      'demo-user-0000',
};

const DEMO_SECTIONS = [
  {
    section_type: 'hero', enabled: true, order_index: 0,
    content: {
      tagline:        'Megbízható felújítások – garanciával, pontosan, Budapest egész területén',
      subtitle:       '15 éves tapasztalattal vállalok burkolást, festést, gipszkarton munkákat és komplett lakásfelújításokat. Ingyenes helyszíni felmérés!',
      hero_image_id:  'a54807bf-fab3-418b-8dae-2003248c65b0',
      hero_image_url: 'https://pub-2d791068241e4c61bad18331f484ab29.r2.dev/library/general/1792410371631-6qb776.webp',
    },
  },
  {
    section_type: 'about', enabled: true, order_index: 1,
    content: {
      text: 'Nemes Péter vagyok, 2009 óta dolgozom az építőiparban. Pályámat kőművesként kezdtem, majd fokozatosan bővítettem szaktudásomat: burkolás, gipszkarton, villanyszerelés-segédmunkák, festés-mázolás – ma már komplett lakásfelújításokat is vállalok egyetlen csapattal.\n\nFontosnak tartom az átlátható kommunikációt: pontos árajánlatot adok, tartom a határidőket, és csak annyi munkát vállalok egyszerre, amennyit képes vagyok precízen elvégezni. Minden munkámra garanciát adok.',
      photo_url: `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/platform/about-me.webp`,
    },
  },
  {
    section_type: 'services', enabled: true, order_index: 2,
    content: {
      items: [
        { title: 'Burkolás',              description: 'Padló- és falburkolás csempe, járólap, vinyl és laminált anyagokkal. Padlófűtés beépítése is.' },
        { title: 'Gipszkarton munkák',    description: 'Álmennyezetek, válaszfalak, niche-ek, rejtett lámpasorok tervezése és kivitelezése.' },
        { title: 'Festés-mázolás',        description: 'Falfelület előkészítés, glettelés, alapozás, bel- és kültéri festés egyenletesen.' },
        { title: 'Bontás és előkészítés', description: 'Régi burkolat eltávolítása, faljavítás, nyílások bővítése, szintezés.' },
        { title: 'Komplett felújítás',    description: 'Teljes lakásfelújítás projekt-koordinációval: felmérés, tervezés, kivitelezés, átadás.' },
        { title: 'Hibaelhárítás',         description: 'Repedések, nedvesedés, leválló burkolat javítása gyorsan és tartósan.' },
      ],
    },
  },
  {
    section_type: 'certifications', enabled: true, order_index: 3,
    content: {
      items: [
        { title: 'OKJ Burkoló szakképesítés',       issuer: 'Nemzeti Szakképzési Intézet', year: '2010' },
        { title: 'Gipszkarton szerelő tanfolyam',    issuer: 'Knauf Akadémia',             year: '2013' },
        { title: 'Vízszigeteléstechnológiai osvény', issuer: 'Mapei Hungaria Kft.',         year: '2019' },
        { title: 'Munkabiztonsági alapképzés',       issuer: 'OPKFI',                       year: '2022' },
      ],
    },
  },
  {
    section_type: 'pricing', enabled: true, order_index: 4,
    content: {
      items: [
        {
          title: 'Burkolás',
          entries: [
            { label: 'Padlóburkolás anyag nélkül', price: '4 500', unit: 'm²' },
            { label: 'Falburkolás anyag nélkül',   price: '5 200', unit: 'm²' },
            { label: 'Mozaik, speciális kötés',    price: '6 800', unit: 'm²' },
          ],
        },
        {
          title: 'Gipszkarton',
          entries: [
            { label: 'Álmennyezet egyszerű', price: '6 000', unit: 'm²' },
            { label: 'Válaszfal (2 réteg)',  price: '7 500', unit: 'm²' },
            { label: 'Ívelt megoldások',     price: 'Egyedi ajánlat', unit: '' },
          ],
        },
        {
          title: 'Festés',
          entries: [
            { label: 'Falfelület festés 2 réteg', price: '1 800', unit: 'm²' },
            { label: 'Glettelés + festés',        price: '3 200', unit: 'm²' },
            { label: 'Kültéri homlokzat',         price: 'Egyedi ajánlat', unit: '' },
          ],
        },
      ],
    },
  },
  {
    section_type: 'testimonials', enabled: true, order_index: 5,
    content: {
      items: [
        { text: 'Péter csapata pontosan megjelent, az ajánlatban szereplő áron dolgoztak és a munkaminőség kiváló. A fürdőszobánk teljesen megújult – mindenkit csak ajánlani tudom!', name: 'Bakos Péter, Budapest XIII.' },
        { text: 'A konyhánkat és előszobánkat újíttattuk fel. Minden határidőre elkészült, a kommunikáció végig gördülékeny volt. 5 csillag semmi gond nélkül!', name: 'Horváth Anna, Siófok' },
        { text: 'Három éve felújítottuk a lakásunkat Péterrel. Azóta semmi gond – minőségi munkát végzett. Ha újra szükség lesz rá, biztosan visszahívom.', name: 'Tóth Gábor, Budapest XI.' },
        { text: 'Gyorsan reagált, reális árajánlatot adott és a tényleges munkával sem volt semmi probléma. Végre egy megbízható szakember!', name: 'Varga Éva, Budaörs' },
      ],
    },
  },
  {
    section_type: 'faq', enabled: true, order_index: 6,
    content: {
      items: [
        { question: 'Mennyi idő alatt készül el egy átlagos fürdőszoba felújítás?',  answer: 'Egy 6–8 m²-es fürdőszoba teljes felújítása átlagosan 10–14 munkanap, a bontástól az átadásig. Előre egyeztetjük az ütemtervet.' },
        { question: 'Kell-e előleget fizetni?',                                       answer: 'Igen, az anyagköltség 50%-ának megfelelő előleget kérünk a munka megkezdésekor. A fennmaradó összeget átadáskor számlázzuk.' },
        { question: 'Vállalnak-e kisebb javítási munkákat is?',                       answer: 'Igen, vállalunk kisebb hibaelhárításokat, repedésjavítást, csempepótlást is – minimum kiszállási díj ellenében.' },
        { question: 'Milyen garanciát adnak a munkákra?',                             answer: '2 év garanciát vállalunk minden elvégzett munkára. Anyaghibára a gyártói garancia az irányadó.' },
        { question: 'Ingyenes-e a felmérés?',                                         answer: 'Igen, Budapest és agglomerációja területén az első helyszíni felmérés és ajánlat ingyenes.' },
      ],
    },
  },
  {
    section_type: 'service_area', enabled: true, order_index: 7,
    content: { lat: 47.4979, lng: 19.0402, radius_km: 40 },
  },
  {
    section_type: 'contact', enabled: true, order_index: 8,
    content: { phone: '+36301234567', email: 'nemes@demo.okosszaki.hu', city: 'Budapest' },
  },
];

export async function GET() {
  return Response.json({ website: DEMO_WEBSITE, sections: DEMO_SECTIONS });
}
