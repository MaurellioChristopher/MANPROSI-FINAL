import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet DivIcons with Emojis to avoid static assets issue
const millIcon = L.divIcon({
  html: `<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); transform: translate(-30%, -30%);">🏭</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const portIcon = L.divIcon({
  html: `<div style="font-size: 26px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); transform: translate(-30%, -30%);">⚓</div>`,
  className: 'custom-leaflet-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const truckIcon = L.divIcon({
  html: `<div style="font-size: 30px; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.4)); transform: translate(-30%, -30%); z-index: 1000;">🚚</div>`,
  className: 'custom-leaflet-icon-truck',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

// Linear interpolation function for array of points
function interpolatePosition(points, progress) {
  if (!points || points.length === 0) return [0, 0];
  if (points.length === 1) return points[0];
  if (progress <= 0) return points[0];
  if (progress >= 1) return points[points.length - 1];

  const numSegments = points.length - 1;
  const segmentWeight = 1 / numSegments;
  
  const segmentIndex = Math.min(Math.floor(progress / segmentWeight), numSegments - 1);
  const segmentProgress = (progress - (segmentIndex * segmentWeight)) / segmentWeight;
  
  const start = points[segmentIndex];
  const end = points[segmentIndex + 1];
  
  const lat = start[0] + (end[0] - start[0]) * segmentProgress;
  const lng = start[1] + (end[1] - start[1]) * segmentProgress;
  
  return [lat, lng];
}

// Map helper to handle auto bounds adjustment
function ChangeView({ waypoints }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints && waypoints.length > 0) {
      map.fitBounds(waypoints, { padding: [50, 50], maxZoom: 10 });
    }
  }, [waypoints, map]);
  return null;
}

export default function TrackingMap({ activeBatch, progress = 0 }) {
  // Fallback default route if no batch or route is active
  const fallbackWaypoints = [
    [-2.05, 113.05], // Pundu
    [-2.2, 113.5], 
    [-2.6, 114.1], 
    [-3.0, 114.3], 
    [-3.3194, 114.5908] // Banjarmasin
  ];

  const hasRouteInfo = activeBatch && activeBatch.route_info;
  const waypoints = hasRouteInfo ? activeBatch.route_info.waypoints : fallbackWaypoints;
  const originName = hasRouteInfo ? activeBatch.route_info.originName : "Pabrik Pundu (Kotawaringin Timur)";
  const destName = hasRouteInfo ? activeBatch.route_info.destName : "Pelabuhan Banjarmasin (Trisakti)";

  const startLoc = waypoints[0];
  const endLoc = waypoints[waypoints.length - 1];

  // Calculate truck location based on batch status
  let truckLoc = startLoc;
  let statusText = "Standby di Pabrik";
  let speedText = "0 km/h";

  if (activeBatch) {
    if (activeBatch.status === 'Dalam Rute') {
      truckLoc = interpolatePosition(waypoints, progress);
      statusText = "Dalam Perjalanan (LIVE)";
      speedText = `${Math.floor(65 + Math.sin(progress * Math.PI * 4) * 8)} km/h`;
    } else if (activeBatch.status === 'Tiba di Pelabuhan') {
      truckLoc = endLoc;
      statusText = "Tiba di Pelabuhan";
      speedText = "0 km/h";
    } else if (activeBatch.status === 'Truk Telah Muat') {
      truckLoc = startLoc;
      statusText = "Selesai Muat - Standby di Pabrik";
      speedText = "0 km/h";
    }
  } else {
    // Demo mode: interpolate based on global progress if any, otherwise default
    truckLoc = interpolatePosition(waypoints, progress || 0.4);
    statusText = "Mode Demo - Perjalanan Simulasi";
    speedText = "70 km/h";
  }

  return (
    <div style={{ height: '100%', minHeight: '400px', borderRadius: 'var(--radius-md)', overflow: 'hidden', zIndex: 0 }}>
      <MapContainer center={truckLoc} zoom={8} style={{ height: '100%', width: '100%', zIndex: 1 }}>
        <TileLayer
          attribution='&copy; Google Maps'
          url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        />
        
        {/* Helper to dynamically center/fit route bounds */}
        <ChangeView waypoints={waypoints} />

        {/* Pabrik Keberangkatan */}
        <Marker position={startLoc} icon={millIcon}>
          <Popup>
            <div style={{ fontSize: '0.85rem' }}>
              <strong>🏭 Asal Pabrik:</strong><br/>
              {originName}
            </div>
          </Popup>
        </Marker>

        {/* Lokasi Truk Tangki */}
        <Marker position={truckLoc} icon={truckIcon}>
          <Popup>
            <div style={{ fontSize: '0.85rem' }}>
              <strong>🚚 Truk Logistik (B-9412-XX):</strong><br/>
              Status: <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>{statusText}</span><br/>
              Kecepatan: <strong>{speedText}</strong><br/>
              {activeBatch && (
                <>Muatan: <strong>{activeBatch.id}</strong></>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Pelabuhan Tujuan */}
        <Marker position={endLoc} icon={portIcon}>
          <Popup>
            <div style={{ fontSize: '0.85rem' }}>
              <strong>⚓ Tujuan Pelabuhan:</strong><br/>
              {destName}
            </div>
          </Popup>
        </Marker>

        {/* Jalur Rute Ekspedisi */}
        <Polyline positions={waypoints} pathOptions={{ color: '#d97706', weight: 4, dashArray: '8, 8' }} />
      </MapContainer>
    </div>
  );
}

