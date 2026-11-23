'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatMoney, formatDate } from '@/lib/constants';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import PageHeader from '@/components/mobile/pods/PageHeader';
import { NotifSheet, MessagesSheet, MenuSheet } from '@/components/mobile/pods/Sheets';
import useMobile from '@/hooks/useMobile';
import Modal from '@/components/Modal';

const FONT         = `-apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', sans-serif`;
const SLATE        = '#0f172a';
const ACCENT       = '#0f172a';
const ACCENT_TEXT  = '#fff';

const ENTRY_TYPE_STYLE = {
  material:  { bg: '#eff6ff', color: '#1d4ed8' },
  labour:    { bg: '#f0fdf4', color: '#15803d' },
  equipment: { bg: '#fff7ed', color: '#c2410c' },
  transport: { bg: '#faf5ff', color: '#7c3aed' },
  other:     { bg: '#f8fafc', color: '#475569' },
};

const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;

function TypeBadge({ type }) {
  const t = useTranslations('offerPrint');
  const s = ENTRY_TYPE_STYLE[type] || ENTRY_TYPE_STYLE.other;
  const keyMap = { material: 'typeMaterial', labour: 'typeLabour', equipment: 'typeEquipment', transport: 'typeTransport', other: 'typeOther' };
  return (
    <span style={{ display: 'inline-block', fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 999, background: s.bg, color: s.color, letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
      {t(keyMap[type] || 'typeOther')}
    </span>
  );
}

function SectionMeasurements({ section }) {
  const t = useTranslations('offerPrint');
  const w = Number(section.width_m), l = Number(section.length_m);
  const floor     = w > 0 && l > 0 ? w * l : (section.size_m2 != null ? Number(section.size_m2) : null);
  const perimeter = w > 0 && l > 0 ? 2 * (w + l) : null;
  const h         = Number(section.height_m) || 0;
  const wins      = section.window_count || 0;
  const doors     = section.door_count   || 0;
  const openings  = wins * WINDOW_M2 + doors * DOOR_M2;
  const grossWall = perimeter && h > 0 ? perimeter * h : null;
  const netWall   = grossWall != null ? Math.max(0, grossWall - openings) : null;
  const fmtM2     = v => Number(v).toFixed(2).replace('.', ',') + ' m²';

  const chips = [
    floor     != null && `${t('measureFloor')} ${fmtM2(floor)}`,
    h > 0             && t('measureHeight', { height: h }),
    wins > 0          && t('measureWindows', { count: wins }),
    doors > 0         && t('measureDoors',   { count: doors }),
    netWall   != null && `${t('measureNetWall')} ${fmtM2(netWall)}`,
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
  display_name: 'Nemes Péter', first_name: 'Péter', last_name: 'Nemes',
  company_name: 'Nemes Renováló Kft.', street: 'Alkotás utca', street_number: '15',
  zip: '1124', city: 'Budapest', tax_number: '99887766-2-43',
};

// ─── Missing fields sheet / modal ─────────────────────────────────────────────
function MissingSheet({ profile, checklist, navPrefix, quoteId, onClose, onSaved, t, isModal }) {
  const profileItems = checklist.filter(c => c.isProfile && !c.ok);

  const initial = {
    company_name: profile?.company_name || '',
    first_name:   profile?.first_name   || '',
    last_name:    profile?.last_name    || '',
    tax_number:   profile?.tax_number   || '',
    phone:        profile?.phone        || '',
    bank_account: profile?.bank_account || '',
    bank_name:    profile?.bank_name    || '',
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const hasChanges = Object.keys(form).some(k => form[k] !== initial[k]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || t('errorGeneral')); return; }
      const fresh = await fetch('/api/auth/profile').then(r => r.json());
      setSaved(true);
      onSaved(fresh.profile || null);
      setTimeout(() => { setSaved(false); onClose(); }, 1000);
    } catch { setError(t('errorNetwork')); }
    finally { setSaving(false); }
  };

  const LBL = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070' };

  const field = (key, label, placeholder, type = 'text') => (
    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LBL}>{label}</span>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="dk-input" />
    </label>
  );

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: 14, color: '#5A5F68', margin: 0 }}>{t('missingSheetBody')}</p>
      {profileItems.some(i => i.key === 'name') && <>
        {field('company_name', t('labelCompanyName'), 'Nemes Renováló Kft.')}
        {field('last_name',    t('labelLastName'),    'Nemes')}
        {field('first_name',   t('labelFirstName'),   'Péter')}
      </>}
      {profileItems.some(i => i.key === 'tax')  && field('tax_number',   t('checkTax'),   '12345678-2-41')}
      {profileItems.some(i => i.key === 'phone') && field('phone',       t('checkPhone'), '+36 70 …', 'tel')}
      {profileItems.some(i => i.key === 'bank')  && <>
        {field('bank_account', t('checkBank'),     '12345678-12345678-12345678')}
        {field('bank_name',    t('labelBankName'), 'OTP Bank')}
      </>}
      {error && <span style={{ fontSize: 13, fontWeight: 600, color: '#9B1C1C' }}>{error}</span>}
      {profileItems.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" className="dk-btn" onClick={handleSave} disabled={saving || saved || !hasChanges} style={{ background: '#0E1116', color: '#fff', opacity: !hasChanges || saving ? 0.4 : 1 }}>
            {saved ? t('savedOk') : saving ? t('savingProfile') : t('saveProfile')}
          </button>
        </div>
      )}
    </div>
  );

  if (isModal) {
    return (
      <Modal isOpen onClose={onClose} title={t('missingSheetTitle')}>
        {body}
      </Modal>
    );
  }

  return (
    <>
      <div onClick={() => !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(14,17,22,0.5)' }} />
      <div role="dialog" aria-label={t('missingSheetTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '90%', overflowY: 'auto', boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116' }}>{t('missingSheetTitle')}</span>
        {body}
      </div>
    </>
  );
}

