import { useState, useEffect } from 'react';
import { Truck, Map as MapIcon, ShieldCheck, Search, Activity, Package, QrCode, X, CheckCircle, PackageSearch, Layers, Navigation } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import TrackingMap from '../components/TrackingMap';
import QRScanner from '../components/QRScanner';
import { syncFromSupabase, syncToSupabase } from '../lib/syncHelper';
import { useModal } from '../components/ModalProvider';

const ROUTE_DEFINITIONS = {
  'pundu_banjarmasin': {
    originName: 'Pabrik Pundu (Kotawaringin Timur)',
    destName: 'Pelabuhan Banjarmasin (Trisakti)',
    waypoints: [[-2.05, 113.05], [-2.2, 113.5], [-2.6, 114.1], [-3.0, 114.3], [-3.3194, 114.5908]],
    distance: '198 Km',
    eta: '4.5 Jam'
  },
  'pundu_pulang_pisau': {
    originName: 'Pabrik Pundu (Kotawaringin Timur)',
    destName: 'Pelabuhan Pulang Pisau',
    waypoints: [[-2.05, 113.05], [-2.2, 113.5], [-2.6, 114.1], [-3.016, 114.238]],
    distance: '160 Km',
    eta: '3.5 Jam'
  },
  'palangkaraya_banjarmasin': {
    originName: 'Pabrik Palangkaraya',
    destName: 'Pelabuhan Banjarmasin (Trisakti)',
    waypoints: [[-2.208, 113.91], [-2.6, 114.15], [-3.0, 114.35], [-3.3194, 114.5908]],
    distance: '140 Km',
    eta: '3 Jam'
  },
  'palangkaraya_pulang_pisau': {
    originName: 'Pabrik Palangkaraya',
    destName: 'Pelabuhan Pulang Pisau',
    waypoints: [[-2.208, 113.91], [-2.6, 114.1], [-3.016, 114.238]],
    distance: '98 Km',
    eta: '2.2 Jam'
  },
  'sampit_banjarmasin': {
    originName: 'Pabrik Sampit',
    destName: 'Pelabuhan Banjarmasin (Trisakti)',
    waypoints: [[-2.535, 112.95], [-2.7, 113.5], [-2.9, 114.0], [-3.1, 114.3], [-3.3194, 114.5908]],
    distance: '240 Km',
    eta: '5.5 Jam'
  },
  'sampit_pulang_pisau': {
    originName: 'Pabrik Sampit',
    destName: 'Pelabuhan Pulang Pisau',
    waypoints: [[-2.535, 112.95], [-2.7, 113.5], [-2.9, 114.0], [-3.016, 114.238]],
    distance: '190 Km',
    eta: '4 Jam'
  }
};

