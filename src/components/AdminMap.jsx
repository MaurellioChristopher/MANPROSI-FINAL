import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function AdminMap({ viewMode = 'all' }) {
  const [center] = useState([-0.7893, 113.9213]); // Global command center focus (Indonesia)
  
  const millLocation = [-2.215, 113.9213];
  const truckLocation = [-2.5, 114.1];
  const dstLocation = [-3.3194, 114.5908]; // Banjarmasin port

  const routePattern = [
    millLocation,
    [-2.3, 113.95],
    [-2.4, 114.0],
    truckLocation,
    [-2.8, 114.2],
    [-3.0, 114.4],
    dstLocation
  ];

  // Dummy Master Data: Polygons of Verified Farmers
  // Dummy Master Data: Polygons of Verified Farmers
  const FOREST_ZONE = [
    [-2.25, 113.82],
    [-2.12, 113.82],
    [-2.12, 113.92],
    [-2.25, 113.92]
  ];

  const polygonPetaniA = [
    [-2.19, 113.90],
    [-2.18, 113.92],
    [-2.20, 113.91]
  ];
  const polygonPetaniB = [
    [-2.22, 113.88],
    [-2.21, 113.89],
    [-2.23, 113.90],
    [-2.24, 113.89]
  ];

  const [newFarms, setNewFarms] = useState([]);

  const loadFarms = () => {
    try {
      const data = localStorage.getItem('agrigems_farms');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setNewFarms(parsed.filter(f => 
            f && 
            Array.isArray(f.polygon) && 
            f.polygon.length >= 3 &&
            f.polygon.every(coord => Array.isArray(coord) && typeof coord[0] === 'number' && typeof coord[1] === 'number')
          ));
        }
      }
    } catch (err) {
      console.error("Error parsing agrigems_farms", err);
    }
  };

  useEffect(() => {
    loadFarms();
    window.addEventListener('storage', loadFarms);
    return () => window.removeEventListener('storage', loadFarms);
  }, []);

  const handleDeleteFarm = (id) => {
    if (window.confirm('Yakin ingin menghapus poligon lahan ini? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        const data = localStorage.getItem('agrigems_farms');
        if (data) {
          const parsed = JSON.parse(data);
          const updated = parsed.filter(f => f.id !== id);
          localStorage.setItem('agrigems_farms', JSON.stringify(updated));
          
          // hapus sengketa terkait jika ada
          const dataDisputes = localStorage.getItem('agrigems_disputes');
          if (dataDisputes) {
            const parsedDisputes = JSON.parse(dataDisputes);
            const updatedDisputes = parsedDisputes.filter(d => d.id !== id);
            localStorage.setItem('agrigems_disputes', JSON.stringify(updatedDisputes));
          }
          
          loadFarms();
          window.dispatchEvent(new Event('storage')); // trigger update di dashboard lain
        }
      } catch (err) {
        console.error("Gagal menghapus lahan", err);
      }
    }
  };

  return (
    <div style={{ height: '100%', minHeight: '550px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 0 }}>
      <MapContainer center={[-2.20, 113.88]} zoom={10} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        />
        
        {/* Render Hutan Lindung overlay */}
        <Polygon positions={FOREST_ZONE} pathOptions={{ color: '#064e3b', fillColor: '#065f46', fillOpacity: 0.2, weight: 3, dashArray: '6, 6' }}>
          <Popup><b>🌲 Kawasan Hutan Lindung Historis (EUDR 2020)</b><br/>Area konservasi terlarang.</Popup>
        </Polygon>

        {/* Lahan Petani (Ditampilkan jika viewMode adalah 'all' atau 'petani') */}
        {(viewMode === 'all' || viewMode === 'petani') && (
          <>
            {/* Poligon Lahan Registrasi (Dummy) */}
            <Polygon positions={polygonPetaniA} pathOptions={{ color: '#047857', fillColor: '#10B981', fillOpacity: 0.5 }}>
              <Popup><b>Lahan Terverifikasi PT Kebun Makmur</b><br/>Area: 42 Hektar<br/>Status: 🟢 EUDR Compliant</Popup>
            </Polygon>
            
            <Polygon positions={polygonPetaniB} pathOptions={{ color: '#dc2626', fillColor: '#ef4444', fillOpacity: 0.5 }}>
              <Popup><b>Lahan Bpk Budi</b><br/>Area: 18 Hektar<br/>Status: 🔴 EUDR Non-Compliant (Deforestasi)</Popup>
            </Polygon>

            {/* Poligon Tambahan dari Petani Dashboard (Realtime) - Berwarna Berdasarkan Status */}
            {newFarms.filter(farm => !farm.rejected).map((farm) => {
              let color, fillColor, statusLabel;
              if (farm.disputed || farm.status === 'Sengketa') {
                color = '#dc2626'; fillColor = '#ef4444'; statusLabel = '🔴 Sengketa';
              } else if (farm.eudr_compliance === 'non-compliant' || farm.status === 'Deforestasi') {
                color = '#dc2626'; fillColor = '#f87171'; statusLabel = '❌ EUDR Deforestasi (Non-Compliant)';
              } else if (farm.approved || farm.status === 'Verified') {
                color = '#15803d'; fillColor = '#22c55e'; statusLabel = '🟢 Verified (EUDR Compliant)';
              } else if (farm.status === 'Ditolak') {
                color = '#991b1b'; fillColor = '#f87171'; statusLabel = '❌ Ditolak';
              } else {
                color = '#d97706'; fillColor = '#f59e0b'; statusLabel = '🟡 Menunggu Review';
              }
              return (
                <Polygon key={farm.id} positions={farm.polygon} pathOptions={{ color, fillColor, fillOpacity: 0.55, weight: 2.5 }}>
                  <Popup>
                    <div style={{ minWidth: '150px' }}>
                      <b style={{ fontSize: '14px', display: 'block', marginBottom: '4px' }}>🌴 {farm.farm_name || farm.nama_pemilik || 'Petani'}</b>
                      <span style={{ fontSize: '12px', color: '#666' }}>ID: {farm.id}</span><br/>
                      <span style={{ fontSize: '12px', color: '#666' }}>Sertifikat: {farm.no_sertifikat || farm.nomor_sertifikat || '-'}</span><br/>
                      <span style={{ fontSize: '12px', color: '#666' }}>Luas: {farm.luas_ha} Ha</span><br/>
                      <span style={{ fontSize: '12px', display: 'block', marginTop: '4px', marginBottom: '8px' }}>Status: {statusLabel}</span>

                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFarm(farm.id);
                        }}
                        style={{
                          background: '#ef4444', 
                          color: 'white', 
                          border: 'none', 
                          padding: '6px 12px', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          width: '100%',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'center',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                      >
                        🗑️ Hapus Poligon
                      </button>
                    </div>
                  </Popup>
                </Polygon>
              );
            })}
          </>
        )}

        {/* Infrastruktur Mill & Rantai Pasok (Ditampilkan jika viewMode adalah 'all' atau 'mill') */}
        {(viewMode === 'all' || viewMode === 'mill') && (
          <>
            <Marker position={millLocation}>
              <Popup><b>Pabrik Utama CPO (Mill Alpha)</b><br/>Status: Aktif Memproses Batch</Popup>
            </Marker>

            {/* Realtime Fleet Tracking */}
            <Marker position={truckLocation}>
              <Popup><b>[TRACKING] Truk B-9412-XX</b><br/>Tujuan: Gudang Transit</Popup>
            </Marker>

            <Marker position={dstLocation}>
              <Popup><b>Gudang Agent Pusat Ekspor</b><br/>Status Penerimaan: Siap</Popup>
            </Marker>

            <Polyline positions={routePattern} pathOptions={{ color: '#f59e0b', weight: 4, opacity: 0.8 }} />
          </>
        )}
      </MapContainer>
    </div>
  );
}
