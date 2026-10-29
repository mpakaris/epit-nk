'use client';

import ListEditor from './ListEditor';

export default function ServicesEditor({ content, onChange, isPremium, tradeId }) {
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel="Szolgáltatás hozzáadása"
      totalLimit={8} freeLimit={3} isPremium={isPremium}
      fields={[
        { key: 'title',       placeholder: 'Szolgáltatás neve (pl. Belső festés)', max: 80 },
        { key: 'description', placeholder: 'Rövid leírás (pl. Teljes körű belső festési munkák)', type: 'textarea', max: 200 },
      ]}
    />
  );
}
