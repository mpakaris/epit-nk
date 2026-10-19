'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  User, KeyRound, LogOut, CheckCircle2, AlertCircle, Loader2,
  FileText, Upload, Trash2, Check, Zap, Star, Building2,
  ShieldCheck, Mail, ChevronRight,
} from 'lucide-react';
import Link from 'next/link';

// ── Pricing plans ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    key: 'basic',
    name: 'Bázis',
    price: 'Ingyenes',
    priceNote: 'örökre',
    icon: Zap,
    color: 'var(--text-muted)',
    features: [
      'Maximum 1 projekt',
      'Számla- és munkanapló feltöltés',
      'Személyes munkaterület',
      'Meghívható kollektívákba',
    ],
  },
  {
    key: 'premium',
    name: 'Prémium',
    price: '5 000 Ft',
    priceNote: '/ hó',
    icon: Star,
    color: '#b45309',
    highlight: true,
    features: [
      'Korlátlan projektek',
      'Korlátlan feltöltés',
      'Ajánlatok és felmérések',
      'Naptár és ügyféltár',
      'Kollektíva létrehozása',
      'Személyes weboldal',
    ],
    cta: 'Váltás Prémiumra',
  },
  {
    key: 'collective',
    name: 'Kollektíva',
    price: '8 000 Ft',
    priceNote: '/ hó + 2 000 Ft/fő',
    icon: Building2,
    color: 'var(--accent)',
    features: [
      'Minden Prémium funkció',
      'Megosztott munkaterület',
      'Csapattagok meghívása (ingyenes nekik)',
      'Közös projektek és ajánlatok',
      'Szerepkör-alapú hozzáférés',
    ],
    cta: 'Kollektíva indítása',
    note: 'Prémium előfizetés szükséges',
  },
];

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0 }}>{title}</h2>
      {subtitle && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>{subtitle}</p>}
    </div>
  );
}

