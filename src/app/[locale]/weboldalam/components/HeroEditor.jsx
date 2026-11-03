'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Image, Trash2 } from 'lucide-react';
import ImagePickerModal from './ImagePickerModal';

export default function HeroEditor({ content, onChange, tradeId }) {
  const t = useTranslations('website');
  const [pickerOpen, setPickerOpen] = useState(false);
  const clearImage = () => onChange({ ...content, hero_image_id: null, hero_image_url: null });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Tagline */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">{t('heroTaglineLabel')} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t('heroCharMax60')}</span></label>
        <input
          type="text" className="form-control" maxLength={60}
          value={content.tagline || ''}
          onChange={e => onChange({ ...content, tagline: e.target.value })}
          placeholder={t('heroTaglinePlaceholder')}
        />
      </div>

      {/* Subtitle */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">{t('heroSubtitleLabel')} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{t('heroCharMax140')}</span></label>
        <input
          type="text" className="form-control" maxLength={140}
          value={content.subtitle || ''}
          onChange={e => onChange({ ...content, subtitle: e.target.value })}
          placeholder={t('heroSubtitlePlaceholder')}
        />
      </div>

      {/* Hero background image */}
      <div>
        <label className="form-label">{t('heroBgImageLabel')}</label>
        {content.hero_image_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={content.hero_image_url} alt={t('heroBgImageLabel')} style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)}>{t('bannerSwap')}</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={clearImage}><Trash2 size={13} /></button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Image size={13} /> {t('bannerSelectImage')}
          </button>
        )}
      </div>

      {pickerOpen && (
        <ImagePickerModal
          tradeId={tradeId}
          selectedImageId={content.hero_image_id}
          orientation="horizontal"
          onSelect={img => { onChange({ ...content, hero_image_id: img.id, hero_image_url: img.url }); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
