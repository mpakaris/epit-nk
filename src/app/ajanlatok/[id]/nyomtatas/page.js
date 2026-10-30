'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_ENTRY_TYPES } from '@/lib/constants';
import Link from 'next/link';
import { ArrowLeft, Loader2, Download, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const FONT  = `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`;
const SLATE = '#0f172a';

const PALETTE = [
  { id: 'blue',    label: 'Kék',       color: '#2563eb', text: '#fff' },
  { id: 'navy',    label: 'Tengerész', color: '#1e3a5f', text: '#fff' },
  { id: 'teal',    label: 'Türkiz',    color: '#0d9488', text: '#fff' },
  { id: 'green',   label: 'Zöld',      color: '#16a34a', text: '#fff' },
  { id: 'violet',  label: 'Lila',      color: '#7c3aed', text: '#fff' },
  { id: 'rose',    label: 'Rózsa',     color: '#e11d48', text: '#fff' },
  { id: 'amber',   label: 'Narancs',   color: '#d97706', text: '#fff' },
  { id: 'slate',   label: 'Antracit',  color: '#334155', text: '#fff' },
  { id: 'black',   label: 'Fekete',    color: '#0f172a', text: '#fff' },
  { id: 'white',   label: 'Semleges',  color: '#f1f5f9', text: SLATE  },
];

const ENTRY_TYPE_STYLE = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', label: 'Anyag'       },
  labour:    { bg: '#f0fdf4', color: '#15803d', label: 'Munkadíj'    },
  equipment: { bg: '#fff7ed', color: '#c2410c', label: 'Eszközbérlés'},
  transport: { bg: '#faf5ff', color: '#7c3aed', label: 'Szállítás'   },
  other:     { bg: '#f8fafc', color: '#475569', label: 'Egyéb'       },
};

const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;

