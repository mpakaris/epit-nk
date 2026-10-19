'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { processMediaFile } from '@/lib/mediaGate';
import { calculateProjectFinancials } from '@/lib/calculations';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
import InvoiceCard from '@/components/InvoiceCard';
import CollectiveBanner from '@/components/CollectiveBanner';
import StatCard from '@/components/StatCard';
import Modal, { ConfirmModal, AlertModal } from '@/components/Modal';
import { ResponsiveContainer, AreaChart, Area, ReferenceLine, XAxis, YAxis, Tooltip, BarChart, Bar, Cell, LabelList } from 'recharts';
import {
  ArrowLeft, Plus, Receipt, Coins, Users, TrendingUp, TrendingDown,
  CheckCircle2, Camera, ArrowRight, Hammer, Clock, Trash2, Wallet, BookOpen,
  Edit3, UserCheck, CalendarDays, BookUser, BarChart3, ShieldCheck,
  Phone, Mail, MapPin, ChevronUp, Link2, Copy, Check, AlertCircle, Lock, Eye,
  ChevronLeft, ChevronRight, X, Play, ZoomIn, FileText, Ruler, Home, Calendar, User,
  Sparkles, Loader2, Settings, ChevronDown, Download, PencilLine, Paperclip
} from 'lucide-react';

