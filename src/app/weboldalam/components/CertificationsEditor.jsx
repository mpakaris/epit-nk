'use client';

import ListEditor from './ListEditor';

export default function CertificationsEditor({ content, onChange }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Képesítés hozzáadása"
      totalLimit={8}
      fields={[
        { key: 'title',  placeholder: 'Képesítés neve (pl. Mesterfestő bizonyítvány)', max: 100 },
        { key: 'issuer', placeholder: 'Kiállító intézmény (pl. MKIK)', max: 100 },
        { key: 'year',   placeholder: 'Év (pl. 2015)', max: 4, type: 'number' },
      ]}
    />
  );
}
