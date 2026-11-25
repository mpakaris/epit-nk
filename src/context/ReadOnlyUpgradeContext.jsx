'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Lock, Sparkles, AlertTriangle } from 'lucide-react';
import UpgradeModal from '@/components/UpgradeModal';
import { AlertModal } from '@/components/Modal';
import { useApp } from '@/context/AppContext';

const Ctx = createContext({ openUpgrade: () => {}, openContactOwner: () => {} });

/**
 * Wrap any detail page (or subtree) with this provider.
 * openUpgrade()       — shows the Premium upgrade modal (for document owners)
 * openContactOwner()  — shows "contact the collective owner" alert (for contributors)
 */
export function ReadOnlyUpgradeProvider({ children }) {
  const [upgradeOpen,      setUpgradeOpen]      = useState(false);
  const [contactOwnerOpen, setContactOwnerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <Ctx.Provider value={{
      openUpgrade:      () => setUpgradeOpen(true),
      openContactOwner: () => setContactOwnerOpen(true),
    }}>
      {children}
      {mounted && createPortal(
        <>
          <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} mode="readOnly" />
          <AlertModal
            isOpen={contactOwnerOpen}
            onClose={() => setContactOwnerOpen(false)}
            variant="warning"
            title="Kollektíva felfüggesztve"
            message="Ez a dokumentum felfüggesztett kollektívában van. Kérd a kollektíva tulajdonosát, hogy frissítse az előfizetését."
          />
        </>,
        document.body
      )}
    </Ctx.Provider>
  );
}

/** Returns { openUpgrade, openContactOwner } */
export function useReadOnlyUpgradeContext() {
  return useContext(Ctx);
}

// ── Mobile bottom-sheet variants ─────────────────────────────────────────────

function UpgradeSheet({ onClose }) {
  const t = useTranslations('upgrade');
  const { isDemoMode } = useApp();
  const href = `${isDemoMode ? '/demo' : ''}/elofizetes`;
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, background: 'var(--m-sheet, #F5F5F5)', borderRadius: '32px 32px 0 0', padding: '8px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 20px' }} />
        <div style={{ width: 56, height: 56, borderRadius: 18, background: 'linear-gradient(135deg, #1F2A3C, #3A4963)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Lock size={24} color="#fff" aria-hidden="true" />
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: 'var(--m-ink, #0E1116)', letterSpacing: '-0.02em', fontFamily: "'Bricolage Grotesque', sans-serif", textAlign: 'center' }}>
          {t('readOnlyTitle')}
        </h2>
        <p style={{ margin: '0 0 20px', fontSize: 15, color: '#5A5F68', lineHeight: 1.6, fontWeight: 500, textAlign: 'center' }}>
          {t('readOnlyBody')}
        </p>
        <div style={{ background: '#EDEBE5', borderRadius: 16, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Sparkles size={14} color="#1F2A3C" aria-hidden="true" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#1F2A3C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t('premiumLabel')}</span>
          </div>
          {[t('bullet1'), t('bullet2'), t('bullet3')].map(item => (
            <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: '#1F2A3C', flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: '#3A3F4A', lineHeight: 1.4 }}>{item}</span>
            </div>
          ))}
        </div>
        <Link href={href} onClick={onClose} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, borderRadius: 28, background: '#1F2A3C', color: '#fff', fontSize: 16, fontWeight: 800, textDecoration: 'none', marginBottom: 10 }}>
          <Sparkles size={16} aria-hidden="true" />
          {t('cta')}
        </Link>
        <button type="button" onClick={onClose} style={{ width: '100%', height: 50, border: '1.5px solid #D5D2C8', borderRadius: 25, background: 'transparent', color: '#6B7080', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          {t('dismiss')}
        </button>
      </div>
    </>
  );
}

function ContactOwnerSheet({ onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300 }} />
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 301, background: 'var(--m-sheet, #F5F5F5)', borderRadius: '32px 32px 0 0', padding: '8px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.15)', margin: '0 auto 20px' }} />
        <div style={{ width: 56, height: 56, borderRadius: 18, background: '#FFF1E0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <AlertTriangle size={24} color="#C45200" aria-hidden="true" />
        </div>
        <h2 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 800, color: 'var(--m-ink, #0E1116)', letterSpacing: '-0.02em', fontFamily: "'Bricolage Grotesque', sans-serif", textAlign: 'center' }}>
          Kollektíva felfüggesztve
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 15, color: '#5A5F68', lineHeight: 1.6, fontWeight: 500, textAlign: 'center' }}>
          Ez a dokumentum felfüggesztett kollektívában van. Kérd a kollektíva tulajdonosát, hogy frissítse az előfizetését.
        </p>
        <button type="button" onClick={onClose} style={{ width: '100%', height: 50, border: '1.5px solid #D5D2C8', borderRadius: 25, background: 'transparent', color: '#6B7080', fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Bezárás
        </button>
      </div>
    </>
  );
}

export function ReadOnlyUpgradeMobileProvider({ children }) {
  const [upgradeOpen,      setUpgradeOpen]      = useState(false);
  const [contactOwnerOpen, setContactOwnerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <Ctx.Provider value={{
      openUpgrade:      () => setUpgradeOpen(true),
      openContactOwner: () => setContactOwnerOpen(true),
    }}>
      {children}
      {mounted && createPortal(
        <>
          {upgradeOpen      && <UpgradeSheet      onClose={() => setUpgradeOpen(false)} />}
          {contactOwnerOpen && <ContactOwnerSheet onClose={() => setContactOwnerOpen(false)} />}
        </>,
        document.body
      )}
    </Ctx.Provider>
  );
}
