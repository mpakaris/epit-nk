export const INITIAL_DEMO_USERS = [
  {
    id: 'usr-admin',
    email: 'admin@epitek.hu',
    display_name: 'Nagy Sándor (Admin)',
    role: 'admin',
    must_change_password: false,
    created_at: '2026-01-10T10:00:00Z'
  },
  {
    id: 'usr-peter',
    email: 'kovacs.peter@epitek.hu',
    display_name: 'Kovács Péter',
    role: 'user',
    must_change_password: false,
    created_at: '2026-01-12T14:30:00Z'
  },
  {
    id: 'usr-janos',
    email: 'kiss.janos@epitek.hu',
    display_name: 'Kiss János',
    role: 'user',
    must_change_password: false,
    created_at: '2026-01-14T09:15:00Z'
  },
  {
    id: 'usr-gabor',
    email: 'toth.gabor@epitek.hu',
    display_name: 'Tóth Gábor',
    role: 'user',
    must_change_password: false,
    created_at: '2026-02-01T11:00:00Z'
  }
];

export const INITIAL_DEMO_PROJECTS = [
  {
    id: 'proj-balaton',
    name: 'Balatoni Nyaraló Felújítás',
    description: 'Tetőcsere, villanyhálózat korszerűsítés és terasz burkolás Siófokon.',
    created_by: 'usr-admin',
    created_at: '2026-02-05T08:00:00Z',
    start_date: '2026-02-10',
    end_date: '2026-04-15',
    members: ['usr-peter', 'usr-janos', 'usr-gabor']
  },
  {
    id: 'proj-pest',
    name: 'Tetőtér Beépítés & Szigetelés',
    description: 'Budafoki ikerház tetőtér kialakítása, gipszkartonozás és festés.',
    created_by: 'usr-admin',
    created_at: '2026-02-18T10:30:00Z',
    start_date: '2026-03-01',
    end_date: '2026-05-20',
    members: ['usr-peter', 'usr-janos']
  }
];

export const INITIAL_DEMO_INVOICES = [
  {
    id: 'inv-1',
    project_id: 'proj-balaton',
    uploaded_by: 'usr-peter',
    uploader_name: 'Kovács Péter',
    image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    value_huf: 650000,
    ocr_suggested_value: 650000,
    description: 'Tetőcserép (Creaton) és hőszigetelő gyapot beszerzése',
    category: 'Anyag',
    created_at: '2026-02-10T11:20:00Z'
  },
  {
    id: 'inv-2',
    project_id: 'proj-balaton',
    uploaded_by: 'usr-janos',
    uploader_name: 'Kiss János',
    image_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&auto=format&fit=crop&q=80',
    value_huf: 480000,
    ocr_suggested_value: 480000,
    description: 'Kőműves és ács csapat vállalkozói munkadíj I. részlet',
    category: 'Egyéb',
    created_at: '2026-02-15T16:45:00Z'
  },
  {
    id: 'inv-3',
    project_id: 'proj-balaton',
    uploaded_by: 'usr-peter',
    uploader_name: 'Kovács Péter',
    image_url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&auto=format&fit=crop&q=80',
    value_huf: 125000,
    ocr_suggested_value: 125000,
    description: 'Állványzat bérlés 2 hétre szállítással',
    category: 'Szerszám/Eszköz',
    created_at: '2026-02-20T09:10:00Z'
  },
  {
    id: 'inv-4',
    project_id: 'proj-balaton',
    uploaded_by: 'usr-gabor',
    uploader_name: 'Tóth Gábor',
    image_url: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?w=800&auto=format&fit=crop&q=80',
    value_huf: 85000,
    ocr_suggested_value: 85000,
    description: 'Sóder, cement és zúzottkő fuvarköltség',
    category: 'Szállítás',
    created_at: '2026-02-25T13:30:00Z'
  },
  {
    id: 'inv-5',
    project_id: 'proj-pest',
    uploaded_by: 'usr-peter',
    uploader_name: 'Kovács Péter',
    image_url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    value_huf: 320000,
    ocr_suggested_value: 320000,
    description: 'Gipszkarton lapok és profilok',
    category: 'Anyag',
    created_at: '2026-03-01T10:15:00Z'
  }
];

