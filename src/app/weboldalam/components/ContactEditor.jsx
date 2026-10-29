'use client';

import { extractSocialHandle, formatHunPhone } from './utils';
import ContactPremiumField from './ContactPremiumField';

export default function ContactEditor({ content, onChange, isPremium }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Az Epitünk kapcsolatfelvételi form mindig elérhető. Prémium fiókkal telefon, e-mail és közösségi elérhetőségek is megjelennek.
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label className="form-label">E-mail cím</label>
        <input type="email" className="form-control" value={content.email || ''} onChange={e => onChange({ ...content, email: e.target.value })} placeholder="neve@email.hu" />
      </div>

      <ContactPremiumField label="Telefonszám" isPremium={isPremium}>
        <input type="tel" className="form-control" value={content.phone || ''} onChange={e => onChange({ ...content, phone: e.target.value })} onBlur={e => onChange({ ...content, phone: formatHunPhone(e.target.value) })} placeholder="+36 70 123 45 67" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="WhatsApp" isPremium={isPremium}>
        <input type="tel" className="form-control" value={content.whatsapp || ''} onChange={e => onChange({ ...content, whatsapp: e.target.value })} onBlur={e => onChange({ ...content, whatsapp: formatHunPhone(e.target.value) })} placeholder="+36 70 123 45 67" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="Viber" isPremium={isPremium}>
        <input type="tel" className="form-control" value={content.viber || ''} onChange={e => onChange({ ...content, viber: e.target.value })} onBlur={e => onChange({ ...content, viber: formatHunPhone(e.target.value) })} placeholder="+36 70 123 45 67" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="TikTok" isPremium={isPremium}>
        <input type="text" className="form-control" value={content.tiktok || ''} onChange={e => onChange({ ...content, tiktok: e.target.value })} onBlur={e => onChange({ ...content, tiktok: extractSocialHandle(e.target.value, 'tiktok') })} placeholder="@felhasznalonev" disabled={!isPremium} />
      </ContactPremiumField>

      <ContactPremiumField label="Instagram" isPremium={isPremium}>
        <input type="text" className="form-control" value={content.instagram || ''} onChange={e => onChange({ ...content, instagram: e.target.value })} onBlur={e => onChange({ ...content, instagram: extractSocialHandle(e.target.value, 'instagram') })} placeholder="@felhasznalonev" disabled={!isPremium} />
      </ContactPremiumField>
    </div>
  );
}
