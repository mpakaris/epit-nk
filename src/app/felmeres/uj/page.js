'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import ErrorBanner from '@/components/ErrorBanner';
import { ArrowLeft, AlertCircle, Check, Loader2, Plus, User, Users, ChevronDown, MapPin } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import CollectiveSelector from '@/components/CollectiveSelector';
import ClientSelect from '@/components/ClientSelect';
import WorkspacePicker from '@/components/mobile/WorkspacePicker';
import SharingBanner from '@/components/mobile/SharingBanner';
import RoomChips from '@/components/mobile/RoomChips';

function NewClientModal({ isOpen, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gdpr, setGdpr] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const reset = () => { setName(''); setPhone(''); setEmail(''); setAddress(''); setGdpr(false); setError(''); };
  const handleClose = () => { reset(); onClose(); };
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('A név megadása kötelező!'); return; }
    setSaving(true);
    try {
      await onCreate({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), gdprConsent: gdpr });
      reset();
    } catch (err) {
      setError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Új ügyfél">
      <ErrorBanner message={error} style={{ marginBottom: '0.85rem' }} />
      <form onSubmit={handleSubmit}>
        <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Horváth Béla" /></div>
        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} /></div>
          <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail *</label><input type="email" className="form-control" required value={email} onChange={e => setEmail(e.target.value)} /></div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} /></div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: `1px solid ${gdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', margin: '0.75rem 0' }}>
          <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 14, height: 14 }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Az ügyfél hozzájárult adatainak tárolásához. <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span></span>
        </label>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !gdpr}>{saving ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Létrehozás'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function NewSurveyPage() {
  const router = useRouter();
  const { clients, loading, createSurvey, createClient, currentUser, isDemoMode, effectiveCollectives } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  // Mobile step (1 = workspace picker, 2 = form). Desktop always on form.
  const [mobileStep, setMobileStep] = useState(1);
  const [collectiveId, setCollectiveId] = useState(null); // null = personal

  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  if (loading) return <PageSpinner />;
  if (!currentUser) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--danger-text)' }}>Nincs jogosultsága.</div>;

  const collectives = (effectiveCollectives || []).map(c => ({ id: c.collective_id, name: c.name, role: c.role }));
  const selectedCollective = collectives.find(c => c.id === collectiveId);
  const isContributorCollective = !!(collectiveId && selectedCollective?.role !== 'owner' && selectedCollective?.role !== 'admin');

  const handleClientCreated = async ({ name, phone, email, address, gdprConsent }) => {
    const newClient = await createClient({ name, phone, email, address, gdprConsent, entityId: collectiveId });
    setClientId(newClient.id);
    setShowNewClientModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!title.trim()) { setError('A cím megadása kötelező!'); return; }
    setIsSubmitting(true);
    try {
      const survey = await createSurvey({ title: title.trim(), notes: notes.trim(), date: date || null, location: location.trim(), clientId, collectiveId: isContributorCollective ? null : collectiveId });
      if (isContributorCollective) {
        await fetch('/api/transfer-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_type: 'survey', document_id: survey.id, collective_id: collectiveId }),
        });
      }
      router.push(`${navPrefix}/felmeres/${survey.id}`);
    } catch (err) {
      setError(err.message || 'Hiba a felmérés mentésekor');
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients.find(c => c.id === clientId);

  // ── Mobile: step 1 — workspace picker ──
  if (collectives.length > 0 && mobileStep === 1) {
    return (
      <WorkspacePicker
        collectives={collectives}
        selected={collectiveId}
        onChange={setCollectiveId}
        onClose={() => router.back()}
        onNext={() => setMobileStep(2)}
        typeLabel="felmérés"
      />
    );
  }

  return (
    <div className="container page-body" style={{ maxWidth: '600px' }}>

      {/* ── Mobile step-2 top bar ── */}
      <div className="show-mobile" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <button
            type="button"
            onClick={() => collectives.length > 0 ? setMobileStep(1) : router.back()}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: '#fff', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-card)',
            }}
            aria-label="Vissza"
          >
            <ArrowLeft size={22} color="#0f172a" strokeWidth={1.75} aria-hidden="true" />
          </button>
          {collectives.length > 0 && (
            <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>2 / 2</span>
          )}
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '34px', marginBottom: 12 }}>
          Új felmérés
        </h1>

        {/* Workspace chip — tapping goes back to step 1 */}
        {collectives.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setMobileStep(1)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                height: 44, padding: '0 14px', borderRadius: 999,
                background: collectiveId ? '#f0fdf4' : '#eff6ff',
                border: 'none', cursor: 'pointer', marginBottom: collectiveId ? 12 : 20,
              }}
            >
              {collectiveId
                ? <Users size={15} color="#16a34a" strokeWidth={1.75} aria-hidden="true" />
                : <User size={15} color="#2563eb" strokeWidth={1.75} aria-hidden="true" />}
              <span style={{ fontSize: 15, fontWeight: 700, color: collectiveId ? '#166534' : '#1d4ed8' }}>
                {collectiveId ? (selectedCollective?.name || 'Kollektíva') : 'Személyes'}
              </span>
              <ChevronDown size={14} color={collectiveId ? '#166534' : '#1d4ed8'} aria-hidden="true" />
            </button>
            {collectiveId && selectedCollective && (
              <div style={{ marginBottom: 20 }}>
                <SharingBanner collectiveName={selectedCollective.name} />
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Desktop header ── */}
      <div className="hide-mobile">
        <div style={{ padding: '0.85rem 0 0.25rem' }}>
          <Link href={`${navPrefix}/felmeres`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
            <ArrowLeft size={15} /> Vissza a felmérésekhez
          </Link>
        </div>
        <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
          <h1 className="page-title">Új felmérés</h1>
        </div>
      </div>

      <ErrorBanner message={error} style={{ marginBottom: '1rem' }} />

      <form onSubmit={handleSubmit}>
        {/* Desktop collective selector */}
        <div className="hide-mobile">
          <CollectiveSelector value={collectiveId} onChange={setCollectiveId} />
        </div>

        {/* Sharing banner on desktop (mobile version is in the top bar above) */}
        {collectiveId && (
          <div className="hide-mobile" style={{ marginBottom: 16 }}>
            <SharingBanner collectiveName={selectedCollective?.name} />
          </div>
        )}

        {/* Form fields */}
        <div className="form-group">
          <label className="form-label" htmlFor="sv-title">Megnevezés *</label>
          <input
            id="sv-title" type="text" className="form-control"
            required autoFocus
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="pl. Fürdőszoba felújítás"
          />
        </div>

        {/* Location */}
        <div className="form-group">
          <label className="form-label" htmlFor="sv-location">Helyszín</label>
          <div style={{ position: 'relative' }}>
            <MapPin size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b', pointerEvents: 'none' }} aria-hidden="true" />
            <input
              id="sv-location" type="text" className="form-control"
              style={{ paddingLeft: 40 }}
              value={location} onChange={e => setLocation(e.target.value)}
              placeholder="Cím"
            />
          </div>
        </div>

        {/* Client selector — desktop only (add later on mobile) */}
        <div className="form-group hide-mobile">
          <label className="form-label">Ügyfél</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <ClientSelect value={clientId} onChange={e => setClientId(e.target.value)} clients={clients} style={{ flex: 1 }} />
            <button
              type="button"
              onClick={() => setShowNewClientModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ whiteSpace: 'nowrap' }}
              aria-label="Új ügyfél"
            >
              <Plus size={14} /> Új ügyfél
            </button>
          </div>
          {selectedClient && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
              <User size={12} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} aria-hidden="true" />
              {selectedClient.name}
            </div>
          )}
        </div>

        {/* Rooms — desktop only */}
        <div className="form-group hide-mobile">
          <label className="form-label" style={{ display: 'block', marginBottom: 10 }}>Helyiségek</label>
          <RoomChips selected={rooms} onChange={setRooms} />
        </div>

        {/* Desktop-only date + notes */}
        <div className="hide-mobile">
          <div className="form-group">
            <label className="form-label" htmlFor="sv-date">Dátum</label>
            <input id="sv-date" type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="sv-notes">Megjegyzések</label>
            <textarea id="sv-notes" rows={3} className="form-control" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Felmérési megjegyzések…" />
          </div>
        </div>

        {/* ── Desktop submit ── */}
        <div className="hide-mobile" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Mégse</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Mentés...</> : <><Check size={16} />Felmérés létrehozása</>}
          </button>
        </div>

        {/* ── Mobile sticky submit ── */}
        <div className="show-mobile" style={{ marginTop: 24 }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%', height: 56, borderRadius: 999,
              background: '#0f172a', border: 'none', color: '#fff',
              fontSize: 17, fontWeight: 700, cursor: 'pointer',
            }}
          >
            {isSubmitting ? 'Mentés...' : 'Felmérés indítása'}
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
