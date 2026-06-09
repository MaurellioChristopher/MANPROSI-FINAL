import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icons in React-Leaflet
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapClicker({ onMapClick }) {
  useMapEvents({
    click: (e) => {
      onMapClick(e.latlng);
    },
  });
  return null;
}

// Zona Hutan Lindung Historis (2020) - EUDR compliance check
export const FOREST_ZONE = [
  [-2.25, 113.82],
  [-2.12, 113.82],
  [-2.12, 113.92],
  [-2.25, 113.92]
];

// Helper functions for math
export const calculatePolygonArea = (coords) => {
  if (!coords || coords.length < 3) return 0;
  let latSum = 0;
  for (let i = 0; i < coords.length; i++) {
    latSum += coords[i][0];
  }
  const latMean = (latSum / coords.length) * (Math.PI / 180);
  const cosLat = Math.cos(latMean);
  
  const points = coords.map(c => {
    const x = c[1] * 111320 * cosLat;
    const y = c[0] * 111320;
    return { x, y };
  });

  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  
  const areaSqMeters = Math.abs(area) / 2;
  const areaHectares = areaSqMeters / 10000;
  return parseFloat(areaHectares.toFixed(2));
};

const isPointInPolygon = (point, polygon) => {
  const x = point[1], y = point[0]; // x = lng, y = lat
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0];
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};

const isLineIntersecting = (p1, p2, p3, p4) => {
  const det = (p2[1] - p1[1]) * (p4[0] - p3[0]) - (p4[1] - p3[1]) * (p2[0] - p1[0]);
  if (det === 0) return false;
  
  const lambda = ((p4[0] - p3[0]) * (p4[1] - p1[1]) - (p4[1] - p3[1]) * (p4[0] - p1[0])) / det;
  const gamma = ((p2[0] - p1[0]) * (p4[1] - p1[1]) - (p2[1] - p1[1]) * (p4[0] - p1[0])) / det;
  
  return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
};

export const checkPolygonOverlap = (polyA, polyB) => {
  if (!polyA || !polyB || polyA.length < 3 || polyB.length < 3) return false;
  
  for (let i = 0; i < polyA.length; i++) {
    if (isPointInPolygon(polyA[i], polyB)) return true;
  }
  for (let i = 0; i < polyB.length; i++) {
    if (isPointInPolygon(polyB[i], polyA)) return true;
  }
  for (let i = 0; i < polyA.length; i++) {
    const nextA = polyA[(i + 1) % polyA.length];
    for (let j = 0; j < polyB.length; j++) {
      const nextB = polyB[(j + 1) % polyB.length];
      if (isLineIntersecting(polyA[i], nextA, polyB[j], nextB)) return true;
    }
  }
  return false;
};

