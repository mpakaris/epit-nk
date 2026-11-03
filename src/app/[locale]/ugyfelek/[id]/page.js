'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Link as LocaleLink } from '@/navigation';
import { useParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { formatHUF, formatDate } from '@/lib/constants';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Percent,
  FolderKanban,
  FileText,
  Coins,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink
} from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import StatusBadge from '@/components/StatusBadge';

export default function ClientDetailPage() {
  const { id } = useParams();
  const { isAdmin, loading, dataReady, clients, quotes, quoteEntries, projects, invoices, isDemoMode } = useApp();
  const t = useTranslations('clients');
  const tc = useTranslations('common');
  const navPrefix = isDemoMode ? '/demo' : '';
  const AppLink = isDemoMode ? Link : LocaleLink;
  const [copied, setCopied] = useState(false);
  const [portalUrl, setPortalUrl] = useState(`/clients/${id}`);

  React.useEffect(() => {
    setPortalUrl(`${window.location.origin}/clients/${id}`);
  }, [id]);

  const copyPortalUrl = () => {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading || !dataReady) return <PageSpinner />;

  if (!isAdmin) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--danger)' }}>{t('accessDenied')}</h2>
        <AppLink href={`${navPrefix}/projektek`} className="btn btn-secondary mt-4">{tc('back')}</AppLink>
      </div>
    );
  }

  const client = clients.find(c => c.id === id);
  if (!client) {
    return (
      <div className="container" style={{ paddingTop: '2.5rem', textAlign: 'center' }}>
        <h2>{t('clientNotFound')}</h2>
        <AppLink href={`${navPrefix}/ugyfelek`} className="btn btn-secondary mt-4"><ArrowLeft size={16} /> {tc('back')}</AppLink>
      </div>
    );
  }

  const clientQuotes = quotes.filter(q => q.client_id === client.id);
  const quoteProjectIds = new Set(clientQuotes.filter(q => q.project_id).map(q => q.project_id));
  const clientProjects = projects.filter(p => p.client_id === client.id || quoteProjectIds.has(p.id));

  const totalQuoteValue = clientQuotes.reduce((sum, q) => {
    const qTotal = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
    return sum + qTotal;
  }, 0);

  const totalInvoiceValue = clientProjects.reduce((sum, p) => {
    return sum + invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
  }, 0);

  return (
    <div className="container">
      <div style={{ padding: '0.85rem 0 0.25rem' }}>
        <AppLink href={`${navPrefix}/ugyfelek`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.825rem', fontWeight: 600 }}>
          <ArrowLeft size={15} /> {t('backToClients')}
        </AppLink>
      </div>

      <div className="page-header" style={{ padding: '0.5rem 0 1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--warning-text)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <ShieldCheck size={15} /> {t('detailsTitle')}
          </div>
          <h1 className="page-title">{client.name}</h1>
          {client.notes && <p className="page-subtitle">{client.notes}</p>}
        </div>
      </div>

      {/* Client Info Card */}
      <div className="card mb-6" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          {client.phone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Phone size={16} color="var(--accent)" />
              <span>{client.phone}</span>
            </div>
          )}
          {client.email && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <Mail size={16} color="var(--accent)" />
              <a href={`mailto:${client.email}`} style={{ color: 'var(--accent)' }}>{client.email}</a>
            </div>
          )}
          {client.address && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              <MapPin size={16} color="var(--accent)" />
              <span>{client.address}</span>
            </div>
          )}
          {client.discount_percent > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
              <Percent size={16} color="var(--warning)" />
              <span style={{ fontWeight: 700, color: 'var(--warning-text)' }}>{t('loyaltyDiscount', { percent: client.discount_percent })}</span>
            </div>
          )}
        </div>
      </div>

      {/* Portal URLs */}
      <div className="card mb-6" style={{ padding: '1rem 1.25rem', borderLeft: '3px solid var(--accent)' }}>
        {/* Unified client portal (email OTP login) */}
        <div style={{ marginBottom: client.email ? '0.85rem' : 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            {t('clientPortalLabel')}
          </div>
          {client.email ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', marginBottom: '0.15rem' }}>
                  {t('clientPortalLoginInfo')}{' '}
                  <strong style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{client.email}</strong>
                </div>
                <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
                  {t('clientPortalUrlDesc')}
                </div>
              </div>
              <a href="/portal" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                <ExternalLink size={13} /> {t('openPortalBtn')}
              </a>
            </div>
          ) : (
            <div style={{ fontSize: '0.825rem', color: 'var(--warning-text)', background: 'var(--warning-bg)', border: '1px solid var(--warning-border)', borderRadius: 'var(--radius-md)', padding: '0.5rem 0.75rem' }}>
              {t('noEmailForPortal')}
            </div>
          )}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--border-subtle)', margin: '0.85rem 0' }} />

        {/* Contractor-scoped legacy portal */}
        <div>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            {t('ownViewLabel')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.825rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
              {portalUrl}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
              <button type="button" onClick={copyPortalUrl} className="btn btn-secondary btn-sm">
                {copied ? <><Check size={13} /> {t('copiedBtn')}</> : <><Copy size={13} /> {t('copyBtn')}</>}
              </button>
              <a href={`/clients/${id}`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                <ExternalLink size={13} /> {t('previewBtn')}
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="stat-label">{t('quotesStatLabel')}</div>
          <div className="stat-value">{clientQuotes.length}</div>
          <div className="stat-sub">{t('totalQuoteValue', { amount: formatHUF(totalQuoteValue) })}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t('projectsStatLabel')}</div>
          <div className="stat-value">{clientProjects.length}</div>
          <div className="stat-sub">{t('totalExpenses', { amount: formatHUF(totalInvoiceValue) })}</div>
        </div>
      </div>

      {/* Quotes */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FileText size={18} color="var(--accent)" /> {t('quotesSection', { count: clientQuotes.length })}
        </h2>
      </div>

      {clientQuotes.length === 0 ? (
        <div className="card mb-6" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('noQuotesForClient')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {clientQuotes.map(q => {
            const qTotal = quoteEntries.filter(e => e.quote_id === q.id).reduce((s, e) => s + Number(e.amount_huf || 0), 0);
            return (
              <div key={q.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                    {q.location && <span>{q.location} · </span>}
                    {formatDate(q.created_at)}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem' }}>{formatHUF(qTotal)}</span>
                  <StatusBadge status={q.status} />
                  <AppLink href={`${navPrefix}/ajanlatok/${q.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.775rem' }}>
                    {t('detailsBtn')}
                  </AppLink>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Projects */}
      <div style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <FolderKanban size={18} color="var(--accent)" /> {t('projectsSection', { count: clientProjects.length })}
        </h2>
      </div>

      {clientProjects.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {t('noProjectsForClient')}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {clientProjects.map(p => {
            const pCost = invoices.filter(inv => inv.project_id === p.id).reduce((s, inv) => s + Number(inv.value_huf || 0), 0);
            return (
              <div key={p.id} className="card" style={{ padding: '0.85rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                  <div style={{ fontSize: '0.775rem', color: 'var(--text-muted)', marginTop: '0.15rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Coins size={14} color="var(--accent)" /> {formatHUF(pCost)}
                  </span>
                  <AppLink href={`${navPrefix}/projektek/${p.id}`} className="btn btn-secondary btn-sm" style={{ padding: '0.3rem 0.6rem', fontSize: '0.775rem' }}>
                    {t('detailsBtn')}
                  </AppLink>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
