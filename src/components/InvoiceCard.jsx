'use client';

import React, { useState } from 'react';
import { formatHUF, formatDate, INVOICE_CATEGORIES } from '@/lib/constants';
import { Eye, Edit3, Trash2, User, Calendar, Receipt, Home } from 'lucide-react';
import Modal from './Modal';

export default function InvoiceCard({ invoice, isAdmin, onEdit, onDelete, room }) {
  const [showImageModal, setShowImageModal] = useState(false);
  const catObj = INVOICE_CATEGORIES.find(c => c.id === invoice.category) || { color: 'egyeb' };

  return (
    <>
      <div 
        className="card" 
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'space-between',
          gap: '0.85rem'
        }}
      >
        <div>
          {/* Top row: Category & Amount */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', gap: '0.5rem' }}>
            <span className={`category-badge category-${catObj.color}`} style={{ flexShrink: 0 }}>
              {invoice.category}
            </span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right' }} className="text-mono">
              {formatHUF(invoice.value_huf)}
            </span>
          </div>

          {/* Description */}
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem', lineHeight: 1.3 }}>
            {invoice.description || 'Számla bizonylat'}
          </h4>

          {/* Metadata */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.775rem', color: 'var(--text-muted)', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <User size={13} color="var(--accent)" />
              <strong style={{ color: 'var(--text-secondary)' }}>{invoice.uploader_name || 'Ismeretlen'}</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Calendar size={13} />
              {formatDate(invoice.created_at)}
            </span>
            {room ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--accent-light)', border: '1px solid var(--accent-border)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.72rem' }}>
                <Home size={10} />{room.name}
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-pill)', background: 'var(--bg-subtle)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontWeight: 600, fontSize: '0.72rem' }}>
                <Home size={10} />Általános
              </span>
            )}
          </div>
        </div>

        {/* Thumbnail & Actions */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          paddingTop: '0.65rem',
          borderTop: '1px solid var(--border-subtle)'
        }}>
          {invoice.image_url ? (
            <button
              type="button"
              onClick={() => setShowImageModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.35rem 0.65rem' }}
            >
              <Eye size={14} />
              <span>Fotó megtekintése</span>
            </button>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Receipt size={13} /> Nincs fotó
            </span>
          )}

          {isAdmin && (
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              {onEdit && (
                <button
                  type="button"
                  onClick={() => onEdit(invoice)}
                  className="btn btn-secondary btn-sm"
                  title="Számla szerkesztése"
                >
                  <Edit3 size={13} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(invoice.id)}
                  className="btn btn-danger btn-sm"
                  title="Számla törlése"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      <Modal 
        isOpen={showImageModal} 
        onClose={() => setShowImageModal(false)}
        title="Bizonylat megtekintése"
      >
        <div style={{ textAlign: 'center' }}>
          {invoice.image_url && (
            <img 
              src={invoice.image_url} 
              alt={invoice.description || 'Számla bizonylat'} 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '60vh', 
                borderRadius: 'var(--radius-md)', 
                objectFit: 'contain',
                border: '1px solid var(--border-subtle)'
              }} 
            />
          )}
          <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--text-primary)' }} className="text-mono">
              {formatHUF(invoice.value_huf)}
            </span>
            <span className={`category-badge category-${catObj.color}`}>{invoice.category}</span>
          </div>
        </div>
      </Modal>
    </>
  );
}
