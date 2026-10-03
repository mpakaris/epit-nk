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
    members: ['usr-peter', 'usr-janos', 'usr-gabor']
  },
  {
    id: 'proj-pest',
    name: 'Tetőtér Beépítés & Szigetelés',
    description: 'Budafoki ikerház tetőtér kialakítása, gipszkartonozás és festés.',
    created_by: 'usr-admin',
    created_at: '2026-02-18T10:30:00Z',
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
    description: 'Kőműves és ács csapat munkadíj I. részlet',
    category: 'Munka',
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
