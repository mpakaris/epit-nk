'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { PERSONAL_COLOR, podColor } from '@/lib/podColor';
import PageSpinner from '@/components/PageSpinner';
import { NotifSheet, MessagesSheet, MenuSheet } from '@/components/mobile/pods/Sheets';
import AudioRecorder from '@/components/AudioRecorder';
import DrawingPad from '@/components/DrawingPad';
import useOnline from '@/hooks/useOnline';
import AnalyzeLayoutSheet from './AnalyzeLayoutSheet';

const SURVEY_BG   = '#0A7F72';
const SURVEY_DEEP = '#06302C';

const PHOTO_GRADS = [
  'linear-gradient(135deg,#D8C7B1,#B09A7F)',
  'linear-gradient(135deg,#C9CFDB,#9AA3B5)',
  'linear-gradient(135deg,#BFC8C4,#8FA19B)',
  'linear-gradient(135deg,#D3C8CF,#A593A0)',
];

const WINDOW_M2 = 1.5;
const DOOR_M2   = 2.0;

function f(n) { return String(Number(n).toFixed(1)).replace('.', ','); }

function StatusBadge({ status, archived, t }) {
  const cfg = {
    active:   { bg: '#fff',    fg: '#0A5C53', label: t('statusActive'),   check: false },
    done:     { bg: '#fff',    fg: '#0F172A', label: t('statusDone'),     check: true  },
    reopened: { bg: '#FFF1E0', fg: '#8A4200', label: t('statusReopened'), check: false },
    inactive: { bg: '#EEEEEE', fg: '#555555', label: t('statusInactive'), check: false },
  };
  const key = archived ? 'inactive' : (status || 'active');
  const c = cfg[key] || cfg.active;
  return (
    <span style={{ height: 32, padding: '0 12px', borderRadius: 16, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, background: c.bg, color: c.fg, flexShrink: 0 }}>
      {c.check && (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5 9-10"/>
        </svg>
      )}
      {c.label}
    </span>
  );
}

function SheetRow({ icon, label, onClick, danger, ibg }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px',
        border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : '#0E1116',
        textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 16, fontWeight: 700, cursor: 'pointer',
        boxShadow: 'inset 0 1px 0 #fff, 0 12px 22px -18px rgba(0,0,0,0.35)',
      }}
    >
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: ibg || (danger ? '#FDECEC' : '#F1F1F3'), color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {icon}
      </span>
      {label}
    </button>
  );
}

function ConfirmSheet({ title, msg, btn, bg, onConfirm, onClose }) {
  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116', lineHeight: 1.1 }}>{title}</span>
      <span style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: '#4A4F57' }}>{msg}</span>
      <button type="button" onClick={onConfirm} style={{ height: 60, border: 0, borderRadius: 30, background: bg || '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{btn}</button>
      <button type="button" onClick={onClose}   style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: '#0E1116', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>Mégse</button>
    </>
  );
}

