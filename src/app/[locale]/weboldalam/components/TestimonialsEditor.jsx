'use client';

import { useTranslations } from 'next-intl';
import ListEditor from './ListEditor';

export default function TestimonialsEditor({ content, onChange }) {
  const t = useTranslations('website');
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel={t('testimonialsAddLabel')}
      totalLimit={10}
      fields={[
        { key: 'name', placeholder: t('testimonialsNamePlaceholder'), max: 60 },
        { key: 'text', placeholder: t('testimonialsTextPlaceholder'), type: 'textarea', max: 300 },
      ]}
    />
  );
}
