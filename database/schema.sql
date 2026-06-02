-- ============================================================
-- MANPROSI TUBES — Schema Revisi Total (v2.0)
-- Hierarki: Users → Farms → Cycles → Harvests → Manifests → CPO
-- ============================================================

-- 1. Aktifkan PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Enum Types
CREATE TYPE user_role        AS ENUM ('petani', 'mill', 'agent', 'admin');
CREATE TYPE user_status_type AS ENUM ('pending', 'active', 'suspended');
CREATE TYPE legalitas_type   AS ENUM ('SHM', 'HGU', 'SKT', 'GIRIK', 'izin_usaha');
CREATE TYPE sertifikasi_type AS ENUM ('ISPO', 'RSPO', 'tidak_ada');
CREATE TYPE cycle_status     AS ENUM ('tanam', 'pemeliharaan', 'siap_panen', 'panen', 'selesai');
CREATE TYPE manifest_status  AS ENUM ('draft', 'terbit', 'in_transit', 'diterima', 'ditolak');
CREATE TYPE batch_status     AS ENUM ('proses', 'selesai', 'didistribusikan');

-- ============================================================
-- 3. USERS — Akun semua aktor
-- ============================================================
CREATE TABLE users (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role         user_role NOT NULL,
    full_name    VARCHAR(150) NOT NULL,
    nik          VARCHAR(16) UNIQUE,           -- Khusus Petani
    email        VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status       user_status_type DEFAULT 'pending', -- Admin harus approve
    -- Profil tambahan Petani
    tipe_usaha   VARCHAR(50),                 -- 'smallholder' | 'perusahaan'
    nama_perusahaan VARCHAR(150),
    no_telp      VARCHAR(20),
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 4. FARMS — Lahan berdiri sendiri, TIDAK terhapus saat petani ganti
-- ============================================================
CREATE TABLE farms (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_name         VARCHAR(150) NOT NULL,   -- "Blok A", "Lahan Utara", dll
    petani_id         UUID REFERENCES users(id) ON DELETE SET NULL, -- nullable: lahan bisa tanpa petani sementara
    legalitas         legalitas_type NOT NULL,
    no_sertifikat     VARCHAR(100),
    sertifikasi       sertifikasi_type DEFAULT 'tidak_ada',
    no_ispo_rspo      VARCHAR(100),            -- Token ISPO/RSPO jika ada
    -- GIS
    polygon_area      GEOMETRY(Polygon, 4326), -- PostGIS: 1 lahan = 1 polygon
    luas_ha           DECIMAL(10, 4),          -- Auto-kalkulasi dari polygon
    -- Status
    is_verified       BOOLEAN DEFAULT FALSE,
    verified_by       UUID REFERENCES users(id),
    verified_at       TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT now(),
    updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Index GIS untuk query intersect cepat
CREATE INDEX farms_polygon_idx ON farms USING GIST(polygon_area);

-- ============================================================
-- 5. FARM_HISTORY — Log siapa saja yang pernah menggarap lahan ini
-- ============================================================
CREATE TABLE farm_history (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id      UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    petani_id    UUID NOT NULL REFERENCES users(id),
    mulai_tanggal DATE NOT NULL,
    akhir_tanggal DATE,                        -- NULL = masih aktif
    keterangan   TEXT,
    created_by   UUID REFERENCES users(id),   -- Admin yang assign
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 6. PRODUCTION_CYCLES — Siklus tanam per lahan
-- ============================================================
CREATE TABLE production_cycles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_id         UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    petani_id       UUID REFERENCES users(id) ON DELETE SET NULL, -- siapa petani saat siklus berjalan
    cycle_number    INTEGER NOT NULL DEFAULT 1, -- siklus ke-berapa di lahan ini
    tanggal_tanam   DATE NOT NULL,
    estimasi_panen  DATE,
    status          cycle_status DEFAULT 'tanam',
    catatan         TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 7. MAINTENANCE_LOGS — Log pemupukan/pemeliharaan per siklus
-- ============================================================
CREATE TABLE maintenance_logs (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id     UUID NOT NULL REFERENCES production_cycles(id) ON DELETE CASCADE,
    tanggal      DATE NOT NULL,
    jenis        VARCHAR(50) NOT NULL,         -- 'pupuk', 'obat', 'pruning', 'lainnya'
    nama_produk  VARCHAR(150),
    volume_kg    DECIMAL(10, 2),
    blok         VARCHAR(50),
    catatan      TEXT,
    created_at   TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 8. HARVESTS — Pencatatan panen (terikat ke SIKLUS, bukan langsung lahan)
-- ============================================================
CREATE TABLE harvests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id        UUID NOT NULL REFERENCES production_cycles(id) ON DELETE CASCADE,
    farm_id         UUID NOT NULL REFERENCES farms(id),     -- denormalized untuk query cepat
    petani_id       UUID REFERENCES users(id),              -- denormalized
    harvest_ke      INTEGER NOT NULL DEFAULT 1,             -- panen ke-berapa dalam siklus ini
    tanggal_panen   DATE NOT NULL,
    berat_taksiran_kg DECIMAL(12, 2) NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 9. DELIVERY_MANIFESTS — Surat Jalan (1 per harvest = 1 pengangkatan)
-- ============================================================
CREATE TABLE delivery_manifests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    harvest_id      UUID NOT NULL REFERENCES harvests(id) ON DELETE CASCADE,
    cycle_id        UUID NOT NULL REFERENCES production_cycles(id), -- denormalized
    farm_id         UUID NOT NULL REFERENCES farms(id),             -- denormalized
    petani_id       UUID REFERENCES users(id),                      -- denormalized
    -- Data Surat Jalan
    no_manifest     VARCHAR(50) UNIQUE NOT NULL,  -- e.g. "SJ-2026-0001"
    nama_supir      VARCHAR(100),
    plat_nomor      VARCHAR(20),
    estimasi_berat_kg DECIMAL(12, 2),
    -- QR Code
    qr_payload      JSONB NOT NULL,             -- {farm_id, cycle_id, harvest_id, petani_id, no_manifest, ...}
    qr_code_string  TEXT UNIQUE NOT NULL,       -- string untuk di-encode ke QR
    -- Status & Penerimaan Mill
    status          manifest_status DEFAULT 'draft',
    mill_id         UUID REFERENCES users(id),
    berat_bruto_kg  DECIMAL(12, 2),
    berat_tara_kg   DECIMAL(12, 2),
    berat_netto_kg  DECIMAL(12, 2),
    tanggal_terima  TIMESTAMPTZ,
    catatan_mill    TEXT,
    -- Timestamps
    diterbitkan_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 10. CPO_BATCHES — Batch produksi CPO di pabrik
-- ============================================================
CREATE TABLE cpo_batches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mill_id             UUID NOT NULL REFERENCES users(id),
    kode_batch          VARCHAR(100) UNIQUE NOT NULL,   -- e.g. "BATCH-CPO-2026-001"
    tanggal_produksi    DATE NOT NULL,
    total_bts_kg        DECIMAL(14, 2) DEFAULT 0,       -- total TBS masuk (auto-sum dari manifests)
    estimasi_cpo_kg     DECIMAL(14, 2),                 -- hasil ekstraksi
    oer_persen          DECIMAL(5, 2) DEFAULT 22.0,     -- Oil Extraction Rate
    status              batch_status DEFAULT 'proses',
    catatan             TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 11. BATCH_ORIGINS — Junction: Surat Jalan mana yang masuk ke Batch CPO mana
-- ============================================================
CREATE TABLE batch_origins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpo_batch_id    UUID NOT NULL REFERENCES cpo_batches(id) ON DELETE CASCADE,
    manifest_id     UUID NOT NULL REFERENCES delivery_manifests(id),
    berat_kontribusi_kg DECIMAL(12, 2) NOT NULL,
    persen_kontribusi   DECIMAL(5, 2),             -- % terhadap total batch
    UNIQUE(cpo_batch_id, manifest_id)
);

-- ============================================================
-- 12. CPO_DISTRIBUTIONS — Pengiriman CPO dari Mill ke Agent
-- ============================================================
CREATE TABLE cpo_distributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cpo_batch_id    UUID NOT NULL REFERENCES cpo_batches(id),
    mill_id         UUID NOT NULL REFERENCES users(id),
    agent_id        UUID REFERENCES users(id),
    kode_distribusi VARCHAR(100) UNIQUE NOT NULL,  -- e.g. "DIST-CPO-2026-001"
    no_tangki       VARCHAR(50),
    plat_truk       VARCHAR(20),
    volume_liter    DECIMAL(14, 2),
    berat_kg        DECIMAL(14, 2),
    tanggal_kirim   DATE,
    qr_label_payload JSONB,                        -- {batch_id, kode_batch, mill, tanggal, ...}
    qr_label_string TEXT UNIQUE,
    status          manifest_status DEFAULT 'draft',
    tanggal_terima  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- QUERY UTILITIES
-- ============================================================

-- Cek tumpang tindih polygon (dijalankan sebelum INSERT farm baru)
-- SELECT id, farm_name FROM farms
-- WHERE ST_Intersects(polygon_area, ST_GeomFromText('POLYGON((...))'), 4326))
-- AND id != 'id_farm_yang_sedang_diedit';

-- Tracing mundur: dari Batch CPO → Petani asal
-- SELECT u.full_name, f.farm_name, pc.cycle_number, h.tanggal_panen, bo.persen_kontribusi
-- FROM batch_origins bo
-- JOIN delivery_manifests dm ON bo.manifest_id = dm.id
-- JOIN harvests h ON dm.harvest_id = h.id
-- JOIN production_cycles pc ON h.cycle_id = pc.id
-- JOIN farms f ON pc.farm_id = f.id
-- JOIN users u ON f.petani_id = u.id
-- WHERE bo.cpo_batch_id = 'BATCH_ID_HERE';
