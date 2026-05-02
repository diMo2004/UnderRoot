"use client";
import React, { useState } from 'react';
import {
  History,
  Feather,
  Users,
  Binary,
  Highlighter,
  LogIn,
  ArrowLeft,
  Mail,
  Lock,
  ScrollText,
} from 'lucide-react';

const themes = {
  classic: {
    id: 'classic',
    name: 'Classic Ivy',
    bg: '#FCFBF7',
    text: '#1A2F23',
    accent: '#B48E4D',
    cardBg: '#ffffff',
    cardBorder: '#E5E1D5',
    cardHoverBorder: '#1A2F23',
    iconBg: '#F3F1E9',
    logoBg: '#1A2F23',
    btnBg: '#1A2F23',
    btnText: '#FCFBF7',
    btnHoverBg: '#2D4D3A',
    navBg: 'rgba(252,251,247,0.95)',
    borderLight: 'rgba(26,47,35,0.1)',
    titleStyle: { fontFamily: "'Playfair Display', serif", fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '-0.02em' },
  },
  darkAcademia: {
    id: 'darkAcademia',
    name: 'Dark Academia',
    bg: '#1A1612',
    text: '#D9C5B2',
    accent: '#8C6239',
    cardBg: '#26211C',
    cardBorder: '#3D352E',
    cardHoverBorder: '#8C6239',
    iconBg: '#3D352E',
    logoBg: '#8C6239',
    btnBg: '#8C6239',
    btnText: '#1A1612',
    btnHoverBg: '#A67B5B',
    navBg: 'rgba(26,22,18,0.95)',
    borderLight: 'rgba(217,197,178,0.1)',
    titleStyle: { fontFamily: "'Playfair Display', serif", fontWeight: 500, fontStyle: 'italic' as const },
  },
  royal: {
    id: 'royal',
    name: 'Oxford Royal',
    bg: '#F8F9FB',
    text: '#002147',
    accent: '#C1A062',
    cardBg: '#ffffff',
    cardBorder: 'rgba(0,33,71,0.05)',
    cardHoverBorder: '#002147',
    iconBg: 'rgba(0,33,71,0.05)',
    logoBg: '#002147',
    btnBg: '#002147',
    btnText: '#ffffff',
    btnHoverBg: '#003366',
    navBg: 'rgba(255,255,255,0.95)',
    borderLight: 'rgba(0,33,71,0.1)',
    titleStyle: { fontFamily: "'Playfair Display', serif", fontWeight: 900, textTransform: 'uppercase' as const, letterSpacing: '-0.03em' },
  },
};

type ThemeKey = keyof typeof themes;

