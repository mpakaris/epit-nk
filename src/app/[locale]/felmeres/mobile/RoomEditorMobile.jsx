'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { useApp } from '@/context/AppContext';

const SURVEY_BG  = '#0A7F72';
const SURVEY_INK = '#0A5C53';

const DIM_FIELDS = ['width', 'length', 'height'];
const FIELD_NEXT = { width: 'length', length: 'height', height: null };

function parseVal(str) {
  if (!str || str === '') return null;
  const n = parseFloat(String(str).replace(',', '.'));
  return isNaN(n) ? null : n;
}

function NumKeypad({ value, onChange, onNext, onDone, fieldLabel, tM }) {
  const press = (k) => {
    if (k === '⌫') {
      onChange(prev => prev.slice(0, -1));
    } else if (k === ',') {
      onChange(prev => (prev.includes(',') ? prev : prev + ','));
    } else {
      onChange(prev => {
        const parts = prev.split(',');
        if (parts[1] !== undefined && parts[1].length >= 2) return prev;
        if (parts[0].length >= 4 && !prev.includes(',')) return prev;
        if (k === '0' && prev === '0') return prev;
        return prev + k;
      });
    }
  };

  const rows = [['7','8','9'], ['4','5','6'], ['1','2','3'], [',','0','⌫']];
  const KEY      = { flex: 1, height: 56, border: 0, borderRadius: 16, background: '#fff', color: '#0E1116', fontSize: 22, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px -2px rgba(14,17,22,0.18)' };
  const KEY_SPEC = { ...KEY, background: '#F1F1F3', fontSize: 15 };

  return (
    <div style={{ position: 'fixed', zIndex: 60, left: 0, right: 0, bottom: 0, background: '#EFEDE6', boxSizing: 'border-box', padding: `10px 12px calc(10px + env(safe-area-inset-bottom))`, borderRadius: '32px 32px 0 0', boxShadow: '0 -8px 32px -6px rgba(14,17,22,0.3)', pointerEvents: 'auto' }}>
      <div style={{ padding: '4px 4px 10px', display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#5A5F68', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{fieldLabel}</span>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, color: '#0E1116', letterSpacing: '-0.02em', flex: 1 }}>
          {value || '0'}
        </span>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#5A5F68' }}>m</span>
      </div>
      {rows.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {row.map(k => (
            <button key={k} type="button" onClick={() => press(k)} style={k === '⌫' ? KEY_SPEC : KEY} aria-label={k === '⌫' ? 'Törlés' : k}>
              {k === '⌫'
                ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7H9L3 12l6 5h11a2 2 0 002-2V9a2 2 0 00-2-2zM15 11l-4 4M19 11l-4 4"/></svg>
                : k}
            </button>
          ))}
        </div>
      ))}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button type="button" onClick={onNext} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: SURVEY_INK, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {tM('roomEditorKeypadNext')}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </button>
        <button type="button" onClick={onDone} style={{ flex: 1, height: 56, border: 0, borderRadius: 28, background: SURVEY_BG, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          {tM('roomEditorKeypadDone')}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
        </button>
      </div>
    </div>
  );
}

function DimField({ label, value, unit, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, minHeight: 96, padding: '8px 4px',
        border: `2px solid ${isActive ? SURVEY_BG : 'transparent'}`,
        borderRadius: 22,
        background: isActive ? 'rgba(10,127,114,0.08)' : '#fff',
        color: '#0E1116',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
        cursor: 'pointer',
        boxShadow: isActive ? `0 0 0 3px rgba(10,127,114,0.2)` : 'inset 0 1px 0 #fff, 0 10px 18px -10px rgba(14,17,22,0.5)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: isActive ? SURVEY_BG : '#5A5F68' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: isActive ? SURVEY_BG : (value ? '#0E1116' : '#B0ADA6') }}>
        {value || '0'}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: isActive ? SURVEY_BG : '#5A5F68' }}>{unit}</span>
    </button>
  );
}

function CounterField({ label, value, onChange }) {
  return (
    <div style={{ flex: 1, background: '#fff', borderRadius: 22, padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, boxShadow: 'inset 0 1px 0 #fff, 0 10px 18px -10px rgba(14,17,22,0.5)' }}>
      <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button type="button" onClick={() => onChange(Math.max(0, value - 1))} aria-label="-1" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: '#F1F1F3', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>
        </button>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 32, fontWeight: 700, minWidth: 36, textAlign: 'center', color: '#0E1116' }}>{value}</span>
        <button type="button" onClick={() => onChange(Math.min(20, value + 1))} aria-label="+1" style={{ width: 48, height: 48, border: 0, borderRadius: 24, background: SURVEY_BG, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>
  );
}

// ── Sheet component — used as a bottom sheet in SurveyDetailMobile ─────────────

// entry = null → create mode; entry = object → edit mode
export function RoomEditorSheet({ entry, surveyId, onClose, onCreate }) {
  const isCreate = !entry;
  const tM = useTranslations('mobilePods');
  const tS = useTranslations('surveyDetail');
  const tc = useTranslations('common');
  const { fetchSurveyMedia } = useApp();

  const [name,        setName]        = useState(entry?.name        || '');
  const [width,       setWidth]       = useState(entry?.width_m  != null ? String(entry.width_m).replace('.', ',')  : '');
  const [length,      setLength]      = useState(entry?.length_m != null ? String(entry.length_m).replace('.', ',') : '');
  const [height,      setHeight]      = useState(entry?.height_m != null ? String(entry.height_m).replace('.', ',') : '');
  const [windows,     setWindows]     = useState(entry?.window_count || 0);
  const [doors,       setDoors]       = useState(entry?.door_count   || 0);
  const [notes,       setNotes]       = useState(entry?.description  || '');
  const [activeField, setActiveField] = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);

  const keypadActive = activeField !== null;

  const W = parseVal(width);
  const L = parseVal(length);
  const H = parseVal(height);
  const floorArea = (W > 0 && L > 0) ? +(W * L).toFixed(2)                              : null;
  const wallGross = (W > 0 && L > 0 && H > 0) ? +(2 * (W + L) * H).toFixed(2)          : null;
  const wallNet   = wallGross != null ? +(Math.max(0, wallGross - windows * 1.5 - doors * 2.0)).toFixed(2) : null;

  const dimSetters = { width: setWidth, length: setLength, height: setHeight };
  const dimValues  = { width, length, height };
  const dimLabels  = {
    width:  tM('roomEditorWidthLabel'),
    length: tM('roomEditorLengthLabel'),
    height: tM('roomEditorHeightLabel'),
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const fields = {
        name:         name.trim(),
        width_m:      parseVal(width),
        length_m:     parseVal(length),
        height_m:     parseVal(height),
        window_count: windows,
        door_count:   doors,
        description:  notes.trim() || null,
      };
      if (isCreate) {
        await onCreate(fields);
        onClose();
      } else {
        const res = await fetch(`/api/surveys/${surveyId}/entries/${entry.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        });
        if (res.ok) {
          await fetchSurveyMedia?.(surveyId).catch(() => {});
          setSaved(true);
          setTimeout(() => { setSaved(false); onClose(); }, 1200);
        }
      }
    } catch {}
    setSaving(false);
  };

  return (
    <>
      {/* Drag handle */}
      <div style={{ alignSelf: 'center', width: 44, height: 5, borderRadius: 3, background: '#D5D2C8' }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 23, fontWeight: 700, color: '#0E1116' }}>
          {isCreate ? tM('addRoomDashed') : (name || tM('roomEditorKicker'))}
        </span>
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          aria-label={tc('close')}
          style={{ width: 44, height: 44, border: 0, borderRadius: 22, background: '#EFEDE6', color: '#0E1116', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1, flexShrink: 0 }}
        >
          <X size={18} />
        </button>
      </div>

      {/* Body — extra padding when numpad is open so content scrolls above it */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, paddingBottom: keypadActive ? 290 : 0 }}>

        {/* Name */}
        <div>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#5A5F68', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
            {tS('entryNameLabel')}
          </span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            onFocus={() => setActiveField(null)}
            placeholder={tS('entryNamePlaceholder')}
            style={{ width: '100%', boxSizing: 'border-box', height: 52, border: 0, borderRadius: 18, background: '#fff', padding: '0 16px', fontSize: 18, fontWeight: 700, color: '#0E1116', fontFamily: "'Bricolage Grotesque', sans-serif", letterSpacing: '-0.02em', outline: 'none', boxShadow: 'inset 0 1px 0 #fff, 0 10px 18px -10px rgba(14,17,22,0.5)' }}
          />
        </div>

        {/* Dimensions */}
        <div>
          <h3 style={{ margin: '0 0 10px 2px', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#0E1116' }}>
            {tM('roomEditorDimsSection')}
          </h3>
          <div style={{ display: 'flex', gap: 10 }}>
            {DIM_FIELDS.map(field => (
              <DimField
                key={field}
                label={dimLabels[field]}
                value={dimValues[field]}
                unit="m"
                isActive={activeField === field}
                onClick={() => setActiveField(prev => prev === field ? null : field)}
              />
            ))}
          </div>
        </div>

        {/* Live area readout */}
        {(floorArea !== null || wallNet !== null) && (
          <div style={{ display: 'flex', gap: 10 }}>
            {floorArea !== null && (
              <div style={{ flex: 1, background: 'rgba(10,127,114,0.1)', border: '1px solid rgba(10,127,114,0.25)', borderRadius: 20, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: SURVEY_INK }}>
                  {tM('roomEditorFloorLabel')}
                </span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#0E1116' }}>
                  {String(floorArea).replace('.', ',')} m²
                </span>
              </div>
            )}
            {wallNet !== null && (
              <div style={{ flex: 1, background: '#F7F6F2', borderRadius: 20, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#5A5F68' }}>
                  {tM('roomEditorWallNetLabel')}
                </span>
                <span style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 26, fontWeight: 700, color: '#0E1116' }}>
                  {String(wallNet).replace('.', ',')} m²
                </span>
              </div>
            )}
          </div>
        )}

        {/* Openings */}
        <div>
          <h3 style={{ margin: '0 0 10px 2px', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#0E1116' }}>
            {tM('roomEditorOpeningsSection')}
          </h3>
          <div style={{ display: 'flex', gap: 10 }}>
            <CounterField label={tM('roomEditorWindowsLabel')} value={windows} onChange={setWindows} />
            <CounterField label={tM('roomEditorDoorsLabel')}   value={doors}   onChange={setDoors}   />
          </div>
        </div>

        {/* Notes */}
        <div>
          <h3 style={{ margin: '0 0 10px 2px', fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 17, fontWeight: 700, color: '#0E1116' }}>
            {tM('roomEditorNotesLabel')}
          </h3>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onFocus={() => setActiveField(null)}
            placeholder={tM('roomEditorNotesPlaceholder')}
            rows={3}
            style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: 0, borderRadius: 20, padding: '14px 16px', fontSize: 16, fontWeight: 500, color: '#0E1116', resize: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif", boxShadow: 'inset 0 1px 0 #fff, 0 10px 18px -10px rgba(14,17,22,0.5)', outline: 'none' }}
          />
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !name.trim()}
          style={{ height: 60, border: 0, borderRadius: 30, background: saved ? '#14532D' : '#0E1116', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: saving || !name.trim() ? 0.6 : 1, transition: 'background 0.3s' }}
        >
          {saved ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>
              {tM('roomEditorSaved')}
            </>
          ) : saving ? tM('roomEditorSaving') : isCreate ? (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
              {tc('create')}
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21H7a2 2 0 01-2-2V5l3-2h7l4 4v12a2 2 0 01-2 2zM8 21V13h8v8M13 3v5H8"/></svg>
              {tM('roomEditorSave')}
            </>
          )}
        </button>

      </div>

      {/* Numpad scrim */}
      {keypadActive && (
        <button
          type="button"
          onClick={() => setActiveField(null)}
          aria-label={tc('close')}
          style={{ position: 'fixed', inset: 0, zIndex: 59, border: 0, padding: 0, background: 'rgba(6,48,44,0.3)', cursor: 'pointer', pointerEvents: 'auto' }}
        />
      )}

      {/* Numpad */}
      {keypadActive && (
        <NumKeypad
          value={dimValues[activeField]}
          onChange={dimSetters[activeField]}
          onNext={() => setActiveField(FIELD_NEXT[activeField])}
          onDone={() => setActiveField(null)}
          fieldLabel={dimLabels[activeField]}
          tM={tM}
        />
      )}
    </>
  );
}
