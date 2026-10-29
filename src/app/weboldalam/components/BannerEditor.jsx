'use client';

import { useState } from 'react';
import { Image, Trash2 } from 'lucide-react';
import ImagePickerModal from './ImagePickerModal';

export default function BannerEditor({ content, onChange, tradeId }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <p style={{ margin: 0, fontSize: '0.825rem', color: 'var(--text-muted)' }}>
        Válassz egy vízszintes képet a szakmádhoz tartozó könyvtárból. Ez jelenik meg a szekciók között díszítőként.
      </p>
      {content.image_url ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <img src={content.image_url} alt="" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)' }} />
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)}>Csere</button>
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onChange({ ...content, image_id: null, image_url: null })}>
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPickerOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', alignSelf: 'flex-start' }}>
          <Image size={13} /> Kép kiválasztása
        </button>
      )}
      {pickerOpen && (
        <ImagePickerModal
          tradeId={tradeId}
          selectedImageId={content.image_id}
          orientation="horizontal"
          onSelect={img => { onChange({ ...content, image_id: img.id, image_url: img.url }); setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
