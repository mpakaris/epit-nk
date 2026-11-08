'use client';

import React, { useState, useEffect } from 'react';
import { Link as LocaleLink } from '@/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { useTranslations } from 'next-intl';
import { MessageSquare, ExternalLink } from 'lucide-react';
import PageSpinner from '@/components/PageSpinner';
import CollectiveChatSection from '@/components/CollectiveChatSection';

function relativeTime(isoStr) {
  if (!isoStr) return '';
  const diff  = Date.now() - new Date(isoStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return 'Most';
  if (mins < 60) return `${mins} perce`;
  if (hours < 24) return `${hours} órája`;
  if (days < 7)  return `${days} napja`;
  return new Date(isoStr).toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
}

export default function UzenetekPage() {
  const { loading, dataReady, isDemoMode, isAdmin, activeCollectiveId, collectives } = useApp();
  const t  = useTranslations('messages');
  const tc = useTranslations('common');
  const AppLink = isDemoMode ? Link : LocaleLink;
  const navPrefix = isDemoMode ? '/demo' : '';

  const hasCollective = !!activeCollectiveId;
  const [tab, setTab] = useState(hasCollective ? 'clients' : 'clients');

  const [threads, setThreads]       = useState([]);
  const [threadsLoading, setLoading] = useState(!isDemoMode);

  useEffect(() => {
    if (isDemoMode) return;
    fetch('/api/threads?all=1')
      .then(r => r.ok ? r.json() : { threads: [] })
      .then(d => setThreads(d.threads || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isDemoMode]);

  if (loading || !dataReady) return <PageSpinner />;

  const collectiveName = collectives?.find(c => c.collective_id === activeCollectiveId)?.name || '';

  return (
    <div className="container">
      <div className="page-header" style={{ padding: '1rem 0 1.25rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.15rem' }}>
            <MessageSquare size={15} /> {t('pageTitle')}
          </div>
          <h1 className="page-title">{t('pageTitle')}</h1>
          <p className="page-subtitle">{t('pageSubtitle')}</p>
        </div>
      </div>

      {/* Tab bar — only shown in collective context */}
      {hasCollective && (
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border-subtle)', marginBottom: '1.25rem', gap: '0.25rem' }}>
          {[
            { id: 'clients', label: t('tabClients') },
            { id: 'team',    label: t('tabTeam') },
          ].map(tabItem => (
            <button
              key={tabItem.id}
              type="button"
              onClick={() => setTab(tabItem.id)}
              style={{
                padding: '0.6rem 1.1rem',
                fontSize: '0.875rem',
                fontWeight: 700,
                fontFamily: 'inherit',
                border: 'none',
                cursor: 'pointer',
                background: 'none',
                color: tab === tabItem.id ? 'var(--accent)' : 'var(--text-secondary)',
                borderBottom: `2px solid ${tab === tabItem.id ? 'var(--accent)' : 'transparent'}`,
                marginBottom: -2,
                transition: 'color 0.15s',
              }}
            >
              {tabItem.label}
            </button>
          ))}
        </div>
      )}

      {/* Clients tab */}
      {tab === 'clients' && (
        <>
          {threadsLoading && <PageSpinner />}

          {!threadsLoading && threads.length === 0 && (
            <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
              <MessageSquare size={36} style={{ color: 'var(--border-subtle)', display: 'block', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{t('emptyTitle')}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', margin: 0 }}>{t('emptyText')}</p>
            </div>
          )}

          {!threadsLoading && threads.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {threads.map(thread => (
                <AppLink
                  key={thread.id}
                  href={`${navPrefix}/ugyfelek/${thread.client_id}?thread=${thread.id}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    className="card"
                    style={{
                      padding: '0.85rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      borderLeft: thread.unread_count > 0 ? '3px solid var(--accent)' : '3px solid transparent',
                      transition: 'box-shadow 0.12s',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: thread.unread_count > 0 ? 'var(--accent)' : 'var(--bg-subtle)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <MessageSquare size={16} style={{ color: thread.unread_count > 0 ? '#fff' : 'var(--text-muted)' }} />
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.15rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {thread.client_name || '—'}
                        </span>
                        {thread.quote_title && (
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--bg-subtle)', borderRadius: 99, padding: '0.1rem 0.4rem', border: '1px solid var(--border-subtle)', flexShrink: 0, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {thread.quote_title}
                          </span>
                        )}
                      </div>
                      {thread.last_message && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {thread.last_message.sender_type === 'user' ? '→ ' : ''}{thread.last_message.body}
                        </div>
                      )}
                    </div>

                    {/* Right side */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
                      {thread.last_message && (
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                          {relativeTime(thread.last_message.created_at)}
                        </span>
                      )}
                      {thread.unread_count > 0 && (
                        <span style={{ background: 'var(--danger)', color: '#fff', borderRadius: 99, fontSize: '0.65rem', fontWeight: 700, minWidth: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
                          {thread.unread_count}
                        </span>
                      )}
                      <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                    </div>
                  </div>
                </AppLink>
              ))}
            </div>
          )}
        </>
      )}

      {/* Team tab — collective chat (US-MSG-020) */}
      {tab === 'team' && hasCollective && (
        <CollectiveChatSection
          collectiveId={activeCollectiveId}
          title={`${t('teamChatTitle')}${collectiveName ? ` — ${collectiveName}` : ''}`}
        />
      )}
    </div>
  );
}
