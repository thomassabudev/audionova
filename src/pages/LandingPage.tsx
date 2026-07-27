import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ── Play Button ──────────────────────────────────────────────
const PlayBtn: React.FC<{ size?: number }> = ({ size = 44 }) => (
  <div
    className="flex items-center justify-center rounded-full cursor-pointer transition-transform hover:scale-110"
    style={{
      width: size, height: size,
      background: 'rgba(255,255,255,0.95)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
    }}
  >
    <svg width={size * 0.36} height={size * 0.36} viewBox="0 0 12 14" fill="none">
      <path d="M1 1L11 7L1 13V1Z" fill="#1a1a2e" />
    </svg>
  </div>
);

// ── Card Image with Local Public Folder Support & Fallback ───
const CardImage: React.FC<{ src: string; fallbackSrc?: string; alt: string; accent?: string }> = ({
  src,
  fallbackSrc,
  alt,
  accent = '#7c3aed',
}) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setCurrentSrc(src);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden p-4"
        style={{
          background: `radial-gradient(circle at 30% 30%, ${accent}dd 0%, #0d0d1a 100%)`,
        }}
      >
        <div className="w-16 h-16 rounded-full border-4 border-white/20 flex items-center justify-center shadow-2xl relative mb-2">
          <div className="w-5 h-5 rounded-full bg-white/40 border border-white/60" />
        </div>
        <div className="text-white font-bold text-xs text-center truncate max-w-full px-2">{alt}</div>
        <div className="text-white/40 text-[10px] font-semibold mt-1">AUDIO NOVA</div>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      onError={handleError}
    />
  );
};

// ── Fire Track Card ───────────────────────────────────────────
const FireTrackCard: React.FC<{
  title: string;
  artist: string;
  listeners: string;
  image: string;
  fallbackSrc?: string;
  tag?: string;
  featured?: boolean;
  accent?: string;
}> = ({ title, artist, listeners, image, fallbackSrc, tag, featured, accent = '#7c3aed' }) => (
  <div
    className="relative rounded-2xl overflow-hidden flex-shrink-0 group cursor-pointer transition-all duration-300 hover:-translate-y-3"
    style={{
      width: featured ? 230 : 195,
      boxShadow: featured
        ? `0 24px 60px ${accent}66`
        : '0 10px 30px rgba(0,0,0,0.5)',
      border: featured ? `1px solid ${accent}44` : '1px solid rgba(255,255,255,0.06)',
    }}
  >
    {/* Album image */}
    <div className="relative overflow-hidden" style={{ height: featured ? 250 : 215 }}>
      <CardImage src={image} fallbackSrc={fallbackSrc} alt={title} accent={accent} />
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.5) 100%)' }} />
      {/* Tag */}
      {tag && (
        <div className="absolute top-3 left-3 text-white text-xs font-bold px-2.5 py-1 rounded-lg"
          style={{ background: accent, boxShadow: `0 2px 12px ${accent}88` }}>
          {tag}
        </div>
      )}
      {/* Play btn - center on hover */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <PlayBtn size={featured ? 54 : 46} />
      </div>
    </div>
    {/* Info */}
    <div className="p-4" style={{ background: '#13132a' }}>
      <h4 className="text-white font-bold text-base leading-tight truncate">{title}</h4>
      <p className="truncate" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 2 }}>{artist}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{listeners} listeners</span>
      </div>
    </div>
  </div>
);

