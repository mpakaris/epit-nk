'use client';

import { useTranslations } from 'next-intl';
import ListEditor from './ListEditor';

export default function ServicesEditor({ content, onChange, isPremium, tradeId, compact }) {
  const t = useTranslations('website');
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel={t('servicesAddLabel')}
      totalLimit={8} freeLimit={3} isPremium={isPremium} compact={compact}
      fields={[
        { key: 'title',       placeholder: t('servicesTitlePlaceholder'), max: 80 },
        { key: 'description', placeholder: t('servicesDescPlaceholder'), type: 'textarea', max: 200 },
      ]}
    />
  );
}
