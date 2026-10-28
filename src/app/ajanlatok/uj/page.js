'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Modal from '@/components/Modal';
import CollectiveSelector from '@/components/CollectiveSelector';
import ClientSelect from '@/components/ClientSelect';
import PageSpinner from '@/components/PageSpinner';
import WorkspacePicker from '@/components/mobile/WorkspacePicker';
import SharingBanner from '@/components/mobile/SharingBanner';
import { formatDate } from '@/lib/constants';
import {
  ArrowLeft, AlertCircle, Check, Loader2, Plus, Ruler, User, Search, X,
  ChevronDown, Users,
} from 'lucide-react';

const today  = () => new Date().toISOString().split('T')[0];
const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };

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
  const handleSave = async () => {
    if (!name.trim()) { setError('A név megadása kötelező!'); return; }
    setSaving(true);
    try { await onCreate({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(), gdprConsent: gdpr }); reset(); }
    catch (err) { setError(err.message || 'Hiba'); }
    finally { setSaving(false); }
  };
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Új ügyfél">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} style={{ flexShrink: 0 }} /><span>{error}</span></div>}
      <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Horváth Béla" /></div>
      <div className="grid-2col">
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+36 70 …" /></div>
        <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail *</label><input type="email" className="form-control" required value={email} onChange={e => setEmail(e.target.value)} placeholder="email@…" /></div>
      </div>
      <div className="form-group" style={{ marginTop: '0.75rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={address} onChange={e => setAddress(e.target.value)} placeholder="Irányítószám, Város, utca" /></div>
      <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.65rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: `1px solid ${gdpr ? 'var(--success-border)' : 'var(--border-subtle)'}`, cursor: 'pointer', margin: '0.75rem 0' }}>
        <input type="checkbox" checked={gdpr} onChange={e => setGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 14, height: 14 }} />
        <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>Az ügyfél hozzájárult adatainak tárolásához. <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span></span>
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={handleClose}>Mégse</button>
        <button type="button" className="btn btn-primary btn-sm" disabled={saving || !gdpr} onClick={handleSave}>{saving ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Létrehozás'}</button>
      </div>
    </Modal>
  );
}

function NewQuotePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    clients, surveys, loading, dataReady,
    createQuote, createQuoteSection, createClient,
    fetchSurveyMedia, currentUser, effectiveCollectives,
    isDemoMode,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const collectives = (effectiveCollectives || []).map(c => ({ id: c.collective_id, name: c.name, role: c.role }));

  // Mobile step: 1 = workspace (only if has collectives), 2 = form
  const [mobileStep, setMobileStep] = useState(1);
  const [collectiveId, setCollectiveId] = useState(null);

  const [surveyId, setSurveyId]   = useState(searchParams.get('from_survey') || null);
  const [surveySearch, setSurveySearch] = useState('');
  const [showSurveyDropdown, setShowSurveyDropdown] = useState(false);

  const [title, setTitle]             = useState(searchParams.get('title')       || '');
  const [location, setLocation]       = useState(searchParams.get('location')    || '');
  const [workType, setWorkType]       = useState('');
  const [description, setDescription] = useState(searchParams.get('description') || '');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [clientId, setClientId]       = useState(searchParams.get('client_id')   || '');
  const [taxPercent, setTaxPercent]   = useState(String(currentUser?.default_tax_percent ?? 27));

  const [error, setError]                   = useState('');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);

  const selectedSurvey    = surveys.find(s => s.id === surveyId);
  const selectedCollective = collectives.find(c => c.id === collectiveId);
  const isContributorCollective = !!(collectiveId && selectedCollective?.role !== 'owner' && selectedCollective?.role !== 'admin');

  useEffect(() => {
    const last = localStorage.getItem('last_tax_percent');
    if (last) setTaxPercent(last);
  }, []);

  const handleTaxChange = (v) => {
    setTaxPercent(v);
    localStorage.setItem('last_tax_percent', v);
  };

  useEffect(() => {
    if (!selectedSurvey) return;
    if (!title       && selectedSurvey.title)     setTitle(selectedSurvey.title);
    if (!location    && selectedSurvey.location)  setLocation(selectedSurvey.location);
    if (!clientId    && selectedSurvey.client_id) setClientId(selectedSurvey.client_id);
    if (!description && selectedSurvey.notes)     setDescription(selectedSurvey.notes);
  }, [surveyId]);

  const clearSurvey = () => {
    setSurveyId(null); setSurveySearch('');
    setTitle(''); setLocation(''); setClientId(''); setDescription('');
  };

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filteredSurveys = surveySearch
    ? surveys.filter(s => norm(s.title).includes(norm(surveySearch)) || norm(s.location).includes(norm(surveySearch)))
    : surveys;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('Az ajánlat neve kötelező!'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const quote = await createQuote({
        title: title.trim(), location: location.trim(), workType: workType.trim(),
        description: description.trim(), startDate: startDate || null, endDate: endDate || null,
        clientId: clientId || null, taxPercent: Number(taxPercent) || 0,
        surveyId: surveyId || null, collectiveId: isContributorCollective ? null : collectiveId,
      });
      if (isContributorCollective) {
        await fetch('/api/transfer-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_type: 'quote', document_id: quote.id, collective_id: collectiveId }),
        });
      }

      if (surveyId) {
        try {
          const data = await fetchSurveyMedia(surveyId);
          for (const entry of (data.entries || [])) {
            await createQuoteSection(quote.id, {
              name: entry.name, description: entry.description || null,
              width_m: entry.width_m ?? null, length_m: entry.length_m ?? null,
              height_m: entry.height_m ?? null, window_count: entry.window_count ?? 0,
              door_count: entry.door_count ?? 0, sort_order: entry.sort_order ?? 0,
              survey_entry_id: entry.id,
            });
          }
        } catch {}
      }

      router.push(`${navPrefix}/ajanlatok/${quote.id}`);
    } catch (err) {
      setError(err.message || 'Hiba az ajánlat mentésekor');
      setIsSubmitting(false);
    }
  };

  if (loading || !dataReady) return <PageSpinner />;

  // ── Mobile step 1: workspace picker ──
  if (collectives.length > 0 && mobileStep === 1) {
    return (
      <WorkspacePicker
        collectives={collectives}
        selected={collectiveId}
        onChange={setCollectiveId}
        onClose={() => router.back()}
        onNext={() => setMobileStep(2)}
        typeLabel="ajánlat"
      />
    );
  }

  const SurveyPicker = () => (
    <div className="card mb-4" style={{ padding: '1.25rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>
        Felmérés <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(opcionális — szekciók automatikusan átvéve)</span>
      </div>
      {selectedSurvey ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
          <Ruler size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{selectedSurvey.title}</div>
            {selectedSurvey.location && <div style={{ fontSize: '0.78rem', color: 'var(--accent)', opacity: 0.8 }}>{selectedSurvey.location}</div>}
          </div>
          <button type="button" onClick={clearSurvey} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '0.2rem', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input
            type="text" className="form-control" style={{ paddingLeft: '2.25rem' }}
            placeholder={surveys.length === 0 ? 'Még nincs felmérés' : 'Keresés a felmérések között…'}
            disabled={surveys.length === 0}
            value={surveySearch}
            onChange={e => { setSurveySearch(e.target.value); setShowSurveyDropdown(true); }}
            onFocus={() => setShowSurveyDropdown(true)}
            onBlur={() => setTimeout(() => setShowSurveyDropdown(false), 150)}
          />
          {showSurveyDropdown && surveys.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: '220px', overflowY: 'auto', marginTop: '0.25rem' }}>
              {filteredSurveys.length === 0 ? (
                <div style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nincs találat</div>
              ) : filteredSurveys.map(s => (
                <button key={s.id} type="button"
                  onMouseDown={() => { setSurveyId(s.id); setSurveySearch(''); setShowSurveyDropdown(false); }}
                  style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.1rem', padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{s.title}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {[s.location, s.date ? formatDate(s.date) : null].filter(Boolean).join(' · ')}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="container page-body" style={{ maxWidth: '720px' }}>

      {/* ── Mobile step-2 top bar ── */}
      <div className="show-mobile" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          <button
            type="button"
            onClick={() => collectives.length > 0 ? setMobileStep(1) : router.back()}
            style={{ width: 48, height: 48, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-card)' }}
            aria-label="Vissza"
          >
            <ArrowLeft size={22} color="#0f172a" strokeWidth={1.75} />
          </button>
          {collectives.length > 0 && (
            <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>2 / 2</span>
          )}
        </div>

        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: '34px', marginBottom: 12 }}>
          Új ajánlat
        </h1>

        {collectives.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setMobileStep(1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 44, padding: '0 14px', borderRadius: 999, background: collectiveId ? '#f0fdf4' : '#eff6ff', border: 'none', cursor: 'pointer', marginBottom: collectiveId ? 12 : 20 }}
            >
              {collectiveId
                ? <Users size={15} color="#16a34a" strokeWidth={1.75} />
                : <User size={15} color="#2563eb" strokeWidth={1.75} />}
              <span style={{ fontSize: 15, fontWeight: 700, color: collectiveId ? '#166534' : '#1d4ed8' }}>
                {collectiveId ? (selectedCollective?.name || 'Kollektíva') : 'Személyes'}
              </span>
              <ChevronDown size={14} color={collectiveId ? '#166534' : '#1d4ed8'} />
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
          <Link href={`${navPrefix}/ajanlatok`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
            <ArrowLeft size={15} /> Vissza
          </Link>
        </div>
        <div style={{ paddingTop: '0.5rem', marginBottom: '1.5rem' }}>
          <h1 className="page-title">Új ajánlat</h1>
        </div>
      </div>

      {/* CollectiveSelector — desktop only */}
      <div className="hide-mobile">
        <CollectiveSelector value={collectiveId} onChange={setCollectiveId} />
        {collectiveId && selectedCollective && (
          <div style={{ marginBottom: 16 }}>
            <SharingBanner collectiveName={selectedCollective.name} />
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <AlertCircle size={18} /><span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Survey picker — visible on both mobile and desktop */}
        <SurveyPicker />

        {/* Title + Client — visible on both */}
        <div className="card mb-4" style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>Alapadatok</div>
          <div className="form-group">
            <label className="form-label" htmlFor="q-title">Ajánlat neve *</label>
            <input id="q-title" type="text" className="form-control" required autoFocus value={title} onChange={e => setTitle(e.target.value)} placeholder="pl. Fürdőszoba felújítás" />
          </div>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>Megrendelő</div>
            <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label className="form-label" htmlFor="q-client">Ügyfél</label>
                <ClientSelect id="q-client" value={clientId} onChange={e => setClientId(e.target.value)} clients={clients} />
              </div>
              <button type="button" onClick={() => setShowNewClientModal(true)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', marginBottom: 0 }}>
                <Plus size={14} /> Új ügyfél
              </button>
            </div>
            {clientId && (() => { const c = clients.find(x => x.id === clientId); return c ? (
              <div style={{ marginTop: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600 }}>
                <User size={13} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
                {c.name}{c.phone && ` · ${c.phone}`}
              </div>
            ) : null; })()}
          </div>
        </div>

        {/* Optional details — desktop via CSS, hidden on mobile */}
        <div className="advanced-section" style={{ display: 'none' }}>
          <div className="card mb-4" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '1rem' }}>Részletek</div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="q-location">Helyszín</label>
                <input id="q-location" type="text" className="form-control" value={location} onChange={e => setLocation(e.target.value)} placeholder="pl. Budapest, Fő utca 12." />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="q-type">Munka típusa</label>
                <input id="q-type" type="text" className="form-control" value={workType} onChange={e => setWorkType(e.target.value)} placeholder="pl. Teljes felújítás" />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem' }}>
              <label className="form-label" htmlFor="q-desc">Leírás / Megjegyzés</label>
              <textarea id="q-desc" rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Részletes munkaleírás…" />
            </div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="q-start">Tervezett kezdés</label>
                <input id="q-start" type="date" className="form-control" min={today()} value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" htmlFor="q-end">Tervezett befejezés</label>
                <input id="q-end" type="date" className="form-control" min={startDate ? nextDay(startDate) : undefined} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
              <label className="form-label">ÁFA kulcs</label>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {['0', '5', '18', '27'].map(v => (
                  <button key={v} type="button" onClick={() => handleTaxChange(v)}
                    style={{ padding: '0.35rem 0.85rem', borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', background: taxPercent === v ? 'var(--accent)' : 'var(--bg-subtle)', color: taxPercent === v ? '#fff' : 'var(--text-secondary)', border: `1px solid ${taxPercent === v ? 'var(--accent)' : 'var(--border-subtle)'}` }}>{v}%</button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <input type="number" min="0" max="100" step="0.5" className="form-control text-mono" style={{ width: '80px' }} value={taxPercent} onChange={e => handleTaxChange(e.target.value)} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop submit */}
        <div className="hide-mobile" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
          <Link href={`${navPrefix}/ajanlatok`} className="btn btn-secondary">Mégse</Link>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting || !title.trim()}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Létrehozás…</> : <><Check size={16} />Ajánlat létrehozása</>}
          </button>
        </div>

        {/* Mobile sticky submit */}
        <div className="show-mobile" style={{ marginTop: 24 }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ width: '100%', height: 56, borderRadius: 999, background: '#0f172a', border: 'none', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
          >
            {isSubmitting ? 'Létrehozás...' : 'Ajánlat létrehozása'}
          </button>
        </div>
      </form>

      <NewClientModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        onCreate={async (fields) => { const c = await createClient({ ...fields }); setClientId(c.id); setShowNewClientModal(false); }}
      />
    </div>
  );
}

export default function NewQuotePage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <NewQuotePageInner />
    </Suspense>
  );
}
