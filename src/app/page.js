'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AuthModal from '@/components/AuthModal';
import {
  ClipboardList, FileText, TrendingUp, Users, Share2,
  BookUser, Globe, Check, ArrowRight, Hammer,
} from 'lucide-react';

const FEATURES = [
  { icon: ClipboardList, title: 'Felmérés',         desc: 'Helyszíni méretek, vázlatok és fotók azonnal rögzítve — papír nélkül, bárhol. Minden szoba dokumentálva, még az ügyfél előtt.' },
  { icon: FileText,      title: 'Árajánlat',        desc: 'Részletes, professzionális ajánlatok helyiségekre és munkafázisokra bontva. Az ügyfél egy kattintással elfogadhatja.' },
  { icon: TrendingUp,    title: 'Projektköltségek', desc: 'Számlák, munkadíjak és fotók egy helyen. Látod pontosan, hová megy a pénz — szekciónként és munkafázisonként is.' },
  { icon: Users,         title: 'Alvállalkozók',    desc: 'Koordinált munkavégzés és megosztott költségelszámolás a teljes csapatnak. Mindenki tudja, mit kell fizetni.' },
  { icon: Share2,        title: 'Ügyfélportál',     desc: 'Az ügyfeled valós időben látja, hol tart a projekt — ajánlatok, naplóbejegyzések, fizetési terv, képek.' },
  { icon: BookUser,      title: 'Ügyfélkezelés',    desc: 'Minden megrendelő, kapcsolat és előzmény egy áttekinthető adatbázisban. Soha többé elveszett telefonszám.' },
  { icon: Globe,         title: 'Saját weboldal',   desc: 'Ingyenes, személyre szabott szakemberlap, amit azonnal megoszthatsz. Galéria, árak, vélemények — profi megjelenés percek alatt.' },
];

const FREE_ITEMS = [
  '1 aktív projekt', '1 árajánlat', '1 felmérés',
  'Korlátozott weboldal', '1 ügyfélportál', 'Limitált képfeltöltés',
];
const PREMIUM_ITEMS = [
  'Korlátlan projektek', 'Korlátlan árajánlatok', 'Korlátlan felmérések',
  'Teljes weboldal', 'Korlátlan ügyfélportálok', 'Képek és videók',
];

