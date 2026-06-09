import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Leaf, Palmtree, Factory, Truck, User, ShieldCheck, ArrowRight, ArrowLeft, Globe2, AlertCircle } from 'lucide-react';
import PetaniDashboard from './pages/PetaniDashboard';
import MillDashboard from './pages/MillDashboard';
import AgentDashboard from './pages/AgentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import { supabase } from './lib/supabase';
import './index.css';

// ── Helpers ──────────────────────────────────────────────────
function getRoleLabel(role) {
  return { petani: 'Petani', mill: 'Staf Mill', agent: 'Agen CPO', admin: 'Super Admin' }[role] || role;
}
function getRoleColor(role) {
  return { petani: '#15803d', mill: '#d97706', agent: '#3b82f6', admin: '#7c3aed' }[role] || '#64748b';
}

// ── Login Screen ──────────────────────────────────────────────
// ── Register Screen ───────────────────────────────────────────
function RegisterScreen({ onBackToLogin, onRegisterSuccess }) {
  const [role, setRole] = useState('petani');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Fields for farmer (petani)
  const [nik, setNik] = useState('');
  const [tipeUsaha, setTipeUsaha] = useState('smallholder');
  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [noTelp, setNoTelp] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password minimal 6 karakter.');
      setIsLoading(false);
      return;
    }

    if (role === 'petani') {
      if (!nik || nik.length !== 16 || isNaN(nik)) {
        setErrorMsg('NIK harus berupa 16 digit angka.');
        setIsLoading(false);
        return;
      }
    }

    try {
      // 1. Coba registrasi ke Supabase
      const newUserData = {
        role,
        full_name: fullName,
        email,
        password_hash: password,
        status: 'active',
        nik: role === 'petani' ? nik : null,
        tipe_usaha: role === 'petani' ? tipeUsaha : null,
        nama_perusahaan: (role === 'petani' && tipeUsaha === 'perusahaan') ? namaPerusahaan : null,
        no_telp: noTelp || null,
      };

      let supabaseSuccess = false;
      let createdUser = null;
      try {
        const { data, error } = await supabase
          .from('users')
          .insert(newUserData)
          .select()
          .single();

        if (error) {
          console.error("Supabase insert error:", error);
          if (error.code === '23505') {
            setErrorMsg('Email atau NIK sudah terdaftar.');
            setIsLoading(false);
            return;
          }
          throw error;
        } else if (data) {
          supabaseSuccess = true;
          createdUser = data;
        }
      } catch (err) {
        console.warn("Fallback to local storage due to DB issue:", err);
      }

      // 2. Simpan secara lokal sebagai fallback
      const localId = createdUser?.id || `user-${Date.now()}`;
      const savedUser = {
        id: localId,
        ...newUserData
      };

      const savedUsers = JSON.parse(localStorage.getItem('agrigems_registered_users') || '{}');
      savedUsers[email] = savedUser;
      localStorage.setItem('agrigems_registered_users', JSON.stringify(savedUsers));

      onRegisterSuccess(email, 'Registrasi berhasil! Silakan masuk menggunakan akun baru Anda.');
    } catch (err) {
      setErrorMsg('Terjadi kesalahan saat registrasi: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-fade-in" style={{ width: '100%' }}>
      <button onClick={onBackToLogin}
        style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', padding: 0, fontSize: '.85rem', fontWeight: 600, transition: 'color .2s' }}
        onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'}
        onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
      >
        <ArrowLeft size={15}/> Kembali ke Login
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.5rem' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--primary)', boxShadow: `0 0 0 3px var(--primary-light)` }}/>
        <h3 style={{ fontSize: '1.3rem' }}>Registrasi Akun Baru</h3>
      </div>

      {errorMsg && (
        <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '.9rem', borderRadius: '.6rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.88rem' }}>
          <AlertCircle size={17}/> {errorMsg}
        </div>
      )}

      <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Pilih Peran (Role)</label>
          <select className="input-premium" value={role} onChange={e => setRole(e.target.value)}>
            <option value="petani">Petani Sawit</option>
            <option value="mill">Staf Pabrik (Mill)</option>
            <option value="agent">Agen Logistik CPO (Agent)</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Nama Lengkap</label>
          <input type="text" className="input-premium" value={fullName} onChange={e => setFullName(e.target.value)} required placeholder="Masukkan nama lengkap"/>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Email</label>
          <input type="email" className="input-premium" value={email} onChange={e => setEmail(e.target.value)} required placeholder="nama@email.com"/>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Password</label>
          <input type="text" style={{ WebkitTextSecurity: 'disc' }} autoComplete="off" className="input-premium" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 6 karakter"/>
        </div>

        {role === 'petani' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>NIK KTP (16 Digit)</label>
              <input type="text" className="input-premium" value={nik} onChange={e => setNik(e.target.value)} required maxLength={16} placeholder="Contoh: 1234567890123456"/>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Tipe Usaha</label>
              <select className="input-premium" value={tipeUsaha} onChange={e => setTipeUsaha(e.target.value)}>
                <option value="smallholder">Petani Mandiri (Smallholder)</option>
                <option value="perusahaan">Perusahaan Terbatas (PT)</option>
              </select>
            </div>

            {tipeUsaha === 'perusahaan' && (
              <div>
                <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Nama Perusahaan</label>
                <input type="text" className="input-premium" value={namaPerusahaan} onChange={e => setNamaPerusahaan(e.target.value)} required placeholder="Contoh: PT Sawit Jaya"/>
              </div>
            )}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Nomor Telepon</label>
          <input type="text" className="input-premium" value={noTelp} onChange={e => setNoTelp(e.target.value)} placeholder="Contoh: 08123456789"/>
        </div>

        <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '.9rem', marginTop: '.25rem', fontSize: '.95rem' }} disabled={isLoading}>
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
              <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }}/>
              Memproses Pendaftaran...
            </span>
          ) : (
            <><span>Daftar Sekarang</span><ArrowRight size={17}/></>
          )}
        </button>
      </form>
    </div>
  );
}

