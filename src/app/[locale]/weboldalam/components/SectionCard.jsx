'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, ChevronRight, Star, User, Wrench, Award, Image, DollarSign, MessageSquare, HelpCircle, MapPin, Phone } from 'lucide-react';
import PillToggle from './PillToggle';
import SectionContentEditor from './SectionContentEditor';

export const SECTION_META = {
  hero:          { icon: Star,          free: true  },
  about:         { icon: User,          free: true  },
  services:      { icon: Wrench,        free: true  },
  certifications:{ icon: Award,         free: false },
  gallery:       { icon: Image,         free: false },
  pricing:       { icon: DollarSign,    free: false },
  testimonials:  { icon: MessageSquare, free: false },
  faq:           { icon: HelpCircle,    free: false },
  service_area:  { icon: MapPin,        free: false },
  contact:       { icon: Phone,         free: true  },
};

export const SECTION_ORDER = [
  'hero','about','services','certifications','gallery',
  'pricing','testimonials','faq','service_area','contact',
];

export default function SectionCard({ section, isPremium, expanded, onToggleExpand, onChange, tradeId }) {
  const t = useTranslations('website');
  const meta = SECTION_META[section.section_type] || {};
  const Icon = meta.icon;
  const isPremiumSection = !meta.free;
  const hiddenOnPublish = isPremiumSection && !isPremium;

  const sectionLabels = {
    hero: t('sectionHeroLabel'), about: t('sectionAboutLabel'), services: t('sectionServicesLabel'),
    certifications: t('sectionCertificationsLabel'), gallery: t('sectionGalleryLabel'),
    pricing: t('sectionPricingLabel'), testimonials: t('sectionTestimonialsLabel'),
    faq: t('sectionFaqLabel'), service_area: t('sectionServiceAreaLabel'), contact: t('sectionContactLabel'),
  };
  const sectionDescs = {
    hero: t('sectionHeroDesc'), about: t('sectionAboutDesc'), services: t('sectionServicesDesc'),
    certifications: t('sectionCertificationsDesc'), gallery: t('sectionGalleryDesc'),
    pricing: t('sectionPricingDesc'), testimonials: t('sectionTestimonialsDesc'),
    faq: t('sectionFaqDesc'), service_area: t('sectionServiceAreaDesc'), contact: t('sectionContactDesc'),
  };
  const label = sectionLabels[section.section_type] || section.section_type;
  const desc = sectionDescs[section.section_type] || '';

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
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{label}</span>
            {isPremiumSection && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.4rem',
                borderRadius: 'var(--radius-pill)',
                background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a',
              }}>{t('premiumBadge')}</span>
            )}
            {hiddenOnPublish && (
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                {t('hiddenOnPublish')}
              </span>
            )}
          </div>
          <p style={{ margin: 0, fontSize: '0.775rem', color: 'var(--text-muted)' }}>{desc}</p>
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
