'use client';

import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { useApp } from '@/context/AppContext';
import { AlertTriangle, Users, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';

const DOC_TYPE_LABEL = { project: 'projektet', quote: 'ajánlatot', survey: 'felmérést' };
const DOC_ROUTE      = { project: '/projektek', quote: '/ajanlatok', survey: '/felmeres' };

export default function TransferToCollectiveModal({ isOpen, onClose, documentType, documentId, documentTitle }) {
  const { collectives: userMemberships, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const available = (userMemberships || []).filter(m => m.collective_id);

  const [step, setStep]                   = useState('pick');
  const [selected, setSelected]           = useState(null);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');
  const [movedDirectly, setMovedDirectly] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setError('');
    setLoading(false);
    setMovedDirectly(false);
    if (available.length === 1) {
      setSelected(available[0]);
      setStep('confirm');
    } else {
      setSelected(null);
      setStep('pick');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSelect = (coll) => {
    setSelected(coll);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/transfer-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document_type: documentType,
          document_id:   documentId,
          collective_id: selected.collective_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Hiba történt. Kérjük, próbáld újra.');
        return;
      }
      setMovedDirectly(data.moved === true);
      setStep('success');
    } catch {
      setError('Hálózati hiba. Próbáld újra.');
    } finally {
      setLoading(false);
    }
  };

  const isContributor = selected?.role === 'contributor';

  const titles = {
    pick:    'Áthelyezés kollektívába',
    confirm: 'Áthelyezés megerősítése',
    success: movedDirectly ? 'Sikeresen áthelyezve' : 'Kérelem elküldve',
  };

  return (
    <Modal isOpen={isOpen} onClose={loading ? undefined : onClose} title={titles[step]}>

      {/* ── Step 1: collective picker ── */}
      {step === 'pick' && (
        <div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: 1.5 }}>
            Válaszd ki, melyik kollektívába helyezed át a <strong>„{documentTitle}"</strong> {DOC_TYPE_LABEL[documentType]}!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {available.map(coll => (
              <button
                key={coll.collective_id}
                type="button"
                onClick={() => handleSelect(coll)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.85rem 1rem', borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-subtle)',
                  background: 'var(--bg-card)', cursor: 'pointer', textAlign: 'left',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 'var(--radius-md)', flexShrink: 0,
                  background: 'var(--accent-light)', border: '1px solid var(--accent-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Users size={16} color="var(--accent)" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{coll.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {coll.role === 'owner' ? 'Tulajdonos — közvetlen áthelyezés' : 'Közreműködő — jóváhagyás szükséges'}
                  </div>
                </div>
                <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Step 2: confirmation ── */}
      {step === 'confirm' && selected && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1.25rem' }}>
            <div style={{
              flexShrink: 0, width: 40, height: 40, borderRadius: '50%',
              background: 'var(--warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <AlertTriangle size={20} color="var(--warning-text)" />
            </div>
            <div>
              {isContributor ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Ha a <strong>{selected.name}</strong> kollektíva tulajdonosa elfogadja a kérelmet,
                  a <strong>„{documentTitle}"</strong> {DOC_TYPE_LABEL[documentType]} tulajdonosa ő lesz.
                  {' '}<strong>Ez nem vonható vissza.</strong>
                </p>
              ) : (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  A <strong>„{documentTitle}"</strong> {DOC_TYPE_LABEL[documentType]} láthatóvá válik
                  a <strong>{selected.name}</strong> kollektíva összes tagja számára.
                  {' '}<strong>Ez nem vonható vissza.</strong>
                </p>
              )}
              {isContributor && (
                <p style={{ fontSize: '0.8rem', color: 'var(--warning-text)', marginTop: '0.75rem', padding: '0.5rem 0.65rem', background: 'var(--warning-bg)', borderRadius: 'var(--radius-md)', lineHeight: 1.5 }}>
                  Amíg a kérelem függőben van, a dokumentum nem szerkeszthető és nem törölhető.
                </p>
              )}
            </div>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-bg)', border: '1px solid var(--danger-border)',
              color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)',
              fontSize: '0.825rem', marginBottom: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => available.length > 1 ? setStep('pick') : onClose()}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {available.length > 1 && <ArrowLeft size={13} />}
              {available.length > 1 ? 'Vissza' : 'Mégse'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleConfirm}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
            >
              {loading
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Folyamatban…</>
                : isContributor ? 'Kérelem küldése' : 'Igen, áthelyezem'
              }
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: success ── */}
      {step === 'success' && selected && (
        <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'var(--success-bg)', border: '1px solid var(--success-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem',
          }}>
            <Check size={28} color="var(--success-text)" />
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            {movedDirectly
              ? <>A <strong>„{documentTitle}"</strong> mostantól a <strong>{selected.name}</strong> kollektíva tagjai számára is látható.</>
              : <>A kérelmet elküldtük a <strong>{selected.name}</strong> kollektíva tulajdonosának jóváhagyásra.</>
            }
          </p>
          <div style={{ display: 'flex', gap: '0.65rem', justifyContent: 'center' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}>Bezárás</button>
            {movedDirectly && (
              <a
                href={`${navPrefix}${DOC_ROUTE[documentType]}/${documentId}`}
                className="btn btn-primary btn-sm"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                Megtekintés <ArrowRight size={13} />
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
