'use client';

import { useState } from 'react';
import { Image, Trash2 } from 'lucide-react';
import ImagePickerModal from './ImagePickerModal';

export default function HeroEditor({ content, onChange, tradeId }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const clearImage = () => onChange({ ...content, hero_image_id: null, hero_image_url: null });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

      {/* Tagline */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Szlogen <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max. 60 karakter)</span></label>
        <input
          type="text" className="form-control" maxLength={60}
          value={content.tagline || ''}
          onChange={e => onChange({ ...content, tagline: e.target.value })}
          placeholder="pl. Megbízható festési munkák Budapesten"
        />
      </div>

      {/* Subtitle */}
      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">Alcím <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(max. 140 karakter)</span></label>
        <input
          type="text" className="form-control" maxLength={140}
          value={content.subtitle || ''}
          onChange={e => onChange({ ...content, subtitle: e.target.value })}
          placeholder="pl. 15 éves tapasztalattal, garanciával, kedvező áron"
        />
      </div>

      {/* Hero background image */}
      <div>
        <label className="form-label">Háttérkép</label>
        {content.hero_image_url ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src={content.hero_image_url} alt="Háttérkép" style={{ width: 120, height: 68, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)}>Csere</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={clearImage}><Trash2 size={13} /></button>
            </div>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Image size={13} /> Kép kiválasztása
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
