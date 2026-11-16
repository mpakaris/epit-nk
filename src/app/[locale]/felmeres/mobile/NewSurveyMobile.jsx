'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';

const DEFAULT_ROOMS = ['Nappali', 'Fürdő', 'Konyha', 'Hálószoba', 'Kert', 'Folyosó'];

export default function NewSurveyMobile() {
  const t = useTranslations('mobilePods');
  const tS = useTranslations('surveys');
  const router = useRouter();
  const {
    currentUser, collectives, clients, surveys,
    createSurvey, isDemoMode, profile,
  } = useApp();

  const p = (path) => isDemoMode ? `/demo${path}` : path;

  // Step 1: choose workspace, Step 2: form details
  const [step, setStep] = useState(1);
  const [selectedWs, setSelectedWs] = useState('personal');
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rooms, setRooms] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // New client sheet
  const [clientSheet, setClientSheet] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientAddress, setNewClientAddress] = useState('');
  const [gdpr, setGdpr] = useState(false);
  const [clientSaving, setClientSaving] = useState(false);

  const handleCreateClient = async () => {
    if (!newClientName.trim()) return;
    setClientSaving(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddress.trim(), gdpr_consent: gdpr }),
      });
      const data = await res.json();
      if (res.ok) {
        setClientId(data.client?.id || '');
        setClientSheet(false);
        setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddress(''); setGdpr(false);
      }
    } catch (e) {}
    setClientSaving(false);
  };

  const handleSubmit = useCallback(async () => {
    if (!title.trim()) { setError(tS('titleRequired')); return; }

    // Subscription limit check
    if (profile && !isEffectivePremium(profile) && surveys.length >= 5) {
      setError('Elérted az ingyenes felmérések korlátját (5). Válts Prémiumra a korlátlan használathoz.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const collectiveIdOverride = selectedWs === 'personal' ? null : selectedWs;
      const navPath = isDemoMode ? `/demo/felmeres/` : `/felmeres/`;
      const survey = await createSurvey({ title: title.trim(), location: location.trim(), clientId: clientId || null, date, notes: notes.trim() || null, collectiveId: collectiveIdOverride });
      router.push(`${navPath}${survey.id}`);
    } catch (e) {
      setError(e.message || tS('saveError'));
      setSaving(false);
    }
  }, [title, location, clientId, date, notes, selectedWs, surveys, profile, createSurvey, router, isDemoMode, tS]);

  // Workspace list for step 1
  const workspaces = [
    { id: 'personal', isPersonal: true, name: t('personal'), desc: t('personalSub'), icon: 'personal', colors: PERSONAL_COLOR },
    ...(collectives || []).filter(c => c.role === 'owner' || c.role === 'admin').map(col => ({
      id: col.collective_id,
      isPersonal: false,
      name: col.name,
      desc: `${t('collective')} · ${(col.members || []).length} tag`,
      icon: 'collective',
      colors: podColor(col.collective_id),
    })),
  ];

  const destWs = workspaces.find(w => w.id === selectedWs) || workspaces[0];
  const destColors = destWs?.colors || PERSONAL_COLOR;
  // Survey form uses survey-teal header
  const headerBg = '#0A7F72';
  const headerDeep = '#06302C';
  const headerFg = '#FFFFFF';
  const headerSoft = 'rgba(255,255,255,0.88)';
  const headerGlass = 'rgba(255,255,255,0.18)';
  const headerGlow = 'rgba(255,255,255,0.10)';
  const headerTint = '#D9F2EE';
  const headerDot = '#0A7F72';

  const selectedClient = clients?.find(c => c.id === clientId);

  return (
    <div style={{ position: 'relative', minHeight: '100dvh', background: headerDeep, color: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* Scrollable content */}
      <div style={{ overflowY: 'auto', paddingBottom: 170 }}>

        {/* Document header — survey teal */}
        <header style={{ position: 'relative', overflow: 'hidden', boxSizing: 'border-box', padding: '18px 16px 20px', borderRadius: '0 0 32px 32px', background: headerBg, color: headerFg, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: headerGlow }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => router.back()} aria-label={t('close')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: headerGlass, color: headerFg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
            <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, background: headerGlass, display: 'inline-flex', alignItems: 'center' }}>
              {t('step', { step, total: 2 })}
            </span>
            <span style={{ width: 48 }} />
          </div>
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: headerSoft }}>
            {t('newSurveyTitle')}
          </span>
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {step === 1 ? t('destination') : t('details')}
          </h1>
        </header>

        {/* Step 1: Choose workspace */}
        {step === 1 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {workspaces.map(ws => {
              const isOn = ws.id === selectedWs;
              const { bg, fg } = ws.colors;
              const ringColor = isOn ? bg : '#C9C5BA';
              return (
                <button
                  key={ws.id}
                  onClick={() => setSelectedWs(ws.id)}
                  aria-pressed={isOn}
                  style={{ minHeight: 120, padding: 16, border: 0, borderRadius: 26, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, boxShadow: isOn ? `0 0 0 3px ${bg}, inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7), 0 3px 6px -2px rgba(0,0,0,0.3)` : 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7), 0 3px 6px -2px rgba(0,0,0,0.3)', cursor: 'pointer' }}
                >
                  <span style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 28, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {ws.isPersonal
                      ? <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
                      : <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.6 3.5 6"/></svg>
                    }
                  </span>
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700 }}>{ws.name}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57' }}>{ws.desc}</span>
                  </span>
                  <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 15, border: `2px solid ${ringColor}`, background: isOn ? bg : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isOn && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
                  </span>
                </button>
              );
            })}

            {/* Sharing warning for collective */}
            {selectedWs !== 'personal' && (
              <div style={{ boxSizing: 'border-box', padding: '14px 16px', borderRadius: 22, background: '#FFF3E3', color: '#6B3300', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true"><path d="M12 8v5M12 16h.01M12 3a9 9 0 100 18 9 9 0 000-18z"/></svg>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.4 }}>
                  <b>{t('shareWarning')}</b><br/>
                  {t('shareWarningBody')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Form */}
        {step === 2 && (
          <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Destination chip (back to step 1) */}
            <button onClick={() => setStep(1)} style={{ alignSelf: 'flex-start', minHeight: 48, padding: '0 16px', border: 0, borderRadius: 24, background: headerTint, color: 'var(--m-ink)', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              <span style={{ width: 10, height: 10, borderRadius: 5, background: destColors.bg }} />
              {destWs?.name}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>
            </button>

            {/* Title */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{tS('titleLabel')} *</span>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder={tS('titlePlaceholder')}
                style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }}
              />
            </label>

            {/* Client */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{tS('clientLabel')}</span>
              <div style={{ display: 'flex', gap: 10 }}>
                <select
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  style={{ flex: 1, height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)', appearance: 'none' }}
                >
                  <option value="">— {tS('clientLabel')} —</option>
                  {(clients || []).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button onClick={() => setClientSheet(true)} aria-label={t('newClient')} style={{ flexShrink: 0, width: 56, height: 56, border: 0, borderRadius: 20, background: 'var(--m-ink)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
                </button>
              </div>
            </div>

            {/* Location */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{tS('locationLabel')}</span>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder={tS('locationPlaceholder')} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }} />
            </label>

            {/* Date */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{tS('dateLabel')}</span>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }} />
            </label>

            {/* Rooms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{tS('roomsLabel')}</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DEFAULT_ROOMS.map(room => {
                  const isOn = rooms.includes(room);
                  return (
                    <button key={room} onClick={() => setRooms(isOn ? rooms.filter(r => r !== room) : [...rooms, room])} aria-pressed={isOn}
                      style={{ height: 52, padding: '0 18px', border: 0, borderRadius: 26, fontSize: 15, fontWeight: 700, background: isOn ? '#0E1116' : '#fff', color: isOn ? '#fff' : '#0E1116', boxShadow: isOn ? 'none' : '0 1px 0 rgba(14,17,22,0.06), 0 8px 14px -10px rgba(14,17,22,0.3)', cursor: 'pointer' }}>
                      {isOn && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" style={{ marginRight: 6 }} aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
                      {room}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>{tS('notesLabel')}</span>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={tS('notesPlaceholder')} rows={3}
                style={{ width: '100%', boxSizing: 'border-box', height: 96, border: 0, borderRadius: 20, background: '#fff', padding: '14px 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', resize: 'none', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }} />
            </label>

            {error && (
              <div style={{ padding: '12px 16px', borderRadius: 20, background: 'var(--m-danger-bg)', color: 'var(--m-danger)', fontSize: 14, fontWeight: 600 }}>{error}</div>
            )}
          </div>
        )}
      </div>

      {/* Sticky bottom bar */}
      <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 20, boxSizing: 'border-box', padding: `28px 16px calc(18px + env(safe-area-inset-bottom))`, background: `linear-gradient(to top, ${headerDeep} 65%, rgba(0,0,0,0))`, display: 'flex', gap: 10 }}>
        {step === 2 && (
          <button onClick={() => setStep(1)} aria-label={t('backTo')} style={{ flexShrink: 0, width: 60, height: 60, border: 0, borderRadius: 30, background: '#fff', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 22px -10px rgba(14,17,22,0.4)', cursor: 'pointer' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
          </button>
        )}
        <button
          onClick={step === 1 ? () => setStep(2) : handleSubmit}
          disabled={saving}
          style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: 'var(--m-ink)', color: '#fff', fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 14px 26px -12px rgba(14,17,22,0.6)', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}
        >
          {saving ? tS('saving') : step === 1 ? t('continueBtn') : t('startSurvey')}
          {!saving && <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>}
        </button>
      </div>

      {/* New client sheet */}
      {clientSheet && (
        <>
          <button onClick={() => setClientSheet(false)} aria-label={t('close')} style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }} />
          <div role="dialog" aria-label={t('newClient')} style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50, boxSizing: 'border-box', padding: `10px 16px calc(18px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', background: 'var(--m-sheet)', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
            <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, lineHeight: 1.1 }}>{t('newClient')}</span>
              <button onClick={() => setClientSheet(false)} aria-label={t('close')} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: 'var(--m-ink)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
              </button>
            </div>
            {[
              { value: newClientName,    setter: setNewClientName,    type: 'text',  placeholder: `${tS('newClientNameLabel')} * — pl. Horváth Béla` },
              { value: newClientPhone,   setter: setNewClientPhone,   type: 'tel',   placeholder: tS('newClientPhoneLabel') },
              { value: newClientEmail,   setter: setNewClientEmail,   type: 'email', placeholder: tS('newClientEmailLabel') },
              { value: newClientAddress, setter: setNewClientAddress, type: 'text',  placeholder: tS('newClientAddressLabel') },
            ].map((f, i) => (
              <input key={i} type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                style={{ width: '100%', boxSizing: 'border-box', height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: 'var(--m-ink)', boxShadow: '0 1px 0 rgba(14,17,22,0.05), 0 10px 20px -16px rgba(14,17,22,0.4)' }} />
            ))}
            {/* GDPR checkbox */}
            <button onClick={() => setGdpr(g => !g)} aria-pressed={gdpr}
              style={{ minHeight: 72, boxSizing: 'border-box', padding: '12px 14px', border: 0, borderRadius: 22, background: '#fff', color: 'var(--m-ink)', textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', boxShadow: `inset 0 0 0 2px ${gdpr ? '#2E8B57' : '#C9C5BA'}`, cursor: 'pointer' }}>
              <span style={{ flexShrink: 0, width: 30, height: 30, borderRadius: 10, border: `2px solid ${gdpr ? '#2E8B57' : '#C9C5BA'}`, background: gdpr ? '#2E8B57' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {gdpr && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>{t('gdprText')}</span>
            </button>
            <button onClick={handleCreateClient} disabled={clientSaving || !newClientName.trim()} style={{ height: 60, border: 0, borderRadius: 30, background: gdpr && newClientName.trim() ? 'var(--m-ink)' : '#B9B5AA', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
              {clientSaving ? '...' : t('createClient')}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