function TypeBadge({ type }) {
  const s = ENTRY_TYPE_STYLE[type] || ENTRY_TYPE_STYLE.other;
  return (
    <span style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: s.bg, color: s.color, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function SectionMeasurements({ section }) {
  const w = Number(section.width_m), l = Number(section.length_m);
  const floor     = w > 0 && l > 0 ? w * l : (section.size_m2 != null ? Number(section.size_m2) : null);
  const perimeter = w > 0 && l > 0 ? 2 * (w + l) : null;
  const h         = Number(section.height_m) || 0;
  const wins      = section.window_count || 0;
  const doors     = section.door_count   || 0;
  const openings  = wins * WINDOW_M2 + doors * DOOR_M2;
  const grossWall = perimeter && h > 0 ? perimeter * h : null;
  const netWall   = grossWall != null ? Math.max(0, grossWall - openings) : null;
  const fmt       = v => Number(v).toFixed(2).replace('.', ',') + ' m²';

  const chips = [
    floor     != null && `Padló: ${fmt(floor)}`,
    h > 0             && `Magasság: ${h} m`,
    wins > 0          && `${wins} ablak`,
    doors > 0         && `${doors} ajtó`,
    netWall   != null && `Falfelület (nettó): ${fmt(netWall)}`,
  ].filter(Boolean);

  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
      {chips.map(c => (
        <span key={c} style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: 999, background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>{c}</span>
      ))}
    </div>
  );
}

const DEMO_PROFILE_PRINT = {
  display_name: 'Nemes Péter',
  first_name:   'Péter',
  last_name:    'Nemes',
  company_name: 'Nemes Renováló Kft.',
  street:       'Alkotás utca',
  street_number:'15',
  zip:          '1124',
  city:         'Budapest',
  tax_number:   '99887766-2-43',
};

export default function OfferPrintPage() {
  const { id } = useParams();
  const router  = useRouter();
  const { quotes, quoteSections, quoteEntries, clients, loading, dataReady, isDemoMode, currentUser, collectives } = useApp();
  const [profile,       setProfile]       = useState(isDemoMode ? DEMO_PROFILE_PRINT : null);
  const [accent,        setAccent]        = useState(PALETTE[0]);
  const [downloading,   setDownloading]   = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(true);

  const handleDownload = async () => {
    if (isDemoMode) { alert('PDF letöltés demo módban nem elérhető.'); return; }
    setDownloading(true);
    try {
      const res = await fetch(`/api/quotes/${id}/pdf?accent=${encodeURIComponent(accent.color)}`);
      if (!res.ok) throw new Error('PDF generálás sikertelen');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = res.headers.get('content-disposition')?.match(/filename="(.+)"/)?.[1] || 'Ajanlat.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message);
    } finally {
      setDownloading(false);
    }
  };

  // Mobile PDF scaling: render at 794px (A4 width) and scale to fit viewport
  const docRef    = useRef(null);
  const [docScale,  setDocScale]  = useState(1);
  const [docHeight, setDocHeight] = useState(null);

  useEffect(() => {
    const updateScale = () => {
      const vw = window.innerWidth;
      setDocScale(Math.min(1, (vw - 16) / 794));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const el = docRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setDocHeight(entry.contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (isDemoMode) return;
    fetch('/api/auth/profile').then(r => r.json()).then(d => setProfile(d.profile || null));
  }, [isDemoMode]);

  useEffect(() => {
    if (!quotes.length) return;
    const q = quotes.find(q => q.id === id);
    if (!q) return;
    const safe = q.title.replace(/[^\w\sÁÉÍÓÖŐÚÜŰáéíóöőúüű]/g, '').trim().replace(/\s+/g, '_');
    const prev = document.title;
    document.title = `Ajanlat_${safe}`;
    return () => { document.title = prev; };
  }, [id, quotes]);

  // Access guard: only quote owner or collective owner/admin may view the print preview
  useEffect(() => {
    if (isDemoMode || !dataReady || !currentUser) return;
    const q = quotes.find(q => q.id === id);
    if (!q) return;
    const isOwner = q.owner_id === currentUser.id || q.created_by === currentUser.id;
    const isKollektivOwner = collectives?.some(c => c.collective_id === q.collective_id && (c.role === 'owner' || c.role === 'admin'));
    if (!isOwner && !isKollektivOwner) {
      router.replace(`/ajanlatok/${id}`);
    }
  }, [dataReady, currentUser, id, quotes, collectives, isDemoMode, router]);

  const A  = accent.color; // accent background
  const AT = accent.text;  // text on accent background

  if (loading || !dataReady || !profile) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: FONT }}><Loader2 size={24} className="animate-spin" /></div>;
  }

  const quote    = quotes.find(q => q.id === id);
  if (!quote) return <div style={{ padding: '2rem', fontFamily: FONT }}>Ajánlat nem található.</div>;

  const client   = clients.find(c => c.id === quote.client_id) || null;
  const sections = quoteSections.filter(s => s.quote_id === id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const ENTRY_TYPE_ORDER = { material: 0, labour: 1, transport: 2, equipment: 3, other: 4 };
  const allEntries = quoteEntries
    .filter(e => e.quote_id === id)
    .sort((a, b) => (ENTRY_TYPE_ORDER[a.entry_type] ?? 4) - (ENTRY_TYPE_ORDER[b.entry_type] ?? 4));

  const netTotal   = allEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate    = Number(quote.tax_percent ?? 27);
  const taxAmount  = Math.round(netTotal * taxRate / 100);
  const grossTotal = netTotal + taxAmount;

  const senderName = [profile.last_name, profile.first_name].filter(Boolean).join(' ');

  const CHECKLIST = [
    { ok: !!(profile.company_name || profile.first_name || profile.last_name), label: 'Vállalkozói név / cégnév', href: '/profil', where: 'Profil → Számla fejléc' },
    { ok: !!profile.tax_number,   label: 'Adószám',              href: '/profil',           where: 'Profil → Számla fejléc' },
    { ok: !!profile.phone,        label: 'Telefonszám',          href: '/profil',           where: 'Profil → Számla fejléc' },
    { ok: !!profile.bank_account, label: 'Bankszámlaszám',       href: '/profil',           where: 'Profil → Számla fejléc' },
    { ok: !!client,               label: 'Megrendelő ügyfél',    href: `/ajanlatok/${id}`,  where: 'Ajánlat → Megrendelő' },
    { ok: !!quote.offer_number,   label: 'Ajánlat száma',        href: `/ajanlatok/${id}`,  where: 'Ajánlat → Ajánlat száma' },
    { ok: !!quote.valid_until,    label: 'Érvényesség dátuma',   href: `/ajanlatok/${id}`,  where: 'Ajánlat → Érvényes' },
    { ok: !!quote.offer_terms_text, label: 'Feltételek szövege', href: `/ajanlatok/${id}`,  where: 'Ajánlat → Feltételek' },
  ];
  const missing = CHECKLIST.filter(c => !c.ok);

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .print-root { padding: 0 !important; background: white !important; }
          .pdf-scale-wrap { width: 100% !important; height: auto !important; position: static !important; }
          .pdf-scale-doc  { width: 100% !important; position: static !important; transform: none !important; box-shadow: none !important; }
        }
        @page { size: A4; margin: 14mm 14mm; }
        body { margin: 0; background: #f1f5f9; font-family: ${FONT}; }
      `}</style>

      {/* Action bar */}
      <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 100, background: '#fff', borderBottom: '1px solid #e2e8f0', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => router.back()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.85rem', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, color: '#475569', fontFamily: FONT }}>
          <ArrowLeft size={14} /> Vissza
        </button>
        <button type="button" onClick={handleDownload} disabled={downloading} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: A, cursor: downloading ? 'wait' : 'pointer', fontSize: '0.82rem', fontWeight: 700, color: AT, fontFamily: FONT }}>
          {downloading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={14} />}
          {downloading ? 'Generálás…' : 'PDF letöltés'}
        </button>
        {/* Color palette */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>Szín:</span>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {PALETTE.map(p => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => setAccent(p)}
                style={{
                  width: 22, height: 22, borderRadius: 5,
                  background: p.color,
                  border: accent.id === p.id ? '2px solid #0f172a' : '2px solid transparent',
                  outline: accent.id === p.id ? '2px solid #fff' : 'none',
                  outlineOffset: -3,
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  padding: 0,
                  flexShrink: 0,
                  // white swatch gets a border so it's visible
                  ...(p.id === 'white' ? { border: accent.id === p.id ? '2px solid #0f172a' : '2px solid #cbd5e1' } : {}),
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Checklist */}
      {!isDemoMode && missing.length > 0 && (
        <div className="no-print" style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', fontFamily: FONT }}>
          <button
            type="button"
            onClick={() => setChecklistOpen(o => !o)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.5rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}
          >
            <AlertTriangle size={14} color="#b45309" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: 700, color: '#b45309' }}>
              {missing.length} hiányzó adat az ajánlatban
            </span>
            {checklistOpen ? <ChevronUp size={14} color="#b45309" /> : <ChevronDown size={14} color="#b45309" />}
          </button>
          {checklistOpen && (
            <div style={{ padding: '0 1.5rem 0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem 1.25rem' }}>
              {missing.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.76rem', color: '#92400e', textDecoration: 'none', whiteSpace: 'nowrap' }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block' }} />
                  <span style={{ fontWeight: 600 }}>{item.label}</span>
                  <span style={{ color: '#b45309', opacity: 0.7 }}>→ {item.where}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Page wrapper */}
      <div className="print-root" style={{ padding: '1.5rem 8px', minHeight: '100vh' }}>
        {/* Centering container: takes exactly the scaled footprint so scrolling works */}
        <div className="pdf-scale-wrap" style={{
          width: 794 * docScale,
          height: docHeight ? docHeight * docScale : undefined,
          margin: '0 auto',
          position: 'relative',
        }}>
        <div
          ref={docRef}
          className="pdf-scale-doc"
          style={{
            width: 794,
            position: 'absolute', top: 0, left: 0,
            transformOrigin: 'top left',
            transform: `scale(${docScale})`,
            background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderRadius: 4,
          }}
        >

          {/* ── Accent bar ── */}
          <div style={{ height: 6, background: `linear-gradient(90deg, ${A}, ${A}99)`, borderRadius: '4px 4px 0 0' }} />

          <div style={{ padding: '2.5rem 2.75rem 2rem', fontFamily: FONT, color: SLATE }}>

            {/* ── Header row: sender + AJÁNLAT title ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.25rem', gap: '2rem' }}>
              {/* Sender block */}
              <div style={{ flex: 1 }}>
                {profile.company_name
                  ? <div style={{ fontWeight: 800, fontSize: '1.05rem', color: SLATE, marginBottom: 2 }}>{profile.company_name}</div>
                  : null}
                {senderName && <div style={{ fontWeight: profile.company_name ? 500 : 800, fontSize: profile.company_name ? '0.88rem' : '1.05rem', color: SLATE }}>{senderName}</div>}
                {(profile.zip || profile.city || profile.street) && (
                  <div style={{ marginTop: 4, fontSize: '0.83rem', color: '#64748b', lineHeight: 1.6 }}>
                    {[profile.zip, profile.city].filter(Boolean).join(' ')}{profile.street ? `, ${[profile.street, profile.street_number].filter(Boolean).join(' ')}` : ''}
                  </div>
                )}
                {profile.tax_number && (
                  <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>
                    Adószám: {profile.tax_number}
                  </div>
                )}
                {profile.phone && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{profile.phone}</div>
                )}
                {profile.bank_account && (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {profile.bank_account}{profile.bank_name ? ` · ${profile.bank_name}` : ''}
                  </div>
                )}
                {!profile.company_name && !senderName && (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>— fejléc nincs kitöltve —</div>
                )}
              </div>

              {/* AJÁNLAT badge */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', color: A, lineHeight: 1 }}>AJÁNLAT</div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.8 }}>
                  {quote.offer_number && <div>Szám: <strong>{quote.offer_number}</strong></div>}
                  <div>Kelt: <strong>{formatDate(quote.created_at?.split('T')[0])}</strong></div>
                  {quote.valid_until  && <div>Érvényes: <strong>{formatDate(quote.valid_until)}</strong></div>}
                  {quote.start_date && <div>Kezdés: <strong>{formatDate(quote.start_date)}</strong></div>}
                  {quote.end_date   && <div>Befejezés: <strong>{formatDate(quote.end_date)}</strong></div>}
                </div>
              </div>
            </div>

            {/* ── Divider ── */}
            <div style={{ height: 1, background: '#e2e8f0', marginBottom: '1.75rem' }} />

            {/* ── Client + offer title ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', gap: '2rem' }}>
              {/* Client */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>Megrendelő</div>
                {client ? (
                  <div style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: SLATE }}>{client.name}</div>
                    {client.address && <div style={{ color: '#475569' }}>{client.address}</div>}
                    {client.phone   && <div style={{ color: '#475569' }}>{client.phone}</div>}
                    {client.email   && <div style={{ color: '#475569' }}>{client.email}</div>}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.83rem', color: '#94a3b8', fontStyle: 'italic' }}>Nincs megrendelő megadva.</div>
                )}
              </div>

              {/* Offer title */}
              <div style={{ flex: 1, textAlign: 'right' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: SLATE, lineHeight: 1.3 }}>{quote.title}</div>
                {quote.location  && <div style={{ fontSize: '0.83rem', color: '#64748b', marginTop: 3 }}>📍 {quote.location}</div>}
                {quote.work_type && <div style={{ fontSize: '0.83rem', color: '#64748b' }}>🔧 {quote.work_type}</div>}
              </div>
            </div>

            {/* Description */}
            {quote.description && (
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `3px solid ${A}`, borderRadius: '0 6px 6px 0', padding: '0.75rem 1rem', marginBottom: '1.75rem', fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                {quote.description}
              </div>
            )}

            {/* ── Sections ── */}
            {sections.map((section, si) => {
              const sectionEntries = allEntries.filter(e => e.section_id === section.id);
              const sectionTotal   = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
              return (
                <div key={section.id} style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `4px solid ${A}`, borderRadius: '0 8px 0 0', padding: '0.65rem 0.9rem 0.5rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: A }}>{si + 1}. szakasz</span>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: SLATE }}>{section.name}</span>
                      </div>
                      <SectionMeasurements section={section} />
                      {section.description && <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>{section.description}</div>}
                    </div>
                    {sectionTotal > 0 && (
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Részösszeg</div>
                        <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: SLATE }}>{formatHUF(sectionTotal)}</div>
                      </div>
                    )}
                  </div>

                  {sectionEntries.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ textAlign: 'left',  padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Megnevezés</th>
                          <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Típus</th>
                          <th style={{ textAlign: 'right', padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Menny.</th>
                          <th style={{ textAlign: 'right', padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Egységár</th>
                          <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>Összeg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionEntries.map((e, i) => (
                          <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '0.45rem 0.75rem', color: SLATE, lineHeight: 1.4 }}>
                              <div style={{ fontWeight: 600 }}>{e.work_description}</div>
                              {e.notes && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{e.notes}</div>}
                            </td>
                            <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}>
                              <TypeBadge type={e.entry_type} />
                            </td>
                            <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                              {e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}
                            </td>
                            <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>
                              {e.unit_price != null ? formatHUF(e.unit_price) : '—'}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: SLATE, whiteSpace: 'nowrap' }}>
                              {formatHUF(e.amount_huf)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                  {sectionEntries.length === 0 && (
                    <div style={{ padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderTop: 'none', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Nincsenek tételek ebben a szakaszban.
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unsectioned entries */}
            {(() => {
              const unsectioned = allEntries.filter(e => !e.section_id);
              if (!unsectioned.length) return null;
              return (
                <div style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `4px solid #94a3b8`, borderRadius: '0 8px 0 0', padding: '0.55rem 0.9rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>Általános tételek</span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        <th style={{ textAlign: 'left',  padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Megnevezés</th>
                        <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Típus</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem 0.5rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Menny.</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem 0.5rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Egységár</th>
                        <th style={{ textAlign: 'right', padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>Összeg</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unsectioned.map((e, i) => (
                        <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                          <td style={{ padding: '0.45rem 0.75rem', color: SLATE, fontWeight: 600 }}>
                            {e.work_description}
                            {e.notes && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2, fontWeight: 400 }}>{e.notes}</div>}
                          </td>
                          <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}><TypeBadge type={e.entry_type} /></td>
                          <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>{e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}</td>
                          <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>{e.unit_price != null ? formatHUF(e.unit_price) : '—'}</td>
                          <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: SLATE }}>{formatHUF(e.amount_huf)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}

            {/* ── Totals ── */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <div style={{ minWidth: 280, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 500 }}>Nettó összeg</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: SLATE }}>{formatHUF(netTotal)}</span>
                </div>
                {taxRate > 0 && (
                  <div style={{ padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 500 }}>ÁFA ({taxRate}%)</span>
                    <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{formatHUF(taxAmount)}</span>
                  </div>
                )}
                <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: A }}>
                  <span style={{ fontSize: '0.88rem', color: AT, fontWeight: 700 }}>Bruttó összeg</span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: AT }}>{formatHUF(grossTotal)}</span>
                </div>
              </div>
            </div>

            {/* ── Signature ── */}
            <div style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
              {['Vállalkozó aláírása', 'Megrendelő aláírása'].map(label => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ height: 1, background: '#cbd5e1', marginBottom: 8 }} />
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* ── Footer ── */}
            {(quote.valid_until || profile.terms_pdf_name || quote.payment_deadline_days > 0 || quote.deposit_percent > 0 || quote.warranty_months > 0 || quote.offer_terms_text) && (
              <div style={{ marginTop: '2rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {quote.valid_until && (
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Az ajánlat érvényes: <strong>{formatDate(quote.valid_until)}</strong>
                  </div>
                )}
                {quote.payment_deadline_days > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Fizetési határidő: <strong>{quote.payment_deadline_days} nap</strong> teljesítéstől{quote.payment_method ? `, ${quote.payment_method}` : ''}
                  </div>
                )}
                {quote.deposit_percent > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Előleg: <strong>{quote.deposit_percent}%</strong>{grossTotal > 0 ? ` (${formatHUF(Math.round(grossTotal * quote.deposit_percent / 100))})` : ''} az ajánlat elfogadásakor
                  </div>
                )}
                {quote.warranty_months > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Garancia: <strong>{quote.warranty_months} hónap</strong>
                  </div>
                )}
                {profile.terms_pdf_name && (
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Mellékelt ÁSZF: <strong>{profile.terms_pdf_name}</strong>
                  </div>
                )}
                {quote.offer_terms_text && (
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{quote.offer_terms_text}</div>
                )}
              </div>
            )}

          </div>{/* end padding div */}
        </div>{/* end white card / scaled doc */}
        </div>{/* end centering container */}
      </div>{/* end page wrapper */}
    </>
  );
}
