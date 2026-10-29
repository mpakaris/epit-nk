'use client';

import ListEditor from './ListEditor';

export default function TestimonialsEditor({ content, onChange }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Vélemény hozzáadása"
      totalLimit={10}
      fields={[
        { key: 'name', placeholder: 'Ügyfél neve (pl. Kovács Péter)', max: 60 },
        { key: 'text', placeholder: 'Vélemény szövege', type: 'textarea', max: 300 },
      ]}
    />
  );
}