export default function App() {
  const [activeTheme, setActiveTheme] = useState<ThemeKey>('classic');
  const [view, setView] = useState<'landing' | 'auth'>('landing');
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [btnHover, setBtnHover] = useState(false);
  const [heroBtnHover, setHeroBtnHover] = useState(false);
  const [authBtnHover, setAuthBtnHover] = useState(false);

  const s = themes[activeTheme];

  const navStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 40,
    background: s.navBg,
    borderBottom: `1px solid ${s.borderLight}`,
    padding: '14px 56px', // Adjusted from 28px to 14px to reduce height
    backdropFilter: 'blur(8px)',
    transition: 'all 0.3s',
  };

  const logoMarkStyle: React.CSSProperties = {
    width: 52, height: 52,
    background: s.logoBg,
    borderRadius: 4,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Playfair Display', serif",
    fontSize: 26, fontWeight: 700,
    color: '#fff',
    boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
    flexShrink: 0,
  };

  const btnPrimaryStyle: React.CSSProperties = {
    background: btnHover ? s.btnHoverBg : s.btnBg,
    color: s.btnText,
    border: 'none', borderRadius: 2,
    padding: '16px 36px',
    fontSize: 12, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.15em',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
    transition: 'background 0.2s',
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
  };

  const heroStyle: React.CSSProperties = {
    position: 'relative',
    textAlign: 'center',
    borderTop: `1px solid ${s.borderLight}`,
    borderBottom: `1px solid ${s.borderLight}`,
    padding: '48px 24px',
    marginBottom: 64,
  };

  const heroBtnStyle: React.CSSProperties = {
    background: heroBtnHover ? s.btnHoverBg : s.btnBg,
    color: s.btnText,
    border: 'none', borderRadius: 2,
    padding: '16px 48px',
    fontSize: 11, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.2em',
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
    transition: 'background 0.2s',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
  };

  const cardStyle = (i: number): React.CSSProperties => ({
    background: s.cardBg,
    border: `1px solid ${hoveredCard === i ? s.cardHoverBorder : s.cardBorder}`,
    borderRadius: 4,
    padding: 40,
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.2s',
    boxShadow: hoveredCard === i ? '0 8px 30px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
    transform: hoveredCard === i ? 'translateY(-2px)' : 'none',
    cursor: 'default',
  });

  const cardIconStyle = (i: number): React.CSSProperties => ({
    width: 44, height: 44,
    background: s.iconBg,
    borderRadius: 3,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    transition: 'transform 0.3s',
    transform: hoveredCard === i ? 'translateY(-3px)' : 'none',
    color: s.text,
  });

  const authCardStyle: React.CSSProperties = {
    background: s.cardBg,
    border: `1px solid ${s.cardBorder}`,
    borderRadius: 8,
    padding: 48,
    width: '100%', maxWidth: 440,
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'transparent',
    border: `1px solid ${s.borderLight}`,
    borderRadius: 3,
    padding: '12px 12px 12px 38px',
    fontSize: 14, color: s.text,
    outline: 'none',
    fontFamily: 'Inter, sans-serif',
  };

  const authBtnStyle: React.CSSProperties = {
    width: '100%', marginTop: 10,
    background: authBtnHover ? s.btnHoverBg : s.btnBg,
    color: s.btnText,
    border: 'none', borderRadius: 2, padding: 16,
    fontSize: 10, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.2em',
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 3px 12px rgba(0,0,0,0.15)',
  };

  const cards = [
    { title: "Real-Time Collaborative Editor", desc: "Write together in real-time with your global team. Conflict-free editing ensures that everyone's contributions stay perfectly in sync.", icon: <Users size={22} /> },
    { title: "AI-Powered Citation Engine", desc: "Instantly find and cite peer-reviewed papers. Our AI maps your claims to the world's most comprehensive research database.", icon: <Binary size={22} /> },
    { title: "Plagiarism Awareness Heatmap", desc: "Ensure absolute originality with real-time feedback. Our tool analyzes your paper for semantic and structural similarity.", icon: <Highlighter size={22} /> },
  ];

  const AuthInterface = () => (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
      <button
        onClick={() => setView('landing')}
        style={{ position: 'absolute', top: 28, left: 28, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', opacity: 0.5, background: 'none', border: 'none', color: s.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <ArrowLeft size={14} /> Back to Home
      </button>

      <div style={authCardStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32, gap: 10 }}>
          <div style={{ width: 48, height: 48, background: s.logoBg, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, color: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>U</div>
          <h2 style={{ ...s.titleStyle, fontSize: 30, color: s.text }}>Sign In</h2>
          <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 13, opacity: 0.55, textAlign: 'center', color: s.text }}>
            Enter your institutional email to access your papers.
          </p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.55, display: 'block', marginBottom: 6 }}>University Email</label>
          <div style={{ position: 'relative' }}>
            <input type="email" style={inputStyle} placeholder="name@university.edu" />
            <Mail style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={14} />
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.55, display: 'block', marginBottom: 6 }}>Password</label>
          <div style={{ position: 'relative' }}>
            <input type="password" style={inputStyle} placeholder="••••••••" />
            <Lock style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', opacity: 0.3 }} size={14} />
          </div>
        </div>

        <button
          style={authBtnStyle}
          onMouseEnter={() => setAuthBtnHover(true)}
          onMouseLeave={() => setAuthBtnHover(false)}
        >
          Sign In
        </button>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${s.borderLight}`, textAlign: 'center', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', opacity: 0.35, lineHeight: 1.8, color: s.text }}>
          New user? Contact your department administrator <br /> to request access to UnderRoot.
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', width: '100%', background: s.bg, color: s.text, transition: 'all 0.5s', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Inter:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
      `}</style>

      {view === 'auth' ? (
        <AuthInterface />
      ) : (
        <>
          {/* NAV */}
          <nav style={navStyle}>
            <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={logoMarkStyle}>U</div>
                <div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>UnderRoot</div>
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.4, fontWeight: 700, marginTop: 4 }}>Est. 2024</div>
                </div>
              </div>

              <button
                style={btnPrimaryStyle}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                onClick={() => setView('auth')}
              >
                <LogIn size={14} /> Sign In
              </button>
            </div>
          </nav>

          {/* THEME SWITCHER */}
          <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 50, display: 'flex', gap: 8 }}>
            {(Object.keys(themes) as ThemeKey[]).map(t => (
              <button
                key={t}
                onClick={() => setActiveTheme(t)}
                style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: themes[t].logoBg,
                  border: activeTheme === t ? `2px solid ${s.text}` : '2px solid transparent',
                  cursor: 'pointer', padding: 0,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  transition: 'transform 0.2s',
                  transform: activeTheme === t ? 'scale(1.4)' : 'scale(1)',
                }}
                title={themes[t].name}
              />
            ))}
          </div>

          {/* MAIN */}
          <main style={{ width: '100%', paddingTop: 80 }}> {/* Adjusted from 108px to 80px to match reduced nav height */}

            {/* HERO — full width background, centered content */}
            <div style={{ ...heroStyle, width: '100%', padding: '72px 48px' }}>
              {/* Corner decorations */}
              {[
                { top: 10, left: 10, borderTop: `1px solid ${s.text}`, borderLeft: `1px solid ${s.text}` },
                { top: 10, right: 10, borderTop: `1px solid ${s.text}`, borderRight: `1px solid ${s.text}` },
                { bottom: 10, left: 10, borderBottom: `1px solid ${s.text}`, borderLeft: `1px solid ${s.text}` },
                { bottom: 10, right: 10, borderBottom: `1px solid ${s.text}`, borderRight: `1px solid ${s.text}` },
              ].map((c, i) => (
                <div key={i} style={{ position: 'absolute', width: 20, height: 20, opacity: 0.12, ...c }} />
              ))}

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', border: `1px solid ${s.borderLight}`, borderRadius: 9999, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 20 }}>
                <History size={12} /> Collaborative Research Platform
              </div>

              <h1 style={{ ...s.titleStyle, fontSize: 'clamp(2.5rem, 6vw, 5rem)', lineHeight: 1.05, maxWidth: 900, margin: '0 auto 24px', color: s.text }}>
                The modern standard for{' '}
                <span style={{ color: s.accent }}>academic</span>{' '}
                writing.
              </h1>

              <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 18, opacity: 0.7, maxWidth: 560, margin: '0 auto 36px', lineHeight: 1.6 }}>
                UnderRoot provides real-time collaboration and AI-powered research tools for the world's leading scholars.
              </p>

              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  style={heroBtnStyle}
                  onMouseEnter={() => setHeroBtnHover(true)}
                  onMouseLeave={() => setHeroBtnHover(false)}
                  onClick={() => window.location.href = '/auth'}
                >
                  Commence Writing <Feather size={16} />
                </button>
              </div>
            </div>

            {/* CARDS — full width background, padded inner */}
            <div style={{ width: '100%', padding: '64px 48px 96px' }}>
              <div style={{ maxWidth: 1400, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
                {cards.map((item, i) => (
                  <div
                    key={i}
                    style={cardStyle(i)}
                    onMouseEnter={() => setHoveredCard(i)}
                    onMouseLeave={() => setHoveredCard(null)}
                  >
                    <div style={cardIconStyle(i)}>{item.icon}</div>
                    <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 12, lineHeight: 1.25, color: s.text }}>{item.title}</h3>
                    <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', fontSize: 14, opacity: 0.6, lineHeight: 1.7 }}>"{item.desc}"</p>
                  </div>
                ))}
              </div>
            </div>
          </main>

          {/* FOOTER */}
          <footer style={{ borderTop: `1px solid ${s.borderLight}`, padding: '48px 48px', opacity: 0.5, width: '100%' }}>
            <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 6 }}>
                <ScrollText size={12} /> © 2024 UnderRoot Technologies
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'Dashboard', onClick: () => setView('auth') },
                  { label: 'Privacy Policy', onClick: () => {} },
                  { label: 'Terms of Use', onClick: () => {} },
                ].map(({ label, onClick }) => (
                  <button key={label} onClick={onClick} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', background: 'none', border: 'none', color: s.text, cursor: 'pointer' }}>{label}</button>
                ))}
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}