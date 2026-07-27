import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { API_ENDPOINTS } from '../config/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  LayoutDashboard, Music, Users, TrendingUp, Star, StarOff,
  Upload, Trash2, Edit, RefreshCw, LogOut, Search, UserX, UserCheck,
  Play, Headphones, Activity, ChevronRight, Plus, ShieldAlert, ArrowLeft,
  KeyRound, Copy, Check, UserPlus, Shield, Eye, EyeOff, Loader2
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Cell
} from 'recharts';
import {
  getAnalytics, getUserAnalytics, getSongs, uploadSong, updateSong, deleteSong,
  getUsers, blockUser, unblockUser,
  getFeaturedSongs, addFeaturedSong, removeFeaturedSong,
  getCoAdmins, createCoAdmin, deleteCoAdmin,
  type Song, type Analytics, type UserAnalytics, type AdminUser, type FeaturedSong, type CoAdminUser
} from '../services/adminApi';
import { useMusic } from '../context/MusicContext';

type NavPage = 'overview' | 'analytics' | 'songs' | 'users' | 'featured' | 'coadmins';

const NAV_ITEMS: { id: NavPage; label: string; icon: React.ReactNode; superOnly?: boolean }[] = [
  { id: 'overview', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingUp size={18} /> },
  { id: 'songs', label: 'Songs', icon: <Music size={18} /> },
  { id: 'users', label: 'Users', icon: <Users size={18} /> },
  { id: 'featured', label: 'Featured', icon: <Star size={18} /> },
  { id: 'coadmins', label: 'Co-Admins', icon: <Shield size={18} />, superOnly: true },
];

const CARD_GRADIENTS = [
  'from-[#e84393] to-[#c0185e]',
  'from-[#7c4dff] to-[#5023b8]',
  'from-[#ff8f00] to-[#e65100]',
  'from-[#00bcd4] to-[#006064]',
];

const CHART_COLORS = ['#e84393', '#7c4dff', '#ff8f00', '#00bcd4', '#4caf50', '#ff5722', '#9c27b0', '#03a9f4'];

