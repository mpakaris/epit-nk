'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { COLOR_SCHEMES, TYPOGRAPHY } from '@/lib/websiteThemes';
import { podColor } from '@/lib/podColor';
import Modal from '@/components/Modal';
import { SECTION_META } from '../components/SectionCard';
import SectionContentEditor from '../components/SectionContentEditor';
import QrModal from '../components/QrModal';
import ImagePickerModal from '../components/ImagePickerModal';
import {
  Globe, Check, X, Loader2, AlertTriangle, ExternalLink, Eye,
  CheckCircle2, Copy, QrCode, Trash2, Image as ImageIcon, ChevronDown,
} from 'lucide-react';

const DEMO_WB_LS_KEY = 'okosszaki_demo_website_builder';

function SectionHeader({ children }) {
  return (
    <h2 style={{
      margin: '0 0 10px 2px',
      fontFamily: "'Bricolage Grotesque', sans-serif",
      fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff',
    }}>
      {children}
    </h2>
  );
}

function PanelKicker({ children }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '0.07em',
      textTransform: 'uppercase', color: '#8A8F98', marginBottom: 10,
    }}>
      {children}
    </div>
  );
}

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

function DkSectionCard({ section, isPremium, expanded, onToggleExpand, onChange, tradeId, navPrefix }) {
  const t    = useTranslations('website');
  const meta = SECTION_META[section.section_type] || {};
  const Icon = meta.icon;
  const color  = SECTION_COLORS[section.section_type] || '#374151';
  const locked = !SECTION_FREE.has(section.section_type) && !isPremium;

  const labels = {
    hero: t('sectionHeroLabel'), about: t('sectionAboutLabel'), services: t('sectionServicesLabel'),
    certifications: t('sectionCertificationsLabel'), gallery: t('sectionGalleryLabel'),
    pricing: t('sectionPricingLabel'), testimonials: t('sectionTestimonialsLabel'),
    faq: t('sectionFaqLabel'), service_area: t('sectionServiceAreaLabel'), contact: t('sectionContactLabel'),
  };
  const descs = {
    hero: t('sectionHeroDesc'), about: t('sectionAboutDesc'), services: t('sectionServicesDesc'),
    certifications: t('sectionCertificationsDesc'), gallery: t('sectionGalleryDesc'),
    pricing: t('sectionPricingDesc'), testimonials: t('sectionTestimonialsDesc'),
    faq: t('sectionFaqDesc'), service_area: t('sectionServiceAreaDesc'), contact: t('sectionContactDesc'),
  };
  const label = labels[section.section_type] || section.section_type;
  const desc  = descs[section.section_type] || '';

  return (
    <div className="dk-card" style={{ overflow: 'hidden' }}>

      {/* ── Header row ── */}
      <div
        role="button" tabIndex={0}
        onClick={onToggleExpand}
        onKeyDown={e => e.key === 'Enter' && onToggleExpand()}
        style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', userSelect: 'none' }}
      >
        {/* Coloured icon */}
        <span style={{ width: 44, height: 44, borderRadius: 14, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {Icon && <Icon size={20} color="#fff" strokeWidth={1.8} />}
        </span>

        {/* Label + description */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#0E1116', lineHeight: 1.2 }}>{label}</span>
            {locked && (
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 99, background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE68A' }}>
                {t('premiumBadge')}
              </span>
            )}
          </div>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#5A5F68', marginTop: 2, lineHeight: 1.35 }}>{desc}</span>
        </div>

        {/* Pill toggle */}
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onChange({ ...section, enabled: !section.enabled }); }}
          style={{
            width: 44, height: 26, borderRadius: 13, border: 0, padding: 3,
            cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0,
            transition: 'background 0.2s',
            background: section.enabled ? '#0E1116' : '#D5D2C8',
          }}
        >
          <span style={{
            width: 20, height: 20, borderRadius: 10, background: '#fff',
            display: 'block', flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
            transition: 'transform 0.2s',
            transform: section.enabled ? 'translateX(18px)' : 'translateX(0)',
          }} />
        </button>

        {/* Expand chevron */}
        <span style={{ color: '#8A8F98', display: 'flex', transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
          <ChevronDown size={18} />
        </span>
      </div>

      {/* ── Expanded content ── */}
      {expanded && (
        locked ? (
          <div style={{ borderTop: '1px solid #EDEBE5', background: '#fff', padding: '20px 32px', display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#854D0E' }}>
              {t('premiumLockedTitle')}
            </span>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#5A5F68', lineHeight: 1.5 }}>
              {t('premiumLockedDesc')}
            </p>
            <a
              href={`${navPrefix}/elofizetes`}
              style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: '#1A3A5C', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
            >
              {t('premiumLockedBtn')}
            </a>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid #EDEBE5', background: '#F9F8F5', padding: '20px 32px' }}>
            <SectionContentEditor section={section} onChange={onChange} isPremium={isPremium} tradeId={tradeId} />
          </div>
        )
      )}
    </div>
  );
}

export default function WebsiteDesktop({ website: initialWebsite, sections: initialSections, userEmail }) {
  const t      = useTranslations('website');
  const tc     = useTranslations('common');
  const locale = useLocale();

  const [website,  setWebsite]  = useState(initialWebsite);
  const [sections, setSections] = useState(initialSections);
  const { isDemoMode, activeCollectiveId } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';
  const wsStyle = activeCollectiveId
    ? { '--dk-c': podColor(activeCollectiveId).deep, '--dk-deep': podColor(activeCollectiveId).deep }
    : {};

  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [expandedSection,    setExpandedSection]    = useState(null);
  const [publishing,         setPublishing]         = useState(false);
  const [error,              setError]              = useState('');
  const [copied,             setCopied]             = useState(false);
  const [showQr,             setShowQr]             = useState(false);

  const [theme, setTheme] = useState(website.theme || { color_scheme: 'classic', typography: 'modern' });

  // Settings
  const [trades,          setTrades]          = useState([]);
  const [settingsTradeId, setSettingsTradeId] = useState(initialWebsite.trade_id || '');
  const [customTrade,     setCustomTrade]     = useState(initialWebsite.custom_trade || '');
  const [tradeSaving,     setTradeSaving]     = useState(false);
  const [tradeSaveOk,     setTradeSaveOk]     = useState(false);
  const [bannerPickerOpen,  setBannerPickerOpen]  = useState(false);
  const [bannerPickerIndex, setBannerPickerIndex] = useState(0);

  const isTestUser = userEmail === 'testo@testo.com';
  const [testPremium, setTestPremium] = useState(website.is_premium || false);
  const isPremium = isTestUser ? testPremium : (website.is_premium || false);

  const saveTimers = useRef({});
  const [toast, setToast] = useState(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = `${origin}/pro/${website.slug}`;

  const showToast = useCallback((message) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 2200);
  }, []);

  useEffect(() => {
    fetch(`/api/trades?locale=${locale}`).then(r => r.json()).then(d => setTrades(d.trades || []));
  }, [locale]);

  useEffect(() => {
    if (!isDemoMode) return;
    try {
      const raw = localStorage.getItem(DEMO_WB_LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.sections) setSections(saved.sections); // eslint-disable-line
      if (saved.theme)    setTheme(saved.theme);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTheme = async (next) => {
    setTheme(next);
    if (isDemoMode) {
      try { localStorage.setItem(DEMO_WB_LS_KEY, JSON.stringify({ sections, theme: next })); } catch {}
      showToast(t('designModified'));
      return;
    }
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      });
      if (r.ok) showToast(t('designSaved'));
    } catch {}
  };

  const updateSection = (updated) => {
    setSections(prev => {
      const next = prev.map(s => s.section_type === updated.section_type ? updated : s);
      if (isDemoMode) {
        try { localStorage.setItem(DEMO_WB_LS_KEY, JSON.stringify({ sections: next, theme })); } catch {}
      }
      return next;
    });
    if (isDemoMode) return;
    clearTimeout(saveTimers.current[updated.section_type]);
    saveTimers.current[updated.section_type] = setTimeout(async () => {
      try {
        const r = await fetch('/api/website', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sections: [updated] }),
        });
        if (r.ok) showToast(t('changesSaved'));
      } catch {}
    }, 700);
  };

  const handlePublishClick = () => {
    if (!isPremium) { setShowPublishWarning(true); return; }
    handlePublish();
  };

  const handlePublish = async () => {
    if (isDemoMode) { showToast(t('demoPublishUnavailable')); return; }
    setShowPublishWarning(false);
    setPublishing(true);
    setError('');
    try {
      const sr = await fetch('/api/website', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!sr.ok) { const d = await sr.json(); setError(d.error || t('saveError')); return; }
      const pr = await fetch('/api/website', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const d = await pr.json();
      if (!pr.ok) { setError(d.error || t('publishError')); return; }
      setWebsite(d.website);
      setSections(d.sections);
    } catch { setError(t('networkError')); }
    finally { setPublishing(false); }
  };

  const handleUnpublish = async () => {
    if (isDemoMode) { showToast(t('demoPublishUnavailable')); return; }
    setPublishing(true);
    try {
      const r = await fetch('/api/website', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      });
      const d = await r.json();
      if (r.ok) { setWebsite(d.website); setSections(d.sections); }
    } catch {}
    finally { setPublishing(false); }
  };

  const handleSaveTrade = async (newTradeId) => {
    if (isDemoMode) { showToast(t('demoUnavailable')); return; }
    setSettingsTradeId(newTradeId);
    setCustomTrade('');
    setTradeSaving(true); setTradeSaveOk(false);
    try {
      const r = await fetch('/api/website', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_id: newTradeId || null, custom_trade: null }),
      });
      const d = await r.json();
      if (r.ok) {
        setWebsite(d.website);
        setTradeSaveOk(true);
        setTimeout(() => setTradeSaveOk(false), 2000);
      }
    } catch {}
    finally { setTradeSaving(false); }
  };

  const handleSaveCustomTrade = async () => {
    if (isDemoMode) { showToast(t('demoUnavailable')); return; }
    if (!customTrade.trim()) return;
    setSettingsTradeId('');
    try {
      const r = await fetch('/api/website', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_id: null, custom_trade: customTrade.trim() }),
      });
      const d = await r.json();
      if (r.ok) { setWebsite(d.website); showToast(t('changesSaved')); }
    } catch {}
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPublished        = website.status === 'published';
  const wasPreviouslyPublished = !isPublished && !!website.published_at;

  return (
    <div className="dk-page dk-mod-weboldalam" style={wsStyle}>

      {/* QR and banner image modals */}
      {showQr && <QrModal url={publicUrl} onClose={() => setShowQr(false)} />}
      {bannerPickerOpen && (
        <ImagePickerModal
          tradeId={website.trade_id}
          selectedImageId={theme.banners?.[bannerPickerIndex]?.image_id}
          orientation="horizontal"
          onSelect={img => {
            const next = [...(theme.banners || [null, null])];
            next[bannerPickerIndex] = { image_id: img.id, image_url: img.url };
            updateTheme({ ...theme, banners: next });
            setBannerPickerOpen(false);
          }}
          onClose={() => setBannerPickerOpen(false)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <span className="dk-kick">{t('websiteLabel')}</span>
          <h1 className="dk-h1">{t('pageHeading')}</h1>
        </div>

        {/* Status badge */}
        <span style={{
          height: 32, padding: '0 14px', borderRadius: 16, fontSize: 12, fontWeight: 700,
          display: 'inline-flex', alignItems: 'center', flexShrink: 0, whiteSpace: 'nowrap',
          background: isPublished ? '#14532D' : 'rgba(255,255,255,0.14)',
          color: isPublished ? '#fff' : 'rgba(255,255,255,0.75)',
        }}>
          {isPublished ? t('statusLive') : wasPreviouslyPublished ? t('statusDraftWasLive') : t('statusNotPublished')}
        </span>

        {/* Publish / Draft action */}
        <div style={{ flexShrink: 0 }}>
          {isPublished ? (
            <button type="button" className="dk-btn dk-btn-w" onClick={handleUnpublish} disabled={publishing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 44, fontSize: 14 }}>
              {publishing ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
              {t('draftButton')}
            </button>
          ) : (
            <button type="button" className="dk-btn dk-btn-w" onClick={handlePublishClick} disabled={publishing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 44, fontSize: 14 }}>
              {publishing ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
              {t('publishButton')}
            </button>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────────── */}
      <div className="dk-body">

        {/* Error banner */}
        {error && (
          <div style={{
            background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
            color: 'var(--danger-text)', borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem', fontSize: '0.825rem',
            marginBottom: 16, display: 'flex', gap: 6, alignItems: 'center',
          }}>
            <AlertTriangle size={14} /> {error}
          </div>
        )}

        {/* Two-column layout */}
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

          {/* ── LEFT: Sections ─────────────────────────────────────────────────── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SectionHeader>{t('tabSections')}</SectionHeader>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sections.map(section => (
                <DkSectionCard
                  key={section.section_type}
                  section={section}
                  isPremium={isPremium}
                  expanded={expandedSection === section.section_type}
                  onToggleExpand={() => setExpandedSection(prev =>
                    prev === section.section_type ? null : section.section_type
                  )}
                  onChange={updateSection}
                  tradeId={website.trade_id}
                  navPrefix={navPrefix}
                />
              ))}
            </div>
          </div>

          {/* ── RIGHT: Link + Design + Settings ────────────────────────────────── */}
          <div style={{ width: 400, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20, alignSelf: 'flex-start' }}>

            {/* Link & preview card */}
            <div>
              <SectionHeader>{t('publicUrlHeading')}</SectionHeader>
              <div className="dk-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* URL row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F5F4F0', borderRadius: 14, padding: '0 14px', height: 44 }}>
                  <Globe size={14} style={{ color: '#5A5F68', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: '#0E1116', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    okosszaki.hu/pro/{website.slug}
                  </span>
                  <button
                    type="button" onClick={copyUrl} title={t('copyLinkTitle')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#5A5F68', display: 'flex', flexShrink: 0 }}
                  >
                    {copied ? <Check size={14} style={{ color: 'var(--success-text)' }} /> : <Copy size={14} />}
                  </button>
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={`/pro/${website.slug}?preview=1`}
                    target="_blank" rel="noopener noreferrer"
                    className="dk-btn dk-btn-l"
                    style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}
                  >
                    <Eye size={15} /> {t('previewButton')}
                  </a>
                  <button
                    type="button" onClick={() => setShowQr(true)}
                    className="dk-btn dk-btn-l"
                    style={{ flex: 1, justifyContent: 'center', fontSize: 13 }}
                  >
                    <QrCode size={15} /> {t('qrCodeTitle')}
                  </button>
                  {isPublished && (
                    <a
                      href={publicUrl} target="_blank" rel="noopener noreferrer"
                      className="dk-btn dk-btn-l"
                      style={{ flex: 1, justifyContent: 'center', textDecoration: 'none', fontSize: 13 }}
                    >
                      <ExternalLink size={15} /> {t('openSiteButton')}
                    </a>
                  )}
                </div>

              </div>
            </div>

            {/* Design card */}
            <div>
              <SectionHeader>{t('tabDesign')}</SectionHeader>
              <div className="dk-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Color scheme */}
                <div>
                  <PanelKicker>{t('colorSchemeHeading')}</PanelKicker>
                  {[
                    { label: t('colorSchemeDark'),  keys: ['classic','ocean','forest','rust','steel','black'] },
                    { label: t('colorSchemeLight'), keys: ['classic_light','ocean_light','forest_light','rust_light','steel_light','white'] },
                  ].map(group => (
                    <div key={group.label} style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                        {group.label}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {group.keys.map(key => {
                          const scheme = COLOR_SCHEMES[key];
                          if (!scheme) return null;
                          const isSelected = (theme.color_scheme || 'classic') === key;
                          return (
                            <button
                              key={key} type="button"
                              onClick={() => updateTheme({ ...theme, color_scheme: key })}
                              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                            >
                              <span style={{
                                width: 44, height: 44, borderRadius: 11, display: 'flex', overflow: 'hidden',
                                border: `2.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                                boxShadow: isSelected ? '0 0 0 3px var(--primary-bg, #eff6ff)' : 'none',
                              }}>
                                <span style={{ flex: 1, background: scheme.preview[0] }} />
                                <span style={{ width: 12, background: scheme.preview[1] }} />
                              </span>
                              <span style={{ fontSize: 10, fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                {scheme.name.replace(' Dark','').replace(' Light','')}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Typography */}
                <div>
                  <PanelKicker>{t('typographyHeading')}</PanelKicker>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {Object.entries(TYPOGRAPHY).map(([key, typo]) => {
                      const isSelected = (theme.typography || 'modern') === key;
                      return (
                        <button
                          key={key} type="button"
                          onClick={() => updateTheme({ ...theme, typography: key })}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            gap: 10, padding: '12px 14px',
                            border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                            borderRadius: 16,
                            background: isSelected ? 'var(--primary-bg, #eff6ff)' : 'var(--bg-subtle)',
                            cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{typo.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{typo.description}</div>
                          </div>
                          <span style={{
                            fontSize: 20, fontFamily: typo.headingFont, fontWeight: typo.headingWeight,
                            color: isSelected ? 'var(--primary)' : 'var(--text-muted)', flexShrink: 0,
                          }}>
                            Aa
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Banner images */}
                <div>
                  <PanelKicker>{t('bannerImagesHeading')}</PanelKicker>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                    {isPremium ? t('bannerImagesPremiumDesc') : t('bannerImagesFreeDesc')}
                  </div>
                  {[...Array(isPremium ? 2 : 1)].map((_, idx) => {
                    const banner = theme.banners?.[idx];
                    return (
                      <div key={idx} style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                          {t('bannerLabel', { n: idx + 1 })}
                        </div>
                        {banner?.image_url ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <img
                              src={banner.image_url} alt=""
                              style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border-subtle)' }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button type="button"
                                onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }}
                                style={{ flex: 1, height: 36, border: 0, borderRadius: 18, background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                              >
                                <ImageIcon size={13} /> {t('bannerSwap')}
                              </button>
                              <button type="button"
                                onClick={() => { const next = [...(theme.banners || [])]; next[idx] = null; updateTheme({ ...theme, banners: next }); }}
                                style={{ width: 36, height: 36, border: 0, borderRadius: 18, background: 'var(--danger-bg)', color: 'var(--danger-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button type="button"
                            onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }}
                            style={{ width: '100%', minHeight: 72, border: '2px dashed var(--border-subtle)', borderRadius: 14, background: 'transparent', color: 'var(--text-muted)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                          >
                            <ImageIcon size={15} /> {t('bannerSelectImage')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

            {/* Settings card */}
            <div>
              <SectionHeader>{t('tabSettings')}</SectionHeader>
              <div className="dk-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Trade */}
                <div>
                  <PanelKicker>{t('tradeHeading')}</PanelKicker>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {[{ id: '', name: t('tradeGeneral') }, ...trades].map(trade => {
                      const sel = !customTrade && settingsTradeId === trade.id;
                      return (
                        <button
                          key={trade.id} type="button"
                          onClick={() => handleSaveTrade(trade.id)}
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '10px 14px', border: 0, borderRadius: 12,
                            background: sel ? '#0E1116' : '#F5F4F0',
                            color: sel ? '#fff' : '#0E1116',
                            fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <span>{trade.name}</span>
                          {sel && (tradeSaveOk
                            ? <CheckCircle2 size={14} style={{ color: '#5DDC96', flexShrink: 0 }} />
                            : <Check size={14} style={{ flexShrink: 0 }} />
                          )}
                        </button>
                      );
                    })}

                    {/* Custom trade input */}
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 0,
                      background: customTrade ? '#0E1116' : '#F5F4F0',
                      borderRadius: 12, overflow: 'hidden', paddingLeft: 14,
                    }}>
                      <input
                        value={customTrade}
                        onChange={e => setCustomTrade(e.target.value)}
                        onBlur={handleSaveCustomTrade}
                        onKeyDown={e => e.key === 'Enter' && handleSaveCustomTrade()}
                        placeholder={t('tradeCustomPlaceholder')}
                        style={{
                          flex: 1, border: 0, outline: 'none', background: 'transparent',
                          fontSize: 13, fontWeight: 700,
                          color: customTrade ? '#fff' : '#0E1116',
                          padding: '10px 0',
                          fontFamily: 'inherit',
                        }}
                      />
                      {customTrade && (
                        <span style={{ padding: '0 12px', color: '#5DDC96', display: 'flex' }}>
                          <Check size={14} />
                        </span>
                      )}
                    </div>

                    {tradeSaving && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', paddingLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Loader2 size={12} className="animate-spin" /> {tc('saving')}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>

          </div>{/* end right column */}
        </div>{/* end two-column */}
      </div>{/* end dk-body */}

      {/* Free user publish warning */}
      <Modal isOpen={showPublishWarning} onClose={() => setShowPublishWarning(false)} title={t('freePlanWarningTitle')}>
        <p style={{ margin: '0 0 0.75rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {t('freePlanWarningBody1')}
        </p>
        <p style={{ margin: '0 0 1rem', fontSize: '0.825rem', color: 'var(--text)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', lineHeight: 1.7 }}>
          {t('freePlanFreeSections')}
        </p>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {t('freePlanWarningBody2')}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={() => setShowPublishWarning(false)} style={{ height: 44, fontSize: 15 }}>
            {tc('cancel')}
          </button>
          <button type="button" className="dk-btn dk-btn-dark" onClick={handlePublish} disabled={publishing}
            style={{ height: 44, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            {publishing ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
            {t('publishAnywayButton')}
          </button>
        </div>
      </Modal>

      {/* Auto-save toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.75rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--primary)', color: '#fff',
          padding: '0.5rem 1rem', borderRadius: 'var(--radius-pill)',
          fontSize: '0.825rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 9999, pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          <Check size={13} style={{ color: '#5DDC96' }} />
          {toast.message}
        </div>
      )}
    </div>
  );
}
