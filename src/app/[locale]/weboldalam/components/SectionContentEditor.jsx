'use client';

import HeroEditor from './HeroEditor';
import AboutEditor from './AboutEditor';
import ServicesEditor from './ServicesEditor';
import CertificationsEditor from './CertificationsEditor';
import GalleryEditor from './GalleryEditor';
import PricingEditor from './PricingEditor';
import TestimonialsEditor from './TestimonialsEditor';
import FaqEditor from './FaqEditor';
import ServiceAreaEditor from './ServiceAreaEditor';
import ContactEditor from './ContactEditor';

export default function SectionContentEditor({ section, onChange, isPremium, tradeId, compact = false }) {
  const c = section.content || {};
  const update = (next) => onChange({ ...section, content: next });

  switch (section.section_type) {
    case 'hero':           return <HeroEditor content={c} onChange={update} tradeId={tradeId} />;
    case 'about':          return <AboutEditor content={c} onChange={update} tradeId={tradeId} isPremium={isPremium} />;
    case 'services':       return <ServicesEditor content={c} onChange={update} isPremium={isPremium} tradeId={tradeId} compact={compact} />;
    case 'certifications': return <CertificationsEditor content={c} onChange={update} compact={compact} />;
    case 'gallery':        return <GalleryEditor content={c} onChange={update} />;
    case 'pricing':        return <PricingEditor content={c} onChange={update} />;
    case 'testimonials':   return <TestimonialsEditor content={c} onChange={update} compact={compact} />;
    case 'faq':            return <FaqEditor content={c} onChange={update} compact={compact} />;
    case 'service_area':   return <ServiceAreaEditor content={c} onChange={update} />;
    case 'contact':        return <ContactEditor content={c} onChange={update} isPremium={isPremium} />;
    default:               return null;
  }
}
