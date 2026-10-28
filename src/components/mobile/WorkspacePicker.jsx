'use client';

import React from 'react';
import { User, Users, Check, X, Info } from 'lucide-react';
import SharingBanner from './SharingBanner';

export default function WorkspacePicker({
  collectives = [],
  selected,       // null = personal, string = collective id
  onChange,
  onClose,
  onNext,
  typeLabel = 'felmérés',
  personalOnly = false,
}) {
  if (!personalOnly && collectives.length === 0) return null;

  const selectedCol = collectives.find(c => c.id === selected);
  const isContributor = selected !== null && selectedCol &&
    selectedCol.role !== 'owner' && selectedCol.role !== 'admin';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#f8fafc', zIndex: 100,
      display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top)',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', height: 64,
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 48, height: 48, borderRadius: '50%',
            background: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow-card)',
          }}
          aria-label="Bezárás"
        >
          <X size={22} color="#0f172a" strokeWidth={1.75} aria-hidden="true" />
        </button>
        <span style={{ fontSize: 15, fontWeight: 600, color: '#64748b' }}>1 / 2</span>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 16px 32px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#0f172a', letterSpacing: '-0.025em', lineHeight: '38px', marginBottom: 6 }}>
          Új {typeLabel}
        </h1>
        <p style={{ fontSize: 17, fontWeight: 500, color: '#475569', marginBottom: 28, lineHeight: '24px' }}>
          Hova kerüljön?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Personal option */}
          <WorkspaceOption
            type="personal"
            label="Személyes"
            description={personalOnly ? 'Az ügyféladatok mindig személyesek (GDPR).' : 'Csak te látod ezt a munkát.'}
            isSelected={selected === null}
            onSelect={personalOnly ? undefined : () => onChange(null)}
          />

          {/* Collective options */}
          {!personalOnly && collectives.map(col => (
            <WorkspaceOption
              key={col.id}
              type={col.role === 'owner' || col.role === 'admin' ? 'collective' : 'member'}
              label={col.name}
              description={
                col.role === 'owner' || col.role === 'admin'
                  ? 'Saját kollektíva · a csapat minden tagja látja.'
                  : 'Tag vagy · beküldheted jóváhagyásra.'
              }
              isSelected={selected === col.id}
              onSelect={() => onChange(col.id)}
            />
          ))}
        </div>

        {/* Info banner for contributor collective */}
        {isContributor && (
          <div style={{
            marginTop: 16,
            display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            background: '#fff7ed',
            border: '1px solid #fed7aa',
          }}>
            <Info size={16} color="#ea580c" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <p style={{ fontSize: 14, color: '#9a3412', lineHeight: 1.55, margin: 0 }}>
              <strong>Jóváhagyás szükséges.</strong> Addig ez a {typeLabel} a <strong>személyes munkaterületeden</strong> él és szerkeszthető. Amikor a kollektíva tulajdonosa elfogadja, átkerül a csapathoz.
            </p>
          </div>
        )}

        {/* Sharing banner for own collective */}
        {!personalOnly && !isContributor && selected !== null && (
          <div style={{ marginTop: 16 }}>
            <SharingBanner collectiveName={selectedCol?.name} />
          </div>
        )}
      </div>

      {/* Primary button */}
      <div style={{ padding: '0 16px 24px' }}>
        <button
          type="button"
          onClick={onNext}
          disabled={!personalOnly && selected === undefined}
          style={{
            width: '100%', height: 56, borderRadius: 999,
            background: '#0f172a', border: 'none', color: '#fff',
            fontSize: 17, fontWeight: 700, cursor: 'pointer',
          }}
        >
          {isContributor ? 'Létrehozás és beküldés →' : 'Tovább →'}
        </button>
      </div>
    </div>
  );
}

function WorkspaceOption({ type, label, description, isSelected, onSelect }) {
  const isPersonal  = type === 'personal';
  const isMember    = type === 'member';
  const chipBg      = isPersonal ? '#eff6ff' : isMember ? '#fff7ed' : '#dcfce7';
  const iconColor   = isPersonal ? '#2563eb' : isMember ? '#ea580c' : '#16a34a';
  const ringColor   = isPersonal ? '#2563eb' : isMember ? '#ea580c' : '#16a34a';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 14,
        minHeight: 120, padding: 20, textAlign: 'left',
        background: '#fff', borderRadius: 20, cursor: 'pointer',
        border: isSelected ? `2px solid ${ringColor}` : '2px solid transparent',
        boxShadow: 'var(--shadow-card)',
        transition: 'border-color 0.15s',
        width: '100%',
      }}
    >
      {/* Icon with optional edge badge */}
      <div style={{ position: 'relative', flexShrink: 0, width: 56, height: 56 }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: chipBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isPersonal
            ? <User size={26} color={iconColor} strokeWidth={1.75} aria-hidden="true" />
            : <Users size={26} color={iconColor} strokeWidth={1.75} aria-hidden="true" />}
        </div>
        {isMember && (
          <span style={{
            position: 'absolute', bottom: 0, right: -2,
            fontSize: 10, fontWeight: 800, lineHeight: 1,
            color: '#fff', background: '#ea580c',
            padding: '3px 6px', borderRadius: 999,
            border: '2px solid #fff',
            whiteSpace: 'nowrap',
          }}>
            Tag
          </span>
        )}
      </div>

      <div style={{ flex: 1, paddingTop: 4 }}>
        <div style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', lineHeight: '26px' }}>
            {label}
          </span>
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#475569', lineHeight: '20px' }}>
          {description}
        </div>
      </div>

      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: isSelected ? ringColor : 'transparent',
        border: `2px solid ${isSelected ? ringColor : '#cbd5e1'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, border-color 0.15s',
      }}>
        {isSelected && <Check size={16} color="#fff" strokeWidth={3} aria-hidden="true" />}
      </div>
    </button>
  );
}
