'use client';

/**
 * P2 — New project (mobile pods view)
 * Step 1: destination (personal / collective)
 * Step 2: form fields
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';
import QuickClientSheet from '@/app/[locale]/ajanlatok/mobile/QuickClientSheet';

const PROJ_BG = '#263248';
const PROJ_DEEP = '#0B0F17';

function CloseBtn({ onClick }) {
  return (
    <button onClick={onClick} aria-label="Bezárás" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer' }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
  );
}

export default function ProjectNewMobile() {
  const t = useTranslations('projects');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    currentUser, clients = [], collectives: memberships = [],
    quotes = [], activeCollectiveId, isDemoMode, refreshSupabaseData, createClient,
  } = useApp();

  // When in collective context, AppContext.quotes only has collective quotes.
  // Fetch personal quotes separately so the picker can always show them.
  const [personalQuotes, setPersonalQuotes] = useState(null);
  useEffect(() => {
    if (!activeCollectiveId) return;
    fetch('/api/quotes')
      .then(r => r.ok ? r.json() : null)
      .then(d => d?.quotes && setPersonalQuotes(d.quotes))
      .catch(() => {});
  }, [activeCollectiveId]);

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [step, setStep] = useState(1);
  const [space, setSpace] = useState('personal');
  const [name, setName] = useState('');
  const [quoteId, setQuoteId] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });
  const [quoteSheet, setQuoteSheet] = useState(false);
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('all');
  const [newClientSheet, setNewClientSheet] = useState(false);

  const isPremium = isEffectivePremium(currentUser);

  const spaces = useMemo(() => {
    const list = [{ id: 'personal', name: t('personalWorkspace'), type: 'personal', ...PERSONAL_COLOR, icon: 'M5 11h14v10H5zM8 11V8a4 4 0 018 0v3' }];
    (memberships || []).forEach(m => {
      const col = podColor(m.collective_id);
      const isContributor = m.role === 'contributor';
      list.push({
        id: m.collective_id,
        name: m.name || t('collectiveFallback'),
        type: isContributor ? 'contributor' : 'collective',
        icon: 'M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4',
        ...col,
      });
    });
    return list;
  }, [memberships, t]);

  const selectedSpace = spaces.find(s => s.id === space) || spaces[0];
  const isShared = space !== 'personal';
  const isContributor = selectedSpace?.type === 'contributor';

  const collectiveId = space !== 'personal' ? space : null;

  // Build quote picker list
  const quoteGroups = useMemo(() => {
    const q = quoteSearch.trim().toLowerCase();
    const col = space !== 'personal' ? space : null;
    // When in collective context, AppContext.quotes has collective quotes only.
    // personalQuotes holds the user's own personal quotes fetched separately.
    const personalSource = personalQuotes ?? (quotes || []).filter(qt => !qt.collective_id);
    const statusOk = qt => quoteStatusFilter === 'all' || qt.status === quoteStatusFilter;
    const personal = personalSource.filter(qt => !qt.deleted_at && statusOk(qt));
    const collective = col ? (quotes || []).filter(qt => !qt.deleted_at && statusOk(qt) && qt.collective_id === col) : [];
    const filter = arr => !q ? arr : arr.filter(qt => (qt.title || '').toLowerCase().includes(q));
    const groups = [{ name: t('quoteContextPersonal'), items: filter(personal) }];
    if (col) groups.push({ name: selectedSpace?.name || '', items: filter(collective) });
    return groups;
  }, [quotes, personalQuotes, space, quoteSearch, quoteStatusFilter, t, selectedSpace]);

  const selectedQuote = [...(quotes || []), ...(personalQuotes || [])].find(q => q.id === quoteId);
  const selectedClient = clients.find(c => c.id === clientId);

  const handleQuoteSelect = useCallback((q) => {
    setQuoteId(q.id);
    setQuoteSheet(false);
    if (!name && q.title)           setName(q.title);
    if (!clientId && q.client_id)   setClientId(q.client_id);
    if (!location && q.location)    setLocation(q.location);
    if (!workType && q.work_type)   setWorkType(q.work_type);
    if (!startDate && q.start_date) setStartDate(q.start_date);
    if (!endDate && q.end_date)     setEndDate(q.end_date);
    if (!description && q.description) setDescription(q.description);
    if (q.collective_id)            setSpace(q.collective_id);
  }, [name, clientId, location, workType, startDate, endDate, description]);

  const handleCreate = async () => {
    if (!name.trim()) { setAlertModal({ open: true, message: t('clientRequired') }); return; }
    setSaving(true);
    try {
      const effectiveCollectiveId = isContributor ? null : collectiveId;
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          clientId: clientId || null,
          collectiveId: effectiveCollectiveId,
          quoteId: quoteId || null,
          startDate: startDate || null,
          endDate: endDate || null,
          location: location.trim() || null,
          workType: workType.trim() || null,
          memberIds: currentUser?.id ? [currentUser.id] : [],
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        setAlertModal({ open: true, message: error || t('createError') });
        return;
      }
      const data = await res.json();
      const newId = data.project?.id || data.id;
      if (isContributor && collectiveId && newId) {
        await fetch('/api/transfer-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_type: 'project', document_id: newId, collective_id: collectiveId }),
        }).catch(() => {});
      }
      await refreshSupabaseData().catch(() => {});
      router.push(p(`/projektek/${newId}`));
    } catch {
      setAlertModal({ open: true, message: t('createError') });
    } finally {
      setSaving(false);
    }
  };


  const inputStyle = { width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)' };

  return (
    <div className="pod-screen-dark m-root" style={{ minHeight: '100dvh', background: PROJ_DEEP, color: '#fff', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)' }}>
      {!isOnline && (
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      <div style={{ overflowY: 'auto', paddingBottom: 180 }}>
        {/* Header */}
        <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 20px', borderRadius: '0 0 32px 32px', background: PROJ_BG, color: '#fff', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <CloseBtn onClick={() => router.push(p('/projektek'))} />
            <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.18)', display: 'inline-flex', alignItems: 'center' }}>
              {step} / 2
            </span>
            <span style={{ width: 48 }} />
          </div>
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.80)' }}>{t('newProject')}</span>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {step === 1 ? t('destinationTitle') : t('formTitle')}
          </h1>
        </header>

        {/* Step 1: destination */}
        {step === 1 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {spaces.map(sp => {
              const on = space === sp.id;
              return (
                <button
                  key={sp.id}
                  onClick={() => setSpace(sp.id)}
                  aria-pressed={on}
                  style={{ minHeight: 120, boxSizing: 'border-box', padding: 16, border: 0, borderRadius: 26, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', boxShadow: on ? `0 0 0 3px ${sp.bg}, 0 14px 26px -18px rgba(14,17,22,0.35)` : '0 1px 0 rgba(14,17,22,0.05), 0 14px 26px -18px rgba(14,17,22,0.35)' }}
                >
                  <span style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 28, background: sp.bg, color: sp.fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d={sp.icon}/></svg>
                  </span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700 }}>{sp.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57' }}>
                      {sp.type === 'personal' ? t('personalWorkspace') : sp.type === 'contributor' ? t('contributorNote') : t('sharedNote')}
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 15, border: `2px solid ${on ? sp.bg : '#C9C5BA'}`, background: on ? sp.bg : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
                  </span>
                </button>
              );
            })}
            {isShared && (
              <div style={{ boxSizing: 'border-box', padding: '14px 16px', borderRadius: 22, background: 'rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.90)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 8v5M12 16h.01M12 3a9 9 0 100 18 9 9 0 000-18z"/></svg>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
                  <b>{isContributor ? t('contributorNote') : t('sharedNote')}</b><br/>
                  {isContributor ? t('contributorNoteText') : t('sharedNoteText')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: form */}
        {step === 2 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Space chip */}
            <button onClick={() => setStep(1)} style={{ alignSelf: 'flex-start', minHeight: 48, padding: '0 16px', border: 0, borderRadius: 24, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: selectedSpace?.bg || PROJ_BG }} />
              {selectedSpace?.name}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {/* Name */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('nameLabel')} *</span>
              <input type="text" placeholder={t('namePlaceholder')} value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
            </label>

            {/* Quote picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('linkedQuote')} <span style={{ fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>{t('linkedQuoteOptional')}</span></span>
              <button onClick={() => setQuoteSheet(true)} style={{ width: '100%', boxSizing: 'border-box', height: 64, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
                <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: '#E3E7EE', color: PROJ_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M7 3h7l4 4v14H7zM14 3v5h4"/></svg>
                </span>
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedQuote ? selectedQuote.title : t('noLinkedQuote')}
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
              </button>
              {selectedQuote && (
                <button onClick={() => setQuoteId(null)} style={{ alignSelf: 'flex-start', minHeight: 44, border: 0, background: 'transparent', color: 'rgba(255,255,255,0.80)', fontSize: 14, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}>{t('removeLinkedQuote')}</button>
              )}
            </div>

            {/* Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('clientLabel')}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={clientId || ''}
                  onChange={e => setClientId(e.target.value || null)}
                  style={{ flex: 1, height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', cursor: 'pointer' }}
                  aria-label={t('clientLabel')}
                >
                  <option value="">{t('clientLabel')}…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button aria-label={t('newClientSection')} onClick={() => setNewClientSheet(true)} style={{ flexShrink: 0, width: 56, height: 56, border: 0, borderRadius: 20, background: 'var(--m-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            </div>

            {/* Location, work type */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('locationLabel')}</span>
              <input type="text" placeholder={t('locationPlaceholder')} value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('workTypeLabel')}</span>
              <input type="text" placeholder={t('workTypePlaceholder')} value={workType} onChange={e => setWorkType(e.target.value)} style={inputStyle} />
            </label>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('startLabel')}</span>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ ...inputStyle, fontSize: 15 }} />
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('endLabel')}</span>
                <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} style={{ ...inputStyle, fontSize: 15 }} />
              </label>
            </div>

            {/* Description */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('descriptionLabel')}</span>
              <textarea placeholder={t('descriptionPlaceholder')} value={description} onChange={e => setDescription(e.target.value)} rows={3} style={{ width: '100%', boxSizing: 'border-box', height: 96, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', resize: 'none' }} />
            </label>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `28px 16px calc(18px + env(safe-area-inset-bottom))`, background: `linear-gradient(to top, ${PROJ_DEEP} 65%, rgba(0,0,0,0))`, display: 'flex', gap: 10 }}>
        {step === 2 && (
          <button aria-label={t('back')} onClick={() => setStep(1)} style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
        )}
        <button
          onClick={step === 1 ? () => setStep(2) : handleCreate}
          disabled={saving}
          style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: PROJ_BG, color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', boxShadow: '0 14px 26px -12px rgba(14,17,22,0.6)' }}
        >
          {step === 1 ? t('toNextStep') : (saving ? '…' : t('createProject'))}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>

      {/* Quote picker sheet */}
      {quoteSheet && (
        <>
          <div onClick={() => setQuoteSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && setQuoteSheet(false)} />
          <div role="dialog" aria-label={t('quotePickerTitle')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '88%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('quotePickerTitle')}</span>
              <button onClick={() => setQuoteSheet(false)} aria-label={t('close')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57', lineHeight: 1.4, background: '#E3E7EE', borderRadius: 16, padding: '10px 12px' }}>
              {space === 'personal' ? t('quoteContextPersonal') : t('quoteContextCollective', { name: selectedSpace?.name })}
            </span>
            <input type="search" placeholder={t('quoteSearchPlaceholder')} value={quoteSearch} onChange={e => setQuoteSearch(e.target.value)} aria-label={t('quoteSearchPlaceholder')} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }} />
            {/* Status filter chips */}
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
              {['all', 'draft', 'sent', 'accepted', 'rejected'].map(f => {
                const on = quoteStatusFilter === f;
                return (
                  <button key={f} onClick={() => setQuoteStatusFilter(f)} aria-pressed={on}
                    style={{ height: 40, padding: '0 14px', border: 0, borderRadius: 20, fontSize: 14, fontWeight: 700, flexShrink: 0, cursor: 'pointer', background: on ? PROJ_BG : '#EFEDE6', color: on ? '#fff' : '#4A4F57' }}>
                    {t(`quotePickerFilter${f.charAt(0).toUpperCase() + f.slice(1)}`)}
                  </button>
                );
              })}
            </div>
            {quoteGroups.every(g => g.items.length === 0) && <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68', padding: '8px 4px' }}>{t('quotePickerNoResults')}</span>}
            {quoteGroups.map(g => g.items.length > 0 && (
              <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{g.name}</span>
                {g.items.map(q => {
                  const STATUS_COLORS = { draft: ['#F0F0F2', '#2B3038'], sent: ['#FFF1E0', '#8A4200'], accepted: ['#E7F4EC', '#14532D'], rejected: ['#FDECEC', '#9B1C1C'] };
                  const [sBg, sFg] = STATUS_COLORS[q.status] || STATUS_COLORS.draft;
                  return (
                    <button key={q.id} onClick={() => handleQuoteSelect(q)} style={{ width: '100%', minHeight: 68, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: quoteId === q.id ? `0 0 0 3px ${PROJ_BG}` : '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer' }}>
                      <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <b style={{ fontSize: 16 }}>{q.title}</b>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ height: 22, padding: '0 8px', borderRadius: 11, fontSize: 12, fontWeight: 700, background: sBg, color: sFg, display: 'inline-flex', alignItems: 'center' }}>
                            {t(`quotePickerFilter${(q.status || 'draft').charAt(0).toUpperCase() + (q.status || 'draft').slice(1)}`)}
                          </span>
                          {q.created_at && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{formatDate(q.created_at)}</span>}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}

      {/* New client sheet */}
      {newClientSheet && (
        <>
          <div onClick={() => setNewClientSheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && setNewClientSheet(false)} />
          <QuickClientSheet
            createClient={createClient}
            onCreated={(client) => { setClientId(client.id); setNewClientSheet(false); }}
            onClose={() => setNewClientSheet(false)}
            accentColor={PROJ_BG}
          />
        </>
      )}

      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ open: false, message: '' })}
        message={alertModal.message}
        type="error"
      />
    </div>
  );
}
