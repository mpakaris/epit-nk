'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { formatHUF, formatDate, QUOTE_STATUSES, QUOTE_ENTRY_TYPES } from '@/lib/constants';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import SectionMediaGrid from '@/components/SectionMediaGrid';
import {
  ArrowLeft, MapPin, Calendar, Coins, Plus, Trash2, User,
  CheckCircle2, XCircle, Send, FolderKanban, AlertCircle,
  Edit3, Loader2, Package, Hammer, Wrench, Truck, MoreHorizontal, Ruler, Home,
  X, Copy, ExternalLink
} from 'lucide-react';

const TYPE_ICONS = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
const TYPE_COLORS = {
  material:  { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  labour:    { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
  transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
  other:     { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' }
};
const STATUS_COLORS = {
  draft:    { bg: 'var(--bg-subtle)',    color: 'var(--text-secondary)', border: 'var(--border-subtle)' },
  sent:     { bg: 'var(--warning-bg)',   color: 'var(--warning-text)',   border: 'var(--warning-border)' },
  accepted: { bg: 'var(--success-bg)',   color: 'var(--success-text)',   border: 'var(--success-border)' },
  rejected: { bg: 'var(--danger-bg)',    color: 'var(--danger-text)',    border: 'var(--danger-border)' }
};


// ── Entry row ──────────────────────────────────────────────────────────────────
function EntryRow({ entry, idx, users, currentUser, isLocked, onEdit, onDelete }) {
  const TYPE_ICONS_LOCAL = { material: Package, labour: Hammer, equipment: Wrench, transport: Truck, other: MoreHorizontal };
  const TYPE_COLORS_LOCAL = { material: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' }, labour: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' }, equipment: { bg: '#fffbeb', color: '#b45309', border: '#fde68a' }, transport: { bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' }, other: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' } };
  const Icon = TYPE_ICONS_LOCAL[entry.entry_type] || MoreHorizontal;
  const tc = TYPE_COLORS_LOCAL[entry.entry_type] || TYPE_COLORS_LOCAL.other;
  const contributor = users.find(u => u.id === entry.user_id);
  const canEdit = entry.user_id === currentUser?.id || (currentUser?.role === 'admin' || currentUser?.role === 'superadmin');
  const useQty = entry.entry_type === 'material' || entry.entry_type === 'labour';
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem', borderTop: idx > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
      <div style={{ padding: '0.35rem', borderRadius: 'var(--radius-sm)', background: tc.bg, flexShrink: 0 }}><Icon size={14} color={tc.color} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.15rem', fontSize: '0.9rem' }}>{entry.work_description}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', background: tc.bg, color: tc.color, fontWeight: 700, fontSize: '0.68rem', border: `1px solid ${tc.border}` }}>{QUOTE_ENTRY_TYPES.find(t => t.id === entry.entry_type)?.label}</span>
          {useQty && entry.quantity != null && <span>{entry.quantity} {entry.unit || 'h'}{entry.unit_price ? ` × ${formatHUF(entry.unit_price)}` : ''}</span>}
          {contributor && <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><User size={10} />{contributor.display_name}</span>}
          {entry.notes && <span style={{ fontStyle: 'italic' }}>{entry.notes}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(entry.amount_huf)}</span>
        {canEdit && !isLocked && (
          <>
            <button type="button" onClick={() => onEdit(entry)} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.45rem' }}><Edit3 size={12} /></button>
            <button type="button" onClick={() => onDelete(entry.id)} className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.45rem' }}><Trash2 size={12} /></button>
          </>
        )}
      </div>
    </div>
  );
}


