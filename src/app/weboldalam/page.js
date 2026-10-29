'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Globe, Check, X, Loader2,
  AlertTriangle, ExternalLink, Eye,
  CheckCircle2, Copy, QrCode, Trash2, Image,
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import { COLOR_SCHEMES, TYPOGRAPHY } from '@/lib/websiteThemes';
import { toSlug } from '@/lib/utils';

import SlugSetup from './components/SlugSetup';
import PillToggle from './components/PillToggle';
import SectionCard from './components/SectionCard';
import QrModal from './components/QrModal';
import ImagePickerModal from './components/ImagePickerModal';

const DEMO_WB_LS_KEY = 'okosszaki_demo_website_builder';

export function BuilderEditor({ website: initialWebsite, sections: initialSections, userEmail }) {
  const [website, setWebsite] = useState(initialWebsite);
  const [sections, setSections] = useState(initialSections);
  const { isDemoMode } = useApp();
  const [showPublishWarning, setShowPublishWarning] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [activeTab, setActiveTab] = useState('sections'); // 'sections' | 'design' | 'settings'

  const [theme, setTheme] = useState(website.theme || { color_scheme: 'classic', typography: 'modern' });

  // Settings tab state
  const [settingsSlug, setSettingsSlug] = useState(initialWebsite.slug || '');
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugResult, setSlugResult] = useState(null); // { available: bool } | null
  const slugCheckTimer = useRef(null);
  const [slugSaving, setSlugSaving] = useState(false);
  const [slugSaveErr, setSlugSaveErr] = useState('');
  const [slugSaveOk, setSlugSaveOk] = useState(false);
  const [trades, setTrades] = useState([]);
  const [settingsTradeId, setSettingsTradeId] = useState(initialWebsite.trade_id || '');
  const [tradeSaving, setTradeSaving] = useState(false);
  const [tradeSaveOk, setTradeSaveOk] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen]   = useState(false);
  const [bannerPickerIndex, setBannerPickerIndex] = useState(0);

  // Load trades for settings tab
  useEffect(() => {
    fetch('/api/trades').then(r => r.json()).then(d => setTrades(d.trades || []));
  }, []);

  // Slug uniqueness check (debounced)
  const checkSettingsSlug = useCallback((slug) => {
    clearTimeout(slugCheckTimer.current);
    setSlugResult(null);
    if (!slug || slug.length < 3 || slug === website.slug) return;
    setSlugChecking(true);
    slugCheckTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/website/slug-check?slug=${encodeURIComponent(slug)}`);
        const d = await r.json();
        setSlugResult(d);
      } finally { setSlugChecking(false); }
    }, 500);
  }, [website.slug]);

  // Load demo state from localStorage on mount
  useEffect(() => {
    if (!isDemoMode) return;
    try {
      const raw = localStorage.getItem(DEMO_WB_LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.sections) setSections(saved.sections);
      if (saved.theme) setTheme(saved.theme);
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateTheme = async (next) => {
    setTheme(next);
    if (isDemoMode) {
      try { localStorage.setItem(DEMO_WB_LS_KEY, JSON.stringify({ sections, theme: next })); } catch {}
      showToast('Design módosítva');
      return;
    }
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next }),
      });
      if (r.ok) showToast('Design mentve');
    } catch { /* silent */ }
  };

  const isTestUser = userEmail === 'testo@testo.com';
  const [testPremium, setTestPremium] = useState(website.is_premium || false);
  const isPremium = isTestUser ? testPremium : (website.is_premium || false);

  const toggleTestPremium = async () => {
    const next = !testPremium;
    setTestPremium(next);
    setWebsite(w => ({ ...w, is_premium: next }));
    try {
      await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_premium: next }),
      });
    } catch { /* silent — migration may not be applied yet */ }
  };

  const handleSaveSlug = async () => {
    if (isDemoMode) { showToast('Demo módban nem elérhető'); return; }
    if (!settingsSlug || settingsSlug.length < 3) { setSlugSaveErr('A link legalább 3 karakter hosszú kell legyen.'); return; }
    if (settingsSlug === website.slug) return;
    if (slugResult && !slugResult.available) { setSlugSaveErr('Ez a link már foglalt.'); return; }
    setSlugSaving(true); setSlugSaveErr(''); setSlugSaveOk(false);
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_slug', slug: settingsSlug }),
      });
      const d = await r.json();
      if (!r.ok) { setSlugSaveErr(d.error || 'Hiba a mentéskor.'); return; }
      setWebsite(d.website);
      setSlugSaveOk(true);
      setSlugResult(null);
      setTimeout(() => setSlugSaveOk(false), 3000);
    } catch { setSlugSaveErr('Hálózati hiba. Próbáld újra.'); }
    finally { setSlugSaving(false); }
  };

  const handleSaveTrade = async (newTradeId) => {
    if (isDemoMode) { showToast('Demo módban nem elérhető'); return; }
    setSettingsTradeId(newTradeId);
    setTradeSaving(true); setTradeSaveOk(false);
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trade_id: newTradeId || null }),
      });
      const d = await r.json();
      if (r.ok) {
        setWebsite(d.website);
        setTradeSaveOk(true);
        setTimeout(() => setTradeSaveOk(false), 2000);
      }
    } catch { /* silent */ }
    finally { setTradeSaving(false); }
  };

  const dirty = useRef(false);
  const saveTimers = useRef({});
  const [toast, setToast] = useState(null);
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const publicUrl = `${origin}/szakemberek/${website.slug}`;

  const showToast = useCallback((message) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => setToast(t => t?.id === id ? null : t), 2200);
  }, []);

  // Load leads on mount and when switching to leads tab

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
        if (r.ok) showToast('Változtatások mentve');
      } catch { /* silent fail — user can still use main Save */ }
    }, 700);
  };

  const handleSave = async () => {
    if (isDemoMode) { showToast('Demo módban a mentés nem elérhető'); return; }
    setSaving(true);
    setError('');
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      const d = await r.json();
      if (!r.ok) { setError(d.error || 'Mentési hiba'); return; }
      setWebsite(d.website);
      setSections(d.sections);
      dirty.current = false;
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError('Hálózati hiba');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = () => {
    if (!isPremium) { setShowPublishWarning(true); return; }
    handlePublish();
  };

  const handlePublish = async () => {
    if (isDemoMode) { showToast('Demo módban a közzététel nem elérhető'); return; }
    setShowPublishWarning(false);
    setPublishing(true);
    setError('');
    try {
      const saveRes = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections }),
      });
      if (!saveRes.ok) { const d = await saveRes.json(); setError(d.error || 'Mentési hiba'); return; }
      const pubRes = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' }),
      });
      const d = await pubRes.json();
      if (!pubRes.ok) { setError(d.error || 'Közzétételi hiba'); return; }
      setWebsite(d.website);
      setSections(d.sections);
      dirty.current = false;
    } catch {
      setError('Hálózati hiba');
    } finally {
      setPublishing(false);
    }
  };

  const handleUnpublish = async () => {
    if (isDemoMode) { showToast('Demo módban a közzététel nem elérhető'); return; }
    setPublishing(true);
    try {
      const r = await fetch('/api/website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unpublish' }),
      });
      const d = await r.json();
      if (r.ok) { setWebsite(d.website); setSections(d.sections); }
    } catch { /* ignore */ }
    finally { setPublishing(false); }
  };

  const copyUrl = () => {
    navigator.clipboard?.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '1.5rem 1rem 3rem' }}>

      {/* QR Modal */}
      {showQr && <QrModal url={publicUrl} onClose={() => setShowQr(false)} />}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <Globe size={18} style={{ color: 'var(--primary)' }} />
            <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Weboldalom</h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>epitunk.hu/szakemberek/{website.slug}</span>
            <button type="button" onClick={copyUrl} title="Link másolása" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--text-muted)', display: 'flex' }}>
              {copied ? <Check size={13} style={{ color: '#22c55e' }} /> : <Copy size={13} />}
            </button>
            {website.status === 'published' && (
              <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-muted)', display: 'flex' }}>
                <ExternalLink size={13} />
              </a>
            )}
            <button type="button" onClick={() => setShowQr(true)} title="QR kód" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', color: 'var(--text-muted)', display: 'flex' }}>
              <QrCode size={13} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Preview */}
          <a
            href={`/szakemberek/${website.slug}?preview=1`}
            target="_blank" rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Eye size={13} /> Előnézet
          </a>
          {website.status === 'published' ? (
            <button type="button" onClick={handleUnpublish} disabled={publishing} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {publishing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={13} />}
              Vázlat
            </button>
          ) : (
            <button type="button" onClick={handlePublishClick} disabled={publishing} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {publishing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={13} />}
              Közzétesz
            </button>
          )}
        </div>
      </div>

      {/* Status badge — 3 states */}
      {(() => {
        const isPublished = website.status === 'published';
        const wasPreviouslyPublished = !isPublished && !!website.published_at;
        const cfg = isPublished
          ? { bg: '#dcfce7', color: '#166534', border: '#bbf7d0', icon: <CheckCircle2 size={13} />, label: 'Élő – mindenki láthatja' }
          : wasPreviouslyPublished
          ? { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: <Globe size={13} />, label: 'Vázlat – korábban élő volt' }
          : { bg: 'var(--bg-subtle)', color: 'var(--text-muted)', border: 'var(--border-subtle)', icon: <Globe size={13} />, label: 'Nincs közzétéve' };
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-pill)', background: cfg.bg, color: cfg.color, fontSize: '0.775rem', fontWeight: 600, marginBottom: '1.25rem', border: `1px solid ${cfg.border}` }}>
            {cfg.icon} {cfg.label}
          </div>
        );
      })()}

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '1rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.25rem', marginBottom: '1.25rem' }}>
        {[
          { key: 'sections',  label: 'Szekciók' },
          { key: 'design',    label: 'Design' },
          { key: 'settings',  label: 'Beállítások' },
        ].map(tab => (
          <button
            key={tab.key} type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1, padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm, 6px)',
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
              background: activeTab === tab.key ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab.key ? 'var(--text)' : 'var(--text-muted)',
              boxShadow: activeTab === tab.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}
          >
            {tab.label}
            {tab.badge > 0 && (
              <span style={{ background: 'var(--primary)', color: 'white', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700, minWidth: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ---- Sections tab ---- */}
      {activeTab === 'sections' && (
        <>
          {isTestUser && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fdf2f8', border: '1px solid #f0abfc', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.85rem', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86198f' }}>🧪 TEST: {isPremium ? 'Prémium' : 'Ingyenes'}</span>
              <PillToggle on={testPremium} onChange={toggleTestPremium} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {sections.map(section => (
              <SectionCard
                key={section.section_type}
                section={section}
                isPremium={isPremium}
                expanded={expandedSection === section.section_type}
                onToggleExpand={() => setExpandedSection(prev => prev === section.section_type ? null : section.section_type)}
                onChange={updateSection}
                tradeId={website.trade_id}
              />
            ))}
          </div>
        </>
      )}

      {/* ---- Design tab ---- */}
      {activeTab === 'design' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Color scheme */}
          <div>
            <p style={{ margin: '0 0 0.85rem', fontWeight: 700, fontSize: '0.875rem' }}>Színvilág</p>
            {[
              { label: 'Sötét háttér', keys: ['classic','ocean','forest','rust','steel','black'] },
              { label: 'Világos háttér', keys: ['classic_light','ocean_light','forest_light','rust_light','steel_light','white'] },
            ].map(group => (
              <div key={group.label} style={{ marginBottom: '1rem' }}>
                <p style={{ margin: '0 0 0.5rem', fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{group.label}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                  {group.keys.map(key => {
                    const scheme = COLOR_SCHEMES[key];
                    if (!scheme) return null;
                    const isSelected = (theme.color_scheme || 'classic') === key;
                    return (
                      <button
                        key={key} type="button"
                        onClick={() => updateTheme({ ...theme, color_scheme: key })}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.45rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        <span style={{
                          width: 48, height: 48, borderRadius: 12, display: 'flex', overflow: 'hidden',
                          border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                          boxShadow: isSelected ? '0 0 0 3px var(--primary-bg)' : 'none', flexShrink: 0,
                        }}>
                          <span style={{ flex: 1, background: scheme.preview[0], border: scheme.darkHero ? 'none' : '1px solid #e2e8f0' }} />
                          <span style={{ width: 14, background: scheme.preview[1] }} />
                        </span>
                        <span style={{ fontSize: '0.7rem', fontWeight: isSelected ? 700 : 500, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
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
            <p style={{ margin: '0 0 0.85rem', fontWeight: 700, fontSize: '0.875rem' }}>Tipográfia</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {Object.entries(TYPOGRAPHY).map(([key, typo]) => {
                const isSelected = (theme.typography || 'modern') === key;
                return (
                  <button
                    key={key} type="button"
                    onClick={() => updateTheme({ ...theme, typography: key })}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '1rem', padding: '0.85rem 1rem',
                      border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'var(--primary-bg)' : 'var(--bg-card)',
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.875rem', color: isSelected ? 'var(--primary)' : 'var(--text)' }}>{typo.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{typo.description}</p>
                    </div>
                    <span style={{ fontSize: '1.1rem', fontFamily: typo.headingFont, fontWeight: typo.headingWeight, color: isSelected ? 'var(--primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      Aa
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Banner images */}
          <div>
            <p style={{ margin: '0 0 0.35rem', fontWeight: 700, fontSize: '0.875rem' }}>Banner képek</p>
            <p style={{ margin: '0 0 0.85rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              {isPremium ? 'Prémium: 2 kép — 3 szekció · banner · 3 szekció · banner · 3 szekció' : 'Ingyenes: 1 kép — 2 szekció · banner · 2 szekció'}
            </p>
            {[...Array(isPremium ? 2 : 1)].map((_, idx) => {
              const banner = theme.banners?.[idx];
              return (
                <div key={idx} style={{ marginBottom: '0.85rem' }}>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {idx + 1}. banner
                  </p>
                  {banner?.image_url ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <img src={banner.image_url} alt="" style={{ width: '100%', aspectRatio: '3/1', objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border-subtle)' }} />
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }}>Csere</button>
                        <button type="button" className="btn btn-danger btn-sm" onClick={() => {
                          const next = [...(theme.banners || [])];
                          next[idx] = null;
                          updateTheme({ ...theme, banners: next });
                        }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setBannerPickerIndex(idx); setBannerPickerOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Image size={13} /> Kép kiválasztása
                    </button>
                  )}
                </div>
              );
            })}
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
          </div>

        </div>
      )}

      {/* ---- Settings tab ---- */}
      {activeTab === 'settings' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Slug change */}
          <div>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Nyilvános link (URL)</p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              A profilod elérési útja: <strong>epitunk.hu/szakemberek/{settingsSlug || website.slug}</strong>
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg-input, var(--bg-subtle))' }}>
                  <span style={{ padding: '0.55rem 0.6rem', fontSize: '0.8rem', color: 'var(--text-muted)', borderRight: '1px solid var(--border-subtle)', whiteSpace: 'nowrap', flexShrink: 0 }}>/szakemberek/</span>
                  <input
                    type="text"
                    value={settingsSlug}
                    onChange={e => {
                      const v = toSlug(e.target.value) || e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                      setSettingsSlug(v);
                      setSlugSaveErr('');
                      setSlugSaveOk(false);
                      checkSettingsSlug(v);
                    }}
                    placeholder="pl. kovacs-janos-felujtio"
                    style={{ border: 'none', background: 'transparent', outline: 'none', padding: '0.55rem 0.65rem', fontSize: '0.875rem', flex: 1, minWidth: 0 }}
                  />
                  {slugChecking && <Loader2 size={14} style={{ margin: '0 0.5rem', color: 'var(--text-muted)', animation: 'spin 1s linear infinite', flexShrink: 0 }} />}
                  {!slugChecking && slugResult && settingsSlug !== website.slug && (
                    slugResult.available
                      ? <Check size={14} style={{ margin: '0 0.5rem', color: 'var(--success-text)', flexShrink: 0 }} />
                      : <X size={14} style={{ margin: '0 0.5rem', color: 'var(--danger-text)', flexShrink: 0 }} />
                  )}
                </div>
                {slugSaveErr && <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.3rem' }}>{slugSaveErr}</div>}
                {!slugSaveErr && slugResult && !slugResult.available && settingsSlug !== website.slug && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger-text)', marginTop: '0.3rem' }}>Ez a link már foglalt.</div>
                )}
                {!slugSaveErr && slugResult?.available && settingsSlug !== website.slug && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--success-text)', marginTop: '0.3rem' }}>Ez a link elérhető!</div>
                )}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={slugSaving || settingsSlug === website.slug || settingsSlug.length < 3 || (slugResult !== null && !slugResult.available)}
                onClick={handleSaveSlug}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              >
                {slugSaving ? <><Loader2 size={13} className="animate-spin" /> Mentés…</> : slugSaveOk ? <><Check size={13} /> Mentve!</> : <><Check size={13} /> Mentés</>}
              </button>
            </div>
          </div>

          {/* Trade / profession change */}
          <div>
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '0.875rem' }}>Szakma / tevékenység</p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.775rem', color: 'var(--text-muted)' }}>
              A kiválasztott szakma befolyásolja az alapértelmezett képeket és a keresési kategóriát.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxWidth: 360 }}>
              <button
                type="button"
                onClick={() => handleSaveTrade('')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                  padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: `1.5px solid ${(!settingsTradeId) ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  background: (!settingsTradeId) ? 'var(--primary-bg, #eff6ff)' : 'var(--bg-card)',
                  fontWeight: (!settingsTradeId) ? 700 : 400, fontSize: '0.875rem',
                  color: (!settingsTradeId) ? 'var(--primary)' : 'var(--text)',
                }}
              >
                <span>Általános szakember</span>
                {(!settingsTradeId) && (tradeSaveOk ? <CheckCircle2 size={14} color="var(--success-text)" /> : <Check size={14} color="var(--primary)" />)}
              </button>
              {trades.map(trade => (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => handleSaveTrade(trade.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                    padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `1.5px solid ${settingsTradeId === trade.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    background: settingsTradeId === trade.id ? 'var(--primary-bg, #eff6ff)' : 'var(--bg-card)',
                    fontWeight: settingsTradeId === trade.id ? 700 : 400, fontSize: '0.875rem',
                    color: settingsTradeId === trade.id ? 'var(--primary)' : 'var(--text)',
                  }}
                >
                  <span>{trade.name_hu}</span>
                  {settingsTradeId === trade.id && (tradeSaveOk ? <CheckCircle2 size={14} color="var(--success-text)" /> : <Check size={14} color="var(--primary)" />)}
                </button>
              ))}
              {tradeSaving && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Loader2 size={12} className="animate-spin" /> Mentés…</div>}
            </div>
          </div>

        </div>
      )}

      <p style={{ marginTop: '1.5rem', fontSize: '0.775rem', color: 'var(--text-muted)', textAlign: 'center' }}>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>epitunk.hu/szakemberek/{website.slug}</a>
      </p>

      {/* Free user publish warning modal */}
      {showPublishWarning && (
        <>
          <div onClick={() => setShowPublishWarning(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, backdropFilter: 'blur(3px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, width: 'min(440px, 90vw)', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: '0 24px 60px rgba(0,0,0,0.25)', padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem', fontWeight: 800 }}>Figyelem – Ingyenes csomag</h3>
            <p style={{ margin: '0 0 0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Jelenleg az <strong>ingyenes csomagot</strong> használod. Közzététel esetén csak az ingyenes szekciók jelennek meg az élő oldalon:
            </p>
            <p style={{ margin: '0 0 1rem', fontSize: '0.825rem', color: 'var(--text)', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', lineHeight: 1.7 }}>
              ✓ Fejléc · Rólam · Szolgáltatások · Kapcsolat
            </p>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Az összes szekció megjelenítéséhez válts <strong>Prémium</strong> csomagra. A tartalmaid megmaradnak – bármikor aktiválhatod.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPublishWarning(false)}>Mégse</button>
              <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={publishing} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {publishing ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={14} />}
                Közzéteszem így is
              </button>
            </div>
          </div>
        </>
      )}

      {/* Auto-save toast */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1.75rem',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#0f172a',
          color: '#f8fafc',
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-pill)',
          fontSize: '0.825rem',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          zIndex: 9999,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}>
          <Check size={13} style={{ color: '#22c55e' }} />
          {toast.message}
        </div>
      )}
    </div>
  );
}

// ---- main page component ---------------------------------------------------

export default function WeboldaPage() {
  const { currentUser, isSuperAdmin, impersonating, activeCollectiveId, collectives, dataReady } = useApp();
  const [website, setWebsite] = useState(undefined); // undefined = loading
  const [sections, setSections] = useState([]);

  useEffect(() => {
    if (!dataReady || !currentUser || (isSuperAdmin && !impersonating)) return;
    fetch('/api/website')
      .then(r => r.json())
      .then(d => {
        setWebsite(d.website || null);
        setSections(d.sections || []);
      })
      .catch(() => setWebsite(null));
  }, [dataReady, currentUser, isSuperAdmin]);

  if (!dataReady || website === undefined) return <PageSpinner />;

  if (isSuperAdmin && !impersonating) {
    return (
      <div style={{ maxWidth: 560, margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
        <Globe size={32} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
        <h2 style={{ fontWeight: 700 }}>Személyes weboldal</h2>
        <p style={{ color: 'var(--text-muted)' }}>Ez a funkció egyéni felhasználók számára érhető el.</p>
      </div>
    );
  }

  if (activeCollectiveId) {
    return (
      <div style={{ maxWidth: 560, margin: '4rem auto', textAlign: 'center', padding: '1rem' }}>
        <Globe size={48} style={{ color: 'var(--accent)', marginBottom: '1rem', opacity: 0.5 }} />
        <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Kollektíva weboldal</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          A kollektívák számára készülő weboldalfunkció hamarosan elérhetővé válik.
        </p>
        <span style={{ display: 'inline-block', background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-pill)', padding: '0.3rem 0.9rem', fontSize: '0.8rem', fontWeight: 700 }}>
          Hamarosan
        </span>
      </div>
    );
  }

  if (website === null) {
    return (
      <SlugSetup
        displayName={currentUser?.display_name || ''}
        onCreated={({ website: w, sections: s }) => { setWebsite(w); setSections(s); }}
      />
    );
  }

  return (
    <BuilderEditor
      website={website}
      sections={sections}
      userEmail={currentUser?.email}
    />
  );
}