export const INITIAL_DEMO_LABOUR_ENTRIES = [
  {
    id: 'lab-1',
    project_id: 'proj-balaton',
    uploaded_by: 'usr-peter',
    date: '2026-02-12',
    labour_type: 'Tetőfedés',
    hours: 8,
    hourly_rate: 5000,
    value_huf: 40000,
    description: 'Tetőcserép fektetés és rögzítés',
    created_at: '2026-02-12T18:00:00Z'
  },
  {
    id: 'lab-2',
    project_id: 'proj-balaton',
    uploaded_by: 'usr-janos',
    date: '2026-02-14',
    labour_type: 'Villanyszerelés',
    hours: 6,
    hourly_rate: 6000,
    value_huf: 36000,
    description: 'Konnektorok és kapcsolók bekötése',
    created_at: '2026-02-14T17:30:00Z'
  },
  {
    id: 'lab-3',
    project_id: 'proj-balaton',
    uploaded_by: 'usr-gabor',
    date: '2026-02-16',
    labour_type: 'Burkolás',
    hours: 10,
    hourly_rate: 4500,
    value_huf: 45000,
    description: 'Teraszburkolat lerakása',
    created_at: '2026-02-16T19:00:00Z'
  },
  {
    id: 'lab-4',
    project_id: 'proj-pest',
    uploaded_by: 'usr-peter',
    date: '2026-03-03',
    labour_type: 'Gipszkartonozás',
    hours: 12,
    hourly_rate: 4000,
    value_huf: 48000,
    description: 'Tetőtér gipszkarton falak',
    created_at: '2026-03-03T18:00:00Z'
  },
  {
    id: 'lab-5',
    project_id: 'proj-pest',
    uploaded_by: 'usr-janos',
    date: '2026-03-05',
    labour_type: 'Festés',
    hours: 8,
    hourly_rate: 4500,
    value_huf: 36000,
    description: 'Alapozó + fedőfestés',
    created_at: '2026-03-05T17:00:00Z'
  }
];

export const INITIAL_DEMO_CLIENTS = [
  {
    id: 'client-1',
    name: 'Horváth Béla',
    address: '8600 Siófok, Fő utca 12.',
    phone: '+36 70 234 5678',
    email: 'horvath.bela@example.com',
    notes: 'Visszatérő megrendelő, pontosan fizet.',
    discount_percent: 5,
    created_at: '2026-01-20T10:00:00Z'
  },
  {
    id: 'client-2',
    name: 'Fekete és Társa Kft.',
    address: '1117 Budapest, Irinyi József u. 4.',
    phone: '+36 1 234 5678',
    email: 'iroda@fekete-kft.hu',
    notes: 'Cég, számlát kér minden munkáról.',
    discount_percent: 0,
    created_at: '2026-02-10T09:00:00Z'
  }
];

export const INITIAL_DEMO_QUOTES = [
  {
    id: 'quote-1',
    title: 'Garázs irodává alakítás',
    location: 'Pécs, Rét utca 5.',
    work_type: 'Beltéri felújítás',
    description: 'Garázs irodává alakítása: szigetelés, gipszkarton falak, padlóburkolat, villanyszerelés.',
    start_date: '2026-04-07',
    end_date: '2026-04-28',
    status: 'draft',
    client_id: 'client-1',
    project_id: null,
    created_by: 'usr-admin',
    created_at: '2026-03-15T10:00:00Z'
  },
  {
    id: 'quote-2',
    title: 'Irodaház homlokzatfelújítás',
    location: '1117 Budapest, Irinyi József u. 4.',
    work_type: 'Külső felújítás',
    description: 'Homlokzati hőszigetelés, vakolat és festés, 3 emelet.',
    start_date: '2026-05-05',
    end_date: '2026-06-14',
    status: 'sent',
    client_id: 'client-2',
    project_id: null,
    created_by: 'usr-admin',
    created_at: '2026-03-20T11:00:00Z'
  }
];

export const INITIAL_DEMO_QUOTE_ENTRIES = [
  {
    id: 'qe-1',
    quote_id: 'quote-1',
    user_id: 'usr-peter',
    work_description: 'Gipszkarton falak és mennyezet (anyaggal)',
    amount_huf: 320000,
    notes: 'KB 2 hetes munka',
    created_at: '2026-03-15T10:30:00Z'
  },
  {
    id: 'qe-2',
    quote_id: 'quote-1',
    user_id: 'usr-janos',
    work_description: 'Villanyszerelés és világítás',
    amount_huf: 180000,
    notes: '',
    created_at: '2026-03-15T11:00:00Z'
  },
  {
    id: 'qe-3',
    quote_id: 'quote-2',
    user_id: 'usr-peter',
    work_description: 'Hőszigetelés és vakolat (anyaggal)',
    amount_huf: 850000,
    notes: '120 m² homlokzat',
    created_at: '2026-03-20T11:30:00Z'
  },
  {
    id: 'qe-4',
    quote_id: 'quote-2',
    user_id: 'usr-gabor',
    work_description: 'Festés (2 réteg)',
    amount_huf: 240000,
    notes: '',
    created_at: '2026-03-20T12:00:00Z'
  }
];
