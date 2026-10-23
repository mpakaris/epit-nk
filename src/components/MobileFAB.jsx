'use client';

import React, { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Plus, Camera, Ruler, FileText, FolderKanban, Receipt, X } from 'lucide-react';
import QuickSnapModal from './QuickSnapModal';
import InvoiceSnapModal from './InvoiceSnapModal';

// Order: bottom-first (closest to + button). flex-direction: column-reverse
// stacks them so ACTIONS[0] ends up at the bottom of the popup list.
// action = 'nav' navigates to path; action = 'invoice' opens the invoice snap flow.
const ACTIONS = [
  { icon: Receipt,      label: 'Új Számla',   action: 'invoice',                             bg: 'linear-gradient(135deg, #3d1a1a 0%, #8b3a3a 100%)' },
  { icon: FolderKanban, label: 'Új Projekt',  action: 'nav', path: '/projektek?create=1',    bg: 'linear-gradient(135deg, #1e1458 0%, #4c35a0 100%)' },
  { icon: FileText,     label: 'Új Ajánlat',  action: 'nav', path: '/ajanlatok/uj',          bg: 'linear-gradient(135deg, #0d2d1e 0%, #1e6b45 100%)' },
  { icon: Ruler,        label: 'Új Felmérés', action: 'nav', path: '/felmeres/uj',           bg: 'linear-gradient(135deg, #0f2240 0%, #1e4d8c 100%)' },
];

const HIDDEN_PREFIXES = ['/feltoltes', '/nyomtatas'];

export default function MobileFAB() {
  const router   = useRouter();
  const pathname = usePathname();
  const { isDemoMode, isSuperAdmin, impersonating } = useApp();
  const navPrefix = isDemoMode ? '/demo' : '';

  const [expanded, setExpanded]           = useState(false);
  const [snapFile, setSnapFile]           = useState(null);   // QuickSnapModal
  const [invoiceFile, setInvoiceFile]     = useState(null);   // InvoiceSnapModal

  const snapRef    = useRef(null);   // camera button → QuickSnapModal
  const invoiceRef = useRef(null);   // Új Számla    → InvoiceSnapModal

  const hidden = HIDDEN_PREFIXES.some(p => pathname.includes(p))
    || (isSuperAdmin && !impersonating);
  if (hidden) return null;

  const handleAction = (item) => {
    setExpanded(false);
    if (item.action === 'invoice') {
      invoiceRef.current?.click();
    } else {
      router.push(navPrefix + item.path);
    }
  };

  return (
    <>
      {expanded && (
        <div className="fab-overlay" onClick={() => setExpanded(false)} />
      )}

      <div className="mobile-fab-root">
        <div className="fab-anchor">
          {ACTIONS.map((action, i) => (
            <button
              key={action.label}
              className={`fab-action${expanded ? ' visible' : ''}`}
              style={{ '--delay': `${i * 45}ms`, background: action.bg }}
              onClick={() => handleAction(action)}
              aria-label={action.label}
            >
              <action.icon size={20} color="#fff" />
              <span className="fab-action-label">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="fab-stack">
          <button
            className={`fab-main${expanded ? ' active' : ''}`}
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Bezárás' : 'Gyors létrehozás'}
          >
            {expanded ? <X size={22} /> : <Plus size={24} />}
          </button>

          <button
            className="fab-camera"
            onClick={() => snapRef.current?.click()}
            aria-label="Gyors fotó"
          >
            <Camera size={20} />
          </button>
        </div>
      </div>

      {/* Camera snap → QuickSnapModal */}
      <input
        ref={snapRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setSnapFile(f); e.target.value = ''; }}
      />

      {/* Invoice file picker (image or PDF) → InvoiceSnapModal */}
      <input
        ref={invoiceRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) setInvoiceFile(f); e.target.value = ''; }}
      />

      {snapFile && (
        <QuickSnapModal file={snapFile} onClose={() => setSnapFile(null)} />
      )}

      {invoiceFile && (
        <InvoiceSnapModal file={invoiceFile} onClose={() => setInvoiceFile(null)} />
      )}
    </>
  );
}
