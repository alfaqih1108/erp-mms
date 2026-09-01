-- ============================================================================
-- ERP MMS v3 - SKEMA DATABASE SUPABASE (POSTGRESQL) & SEED DATA MASTER
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 2. TABEL-TABEL MASTER & TRANSAKSI
-- ============================================================================

-- A. TABEL USERS (Master Profil HRIS 36 Field)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    nika VARCHAR(50),
    name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL,
    role_label VARCHAR(100),
    kode_jabatan VARCHAR(50),
    jabatan VARCHAR(150),
    level_grade VARCHAR(100),
    department VARCHAR(100),
    avatar_grad TEXT,
    quota_annual_leave INT DEFAULT 12,
    remaining_annual_leave INT DEFAULT 12,
    quota_personal_leave INT DEFAULT 3,
    remaining_personal_leave INT DEFAULT 3,
    current_quarter VARCHAR(50),
    join_date DATE,
    birth_place VARCHAR(100),
    birth_date DATE,
    agama VARCHAR(50),
    gender VARCHAR(50),
    phone VARCHAR(50),
    email VARCHAR(150),
    username VARCHAR(100) UNIQUE,
    password VARCHAR(150) DEFAULT 'password123',
    nik VARCHAR(50),
    status_karyawan VARCHAR(100),
    status_pajak VARCHAR(50),
    pendidikan VARCHAR(100),
    no_kk VARCHAR(50),
    alamat_ktp TEXT,
    alamat_domisili TEXT,
    status_tempat_tinggal VARCHAR(100),
    no_npwp VARCHAR(50),
    alamat_npwp TEXT,
    bank_name VARCHAR(100),
    rekening_no VARCHAR(100),
    rekening_name VARCHAR(150),
    no_bpjs_kesehatan VARCHAR(50),
    no_bpjs_tenaga_kerja VARCHAR(50),
    emergency_name VARCHAR(150),
    emergency_relation VARCHAR(100),
    emergency_phone VARCHAR(50),
    sppg_id VARCHAR(50),
    sppg_name VARCHAR(150),
    yayasan_partner VARCHAR(150),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- B. TABEL KITCHENS (Master 15 Dapur Program SPPG Yayasan)
