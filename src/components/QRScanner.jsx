import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';

const QRScanner = ({ onScanSuccess, onScanError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const scannerRef = useRef(null);

  const startScanner = async () => {
    try {
      setPermissionError('');
      // Initialize Html5Qrcode instead of Html5QrcodeScanner
      const html5QrCode = new Html5Qrcode("qr-reader");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText, decodedResult) => {
          if (onScanSuccess) {
            onScanSuccess(decodedText, decodedResult);
          }
        },
        (errorMessage) => {
          if (onScanError) {
            onScanError(errorMessage);
          }
        }
      );
      setIsScanning(true);
    } catch (err) {
      console.error(err);
      setPermissionError("Gagal mengakses kamera. Pastikan Anda telah memberikan izin di browser.");
    }
  };

  const stopScanner = () => {
    if (scannerRef.current && isScanning) {
      scannerRef.current.stop().then(() => {
        scannerRef.current.clear();
        setIsScanning(false);
      }).catch(err => console.error(err));
    }
  };

  useEffect(() => {
    return () => {
      // Pastikan kamera mati saat komponen dilepas
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', maxWidth: '450px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <div 
        style={{ 
          width: '100%', 
          minHeight: '350px', 
          background: isScanning ? '#0f172a' : '#f8fafc', 
          borderRadius: 'var(--radius-xl)', 
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          position: 'relative',
          border: isScanning ? 'none' : '1px solid var(--border)',
          boxShadow: isScanning ? 'inset 0 0 20px rgba(0,0,0,0.5)' : 'none'
        }}
      >
        {/* Container for the actual video feed */}
        <div id="qr-reader" style={{ width: '100%', border: 'none' }}></div>

        {/* Custom Start UI Overlay */}
        {!isScanning && (
          <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem', padding: '2rem', textAlign: 'center', zIndex: 10 }}>
            <div style={{ background: 'var(--primary-light)', padding: '1.25rem', borderRadius: '50%', color: 'var(--primary-dark)', boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)' }}>
              <Camera size={36} />
            </div>
            <div>
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.2rem' }}>Scanner Tidak Aktif</h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Mulai kamera perangkat Anda untuk memindai QR Code Surat Jalan</p>
            </div>
            {permissionError && (
              <p style={{ color: '#ef4444', fontSize: '0.85rem', background: '#fee2e2', padding: '0.75rem', borderRadius: '0.5rem', margin: 0, border: '1px solid #fca5a5' }}>{permissionError}</p>
            )}
            <button className="btn-primary" onClick={startScanner} style={{ padding: '0.75rem 2rem', marginTop: '0.5rem', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)' }}>
              Nyalakan Kamera
            </button>
          </div>
        )}
      </div>

      {isScanning && (
        <button 
          onClick={stopScanner}
          style={{ 
            marginTop: '1.5rem', 
            background: '#fee2e2', 
            color: '#ef4444', 
            border: '1px solid #fca5a5', 
            padding: '0.5rem 1.5rem', 
            borderRadius: '2rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.9rem',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
          onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
        >
          <X size={16} /> Matikan Kamera
        </button>
      )}
      
      {/* Hide native html5-qrcode annoying elements and fix video aspect */}
      <style>{`
        #qr-reader { border: none !important; }
        #qr-reader video { border-radius: 1.5rem; object-fit: cover; width: 100% !important; }
        /* Hide the default link that shows under the video */
        #qr-reader__dashboard_section_csr { display: none !important; }
        #qr-reader__scan_region { background: #0f172a; }
      `}</style>
    </div>
  );
};

export default QRScanner;
