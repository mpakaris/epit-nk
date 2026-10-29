'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Check, Loader2, Zap, Flame, Wind, Thermometer, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import useMobile from '@/hooks/useMobile';
import AudioRecorder from '@/components/AudioRecorder';
import InlineUpload from './InlineUpload';
import MediaGrid from './MediaGrid';

const UTILITY_CATS = [
  { type: 'electrical_box',  label: 'Elektromos elosztó', Icon: Zap },
  { type: 'heating_system',  label: 'Fűtési rendszer',    Icon: Flame },
  { type: 'ac_unit',         label: 'Klíma',               Icon: Wind },
  { type: 'boiler',          label: 'Bojler / Kazán',      Icon: Thermometer },
  { type: 'floor_heating',   label: 'Padlófűtés elosztó', Icon: Building2 },
];

export default function PropertyInfoSection({ survey, surveyId, canEdit, enqueue, triggerNotesAudio = 0 }) {
  const { updateSurvey, surveyMediaBySurvey, deleteSurveyMedia } = useApp();
  const isMobile = useMobile();

  const [collapsed, setCollapsed] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [aiStatus,   setAiStatus]   = useState('idle');

  useEffect(() => {
    if (triggerNotesAudio > 0) setCollapsed(false);
  }, [triggerNotesAudio]);

  const [plotSize,    setPlotSize]    = useState(() => survey.plot_size_m2       != null ? String(survey.plot_size_m2)       : '');
  const [gardenSize,  setGardenSize]  = useState(() => survey.garden_size_m2     != null ? String(survey.garden_size_m2)     : '');
  const [phases,      setPhases]      = useState(() => survey.electrical_phases  != null ? String(survey.electrical_phases)  : '');
  const [ampere,      setAmpere]      = useState(() => survey.electrical_ampere  != null ? String(survey.electrical_ampere)  : '');
  const [voltage,     setVoltage]     = useState(() => survey.electrical_voltage != null ? String(survey.electrical_voltage) : '');
  const [heatingType, setHeatingType] = useState(() => survey.heating_type       || '');
  const [propNotes,   setPropNotes]   = useState(() => survey.property_notes     || '');

  const valuesRef = useRef({});
  valuesRef.current = { plotSize, gardenSize, phases, ampere, voltage, heatingType, propNotes };

  const saveAll = useCallback(async (overrides = {}) => {
    const v = { ...valuesRef.current, ...overrides };
    setSaveStatus('saving');
    try {
      await updateSurvey(surveyId, {
        plot_size_m2:       v.plotSize    ? Number(v.plotSize)    : null,
        garden_size_m2:     v.gardenSize  ? Number(v.gardenSize)  : null,
        electrical_phases:  v.phases      ? Number(v.phases)      : null,
        electrical_ampere:  v.ampere      ? Number(v.ampere)      : null,
        electrical_voltage: v.voltage     ? Number(v.voltage)     : null,
        heating_type:       v.heatingType.trim() || null,
        property_notes:     v.propNotes.trim()   || null,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1800);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [updateSurvey, surveyId]);

  const handlePropertyTranscript = async (text) => {
    setAiStatus('filling');
    const overrides = {};
    try {
      const res = await fetch(`/api/surveys/${surveyId}/fill-property`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI hiba');
      const f = data.fields;
      if (f.plot_size_m2    != null) { setPlotSize(String(f.plot_size_m2));           overrides.plotSize    = String(f.plot_size_m2); }
      if (f.garden_size_m2  != null) { setGardenSize(String(f.garden_size_m2));       overrides.gardenSize  = String(f.garden_size_m2); }
      if (f.electrical_phases != null) { setPhases(String(f.electrical_phases));      overrides.phases      = String(f.electrical_phases); }
      if (f.electrical_ampere != null) { setAmpere(String(f.electrical_ampere));      overrides.ampere      = String(f.electrical_ampere); }
      if (f.electrical_voltage != null) { setVoltage(String(f.electrical_voltage));   overrides.voltage     = String(f.electrical_voltage); }
      if (f.heating_type)  { setHeatingType(f.heating_type);                          overrides.heatingType = f.heating_type; }
      if (f.property_notes) {
        const merged = propNotes.trim() ? propNotes.trim() + '\n\n' + f.property_notes : f.property_notes;
        setPropNotes(merged);
        overrides.propNotes = merged;
      }
      setAiStatus('saving');
      await saveAll(overrides);
      setAiStatus('done');
      setTimeout(() => setAiStatus('idle'), 2000);
    } catch {
      setAiStatus('error');
      setTimeout(() => setAiStatus('idle'), 3000);
    }
  };

  const allMedia = surveyMediaBySurvey[surveyId] || [];

  const utilityMediaCount = allMedia.filter(m => UTILITY_CATS.some(c => c.type === m.media_type)).length;

  const headerIndicator = aiStatus === 'filling' ? (
    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Loader2 size={11} className="animate-spin" /> AI feldolgozás…
    </span>
  ) : aiStatus === 'saving' ? (
    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Loader2 size={11} className="animate-spin" /> Mentés…
    </span>
  ) : aiStatus === 'done' ? (
    <span style={{ fontSize: '0.72rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Check size={11} /> Kész
    </span>
  ) : aiStatus === 'error' ? (
    <span style={{ fontSize: '0.72rem', color: '#fca5a5' }}>Hiba!</span>
  ) : saveStatus === 'saving' ? (
    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Loader2 size={11} className="animate-spin" /> Mentés…
    </span>
  ) : saveStatus === 'saved' ? (
    <span style={{ fontSize: '0.72rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Check size={11} /> Mentve
    </span>
  ) : null;

  const PILL = {
    fontSize: '0.68rem', fontWeight: 700,
    padding: '0.1rem 0.45rem',
    borderRadius: 'var(--radius-pill)',
    background: 'rgba(51, 65, 85, 0.08)',
    border: '1px solid rgba(51, 65, 85, 0.15)',
    color: '#334155',
    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
  };

  const pills = [
    survey.plot_size_m2   != null && <span key="plot"    style={PILL}>Telek: {survey.plot_size_m2} m²</span>,
    survey.garden_size_m2 != null && <span key="garden"  style={PILL}>Kert: {survey.garden_size_m2} m²</span>,
    survey.electrical_phases      && <span key="elec"    style={PILL}><Zap size={9} />{survey.electrical_phases}F{survey.electrical_ampere ? ` / ${survey.electrical_ampere}A` : ''}</span>,
    survey.heating_type           && <span key="heat"    style={PILL}><Flame size={9} />{survey.heating_type}</span>,
    utilityMediaCount > 0         && <span key="media"   style={PILL}>{utilityMediaCount} rendszerfotó</span>,
  ].filter(Boolean);

  return (
    <div className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Row 1: Title + status indicator ── */}
      <div style={{ background: '#1e3a5f', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', flex: 1 }}>Ingatlan adatok</span>
        {headerIndicator}
      </div>

      {/* ── Row 2: Pills + collapse toggle ── */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          background: '#f1f5f9',
          padding: '0.4rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid #e2e8f0',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', minWidth: 0 }}>
          {pills.length > 0
            ? pills
            : <span style={{ fontSize: '0.68rem', color: '#6b7280', fontStyle: 'italic' }}>Nincs adat</span>
          }
        </div>
        <div style={{ flexShrink: 0, color: '#475569', display: 'flex', alignItems: 'center' }}>
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: '1rem' }}>
          {aiStatus !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', borderRadius: 'var(--radius-sm)', background: aiStatus === 'error' ? 'var(--danger-bg)' : aiStatus === 'done' ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${aiStatus === 'error' ? 'var(--danger-border)' : aiStatus === 'done' ? 'var(--success-border)' : 'var(--border-subtle)'}`, fontSize: '0.82rem', fontWeight: 600, color: aiStatus === 'error' ? 'var(--danger-text)' : aiStatus === 'done' ? 'var(--success-text)' : 'var(--text-secondary)' }}>
              {(aiStatus === 'filling' || aiStatus === 'saving') && <Loader2 size={14} className="animate-spin" />}
              {aiStatus === 'done' && <Check size={14} />}
              {aiStatus === 'filling' && 'AI feldolgozás folyamatban…'}
              {aiStatus === 'saving' && 'Mentés…'}
              {aiStatus === 'done' && 'Mezők kitöltve és mentve'}
              {aiStatus === 'error' && 'Hiba a feldolgozás során'}
            </div>
          )}

          {canEdit ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Telek (m²)</label>
                  <input type="number" min="0" step="1" className="form-control" value={plotSize} onChange={e => setPlotSize(e.target.value)} onBlur={() => saveAll()} placeholder="pl. 800" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Kert (m²)</label>
                  <input type="number" min="0" step="1" className="form-control" value={gardenSize} onChange={e => setGardenSize(e.target.value)} onBlur={() => saveAll()} placeholder="pl. 200" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Fázisok</label>
                  <select className="form-control" value={phases} onChange={e => setPhases(e.target.value)} onBlur={() => saveAll()}>
                    <option value="">–</option>
                    <option value="1">1 fázis</option>
                    <option value="3">3 fázis</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Biztosíték (A)</label>
                  <input type="number" min="0" step="1" className="form-control" value={ampere} onChange={e => setAmpere(e.target.value)} onBlur={() => saveAll()} placeholder="pl. 63" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Feszültség (V)</label>
                  <input type="number" min="0" step="1" className="form-control" value={voltage} onChange={e => setVoltage(e.target.value)} onBlur={() => saveAll()} placeholder="230" />
                </div>
                <div className="form-group" style={{ margin: 0, gridColumn: isMobile ? 'span 2' : 'auto' }}>
                  <label className="form-label">Fűtési rendszer</label>
                  <input type="text" className="form-control" value={heatingType} onChange={e => setHeatingType(e.target.value)} onBlur={() => saveAll()} placeholder="pl. gázkazán, padlófűtés" />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>Megjegyzések</label>
                  <AudioRecorder
                    size="sm"
                    disabled={aiStatus !== 'idle'}
                    hideTriggerButton={isMobile}
                    externalTrigger={triggerNotesAudio}
                    hasContent={!!propNotes.trim()}
                    onTranscript={handlePropertyTranscript}
                    onError={() => setAiStatus('idle')}
                    hint="Mesélj az ingatlanról: telekméret, kertméret, elektromos rendszer (fázisok, ampere, feszültség), fűtési mód, bojler, klíma, általános állapot — mindent ami az egész épületre vonatkozik."
                  />
                </div>
                <textarea rows={3} className="form-control" value={propNotes}
                  onChange={e => setPropNotes(e.target.value)}
                  onBlur={() => saveAll()}
                  placeholder="Egyéb ingatlanadatok…"
                  style={{ fontSize: isMobile ? '0.82rem' : '0.875rem' }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {survey.plot_size_m2    != null && <span><strong>Telek:</strong> {survey.plot_size_m2} m²</span>}
              {survey.garden_size_m2  != null && <span><strong>Kert:</strong> {survey.garden_size_m2} m²</span>}
              {survey.electrical_phases != null && (
                <span><strong>Elektromosság:</strong> {survey.electrical_phases}F{survey.electrical_ampere ? ` / ${survey.electrical_ampere}A` : ''}{survey.electrical_voltage ? ` / ${survey.electrical_voltage}V` : ''}</span>
              )}
              {survey.heating_type  && <span><strong>Fűtés:</strong> {survey.heating_type}</span>}
              {survey.property_notes && <p style={{ width: '100%', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{survey.property_notes}</p>}
              {!survey.plot_size_m2 && !survey.garden_size_m2 && !survey.electrical_phases && !survey.heating_type && !survey.property_notes && (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs adat.</span>
              )}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>Rendszerfotók</div>
            {UTILITY_CATS.map(({ type, label, Icon }) => {
              const catMedia = allMedia.filter(m => m.media_type === type);
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: catMedia.length ? '0.35rem' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Icon size={13} color="var(--accent)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
                      {catMedia.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({catMedia.length})</span>}
                    </div>
                    {canEdit && enqueue && <InlineUpload surveyId={surveyId} entryId={null} mediaType={type} label="Fotó" enqueue={enqueue} iconOnly />}
                  </div>
                  {catMedia.length > 0 && <MediaGrid media={catMedia} onDelete={canEdit ? (item) => deleteSurveyMedia(item.id, surveyId, null, item.media_type) : undefined} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