CREATE TABLE IF NOT EXISTS kitchens (
    id VARCHAR(50) PRIMARY KEY,
    id_sppg VARCHAR(50) UNIQUE NOT NULL,
    nama_dapur VARCHAR(150) NOT NULL,
    nama_yayasan VARCHAR(150),
    provinsi VARCHAR(100),
    kota_kabupaten VARCHAR(100),
    kecamatan VARCHAR(100),
    kelurahan VARCHAR(100),
    alamat_lengkap TEXT,
    location VARCHAR(150),
    maker_yayasan VARCHAR(150),
    perwakilan_yayasan VARCHAR(150),
    manager_area VARCHAR(150),
    status VARCHAR(50) DEFAULT 'AKTIF',
    kapasitas_porsi INT DEFAULT 500,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- C. TABEL GUIDELINE DOCUMENTS (Dokumen Sosialisasi & Panduan Yayasan)
CREATE TABLE IF NOT EXISTS guideline_documents (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    file_type VARCHAR(20) NOT NULL,
    category VARCHAR(100),
    target_role VARCHAR(50),
    target_label VARCHAR(100),
    file_size VARCHAR(50),
    description TEXT,
    uploaded_by VARCHAR(150),
    upload_date DATE DEFAULT CURRENT_DATE,
    file_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- D. TABEL ITEM REQUESTS (Purchase Requisitions / PR Pengadaan)
CREATE TABLE IF NOT EXISTS item_requests (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    employee_name VARCHAR(150) NOT NULL,
    role VARCHAR(50),
    department VARCHAR(100),
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    quantity INT DEFAULT 1,
    unit_price NUMERIC(15,2) DEFAULT 0,
    total_price NUMERIC(15,2) DEFAULT 0,
    urgency VARCHAR(50) DEFAULT 'MEDIUM',
    reason TEXT,
    target_kitchen VARCHAR(255) NOT NULL,
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    stage VARCHAR(50) DEFAULT 'MANAGER_APPROVAL',
    status VARCHAR(50) DEFAULT 'PENDING',
    rejection_reason TEXT,
    approval_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- E. TABEL LEAVES (Pengajuan Cuti & Izin Karyawan)
CREATE TABLE IF NOT EXISTS leaves (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    employee_name VARCHAR(150) NOT NULL,
    role VARCHAR(50),
    department VARCHAR(100),
    leave_type VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    duration INT DEFAULT 1,
    reason TEXT,
    emergency_contact VARCHAR(100),
    attachment_url TEXT,
    attachment_name VARCHAR(255),
    stage VARCHAR(50) DEFAULT 'HC_APPROVAL',
    status VARCHAR(50) DEFAULT 'PENDING',
    rejection_reason TEXT,
    approval_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- F. TABEL CASH ADVANCES (Kasbon Operasional & Settlement LPJ)
CREATE TABLE IF NOT EXISTS cash_advances (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    employee_name VARCHAR(150) NOT NULL,
    role VARCHAR(50),
    department VARCHAR(100),
    purpose TEXT NOT NULL,
    amount_requested NUMERIC(15,2) NOT NULL,
    amount_approved NUMERIC(15,2),
    amount_disbursed NUMERIC(15,2),
    target_kitchen VARCHAR(255),
    bank_name VARCHAR(100),
    rekening_no VARCHAR(100),
    rekening_name VARCHAR(150),
    stage VARCHAR(50) DEFAULT 'MANAGER_APPROVAL',
    status VARCHAR(50) DEFAULT 'PENDING',
    disbursed_at TIMESTAMPTZ,
    settlement JSONB DEFAULT NULL,
    approval_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- G. TABEL KITCHEN REPORTS (Laporan Transaksi Dapur & Saldo VA oleh Maker Yayasan)
CREATE TABLE IF NOT EXISTS kitchen_reports (
    id VARCHAR(50) PRIMARY KEY,
    kitchen_id VARCHAR(50) REFERENCES kitchens(id) ON DELETE CASCADE,
    kitchen_name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    reporter_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    reporter_name VARCHAR(150) NOT NULL,
    raw_material_cost NUMERIC(15,2) DEFAULT 0,
    operational_cost NUMERIC(15,2) DEFAULT 0,
    car_rental_cost NUMERIC(15,2) DEFAULT 0,
    total_daily_expense NUMERIC(15,2) DEFAULT 0,
    porsi_besar INT DEFAULT 0,
    porsi_kecil INT DEFAULT 0,
    beneficiaries_count INT DEFAULT 0,
    target_budget NUMERIC(15,2) DEFAULT 0,
    cost_per_portion NUMERIC(15,2) DEFAULT 0,
    cost_per_portion_all_in NUMERIC(15,2) DEFAULT 0,
    spm_file_name VARCHAR(255),
    spm_attachment_url TEXT,
    va_bank_name VARCHAR(150),
    va_balance NUMERIC(15,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- H. TABEL TIMESHEETS (Log Aktivitas Kerja Harian)
CREATE TABLE IF NOT EXISTS timesheets (
    id VARCHAR(50) PRIMARY KEY,
    employee_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    employee_name VARCHAR(150) NOT NULL,
    role VARCHAR(50),
    date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    activity TEXT NOT NULL,
    activity_preset VARCHAR(150),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'COMPLETED',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- I. TABEL FIELD ISSUES (Laporan Kendala Harian Lapangan Perwakilan Yayasan)
CREATE TABLE IF NOT EXISTS field_issues (
    id VARCHAR(50) PRIMARY KEY,
    author_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    kitchen_id VARCHAR(50),
    kitchen_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    severity VARCHAR(50) DEFAULT 'MEDIUM',
    issue_description TEXT NOT NULL,
    action_taken TEXT,
    status VARCHAR(50) DEFAULT 'OPEN',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- J. TABEL ACTIVITY LOGS (Audit Trail Sistem)
CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    text TEXT NOT NULL,
    time VARCHAR(20),
    type VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- K. TABEL CATALOG (Preset Katalog Pengadaan)
CREATE TABLE IF NOT EXISTS catalog (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    est_price NUMERIC(15,2) NOT NULL,
    category VARCHAR(100)
);

-- ============================================================================
-- 3. ROW LEVEL SECURITY (RLS) & PUBLIC POLICIES
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchens ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog ENABLE ROW LEVEL SECURITY;

-- Buat Access Policies (Read/Write untuk Anon & Authenticated Client)
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public Read Access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Public Read Access" ON %I FOR SELECT USING (true);', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public Write Access" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Public Write Access" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END $$;

-- ============================================================================
-- 4. MASTER SEED DATA: 15 DAPUR PROGRAM SPPG & 4 KATALOG
-- ============================================================================

INSERT INTO catalog (name, est_price, category) VALUES
('Laser Distance Meter 50M', 1950000, 'Perangkat IT & Survei'),
('Heavy Duty Cooking Pot 50L', 2200000, 'Fasilitas Kantor & Dapur'),
('Rice Cooker Komersial 20L', 3400000, 'Fasilitas Kantor & Dapur'),
('Laptop ThinkPad L14 Gen 4', 14500000, 'Perangkat IT')
ON CONFLICT DO NOTHING;

INSERT INTO kitchens (id, id_sppg, nama_dapur, nama_yayasan, provinsi, kota_kabupaten, kecamatan, kelurahan, alamat_lengkap, location, maker_yayasan, perwakilan_yayasan, manager_area, status, kapasitas_porsi)
VALUES
('DAPUR-01', 'WFC2L9EH', 'SPPG Cilangkap - Tapos 1', 'Akselerasi Bumi Indonesia', 'Jawa Barat', 'Kota Depok', 'Tapos', 'Cilangkap', 'Cilangkap, Kec. Tapos, Kota Depok, Jawa Barat', 'Kota Depok, Jawa Barat', 'Belum Ditetapkan', 'Tri Utari (PY-001)', 'Rendy Seftiana (Manajer Area Jakarta & Jabar)', 'AKTIF', 500),
('DAPUR-02', 'YPEHMDF0', 'SPPG Cipinang Cempedak', 'Adil Berdaya Insani', 'DKI Jakarta', 'Kota Jakarta Timur', 'Jatinegara', 'Cipinang Cempedak', 'Cipinang Cempedak, Kec. Jatinegara, Kota Jakarta Timur, DKI Jakarta', 'Kota Jakarta Timur, DKI Jakarta', 'Belum Ditetapkan', 'Khoirudin (PY-002)', 'Bivaldie A.R. (Manajer Area Jakarta)', 'AKTIF', 500),
('DAPUR-03', 'THAH6JZO', 'SPPG Citaman', 'Akselerasi Bumi Indonesia', 'Banten', 'Kabupaten Pandeglang', 'Jiput', 'Citaman', 'Citaman, Kec. Jiput, Kab. Pandeglang, Banten', 'Kabupaten Pandeglang, Banten', 'Belum Ditetapkan', 'Tresna (PY-003)', 'Rendy Seftiana (Manajer Area Jakarta & Jabar)', 'AKTIF', 500),
('DAPUR-04', 'KJDSEBN6', 'SPPG Harjamukti', 'Akselerasi Bumi Indonesia', 'Jawa Barat', 'Kota Depok', 'Cimanggis', 'Harjamukti', 'Harjamukti, Kec. Cimanggis, Kota Depok, Jawa Barat', 'Kota Depok, Jawa Barat', 'Belum Ditetapkan', 'Setiawati (PY-004)', 'Rendy Seftiana (Manajer Area Jakarta & Jabar)', 'AKTIF', 500),
('DAPUR-05', 'NFXCJ3PI', 'SPPG Jatiwaringin', 'Akselerasi Bumi Indonesia', 'Jawa Barat', 'Kota Bekasi', 'Pondok Gede', 'Jatiwaringin', 'Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat', 'Kota Bekasi, Jawa Barat', 'Belum Ditetapkan', 'Astri Listia (PY-005)', 'Bivaldie A.R. (Manajer Area Jakarta)', 'AKTIF', 500),
('DAPUR-06', 'HUBRVBTW', 'SPPG Kayu Manis', 'Adil Berdaya Insani', 'DKI Jakarta', 'Kota Jakarta Timur', 'Matraman', 'Kayu Manis', 'Kayu Manis, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta', 'Kota Jakarta Timur, DKI Jakarta', 'Belum Ditetapkan', 'Childa Susanti (PY-006)', 'Bivaldie A.R. (Manajer Area Jakarta)', 'AKTIF', 500),
('DAPUR-07', 'VMQ6JXXM', 'SPPG Kelapa Dua Wetan', 'Adil Berdaya Insani', 'DKI Jakarta', 'Kota Jakarta Timur', 'Ciracas', 'Kelapa Dua Wetan', 'Kelapa Dua Wetan, Kec. Ciracas, Kota Jakarta Timur, DKI Jakarta', 'Kota Jakarta Timur, DKI Jakarta', 'Belum Ditetapkan', 'Syahrir (PY-007)', 'Bivaldie A.R. (Manajer Area Jakarta)', 'AKTIF', 500),
('DAPUR-08', 'XQQBILKQ', 'SPPG Kendan', 'Akselerasi Bumi Indonesia', 'Jawa Barat', 'Kabupaten Bandung', 'Nagreg', 'Kendan', 'Kendan, Kec. Nagreg, Kab. Bandung, Jawa Barat', 'Kabupaten Bandung, Jawa Barat', 'Belum Ditetapkan', 'Maman Sutarman (PY-008)', 'Rendy Seftiana (Manajer Area Jakarta & Jabar)', 'AKTIF', 500),
('DAPUR-09', 'MLRQXJ1K', 'SPPG Leles', 'Akselerasi Bumi Indonesia', 'Jawa Barat', 'Kabupaten Garut', 'Leles', 'Leles', 'Leles, Kec. Leles, Kab. Garut, Jawa Barat', 'Kabupaten Garut, Jawa Barat', 'Belum Ditetapkan', 'Jusman Ziliwu (PY-009)', 'Rendy Seftiana (Manajer Area Jakarta & Jabar)', 'AKTIF', 500),
('DAPUR-10', '1OAXCXMA', 'SPPG Mandalamekar', 'Bekah Iman Nafi''An', 'Jawa Barat', 'Kabupaten Bandung', 'Cimenyan', 'Mandalamekar', 'Mandalamekar, Kec. Cimenyan, Kab. Bandung, Jawa Barat', 'Kabupaten Bandung, Jawa Barat', 'Belum Ditetapkan', 'Achmad Sofyan Permadi (PY-010)', 'Rendy Seftiana (Manajer Area Jakarta & Jabar)', 'AKTIF', 500),
('DAPUR-11', 'PMXKYUEZ', 'SPPG Mandirancan', 'Bekah Iman Nafi''An', 'Jawa Barat', 'Kabupaten Kuningan', 'Mandirancan', 'Mandirancan', 'Mandirancan, Kec. Mandirancan, Kab. Kuningan, Jawa Barat', 'Kabupaten Kuningan, Jawa Barat', 'Belum Ditetapkan', 'Imam Baiturohim (PY-011)', 'Rendy Seftiana (Manajer Area Jakarta & Jabar)', 'AKTIF', 500),
('DAPUR-12', 'WCJP3OPY', 'SPPG Pisangan Baru', 'Adil Berdaya Insani', 'DKI Jakarta', 'Kota Jakarta Timur', 'Matraman', 'Pisangan Baru', 'Pisangan Baru, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta', 'Kota Jakarta Timur, DKI Jakarta', 'Belum Ditetapkan', 'Yulianti (PY-012)', 'Bivaldie A.R. (Manajer Area Jakarta)', 'AKTIF', 500),
('DAPUR-13', 'ZAJXQGBU', 'SPPG Salaman/Sriwedari', 'Sinergi Kesehatan Negeri', 'Jawa Tengah', 'Kabupaten Magelang', 'Salaman', 'Sriwedari', 'Sriwedari, Kec. Salaman, Kab. Magelang, Jawa Tengah', 'Kabupaten Magelang, Jawa Tengah', 'Belum Ditetapkan', 'Koko Kiswoko (PY-013)', 'Dian Ekawati (Manajer Area Jawa Tengah)', 'AKTIF', 500),
('DAPUR-14', '5SGNUNP0', 'SPPG Tengaran', 'Sinergi Kesehatan Negeri', 'Jawa Tengah', 'Kabupaten Semarang', 'Tengaran', 'Tengaran', 'Tengaran, Kec. Tengaran, Kab. Semarang, Jawa Tengah', 'Kabupaten Semarang, Jawa Tengah', 'Belum Ditetapkan', 'Farissa Cahyainka (PY-014)', 'Dian Ekawati (Manajer Area Jawa Tengah)', 'AKTIF', 500),
('DAPUR-15', '36UNM9F5', 'SPPG Utan Kayu Selatan', 'Adil Berdaya Insani', 'DKI Jakarta', 'Kota Jakarta Timur', 'Matraman', 'Utan Kayu Selatan', 'Utan Kayu Selatan, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta', 'Kota Jakarta Timur, DKI Jakarta', 'Belum Ditetapkan', 'Titi Hardyati (PY-015)', 'Bivaldie A.R. (Manajer Area Jakarta)', 'AKTIF', 500)
ON CONFLICT (id_sppg) DO NOTHING;

-- Master Dokumen Panduan
INSERT INTO guideline_documents (id, title, file_type, category, target_role, target_label, file_size, description, uploaded_by, upload_date)
VALUES
('DOC-001', 'Panduan Pelaksanaan & Standar Verifikasi Lapangan Program Yayasan 2026.pdf', 'PDF', 'SOP Lapangan & Verifikasi', 'PERWAKILAN_YAYASAN', 'Khusus Perwakilan Yayasan', '3.8 MB', 'Pedoman resmi alur survei calon penerima manfaat, koordinasi teknis dengan Manager Area, serta kepatuhan administrasi program kemitraan.', 'Tazkia Aulia (Human Capital)', '2026-08-19'),
('DOC-002', 'Materi Sosialisasi Kebijakan & Alur Pengajuan Program Kemitraan Sosial.pptx', 'PPT', 'Materi Sosialisasi & Presentasi', 'PERWAKILAN_YAYASAN', 'Khusus Perwakilan Yayasan', '12.4 MB', 'Slide presentasi resmi untuk sosialisasi program kemitraan sosial kepada tokoh masyarakat dan mitra lokal di wilayah kerja.', 'Tazkia Aulia (Human Capital)', '2026-08-18'),
('DOC-003', 'SOP Pengelolaan Bahan Baku, Standar Porsi Dapur & Akuntabilitas Virtual Account.pdf', 'PDF', 'SOP Dapur & Finansial VA', 'MAKER_YAYASAN', 'Khusus Maker Yayasan', '4.5 MB', 'Petunjuk teknis pencatatan transaksi harian bahan baku dapur, formula perhitungan harga efisiensi per porsi, dan rekonsiliasi saldo Virtual Account bank.', 'Tazkia Aulia (Human Capital)', '2026-08-19'),
('DOC-004', 'Sosialisasi Higienitas Dapur Komersial & Manajemen Stok Bahan Makanan Segar.pptx', 'PPT', 'Materi Sosialisasi & Training', 'MAKER_YAYASAN', 'Khusus Maker Yayasan', '15.2 MB', 'Slide edukasi standar sanitasi, keamanan pangan (food safety), dan rotasi bahan makanan (FIFO) di dapur program yayasan.', 'Tazkia Aulia (Human Capital)', '2026-08-17'),
('DOC-005', 'Buku Saku Kode Etik, Tata Kelola & Nilai Integritas Yayasan 2026.pdf', 'PDF', 'Corporate Governance & Etika', 'ALL_YAYASAN', 'Seluruh Tim Yayasan', '2.1 MB', 'Buku saku nilai integritas, transparansi penyaluran bantuan, dan perlindungan privasi data penerima manfaat.', 'Tazkia Aulia (Human Capital)', '2026-08-15')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. MASTER SEED DATA: 36 AKUN MASTER KARYAWAN & PENGGUNA HRIS
-- ============================================================================

INSERT INTO users (id, nika, name, role, role_label, kode_jabatan, jabatan, level_grade, department, avatar_grad, quota_annual_leave, remaining_annual_leave, quota_personal_leave, remaining_personal_leave, current_quarter, join_date, birth_place, birth_date, agama, gender, phone, email, username, password, nik, status_karyawan, status_pajak, pendidikan, bank_name, rekening_no, rekening_name, notes)
VALUES
('ADM-001', 'ADM-2026-000', 'Super Administrator', 'SUPER_ADMIN', 'Super Admin (Master)', 'SYS-ADMIN-00', 'Super Administrator Master IT & System', 'Master Tier / System Admin', 'Information Technology & System Master', 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)', 99, 99, 99, 99, 'Q3 (Juli–September 2026)', '2024-01-01', 'Jakarta', '1990-01-01', 'Islam', 'Laki-laki', '0811-9988-7766', 'admin@erpmms.co.id', 'superadmin', 'password123', '3171010101900001', 'Tetap', 'TK/0', 'Magister (S2)', 'BCA (Bank Central Asia)', '8880001122', 'Super Administrator', 'Akun Master Super Admin.'),
('DU-001', 'K-2025-001', 'Rochmad', 'DIREKTUR_UTAMA', 'Direktur Utama', '1120.02', 'Direktur Utama', 'Direksi / Tier 1', 'Direksi Eksekutif', 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)', 18, 16, 3, 3, 'Q3 (Juli–September 2026)', '2025-11-26', 'Jakarta', '1985-05-12', 'Islam', 'Laki-laki', '0812-3456-001', 'rochmad@erpmms.co.id', 'rochmad', 'password123', '3171010101850001', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1370005301243', 'Rochmad', 'Direktur Utama memimpin strategi eksekutif.'),
('DO-001', 'K-2025-002', 'Muhammad Arrasyid', 'DIREKTUR_OPERASIONAL', 'Direktur Operasional', '1120.03', 'Direktur Operasional', 'Direksi / Tier 2', 'Direksi Operasional', 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)', 15, 13, 3, 3, 'Q3 (Juli–September 2026)', '2025-12-08', 'Jakarta', '1988-08-14', 'Islam', 'Laki-laki', '0812-3456-002', 'arrasyid@erpmms.co.id', 'arrasyid', 'password123', '3171010101880002', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Jago Syariah', '505568418461', 'Muhammad Arrasyid', 'Direktur Operasional.'),
('DK-001', 'K-2025-003', 'Kody Suryo Nugroho', 'DIREKTUR_KEUANGAN', 'Direktur Keuangan', '1120.03', 'Direktur Keuangan', 'Direksi / Tier 2', 'Direksi Keuangan', 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)', 15, 14, 3, 3, 'Q3 (Juli–September 2026)', '2025-12-08', 'Semarang', '1987-03-20', 'Islam', 'Laki-laki', '0812-3456-003', 'kody.suryo@erpmms.co.id', 'kody.suryo', 'password123', '3374010101870003', 'Tetap', 'K/1', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '2521199341', 'Kody Suryo Nugroho', 'Direktur Keuangan.'),
('DO-002', 'K-2025-004', 'Muhammad Alfaqih', 'DIREKTUR_OPERASIONAL', 'Direktur Operasional', '1120.03', 'Direktur Operasional', 'Direksi / Tier 2', 'Direksi Operasional', 'linear-gradient(135deg, #6366F1 0%, #A5B4FC 100%)', 15, 15, 3, 3, 'Q3 (Juli–September 2026)', '2025-12-08', 'Surabaya', '1989-11-05', 'Islam', 'Laki-laki', '0812-3456-004', 'alfaqih@erpmms.co.id', 'alfaqih', 'password123', '3578010101890004', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1420019928371', 'Muhammad Alfaqih', 'Direktur Operasional.'),
('MK-001', 'K-2025-005', 'Viona', 'MANAGER_KEUANGAN', 'Manager Keuangan', '1120.04', 'Manager Keuangan', 'Manajerial / Tier 3', 'Departemen Keuangan', 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', 12, 10, 3, 3, 'Q3 (Juli–September 2026)', '2025-12-08', 'Bandung', '1992-07-18', 'Islam', 'Perempuan', '0812-3456-005', 'viona@erpmms.co.id', 'viona', 'password123', '3273010101920005', 'Tetap', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '5220918273', 'Viona', 'Manager Keuangan.'),
('MA-001', 'K-2026-006', 'Dian Ekawati', 'MANAGER_AREA', 'Manajer Area Jawa Tengah', '1120.04', 'Manajer Area Jawa Tengah', 'Manajerial / Tier 3', 'Operasional Lapangan', 'linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-01-05', 'Magelang', '1991-09-09', 'Islam', 'Perempuan', '0812-3456-006', 'dian.ekawati@erpmms.co.id', 'dian.ekawati', 'password123', '3308010101910006', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1360012837461', 'Dian Ekawati', 'Manajer Area Jateng.'),
('MA-002', 'K-2026-007', 'Bivaldie A.R.', 'MANAGER_AREA', 'Manajer Area Jakarta', '1120.04', 'Manajer Area Jakarta', 'Manajerial / Tier 3', 'Operasional Lapangan', 'linear-gradient(135deg, #8B5CF6 0%, #C4B5FD 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-01-05', 'Jakarta', '1993-04-15', 'Islam', 'Laki-laki', '0812-3456-007', 'bivaldie.ar@erpmms.co.id', 'bivaldie.ar', 'password123', '3174010101930007', 'Tetap', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '7001827364', 'Bivaldie A.R.', 'Manajer Area Jakarta.'),
('MA-003', 'K-2026-008', 'Rendy Seftiana', 'MANAGER_AREA', 'Manajer Area Jakarta & Jabar', '1120.04', 'Manajer Area Jakarta & Jabar', 'Manajerial / Tier 3', 'Operasional Lapangan', 'linear-gradient(135deg, #14B8A6 0%, #5EEAD4 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-01-05', 'Bogor', '1990-12-25', 'Islam', 'Laki-laki', '0812-3456-008', 'rendy.seftiana@erpmms.co.id', 'rendy.seftiana', 'password123', '3271010101900008', 'Tetap', 'K/0', 'Sarjana (S1)', 'Bank BNI', '0928374651', 'Rendy Seftiana', 'Manajer Area Jkt & Jabar.'),
('HC-001', 'K-2026-009', 'Tazkia Aulia', 'HUMAN_CAPITAL', 'Human Capital Officer', '1120.05', 'Human Capital & GA Officer', 'Staff Profesional / Tier 4', 'Human Capital & General Affair', 'linear-gradient(135deg, #F43F5E 0%, #FDA4AF 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-02-01', 'Depok', '1996-06-17', 'Islam', 'Perempuan', '0812-3456-009', 'tazkia.aulia@erpmms.co.id', 'tazkia.aulia', 'password123', '3276010101960009', 'Tetap', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '8691238472', 'Tazkia Aulia', 'Human Capital.'),
('SA-001', 'K-2026-010', 'Sakhiyah Karomah Salam', 'STAFF_AHLI_KEUANGAN', 'Staf Ahli Keuangan', '1120.05', 'Staf Ahli Keuangan & Pajak', 'Staff Profesional / Tier 4', 'Departemen Keuangan', 'linear-gradient(135deg, #0284C7 0%, #7DD3FC 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-02-01', 'Cirebon', '1995-10-30', 'Islam', 'Perempuan', '0812-3456-010', 'sakhiyah@erpmms.co.id', 'sakhiyah', 'password123', '3209010101950010', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1360098273641', 'Sakhiyah Karomah Salam', 'Staf Ahli Keuangan.'),
('SA-002', 'K-2026-011', 'Muhammad Syafiq Al Ghifari', 'STAFF_AHLI_KEUANGAN', 'Staf Ahli Keuangan', '1120.05', 'Staf Ahli Keuangan & Anggaran', 'Staff Profesional / Tier 4', 'Departemen Keuangan', 'linear-gradient(135deg, #475569 0%, #94A3B8 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-02-01', 'Jakarta', '1997-02-14', 'Islam', 'Laki-laki', '0812-3456-011', 'syafiq@erpmms.co.id', 'syafiq', 'password123', '3172010101970011', 'Tetap', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '6041928374', 'Muhammad Syafiq Al Ghifari', 'Staf Ahli Keuangan.'),
('FAT-001', 'K-2026-012', 'Muhammad Imam Adamy', 'FAT_OFFICER', 'FAT Officer', '1120.05', 'Finance, Accounting & Tax Officer', 'Staff Profesional / Tier 4', 'Departemen Keuangan', 'linear-gradient(135deg, #D97706 0%, #FBBF24 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-02-01', 'Tangerang', '1994-08-20', 'Islam', 'Laki-laki', '0812-3456-012', 'imam.adamy@erpmms.co.id', 'imam.adamy', 'password123', '3671010101940012', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1550018273645', 'Muhammad Imam Adamy', 'FAT Officer.'),
('SO-001', 'K-2026-013', 'Maulana Raka Pahlevi', 'STAFF_OPERASIONAL', 'Staff Operasional', '1120.06', 'Staff Operasional Lapangan', 'Staff Pelaksana / Tier 5', 'Operasional Lapangan', 'linear-gradient(135deg, #059669 0%, #34D399 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-03-01', 'Bekasi', '1998-01-22', 'Islam', 'Laki-laki', '0812-3456-013', 'raka.pahlevi@erpmms.co.id', 'raka.pahlevi', 'password123', '3275010101980013', 'Tetap', 'TK/0', 'Diploma (D3)', 'BCA (Bank Central Asia)', '5220817263', 'Maulana Raka Pahlevi', 'Staff Operasional.'),
('SO-002', 'K-2026-014', 'Irawan Dwi Laksono', 'STAFF_OPERASIONAL', 'Staff Operasional Jatim', '1120.06', 'Staff Operasional Lapangan Jatim', 'Staff Pelaksana / Tier 5', 'Operasional Lapangan', 'linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-03-01', 'Malang', '1996-11-11', 'Islam', 'Laki-laki', '0812-3456-014', 'irawan.dwi@erpmms.co.id', 'irawan.dwi', 'password123', '3573010101960014', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1440018273641', 'Irawan Dwi Laksono', 'Staff Operasional Jatim.'),
('SO-003', 'K-2026-015', 'Wawan Hermawan, S.Ag', 'STAFF_OPERASIONAL', 'Staff Operasional Jabar', '1120.06', 'Staff Operasional Lapangan Jabar', 'Staff Pelaksana / Tier 5', 'Operasional Lapangan', 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-03-01', 'Garut', '1986-04-03', 'Islam', 'Laki-laki', '0812-3456-015', 'wawan.hermawan@erpmms.co.id', 'wawan.hermawan', 'password123', '3205010101860015', 'Tetap', 'K/2', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '1480928374', 'Wawan Hermawan', 'Staff Operasional Jabar.'),
('SO-004', 'K-2026-016', 'Syifa Izzatina', 'STAFF_OPERASIONAL', 'Staff Operasional', '1120.06', 'Staff Administrasi Operasional', 'Staff Pelaksana / Tier 5', 'Operasional Lapangan', 'linear-gradient(135deg, #E11D48 0%, #FB7185 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-03-01', 'Jakarta', '1999-09-19', 'Islam', 'Perempuan', '0812-3456-016', 'syifa.izzatina@erpmms.co.id', 'syifa.izzatina', 'password123', '3173010101990016', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1270019283741', 'Syifa Izzatina', 'Staff Operasional.'),
('SV-001', 'K-2026-017', 'Ajjief Damar', 'SURVEYOR', 'Surveyor (Alumnus)', '1120.07', 'Surveyor Lapangan', 'Surveyor / Tier 6', 'Operasional Lapangan', 'linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-03-15', 'Solo', '1997-05-05', 'Islam', 'Laki-laki', '0812-3456-017', 'ajjief.damar@erpmms.co.id', 'ajjief.damar', 'password123', '3372010101970017', 'Tetap', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '3920192837', 'Ajjief Damar', 'Surveyor.'),
('SV-002', 'K-2026-018', 'Hery Purwanto', 'SURVEYOR', 'Surveyor (Alumnus)', '1120.07', 'Surveyor Lapangan', 'Surveyor / Tier 6', 'Operasional Lapangan', 'linear-gradient(135deg, #0D9488 0%, #2DD4BF 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-03-15', 'Semarang', '1995-12-12', 'Islam', 'Laki-laki', '0812-3456-018', 'hery.purwanto@erpmms.co.id', 'hery.purwanto', 'password123', '3374010101950018', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '1360019283745', 'Hery Purwanto', 'Surveyor.'),
('SV-003', 'K-2026-019', 'Teguh Widodo', 'SURVEYOR', 'Surveyor (Alumnus)', '1120.07', 'Surveyor Lapangan', 'Surveyor / Tier 6', 'Operasional Lapangan', 'linear-gradient(135deg, #CA8A04 0%, #FDE047 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-03-15', 'Yogyakarta', '1996-03-08', 'Islam', 'Laki-laki', '0812-3456-019', 'teguh.widodo@erpmms.co.id', 'teguh.widodo', 'password123', '3471010101960019', 'Tetap', 'TK/0', 'Sarjana (S1)', 'Bank BNI', '0819283746', 'Teguh Widodo', 'Surveyor.'),
('PY-001', 'PY-2026-001', 'Tri Utari', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-01', 'Perwakilan Yayasan - Akselerasi Bumi Indonesia', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Depok', '1995-04-10', 'Islam', 'Perempuan', '0812-9011-001', 'tri.utari@erpmms.co.id', 'tri.utari', 'password123', '3276010101950001', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '869-012-3451', 'Tri Utari', 'Perwakilan SPPG Cilangkap - Tapos 1.'),
('PY-002', 'PY-2026-002', 'Khoirudin', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-02', 'Perwakilan Yayasan - Adil Berdaya Insani', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #8B5CF6 0%, #C4B5FD 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Jakarta', '1992-08-15', 'Islam', 'Laki-laki', '0812-9011-002', 'khoirudin@erpmms.co.id', 'khoirudin', 'password123', '3175010101920002', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '157-00-1122334-1', 'Khoirudin', 'Perwakilan SPPG Cipinang Cempedak.'),
('PY-003', 'PY-2026-003', 'Tresna', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-03', 'Perwakilan Yayasan - Akselerasi Bumi Indonesia', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Pandeglang', '1994-11-20', 'Islam', 'Perempuan', '0812-9011-003', 'tresna@erpmms.co.id', 'tresna', 'password123', '3601010101940003', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '522-098-7654', 'Tresna', 'Perwakilan SPPG Citaman.'),
('PY-004', 'PY-2026-004', 'Setiawati', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-04', 'Perwakilan Yayasan - Akselerasi Bumi Indonesia', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Depok', '1991-03-25', 'Islam', 'Perempuan', '0812-9011-004', 'setiawati@erpmms.co.id', 'setiawati', 'password123', '3276010101910004', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank BNI', '098-765-4321', 'Setiawati', 'Perwakilan SPPG Harjamukti.'),
('PY-005', 'PY-2026-005', 'Astri Listia', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-05', 'Perwakilan Yayasan - Akselerasi Bumi Indonesia', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #F59E0B 0%, #FDE68A 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Bekasi', '1996-07-14', 'Islam', 'Perempuan', '0812-9011-005', 'astri.listia@erpmms.co.id', 'astri.listia', 'password123', '3275010101960005', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '167-00-5544332-1', 'Astri Listia', 'Perwakilan SPPG Jatiwaringin.'),
('PY-006', 'PY-2026-006', 'Childa Susanti', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-06', 'Perwakilan Yayasan - Adil Berdaya Insani', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #6366F1 0%, #A5B4FC 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Jakarta', '1993-12-05', 'Islam', 'Perempuan', '0812-9011-006', 'childa.susanti@erpmms.co.id', 'childa.susanti', 'password123', '3175010101930006', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '869-098-7123', 'Childa Susanti', 'Perwakilan SPPG Kayu Manis.'),
('PY-007', 'PY-2026-007', 'Syahrir', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-07', 'Perwakilan Yayasan - Adil Berdaya Insani', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #14B8A6 0%, #5EEAD4 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Jakarta', '1990-09-02', 'Islam', 'Laki-laki', '0812-9011-007', 'syahrir@erpmms.co.id', 'syahrir', 'password123', '3175010101900007', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '157-00-9988776-5', 'Syahrir', 'Perwakilan SPPG Kelapa Dua Wetan.'),
('PY-008', 'PY-2026-008', 'Maman Sutarman', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-08', 'Perwakilan Yayasan - Akselerasi Bumi Indonesia', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #84CC16 0%, #BEF264 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Bandung', '1988-06-18', 'Islam', 'Laki-laki', '0812-9011-008', 'maman.sutarman@erpmms.co.id', 'maman.sutarman', 'password123', '3204010101880008', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '522-112-2334', 'Maman Sutarman', 'Perwakilan SPPG Kendan.'),
('PY-009', 'PY-2026-009', 'Jusman Ziliwu', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-09', 'Perwakilan Yayasan - Akselerasi Bumi Indonesia', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #A855F7 0%, #D8B4FE 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Garut', '1993-01-30', 'Islam', 'Laki-laki', '0812-9011-009', 'jusman.ziliwu@erpmms.co.id', 'jusman.ziliwu', 'password123', '3205010101930009', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '136-00-4455667-8', 'Jusman Ziliwu', 'Perwakilan SPPG Leles.'),
('PY-010', 'PY-2026-010', 'Achmad Sofyan Permadi', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-10', 'Perwakilan Yayasan - Bekah Iman Nafi''An', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Bandung', '1995-10-10', 'Islam', 'Laki-laki', '0812-9011-010', 'sofyan.permadi@erpmms.co.id', 'sofyan.permadi', 'password123', '3204010101950010', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '522-887-6543', 'Achmad Sofyan Permadi', 'Perwakilan SPPG Mandalamekar.'),
('PY-011', 'PY-2026-011', 'Imam Baiturohim', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-11', 'Perwakilan Yayasan - Bekah Iman Nafi''An', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Kuningan', '1992-05-15', 'Islam', 'Laki-laki', '0812-9011-011', 'imam.baiturohim@erpmms.co.id', 'imam.baiturohim', 'password123', '3208010101920011', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '156-00-3344556-7', 'Imam Baiturohim', 'Perwakilan SPPG Mandirancan.'),
('PY-012', 'PY-2026-012', 'Yulianti', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-12', 'Perwakilan Yayasan - Adil Berdaya Insani', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #F59E0B 0%, #FDE68A 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Jakarta', '1994-08-08', 'Islam', 'Perempuan', '0812-9011-012', 'yulianti@erpmms.co.id', 'yulianti', 'password123', '3175010101940012', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '869-055-4433', 'Yulianti', 'Perwakilan SPPG Pisangan Baru.'),
('PY-013', 'PY-2026-013', 'Koko Kiswoko', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-13', 'Perwakilan Yayasan - Sinergi Kesehatan Negeri', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #059669 0%, #34D399 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-13', 'Magelang', '1991-11-25', 'Islam', 'Laki-laki', '0812-9011-013', 'koko.kiswoko@erpmms.co.id', 'koko.kiswoko', 'password123', '3308010101910013', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '136-00-7788990-1', 'Koko Kiswoko', 'Perwakilan SPPG Salaman/Sriwedari.'),
('PY-014', 'PY-2026-014', 'Farissa Cahyainka', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-14', 'Perwakilan Yayasan - Sinergi Kesehatan Negeri', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #DB2777 0%, #F472B6 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-07-13', 'Semarang', '1997-12-01', 'Islam', 'Perempuan', '0812-9011-014', 'farissa.cahyainka@erpmms.co.id', 'farissa.cahyainka', 'password123', '3322104112970014', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'BCA (Bank Central Asia)', '527-456-7833', 'Farissa Cahyainka', 'Perwakilan SPPG Tengaran.'),
('PY-015', 'PY-2026-015', 'Titi Hardyati', 'PERWAKILAN_YAYASAN', 'Perwakilan Yayasan', 'WLKP-PY-15', 'Perwakilan Yayasan - Adil Berdaya Insani', 'Staff Mitra / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #0891B2 0%, #67E8F9 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-07-13', 'Jakarta', '1994-05-24', 'Islam', 'Perempuan', '0812-9011-015', 'titi.hardyati@erpmms.co.id', 'titi.hardyati', 'password123', '3175016405940015', 'PKWT (Mitra Yayasan)', 'TK/0', 'Sarjana (S1)', 'Bank Mandiri', '157-00-6677889-6', 'Titi Hardyati', 'Perwakilan SPPG Utan Kayu Selatan.'),
('MAKER-003', 'MKR-2026-003', 'Fandru', 'MAKER_YAYASAN', 'Maker Yayasan', 'WLKP-MKR-03', 'Maker Pengelola Dapur Yayasan', 'Staff Pelaksana Dapur / Grade 1', 'Kemitraan Yayasan', 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', 12, 12, 3, 3, 'Q3 (Juli–September 2026)', '2026-04-01', 'Pandeglang', '1995-03-12', 'Islam', 'Laki-laki', '0813-8899-7711', 'fandru@erpmms.co.id', 'fandru', 'password123', '3601051203950001', 'PKWT (Maker Dapur)', 'TK/0', 'SMA / SMK', 'BCA (Bank Central Asia)', '522-099-1234', 'Fandru', 'Maker Dapur SPPG Citaman.')
ON CONFLICT (id) DO NOTHING;

