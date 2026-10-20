'use client';

import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function WelcomeModal() {
  const { currentUser, dismissWelcome } = useApp();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Burst from both sides
    confetti({ particleCount: 80, angle: 60,  spread: 70, origin: { x: 0, y: 0.7 }, colors: ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6'] });
    confetti({ particleCount: 80, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors: ['#2563eb','#10b981','#f59e0b','#ef4444','#8b5cf6'] });
  }, []);

  const trialEnd = currentUser?.trial_ends_at
    ? new Date(currentUser.trial_ends_at).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10002,
      background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      animation: 'fadeIn .2s ease',
    }}>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes popIn{from{opacity:0;transform:scale(.92)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{
        background: '#fff', borderRadius: '20px', maxWidth: '460px', width: '100%',
        padding: '2.25rem 2rem', textAlign: 'center', position: 'relative',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        animation: 'popIn .28s cubic-bezier(.32,1,.6,1)',
      }}>
        <button
          onClick={dismissWelcome}
          style={{ position:'absolute', top:'1rem', right:'1rem', background:'#f1f5f9', border:'none', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}
        >
          <X size={14} color="#64748b" />
        </button>

        <div style={{ width:'64px', height:'64px', background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderRadius:'18px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 1.25rem' }}>
          <Sparkles size={30} color="#fff" />
        </div>

        <h2 style={{ fontSize:'1.5rem', fontWeight:800, color:'#0f172a', marginBottom:'0.4rem', letterSpacing:'-0.03em' }}>
          Üdvözlünk az Epiteq-ben!
        </h2>
        <p style={{ color:'#64748b', fontSize:'0.9rem', lineHeight:1.6, marginBottom:'1.5rem' }}>
          Örülünk, hogy itt vagy,{currentUser?.display_name && currentUser.display_name !== currentUser.email ? ` ${currentUser.display_name.split(' ')[0]}` : ''}!
        </p>

        <div style={{ background:'linear-gradient(135deg,#eff6ff,#f5f3ff)', border:'1px solid #c7d2fe', borderRadius:'14px', padding:'1.25rem', marginBottom:'1.5rem', textAlign:'left' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', marginBottom:'0.85rem' }}>
            <Sparkles size={16} color="#2563eb" />
            <span style={{ fontWeight:800, color:'#1e3a8a', fontSize:'0.9rem' }}>14 napos ingyenes Próbaidőszak</span>
          </div>
          {[
            'Korlátlan projektek, árajánlatok és felmérések',
            'Kollektíva funkciók teljes hozzáféréssel',
            'Saját weboldal építő',
            'Nincs szükség bankkártyára',
          ].map(item => (
            <div key={item} style={{ display:'flex', alignItems:'flex-start', gap:'0.5rem', marginBottom:'0.4rem' }}>
              <CheckCircle2 size={14} color="#2563eb" style={{ marginTop:'2px', flexShrink:0 }} />
              <span style={{ fontSize:'0.83rem', color:'#334155', lineHeight:1.5 }}>{item}</span>
            </div>
          ))}
          {trialEnd && (
            <p style={{ fontSize:'0.78rem', color:'#64748b', marginTop:'0.75rem', marginBottom:0, borderTop:'1px solid #c7d2fe', paddingTop:'0.65rem' }}>
              A próbaidőszak <strong>{trialEnd}</strong>-ig tart. Utána automatikusan az ingyenes Basic csomagra kerülsz — semmi meglepetés.
            </p>
          )}
        </div>

        <button
          onClick={dismissWelcome}
          style={{ width:'100%', padding:'0.85rem', background:'#0f172a', color:'#fff', fontWeight:800, fontSize:'0.95rem', border:'none', borderRadius:'10px', cursor:'pointer', fontFamily:'inherit' }}
        >
          Kezdjük el! 🚀
        </button>
      </div>
    </div>
  );
}