// ── Genre Card ────────────────────────────────────────────────
const GenreCard: React.FC<{
  genre: string;
  songs: string;
  image: string;
  fallbackSrc?: string;
  accent: string;
}> = ({ genre, songs, image, fallbackSrc, accent }) => (
  <div
    className="relative rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer group transition-all duration-300 hover:-translate-y-3"
    style={{
      width: 175,
      height: 220,
      backgroundColor: accent,
      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}
  >
    <div className="absolute inset-0">
      <CardImage src={image} fallbackSrc={fallbackSrc} alt={genre} accent={accent} />
    </div>
    {/* Gradient overlay */}
    <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, ${accent}cc 100%)` }} />
    {/* Play on hover */}
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <PlayBtn size={50} />
    </div>
    {/* Label */}
    <div className="absolute bottom-0 left-0 right-0 p-4 pointer-events-none">
      <h4 className="text-white font-black text-lg leading-tight">{genre}</h4>
      <div className="flex items-center gap-1 mt-1">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
          <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
        </svg>
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>{songs} songs</span>
      </div>
    </div>
  </div>
);

// ── Stat Item ─────────────────────────────────────────────────
const StatItem: React.FC<{ icon: string; value: string; label: string }> = ({ icon, value, label }) => (
  <div className="flex items-center gap-2">
    <span style={{ fontSize: 18 }}>{icon}</span>
    <div>
      <div className="text-white font-black text-sm leading-none">{value}</div>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{label}</div>
    </div>
  </div>
);

// ══════════════════════════════════════════════════════════════
// MAIN LANDING PAGE
// ══════════════════════════════════════════════════════════════
const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Fire track data — primary path points to public/images/landing/
  const fireTracks = [
    {
      title: 'Kesariya',
      artist: 'Arijit Singh',
      listeners: '150K',
      tag: 'HOT 🔥',
      accent: '#9333ea',
      image: '/images/landing/kesariya.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=500&q=80',
    },
    {
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      listeners: '70K',
      tag: 'NEW RELEASE',
      accent: '#7c3aed',
      featured: true,
      image: '/images/landing/blinding-lights.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?auto=format&fit=crop&w=500&q=80',
    },
    {
      title: 'Dynamite',
      artist: 'BTS',
      listeners: '48K',
      tag: 'CHART #1',
      accent: '#ef4444',
      image: '/images/landing/dynamite.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=500&q=80',
    },
    {
      title: 'Levitating',
      artist: 'Dua Lipa',
      listeners: '93K',
      accent: '#2563eb',
      image: '/images/landing/levitating.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&q=80',
    },
  ];

  // Genre data — primary path points to public/images/landing/
  const genres = [
    {
      genre: 'Hip Hop',
      songs: '912',
      accent: '#0369a1',
      image: '/images/landing/hiphop.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1571609660890-e7ef58e2d2ca?auto=format&fit=crop&w=500&q=80',
    },
    {
      genre: 'Lo-Fi',
      songs: '600',
      accent: '#7c3aed',
      image: '/images/landing/lofi.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?auto=format&fit=crop&w=500&q=80',
    },
    {
      genre: 'Rock & Roll',
      songs: '512',
      accent: '#059669',
      image: '/images/landing/rock.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1498038432885-c6f3f1b912ee?auto=format&fit=crop&w=500&q=80',
    },
    {
      genre: 'R & B',
      songs: '912',
      accent: '#dc2626',
      image: '/images/landing/rnb.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=500&q=80',
    },
    {
      genre: 'Malayalam',
      songs: '450',
      accent: '#d97706',
      image: '/images/landing/malayalam.jpg',
      fallbackSrc: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?auto=format&fit=crop&w=500&q=80',
    },
  ];

  return (
    <div style={{ background: '#0d0d1a', minHeight: '100vh', overflowX: 'hidden', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes hero-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes glow-pulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
        @keyframes fade-up { from{opacity:0;transform:translateY(28px)} to{opacity:1;transform:translateY(0)} }
        @keyframes bars { from{transform:scaleY(0.3)} to{transform:scaleY(1)} }
        html { scroll-behavior: smooth; }
        .hero-float { animation: hero-float 6s ease-in-out infinite; }
        .glow-orb { animation: glow-pulse 4s ease-in-out infinite; }
        .anim-1 { animation: fade-up 0.6s ease 0.1s both; }
        .anim-2 { animation: fade-up 0.6s ease 0.25s both; }
        .anim-3 { animation: fade-up 0.6s ease 0.4s both; }
        .anim-4 { animation: fade-up 0.6s ease 0.55s both; }
        .nav-glass { backdrop-filter:blur(20px); background:rgba(13,13,26,0.9); border-bottom:1px solid rgba(255,255,255,0.06); }
        .red-btn { background:linear-gradient(135deg,#ef4444,#dc2626); box-shadow:0 4px 24px rgba(239,68,68,0.45); transition:all 0.2s; }
        .red-btn:hover { transform:scale(1.04); box-shadow:0 6px 32px rgba(239,68,68,0.6); }
        .outline-btn { border:1px solid rgba(255,255,255,0.15); background:transparent; transition:all 0.2s; }
        .outline-btn:hover { background:rgba(255,255,255,0.08); }
        ::-webkit-scrollbar { height: 0; }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav className="nav-glass fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <a href="#home" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <img src="/logo.jpg" alt="AudioNova Logo" className="h-8 w-auto object-contain rounded-lg" />
            <span className="text-white font-black text-lg">AudioNova</span>
            <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 700 }}>⚡</span>
          </a>
          <div className="hidden md:flex items-center gap-8">
            {[
              { label: 'Home', href: '#home' },
              { label: 'New Arrival', href: '#new-arrival' },
              { label: 'Features', href: '#features' }
            ].map((item) => (
              <a key={item.label} href={item.href} className="text-sm font-medium text-white/60 hover:text-white transition-colors">
                {item.label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <button onClick={() => navigate('/')} className="red-btn text-white text-sm font-bold px-5 py-2 rounded-xl flex items-center gap-2">
                🎵 Open App
              </button>
            ) : (
              <>
                <Link to="/signin" className="outline-btn text-white text-sm font-medium px-4 py-2 rounded-xl">Log In</Link>
                <Link to="/register" className="red-btn text-white text-sm font-bold px-5 py-2 rounded-xl">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <section id="home" className="relative min-h-screen flex items-center pt-16 overflow-hidden">
        {/* Glow orbs */}
        <div className="glow-orb absolute pointer-events-none" style={{ top: '8%', right: '15%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%)' }} />
        <div className="glow-orb absolute pointer-events-none" style={{ top: '25%', right: '25%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)', animationDelay: '2s' }} />

        <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Left */}
          <div>
            <div className="anim-1 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-8"
              style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
              🔥 Stream 100M+ Songs — Free Forever
            </div>
            <h1 className="anim-2 text-white font-black leading-none mb-6"
              style={{ fontSize: 'clamp(3rem, 6vw, 5.5rem)', letterSpacing: '-0.03em' }}>
              Vibes Without<br />
              <span style={{ background: 'linear-gradient(135deg,#a78bfa,#ec4899,#ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Borders
              </span>
            </h1>
            <p className="anim-3 mb-8" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 16, maxWidth: 440, lineHeight: 1.7 }}>
              AudioNova lets you explore every beat and genre, anywhere you are. Music without limits, just pure connection.
            </p>
            <div className="anim-3 flex flex-wrap gap-6 mb-10">
              <StatItem icon="🎵" value="100K+" label="songs" />
              <StatItem icon="🎤" value="300+" label="Exclusive Artists" />
              <StatItem icon="💿" value="800+" label="Albums" />
            </div>
            <div className="anim-4 flex flex-wrap gap-4">
              <Link to="/register" className="red-btn text-white font-bold px-7 py-3.5 rounded-xl text-base flex items-center gap-2">
                <span>▶</span> Start Listening
              </Link>
              <Link to="/signin" className="outline-btn text-white font-medium px-7 py-3.5 rounded-xl text-base">
                Log In
              </Link>
            </div>
          </div>

          {/* Right — Hero image collage */}
          <div className="relative flex items-center justify-center py-6" style={{ minHeight: 440 }}>
            {/* Main hero image */}
            <div className="hero-float relative rounded-3xl overflow-hidden max-w-[320px] w-full"
              style={{ height: 400, boxShadow: '0 30px 80px rgba(139,92,246,0.5)', border: '1px solid rgba(139,92,246,0.3)' }}>
              <CardImage
                src="/images/landing/hero-artist.jpg"
                fallbackSrc="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=640&q=80"
                alt="Music Artist"
                accent="#7c3aed"
              />
              <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(139,92,246,0.2) 0%, rgba(13,13,26,0.6) 100%)' }} />
            </div>

            {/* Now Playing pill */}
            <div className="absolute bottom-4 left-0 sm:-left-6 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-2xl p-3 shadow-2xl min-w-[170px]">
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 700, letterSpacing: 1.5 }}>NOW PLAYING</div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, marginTop: 2 }}>Blinding Lights</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>The Weeknd</div>
              <div className="flex items-end gap-1 mt-2">
                {[18, 28, 14, 35, 22, 30, 16].map((h, i) => (
                  <div key={i} style={{ width: 3, height: h, background: '#ef4444', borderRadius: 2, animation: `bars ${0.5 + i * 0.1}s ease-in-out infinite alternate`, animationDelay: `${i * 0.07}s` }} />
                ))}
              </div>
            </div>

            {/* Trending badge */}
            <div className="absolute top-4 right-0 sm:-right-4 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl p-2.5 shadow-xl">
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: 700 }}>TRENDING</div>
              <div style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>🔥 #1</div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FIRE TRACKS ══ */}
      <section id="new-arrival" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12">
            <h2 className="text-white font-black" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.15 }}>
              This Week's Fire Track<br />
              <span style={{ color: 'rgba(255,255,255,0.45)' }}>: AudioNova's Choice</span>
            </h2>
            <p className="mt-3" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 480, fontSize: 15, lineHeight: 1.6 }}>
              Discover the track everyone's talking about. Each week, AudioNova highlights the song heating up charts and playlists. Press play, turn it up, and ride the vibe.
            </p>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {fireTracks.map((track) => (
              <FireTrackCard key={track.title} {...track} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ INFINITE LIBRARY ══ */}
      <section id="features" className="py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-6">
            <div>
              <h2 className="text-white font-black" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.15 }}>
                Your Infinite<br />Music Library
              </h2>
              <p className="mt-3" style={{ color: 'rgba(255,255,255,0.4)', maxWidth: 420, fontSize: 15, lineHeight: 1.6 }}>
                Stream, search, and save your favorite tracks. Discover new vibes every day, all in one place.
              </p>
            </div>
            <div className="flex gap-3">
              {['←', '→'].map((arrow, i) => (
                <button key={arrow} className="w-10 h-10 rounded-full flex items-center justify-center text-white transition-all text-lg"
                  style={{ background: i === 1 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(255,255,255,0.07)', border: i === 0 ? '1px solid rgba(255,255,255,0.15)' : 'none' }}>
                  {arrow}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-5 overflow-x-auto pb-4" style={{ scrollbarWidth: 'none' }}>
            {genres.map((g) => (
              <GenreCard key={g.genre} {...g} />
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══ */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-3xl p-12 text-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#4c1d95 70%,#7c3aed 100%)' }}>
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.3) 0%, transparent 70%)' }} />
            {/* Background album art strip */}
            <div className="absolute inset-0 overflow-hidden opacity-10">
              <div className="flex gap-2 absolute -bottom-4 left-0 right-0">
                {fireTracks.map(t => (
                  <img key={t.title} src={t.image} alt="" className="h-24 flex-1 object-cover rounded-xl" />
                ))}
              </div>
            </div>
            <div className="relative">
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎧</div>
              <h2 className="text-white font-black mb-4" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>Ready to Vibe?</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 32, fontSize: 16 }}>
                Join thousands of music lovers. Free forever, no credit card required.
              </p>
              <Link to="/register" className="red-btn inline-flex items-center gap-2 text-white font-bold px-8 py-4 rounded-2xl text-lg">
                ▶ Start Listening Free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FOOTER ══ */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo.jpg" alt="AudioNova Logo" className="h-7 w-auto object-contain rounded-lg" />
            <span className="text-white font-black">AudioNova</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Built with ❤️ · BCA Student Project · Thomas Sabu</p>
          <div className="flex gap-6">
            <Link to="/signin" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }} className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/register" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13 }} className="hover:text-white transition-colors">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
