'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useApp } from '@/context/AppContext';
import { formatDate } from '@/lib/constants';
import { isEffectivePremium } from '@/lib/subscriptionLimits';
import Modal from '@/components/Modal';
import UpgradeModal from '@/components/UpgradeModal';
import CollectiveSubscriptionModal from '@/components/CollectiveSubscriptionModal';
import { WorkspaceNotActivatedBanner, WorkspaceFrozenBanner } from '@/components/desktop/WorkspaceStatusBanners';
import TransferToCollectiveModal from '@/components/TransferToCollectiveModal';
import SurveyMediaModal from '@/components/survey/SurveyMediaModal';
import SurveyDrawingsModal from '@/components/survey/SurveyDrawingsModal';
import WorkspacePodStack from '@/components/desktop/WorkspacePodStack';
import { Search, Plus, Trash2, X, ArrowRightLeft, Camera, Edit3, MoreHorizontal, Lock } from 'lucide-react';

const GRID = '20px 2.4fr 1.8fr 1.4fr 44px';

function fullDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
}

function entryArea(entry) {
  const w = Number(entry.width_m), l = Number(entry.length_m);
  if (w > 0 && l > 0) return w * l;
  if (entry.size_m2) return Number(entry.size_m2);
  return 0;
}

function fmtArea(m2) {
  return `${m2.toFixed(1).replace('.', ',')} m²`;
}