// ── Login Screen ──────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg]   = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const roleCredentials = {
    petani: { email: 'petani1@agrigems.com', password: 'petani123' },
    mill:   { email: 'mill@agrigems.com',   password: 'mill123'   },
    agent:  { email: 'agent@agrigems.com',  password: 'agent123'  },
    admin:  { email: 'admin@agrigems.com',  password: 'admin123'  },
  };

  const MOCK_USERS = {
    'petani1@agrigems.com': { id: 'petani-1', full_name: 'Bpk Budi', role: 'petani', nik: '1234567890123456' },
    'petani2@agrigems.com': { id: 'petani-2', full_name: 'Bpk Santoso', role: 'petani', nik: '9876543210987654' },
    'mill@agrigems.com': { id: 'mill-1', full_name: 'Staf Mill Alpha', role: 'mill' },
    'agent@agrigems.com': { id: 'agent-1', full_name: 'Agen Logistik', role: 'agent' },
    'admin@agrigems.com': { id: 'admin-1', full_name: 'Super Admin', role: 'admin' },
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setEmail('');
    setPassword('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      // 1. Cek User Terdaftar Lokal (localStorage)
      const localUsers = JSON.parse(localStorage.getItem('agrigems_registered_users') || '{}');
      if (localUsers[email] && localUsers[email].password_hash === password) {
        setTimeout(() => {
          onLogin(localUsers[email].role, localUsers[email]);
          navigate('/dashboard');
          setIsLoading(false);
        }, 500);
        return;
      }

      // 2. Cek Mock User
      if (MOCK_USERS[email]) {
        const mockRole = MOCK_USERS[email].role;
        const correctPassword = roleCredentials[mockRole]?.password;
        if (password === correctPassword) {
          setTimeout(() => {
            onLogin(mockRole, MOCK_USERS[email]);
            navigate('/dashboard');
            setIsLoading(false);
          }, 500);
          return;
        } else {
          setErrorMsg('Email atau password salah.');
          setIsLoading(false);
          return;
        }
      }

      // 3. Cek Database Supabase
      const { data, error } = await supabase
        .from('users').select('*')
        .eq('email', email).eq('password_hash', password).single();
      if (error) {
        if (error.code === 'PGRST116') setErrorMsg('Email atau password salah.');
        else setErrorMsg('Gagal login: ' + error.message);
      } else if (data) {
        onLogin(data.role, data);
        navigate('/dashboard');
      }
    } catch {
      setErrorMsg('Terjadi kesalahan jaringan.');
    } finally {
      const localUsers = JSON.parse(localStorage.getItem('agrigems_registered_users') || '{}');
      const isLocalOrMock = localUsers[email] || (MOCK_USERS[email] && roleCredentials[MOCK_USERS[email].role]?.password === password);
      if (!isLocalOrMock) setIsLoading(false);
    }
  };

  const handleRegisterSuccess = (registeredEmail, message) => {
    setIsRegistering(false);
    setEmail(registeredEmail);
    setPassword('');
    setSuccessMsg(message);
  };

  const roles = [
    { key: 'petani', label: 'Petani',      desc: 'Kelola lahan, siklus & surat jalan',    icon: <Palmtree size={22}/>, bg: '#ecfdf5', color: '#15803d' },
    { key: 'mill',   label: 'Staf Mill',   desc: 'Penerimaan, batching & distribusi CPO', icon: <Factory  size={22}/>, bg: '#fff7ed', color: '#d97706' },
    { key: 'agent',  label: 'Agen CPO',    desc: 'Transparansi & traceability produk',    icon: <Truck    size={22}/>, bg: '#eff6ff', color: '#3b82f6' },
  ];

  return (
    <div className="landing-layout">
      {/* Hero */}
      <div className="landing-hero">
        <div className="hero-particles">
          <span/><span/><span/><span/><span/><span/>
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 580 }}>
          <div className="hero-badge">
            <span className="hero-badge-dot"/>
            <Globe2 size={14}/> Sistem Keterlacakan Sawit Terpadu
          </div>

          <h1 className="hero-heading">
            Transformasi{' '}
            <span className="hero-heading-accent">Rantai Pasok</span>{' '}
            Agrikultur
          </h1>

          <p className="hero-description">
            Agrigems Trace mengintegrasikan petani, pabrik, dan agen untuk memberikan
            transparansi penuh — dari kebun hingga CPO siap distribusi.
          </p>

          <div className="hero-features">
            {[
              { icon: <ShieldCheck size={17}/>, title: 'Transparansi Tinggi', desc: 'Lacak tiap tahap dari kebun ke pabrik secara real-time', color: '#16a34a', bg: 'rgba(22,163,74,.2)' },
              { icon: <Leaf size={17}/>, title: 'ISPO / RSPO Ready', desc: 'Audit trail lengkap untuk mendukung sertifikasi internasional', color: '#f59e0b', bg: 'rgba(245,158,11,.2)' },
              { icon: <Globe2 size={17}/>, title: 'GIS Terintegrasi', desc: 'Peta interaktif lahan dan distribusi berbasis geospasial', color: '#3b82f6', bg: 'rgba(59,130,246,.2)' },
              { icon: <User size={17}/>, title: 'Multi-Role Access', desc: 'Hak akses terpisah untuk petani, mill, agen, dan admin', color: '#7c3aed', bg: 'rgba(124,58,237,.2)' },
            ].map(c => (
              <div key={c.title} className="hero-feature-card">
                <div className="hero-feature-icon" style={{ background: c.bg }}>
                  <span style={{ color: c.color }}>{c.icon}</span>
                </div>
                <div className="hero-feature-title">{c.title}</div>
                <div className="hero-feature-desc">{c.desc}</div>
              </div>
            ))}
          </div>

          <div className="hero-stats">
            {[
              { value: '2.400+', label: 'Petani Terdaftar' },
              { value: '18', label: 'Mitra Mill' },
              { value: '100%', label: 'Jejak Terekam' },
            ].map(s => (
              <div key={s.label}>
                <div className="hero-stat-value">{s.value}</div>
                <div className="hero-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="landing-form-container">
        <div style={{ width: '100%', maxWidth: 380 }} className="animate-fade-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '2rem' }}>
            <div style={{ background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', padding: '.7rem', borderRadius: '.75rem', color: 'white', boxShadow: '0 4px 12px rgba(22,163,74,.35)', display: 'flex' }}>
              <Palmtree size={24}/>
            </div>
            <div>
              <h2 className="title-lg" style={{ color: 'var(--primary-dark)', margin: 0, fontSize: '1.4rem' }}>Agrigems Trace</h2>
              <p style={{ fontSize: '.75rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>Supply Chain Intelligence</p>
            </div>
          </div>

          {isRegistering ? (
            <RegisterScreen 
              onBackToLogin={() => { setIsRegistering(false); setErrorMsg(''); setSuccessMsg(''); }}
              onRegisterSuccess={handleRegisterSuccess}
            />
          ) : !selectedRole ? (
            <>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '.35rem', color: 'var(--text-main)' }}>Selamat Datang 👋</h3>
              <p className="text-muted" style={{ marginBottom: '1.75rem', fontSize: '.88rem', lineHeight: 1.6 }}>
                Pilih peran Anda untuk masuk ke sistem manajemen rantai pasok sawit.
              </p>
              
              {successMsg && (
                <div style={{ background: '#ecfdf5', border: '1px solid #34d399', color: '#065f46', padding: '.9rem', borderRadius: '.6rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.88rem' }}>
                  <ShieldCheck size={17} style={{ color: '#10b981' }}/> {successMsg}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '.65rem' }}>
                {roles.map(r => (
                  <button key={r.key} className="role-btn" id={`role-btn-${r.key}`} onClick={() => handleSelectRole(r.key)}>
                    <div className="role-icon" style={{ background: r.bg, color: r.color }}>{r.icon}</div>
                    <div className="role-text">
                      <span className="role-title">{r.label}</span>
                      <span className="role-desc">{r.desc}</span>
                    </div>
                    <ArrowRight size={16} className="role-arrow"/>
                  </button>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', margin: '.25rem 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
                  <span style={{ fontSize: '.75rem', color: 'var(--text-lighter)', fontWeight: 600 }}>ADMIN</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }}/>
                </div>
                <button className="role-btn" id="role-btn-admin" onClick={() => handleSelectRole('admin')}>
                  <div className="role-icon" style={{ background: '#f5f3ff', color: '#7c3aed' }}><ShieldCheck size={22}/></div>
                  <div className="role-text">
                    <span className="role-title">Super Admin</span>
                    <span className="role-desc">Manajemen sistem keseluruhan</span>
                  </div>
                  <ArrowRight size={16} className="role-arrow"/>
                </button>
              </div>

              <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Atau ingin membuat akun baru? </span>
                <button onClick={() => { setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-mid)', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Daftar di sini
                </button>
              </div>
            </>
          ) : (
            <div className="animate-fade-in">
              <button onClick={() => { setSelectedRole(null); setErrorMsg(''); setSuccessMsg(''); }}
                style={{ background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--text-muted)', cursor: 'pointer', marginBottom: '1.5rem', padding: 0, fontSize: '.85rem', fontWeight: 600, transition: 'color .2s' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--text-main)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <ArrowLeft size={15}/> Kembali ke pilihan peran
              </button>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '1.5rem' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: getRoleColor(selectedRole), boxShadow: `0 0 0 3px ${getRoleColor(selectedRole)}30` }}/>
                <h3 style={{ fontSize: '1.3rem' }}>Login {getRoleLabel(selectedRole)}</h3>
              </div>

              {successMsg && (
                <div style={{ background: '#ecfdf5', border: '1px solid #34d399', color: '#065f46', padding: '.9rem', borderRadius: '.6rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.88rem' }}>
                  <ShieldCheck size={17} style={{ color: '#10b981' }}/> {successMsg}
                </div>
              )}

              {errorMsg && (
                <div style={{ background: '#fef2f2', border: '1px solid #f87171', color: '#b91c1c', padding: '.9rem', borderRadius: '.6rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.88rem' }}>
                  <AlertCircle size={17}/> {errorMsg}
                </div>
              )}

              {/* Petunjuk Kredensial Akun Demo */}
              <div style={{
                background: 'var(--primary-light)',
                border: '1.5px solid rgba(22,163,74,.3)',
                color: 'var(--primary-dark)',
                padding: '.8rem 1rem',
                borderRadius: 'var(--radius-md)',
                marginBottom: '1.25rem',
                fontSize: '.82rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '.3rem',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                  <ShieldCheck size={16} style={{ color: 'var(--primary-mid)' }}/> Petunjuk Akun Percobaan:
                </div>
                <div style={{ fontFamily: 'sans-serif', fontSize: '.8rem' }}>
                  {selectedRole === 'petani' && (
                    <>
                      <div>Email 1: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>petani1@agrigems.com</code></div>
                      <div>Email 2: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>petani2@agrigems.com</code></div>
                      <div style={{ marginTop: '2px' }}>Password: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>petani123</code></div>
                    </>
                  )}
                  {selectedRole === 'mill' && (
                    <>
                      <div>Email: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>mill@agrigems.com</code></div>
                      <div style={{ marginTop: '2px' }}>Password: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>mill123</code></div>
                    </>
                  )}
                  {selectedRole === 'agent' && (
                    <>
                      <div>Email: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>agent@agrigems.com</code></div>
                      <div style={{ marginTop: '2px' }}>Password: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>agent123</code></div>
                    </>
                  )}
                  {selectedRole === 'admin' && (
                    <>
                      <div>Email: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>admin@agrigems.com</code></div>
                      <div style={{ marginTop: '2px' }}>Password: <code style={{ fontWeight: 700, background: 'rgba(0,0,0,.05)', padding: '2px 4px', borderRadius: '4px' }}>admin123</code></div>
                    </>
                  )}
                </div>
              </div>

              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Email</label>
                  <input type="email" className="input-premium" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@agrigems.com"/>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '.83rem', fontWeight: 700, marginBottom: '.4rem', color: 'var(--text-main)' }}>Password</label>
                  <input type="text" style={{ WebkitTextSecurity: 'disc' }} autoComplete="off" className="input-premium" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"/>
                </div>
                <button type="submit" id="btn-login-submit" className="btn-primary" style={{ justifyContent: 'center', padding: '.9rem', marginTop: '.25rem', fontSize: '.95rem' }} disabled={isLoading}>
                  {isLoading ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                      <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }}/>
                      Memeriksa...
                    </span>
                  ) : (
                    <><span>Masuk ke Dasbor</span><ArrowRight size={17}/></>
                  )}
                </button>
              </form>

              <div style={{ marginTop: '1.25rem', textAlign: 'center', fontSize: '.85rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Belum punya akun? </span>
                <button type="button" onClick={() => { setIsRegistering(true); setErrorMsg(''); setSuccessMsg(''); }} style={{ background: 'none', border: 'none', color: 'var(--primary-mid)', fontWeight: 700, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                  Daftar di sini
                </button>
              </div>
            </div>
          )}

          <p style={{ marginTop: '2rem', fontSize: '.72rem', color: 'var(--text-lighter)', textAlign: 'center', lineHeight: 1.6 }}>
            © 2025 Agrigems Trace · Sistem Keterlacakan Sawit<br/>
            Versi Demo — Data bersifat simulasi
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────
function Navbar({ role, user, onLogout }) {
  const navigate = useNavigate();
  const initials = (user?.full_name || getRoleLabel(role)).split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
  return (
    <header className="navbar-premium">
      <div style={{ display:'flex', alignItems:'center', gap:'.75rem', fontWeight:800, color:'var(--primary-dark)', fontSize:'1.15rem', fontFamily:'Outfit,sans-serif' }}>
        <div style={{ background:'var(--primary-light)', color:'var(--primary-dark)', padding:'.5rem', borderRadius:'.65rem', display:'flex' }}>
          <Palmtree size={20}/>
        </div>
        Agrigems Trace
      </div>
      <div style={{ display:'flex', gap:'1rem', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'.6rem', background:'var(--surface-hover)', padding:'.4rem .85rem .4rem .4rem', borderRadius:'var(--radius-full)', border:'1px solid var(--border)' }}>
          <div style={{ width:30, height:30, borderRadius:'50%', background: getRoleColor(role), display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'.7rem', fontWeight:700 }}>
            {initials}
          </div>
          <div style={{ lineHeight:1.2 }}>
            <div style={{ fontSize:'.78rem', fontWeight:700, color:'var(--text-main)' }}>{user?.full_name || getRoleLabel(role)}</div>
            <div style={{ fontSize:'.7rem', color:'var(--text-muted)', textTransform:'capitalize' }}>{getRoleLabel(role)}</div>
          </div>
        </div>
        <button className="btn-secondary" style={{ padding:'.45rem 1rem', fontSize:'.82rem', borderRadius:'var(--radius-full)' }}
          onClick={() => { onLogout(); navigate('/'); }}>
          Log Out
        </button>
      </div>
    </header>
  );
}

// ── App Shell ─────────────────────────────────────────────────
function DashboardPage({ role, user }) {
  if (role === 'petani') return <PetaniDashboard user={user}/>;
  if (role === 'mill')   return <MillDashboard   user={user}/>;
  if (role === 'agent')  return <AgentDashboard  user={user}/>;
  if (role === 'admin')  return <AdminDashboard  user={user}/>;
  return <div>Role tidak dikenal.</div>;
}

export default function App() {
  const [role, setRole] = useState(() => localStorage.getItem('agrigems_active_role') || null);
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('agrigems_active_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (r, u) => { 
    setRole(r); 
    setUser(u); 
    localStorage.setItem('agrigems_active_role', r);
    localStorage.setItem('agrigems_active_user', JSON.stringify(u));
  };
  
  const handleLogout = () => { 
    setRole(null); 
    setUser(null); 
    localStorage.removeItem('agrigems_active_role');
    localStorage.removeItem('agrigems_active_user');
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LoginScreen onLogin={handleLogin}/>}/>
        <Route path="/dashboard/*" element={
          role ? (
            <div className="app-container">
              <Navbar role={role} user={user} onLogout={handleLogout}/>
              <main className="main-content">
                <DashboardPage role={role} user={user}/>
              </main>
            </div>
          ) : <LoginScreen onLogin={handleLogin}/>
        }/>
      </Routes>
    </Router>
  );
}
