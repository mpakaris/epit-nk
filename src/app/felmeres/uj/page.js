'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal, { AlertModal } from '@/components/Modal';
import { ArrowLeft, AlertCircle, Check, Loader2, Plus, User } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';

// Isolated component — its own state doesn't re-render the parent on every keystroke
function NewClientModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => { setName(''); setPhone(''); setEmail(''); setAddress(''); setError(''); };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('A név megadása kötelező!'); return; }
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() });
      reset();
    } catch (err) {
      setError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Új ügyfél">
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="nc-name">Név *</label>
          <input id="nc-name" type="text" className="form-control" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Horváth Béla" />
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="nc-phone">Telefon</label>
            <input id="nc-phone" type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+36 70 …" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="nc-email">E-mail</label>
            <input id="nc-email" type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@…" />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: '1.25rem' }}>
          <label className="form-label" htmlFor="nc-addr">Cím</label>
          <input id="nc-addr" type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} placeholder="Irányítószám, Város, utca" />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? 'Mentés...' : 'Létrehozás'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function NewSurveyPage() {
  const router = useRouter();
  const { clients, loading, createSurvey, createClient, isAdmin, effectiveEntityId } = useApp();

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  if (loading) return <PageSpinner />;
  if (!isAdmin) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>Nincs jogosultsága.</div>;

  const handleClientCreated = async ({ name, phone, email, address }) => {
    const newClient = await createClient({ name, phone, email, address, entityId: effectiveEntityId });
    setClientId(newClient.id);
    setShowNewClientModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('A cím megadása kötelező!'); return; }
    if (!clientId) { setError('Ügyfél kiválasztása kötelező!'); return; }
    setIsSubmitting(true);
    try {
      const survey = await createSurvey({ title: title.trim(), notes: notes.trim(), date: date || null, location: location.trim(), clientId });
      router.push(`/felmeres/${survey.id}`);
    } catch (err) {
      setError(err.message || 'Hiba a felmérés mentésekor');
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <div className="container" style={{ maxWidth: '600px', paddingBottom: '3rem' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/felmeres" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza a felmérésekhez
        </Link>
      </div>

      <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
        <h1 className="page-title">Új felmérés</h1>
        <p className="page-subtitle">Töltse ki a felmérés alapadatait</p>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>Alapadatok</div>

          <div className="form-group">
            <label className="form-label" htmlFor="sv-title">Felmérés neve *</label>
            <input id="sv-title" type="text" className="form-control" required value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Fürdőszoba felmérés, Kovács Béla" />
          </div>

          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="sv-date">Dátum</label>
              <input id="sv-date" type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" htmlFor="sv-location">Helyszín</label>
              <input id="sv-location" type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder="pl. 8600 Siófok, Fő u. 12." />
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label" htmlFor="sv-notes">Megjegyzések</label>
            <textarea id="sv-notes" rows={3} className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Felmérési megjegyzések, részletek…" />
          </div>
        </div>

        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>Megrendelő *</div>
          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label className="form-label" htmlFor="sv-client">Ügyfél *</label>
              <select id="sv-client" className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} style={{ borderColor: !clientId ? 'var(--warning-border)' : undefined }}>
                <option value="">– Válasszon ügyfelet –</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <button type="button" onClick={() => setShowNewClientModal(true)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', marginBottom: 0 }}>
              <Plus size={14} /> Új ügyfél
            </button>
          </div>
          {selectedClient && (
            <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
              <User size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
              {selectedClient.name}{selectedClient.phone && ` · ${selectedClient.phone}`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <Link href="/felmeres" className="btn btn-secondary">Mégse</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Mentés...</> : <><Check size={16} />Felmérés létrehozása</>}
          </button>
        </div>
      </form>

      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreate={handleClientCreated}
      />
    </div>
  );
}
