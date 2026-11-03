'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Loader2, Zap, Flame, Wind, Thermometer, Building2, ChevronDown, ChevronUp, LayoutPanelLeft, PenLine } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import useMobile from '@/hooks/useMobile';
import AudioRecorder from '@/components/AudioRecorder';
import DrawingsSection from '@/components/DrawingsSection';
import InlineUpload from './InlineUpload';
import MediaGrid from './MediaGrid';

const UTILITY_TYPES = [
  { type: 'electrical_box',  labelKey: 'propertyUtilElectrical', Icon: Zap },
  { type: 'heating_system',  labelKey: 'propertyUtilHeating',    Icon: Flame },
  { type: 'ac_unit',         labelKey: 'propertyUtilAC',          Icon: Wind },
  { type: 'boiler',          labelKey: 'propertyUtilBoiler',      Icon: Thermometer },
  { type: 'floor_heating',   labelKey: 'propertyUtilFloorHeating', Icon: Building2 },
];

export default function PropertyInfoSection({ survey, surveyId, canEdit, enqueue, triggerNotesAudio = 0, layouts = [], canAdd = false, surveyDrawings = [], canDrawings = false, onSaveDrawing, onDeleteDrawing, drawingTrigger = 0, onDeleteMedia, canDeleteMediaItem }) {
  const t = useTranslations('surveyDetail');
  const { updateSurvey, surveyMediaBySurvey } = useApp();
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
      if (!res.ok) throw new Error(data.error || t('propertyAiBannerError'));
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

  const utilityMediaCount = allMedia.filter(m => UTILITY_TYPES.some(c => c.type === m.media_type)).length;

  const headerIndicator = aiStatus === 'filling' ? (
    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Loader2 size={11} className="animate-spin" /> {t('propertyAiProcessing')}
    </span>
  ) : aiStatus === 'saving' ? (
    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Loader2 size={11} className="animate-spin" /> {t('propertySaving')}
    </span>
  ) : aiStatus === 'done' ? (
    <span style={{ fontSize: '0.72rem', color: 'var(--success-text)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Check size={11} /> {t('propertyDone')}
    </span>
  ) : aiStatus === 'error' ? (
    <span style={{ fontSize: '0.72rem', color: 'var(--danger-text)' }}>{t('propertyError')}</span>
  ) : saveStatus === 'saving' ? (
    <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Loader2 size={11} className="animate-spin" /> {t('propertySaving')}
    </span>
  ) : saveStatus === 'saved' ? (
    <span style={{ fontSize: '0.72rem', color: '#86efac', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <Check size={11} /> {t('entrySavedStatus')}
    </span>
  ) : null;

  const PILL = {
    fontSize: '0.68rem', fontWeight: 700,
    padding: '0.1rem 0.45rem',
    borderRadius: 'var(--radius-pill)',
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-secondary)',
    display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
  };

  const pills = [
    survey.plot_size_m2   != null && <span key="plot"    style={PILL}>{t('propertyPillPlot', { value: survey.plot_size_m2 })}</span>,
    survey.garden_size_m2 != null && <span key="garden"  style={PILL}>{t('propertyPillGarden', { value: survey.garden_size_m2 })}</span>,
    survey.electrical_phases      && <span key="elec"    style={PILL}><Zap size={9} />{survey.electrical_phases}F{survey.electrical_ampere ? ` / ${survey.electrical_ampere}A` : ''}</span>,
    survey.heating_type           && <span key="heat"    style={PILL}><Flame size={9} />{survey.heating_type}</span>,
    utilityMediaCount > 0         && <span key="media"   style={PILL}>{t('propertyPillSystemPhotos', { count: utilityMediaCount })}</span>,
  ].filter(Boolean);

  return (
    <div className="card mb-4" style={{ padding: 0, overflow: 'hidden' }}>

      {/* ── Row 1: Title + status indicator ── */}
      <div style={{ background: 'var(--primary)', padding: '0.7rem 1rem', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff', flex: 1 }}>{t('propertyTitle')}</span>
        {headerIndicator}
      </div>

      {/* ── Row 2: Pills + collapse toggle ── */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          background: 'var(--bg-subtle)',
          padding: '0.4rem 1rem',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          cursor: 'pointer',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: '0.3rem', alignItems: 'center', minWidth: 0 }}>
          {pills.length > 0
            ? pills
            : <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('propertyNoData')}</span>
          }
        </div>
        <div style={{ flexShrink: 0, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
          {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </div>
      </div>

      {!collapsed && (
        <div style={{ padding: '1rem' }}>
          {aiStatus !== 'idle' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', borderRadius: 'var(--radius-sm)', background: aiStatus === 'error' ? 'var(--danger-bg)' : aiStatus === 'done' ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${aiStatus === 'error' ? 'var(--danger-border)' : aiStatus === 'done' ? 'var(--success-border)' : 'var(--border-subtle)'}`, fontSize: '0.82rem', fontWeight: 600, color: aiStatus === 'error' ? 'var(--danger-text)' : aiStatus === 'done' ? 'var(--success-text)' : 'var(--text-secondary)' }}>
              {(aiStatus === 'filling' || aiStatus === 'saving') && <Loader2 size={14} className="animate-spin" />}
              {aiStatus === 'done' && <Check size={14} />}
              {aiStatus === 'filling' && t('propertyAiBannerProcessing')}
              {aiStatus === 'saving' && t('propertyAiBannerSaving')}
              {aiStatus === 'done' && t('propertyAiBannerDone')}
              {aiStatus === 'error' && t('propertyAiBannerError')}
            </div>
          )}

          {canEdit ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('propertyPlotLabel')}</label>
                  <input type="number" min="0" step="1" className="form-control" value={plotSize} onChange={e => setPlotSize(e.target.value)} onBlur={() => saveAll()} placeholder="800" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('propertyGardenLabel')}</label>
                  <input type="number" min="0" step="1" className="form-control" value={gardenSize} onChange={e => setGardenSize(e.target.value)} onBlur={() => saveAll()} placeholder="200" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('propertyPhasesLabel')}</label>
                  <select className="form-control" value={phases} onChange={e => setPhases(e.target.value)} onBlur={() => saveAll()}>
                    <option value="">–</option>
                    <option value="1">{t('propertyPhase1')}</option>
                    <option value="3">{t('propertyPhase3')}</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('propertyAmpereLabel')}</label>
                  <input type="number" min="0" step="1" className="form-control" value={ampere} onChange={e => setAmpere(e.target.value)} onBlur={() => saveAll()} placeholder="63" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">{t('propertyVoltageLabel')}</label>
                  <input type="number" min="0" step="1" className="form-control" value={voltage} onChange={e => setVoltage(e.target.value)} onBlur={() => saveAll()} placeholder="230" />
                </div>
                <div className="form-group" style={{ margin: 0, gridColumn: isMobile ? 'span 2' : 'auto' }}>
                  <label className="form-label">{t('propertyHeatingTypeLabel')}</label>
                  <input type="text" className="form-control" value={heatingType} onChange={e => setHeatingType(e.target.value)} onBlur={() => saveAll()} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label className="form-label" style={{ margin: 0 }}>{t('propertyNotesLabel')}</label>
                  <AudioRecorder
                    size="sm"
                    disabled={aiStatus !== 'idle'}
                    hideTriggerButton={isMobile}
                    externalTrigger={triggerNotesAudio}
                    hasContent={!!propNotes.trim()}
                    onTranscript={handlePropertyTranscript}
                    onError={() => setAiStatus('idle')}
                    hint={t('propertyHint')}
                  />
                </div>
                <textarea rows={3} className="form-control" value={propNotes}
                  onChange={e => setPropNotes(e.target.value)}
                  onBlur={() => saveAll()}
                  placeholder={t('propertyNotesPlaceholder')}
                  style={{ fontSize: isMobile ? '0.82rem' : '0.875rem' }}
                />
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
              {survey.plot_size_m2    != null && <span><strong>{t('propertyReadPlot')}</strong> {survey.plot_size_m2} m²</span>}
              {survey.garden_size_m2  != null && <span><strong>{t('propertyReadGarden')}</strong> {survey.garden_size_m2} m²</span>}
              {survey.electrical_phases != null && (
                <span><strong>{t('propertyReadElectric')}</strong> {survey.electrical_phases}F{survey.electrical_ampere ? ` / ${survey.electrical_ampere}A` : ''}{survey.electrical_voltage ? ` / ${survey.electrical_voltage}V` : ''}</span>
              )}
              {survey.heating_type  && <span><strong>{t('propertyReadHeating')}</strong> {survey.heating_type}</span>}
              {survey.property_notes && <p style={{ width: '100%', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{survey.property_notes}</p>}
              {!survey.plot_size_m2 && !survey.garden_size_m2 && !survey.electrical_phases && !survey.heating_type && !survey.property_notes && (
                <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>{t('propertyNoDataFull')}</span>
              )}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>{t('propertySystemPhotosHeader')}</div>

            {/* Alaprajzok + Vázlat — mobile only (desktop has separate cards), always first */}
            {isMobile && (
              <>
                {/* Alaprajzok row — position 1 */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: layouts.length ? '0.35rem' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <LayoutPanelLeft size={13} color="var(--accent)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('propertyLayoutsMobile')}</span>
                      {layouts.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({layouts.length})</span>}
                    </div>
                    {canAdd && enqueue && <InlineUpload surveyId={surveyId} entryId={null} mediaType="layout" label={t('propertyUploadBtn')} enqueue={enqueue} iconOnly />}
                  </div>
                  {layouts.length > 0 && <MediaGrid media={layouts} onDelete={onDeleteMedia} canDeleteItem={canDeleteMediaItem} />}
                </div>

                {/* Vázlat row — custom header row with "+" trigger, DrawingsSection only renders grid + modal */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: surveyDrawings.length ? '0.35rem' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <PenLine size={13} color="var(--accent)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t('propertySketchMobile')}</span>
                      {surveyDrawings.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({surveyDrawings.length})</span>}
                    </div>
                    {canDrawings && (
                      <DrawingsSection
                        drawings={surveyDrawings}
                        onSave={onSaveDrawing}
                        onDelete={onDeleteDrawing}
                        canEdit={canDrawings}
                        compact
                        triggerCount={drawingTrigger}
                      />
                    )}
                  </div>
                  {surveyDrawings.length > 0 && (
                    <DrawingsSection
                      drawings={surveyDrawings}
                      onSave={onSaveDrawing}
                      onDelete={onDeleteDrawing}
                      canEdit={canDrawings}
                      hideHeader
                    />
                  )}
                </div>
              </>
            )}

            {UTILITY_TYPES.map(({ type, labelKey, Icon }) => {
              const catMedia = allMedia.filter(m => m.media_type === type);
              return (
                <div key={type}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: catMedia.length ? '0.35rem' : 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Icon size={13} color="var(--accent)" />
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{t(labelKey)}</span>
                      {catMedia.length > 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>({catMedia.length})</span>}
                    </div>
                    {canEdit && enqueue && <InlineUpload surveyId={surveyId} entryId={null} mediaType={type} label={t('propertyPhotoBtn')} enqueue={enqueue} iconOnly />}
                  </div>
                  {catMedia.length > 0 && <MediaGrid media={catMedia} onDelete={onDeleteMedia} canDeleteItem={canDeleteMediaItem} />}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
