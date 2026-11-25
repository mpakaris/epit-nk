'use client';

/**
 * O2 — New offer (mobile pods view)
 * Step 1: destination (personal / collective)
 * Step 2: form fields (title, survey picker, client, location, work type, VAT, description)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import useOnline from '@/hooks/useOnline';
import { AlertModal } from '@/components/Modal';
import UpgradeModal from '@/components/UpgradeModal';
import QuickClientSheet from './QuickClientSheet';

const VIOLET_DEST = { bg: '#6D3FD1', fg: '#fff', glow: 'rgba(255,255,255,0.10)', glass: 'rgba(255,255,255,0.18)', soft: 'rgba(255,255,255,0.88)', tint: '#EDE7FB', deep: '#1C1038' };

export default function OfferNewMobile() {
  const t = useTranslations('quotes');
  const router = useRouter();
  const isOnline = useOnline();
  const {
    currentUser, surveys: allSurveys = [], clients = [], collectives: memberships = [],
    createQuote, createClient, isDemoMode, surveys, quotes = [],
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [step, setStep] = useState(1);
  const [space, setSpace] = useState('personal'); // 'personal' | collective_id
  const [title, setTitle] = useState('');
  const [surveyId, setSurveyId] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [location, setLocation] = useState('');
  const [workType, setWorkType] = useState('');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedEnd, setPlannedEnd] = useState('');
  const [vat, setVat] = useState(currentUser?.default_tax_percent ?? 27);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [alertModal, setAlertModal] = useState({ open: false, message: '' });
  const [upgradeDocType, setUpgradeDocType] = useState(null);
  const [surveySheet, setSurveySheet] = useState(false);
  const [surveySearch, setSurveySearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [newClientSheet, setNewClientSheet] = useState(false);

  const isPremium = isEffectivePremium(currentUser);
  const quoteCount = useMemo(() => (quotes || []).filter(q => !q.deleted_at).length, [quotes]);
  const FREE_LIMIT = 5;
  const atLimit = !isPremium && quoteCount >= FREE_LIMIT;

  // Build space list
  const spaces = useMemo(() => {
    const list = [{ id: 'personal', name: t('personalWorkspace'), desc: t('offerSpacePersonalDesc'), icon: 'M5 11h14v10H5zM8 11V8a4 4 0 018 0v3', ...PERSONAL_COLOR, type: 'personal' }];
    (memberships || []).forEach(m => {
      const col = podColor(m.collective_id);
      const isContributor = m.role === 'contributor';
      list.push({
        id: m.collective_id,
        name: m.name || t('collectiveFallback'),
        desc: isContributor ? t('offerSpaceContributorNote') : `${t('offerSpaceCollective')} · ${m.role === 'owner' ? t('offerRoleOwner') : t('offerRoleAdmin')}`,
        icon: 'M9 8a3 3 0 106 0 3 3 0 10-6 0M3 20c0-3 2.7-5 6-5M21 20c0-3-2.7-5-6-5M7 20c0-2.2 2.2-4 5-4s5 1.8 5 4',
        ...col,
        type: isContributor ? 'contributor' : 'collective',
      });
    });
    return list;
  }, [memberships, t]);

  const selectedSpace = spaces.find(s => s.id === space) || spaces[0];
  const isShared = space !== 'personal';
  const isContributor = selectedSpace?.type === 'contributor';

  // Survey picker
  const surveyGroups = useMemo(() => {
    const q = surveySearch.trim().toLowerCase();
    const col = space !== 'personal' ? space : null;
    const all = (allSurveys || []).filter(s => !s.deleted_at && (!s.archived_at || showInactive));
    const personal = all.filter(s => !s.collective_id);
    const collective = col ? all.filter(s => s.collective_id === col) : [];
    const filter = (arr) => !q ? arr : arr.filter(s => (s.title || '').toLowerCase().includes(q));
    const groups = [{ name: t('surveysPersonalGroup'), items: filter(personal) }];
    if (col) groups.push({ name: selectedSpace?.name || '', items: filter(collective) });
    return groups;
  }, [allSurveys, space, surveySearch, showInactive, t, selectedSpace]);

  const selectedSurvey = allSurveys.find(s => s.id === surveyId);

  const selectedClient = clients.find(c => c.id === clientId);

  const handleCreate = async () => {
    if (!title.trim()) { setAlertModal({ open: true, message: t('titleRequired') }); return; }
    if (atLimit) { setAlertModal({ open: true, message: t('offerLimitReached') }); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        client_id: clientId || null,
        location: location.trim() || null,
        work_type: workType.trim() || null,
        planned_start: plannedStart || null,
        planned_end: plannedEnd || null,
        tax_percent: vat,
        description: description.trim() || null,
        survey_id: surveyId || null,
        collective_id: space !== 'personal' ? space : null,
      };
      const res = await fetch('/api/quotes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.code === 'LIMIT_REACHED') { setUpgradeDocType(body.docType); return; }
        setAlertModal({ open: true, message: body.error || t('saveError') });
        return;
      }
      const data = await res.json();
      const newId = data.id || data.quote?.id;
      if (surveyId && newId) {
        await fetch(`/api/quotes/${newId}/import-survey`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ survey_id: surveyId }) }).catch(() => {});
      }
      router.push(p(`/ajanlatok/${newId}`));
    } catch {
      setAlertModal({ open: true, message: t('saveError') });
    } finally {
      setSaving(false);
    }
  };


  const dest = { ...VIOLET_DEST };

  return (
    <div className="pod-screen-dark m-root" style={{ minHeight: '100dvh', background: dest.deep, color: '#fff', fontFamily: 'var(--font-main, "Plus Jakarta Sans", system-ui, sans-serif)' }}>
      {!isOnline && (
        <div style={{ position: 'sticky', top: 0, zIndex: 30, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 14, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      <div style={{ overflowY: 'auto', paddingBottom: 180 }}>
        {/* Violet header */}
        <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 20px', borderRadius: '0 0 32px 32px', background: dest.bg, color: dest.fg, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: dest.glow }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button aria-label={t('close')} onClick={() => router.push(p('/ajanlatok'))} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: dest.glass, color: dest.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
            <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, background: dest.glass, display: 'inline-flex', alignItems: 'center' }}>
              {step} / 2
            </span>
            <span style={{ width: 48 }} />
          </div>
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: dest.soft }}>{t('new')}</span>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {step === 1 ? t('offerStep1Heading') : t('basicData')}
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
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57' }}>{sp.desc}</span>
                  </span>
                  <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 15, border: `2px solid ${on ? sp.bg : '#C9C5BA'}`, background: on ? sp.bg : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
                  </span>
                </button>
              );
            })}
            {isShared && (
              <div style={{ boxSizing: 'border-box', padding: '14px 16px', borderRadius: 22, background: '#FFF3E3', color: '#6B3300', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }}><path d="M12 8v5M12 16h.01M12 3a9 9 0 100 18 9 9 0 000-18z"/></svg>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
                  <b>{isContributor ? t('offerContributorNoteTitle') : t('offerCollectiveNoteTitle')}</b><br/>
                  {isContributor ? t('offerContributorNoteText') : t('offerCollectiveNoteText')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: form */}
        {step === 2 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Space chip */}
            <button onClick={() => setStep(1)} style={{ alignSelf: 'flex-start', minHeight: 48, padding: '0 16px', border: 0, borderRadius: 24, background: dest.tint, color: 'var(--m-ink)', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: selectedSpace?.bg || dest.bg }} />
              {selectedSpace?.name}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {/* Title */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('metaTitle')}</span>
              <input type="text" placeholder={t('metaTitlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)' }} />
            </label>

            {/* Survey picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('surveyOptional', { note: t('surveyNote') })}</span>
              <div style={{ position: 'relative' }}>
                <button onClick={() => setSurveySheet(true)} style={{ width: '100%', boxSizing: 'border-box', height: 64, border: 0, borderRadius: 20, background: '#fff', padding: selectedSurvey ? '0 56px 0 16px' : '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
                  <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 13, background: dest.tint, color: 'var(--m-offer-ink, #4A2796)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"/></svg>
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedSurvey ? selectedSurvey.title : t('surveysEmpty')}</span>
                    {selectedSurvey && <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{selectedSurvey.created_at ? formatDate(selectedSurvey.created_at) : ''}</span>}
                  </span>
                  {!selectedSurvey && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M6 9l6 6 6-6"/></svg>}
                </button>
                {selectedSurvey && (
                  <button
                    type="button"
                    aria-label={t('offerRemoveSurvey')}
                    onClick={() => setSurveyId(null)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 40, height: 40, border: 0, borderRadius: 20, background: '#F0EDE8', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}
              </div>
            </div>

            {/* Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('client')}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={clientId || ''}
                  onChange={e => setClientId(e.target.value || null)}
                  style={{ flex: 1, height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 16, fontWeight: 500, color: 'var(--m-ink)', cursor: 'pointer' }}
                  aria-label={t('client')}
                >
                  <option value="">{t('client')}…</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button aria-label={t('newClientTitle')} onClick={() => setNewClientSheet(true)} style={{ flexShrink: 0, width: 56, height: 56, border: 0, borderRadius: 20, background: 'var(--m-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            </div>

            {/* Location, work type */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('location')}</span>
              <input type="text" placeholder={t('locationPlaceholder')} value={location} onChange={e => setLocation(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('workType')}</span>
              <input type="text" placeholder={t('workTypePlaceholder')} value={workType} onChange={e => setWorkType(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)' }} />
            </label>

            {/* Dates */}
            <div style={{ display: 'flex', gap: 10 }}>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('plannedStart')}</span>
                <input type="date" value={plannedStart} onChange={e => setPlannedStart(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 15, fontWeight: 500, color: 'var(--m-ink)' }} />
              </label>
              <label style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('plannedEnd')}</span>
                <input type="date" value={plannedEnd} onChange={e => setPlannedEnd(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 15, fontWeight: 500, color: 'var(--m-ink)' }} />
              </label>
            </div>

            {/* VAT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{t('vatRate')}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[27, 18, 5, 0].map(v => {
                  const on = vat === v;
                  return (
                    <button key={v} onClick={() => setVat(v)} aria-pressed={on} style={{ flex: 1, height: 52, border: 0, borderRadius: 26, fontSize: 15, fontWeight: 700, background: on ? '#fff' : 'rgba(255,255,255,0.14)', color: on ? 'var(--m-ink)' : '#fff', cursor: 'pointer' }}>
                      {v}%
                    </button>
                  );
                })}
              </div>
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
      <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `28px 16px calc(18px + env(safe-area-inset-bottom))`, background: `linear-gradient(to top, ${dest.deep} 65%, rgba(0,0,0,0))`, display: 'flex', gap: 10 }}>
        {step === 2 && (
          <button aria-label={t('back')} onClick={() => setStep(1)} style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
        )}
        <button
          onClick={step === 1 ? () => setStep(2) : handleCreate}
          disabled={saving || (step === 2 && !title.trim())}
          style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: step === 2 && !title.trim() ? '#B9B5AA' : 'var(--m-offer, #6D3FD1)', color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: step === 2 && !title.trim() ? 'default' : 'pointer', boxShadow: step === 2 && !title.trim() ? 'none' : '0 14px 26px -12px rgba(14,17,22,0.6)' }}
        >
          {step === 1 ? t('offerStep1Btn') : (saving ? '…' : t('createQuote'))}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
      </div>

      {/* Survey picker sheet */}
      {surveySheet && (
        <>
          <div onClick={() => setSurveySheet(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(14,17,22,0.5)' }} role="button" tabIndex={0} aria-label={t('close')} onKeyDown={e => e.key === 'Enter' && setSurveySheet(false)} />
          <div role="dialog" aria-label={t('survey')} className="pod-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet, #FBFAF7)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '88%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1, color: 'var(--m-ink)' }}>{t('survey')}</span>
              <button onClick={() => setSurveySheet(false)} aria-label={t('close')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57', lineHeight: 1.4, background: dest.tint, borderRadius: 16, padding: '10px 12px' }}>
              {space === 'personal' ? t('surveyContextPersonal') : t('surveyContextCollective', { name: selectedSpace?.name })}
            </span>
            <input
              type="search"
              placeholder={t('surveysSearchPlaceholder')}
              value={surveySearch}
              onChange={e => setSurveySearch(e.target.value)}
              aria-label={t('surveysSearchPlaceholder')}
              style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }}
            />
            {surveyGroups.every(g => g.items.length === 0) && <span style={{ fontSize: 14, fontWeight: 600, color: '#5A5F68', padding: '8px 4px' }}>{t('surveysNoResult')}</span>}
            {surveyGroups.map(g => g.items.length > 0 && (
              <div key={g.name} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{g.name}</span>
                {g.items.map(sv => (
                  <button key={sv.id} onClick={() => {
                    setSurveyId(sv.id);
                    setSurveySheet(false);
                    if (sv.location  && !location.trim())  setLocation(sv.location);
                    if (sv.client_id && !clientId)         setClientId(sv.client_id);
                    if (sv.title     && !title.trim())     setTitle(sv.title);
                  }} style={{ width: '100%', minHeight: 68, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: surveyId === sv.id ? `0 0 0 3px var(--m-offer, #6D3FD1)` : '0 1px 0 rgba(14,17,22,0.05), 0 12px 22px -18px rgba(14,17,22,0.35)', cursor: 'pointer', opacity: sv.archived_at ? 0.7 : 1 }}>
                    <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <b style={{ fontSize: 16 }}>{sv.title}</b>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{sv.created_at ? formatDate(sv.created_at) : ''}</span>
                    </span>
                    {sv.archived_at && <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, background: '#F0F0F2', color: '#2B3038' }}>{t('surveyInactive')}</span>}
                  </button>
                ))}
              </div>
            ))}
            <button onClick={() => setShowInactive(v => !v)} style={{ minHeight: 52, border: 0, borderRadius: 26, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {showInactive ? t('surveysHideInactive') : t('surveysShowInactive')}
            </button>
          </div>
        </>
      )}

      {/* New client sheet */}
      {newClientSheet && (
        <QuickClientSheet
          createClient={createClient}
          onCreated={(client) => { setClientId(client.id); setNewClientSheet(false); }}
          onClose={() => setNewClientSheet(false)}
        />
      )}

      <AlertModal
        isOpen={alertModal.open}
        onClose={() => setAlertModal({ open: false, message: '' })}
        message={alertModal.message}
        type="error"
      />
      <UpgradeModal isOpen={!!upgradeDocType} onClose={() => setUpgradeDocType(null)} docType={upgradeDocType} />
    </div>
  );
}
