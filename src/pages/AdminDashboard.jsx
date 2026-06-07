import { useState, useEffect } from 'react';
import { Users, Map as MapIcon, Database, CheckCircle, ShieldAlert, XCircle } from 'lucide-react';
import AdminMap from '../components/AdminMap';
import { useModal } from '../components/ModalProvider';

export default function AdminDashboard() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState('overview');
  const [farms, setFarms] = useState([]);
  const [users, setUsers] = useState([
    { id: 'petani-1', name: 'Bapak Budi Santoso', role: 'Petani Mandiri', status: 'Active' },
    { id: 'mill-1', name: 'PT. Sukses Sawit Makmur', role: 'Mill (Pabrik CPO)', status: 'Active' }
  ]);
  const [disputes, setDisputes] = useState([]);

  useEffect(() => {
    try {
      const dataFarms = localStorage.getItem('agrigems_farms');
      if (dataFarms) setFarms(JSON.parse(dataFarms));

      const dataDisputes = localStorage.getItem('agrigems_disputes');
      if (dataDisputes) setDisputes(JSON.parse(dataDisputes));
    } catch(err) {}
  }, [activeTab]);

  const handleApproveFarm = (id) => {
    const updated = farms.map(f => f.id === id ? { ...f, status: 'Verified' } : f);
    setFarms(updated);
    localStorage.setItem('agrigems_farms', JSON.stringify(updated));
  };

  const handleRejectFarm = (id) => {
    const updated = farms.map(f => f.id === id ? { ...f, status: 'Ditolak' } : f);
    setFarms(updated);
    localStorage.setItem('agrigems_farms', JSON.stringify(updated));
  };

  const handleAnulir = (farmId) => {
    const updatedDisputes = disputes.map(d => d.id === farmId ? { ...d, status: 'Ditolak/Dianulir' } : d);
    setDisputes(updatedDisputes);
    localStorage.setItem('agrigems_disputes', JSON.stringify(updatedDisputes));
    handleRejectFarm(farmId);
    showAlert("Poligon dibatalkan. Pemberitahuan telah dikirim ke Petani terkait.");
  };

  const handleTerimaBanding = (farmId) => {
    const updatedDisputes = disputes.map(d => d.id === farmId ? { ...d, status: 'Banding Diterima' } : d);
    setDisputes(updatedDisputes);
    localStorage.setItem('agrigems_disputes', JSON.stringify(updatedDisputes));
    handleApproveFarm(farmId);
    showAlert("Banding diterima! Status poligon kini menjadi Verified.");
  };

  const resetData = async () => {
    if(await showConfirm('PERINGATAN: Aksi ini akan menghapus semua data (Lahan, Siklus, CPO Batch) dari LocalStorage. Lanjutkan?')) {
      localStorage.removeItem('agrigems_farms');
      localStorage.removeItem('agrigems_disputes');
      localStorage.removeItem('agrigems_cycles');
      localStorage.removeItem('agrigems_cpo_ready');
      window.location.reload();
    }
  };

  return (
    <div className="dashboard-grid animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div>
          <h1 className="title-lg" style={{ color: '#7c3aed', marginBottom: '0.5rem' }}>Pusat Kendali</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>Supervisi Global, Resolusi Sengketa Lahan, Manajemen Aktor.</p>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Pemantauan Global</div>
          <button className={`sidebar-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <MapIcon size={18} /> Peta Komando (GIS)
          </button>

          <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Manajemen Sistem</div>
          <button className={`sidebar-btn ${activeTab === 'master' ? 'active' : ''}`} onClick={() => setActiveTab('master')}>
            <Users size={18} /> Master Data Lahan & Akun
          </button>
          <button className={`sidebar-btn ${activeTab === 'conflict' ? 'active' : ''}`} onClick={() => setActiveTab('conflict')}>
            <ShieldAlert size={18} /> Resolusi Konflik Poligon
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-content">
      
      {/* --- TAB OVERVIEW MAP --- */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            <div className="metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <span className="metric-title">Total Petani Aktif</span>
              <span className="metric-value">142</span>
              <span className="metric-sub" style={{ color: 'var(--primary)' }}>Tervalidasi ISPO</span>
            </div>
            <div className="metric-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
              <span className="metric-title">Lahan Terdaftar (Poligon)</span>
              <span className="metric-value">{farms.length}</span>
              <span className="metric-sub" style={{ color: 'var(--text-muted)' }}>Di Database Sistem</span>
            </div>
            <div className="metric-card" style={{ borderLeft: '4px solid #7c3aed' }}>
              <span className="metric-title">Sengketa Aktif</span>
              <span className="metric-value">{disputes.filter(d => d.status === 'Sengketa').length}</span>
              <span className="metric-sub" style={{ color: '#7c3aed' }}>Membutuhkan Tinjauan</span>
            </div>
          </div>

          <div className="glass-panel" style={{ height: '700px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--surface-hover)' }}>
               <div style={{ background: '#f3e8ff', padding: '0.5rem', borderRadius: '0.5rem', color: '#7c3aed' }}>
                 <MapIcon size={24}/>
               </div>
               <div>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>Supervisory Map: Kebun & Logistik</h3>
                 <p className="text-muted" style={{ fontSize: '0.85rem' }}>Pantau persebaran poligon lahan petani dan titik-titik pabrik secara global.</p>
               </div>
            </div>
            <div style={{ flex: 1 }}>
               <AdminMap viewMode="all" />
            </div>
          </div>
        </div>
      )}

      {/* --- TAB MASTER DATA --- */}
      {activeTab === 'master' && (
        <div className="glass-panel animate-fade-in" style={{ maxWidth: '1000px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem' }}>
              <div style={{ background: 'var(--info-light)', padding: '1rem', borderRadius: '1rem', color: '#1e40af' }}>
                <Database size={32} />
              </div>
              <div>
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>Master Data Lahan & Assign Petani</h3>
                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Verifikasi Lahan baru dan atur kepemilikan petani terhadap lahan tertentu.</p>
              </div>
            </div>
            <button className="btn-secondary" onClick={resetData} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#ef4444', borderColor: '#fca5a5', background: '#fee2e2' }}>
                Reset Seluruh Data (Dev)
            </button>
          </div>
          
          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <table className="table-modern">
              <thead>
                <tr>
                  <th>ID Lahan</th>
                  <th>Nama Blok</th>
                  <th>Legalitas</th>
                  <th>Petani Assignee</th>
                  <th>Status GIS</th>
                  <th>Aksi Verifikasi</th>
                </tr>
              </thead>
              <tbody>
                {farms.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada lahan diregistrasi.</td></tr>
                ) : farms.map((farm) => (
                  <tr key={farm.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{farm.id}</td>
                    <td>{farm.farm_name}</td>
                    <td><span className="badge badge-gray">{farm.legalitas}</span></td>
                    <td>
                      <select 
                        className="input-premium" 
                        style={{ padding: '0.3rem', fontSize: '0.8rem', width: 'auto' }} 
                        value={farm.petani_id || 'petani-1'}
                        onChange={(e) => {
                          const updated = farms.map(f => f.id === farm.id ? { ...f, petani_id: e.target.value } : f);
                          setFarms(updated);
                          localStorage.setItem('agrigems_farms', JSON.stringify(updated));
                        }}
                      >
                        <option value="petani-1">Petani 1 (Bpk Budi)</option>
                        <option value="petani-2">Petani 2 (Bpk Santoso)</option>
                        <option value="unassigned">-- Cabut Akses (Unassigned) --</option>
                      </select>
                    </td>
                    <td>
                      {farm.status === 'Verified' ? (
                        <span className="badge badge-green"><CheckCircle size={12}/> Verified Area</span>
                      ) : farm.status === 'Ditolak' ? (
                        <span className="badge badge-red"><XCircle size={12}/> Rejected</span>
                      ) : (
                        <span className="badge badge-yellow">Menunggu Review</span>
                      )}
                    </td>
                    <td>
                      {farm.status !== 'Verified' && farm.status !== 'Ditolak' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button className="btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }} onClick={() => handleApproveFarm(farm.id)}><CheckCircle size={14}/> Approve</button>
                            <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', color: 'var(--danger)', borderColor: 'var(--danger-light)', gap: '0.25rem' }} onClick={() => handleRejectFarm(farm.id)}><XCircle size={14}/> Tolak</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB CONFLICT RESOLUTION --- */}
      {activeTab === 'conflict' && (
        <div className="glass-panel animate-fade-in" style={{ border: '2px solid var(--danger-light)', background: 'linear-gradient(to right, rgba(254, 226, 226, 0.5), transparent)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--danger-light)', padding: '1rem', borderRadius: '1rem', color: 'var(--danger)' }}>
              <ShieldAlert size={32} />
            </div>
            <div>
              <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', color: '#991b1b' }}>Resolusi Sengketa Batas Poligon</h3>
              <p className="text-muted" style={{ fontSize: '0.9rem' }}>Sistem mendeteksi adanya tabrakan batas koordinat (Overlapping GIS Area) saat petani mencoba meregistrasi lahan baru.</p>
            </div>
          </div>
          
          {disputes.filter(d => d.status === 'Sengketa' || d.status === 'Menunggu Tinjauan Admin').length === 0 ? (
             <div style={{ padding: '2rem', textAlign: 'center', background: 'white', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
               Tidak ada konflik atau sengketa poligon saat ini.
             </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {disputes.filter(d => d.status === 'Sengketa' || d.status === 'Menunggu Tinjauan Admin').map(dispute => (
                <div key={dispute.id} style={{ border: '1px solid var(--danger-light)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', background: 'white', boxShadow: 'var(--shadow-md)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <p style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>
                       Konflik Poligon Terdeteksi
                       <span style={{ background: 'var(--danger)', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem', marginLeft: '0.5rem' }}>ID: {dispute.id}</span>
                     </p>
                     {dispute.status === 'Menunggu Tinjauan Admin' && (
                       <span className="badge badge-yellow" style={{ fontSize: '0.85rem' }}>Petani Telah Mengirim Banding</span>
                     )}
                   </div>
                   
                   <div style={{ margin: '1rem 0 1.5rem 0', padding: '1rem', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--danger)' }}>
                     <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6', margin: 0 }}>
                       <strong>{dispute.nama}</strong>: {dispute.konflikMsg}
                     </p>
                   </div>
                   
                   <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn-primary" style={{ background: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleAnulir(dispute.id)}><XCircle size={16}/> Anulir (Hapus Area)</button>
                      {dispute.status === 'Menunggu Tinjauan Admin' && (
                        <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleTerimaBanding(dispute.id)}><CheckCircle size={16}/> Terima Bukti Banding</button>
                      )}
                      <button className="btn-secondary" onClick={() => setActiveTab('overview')}>Lihat Irisan di Peta</button>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}
