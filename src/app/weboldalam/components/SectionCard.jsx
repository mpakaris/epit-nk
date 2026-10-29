'use client';

import { ChevronDown, ChevronRight, Star, User, Wrench, Award, Image, DollarSign, MessageSquare, HelpCircle, MapPin, Phone } from 'lucide-react';
import PillToggle from './PillToggle';
import SectionContentEditor from './SectionContentEditor';

export const SECTION_META = {
  hero:          { label: 'Bemutatkozó fejléc', icon: Star,          free: true,  desc: 'Szakma, névjegy, rövid szlogen' },
  about:         { label: 'Rólam',              icon: User,          free: true,  desc: 'Bemutatkozó szöveg' },
  services:      { label: 'Szolgáltatások',     icon: Wrench,        free: true,  desc: 'Mit csinálsz, mit vállalsz' },
  certifications:{ label: 'Képesítések',        icon: Award,         free: false, desc: 'Bizonyítványok, végzettségek' },
  gallery:       { label: 'Galéria',            icon: Image,         free: false, desc: 'Korábbi munkáid képei' },
  pricing:       { label: 'Áraink',             icon: DollarSign,    free: false, desc: 'Díjszabás, árajánlat-kategóriák' },
  testimonials:  { label: 'Vélemények',         icon: MessageSquare, free: false, desc: 'Ügyfelek visszajelzései' },
  faq:           { label: 'GYIK',               icon: HelpCircle,    free: false, desc: 'Gyakori kérdések és válaszok' },
  service_area:  { label: 'Munkaterület',       icon: MapPin,        free: false, desc: 'Hol dolgozol, milyen körzetben' },
  contact:       { label: 'Kapcsolat',          icon: Phone,         free: true,  desc: 'Elérhetőségeid' },
};

export const SECTION_ORDER = [
  'hero','about','services','certifications','gallery',
  'pricing','testimonials','faq','service_area','contact',
];

export default function SectionCard({ section, isPremium, expanded, onToggleExpand, onChange, tradeId }) {
  const meta = SECTION_META[section.section_type] || {};
  const Icon = meta.icon;
  const isPremiumSection = !meta.free;
  const hiddenOnPublish = isPremiumSection && !isPremium;

  return (
    <div style={{
      border: `1px solid ${expanded ? 'var(--primary)' : 'var(--border-subtle)'}`,
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
    }}>
      {/* Header row */}
      <div
        onClick={onToggleExpand}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '0.85rem 1rem',
          background: expanded ? 'var(--primary-bg)' : 'var(--bg-card)',
          cursor: 'pointer', userSelect: 'none',
        }}
      >
        <div style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon && <Icon size={16} style={{ color: 'var(--primary)' }} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{meta.label}</span>
            {isPremiumSection && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-pill)',
                background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a',
              }}>PRÉMIUM</span>
            )}
            {hiddenOnPublish && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                – nem jelenik meg az élő oldalon
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)' }}>{meta.desc}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <PillToggle on={section.enabled} onChange={e => { e.stopPropagation(); onChange({ ...section, enabled: !section.enabled }); }} />
          {expanded ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--text-muted)' }} />}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '1rem', background: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)' }}>
          <SectionContentEditor section={section} onChange={onChange} isPremium={isPremium} tradeId={tradeId} />
        </div>
      )}
    </div>
  );
}