function MetaSheet({ survey, clients, onSave, onClose }) {
  const t = useTranslations('surveyDetail');
  const [title,    setTitle]    = useState(survey.title || '');
  const [date,     setDate]     = useState(survey.date || '');
  const [location, setLocation] = useState(survey.location || '');
  const [clientId, setClientId] = useState(survey.client_id || '');
  const [notes,    setNotes]    = useState(survey.notes || '');
  const [saving,   setSaving]   = useState(false);

  const FLD = { height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: '#0E1116', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 10px 20px -16px rgba(14,17,22,0.4)', width: '100%', boxSizing: 'border-box' };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), date: date || null, location: location.trim() || null, client_id: clientId || null, notes: notes.trim() || null });
      onClose();
    } catch {}
    setSaving(false);
  };

  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116' }}>{t('metaDrawerTitle')}</span>
        <button type="button" onClick={onClose} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} aria-label="Bezárás">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('metaNameLabel')} *</span>
        <input style={FLD} value={title} onChange={e => setTitle(e.target.value)} placeholder={t('metaNamePlaceholder')} />
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('metaDateLabel')}</span>
          <input style={{ ...FLD, height: 52 }} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('metaClientLabel')}</span>
          <select style={{ ...FLD, height: 52, appearance: 'none' }} value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">{t('metaNoClient')}</option>
            {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
      </div>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('metaLocationLabel')}</span>
        <input style={FLD} value={location} onChange={e => setLocation(e.target.value)} placeholder={t('metaLocationPlaceholder')} />
      </label>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#0E1116' }}>{t('metaNotesLabel')}</span>
        <textarea style={{ ...FLD, height: 92, padding: '12px 16px', resize: 'none' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('metaNotesPlaceholder')} />
      </label>
      <button type="button" onClick={handleSave} disabled={saving || !title.trim()} style={{ height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', opacity: saving || !title.trim() ? 0.6 : 1 }}>
        {saving ? 'Mentés…' : 'Mentés'}
      </button>
    </>
  );
}

function RoomCard({ entry, survey, isNewEntry, isOpen, onToggle, onMore, onDims, onItems, enqueue, surveyId, onMediaOpen, itemCount = 0, index = 1 }) {
  const tM = useTranslations('mobilePods');
  const allMedia = entry.media || [];
  const photoInputRef = useRef(null);

  const w = entry.width_m, l = entry.length_m, h = entry.height_m;
  const dimsLabel = w && l
    ? `${f(w)} × ${f(l)} m${h ? ` · ${f(h)} m` : ''}`
    : null;

  const GRAD_SEED = entry.id || '';
  const gradFor = (i) => PHOTO_GRADS[(GRAD_SEED.charCodeAt(i % GRAD_SEED.length) + i) % PHOTO_GRADS.length];

  return (
    <article style={{ borderRadius: 26, background: '#fff', overflow: 'hidden', boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7), 0 3px 6px -2px rgba(0,0,0,0.3)', borderTop: isNewEntry && survey.status === 'reopened' ? '2px solid #F2B56B' : '0' }}>
      {isNewEntry && survey.status === 'reopened' && (
        <div style={{ padding: '6px 16px', background: '#FFF1E0', color: '#8A4200', fontSize: 12, fontWeight: 700 }}>
          {tM('newReopenedBadge')}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          style={{ flex: 1, minWidth: 0, minHeight: 84, boxSizing: 'border-box', padding: '12px 8px 12px 16px', border: 0, background: 'transparent', color: '#0E1116', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
        >
          <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 17, background: SURVEY_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, fontFamily: "'Bricolage Grotesque', sans-serif" }}>
            {index}
          </span>
          <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 18, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
            {dimsLabel && <span style={{ fontSize: 14, fontWeight: 600, color: '#4A4F57' }}>{dimsLabel}</span>}
          </span>
        </button>
        <button
          type="button"
          onClick={onMore}
          aria-label={tM('roomMenuTitle')}
          style={{ flexShrink: 0, width: 48, height: 48, marginRight: 8, border: 0, borderRadius: 24, background: 'transparent', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h.01M12 12h.01M19 12h.01"/>
          </svg>
        </button>
      </div>

      {isOpen && (
        <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Badges */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(entry.window_count > 0) && <Chip label={tM('roomWinBadge', { count: entry.window_count })} />}
            {(entry.door_count > 0)   && <Chip label={tM('roomDoorBadge', { count: entry.door_count })} />}
            {allMedia.length > 0       && <Chip label={tM('roomPhotoBadge', { count: allMedia.length })} />}
          </div>

          {/* Photo strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {[0, 1, 2].map(i => {
              const item = allMedia[i];
              const showOverlay = i === 2 && allMedia.length > 3;
              const isVideo = item && (item.mime_type?.startsWith('video/') || !item.thumbnail_url);
              return item ? (
                <button
                  key={i}
                  type="button"
                  onClick={onMediaOpen}
                  style={{ height: 62, borderRadius: 14, border: 0, padding: 0, background: isVideo ? '#1A1D22' : `url(${item.thumbnail_url}) center/cover`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                  {isVideo && <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>}
                  {showOverlay && (
                    <span style={{ position: 'absolute', inset: 0, background: 'rgba(14,17,22,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>
                      +{allMedia.length - 2}
                    </span>
                  )}
                </button>
              ) : (
                <span key={i} style={{ height: 62, borderRadius: 14, background: gradFor(i), display: 'block' }} />
              );
            })}
            {enqueue && (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                aria-label={tM('roomPhotoVideo')}
                style={{ height: 62, border: '2px dashed #C9C5BA', borderRadius: 14, background: 'transparent', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            )}
            <input ref={photoInputRef} type="file" accept="image/*,video/*" multiple capture="environment" style={{ display: 'none' }} onChange={e => {
              const raw = Array.from(e.target.files || []);
              e.target.value = '';
              if (raw.length && enqueue) enqueue(raw, { surveyId, entryId: entry.id, mediaType: 'photo' });
            }} />
          </div>

          {/* Action buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button type="button" onClick={onItems} style={{ minHeight: 52, border: 0, borderRadius: 26, background: '#0E1116', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {tM('roomItemsBtn', { count: itemCount })}
            </button>
            <button type="button" onClick={onDims} style={{ minHeight: 52, border: 0, borderRadius: 26, background: '#F1F1F3', color: '#0E1116', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
              {tM('roomDimsBtn')}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Chip({ label }) {
  return (
    <span style={{ height: 26, padding: '0 10px', borderRadius: 13, fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', background: '#F0F0F2', color: '#2B3038' }}>
      {label}
    </span>
  );
}

// ── Property info sheet ───────────────────────────────────────────────────────

function PropInfoSheet({ survey, surveyId, canEdit, onSave, onClose }) {
  const t  = useTranslations('surveyDetail');
  const tc = useTranslations('common');

  const [plotSize,    setPlotSize]    = useState(() => survey.plot_size_m2       != null ? String(survey.plot_size_m2)       : '');
  const [gardenSize,  setGardenSize]  = useState(() => survey.garden_size_m2     != null ? String(survey.garden_size_m2)     : '');
  const [phases,      setPhases]      = useState(() => survey.electrical_phases  != null ? String(survey.electrical_phases)  : '');
  const [ampere,      setAmpere]      = useState(() => survey.electrical_ampere  != null ? String(survey.electrical_ampere)  : '');
  const [voltage,     setVoltage]     = useState(() => survey.electrical_voltage != null ? String(survey.electrical_voltage) : '');
  const [heatingType, setHeatingType] = useState(() => survey.heating_type       || '');
  const [propNotes,   setPropNotes]   = useState(() => survey.property_notes     || '');
  const [aiStatus,    setAiStatus]    = useState('idle');
  const [saving,      setSaving]      = useState(false);

  const valuesRef = useRef({});
  valuesRef.current = { plotSize, gardenSize, phases, ampere, voltage, heatingType, propNotes };

  const saveAll = useCallback(async (overrides = {}) => {
    const v = { ...valuesRef.current, ...overrides };
    setSaving(true);
    try {
      await onSave({
        plot_size_m2:       v.plotSize    ? Number(v.plotSize)    : null,
        garden_size_m2:     v.gardenSize  ? Number(v.gardenSize)  : null,
        electrical_phases:  v.phases      ? Number(v.phases)      : null,
        electrical_ampere:  v.ampere      ? Number(v.ampere)      : null,
        electrical_voltage: v.voltage     ? Number(v.voltage)     : null,
        heating_type:       v.heatingType.trim() || null,
        property_notes:     v.propNotes.trim()   || null,
      });
    } catch {}
    setSaving(false);
  }, [onSave]);

  const handleTranscript = useCallback(async (text) => {
    setAiStatus('filling');
    const overrides = {};
    try {
      const res = await fetch(`/api/surveys/${surveyId}/fill-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t('propertyAiBannerError'));
      const f = data.fields;
      if (f.plot_size_m2    != null) { setPlotSize(String(f.plot_size_m2));     overrides.plotSize    = String(f.plot_size_m2); }
      if (f.garden_size_m2  != null) { setGardenSize(String(f.garden_size_m2)); overrides.gardenSize  = String(f.garden_size_m2); }
      if (f.electrical_phases != null) { setPhases(String(f.electrical_phases)); overrides.phases     = String(f.electrical_phases); }
      if (f.electrical_ampere != null) { setAmpere(String(f.electrical_ampere)); overrides.ampere     = String(f.electrical_ampere); }
      if (f.electrical_voltage != null) { setVoltage(String(f.electrical_voltage)); overrides.voltage = String(f.electrical_voltage); }
      if (f.heating_type)   { setHeatingType(f.heating_type);  overrides.heatingType = f.heating_type; }
      if (f.property_notes) {
        const merged = propNotes.trim() ? propNotes.trim() + '\n\n' + f.property_notes : f.property_notes;
        setPropNotes(merged); overrides.propNotes = merged;
      }
      setAiStatus('saving');
      await saveAll(overrides);
      setAiStatus('done');
      setTimeout(() => setAiStatus('idle'), 2500);
    } catch {
      setAiStatus('error');
      setTimeout(() => setAiStatus('idle'), 3000);
    }
  }, [surveyId, propNotes, t, saveAll]);

  const FLD = { height: 54, border: 0, borderRadius: 18, background: '#fff', padding: '0 14px', fontSize: 16, fontWeight: 500, color: '#0E1116', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 8px 16px -12px rgba(14,17,22,0.4)', width: '100%', boxSizing: 'border-box' };
  const LBL = { fontSize: 13, fontWeight: 700, color: '#0E1116', marginBottom: 4, display: 'block' };

  return (
    <>
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116' }}>{t('propertyTitle')}</span>
        <button type="button" onClick={onClose} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} aria-label={tc('close')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </div>

      {/* AI status banner */}
      {aiStatus !== 'idle' && (
        <div style={{ padding: '10px 14px', borderRadius: 16, background: aiStatus === 'error' ? '#FDECEC' : aiStatus === 'done' ? '#E6F4ED' : '#F7F5EF', color: aiStatus === 'error' ? '#B71C1C' : aiStatus === 'done' ? '#14532D' : '#5A5F68', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          {(aiStatus === 'filling' || aiStatus === 'saving') && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0" opacity=".25"/><path d="M21 12a9 9 0 00-9-9"/>
            </svg>
          )}
          {aiStatus === 'done' && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>}
          {aiStatus === 'filling' && t('propertyAiBannerProcessing')}
          {aiStatus === 'saving'  && t('propertyAiBannerSaving')}
          {aiStatus === 'done'    && t('propertyAiBannerDone')}
          {aiStatus === 'error'   && t('propertyAiBannerError')}
        </div>
      )}

      {/* Dictation row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 20, background: '#F7F5EF' }}>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#5A5F68', lineHeight: 1.4 }}>{t('propertyHint')}</span>
        <AudioRecorder
          disabled={aiStatus !== 'idle'}
          hasContent={!!propNotes.trim()}
          onTranscript={handleTranscript}
          onError={() => setAiStatus('idle')}
          hint={t('propertyHint')}
        />
      </div>

      {canEdit && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <label>
              <span style={LBL}>{t('propertyPlotLabel')}</span>
              <input type="number" min="0" inputMode="decimal" style={FLD} value={plotSize} onChange={e => setPlotSize(e.target.value)} placeholder="800" />
            </label>
            <label>
              <span style={LBL}>{t('propertyGardenLabel')}</span>
              <input type="number" min="0" inputMode="decimal" style={FLD} value={gardenSize} onChange={e => setGardenSize(e.target.value)} placeholder="200" />
            </label>
            <label>
              <span style={LBL}>{t('propertyPhasesLabel')}</span>
              <select style={{ ...FLD, appearance: 'none' }} value={phases} onChange={e => setPhases(e.target.value)}>
                <option value="">–</option>
                <option value="1">{t('propertyPhase1')}</option>
                <option value="3">{t('propertyPhase3')}</option>
              </select>
            </label>
            <label>
              <span style={LBL}>{t('propertyAmpereLabel')}</span>
              <input type="number" min="0" inputMode="decimal" style={FLD} value={ampere} onChange={e => setAmpere(e.target.value)} placeholder="63" />
            </label>
            <label>
              <span style={LBL}>{t('propertyVoltageLabel')}</span>
              <input type="number" min="0" inputMode="decimal" style={FLD} value={voltage} onChange={e => setVoltage(e.target.value)} placeholder="230" />
            </label>
            <label>
              <span style={LBL}>{t('propertyHeatingTypeLabel')}</span>
              <input type="text" style={FLD} value={heatingType} onChange={e => setHeatingType(e.target.value)} />
            </label>
          </div>
          <label>
            <span style={LBL}>{t('propertyNotesLabel')}</span>
            <textarea style={{ ...FLD, height: 86, padding: '12px 14px', resize: 'none' }} value={propNotes} onChange={e => setPropNotes(e.target.value)} placeholder={t('propertyNotesPlaceholder')} />
          </label>
        </>
      )}

      <button
        type="button"
        onClick={() => saveAll().then(() => onClose())}
        disabled={saving || aiStatus === 'filling' || aiStatus === 'saving'}
        style={{ height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', opacity: saving || aiStatus === 'filling' || aiStatus === 'saving' ? 0.6 : 1 }}
      >
        {saving ? tc('saving') : tc('save')}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function SurveyDetailMobile() {
  const { id }  = useParams();
  const router  = useRouter();
  const t       = useTranslations('surveyDetail');
  const tM      = useTranslations('mobilePods');
  const tc      = useTranslations('common');
  const tD      = useTranslations('drawings');

  const {
    loading, dataReady, surveys, quotes, projects, clients, users, collectives,
    currentUser, cacheSurvey, deleteSurvey, updateSurvey,
    surveyMediaBySurvey, surveyEntriesBySurvey, surveyLayoutsBySurvey, surveyDrawingsBySurvey, surveyItemsBySurvey,
    fetchSurveyMedia, uploadSurveyMedia, deleteSurveyMedia,
    createSurveyEntry, deleteSurveyEntry,
    createSurveyDrawing, deleteSurveyDrawing,
    isDemoMode,
  } = useApp();

  const p = (path) => isDemoMode ? `/demo${path}` : path;

  const [detailLoading,  setDetailLoading]  = useState(true);
  const [sheet,          setSheet]          = useState(null);
  const [confirmOp,      setConfirmOp]      = useState(null);
  const [openRoomId,     setOpenRoomId]     = useState(null);
  const [activeRoomId,   setActiveRoomId]   = useState(null);
  const [activeRoomName, setActiveRoomName] = useState('');
  const [statusSaving,   setStatusSaving]   = useState(false);
  const [directSurvey,   setDirectSurvey]   = useState(null);
  const [directFetching, setDirectFetching] = useState(false);
  const [appSheet,       setAppSheet]       = useState(null);
  const [addRoomSheet,    setAddRoomSheet]    = useState(false);
  const [newRoomName,     setNewRoomName]     = useState('');
  const [roomSaving,      setRoomSaving]      = useState(false);
  const [analyzeSheet,    setAnalyzeSheet]    = useState(false);
  const [showSketch,          setShowSketch]          = useState(false);
  const [sketchSaving,        setSketchSaving]        = useState(false);
  const [sketchDirty,         setSketchDirty]         = useState(false);
  const [sketchDiscardConfirm,setSketchDiscardConfirm]= useState(false);
  const [previewImg,      setPreviewImg]      = useState(null);  // URL to preview (image or video)
  const [previewIsVideo,  setPreviewIsVideo]  = useState(false);
  const [roomMediaSheet,  setRoomMediaSheet]  = useState(null);  // entry ID whose media sheet is open
  const roomMediaInputRef = useRef(null);
  const [previewSketch,   setPreviewSketch]   = useState(null);  // drawing object to preview (read-only)
  const [editingSketch,   setEditingSketch]   = useState(null);  // drawing object being edited
  const [alertMsg,        setAlertMsg]        = useState('');
  const online = useOnline();

  // Upload queue lightweight stub — full queue used in desktop page
  const enqueueRef = useRef(null);
  const enqueue = useCallback((files, meta) => {
    if (uploadSurveyMedia) {
      uploadSurveyMedia(meta.surveyId, files, { entryId: meta.entryId, mediaType: meta.mediaType }).catch(() => {});
    }
  }, [uploadSurveyMedia]);

  const fetchSurveyMediaRef = useRef(fetchSurveyMedia);
  fetchSurveyMediaRef.current = fetchSurveyMedia;
  const drawingPadRef = useRef(null);
  const cacheSurveyRef = useRef(cacheSurvey);
  cacheSurveyRef.current = cacheSurvey;

  useEffect(() => {
    if (!dataReady) return;
    fetchSurveyMediaRef.current(id).catch(() => {}).finally(() => setDetailLoading(false));
  }, [id, dataReady]);

  useEffect(() => {
    if (!dataReady) return;
    if (surveys.find(s => s.id === id)) return;
    setDirectFetching(true);
    fetch(`/api/surveys/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.survey) { setDirectSurvey(d.survey); cacheSurveyRef.current(d.survey); } })
      .catch(() => {})
      .finally(() => setDirectFetching(false));
  // surveys intentionally omitted — we only want to fetch once when id/dataReady change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, dataReady]);

  // Re-fetch media when AnalyzeLayoutSheet closes so the layout card updates
  useEffect(() => {
    if (!analyzeSheet && dataReady) {
      fetchSurveyMediaRef.current(id).catch(() => {});
    }
  }, [analyzeSheet, dataReady, id]);

  const closeSheet = useCallback(() => { setSheet(null); setConfirmOp(null); }, []);

  if (loading || !dataReady || directFetching) return (
    <div className="pod-screen-dark" style={{ minHeight: '100dvh', background: SURVEY_DEEP }}>
      <div style={{ height: 200, background: SURVEY_BG, borderRadius: '0 0 32px 32px', opacity: 0.7, animation: 'pulse 1.5s ease-in-out infinite' }} />
      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[120, 80, 180, 80].map((h, i) => (
          <div key={i} style={{ height: h, borderRadius: 26, background: 'rgba(255,255,255,0.09)', animation: 'pulse 1.5s ease-in-out infinite', animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
    </div>
  );

  const survey = surveys.find(s => s.id === id) || directSurvey;
  if (!survey) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#fff', background: SURVEY_DEEP, minHeight: '100dvh' }}>
        <p style={{ marginBottom: '1rem' }}>{t('loading')}</p>
        <button type="button" onClick={() => router.push(p('/felmeres'))} style={{ border: 0, borderRadius: 24, background: '#fff', color: '#0E1116', padding: '12px 24px', fontWeight: 700, cursor: 'pointer' }}>
          {tc('back')}
        </button>
      </div>
    );
  }

  const client           = clients.find(c => c.id === survey.client_id);
  const entries          = surveyEntriesBySurvey[id]  || [];
  const layouts          = surveyLayoutsBySurvey[id]  || [];
  const drawings         = surveyDrawingsBySurvey[id] || [];
  const surveyItems      = surveyItemsBySurvey[id]    || [];
  const myCollectiveRole = collectives?.find(c => c.collective_id === survey.collective_id)?.role;
  const isKollektivOwner = myCollectiveRole === 'owner' || myCollectiveRole === 'admin';
  const isOwner          = survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id;
  const isDocLocked      = !!survey.locked_reason;
  const canAdd           = !isDocLocked && (isOwner || !!myCollectiveRole);
  const canEditMeta      = !isDocLocked && (isKollektivOwner || isOwner);

  const workspaceCol  = collectives?.find(c => c.collective_id === survey.collective_id);
  const workspaceName = workspaceCol ? workspaceCol.name : tM('personal');

  const linkedQuote   = quotes.find(q => q.survey_id === id);
  const linkedProject = projects.find(p => p.survey_id === id);

  const totalFloor     = entries.reduce((s, e) => s + (e.size_m2 || (e.width_m && e.length_m ? e.width_m * e.length_m : 0)), 0);
  const totalWallGross = entries.reduce((s, e) => (!e.width_m || !e.length_m || !e.height_m) ? s : s + 2 * (e.width_m + e.length_m) * e.height_m, 0);
  const totalWin       = entries.reduce((s, e) => s + (e.window_count || 0), 0);
  const totalDoor      = entries.reduce((s, e) => s + (e.door_count  || 0), 0);
  const totalOpenings  = totalWin * WINDOW_M2 + totalDoor * DOOR_M2;
  const totalWallNet   = Math.max(0, totalWallGross - totalOpenings);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleStatusChange = async (newStatus) => {
    if (statusSaving) return;
    setStatusSaving(true);
    try {
      const body = { status: newStatus };
      if (newStatus === 'reopened') body.reopened_at = new Date().toISOString();
      if (newStatus === 'done')     body.done_at     = new Date().toISOString();
      const res = await fetch(`/api/surveys/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setAlertMsg(j.error || t('statusSaveError')); }
      else await updateSurvey?.(id, body);
    } catch { setAlertMsg(t('statusSaveError')); }
    setStatusSaving(false);
  };

  const handleArchive = async () => {
    const val = survey.archived_at ? null : new Date().toISOString();
    try {
      const res = await fetch(`/api/surveys/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived_at: val }) });
      if (!res.ok) { const j = await res.json().catch(() => ({})); setAlertMsg(j.error || t('statusSaveError')); }
      else await updateSurvey?.(id, { archived_at: val });
    } catch { setAlertMsg(t('statusSaveError')); }
  };

  const handleDelete = async () => {
    try {
      await deleteSurvey(id);
      router.push(p('/felmeres'));
    } catch {}
  };

  const handleAddRoom = async () => {
    if (!newRoomName.trim()) return;
    setRoomSaving(true);
    try {
      await createSurveyEntry(id, { name: newRoomName.trim() });
      setNewRoomName('');
      setAddRoomSheet(false);
    } catch {}
    setRoomSaving(false);
  };

  const handleMetaSave = async (fields) => {
    await fetch(`/api/surveys/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    await updateSurvey?.(id, fields);
  };

  const handlePropSave = async (fields) => {
    await fetch(`/api/surveys/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields) });
    await updateSurvey?.(id, fields);
  };

  // ── Sheet definitions ────────────────────────────────────────────────────────

  const isDone     = survey.status === 'done';
  const isArchived = !!survey.archived_at;

  const surveyMenuItems = [
    canEditMeta && {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3l5 5L9 20H4v-5z"/></svg>,
      label: t('ctxEditMeta'), onClick: () => { closeSheet(); setSheet('meta'); },
    },
    canEditMeta && isDone
      ? { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6M20 10a8 8 0 00-14-3M4 14a8 8 0 0014 3"/></svg>, label: t('ctxReopen'), onClick: () => { closeSheet(); setConfirmOp('reopen'); setSheet('confirm'); } }
      : canEditMeta && { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10M3 12a9 9 0 1018 0 9 9 0 10-18 0"/></svg>, label: t('ctxClose'), onClick: () => { closeSheet(); setConfirmOp('close'); setSheet('confirm'); } },
    canEditMeta && {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M9 12a3 3 0 106 0 3 3 0 10-6 0"/></svg>,
      label: isArchived ? t('ctxRestore') : t('ctxInactivate'),
      onClick: () => { closeSheet(); setConfirmOp('archive'); setSheet('confirm'); },
    },
    canEditMeta && {
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>,
      label: t('deleteBtn'), onClick: () => { closeSheet(); setConfirmOp('delete'); setSheet('confirm'); },
      danger: true,
    },
  ].filter(Boolean);

  const roomMenuItems = [
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>, label: tM('roomAddItem'), onClick: () => { closeSheet(); if (activeRoomId) router.push(p(`/felmeres/${id}/tetelek/${activeRoomId}?mode=add`)); } },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6a3 3 0 106 0v6a3 3 0 10-6 0zM5 11a7 7 0 0014 0M12 18v3"/></svg>, label: tM('roomDictate'), onClick: () => { closeSheet(); if (activeRoomId) router.push(p(`/felmeres/${id}/tetelek/${activeRoomId}?mode=dictate`)); } },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v12H4z M8.5 13a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0"/></svg>, label: tM('roomPhotoVideo'), onClick: closeSheet },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>, label: tM('roomAiSuggest'), onClick: () => { closeSheet(); if (activeRoomId) router.push(p(`/felmeres/${id}/tetelek/${activeRoomId}?mode=ai`)); } },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3l5 5L9 20H4v-5z"/></svg>, label: tM('roomEditAction'), onClick: () => { closeSheet(); if (activeRoomId) router.push(p(`/felmeres/${id}/helyiseg/${activeRoomId}`)); } },
    { icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></svg>, label: tM('roomDeleteAction'), onClick: closeSheet, danger: true },
  ];

  const CONFIRMS = {
    close:   { title: t('confirmTitle'), msg: 'Lezárás után csak újranyitással szerkeszthető.', btn: t('closeBtn'), bg: '#0E1116', onConfirm: () => { handleStatusChange('done'); closeSheet(); } },
    reopen:  { title: t('confirmTitle'), msg: 'Az újranyitás után hozzáadott helyiségek jelölve lesznek.', btn: t('reopenBtn'), bg: '#0E1116', onConfirm: () => { handleStatusChange('reopened'); closeSheet(); } },
    archive: { title: isArchived ? t('archiveRestoreTitle') : t('archiveInactivateTitle'), msg: isArchived ? t('archiveRestoreMsg') : t('archiveInactivateMsg'), btn: isArchived ? t('archiveRestoreConfirm') : t('archiveInactivateConfirm'), bg: '#0E1116', onConfirm: () => { handleArchive(); closeSheet(); } },
    delete:  { title: t('confirmTitle'), msg: `Véglegesen törlöd: „${survey.title}"? Ez nem vonható vissza.`, btn: t('deleteBtn'), bg: '#B71C1C', onConfirm: () => { handleDelete(); closeSheet(); } },
  };

  const anySheet = !!(sheet || appSheet || addRoomSheet || analyzeSheet);

  const contextPill = workspaceName;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="pod-screen-dark" style={{ position: 'relative', minHeight: '100dvh', background: SURVEY_DEEP, color: '#fff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", overflowX: 'hidden' }}>

      {/* Scroll container */}
      <div style={{ position: 'relative', overflowY: 'auto', maxHeight: '100dvh', boxSizing: 'border-box', paddingBottom: 190 }}>

        {/* Offline banner */}
        {!online && (
          <div style={{ position: 'sticky', top: 0, zIndex: 15, margin: '0 0 0', padding: '10px 16px', background: '#FFF1E0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8A4200" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" style={{ flexShrink: 0 }}>
              <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
            </svg>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#8A4200' }}>{tM('offlineMsg')}</span>
          </div>
        )}

        {/* Alert banner */}
        {alertMsg && (
          <div style={{ position: 'sticky', top: 0, zIndex: 15, margin: '0 0 0', padding: '10px 16px', background: '#FDECEC', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#B71C1C' }}>{alertMsg}</span>
            <button type="button" onClick={() => setAlertMsg('')} style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: 'rgba(183,28,28,0.1)', color: '#B71C1C', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <header style={{ position: 'relative', overflow: 'hidden', background: SURVEY_BG, borderRadius: '0 0 32px 32px', boxSizing: 'border-box', padding: '18px 16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span aria-hidden="true" style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.10)', pointerEvents: 'none' }} />

          {/* Top row */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button type="button" onClick={() => router.push(p('/felmeres'))} aria-label={tc('back')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>
            </button>

            <span style={{ height: 36, padding: '0 14px', borderRadius: 18, fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.18)', color: '#fff', maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <span style={{ width: 8, height: 8, borderRadius: 4, background: '#fff', flexShrink: 0 }} aria-hidden="true" />
              {contextPill}
            </span>

            <button type="button" onClick={() => setSheet('menu')} aria-label={tM('surveyCtxTitle')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M5 12h.01M12 12h.01M19 12h.01"/></svg>
            </button>
          </div>

          {/* Kicker */}
          <span style={{ position: 'relative', fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.85)' }}>
            {tM('surveyDetailKicker')}
          </span>

          {/* Title */}
          <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            {survey.title}
          </h1>

          {/* Client · location */}
          {(client?.name || survey.location) && (
            <span style={{ position: 'relative', fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
              {[client?.name, survey.location].filter(Boolean).join(' · ')}
            </span>
          )}

          {/* Status row */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <StatusBadge status={survey.status} archived={survey.archived_at} t={t} />
            {survey.status === 'done' && survey.done_at && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
                {new Date(survey.done_at).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          {/* Participants row */}
          {(survey.created_by || (survey.shared_with?.length > 0)) && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.92)' }}>
              <span style={{ display: 'flex' }}>
                {[survey.created_by, ...(survey.shared_with || [])].slice(0, 3).map((uid, i) => {
                  const u = uid === currentUser?.id ? currentUser : users?.find(u => u.id === uid);
                  const initials = u?.display_name ? u.display_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : null;
                  if (!initials) return null;
                  return (
                    <span key={uid} style={{ width: 30, height: 30, marginRight: -8, borderRadius: 15, background: '#fff', color: '#0E1116', border: `2px solid ${SURVEY_BG}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, zIndex: 3 - i }}>
                      {initials}
                    </span>
                  );
                })}
              </span>
              {survey.created_by === currentUser?.id
                ? <span style={{ paddingLeft: 10 }}>{t('recordedBy', { name: t('youSuffix') })}</span>
                : <span style={{ paddingLeft: 10 }}>{t('participants')}</span>
              }
            </div>
          )}
        </header>

        {/* ── Body ── */}
        <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Locked banner */}
          {isDocLocked && (
            <div style={{ boxSizing: 'border-box', padding: '14px 16px', borderRadius: 22, background: '#FDECEC', color: '#9B1C1C', display: 'flex', alignItems: 'center', gap: 12 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M5 11h14v10H5zM8 11V8a4 4 0 018 0v3"/>
              </svg>
              <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{t('readOnly')}</span>
              <button type="button" onClick={() => setSheet('locked')} style={{ height: 44, padding: '0 14px', border: 0, borderRadius: 22, background: '#fff', color: '#9B1C1C', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {t('myOptions')}
              </button>
            </div>
          )}

          {/* Floor plans + Sketches */}
          {(() => {
            const surveyDrawings = drawings.filter(d => !d.entry_id);
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

                {/* Floor plans card */}
                <section style={{ padding: 14, borderRadius: 26, background: '#fff', color: '#0E1116', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{tM('propFloorPlansCard', { count: layouts.length })}</span>
                  {layouts.length > 0 ? (
                    <button type="button" onClick={() => setSheet('layouts')} style={{ padding: 0, border: 0, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'grid', gridTemplateColumns: layouts.length > 1 ? '1fr 1fr' : '1fr', gap: 2, height: 76 }}>
                      {layouts.slice(0, 2).map((item, i) => (
                        <span key={item.id} style={{ background: `url(${item.thumbnail_url || item.drive_view_url}) center/cover`, display: 'block', height: '100%' }} />
                      ))}
                    </button>
                  ) : (
                    <div style={{ height: 76, borderRadius: 16, background: 'linear-gradient(135deg,#EDEAE0,#D9D4C6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A5F68' }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 4h16v16H4zM4 11h8M12 4v9M12 16h8"/></svg>
                    </div>
                  )}
                  <button type="button" onClick={() => setAnalyzeSheet(true)} style={{ minHeight: 48, border: 0, borderRadius: 24, background: '#0E1116', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                    {t('addLayout')}
                  </button>
                </section>

                {/* Sketches card */}
                <section style={{ padding: 14, borderRadius: 26, background: '#fff', color: '#0E1116', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }}>
                  <span style={{ fontSize: 16, fontWeight: 700 }}>{tM('propSketchesCard', { count: surveyDrawings.length })}</span>
                  {surveyDrawings.length > 0 ? (
                    <button type="button" onClick={() => setSheet('sketches')} style={{ padding: 0, border: 0, borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'grid', gridTemplateColumns: surveyDrawings.length > 1 ? '1fr 1fr' : '1fr', gap: 2, height: 76, background: '#F7F5EF' }}>
                      {surveyDrawings.slice(0, 2).map(d => (
                        <span key={d.id} style={{ display: 'block', height: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          dangerouslySetInnerHTML={{ __html: d.svg_data?.replace(/<svg/, '<svg style="width:100%;height:100%;object-fit:contain"') || '' }}
                        />
                      ))}
                    </button>
                  ) : (
                    <div style={{ height: 76, borderRadius: 16, background: '#F7F5EF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5A5F68' }}>
                      <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3l5 5L9 20H4v-5z"/></svg>
                    </div>
                  )}
                  {canEditMeta && (
                    <button type="button" onClick={() => setShowSketch(true)} style={{ minHeight: 48, border: 0, borderRadius: 24, background: '#F1F1F3', color: '#0E1116', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                      {tM('propAddSketch')}
                    </button>
                  )}
                </section>

              </div>
            );
          })()}

          {/* Property info card */}
          {(() => {
            const hasPropData = survey.plot_size_m2 != null || survey.garden_size_m2 != null || survey.electrical_phases != null || survey.heating_type || survey.property_notes;
            const CHIP = { padding: '3px 10px', borderRadius: 12, background: '#F0F0F2', color: '#2B3038', fontSize: 12, fontWeight: 700 };
            return (
              <section style={{ padding: '14px 16px', borderRadius: 26, background: '#fff', color: '#0E1116', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700 }}>{t('propertyTitle')}</span>
                  {canEditMeta && (
                    <button
                      type="button"
                      onClick={() => setSheet('property')}
                      aria-label={t('propertyTitle')}
                      style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: SURVEY_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M16 3l5 5L9 20H4v-5z"/></svg>
                    </button>
                  )}
                </div>
                {hasPropData ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {survey.plot_size_m2    != null && <span style={CHIP}>{t('propertyPillPlot', { value: survey.plot_size_m2 })}</span>}
                    {survey.garden_size_m2  != null && <span style={CHIP}>{t('propertyPillGarden', { value: survey.garden_size_m2 })}</span>}
                    {survey.electrical_phases       && <span style={CHIP}>{survey.electrical_phases}F{survey.electrical_ampere ? ` / ${survey.electrical_ampere}A` : ''}</span>}
                    {survey.heating_type            && <span style={CHIP}>{survey.heating_type}</span>}
                    {survey.property_notes          && <span style={{ ...CHIP, background: 'transparent', padding: '3px 0', color: '#5A5F68', fontWeight: 600, fontStyle: 'italic', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{survey.property_notes}</span>}
                  </div>
                ) : (
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#B0ADA6', fontStyle: 'italic' }}>{t('propertyNoData')}</span>
                )}
              </section>
            );
          })()}

          {/* Rooms header */}
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '4px 4px 0' }}>
            <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>
              {t('roomsHeader', { count: entries.length })}
            </h2>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.78)' }}>
              {tM('maxRoomsNote')}
            </span>
          </div>

          {/* Room cards */}
          {entries.map((entry, idx) => {
            const isNewEntry = survey.status === 'reopened' && survey.done_at && entry.created_at && new Date(entry.created_at) > new Date(survey.done_at);
            return (
              <RoomCard
                key={entry.id}
                entry={entry}
                index={idx + 1}
                survey={survey}
                isNewEntry={isNewEntry}
                isOpen={openRoomId === entry.id}
                onToggle={() => setOpenRoomId(prev => prev === entry.id ? null : entry.id)}
                onMore={() => { setActiveRoomId(entry.id); setActiveRoomName(entry.name); setSheet('room'); }}
                onDims={() => router.push(p(`/felmeres/${id}/helyiseg/${entry.id}`))}
                onItems={() => router.push(p(`/felmeres/${id}/tetelek/${entry.id}`))}
                enqueue={canAdd ? enqueue : undefined}
                surveyId={id}
                onMediaOpen={() => setRoomMediaSheet(entry.id)}
                itemCount={surveyItems.filter(it => it.entry_id === entry.id).length}
              />
            );
          })}

          {/* Add room dashed button */}
          {canAdd && entries.length < 30 && (
            <button
              type="button"
              onClick={() => setAddRoomSheet(true)}
              style={{ minHeight: 60, border: '2px dashed #B9B5AA', borderRadius: 26, background: 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              {tM('addRoomDashed')}
            </button>
          )}

          {/* Area summary */}
          {entries.length > 0 && (
            <section style={{ padding: 16, borderRadius: 26, background: '#fff', color: '#0E1116', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }}>
              <h2 style={{ margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 19, fontWeight: 700 }}>
                {t('areaSummaryHeader')}
              </h2>
              {[
                { label: t('areaSummaryFloor'),     value: `${f(totalFloor)} m²` },
                { label: t('areaSummaryWallGross'), value: `${f(totalWallGross)} m²` },
                { label: t('areaSummaryDeductions', { windowCount: totalWin, doorCount: totalDoor }), value: `−${f(totalOpenings)} m²`, danger: true },
                { label: t('areaSummaryWallNet'),   value: `${f(totalWallNet)} m²` },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 600, padding: '6px 0', borderTop: '1px solid #ECEAE4', color: row.danger ? '#9B1C1C' : '#0E1116' }}>
                  <span>{row.label}</span>
                  <b>{row.value}</b>
                </div>
              ))}
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{t('areaSummaryFootnote')}</span>
            </section>
          )}

          {/* Linked */}
          {(linkedQuote || linkedProject) && (
            <section style={{ padding: '14px 16px', borderRadius: 26, background: '#fff', color: '#0E1116', display: 'flex', flexDirection: 'column', gap: 8, boxShadow: 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.7)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>
                {tM('linkedSectionLabel')}
              </span>
              {linkedQuote && (
                <button type="button" onClick={() => router.push(p(`/ajanlatok/${linkedQuote.id}`))} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#FFF1E0', color: '#6B3300', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7zM14 3v5h5"/></svg>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('linkedQuote')} {linkedQuote.title}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              )}
              {linkedProject && (
                <button type="button" onClick={() => router.push(p(`/projektek/${linkedProject.id}`))} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#E7F4EC', color: '#14532D', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: 'none' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h18v12H3zM9 8V5h6v3"/></svg>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t('linkedProject')} {linkedProject.name}</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
                </button>
              )}
            </section>
          )}

        </div>
      </div>

      {/* ── Bottom action bar — status change only ── */}
      {isDone && (
        <div style={{ position: 'fixed', zIndex: 20, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: `28px 16px calc(18px + env(safe-area-inset-bottom))`, background: `linear-gradient(to top, ${SURVEY_DEEP} 65%, rgba(0,0,0,0))`, display: 'flex', pointerEvents: anySheet ? 'none' : 'auto' }}>
          <button
            type="button"
            disabled={statusSaving}
            onClick={() => { setConfirmOp('reopen'); setSheet('confirm'); }}
            style={{ flex: 1, height: 60, border: 0, borderRadius: 30, background: '#fff', color: SURVEY_BG, fontSize: 17, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 14px 26px -12px rgba(14,17,22,0.4)', cursor: 'pointer', opacity: statusSaving ? 0.7 : 1 }}
          >
            {t('reopenBtn')}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4v6h6M20 20v-6h-6M20 10a8 8 0 00-14-3M4 14a8 8 0 0014 3"/></svg>
          </button>
        </div>
      )}

      {/* ── Scrim ── */}
      {anySheet && (
        <button
          type="button"
          onClick={() => { setSheet(null); setConfirmOp(null); setAppSheet(null); setAddRoomSheet(false); setAnalyzeSheet(false); }}
          aria-label={tc('close')}
          style={{ position: 'fixed', inset: 0, zIndex: 40, border: 0, padding: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }}
        />
      )}

      {/* ── Sheets ── */}

      {/* Survey context menu */}
      {sheet === 'menu' && (
        <div role="dialog" aria-label={tM('surveyCtxTitle')} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <span style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#0E1116' }}>{survey.title}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{client?.name ? `${client.name} · ` : ''}{tM('surveyMenuSub')}</span>
          </div>
          {surveyMenuItems.map((item, i) => (
            <SheetRow key={i} icon={item.icon} label={item.label} onClick={item.onClick} danger={item.danger} />
          ))}
        </div>
      )}

      {/* Meta drawer */}
      {sheet === 'meta' && (
        <div role="dialog" aria-label={t('metaDrawerTitle')} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <MetaSheet survey={survey} clients={clients} onSave={handleMetaSave} onClose={closeSheet} />
        </div>
      )}

      {/* Room menu */}
      {sheet === 'room' && (
        <div role="dialog" aria-label={tM('roomMenuTitle')} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <span style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#0E1116' }}>{activeRoomName}</span>
          {roomMenuItems.map((item, i) => (
            <SheetRow key={i} icon={item.icon} label={item.label} onClick={item.onClick} danger={item.danger} />
          ))}
        </div>
      )}

      {/* Confirm sheet */}
      {sheet === 'confirm' && confirmOp && CONFIRMS[confirmOp] && (
        <div role="alertdialog" className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <ConfirmSheet {...CONFIRMS[confirmOp]} onClose={closeSheet} />
        </div>
      )}

      {/* Add room sheet */}
      {addRoomSheet && (
        <div role="dialog" aria-label={tM('addRoomDashed')} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 25, fontWeight: 700, color: '#0E1116' }}>{tM('addRoomDashed')}</span>
            <button type="button" onClick={() => setAddRoomSheet(false)} style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} aria-label={tc('close')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
            </button>
          </div>
          <input
            autoFocus
            value={newRoomName}
            onChange={e => setNewRoomName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddRoom()}
            placeholder={t('entryNamePlaceholder')}
            style={{ height: 56, border: 0, borderRadius: 20, background: '#fff', padding: '0 16px', fontSize: 17, fontWeight: 500, color: '#0E1116', boxShadow: '0 1px 0 rgba(14,17,22,0.05),0 10px 20px -16px rgba(14,17,22,0.4)', width: '100%', boxSizing: 'border-box' }}
          />
          <button type="button" onClick={handleAddRoom} disabled={roomSaving || !newRoomName.trim()} style={{ height: 60, border: 0, borderRadius: 30, background: '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', opacity: roomSaving || !newRoomName.trim() ? 0.6 : 1 }}>
            {roomSaving ? tc('saving') : tc('create')}
          </button>
        </div>
      )}

      {/* Locked options */}
      {sheet === 'locked' && (
        <div role="dialog" aria-label={t('readOnly')} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '90%', overflowY: 'auto' }}>
          <span style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#0E1116' }}>{t('readOnly')}</span>
          </div>
          <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: '#4A4F57' }}>{t('myOptions')}</span>
          <button type="button" onClick={closeSheet} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: '#0E1116', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>{tc('close')}</button>
        </div>
      )}

      {/* App-level sheets */}
      {appSheet === 'notifications' && <NotifSheet notifications={[]} onClose={() => setAppSheet(null)} />}
      {appSheet === 'messages'      && <MessagesSheet threads={[]} onClose={() => setAppSheet(null)} />}
      {appSheet === 'menu'          && <MenuSheet profile={currentUser} onLogout={() => router.push('/auth/logout')} onClose={() => setAppSheet(null)} />}

      {/* Property info sheet */}
      {sheet === 'property' && (
        <div role="dialog" aria-label={t('propertyTitle')} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '92dvh', overflowY: 'auto' }}>
          <PropInfoSheet survey={survey} surveyId={id} canEdit={canEditMeta} onSave={handlePropSave} onClose={closeSheet} />
        </div>
      )}

      {/* Floor plans gallery sheet */}
      {sheet === 'layouts' && (
        <div role="dialog" aria-label={tM('propFloorPlansCard', { count: layouts.length })} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '82dvh', overflowY: 'auto' }}>
          <span style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#0E1116' }}>{tM('propFloorPlansCard', { count: layouts.length })}</span>
            <button type="button" onClick={closeSheet} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {layouts.map(item => (
              <div key={item.id} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', background: '#EDEAE0' }}>
                <button type="button" onClick={() => setPreviewImg(item.drive_view_url || item.thumbnail_url)} style={{ width: '100%', height: '100%', padding: 0, border: 0, cursor: 'pointer', display: 'block' }}>
                  <img src={item.thumbnail_url || item.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
                {canEditMeta && (
                  <button type="button" onClick={() => deleteSurveyMedia(item.id, id, null, 'layout')} style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, border: 0, background: 'rgba(14,17,22,0.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {canEditMeta && (
            <button type="button" onClick={() => { closeSheet(); setAnalyzeSheet(true); }} style={{ minHeight: 56, border: 0, borderRadius: 28, background: '#0E1116', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              {t('addLayout')}
            </button>
          )}
        </div>
      )}

      {/* Sketches gallery sheet */}
      {sheet === 'sketches' && (
        <div role="dialog" aria-label={tM('propSketchesCard', { count: drawings.filter(d => !d.entry_id).length })} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '82dvh', overflowY: 'auto' }}>
          <span style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8', flexShrink: 0 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
            <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#0E1116' }}>{tM('propSketchesCard', { count: drawings.filter(d => !d.entry_id).length })}</span>
            <button type="button" onClick={closeSheet} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {drawings.filter(d => !d.entry_id).map(d => (
              <div key={d.id} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', background: '#F7F5EF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button type="button" onClick={() => { if (canEditMeta) { setSheet(null); setEditingSketch(d); setShowSketch(true); } else { setPreviewSketch(d); } }} style={{ width: '100%', height: '100%', padding: 8, boxSizing: 'border-box', border: 0, background: 'transparent', cursor: 'pointer' }}
                  dangerouslySetInnerHTML={{ __html: d.svg_data?.replace(/<svg/, '<svg style="width:100%;height:100%;display:block;pointer-events:none"') || '' }}
                />
                {canEditMeta && (
                  <button type="button" onClick={() => deleteSurveyDrawing(id, d.id)} style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, border: 0, background: 'rgba(14,17,22,0.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
          {canEditMeta && (
            <button type="button" onClick={() => { closeSheet(); setShowSketch(true); }} style={{ minHeight: 56, border: 0, borderRadius: 28, background: '#0E1116', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              {tM('propAddSketch')}
            </button>
          )}
        </div>
      )}

      {/* Room media sheet */}
      {roomMediaSheet && (() => {
        const sheetEntry = entries.find(e => e.id === roomMediaSheet);
        if (!sheetEntry) return null;
        const sheetMedia = sheetEntry.media || [];
        return (
          <>
            <button type="button" onClick={() => setRoomMediaSheet(null)} aria-label={tc('close')} style={{ position: 'fixed', inset: 0, zIndex: 48, border: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }} />
            <div role="dialog" aria-label={tM('roomPhotoBadge', { count: sheetMedia.length })} className="pod-sheet" style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '82dvh', overflowY: 'auto' }}>
              <span style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8', flexShrink: 0 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexShrink: 0 }}>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 22, fontWeight: 700, color: '#0E1116' }}>{sheetEntry.name} · {tM('roomPhotoBadge', { count: sheetMedia.length })}</span>
                <button type="button" onClick={() => setRoomMediaSheet(null)} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {sheetMedia.map(item => {
                  const isVideo = item.mime_type?.startsWith('video/') || !item.thumbnail_url;
                  return (
                  <div key={item.id} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', background: '#EDEAE0' }}>
                    <button type="button" onClick={() => { setPreviewImg(item.drive_view_url || item.thumbnail_url); setPreviewIsVideo(isVideo); }} style={{ width: '100%', height: '100%', padding: 0, border: 0, cursor: 'pointer', display: 'block' }}>
                      {isVideo ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#1A1D22', color: '#fff' }}>
                          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
                          <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.7, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.file_name || 'video'}</span>
                        </div>
                      ) : (
                        <img src={item.thumbnail_url || item.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </button>
                    {canAdd && (
                      <button type="button" onClick={() => deleteSurveyMedia(item.id, id, sheetEntry.id, 'photo')} style={{ position: 'absolute', top: 6, right: 6, width: 32, height: 32, borderRadius: 16, border: 0, background: 'rgba(14,17,22,0.65)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13"/></svg>
                      </button>
                    )}
                  </div>
                );
                })}
              </div>
              {canAdd && (
                <>
                  <button type="button" onClick={() => roomMediaInputRef.current?.click()} style={{ minHeight: 56, border: 0, borderRadius: 28, background: '#0E1116', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                    {tM('roomPhotoVideo')}
                  </button>
                  <input ref={roomMediaInputRef} type="file" accept="image/*,video/*" multiple capture="environment" style={{ display: 'none' }} onChange={e => {
                    const raw = Array.from(e.target.files || []);
                    e.target.value = '';
                    if (raw.length && enqueue) enqueue(raw, { surveyId: id, entryId: roomMediaSheet, mediaType: 'photo' });
                  }} />
                </>
              )}
            </div>
          </>
        );
      })()}

      {/* Image / video lightbox */}
      {previewImg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(14,17,22,0.95)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '14px 16px', flexShrink: 0 }}>
            <button type="button" onClick={() => { setPreviewImg(null); setPreviewIsVideo(false); }} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: 'rgba(255,255,255,0.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 0 }}>
            {previewIsVideo ? (
              <video src={previewImg} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: 16 }} />
            ) : (
              <img src={previewImg} alt="" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 16 }} />
            )}
          </div>
        </div>
      )}

      {/* Sketch preview */}
      {previewSketch && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(14,17,22,0.95)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', flexShrink: 0 }}>
            {canEditMeta && (
              <button type="button" onClick={() => { deleteSurveyDrawing(id, previewSketch.id); setPreviewSketch(null); }} style={{ height: 44, padding: '0 16px', border: 0, borderRadius: 22, background: 'rgba(183,28,28,0.9)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                {tc('delete')}
              </button>
            )}
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => setPreviewSketch(null)} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: 'rgba(255,255,255,0.14)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, minHeight: 0, background: '#F7F5EF', margin: '0 16px 16px', borderRadius: 24 }}
            dangerouslySetInnerHTML={{ __html: previewSketch.svg_data?.replace(/<svg/, '<svg style="max-width:100%;max-height:100%;display:block;margin:auto"') || '' }}
          />
        </div>
      )}

      {/* Drawing pad — full-height bottom sheet */}
      {showSketch && (
        <>
          <button type="button" onClick={() => { if (sketchSaving) return; if (sketchDirty) { setSketchDiscardConfirm(true); } else { setShowSketch(false); setEditingSketch(null); } }} aria-label={tc('close')} style={{ position: 'fixed', inset: 0, zIndex: 48, border: 0, background: 'rgba(14,17,22,0.5)', cursor: 'pointer' }} />
          <div role="dialog" aria-label={tM('propAddSketch')} style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, height: '96dvh', borderRadius: '24px 24px 0 0', background: '#fff', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px 8px', flexShrink: 0, borderBottom: '1px solid #EDEBE5' }}>
              <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116' }}>{tM('propAddSketch')}</span>
              <button type="button" onClick={() => { if (sketchSaving) return; if (sketchDirty) { setSketchDiscardConfirm(true); } else { setShowSketch(false); setEditingSketch(null); } }} style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#F0F0F2', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
              <DrawingPad
                ref={drawingPadRef}
                backgroundSvg={editingSketch?.svg_data}
                onDirtyChange={(dirty) => setSketchDirty(dirty)}
                onSave={async (newSvg) => {
                  setSketchSaving(true);
                  try {
                    const extractInner = s => s?.match(/<svg[^>]*>([\s\S]*)<\/svg>/)?.[1] ?? '';
                    let finalSvg = newSvg;
                    if (editingSketch) {
                      const oldInner = extractInner(editingSketch.svg_data);
                      const newInner = extractInner(newSvg);
                      if (!newInner.trim()) { setShowSketch(false); setEditingSketch(null); setSketchSaving(false); setSketchDirty(false); return; }
                      finalSvg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="800" height="760" viewBox="0 0 800 760">${oldInner}${newInner}</svg>`;
                      await deleteSurveyDrawing(id, editingSketch.id);
                    }
                    await createSurveyDrawing(id, { svg_data: finalSvg });
                    setShowSketch(false);
                    setEditingSketch(null);
                    setSketchDirty(false);
                  } catch {}
                  setSketchSaving(false);
                }}
                onCancel={() => { setShowSketch(false); setEditingSketch(null); setSketchDirty(false); setSketchDiscardConfirm(false); }}
                saving={sketchSaving}
              />
              {sketchDiscardConfirm && (
                <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(255,255,255,0.96)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>{tD('unsavedWarning')}</span>
                  <div style={{ display: 'flex', gap: 10, width: '100%' }}>
                    <button type="button" onClick={() => setSketchDiscardConfirm(false)} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: '#F0F0F2', color: '#0E1116', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                      {tD('keepDrawing')}
                    </button>
                    <button type="button" onClick={() => { setShowSketch(false); setEditingSketch(null); setSketchDirty(false); setSketchDiscardConfirm(false); }} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: '#B71C1C', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
                      {tD('discardBtn')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Analyze layout sheet */}
      {analyzeSheet && (
        <div
          role="dialog"
          aria-label={t('ctxAddLayout')}
          className="pod-sheet"
          style={{ position: 'fixed', zIndex: 50, left: 0, right: 0, bottom: 0, boxSizing: 'border-box', padding: '10px 16px calc(20px + env(safe-area-inset-bottom))', borderRadius: '32px 32px 0 0', background: '#FBFAF7', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '92dvh', overflowY: 'auto' }}
        >
          <AnalyzeLayoutSheet
            surveyId={id}
            existingEntries={entries}
            onCreated={() => fetchSurveyMedia(id).catch(() => {})}
            onClose={() => setAnalyzeSheet(false)}
            createSurveyEntry={createSurveyEntry}
          />
        </div>
      )}

    </div>
  );
}
