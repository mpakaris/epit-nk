// Usage: node --env-file=.env.local scripts/backup_db.mjs
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — run with: node --env-file=.env.local scripts/backup_db.mjs');
  process.exit(1);
}

const supabase = createClient(url, key);

const TABLES = [
  'profiles', 'entities', 'memberships',
  'projects', 'clients', 'quotes', 'quote_entries',
  'surveys', 'invoices', 'labour_entries',
  'project_members', 'project_rooms', 'diary_entries',
];

const backup = {};

for (const table of TABLES) {
  const { data, error } = await supabase.from(table).select('*');
  if (error) {
    console.warn(`⚠ ${table}: ${error.message}`);
    backup[table] = [];
  } else {
    backup[table] = data;
    console.log(`✓ ${table}: ${data.length} rows`);
  }
}

const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(`/Users/niko/Desktop/CODING/Epitek/${filename}`, JSON.stringify(backup, null, 2));
console.log(`\nBackup saved to ${filename}`);