// ─── Client / offer fields sheet / modal ─────────────────────────────────────
function ClientSheet({ quote, offerMissing, onClose, onSaved, t, isModal }) {
  const { clients } = useApp();

  const initial = {
    client_id:        quote?.client_id        || '',
    offer_number:     quote?.offer_number     || '',
    valid_until:      quote?.valid_until      || '',
    offer_terms_text: quote?.offer_terms_text || '',
  };
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);
  const [error,  setError]  = useState('');

  const hasChanges = Object.keys(form).some(k => form[k] !== initial[k]);

  const handleSave = async () => {
    setSaving(true); setError('');
    try {
      const payload = { ...form, client_id: form.client_id || null };
      const res = await fetch(`/api/quotes/${quote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || t('errorGeneral')); return; }
      const data = await res.json();
      setSaved(true);
      onSaved(data.quote || { ...quote, ...form });
      setTimeout(() => { setSaved(false); onClose(); }, 1000);
    } catch { setError(t('errorNetwork')); }
    finally { setSaving(false); }
  };

  const LBL = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070' };
  const needsClient = offerMissing.some(i => i.key === 'client');
  const needsNum    = offerMissing.some(i => i.key === 'num');
  const needsValid  = offerMissing.some(i => i.key === 'valid');
  const needsTerms  = offerMissing.some(i => i.key === 'terms');

  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {needsClient && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={LBL}>{t('checkClient')}</span>
          <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} className="dk-input" style={{ appearance: 'none' }}>
            <option value="">– {t('noClient')} –</option>
            {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      )}
      {needsNum && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={LBL}>{t('checkOfferNum')}</span>
          <input value={form.offer_number} onChange={e => setForm(f => ({ ...f, offer_number: e.target.value }))} placeholder="2024/001" className="dk-input" />
        </label>
      )}
      {needsValid && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={LBL}>{t('checkValidUntil')}</span>
          <input type="date" value={form.valid_until} onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))} className="dk-input" />
        </label>
      )}
      {needsTerms && (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={LBL}>{t('checkTerms')}</span>
          <textarea value={form.offer_terms_text} onChange={e => setForm(f => ({ ...f, offer_terms_text: e.target.value }))} placeholder="…" rows={3} className="dk-input" style={{ height: 'auto', padding: '12px 16px', resize: 'vertical' }} />
        </label>
      )}
      {error && <span style={{ fontSize: 13, fontWeight: 600, color: '#9B1C1C' }}>{error}</span>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
        <button type="button" className="dk-btn" onClick={handleSave} disabled={saving || saved || !hasChanges} style={{ background: '#0E1116', color: '#fff', opacity: !hasChanges || saving ? 0.4 : 1 }}>
          {saved ? t('savedOk') : saving ? t('savingProfile') : t('saveProfile')}
        </button>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <Modal isOpen onClose={onClose} title={t('missingClientTitle')}>
        {body}
      </Modal>
    );
  }

  return (
    <>
      <div onClick={() => !saving && onClose()} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(14,17,22,0.5)' }} />
      <div role="dialog" aria-label={t('missingClientTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, maxHeight: '90%', overflowY: 'auto', boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116' }}>{t('missingClientTitle')}</span>
        {body}
      </div>
    </>
  );
}

// ─── Combined missing-info modal (desktop) ────────────────────────────────────
function CombinedMissingModal({ profile, checklist, quote, clients, onClose, onSavedProfile, onSavedQuote, onDownload, t }) {
  const profileItems = checklist.filter(c => c.isProfile && !c.ok);
  const offerItems   = checklist.filter(c => !c.isProfile && !c.ok);

  const profileInitial = {
    company_name: profile?.company_name || '',
    first_name:   profile?.first_name   || '',
    last_name:    profile?.last_name    || '',
    tax_number:   profile?.tax_number   || '',
    phone:        profile?.phone        || '',
    bank_account: profile?.bank_account || '',
    bank_name:    profile?.bank_name    || '',
  };
  const offerInitial = {
    client_id:        quote?.client_id        || '',
    offer_number:     quote?.offer_number     || '',
    valid_until:      quote?.valid_until      || '',
    offer_terms_text: quote?.offer_terms_text || '',
  };

  const [profileForm, setProfileForm] = useState(profileInitial);
  const [offerForm,   setOfferForm]   = useState(offerInitial);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');

  const LBL = { fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A6070' };

  const inp = (key, setter, placeholder, type = 'text') => (
    <label key={key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={LBL}>{t(`check${key.charAt(0).toUpperCase() + key.slice(1).replace('_', '')}`) || key}</span>
      <input type={type} value={setter === setProfileForm ? profileForm[key] : offerForm[key]}
        onChange={e => setter(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder} className="dk-input" />
    </label>
  );

  const handleSaveAndDownload = async () => {
    setSaving(true); setError('');
    try {
      if (profileItems.length > 0) {
        const r = await fetch('/api/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profileForm) });
        if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || t('errorGeneral')); return; }
        const fresh = await fetch('/api/auth/profile').then(r => r.json());
        onSavedProfile(fresh.profile || null);
      }
      if (offerItems.length > 0) {
        const r = await fetch(`/api/quotes/${quote.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...offerForm, client_id: offerForm.client_id || null }) });
        if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || t('errorGeneral')); return; }
        const data = await r.json();
        onSavedQuote(data.quote || { ...quote, ...offerForm });
      }
      onDownload();
    } catch { setError(t('errorNetwork')); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={t('warnSheetTitle')} maxWidth="520px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ fontSize: 14, color: '#5A5F68', margin: 0 }}>{t('warnSheetBody')}</p>

        {profileItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ ...LBL, color: '#0E1116', fontSize: 12 }}>{t('missingConstructorTitle')}</span>
            {profileItems.some(i => i.key === 'name') && <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={LBL}>{t('labelCompanyName')}</span>
                <input value={profileForm.company_name} onChange={e => setProfileForm(f => ({ ...f, company_name: e.target.value }))} placeholder="Nemes Renováló Kft." className="dk-input" />
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={LBL}>{t('labelLastName')}</span>
                  <input value={profileForm.last_name} onChange={e => setProfileForm(f => ({ ...f, last_name: e.target.value }))} placeholder="Nemes" className="dk-input" />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={LBL}>{t('labelFirstName')}</span>
                  <input value={profileForm.first_name} onChange={e => setProfileForm(f => ({ ...f, first_name: e.target.value }))} placeholder="Péter" className="dk-input" />
                </label>
              </div>
            </>}
            {profileItems.some(i => i.key === 'tax')   && <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={LBL}>{t('checkTax')}</span><input value={profileForm.tax_number}   onChange={e => setProfileForm(f => ({ ...f, tax_number:   e.target.value }))} placeholder="12345678-2-41"              className="dk-input" /></label>}
            {profileItems.some(i => i.key === 'phone')  && <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={LBL}>{t('checkPhone')}</span><input value={profileForm.phone}        onChange={e => setProfileForm(f => ({ ...f, phone:        e.target.value }))} placeholder="+36 70 …" type="tel"       className="dk-input" /></label>}
            {profileItems.some(i => i.key === 'bank')   && <>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={LBL}>{t('checkBank')}</span><input value={profileForm.bank_account} onChange={e => setProfileForm(f => ({ ...f, bank_account: e.target.value }))} placeholder="12345678-12345678-12345678" className="dk-input" /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={LBL}>{t('labelBankName')}</span><input value={profileForm.bank_name}    onChange={e => setProfileForm(f => ({ ...f, bank_name:    e.target.value }))} placeholder="OTP Bank"                  className="dk-input" /></label>
            </>}
          </div>
        )}

        {offerItems.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {profileItems.length > 0 && <div style={{ height: 1, background: '#EDEBE5' }} />}
            <span style={{ ...LBL, color: '#0E1116', fontSize: 12 }}>{t('missingClientTitle')}</span>
            {offerItems.some(i => i.key === 'client') && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={LBL}>{t('checkClient')}</span>
                <select value={offerForm.client_id} onChange={e => setOfferForm(f => ({ ...f, client_id: e.target.value }))} className="dk-input" style={{ appearance: 'none' }}>
                  <option value="">– {t('noClient')} –</option>
                  {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            )}
            {offerItems.some(i => i.key === 'num') && <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={LBL}>{t('checkOfferNum')}</span><input value={offerForm.offer_number} onChange={e => setOfferForm(f => ({ ...f, offer_number: e.target.value }))} placeholder="2024/001" className="dk-input" /></label>}
            {offerItems.some(i => i.key === 'valid') && <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={LBL}>{t('checkValidUntil')}</span><input type="date" value={offerForm.valid_until} onChange={e => setOfferForm(f => ({ ...f, valid_until: e.target.value }))} className="dk-input" /></label>}
            {offerItems.some(i => i.key === 'terms') && <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span style={LBL}>{t('checkTerms')}</span><textarea value={offerForm.offer_terms_text} onChange={e => setOfferForm(f => ({ ...f, offer_terms_text: e.target.value }))} placeholder="…" rows={3} className="dk-input" style={{ height: 'auto', padding: '12px 14px', resize: 'vertical' }} /></label>}
          </div>
        )}

        {error && <span style={{ fontSize: 13, fontWeight: 600, color: '#9B1C1C' }}>{error}</span>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
          <button type="button" className="dk-btn dk-btn-l" onClick={handleSaveAndDownload} disabled={saving}>
            {saving ? t('generating') : t('warnSheetFill')}
          </button>
          <button type="button" className="dk-btn" onClick={onDownload} style={{ background: '#0f172a', color: '#fff' }}>
            {t('warnSheetSkip')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function OfferPrintPage() {
  const { id } = useParams();
  const router  = useRouter();
  const t = useTranslations('offerPrint');
  const { quotes, quoteSections, quoteEntries, clients, loading, dataReady, isDemoMode, currentUser, collectives, userCurrency, cacheQuote } = useApp();
  const fmtMoney = (n) => formatMoney(n, userCurrency);
  const AppLink  = isDemoMode ? Link : LocaleLink;
  const navPrefix = isDemoMode ? '/demo' : '';

  const isMobile = useMobile();
  const [profile,           setProfile]          = useState(isDemoMode ? DEMO_PROFILE_PRINT : null);
  const [downloading,       setDownloading]       = useState(false);
  const [showMissingModal,  setShowMissingModal]  = useState(false);
  const [missingSheet,      setMissingSheet]      = useState(false);
  const [clientSheet,       setClientSheet]       = useState(false);
  const [missingWarnSheet,  setMissingWarnSheet]  = useState(false);
  const [activeSheet,       setActiveSheet]       = useState(null);

  const doDownload = async () => {
    if (isDemoMode) { alert(t('demoNoPdf')); return; }
    setDownloading(true);
    try {
      const res = await fetch(`/api/quotes/${id}/pdf?accent=${encodeURIComponent(ACCENT)}`);
      if (!res.ok) throw new Error(t('pdfError'));
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

  const docRef    = useRef(null);
  const [docScale,  setDocScale]  = useState(1);
  const [docHeight, setDocHeight] = useState(null);

  useEffect(() => {
    const updateScale = () => setDocScale(Math.min(1, (window.innerWidth - 16) / 794));
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

  useEffect(() => {
    if (isDemoMode || !dataReady || !currentUser) return;
    const q = quotes.find(q => q.id === id);
    if (!q) return;
    const isOwner = q.owner_id === currentUser.id || q.created_by === currentUser.id;
    const isKollektivOwner = collectives?.some(c => c.collective_id === q.collective_id && (c.role === 'owner' || c.role === 'admin'));
    if (!isOwner && !isKollektivOwner) router.replace(`/ajanlatok/${id}`);
  }, [dataReady, currentUser, id, quotes, collectives, isDemoMode, router]);

  if (loading || !dataReady || !profile) {
    return (
      <div className="pod-screen m-root" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas, #EDEBE5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <PageHeader onMenu={() => {}} onMessages={() => {}} onNotifications={() => {}} />
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="animate-spin">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
        </svg>
      </div>
    );
  }

  const quote    = quotes.find(q => q.id === id);
  if (!quote) return <div style={{ padding: '2rem', fontFamily: FONT }}>{t('notFound')}</div>;

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
    { key: 'name',  isProfile: true,  ok: !!(profile.company_name || profile.first_name || profile.last_name), label: t('checkName')       },
    { key: 'tax',   isProfile: true,  ok: !!profile.tax_number,                                                label: t('checkTax')        },
    { key: 'phone', isProfile: true,  ok: !!profile.phone,                                                     label: t('checkPhone')      },
    { key: 'bank',  isProfile: true,  ok: !!profile.bank_account,                                              label: t('checkBank')       },
    { key: 'client',isProfile: false, ok: !!client,                                                            label: t('checkClient')     },
    { key: 'num',   isProfile: false, ok: !!quote.offer_number,                                                label: t('checkOfferNum')   },
    { key: 'valid', isProfile: false, ok: !!quote.valid_until,                                                 label: t('checkValidUntil') },
    { key: 'terms', isProfile: false, ok: !!quote.offer_terms_text,                                            label: t('checkTerms')      },
  ];
  const profileMissing = CHECKLIST.filter(c => !c.ok && c.isProfile);
  const offerMissing   = CHECKLIST.filter(c => !c.ok && !c.isProfile);
  const missing        = [...profileMissing, ...offerMissing];

  const handleDownload = () => {
    if (isDemoMode) { doDownload(); return; }
    if (missing.length > 0) {
      if (!isMobile) { setShowMissingModal(true); return; }
      setMissingWarnSheet(true); return;
    }
    doDownload();
  };

  return (
    <div className="pod-screen m-root" style={{ position: 'relative', minHeight: '100dvh', background: 'var(--m-canvas, #EDEBE5)', overflowX: 'hidden' }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; background: white; }
          .print-root { padding: 0 !important; background: white !important; }
          .pdf-scale-wrap { width: 100% !important; height: auto !important; position: static !important; }
          .pdf-scale-doc  { width: 100% !important; position: static !important; transform: none !important; box-shadow: none !important; }
        }
        @page { size: A4; margin: 14mm 14mm; }
      `}</style>

      {/* ── Desktop toolbar ── */}
      {!isMobile && (
        <div className="no-print" style={{ position: 'sticky', top: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 24px', background: 'var(--m-canvas, #EDEBE5)', borderBottom: '1px solid rgba(14,17,22,0.08)' }}>
          <button type="button" onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, padding: '6px 0', cursor: 'pointer', color: '#5A5F68', fontWeight: 600, fontSize: 14 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
            {t('back') || 'Vissza'}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={handleDownload} disabled={downloading} style={{ height: 44, padding: '0 20px', border: 0, borderRadius: 22, background: '#0f172a', color: '#fff', fontSize: 15, fontWeight: 700, cursor: downloading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {downloading
                ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
              }
              {downloading ? t('generating') : t('downloadPdf')}
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile PageHeader ── */}
      {isMobile && (
        <PageHeader
          onMenu={() => setActiveSheet('menu')}
          onMessages={() => setActiveSheet('messages')}
          onNotifications={() => setActiveSheet('notif')}
        />
      )}

      {/* ── Scrollable content ── */}
      <div style={{ padding: isMobile ? '108px 16px 100px' : '24px 24px 48px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Mobile back link */}
        {isMobile && (
          <button type="button" className="no-print" onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 0, padding: 0, cursor: 'pointer', color: 'var(--m-ink-2, #5A5F68)', alignSelf: 'flex-start' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Preview</span>
          </button>
        )}

        {/* Missing fields strips (mobile only — desktop uses toolbar chips) */}
        {isMobile && !isDemoMode && profileMissing.length > 0 && (
          <button type="button" className="no-print" onClick={() => setMissingSheet(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', border: 0, borderRadius: 22, cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.3)' }}>
            <span style={{ width: 40, height: 40, borderRadius: 20, background: '#FFF1E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A4200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1116' }}>{t('missingConstructorTitle')}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8A4200' }}>{profileMissing.map(i => i.label).join(' · ')}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        )}
        {isMobile && !isDemoMode && offerMissing.length > 0 && (
          <button type="button" className="no-print" onClick={() => setClientSheet(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#fff', border: 0, borderRadius: 22, cursor: 'pointer', textAlign: 'left', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.3)' }}>
            <span style={{ width: 40, height: 40, borderRadius: 20, background: '#FFF1E0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A4200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0E1116' }}>{t('missingClientTitle')}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8A4200' }}>{offerMissing.map(i => i.label).join(' · ')}</div>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
          </button>
        )}

      {/* ── Document wrapper ── */}
      <div className="print-root" style={{ padding: '0 0 2rem' }}>
        <div className="pdf-scale-wrap" style={{ width: 794 * docScale, height: docHeight ? docHeight * docScale : undefined, margin: '0 auto', position: 'relative' }}>
          <div ref={docRef} className="pdf-scale-doc" style={{ width: 794, position: 'absolute', top: 0, left: 0, transformOrigin: 'top left', transform: `scale(${docScale})`, background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', borderRadius: 4 }}>

            {/* Accent bar */}
            <div style={{ height: 6, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}99)`, borderRadius: '4px 4px 0 0' }} />

            <div style={{ padding: '2.5rem 2.75rem 2rem', fontFamily: FONT, color: SLATE }}>

              {/* Header: sender + doc title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.25rem', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  {profile.company_name && <div style={{ fontWeight: 800, fontSize: '1.05rem', color: SLATE, marginBottom: 2 }}>{profile.company_name}</div>}
                  {senderName && <div style={{ fontWeight: profile.company_name ? 500 : 800, fontSize: profile.company_name ? '0.88rem' : '1.05rem', color: SLATE }}>{senderName}</div>}
                  {(profile.zip || profile.city || profile.street) && (
                    <div style={{ marginTop: 4, fontSize: '0.83rem', color: '#64748b', lineHeight: 1.6 }}>
                      {[profile.zip, profile.city].filter(Boolean).join(' ')}{profile.street ? `, ${[profile.street, profile.street_number].filter(Boolean).join(' ')}` : ''}
                    </div>
                  )}
                  {profile.tax_number  && <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{t('taxPrefix')} {profile.tax_number}</div>}
                  {profile.phone       && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{profile.phone}</div>}
                  {profile.bank_account && <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{profile.bank_account}{profile.bank_name ? ` · ${profile.bank_name}` : ''}</div>}
                  {!profile.company_name && !senderName && <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>{t('noHeader')}</div>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', color: ACCENT, lineHeight: 1 }}>{t('docTitle')}</div>
                  <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#64748b', lineHeight: 1.8 }}>
                    {quote.offer_number && <div>{t('labelNumber')} <strong>{quote.offer_number}</strong></div>}
                    <div>{t('labelDate')} <strong>{formatDate(quote.created_at?.split('T')[0])}</strong></div>
                    {quote.valid_until  && <div>{t('labelValidUntil')} <strong>{formatDate(quote.valid_until)}</strong></div>}
                    {quote.start_date   && <div>{t('labelStartDate')} <strong>{formatDate(quote.start_date)}</strong></div>}
                    {quote.end_date     && <div>{t('labelEndDate')} <strong>{formatDate(quote.end_date)}</strong></div>}
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: '#e2e8f0', marginBottom: '1.75rem' }} />

              {/* Client + offer title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 6 }}>{t('clientSection')}</div>
                  {client ? (
                    <div style={{ fontSize: '0.88rem', lineHeight: 1.7 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: SLATE }}>{client.name}</div>
                      {client.address && <div style={{ color: '#475569' }}>{client.address}</div>}
                      {client.phone   && <div style={{ color: '#475569' }}>{client.phone}</div>}
                      {client.email   && <div style={{ color: '#475569' }}>{client.email}</div>}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.83rem', color: '#94a3b8', fontStyle: 'italic' }}>{t('noClient')}</div>
                  )}
                </div>
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: SLATE, lineHeight: 1.3 }}>{quote.title}</div>
                  {quote.location  && <div style={{ fontSize: '0.83rem', color: '#64748b', marginTop: 3 }}>📍 {quote.location}</div>}
                  {quote.work_type && <div style={{ fontSize: '0.83rem', color: '#64748b' }}>🔧 {quote.work_type}</div>}
                </div>
              </div>

              {/* Description */}
              {quote.description && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `3px solid ${ACCENT}`, borderRadius: '0 6px 6px 0', padding: '0.75rem 1rem', marginBottom: '1.75rem', fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                  {quote.description}
                </div>
              )}

              {/* Sections */}
              {sections.map((section, si) => {
                const sectionEntries = allEntries.filter(e => e.section_id === section.id);
                const sectionTotal   = sectionEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
                return (
                  <div key={section.id} style={{ marginBottom: '1.5rem', pageBreakInside: 'avoid' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: `4px solid ${ACCENT}`, borderRadius: '0 8px 0 0', padding: '0.65rem 0.9rem 0.5rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: ACCENT }}>{t('sectionNum', { num: si + 1 })}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: SLATE }}>{section.name}</span>
                        </div>
                        <SectionMeasurements section={section} />
                        {section.description && <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#64748b', fontStyle: 'italic' }}>{section.description}</div>}
                      </div>
                      {sectionTotal > 0 && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('subtotal')}</div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem', color: SLATE }}>{fmtMoney(sectionTotal)}</div>
                        </div>
                      )}
                    </div>
                    {sectionEntries.length > 0 ? (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                        <thead>
                          <tr style={{ background: '#f1f5f9' }}>
                            <th style={{ textAlign: 'left',   padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{t('colDescription')}</th>
                            <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{t('colType')}</th>
                            <th style={{ textAlign: 'right',  padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{t('colQty')}</th>
                            <th style={{ textAlign: 'right',  padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{t('colUnitPrice')}</th>
                            <th style={{ textAlign: 'right',  padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{t('colAmount')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sectionEntries.map((e, i) => (
                            <tr key={e.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '0.45rem 0.75rem', color: SLATE, lineHeight: 1.4 }}>
                                <div style={{ fontWeight: 600 }}>{e.work_description}</div>
                                {e.notes && <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{e.notes}</div>}
                              </td>
                              <td style={{ padding: '0.45rem 0.5rem', textAlign: 'center' }}><TypeBadge type={e.entry_type} /></td>
                              <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>{e.quantity != null ? `${e.quantity} ${e.unit || 'db'}` : '—'}</td>
                              <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569', whiteSpace: 'nowrap' }}>{e.unit_price != null ? fmtMoney(e.unit_price) : '—'}</td>
                              <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: SLATE, whiteSpace: 'nowrap' }}>{fmtMoney(e.amount_huf)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <div style={{ padding: '0.65rem 0.9rem', border: '1px solid #e2e8f0', borderTop: 'none', fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>{t('noEntries')}</div>
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
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderLeft: '4px solid #94a3b8', borderRadius: '0 8px 0 0', padding: '0.55rem 0.9rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#475569' }}>{t('generalItems')}</span>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', border: '1px solid #e2e8f0', borderTop: 'none' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          <th style={{ textAlign: 'left',   padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{t('colDescription')}</th>
                          <th style={{ textAlign: 'center', padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{t('colType')}</th>
                          <th style={{ textAlign: 'right',  padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{t('colQty')}</th>
                          <th style={{ textAlign: 'right',  padding: '0.4rem 0.5rem',  fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{t('colUnitPrice')}</th>
                          <th style={{ textAlign: 'right',  padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{t('colAmount')}</th>
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
                            <td style={{ padding: '0.45rem 0.5rem', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.8rem', color: '#475569' }}>{e.unit_price != null ? fmtMoney(e.unit_price) : '—'}</td>
                            <td style={{ padding: '0.45rem 0.75rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: '0.88rem', color: SLATE }}>{fmtMoney(e.amount_huf)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Totals */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <div style={{ minWidth: 280, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  <div style={{ padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 500 }}>{t('netTotal')}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, color: SLATE }}>{fmtMoney(netTotal)}</span>
                  </div>
                  {taxRate > 0 && (
                    <div style={{ padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontSize: '0.83rem', color: '#64748b', fontWeight: 500 }}>{t('vatLine', { rate: taxRate })}</span>
                      <span style={{ fontFamily: 'monospace', color: '#64748b' }}>{fmtMoney(taxAmount)}</span>
                    </div>
                  )}
                  <div style={{ padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: ACCENT }}>
                    <span style={{ fontSize: '0.88rem', color: ACCENT_TEXT, fontWeight: 700 }}>{t('grossTotal')}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: ACCENT_TEXT }}>{fmtMoney(grossTotal)}</span>
                  </div>
                </div>
              </div>

              {/* Signature */}
              <div style={{ marginTop: '3.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
                {[t('signContractor'), t('signClient')].map(label => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ height: 1, background: '#cbd5e1', marginBottom: 8 }} />
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 500 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              {(quote.valid_until || profile.terms_pdf_name || (quote.terms_attachments || []).some(a => a.attached) || quote.payment_deadline_days > 0 || quote.deposit_percent > 0 || quote.warranty_months > 0 || quote.offer_terms_text) && (
                <div style={{ marginTop: '2rem', paddingTop: '0.85rem', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {quote.valid_until             && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t('footerValidUntil')} <strong>{formatDate(quote.valid_until)}</strong></div>}
                  {quote.payment_deadline_days > 0 && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t('footerPaymentDays')} <strong>{quote.payment_deadline_days} {t('footerPaymentDaysUnit')}</strong>{quote.payment_method ? `, ${quote.payment_method}` : ''}</div>}
                  {quote.deposit_percent > 0       && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t('footerDeposit')} <strong>{quote.deposit_percent}%</strong>{grossTotal > 0 ? ` (${fmtMoney(Math.round(grossTotal * quote.deposit_percent / 100))})` : ''} {t('footerDepositSuffix')}</div>}
                  {quote.warranty_months > 0       && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t('footerWarranty')} <strong>{quote.warranty_months} {t('footerWarrantyUnit')}</strong></div>}
                  {quote.attach_profile_terms !== false && profile.terms_pdf_name && <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t('footerTerms')} <strong>{profile.terms_pdf_name}</strong></div>}
                  {(quote.terms_attachments || []).filter(a => a.attached).map(a => (
                    <div key={a.id} style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{t('footerTerms')} <strong>{a.name}</strong></div>
                  ))}
                  {quote.offer_terms_text           && <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{quote.offer_terms_text}</div>}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      </div>{/* end scroll area */}

      {/* ── Fixed download bar (mobile only) ── */}
      {isMobile && <div className="no-print" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, padding: `12px 16px calc(16px + env(safe-area-inset-bottom))`, background: 'var(--m-canvas, #EDEBE5)' }}>
        <button type="button" onClick={handleDownload} disabled={downloading} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#0f172a', color: '#fff', fontSize: 17, fontWeight: 700, cursor: downloading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 20px rgba(15,23,42,0.35)' }}>
          {downloading
            ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true" className="animate-spin"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
            : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
          }
          {downloading ? t('generating') : t('downloadPdf')}
        </button>
      </div>}

      {/* ── Missing fields warning sheet ── */}
      {missingWarnSheet && (
        <>
          <div onClick={() => setMissingWarnSheet(false)} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && setMissingWarnSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 48, background: 'rgba(14,17,22,0.5)', border: 0 }} />
          <div role="alertdialog" className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 49, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '4px 0' }}>
              <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, background: '#FFF1E0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A4200" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: 'var(--m-ink)', lineHeight: 1.2, marginBottom: 6 }}>{t('warnSheetTitle')}</div>
                <div style={{ fontSize: 15, fontWeight: 500, color: '#5A5F68', lineHeight: 1.5 }}>{t('warnSheetBody')}</div>
              </div>
            </div>
            <button onClick={() => { setMissingWarnSheet(false); setMissingSheet(true); }} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: 'var(--primary, #0f172a)', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {t('warnSheetFill')}
            </button>
            <button onClick={() => { setMissingWarnSheet(false); doDownload(); }} style={{ width: '100%', height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {t('warnSheetSkip')}
            </button>
          </div>
        </>
      )}

      {/* ── Desktop: combined missing-info + download modal ── */}
      {showMissingModal && (
        <CombinedMissingModal
          profile={profile}
          checklist={CHECKLIST}
          quote={quote}
          clients={clients}
          onClose={() => setShowMissingModal(false)}
          onSavedProfile={setProfile}
          onSavedQuote={q => cacheQuote && cacheQuote(q)}
          onDownload={() => { setShowMissingModal(false); doDownload(); }}
          t={t}
        />
      )}

      {missingSheet && (
        <MissingSheet
          profile={profile}
          checklist={CHECKLIST}
          navPrefix={navPrefix}
          quoteId={id}
          onClose={() => setMissingSheet(false)}
          onSaved={setProfile}
          t={t}
          isModal={!isMobile}
        />
      )}
      {clientSheet && (
        <ClientSheet
          quote={quote}
          offerMissing={offerMissing}
          onClose={() => setClientSheet(false)}
          onSaved={q => cacheQuote && cacheQuote(q)}
          t={t}
          isModal={!isMobile}
        />
      )}

      {activeSheet === 'notif'    && <NotifSheet    onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'messages' && <MessagesSheet onClose={() => setActiveSheet(null)} />}
      {activeSheet === 'menu'     && <MenuSheet     onClose={() => setActiveSheet(null)} />}
    </div>
  );
}