export default function SurveyListDesktop() {
  const t = useTranslations('surveys');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const {
    surveys, clients, quotes,
    deleteSurvey, isDemoMode, currentUser,
    contextSwitching, activeCollectiveId, collectives,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';
  const p = (path) => `${navPrefix}${path}`;

  const activeColl = (collectives || []).find(c => c.collective_id === activeCollectiveId);

  const atCreateLimit = !activeCollectiveId && !isEffectivePremium(currentUser || {}) && (surveys || []).length >= 1;

  const [search, setSearch]           = useState('');
  const [filter, setFilter]           = useState('all');
  const [selectedId, setSelectedId]   = useState(null);
  const [sideEntries, setSideEntries] = useState([]);
  const [sideItems, setSideItems]     = useState([]);
  const [loadedForId, setLoadedForId] = useState(null);
  const [deleteOpen, setDeleteOpen]       = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [transferOpen, setTransferOpen]   = useState(false);
  const [mediaOpen,  setMediaOpen]        = useState(false);
  const [drawingsOpen, setDrawingsOpen]   = useState(false);
  const [sidePhotos,   setSidePhotos]     = useState([]);
  const [sideDrawings, setSideDrawings]   = useState([]);
  const [upgradeModal, setUpgradeModal]         = useState(null);
  const [collectiveModal, setCollectiveModal]   = useState(false);

  const isFrozen = activeColl?.status === 'frozen';

  const allSurveys = useMemo(() => surveys || [], [surveys]);

  const counts = useMemo(() => ({
    all:      allSurveys.length,
    noClient: allSurveys.filter(s => !s.client_id).length,
    hasQuote: allSurveys.filter(s => (quotes || []).some(q => q.survey_id === s.id && !q.deleted_at)).length,
    archived: allSurveys.filter(s => !!s.archived_at).length,
  }), [allSurveys, quotes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSurveys.filter(s => {
      const client = (clients || []).find(c => c.id === s.client_id);
      const matchQ = !q ||
        s.title?.toLowerCase().includes(q) ||
        client?.name?.toLowerCase().includes(q) ||
        s.location?.toLowerCase().includes(q);
      const matchF =
        filter === 'all'      ? true
        : filter === 'noClient' ? !s.client_id
        : filter === 'hasQuote' ? (quotes || []).some(q2 => q2.survey_id === s.id && !q2.deleted_at)
        : filter === 'archived' ? !!s.archived_at
        : true;
      return matchQ && matchF;
    });
  }, [allSurveys, search, filter, clients, quotes]);

  const selectedSurvey = allSurveys.find(s => s.id === selectedId) || null;
  const selectedClient = selectedSurvey
    ? (clients || []).find(c => c.id === selectedSurvey.client_id)
    : null;

  const isLoadingEntries = !!selectedId && selectedId !== loadedForId;

  // Lazy-load entries + items for the side panel
  useEffect(() => {
    if (!selectedId) return;
    setSideEntries([]);
    setSideItems([]);
    setSidePhotos([]);
    setSideDrawings([]);
    setLoadedForId(null);
    let cancelled = false;
    Promise.all([
      fetch(`/api/surveys/${selectedId}`),
      fetch(`/api/surveys/${selectedId}/items`),
    ])
      .then(async ([surveyRes, itemsRes]) => {
        const d = await surveyRes.json();
        const itemsData = itemsRes.ok ? await itemsRes.json() : { items: [] };
        if (!cancelled) {
          setSideEntries(d.entries || []);
          setSideItems(itemsData.items || []);
          setSidePhotos(d.photos || []);
          setSideDrawings((d.drawings || []).filter(dr => !dr.entry_id));
          setLoadedForId(selectedId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSideEntries([]);
          setSideItems([]);
          setLoadedForId(selectedId);
        }
      });
    return () => { cancelled = true; };
  }, [selectedId]);

  const totalArea = useMemo(() => sideEntries.reduce((s, e) => s + entryArea(e), 0), [sideEntries]);

  const handleDelete = async () => {
    if (!selectedSurvey) return;
    setDeleteLoading(true);
    try {
      await deleteSurvey(selectedSurvey.id, selectedSurvey);
      setSelectedId(null);
      setDeleteOpen(false);
    } finally {
      setDeleteLoading(false);
    }
  };

  const isOwner = (survey) =>
    survey.owner_id === currentUser?.id || survey.created_by === currentUser?.id;

  const canTransfer = selectedSurvey
    && isOwner(selectedSurvey)
    && !selectedSurvey.collective_id
    && !selectedSurvey.is_read_only
    && !isDemoMode;

  return (
    <div className="dk-page dk-mod-surveys">

      {/* ── Header ──────────────────────────────────────────────────────────────── */}
      <header className="dk-mh">
        <span className="dk-gl" aria-hidden="true" />
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="dk-kick">{t('desktop.kicker')}</span>
          <h1 className="dk-h1">{t('pageTitle')}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <label style={{ position: 'relative', display: 'block', width: 280 }}>
            <span style={{ position: 'absolute', left: 14, top: 12, color: '#5A5F68', display: 'flex', pointerEvents: 'none' }}>
              <Search size={20} aria-hidden="true" />
            </span>
            <input
              type="search"
              className="dk-input"
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 42, width: '100%', borderRadius: 23, height: 44 }}
            />
          </label>
          <button
            className="dk-btn dk-btn-w"
            onClick={() => isFrozen ? setCollectiveModal(true) : atCreateLimit ? setUpgradeModal({ docType: 'survey' }) : router.push(p('/felmeres/uj'))}
          >
            <Plus size={20} aria-hidden="true" />
            {t('new')}
          </button>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────────── */}
      <div className="dk-body" style={{ background: 'var(--dk-deep)', padding: '16px 32px 24px' }}>
        <WorkspacePodStack>
          {activeColl?.status === 'not_activated' && <WorkspaceNotActivatedBanner />}
          {activeColl?.status !== 'not_activated' && (
          <>
            {activeColl?.status === 'frozen' && <WorkspaceFrozenBanner isOwner={activeColl?.role === 'owner'} />}
            {/* Filter chips + count */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'all',      label: `${t('desktop.filterAll')} (${counts.all})` },
                  { key: 'noClient', label: `${t('desktop.filterNoClient')} (${counts.noClient})` },
                  { key: 'hasQuote', label: `${t('desktop.filterHasQuote')} (${counts.hasQuote})` },
                  { key: 'archived', label: `${t('desktop.filterArchive')} (${counts.archived})` },
                ].map(f => (
                  <button
                    key={f.key}
                    className="dk-chip"
                    onClick={() => setFilter(f.key)}
                    style={{
                      background: f.key === filter ? '#0A7F72' : '#F1F1F3',
                      color: f.key === filter ? '#fff' : '#0E1116',
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#5A5F68' }}>
                {t('desktop.shown', { shown: filtered.length, total: allSurveys.length })}
              </span>
            </div>

            {/* Two-panel layout */}
            <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

              {/* Table card */}
              <section className="dk-card" style={{ flex: '1.7', minWidth: 0, paddingBottom: 6, overflow: 'hidden' }}>
                <div className="dk-th" style={{ gridTemplateColumns: GRID }}>
                  <span />
                  <span>{t('desktop.colName')}</span>
                  <span>{t('desktop.colClient')}</span>
                  <span>{t('desktop.colUpdated')}</span>
                  <span />
                </div>

                {filtered.map(survey => {
                  const client = (clients || []).find(c => c.id === survey.client_id);
                  const isSelected = survey.id === selectedId;
                  return (
                    <div
                      key={survey.id}
                      className="dk-tr"
                      onClick={() => router.push(p(`/felmeres/${survey.id}`))}
                      style={{ gridTemplateColumns: GRID, background: isSelected ? '#D9F2EE' : 'transparent', cursor: 'pointer' }}
                    >
                      <span style={{ minWidth: 0, display: 'flex', alignItems: 'center' }}>
                        <span style={{ width: 12, height: 12, borderRadius: 6, background: '#0A7F72', flexShrink: 0 }} />
                      </span>
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {survey.is_read_only && <Lock size={13} style={{ flexShrink: 0, color: '#92400E', opacity: 0.8 }} aria-hidden="true" />}
                        <b>{survey.title}</b>
                      </span>
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {client?.name || '—'}
                      </span>
                      <span style={{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {fullDate(survey.updated_at || survey.created_at)}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedId(isSelected ? null : survey.id); }}
                          style={{ width: 32, height: 32, borderRadius: 16, border: 0, background: '#1E3A8A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <MoreHorizontal size={16} aria-hidden="true" />
                        </button>
                      </span>
                    </div>
                  );
                })}

                {filtered.length === 0 && (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: '#5A5F68', fontSize: 14, fontWeight: 600 }}>
                    {t('emptyTitleFiltered')}
                  </div>
                )}
              </section>

              {/* Side panel — only rendered when a survey is selected */}
              {selectedSurvey && (
                <aside
                  className="dk-card"
                  style={{ flexShrink: 0, width: 400, padding: 20, display: 'flex', flexDirection: 'column', gap: 14, alignSelf: 'flex-start' }}
                >
                  {/* Badge + close */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span className="dk-badge" style={{ background: '#D9F2EE', color: '#0A5C53' }}>
                      {t('desktop.panelBadge')}
                    </span>
                    <button
                      onClick={() => setSelectedId(null)}
                      aria-label={t('desktop.closePanel')}
                      style={{ width: 32, height: 32, border: 0, borderRadius: 16, background: '#F1F1F3', color: '#5A5F68', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  </div>

                  <span className="dk-n" style={{ fontSize: 26 }}>{selectedSurvey.title}</span>

                  <span className="dk-m">
                    {selectedClient
                      ? t('desktop.panelClientMeta', { client: selectedClient.name, date: formatDate(selectedSurvey.updated_at || selectedSurvey.created_at) })
                      : t('desktop.panelNoClient', { date: formatDate(selectedSurvey.updated_at || selectedSurvey.created_at) })}
                  </span>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: 10 }}>
                    {[
                      { label: t('desktop.panelArea'),  value: isLoadingEntries ? '…' : (totalArea > 0 ? fmtArea(totalArea) : '—') },
                      { label: t('desktop.panelRooms'), value: isLoadingEntries ? '…' : sideEntries.length },
                      { label: t('desktop.panelItems'), value: isLoadingEntries ? '…' : sideItems.length },
                    ].map(stat => (
                      <div key={stat.label} style={{ flex: 1, padding: 12, borderRadius: 18, background: '#F4F5F8' }}>
                        <span className="dk-m" style={{ fontSize: 13 }}>{stat.label}</span>
                        <br />
                        <b className="dk-n" style={{ fontSize: 22 }}>{stat.value}</b>
                      </div>
                    ))}
                  </div>

                  {/* Sections label */}
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: '#5A5F68' }}>
                    {t('desktop.panelRoomsLabel')}
                  </span>

                  {/* Sections list — max ~3 visible, scrollable */}
                  {isLoadingEntries ? (
                    <span style={{ fontSize: 13, color: '#8A8F98', fontWeight: 600 }}>{t('desktop.loadingRooms')}</span>
                  ) : sideEntries.length === 0 ? (
                    <span style={{ fontSize: 13, color: '#8A8F98', fontWeight: 600 }}>{t('desktop.noRooms')}</span>
                  ) : (
                    <div className="scroll-y-hidden" style={{ maxHeight: 142, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sideEntries.map(entry => {
                        const area = entryArea(entry);
                        const itemCount = sideItems.filter(i => i.entry_id === entry.id).length;
                        return (
                          <button
                            key={entry.id}
                            onClick={() => router.push(p(`/felmeres/${selectedSurvey.id}/helyiseg/${entry.id}`))}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 14, background: '#F4F5F8', fontSize: 14, fontWeight: 600, border: 0, cursor: 'pointer', textAlign: 'left', width: '100%' }}
                          >
                            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 8 }}>{entry.name}</span>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                              {area > 0 && <span style={{ fontSize: 13, color: '#5A5F68', fontWeight: 600 }}>{fmtArea(area)}</span>}
                              <span style={{ fontSize: 11, fontWeight: 700, background: '#1E3A8A', color: '#fff', borderRadius: 8, padding: '2px 7px' }}>
                                {itemCount}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}


                  {/* Gallery + Sketches */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="dk-btn dk-btn-l" onClick={() => setMediaOpen(true)} style={{ flex: 1, justifyContent: 'center' }}>
                      <Camera size={16} aria-hidden="true" />
                      {t('desktop.detailMediaTitle')}
                    </button>
                    <button className="dk-btn dk-btn-l" onClick={() => setDrawingsOpen(true)} style={{ flex: 1, justifyContent: 'center' }}>
                      <Edit3 size={16} aria-hidden="true" />
                      {t('desktop.detailDrawingsTitle')}
                    </button>
                  </div>

                  {/* Secondary actions */}
                  {(canTransfer || isOwner(selectedSurvey)) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      {canTransfer && (
                        <button
                          className="dk-btn dk-btn-l"
                          onClick={() => isEffectivePremium(currentUser || {}) ? setTransferOpen(true) : setUpgradeModal({ docType: 'survey' })}
                          style={{ flex: 1, justifyContent: 'center' }}
                        >
                          <ArrowRightLeft size={18} aria-hidden="true" />
                          {t('desktop.transferAction')}
                        </button>
                      )}
                      {isOwner(selectedSurvey) && !selectedSurvey?.is_seed && (
                        <button
                          className="dk-btn"
                          onClick={() => setDeleteOpen(true)}
                          style={{ flex: 1, justifyContent: 'center', background: '#FDECEC', color: '#B71C1C' }}
                        >
                          <Trash2 size={18} aria-hidden="true" />
                          {t('desktop.deleteAction')}
                        </button>
                      )}
                    </div>
                  )}
                </aside>
              )}
            </div>
          </>
        )}
        </WorkspacePodStack>
      </div>

      <Modal
        isOpen={deleteOpen}
        onClose={deleteLoading ? undefined : () => setDeleteOpen(false)}
        maxWidth="420px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 22, background: '#FDECEC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={20} color="#B71C1C" aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 20, fontWeight: 700, color: '#0E1116', letterSpacing: '-0.02em', marginBottom: 6 }}>
                {t('deleteConfirmTitle')}
              </div>
              <p style={{ fontSize: 14, color: '#5A5F68', lineHeight: 1.6, margin: 0 }}>
                {selectedSurvey ? t('deleteConfirmMessage', { title: selectedSurvey.title, extra: '' }) : ''}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="dk-btn dk-btn-l"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {t('cancelAction')}
            </button>
            <button
              className="dk-btn"
              onClick={handleDelete}
              disabled={deleteLoading}
              style={{ flex: 1, justifyContent: 'center', background: '#B71C1C', color: '#fff', opacity: deleteLoading ? 0.6 : 1 }}
            >
              <Trash2 size={16} aria-hidden="true" />
              {deleteLoading ? t('deletingAction') : t('desktop.deleteAction')}
            </button>
          </div>
        </div>
      </Modal>

      <TransferToCollectiveModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
        documentType="survey"
        documentId={selectedSurvey?.id}
        documentTitle={selectedSurvey?.title}
        onSuccess={(data) => {
          if (data.moved) setSelectedId(null);
        }}
      />

      {selectedSurvey && (
        <SurveyMediaModal
          isOpen={mediaOpen}
          onClose={() => setMediaOpen(false)}
          surveyId={selectedSurvey.id}
          entryId={null}
          canEdit={isOwner(selectedSurvey) && !selectedSurvey?.is_read_only && !isFrozen}
          canDelete={isOwner(selectedSurvey)}
          mediaItems={sidePhotos}
          onUploaded={(newItems) => setSidePhotos(prev => [...prev, ...newItems])}
          onDeleted={(mediaId) => setSidePhotos(prev => prev.filter(m => m.id !== mediaId))}
        />
      )}

      {selectedSurvey && (
        <SurveyDrawingsModal
          isOpen={drawingsOpen}
          onClose={() => setDrawingsOpen(false)}
          surveyId={selectedSurvey.id}
          entryId={null}
          entryName={selectedSurvey.title}
          drawings={sideDrawings}
          canAdd={isOwner(selectedSurvey) && !selectedSurvey?.is_read_only && !isFrozen}
          onCreated={(d) => setSideDrawings(prev => [...prev, d])}
          onDeleted={(id) => setSideDrawings(prev => prev.filter(dr => dr.id !== id))}
        />
      )}
      <UpgradeModal isOpen={!!upgradeModal} onClose={() => setUpgradeModal(null)} docType={upgradeModal?.docType} />
      <CollectiveSubscriptionModal isOpen={collectiveModal} onClose={() => setCollectiveModal(false)} isOwner={activeColl?.role === 'owner'} />
    </div>
  );
}
