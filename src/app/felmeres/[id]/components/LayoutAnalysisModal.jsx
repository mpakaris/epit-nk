'use client';

import { useState, useEffect } from 'react';
import { Sparkles, Loader2, Check, AlertCircle } from 'lucide-react';
import Modal from '@/components/Modal';

export default function LayoutAnalysisModal({ surveyId, layout, existingEntries = [], onClose, onCreated, createSurveyEntry }) {
  const [step, setStep]     = useState('analyzing');
  const [rooms, setRooms]   = useState([]);
  const [error, setError]   = useState('');
  const [creating, setCreating] = useState(false);
  const [done, setDone]     = useState(false);

  const existingNames = new Set(existingEntries.map(e => e.name.trim().toLowerCase()));

  const analyze = async () => {
    setStep('analyzing');
    setError('');
    try {
      const res = await fetch(`/api/surveys/${surveyId}/analyze-layout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: layout.drive_view_url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba az elemzés közben.');
      if (!data.rooms?.length) throw new Error('Az AI nem talált helyiségeket ezen az alaprajzon.');
      setRooms(data.rooms.map((r, i) => ({
        ...r,
        _id: i,
        selected: !existingNames.has(r.name.trim().toLowerCase()),
      })));
      setStep('review');
    } catch (err) {
      setError(err.message);
      setStep('error');
    }
  };

  useEffect(() => {
    setTimeout(analyze, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRoom = (id, field, value) => {
    setRooms(prev => prev.map(r => r._id === id ? { ...r, [field]: value } : r));
  };

  const handleCreate = async () => {
    const toCreate = rooms.filter(r => r.selected && r.name.trim());
    if (!toCreate.length) return;
    setCreating(true);
    setError('');
    try {
      for (const r of toCreate) {
        const wNum = r.width_m  != null && r.width_m  !== '' ? Number(r.width_m)  : null;
        const lNum = r.length_m != null && r.length_m !== '' ? Number(r.length_m) : null;
        const sNum = r.size_m2  != null && r.size_m2  !== '' ? Number(r.size_m2)  : null;
        await createSurveyEntry(surveyId, {
          name:         r.name.trim(),
          width_m:      wNum,
          length_m:     lNum,
          // if no explicit dims but size provided, pass it through via description or just the fields
          size_m2:      wNum > 0 && lNum > 0 ? wNum * lNum : sNum,
          door_count:   Number(r.door_count)   || 0,
          window_count: Number(r.window_count) || 0,
        });
      }
      setDone(true);
      setTimeout(() => { onCreated?.(); onClose(); }, 900);
    } catch (err) {
      setError(err.message || 'Hiba a helyiségek létrehozásakor.');
    } finally {
      setCreating(false);
    }
  };

  const selectedCount = rooms.filter(r => r.selected).length;

  return (
    <Modal isOpen onClose={!creating ? onClose : undefined} title="Alaprajz elemzése" maxWidth="580px">

      {/* ANALYZING */}
      {step === 'analyzing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 1rem', gap: '0.85rem' }}>
          <Loader2 size={32} color="var(--accent)" className="animate-spin" />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.3rem' }}>Elemzés folyamatban…</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Helyiségek, méretek és nyílások azonosítása</div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {step === 'error' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1.25rem' }}>
            <AlertCircle size={15} color="var(--danger-text)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--danger-text)' }}>{error}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bezárás</button>
          </div>
        </div>
      )}

      {/* REVIEW */}
      {step === 'review' && (
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.85rem' }}>
            {rooms.length} helyiséget azonosított az AI. Módosítsd ha szükséges, majd hozd létre a kijelölteket.
          </p>

          {error && (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-start', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--danger-text)' }}>
              <AlertCircle size={13} style={{ flexShrink: 0, marginTop: 2 }} />{error}
            </div>
          )}

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 50px 50px 48px 40px 40px', gap: '0.3rem', padding: '0 0.65rem', marginBottom: '0.35rem' }}>
            <div />
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Helyiség</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Sz (m)</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>H (m)</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>m²</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Ajtó</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'center' }}>Ablak</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '1.25rem' }}>
            {rooms.map(room => {
              const alreadyExists = existingNames.has(room.name.trim().toLowerCase());
              return (
                <div
                  key={room._id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '26px 1fr 50px 50px 48px 40px 40px',
                    gap: '0.3rem',
                    alignItems: 'center',
                    padding: '0.4rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${room.selected ? 'var(--accent-border, #bfdbfe)' : 'var(--border-subtle)'}`,
                    background: room.selected ? 'var(--accent-light, #eff6ff)' : 'var(--bg-subtle)',
                  }}
                >
                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => updateRoom(room._id, 'selected', !room.selected)}
                    style={{
                      width: 20, height: 20, borderRadius: 4,
                      border: `2px solid ${room.selected ? 'var(--accent)' : 'var(--border-default, #cbd5e1)'}`,
                      background: room.selected ? 'var(--accent)' : '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', flexShrink: 0,
                    }}
                  >
                    {room.selected && <Check size={11} color="#fff" strokeWidth={3} />}
                  </button>

                  {/* Name + existing badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: 0 }}>
                    <input
                      type="text"
                      value={room.name}
                      onChange={e => updateRoom(room._id, 'name', e.target.value)}
                      className="form-control"
                      style={{ fontSize: '0.82rem', fontWeight: 600, padding: '0.2rem 0.4rem', minWidth: 0 }}
                    />
                    {alreadyExists && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-pill)', padding: '0.1rem 0.4rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        létezik
                      </span>
                    )}
                  </div>

                  {[
                    { field: 'width_m',      step: '0.1' },
                    { field: 'length_m',     step: '0.1' },
                    { field: 'size_m2',      step: '0.1' },
                    { field: 'door_count',   step: '1' },
                    { field: 'window_count', step: '1' },
                  ].map(({ field, step }) => (
                    <input
                      key={field}
                      type="number"
                      min="0"
                      step={step}
                      value={room[field] ?? ''}
                      onChange={e => updateRoom(room._id, field, e.target.value === '' ? null : e.target.value)}
                      className="form-control"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.25rem', textAlign: 'center' }}
                      placeholder="—"
                    />
                  ))}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={creating}>Mégse</button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={creating || !selectedCount || done}
            >
              {done ? (
                <><Check size={14} /> Kész!</>
              ) : creating ? (
                <><Loader2 size={14} className="animate-spin" /> Létrehozás…</>
              ) : (
                <><Sparkles size={14} /> {selectedCount} helyiség létrehozása</>
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
