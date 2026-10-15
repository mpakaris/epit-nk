import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';

const supabase = createClient(
  'process.env.NEXT_PUBLIC_SUPABASE_URL',
  'process.env.SUPABASE_SERVICE_ROLE_KEY'
);

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

const filename = `backup_before_refactor_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
writeFileSync(`/Users/niko/Desktop/CODING/Epitek/${filename}`, JSON.stringify(backup, null, 2));
console.log(`\nBackup saved to ${filename}`);
