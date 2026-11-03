'use client';

import { useTranslations } from 'next-intl';

export default function ClientSelect({ id, value, onChange, clients = [], style }) {
  const t = useTranslations('clients');
  const collective = clients.filter(c => !c.is_personal_client);
  const personal   = clients.filter(c => c.is_personal_client && !c.display_only);

  return (
    <select id={id} className="form-control" value={value} onChange={onChange} style={style}>
      <option value="">{t('selectPlaceholder')}</option>
      {collective.map(c => (
        <option key={c.id} value={c.id}>
          {c.name}{c.discount_percent > 0 ? ` (${c.discount_percent}% ${t('discountAbbr')})` : ''}
        </option>
      ))}
      {personal.length > 0 && (
        <optgroup label={t('personalGroup')}>
          {personal.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}{c.personal_owner_name ? ` · ${c.personal_owner_name}` : ''}
            </option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