function getInitials(name) {
  return (name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function ProfilPage() {
  const { currentUser, logout, changePassword } = useApp();
  const router = useRouter();
  const isPremium = currentUser?.is_subscription_premium ?? false;

  // ── Profile form ────────────────────────────────────────────────────────────
  const [displayName,   setDisplayName]   = useState('');
  const [firstName,     setFirstName]     = useState('');
  const [lastName,      setLastName]      = useState('');
  const [companyName,   setCompanyName]   = useState('');
  const [street,        setStreet]        = useState('');
  const [streetNumber,  setStreetNumber]  = useState('');
  const [zip,           setZip]           = useState('');
  const [city,          setCity]          = useState('');
  const [taxNumber,     setTaxNumber]     = useState('');
  const [defaultTaxPct, setDefaultTaxPct] = useState('27');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saveOk,  setSaveOk]  = useState(false);
  const [saveErr, setSaveErr] = useState('');

  // ── Password form ───────────────────────────────────────────────────────────
  const [pwOpen,    setPwOpen]    = useState(false);
  const [pw,        setPw]        = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwSaving,  setPwSaving]  = useState(false);
  const [pwOk,      setPwOk]      = useState(false);
  const [pwErr,     setPwErr]     = useState('');

  // ── Terms PDF ───────────────────────────────────────────────────────────────
  const [termsPdfUrl,        setTermsPdfUrl]        = useState(null);
  const [termsPdfName,       setTermsPdfName]       = useState(null);
  const [termsPdfUploadedAt, setTermsPdfUploadedAt] = useState(null);
  const [uploadingPdf,       setUploadingPdf]       = useState(false);
  const [pdfError,           setPdfError]           = useState('');
  const pdfInputRef = useRef(null);

  // ── Account deletion ────────────────────────────────────────────────────────
  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteText,    setDeleteText]    = useState('');
  const [deleteErr,     setDeleteErr]     = useState('');
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(({ profile }) => {
        if (!profile) return;
        setDisplayName(profile.display_name       || '');
        setFirstName(profile.first_name           || '');
        setLastName(profile.last_name             || '');
        setCompanyName(profile.company_name       || '');
        setStreet(profile.street                  || '');
        setStreetNumber(profile.street_number     || '');
        setZip(profile.zip                        || '');
        setCity(profile.city                      || '');
        setTaxNumber(profile.tax_number           || '');
        setDefaultTaxPct(profile.default_tax_percent != null ? String(profile.default_tax_percent) : '27');
        setTermsPdfUrl(profile.terms_pdf_url               || null);
        setTermsPdfName(profile.terms_pdf_name             || null);
        setTermsPdfUploadedAt(profile.terms_pdf_uploaded_at || null);
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true); setSaveErr(''); setSaveOk(false);
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name:        displayName.trim()   || null,
          first_name:          firstName.trim()     || null,
          last_name:           lastName.trim()      || null,
          company_name:        companyName.trim()   || null,
          street:              street.trim()        || null,
          street_number:       streetNumber.trim()  || null,
          zip:                 zip.trim()           || null,
          city:                city.trim()          || null,
          tax_number:          taxNumber.trim()     || null,
          default_tax_percent: defaultTaxPct !== '' ? Number(defaultTaxPct) : 27,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a mentéskor');
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 3000);
    } catch (err) { setSaveErr(err.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwErr(''); setPwOk(false);
    if (pw.length < 6) { setPwErr('A jelszónak legalább 6 karakterből kell állnia!'); return; }
    if (pw !== pwConfirm) { setPwErr('A jelszavak nem egyeznek!'); return; }
    setPwSaving(true);
    try {
      await changePassword(pw);
      setPwOk(true);
      setPw(''); setPwConfirm('');
      setTimeout(() => { setPwOk(false); setPwOpen(false); }, 2500);
    } catch (err) { setPwErr(err.message || 'Hiba a jelszóváltoztatáskor'); }
    finally { setPwSaving(false); }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfError(''); setUploadingPdf(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/auth/profile/terms-pdf', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Hiba a feltöltéskor');
      setTermsPdfUrl(data.terms_pdf_url);
      setTermsPdfName(data.terms_pdf_name);
      setTermsPdfUploadedAt(data.terms_pdf_uploaded_at || null);
    } catch (err) { setPdfError(err.message); }
    finally { setUploadingPdf(false); e.target.value = ''; }
  };

  const handlePdfDelete = async () => {
    setPdfError(''); setUploadingPdf(true);
    try {
      const res = await fetch('/api/auth/profile/terms-pdf', { method: 'DELETE' });
      if (!res.ok) throw new Error('Hiba a törléskor');
      setTermsPdfUrl(null); setTermsPdfName(null); setTermsPdfUploadedAt(null);
    } catch (err) { setPdfError(err.message); }
    finally { setUploadingPdf(false); }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true); setDeleteErr('');
    try {
      const res = await fetch('/api/auth/account', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await logout();
      router.replace('/');
    } catch (err) { setDeleteErr(err.message || 'Hiba történt.'); setDeleting(false); }
  };

  if (loadingProfile) return (
    <div className="container" style={{ padding: '2rem' }}>
      <Loader2 size={20} className="animate-spin" />
    </div>
  );

  const initials = getInitials(displayName || currentUser?.display_name);

  return (
    <div className="container" style={{ maxWidth: 900, paddingBottom: '3rem' }}>

      {/* ── ACCOUNT CARD ── */}
      <div style={{ padding: '1.5rem 0 1rem' }}>
        <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <User size={20} /> Profilom
        </h1>
      </div>

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.1rem', marginBottom: '1.25rem' }}>
          {/* Avatar */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--primary), var(--accent, #6366f1))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem', fontWeight: 800, color: '#fff', letterSpacing: '-0.03em',
          }}>
            {initials}
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{displayName || currentUser?.display_name || '—'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Mail size={12} /> {currentUser?.email}
              </span>
              <span style={{
                fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                padding: '0.15rem 0.55rem', borderRadius: 'var(--radius-pill)',
                ...(isPremium
                  ? { background: '#fef9c3', color: '#854d0e', border: '1px solid #fde047' }
                  : { background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }
                ),
              }}>
                {isPremium ? '⭐ Prémium' : 'Bázis'}
              </span>
            </div>
          </div>
        </div>

        {/* Display name field */}
        <div className="form-group" style={{ margin: 0 }}>
          <label className="form-label">Megjelenítési név</label>
          <input
            type="text" className="form-control"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder={currentUser?.display_name || 'pl. Kovács János'}
          />
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
            Ez a név jelenik meg a felületen és a megosztott tartalmakban.
          </div>
        </div>
      </div>

      {/* ── SECURITY ── */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <SectionHeader title="Biztonság" />

        {!pwOpen ? (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPwOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <KeyRound size={14} /> Jelszó módosítása
            </button>
            <button
              type="button"
              onClick={logout}
              className="btn btn-secondary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}
            >
              <LogOut size={14} /> Kijelentkezés
            </button>
          </div>
        ) : (
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 360 }}>
            {pwErr && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.4rem' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{pwErr}
              </div>
            )}
            {pwOk && (
              <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)', color: 'var(--success-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.4rem' }}>
                <CheckCircle2 size={14} style={{ flexShrink: 0 }} /> Jelszó sikeresen megváltoztatva!
              </div>
            )}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Új jelszó</label>
              <input type="password" className="form-control" value={pw} onChange={e => setPw(e.target.value)} placeholder="Legalább 6 karakter" autoFocus />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Jelszó megerősítése</label>
              <input type="password" className="form-control" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} placeholder="Ismételd meg az új jelszót" />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setPwOpen(false); setPw(''); setPwConfirm(''); setPwErr(''); }}>
                Mégse
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={pwSaving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {pwSaving ? <><Loader2 size={13} className="animate-spin" /> Mentés…</> : <><ShieldCheck size={13} /> Jelszó mentése</>}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── SUBSCRIPTION ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SectionHeader
          title="Előfizetés"
          subtitle="Válaszd ki a vállalkozásodhoz legjobban illő csomagot"
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px,100%), 1fr))', gap: '0.85rem' }}>
          {PLANS.map(plan => {
            const Icon = plan.icon;
            const isCurrent = plan.key === (isPremium ? 'premium' : 'basic');
            return (
              <div key={plan.key} className="card" style={{
                padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem',
                border: isCurrent ? `2px solid ${plan.color}` : undefined, position: 'relative',
              }}>
                {isCurrent && (
                  <span style={{ position: 'absolute', top: -11, left: '50%', transform: 'translateX(-50%)', background: plan.color, color: 'white', fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.18rem 0.65rem', borderRadius: 'var(--radius-pill)', whiteSpace: 'nowrap' }}>
                    Aktív csomag
                  </span>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon size={16} color={plan.color} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{plan.name}</div>
                    {plan.note && <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', lineHeight: 1.3 }}>{plan.note}</div>}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'var(--font-mono, monospace)' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>{plan.priceNote}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <Check size={12} color="var(--success-text)" style={{ flexShrink: 0, marginTop: 2 }} /> {f}
                    </li>
                  ))}
                </ul>
                <button type="button" disabled={!plan.cta || isCurrent} style={{
                  width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-md)',
                  fontWeight: 700, fontSize: '0.8rem',
                  cursor: !plan.cta || isCurrent ? 'default' : 'pointer',
                  border: 'none',
                  background: isCurrent ? 'var(--bg-subtle)' : plan.highlight ? plan.color : 'var(--accent)',
                  color: isCurrent ? 'var(--text-muted)' : 'white',
                  opacity: isCurrent ? 0.6 : 1,
                }}>
                  {isCurrent ? 'Aktív' : plan.cta || 'Ingyenes'}
                </button>
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
          Kérdésed van? <a href="mailto:info@epitunk.hu" style={{ color: 'var(--accent)' }}>info@epitunk.hu</a>
        </p>
      </div>

      {/* ── INVOICE HEADER ── */}
      <form onSubmit={handleSaveProfile}>
        <SectionHeader
          title="Számla fejléc"
          subtitle={'Ez az adat jelenik meg az ajánlatok fejlécében a „Tól:" mezőként.'}
        />
        <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {saveErr && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />{saveErr}
            </div>
          )}
          {saveOk && (
            <div style={{ background: 'var(--success-bg, #f0fdf4)', border: '1px solid var(--success-border, #86efac)', color: 'var(--success-text, #166534)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', display: 'flex', gap: '0.45rem' }}>
              <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> Adatok elmentve!
            </div>
          )}

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Cégnév <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(ha van)</span></label>
            <input type="text" className="form-control" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="pl. Kovács Építő Kft." />
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Keresztnév</label>
              <input type="text" className="form-control" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="pl. János" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Vezetéknév</label>
              <input type="text" className="form-control" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="pl. Kovács" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Utca</label>
              <input type="text" className="form-control" value={street} onChange={e => setStreet(e.target.value)} placeholder="pl. Fő utca" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Házszám</label>
              <input type="text" className="form-control" value={streetNumber} onChange={e => setStreetNumber(e.target.value)} placeholder="pl. 12/A" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Irányítószám</label>
              <input type="text" className="form-control" value={zip} onChange={e => setZip(e.target.value)} placeholder="pl. 1234" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Város</label>
              <input type="text" className="form-control" value={city} onChange={e => setCity(e.target.value)} placeholder="pl. Budapest" />
            </div>
          </div>

          <div className="grid-2col" style={{ gap: '0.5rem' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Adószám</label>
              <input type="text" className="form-control" value={taxNumber} onChange={e => setTaxNumber(e.target.value)} placeholder="pl. 12345678-2-41" />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Alapértelmezett ÁFA (%)</label>
              <input type="number" min="0" max="100" step="0.5" className="form-control" value={defaultTaxPct} onChange={e => setDefaultTaxPct(e.target.value)} placeholder="27" />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Mentés…</> : <><Check size={14} /> Mentés</>}
            </button>
          </div>
        </div>
      </form>

      {/* ── TERMS PDF ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <SectionHeader
          title="Általános Szerződési Feltételek (ÁSZF)"
          subtitle="Az itt feltöltött PDF automatikusan csatolódik az ajánlat e-mailekhez."
        />
        <div className="card" style={{ padding: '1rem' }}>
          {pdfError && (
            <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger-text)', padding: '0.55rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.825rem', marginBottom: '0.75rem', display: 'flex', gap: '0.4rem' }}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />{pdfError}
            </div>
          )}
          {termsPdfUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.6rem 0.85rem', minWidth: 0 }}>
                <FileText size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                <div style={{ minWidth: 0 }}>
                  <a href={termsPdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {termsPdfName || 'aszf.pdf'}
                  </a>
                  {termsPdfUploadedAt && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 1 }}>
                      Feltöltve: {new Date(termsPdfUploadedAt).toLocaleString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf}>
                <Upload size={13} /> Csere
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={handlePdfDelete} disabled={uploadingPdf}>
                {uploadingPdf ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-secondary" onClick={() => pdfInputRef.current?.click()} disabled={uploadingPdf} style={{ width: '100%', justifyContent: 'center', gap: '0.5rem' }}>
              {uploadingPdf ? <><Loader2 size={15} className="animate-spin" /> Feltöltés…</> : <><Upload size={15} /> PDF feltöltése</>}
            </button>
          )}
          <input ref={pdfInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePdfUpload} />
        </div>
      </div>

      {/* ── DANGER ZONE ── */}
      <div className="card" style={{ border: '1px solid var(--danger-border)', padding: '1.25rem' }}>
        <h3 style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--danger)', marginBottom: '0.25rem' }}>Veszélyes zóna</h3>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          A fiók törlése végleges és nem visszavonható. Automatikusan ki leszel léptetve minden kollektívából.
        </p>
        {!deleteOpen ? (
          <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} /> Fiók törlése
          </button>
        ) : (
          <div>
            <p style={{ fontSize: '0.825rem', color: 'var(--danger)', fontWeight: 700, marginBottom: '0.5rem' }}>
              A megerősítéshez írd be: <strong>TÖRLÉS</strong>
            </p>
            <input type="text" className="form-control" placeholder="TÖRLÉS" value={deleteText} onChange={e => setDeleteText(e.target.value)} style={{ marginBottom: '0.75rem' }} />
            {deleteErr && (
              <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', color: 'var(--danger)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
                {deleteErr}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setDeleteOpen(false); setDeleteText(''); setDeleteErr(''); }}>
                Mégse
              </button>
              <button type="button" className="btn btn-danger btn-sm" disabled={deleteText !== 'TÖRLÉS' || deleting} onClick={handleDeleteAccount}>
                {deleting ? <><Loader2 size={13} className="animate-spin" /> Törlés…</> : 'Fiók végleges törlése'}
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