export default function AgentDashboard() {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState('tracking');
  const [showQR, setShowQR] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);

  // Tab Pickup State
  const [cpoBatches, setCpoBatches] = useState([]);
  const [activeRouteBatchId, setActiveRouteBatchId] = useState('BATCH-CPO-991');
  
  // Route selection modal states
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [selectedBatchIdForRoute, setSelectedBatchIdForRoute] = useState(null);
  const [routeOrigin, setRouteOrigin] = useState('pundu');
  const [routeDestination, setRouteDestination] = useState('banjarmasin');
  const [routeProgress, setRouteProgress] = useState(0);

  useEffect(() => {
    const fetchBatches = async () => {
      try {
        const savedBatches = await syncFromSupabase('agrigems_cpo_ready'); 
        if (savedBatches && savedBatches.length > 0) {
          setCpoBatches(savedBatches);
        } else {
          const DEFAULT_BATCHES = [
            {
              id: 'BATCH-CPO-991',
              tanggal: new Date().toLocaleDateString('id-ID'),
              waktu: '08:30 WIB',
              total_bts_kg: 68180,
              estimasi_cpo_kg: 15000,
              status: 'Truk Telah Muat',
              manifests: [
                { farm_id: 'FARM-01', farm_name: 'Blok Utara A' },
                { farm_id: 'FARM-02', farm_name: 'Blok Selatan B' }
              ]
            },
            {
              id: 'BATCH-CPO-802',
              tanggal: 'Kemarin',
              waktu: '14:15 WIB',
              total_bts_kg: 102270,
              estimasi_cpo_kg: 22500,
              status: 'Tiba di Pelabuhan',
              manifests: [
                { farm_id: 'FARM-03', farm_name: 'Blok Barat C' }
              ]
            }
          ];
          setCpoBatches(DEFAULT_BATCHES);
          await syncToSupabase('agrigems_cpo_ready', DEFAULT_BATCHES);
        }
      } catch(err) {
        console.error("Gagal load batches di Agent:", err);
      }
    };

    fetchBatches();

    // Polling interval
    const interval = setInterval(() => {
      fetchBatches();
    }, 7000);

    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    const active = localStorage.getItem('agrigems_active_route_batch_id');
    if (active) {
      setActiveRouteBatchId(active);
    }
  }, [activeTab]);

  // Timer animation effect for truck along active route
  useEffect(() => {
    if (!activeRouteBatchId) {
      setRouteProgress(0);
      return;
    }
    const activeBatch = cpoBatches.find(b => b.id === activeRouteBatchId);
    if (!activeBatch || activeBatch.status !== 'Dalam Rute') {
      setRouteProgress(0);
      return;
    }

    let animationFrameId;
    const duration = 20000; // 20 seconds for the simulation loop
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progressValue = (elapsed % duration) / duration;
      setRouteProgress(progressValue);
      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [activeRouteBatchId, cpoBatches]);

  const handleMuatKeTruk = async (batchId) => {
    let updated = [...cpoBatches];
    const index = updated.findIndex(b => b.id === batchId);
    
    if (index !== -1) {
      updated[index].status = 'Truk Telah Muat';
    } else {
      const newBatch = {
        id: batchId,
        tanggal: new Date().toLocaleDateString('id-ID'),
        waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
        total_bts_kg: 68180,
        estimasi_cpo_kg: searchResult?.volume_cpo_kg || 15000,
        status: 'Truk Telah Muat',
        manifests: searchResult?.asal_lahan_ids?.map(id => ({ farm_id: id, farm_name: 'Lahan ' + id })) || []
      };
      updated = [newBatch, ...updated];
    }
    
    setCpoBatches(updated);
    await syncToSupabase('agrigems_cpo_ready', updated);
    showAlert(`Batch CPO ${batchId} berhasil dimuat ke Truk Tangki!`);
    setActiveTab('pickup');
  };

  const handleMulaiRute = (batchId) => {
    setSelectedBatchIdForRoute(batchId);
    setRouteOrigin('pundu');
    setRouteDestination('banjarmasin');
    setShowRouteModal(true);
  };

  const handleConfirmRoute = async () => {
    const routeKey = `${routeOrigin}_${routeDestination}`;
    const routeDef = ROUTE_DEFINITIONS[routeKey];
    if (!routeDef) {
      showAlert("Kombinasi rute tidak valid!");
      return;
    }

    const updated = cpoBatches.map(b => {
      if (b.id === selectedBatchIdForRoute) {
        return { 
          ...b, 
          status: 'Dalam Rute',
          route_info: {
            origin: routeOrigin,
            destination: routeDestination,
            routeKey: routeKey,
            originName: routeDef.originName,
            destName: routeDef.destName,
            waypoints: routeDef.waypoints,
            distance: routeDef.distance,
            eta: routeDef.eta
          }
        };
      }
      return b;
    });

    setCpoBatches(updated);
    await syncToSupabase('agrigems_cpo_ready', updated);
    localStorage.setItem('agrigems_active_route_batch_id', selectedBatchIdForRoute);
    setActiveRouteBatchId(selectedBatchIdForRoute);
    
    setShowRouteModal(false);
    setSelectedBatchIdForRoute(null);
    setRouteProgress(0);

    showAlert(`Rute pengiriman dari ${routeDef.originName} ke ${routeDef.destName} untuk batch ${selectedBatchIdForRoute} telah dimulai secara LIVE!`);
    setActiveTab('tracking');
  };

  const handleSelesaikanRute = async (batchId) => {
    const updated = cpoBatches.map(b => {
      if (b.id === batchId) {
        return { ...b, status: 'Tiba di Pelabuhan' };
      }
      return b;
    });
    
    setCpoBatches(updated);
    await syncToSupabase('agrigems_cpo_ready', updated);
    if (localStorage.getItem('agrigems_active_route_batch_id') === batchId) {
      localStorage.removeItem('agrigems_active_route_batch_id');
    }
    showAlert(`Batch ${batchId} telah sukses didepositkan di Pelabuhan!`);
  };

  const handleInspectScan = (decodedText) => {
    try {
      const payload = JSON.parse(decodedText);
      setSearchQuery(payload.batch_id || decodedText);
      handleInspect(payload.batch_id || decodedText, payload);
    } catch(e) {
      setSearchQuery(decodedText);
      handleInspect(decodedText);
    }
  };

  const handleInspect = (queryId = searchQuery, payload = null) => {
    if (!queryId) return showAlert("Masukkan ID Batch / Scan QR Mill!");
    
    setIsSearching(true);
    setSearchResult(null);
    
    // Simulate Blockchain / DB fetch
    setTimeout(() => {
      setIsSearching(false);
      
      const foundInLocal = cpoBatches.find(b => b.id === queryId);
      
      if (foundInLocal) {
         setSearchResult({
           batchId: foundInLocal.id,
           status: 'Verified',
           mill: 'Pabrik Kelapa Sawit (Mill) Simulator',
           tanggalProses: foundInLocal.tanggal,
           volume_cpo_kg: foundInLocal.estimasi_cpo_kg,
           asal_lahan_ids: foundInLocal.manifests?.map(m => m.farm_id) || ['FARM-01', 'FARM-02'],
           rawBatch: foundInLocal
         });
      } else if (payload && payload.batch_id) {
         setSearchResult({
           batchId: payload.batch_id,
           status: 'Verified',
           mill: payload.mill || 'Pabrik Kelapa Sawit PT. Sukses',
           tanggalProses: payload.tanggal,
           volume_cpo_kg: payload.volume_cpo_kg,
           asal_lahan_ids: payload.asal_lahan || []
         });
      } else {
         // Mock jika hanya input text manual
         setSearchResult({
           batchId: queryId,
           status: 'Valid',
           mill: 'Pabrik Kelapa Sawit (Mill) Simulator',
           tanggalProses: new Date().toLocaleDateString('id-ID'),
           volume_cpo_kg: 15000,
           asal_lahan_ids: ['FARM-01', 'FARM-02']
         });
      }
    }, 1500);
  };

  return (
    <div className="dashboard-grid animate-fade-in">
      {/* Sidebar Navigation */}
      <aside className="dashboard-sidebar">
        <div>
          <h1 className="title-lg" style={{ color: '#3b82f6', marginBottom: '0.5rem' }}>Agen CPO</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>Traceability distribusi, validasi asal-usul pabrik, pemantauan rute.</p>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Inspeksi & Penjemputan</div>
          <button className={`sidebar-btn ${activeTab === 'inspect' ? 'active' : ''}`} onClick={() => setActiveTab('inspect')}>
            <Search size={18} /> Scan QR Batch Mill
          </button>
          <button className={`sidebar-btn ${activeTab === 'pickup' ? 'active' : ''}`} onClick={() => setActiveTab('pickup')}>
            <Truck size={18} /> Antrean Muat Truk
          </button>
          
          <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Logistik (End-to-End)</div>
          <button className={`sidebar-btn ${activeTab === 'tracking' ? 'active' : ''}`} onClick={() => setActiveTab('tracking')}>
            <Activity size={18} /> Live GIS Tracking
          </button>
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="dashboard-content">

      {/* Tab Inspeksi CPO (Tracing) */}
      {activeTab === 'inspect' && (
        <div className="dashboard-split-layout animate-fade-in" style={{ alignItems: 'start' }}>
          
          <div className="glass-panel" style={{ height: 'fit-content' }}>
             <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ background: 'var(--info-light)', padding: '0.4rem', borderRadius: '0.5rem', color: '#1e40af' }}>
                  <ShieldCheck size={20} /> 
                </div>
                Pindai Label Batch CPO (Dari Mill)
             </h3>
             <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>Pindai QR Code yang ditempel di tangki pabrik untuk melihat _Backward Tracing_ (Asal usul petani penyumbang TBS).</p>
             
             <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
                <QRScanner onScanSuccess={handleInspectScan} />
             </div>

             <div style={{ display: 'flex', gap: '1rem' }}>
                <input type="text" className="input-premium" placeholder="Atau Input ID Batch Manual..." style={{ flex: 1 }} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                <button className="btn-primary" onClick={() => handleInspect(searchQuery)} disabled={isSearching} style={{ opacity: isSearching ? 0.7 : 1 }}>
                  Cari Data
                </button>
             </div>
          </div>

          <div className="glass-panel" style={{ minHeight: '500px' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Hasil Tracing Origin</h3>
            
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
            
            {isSearching ? (
               <div style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                 <div style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
                 <p className="text-muted">Menarik data traceability dari Blockchain...</p>
               </div>
            ) : searchResult ? (
               <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                 
                 <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1.1rem', color: '#1e40af', margin: 0 }}>Batch ID: {searchResult.batchId}</h4>
                      <span className="badge badge-green"><ShieldCheck size={14}/> ISPO/RSPO Verified</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                      <div><span className="text-muted">Pabrik Pengolah:</span> <strong style={{ display: 'block' }}>{searchResult.mill}</strong></div>
                      <div><span className="text-muted">Tanggal Batching:</span> <strong style={{ display: 'block' }}>{searchResult.tanggalProses}</strong></div>
                      <div><span className="text-muted">Total Volume CPO:</span> <strong style={{ display: 'block', color: 'var(--secondary)' }}>{searchResult.volume_cpo_kg?.toLocaleString('id-ID')} Kg</strong></div>
                    </div>
                 </div>

                 {/* Informasi Pengiriman Tangki CPO */}
                 {searchResult.rawBatch?.driver_name && (
                   <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                     <h5 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                       🚚 Detail Logistik Tangki CPO (Ekspedisi)
                     </h5>
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', fontSize: '0.85rem' }}>
                       <div><span className="text-muted">Nama Sopir:</span> <strong style={{ display: 'block' }}>{searchResult.rawBatch.driver_name}</strong></div>
                       <div><span className="text-muted">Nomor Polisi:</span> <strong style={{ display: 'block' }}>{searchResult.rawBatch.truck_plate}</strong></div>
                       <div><span className="text-muted">No. Tangki / Container:</span> <strong style={{ display: 'block', color: 'var(--primary-dark)' }}>{searchResult.rawBatch.tank_number}</strong></div>
                     </div>
                   </div>
                 )}

                 {/* Action Button: Muat ke Truk */}
                 <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                     <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>
                       {(!searchResult.rawBatch || searchResult.rawBatch.status === 'proses' || searchResult.rawBatch.status === 'ready') 
                         ? 'Batch siap dimuat ke Truk Tangki' 
                         : `Status pengiriman: ${searchResult.rawBatch.status === 'Dalam Rute' ? 'Dalam Perjalanan' : searchResult.rawBatch.status}`}
                     </p>
                     <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Verifikasi asal-usul kelapa sawit selesai.</p>
                   </div>
                   {(!searchResult.rawBatch || searchResult.rawBatch.status === 'proses' || searchResult.rawBatch.status === 'ready') ? (
                     <button className="btn-primary" style={{ padding: '0.55rem 1rem', fontSize: '0.85rem' }} onClick={() => handleMuatKeTruk(searchResult.batchId)}>
                       <Truck size={15}/> Muat ke Truk
                     </button>
                   ) : (
                     <span style={{ color: 'var(--primary-dark)', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                       <CheckCircle size={15}/> Siap di Antrean
                     </span>
                   )}
                 </div>

                 <div>
                   <h5 style={{ fontSize: '1rem', marginBottom: '1rem', color: 'var(--text-main)' }}>Komposisi Asal Buah (TBS) & Audit Trail</h5>
                   <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '1rem' }}>Batch CPO ini diproduksi dari TBS yang berasal dari kebun-kebun berikut:</p>
                   
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                     {searchResult.rawBatch?.manifests?.length > 0 ? (
                       searchResult.rawBatch.manifests.map((manifest, i) => (
                         <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'white', overflow: 'hidden', boxShadow: 'var(--shadow-xs)' }}>
                           <div style={{ background: 'var(--surface-hover)', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                             <strong style={{ fontSize: '0.9rem', color: 'var(--primary-dark)' }}>🌴 {manifest.farm_name || `Lahan ${manifest.farm_id}`}</strong>
                             <div style={{ display: 'flex', gap: '0.5rem' }}>
                               {manifest.eudr_compliance === 'non-compliant' ? (
                                 <span className="badge badge-red">🔴 EUDR Non-Compliant (Deforestasi)</span>
                               ) : (
                                 <span className="badge badge-green">🟢 EUDR Compliant (Aman Hutan)</span>
                               )}
                               <span className="badge badge-blue">{manifest.sawit_quality || 'Kualitas Standar'}</span>
                             </div>
                           </div>
                           
                           <div style={{ padding: '1rem', display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '1.5rem' }}>
                             {/* Manifest Metadata */}
                             <div style={{ fontSize: '0.8rem', lineHeight: '1.5', borderRight: '1px solid var(--border)', paddingRight: '1rem' }}>
                               <div>Petani: <strong>{manifest.petani_name || 'Petani Mandiri'}</strong></div>
                               <div>ID Lahan: <strong>{manifest.farm_id}</strong></div>
                               <div>Berat TBS: <strong>{manifest.berat_diterima_kg || manifest.berat_kg} Kg</strong></div>
                               <div>Sopir TBS: <strong>{manifest.driver_name || '-'}</strong> ({manifest.truck_plate || '-'})</div>
                             </div>

                             {/* Maintenance Logs (Poin 4.2 Audit ISPO/RSPO) */}
                             <div>
                               <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                 Logs Pupuk & Pemeliharaan (Audit Trail)
                               </div>
                               {manifest.maintenance_log && manifest.maintenance_log.length > 0 ? (
                                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                   {manifest.maintenance_log.map((log, lIdx) => (
                                     <div key={lIdx} style={{ fontSize: '0.78rem', background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '0.4rem 0.6rem', borderRadius: '4px', display: 'flex', justifyContent: 'space-between' }}>
                                       <span>📅 <strong>{log.tanggal}</strong> - {log.tipe} ({log.produk})</span>
                                       <span style={{ fontWeight: 'bold', color: '#7c3aed' }}>{log.dosis}</span>
                                     </div>
                                   ))}
                                 </div>
                               ) : (
                                 <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.25rem 0' }}>
                                   🍃 Tidak ada pemakaian bahan kimia berlebih / Pupuk bersertifikat alami.
                                 </div>
                               )}
                             </div>
                           </div>
                         </div>
                       ))
                     ) : (
                       // Fallback mock jika tidak ada manifest detail
                       <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                         Tidak ada detail manifest. Batch menggunakan data asal lahan default.
                       </div>
                     )}
                   </div>
                 </div>

               </div>
            ) : (
               <div className="empty-state" style={{ padding: '4rem 2rem' }}>
                 <Search size={48} />
                 <p>Silakan scan Label QR Batch CPO di tangki pabrik atau masukkan ID secara manual untuk melihat laporan rantai pasok.</p>
               </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Antrean Muat (Pickup) */}
      {activeTab === 'pickup' && (
        <div className="animate-fade-in content-narrow">
          <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
             <div className="panel-header" style={{ padding: '1.5rem', margin: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
               <div className="panel-icon orange"><Truck size={20}/></div>
               <div>
                 <h3 style={{ fontSize: '1.1rem' }}>Antrean Pemuatan CPO (Truk Tangki)</h3>
                 <p className="text-muted" style={{ fontSize: '0.85rem' }}>Truk tangki yang telah memvalidasi batch CPO dari pabrik siap untuk diberangkatkan.</p>
               </div>
             </div>
             <div style={{ padding: '1rem', overflowX: 'auto' }}>
               <table className="table-modern">
                  <thead>
                     <tr>
                        <th>TANGGAL / WAKTU</th>
                        <th>ID BATCH (MUATAN)</th>
                        <th>KAPASITAS</th>
                        <th>STATUS PENGIRIMAN</th>
                        <th>AKSI SUPIR</th>
                     </tr>
                  </thead>
                  <tbody>
                     {cpoBatches.length === 0 ? (
                       <tr>
                         <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                           Belum ada antrean pemuatan CPO.
                         </td>
                       </tr>
                     ) : cpoBatches.map((batch) => (
                       <tr key={batch.id}>
                         <td>
                           <span style={{ fontWeight: 600 }}>{batch.tanggal}</span>
                           {batch.waktu && (
                             <>
                               <br />
                               <span className="text-muted" style={{ fontSize: '0.8rem' }}>{batch.waktu}</span>
                             </>
                           )}
                         </td>
                         <td style={{ fontWeight: 600 }}>{batch.id}</td>
                         <td style={{ color: '#d97706', fontWeight: 700 }}>
                           {batch.estimasi_cpo_kg?.toLocaleString('id-ID')} Kg
                         </td>
                         <td>
                           {batch.status === 'proses' || batch.status === 'ready' ? (
                             <span className="badge badge-gray">Siap Dimuat</span>
                           ) : batch.status === 'Truk Telah Muat' ? (
                             <span className="badge badge-yellow">Truk Telah Muat</span>
                           ) : batch.status === 'Dalam Rute' ? (
                             <span className="badge badge-blue">Dalam Perjalanan</span>
                           ) : (
                             <span className="badge badge-green">Tiba di Pelabuhan</span>
                           )}
                         </td>
                         <td>
                           {batch.status === 'proses' || batch.status === 'ready' ? (
                             <button
                               className="btn-secondary"
                               style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }}
                               onClick={() => handleMuatKeTruk(batch.id)}
                             >
                               <Truck size={14} /> Muat ke Truk
                             </button>
                           ) : batch.status === 'Truk Telah Muat' ? (
                             <button
                               className="btn-primary"
                               style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem' }}
                               onClick={() => handleMulaiRute(batch.id)}
                             >
                               <Navigation size={14} /> Mulai Rute (Live)
                             </button>
                           ) : batch.status === 'Dalam Rute' ? (
                             <button
                               className="btn-primary"
                               style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem', gap: '0.25rem', background: 'linear-gradient(135deg, var(--info), #1e40af)' }}
                               onClick={() => handleSelesaikanRute(batch.id)}
                             >
                               <CheckCircle size={14} /> Selesai Pengiriman
                             </button>
                           ) : (
                             <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                               <CheckCircle size={14} /> Selesai
                             </span>
                           )}
                         </td>
                       </tr>
                     ))}
                  </tbody>
               </table>
             </div>
          </div>
        </div>
      )}

      {/* Tab Live Tracking GIS */}
      {activeTab === 'tracking' && (
        <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1.2fr) 2.5fr', gap: '1.5rem', alignItems: 'start' }}>
          
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="panel-header" style={{ paddingBottom: '0.5rem', marginBottom: 0, border: 'none' }}>
              <div className="panel-icon blue"><Activity size={20}/></div>
              <h3 style={{ fontSize: '1.1rem' }}>Live GPS Armada</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Card Armada Aktif */}
              {(() => {
                const activeBatch = cpoBatches.find(b => b.id === activeRouteBatchId);
                const isEnRoute = activeBatch && activeBatch.status === 'Dalam Rute';
                
                if (isEnRoute) {
                  const rInfo = activeBatch.route_info || {};
                  const speed = Math.floor(65 + Math.sin(routeProgress * Math.PI * 4) * 8); // Fluctuate speed slightly
                  const totalEtaVal = parseFloat(rInfo.eta || '4');
                  const remainingEta = Math.max(0.1, (totalEtaVal * (1 - routeProgress))).toFixed(1);
                  
                  return (
                    <div style={{ borderLeft: '4px solid var(--info)', paddingLeft: '1rem', background: 'white', padding: '1rem', borderRadius: '0 var(--radius-md) var(--radius-md) 0', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)', display: 'flex', justifyContent: 'space-between' }}>
                        Truk B-9412-XX
                        <span style={{ fontSize: '0.75rem', fontWeight: 400, color: 'var(--text-muted)' }}>{speed} km/h</span>
                      </p>
                      <p style={{ fontSize: '0.8rem', margin: '0.25rem 0', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        Muatan: <strong>{activeBatch.id}</strong><br/>
                        Dari: <strong style={{ color: 'var(--primary-dark)' }}>{rInfo.originName}</strong><br/>
                        Ke: <strong style={{ color: 'var(--info)' }}>{rInfo.destName}</strong>
                      </p>
                      <div style={{ margin: '0.4rem 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Jarak: <strong>{rInfo.distance}</strong> | Progress: <strong>{Math.floor(routeProgress * 100)}%</strong>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="badge badge-blue" style={{ fontSize: '0.7rem' }}>Menuju Tujuan (ETA {remainingEta} Jam)</span>
                      </div>
                    </div>
                  );
                } else if (activeBatch && activeBatch.status === 'Truk Telah Muat') {
                  return (
                    <div style={{ borderLeft: '4px solid var(--warning)', paddingLeft: '1rem', background: 'white', padding: '1rem', borderRadius: '0 var(--radius-md) var(--radius-md) 0', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border)' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Truk B-9412-XX</p>
                      <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.25rem 0' }}>Muatan: {activeBatch.id}</p>
                      <p className="text-muted" style={{ fontSize: '0.75rem' }}>Status: Truk sudah dimuat, siap memulai perjalanan.</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="badge badge-yellow" style={{ fontSize: '0.7rem' }}>Standby di Pabrik</span>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div style={{ borderLeft: '4px solid var(--text-muted)', paddingLeft: '1rem', background: 'white', padding: '1rem', borderRadius: '0 var(--radius-md) var(--radius-md) 0', border: '1px solid var(--border)' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Truk B-9412-XX</p>
                      <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.25rem 0' }}>Muatan: Kosong</p>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                        <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Standby di Pabrik</span>
                      </div>
                    </div>
                  );
                }
              })()}
              
              <div style={{ borderLeft: '4px solid var(--text-muted)', paddingLeft: '1rem', background: 'white', padding: '1rem', borderRadius: '0 var(--radius-md) var(--radius-md) 0', border: '1px solid var(--border)' }}>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>Truk C-8811-YY</p>
                <p className="text-muted" style={{ fontSize: '0.8rem', margin: '0.25rem 0' }}>Muatan: Kosong</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <span className="badge badge-gray" style={{ fontSize: '0.7rem' }}>Parkir (Standby di Pabrik)</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glass-panel" style={{ height: '700px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem' }}>
                <MapIcon size={20} color="var(--text-muted)"/>
                Peta Rute Logistik (GIS)
              </h3>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <TrackingMap activeBatch={cpoBatches.find(b => b.id === activeRouteBatchId)} progress={routeProgress} />
            </div>
          </div>
          
        </div>
      )}

      {/* Modal Konfigurasi Rute Pengiriman (Poin 8) */}
      {showRouteModal && selectedBatchIdForRoute && (
        <div className="modal-overlay" onClick={() => { setShowRouteModal(false); setSelectedBatchIdForRoute(null); }}>
          <div className="qr-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Navigation size={20} style={{ color: 'var(--primary)' }}/> Konfigurasi Rute Pengiriman
              </h4>
              <button onClick={() => { setShowRouteModal(false); setSelectedBatchIdForRoute(null); }} className="btn-icon" style={{ padding: '0.3rem' }}><X size={16} /></button>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                Batch ID: <strong>{selectedBatchIdForRoute}</strong><br/>
                Kargo: <strong>Truk Tangki CPO</strong>
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Asal Pabrik CPO (Origin)</label>
                <select className="input-premium" value={routeOrigin} onChange={e => setRouteOrigin(e.target.value)}>
                  <option value="pundu">Pabrik Pundu (Kotawaringin Timur)</option>
                  <option value="palangkaraya">Pabrik Palangkaraya</option>
                  <option value="sampit">Pabrik Sampit</option>
                </select>
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Pelabuhan Tujuan CPO (Destination)</label>
                <select className="input-premium" value={routeDestination} onChange={e => setRouteDestination(e.target.value)}>
                  <option value="banjarmasin">Pelabuhan Banjarmasin (Trisakti)</option>
                  <option value="pulang_pisau">Pelabuhan Pulang Pisau</option>
                </select>
              </div>

              {/* Detail Rute Terpilih */}
              {(() => {
                const routeKey = `${routeOrigin}_${routeDestination}`;
                const routeDef = ROUTE_DEFINITIONS[routeKey];
                if (!routeDef) return null;
                return (
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '0.9rem', fontSize: '0.85rem', color: '#166534', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Jarak Rute:</span> <strong>{routeDef.distance}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Estimasi Waktu:</span> <strong>{routeDef.eta}</strong></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Titik Waypoints:</span> <strong>{routeDef.waypoints.length} titik koordinat</strong></div>
                  </div>
                );
              })()}
            </div>

            <div style={{ width: '100%', display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => { setShowRouteModal(false); setSelectedBatchIdForRoute(null); }}>Batal</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleConfirmRoute}>Mulai Perjalanan (Live)</button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}
