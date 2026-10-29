'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Modal from './Modal';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate } from '@/lib/constants';
import {
  Phone, Mail, MapPin, Building2, Hash, Percent, ShieldCheck, Share2,
  Edit3, Trash2, FileText, FolderKanban, ClipboardList,
  AlertCircle, Loader2, CheckCircle2, AlertTriangle, ExternalLink,
} from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';

function Avatar({ name }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--accent-light)', border: '2px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--accent)' }}>
      {initials}
    </div>
  );
}

export default function ClientDetailModal({ clientId, onClose, onDeleted }) {
  const {
    clients, quotes, quoteEntries, projects, invoices, surveys,
    updateClient, deleteClient, collectives,
  } = useApp();

  const client = clients.find(c => c.id === clientId);

  const [activeTab, setActiveTab] = useState('quotes');
  const [editMode, setEditMode]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  // Edit form state — initialised from current client
  const [formName,        setFormName]        = useState('');
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formTaxNumber,   setFormTaxNumber]   = useState('');
  const [formAddress,     setFormAddress]     = useState('');
  const [formPhone,       setFormPhone]       = useState('');
  const [formEmail,       setFormEmail]       = useState('');
  const [formNotes,       setFormNotes]       = useState('');
  const [formDiscount,    setFormDiscount]    = useState('0');
  const [formShares,      setFormShares]      = useState([]);
  const [formSharesInit,  setFormSharesInit]  = useState([]);
  const [formSharesGdpr,  setFormSharesGdpr]  = useState(false);

  if (!client) return null;

  // ── Computed data ────────────────────────────────────────────────────────
  const clientQuotes   = quotes.filter(q => q.client_id === client.id);
  const quoteProjectIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
  const clientProjects = projects.filter(p => p.client_id === client.id || quoteProjectIds.has(p.id));
  const clientSurveys  = surveys.filter(s => s.client_id === client.id);

  const totalQuoted = clientQuotes.reduce((sum, q) => {
    return sum + quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  }, 0);
  const totalInvoiced = clientProjects.reduce((sum, p) => {
    return sum + invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  }, 0);

  const ownedCollectives = collectives.filter(c => c.role === 'owner' || c.role === 'admin');
  const hasNewShares = formShares.some(id => !formSharesInit.includes(id));
  const shareCount   = client.client_collective_shares?.length || 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openEdit = () => {
    const existing = client.client_collective_shares?.map(s => s.collective_id) || [];
    setFormName(client.name);
    setFormCompanyName(client.company_name || '');
    setFormTaxNumber(client.tax_number || '');
    setFormAddress(client.address || '');
    setFormPhone(client.phone || '');
    setFormEmail(client.email || '');
    setFormNotes(client.notes || '');
    setFormDiscount((client.discount_percent || 0).toString());
    setFormShares(existing);
    setFormSharesInit(existing);
    setFormSharesGdpr(false);
    setFormError('');
    setEditMode(true);
  };

  const handleSave = async () => {
    if (!formName.trim()) { setFormError('A név megadása kötelező!'); return; }
    if (hasNewShares && !formSharesGdpr) {
      setFormError('Kérjük erősítse meg az ügyfél hozzájárulását az adatok megosztásához!');
      return;
    }
    setSaving(true); setFormError('');
    try {
      await updateClient(client.id, {
        name:           formName.trim(),
        company_name:   formCompanyName.trim() || null,
        tax_number:     formTaxNumber.trim()   || null,
        address:        formAddress.trim(),
        phone:          formPhone.trim(),
        email:          formEmail.trim(),
        notes:          formNotes.trim(),
        discount_percent: parseFloat(formDiscount) || 0,
        collectiveShares:   formShares,
        sharesGdprConfirmed: !hasNewShares || formSharesGdpr,
      });
      setEditMode(false);
    } catch (err) {
      setFormError(err.message || 'Hiba a mentéskor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteClient(client.id);
      onDeleted();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const toggleShare = (cid) => {
    setFormShares(prev => prev.includes(cid) ? prev.filter(id => id !== cid) : [...prev, cid]);
    setFormSharesGdpr(false);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'quotes',    label: 'Ajánlatok',   count: clientQuotes.length,   icon: <FileText size={13} /> },
    { key: 'projects',  label: 'Projektek',   count: clientProjects.length, icon: <FolderKanban size={13} /> },
    { key: 'surveys',   label: 'Felmérések',  count: clientSurveys.length,  icon: <ClipboardList size={13} /> },
  ];

  return (
    <Modal isOpen onClose={onClose} maxWidth="660px" title={editMode ? 'Ügyfél szerkesztése' : null}>

      {/* ── View mode ── */}
      {!editMode && (
        <>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', marginBottom: '1rem' }}>
            <Avatar name={client.name} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>{client.name}</h2>
                {client.discount_percent > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                    <Percent size={10} /> {client.discount_percent}%
                  </span>
                )}
                {client.gdpr_consented_at && (
                  <span title={`GDPR: ${new Date(client.gdpr_consented_at).toLocaleDateString('hu-HU')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid var(--accent-border)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                    <ShieldCheck size={10} /> GDPR
                  </span>
                )}
                {shareCount > 0 && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem', fontWeight: 700, background: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                    <Share2 size={10} /> {shareCount} kollektíva
                  </span>
                )}
              </div>
              {(client.company_name || client.tax_number) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, marginTop: '0.2rem' }}>
                  {client.company_name && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Building2 size={12} /> {client.company_name}</span>}
                  {client.tax_number   && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Hash size={12} /> {client.tax_number}</span>}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={openEdit} title="Szerkesztés">
                <Edit3 size={13} />
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)} title="Törlés">
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {/* Contact info */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)' }}>
            {client.phone && (
              <a href={`tel:${client.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)', textDecoration: 'none' }}>
                <Phone size={14} color="var(--accent)" /> {client.phone}
              </a>
            )}
            {client.email && (
              <a href={`mailto:${client.email}`} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--accent)', textDecoration: 'none' }}>
                <Mail size={14} color="var(--accent)" /> {client.email}
              </a>
            )}
            {client.address && (
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                <MapPin size={14} color="var(--accent)" /> {client.address}
              </span>
            )}
            {!client.phone && !client.email && !client.address && (
              <span style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>Nincs elérhetőség megadva</span>
            )}
          </div>

          {client.notes && (
            <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1rem', padding: '0.65rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--border-subtle)' }}>
              {client.notes}
            </p>
          )}

          {/* Financial summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warning-text)', marginBottom: '0.2rem' }}>Összes ajánlat</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatHUF(totalQuoted)}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{clientQuotes.length} ajánlat</div>
            </div>
            <div style={{ padding: '0.75rem 1rem', background: 'var(--success-bg)', border: '1px solid var(--success-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--success-text)', marginBottom: '0.2rem' }}>Számlázott</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{formatHUF(totalInvoiced)}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{clientProjects.length} projekt</div>
            </div>
          </div>

          {/* Delete confirm inline */}
          {confirmDelete && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', marginBottom: '1rem' }}>
              <AlertTriangle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: '0.1rem' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--danger-text)', marginBottom: '0.5rem' }}>Biztosan törli „{client.name}" ügyfelet?</div>
                <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setConfirmDelete(false)} disabled={deleting}>Mégse</button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                    {deleting ? <><Loader2 size={13} className="animate-spin" /> Törlés...</> : <><Trash2 size={13} /> Törlés</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.25rem', borderBottom: '2px solid var(--border-subtle)', marginBottom: '1rem', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  padding: '0.5rem 0.85rem', fontSize: '0.8rem', fontWeight: 700,
                  background: 'transparent', border: 'none', cursor: 'pointer', flexShrink: 0,
                  borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                  color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                  marginBottom: '-2px', transition: 'color 0.15s',
                }}
              >
                {t.icon} {t.label}
                <span style={{ fontSize: '0.7rem', fontWeight: 700, background: activeTab === t.key ? 'var(--accent-light)' : 'var(--bg-subtle)', color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)', padding: '0.05rem 0.4rem', borderRadius: 'var(--radius-pill)' }}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>

          {/* Tab: Quotes */}
          {activeTab === 'quotes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {clientQuotes.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1.5rem' }}>Nincs ajánlat ehhez az ügyfélhez.</p>
              ) : clientQuotes.map(q => {
                const total = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
                return (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{formatDate(q.created_at)}{q.location && ` · ${q.location}`}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem' }}>{formatHUF(total)}</span>
                      <StatusBadge status={q.status} />
                      <Link href={`/ajanlatok/${q.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab: Projects */}
          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {clientProjects.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1.5rem' }}>Nincs projekt ehhez az ügyfélhez.</p>
              ) : clientProjects.map(p => {
                const pCost = invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
                return (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      {p.description && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.875rem' }}>{formatHUF(pCost)}</span>
                      <Link href={`/projektek/${p.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={onClose}>
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tab: Surveys */}
          {activeTab === 'surveys' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {clientSurveys.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.825rem', padding: '1.5rem' }}>Nincs felmérés ehhez az ügyfélhez.</p>
              ) : clientSurveys.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{s.date ? formatDate(s.date) : formatDate(s.created_at)}{s.location && ` · ${s.location}`}</div>
                  </div>
                  <Link href={`/felmeres/${s.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem', flexShrink: 0 }} onClick={onClose}>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Edit mode ── */}
      {editMode && (
        <>
          {formError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '0.85rem' }}>
              <AlertCircle size={15} /> {formError}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Kapcsolattartó neve *</label>
            <input type="text" className="form-control" autoFocus value={formName} onChange={e => setFormName(e.target.value)} />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Cégnév</label>
              <input type="text" className="form-control" value={formCompanyName} onChange={e => setFormCompanyName(e.target.value)} placeholder="Pl. Fekete Kft." />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Adószám</label>
              <input type="text" className="form-control" value={formTaxNumber} onChange={e => setFormTaxNumber(e.target.value)} placeholder="12345678-1-01" />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Cím</label>
            <input type="text" className="form-control" value={formAddress} onChange={e => setFormAddress(e.target.value)} />
          </div>
          <div className="grid-2col">
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Telefon</label>
              <input type="tel" className="form-control" value={formPhone} onChange={e => setFormPhone(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">E-mail</label>
              <input type="email" className="form-control" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: '0.75rem' }}>
            <label className="form-label">Hűségkedvezmény (%)</label>
            <input type="number" min="0" max="100" step="0.5" className="form-control" value={formDiscount} onChange={e => setFormDiscount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Megjegyzés</label>
            <textarea rows={2} className="form-control" value={formNotes} onChange={e => setFormNotes(e.target.value)} />
          </div>

          {ownedCollectives.length > 0 && (
            <div style={{ marginTop: '0.5rem', marginBottom: '0.75rem', padding: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Share2 size={14} /> Megosztás Kollektívákkal
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {ownedCollectives.map(col => (
                  <label key={col.collective_id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.825rem', color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={formShares.includes(col.collective_id)} onChange={() => toggleShare(col.collective_id)} style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }} />
                    {col.name}
                  </label>
                ))}
              </div>
              {hasNewShares && (
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.65rem', borderRadius: 'var(--radius-md)', background: '#fff', border: `1px solid ${formSharesGdpr ? 'var(--success-border)' : 'var(--warning-border)'}`, cursor: 'pointer', marginTop: '0.65rem' }}>
                  <input type="checkbox" checked={formSharesGdpr} onChange={e => setFormSharesGdpr(e.target.checked)} style={{ marginTop: '0.15rem', flexShrink: 0, accentColor: 'var(--accent)', width: 15, height: 15 }} />
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    Megerősítem, hogy az ügyfél hozzájárult személyes adatainak megosztásához a Kollektíva vállalkozóival. <span style={{ color: 'var(--danger-text)', fontWeight: 700 }}>*</span>
                  </span>
                </label>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditMode(false)} disabled={saving}>Mégse</button>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving || (hasNewShares && !formSharesGdpr)}>
              {saving ? <><Loader2 size={13} className="animate-spin" /> Mentés...</> : <><CheckCircle2 size={13} /> Mentés</>}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}
