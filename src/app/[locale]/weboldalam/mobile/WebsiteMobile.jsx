'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { COLOR_SCHEMES, TYPOGRAPHY } from '@/lib/websiteThemes';
import { toSlug } from '@/lib/utils';
import SectionContentEditor from '../components/SectionContentEditor';
import ImagePickerModal from '../components/ImagePickerModal';
import QrModal from '../components/QrModal';

const HDR  = '#1A3A5C';
const DEEP = '#121110';
const DEMO_WB_LS_KEY = 'okosszaki_demo_website_builder';

// ── Shared micro-components ───────────────────────────────────────────────────
const ChevL  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>;
const ChevR  = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6"/></svg>;
const CheckSvg = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10"/></svg>;
const SpinSvg  = ({ s = 20 }) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'wbspin 1s linear infinite' }}><path d="M21 12a9 9 0 1 1-18 0"/></svg>;
const GlobeSvg = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>;
const CopySvg  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
const ExtSvg   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>;
const EyeSvg   = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const TrashSvg = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>;
const ImgSvg   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>;

// ── Section metadata ─────────────────────────────────────────────────────────
const SECTION_COLORS = {
  hero:           '#1A3A5C',
  about:          '#065F46',
  services:       '#7C3AED',
  certifications: '#B45309',
  gallery:        '#1D4ED8',
  pricing:        '#14532D',
  testimonials:   '#BE185D',
  faq:            '#374151',
  service_area:   '#0F766E',
  contact:        '#1A3A5C',
};
const SECTION_FREE = new Set(['hero', 'about', 'services', 'contact']);

function SectionIcon({ type }) {
  const paths = {
    hero:           <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>,
    about:          <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    services:       <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>,
    certifications: <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
    gallery:        <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></>,
    pricing:        <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></>,
    testimonials:   <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>,
    faq:            <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
    service_area:   <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></>,
    contact:        <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.22 1.18 2 2 0 012.18 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.59 7.63a16 16 0 006.08 6.08l1.69-1.69a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14v2.92z"/>,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[type] || null}
    </svg>
  );
}

