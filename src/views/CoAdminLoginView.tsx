import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, KeyRound, User, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { coAdminLogin } from '../services/adminApi';

const CoAdminLoginView: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!username.trim() || !password.trim()) {
      const msg = 'Username and password are required';
      setErrorMsg(msg);
      return toast.error(msg);
    }

    setLoading(true);
    try {
      const res = await coAdminLogin(username.trim(), password);
      if (res.success && res.token) {
        localStorage.setItem('coAdminToken', res.token);
        localStorage.setItem('coAdminUser', JSON.stringify(res.coAdmin));
        toast.success(`Welcome back, ${res.coAdmin.name || res.coAdmin.username}!`);
        navigate('/admin');
      } else {
        setErrorMsg('Invalid credentials');
        toast.error('Invalid credentials');
      }
    } catch (err: any) {
      console.error('Co-Admin login failed:', err);
      const serverMsg = err.response?.data?.error || 'Login failed. Please check credentials.';
      setErrorMsg(serverMsg);
      toast.error(serverMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d1a',
      fontFamily: "'Inter', sans-serif",
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      color: '#fff',
      position: 'relative'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        .input-box {
          width: 100%;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 12px 16px 12px 42px;
          color: #fff;
          font-size: 14px;
          outline: none;
          transition: all 0.2s;
        }
        .input-box:focus {
          border-color: #e84393;
          background: rgba(255, 255, 255, 0.08);
          box-shadow: 0 0 15px rgba(232, 67, 147, 0.25);
        }
        .input-box::placeholder { color: #555; }
        .btn-submit {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          background: linear-gradient(135deg, #e84393, #7c4dff);
          border: none;
          color: #fff;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .btn-submit:hover {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(232, 67, 147, 0.35);
        }
        .btn-submit:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Top Left Return Button */}
      <button
        onClick={() => navigate('/')}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10,
          padding: '8px 16px',
          color: '#ccc',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 6
        }}
      >
        <ArrowLeft size={14} /> Back to Music App
      </button>

      {/* Login Glass Card */}
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: 24,
        padding: '36px 32px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Header Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #e84393, #7c4dff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 10px 25px rgba(232, 67, 147, 0.4)'
          }}>
            <ShieldAlert size={28} color="#fff" />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Co-Admin Portal</h2>
          <p style={{ fontSize: 13, color: '#777', marginTop: 6 }}>
            Enter your credentials provided by Super Admin
          </p>
        </div>

        {/* Error Notification Alert */}
        {errorMsg && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 14,
            padding: '12px 16px',
            marginBottom: 20,
            color: '#f87171',
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            lineHeight: 1.4
          }}>
            <ShieldAlert size={22} style={{ flexShrink: 0, color: '#ef4444' }} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Username Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input
                type="text"
                className="input-box"
                placeholder="coadmin_username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Password Input */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-box"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ paddingRight: 40 }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: showPassword ? '#e84393' : '#666',
                  cursor: 'pointer',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button type="submit" className="btn-submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <KeyRound size={18} />}
            {loading ? 'Authenticating...' : 'Access Dashboard'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#444', marginTop: 24, margin: 0 }}>
          AudioNova Management Portal · Secured with Zero-Trust Authentication
        </p>
      </div>
    </div>
  );
};

export default CoAdminLoginView;
