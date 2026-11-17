'use client';

/**
 * C1 — Client list (mobile pods view)
 * Rose header (#B8456B), parchment body, pod-stack layout.
 */

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import useOnline from '@/hooks/useOnline';
import { AlertModal, ConfirmModal } from '@/components/Modal';

import PageHeader from '@/components/mobile/pods/PageHeader';
import Dock from '@/components/mobile/pods/Dock';

const CLIENTS_BG = '#B8456B';
const CLIENTS_DEEP = '#2A0F1A';
const CLIENTS_TINT = '#F8E4EC';
const CLIENTS_INK = '#8A2B4C';
const CARD_SHADOW = 'inset 0 1px 0 #fff, 0 16px 26px -14px rgba(0,0,0,0.70), 0 3px 6px -2px rgba(0,0,0,0.30)';

// Deterministic avatar colour per client id
const AVATAR_COLORS = [
  ['#F8E4EC', '#8A2B4C'],
  ['#EDE7FB', '#4A2796'],
  ['#D9F2EE', '#0A5C53'],
  ['#E3E7EE', '#263248'],
  ['#FFF1E0', '#8A4200'],
];
function avatarColor(id = '') {
  const h = [...id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 0);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function initials(name = '') {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function ClientSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ borderRadius: 26, background: 'rgba(255,255,255,0.08)', height: 88, animation: 'pulse 1.4s ease-in-out infinite' }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }`}</style>
    </div>
  );
}

function Badge({ bg, fg, children }) {
  return (
    <span style={{ height: 24, padding: '0 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4, background: bg, color: fg, flexShrink: 0, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

function ClientCard({ client, quotes, projects, isMine, t, onTap }) {
  const clientQuotes = useMemo(() => quotes.filter(q => q.client_id === client.id), [quotes, client.id]);
  const projectSet = useMemo(() => {
    const qIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
    return projects.filter(p => p.client_id === client.id || qIds.has(p.id));
  }, [projects, clientQuotes, client.id]);
  const shareCount = client.client_collective_shares?.length || 0;
  const [avBg, avFg] = avatarColor(client.id);

  return (
    <article
      style={{ borderRadius: 26, background: '#fff', boxShadow: CARD_SHADOW, overflow: 'hidden' }}
    >
      <button
        aria-label={`${client.name}`}
        onClick={onTap}
        style={{ width: '100%', boxSizing: 'border-box', padding: '14px 16px 12px', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}
      >
        {/* Avatar */}
        <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: avBg, color: avFg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
          {initials(client.name)}
        </span>
        {/* Text */}
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--m-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {client.name}
          </span>
          {client.company_name && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {client.company_name}
            </span>
          )}
          {client.phone && !client.company_name && (
            <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>{client.phone}</span>
          )}
          {/* Badges row */}
          <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 4 }}>
            {isMine && clientQuotes.length > 0 && (
              <Badge bg="#FFF1E0" fg="#8A4200">{t('quotesCount', { count: clientQuotes.length })}</Badge>
            )}
            {isMine && projectSet.length > 0 && (
              <Badge bg="#E7F4EC" fg="#14532D">{t('projectsCount', { count: projectSet.length })}</Badge>
            )}
            {isMine && client.discount_percent > 0 && (
              <Badge bg={CLIENTS_TINT} fg={CLIENTS_INK}>{client.discount_percent}%</Badge>
            )}
            {isMine && shareCount > 0 && (
              <Badge bg="#EDE7FB" fg="#4A2796">{t('collectivesCount', { count: shareCount })}</Badge>
            )}
            {!isMine && (client._shared_via || []).map(sv => (
              <Badge key={sv.collective_id} bg="#EDE7FB" fg="#4A2796">{sv.collective_name || 'Kollektíva'}</Badge>
            ))}
          </span>
        </span>
        {/* More icon */}
        <span style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 10, background: '#F1F1F3', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4 }} aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A5F68" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h.01M12 12h.01M19 12h.01" /></svg>
        </span>
      </button>
    </article>
  );
}

function SheetRow({ icon: d, label, onClick, danger, sub }) {
  return (
    <button onClick={onClick} style={{ width: '100%', minHeight: 60, boxSizing: 'border-box', padding: '10px 14px', border: 0, borderRadius: 22, background: '#fff', color: danger ? '#B71C1C' : 'var(--m-ink)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 700, boxShadow: '0 1px 0 rgba(14,17,22,.05),0 12px 22px -18px rgba(14,17,22,.35)', cursor: 'pointer' }}>
      <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 15, background: danger ? '#FDECEC' : '#F1F1F3', color: danger ? '#B71C1C' : '#1A1D23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d={d} /></svg>
      </span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
        {label}
        {sub && <span style={{ fontSize: 12, fontWeight: 500, color: '#5A5F68', marginTop: 1 }}>{sub}</span>}
      </span>
    </button>
  );
}

export default function ClientsListMobile() {
  const t = useTranslations('clients');
  const router = useRouter();
  const isOnline = useOnline();
  const { loading, dataReady, clients = [], quotes = [], projects = [], isDemoMode, deleteClient, currentUser } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = useCallback((path) => `${navPrefix}${path}`, [navPrefix]);

  const [seg, setSeg] = useState('mine');
  const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(null); // { client, isMine }
  const [delSheet, setDelSheet] = useState(null); // client
  const [deleting, setDeleting] = useState(false);
  const [alertModal, setAlertModal] = useState(null);
  const [copyToast, setCopyToast] = useState(false);

  const myClients = useMemo(() => clients.filter(c => !c._shared_via?.length), [clients]);
  const sharedClients = useMemo(() => clients.filter(c => c._shared_via?.length > 0), [clients]);

  const filteredMine = useMemo(() => {
    if (!q) return myClients;
    const lq = q.toLowerCase();
    return myClients.filter(c =>
      c.name.toLowerCase().includes(lq) ||
      (c.email || '').toLowerCase().includes(lq) ||
      (c.phone || '').includes(lq)
    );
  }, [myClients, q]);

  const filteredShared = useMemo(() => {
    if (!q) return sharedClients;
    const lq = q.toLowerCase();
    return sharedClients.filter(c => c.name.toLowerCase().includes(lq));
  }, [sharedClients, q]);

  const list = seg === 'mine' ? filteredMine : filteredShared;

  const handleDelete = async () => {
    if (!delSheet) return;
    setDeleting(true);
    try {
      await deleteClient(delSheet.id);
      setDelSheet(null);
      setSheet(null);
    } catch (err) {
      setAlertModal({ message: err.message || t('createError') });
      setDelSheet(null);
    } finally {
      setDeleting(false);
    }
  };

  const copyPortalLink = useCallback((client) => {
    if (!client.email) return;
    const url = `${window.location.origin}/portal?email=${encodeURIComponent(client.email)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2000);
    });
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);

  if (!dataReady) {
    return (
      <div className="pod-screen-dark" style={{ background: CLIENTS_DEEP, minHeight: '100dvh' }}>
        <div style={{ background: CLIENTS_BG, padding: '64px 16px 24px', borderRadius: '0 0 32px 32px' }}>
          <div style={{ height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.14)', marginBottom: 10, width: '50%' }} />
          <div style={{ height: 20, borderRadius: 6, background: 'rgba(255,255,255,0.1)', width: '70%' }} />
        </div>
        <div style={{ padding: '20px 16px' }}>
          <ClientSkeleton />
        </div>
      </div>
    );
  }

  const isScrim = !!sheet || !!delSheet;

  return (
    <div className="pod-screen-dark" style={{ background: CLIENTS_DEEP, minHeight: '100dvh', position: 'relative' }}>

      {/* ── Offline banner ── */}
      {!isOnline && (
        <div role="alert" style={{ position: 'fixed', top: 56, left: 0, right: 0, zIndex: 50, background: '#B71C1C', color: '#fff', padding: '10px 16px', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
          {t('offlineBanner')}
        </div>
      )}

      {/* ── Header ── */}
      <header style={{ background: CLIENTS_BG, padding: '64px 16px 20px', borderRadius: '0 0 32px 32px', position: 'relative', overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', right: -90, top: -120, width: 300, height: 300, borderRadius: 150, background: 'rgba(255,255,255,0.08)' }} />
        {/* Top row: back + new */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <button onClick={() => router.back()} aria-label={t('back')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden><path d="M15 6l-6 6 6 6" /></svg>
          </button>
          <button onClick={() => router.push(p('/ugyfelek/uj'))} aria-label={t('new')} style={{ width: 48, height: 48, borderRadius: 24, border: 0, background: 'rgba(255,255,255,0.18)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M12 5v14M5 12h14" /></svg>
          </button>
        </div>
        {/* Title */}
        <span style={{ position: 'relative', fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.78)', display: 'block', marginBottom: 4 }}>
          {t('pageTitle')}
        </span>
        <h1 style={{ position: 'relative', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.1, color: '#fff' }}>
          {t('pageTitle')}
        </h1>
        {/* Search */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} aria-hidden><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.35-4.35" /></svg>
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('mobileSearchPlaceholder')}
            aria-label={t('mobileSearchPlaceholder')}
            style={{ width: '100%', boxSizing: 'border-box', height: 44, borderRadius: 22, border: 0, background: 'rgba(255,255,255,0.14)', color: '#fff', paddingLeft: 40, paddingRight: 16, fontSize: 15, fontWeight: 500, outline: 'none' }}
          />
        </div>
        {/* Segment */}
        <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.12)', padding: 4, borderRadius: 28, marginTop: 10 }}>
          {['mine', 'shared'].map((s) => (
            <button key={s} onClick={() => setSeg(s)} aria-pressed={seg === s} style={{ flex: 1, height: 44, border: 0, borderRadius: 22, background: seg === s ? '#fff' : 'transparent', color: seg === s ? CLIENTS_INK : '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'background .15s' }}>
              {s === 'mine' ? t('myClients', { count: myClients.length }) : t('sharedClients', { count: sharedClients.length })}
            </button>
          ))}
        </div>
      </header>

      {/* ── List body ── */}
      <div style={{ padding: '16px 16px 180px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'rgba(255,255,255,0.65)', fontSize: 15, fontWeight: 600 }}>
            {q ? t('noResults') : seg === 'mine' ? t('emptyMine') : t('sharedClients', { count: 0 })}
            {!q && seg === 'mine' && (
              <div style={{ marginTop: 16 }}>
                <button onClick={() => router.push(p('/ugyfelek/uj'))} style={{ height: 52, padding: '0 24px', borderRadius: 26, border: 0, background: CLIENTS_BG, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
                  {t('new')}
                </button>
              </div>
            )}
          </div>
        ) : (
          list.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              quotes={quotes}
              projects={projects}
              isMine={seg === 'mine'}
              t={t}
              onTap={() => setSheet({ client, isMine: seg === 'mine' })}
            />
          ))
        )}
      </div>

      {/* ── Dock ── */}
      <Dock />

      {/* ── Action sheet scrim ── */}
      {isScrim && (
        <button className="pod-sheet" onClick={closeSheet} aria-label={t('close')} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', border: 0, cursor: 'default' }} />
      )}

      {/* ── Client action sheet ── */}
      {sheet && !delSheet && (
        <div className="pod-sheet" role="dialog" aria-label={sheet.client.name} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#EFEDE6', borderRadius: '28px 28px 0 0', padding: '12px 12px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: '0 4px 4px', fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{sheet.client.name}</p>
          <SheetRow
            icon="M5 12h14M13 6l6 6-6 6"
            label={t('detailsBtn')}
            onClick={() => { closeSheet(); router.push(p(`/ugyfelek/${sheet.client.id}`)); }}
          />
          {sheet.isMine && (
            <SheetRow
              icon="M4 20l4-1L19 8l-3-3L5 16zM14 7l3 3"
              label={t('editTitle')}
              onClick={() => { closeSheet(); router.push(p(`/ugyfelek/uj?edit=${sheet.client.id}`)); }}
            />
          )}
          <SheetRow
            icon="M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1"
            label={t('copyPortalLink')}
            sub={sheet.client.email ? sheet.client.email : t('noEmailForPortal')}
            onClick={() => { if (sheet.client.email) { copyPortalLink(sheet.client); closeSheet(); } }}
          />
          {sheet.isMine && (
            <SheetRow
              icon="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"
              label={t('deleteTitle')}
              danger
              onClick={() => { setDelSheet(sheet.client); setSheet(null); }}
            />
          )}
        </div>
      )}

      {/* ── Delete confirm sheet ── */}
      {delSheet && (
        <div className="pod-sheet" role="dialog" aria-label={t('deleteConfirmTitle')} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: '#EFEDE6', borderRadius: '28px 28px 0 0', padding: '12px 12px 32px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span aria-hidden style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 8px', display: 'block' }} />
          <p style={{ margin: '0 4px 4px', fontSize: 17, fontWeight: 700, color: 'var(--m-ink)' }}>{t('deleteConfirmTitle')}</p>
          <p style={{ margin: '0 4px 8px', fontSize: 15, fontWeight: 500, color: '#5A5F68', lineHeight: 1.45 }}>
            {t('deleteConfirmMessage', { name: delSheet.name })}
          </p>
          <button onClick={handleDelete} disabled={deleting} style={{ height: 60, border: 0, borderRadius: 30, background: '#B71C1C', color: '#fff', fontSize: 17, fontWeight: 700, cursor: deleting ? 'default' : 'pointer' }}>
            {deleting ? t('deleting') : t('deleteTitle')}
          </button>
          <button onClick={() => setDelSheet(null)} style={{ height: 60, border: 0, borderRadius: 30, background: '#EFEDE6', color: 'var(--m-ink)', fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>
            {t('cancel')}
          </button>
        </div>
      )}

      {/* ── Copy toast ── */}
      {copyToast && (
        <div role="status" style={{ position: 'fixed', zIndex: 60, top: 18, left: 16, right: 16, padding: '14px 16px', borderRadius: 22, background: '#14532D', color: '#fff', fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" aria-hidden><path d="M5 12l5 5 9-10" /></svg>
          {t('copiedBtn')}
        </div>
      )}

      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />
    </div>
  );
}
