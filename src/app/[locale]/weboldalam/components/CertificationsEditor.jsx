'use client';

import { useTranslations } from 'next-intl';
import ListEditor from './ListEditor';

export default function CertificationsEditor({ content, onChange }) {
  const t = useTranslations('website');
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel={t('certAddLabel')}
      totalLimit={8}
      fields={[
        { key: 'title',  placeholder: t('certTitlePlaceholder'), max: 100 },
        { key: 'issuer', placeholder: t('certIssuerPlaceholder'), max: 100 },
        { key: 'year',   placeholder: t('certYearPlaceholder'), max: 4, type: 'number' },
      ]}
    />
  );
}
