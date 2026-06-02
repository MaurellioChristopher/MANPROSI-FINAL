import { useState, useEffect } from 'react';
import { Camera, Factory, ListChecks, QrCode, X, CheckCircle, PackageSearch, AlertTriangle, Layers, ArrowRight, Truck, Trash } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import QRScanner from '../components/QRScanner';
import { syncFromSupabase, syncToSupabase } from '../lib/syncHelper';

export default function MillDashboard() {
  const [activeTab, setActiveTab] = useState('scan');
  
  // -- Penerimaan (Manifests) --
  const [scannedData, setScannedData] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [incomingManifests, setIncomingManifests] = useState([]); // Antrean yg sudah discan
  const [manualManifestId, setManualManifestId] = useState('');
  
  // -- Produksi (Batches) --
  const [cpoBatches, setCpoBatches] = useState([]);
  
  // -- Distribusi CPO ke Agen --
  const [showQR, setShowQR] = useState(false);
  const [activeDistQR, setActiveDistQR] = useState('');
  const [showDistFormModal, setShowDistFormModal] = useState(false);
  const [selectedBatchForDist, setSelectedBatchForDist] = useState(null);
  const [distForm, setDistForm] = useState({
    driver_name: '',
    truck_plate: '',
    tank_number: '',
    mill_name: 'Pabrik Kelapa Sawit PT. Sukses'
  });

  const [masterFarms, setMasterFarms] = useState([]);
  const [masterCycles, setMasterCycles] = useState([]);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const farms = await syncFromSupabase('agrigems_farms');
        setMasterFarms(farms);

        const cycles = await syncFromSupabase('agrigems_cycles');
        setMasterCycles(cycles);

        const incoming = await syncFromSupabase('agrigems_incoming_manifests');
        setIncomingManifests(incoming);

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
              driver_name: 'Sutrisno',
              truck_plate: 'B 9182 TQ',
              tank_number: 'TANK-ALPHA-01',
              mill_name: 'Pabrik Kelapa Sawit PT. Sukses',
              manifests: [
                { farm_id: 'FARM-01', farm_name: 'Blok Utara A', eudr_compliance: 'compliant' },
                { farm_id: 'FARM-02', farm_name: 'Blok Selatan B', eudr_compliance: 'compliant' }
              ]
            },
            {
              id: 'BATCH-CPO-802',
              tanggal: 'Kemarin',
              waktu: '14:15 WIB',
              total_bts_kg: 102270,
              estimasi_cpo_kg: 22500,
               status: 'Tiba di Pelabuhan',
               driver_name: 'Wahyudi',
               truck_plate: 'KH 8821 FG',
               tank_number: 'TANK-BETA-09',
               mill_name: 'Pabrik Kelapa Sawit PT. Sukses',
               manifests: [
                 { farm_id: 'FARM-03', farm_name: 'Blok Barat C', eudr_compliance: 'compliant' }
               ]
             }
           ];
           setCpoBatches(DEFAULT_BATCHES);
           await syncToSupabase('agrigems_cpo_ready', DEFAULT_BATCHES);
         }
       } catch (err) {
         console.error("Gagal load data mill:", err);
       }
     };

     fetchAllData();

     // Polling interval
     const interval = setInterval(() => {
       fetchAllData();
     }, 7000);

     return () => clearInterval(interval);
   }, []);

  const handleScanSuccess = (decodedText) => {
    try {
      // Expecting JSON from Petani QR (Manifest payload)
      const payload = JSON.parse(decodedText);
      if(!payload.harvest_id || !payload.cycle_id) throw new Error("Format QR tidak valid!");
      
      const cycle = masterCycles.find(c => c.id === payload.cycle_id);
      const farmId = payload.farm_id || (cycle ? cycle.farm_id : null);
      const farm = masterFarms.find(f => f.id === farmId) || { farm_name: 'Unknown Farm' };

      setScannedData({
        ...payload,
        farm_id: farmId,
        farm_name: farm.farm_name,
        estimasi_kg: payload.berat_kg,
        status_ispo: farm.sertifikasi,
        eudr_compliance: payload.eudr_compliance || farm.eudr_compliance || 'compliant'
      });
      setWeightInput(''); // Reset timbangan
      
    } catch (err) {
      alert("Error membaca QR Code. Pastikan ini dari Aplikasi Petani (Manifest Surat Jalan yang sudah dilengkapi).");
      setScannedData(null);
    }
  };
  const handleManualSearch = (e) => {
    e.preventDefault();
    if (!manualManifestId) return alert("Masukkan ID Manifest!");
    
    let foundManifest = null;
    for (let c of masterCycles) {
      if (c.manifests) {
        const m = c.manifests.find(manifest => manifest.id === manualManifestId.trim().toUpperCase() || manifest.id === manualManifestId.trim());
        if (m) {
          foundManifest = m;
          break;
        }
      }
    }
    
    if (foundManifest) {
      const farm = masterFarms.find(f => f.id === foundManifest.farm_id) || { farm_name: 'Unknown Farm', sertifikasi: 'tidak_ada' };
      setScannedData({
        ...foundManifest,
        farm_name: farm.farm_name,
        estimasi_kg: foundManifest.berat_kg,
        status_ispo: farm.sertifikasi,
        eudr_compliance: foundManifest.eudr_compliance || farm.eudr_compliance || 'compliant'
      });
      setWeightInput('');
      setManualManifestId('');
      alert("Surat Jalan ditemukan!");
    } else {
      alert("ID Surat Jalan (Manifest) tidak ditemukan di database. Pastikan ID benar dan statusnya sudah diisi oleh Petani.");
    }
  };
  const handleTerimaBarang = async () => {
    if (!scannedData) return alert("Scan QR Surat Jalan terlebih dahulu!");
    if (!weightInput || parseFloat(weightInput) <= 0) return alert("Masukkan berat netto dari timbangan pabrik!");

    const selisih = Math.abs(parseFloat(weightInput) - scannedData.estimasi_kg);
    const toleransi = scannedData.estimasi_kg * 0.1; // toleransi 10%

    if (selisih > toleransi) {
      if(!window.confirm(`PERINGATAN: Berat aktual (${weightInput} Kg) berbeda jauh dengan estimasi surat jalan (${scannedData.estimasi_kg} Kg). Lanjutkan penerimaan?`)) return;
    }

    const newManifest = {
      ...scannedData,
      berat_diterima_kg: parseFloat(weightInput),
      tanggal_terima: new Date().toLocaleDateString('id-ID'),
      waktu_terima: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    };

    const updatedManifests = [newManifest, ...incomingManifests];
    setIncomingManifests(updatedManifests);
    await syncToSupabase('agrigems_incoming_manifests', updatedManifests);

    // Update manifest status in masterCycles to 'diterima'
    const updatedCycles = masterCycles.map(c => {
      if (c.id === scannedData.cycle_id) {
        return {
          ...c,
          manifests: c.manifests?.map(m => m.id === scannedData.id ? { ...m, status: 'diterima', berat_diterima_kg: parseFloat(weightInput) } : m) || []
        };
      }
      return c;
    });
    setMasterCycles(updatedCycles);
    await syncToSupabase('agrigems_cycles', updatedCycles);
    
    alert("Barang berhasil diterima dan masuk antrean Batching CPO.");
    setScannedData(null);
    setWeightInput('');
  };

  const handleMulaiBatching = async () => {
    if (incomingManifests.length === 0) return alert("Belum ada BTS yang diterima untuk diproses.");

    const totalBTS = incomingManifests.reduce((acc, curr) => acc + curr.berat_diterima_kg, 0);
    const estimasiCPO = totalBTS * 0.22; // Asumsi OER 22%

    const newBatch = {
      id: `BATCH-CPO-${Date.now().toString().slice(-5)}`,
      tanggal: new Date().toLocaleDateString('id-ID'),
      waktu: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      total_bts_kg: totalBTS,
      estimasi_cpo_kg: parseFloat(estimasiCPO.toFixed(2)),
      manifests: [...incomingManifests], // Simpan array manifest yg membentuk batch ini
      status: 'proses',
      driver_name: '',
      truck_plate: '',
      tank_number: '',
      mill_name: 'Pabrik Kelapa Sawit PT. Sukses'
    };

    const updated = [newBatch, ...cpoBatches];
    setCpoBatches(updated);
    await syncToSupabase('agrigems_cpo_ready', updated);
    
    setIncomingManifests([]); // Kosongkan antrean
    await syncToSupabase('agrigems_incoming_manifests', []);
    
    alert(`Batch Produksi ${newBatch.id} dimulai!\nTotal TBS: ${totalBTS} Kg\nEstimasi CPO: ${estimasiCPO.toFixed(2)} Kg`);
  };

  // Poin 12.2: Buka modal pengisian data Tangki Distribusi
  const openDistFormModal = (batch) => {
    setSelectedBatchForDist(batch);
    setDistForm({
      driver_name: batch.driver_name || '',
      truck_plate: batch.truck_plate || '',
      tank_number: batch.tank_number || '',
      mill_name: batch.mill_name || 'Pabrik Kelapa Sawit PT. Sukses'
    });
    setShowDistFormModal(true);
  };

  const handleSaveDistDetails = async () => {
    if (!distForm.driver_name || !distForm.truck_plate || !distForm.tank_number) {
      return alert("Harap lengkapi seluruh data supir tangki, nomor polisi, dan nomor container tangki!");
    }

    const updatedBatches = cpoBatches.map(b => {
      if (b.id === selectedBatchForDist.id) {
        return {
          ...b,
          driver_name: distForm.driver_name,
          truck_plate: distForm.truck_plate,
          tank_number: distForm.tank_number,
          mill_name: distForm.mill_name,
          status: 'ready'
        };
      }
      return b;
    });

    setCpoBatches(updatedBatches);
    await syncToSupabase('agrigems_cpo_ready', updatedBatches);
    setShowDistFormModal(false);

    // Langsung tampilkan QR code dengan payload lengkap
    const targetBatch = updatedBatches.find(b => b.id === selectedBatchForDist.id);
    const payload = {
      batch_id: targetBatch.id,
      mill: distForm.mill_name,
      tanggal: targetBatch.tanggal,
      volume_cpo_kg: targetBatch.estimasi_cpo_kg,
      driver_name: distForm.driver_name,
      truck_plate: distForm.truck_plate,
      tank_number: distForm.tank_number
    };

    setActiveDistQR(JSON.stringify(payload));
    setShowQR(true);
    alert(`Label QR Distribusi untuk batch ${targetBatch.id} berhasil di-generate!`);
  };

  const viewDistribusiQRDirect = (batch) => {
    const payload = {
      batch_id: batch.id,
      mill: batch.mill_name || 'Pabrik Kelapa Sawit PT. Sukses',
      tanggal: batch.tanggal,
      volume_cpo_kg: batch.estimasi_cpo_kg,
      driver_name: batch.driver_name,
      truck_plate: batch.truck_plate,
      tank_number: batch.tank_number
    };
    setActiveDistQR(JSON.stringify(payload));
    setShowQR(true);
  };

  const handleHapusBatch = async (batchId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus Batch CPO ini?")) return;
    
    const updated = cpoBatches.filter(b => b.id !== batchId);
    setCpoBatches(updated);
    await syncToSupabase('agrigems_cpo_ready', updated);
    
    alert("Batch CPO berhasil dihapus!");
  };

  return (
    <div className="dashboard-grid animate-fade-in">
      <aside className="dashboard-sidebar">
        <div>
          <h1 className="title-lg" style={{ color: '#d97706', marginBottom: '0.5rem' }}>Pabrik (Mill)</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>Penerimaan komoditi, validasi manifest, dan batching CPO.</p>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Stasiun Penerimaan</div>
          <button className={`sidebar-btn ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
            <Camera size={18} /> Pindai & Validasi Surat Jalan
          </button>
          
          <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Stasiun Produksi</div>
          <button className={`sidebar-btn ${activeTab === 'batch' ? 'active' : ''}`} onClick={() => setActiveTab('batch')}>
            <Factory size={18} /> Produksi & Batching CPO
          </button>
          <button className={`sidebar-btn ${activeTab === 'distribusi' ? 'active' : ''}`} onClick={() => setActiveTab('distribusi')}>
            <ListChecks size={18} /> Pengeluaran CPO (Agent)
          </button>
        </nav>
      </aside>

      <div className="dashboard-content">

        {/* --- TAB SCAN PENERIMAAN --- */}
        {activeTab === 'scan' && (
          <div className="dashboard-split-layout animate-fade-in">
            <div className="glass-panel" style={{ height: 'fit-content' }}>
              <div className="panel-header">
                <div className="panel-icon orange"><Camera size={20}/></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>Verifikasi Surat Jalan (Manifest)</h3>
                </div>
              </div>
              
              <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', padding: '1rem', border: '1px solid var(--border)', marginBottom: '1.5rem', minHeight: '280px' }}>
                 <QRScanner onScanSuccess={handleScanSuccess} />
              </div>

              {/* Input Manual Fallback */}
              <form onSubmit={handleManualSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input 
                  type="text" 
                  className="input-premium" 
                  placeholder="Atau Input ID Manifest Manual (misal: SJ-460995)..." 
                  style={{ flex: 1, fontSize: '0.85rem' }} 
                  value={manualManifestId} 
                  onChange={e => setManualManifestId(e.target.value)} 
                />
                <button type="submit" className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                  Cari Data
                </button>
              </form>

              {scannedData ? (
                <div className="animate-fade-in">
                  {scannedData.eudr_compliance === 'non-compliant' && (
                    <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#b91c1c', borderRadius: 'var(--radius-md)', padding: '0.75rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <AlertTriangle size={16}/> ⚠️ PEMBERITAHUAN EUDR: Lahan asal terindikasi deforestasi!
                    </div>
                  )}

                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 'var(--radius-md)', padding: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>ID Manifest:</span>
                      <strong style={{ marginLeft: 'auto' }}>{scannedData.harvest_id}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Lahan Asal:</span>
                      <strong style={{ marginLeft: 'auto' }}>{scannedData.farm_name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Status ISPO/RSPO:</span>
                      <span style={{ marginLeft: 'auto' }}>{scannedData.status_ispo !== 'tidak_ada' ? <span className="badge badge-blue">{scannedData.status_ispo}</span> : <span className="badge badge-yellow">Unverified</span>}</span>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Sopir Truk:</span>
                      <strong style={{ marginLeft: 'auto' }}>{scannedData.driver_name || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>No. Polisi Truk:</span>
                      <strong style={{ marginLeft: 'auto' }}>{scannedData.truck_plate || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Kualitas TBS:</span>
                      <strong style={{ marginLeft: 'auto' }} className="badge badge-blue">{scannedData.sawit_quality || 'N/A'}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyBetween: 'space-between', borderTop: '1px dashed #bbf7d0', paddingTop: '0.5rem', marginTop: '0.5rem' }}>
                      <span className="text-muted" style={{ fontSize: '0.85rem' }}>Estimasi Surat Jalan:</span>
                      <strong style={{ marginLeft: 'auto', fontSize: '1rem', color: 'var(--primary-dark)' }}>{scannedData.estimasi_kg} Kg</strong>
                    </div>
                  </div>

                  <div>
                    <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>Input Berat Netto Timbangan Pabrik (Kg)</label>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <input type="number" className="input-premium" style={{ flex: 1 }} value={weightInput} onChange={e => setWeightInput(e.target.value)} placeholder="Misal: 1450" />
                      <button className="btn-primary" onClick={handleTerimaBarang}>Terima & Simpan</button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                  <PackageSearch size={32} />
                  <p>Arahkan kamera ke QR Code supir truk untuk memvalidasi asal-usul barang.</p>
                </div>
              )}
            </div>

            {/* Tabel Antrean Penerimaan Hari Ini */}
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="panel-header" style={{ padding: '1.5rem', marginBottom: 0, background: 'var(--surface-hover)' }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Antrean Penampungan (Belum Di-batch)</h3>
              </div>
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Asal Lahan</th>
                    <th>Estimasi SJ</th>
                    <th>Berat Aktual (Netto)</th>
                    <th>EUDR Status</th>
                    <th>Selisih</th>
                  </tr>
                </thead>
                <tbody>
                  {incomingManifests.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada antrean BTS baru.</td></tr>
                  ) : incomingManifests.map((m, idx) => {
                    const selisih = m.berat_diterima_kg - m.estimasi_kg;
                    const isAnomali = Math.abs(selisih) > (m.estimasi_kg * 0.1);
                    return (
                      <tr key={idx}>
                        <td>{m.waktu_terima}</td>
                        <td style={{ fontWeight: 600 }}>{m.farm_name}</td>
                        <td className="text-muted">{m.estimasi_kg}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{m.berat_diterima_kg}</td>
                        <td>
                          {m.eudr_compliance === 'non-compliant' ? (
                            <span className="badge badge-red">🔴 Deforestasi</span>
                          ) : (
                            <span className="badge badge-green">🟢 Compliant</span>
                          )}
                        </td>
                        <td>
                          <span style={{ color: isAnomali ? 'var(--danger)' : 'inherit', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            {selisih > 0 ? '+' : ''}{selisih} Kg
                            {isAnomali && <AlertTriangle size={14} color="var(--danger)" />}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {incomingManifests.length > 0 && (
                <div style={{ padding: '1rem 1.5rem', background: '#f8fafc', borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                  <button className="btn-primary" onClick={() => setActiveTab('batch')}>Lanjut ke Batching <ArrowRight size={16}/></button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB PRODUKSI BATCHING --- */}
        {activeTab === 'batch' && (
          <div className="animate-fade-in content-narrow">
            <div className="glass-panel" style={{ marginBottom: '2rem' }}>
              <div className="panel-header">
                <div className="panel-icon orange"><Layers size={20}/></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>Konsolidasi & Batching CPO</h3>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Kelompokkan antrean TBS yang diterima ke dalam satu Batch Produksi untuk menjaga keterlacakan (traceability).</p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="metric-card">
                  <span className="metric-title">TBS Mengantre</span>
                  <span className="metric-value">
                    {incomingManifests.reduce((a,c) => a + c.berat_diterima_kg, 0).toLocaleString('id-ID')} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>Kg</span>
                  </span>
                  <span className="metric-sub">Dari {incomingManifests.length} Surat Jalan (Manifest)</span>
                </div>
                <div className="metric-card" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                  <span className="metric-title" style={{ color: '#c2410c' }}>Estimasi Output CPO</span>
                  <span className="metric-value" style={{ color: '#9a3412' }}>
                    {(incomingManifests.reduce((a,c) => a + c.berat_diterima_kg, 0) * 0.22).toLocaleString('id-ID', {maximumFractionDigits:1})} <span style={{ fontSize: '1rem', opacity: 0.8 }}>Kg</span>
                  </span>
                  <span className="metric-sub" style={{ color: '#c2410c' }}>OER Standar: 22.0%</span>
                </div>
              </div>

              <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '1rem' }} onClick={handleMulaiBatching} disabled={incomingManifests.length === 0}>
                Eksekusi Mesin: Mulai Batch Baru
              </button>
            </div>

            <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Riwayat Batch Produksi (Traceability Origin)</h4>
            <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>ID Batch CPO</th>
                    <th>Tanggal</th>
                    <th>Total TBS Masuk</th>
                    <th>Hasil CPO</th>
                    <th>Komposisi Asal (Tracing)</th>
                  </tr>
                </thead>
                <tbody>
                  {cpoBatches.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada batch yang diproduksi.</td></tr>
                  ) : cpoBatches.map(b => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{b.id}</td>
                      <td>{b.tanggal}</td>
                      <td>{b.total_bts_kg.toLocaleString('id-ID')} Kg</td>
                      <td style={{ fontWeight: 700, color: '#d97706' }}>{b.estimasi_cpo_kg.toLocaleString('id-ID')} Kg</td>
                      <td>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Terdiri dari {b.manifests.length} pengangkatan.<br/>
                          {b.manifests.slice(0,2).map(m => m.farm_name).join(', ')} {b.manifests.length > 2 && '...'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB DISTRIBUSI (CPO ke AGENT) --- */}
        {activeTab === 'distribusi' && (
          <div className="animate-fade-in content-narrow">
             <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="panel-header" style={{ padding: '1.5rem', margin: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                <div className="panel-icon orange"><ListChecks size={20}/></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>Pengeluaran & Distribusi CPO</h3>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Cetak QR Label Identitas untuk Agen / Truk Tangki Ekspedisi.</p>
                </div>
              </div>
              
              <div style={{ padding: '1rem', overflowX: 'auto' }}>
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>ID Batch</th>
                      <th>Volume CPO</th>
                      <th>Driver & Tangki</th>
                      <th>Status Ekspedisi</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cpoBatches.length === 0 ? (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Tidak ada stok batch CPO.</td></tr>
                    ) : cpoBatches.map(batch => {
                      const isReady = batch.status === 'ready' || batch.status === 'Truk Telah Muat' || batch.status === 'Tiba di Pelabuhan' || batch.status === 'Dalam Rute';
                      return (
                        <tr key={batch.id}>
                          <td style={{ fontWeight: 700 }}>{batch.id}</td>
                          <td style={{ color: '#d97706', fontWeight: 700 }}>{batch.estimasi_cpo_kg.toLocaleString('id-ID')} Kg</td>
                          <td>
                            {isReady && batch.driver_name ? (
                              <div style={{ fontSize: '0.85rem' }}>
                                <strong>{batch.driver_name}</strong><br/>
                                <span className="text-muted">{batch.truck_plate} | {batch.tank_number}</span>
                              </div>
                            ) : (
                              <span className="text-muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>Belum diinput</span>
                            )}
                          </td>
                          <td>
                            {batch.status === 'proses' ? (
                              <span className="badge badge-yellow">Menunggu Tangki</span>
                            ) : (
                              <span className="badge badge-green" style={{ textTransform: 'capitalize' }}>{batch.status}</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button className="btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => openDistFormModal(batch)}>
                                {isReady ? 'Edit Data Tangki' : 'Lengkapi & Generate'}
                              </button>
                              {isReady && (
                                <button className="btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => viewDistribusiQRDirect(batch)}>
                                  Lihat QR Label
                                </button>
                              )}
                              <button className="btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'var(--danger)' }} onClick={() => handleHapusBatch(batch.id)}>
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Modal QR Code Distribusi CPO */}
      {showQR && (
        <div className="modal-overlay" onClick={() => setShowQR(false)}>
          <div className="qr-card animate-fade-in" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-main)' }}>Label Distribusi CPO</h4>
              <button onClick={() => setShowQR(false)} className="btn-icon" style={{ padding: '0.3rem' }}><X size={16} /></button>
            </div>
            
            <div style={{ background: 'white', padding: '1.5rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <QRCodeSVG value={activeDistQR} size={200} level="M" />
            </div>
            
            <div style={{ width: '100%', textAlign: 'center' }}>
              <p className="qr-id">Scan oleh Agent (Truk Tangki)</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineHeight: 1.4 }}>
                Label ini membungkus identitas pabrik, batch produksi, data armada pengangkut, dan jejak asal usul ratusan petani di dalamnya secara digital.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Tangki & Sopir Distribusi CPO (Poin 12.2) */}
      {showDistFormModal && selectedBatchForDist && (
        <div className="modal-overlay" onClick={() => setShowDistFormModal(false)}>
          <div className="qr-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem' }}><Truck size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}/> Data Tangki Distribusi CPO</h4>
              <button onClick={() => setShowDistFormModal(false)} className="btn-icon" style={{ padding: '0.3rem' }}><X size={16} /></button>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                Batch ID: <strong>{selectedBatchForDist.id}</strong><br/>
                Volume Hasil CPO: <strong>{selectedBatchForDist.estimasi_cpo_kg} Kg</strong>
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Nama Pabrik (Mill)</label>
                <input type="text" className="input-premium" value={distForm.mill_name} onChange={e => setDistForm({...distForm, mill_name: e.target.value})} />
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Nama Sopir Tangki</label>
                <input type="text" className="input-premium" placeholder="Nama Lengkap Sopir Tangki" value={distForm.driver_name} onChange={e => setDistForm({...distForm, driver_name: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>No. Polisi Truk Tangki</label>
                  <input type="text" className="input-premium" placeholder="Misal: KB 9988 AA" value={distForm.truck_plate} onChange={e => setDistForm({...distForm, truck_plate: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>No. Tangki / Container (WAJIB)</label>
                  <input type="text" className="input-premium" placeholder="Misal: TANK-CPO-05" value={distForm.tank_number} onChange={e => setDistForm({...distForm, tank_number: e.target.value.toUpperCase()})} />
                </div>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowDistFormModal(false)}>Batal</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveDistDetails}>Simpan & Generate QR</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
