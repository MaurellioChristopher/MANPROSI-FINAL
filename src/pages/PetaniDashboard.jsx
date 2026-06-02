import { useState, useEffect } from 'react';
import { Map, Leaf, FileText, CheckCircle, X, AlertTriangle, Upload, User, Clock, RefreshCw, PlusCircle, Activity, Truck, Edit3, Printer, Calendar } from 'lucide-react';
import GisMap, { calculatePolygonArea, checkPolygonOverlap, FOREST_ZONE } from '../components/GisMap';
import { QRCodeSVG } from 'qrcode.react';

export default function PetaniDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('profile');
  
  // State Profile
  const [profileForm, setProfileForm] = useState({
    nama_perusahaan: '',
    tipe_usaha: 'smallholder',
    nik: user?.nik || '',
    no_telp: ''
  });

  // State Lahan (Farms) & GIS
  const [polygonCoords, setPolygonCoords] = useState([]);
  const [refreshMap, setRefreshMap] = useState(0);
  const [farmForm, setFarmForm] = useState({ nama: '', sertifikat: '', legalitas: 'SHM', sertifikasi: 'tidak_ada', no_ispo: '' });
  const [farms, setFarms] = useState([]);
  const [editingFarmId, setEditingFarmId] = useState(null);

  // State Siklus & Pemeliharaan
  const [cycles, setCycles] = useState([]);
  const [selectedFarmForCycle, setSelectedFarmForCycle] = useState('');
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedCycleIdForMaint, setSelectedCycleIdForMaint] = useState('');
  const [maintenanceForm, setMaintenanceForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    tipe: 'Pemupukan',
    produk: '',
    dosis: '',
    keterangan: ''
  });
  
  // State Modal Lengkapi Surat Jalan (Manifest)
  const [showCompleteManifestModal, setShowCompleteManifestModal] = useState(false);
  const [selectedManifest, setSelectedManifest] = useState(null);
  const [driverForm, setDriverForm] = useState({
    driver_name: '',
    driver_nik: '',
    truck_plate: '',
    sawit_quality: 'Premium'
  });

  // State Modal Detail & QR Surat Jalan
  const [showManifestModal, setShowManifestModal] = useState(false);
  const [activeManifest, setActiveManifest] = useState(null);

  // Load Data
  const loadData = () => {
    try {
      const savedFarms = localStorage.getItem('agrigems_farms');
      let myFarms = [];
      if (savedFarms) {
        const parsed = JSON.parse(savedFarms);
        myFarms = parsed.filter(f => f.petani_id === user?.id);
        setFarms(myFarms);
      }
      
      const savedCycles = localStorage.getItem('agrigems_cycles');
      if (savedCycles) {
        const parsedCycles = JSON.parse(savedCycles);
        const myFarmIds = myFarms.map(f => f.id);
        setCycles(parsedCycles.filter(c => myFarmIds.includes(c.farm_id)));
      }
    } catch(err) {}
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const saveToLocal = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  // --- Handlers Lahan ---
  const handleSimpanLahan = () => {
    if (polygonCoords.length < 3) return alert("Harap buat minimal 3 titik poligon di peta!");
    if (!farmForm.nama) return alert("Nama lahan wajib diisi!");

    // Perhitungan Luas Hektar Presisi
    const calculatedArea = calculatePolygonArea(polygonCoords);

    // Cek Overlap Hutan Lindung (EUDR Compliance)
    const isOverlappingForest = checkPolygonOverlap(polygonCoords, FOREST_ZONE);
    const eudrStatus = isOverlappingForest ? 'non-compliant' : 'compliant';
    const statusLahan = isOverlappingForest ? 'Deforestasi' : 'Verified';

    let updatedFarms = [];

    if (editingFarmId) {
      // Mode Edit Lahan
      const allFarms = JSON.parse(localStorage.getItem('agrigems_farms') || '[]');
      updatedFarms = allFarms.map(f => {
        if (f.id === editingFarmId) {
          return {
            ...f,
            farm_name: farmForm.nama,
            legalitas: farmForm.legalitas,
            no_sertifikat: farmForm.sertifikat,
            sertifikasi: farmForm.sertifikasi,
            no_ispo: farmForm.no_ispo,
            polygon: polygonCoords,
            luas_ha: calculatedArea,
            eudr_compliance: eudrStatus,
            status: statusLahan
          };
        }
        return f;
      });
      alert(`Batas Lahan "${farmForm.nama}" berhasil diperbarui.`);
      setEditingFarmId(null);
    } else {
      // Mode Tambah Lahan Baru
      const newFarm = {
        id: `FARM-${Date.now().toString().slice(-4)}`,
        farm_name: farmForm.nama,
        legalitas: farmForm.legalitas,
        no_sertifikat: farmForm.sertifikat,
        sertifikasi: farmForm.sertifikasi,
        no_ispo: farmForm.no_ispo,
        polygon: polygonCoords,
        luas_ha: calculatedArea,
        eudr_compliance: eudrStatus,
        status: statusLahan,
        petani_id: user?.id || 'petani-1'
      };
      
      const allFarms = JSON.parse(localStorage.getItem('agrigems_farms') || '[]');
      updatedFarms = [...allFarms, newFarm];
      alert(`Lahan "${farmForm.nama}" berhasil diregistrasi dengan luas ${newFarm.luas_ha} Ha.`);
    }

    saveToLocal('agrigems_farms', updatedFarms);
    
    // Refresh state lokal
    setFarms(updatedFarms.filter(f => f.petani_id === user?.id));
    setPolygonCoords([]);
    setFarmForm({ nama: '', sertifikat: '', legalitas: 'SHM', sertifikasi: 'tidak_ada', no_ispo: '' });
    setRefreshMap(prev => prev + 1);

    if (isOverlappingForest) {
      alert("⚠️ PERINGATAN KERAS: Lahan Anda terdeteksi beririsan dengan Hutan Lindung (Non-Compliant EUDR). Status lahan ditandai merah di sistem!");
    }
  };

  const handleEditLahan = (farm) => {
    setEditingFarmId(farm.id);
    setPolygonCoords(farm.polygon);
    setFarmForm({
      nama: farm.farm_name,
      sertifikat: farm.no_sertifikat,
      legalitas: farm.legalitas,
      sertifikasi: farm.sertifikasi,
      no_ispo: farm.no_ispo || ''
    });
    setActiveTab('gis');
    setRefreshMap(prev => prev + 1);
  };

  const handleCancelEdit = () => {
    setEditingFarmId(null);
    setPolygonCoords([]);
    setFarmForm({ nama: '', sertifikat: '', legalitas: 'SHM', sertifikasi: 'tidak_ada', no_ispo: '' });
    setRefreshMap(prev => prev + 1);
  };

  // --- Handlers Siklus, Pemeliharaan & Panen ---
  const handleMulaiSiklus = () => {
    if (!selectedFarmForCycle) return alert("Pilih lahan terlebih dahulu!");
    
    // Cek apakah lahan sudah punya siklus aktif
    const hasActive = cycles.find(c => c.farm_id === selectedFarmForCycle && c.status !== 'selesai');
    if (hasActive) return alert("Lahan ini masih memiliki siklus yang belum selesai!");

    const newCycle = {
      id: `CYC-${Date.now().toString().slice(-4)}`,
      farm_id: selectedFarmForCycle,
      tanggal_tanam: new Date().toLocaleDateString('id-ID'),
      status: 'pemeliharaan',
      harvests: [],
      maintenance: [],
      manifests: []
    };

    const allCycles = JSON.parse(localStorage.getItem('agrigems_cycles') || '[]');
    const updated = [...allCycles, newCycle];
    saveToLocal('agrigems_cycles', updated);
    
    // Refresh local
    loadData();
    alert("Siklus tanam baru berhasil dimulai!");
  };

  const handleCatatPanen = (cycleId) => {
    const berat = prompt("Masukkan berat taksiran panen (Kg):");
    if (!berat || isNaN(berat)) return;

    const allCycles = JSON.parse(localStorage.getItem('agrigems_cycles') || '[]');
    const cycleIndex = allCycles.findIndex(c => c.id === cycleId);
    if (cycleIndex === -1) return;

    const farm = farms.find(f => f.id === allCycles[cycleIndex].farm_id);
    const harvestId = `HV-${Date.now().toString().slice(-4)}`;
    const newHarvest = {
      id: harvestId,
      tanggal: new Date().toLocaleDateString('id-ID'),
      berat_kg: parseFloat(berat)
    };

    // Generate Draft Surat Jalan Otomatis per Panen
    const newManifest = {
      id: `SJ-${Date.now().toString().slice(-6)}`,
      harvest_id: harvestId,
      cycle_id: cycleId,
      farm_id: allCycles[cycleIndex].farm_id,
      farm_name: farm?.farm_name || 'Lahan',
      petani_name: user?.full_name || 'Petani',
      eudr_compliance: farm?.eudr_compliance || 'compliant',
      berat_kg: newHarvest.berat_kg,
      status: 'draft',
      driver_name: '',
      driver_nik: '',
      truck_plate: '',
      sawit_quality: '',
      qr_payload: { 
        harvest_id: harvestId, 
        cycle_id: cycleId, 
        farm_id: allCycles[cycleIndex].farm_id, 
        berat_kg: newHarvest.berat_kg,
        eudr_compliance: farm?.eudr_compliance || 'compliant'
      }
    };

    if(!allCycles[cycleIndex].harvests) allCycles[cycleIndex].harvests = [];
    if(!allCycles[cycleIndex].manifests) allCycles[cycleIndex].manifests = [];
    
    allCycles[cycleIndex].harvests.push(newHarvest);
    allCycles[cycleIndex].manifests.push(newManifest);
    
    // Logic Auto-Close Siklus per Panen (3x Panen = 3 Siklus Berbeda)
    // Setiap kali panen dicatat, siklus langsung selesai (ditutup) agar panen berikutnya dicatat di siklus baru.
    allCycles[cycleIndex].status = 'selesai';

    saveToLocal('agrigems_cycles', allCycles);
    loadData();
    alert("Panen berhasil dicatat, Siklus ditutup secara otomatis, dan Draft Surat Jalan telah dibuat!");
  };

  const handleSelesaikanSiklus = (cycleId) => {
    if(!window.confirm("Yakin ingin menyelesaikan siklus ini? Lahan akan siap untuk siklus tanam berikutnya.")) return;
    const allCycles = JSON.parse(localStorage.getItem('agrigems_cycles') || '[]');
    const updated = allCycles.map(c => c.id === cycleId ? { ...c, status: 'selesai' } : c);
    saveToLocal('agrigems_cycles', updated);
    loadData();
  };

  const openMaintenanceModal = (cycleId) => {
    setSelectedCycleIdForMaint(cycleId);
    setMaintenanceForm({
      tanggal: new Date().toISOString().split('T')[0],
      tipe: 'Pemupukan',
      produk: '',
      dosis: '',
      keterangan: ''
    });
    setShowMaintenanceModal(true);
  };

  const handleSimpanMaintenance = () => {
    if (!maintenanceForm.produk || !maintenanceForm.dosis) {
      return alert("Harap isi nama produk dan dosis!");
    }

    const allCycles = JSON.parse(localStorage.getItem('agrigems_cycles') || '[]');
    const cycleIndex = allCycles.findIndex(c => c.id === selectedCycleIdForMaint);
    if (cycleIndex === -1) return;

    if (!allCycles[cycleIndex].maintenance) {
      allCycles[cycleIndex].maintenance = [];
    }

    allCycles[cycleIndex].maintenance.push({
      ...maintenanceForm,
      id: `MAINT-${Date.now().toString().slice(-4)}`
    });

    saveToLocal('agrigems_cycles', allCycles);
    loadData();
    setShowMaintenanceModal(false);
    alert("Aktivitas pemeliharaan (pupuk/obat) berhasil dicatat!");
  };

  // --- Handlers Manifest / Surat Jalan ---
  const openCompleteManifestModal = (manifest) => {
    setSelectedManifest(manifest);
    setDriverForm({
      driver_name: manifest.driver_name || '',
      driver_nik: manifest.driver_nik || '',
      truck_plate: manifest.truck_plate || '',
      sawit_quality: manifest.sawit_quality || 'Premium'
    });
    setShowCompleteManifestModal(false); // reset
    setTimeout(() => {
      setShowCompleteManifestModal(true);
    }, 100);
  };

  const handleSaveDriverDetails = () => {
    if (!driverForm.driver_name || !driverForm.driver_nik || !driverForm.truck_plate) {
      return alert("Harap lengkapi semua data pengemudi dan armada!");
    }

    const allCycles = JSON.parse(localStorage.getItem('agrigems_cycles') || '[]');
    let updated = false;

    for (let cIdx = 0; cIdx < allCycles.length; cIdx++) {
      if (allCycles[cIdx].manifests) {
        const mIdx = allCycles[cIdx].manifests.findIndex(m => m.id === selectedManifest.id);
        if (mIdx !== -1) {
          allCycles[cIdx].manifests[mIdx].driver_name = driverForm.driver_name;
          allCycles[cIdx].manifests[mIdx].driver_nik = driverForm.driver_nik;
          allCycles[cIdx].manifests[mIdx].truck_plate = driverForm.truck_plate;
          allCycles[cIdx].manifests[mIdx].sawit_quality = driverForm.sawit_quality;
          allCycles[cIdx].manifests[mIdx].status = 'ready';
          allCycles[cIdx].manifests[mIdx].qr_payload = {
            ...allCycles[cIdx].manifests[mIdx].qr_payload,
            driver_name: driverForm.driver_name,
            driver_nik: driverForm.driver_nik,
            truck_plate: driverForm.truck_plate,
            sawit_quality: driverForm.sawit_quality
          };
          updated = true;
          break;
        }
      }
    }

    if (updated) {
      saveToLocal('agrigems_cycles', allCycles);
      loadData();
      setShowCompleteManifestModal(false);
      alert("Data pengangkatan berhasil dilengkapi! Surat jalan siap digunakan.");
    }
  };

  const viewManifestQR = (manifest) => {
    setActiveManifest(manifest);
    setShowManifestModal(true);
  };

  // Poin 7.2: Cetak Surat Jalan (Print-Friendly Window)
  const handlePrintManifest = (manifest) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    const qrSvgString = document.getElementById('manifest-qr-svg').outerHTML;

    printWindow.document.write(`
      <html>
        <head>
          <title>Surat Jalan Digital - ${manifest.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { text-align: center; border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 30px; }
            .header h1 { margin: 0; font-size: 24px; color: #15803d; text-transform: uppercase; }
            .header p { margin: 5px 0 0 0; color: #64748b; font-size: 14px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .section-title { font-weight: bold; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; margin-bottom: 15px; color: #0f172a; text-transform: uppercase; font-size: 14px; }
            .info-table { width: 100%; border-collapse: collapse; }
            .info-table td { padding: 6px 0; font-size: 14px; vertical-align: top; }
            .info-table td.label { color: #64748b; width: 140px; }
            .info-table td.value { font-weight: 600; }
            .qr-container { text-align: center; border: 1px solid #e2e8f0; padding: 20px; border-radius: 8px; background: #f8fafc; }
            .qr-container p { margin-top: 10px; font-size: 12px; font-weight: bold; color: #475569; }
            .spec-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; margin-bottom: 30px; display: flex; justify-content: space-around; text-align: center; }
            .spec-item span { display: block; font-size: 12px; color: #166534; }
            .spec-item strong { font-size: 18px; color: #14532d; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; margin-top: 60px; }
            .sig-space { height: 70px; }
            .sig-name { font-weight: bold; border-bottom: 1px solid #475569; display: inline-block; padding: 0 20px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Surat Jalan Pengangkutan TBS</h1>
            <p>Agrigems Trace - Sistem Rantai Pasok Sawit Terintegrasi</p>
          </div>
          
          <div class="grid">
            <div>
              <div class="section-title">Informasi Lahan & Petani</div>
              <table class="info-table">
                <tr><td class="label">ID Surat Jalan</td><td class="value">${manifest.id}</td></tr>
                <tr><td class="label">Petani Pengirim</td><td class="value">${manifest.petani_name}</td></tr>
                <tr><td class="label">Nama Lahan (Blok)</td><td class="value">${manifest.farm_name}</td></tr>
                <tr><td class="label">ID Lahan</td><td class="value">${manifest.farm_id}</td></tr>
                <tr><td class="label">EUDR Status</td><td class="value" style="color: ${manifest.eudr_compliance === 'compliant' ? '#16a34a' : '#dc2626'}">${manifest.eudr_compliance === 'compliant' ? 'Compliant (Aman Hutan)' : 'Non-Compliant (Deforestasi)'}</td></tr>
              </table>
            </div>
            
            <div class="qr-container">
              ${qrSvgString}
              <p>PINDAI DI TIMBANGAN GERBANG PABRIK</p>
            </div>
          </div>

          <div class="section-title">Detail Pengangkutan & Armada</div>
          <table class="info-table" style="margin-bottom: 30px;">
            <tr><td class="label">Nama Pengemudi</td><td class="value">${manifest.driver_name || '-'} (NIK: ${manifest.driver_nik || '-'})</td></tr>
            <tr><td class="label">Nomor Polisi Truk</td><td class="value">${manifest.truck_plate || '-'}</td></tr>
            <tr><td class="label">Jenis/Kualitas Sawit</td><td class="value">${manifest.sawit_quality || '-'}</td></tr>
          </table>

          <div class="spec-box">
            <div class="spec-item">
              <span>Estimasi Muatan</span>
              <strong>${manifest.berat_kg} Kg</strong>
            </div>
            <div class="spec-item">
              <span>Sertifikasi Lahan</span>
              <strong>ISPO/RSPO</strong>
            </div>
          </div>

          <div class="signatures">
            <div>
              <p>Petani Pengirim</p>
              <div class="sig-space"></div>
              <span class="sig-name">${manifest.petani_name}</span>
            </div>
            <div>
              <p>Supir Pengangkut</p>
              <div class="sig-space"></div>
              <span class="sig-name">${manifest.driver_name || '........................'}</span>
            </div>
            <div>
              <p>Penerima Pabrik (Mill)</p>
              <div class="sig-space"></div>
              <span class="sig-name">........................</span>
            </div>
          </div>

          <div style="text-align: center; margin-top: 50px;">
            <button onclick="window.print()" style="padding: 10px 20px; font-weight: bold; background: #15803d; color: white; border: none; border-radius: 4px; cursor: pointer;">Cetak Sekarang</button>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="dashboard-grid animate-fade-in">
      <aside className="dashboard-sidebar">
        <div>
          <h1 className="title-lg" style={{ color: 'var(--primary-dark)', marginBottom: '0.5rem' }}>Area Petani</h1>
          <p className="text-muted" style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>Kelola profil, aset lahan mandiri, dan siklus produksi.</p>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Master Data</div>
          <button className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User size={18} /> Profil & Legalitas Usaha
          </button>
          <button className={`sidebar-btn ${activeTab === 'gis' ? 'active' : ''}`} onClick={() => setActiveTab('gis')}>
            <Map size={18} /> Aset Lahan & Poligon GIS
          </button>
          
          <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>Operasional Kebun</div>
          <button className={`sidebar-btn ${activeTab === 'cycles' ? 'active' : ''}`} onClick={() => setActiveTab('cycles')}>
            <RefreshCw size={18} /> Siklus Produksi & Panen
          </button>
          <button className={`sidebar-btn ${activeTab === 'manifests' ? 'active' : ''}`} onClick={() => setActiveTab('manifests')}>
            <Truck size={18} /> Surat Jalan (Manifest)
          </button>
        </nav>
      </aside>

      <div className="dashboard-content">
        
        {/* --- TAB PROFILE --- */}
        {activeTab === 'profile' && (
          <div className="content-narrow animate-fade-in">
            <div className="glass-panel">
              <div className="panel-header">
                <div className="panel-icon green"><User size={20}/></div>
                <div>
                  <h3 className="title-lg" style={{ fontSize: '1.25rem' }}>Profil Kepemilikan</h3>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Lengkapi data identitas sebagai Smallholder atau Perusahaan.</p>
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>Tipe Usaha</label>
                  <select className="input-premium" value={profileForm.tipe_usaha} onChange={e => setProfileForm({...profileForm, tipe_usaha: e.target.value})}>
                    <option value="smallholder">Petani Mandiri (Smallholder)</option>
                    <option value="perusahaan">Perusahaan Terbatas (PT)</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>Nama Lengkap / Perusahaan</label>
                  <input type="text" className="input-premium" value={user?.full_name || ''} disabled style={{ background: 'var(--surface-hover)', cursor: 'not-allowed' }} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>NIK KTP</label>
                  <input type="text" className="input-premium" value={profileForm.nik} onChange={e => setProfileForm({...profileForm, nik: e.target.value})} placeholder="16 Digit NIK" />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>No. Telepon Aktif</label>
                  <input type="text" className="input-premium" value={profileForm.no_telp} onChange={e => setProfileForm({...profileForm, no_telp: e.target.value})} placeholder="0812..." />
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn-primary" onClick={() => alert("Profil disimpan!")}>Simpan Profil</button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB GIS / LAHAN --- */}
        {activeTab === 'gis' && (
          <div className="dashboard-split-layout animate-fade-in">
            {/* Form Lahan */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: 'fit-content' }}>
              <div className="panel-header">
                <div className="panel-icon orange"><Map size={20}/></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>
                    {editingFarmId ? 'Update Aset Lahan' : 'Registrasi Aset Lahan'}
                  </h3>
                </div>
              </div>
              
              <div>
                <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>Nama Blok/Lahan</label>
                <input type="text" className="input-premium" placeholder="Contoh: Blok Utara A" value={farmForm.nama} onChange={e => setFarmForm({...farmForm, nama: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>Legalitas</label>
                  <select className="input-premium" value={farmForm.legalitas} onChange={e => setFarmForm({...farmForm, legalitas: e.target.value})}>
                    <option value="SHM">SHM</option>
                    <option value="HGU">HGU</option>
                    <option value="SKT">SKT</option>
                    <option value="GIRIK">Girik</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>No. Surat</label>
                  <input type="text" className="input-premium" placeholder="Nomor Sertifikat..." value={farmForm.sertifikat} onChange={e => setFarmForm({...farmForm, sertifikat: e.target.value})} />
                </div>
              </div>
              
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <label className="text-muted" style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', display: 'block' }}>Sertifikasi Keberlanjutan</label>
                <select className="input-premium" value={farmForm.sertifikasi} onChange={e => setFarmForm({...farmForm, sertifikasi: e.target.value})} style={{ marginBottom: '1rem' }}>
                  <option value="tidak_ada">Belum Ada</option>
                  <option value="ISPO">ISPO</option>
                  <option value="RSPO">RSPO</option>
                </select>
                {farmForm.sertifikasi !== 'tidak_ada' && (
                  <input type="text" className="input-premium" placeholder={`Nomor Registrasi ${farmForm.sertifikasi}...`} value={farmForm.no_ispo} onChange={e => setFarmForm({...farmForm, no_ispo: e.target.value})} />
                )}
              </div>

              <div style={{ background: 'var(--surface-hover)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                ℹ️ <b>Aturan 1 Lahan 1 Poligon:</b> Klik pada peta di sebelah kanan untuk membentuk area lahan Anda. Luas (Ha) dan status EUDR (Deforestasi) akan dideteksi secara otomatis.
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {editingFarmId && (
                  <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleCancelEdit}>
                    Batal
                  </button>
                )}
                <button className="btn-primary" style={{ flex: 2, justifyContent: 'center' }} onClick={handleSimpanLahan}>
                  {editingFarmId ? 'Simpan Perubahan' : 'Simpan & Daftarkan'}
                </button>
              </div>
            </div>

            {/* Peta GIS */}
            <div className="glass-panel" style={{ height: '700px', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              <div style={{ flex: 1 }}>
                <GisMap 
                  polygonCoords={polygonCoords} 
                  setPolygonCoords={setPolygonCoords} 
                  refreshTrigger={refreshMap}
                  editingFarmId={editingFarmId}
                  onCancelEdit={handleCancelEdit}
                />
              </div>
            </div>
            
            {/* Daftar Lahan */}
            <div className="glass-panel" style={{ gridColumn: '1 / -1', padding: 0, overflow: 'hidden' }}>
              <div className="panel-header" style={{ padding: '1.5rem', marginBottom: 0 }}>
                <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Daftar Aset Lahan Terdaftar</h3>
              </div>
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>ID Lahan</th>
                    <th>Nama Lahan</th>
                    <th>Legalitas</th>
                    <th>Sertifikasi</th>
                    <th>Luas (Ha)</th>
                    <th>EUDR Status</th>
                    <th>Status Admin</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {farms.length === 0 ? (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada lahan. Daftarkan di atas.</td></tr>
                  ) : farms.map(f => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.id}</td>
                      <td>{f.farm_name}</td>
                      <td><span className="badge badge-gray">{f.legalitas}</span> {f.no_sertifikat}</td>
                      <td>{f.sertifikasi === 'tidak_ada' ? '-' : <span className="badge badge-blue">{f.sertifikasi}</span>}</td>
                      <td style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{f.luas_ha || 0}</td>
                      <td>
                        {f.eudr_compliance === 'non-compliant' ? (
                          <span className="badge badge-red" style={{ fontWeight: 600 }}>🔴 Non-Compliant</span>
                        ) : (
                          <span className="badge badge-green" style={{ fontWeight: 600 }}>🟢 Compliant</span>
                        )}
                      </td>
                      <td>
                        {f.status === 'Deforestasi' ? (
                          <span className="badge badge-red"><AlertTriangle size={12}/> Deforestasi</span>
                        ) : (
                          <span className="badge badge-green"><CheckCircle size={12}/> Verified</span>
                        )}
                      </td>
                      <td>
                        <button className="btn-secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }} onClick={() => handleEditLahan(f)}>
                          <Edit3 size={12}/> Edit Batas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- TAB SIKLUS PRODUKSI & PANEN --- */}
        {activeTab === 'cycles' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div className="panel-header" style={{ border: 'none', margin: 0, padding: 0 }}>
                  <div className="panel-icon blue"><RefreshCw size={20}/></div>
                  <div>
                    <h3 style={{ fontSize: '1.1rem' }}>Manajemen Siklus Produksi</h3>
                    <p className="text-muted" style={{ fontSize: '0.85rem' }}>Catat penanaman, pemeliharaan pupuk/obat, hingga panen (Auto-Close untuk pelacakan 1:1).</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <select className="input-premium" style={{ minWidth: '200px' }} value={selectedFarmForCycle} onChange={e => setSelectedFarmForCycle(e.target.value)}>
                    <option value="">-- Pilih Lahan --</option>
                    {farms.map(f => <option key={f.id} value={f.id}>{f.farm_name} ({f.luas_ha} Ha)</option>)}
                  </select>
                  <button className="btn-primary" onClick={handleMulaiSiklus}><PlusCircle size={18}/> Mulai Siklus Baru</button>
                </div>
              </div>

              {cycles.length === 0 ? (
                <div className="empty-state">
                  <Activity size={48} />
                  <p>Belum ada siklus produksi yang berjalan.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {cycles.map(cycle => {
                    const farm = farms.find(f => f.id === cycle.farm_id);
                    const isSelesai = cycle.status === 'selesai';
                    
                    return (
                      <div key={cycle.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', background: 'white', overflow: 'hidden' }}>
                        <div style={{ background: isSelesai ? 'var(--surface-hover)' : '#f0fdf4', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <h4 style={{ fontSize: '1.1rem', color: isSelesai ? 'var(--text-muted)' : 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              Siklus Lahan: {farm?.farm_name || 'Lahan Dihapus'} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ID: {cycle.id}</span>
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Mulai Tanam: {cycle.tanggal_tanam}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            {isSelesai ? (
                              <span className="badge badge-gray">Siklus Ditutup (Sudah Panen)</span>
                            ) : (
                              <>
                                <span className="badge badge-green animate-pulse">Siklus Berjalan</span>
                                <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => handleSelesaikanSiklus(cycle.id)}>Akhiri Siklus</button>
                                <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderColor: 'var(--primary)' }} onClick={() => openMaintenanceModal(cycle.id)}>+ Log Pemeliharaan</button>
                                <button className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.8rem' }} onClick={() => handleCatatPanen(cycle.id)}>+ Catat Panen Baru</button>
                              </>
                            )}
                          </div>
                        </div>

                        <div style={{ padding: '1.5rem' }}>
                          <h5 style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Timeline Pemeliharaan & Panen</h5>
                          
                          <div style={{ marginLeft: '0.5rem' }}>
                            <div className="timeline-item">
                              <div className="timeline-dot" style={{ color: 'var(--primary)' }}></div>
                              <div className="timeline-line"></div>
                              <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Bibit Ditanam</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{cycle.tanggal_tanam}</div>
                              </div>
                            </div>
                            
                            {/* Render Pemeliharaan / Pupuk / Obat (Poin 4.1) */}
                            {cycle.maintenance?.map((m, idx) => (
                              <div className="timeline-item" key={m.id || idx}>
                                <div className="timeline-dot" style={{ color: '#8b5cf6' }}></div>
                                <div className="timeline-line"></div>
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span className="badge badge-purple">{m.tipe}</span> {m.produk}
                                    <span className="badge badge-gray">{m.dosis}</span>
                                  </div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                    Tanggal: {m.tanggal} {m.keterangan && `• Ket: ${m.keterangan}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                            
                            {/* Render Harvests / Panen di siklus ini */}
                            {cycle.harvests?.map((h, idx) => (
                              <div className="timeline-item" key={h.id}>
                                <div className="timeline-dot" style={{ color: 'var(--secondary)' }}></div>
                                {idx < (cycle.harvests.length - 1) && <div className="timeline-line"></div>}
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Panen ke-{idx+1} <span className="badge badge-yellow" style={{ marginLeft: '0.5rem' }}>{h.berat_kg} Kg</span></div>
                                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{h.tanggal} • Men-generate Draft Surat Jalan otomatis.</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- TAB SURAT JALAN (MANIFEST) --- */}
        {activeTab === 'manifests' && (
          <div className="animate-fade-in content-narrow">
             <div className="glass-panel" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="panel-header" style={{ padding: '1.5rem', margin: 0, borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                <div className="panel-icon orange"><Truck size={20}/></div>
                <div>
                  <h3 style={{ fontSize: '1.1rem' }}>Surat Jalan Pengangkutan (Manifest)</h3>
                  <p className="text-muted" style={{ fontSize: '0.85rem' }}>Setiap panen menghasilkan 1 Surat Jalan. Lengkapi data supir untuk menerbitkan QR Code.</p>
                </div>
              </div>
              
              <div style={{ padding: '1rem', overflowX: 'auto' }}>
                <table className="table-modern">
                  <thead>
                    <tr>
                      <th>ID Manifest</th>
                      <th>Lahan & Siklus</th>
                      <th>Berat Muatan</th>
                      <th>Driver & Armada</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.flatMap(c => c.manifests || []).length === 0 ? (
                      <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Belum ada panen tercatat. Surat jalan kosong.</td></tr>
                    ) : cycles.flatMap(c => c.manifests || []).map(manifest => {
                      const cycle = cycles.find(c => c.id === manifest.cycle_id);
                      const farm = farms.find(f => f.id === manifest.farm_id);
                      const isDraft = manifest.status === 'draft';
                      return (
                        <tr key={manifest.id}>
                          <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{manifest.id}</td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{farm?.farm_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Siklus: {manifest.cycle_id}</div>
                          </td>
                          <td style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>{manifest.berat_kg} Kg</td>
                          <td>
                            {isDraft ? (
                              <span className="text-muted" style={{ fontSize: '0.85rem', fontStyle: 'italic' }}>Belum diinput</span>
                            ) : (
                              <div style={{ fontSize: '0.85rem' }}>
                                <strong>{manifest.driver_name}</strong><br/>
                                <span className="text-muted">{manifest.truck_plate} ({manifest.sawit_quality})</span>
                              </div>
                            )}
                          </td>
                          <td>
                            {isDraft ? (
                              <span className="badge badge-yellow">Draft / Menunggu Supir</span>
                            ) : (
                              <span className="badge badge-green">Ready / Siap di-Scan</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {isDraft ? (
                                <button className="btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => openCompleteManifestModal(manifest)}>
                                  Lengkapi Supir & Truk
                                </button>
                              ) : (
                                <>
                                  <button className="btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem' }} onClick={() => viewManifestQR(manifest)}>
                                    Lihat QR Code
                                  </button>
                                  <button className="btn-secondary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.8rem', color: 'var(--primary-dark)' }} onClick={() => openCompleteManifestModal(manifest)}>
                                    Edit Supir
                                  </button>
                                </>
                              )}
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

      {/* Modal Digital Manifest & QR Code (Poin 7.1 & 7.2) */}
      {showManifestModal && activeManifest && (
        <div className="modal-overlay" onClick={() => setShowManifestModal(false)}>
          <div className="qr-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.2rem' }}>Digital Manifest (Surat Jalan)</h4>
              <button onClick={() => setShowManifestModal(false)} className="btn-icon" style={{ padding: '0.3rem' }}><X size={16} /></button>
            </div>
            
            <div style={{ background: 'white', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '2px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
              <QRCodeSVG id="manifest-qr-svg" value={JSON.stringify(activeManifest.qr_payload)} size={180} level="M" />
            </div>

            {/* Detail Surat Jalan */}
            <div style={{ width: '100%', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', padding: '1rem', textAlign: 'left', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">ID Surat Jalan:</span> <strong>{activeManifest.id}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Nama Blok:</span> <strong>{activeManifest.farm_name}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Nama Pengemudi:</span> <strong>{activeManifest.driver_name}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">No. Polisi Truk:</span> <strong>{activeManifest.truck_plate}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Kualitas Sawit:</span> <strong className="badge badge-blue">{activeManifest.sawit_quality}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '0.4rem', marginTop: '0.4rem' }}><span className="text-muted">Berat Muatan:</span> <strong>{activeManifest.berat_kg} Kg</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">EUDR Status:</span> <strong style={{ color: activeManifest.eudr_compliance === 'compliant' ? 'var(--primary-dark)' : 'var(--danger)' }}>{activeManifest.eudr_compliance === 'compliant' ? 'Compliant' : 'Non-Compliant'}</strong></div>
            </div>
            
            <div style={{ width: '100%', display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowManifestModal(false)}>Tutup</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center', gap: '0.5rem' }} onClick={() => handlePrintManifest(activeManifest)}>
                <Printer size={16}/> Cetak Surat Jalan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Input Pemeliharaan / Pupuk & Obat (Poin 4.1) */}
      {showMaintenanceModal && (
        <div className="modal-overlay" onClick={() => setShowMaintenanceModal(false)}>
          <div className="qr-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem' }}><Calendar size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}/> Catat Pemeliharaan Lahan</h4>
              <button onClick={() => setShowMaintenanceModal(false)} className="btn-icon" style={{ padding: '0.3rem' }}><X size={16} /></button>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Tanggal Pemeliharaan</label>
                <input type="date" className="input-premium" value={maintenanceForm.tanggal} onChange={e => setMaintenanceForm({...maintenanceForm, tanggal: e.target.value})} />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Jenis Aktivitas</label>
                  <select className="input-premium" value={maintenanceForm.tipe} onChange={e => setMaintenanceForm({...maintenanceForm, tipe: e.target.value})}>
                    <option value="Pemupukan">Pemupukan</option>
                    <option value="Obat Hama">Obat/Pestisida</option>
                    <option value="Pembersihan">Pembersihan Gulma</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Dosis / Jumlah</label>
                  <input type="text" className="input-premium" placeholder="Misal: 50 Kg / 5 L" value={maintenanceForm.dosis} onChange={e => setMaintenanceForm({...maintenanceForm, dosis: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Nama Produk / Bahan Aktif</label>
                <input type="text" className="input-premium" placeholder="Misal: Pupuk NPK / Herbisida Roundup" value={maintenanceForm.produk} onChange={e => setMaintenanceForm({...maintenanceForm, produk: e.target.value})} />
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Keterangan Tambahan</label>
                <textarea className="input-premium" style={{ height: '80px', resize: 'none', padding: '0.5rem' }} placeholder="Detail pengerjaan..." value={maintenanceForm.keterangan} onChange={e => setMaintenanceForm({...maintenanceForm, keterangan: e.target.value})} />
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowMaintenanceModal(false)}>Batal</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSimpanMaintenance}>Simpan Log</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Lengkapi Sopir & Truk Manifest (Poin 6.2) */}
      {showCompleteManifestModal && selectedManifest && (
        <div className="modal-overlay" onClick={() => setShowCompleteManifestModal(false)}>
          <div className="qr-card animate-fade-in" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <h4 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.15rem' }}><Truck size={18} style={{ verticalAlign: 'middle', marginRight: '0.4rem' }}/> Lengkapi Data Truk & Sopir</h4>
              <button onClick={() => setShowCompleteManifestModal(false)} className="btn-icon" style={{ padding: '0.3rem' }}><X size={16} /></button>
            </div>

            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem', textAlign: 'left' }}>
              <div style={{ background: 'var(--surface-hover)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                Manifest ID: <strong>{selectedManifest.id}</strong><br/>
                Estimasi Muatan Panen: <strong>{selectedManifest.berat_kg} Kg</strong>
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Nama Sopir Truk</label>
                <input type="text" className="input-premium" placeholder="Nama Lengkap Sopir" value={driverForm.driver_name} onChange={e => setDriverForm({...driverForm, driver_name: e.target.value})} />
              </div>

              <div>
                <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>NIK Sopir (16 Digit)</label>
                <input type="text" className="input-premium" maxLength={16} placeholder="16 Digit NIK KTP Sopir" value={driverForm.driver_nik} onChange={e => setDriverForm({...driverForm, driver_nik: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Nomor Polisi Truk</label>
                  <input type="text" className="input-premium" placeholder="Contoh: B 1234 ABC" value={driverForm.truck_plate} onChange={e => setDriverForm({...driverForm, truck_plate: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Kualitas/Jenis Sawit</label>
                  <select className="input-premium" value={driverForm.sawit_quality} onChange={e => setDriverForm({...driverForm, sawit_quality: e.target.value})}>
                    <option value="Premium (Super)">Premium (Super)</option>
                    <option value="Medium (Biasa)">Medium (Biasa)</option>
                    <option value="Low (Asam)">Low (Asam)</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ width: '100%', display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCompleteManifestModal(false)}>Batal</button>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={handleSaveDriverDetails}>Simpan & Terbitkan QR</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