function MediaLightbox({ media, startIndex, onClose }) {
  const [idx, setIdx] = React.useState(startIndex);
  const current = media[idx];
  const isVideo = current?.mime_type?.startsWith('video/');

  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, media.length - 1));
      if (e.key === 'ArrowLeft') setIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [media.length, onClose]);

  if (!current) return null;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', zIndex: 10 }}
      >
        <X size={20} />
      </button>

      {/* Counter */}
      <div style={{ position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', fontWeight: 600 }}>
        {idx + 1} / {media.length}
      </div>

      {/* Prev */}
      {idx > 0 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIdx(i => i - 1); }}
          style={{ position: 'absolute', left: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Next */}
      {idx < media.length - 1 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setIdx(i => i + 1); }}
          style={{ position: 'absolute', right: 12, background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Content */}
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '85vh', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        {isVideo ? (
          <video
            src={current.drive_view_url}
            controls
            autoPlay
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, background: '#000' }}
          />
        ) : (
          <img
            src={current.drive_view_url}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }}
          />
        )}
        {/* Thumbnail strip */}
        {media.length > 1 && (
          <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', maxWidth: '90vw', padding: '0.25rem 0' }}>
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setIdx(i)}
                style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 6, overflow: 'hidden', border: i === idx ? '2px solid var(--accent)' : '2px solid transparent', background: '#222', cursor: 'pointer', padding: 0 }}
              >
                {m.mime_type?.startsWith('video/') ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><Play size={18} /></div>
                ) : (
                  <img src={m.thumbnail_url || m.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BurndownCard({ invoices, labourEntries, projectRooms, startDate, endDate }) {
  const quotedTotal = projectRooms.reduce((s, r) => s + Number(r.quoted_amount_net || 0), 0);

  const events = [
    ...invoices.map(i => ({ date: i.created_at?.slice(0, 10), amount: Number(i.value_huf || 0) })),
    ...labourEntries.map(l => ({ date: l.date, amount: Number(l.value_huf || 0) })),
  ].filter(e => e.date).sort((a, b) => a.date.localeCompare(b.date));

  const totalActual = events.reduce((s, e) => s + e.amount, 0);
  const pct = quotedTotal > 0 ? Math.round((totalActual / quotedTotal) * 100) : null;
  const isOver = pct !== null && pct > 100;
  const lineColor = isOver ? '#ef4444' : '#22c55e';
  const fillColor = isOver ? 'rgba(239,68,68,0.10)' : 'rgba(34,197,94,0.12)';

  if (!quotedTotal && events.length === 0) {
    return (
      <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div className="stat-label">Elköltés az ajánlathoz</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>Nincs kapcsolt ajánlat</div>
      </div>
    );
  }

  // Build cumulative data points
  const today = new Date().toISOString().slice(0, 10);
  const seriesStart = startDate || events[0]?.date || today;
  let cum = 0;
  const chartData = [{ date: seriesStart, cost: 0 }];
  for (const e of events) {
    cum += e.amount;
    const last = chartData[chartData.length - 1];
    if (last.date === e.date) { last.cost = cum; } else { chartData.push({ date: e.date, cost: cum }); }
  }
  if (chartData[chartData.length - 1].date < today) chartData.push({ date: today, cost: cum });

  const fmt = (d) => new Date(d).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
  const fmtHuf = (v) => new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' Ft';

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div className="stat-label">Elköltés az ajánlathoz</div>
        {pct !== null && (
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: lineColor }}>{pct}%</span>
        )}
      </div>

      {quotedTotal > 0 && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.75rem' }}>
          <span>Elköltve: <strong style={{ color: lineColor }}>{fmtHuf(totalActual)}</strong></span>
          <span>Ajánlat: <strong>{fmtHuf(quotedTotal)}</strong></span>
        </div>
      )}

      <div style={{ height: 180, marginTop: '0.35rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="burnFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={lineColor} stopOpacity={0.2} />
                <stop offset="95%" stopColor={lineColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tickFormatter={fmt}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tickFormatter={(v) => new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 0 }).format(v)}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              formatter={(v) => [fmtHuf(v), 'Költség']}
              labelFormatter={fmt}
              contentStyle={{ fontSize: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            />
            {quotedTotal > 0 && (
              <ReferenceLine y={quotedTotal} stroke="#6366f1" strokeDasharray="4 3" strokeWidth={1.5}
                label={{ value: 'Ajánlat', position: 'insideTopRight', fontSize: 10, fill: '#6366f1' }} />
            )}
            <Area type="monotone" dataKey="cost" stroke={lineColor} strokeWidth={2}
              fill="url(#burnFill)" dot={false} activeDot={{ r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const CAT_COLORS = {
  'Anyag':             '#6366f1',
  'Szerszám/Eszköz':   '#f59e0b',
  'Szállítás':         '#3b82f6',
  'Engedély/Hatóság':  '#ef4444',
  'Egyéb':             '#94a3b8',
  'Munkadíj':          '#22c55e',
};

function CostBreakdownCard({ invoices, labourTotal }) {
  const cats = ['Anyag', 'Szerszám/Eszköz', 'Szállítás', 'Engedély/Hatóság', 'Egyéb'];
  const totals = Object.fromEntries(cats.map(c => [c, 0]));
  for (const inv of invoices) {
    if (inv.category in totals) totals[inv.category] += Number(inv.value_huf || 0);
  }

  const data = [
    ...cats.map(c => ({ name: c, value: totals[c] })),
    { name: 'Munkadíj', value: labourTotal },
  ];

  const fmtHuf = (v) => new Intl.NumberFormat('hu-HU', { notation: 'compact', maximumFractionDigits: 1 }).format(v) + ' Ft';

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div className="stat-label">Költségek megoszlása</div>
      <div style={{ height: 180, marginTop: '0.35rem' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={110}
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(v) => [fmtHuf(v), 'Összeg']}
              contentStyle={{ fontSize: '0.75rem', borderRadius: 6, border: '1px solid #e2e8f0' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={14}>
              {data.map((entry) => (
                <Cell key={entry.name} fill={CAT_COLORS[entry.name] || '#94a3b8'} opacity={entry.value === 0 ? 0.2 : 1} />
              ))}
              <LabelList dataKey="value" position="right" formatter={fmtHuf} style={{ fontSize: 10, fill: '#64748b' }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CombinedStatsCard({ totalCost, invoiceCount, totalLabour, labourCount, collective, ownPaid, balance }) {
  const row = (label, value, sub, color) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{label}</div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', color: color || 'var(--text-primary)' }}>{value}</div>
    </div>
  );
  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      {row('Összes kiadás', formatHUF(totalCost), `${invoiceCount} db számla`)}
      {row('Munkadíj', formatHUF(totalLabour), `${labourCount} bejegyzés`, 'var(--success-text)')}
      {collective && row('Általad fizetve', formatHUF(ownPaid), 'saját számlák')}
      {collective && row('Egyenleg', balance > 0 ? `+${formatHUF(balance)}` : formatHUF(balance), balance > 0 ? 'követelés' : balance < 0 ? 'tartozás' : 'rendezett', balance > 0 ? 'var(--success-text)' : balance < 0 ? 'var(--danger-text)' : undefined)}
    </div>
  );
}

function EntryMediaGrid({ photos }) {
  const [lightbox, setLightbox] = React.useState(null);
  if (!photos || photos.length === 0) return null;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '0.4rem', marginTop: '0.5rem' }}>
        {photos.map((photo, i) => {
          const isVideo = photo.mime_type?.startsWith('video/');
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => setLightbox(i)}
              style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', cursor: 'pointer', padding: 0 }}
            >
              {isVideo ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e', gap: '0.2rem' }}>
                  <Play size={22} color="#fff" />
                  <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Videó</span>
                </div>
              ) : (
                <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)'; e.currentTarget.style.opacity = '1'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)'; e.currentTarget.style.opacity = '0'; }}
              >
                {isVideo ? <Play size={24} color="#fff" /> : <ZoomIn size={20} color="#fff" />}
              </div>
            </button>
          );
        })}
      </div>

      {lightbox !== null && (
        <MediaLightbox
          media={photos}
          startIndex={lightbox}
          onClose={() => setLightbox(null)}
        />
      )}
    </>
  );
}


const WORK_TYPES = [
  'Alapozás', 'Ácsmunka', 'Ajtócsere', 'Ablakcsere', 'Bontás',
  'Burkolás', 'Csempézés', 'Festés', 'Gipszkarton', 'Kőművesmunka',
  'Padlóburkolás', 'Szigetelés', 'Szállítás', 'Takarítás',
  'Tetőfedés', 'Vakolás', 'Villanyszerelés', 'Vízvezeték-szerelés',
];

const MAX_PHOTOS = 10;

function EditDiaryEntryModal({ isOpen, onClose, entry, onSave, onDeletePhoto, rooms = [] }) {
  const [title, setTitle] = React.useState('');
  const [entryDate, setEntryDate] = React.useState('');
  const [workType, setWorkType] = React.useState('');
  const [body, setBody] = React.useState('');
  const [internalNote, setInternalNote] = React.useState('');
  const [clientNote, setClientNote] = React.useState('');
  const [isPublic, setIsPublic] = React.useState(false);
  const [roomId, setRoomId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [deletingPhotoId, setDeletingPhotoId] = React.useState(null);

  // New media to attach
  const [pendingFiles, setPendingFiles] = React.useState([]);
  const [pendingPreviews, setPendingPreviews] = React.useState([]);
  const galleryRef = React.useRef(null);
  const cameraRef = React.useRef(null);
  const videoRef = React.useRef(null);

  React.useEffect(() => {
    if (entry && isOpen) {
      setTitle(entry.title || '');
      setEntryDate(entry.entry_date || '');
      setWorkType(entry.work_type || '');
      setBody(entry.body || '');
      setInternalNote(entry.internal_note || '');
      setClientNote(entry.client_note || '');
      setIsPublic(Boolean(entry.is_public));
      setRoomId(entry.room_id || '');
      setError('');
      setPendingFiles([]);
      setPendingPreviews([]);
    }
  }, [entry?.id, isOpen]);

  if (!isOpen || !entry) return null;

  const existingPhotos = entry.photos || [];
  const totalCount = existingPhotos.length + pendingFiles.length;

  const addFiles = async (files) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - totalCount;
    if (remaining <= 0) return;
    const raw = Array.from(files).slice(0, remaining);
    const toAdd = await Promise.all(raw.map(processMediaFile));
    setPendingFiles(prev => [...prev, ...toAdd]);
    const newPreviews = toAdd.map(file => ({
      url: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      name: file.name,
      isVideo: file.type.startsWith('video/'),
    }));
    setPendingPreviews(prev => [...prev, ...newPreviews]);
  };

  const removePending = (i) => {
    setPendingFiles(prev => prev.filter((_, idx) => idx !== i));
    setPendingPreviews(prev => {
      const removed = prev[i];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const handleDeleteExisting = async (photoId) => {
    setDeletingPhotoId(photoId);
    try {
      await onDeletePhoto(photoId);
    } catch (err) {
      setError(err.message || 'Hiba a fotó törlésekor');
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('A cím nem lehet üres'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(
        entry.id,
        { title: title.trim(), body: body.trim() || null, work_type: workType.trim() || null, internal_note: internalNote.trim() || null, client_note: clientNote.trim() || null, entry_date: entryDate || undefined, is_public: isPublic, room_id: roomId || null },
        pendingFiles,
      );
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentésnél');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bejegyzés szerkesztése">
      {error && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} /><span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* Date + Work type */}
        <div className="grid-2col">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Dátum</label>
            <input type="date" className="form-control" value={entryDate} onChange={e => setEntryDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Munka típusa</label>
            <input type="text" className="form-control" list="edit-work-types" value={workType} onChange={e => setWorkType(e.target.value)} placeholder="pl. Gipszkarton" />
            <datalist id="edit-work-types">{WORK_TYPES.map(t => <option key={t} value={t} />)}</datalist>
          </div>
        </div>

        {/* Room selector */}
        {rooms.length > 0 && (
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <label className="form-label">Szekció</label>
            <select className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)}>
              <option value="">– Általános (szekció nélkül) –</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
            </select>
          </div>
        )}

        {/* Title */}
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Cím *</label>
          <input type="text" required className="form-control" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <textarea rows={3} className="form-control" value={body} onChange={e => setBody(e.target.value)} />
        </div>

        {/* Notes */}
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Lock size={12} color="var(--text-muted)" /> Belső megjegyzés</label>
          <textarea rows={2} className="form-control" value={internalNote} onChange={e => setInternalNote(e.target.value)} placeholder="Csak a csapat látja…" />
        </div>
        <div className="form-group">
          <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><Eye size={12} color="var(--accent)" /> Üzenet az ügyfélnek</label>
          <textarea rows={2} className="form-control" value={clientNote} onChange={e => setClientNote(e.target.value)} placeholder="Látható az ügyfél nyilvános oldalán…" />
        </div>

        {/* Public toggle */}
        <div style={{ marginBottom: '0.75rem' }}>
          <button type="button" onClick={() => setIsPublic(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', width: '100%', background: isPublic ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${isPublic ? 'var(--success-border)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-md)', padding: '0.65rem 0.85rem', cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ width: 36, height: 20, borderRadius: 10, background: isPublic ? 'var(--success)' : 'var(--border-subtle)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
              <div style={{ position: 'absolute', top: 2, left: isPublic ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: isPublic ? 'var(--success-text)' : 'var(--text-primary)' }}>{isPublic ? 'Nyilvános — látható az ügyfélnek' : 'Privát — csak a csapat látja'}</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{isPublic ? 'Megjelenik a projekt nyilvános oldalán' : 'Az ügyfél nem látja ezt a bejegyzést'}</div>
            </div>
          </button>
        </div>

        {/* ── Media section ── */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.85rem', marginTop: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
            <label className="form-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Camera size={14} color="var(--accent)" /> Fotók & Videók
            </label>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{totalCount}/{MAX_PHOTOS}</span>
          </div>

          {/* Existing photos */}
          {existingPhotos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {existingPhotos.map(photo => {
                const isVideo = photo.mime_type?.startsWith('video/');
                const isDeleting = deletingPhotoId === photo.id;
                return (
                  <div key={photo.id} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-subtle)', background: 'var(--bg-subtle)', opacity: isDeleting ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                    {isVideo ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a2e' }}>
                        <Play size={18} color="#fff" />
                      </div>
                    ) : (
                      <img src={photo.thumbnail_url || photo.drive_view_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                    <button
                      type="button"
                      disabled={isDeleting || saving}
                      onClick={() => handleDeleteExisting(photo.id)}
                      style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,0.85)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pending (new) previews */}
          {pendingPreviews.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: '0.4rem', marginBottom: '0.6rem' }}>
              {pendingPreviews.map((p, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '2px dashed var(--accent-border)', background: 'var(--accent-light)' }}>
                  {p.isVideo ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
                      <Play size={18} color="var(--accent)" />
                      <span style={{ fontSize: '0.55rem', color: 'var(--accent)', fontWeight: 700 }}>ÚJ</span>
                    </div>
                  ) : p.url ? (
                    <img src={p.url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={18} color="var(--accent)" />
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 2, left: 2, background: 'var(--accent)', borderRadius: 4, padding: '1px 4px', fontSize: '0.5rem', color: '#fff', fontWeight: 700 }}>ÚJ</div>
                  <button type="button" disabled={saving} onClick={() => removePending(i)} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add buttons */}
          {totalCount < MAX_PHOTOS && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.4rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={saving} onClick={() => cameraRef.current?.click()}>
                <Camera size={13} /> Kamera
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={saving} onClick={() => galleryRef.current?.click()}>
                <Plus size={13} /> Kép
              </button>
              <button type="button" className="btn btn-secondary btn-sm" style={{ justifyContent: 'center', fontSize: '0.75rem' }} disabled={saving} onClick={() => videoRef.current?.click()}>
                <Play size={13} /> Videó
              </button>
            </div>
          )}

          <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
          <input ref={videoRef} type="file" accept="video/*" multiple style={{ display: 'none' }} onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !!deletingPhotoId}>
            {saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Mentés'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const LABOUR_UNITS = ['h', 'nap', 'm²', 'm³', 'm', 'fm', 'db', 'l', 'kg'];

function LabourEditModal({ entry, onClose, onSave, rooms = [] }) {
  const [labourType, setLabourType] = React.useState('');
  const [date, setDate] = React.useState('');
  const [hours, setHours] = React.useState('');
  const [unit, setUnit] = React.useState('h');
  const [hourlyRate, setHourlyRate] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [roomId, setRoomId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    if (entry) {
      setLabourType(entry.labour_type || '');
      setDate(entry.date || '');
      setHours(entry.hours != null ? String(entry.hours) : '');
      setUnit(entry.unit || 'h');
      setHourlyRate(entry.hourly_rate != null ? String(entry.hourly_rate) : '');
      setDescription(entry.description || '');
      setRoomId(entry.room_id || '');
      setErr('');
    }
  }, [entry?.id]);

  const preview = Math.round((parseFloat(hours) || 0) * (parseInt(hourlyRate, 10) || 0));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!labourType.trim()) { setErr('A típus megadása kötelező'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave({ labour_type: labourType.trim(), date, hours: parseFloat(hours), hourly_rate: parseInt(hourlyRate, 10), unit, description: description.trim() || null, room_id: roomId || null });
    } catch (error) {
      setErr(error.message || 'Hiba a mentésnél');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Munkabejegyzés szerkesztése">
      {err && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{err}</span></div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Típus *</label>
          <input type="text" required className="form-control" value={labourType} onChange={e => setLabourType(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Dátum</label>
          <input type="date" className="form-control" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Mértékegység</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
            {LABOUR_UNITS.map(u => (
              <button key={u} type="button" onClick={() => setUnit(u)} style={{ padding: '0.25rem 0.65rem', borderRadius: 'var(--radius-md)', border: unit === u ? '2px solid var(--accent)' : '1px solid var(--border-subtle)', background: unit === u ? 'var(--accent)' : 'var(--bg-subtle)', color: unit === u ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}>{u}</button>
            ))}
          </div>
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Mennyiség ({unit}) *</label>
            <input type="number" required min="0.01" step="0.01" className="form-control text-mono" value={hours} onChange={e => setHours(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Egységár (Ft/{unit}) *</label>
            <input type="number" required min="1" className="form-control text-mono" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} />
          </div>
        </div>
        {preview > 0 && (
          <div style={{ marginTop: '0.5rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontSize: '0.825rem', fontWeight: 700 }}>
            Munkadíj: {hours} {unit} × {formatHUF(parseInt(hourlyRate, 10) || 0)} = {formatHUF(preview)}
          </div>
        )}
        <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
          <label className="form-label">Megjegyzés</label>
          <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        {rooms.length > 0 && (
          <div className="form-group" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            <label className="form-label">Szekció (opcionális)</label>
            <select className="form-control" value={roomId} onChange={e => setRoomId(e.target.value)}>
              <option value="">– Általános (szekció nélkül) –</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}{r.size_m2 ? ` (${r.size_m2} m²)` : ''}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}

function InvoiceDetailDrawer({ invoice, isAdmin, rooms, splits = [], onClose, onDelete, onSave, onSaveSplits }) {
  const catObj = INVOICE_CATEGORIES.find(c => c.id === invoice.category) || { color: 'egyeb' };
  const room = rooms.find(r => r.id === invoice.room_id) || null;
  const hasAiData = Array.isArray(invoice.ai_line_items);

  // View / edit toggle
  const [isEditing, setIsEditing] = React.useState(false);

  // Edit fields — invoice header
  const [editValue, setEditValue] = React.useState(invoice.value_huf?.toString() ?? '');
  const [editCategory, setEditCategory] = React.useState(invoice.category ?? '');
  const [editDesc, setEditDesc] = React.useState(invoice.description ?? '');

  // Line items
  const [lineItems, setLineItems] = React.useState(
    Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []
  );

  const [showImage, setShowImage] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [editSplits, setEditSplits] = React.useState(splits.map(s => ({ ...s })));

  React.useEffect(() => {
    setEditSplits(splits.map(s => ({ ...s })));
  }, [invoice.id]);

  const splitsTotal = editSplits.reduce((sum, s) => sum + Number(s.amount_huf || 0), 0);
  const splitsRemaining = Number(invoice.value_huf) - splitsTotal;

  const addSplit = () => setEditSplits(prev => [...prev, { room_id: '', amount_huf: Math.max(0, Number(invoice.value_huf) - prev.reduce((s, x) => s + Number(x.amount_huf || 0), 0)), note: '' }]);
  const removeSplit = (idx) => setEditSplits(prev => prev.filter((_, i) => i !== idx));
  const updateSplit = (idx, field, value) => setEditSplits(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));

  const [isMobile, setIsMobile] = React.useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : true
  );
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  React.useEffect(() => {
    const scrollY = window.scrollY;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    return () => {
      const top = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.top = '';
      if (top) window.scrollTo(0, -parseInt(top, 10));
    };
  }, []);

  const currency = lineItems.find(i => i.currency)?.currency || 'HUF';
  const grandTotal = lineItems.reduce((s, i) => s + (Number(i.total) || 0), 0);

  const updateItem = (idx, field, value) => {
    setLineItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        updated.total = Number(field === 'quantity' ? value : item.quantity) * Number(field === 'unitPrice' ? value : item.unitPrice);
      }
      return updated;
    }));
  };
  const removeItem = (idx) => setLineItems(prev => prev.filter((_, i) => i !== idx));
  const addItem = () => setLineItems(prev => [...prev, { name: '', quantity: 1, unitPrice: 0, total: 0, currency }]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(invoice.id, {
        value_huf: Math.round(Number(editValue)),
        category: editCategory,
        description: editDesc,
        ai_line_items: lineItems.length > 0 ? lineItems : null,
        ai_total: lineItems.length > 0 ? Math.round(grandTotal) : null,
      });
      if (onSaveSplits) await onSaveSplits(invoice.id, editSplits);
    } catch { /* parent handles */ }
    finally { setSaving(false); }
  };

  const cancelEdit = () => {
    setEditValue(invoice.value_huf?.toString() ?? '');
    setEditCategory(invoice.category ?? '');
    setEditDesc(invoice.description ?? '');
    setLineItems(Array.isArray(invoice.ai_line_items) ? invoice.ai_line_items : []);
    setEditSplits(splits.map(s => ({ ...s })));
    setIsEditing(false);
  };

  const inputStyle = { fontSize: '0.78rem', padding: '0.26rem 0.38rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', width: '100%', color: 'var(--text-primary)' };
  const numInputStyle = { ...inputStyle, fontFamily: 'var(--font-mono)', textAlign: 'right' };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      <div style={isMobile ? {
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderRadius: '20px 20px 0 0',
        zIndex: 201, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      } : {
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        background: '#fff', borderRadius: 'var(--radius-lg)',
        zIndex: 201, maxHeight: '85vh', width: '100%', maxWidth: '620px',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 8px 48px rgba(0,0,0,0.22)',
      }}>

        {/* Drag handle — mobile only */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0.65rem 0 0' }}>
            <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border-subtle)' }} />
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '0.75rem 1.25rem 0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: '0.75rem' }}>
            {isEditing ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <select
                    className="form-control"
                    value={editCategory}
                    onChange={e => setEditCategory(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '0.3rem 0.5rem', flex: '1 1 140px' }}
                  >
                    {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <div style={{ position: 'relative', flex: '1 1 120px' }}>
                    <input
                      type="number" min="1" required
                      className="form-control text-mono"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      style={{ fontWeight: 800, fontSize: '1.1rem', paddingRight: '2.5rem' }}
                    />
                    <span style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Ft</span>
                  </div>
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Leírás (opcionális)"
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  style={{ fontSize: '0.875rem' }}
                />
              </>
            ) : (
              <>
                <span className={`category-badge category-${catObj.color}`} style={{ marginBottom: '0.3rem', display: 'inline-block' }}>{invoice.category}</span>
                <div style={{ fontWeight: 800, fontSize: '1.4rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', lineHeight: 1 }}>{formatHUF(invoice.value_huf)}</div>
                {invoice.description && <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{invoice.description}</div>}
              </>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-subtle)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={16} />
          </button>
        </div>

        {/* Metadata */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', padding: '0.5rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-muted)', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <User size={12} color="var(--accent)" />
            <strong style={{ color: 'var(--text-secondary)' }}>{invoice.uploader_name || 'Ismeretlen'}</strong>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Calendar size={12} />{formatDate(invoice.created_at)}</span>
          {room
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.7rem' }}><Home size={10} />{room.name}</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.12rem 0.45rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.7rem' }}><Home size={10} />Általános</span>
          }
        </div>

        {/* Szekció felosztás */}
        <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Szekciók</span>
            {isEditing && rooms.length > 0 && (
              <button type="button" onClick={addSplit} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.5rem', cursor: 'pointer', color: 'var(--accent)', fontSize: '0.72rem', fontWeight: 700 }}>
                <Plus size={11} /> Szekció
              </button>
            )}
          </div>

          {rooms.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Még nincsenek szekciók ehhez a projekthez.</p>
          ) : (isEditing ? editSplits : splits).length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>
              {isEditing ? 'Adj hozzá szekciót az összeg felosztásához.' : 'Nincs szekció felosztás.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {(isEditing ? editSplits : splits).map((split, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {isEditing ? (
                    <>
                      <select
                        value={split.room_id}
                        onChange={e => updateSplit(idx, 'room_id', e.target.value)}
                        style={{ flex: 1, fontSize: '0.78rem', padding: '0.25rem 0.45rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', minWidth: 0 }}
                      >
                        <option value="">Szekció…</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                      <div style={{ position: 'relative', flexShrink: 0, width: '90px' }}>
                        <input
                          type="number" min="1"
                          value={split.amount_huf}
                          onChange={e => updateSplit(idx, 'amount_huf', e.target.value)}
                          style={{ width: '100%', fontSize: '0.78rem', padding: '0.25rem 1.8rem 0.25rem 0.45rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}
                        />
                        <span style={{ position: 'absolute', right: '0.35rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 700, pointerEvents: 'none' }}>Ft</span>
                      </div>
                      <button type="button" onClick={() => removeSplit(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: '0.1rem', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <X size={13} />
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.82rem', padding: '0.1rem 0' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{rooms.find(r => r.id === split.room_id)?.name || '?'}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)' }}>{Number(split.amount_huf).toLocaleString('hu-HU')} Ft</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {isEditing && editSplits.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 'var(--radius-sm)', background: splitsRemaining < 0 ? 'var(--danger-bg)' : splitsRemaining === 0 ? 'var(--success-bg)' : 'var(--bg-subtle)', border: `1px solid ${splitsRemaining < 0 ? 'var(--danger-border)' : splitsRemaining === 0 ? 'var(--success-border)' : 'var(--border-subtle)'}` }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: splitsRemaining < 0 ? 'var(--danger-text)' : splitsRemaining === 0 ? 'var(--success-text)' : 'var(--text-muted)' }}>
                {splitsRemaining === 0 ? '✓ Teljes összeg felosztva' : splitsRemaining > 0 ? `Maradék: ${splitsRemaining.toLocaleString('hu-HU')} Ft` : `Túllépés: ${Math.abs(splitsRemaining).toLocaleString('hu-HU')} Ft`}
              </span>
              <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{splitsTotal.toLocaleString('hu-HU')} / {Number(invoice.value_huf).toLocaleString('hu-HU')} Ft</span>
            </div>
          )}
        </div>

        {/* Scrollable body — line items */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0.85rem 1.25rem', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
            <Sparkles size={14} color="var(--accent)" />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>Tételek</span>
            {currency !== 'HUF' && (
              <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', padding: '0.1rem 0.35rem' }}>{currency}</span>
            )}
          </div>

          {!hasAiData ? (
            <div style={{ padding: '0.85rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Ez a számla a tételes AI elemzés előtt lett feltöltve — nincs tétellista.
            </div>
          ) : (
            <>
              {lineItems.length === 0 && !isEditing && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Az AI nem talált tételeket.</p>
              )}
              {lineItems.length > 0 && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: `1fr 50px 74px 74px${isEditing ? ' 24px' : ''}`, gap: '0.28rem', paddingBottom: '0.25rem', borderBottom: '1px solid var(--border-subtle)', marginBottom: '0.35rem' }}>
                    {['Megnevezés', 'Db', 'Egységár', 'Összeg', ...(isEditing ? [''] : [])].map((h, i) => (
                      <span key={i} style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>{h}</span>
                    ))}
                  </div>
                  {lineItems.map((item, idx) => (
                    isEditing ? (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 74px 74px 24px', gap: '0.28rem', alignItems: 'center', marginBottom: '0.28rem' }}>
                        <input type="text" value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} placeholder="Megnevezés" style={inputStyle} />
                        <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} step="0.01" min="0" style={numInputStyle} />
                        <input type="number" value={item.unitPrice} onChange={e => updateItem(idx, 'unitPrice', e.target.value)} step="any" min="0" style={numInputStyle} />
                        <input type="number" value={item.total} onChange={e => { const v = Number(e.target.value); setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, total: v } : it)); }} step="any" min="0" style={numInputStyle} />
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger-text)', padding: '0.12rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 74px 74px', gap: '0.28rem', alignItems: 'center', marginBottom: '0.28rem', fontSize: '0.82rem' }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{item.name || '–'}</span>
                        <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{item.quantity}</span>
                        <span style={{ textAlign: 'right', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{Number(item.unitPrice).toLocaleString('hu-HU')}</span>
                        <span style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{Number(item.total).toLocaleString('hu-HU')}</span>
                      </div>
                    )
                  ))}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.45rem', borderTop: '2px solid var(--border-subtle)', marginTop: '0.15rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Végösszeg{currency !== 'HUF' ? ` (${currency})` : ''}:</span>
                    <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                      {grandTotal.toLocaleString('hu-HU', { maximumFractionDigits: 2 })} {currency}
                    </span>
                  </div>
                </>
              )}
              {isEditing && (
                <button type="button" onClick={addItem} style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: '1px dashed var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, width: '100%', justifyContent: 'center' }}>
                  <Plus size={13} /> Tétel hozzáadása
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '0.85rem 1.25rem', paddingBottom: isMobile ? 'calc(0.85rem + env(safe-area-inset-bottom, 0px))' : '0.85rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {isEditing ? (
            <>
              <button type="button" className="btn btn-secondary btn-sm" onClick={cancelEdit} disabled={saving}>Mégse</button>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => { onClose(); onDelete(invoice.id); }}>
                <Trash2 size={13} /> Törlés
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? <><Loader2 size={14} className="animate-spin" /> Mentés...</> : <><Check size={14} /> Mentés</>}
              </button>
            </>
          ) : (
            <>
              {invoice.image_url && (
                <>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowImage(true)}>
                    <Eye size={14} /> Bizonylat
                  </button>
                  <a href={invoice.image_url} download target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    <Download size={14} /> Letöltés
                  </a>
                </>
              )}
              {isAdmin && (
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setIsEditing(true)} style={{ marginLeft: 'auto' }}>
                  <Edit3 size={13} /> Szerkesztés
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showImage && (
        <Modal isOpen={true} onClose={() => setShowImage(false)} title="Bizonylat megtekintése">
          <div style={{ textAlign: 'center' }}>
            <img src={invoice.image_url} alt={invoice.description || 'Számla bizonylat'}
              style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 'var(--radius-md)', objectFit: 'contain', border: '1px solid var(--border-subtle)' }} />
            <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem' }} className="text-mono">{formatHUF(invoice.value_huf)}</span>
              <span className={`category-badge category-${catObj.color}`}>{invoice.category}</span>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'];

const TRIGGER_TYPES = [
  { key: 'start',     label: 'Projekt kezdetén' },
  { key: 'end',       label: 'Projekt végén' },
  { key: 'milestone', label: 'Mérföldkőnél' },
  { key: 'date',      label: 'Dátumon' },
];

const MILESTONE_SUGGESTIONS = [
  'Anyag helyszínen',
  'Bontási munkák kész',
  'Alapozási munkák kész',
  'Falszerkezet kész',
  'Tetőfedés kész',
  'Nyílászárók beépítve',
  'Gépészet kész',
  'Vakolás kész',
  'Burkolás kész',
  'Festés kész',
  'Szerkezet kész',
  'Épület átadva',
];

const TRIGGER_DISPLAY = {
  start:     { label: 'Projekt kezdetén',  bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  end:       { label: 'Projekt végén',     bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  milestone: { label: 'Mérföldkőnél',     bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  date:      { label: 'Dátumon',           bg: '#faf5ff', color: '#7e22ce', border: '#e9d5ff' },
};

const STATUS_DISPLAY = {
  pending:   { label: 'Függőben',  bg: '#fefce8', color: '#a16207', border: '#fde68a' },
  paid:      { label: 'Fizetve',   bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
  cancelled: { label: 'Törölve',   bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

function PaymentPlanModal({ isOpen, onClose, onSave, editItem, itemCount }) {
  const [label, setLabel] = React.useState('');
  const [triggerType, setTriggerType] = React.useState('milestone');
  const [milestoneName, setMilestoneName] = React.useState('');
  const [amountHuf, setAmountHuf] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    if (editItem) {
      setLabel(editItem.label || '');
      setTriggerType(editItem.trigger_type || 'milestone');
      setMilestoneName(editItem.milestone_name || '');
      setAmountHuf(editItem.amount_huf?.toString() || '');
      setDueDate(editItem.due_date || '');
      setNote(editItem.note || '');
    } else {
      setLabel(`Fizetés ${ROMAN[itemCount] ?? (itemCount + 1)}`);
      setTriggerType('milestone');
      setMilestoneName('');
      setAmountHuf('');
      setDueDate('');
      setNote('');
    }
    setErr('');
  }, [isOpen, editItem?.id, itemCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!label.trim()) { setErr('A megnevezés kötelező'); return; }
    const amt = Math.round(Number(amountHuf.replace(/\s/g, '').replace(',', '.')));
    if (!amt || amt <= 0) { setErr('Az összeg kötelező és nullánál nagyobb kell legyen'); return; }
    setSaving(true);
    setErr('');
    try {
      await onSave({ label: label.trim(), trigger_type: triggerType, milestone_name: triggerType === 'milestone' ? milestoneName.trim() || null : null, amount_huf: amt, due_date: dueDate || null, note: note.trim() || null });
      onClose();
    } catch (error) {
      setErr(error.message || 'Hiba a mentésnél');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editItem ? 'Fizetési tétel szerkesztése' : 'Új fizetési tétel'}>
      {err && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}>
          <AlertCircle size={15} /><span>{err}</span>
        </div>
      )}
      <form onSubmit={handleSubmit}>
        {/* Label */}
        <div className="form-group">
          <label className="form-label">Megnevezés *</label>
          <input type="text" required className="form-control" value={label} onChange={e => setLabel(e.target.value)} placeholder="pl. Fizetés I" />
        </div>

        {/* Trigger type */}
        <div className="form-group">
          <label className="form-label">Esedékesség</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {TRIGGER_TYPES.map(t => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTriggerType(t.key)}
                style={{ padding: '0.3rem 0.75rem', borderRadius: 'var(--radius-md)', border: triggerType === t.key ? '2px solid var(--accent)' : '1px solid var(--border-subtle)', background: triggerType === t.key ? 'var(--accent)' : 'var(--bg-subtle)', color: triggerType === t.key ? '#fff' : 'var(--text-secondary)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Milestone name */}
        {triggerType === 'milestone' && (
          <div className="form-group">
            <label className="form-label">Mérföldkő neve</label>
            <input
              type="text"
              className="form-control"
              list="milestone-suggestions"
              value={milestoneName}
              onChange={e => setMilestoneName(e.target.value)}
              placeholder="pl. Anyag helyszínen"
            />
            <datalist id="milestone-suggestions">
              {MILESTONE_SUGGESTIONS.map(s => <option key={s} value={s} />)}
            </datalist>
          </div>
        )}

        {/* Due date (only for 'date' trigger) */}
        {triggerType === 'date' && (
          <div className="form-group">
            <label className="form-label">Határidő</label>
            <input type="date" className="form-control" value={dueDate} onChange={e => setDueDate(e.target.value)} />
          </div>
        )}

        {/* Amount */}
        <div className="form-group">
          <label className="form-label">Összeg (Ft) *</label>
          <div style={{ position: 'relative' }}>
            <input
              type="number"
              required
              min="1"
              className="form-control text-mono"
              value={amountHuf}
              onChange={e => setAmountHuf(e.target.value)}
              placeholder="pl. 450000"
              style={{ paddingRight: '2.5rem' }}
            />
            <span style={{ position: 'absolute', right: '0.7rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', pointerEvents: 'none' }}>Ft</span>
          </div>
          {Number(amountHuf) > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {Number(amountHuf).toLocaleString('hu-HU')} Ft
            </div>
          )}
        </div>

        {/* Note */}
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Megjegyzés</label>
          <textarea rows={2} className="form-control" value={note} onChange={e => setNote(e.target.value)} placeholder="Opcionális belső megjegyzés..." />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
            {saving ? <><Loader2 size={13} className="animate-spin" />{editItem ? 'Módosítás' : 'Hozzáadás'}</> : (editItem ? 'Módosítás' : 'Hozzáadás')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function WorkTypeSelector({ selected, onChange }) {
  const [custom, setCustom] = React.useState('');
  const toggle = (type) => onChange(selected.includes(type) ? selected.filter(t => t !== type) : [...selected, type]);
  const addCustom = () => {
    const v = custom.trim();
    if (!v || selected.includes(v)) { setCustom(''); return; }
    onChange([...selected, v]);
    setCustom('');
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
        {WORK_TYPES.map(type => (
          <button key={type} type="button" onClick={() => toggle(type)} style={{ padding: '0.2rem 0.65rem', borderRadius: 'var(--radius-pill)', border: selected.includes(type) ? '1.5px solid var(--accent)' : '1px solid var(--border-subtle)', background: selected.includes(type) ? 'var(--accent-light)' : 'var(--bg-subtle)', color: selected.includes(type) ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: selected.includes(type) ? 700 : 500, fontSize: '0.78rem', cursor: 'pointer' }}>{type}</button>
        ))}
      </div>
      {selected.filter(t => !WORK_TYPES.includes(t)).map(t => (
        <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1.5px solid var(--accent)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.78rem', marginRight: '0.35rem', marginBottom: '0.35rem' }}>
          {t}<button type="button" onClick={() => onChange(selected.filter(x => x !== t))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 0, display: 'flex' }}><X size={11} /></button>
        </span>
      ))}
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
        <input type="text" className="form-control" placeholder="Egyéni típus..." value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }} style={{ flex: 1, fontSize: '0.82rem' }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={addCustom} disabled={!custom.trim()}>Hozzáad</button>
      </div>
    </div>
  );
}

function RoomModal({ isOpen, onClose, room, onSave }) {
  const [name, setName] = React.useState('');
  const [sizeM2, setSizeM2] = React.useState('');
  const [workTypes, setWorkTypes] = React.useState([]);
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (isOpen) {
      setName(room?.name || '');
      setSizeM2(room?.size_m2 != null ? String(room.size_m2) : '');
      setWorkTypes(room?.work_types || []);
      setDescription(room?.description || '');
      setError('');
    }
  }, [isOpen, room?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('A szekció neve kötelező'); return; }
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), size_m2: sizeM2 !== '' ? Number(sizeM2) : null, work_types: workTypes, description: description.trim() || null });
      onClose();
    } catch (err) { setError(err.message || 'Hiba a mentésnél'); }
    finally { setSaving(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={room ? 'Szekció szerkesztése' : 'Új szekció'}>
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '0.85rem' }}>{error}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Szekció neve *</label>
          <input type="text" required className="form-control" value={name} onChange={e => setName(e.target.value)} placeholder="pl. Konyha, Garázs, Kert..." autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Terület (m²)</label>
          <input type="number" min="0" step="0.1" className="form-control" value={sizeM2} onChange={e => setSizeM2(e.target.value)} placeholder="pl. 18.5" />
        </div>
        <div className="form-group">
          <label className="form-label">Munkák típusai</label>
          <WorkTypeSelector selected={workTypes} onChange={setWorkTypes} />
        </div>
        <div className="form-group" style={{ marginBottom: '1.25rem' }}>
          <label className="form-label">Leírás / Megjegyzés</label>
          <textarea rows={2} className="form-control" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>Mégse</button>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Mentés'}</button>
        </div>
      </form>
    </Modal>
  );
}

const nextDay = (d) => { const dt = new Date(d); dt.setDate(dt.getDate() + 1); return dt.toISOString().split('T')[0]; };
const todayStr = () => new Date().toISOString().split('T')[0];

function ProjectEditModal({ isOpen, onClose, project, clients, onSave, onCreateClient, collectives, activeCollectiveId, onMove }) {
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [startDate, setStartDate] = React.useState('');
  const [endDate, setEndDate] = React.useState('');
  const [clientId, setClientId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');

  const [showNewClient, setShowNewClient] = React.useState(false);
  const [newClientName, setNewClientName] = React.useState('');
  const [newClientPhone, setNewClientPhone] = React.useState('');
  const [newClientEmail, setNewClientEmail] = React.useState('');
  const [newClientAddress, setNewClientAddress] = React.useState('');
  const [newClientError, setNewClientError] = React.useState('');
  const [creatingClient, setCreatingClient] = React.useState(false);

  const [moveTarget, setMoveTarget] = React.useState('');
  const [moveConfirm, setMoveConfirm] = React.useState(false);
  const [moving, setMoving] = React.useState(false);
  const [moveError, setMoveError] = React.useState('');
  const [moveDone, setMoveDone] = React.useState(null);

  React.useEffect(() => {
    if (isOpen && project) {
      setName(project.name || '');
      setDesc(project.description || '');
      setStartDate(project.start_date || '');
      setEndDate(project.end_date || '');
      setClientId(project.client_id || '');
      setError('');
      setShowNewClient(false);
      setMoveTarget(''); setMoveConfirm(false); setMoveDone(null); setMoveError('');
    }
  }, [isOpen, project?.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave({ name: name.trim(), description: desc.trim() || null, start_date: startDate || null, end_date: endDate || null, client_id: clientId || null });
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba a mentésnél');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) { setNewClientError('A név megadása kötelező!'); return; }
    setCreatingClient(true); setNewClientError('');
    try {
      const c = await onCreateClient({ name: newClientName.trim(), phone: newClientPhone.trim(), email: newClientEmail.trim(), address: newClientAddress.trim() });
      setClientId(c.id);
      setShowNewClient(false);
      setNewClientName(''); setNewClientPhone(''); setNewClientEmail(''); setNewClientAddress('');
    } catch (err) {
      setNewClientError(err.message || 'Hiba az ügyfél létrehozásakor');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleMove = async () => {
    if (!moveTarget) return;
    setMoving(true); setMoveError('');
    try {
      await onMove(moveTarget);
      const name = collectives.find(c => c.collective_id === moveTarget)?.name || 'Kollektíva';
      setMoveDone({ collectiveId: moveTarget, name });
      setMoveConfirm(false);
    } catch (err) {
      setMoveError(err.message || 'Hiba az áthelyezéskor');
    } finally {
      setMoving(false);
    }
  };

  const selectedClient = (clients || []).find(c => c.id === clientId);
  const showMoveCard = !activeCollectiveId && !project?.collective_id && collectives?.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Projekt szerkesztése">
      {error && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem', marginBottom: '0.85rem' }}><AlertCircle size={15} /><span>{error}</span></div>}
      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">Projekt neve *</label>
          <input type="text" required className="form-control" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <textarea rows={2} className="form-control" value={desc} onChange={e => setDesc(e.target.value)} />
        </div>
        <div className="grid-2col">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Kezdés</label>
            <input type="date" className="form-control" value={startDate} onChange={e => { const v = e.target.value; setStartDate(v); if (v && (!endDate || endDate <= v)) setEndDate(nextDay(v)); }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Befejezés</label>
            <input type="date" className="form-control" min={startDate ? nextDay(startDate) : todayStr()} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginTop: '0.75rem' }}>
          <label className="form-label">Megrendelő</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select className="form-control" value={clientId} onChange={e => setClientId(e.target.value)} style={{ flex: 1 }}>
              <option value="">– Ügyfél nélkül –</option>
              {(clients || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={() => setShowNewClient(v => !v)}>
              {showNewClient ? <ChevronUp size={14} /> : <Plus size={14} />}
              {showNewClient ? 'Bezár' : 'Új ügyfél'}
            </button>
          </div>
          {selectedClient && !showNewClient && (
            <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 }}>
              {selectedClient.phone && `${selectedClient.phone} · `}{selectedClient.email}
            </div>
          )}
        </div>

        {showNewClient && (
          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.85rem', marginBottom: '0.75rem', background: 'var(--bg-subtle)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }}>Új ügyfél</div>
            {newClientError && <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.65rem' }}>{newClientError}</div>}
            <div className="form-group"><label className="form-label">Név *</label><input type="text" className="form-control" value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="pl. Horváth Béla" /></div>
            <div className="grid-2col">
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">Telefon</label><input type="tel" className="form-control" value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} /></div>
              <div className="form-group" style={{ margin: 0 }}><label className="form-label">E-mail</label><input type="email" className="form-control" value={newClientEmail} onChange={e => setNewClientEmail(e.target.value)} /></div>
            </div>
            <div className="form-group" style={{ marginTop: '0.65rem', marginBottom: '0.65rem' }}><label className="form-label">Cím</label><input type="text" className="form-control" value={newClientAddress} onChange={e => setNewClientAddress(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setShowNewClient(false); setNewClientError(''); }}>Mégse</button>
              <button type="button" className="btn btn-primary btn-sm" disabled={creatingClient} onClick={handleCreateClient}>{creatingClient ? <><Loader2 size={13} className="animate-spin" />Létrehozás</> : 'Ügyfél létrehozása'}</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? <><Loader2 size={13} className="animate-spin" />Mentés</> : 'Adatok mentése'}</button>
        </div>
      </form>

      {showMoveCard && (
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>Projekt áthelyezése kollektívába</div>
          {moveDone ? (
            <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 600 }}>
              <Check size={14} style={{ verticalAlign: 'middle', marginRight: '0.35rem' }} />Áthelyezve: <strong>{moveDone.name}</strong>
            </div>
          ) : (
            <>
              <select className="form-control" value={moveTarget} onChange={e => { setMoveTarget(e.target.value); setMoveConfirm(false); }} style={{ marginBottom: '0.65rem' }}>
                <option value="">– Válassz kollektívát –</option>
                {collectives.map(c => <option key={c.collective_id} value={c.collective_id}>{c.name}</option>)}
              </select>
              {moveTarget && !moveConfirm && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMoveConfirm(true)}>Áthelyezés</button>
              )}
              {moveConfirm && (
                <div style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem' }}>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--warning-text)', fontSize: '0.875rem' }}>Figyelem!</div>
                  <p style={{ fontSize: '0.85rem', marginBottom: '0.65rem', color: 'var(--text-primary)' }}>A projekt adatai az összes kollektíva tag számára láthatóvá válnak. <strong>Ez a lépés nem vonható vissza.</strong></p>
                  {moveError && <div style={{ color: 'var(--danger-text)', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{moveError}</div>}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setMoveConfirm(false)} disabled={moving}>Mégse</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={handleMove} disabled={moving}>{moving ? 'Áthelyezés...' : 'Igen, áthelyezem'}</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function ProjectDetailClient({
  project,
  initialUsers,
  initialInvoices,
  initialLabourEntries,
  client,
  clients,
  currentUser,
  isAdmin,
  initialDiaryCount = 0,
  initialRooms = [],
  initialPaymentPlan = [],
  initialInvoiceSplits = [],
}) {
  const router = useRouter();
  const {
    deleteInvoice: ctxDeleteInvoice,
    deleteLabourEntry: ctxDeleteLabourEntry,
    deleteProject: ctxDeleteProject,
    closeProject: ctxCloseProject,
    reopenProject: ctxReopenProject,
    updateInvoice: ctxUpdateInvoice,
    updateLabourEntry: ctxUpdateLabourEntry,
    quotes,
    quoteEntries,
    surveys,
    diaryEntriesByProject,
    fetchDiaryEntries,
    updateDiaryEntry: ctxUpdateDiaryEntry,
    deleteDiaryEntry: ctxDeleteDiaryEntry,
    deleteDiaryPhoto: ctxDeleteDiaryPhoto,
    uploadDiaryPhotos,
    projectRooms: ctxProjectRooms,
    syncRoomsFromQuote,
    createProjectRoom,
    updateProjectRoom,
    deleteProjectRoom,
    quoteSections,
    activeCollectiveId,
    loading: ctxLoading,
    updateProject,
    createClient,
    clients: ctxClients,
    collectives,
    isDemoMode,
  } = useApp();

  const navPrefix = isDemoMode ? '/demo' : '';

  const projectRooms = React.useMemo(() => {
    const sort = arr => [...arr].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || (a.created_at || '').localeCompare(b.created_at || ''));
    const ctx = (ctxProjectRooms || []).filter(r => r.project_id === project.id);
    // Once context has loaded, use it as the sole source of truth so deletions are reflected immediately.
    // Before context loads, merge with initialRooms (server-side prop) to avoid flash of empty content.
    if (!ctxLoading) return sort(ctx);
    const ctxById = Object.fromEntries(ctx.map(r => [r.id, r]));
    const serverById = Object.fromEntries(initialRooms.map(r => [r.id, r]));
    const allIds = new Set([...Object.keys(serverById), ...Object.keys(ctxById)]);
    return sort(Array.from(allIds).map(id => ctxById[id] || serverById[id]));
  }, [ctxProjectRooms, initialRooms, project.id, ctxLoading]);

  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [uploaderFilter, setUploaderFilter] = useState('ALL');
  const [labourUploaderFilter, setLabourUploaderFilter] = useState('ALL');
  const [labourTypeFilter, setLabourTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState('invoices');
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModal, setAlertModal] = useState(null);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState('');
  const [editingDiaryEntry, setEditingDiaryEntry] = useState(null);
  const [editingLabour, setEditingLabour] = useState(null);
  const [detailInvoice, setDetailInvoice] = useState(null);
  const [roomFilter, setRoomFilter] = useState('ALL');
  const [syncing, setSyncing] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [invoiceSplits, setInvoiceSplits] = useState(initialInvoiceSplits);
  const [paymentPlan, setPaymentPlan] = useState(
    initialPaymentPlan.map(item => ({ ...item, files: item.payment_item_files || [] }))
  );
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [uploadingItemIds, setUploadingItemIds] = useState(new Set());
  const [shareTokens, setShareTokens] = useState([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [newTokenLabel, setNewTokenLabel] = useState('');
  const [newTokenExpiry, setNewTokenExpiry] = useState('');
  const [tokenSaving, setTokenSaving] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState(null);

  React.useEffect(() => {
    if (activeTab === 'naplo' && project && !diaryEntriesByProject[project.id]) {
      setDiaryLoading(true);
      fetchDiaryEntries(project.id).catch(() => {}).finally(() => setDiaryLoading(false));
    }
    if (isAdmin && activeTab === 'naplo' && project && shareTokens.length === 0 && !shareLoading) {
      setShareLoading(true);
      fetch(`/api/diary/share?project_id=${project.id}`)
        .then(r => r.json())
        .then(d => { if (d.tokens) setShareTokens(d.tokens); })
        .catch(() => {})
        .finally(() => setShareLoading(false));
    }
  }, [activeTab, project?.id]);

  const projectMemberUsers = React.useMemo(() => {
    // Collective projects: all active collective members are participants regardless of project_members rows
    if (project.collective_id) return initialUsers;
    // Personal projects: only those explicitly in project_members
    return initialUsers.filter(u => (project.members || []).includes(u.id));
  }, [initialUsers, project]);
  const fin = React.useMemo(
    () => calculateProjectFinancials(project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser?.id),
    [project, initialInvoices, initialLabourEntries, projectMemberUsers, currentUser]
  );

  const filteredInvoices = fin.projectInvoices.filter(inv => {
    if (categoryFilter !== 'ALL' && inv.category !== categoryFilter) return false;
    if (uploaderFilter !== 'ALL' && inv.uploaded_by !== uploaderFilter) return false;
    if (roomFilter !== 'ALL') {
      if (roomFilter === 'GENERAL') {
        // Show invoices with no room and no splits
        const hasSplits = invoiceSplits.some(s => s.invoice_id === inv.id);
        if (hasSplits || inv.room_id) return false;
      } else {
        const hasSplit = invoiceSplits.some(s => s.invoice_id === inv.id && s.room_id === roomFilter);
        if (!hasSplit && inv.room_id !== roomFilter) return false;
      }
    }
    return true;
  });

  const filteredLabour = fin.projectLabour.filter(entry => {
    if (roomFilter !== 'ALL' && entry.room_id !== (roomFilter === 'GENERAL' ? null : roomFilter)) return false;
    if (labourUploaderFilter !== 'ALL' && entry.uploaded_by !== labourUploaderFilter) return false;
    if (labourTypeFilter.trim() && !entry.labour_type?.toLowerCase().includes(labourTypeFilter.toLowerCase())) return false;
    return true;
  });

  const canManageProject = isAdmin || project.created_by === currentUser?.id || project.owner_id === currentUser?.id;

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsRef = React.useRef(null);
  React.useEffect(() => {
    if (!showOptionsMenu) return;
    const handler = (e) => { if (optionsRef.current && !optionsRef.current.contains(e.target)) setShowOptionsMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOptionsMenu]);

  const handleDeleteProject = () => {
    setConfirmModal({
      message: `Biztosan törölni kívánja a(z) „${project.name}" projektet? Az összes számla, munkabejegyzés és napló is törlődik.`,
      onConfirm: async () => {
        try {
          await ctxDeleteProject(project.id);
          router.push(`${navPrefix}/projektek`);
        } catch (err) {
          setAlertModal({ message: err.message || 'Hiba a törléskor' });
        }
      }
    });
  };

  const isClosed = !!project.closed_at;

  const handleCloseProject = () => {
    setConfirmModal({
      message: `Lezárja a(z) „${project.name}" projektet? A lezárt projekt újra megnyitható.`,
      onConfirm: async () => {
        try { await ctxCloseProject(project.id); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a lezáráskor' }); }
      }
    });
  };

  const handleReopenProject = async () => {
    try { await ctxReopenProject(project.id); }
    catch (err) { setAlertModal({ message: err.message || 'Hiba a megnyitáskor' }); }
  };

  const handleDeleteInvoice = (invId) => {
    setConfirmModal({
      message: 'Biztosan törölni szeretné ezt a számlát?',
      onConfirm: async () => {
        try { await ctxDeleteInvoice(invId); router.refresh(); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      }
    });
  };

  const handleDeleteLabour = (entryId) => {
    setConfirmModal({
      message: 'Biztosan törölni szeretné ezt a munkabejegyzést?',
      onConfirm: async () => {
        try { await ctxDeleteLabourEntry(entryId); router.refresh(); }
        catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); }
      }
    });
  };

  const handleSaveInvoice = async (invoiceId, fields) => {
    await ctxUpdateInvoice(invoiceId, fields);
    setDetailInvoice(null);
    router.refresh();
    setSuccessMsg('Számla frissítve.');
  };

  const handleSaveSplits = async (invoiceId, splits) => {
    const res = await fetch('/api/invoice-splits', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice_id: invoiceId, splits }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Hiba a szekció felosztás mentésekor');
    setInvoiceSplits(prev => [
      ...prev.filter(s => s.invoice_id !== invoiceId),
      ...(data.splits || []),
    ]);
  };

  const handleCreateToken = async (e) => {
    e.preventDefault();
    setTokenSaving(true);
    try {
      const res = await fetch('/api/diary/share', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ project_id: project.id, label: newTokenLabel.trim() || null, expires_at: newTokenExpiry || null }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba');
      setShareTokens(prev => [data.token, ...prev]);
      setNewTokenLabel(''); setNewTokenExpiry('');
      setShowNewTokenModal(false);
    } catch (err) {
      setAlertModal({ message: err.message });
    } finally {
      setTokenSaving(false);
    }
  };

  const handleDeleteToken = (token) => {
    setConfirmModal({
      message: `Biztosan törölni kívánja a(z) "${token.label || 'Névtelen link'}" megosztási linket?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/diary/share/${token.id}`, { method: 'DELETE' });
          if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Hiba'); }
          setShareTokens(prev => prev.filter(t => t.id !== token.id));
        } catch (err) { setAlertModal({ message: err.message }); }
      }
    });
  };

  const copyLink = (token) => {
    const url = `${window.location.origin}/p/${token.token}`;
    navigator.clipboard.writeText(url).then(() => { setCopiedTokenId(token.id); setTimeout(() => setCopiedTokenId(null), 2000); });
  };


  // One-time room import on first load for projects with a linked quote but no rooms yet
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (syncedRef.current || projectRooms.length > 0) return;
    const linkedQuote = (quotes || []).find(q => q.project_id === project.id);
    if (!linkedQuote) return;
    syncedRef.current = true;
    syncRoomsFromQuote(project.id).catch(() => {});
  }, [project.id, projectRooms.length, quotes]);

  // Room management
  const linkedQuoteForRooms = (quotes || []).find(q => q.project_id === project.id);
  const unimportedSections = linkedQuoteForRooms
    ? (quoteSections || []).filter(s => s.quote_id === linkedQuoteForRooms.id && !projectRooms.some(r => r.source_section_id === s.id))
    : [];

  const handleSaveRoom = async (fields) => {
    if (editingRoom) {
      await updateProjectRoom(project.id, editingRoom.id, fields);
    } else {
      await createProjectRoom(project.id, { ...fields, sort_order: projectRooms.length });
    }
  };

  const handleDeleteRoom = (room) => {
    const invCount = (fin.projectInvoices || []).filter(i => i.room_id === room.id).length;
    const labCount = (fin.projectLabour || []).filter(l => l.room_id === room.id).length;
    const hasEntries = invCount > 0 || labCount > 0;
    const entryNote = hasEntries
      ? ` (${[invCount > 0 ? `${invCount} számla` : '', labCount > 0 ? `${labCount} munkabejegyzés` : ''].filter(Boolean).join(', ')} szekció nélkülivé válik)`
      : '';
    setConfirmModal({
      message: `Biztosan törölni kívánja a(z) "${room.name}" szekciót?${entryNote}`,
      onConfirm: async () => {
        try { await deleteProjectRoom(project.id, room.id); } catch (err) { setAlertModal({ message: err.message }); }
        setConfirmModal(null);
      },
    });
  };

  const handleSyncRooms = async () => {
    setSyncing(true);
    try { await syncRoomsFromQuote(project.id); } catch (err) { setAlertModal({ message: err.message }); } finally { setSyncing(false); }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <Link
          href={currentUser?.role === 'superadmin' ? '/superadmin/projektek' : `${navPrefix}/projektek`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}
        >
          <ArrowLeft size={15} /> Vissza a projektekhez
        </Link>
      </div>

      <CollectiveBanner />

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div className="page-header-row">
          <div>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
                <ShieldCheck size={15} /> Adminisztrátori nézet
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h1 className="page-title" style={{ margin: 0 }}>{project.name}</h1>
              {isClosed && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)', padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
                  Lezárt
                </span>
              )}
            </div>
            <p className="page-subtitle">{project.description || 'Nincs megadott leírás'}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
            <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm">
              <Camera size={15} /> <span>Bejegyzés</span>
            </Link>

            {canManageProject && (
              <div ref={optionsRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowOptionsMenu(v => !v)}
                  title="Beállítások"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                >
                  <Settings size={14} />
                  <ChevronDown size={12} style={{ opacity: 0.7 }} />
                </button>

                {showOptionsMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--bg-card, #fff)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', boxShadow: '0 6px 24px rgba(0,0,0,0.12)', zIndex: 200, minWidth: '170px', padding: '0.3rem', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => { setShowOptionsMenu(false); setEditProjectOpen(true); }}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <Edit3 size={14} color="var(--text-muted)" /> Szerkesztés
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowOptionsMenu(false); isClosed ? handleReopenProject() : handleCloseProject(); }}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-subtle)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <Lock size={14} color="var(--text-muted)" /> {isClosed ? 'Megnyitás' : 'Lezárás'}
                    </button>

                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.25rem 0.3rem' }} />

                    <button
                      type="button"
                      onClick={() => { setShowOptionsMenu(false); handleDeleteProject(); }}
                      style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '0.55rem', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'none', border: 'none', color: 'var(--danger-text)', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-bg)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <Trash2 size={14} /> Törlés
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '1rem' }}>
          <CheckCircle2 size={16} /><span>{successMsg}</span>
        </div>
      )}

      {/* Info row: client, members, dates — always rendered */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.85rem', marginBottom: '0.85rem' }}>
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <BookUser size={13} /> Megrendelő
          </div>
          {client ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{client.name}</div>
              {client.phone && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><Phone size={13} />{client.phone}</div>}
              {client.email && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><Mail size={13} />{client.email}</div>}
              {client.address && <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.825rem', color: 'var(--text-secondary)' }}><MapPin size={13} />{client.address}</div>}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincs megrendelő hozzárendelve</div>
          )}
        </div>

        {(activeCollectiveId || projectMemberUsers.length > 0) && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <Users size={13} /> Résztvevők
          </div>
          {projectMemberUsers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {projectMemberUsers.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                    {u.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, color: u.id === currentUser?.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                    {u.display_name}{u.id === currentUser?.id ? ' (Ön)' : ''}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nincsenek hozzárendelt tagok</div>
          )}
        </div>
        )}

        <CombinedStatsCard
          totalCost={fin.totalCost}
          invoiceCount={fin.projectInvoices.length}
          totalLabour={fin.totalLabourValue}
          labourCount={fin.projectLabour.length}
          collective={!!activeCollectiveId}
          ownPaid={fin.ownPaid}
          balance={fin.balance}
        />

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
            <CalendarDays size={13} /> Adatok
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Kezdés</span>
              <span style={{ fontWeight: 700, color: project.start_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(project.start_date) || '–'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Befejezés</span>
              <span style={{ fontWeight: 700, color: project.end_date ? 'var(--text-primary)' : 'var(--text-muted)' }}>{fmt(project.end_date) || '–'}</span>
            </div>
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Számlák</span>
              <span style={{ fontWeight: 700 }}>{fin.projectInvoices.length} db</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart row: bar chart (40%) + burndown (60%) */}
      <div className="grid-chart" style={{ marginBottom: '1.5rem' }}>
        <CostBreakdownCard
          invoices={fin.projectInvoices}
          labourTotal={fin.totalLabourValue}
        />
        <BurndownCard
          invoices={fin.projectInvoices}
          labourEntries={fin.projectLabour}
          projectRooms={projectRooms}
          startDate={project.start_date}
          endDate={project.end_date}
        />
      </div>

      {/* Sections */}
      {(() => {
        // Invoices that have splits — their cost is tracked via splits, not room_id
        const invoicesWithSplits = new Set(invoiceSplits.map(s => s.invoice_id));
        // Split totals per room
        const splitTotalByRoom = {};
        for (const s of invoiceSplits) {
          splitTotalByRoom[s.room_id] = (splitTotalByRoom[s.room_id] || 0) + Number(s.amount_huf);
        }
        const invoicesByRoom = {};
        const labourByRoom = {};
        for (const inv of fin.projectInvoices) {
          if (invoicesWithSplits.has(inv.id)) continue; // handled via splits
          const key = inv.room_id || 'general';
          invoicesByRoom[key] = (invoicesByRoom[key] || []);
          invoicesByRoom[key].push(inv);
        }
        for (const lab of fin.projectLabour) {
          const key = lab.room_id || 'general';
          labourByRoom[key] = (labourByRoom[key] || []);
          labourByRoom[key].push(lab);
        }
        const roomCost = (roomId) => {
          const invTotal = (invoicesByRoom[roomId] || []).reduce((s, i) => s + Number(i.value_huf || 0), 0);
          const splitTotal = splitTotalByRoom[roomId] || 0;
          const labTotal = (labourByRoom[roomId] || []).reduce((s, l) => s + Number(l.value_huf || 0), 0);
          return invTotal + splitTotal + labTotal;
        };
        return (
          <div style={{ marginBottom: '0.85rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                <Ruler size={13} /> Szekciók ({projectRooms.length})
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                {unimportedSections.length > 0 && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleSyncRooms} disabled={syncing} style={{ fontSize: '0.75rem' }}>
                    {syncing ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={13} />}
                    Import ({unimportedSections.length})
                  </button>
                )}
                <button type="button" className="btn btn-primary btn-sm" style={{ fontSize: '0.75rem' }} onClick={() => { setEditingRoom(null); setRoomModalOpen(true); }}>
                  <Plus size={13} /> Új szekció
                </button>
              </div>
            </div>
            {projectRooms.length === 0 && (
              <div style={{ textAlign: 'center', padding: '1.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem', borderRadius: 'var(--radius-md)', background: 'var(--bg-subtle)' }}>
                <Home size={24} style={{ margin: '0 auto 0.35rem', display: 'block', opacity: 0.4 }} />
                Még nincsenek szekciók. Adj hozzá egyet, vagy importáld az ajánlatból.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(280px, 100%), 1fr))', gap: '0.65rem' }}>
              {projectRooms.map(room => {
                const actual = roomCost(room.id);
                const quoted = room.quoted_amount_net;
                const invCount = (invoicesByRoom[room.id] || []).length;
                const labCount = (labourByRoom[room.id] || []).length;
                return (
                  <div key={room.id} className="card" style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{room.name}</div>
                        {room.size_m2 != null && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                            <Ruler size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{room.size_m2} m²
                          </div>
                        )}
                      </div>
                      {actual > 0 && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{formatHUF(actual)}</div>
                          {quoted != null && (
                            <div style={{ fontSize: '0.68rem', color: actual > quoted ? 'var(--danger-text)' : 'var(--success-text)', fontWeight: 600 }}>
                              {actual > quoted ? '↑' : '↓'} terv: {formatHUF(quoted)}
                            </div>
                          )}
                        </div>
                      )}
                      {actual === 0 && quoted != null && (
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>terv: {formatHUF(quoted)}</div>
                        </div>
                      )}
                    </div>
                    {room.work_types && room.work_types.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.35rem' }}>
                        {room.work_types.map(t => (
                          <span key={t} style={{ fontSize: '0.67rem', fontWeight: 700, padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{t}</span>
                        ))}
                      </div>
                    )}
                    {(invCount > 0 || labCount > 0) && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
                        {invCount > 0 && <span>{invCount} számla</span>}
                        {labCount > 0 && <span>{labCount} munka</span>}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.5rem' }}>
                      <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }} onClick={() => { setEditingRoom(room); setRoomModalOpen(true); }}>
                        <Edit3 size={11} /> Szerkesztés
                      </button>
                      <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.2rem 0.45rem', fontSize: '0.72rem' }} onClick={() => handleDeleteRoom(room)}>
                        <Trash2 size={11} /> Törlés
                      </button>
                    </div>
                  </div>
                );
              })}
              {/* General (unassigned) costs */}
              {(invoicesByRoom['general']?.length > 0 || labourByRoom['general']?.length > 0) && (
                <div className="card" style={{ padding: '0.85rem 1rem', borderStyle: 'dashed' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Általános (szekció nélkül)</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.9rem' }}>{formatHUF(roomCost('general'))}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
                    {(invoicesByRoom['general']?.length || 0) > 0 && <span>{invoicesByRoom['general'].length} számla</span>}
                    {(labourByRoom['general']?.length || 0) > 0 && <span>{labourByRoom['general'].length} munka</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Linked survey */}
      {project.survey_id && (() => {
        const linkedSurvey = (surveys || []).find(s => s.id === project.survey_id);
        if (!linkedSurvey) return null;
        return (
          <div className="card mb-4" style={{ borderLeft: '3px solid var(--accent)', padding: '0.85rem 1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Ruler size={15} color="var(--accent)" />
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Felmérés</div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{linkedSurvey.title}</div>
              </div>
            </div>
            <Link href={`${navPrefix}/felmeres/${linkedSurvey.id}`} className="btn btn-secondary btn-sm"><Ruler size={13} /> Megtekint</Link>
          </div>
        );
      })()}

      {/* Linked quote */}
      {(() => {
        const linkedQuote = (quotes || []).find(q => q.project_id === project.id);
        if (!linkedQuote) return null;
        const entries = (quoteEntries || []).filter(e => e.quote_id === linkedQuote.id);
        const netTotal = entries.reduce((s, e) => s + Number(e.amount_huf || 0), 0);
        const taxRate = Number(linkedQuote.tax_percent ?? 27);
        const grossTotal = netTotal + Math.round(netTotal * taxRate / 100);
        const sc = { draft: 'var(--text-muted)', sent: 'var(--warning-text)', accepted: 'var(--success-text)', rejected: 'var(--danger-text)' };
        const STATUS_LABELS = { draft: 'Tervezet', sent: 'Kiküldve', accepted: 'Elfogadva', rejected: 'Elutasítva' };
        return (
          <div className="card mb-6" style={{ borderLeft: '3px solid var(--accent)', padding: '1rem 1.1rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                <FileText size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>Kapcsolt ajánlat</div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {linkedQuote.title}
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: sc[linkedQuote.status] || 'var(--text-muted)' }}>
                      {STATUS_LABELS[linkedQuote.status] || linkedQuote.status}
                    </span>
                  </div>
                  <div style={{ marginTop: '0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Bruttó: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: 'var(--text-primary)' }}>{formatHUF(grossTotal)}</span>
                  </div>
                </div>
              </div>
              <Link href={`${navPrefix}/ajanlatok/${linkedQuote.id}`} className="btn btn-secondary btn-sm" style={{ flexShrink: 0 }}>
                <FileText size={13} /> Megtekint
              </Link>
            </div>
          </div>
        );
      })()}

      {/* Per-member contribution cards — collective or multi-member project */}
      {(project.collective_id || activeCollectiveId) && fin.memberBreakdown.length > 0 && (
        <div className="mb-6">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
            <Users size={18} color="var(--accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>Résztvevők hozzájárulása</h3>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.75rem' }}>
            {fin.memberBreakdown.map(member => {
              const memberInvoices = fin.projectInvoices.filter(inv => inv.uploaded_by === member.userId);
              const memberLabour   = fin.projectLabour.filter(e => e.uploaded_by === member.userId);
              const total = member.paid + member.labourValue;
              const isSelf         = member.userId === currentUser?.id;
              const memberUser     = projectMemberUsers.find(u => u.id === member.userId);
              const isCollectiveOwner = memberUser?.collective_role === 'owner';

              const cardBorder = isCollectiveOwner
                ? '2px solid #7c3aed'
                : isSelf
                  ? '2px solid var(--accent-border)'
                  : undefined;

              return (
                <div key={member.userId} className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: cardBorder }}>
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{member.displayName}</span>
                      {isCollectiveOwner && <span style={{ fontSize: '0.65rem', color: '#7c3aed', background: '#ede9fe', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Tulajdonos</span>}
                      {isSelf && <span style={{ fontSize: '0.65rem', color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Ön</span>}
                      {member.deletedAt && <span style={{ fontSize: '0.65rem', color: '#fff', background: 'var(--danger)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-pill)', fontWeight: 700 }}>Kilépett</span>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>{formatHUF(total)}</span>
                  </div>

                  {/* Invoices */}
                  {memberInvoices.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Receipt size={11} /> Számlák</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontWeight: 700 }}>{formatHUF(member.paid)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {memberInvoices.map(inv => (
                          <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{inv.description || inv.category}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0, marginLeft: '0.5rem' }}>{formatHUF(inv.value_huf)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Labour */}
                  {memberLabour.length > 0 && (
                    <div style={{ borderTop: memberInvoices.length > 0 ? '1px solid var(--border-subtle)' : 'none', paddingTop: memberInvoices.length > 0 ? '0.65rem' : 0 }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Hammer size={11} /> Munkadíj</span>
                        <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--success-text)', fontWeight: 700 }}>+{formatHUF(member.labourValue)}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                        {memberLabour.map(e => (
                          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', padding: '0.2rem 0' }}>
                            <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                              {e.labour_type}{e.hours ? ` · ${e.hours} ${e.unit || 'h'}` : ''}
                            </span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '0.78rem', flexShrink: 0, marginLeft: '0.5rem', color: 'var(--success-text)' }}>+{formatHUF(e.value_huf)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {memberInvoices.length === 0 && memberLabour.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Még nincs rögzített tétel.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '1rem', borderBottom: '2px solid var(--border-subtle)', paddingBottom: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {[
          { key: 'invoices', label: `Számlák (${fin.projectInvoices.length})`, icon: Receipt },
          { key: 'labour', label: `Munka (${fin.projectLabour.length})`, icon: Hammer },
          { key: 'naplo', label: `Napló (${diaryEntriesByProject[project.id]?.length ?? initialDiaryCount})`, icon: BookOpen },
          { key: 'payment', label: `Fizetési terv (${paymentPlan.length})`, icon: Wallet },
        ].map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1rem', borderRadius: 0, border: 'none', borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: '-2px', background: 'transparent', cursor: 'pointer', fontWeight: activeTab === tab.key ? 800 : 600, color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '0.875rem', transition: 'all 0.15s ease', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <tab.icon size={15} />{tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'invoices' && (
        <>
          <div className="invoice-filters">
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
              <option value="ALL">Minden kategória</option>
              {INVOICE_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select value={uploaderFilter} onChange={e => setUploaderFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
              <option value="ALL">Minden feltöltő</option>
              {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
            {projectRooms.length > 0 && (
              <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden szekció</option>
                <option value="GENERAL">Általános (szekció nélkül)</option>
                {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}><Plus size={15} /> Új bejegyzés</Link>
          </div>
          {filteredInvoices.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Receipt size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs megjeleníthető számla</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Ehhez a szűréshez még nem rögzítettek számlát.</p>
              <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Számla hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
              {filteredInvoices.map(inv => (
                <InvoiceCard key={inv.id} invoice={inv} room={projectRooms.find(r => r.id === inv.room_id) || null} onClick={() => setDetailInvoice(inv)} />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'labour' && (
        <>
          <div className="invoice-filters">
            <input
              type="text"
              className="form-control"
              placeholder="Szűrés típus szerint…"
              value={labourTypeFilter}
              onChange={e => setLabourTypeFilter(e.target.value)}
              style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}
            />
            <select value={labourUploaderFilter} onChange={e => setLabourUploaderFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
              <option value="ALL">Minden feltöltő</option>
              {projectMemberUsers.map(u => <option key={u.id} value={u.id}>{u.display_name}</option>)}
            </select>
            {projectRooms.length > 0 && (
              <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)} className="form-control" style={{ padding: '0.4rem 0.75rem', minHeight: '38px' }}>
                <option value="ALL">Minden szekció</option>
                <option value="GENERAL">Általános (szekció nélkül)</option>
                {projectRooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            )}
            <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}><Plus size={15} /> Új bejegyzés</Link>
          </div>

          {filteredLabour.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <Hammer size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs rögzített munka</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>A saját elvégzett munkák itt jelennek meg.</p>
              <Link href={`${navPrefix}/projektek/${project.id}/feltoltes`} className="btn btn-primary btn-sm"><Plus size={15} /> Munkabejegyzés hozzáadása</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
              {filteredLabour.map((entry) => {
                const uploader = initialUsers.find(u => u.id === entry.uploaded_by);
                const canManageEntry = isAdmin || canManageProject || entry.uploaded_by === currentUser?.id;
                const entryRoom = projectRooms.find(r => r.id === entry.room_id) || null;
                return (
                  <div key={entry.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.85rem' }}>
                    <div>
                      {/* Top row: type badge + amount — mirrors InvoiceCard */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-pill)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>
                          <Hammer size={11} /> Munkadíj
                        </span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success-text)', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>
                          +{formatHUF(entry.value_huf)}
                        </span>
                      </div>

                      {/* Labour type — mirrors InvoiceCard description h4 */}
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
                        {entry.labour_type}
                      </h4>

                      {/* Metadata row — same structure as InvoiceCard */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)', alignItems: 'center' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <User size={13} color="var(--accent)" />
                          <strong style={{ color: 'var(--text-secondary)' }}>{uploader?.display_name || 'Ismeretlen'}</strong>
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Calendar size={13} />
                          {formatDate(entry.date)}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={12} />
                          {entry.hours} {entry.unit || 'h'} × {formatHUF(entry.hourly_rate)}
                        </span>
                        {entryRoom ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.72rem' }}>
                            <Home size={10} />{entryRoom.name}
                          </span>
                        ) : (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem' }}>
                            <Home size={10} />Általános
                          </span>
                        )}
                      </div>

                      {entry.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>{entry.description}</div>
                      )}

                      {/* Last-edit audit */}
                      {entry.updated_at && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <PencilLine size={10} />
                          {entry.updated_by_name ? `${entry.updated_by_name} · ` : ''}{formatDate(entry.updated_at)}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '0.65rem', borderTop: '1px solid var(--border-subtle)', gap: '0.35rem' }}>
                      {canManageEntry && (
                        <button type="button" onClick={() => setEditingLabour(entry)} className="btn btn-secondary btn-sm" title="Szerkesztés">
                          <Edit3 size={13} />
                        </button>
                      )}
                      {canManageEntry && (
                        <button type="button" onClick={() => handleDeleteLabour(entry.id)} className="btn btn-danger btn-sm" title="Törlés">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === 'payment' && (() => {
        const today = new Date().toISOString().slice(0, 10);
        const totalExpected = paymentPlan.reduce((s, i) => s + Number(i.amount_huf || 0), 0);
        const totalPaid = paymentPlan.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.amount_huf || 0), 0);

        const handleCreatePayment = async (fields) => {
          const res = await fetch('/api/payment-plan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ project_id: project.id, ...fields }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Hiba');
          setPaymentPlan(prev => [...prev, { ...data.item, files: [] }]);
          setToast('Fizetési tétel hozzáadva.');
          setTimeout(() => setToast(''), 2500);
        };

        const handleUpdatePayment = async (itemId, fields) => {
          const res = await fetch(`/api/payment-plan/${itemId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fields),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Hiba');
          setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...data.item, files: i.files || [] } : i));
        };

        const handleFileUpload = async (itemId, files) => {
          if (!files || files.length === 0) return;
          setUploadingItemIds(prev => new Set(prev).add(itemId));
          try {
            for (const file of Array.from(files)) {
              const fd = new FormData();
              fd.append('file', file);
              const res = await fetch(`/api/payment-plan/${itemId}/files`, { method: 'POST', body: fd });
              const data = await res.json();
              if (!res.ok) { setAlertModal({ message: data.error || 'Feltöltési hiba' }); continue; }
              setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...i, files: [...(i.files || []), data.file] } : i));
            }
            setToast('Fájl feltöltve.');
            setTimeout(() => setToast(''), 2500);
          } finally {
            setUploadingItemIds(prev => { const s = new Set(prev); s.delete(itemId); return s; });
          }
        };

        const handleFileDelete = (itemId, fileId) => {
          setConfirmModal({
            message: 'Biztosan törölni kívánja ezt a mellékletet?',
            onConfirm: async () => {
              const res = await fetch(`/api/payment-plan/${itemId}/files/${fileId}`, { method: 'DELETE' });
              if (!res.ok) { const d = await res.json(); setAlertModal({ message: d.error }); return; }
              setPaymentPlan(prev => prev.map(i => i.id === itemId ? { ...i, files: (i.files || []).filter(f => f.id !== fileId) } : i));
            },
          });
        };

        const handleDeletePayment = (item) => {
          setConfirmModal({
            message: `Biztosan törölni kívánja a(z) „${item.label}" fizetési tételt?`,
            onConfirm: async () => {
              const res = await fetch(`/api/payment-plan/${item.id}`, { method: 'DELETE' });
              if (!res.ok) { const d = await res.json(); setAlertModal({ message: d.error }); return; }
              setPaymentPlan(prev => prev.filter(i => i.id !== item.id));
              setToast('Fizetési tétel törölve.');
              setTimeout(() => setToast(''), 2500);
            },
          });
        };

        const handleMarkPaid = async (item) => {
          try {
            await handleUpdatePayment(item.id, { status: 'paid' });
            setToast('Fizetve jelölve!');
            setTimeout(() => setToast(''), 2500);
          } catch (err) {
            setAlertModal({ message: err.message });
          }
        };

        return (
          <>
            {/* Summary + add button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
              {paymentPlan.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Várható: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{totalExpected.toLocaleString('hu-HU')} Ft</strong>
                  </div>
                  {totalPaid > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--success-text)' }}>
                      Fizetve: <strong style={{ fontFamily: 'var(--font-mono)' }}>{totalPaid.toLocaleString('hu-HU')} Ft</strong>
                    </div>
                  )}
                </div>
              )}
              {isAdmin && (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}
                >
                  <Plus size={15} /> Új tétel
                </button>
              )}
            </div>

            {paymentPlan.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
                <Wallet size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Nincs fizetési terv</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>
                  Add meg a projekt részletfizetéseit — az ügyfél a portálján látni fogja ezeket.
                </p>
                {isAdmin && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => { setEditingPayment(null); setShowPaymentModal(true); }}>
                    <Plus size={15} /> Első tétel hozzáadása
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {paymentPlan.map((item, idx) => {
                  const isOverdue = item.status === 'pending' && item.due_date && item.due_date < today;
                  const statusKey = isOverdue ? 'overdue' : item.status;
                  const statusDisplay = isOverdue
                    ? { label: 'Lejárt', bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' }
                    : (STATUS_DISPLAY[item.status] || STATUS_DISPLAY.pending);
                  const triggerDisplay = TRIGGER_DISPLAY[item.trigger_type] || TRIGGER_DISPLAY.milestone;

                  return (
                    <div key={item.id} className="card" style={{ padding: '1rem 1.1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                        {/* Left: label + trigger + milestone */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{item.label}</span>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)', background: statusDisplay.bg, color: statusDisplay.color, border: `1px solid ${statusDisplay.border}` }}>
                              {statusDisplay.label}
                            </span>
                          </div>

                          {/* Trigger info */}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', background: triggerDisplay.bg, color: triggerDisplay.color, border: `1px solid ${triggerDisplay.border}` }}>
                              {triggerDisplay.label}
                            </span>
                            {item.trigger_type === 'milestone' && item.milestone_name && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                → {item.milestone_name}
                              </span>
                            )}
                            {item.trigger_type === 'date' && item.due_date && (
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Calendar size={12} />
                                {new Date(item.due_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {item.note && (
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0', fontStyle: 'italic' }}>{item.note}</p>
                          )}
                          {item.status === 'paid' && item.paid_at && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--success-text)', margin: '0.25rem 0 0', fontWeight: 600 }}>
                              Fizetve: {new Date(item.paid_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          )}

                          {/* Files */}
                          {((item.files || []).length > 0 || isAdmin) && (
                            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                              {(item.files || []).length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '0.5rem', marginBottom: isAdmin ? '0.55rem' : 0 }}>
                                  {(item.files || []).map(f => {
                                    const isImg = f.mime_type?.startsWith('image/');
                                    const isPdf = f.mime_type === 'application/pdf' || f.file_name?.toLowerCase().endsWith('.pdf');
                                    const ext = f.file_name?.split('.').pop()?.toUpperCase() || '?';
                                    const docColors = {
                                      PDF: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
                                      DOC: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                                      DOCX: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                                      XLS: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                                      XLSX: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                                    };
                                    const dc = docColors[ext] || { bg: 'var(--bg-subtle)', color: 'var(--text-muted)', border: 'var(--border-subtle)' };
                                    return (
                                      <div key={f.id} style={{ position: 'relative' }}>
                                        <a
                                          href={f.file_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: `1px solid ${isImg ? 'var(--border-subtle)' : dc.border}`, background: isImg ? 'var(--bg-subtle)' : dc.bg, aspectRatio: '1', textDecoration: 'none', cursor: 'pointer' }}
                                        >
                                          {isImg ? (
                                            <img src={f.file_url} alt={f.file_name || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                          ) : (
                                            <>
                                              <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>{isPdf ? '📄' : '📎'}</span>
                                              <span style={{ fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: dc.color, padding: '0.1rem 0.3rem', borderRadius: 3, background: 'rgba(255,255,255,0.6)' }}>{ext}</span>
                                            </>
                                          )}
                                        </a>
                                        <div style={{ marginTop: '0.2rem', fontSize: '0.65rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center', maxWidth: '100%' }} title={f.file_name}>
                                          {f.file_name || 'fájl'}
                                        </div>
                                        {isAdmin && (
                                          <button
                                            type="button"
                                            onClick={() => handleFileDelete(item.id, f.id)}
                                            style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(220,38,38,0.85)', border: 'none', borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}
                                            title="Törlés"
                                          >
                                            <X size={10} />
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                              {isAdmin && (
                                <>
                                  <input
                                    type="file"
                                    id={`file-upload-${item.id}`}
                                    multiple
                                    style={{ display: 'none' }}
                                    onChange={e => { handleFileUpload(item.id, e.target.files); e.target.value = ''; }}
                                  />
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}
                                    disabled={uploadingItemIds.has(item.id)}
                                    onClick={() => document.getElementById(`file-upload-${item.id}`).click()}
                                  >
                                    {uploadingItemIds.has(item.id) ? <><Loader2 size={11} className="animate-spin" /> Feltöltés...</> : <><Plus size={11} /> Melléklet</>}
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Right: amount + actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1rem', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                            {Number(item.amount_huf).toLocaleString('hu-HU')} Ft
                          </div>
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {item.status === 'pending' && (
                                <button
                                  type="button"
                                  className="btn btn-sm"
                                  style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', fontWeight: 700, fontSize: '0.75rem' }}
                                  onClick={() => handleMarkPaid(item)}
                                  title="Fizetve jelöl"
                                >
                                  <CheckCircle2 size={13} /> Fizetve
                                </button>
                              )}
                              <button type="button" className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setEditingPayment(item); setShowPaymentModal(true); }} title="Szerkesztés">
                                <Edit3 size={13} />
                              </button>
                              <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => handleDeletePayment(item)} title="Törlés">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Total bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1.1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginTop: '0.25rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Összesen</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: '1.05rem', color: 'var(--text-primary)' }}>{totalExpected.toLocaleString('hu-HU')} Ft</span>
                </div>
              </div>
            )}

            <PaymentPlanModal
              isOpen={showPaymentModal}
              onClose={() => { setShowPaymentModal(false); setEditingPayment(null); }}
              onSave={editingPayment
                ? (fields) => handleUpdatePayment(editingPayment.id, fields).then(() => { setShowPaymentModal(false); setEditingPayment(null); setToast('Tétel frissítve.'); setTimeout(() => setToast(''), 2500); })
                : handleCreatePayment
              }
              editItem={editingPayment}
              itemCount={paymentPlan.length}
            />
          </>
        );
      })()}

      {activeTab === 'naplo' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                const url = `${window.location.origin}/naplo/${project.id}`;
                navigator.clipboard.writeText(url).then(() => {
                  setToast('Ügyfél link másolva!');
                  setTimeout(() => setToast(''), 2500);
                });
              }}
            >
              <Copy size={14} /> Ügyfél link
            </button>
            <Link href={`${navPrefix}/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Új bejegyzés</Link>
          </div>
          {diaryLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem', color: 'var(--text-muted)' }}>Betöltés...</div>
          ) : !diaryEntriesByProject[project.id] || diaryEntriesByProject[project.id].length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2.5rem 1.5rem' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 0.5rem' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.25rem' }}>Még nincs bejegyzés ebben a naplóban</h4>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.825rem', marginBottom: '1rem' }}>Az első fotós bejegyzéssel kezd el dokumentálni a munkát.</p>
              <Link href={`${navPrefix}/projektek/${project.id}/naplo/uj`} className="btn btn-primary btn-sm"><Plus size={15} /> Első bejegyzés</Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(320px, 100%), 1fr))', gap: '0.85rem' }}>
              {(diaryEntriesByProject[project.id] || []).map(entry => {
                const entryDateStr = entry.entry_date ? new Date(entry.entry_date).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }) : null;
                const author = initialUsers.find(u => u.id === entry.created_by);
                const canDelete = entry.created_by === currentUser?.id || isAdmin;
                return (
                  <div key={entry.id} className="card" style={{ padding: '1rem' }}>
                    {/* Header row: badges + actions */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.6rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', alignItems: 'center' }}>
                        {entryDateStr && <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-light)', padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)' }}>{entryDateStr}</span>}
                        {entry.work_type && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)' }}>{entry.work_type}</span>}
                        {(() => { const r = projectRooms.find(r => r.id === entry.room_id); return r ? <span style={{ fontSize: '0.68rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.12rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)' }}><Home size={10} />{r.name}</span> : null; })()}
                        {/* Public/private pill */}
                        {isAdmin || entry.created_by === currentUser?.id ? (
                          <button
                            type="button"
                            onClick={async () => {
                              try { await ctxUpdateDiaryEntry(entry.id, { title: entry.title, body: entry.body, work_type: entry.work_type, internal_note: entry.internal_note, client_note: entry.client_note, entry_date: entry.entry_date, is_public: !entry.is_public }); }
                              catch (err) { setAlertModal({ message: err.message }); }
                            }}
                            style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', border: entry.is_public ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)', background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                          >
                            {entry.is_public ? <><Eye size={10} /> Nyilvános</> : <><Lock size={10} /> Privát</>}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: 'var(--radius-pill)', border: entry.is_public ? '1px solid var(--success-border)' : '1px solid var(--border-subtle)', background: entry.is_public ? 'var(--success-bg)' : 'var(--bg-subtle)', color: entry.is_public ? 'var(--success-text)' : 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            {entry.is_public ? <><Eye size={10} /> Nyilvános</> : <><Lock size={10} /> Privát</>}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                        {(isAdmin || entry.created_by === currentUser?.id) && (
                          <Link href={`${navPrefix}/projektek/${project.id}/naplo/${entry.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.25rem 0.5rem' }}>
                            <Edit3 size={13} />
                          </Link>
                        )}
                        {canDelete && (
                          <button type="button" className="btn btn-danger btn-sm" style={{ padding: '0.25rem 0.5rem' }} onClick={() => setConfirmModal({ message: 'Biztosan törölni kívánja ezt a naplóbejegyzést?', onConfirm: async () => { try { await ctxDeleteDiaryEntry(entry.id, project.id); } catch (err) { setAlertModal({ message: err.message || 'Hiba a törléskor' }); } } })}>
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Title + author */}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.3rem' }}>{entry.title}</h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.6rem' }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, color: 'var(--accent)', flexShrink: 0 }}>
                        {(author?.display_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.775rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{author?.display_name || 'Ismeretlen'}</span>
                    </div>

                    {entry.body && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 0.65rem', whiteSpace: 'pre-wrap' }}>{entry.body}</p>}

                    {/* Internal note — team only */}
                    {entry.internal_note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                          <Lock size={11} /> Belső megjegyzés
                        </div>
                        {entry.internal_note}
                      </div>
                    )}

                    {/* Client note */}
                    {entry.client_note && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', borderRadius: 'var(--radius-md)', padding: '0.55rem 0.75rem', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.25rem' }}>
                          <Eye size={11} /> Ügyfélnek szóló üzenet
                        </div>
                        {entry.client_note}
                      </div>
                    )}

                    <EntryMediaGrid photos={entry.photos} />
                  </div>
                );
              })}
            </div>
          )}

        </>
      )}

      {editingLabour && (
        <LabourEditModal
          entry={editingLabour}
          rooms={projectRooms}
          onClose={() => setEditingLabour(null)}
          onSave={async (fields) => {
            await ctxUpdateLabourEntry(editingLabour.id, fields);
            router.refresh();
            setEditingLabour(null);
            setSuccessMsg('Munkabejegyzés frissítve.');
          }}
        />
      )}

      <ProjectEditModal
        isOpen={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
        project={project}
        clients={ctxClients}
        collectives={collectives}
        activeCollectiveId={activeCollectiveId}
        onSave={async (fields) => { await updateProject(project.id, fields); router.refresh(); }}
        onCreateClient={async (fields) => createClient(fields)}
        onMove={async (collectiveId) => { await updateProject(project.id, { collective_id: collectiveId }); router.refresh(); }}
      />
      <RoomModal isOpen={roomModalOpen} onClose={() => setRoomModalOpen(false)} room={editingRoom} onSave={handleSaveRoom} />
      <ConfirmModal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} onConfirm={() => confirmModal?.onConfirm()} title="Megerősítés" message={confirmModal?.message} />
      <AlertModal isOpen={!!alertModal} onClose={() => setAlertModal(null)} message={alertModal?.message} />

      <EditDiaryEntryModal
        isOpen={!!editingDiaryEntry}
        onClose={() => setEditingDiaryEntry(null)}
        rooms={projectRooms}
        entry={editingDiaryEntry
          ? (diaryEntriesByProject[project.id]?.find(e => e.id === editingDiaryEntry.id) ?? editingDiaryEntry)
          : null
        }
        onSave={async (id, fields, newFiles) => {
          let addPhotoIds = [];
          if (newFiles && newFiles.length > 0) {
            const uploaded = await uploadDiaryPhotos(project.id, newFiles);
            addPhotoIds = uploaded.map(p => p.id);
          }
          await ctxUpdateDiaryEntry(id, { ...fields, add_photo_ids: addPhotoIds });
          setSuccessMsg('Bejegyzés frissítve.');
        }}
        onDeletePhoto={async (photoId) => {
          await ctxDeleteDiaryPhoto(photoId, project.id);
        }}
      />

      {/* Invoice detail drawer */}
      {detailInvoice && (
        <InvoiceDetailDrawer
          invoice={detailInvoice}
          isAdmin={isAdmin || canManageProject || detailInvoice?.uploaded_by === currentUser?.id}
          rooms={projectRooms}
          splits={invoiceSplits.filter(s => s.invoice_id === detailInvoice.id)}
          onClose={() => setDetailInvoice(null)}
          onDelete={handleDeleteInvoice}
          onSave={handleSaveInvoice}
          onSaveSplits={handleSaveSplits}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#fff', borderRadius: 'var(--radius-pill)',
          padding: '0.65rem 1.15rem', fontSize: '0.875rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', zIndex: 500,
          whiteSpace: 'nowrap', animation: 'fadeInUp 0.2s ease',
        }}>
          <CheckCircle2 size={16} color="#4ade80" /> {toast}
        </div>
      )}
    </div>
  );
}
