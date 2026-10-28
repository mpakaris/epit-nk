'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import CollectiveSelector from '@/components/CollectiveSelector';
import ClientSelect from '@/components/ClientSelect';
import PageSpinner from '@/components/PageSpinner';
import WorkspacePicker from '@/components/mobile/WorkspacePicker';
import SharingBanner from '@/components/mobile/SharingBanner';
import {
  ArrowLeft, AlertCircle, Check, Loader2, Plus, FileText, Search, X,
  User, Users, ChevronDown,
} from 'lucide-react';

export default function NewProjectPage() {
  const router = useRouter();
  const {
    loading, dataReady, clients, quotes, effectiveCollectives,
    currentUser, isDemoMode, refreshSupabaseData,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const collectives = (effectiveCollectives || []).map(c => ({ id: c.collective_id, name: c.name, role: c.role }));

  // Mobile step: 1 = workspace (only if has collectives), 2 = form
  const [mobileStep, setMobileStep] = useState(1);
  const [collectiveId, setCollectiveId] = useState(null);

  const [name, setName]             = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId]     = useState('');
  const [startDate, setStartDate]   = useState('');
  const [endDate, setEndDate]       = useState('');
  const [quoteId, setQuoteId]       = useState('');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [showQuoteDropdown, setShowQuoteDropdown] = useState(false);

  const [error, setError]           = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCollective = collectives.find(c => c.id === collectiveId);
  const isContributorCollective = !!(collectiveId && selectedCollective?.role !== 'owner' && selectedCollective?.role !== 'admin');
  const selectedQuote      = (quotes || []).find(q => q.id === quoteId);

  const norm = s => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const filteredQuotes = quoteSearch
    ? (quotes || []).filter(q => norm(q.title).includes(norm(quoteSearch)) || norm(q.location || '').includes(norm(quoteSearch)))
    : (quotes || []);

  const handleQuoteLink = (id) => {
    setQuoteId(id);
    setQuoteSearch('');
    setShowQuoteDropdown(false);
    if (!id) return;
    const q = (quotes || []).find(x => x.id === id);
    if (!q) return;
    if (!name && q.title)       setName(q.title);
    if (!clientId && q.client_id) setClientId(q.client_id);
    if (!startDate && q.start_date) setStartDate(q.start_date);
    if (!endDate && q.end_date) setEndDate(q.end_date);
    if (q.collective_id)         setCollectiveId(q.collective_id);
  };

  const clearQuote = () => {
    setQuoteId(''); setQuoteSearch(''); setName(''); setClientId('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('A projekt neve kötelező!'); return; }
    setError('');
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          clientId: clientId || null,
          collectiveId: isContributorCollective ? null : collectiveId,
          quoteId: quoteId || null,
          startDate: startDate || null,
          endDate: endDate || null,
          memberIds: currentUser?.id ? [currentUser.id] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a projekt létrehozásakor');
      if (isContributorCollective) {
        await fetch('/api/transfer-requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document_type: 'project', document_id: data.project.id, collective_id: collectiveId }),
        });
      }
      await refreshSupabaseData();
      router.push(`${navPrefix}/projektek/${data.project.id}`);
    } catch (err) {
      setError(err.message || 'Hiba a projekt létrehozásakor');
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
        typeLabel="projekt"
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
          Új projekt
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
          <Link href={`${navPrefix}/projektek`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
            <ArrowLeft size={15} /> Vissza a projektekhez
          </Link>
        </div>
        <div style={{ marginBottom: '1.5rem', paddingTop: '0.5rem' }}>
          <h1 className="page-title">Új projekt</h1>
        </div>
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
        {/* Quote/Offer picker — visible on both */}
        <div className="form-group">
          <label className="form-label">Kapcsolódó ajánlat <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcionális)</span></label>
          {quoteId ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)' }}>
              <FileText size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: 'var(--accent)' }}>{selectedQuote?.title}</div>
                {selectedQuote?.location && <div style={{ fontSize: '0.78rem', color: 'var(--accent)', opacity: 0.8 }}>{selectedQuote.location}</div>}
              </div>
              <button type="button" onClick={clearQuote} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: '0.2rem', display: 'flex' }}>
                <X size={16} />
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text" className="form-control" style={{ paddingLeft: '2.25rem' }}
                placeholder={(quotes || []).length === 0 ? 'Még nincs ajánlat' : 'Keresés az ajánlatok között…'}
                disabled={(quotes || []).length === 0}
                value={quoteSearch}
                onChange={e => { setQuoteSearch(e.target.value); setShowQuoteDropdown(true); }}
                onFocus={() => setShowQuoteDropdown(true)}
                onBlur={() => setTimeout(() => setShowQuoteDropdown(false), 150)}
              />
              {showQuoteDropdown && (quotes || []).length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', maxHeight: '220px', overflowY: 'auto', marginTop: '0.25rem' }}>
                  {filteredQuotes.length === 0 ? (
                    <div style={{ padding: '0.85rem 1rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>Nincs találat</div>
                  ) : filteredQuotes.map(q => (
                    <button key={q.id} type="button"
                      onMouseDown={() => handleQuoteLink(q.id)}
                      style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.1rem', padding: '0.65rem 1rem', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{q.title}</span>
                      {q.location && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{q.location}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Project name — visible on both */}
        <div className="form-group">
          <label className="form-label" htmlFor="proj-name">Projekt neve *</label>
          <input
            id="proj-name" type="text" className="form-control"
            required autoFocus
            value={name} onChange={e => setName(e.target.value)}
            placeholder="pl. Balatoni Nyaraló Felújítás"
          />
        </div>

        {/* Client + dates — desktop only */}
        <div className="hide-mobile">
          <div className="form-group">
            <label className="form-label">Megrendelő</label>
            <ClientSelect value={clientId} onChange={e => setClientId(e.target.value)} clients={clients || []} />
            {clientId && <div style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600, marginTop: '0.25rem' }}>✓ {(clients || []).find(c => c.id === clientId)?.name}</div>}
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="proj-desc">Leírás</label>
            <textarea id="proj-desc" rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} placeholder="Rövid leírás…" />
          </div>
          <div className="grid-2col" style={{ marginBottom: '1.25rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="proj-start">Kezdés</label>
              <input id="proj-start" type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" htmlFor="proj-end">Befejezés</label>
              <input id="proj-end" type="date" className="form-control" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Desktop submit */}
        <div className="hide-mobile" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>Mégse</button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 size={16} className="animate-spin" />Létrehozás…</> : <><Check size={16} />Projekt létrehozása</>}
          </button>
        </div>

        {/* Mobile sticky submit */}
        <div className="show-mobile" style={{ marginTop: 24 }}>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ width: '100%', height: 56, borderRadius: 999, background: '#0f172a', border: 'none', color: '#fff', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}
          >
            {isSubmitting ? 'Létrehozás...' : 'Projekt indítása'}
          </button>
        </div>
      </form>
    </div>
  );
}