export default function HomePage() {
  const router = useRouter();
  const { currentUser, loading } = useApp();
  const [show, setShow] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState(null);
  const [featureImages, setFeatureImages] = useState(Array(7).fill(null));

  useEffect(() => {
    fetch('/api/platform/hero').then(r => r.json()).then(d => { if (d.url) setHeroImageUrl(d.url); }).catch(() => {});
    fetch('/api/platform/features').then(r => r.json()).then(d => {
      const imgs = Array(7).fill(null);
      (d.slots || []).forEach(s => { if (s.image_url) imgs[s.slot_index] = s.image_url; });
      setFeatureImages(imgs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading) {
      if (currentUser) {
        if (currentUser.must_change_password) router.replace('/change-password');
        else if (currentUser.role === 'superadmin') router.replace('/superadmin');
        else if (currentUser.role === 'admin') router.replace('/admin');
        else router.replace('/dashboard');
      } else {
        setShow(true);
      }
    }
  }, [currentUser, loading, router]);

  if (!show) return null;

  return (
    <>
      <style>{`
        .lp-wrap { position:fixed; inset:0; overflow-y:auto; background:#fff; z-index:9999; font-family:'Plus Jakarta Sans',sans-serif; color:#0f172a; }
        .lp-inner { max-width:1280px; margin:0 auto; width:100%; }

        .lp-nav { position:sticky; top:0; z-index:100; background:rgba(15,23,42,0.97); backdrop-filter:blur(12px); border-bottom:1px solid rgba(255,255,255,0.06); }
        .lp-nav-inner { max-width:1280px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; padding:0 clamp(1.25rem,5vw,4rem); height:64px; }
        .lp-logo { display:flex; align-items:center; gap:0.6rem; color:#fff; font-size:1.15rem; font-weight:800; letter-spacing:-0.03em; }
        .lp-logo-icon { width:30px; height:30px; background:#fff; border-radius:7px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .lp-nav-btn { padding:0.45rem 1.1rem; border-radius:8px; background:rgba(255,255,255,0.1); color:#fff; font-weight:700; font-size:0.875rem; border:1px solid rgba(255,255,255,0.18); cursor:pointer; font-family:inherit; transition:background .15s; }
        .lp-nav-btn:hover { background:rgba(255,255,255,0.18); }

        .lp-hero { background:#0f172a; padding:clamp(5rem,12vw,9rem) clamp(1.25rem,5vw,4rem) clamp(4rem,10vw,7rem); text-align:left; background-size:cover; background-position:center; }
        .lp-eyebrow { display:inline-flex; align-items:center; gap:0.4rem; background:rgba(255,255,255,0.07); color:#94a3b8; font-size:0.78rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; padding:0.3rem 0.85rem; border-radius:999px; border:1px solid rgba(255,255,255,0.1); margin-bottom:1.75rem; }
        .lp-h1 { font-size:clamp(2.5rem,6vw,4.25rem); font-weight:800; color:#fff; letter-spacing:-0.04em; line-height:1.08; margin:0 0 1.25rem; max-width:820px; }
        .lp-h1 em { font-style:normal; color:#e2e8f0; }
        .lp-sub { font-size:clamp(0.95rem,2vw,1.15rem); color:#94a3b8; max-width:500px; margin:0 0 2.5rem; line-height:1.65; }
        .lp-ctas { display:flex; gap:0.85rem; justify-content:flex-start; flex-wrap:wrap; }
        .lp-cta-primary { display:inline-flex; align-items:center; gap:0.45rem; padding:0.8rem 1.6rem; background:#fff; color:#0f172a; font-weight:800; font-size:0.95rem; border-radius:10px; border:none; cursor:pointer; font-family:inherit; transition:all .15s; }
        .lp-cta-primary:hover { background:#f1f5f9; transform:translateY(-1px); }
        .lp-cta-secondary { display:inline-flex; align-items:center; gap:0.45rem; padding:0.8rem 1.6rem; background:transparent; color:#94a3b8; font-weight:600; font-size:0.95rem; border-radius:10px; border:1px solid rgba(255,255,255,0.12); cursor:pointer; font-family:inherit; transition:all .15s; text-decoration:none; }
        .lp-cta-secondary:hover { color:#fff; border-color:rgba(255,255,255,0.25); }

        .lp-demo-bar { background:#1e293b; padding:2.5rem clamp(1.25rem,5vw,4rem); display:flex; justify-content:center; }
        .lp-demo-box { width:100%; max-width:900px; aspect-ratio:16/7; background:#0f172a; border-radius:12px; border:1px solid #1e293b; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.6rem; }
        .lp-demo-box span { color:#334155; font-size:0.85rem; font-weight:600; }

        .lp-features { padding:clamp(4rem,9vw,7rem) clamp(1.25rem,5vw,4rem); background:#f8fafc; }
        .lp-section-label { text-align:left; margin-bottom:3rem; }
        .lp-overline { display:inline-block; font-size:0.72rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:0.6rem; }
        .lp-section-title { font-size:clamp(1.6rem,3.5vw,2.25rem); font-weight:800; color:#0f172a; letter-spacing:-0.03em; margin:0; }

        .lp-feature-list { display:flex; flex-direction:column; gap:0; max-width:1100px; }
        .lp-feature-row { display:flex; align-items:center; gap:clamp(2rem,5vw,5rem); padding:clamp(2.5rem,5vw,4rem) 0; border-bottom:1px solid #e2e8f0; }
        .lp-feature-row:last-child { border-bottom:none; }
        .lp-feature-img { flex:0 0 52%; min-width:0; }
        .lp-feature-txt { flex:1; min-width:0; }
        .lp-feature-num { font-size:0.72rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:0.75rem; }
        .lp-feature-title { font-size:clamp(1.35rem,3vw,1.85rem); font-weight:800; color:#0f172a; letter-spacing:-0.03em; line-height:1.2; margin:0 0 0.85rem; }
        .lp-feature-desc { font-size:clamp(0.9rem,1.5vw,1.05rem); color:#475569; line-height:1.75; margin:0; }
        .lp-mock { background:#fff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.07); }
        .lp-mock-bar { background:#f8fafc; border-bottom:1px solid #e8ecf0; padding:0.55rem 0.85rem; display:flex; align-items:center; gap:0.35rem; }
        .lp-mock-dot { width:9px; height:9px; border-radius:50%; }
        .lp-mock-body { aspect-ratio:16/10; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0.75rem; background:linear-gradient(160deg,#f8fafc 0%,#f1f5f9 100%); }
        @media (max-width:700px) {
          .lp-feature-row { flex-direction:column !important; }
          .lp-feature-img { flex:none; width:100%; }
        }

        .lp-pricing { padding:clamp(4rem,9vw,7rem) clamp(1.25rem,5vw,4rem); background:#fff; }
        .lp-pricing-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr)); gap:1.25rem; max-width:700px; margin:0 auto; }
        .lp-plan { border-radius:14px; padding:2rem 1.75rem; border:1.5px solid #e2e8f0; }
        .lp-plan.premium { background:#0f172a; border-color:#0f172a; }
        .lp-plan-badge { display:inline-block; background:#fff; color:#0f172a; font-size:0.7rem; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; padding:0.2rem 0.75rem; border-radius:999px; margin-bottom:1rem; }
        .lp-plan-tier { font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#94a3b8; margin-bottom:0.5rem; }
        .lp-plan.premium .lp-plan-tier { color:#475569; }
        .lp-plan-price { font-size:2.4rem; font-weight:800; color:#0f172a; letter-spacing:-0.04em; line-height:1; margin-bottom:0.2rem; }
        .lp-plan.premium .lp-plan-price { color:#fff; }
        .lp-plan-price span { font-size:0.95rem; font-weight:600; color:#94a3b8; }
        .lp-plan-sub { font-size:0.8rem; color:#94a3b8; margin-bottom:1.5rem; }
        .lp-plan-list { list-style:none; padding:0; margin:0 0 1.75rem; display:flex; flex-direction:column; gap:0.55rem; }
        .lp-plan-list li { display:flex; align-items:center; gap:0.55rem; font-size:0.855rem; color:#374151; }
        .lp-plan.premium .lp-plan-list li { color:#94a3b8; }
        .lp-plan-btn { display:block; width:100%; text-align:center; padding:0.75rem 1rem; border-radius:10px; font-weight:700; font-size:0.875rem; border:none; cursor:pointer; font-family:inherit; transition:all .15s; box-sizing:border-box; }
        .lp-plan-btn.free { background:#0f172a; color:#fff; }
        .lp-plan-btn.free:hover { background:#1e293b; }
        .lp-plan-btn.prem { background:#fff; color:#0f172a; }
        .lp-plan-btn.prem:hover { background:#f1f5f9; }

        .lp-footer-cta { background:#0f172a; padding:clamp(3.5rem,8vw,6rem) clamp(1.25rem,5vw,4rem); text-align:center; }
        .lp-footer-h { font-size:clamp(1.6rem,3.5vw,2.5rem); font-weight:800; color:#fff; letter-spacing:-0.03em; margin:0 0 0.6rem; }
        .lp-footer-sub { color:#64748b; font-size:0.95rem; margin:0 0 2rem; }
        .lp-footer-copy { padding:1.25rem clamp(1.25rem,5vw,4rem); background:#080e1a; text-align:center; color:#334155; font-size:0.78rem; }

        @media (max-width:600px) {
          .lp-cta-primary,.lp-cta-secondary { width:100%; justify-content:center; }
          .lp-ctas { flex-direction:column; align-items:stretch; max-width:300px; margin:0 auto; }
        }
      `}</style>

      <div className="lp-wrap">
        <nav className="lp-nav">
          <div className="lp-nav-inner">
            <div className="lp-logo">
              <span className="lp-logo-icon"><Hammer size={16} color="#0f172a" /></span>
              Epitek
            </div>
            <button className="lp-nav-btn" onClick={() => setAuthOpen(true)}>Bejelentkezés</button>
          </div>
        </nav>

        <section className="lp-hero" style={heroImageUrl ? { backgroundImage: `linear-gradient(rgba(15,23,42,0.72) 0%, rgba(15,23,42,0.88) 100%), url(${heroImageUrl})` } : {}}>
          <div className="lp-inner">
            <div className="lp-eyebrow"><Hammer size={11} /> Szakembereknek</div>
            <h1 className="lp-h1">Az építkezés <em>profi eszköze.</em></h1>
            <p className="lp-sub">Felmérés, árajánlat, projektköltség, ügyfélportál — minden egy helyen.</p>
            <div className="lp-ctas">
              <button className="lp-cta-primary" onClick={() => setAuthOpen(true)}>
                Kezdj el ingyen <ArrowRight size={15} />
              </button>
              <a href="#features" className="lp-cta-secondary">Megnézem a funkciókat</a>
            </div>
          </div>
        </section>

        <div className="lp-demo-bar">
          <div className="lp-demo-box">
            <Globe size={24} color="#1e293b" />
            <span>Videók és interaktív demo — hamarosan</span>
          </div>
        </div>

        <section className="lp-features" id="features">
          <div className="lp-inner">
          <div className="lp-section-label">
            <div className="lp-overline">Funkciók</div>
            <h2 className="lp-section-title">Mindent megkap, ami számít</h2>
          </div>
          <div className="lp-feature-list">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => {
              const reverse = i % 2 === 1;
              const featureImg = featureImages[i];
              const mockup = (
                <div className="lp-feature-img">
                  {featureImg ? (
                    <img src={featureImg} alt={title} style={{ width: '100%', borderRadius: 12, display: 'block', boxShadow: '0 4px 24px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0' }} />
                  ) : (
                    <div className="lp-mock">
                      <div className="lp-mock-bar">
                        <div className="lp-mock-dot" style={{ background: '#f87171' }} />
                        <div className="lp-mock-dot" style={{ background: '#fbbf24' }} />
                        <div className="lp-mock-dot" style={{ background: '#34d399' }} />
                      </div>
                      <div className="lp-mock-body">
                        <Icon size={40} color="#cbd5e1" />
                        <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                          Screenshot hamarosan
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
              const text = (
                <div className="lp-feature-txt">
                  <div className="lp-feature-num">{String(i + 1).padStart(2, '0')} · {title}</div>
                  <h3 className="lp-feature-title">{title}</h3>
                  <p className="lp-feature-desc">{desc}</p>
                </div>
              );
              return (
                <div key={title} className="lp-feature-row" style={reverse ? { flexDirection: 'row-reverse' } : {}}>
                  {mockup}
                  {text}
                </div>
              );
            })}
          </div>
          </div>
        </section>

        <section className="lp-pricing" id="pricing">
          <div className="lp-inner">
          <div className="lp-section-label">
            <div className="lp-overline">Árazás</div>
            <h2 className="lp-section-title">Egyszerű, átlátható</h2>
          </div>
          <div className="lp-pricing-grid">
            <div className="lp-plan">
              <div className="lp-plan-tier">Ingyenes</div>
              <div className="lp-plan-price">0 <span>Ft</span></div>
              <div className="lp-plan-sub">Örökre ingyenes — kártya nélkül</div>
              <ul className="lp-plan-list">
                {FREE_ITEMS.map(f => <li key={f}><Check size={13} color="#94a3b8" />{f}</li>)}
              </ul>
              <button className="lp-plan-btn free" onClick={() => setAuthOpen(true)}>Regisztráció</button>
            </div>
            <div className="lp-plan premium">
              <div className="lp-plan-badge">Ajánlott</div>
              <div className="lp-plan-tier">Prémium</div>
              <div className="lp-plan-price">6 999 <span>Ft / hó</span></div>
              <div className="lp-plan-sub">Minden funkció, korlátok nélkül</div>
              <ul className="lp-plan-list">
                {PREMIUM_ITEMS.map(f => <li key={f}><Check size={13} color="#475569" />{f}</li>)}
              </ul>
              <button className="lp-plan-btn prem" onClick={() => setAuthOpen(true)}>Váltás prémiumra</button>
            </div>
          </div>
          </div>
        </section>

        <section className="lp-footer-cta">
          <div className="lp-inner">
            <h2 className="lp-footer-h">Készen állsz?</h2>
            <p className="lp-footer-sub">Ingyenesen kezdhetsz, bármikor.</p>
            <button className="lp-cta-primary" onClick={() => setAuthOpen(true)}>
              Bejelentkezés <ArrowRight size={15} />
            </button>
          </div>
        </section>

        <div className="lp-footer-copy">© {new Date().getFullYear()} Epitek · Minden jog fenntartva</div>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