// ── Mobile section card ───────────────────────────────────────────────────────
function MobileSectionCard({ section, isPremium, expanded, onToggleExpand, onChange, tradeId }) {
  const t = useTranslations('website');

  const LABELS = {
    hero: t('sectionHeroLabel'), about: t('sectionAboutLabel'), services: t('sectionServicesLabel'),
    certifications: t('sectionCertificationsLabel'), gallery: t('sectionGalleryLabel'),
    pricing: t('sectionPricingLabel'), testimonials: t('sectionTestimonialsLabel'),
    faq: t('sectionFaqLabel'), service_area: t('sectionServiceAreaLabel'), contact: t('sectionContactLabel'),
  };
  const DESCS = {
    hero: t('sectionHeroDesc'), about: t('sectionAboutDesc'), services: t('sectionServicesDesc'),
    certifications: t('sectionCertificationsDesc'), gallery: t('sectionGalleryDesc'),
    pricing: t('sectionPricingDesc'), testimonials: t('sectionTestimonialsDesc'),
    faq: t('sectionFaqDesc'), service_area: t('sectionServiceAreaDesc'), contact: t('sectionContactDesc'),
  };

  const color  = SECTION_COLORS[section.section_type] || '#374151';
  const label  = LABELS[section.section_type] || section.section_type;
  const desc   = DESCS[section.section_type] || '';
  const isPrem = !SECTION_FREE.has(section.section_type);
  const locked = isPrem && !isPremium;

  return (
    <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: 'inset 0 1px 0 #fff, 0 2px 8px -4px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.06)' }}>
      {/* Header row */}
      <div
        role="button"
        tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={e => e.key === 'Enter' && onToggleExpand()}
        style={{ width: '100%', boxSizing: 'border-box', padding: '14px 14px', border: 0, background: 'transparent', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
      >
        <span style={{ width: 44, height: 44, borderRadius: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <SectionIcon type={section.section_type} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0E1116' }}>{label}</span>
            {locked && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A' }}>
                {t('premiumBadge')}
              </span>
            )}
          </span>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#5A5F68', lineHeight: 1.35, marginTop: 2 }}>{desc}</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {/* Toggle */}
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange({ ...section, enabled: !section.enabled }); }}
            style={{ width: 44, height: 26, borderRadius: 13, border: 0, padding: 3, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'background 0.2s', background: section.enabled ? '#0E1116' : '#D5D2C8' }}
          >
            <span style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', display: 'block', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'transform 0.2s', transform: section.enabled ? 'translateX(18px)' : 'translateX(0)' }} />
          </button>
          {/* Chevron */}
          <span style={{ color: '#8A8F98', display: 'flex', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
          </span>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        locked ? (
          <div style={{ borderTop: '1px solid #E8E5DF', background: '#fff', padding: 20, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#854D0E' }}>
              {t('premiumLockedTitle')}
            </span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#5A5F68', lineHeight: 1.5 }}>
              {t('premiumLockedDesc')}
            </p>
            <a
              href="/elofizetes"
              style={{ height: 48, padding: '0 20px', border: 0, borderRadius: 24, background: '#1A3A5C', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
              {t('premiumLockedBtn')}
            </a>
          </div>
        ) : (
          <div className="m-editor" style={{ borderTop: '1px solid #E8E5DF', background: '#fff', padding: 16 }}>
            <SectionContentEditor section={section} onChange={onChange} isPremium={isPremium} tradeId={tradeId} compact />
          </div>
        )
      )}
    </div>
  );
}

// ── Sheet ─────────────────────────────────────────────────────────────────────
function Sheet({ open, onClose, title, children, z = 40 }) {
  if (!open) return null;
  return (
    <>
      <button onClick={onClose} aria-label="Bezárás" style={{ position: 'fixed', inset: 0, zIndex: z, border: 0, padding: 0, background: 'rgba(14,17,22,.55)', cursor: 'pointer' }} />
      <div style={{ position: 'fixed', zIndex: z + 10, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px 32px', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', color: 'var(--m-ink)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '92vh', overflowY: 'auto' }}>
        <span style={{ alignSelf: 'center', flexShrink: 0, width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#0E1116', lineHeight: 1.1 }}>{title}</span>
            <button onClick={onClose} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}

// ── Pod row (NavRow style) ────────────────────────────────────────────────────
function Pod({ icon, title, subtitle, onClick, accent }) {
  const ROW_SH = 'inset 0 1px 0 #fff, 0 14px 22px -14px rgba(0,0,0,.70), 0 3px 6px -2px rgba(0,0,0,.30)';
  return (
    <button onClick={onClick} style={{
      width: '100%', minHeight: 72, boxSizing: 'border-box', padding: '12px 14px',
      border: 0, borderRadius: 24, background: '#fff', color: '#0E1116',
      textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14,
      cursor: 'pointer', boxShadow: ROW_SH,
    }}>
      <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 16, background: accent || '#F1F1F3', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3 }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{title}</span>
        {subtitle && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</span>}
      </span>
      <span style={{ flexShrink: 0, color: '#8A8F98' }}><ChevR /></span>
    </button>
  );
}

// ── Section group header ───────────────────────────────────────────────────────
function PodGroupHeader({ title, desc }) {
  return (
    <div style={{ paddingLeft: 4 }}>
      <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: '-0.01em', color: '#fff', lineHeight: 1.2 }}>
        {title}
      </h2>
      {desc && (
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.55)', lineHeight: 1.45 }}>
          {desc}
        </p>
      )}
    </div>
  );
}

function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position: 'fixed', zIndex: 200, left: 16, right: 16, top: 18, padding: '14px 16px', borderRadius: 22, background: '#14532D', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
      <CheckSvg />{msg}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WebsiteMobile({ website: initialWebsite, sections: initialSections }) {
  const router = useRouter();
  const t  = useTranslations('website');
  const tc = useTranslations('common');
  const { isDemoMode } = useApp();
  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const [website,  setWebsite]  = useState(initialWebsite);
  const [sections, setSections] = useState(initialSections);
  const [theme,    setTheme]    = useState(website.theme || { color_scheme: 'classic', typography: 'modern' });

  const [openSheet, setOpenSheet] = useState(null); // 'content' | 'design' | 'publish'
  const [expandedSection, setExpandedSection] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toast, setToast] = useState('');
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [bannerPickerOpen,  setBannerPickerOpen]  = useState(false);
  const [bannerPickerIndex, setBannerPickerIndex] = useState(0);

  // Settings
  const [trades, setTrades] = useState([]);
  const [settingsSlug, setSettingsSlug]   = useState(website.slug || '');
  const [slugChecking, setSlugChecking]   = useState(false);
  const [slugResult,   setSlugResult]     = useState(null);
  const [slugSaving,   setSlugSaving]     = useState(false);
  const [slugSaveErr,  setSlugSaveErr]    = useState('');
  const [slugSaveOk,   setSlugSaveOk]     = useState(false);
  const [settingsTradeId, setSettingsTradeId] = useState(website.trade_id || '');
  const slugCheckTimer = useRef(null);
  const saveTimers     = useRef({});

  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const publicUrl = `${origin}/pro/${website.slug}`;

  const flash = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(''), 2200); }, []);

  useEffect(() => {
    fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
  }, []);

  useEffect(() => {
    if (!isDemoMode) return;
    try {
      const raw = localStorage.getItem(DEMO_WB_LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.sections) setSections(saved.sections);
      if (saved.theme)    setTheme(saved.theme);
    } catch {}
  }, []); // eslint-disable-line

  const checkSettingsSlug = useCallback((slug) => {
    clearTimeout(slugCheckTimer.current);
    setSlugResult(null);
    if (!slug || slug.length < 3 || slug === website.slug) return;
    setSlugChecking(true);
    slugCheckTimer.current = setTimeout(async () => {
      try { const r = await fetch(`/api/website/slug-check?slug=${encodeURIComponent(slug)}`); setSlugResult(await r.json()); }
      finally { setSlugChecking(false); }
    }, 500);
  }, [website.slug]);

  const updateTheme = async (next) => {
    setTheme(next);
    if (isDemoMode) { try { localStorage.setItem(DEMO_WB_LS_KEY, JSON.stringify({ sections, theme: next })); } catch {} flash(t('designModified')); return; }
    try { const r = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ theme: next }) }); if (r.ok) flash(t('designSaved')); } catch {}
  };

  const updateSection = (updated) => {
    setSections(prev => {
      const next = prev.map(s => s.section_type === updated.section_type ? updated : s);
      if (isDemoMode) { try { localStorage.setItem(DEMO_WB_LS_KEY, JSON.stringify({ sections: next, theme })); } catch {} }
      return next;
    });
    if (isDemoMode) return;
    clearTimeout(saveTimers.current[updated.section_type]);
    saveTimers.current[updated.section_type] = setTimeout(async () => {
      try { const r = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections: [updated] }) }); if (r.ok) flash(t('changesSaved')); } catch {}
    }, 700);
  };

  const handlePublish = async () => {
    if (isDemoMode) { flash(t('demoPublishUnavailable')); return; }
    setShowPublishWarning(false);
    setPublishing(true);
    try {
      const sr = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sections }) });
      if (!sr.ok) return;
      const pr = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'publish' }) });
      const d = await pr.json();
      if (pr.ok) { setWebsite(d.website); setSections(d.sections); flash(t('published')); setOpenSheet(null); }
    } finally { setPublishing(false); }
  };

  const handleUnpublish = async () => {
    if (isDemoMode) { flash(t('demoPublishUnavailable')); return; }
    setPublishing(true);
    try {
      const r = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'unpublish' }) });
      const d = await r.json();
      if (r.ok) { setWebsite(d.website); setSections(d.sections); flash(t('unpublished')); }
    } finally { setPublishing(false); }
  };

  const handleSaveSlug = async () => {
    if (isDemoMode) { flash(t('demoUnavailable')); return; }
    if (!settingsSlug || settingsSlug.length < 3) { setSlugSaveErr(t('slugTooShort')); return; }
    if (settingsSlug === website.slug) return;
    if (slugResult && !slugResult.available) { setSlugSaveErr(t('slugAlreadyTaken')); return; }
    setSlugSaving(true); setSlugSaveErr(''); setSlugSaveOk(false);
    try {
      const r = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_slug', slug: settingsSlug }) });
      const d = await r.json();
      if (!r.ok) { setSlugSaveErr(d.error || t('savingError')); return; }
      setWebsite(d.website); setSlugSaveOk(true); setSlugResult(null);
      flash(t('changesSaved'));
      setTimeout(() => setSlugSaveOk(false), 3000);
    } catch { setSlugSaveErr(t('networkRetry')); }
    finally { setSlugSaving(false); }
  };

  const handleSaveTrade = async (newTradeId) => {
    if (isDemoMode) { flash(t('demoUnavailable')); return; }
    setSettingsTradeId(newTradeId);
    try {
      const r = await fetch('/api/website', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trade_id: newTradeId || null }) });
      const d = await r.json();
      if (r.ok) { setWebsite(d.website); flash(t('changesSaved')); }
    } catch {}
  };

  const copyUrl = () => { navigator.clipboard?.writeText(publicUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  const isPublished = website.status === 'published';
  const enabledCount = sections.filter(s => s.enabled).length;
  const currentScheme = COLOR_SCHEMES[theme.color_scheme || 'classic'];

  // Pod subtitles
  const contentSub = t('sectionsActiveSub', { count: enabledCount });
  const designSub  = currentScheme?.name || 'Classic';
  const publishSub = isPublished ? t('statusLive') : website.slug ? `okosszaki.hu/pro/${website.slug}` : t('statusNotPublished');

  return (
    <div style={{ minHeight: '100dvh', background: DEEP, color: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes wbspin{to{transform:rotate(360deg)}}
        .m-editor .form-label {
          display: block;
          font-size: 12px;
          font-weight: 700;
          color: #5A5F68;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 6px;
        }
        .m-editor .form-group { margin: 0; }
        .m-editor .form-control {
          width: 100%;
          box-sizing: border-box;
          height: 56px;
          border: 0;
          border-radius: 20px;
          font-size: 17px;
          font-weight: 500;
          color: #0E1116;
          padding: 0 16px;
          background: #fff;
          outline: none;
          box-shadow: 0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4);
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .m-editor textarea.form-control {
          height: auto;
          min-height: 110px;
          padding: 14px 16px;
          resize: vertical;
          line-height: 1.5;
        }
        .m-editor .form-control:focus { outline: none; }
        .m-editor .form-control:disabled { opacity: 0.45; }
        .m-editor .btn {
          height: 48px;
          border: none;
          border-radius: 24px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 0 20px;
          font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
        }
        .m-editor .btn-secondary { background: #EFEDE6; color: #0E1116; }
        .m-editor .btn-primary   { background: #1A3A5C; color: #fff; }
        .m-editor .btn-danger    { background: #FDECEC; color: #B71C1C; }
        .m-editor .btn-sm        { height: 40px; font-size: 13px; padding: 0 14px; border-radius: 20px; }
        .m-editor .btn:disabled  { opacity: 0.5; cursor: default; }
      `}</style>
      <Toast msg={toast} />
      {showQr && <QrModal url={publicUrl} onClose={() => setShowQr(false)} />}
      {bannerPickerOpen && (
        <ImagePickerModal
          tradeId={website.trade_id}
          selectedImageId={theme.banners?.[bannerPickerIndex]?.image_id}
          orientation="horizontal"
          onSelect={img => { const next = [...(theme.banners || [null, null])]; next[bannerPickerIndex] = { image_id: img.id, image_url: img.url }; updateTheme({ ...theme, banners: next }); setBannerPickerOpen(false); }}
          onClose={() => setBannerPickerOpen(false)}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 22px', borderRadius: '0 0 32px 32px', background: HDR, color: '#fff', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span aria-hidden style={{ position: 'absolute', right: -80, top: -100, width: 260, height: 260, borderRadius: 130, background: 'rgba(255,255,255,0.07)' }} />

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => router.push(p('/dashboard'))} aria-label="Vissza" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, cursor: 'pointer' }}>
            <ChevL />
          </button>
          <span style={{ height: 32, padding: '0 12px', borderRadius: 16, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: isPublished ? '#14532D' : 'rgba(255,255,255,0.18)' }}>
            {isPublished ? t('statusLive') : t('statusNotPublished')}
          </span>
          <a href={`/pro/${website.slug}?preview=1`} target="_blank" rel="noopener noreferrer"
            style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <EyeSvg />
          </a>
        </div>

        <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>{t('websiteLabel')}</span>
        <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
          {t('pageHeading')}
        </h1>

        {/* URL strip */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.13)', borderRadius: 16, padding: '8px 12px', marginTop: 2 }}>
          <GlobeSvg />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: 0.9 }}>
            okosszaki.hu/pro/{website.slug}
          </span>
          <button onClick={copyUrl} style={{ background: 'none', border: 0, color: '#fff', cursor: 'pointer', padding: 4, display: 'flex', flexShrink: 0, opacity: copied ? 1 : 0.75 }}>
            {copied ? <CheckSvg /> : <CopySvg />}
          </button>
          {isPublished && (
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#fff', display: 'flex', flexShrink: 0, opacity: 0.75 }}><ExtSvg /></a>
          )}
        </div>
      </header>

      {/* ── Pods ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 16px 120px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Group 1 — Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PodGroupHeader title={t('tabSections')} desc={t('podContentDesc')} />
          <Pod
            accent={HDR}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 12h6M9 16h4"/></svg>}
            title={t('tabSections')}
            subtitle={contentSub}
            onClick={() => setOpenSheet('content')}
          />
        </div>

        {/* Group 2 — Design */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PodGroupHeader title={t('tabDesign')} desc={t('podDesignDesc')} />
          <Pod
            accent="#3B4A6B"
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3" fill="#fff" stroke="none"/></svg>}
            title={t('tabDesign')}
            subtitle={designSub}
            onClick={() => setOpenSheet('design')}
          />
        </div>

        {/* Group 3 — Settings & Publish */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <PodGroupHeader title={t('tabSettings')} desc={t('podPublishDesc')} />
          <Pod
            accent={isPublished ? '#14532D' : '#7A3300'}
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>}
            title={t('tabSettings') + ' & ' + t('publishButton')}
            subtitle={publishSub}
            onClick={() => setOpenSheet('publish')}
          />
        </div>

      </div>

      {/* ── Publish / Unpublish FAB ──────────────────────────────────────── */}
      <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `20px 16px calc(18px + env(safe-area-inset-bottom))`, background: `linear-gradient(to top, ${DEEP} 60%, transparent)` }}>
        {isPublished ? (
          <button onClick={handleUnpublish} disabled={publishing}
            style={{ width: '100%', height: 60, border: '2px solid rgba(255,255,255,0.35)', borderRadius: 30, background: 'transparent', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: publishing ? 0.7 : 1 }}>
            {publishing ? <SpinSvg /> : null}{t('draftButton')}
          </button>
        ) : (
          <button onClick={() => website.is_premium ? handlePublish() : setShowPublishWarning(true)} disabled={publishing}
            style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: HDR, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: publishing ? 0.7 : 1, boxShadow: '0 14px 26px -12px rgba(14,17,22,0.3)' }}>
            {publishing ? <SpinSvg s={18} /> : <GlobeSvg />}{t('publishButton')}
          </button>
        )}
      </div>

      {/* ── Sheet 1: Content ─────────────────────────────────────────────── */}
      <Sheet open={openSheet === 'content'} onClose={() => setOpenSheet(null)} title={t('tabSections')}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>
          {t('sectionsTabDesc')}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sections.map(section => (
            <MobileSectionCard
              key={section.section_type}
              section={section}
              isPremium={website.is_premium}
              expanded={expandedSection === section.section_type}
              onToggleExpand={() => setExpandedSection(prev => prev === section.section_type ? null : section.section_type)}
              onChange={updateSection}
              tradeId={website.trade_id}
            />
          ))}
        </div>
      </Sheet>

      {/* ── Sheet 2: Design ──────────────────────────────────────────────── */}
      <Sheet open={openSheet === 'design'} onClose={() => setOpenSheet(null)} title={t('tabDesign')}>

        {/* Color scheme */}
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98' }}>{t('colorSchemeHeading')}</span>
        {[
          { label: t('colorSchemeDark'),  keys: ['classic','ocean','forest','rust','steel','black'] },
          { label: t('colorSchemeLight'), keys: ['classic_light','ocean_light','forest_light','rust_light','steel_light','white'] },
        ].map(group => (
          <div key={group.label}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#8A8F98', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10 }}>{group.label}</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {group.keys.map(key => {
                const scheme = COLOR_SCHEMES[key]; if (!scheme) return null;
                const sel = (theme.color_scheme || 'classic') === key;
                return (
                  <button key={key} type="button" onClick={() => updateTheme({ ...theme, color_scheme: key })}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    <span style={{ width: 52, height: 52, borderRadius: 14, display: 'flex', overflow: 'hidden', border: `3px solid ${sel ? HDR : '#E8E5DF'}`, boxSizing: 'border-box' }}>
                      <span style={{ flex: 1, background: scheme.preview[0] }} />
                      <span style={{ width: 14, background: scheme.preview[1] }} />
                    </span>
                    <span style={{ fontSize: 11, fontWeight: sel ? 700 : 500, color: sel ? HDR : '#8A8F98', whiteSpace: 'nowrap' }}>
                      {scheme.name.replace(' Dark','').replace(' Light','')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Typography */}
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98', marginTop: 4 }}>{t('typographyHeading')}</span>
        {Object.entries(TYPOGRAPHY).map(([key, typo]) => {
          const sel = (theme.typography || 'modern') === key;
          return (
            <button key={key} type="button" onClick={() => updateTheme({ ...theme, typography: key })}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px', border: `2px solid ${sel ? HDR : '#E8E5DF'}`, borderRadius: 20, background: sel ? '#F0F4FA' : '#fff', cursor: 'pointer', textAlign: 'left' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#0E1116' }}>{typo.name}</p>
                <p style={{ margin: 0, fontSize: 13, color: '#5A5F68' }}>{typo.description}</p>
              </div>
              <span style={{ fontSize: 22, fontFamily: typo.headingFont, fontWeight: typo.headingWeight, color: sel ? HDR : '#8A8F98', flexShrink: 0 }}>Aa</span>
            </button>
          );
        })}

        {/* Banners */}
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98', marginTop: 4 }}>{t('bannerImagesHeading')}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>
          {website.is_premium ? t('bannerImagesPremiumDesc') : t('bannerImagesFreeDesc')}
        </span>
        {[...Array(website.is_premium ? 2 : 1)].map((_, idx) => {
          const banner = theme.banners?.[idx];
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#8A8F98', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('bannerLabel', { n: idx + 1 })}</span>
              {banner?.image_url ? (
                <>
                  <img src={banner.image_url} alt="" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', borderRadius: 16, border: '1.5px solid #E8E5DF' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="button" onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }}
                      style={{ flex: 1, height: 48, border: 0, borderRadius: 24, background: HDR, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                      <ImgSvg />{t('bannerSwap')}
                    </button>
                    <button type="button" onClick={() => { const next = [...(theme.banners || [])]; next[idx] = null; updateTheme({ ...theme, banners: next }); }}
                      style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#FDECEC', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                      <TrashSvg />
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }}
                  style={{ minHeight: 80, border: '2px dashed #D5D2C8', borderRadius: 20, background: 'transparent', color: '#44413B', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <ImgSvg />{t('bannerSelectImage')}
                </button>
              )}
            </div>
          );
        })}
      </Sheet>

      {/* ── Sheet 3: Publish / Settings ──────────────────────────────────── */}
      <Sheet open={openSheet === 'publish'} onClose={() => setOpenSheet(null)} title={t('tabSettings') + ' & ' + t('publishButton')}>

        {/* Slug */}
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98' }}>{t('publicUrlHeading')}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>okosszaki.hu/pro/<b style={{ color: '#0E1116' }}>{settingsSlug || website.slug}</b></span>
        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #E8E5DF', borderRadius: 16, background: '#fff', overflow: 'hidden' }}>
          <span style={{ padding: '0 12px', fontSize: 13, fontWeight: 600, color: '#5A5F68', borderRight: '1px solid #E8E5DF', whiteSpace: 'nowrap', flexShrink: 0, height: 52, display: 'flex', alignItems: 'center' }}>/pro/</span>
          <input value={settingsSlug} onChange={e => { const v = toSlug(e.target.value) || e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,''); setSettingsSlug(v); setSlugSaveErr(''); setSlugSaveOk(false); checkSettingsSlug(v); }}
            placeholder="pl. kovacs-peter" style={{ flex: 1, border: 0, background: 'transparent', outline: 'none', padding: '0 14px', fontSize: 16, fontWeight: 500, color: '#0E1116', height: 52 }} />
          {slugChecking && <SpinSvg s={16} />}
          {!slugChecking && slugResult && settingsSlug !== website.slug && (
            slugResult.available
              ? <span style={{ color: '#14532D', marginRight: 10, fontSize: 20 }}>✓</span>
              : <span style={{ color: '#B71C1C', marginRight: 10, fontSize: 20 }}>✗</span>
          )}
        </div>
        {slugSaveErr && <span style={{ fontSize: 13, fontWeight: 700, color: '#B71C1C' }}>{slugSaveErr}</span>}
        {slugResult?.available && settingsSlug !== website.slug && !slugSaveErr && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#14532D' }}>{t('slugAvailable')}</span>
        )}
        <button onClick={handleSaveSlug} disabled={slugSaving || settingsSlug === website.slug || settingsSlug.length < 3 || (slugResult !== null && !slugResult.available)}
          style={{ height: 52, border: 0, borderRadius: 26, background: HDR, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: (slugSaving || settingsSlug === website.slug) ? 0.5 : 1 }}>
          {slugSaving ? <SpinSvg s={16} /> : <CheckSvg />}
          {slugSaving ? t('slugSavingButton') : slugSaveOk ? t('slugSavedButton') : t('slugSaveButton')}
        </button>

        {/* Trade */}
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#8A8F98', marginTop: 8 }}>{t('tradeHeading')}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.5 }}>{t('tradeDesc')}</span>
        {[{ id: '', name_hu: t('tradeGeneral') }, ...trades].map(trade => {
          const sel = settingsTradeId === trade.id;
          return (
            <button key={trade.id} type="button" onClick={() => handleSaveTrade(trade.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', border: `2px solid ${sel ? HDR : '#E8E5DF'}`, borderRadius: 20, background: sel ? '#F0F4FA' : '#fff', color: sel ? HDR : '#0E1116', fontSize: 15, fontWeight: sel ? 700 : 600, cursor: 'pointer', textAlign: 'left' }}>
              <span>{trade.name_hu}</span>
              {sel && <CheckSvg />}
            </button>
          );
        })}

        {/* Publish toggle */}
        <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 20, background: isPublished ? '#E7F4EC' : '#FFF4E5', border: `1.5px solid ${isPublished ? '#86EFAC' : '#FDE68A'}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: isPublished ? '#14532D' : '#7A3300' }}>
            {isPublished ? t('statusLive') : t('statusNotPublished')}
          </span>
          <span style={{ fontSize: 13, fontWeight: 600, color: isPublished ? '#166534' : '#92400E', lineHeight: 1.5 }}>
            {isPublished ? `okosszaki.hu/pro/${website.slug}` : t('notPublicDesc')}
          </span>
          {isPublished ? (
            <button onClick={handleUnpublish} disabled={publishing}
              style={{ height: 52, border: 0, borderRadius: 26, background: '#B71C1C', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', opacity: publishing ? 0.7 : 1 }}>
              {publishing ? tc('saving') : t('draftButton')}
            </button>
          ) : (
            <button onClick={() => website.is_premium ? handlePublish() : setShowPublishWarning(true)} disabled={publishing}
              style={{ height: 52, border: 0, borderRadius: 26, background: HDR, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: publishing ? 0.7 : 1 }}>
              {publishing ? <SpinSvg s={16} /> : <GlobeSvg />}{t('publishButton')}
            </button>
          )}
        </div>
      </Sheet>

      {/* ── Publish warning sheet ─────────────────────────────────────────── */}
      <Sheet open={showPublishWarning} onClose={() => setShowPublishWarning(false)} title={t('freePlanWarningTitle')} z={60}>
        <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.5, color: '#0E1116' }}>{t('freePlanWarningBody1')}</span>
        <div style={{ padding: '12px 14px', borderRadius: 14, background: '#F5F4F0', fontSize: 14, fontWeight: 600, color: '#0E1116', lineHeight: 1.6 }}>{t('freePlanFreeSections')}</div>
        <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: '#5A5F68' }}>{t('freePlanWarningBody2')}</span>
        <button onClick={handlePublish} disabled={publishing}
          style={{ height: 60, border: 0, borderRadius: 30, background: HDR, color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {publishing ? <SpinSvg /> : <GlobeSvg />}{t('publishAnywayButton')}
        </button>
        <button onClick={() => setShowPublishWarning(false)}
          style={{ height: 56, border: 0, borderRadius: 28, background: '#EFEDE6', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>{tc('cancel')}</button>
      </Sheet>
    </div>
  );
}