export default function GisMap({ polygonCoords, setPolygonCoords, refreshTrigger, editingFarmId, onCancelEdit }) {
  const [center] = useState([-2.20, 113.88]); // Centered closer to Kalimantan mock area
  const [existingFarms, setExistingFarms] = useState([]);
  const [showHistoricalForest, setShowHistoricalForest] = useState(true);

  useEffect(() => {
    try {
      const data = localStorage.getItem('agrigems_farms');
      if (data) {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
          // If editing a specific farm, exclude it from existing farms to prevent self-collision visual
          const filtered = editingFarmId 
            ? parsed.filter(f => f.id !== editingFarmId)
            : parsed;
          setExistingFarms(filtered.filter(f => 
            f && 
            Array.isArray(f.polygon) && 
            f.polygon.length >= 3
          ));
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [refreshTrigger, editingFarmId]);

  const handleMapClick = (latlng) => {
    setPolygonCoords(prev => [...prev, [latlng.lat, latlng.lng]]);
  };

  const undoLastPoint = () => {
    setPolygonCoords(prev => prev.slice(0, -1));
  };
  
  const clearPolygon = () => {
    setPolygonCoords([]);
  };

  const areaHa = calculatePolygonArea(polygonCoords);
  const isOverlappingForest = checkPolygonOverlap(polygonCoords, FOREST_ZONE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
        <div>
          <p className="text-muted" style={{ fontSize: '0.875rem', margin: 0 }}>
            {editingFarmId ? `✏️ Mengedit Batas Lahan: ${editingFarmId}` : 'Klik pada peta untuk membuat titik poligon batas lahan Anda.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {editingFarmId && (
            <button className="btn-secondary" onClick={onCancelEdit} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', color: 'var(--danger)' }}>
              Batal Edit
            </button>
          )}
          <button className="btn-secondary" onClick={undoLastPoint} disabled={polygonCoords.length === 0} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}>
            Undo Poin
          </button>
          <button className="btn-secondary" onClick={clearPolygon} disabled={polygonCoords.length === 0} style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem'}}>
            Reset Peta
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: '400px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)', zIndex: 0, position: 'relative' }}>
        {/* Toggle Layer Tutupan Hutan Lindung Historis */}
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(8px)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          border: '1px solid rgba(0,0,0,0.1)',
          minWidth: '220px'
        }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            Layer Peta Geographic Information System (GIS)
          </div>
          <label style={{ 
            display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, 
            color: showHistoricalForest ? '#065f46' : '#94a3b8',
            padding: '0.4rem 0.5rem',
            borderRadius: '6px',
            background: showHistoricalForest ? 'rgba(6,95,70,0.08)' : 'transparent',
            transition: 'all 0.2s ease'
          }}>
            <input 
              type="checkbox" 
              checked={showHistoricalForest} 
              onChange={(e) => setShowHistoricalForest(e.target.checked)}
              style={{ accentColor: '#065f46', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              🌲 Tutupan Hutan Lindung Historis (European Union Deforestation Regulation 2020)
            </span>
          </label>
          {showHistoricalForest && (
            <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.35rem', paddingLeft: '1.75rem', lineHeight: '1.3' }}>
              Menampilkan zona kawasan hutan lindung sebelum tahun 2020 berdasarkan data Geographic Information System (GIS) masa lampau untuk verifikasi kepatuhan European Union Deforestation Regulation.
            </div>
          )}
        </div>

        <MapContainer center={center} zoom={11} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer
            attribution='&copy; Google Maps'
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          />
          <MapClicker onMapClick={handleMapClick} />
          
          {polygonCoords.map((coord, index) => (
             <Marker position={coord} key={index}>
               <Popup>Titik {index + 1}</Popup>
             </Marker>
          ))}
          
          {polygonCoords.length > 2 && (
            <Polygon positions={polygonCoords} pathOptions={{ color: isOverlappingForest ? '#dc2626' : 'var(--primary)', fillColor: isOverlappingForest ? '#ef4444' : 'var(--primary)', fillOpacity: 0.4 }}>
               <Popup>
                 <b>Draft Lahan Anda</b><br/>
                 Luas: {areaHa} Ha<br/>
                 Status: {isOverlappingForest ? '🔴 European Union Deforestation Regulation - Deforestasi!' : '🟢 Aman - Tidak Beririsan dengan Hutan Lindung Historis'}
               </Popup>
            </Polygon>
          )}

          {/* Render Kawasan Hutan Lindung Historis (2020) - Toggleable */}
          {showHistoricalForest && (
            <Polygon positions={FOREST_ZONE} pathOptions={{ color: '#064e3b', fillColor: '#065f46', fillOpacity: 0.3, weight: 3, dashArray: '6, 6' }}>
               <Popup>
                 <b>🌲 Kawasan Hutan Lindung Historis (European Union Deforestation Regulation 2020)</b><br/>
                 Zona lindung berdasarkan data peta Geographic Information System (GIS) masa lampau.<br/>
                 Tidak boleh ada aktivitas deforestasi sesuai regulasi European Union Deforestation Regulation.<br/>
                 <em>Sumber data: Peta tutupan lahan historis sebelum 31 Desember 2020.</em>
               </Popup>
            </Polygon>
          )}

          {/* Render lahan yang sudah terdaftar sebelumnya */}
          {existingFarms.map((farm) => {
            let color, fillColor, statusLabel;
            if (farm.disputed || farm.status === 'Sengketa') {
              color = '#dc2626'; fillColor = '#ef4444'; statusLabel = '🔴 Sengketa';
            } else if (farm.eudr_compliance === 'non-compliant' || farm.status === 'Deforestasi') {
              color = '#ef4444'; fillColor = '#f87171'; statusLabel = '❌ European Union Deforestation Regulation - Deforestasi';
            } else if (farm.status === 'Verified') {
              color = '#15803d'; fillColor = '#22c55e'; statusLabel = '🟢 Verified (Tidak Beririsan dengan Hutan Lindung)';
            } else {
              color = '#d97706'; fillColor = '#f59e0b'; statusLabel = '🟡 Menunggu Review';
            }
            return (
              <Polygon key={farm.id} positions={farm.polygon} pathOptions={{ color, fillColor, fillOpacity: 0.4, weight: 2 }}>
                <Popup>
                  <b>🌴 {farm.farm_name}</b><br/>
                  Sertifikat: {farm.no_sertifikat}<br/>
                  Luas: {farm.luas_ha} Ha<br/>
                  Status: {statusLabel}<br/>
                  <em style={{ fontSize: '0.85em', color: '#6b7280' }}>
                    Verifikasi lahan historis: {farm.eudr_compliance === 'non-compliant' 
                      ? 'Lahan ini BERIRISAN dengan kawasan hutan lindung historis berdasarkan peta Geographic Information System (GIS) masa lampau.' 
                      : 'Lahan ini TIDAK beririsan dengan kawasan hutan lindung historis. Aman dari deforestasi.'}
                  </em>
                </Popup>
              </Polygon>
            );
          })}
        </MapContainer>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', padding: '0 1rem' }}>
        {polygonCoords.length > 0 && (
          <div className="glass-panel" style={{ padding: '0.75rem' }}>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.85rem', color: 'var(--text-main)' }}>Informasi Poligon:</h4>
            <div style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>
              <div>Jumlah Titik: <b>{polygonCoords.length}</b></div>
              <div>Estimasi Luas: <b style={{ color: 'var(--primary-dark)' }}>{areaHa} Ha</b></div>
              {isOverlappingForest && (
                <div style={{ color: '#ef4444', fontWeight: 'bold', marginTop: '0.25rem' }}>
                  ⚠️ TERDIAGNOSA DEFORESTASI: Lahan beririsan dengan Kawasan Hutan Lindung Historis (European Union Deforestation Regulation)!
                </div>
              )}
            </div>
          </div>
        )}
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0.75rem', background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600 }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Legenda Peta Geographic Information System (GIS)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#22c55e', display: 'inline-block' }}></span>Lahan Terverifikasi (Aman - Tidak Beririsan Hutan Lindung)</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#f59e0b', display: 'inline-block' }}></span>Menunggu Review</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 12, height: 12, borderRadius: 2, background: '#ef4444', display: 'inline-block' }}></span>Sengketa / Deforestasi</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><span style={{ width: 12, height: 12, border: '2px dashed #065f46', borderRadius: 2, background: 'rgba(6,95,70,0.2)', display: 'inline-block' }}></span>Kawasan Hutan Lindung Historis (European Union Deforestation Regulation 2020)</span>
        </div>
      </div>
    </div>
  );
}


