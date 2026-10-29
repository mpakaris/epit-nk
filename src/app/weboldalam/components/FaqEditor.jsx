'use client';

import ListEditor from './ListEditor';

export default function FaqEditor({ content, onChange }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Kérdés hozzáadása"
      totalLimit={6}
      fields={[
        { key: 'question', placeholder: 'Kérdés (pl. Adtok garanciát a munkára?)', max: 120 },
        { key: 'answer',   placeholder: 'Válasz', type: 'textarea', max: 300 },
      ]}
    />
  );
}