// ── Custom Recharts Tooltip ────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px' }}>
      <p style={{ color: '#aaa', fontSize: 11, marginBottom: 4 }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

// ── Sparkline mini chart for stat cards ──────────────────────────
const Sparkline = ({ data, color }: { data: number[]; color: string }) => (
  <ResponsiveContainer width="100%" height={40}>
    <LineChart data={data.map((v, i) => ({ v, i }))}>
      <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
);

// ── Main Component ────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  const { user, isAdmin, getAuthToken, logout } = useAuth();
  const { currentSong } = useMusic();
  const navigate = useNavigate();

  // Co-Admin session check
  const [coAdminToken, setCoAdminToken] = useState<string | null>(() => localStorage.getItem('coAdminToken'));
  const [coAdminUser, setCoAdminUser] = useState<any>(() => {
    try {
      const saved = localStorage.getItem('coAdminUser');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const isCoAdmin = !!coAdminToken;
  const isSuperAdmin = isAdmin && !isCoAdmin;
  const hasAdminAccess = isAdmin || isCoAdmin;

  const getToken = useCallback(async () => {
    if (coAdminToken) return coAdminToken;
    return await getAuthToken();
  }, [coAdminToken, getAuthToken]);

  const [page, setPage] = useState<NavPage>('overview');
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [userAnalytics, setUserAnalytics] = useState<UserAnalytics[]>([]);
  const [songs, setSongs] = useState<Song[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [featuredSongs, setFeaturedSongs] = useState<FeaturedSong[]>([]);
  const [coAdmins, setCoAdmins] = useState<CoAdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [createCoAdminOpen, setCreateCoAdminOpen] = useState(false);
  const [coAdminSubmitting, setCoAdminSubmitting] = useState(false);
  const [showCreatePass, setShowCreatePass] = useState(false);
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [userSearch, setUserSearch] = useState('');

  // Co-Admin Form State
  const [coAdminForm, setCoAdminForm] = useState({ name: '', username: '', password: '' });

  if (!hasAdminAccess) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: 40, background: '#1a1a2e', borderRadius: 20, border: '1px solid rgba(255,255,255,0.08)', maxWidth: 440 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>Access Denied</h2>
          <p style={{ color: '#888', marginTop: 8, fontSize: 14 }}>
            Admin privileges required to view this portal.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => navigate('/admin/login')} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #e84393, #7c4dff)', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
              Co-Admin Portal Login
            </button>
            <button onClick={() => navigate('/')} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.08)', color: '#ccc', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, cursor: 'pointer', fontWeight: 500, fontSize: 13 }}>
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const loadData = useCallback(async (showRefresh = false) => {
    try {
      showRefresh ? setRefreshing(true) : setLoading(true);
      const token = await getToken();
      if (!token) return;

      const promises: Promise<any>[] = [
        getAnalytics(token),
        getUserAnalytics(token),
        getSongs(token),
        getUsers(token),
        getFeaturedSongs(token),
      ];

      if (isSuperAdmin) {
        promises.push(getCoAdmins(token));
      }

      const results = await Promise.allSettled(promises);

      // Check if Co-Admin has been revoked or unauthenticated
      if (isCoAdmin) {
        const isRevoked = results.some(
          r => r.status === 'rejected' && (r.reason?.response?.status === 401 || r.reason?.response?.status === 403)
        );
        if (isRevoked) {
          localStorage.removeItem('coAdminToken');
          localStorage.removeItem('coAdminUser');
          toast.error('🚫 Access Revoked: Your Co-Admin access was revoked by Super Admin');
          navigate('/admin/login');
          return;
        }
      }

      if (results[0].status === 'fulfilled' && results[0].value.success) setAnalytics(results[0].value.analytics);
      if (results[1].status === 'fulfilled' && results[1].value.success) setUserAnalytics(results[1].value.users);
      if (results[2].status === 'fulfilled' && results[2].value.success) setSongs(results[2].value.songs);
      if (results[3].status === 'fulfilled' && results[3].value.success) setUsers(results[3].value.users);
      if (results[4].status === 'fulfilled' && results[4].value.success) setFeaturedSongs(results[4].value.songs);
      if (isSuperAdmin && results[5]?.status === 'fulfilled' && results[5].value?.success) setCoAdmins(results[5].value.coAdmins);

      setLastUpdated(new Date());
      if (showRefresh) toast.success('Dashboard refreshed');
    } catch {
      toast.error('Failed to load data');
    } finally {
      showRefresh ? setRefreshing(false) : setLoading(false);
    }
  }, [getToken, isCoAdmin, isSuperAdmin, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Real-time Revocation Eviction for Co-Admins (Polls every 5 seconds)
  useEffect(() => {
    if (!isCoAdmin || !coAdminToken) return;

    const interval = setInterval(async () => {
      try {
        await getAnalytics(coAdminToken);
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('coAdminToken');
          localStorage.removeItem('coAdminUser');
          toast.error('🚫 Access Revoked: Your Co-Admin access was revoked by Super Admin');
          navigate('/admin/login');
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isCoAdmin, coAdminToken, navigate]);

  const handleUpload = async (fd: FormData) => {
    const token = await getToken(); if (!token) return;
    try {
      const r = await uploadSong(token, fd);
      if (r.success) { toast.success('Song uploaded'); setUploadOpen(false); loadData(true); }
    } catch (e: any) { toast.error(e.response?.data?.error || 'Upload failed'); }
  };

  const handleUpdate = async (id: number, data: Partial<Song>) => {
    const token = await getToken(); if (!token) return;
    try {
      await updateSong(token, id, data);
      toast.success('Song updated'); setEditSong(null); loadData(true);
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async (id: number) => {
    const token = await getToken(); if (!token) return;
    try { await deleteSong(token, id); toast.success('Song deleted'); loadData(true); }
    catch { toast.error('Delete failed'); }
  };

  const handleBlock = async (uid: string) => {
    const token = await getToken(); if (!token) return;
    try { await blockUser(token, uid, 'Blocked by admin'); toast.success('User blocked'); loadData(true); }
    catch { toast.error('Block failed'); }
  };

  const handleUnblock = async (uid: string) => {
    const token = await getToken(); if (!token) return;
    try { await unblockUser(token, uid); toast.success('User unblocked'); loadData(true); }
    catch { toast.error('Unblock failed'); }
  };

  const handleFeatureCurrent = async () => {
    if (!currentSong) return toast.error('Play a song first');
    const token = await getToken(); if (!token) return;
    try {
      await addFeaturedSong(token, { songId: currentSong.id, name: currentSong.name, primaryArtists: currentSong.primaryArtists, image: currentSong.image, url: currentSong.url, duration: currentSong.duration });
      toast.success(`"${currentSong.name}" featured!`); loadData(true);
    } catch { toast.error('Failed to feature'); }
  };

  const handleUnfeature = async (id: string) => {
    const token = await getToken(); if (!token) return;
    try { await removeFeaturedSong(token, id); toast.success('Removed from featured'); loadData(true); }
    catch { toast.error('Failed'); }
  };

  const handleCreateCoAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coAdminForm.name.trim() || !coAdminForm.username.trim() || !coAdminForm.password.trim()) {
      return toast.error('Name, username and password are required');
    }

    setCoAdminSubmitting(true);
    try {
      const token = await getToken();
      if (!token) {
        toast.error('Authentication token missing');
        return;
      }
      const res = await createCoAdmin(token, {
        name: coAdminForm.name.trim(),
        username: coAdminForm.username.trim().toLowerCase(),
        password: coAdminForm.password
      });
      if (res.success) {
        toast.success(`Co-Admin "${coAdminForm.username}" created successfully!`);
        setCreateCoAdminOpen(false);
        setCoAdminForm({ name: '', username: '', password: '' });
        loadData(true);
      } else {
        toast.error('Failed to create Co-Admin account');
      }
    } catch (e: any) {
      console.error('Co-Admin creation error:', e);
      toast.error(e.response?.data?.error || 'Failed to create Co-Admin');
    } finally {
      setCoAdminSubmitting(false);
    }
  };

  const handleDeleteCoAdminClick = async (id: string) => {
    const token = await getToken(); if (!token) return;
    try {
      await deleteCoAdmin(token, id);
      toast.success('Co-Admin account revoked');
      loadData(true);
    } catch {
      toast.error('Failed to revoke Co-Admin account');
    }
  };

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.name || '').toLowerCase().includes(userSearch.toLowerCase())
  );

  // Build sparkline arrays from playsByDate (last 7 days)
  const sparklinePlays = analytics?.playsByDate?.slice(-7).map(d => d.plays) || [0, 0, 0, 0, 0, 0, 0];
  const sparklineUsers = [users.length, ...Array(6).fill(Math.max(0, users.length - 1))].reverse();

  const statCards = [
    { label: 'Total Plays', value: analytics?.overview.totalPlays ?? 0, sub: 'All time', gradient: CARD_GRADIENTS[0], spark: sparklinePlays, icon: <Play size={20} /> },
    { label: 'Total Users', value: users.length, sub: 'Registered', gradient: CARD_GRADIENTS[1], spark: sparklineUsers, icon: <Users size={20} /> },
    { label: 'Unique Songs', value: analytics?.overview.uniqueSongs ?? 0, sub: 'Ever played', gradient: CARD_GRADIENTS[2], spark: sparklinePlays.map(v => Math.floor(v * 0.7)), icon: <Headphones size={20} /> },
    { label: 'Admin Songs', value: songs.length, sub: 'Uploaded', gradient: CARD_GRADIENTS[3], spark: Array(7).fill(songs.length), icon: <Music size={20} /> },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d0d1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, border: '4px solid rgba(232,67,147,0.2)', borderTopColor: '#e84393', borderRadius: '50%', animation: 'spin 0.9s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#888', fontSize: 14 }}>Loading dashboard...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0d0d1a', fontFamily: "'Inter', sans-serif", color: '#fff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
        .admin-table tr:hover td { background: rgba(255,255,255,0.03); }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 11px 18px; border-radius: 12px; cursor: pointer; font-size: 14px; font-weight: 500; color: #888; transition: all 0.18s; margin-bottom: 4px; border: none; background: none; width: 100%; text-align: left; }
        .nav-item:hover { background: rgba(255,255,255,0.06); color: #fff; }
        .nav-item.active { background: linear-gradient(135deg, rgba(232,67,147,0.25), rgba(124,77,255,0.15)); color: #fff; box-shadow: 0 0 0 1px rgba(232,67,147,0.3) inset; }
        .nav-item.active svg { color: #e84393; }
        .stat-card { border-radius: 18px; padding: 22px; color: #fff; position: relative; overflow: hidden; cursor: default; transition: transform 0.2s; }
        .stat-card:hover { transform: translateY(-2px); }
        .action-btn { padding: 7px 14px; border-radius: 9px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #ccc; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.15s; display: inline-flex; align-items: center; gap: 6px; }
        .action-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .action-btn.primary { background: linear-gradient(135deg, #e84393, #c0185e); border-color: transparent; color: #fff; }
        .action-btn.primary:hover { opacity: 0.9; }
        .action-btn.danger { color: #f87171; border-color: rgba(248,113,113,0.3); }
        .action-btn.danger:hover { background: rgba(248,113,113,0.12); }
        .action-btn.success { color: #4ade80; border-color: rgba(74,222,128,0.3); }
        .action-btn.success:hover { background: rgba(74,222,128,0.1); }
        .glass-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; }
        .section-title { font-size: 15px; font-weight: 600; color: #fff; margin-bottom: 16px; display: flex; align-items: center; gap-8px; }
        .badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        .badge-red { background: rgba(248,113,113,0.15); color: #f87171; }
        .badge-green { background: rgba(74,222,128,0.12); color: #4ade80; }
        .badge-blue { background: rgba(99,102,241,0.15); color: #818cf8; }
        .badge-amber { background: rgba(251,191,36,0.15); color: #fbbf24; }
        .input-dark { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 9px 14px; color: #fff; font-size: 13px; outline: none; width: 100%; transition: border 0.15s; }
        .input-dark:focus { border-color: rgba(232,67,147,0.5); }
        .input-dark::placeholder { color: #555; }
      `}</style>

      {/* ── SIDEBAR ──────────────────────────────────────────── */}
      <aside style={{ width: 220, background: '#111122', borderRight: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column', padding: '24px 12px', flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px 28px' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #e84393, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#fff', lineHeight: 1 }}>AudioNova</p>
            <p style={{ fontSize: 10, color: '#e84393', fontWeight: 600, letterSpacing: 1 }}>ADMIN</p>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: '#444', fontWeight: 600, letterSpacing: 1.5, padding: '0 10px 10px', textTransform: 'uppercase' }}>Main Menu</p>
          {NAV_ITEMS.filter(item => !item.superOnly || isSuperAdmin).map(item => (
            <button key={item.id} className={`nav-item${page === item.id ? ' active' : ''}`} onClick={() => setPage(item.id)}>
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 16, marginTop: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 6px 12px' }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: isCoAdmin ? 'linear-gradient(135deg, #00bcd4, #7c4dff)' : 'linear-gradient(135deg, #e84393, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
              {isCoAdmin ? (coAdminUser?.name || coAdminUser?.username || 'C').charAt(0).toUpperCase() : (user?.email?.charAt(0).toUpperCase() || 'A')}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {isCoAdmin ? (coAdminUser?.name || coAdminUser?.username) : (user?.displayName || 'Super Admin')}
              </p>
              <p style={{ fontSize: 10, color: isCoAdmin ? '#00bcd4' : '#e84393', fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: 120 }}>
                {isCoAdmin ? 'Co-Admin' : 'Super Admin'}
              </p>
            </div>
          </div>
          <button className="nav-item" onClick={() => {
            if (isCoAdmin) {
              localStorage.removeItem('coAdminToken');
              localStorage.removeItem('coAdminUser');
              navigate('/admin/login');
            } else {
              logout();
              navigate('/');
            }
          }} style={{ color: '#f87171' }}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────── */}
      <main style={{ flex: 1, overflow: 'auto', padding: '28px 32px' }}>

        {/* ── TOP HEADER ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
              {NAV_ITEMS.find(n => n.id === page)?.label || 'Dashboard'}
            </h1>
            <p style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
              Welcome to AudioNova Admin · {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Loading...'}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              className="action-btn"
              onClick={() => navigate('/')}
              style={{ gap: 6 }}
            >
              <ArrowLeft size={13} /> Back to App
            </button>
            <button className="action-btn" onClick={() => loadData(true)} disabled={refreshing}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════ */}
        {/* OVERVIEW PAGE                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {page === 'overview' && (
          <div>
            {/* Stat Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
              {statCards.map((card, i) => (
                <div key={i} className={`stat-card bg-gradient-to-br ${card.gradient}`} style={{ background: `linear-gradient(135deg, ${['#e84393','#7c4dff','#ff8f00','#00bcd4'][i]}, ${['#c0185e','#5023b8','#e65100','#006064'][i]})` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{card.label}</p>
                      <p style={{ fontSize: 32, fontWeight: 800, marginTop: 4, lineHeight: 1 }}>{card.value.toLocaleString()}</p>
                      <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 6 }}>{card.sub}</p>
                    </div>
                    <div style={{ opacity: 0.8 }}>{card.icon}</div>
                  </div>
                  <div style={{ marginTop: 12, opacity: 0.8 }}>
                    <Sparkline data={card.spark} color="rgba(255,255,255,0.8)" />
                  </div>
                </div>
              ))}
            </div>

            {/* Plays Chart + Top Songs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 16 }}>
              {/* Plays Over Time */}
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600 }}>Plays Over Time</p>
                    <p style={{ fontSize: 11, color: '#555', marginTop: 2 }}>Daily play activity — last 14 days</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={analytics?.playsByDate?.slice(-14) || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e84393" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#e84393" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555' }} tickFormatter={d => { try { return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }); } catch { return d; } }} />
                    <YAxis tick={{ fontSize: 10, fill: '#555' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="plays" name="Plays" stroke="#e84393" strokeWidth={2.5} fill="url(#grad1)" dot={false} activeDot={{ r: 5, fill: '#e84393' }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Top Songs List */}
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>🔥 Top Songs Today</p>
                {analytics?.topSongs && analytics.topSongs.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {analytics.topSongs.slice(0, 7).map((song, i) => (
                      <div key={song.songId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: i < 3 ? '#e84393' : '#555', fontWeight: 700, width: 18, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{song.songTitle}</p>
                          <p style={{ fontSize: 10, color: '#666', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{song.artist}</p>
                        </div>
                        <span style={{ fontSize: 11, color: '#888', flexShrink: 0 }}>{song.playCount}×</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: '#444', fontSize: 13 }}>
                    <Activity size={28} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <p>No play data yet</p>
                    <p style={{ fontSize: 11, marginTop: 4, color: '#333' }}>Songs played will appear here</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Users + Most Active */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Recent Users */}
              <div className="glass-card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <p style={{ fontSize: 15, fontWeight: 600 }}>Recent Users</p>
                  <button className="action-btn" style={{ fontSize: 11 }} onClick={() => setPage('users')}>View All <ChevronRight size={12} /></button>
                </div>
                {users.length === 0 ? (
                  <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No users registered yet</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }} className="admin-table">
                    <thead>
                      <tr>
                        {['User', 'Email', 'Liked', 'Status'].map(h => (
                          <th key={h} style={{ textAlign: 'left', fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, padding: '0 8px 10px 0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {users.slice(0, 6).map(u => {
                        const avatarUrl = u.profilePicture ? (u.profilePicture.startsWith('/uploads') ? `${API_ENDPOINTS.BASE_URL}${u.profilePicture}` : u.profilePicture) : null;
                        return (
                          <tr key={u.id}>
                            <td style={{ padding: '8px 8px 8px 0' }}>
                              <div style={{ width: 30, height: 30, borderRadius: '50%', overflow: 'hidden', background: `linear-gradient(135deg, #e84393, #7c4dff)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={u.name || u.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  (u.name || u.email).charAt(0).toUpperCase()
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '8px 8px 8px 0', fontSize: 12, color: '#ccc', maxWidth: 140 }}>
                              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.name || u.email.split('@')[0]}</div>
                              <div style={{ fontSize: 10, color: '#555', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.email}</div>
                            </td>
                            <td style={{ padding: '8px 8px 8px 0', fontSize: 11, color: '#888' }}>{u.likedSongsCount}</td>
                            <td style={{ padding: '8px 0' }}>
                              <span className={`badge ${u.isBlocked ? 'badge-red' : 'badge-green'}`}>{u.isBlocked ? 'Blocked' : 'Active'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Most Active Listeners */}
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>👥 Most Active Listeners</p>
                {userAnalytics.length === 0 ? (
                  <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No listening data yet</p>
                ) : (
                  <div>
                    {userAnalytics.slice(0, 6).map((u, i) => (
                      <div key={u.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                        <span style={{ fontSize: 11, color: '#555', width: 18, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: `linear-gradient(135deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                          {u.userEmail.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <p style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{u.userEmail.split('@')[0]}</p>
                            <span style={{ fontSize: 11, color: '#e84393', fontWeight: 700, flexShrink: 0 }}>{u.totalPlays} plays</span>
                          </div>
                          <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, marginTop: 4 }}>
                            <div style={{ height: '100%', borderRadius: 2, background: CHART_COLORS[i % CHART_COLORS.length], width: `${Math.min(100, (u.totalPlays / (userAnalytics[0]?.totalPlays || 1)) * 100)}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* ANALYTICS PAGE                                       */}
        {/* ════════════════════════════════════════════════════ */}
        {page === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Full-width plays chart */}
            <div className="glass-card" style={{ padding: 28 }}>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Plays Over Time</p>
              <p style={{ fontSize: 11, color: '#555', marginBottom: 20 }}>Last 30 days · All users combined</p>
              {analytics?.playsByDate && analytics.playsByDate.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={analytics.playsByDate} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bigGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e84393" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#e84393" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#555' }} tickFormatter={d => { try { return new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' }); } catch { return d; } }} />
                    <YAxis tick={{ fontSize: 10, fill: '#555' }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="plays" name="Plays" stroke="#e84393" strokeWidth={2.5} fill="url(#bigGrad)" dot={false} activeDot={{ r: 6 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 13 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Activity size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                    <p>No play data yet — start playing songs to see analytics here</p>
                  </div>
                </div>
              )}
            </div>

            {/* Side by side: Top Songs Bar + User Play Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Top Songs</p>
                <p style={{ fontSize: 11, color: '#555', marginBottom: 20 }}>By total play count</p>
                {analytics?.topSongs && analytics.topSongs.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analytics.topSongs.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#555' }} />
                      <YAxis type="category" dataKey="songTitle" tick={{ fontSize: 10, fill: '#888' }} width={90} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="playCount" name="Plays" radius={[0, 6, 6, 0]}>
                        {analytics.topSongs.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 }}>No data yet</div>
                )}
              </div>

              <div className="glass-card" style={{ padding: 24 }}>
                <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>User Activity</p>
                <p style={{ fontSize: 11, color: '#555', marginBottom: 20 }}>Plays per user (top 8)</p>
                {analytics?.topUsers && analytics.topUsers.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={analytics.topUsers.slice(0, 8).map(u => ({ ...u, name: u.userEmail.split('@')[0] }))} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fill: '#555' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#888' }} width={80} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="playCount" name="Plays" radius={[0, 6, 6, 0]}>
                        {analytics.topUsers.slice(0, 8).map((_, i) => <Cell key={i} fill={CHART_COLORS[(i + 2) % CHART_COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 12 }}>No data yet</div>
                )}
              </div>
            </div>

            {/* User play history table */}
            <div className="glass-card" style={{ padding: 24 }}>
              <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>User Play History</p>
              {userAnalytics.length === 0 ? (
                <p style={{ color: '#444', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No user data yet</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="admin-table">
                  <thead>
                    <tr>
                      {['User Email', 'Total Plays', 'Unique Songs', 'First Play', 'Last Play'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, padding: '0 12px 12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {userAnalytics.map(u => (
                      <tr key={u.userId}>
                        <td style={{ padding: '11px 12px 11px 0', fontSize: 13, color: '#ccc', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{u.userEmail}</td>
                        <td style={{ padding: '11px 12px 11px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <span className="badge badge-blue">{u.totalPlays}</span>
                        </td>
                        <td style={{ padding: '11px 12px 11px 0', fontSize: 13, color: '#888', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{u.uniqueSongs}</td>
                        <td style={{ padding: '11px 12px 11px 0', fontSize: 11, color: '#666', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{new Date(u.firstPlay).toLocaleDateString()}</td>
                        <td style={{ padding: '11px 0 11px 0', fontSize: 11, color: '#666', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{new Date(u.lastPlay).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* SONGS PAGE                                           */}
        {/* ════════════════════════════════════════════════════ */}
        {page === 'songs' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button className="action-btn primary" onClick={() => setUploadOpen(true)}>
                <Plus size={13} /> Upload Song
              </button>
            </div>

            <div className="glass-card">
              {songs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
                  <Upload size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: 14, fontWeight: 500 }}>No songs uploaded yet</p>
                  <p style={{ fontSize: 12, marginTop: 6 }}>Upload your first custom song above</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="admin-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['#', 'Title', 'Artist', 'Album', 'Genre', 'Duration', 'Uploaded', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, padding: '14px 12px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((song, i) => (
                      <tr key={song.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '13px 12px', fontSize: 12, color: '#555' }}>{i + 1}</td>
                        <td style={{ padding: '13px 12px', fontSize: 13, fontWeight: 600, color: '#fff', maxWidth: 180 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: 8, background: 'linear-gradient(135deg, #e84393, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Music size={14} />
                            </div>
                            <span style={{ overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{song.title}</span>
                          </div>
                        </td>
                        <td style={{ padding: '13px 12px', fontSize: 12, color: '#aaa' }}>{song.artist}</td>
                        <td style={{ padding: '13px 12px', fontSize: 12, color: '#777' }}>{song.album}</td>
                        <td style={{ padding: '13px 12px' }}><span className="badge badge-blue">{song.genre}</span></td>
                        <td style={{ padding: '13px 12px', fontSize: 11, color: '#666' }}>{Math.floor(song.duration / 60)}:{String(song.duration % 60).padStart(2, '0')}</td>
                        <td style={{ padding: '13px 12px', fontSize: 11, color: '#555' }}>{new Date(song.uploadedAt).toLocaleDateString()}</td>
                        <td style={{ padding: '13px 12px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="action-btn" style={{ fontSize: 11, padding: '5px 10px' }} onClick={() => setEditSong(song)}><Edit size={11} /></button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="action-btn danger" style={{ fontSize: 11, padding: '5px 10px' }}><Trash2 size={11} /></button>
                              </AlertDialogTrigger>
                              <AlertDialogContent style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16 }}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle style={{ color: '#fff' }}>Delete Song</AlertDialogTitle>
                                  <AlertDialogDescription style={{ color: '#888' }}>Delete "{song.title}"? This action cannot be undone.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: 10 }}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(song.id)} style={{ background: '#ef4444', border: 'none', borderRadius: 10 }}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Upload Dialog */}
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogContent style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, color: '#fff', maxWidth: 480 }}>
                <DialogHeader>
                  <DialogTitle style={{ color: '#fff' }}>Upload New Song</DialogTitle>
                  <DialogDescription style={{ color: '#888' }}>MP3, AAC or OGG · Max 50MB · Saved permanently to MongoDB</DialogDescription>
                </DialogHeader>
                <SongUploadForm onSubmit={handleUpload} />
              </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editSong} onOpenChange={open => { if (!open) setEditSong(null); }}>
              <DialogContent style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, color: '#fff', maxWidth: 480 }}>
                <DialogHeader>
                  <DialogTitle style={{ color: '#fff' }}>Edit Song</DialogTitle>
                  <DialogDescription style={{ color: '#888' }}>Update song metadata in MongoDB</DialogDescription>
                </DialogHeader>
                {editSong && <SongEditForm song={editSong} onSubmit={data => handleUpdate(editSong.id, data)} />}
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* USERS PAGE                                           */}
        {/* ════════════════════════════════════════════════════ */}
        {page === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                <input className="input-dark" placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ paddingLeft: 36 }} />
              </div>
              <span style={{ fontSize: 12, color: '#555' }}>{filteredUsers.length} users</span>
            </div>

            <div className="glass-card">
              {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
                  <Users size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: 14 }}>No users found</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="admin-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['User', 'Email', 'Liked Songs', 'Joined', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, padding: '14px 12px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const avatarUrl = u.profilePicture ? (u.profilePicture.startsWith('/uploads') ? `${API_ENDPOINTS.BASE_URL}${u.profilePicture}` : u.profilePicture) : null;
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: u.isBlocked ? 'rgba(248,113,113,0.03)' : 'transparent' }}>
                          <td style={{ padding: '13px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: u.isBlocked ? 'rgba(248,113,113,0.2)' : 'linear-gradient(135deg, #e84393, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0, color: u.isBlocked ? '#f87171' : '#fff' }}>
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt={u.name || u.email} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  (u.name || u.email).charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{u.name || 'User'}</p>
                                {u.isBlocked && <span style={{ fontSize: 10, color: '#f87171' }}>Blocked{u.blockedReason ? `: ${u.blockedReason}` : ''}</span>}
                              </div>
                            </div>
                          </td>
                        <td style={{ padding: '13px 12px', fontSize: 12, color: '#aaa' }}>{u.email}</td>
                        <td style={{ padding: '13px 12px', fontSize: 13, color: '#ccc', fontWeight: 600 }}>{u.likedSongsCount}</td>
                        <td style={{ padding: '13px 12px', fontSize: 11, color: '#666' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '13px 12px' }}>
                          <span className={`badge ${u.isBlocked ? 'badge-red' : 'badge-green'}`}>{u.isBlocked ? 'Blocked' : 'Active'}</span>
                        </td>
                        <td style={{ padding: '13px 12px' }}>
                          {u.isBlocked ? (
                            <button className="action-btn success" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => handleUnblock(u.firebaseUid || u.id)}>
                              <UserCheck size={11} /> Unblock
                            </button>
                          ) : (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button className="action-btn danger" style={{ fontSize: 11, padding: '5px 12px' }}>
                                  <UserX size={11} /> Block
                                </button>
                              </AlertDialogTrigger>
                              <AlertDialogContent style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16 }}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle style={{ color: '#fff' }}>Block User?</AlertDialogTitle>
                                  <AlertDialogDescription style={{ color: '#888' }}>Block {u.email}? They won't be able to access the platform.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: 10 }}>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleBlock(u.firebaseUid || u.id)} style={{ background: '#ef4444', border: 'none', borderRadius: 10 }}>Block</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* FEATURED PAGE                                        */}
        {/* ════════════════════════════════════════════════════ */}
        {page === 'featured' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="glass-card" style={{ padding: '14px 20px', flex: 1, marginRight: 12, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28 }}>⭐</div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {currentSong ? `Currently playing: ${currentSong.name}` : 'Play a song to feature it on the home page'}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', marginTop: 3 }}>Featured songs appear in the "Featured Picks" section for all users</p>
                </div>
                <button className="action-btn primary" onClick={handleFeatureCurrent} disabled={!currentSong}>
                  <Star size={13} /> Feature Now
                </button>
              </div>
            </div>

            <div className="glass-card">
              {featuredSongs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
                  <Star size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: 14, fontWeight: 500 }}>No featured songs yet</p>
                  <p style={{ fontSize: 12, marginTop: 6 }}>Play any song and click "Feature Now" above</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="admin-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['#', 'Song', 'Artist', 'Featured On', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, padding: '14px 12px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {featuredSongs.map((song, i) => {
                      const imgSrc = typeof song.image === 'string' ? song.image
                        : Array.isArray(song.image) ? (typeof song.image[song.image.length - 1] === 'string' ? song.image[song.image.length - 1] : (song.image[song.image.length - 1] as any)?.link) : null;
                      return (
                        <tr key={song._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '13px 12px', fontSize: 12, color: '#e84393', fontWeight: 700 }}>#{i + 1}</td>
                          <td style={{ padding: '13px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.06)' }}>
                                {imgSrc ? <img src={imgSrc} alt={song.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🎵</div>}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{song.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '13px 12px', fontSize: 12, color: '#aaa' }}>{song.primaryArtists}</td>
                          <td style={{ padding: '13px 12px', fontSize: 11, color: '#666' }}>{new Date(song.featuredAt).toLocaleDateString()}</td>
                          <td style={{ padding: '13px 12px' }}>
                            <button className="action-btn danger" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => handleUnfeature(song._id)}>
                              <StarOff size={11} /> Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════ */}
        {/* CO-ADMINS PAGE (SUPER ADMIN ONLY)                   */}
        {/* ════════════════════════════════════════════════════ */}
        {page === 'coadmins' && isSuperAdmin && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="glass-card" style={{ padding: '16px 22px', flex: 1, marginRight: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #00bcd4, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Shield size={22} color="#fff" />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Co-Admin Login Portal Link</p>
                  <p style={{ fontSize: 11, color: '#777', marginTop: 2 }}>
                    Co-Admins can log in anytime using: <code style={{ color: '#00bcd4', background: 'rgba(0,188,212,0.1)', padding: '2px 8px', borderRadius: 6 }}>http://localhost:5173/admin/login</code>
                  </p>
                </div>
                <button
                  className="action-btn"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/admin/login`);
                    toast.success('Co-Admin portal link copied!');
                  }}
                  style={{ gap: 6 }}
                >
                  <Copy size={13} /> Copy Portal Link
                </button>
              </div>

              <button className="action-btn primary" onClick={() => setCreateCoAdminOpen(true)} style={{ padding: '12px 20px', fontSize: 13 }}>
                <UserPlus size={14} /> Create Co-Admin
              </button>
            </div>

            <div className="glass-card">
              {coAdmins.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#444' }}>
                  <Shield size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontSize: 14, fontWeight: 500 }}>No Co-Admin accounts created yet</p>
                  <p style={{ fontSize: 12, marginTop: 6 }}>Click "Create Co-Admin" above to add your first manager account</p>
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }} className="admin-table">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                      {['Name', 'Username', 'Role', 'Created By', 'Created On', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', fontSize: 10, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, padding: '14px 12px' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {coAdmins.map(ca => (
                      <tr key={ca._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '13px 12px', fontSize: 13, fontWeight: 600, color: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #00bcd4, #7c4dff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
                              {ca.name.charAt(0).toUpperCase()}
                            </div>
                            <span>{ca.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '13px 12px', fontSize: 12, color: '#00bcd4', fontWeight: 600 }}>@{ca.username}</td>
                        <td style={{ padding: '13px 12px' }}><span className="badge badge-blue">Co-Admin</span></td>
                        <td style={{ padding: '13px 12px', fontSize: 11, color: '#aaa' }}>{ca.createdBy}</td>
                        <td style={{ padding: '13px 12px', fontSize: 11, color: '#666' }}>{new Date(ca.createdAt).toLocaleDateString()}</td>
                        <td style={{ padding: '13px 12px' }}>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button className="action-btn danger" style={{ fontSize: 11, padding: '5px 12px' }}>
                                <Trash2 size={11} /> Revoke Access
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16 }}>
                              <AlertDialogHeader>
                                <AlertDialogTitle style={{ color: '#fff' }}>Revoke Co-Admin Access?</AlertDialogTitle>
                                <AlertDialogDescription style={{ color: '#888' }}>
                                  Revoke access for @{ca.username}? They will no longer be able to log into the Admin Dashboard.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel style={{ background: 'rgba(255,255,255,0.06)', border: 'none', color: '#fff', borderRadius: 10 }}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCoAdminClick(ca._id)} style={{ background: '#ef4444', border: 'none', borderRadius: 10 }}>Revoke</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Create Co-Admin Dialog */}
            <Dialog open={createCoAdminOpen} onOpenChange={setCreateCoAdminOpen}>
              <DialogContent style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 18, color: '#fff', maxWidth: 440 }}>
                <DialogHeader>
                  <DialogTitle style={{ color: '#fff' }}>Create Co-Admin Account</DialogTitle>
                  <DialogDescription style={{ color: '#888' }}>
                    Create custom credentials for a new manager to access the Admin Dashboard
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateCoAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Full Name *</label>
                    <input className="input-dark" placeholder="e.g. Albin Manager" value={coAdminForm.name} onChange={e => setCoAdminForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Username *</label>
                    <input className="input-dark" placeholder="e.g. albin_admin" value={coAdminForm.username} onChange={e => setCoAdminForm(p => ({ ...p, username: e.target.value.toLowerCase().trim() }))} required />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <label style={{ fontSize: 11, color: '#888', fontWeight: 600 }}>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCreatePass ? 'text' : 'password'}
                        className="input-dark"
                        placeholder="••••••••••••"
                        value={coAdminForm.password}
                        onChange={e => setCoAdminForm(p => ({ ...p, password: e.target.value }))}
                        style={{ paddingRight: 36 }}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCreatePass(!showCreatePass)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: showCreatePass ? '#e84393' : '#666',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        {showCreatePass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <DialogFooter style={{ marginTop: 8 }}>
                    <button
                      type="submit"
                      disabled={coAdminSubmitting}
                      onClick={handleCreateCoAdminSubmit}
                      className="action-btn primary"
                      style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13 }}
                    >
                      {coAdminSubmitting ? (
                        <>
                          <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Creating Account...
                        </>
                      ) : (
                        <>
                          <UserPlus size={14} /> Save & Create Account
                        </>
                      )}
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
};

// ── Upload Form ────────────────────────────────────────────────────
const SongUploadForm: React.FC<{ onSubmit: (fd: FormData) => void }> = ({ onSubmit }) => {
  const [form, setForm] = useState({ title: '', artist: '', album: '', genre: '', duration: '' });
  const [file, setFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error('Select a song file');
    const fd = new FormData();
    fd.append('song', file);
    if (coverFile) fd.append('cover', coverFile);
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    onSubmit(fd);
  };

  const s: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
  const l: React.CSSProperties = { fontSize: 11, color: '#888', fontWeight: 600 };

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={s}><label style={l}>Audio File (MP3, WAV) *</label><input type="file" accept="audio/*" onChange={e => setFile(e.target.files?.[0] || null)} required style={{ color: '#ccc', fontSize: 12 }} /></div>
        <div style={s}><label style={l}>Cover Art / Album Image (Optional)</label><input type="file" accept="image/*" onChange={e => setCoverFile(e.target.files?.[0] || null)} style={{ color: '#ccc', fontSize: 12 }} /></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={s}><label style={l}>Title *</label><input className="input-dark" value={form.title} onChange={f('title')} required placeholder="Song title" /></div>
        <div style={s}><label style={l}>Artist *</label><input className="input-dark" value={form.artist} onChange={f('artist')} required placeholder="Artist name" /></div>
        <div style={s}><label style={l}>Album</label><input className="input-dark" value={form.album} onChange={f('album')} placeholder="Album name" /></div>
        <div style={s}><label style={l}>Genre</label><input className="input-dark" value={form.genre} onChange={f('genre')} placeholder="e.g. Pop" /></div>
      </div>
      <DialogFooter>
        <button type="submit" className="action-btn primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13 }}>
          <Upload size={14} /> Upload Song
        </button>
      </DialogFooter>
    </form>
  );
};

// ── Edit Form ──────────────────────────────────────────────────────
const SongEditForm: React.FC<{ song: Song; onSubmit: (d: Partial<Song>) => void }> = ({ song, onSubmit }) => {
  const [form, setForm] = useState({ title: song.title, artist: song.artist, album: song.album, genre: song.genre, duration: String(song.duration) });
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));
  const s: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };
  const l: React.CSSProperties = { fontSize: 11, color: '#888', fontWeight: 600 };

  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit({ ...form, duration: parseInt(form.duration) }); }} style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={s}><label style={l}>Title</label><input className="input-dark" value={form.title} onChange={f('title')} required /></div>
        <div style={s}><label style={l}>Artist</label><input className="input-dark" value={form.artist} onChange={f('artist')} required /></div>
        <div style={s}><label style={l}>Album</label><input className="input-dark" value={form.album} onChange={f('album')} /></div>
        <div style={s}><label style={l}>Genre</label><input className="input-dark" value={form.genre} onChange={f('genre')} /></div>
      </div>
      <DialogFooter>
        <button type="submit" className="action-btn primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13 }}>Save Changes</button>
      </DialogFooter>
    </form>
  );
};

export default AdminDashboard;