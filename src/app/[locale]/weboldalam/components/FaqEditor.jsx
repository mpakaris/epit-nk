'use client';

import { useTranslations } from 'next-intl';
import ListEditor from './ListEditor';

export default function FaqEditor({ content, onChange }) {
  const t = useTranslations('website');
  const items = content.items || [];
  return (
    <ListEditor
      items={items}
      onChange={next => onChange({ ...content, items: next })}
      addLabel={t('faqAddLabel')}
      totalLimit={6}
      fields={[
        { key: 'question', placeholder: t('faqQuestionPlaceholder'), max: 120 },
        { key: 'answer',   placeholder: t('faqAnswerPlaceholder'), type: 'textarea', max: 300 },
      ]}
    />
  );
}