export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const {
    currentUser, isAdmin, loading, dataReady, quotes, quoteEntries, quoteSections, clients, users, projects, surveys,
    updateQuoteStatus, deleteQuote,
    convertQuoteToProject,
    fetchSurveyMedia,
  } = useApp();

  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertMembers, setConvertMembers] = useState([]);
  const [isConverting, setIsConverting] = useState(false);

  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [copied, setCopied] = useState(false);

  const quote = quotes.find(q => q.id === id);

  useEffect(() => {
    if (quote?.survey_id) fetchSurveyMedia(quote.survey_id).catch(() => {});
  }, [quote?.survey_id]);

  if (loading || !dataReady) return <div className="container" style={{ paddingTop: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Betöltés...</div>;

  if (!quote) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>Az ajánlat nem található</h2>
        <Link href="/ajanlatok" className="btn btn-secondary mt-4"><ArrowLeft size={16} /> Vissza</Link>
      </div>
    );
  }

  const client = clients.find(c => c.id === quote.client_id);
  const entries = quoteEntries.filter(e => e.quote_id === id);
  const netTotal  = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
  const taxRate   = Number(quote.tax_percent ?? 27);
  const taxAmount = Math.round(netTotal * taxRate / 100);
  const grossTotal = netTotal + taxAmount;
  const canModify = quote.created_by === currentUser?.id || isAdmin;
  const isLocked = quote.status === 'accepted' || quote.status === 'rejected';
  const sc = STATUS_COLORS[quote.status] || STATUS_COLORS.draft;
  const linkedProject = quote.project_id ? projects.find(p => p.id === quote.project_id) : null;
  const linkedSurvey = quote.survey_id ? surveys.find(s => s.id === quote.survey_id) : null;
  const sections = quoteSections.filter(s => s.quote_id === id).sort((a, b) => a.sort_order - b.sort_order || new Date(a.created_at) - new Date(b.created_at));
  const memberUsers = users;

  // ---- Status actions ----
  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'accepted') {
      setConvertMembers(memberUsers.map(u => u.id));
      setShowConvertModal(true);
      return;
    }
    try { await updateQuoteStatus(id, newStatus); }
    catch (err) { setAlertModal({ message: err.message }); }
  };

  const handleConvert = async () => {
    setIsConverting(true);
    try {
      const proj = await convertQuoteToProject(id, convertMembers);
      setShowConvertModal(false);
      router.push(`/projektek/${proj.id}`);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setIsConverting(false);
    }
  };

  const handleDeleteQuote = () => {
    setConfirmModal({
      message: `Biztosan törölni kívánja „${quote.title}" ajánlatot?`,
      onConfirm: async () => {
        try { await deleteQuote(id); router.push('/ajanlatok'); }
        catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link href="/ajanlatok" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> Vissza az ajánlatokhoz
        </Link>
      </div>

      {/* Header row */}
      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
              <h1 className="page-title" style={{ marginBottom: 0 }}>{quote.title}</h1>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-pill)', background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                {QUOTE_STATUSES.find(s => s.id === quote.status)?.label}
              </span>
            </div>
            {quote.description && <p className="page-subtitle">{quote.description}</p>}
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {canModify && !isLocked && (
              <Link href={`/ajanlatok/${id}/szerkesztes`} className="btn btn-secondary btn-sm">
                <Edit3 size={14} /> Szerkesztés
              </Link>
            )}
            {canModify && (
              <button type="button" onClick={handleDeleteQuote} className="btn btn-danger btn-sm">
                <Trash2 size={14} /> Törlés
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status actions */}
      {canModify && !isLocked && (
        <div className="card mb-4" style={{ padding: '0.75rem 1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginRight: '0.25rem' }}>Státusz:</span>
            {quote.status === 'draft' && (
              <button type="button" onClick={() => handleStatusChange('sent')} className="btn btn-secondary btn-sm">
                <Send size={14} /> Kiküldve
              </button>
            )}
            {(quote.status === 'draft' || quote.status === 'sent') && (
              <>
                <button type="button" onClick={() => handleStatusChange('accepted')} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
                  <CheckCircle2 size={14} /> Elfogadva → Projektté
                </button>
                <button type="button" onClick={() => handleStatusChange('rejected')} className="btn btn-danger btn-sm">
                  <XCircle size={14} /> Elutasítva
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Client portal link — shown when quote is visible to client */}
      {quote.status !== 'draft' && client && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <ExternalLink size={15} color="var(--accent)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, flex: 1, minWidth: 0 }}>
            Az ajánlat látható az ügyfél portálon
          </span>
          <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => { const url = `${window.location.origin}/clients/${client.id}`; navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); }}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              {copied ? <><CheckCircle2 size={13} /> Másolva!</> : <><Copy size={13} /> Link másolása</>}
            </button>
            <Link href={`/clients/${client.id}`} target="_blank" className="btn btn-secondary btn-sm" style={{ fontSize: '0.78rem' }}>
              <ExternalLink size={13} /> Megnyitás
            </Link>
          </div>
        </div>
      )}

      {/* Meta */}
      <div className="card mb-4" style={{ padding: '1.1rem 1.25rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: '0.6rem 0.85rem', alignItems: 'center' }}>
          {client && (<>
            <User size={15} color="var(--accent)" />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <Link href={`/ugyfelek/${client.id}`} style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '0.9rem' }}>{client.name}</Link>
              {client.discount_percent > 0 && <span style={{ fontSize: '0.72rem', color: 'var(--warning-text)', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)' }}>{client.discount_percent}% kedv.</span>}
            </div>
          </>)}
          {quote.location && (<>
            <MapPin size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.location}</span>
          </>)}
          {quote.work_type && (<>
            <Wrench size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{quote.work_type}</span>
          </>)}
          <>
            <Calendar size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {quote.start_date ? formatDate(quote.start_date) : '—'} – {quote.end_date ? formatDate(quote.end_date) : '—'}
            </span>
          </>
          <>
            <Coins size={15} color="var(--text-muted)" />
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>ÁFA: <strong style={{ color: 'var(--text-primary)' }}>{taxRate}%</strong></span>
          </>
        </div>

        {(linkedSurvey || linkedProject) && <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: '0.85rem', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {linkedSurvey && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Ruler size={15} color="var(--accent)" />
              <span style={{ fontSize: '0.875rem', color: 'var(--accent)' }}>
                <Link href={`/felmeres/${linkedSurvey.id}`} style={{ fontWeight: 700, color: 'var(--accent)' }}>{linkedSurvey.title}</Link>
                {linkedSurvey.date && <span style={{ marginLeft: '0.4rem', fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.82rem' }}>{formatDate(linkedSurvey.date)}</span>}
              </span>
            </div>
          )}
          {linkedProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <FolderKanban size={15} color="var(--success)" />
              <Link href={`/projektek/${linkedProject.id}`} style={{ fontWeight: 700, color: 'var(--success-text)', fontSize: '0.875rem' }}>{linkedProject.name}</Link>
            </div>
          )}
        </div>}
      </div>

      {/* Shared members — read-only, manage in /szerkesztes */}
      {canModify && (quote.shared_with || []).length > 0 && (
        <div className="card mb-4" style={{ padding: '1rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
            Meghívott tagok
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {memberUsers.filter(u => (quote.shared_with || []).includes(u.id)).map(u => (
              <span key={u.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent)' }}>
                <User size={12} />{u.display_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Tételek ── */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Tételek ({entries.length})</h2>
      </div>

      {/* Totals summary */}
      {entries.length > 0 && (
        <div style={{ padding: '0.9rem 1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: taxRate > 0 ? '0.35rem' : 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nettó összeg:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem' }}>{formatHUF(netTotal)}</span>
          </div>
          {taxRate > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '0.875rem' }}>ÁFA ({taxRate}%):</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-secondary)' }}>{formatHUF(taxAmount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: taxRate > 0 ? '0.4rem' : 0, borderTop: taxRate > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Coins size={16} color="var(--accent)" /> Bruttó összesen:
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }}>{formatHUF(grossTotal)}</span>
          </div>
        </div>
      )}

      {/* ── Unified room-grouped view (same layout for ALL quotes) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>

        {/* Named room sections */}
        {sections.map(room => {
          const roomEntries = entries.filter(e => e.section_id === room.id || e.survey_entry_id === room.id);
          const roomTotal = roomEntries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
          return (
            <div key={room.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Home size={14} color="var(--accent)" />
                    <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{room.name}</span>
                    {room.size_m2 != null && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                        <Ruler size={11} />{room.size_m2} m²
                      </span>
                    )}
                  </div>
                  {room.description && (
                    <p style={{ margin: '0.2rem 0 0 1.4rem', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{room.description}</p>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {roomTotal > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatHUF(roomTotal)}</span>}
                </div>
              </div>
              {/* Entries — read-only, manage in /szerkesztes */}
              {roomEntries.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs tétel.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {roomEntries.map((entry, idx) => <EntryRow key={entry.id} entry={entry} idx={idx} users={users} currentUser={currentUser} isLocked={true} onEdit={null} onDelete={null} />)}
                </div>
              )}
              {/* Photos — read-only on detail page, manage in /szerkesztes */}
              {quote.survey_id && room.survey_entry_id && (
                <SectionMediaGrid surveyId={quote.survey_id} surveyEntryId={room.survey_entry_id} isLocked={true} />
              )}
            </div>
          );
        })}

        {/* General / ungrouped entries — always shown */}
        {(() => {
          const general = entries.filter(e => !e.section_id && !e.survey_entry_id);
          return (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'var(--bg-subtle)', borderBottom: general.length > 0 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Általános tételek</span>
                {general.length > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{formatHUF(general.reduce((s, e) => s + Number(e.amount_huf || 0), 0))}</span>}
              </div>
              {general.length === 0 ? (
                <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs általános tétel.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {general.map((entry, idx) => <EntryRow key={entry.id} entry={entry} idx={idx} users={users} currentUser={currentUser} isLocked={true} onEdit={null} onDelete={null} />)}
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* ===== CONVERT TO PROJECT MODAL ===== */}
      <Modal isOpen={showConvertModal} onClose={() => setShowConvertModal(false)} title="Projektté alakítás">
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
          Válassza ki a projekt tagjait. A cím és dátumok az ajánlatból kerülnek át.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {memberUsers.map(u => (
            <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', cursor: 'pointer', background: convertMembers.includes(u.id) ? 'var(--accent-light)' : '#fff' }}>
              <input type="checkbox" checked={convertMembers.includes(u.id)} onChange={e => setConvertMembers(prev => e.target.checked ? [...prev, u.id] : prev.filter(x => x !== u.id))} />
              <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{u.display_name}</span>
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowConvertModal(false)}>Mégse</button>
          <button type="button" onClick={handleConvert} disabled={isConverting || convertMembers.length === 0} className="btn btn-sm" style={{ background: 'var(--success)', color: '#fff', border: 'none' }}>
            {isConverting ? <><Loader2 size={14} className="animate-spin" />Átalakítás...</> : <><FolderKanban size={14} />Projekt létrehozása</>}
          </button>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Törlés megerősítése" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
