'use client';

import React, { useEffect } from 'react';

import { Trash2, Copy, PenLine, ExternalLink, X, ArrowUpRight } from 'lucide-react';

export default function BottomSheet({ isOpen, onClose, title, subtitle, onOpen, onDuplicate, onRename, onTransfer, onDelete, actions }) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  if (!isOpen) return null;

  const Row = ({ icon: Icon, label, color, onClick, danger }) => (
    <button
      type="button"
      onClick={() => { onClose(); onClick?.(); }}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', minHeight: 56, padding: '0 20px',
        background: 'transparent', border: 'none', cursor: 'pointer',
        fontSize: 17, fontWeight: 500, color: danger ? 'var(--danger-text)' : 'var(--text-primary)',
        textAlign: 'left',
      }}
    >
      <Icon size={20} strokeWidth={1.75} color={danger ? 'var(--danger-text)' : 'var(--text-secondary)'} aria-hidden="true" />
      {label}
    </button>
  );

  return (
    <>
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 200 }}
        aria-hidden="true"
      />
      <div role="dialog" aria-modal="true" className="bs-panel">
        {/* Drag handle — hidden on desktop via CSS */}
        <div className="bs-handle" style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border-subtle)' }} />
        </div>

        {/* Header */}
        <div style={{ padding: '12px 20px 12px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', lineHeight: '22px' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: '20px', marginTop: 2 }}>{subtitle}</div>}
        </div>

        {onOpen && <Row icon={ExternalLink} label="Megnyitás" onClick={onOpen} />}
        {onDuplicate && <Row icon={Copy} label="Duplikálás" onClick={onDuplicate} />}
        {onRename && <Row icon={PenLine} label="Átnevezés" onClick={onRename} />}
        {onTransfer && <Row icon={ArrowUpRight} label="Áthelyezés kollektívába" onClick={onTransfer} />}

        {actions?.map((a, i) => (
          <React.Fragment key={i}>
            {a.dividerBefore && <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />}
            <Row icon={a.icon} label={a.label} onClick={a.onClick} danger={a.danger} />
          </React.Fragment>
        ))}

        {onDelete && (
          <>
            <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
            <Row icon={Trash2} label="Törlés" onClick={onDelete} danger />
          </>
        )}
      </div>
    </>
  );
}
