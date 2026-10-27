'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { AlertModal } from '@/components/Modal';
import { Ruler, FileText, FolderKanban, CalendarDays } from 'lucide-react';

const LINK_TYPES = [
  { id: null,        label: 'Semmi',    icon: null          },
  { id: 'felmeres',  label: 'Felmérés', icon: Ruler,        color: '#2563eb' },
  { id: 'ajanlat',   label: 'Ajánlat',  icon: FileText,     color: '#7c3aed' },
  { id: 'projekt',   label: 'Projekt',  icon: FolderKanban, color: '#059669' },
];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function NewAppointmentModal({ isOpen, onClose, defaultDate }) {
  const router = useRouter();
  const { clients, isDemoMode } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [title,    setTitle]    = useState('');
  const [date,     setDate]     = useState(defaultDate || todayStr());
  const [time,     setTime]     = useState('09:00');
  const [clientId, setClientId] = useState('');
  const [linkType, setLinkType] = useState('felmeres');
  const [saving,   setSaving]   = useState(false);
  const [alert,    setAlert]    = useState(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setDate(defaultDate || todayStr());
      setTime('09:00');
      setClientId('');
      setLinkType('felmeres');
      setSaving(false);
    }
  }, [isOpen, defaultDate]);

  async function handleSave() {
    if (!title.trim()) { setAlert('A cím kötelező.'); return; }
    setSaving(true);

    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, date, time: time || null, client_id: clientId || null, link_type: linkType }),
    });

    if (!res.ok) {
      const { error } = await res.json().catch(() => ({}));
      setAlert(error || 'Hiba történt. Kérjük, próbáld újra.');
      setSaving(false);
      return;
    }

    const { linkedDoc, linkedType } = await res.json();
    onClose();

    if (linkedDoc && linkedType) {
      const route = linkedType === 'felmeres' ? 'felmeres' : linkedType === 'ajanlat' ? 'ajanlatok' : 'projektek';
      router.push(`${navPrefix}/${route}/${linkedDoc.id}`);
    }
  }

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Új időpont">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <div>
            <label className="form-label">Cím</label>
            <input
              className="form-control"
              autoFocus
              placeholder="pl. Felmérés Kiskunháza"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
            />
          </div>

          {/* Date + Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label className="form-label">Dátum</label>
              <input className="form-control" type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Időpont</label>
              <input className="form-control" type="time" value={time} onChange={e => setTime(e.target.value)} />
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="form-label">Ügyfél (opcionális)</label>
            <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">— Nincs ügyfél —</option>
              {(clients || []).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Link type */}
          <div>
            <label className="form-label">Dokumentum létrehozása</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {LINK_TYPES.map(({ id, label, icon: Icon, color }) => {
                const active = linkType === id;
                return (
                  <button
                    key={String(id)}
                    type="button"
                    onClick={() => setLinkType(id)}
                    style={{
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-md)',
                      border: active ? `2px solid ${color || 'var(--border-subtle)'}` : '2px solid var(--border-subtle)',
                      background: active ? (color ? `${color}12` : 'var(--bg-subtle)') : '#fff',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      transition: 'all .12s',
                    }}
                  >
                    {Icon
                      ? <Icon size={16} color={active ? color : 'var(--text-muted)'} />
                      : <CalendarDays size={16} color={active ? 'var(--text-primary)' : 'var(--text-muted)'} />
                    }
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: active ? (color || 'var(--text-primary)') : 'var(--text-muted)',
                    }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save */}
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
            style={{ width: '100%', marginTop: 4 }}
          >
            {saving ? 'Mentés…' : linkType ? 'Mentés + Dokumentum →' : 'Mentés'}
          </button>

        </div>
      </Modal>

      <AlertModal
        isOpen={!!alert}
        onClose={() => setAlert(null)}
        title="Hiba"
        message={alert}
      />
    </>
  );
}
