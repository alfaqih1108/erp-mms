/**
 * ERP YAYASAN - Data Store & LocalStorage Persistence (V15 Architecture)
 * Enterprise HRIS Master Profile (36 Fields), Admin Hub Master Dapur SPPG, Multi-Tier Approval Tracking & Real-Time Timestamps
 */

const STORAGE_KEY = 'ERP_YAYASAN_DATABASE_V22';

// Pembersihan otomatis cache database versi lama (V1 - V21) untuk membebaskan kuota LocalStorage
try {
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const k = localStorage.key(i);
    if (k && k.startsWith('ERP_YAYASAN_DATABASE_V') && k !== STORAGE_KEY) {
      localStorage.removeItem(k);
    }
  }
} catch (e) {}

// Utility: Format Tanggal Hari Ini Real-Time (YYYY-MM-DD)
function getRealtimeDateStr() {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD}`;
}
window.getRealtimeDateStr = getRealtimeDateStr;

// Utility: Format Timestamp Real-Time (WIB / Tanggal & Jam Akurat sampai Detik)
function getRealtimeTimestamp() {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = String(now.getMonth() + 1).padStart(2, '0');
  const DD = String(now.getDate()).padStart(2, '0');
  const HH = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  return `${YYYY}-${MM}-${DD} ${HH}:${mm}:${ss}`;
}
window.getRealtimeTimestamp = getRealtimeTimestamp;

// Utility: Hitung Masa Kerja Dinamis
function calculateTenure(joinDateStr) {
  if (!joinDateStr) return '-';
  const start = new Date(joinDateStr);
  const now = new Date();
  if (isNaN(start.getTime())) return '-';

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} Tahun`);
  if (months > 0) parts.push(`${months} Bulan`);
  if (days > 0 || parts.length === 0) parts.push(`${days} Hari`);
  return parts.join(' ');
}

// Utility: Cek apakah masa kerja sudah >= 1 Tahun (365 hari)
function hasWorkedOneYear(joinDateStr) {
  if (!joinDateStr) return false;
  const start = new Date(joinDateStr);
  const now = new Date();
  if (isNaN(start.getTime())) return false;
  const diffTime = now.getTime() - start.getTime();
  const diffDays = diffTime / (1000 * 3600 * 24);
  return diffDays >= 365;
}

// Utility: Hitung Usia Dinamis
function calculateAge(birthDateStr) {
  if (!birthDateStr) return '-';
  const birth = new Date(birthDateStr);
  const now = new Date();
  if (isNaN(birth.getTime())) return '-';

  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return `${age} Tahun`;
}

/// Seed Database
const INITIAL_DATABASE = {
  currentUser: {
    id: 'ADM-001',
    nika: 'ADM-2026-000',
    name: 'Super Administrator',
    role: 'SUPER_ADMIN',
    roleLabel: 'Super Admin (Master)',
    kodeJabatan: 'SYS-ADMIN-00',
    jabatan: 'Super Administrator Master IT & System',
    levelGrade: 'Master Tier / System Admin',
    department: 'Information Technology & System Master',
    avatarGrad: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    quotaAnnualLeave: 99,
    remainingAnnualLeave: 99,
    quotaPersonalLeave: 99,
    remainingPersonalLeave: 99,
    currentQuarter: 'Q3 (Juli–September 2026)',
    joinDate: '2024-01-01',
    birthPlace: 'Jakarta',
    birthDate: '1990-01-01',
    agama: 'Islam',
    gender: 'Laki-laki',
    phone: '0811-9988-7766',
    email: 'admin@erpmms.co.id',
    username: 'superadmin',
    password: 'password123',
    nik: '3171010101900001',
    statusKaryawan: 'Tetap',
    statusPajak: 'TK/0',
    pendidikan: 'Magister (S2)',
    noKK: '-',
    alamatKTP: 'Kantor Pusat ERP Yayasan',
    alamatDomisili: 'Kantor Pusat ERP Yayasan',
    statusTempatTinggal: 'Milik Sendiri',
    noNPWP: '-',
    alamatNPWP: '-',
    bankName: 'BCA (Bank Central Asia)',
    rekeningNo: '8880001122',
    rekeningName: 'Super Administrator',
    noBPJSKesehatan: '-',
    noBPJSTenagaKerja: '-',
    emergencyName: '-',
    emergencyRelation: '-',
    emergencyPhone: '-',
    resignDate: null,
    resignReason: '-',
    notes: 'Akun Master Super Admin dengan izin pengawasan penuh terhadap seluruh modul, akun, dan approval workflow.'
  },

  // Master Database Profil Karyawan & Akun Pengguna
  users: [
    {
      id: 'ADM-001',
      nika: 'ADM-2026-000',
      name: 'Super Administrator',
      role: 'SUPER_ADMIN',
      roleLabel: 'Super Admin (Master)',
      kodeJabatan: 'SYS-ADMIN-00',
      jabatan: 'Super Administrator Master IT & System',
      levelGrade: 'Master Tier / System Admin',
      department: 'Information Technology & System Master',
      avatarGrad: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      quotaAnnualLeave: 99,
      remainingAnnualLeave: 99,
      quotaPersonalLeave: 99,
      remainingPersonalLeave: 99,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2024-01-01',
      birthPlace: 'Jakarta',
      birthDate: '1990-01-01',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0811-9988-7766',
      email: 'admin@erpmms.co.id',
      username: 'superadmin',
      password: 'password123',
      nik: '3171010101900001',
      statusKaryawan: 'Tetap',
      statusPajak: 'TK/0',
      pendidikan: 'Magister (S2)',
      noKK: '-',
      alamatKTP: 'Kantor Pusat ERP Yayasan',
      alamatDomisili: 'Kantor Pusat ERP Yayasan',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '8880001122',
      rekeningName: 'Super Administrator',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Akun Master Super Admin dengan izin pengawasan penuh terhadap seluruh modul, akun, dan approval workflow.'
    },
    {
      id: 'DU-001',
      nika: 'K-2025-001',
      name: 'Rochmad',
      role: 'DIREKTUR_UTAMA',
      roleLabel: 'Direktur Utama',
      kodeJabatan: '1120.02',
      jabatan: 'Direktur Utama',
      levelGrade: 'Direksi / Tier 1',
      department: 'Direksi Eksekutif',
      avatarGrad: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)',
      quotaAnnualLeave: 18,
      remainingAnnualLeave: 16,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-11-26',
      birthPlace: '-',
      birthDate: '-',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '-',
      email: 'rochmad@erpmms.co.id',
      username: 'rochmad',
      password: 'password123',
      nik: '-',
      statusKaryawan: 'Tetap',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: '-',
      alamatDomisili: '-',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '1370005301243',
      rekeningName: 'Rochmad',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Direktur Utama memimpin strategi eksekutif dan tata kelola yayasan.'
    },
    {
      id: 'DO-001',
      nika: 'K-2025-002',
      name: 'Muhammad Arrasyid',
      role: 'DIREKTUR_OPERASIONAL',
      roleLabel: 'Direktur Operasional',
      kodeJabatan: '1120.03',
      jabatan: 'Direktur Operasional',
      levelGrade: 'Direksi / Tier 2',
      department: 'Direksi Operasional',
      avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      quotaAnnualLeave: 15,
      remainingAnnualLeave: 13,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-12-08',
      birthPlace: '-',
      birthDate: '-',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '-',
      email: 'arrasyid@erpmms.co.id',
      username: 'arrasyid',
      password: 'password123',
      nik: '-',
      statusKaryawan: 'Tetap',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: '-',
      alamatDomisili: '-',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Jago Syariah',
      rekeningNo: '505568418461',
      rekeningName: 'Muhammad Arrasyid',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Direktur Operasional mengawasi manajer area, titik dapur SPPG, dan rantai pasok.'
    },
    {
      id: 'DK-001',
      nika: 'K-2025-003',
      name: 'Kody Suryo Nugroho',
      role: 'DIREKTUR_KEUANGAN',
      roleLabel: 'Direktur Keuangan',
      kodeJabatan: '1120.03',
      jabatan: 'Direktur Keuangan',
      levelGrade: 'Direksi / Tier 2',
      department: 'Direksi Keuangan',
      avatarGrad: 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)',
      quotaAnnualLeave: 15,
      remainingAnnualLeave: 14,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-11-26',
      birthPlace: '-',
      birthDate: '-',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '-',
      email: 'kody.suryo@erpmms.co.id',
      username: 'kody.suryo',
      password: 'password123',
      nik: '-',
      statusKaryawan: 'Tetap',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: '-',
      alamatDomisili: '-',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BSI (Bank Syariah Indonesia)',
      rekeningNo: '5231222760',
      rekeningName: 'Kody Suryo Nugroho',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Direktur Keuangan memimpin strategi penganggaran dan verifikasi permohonan dana.'
    },
    {
      id: 'DO-002',
      nika: 'K-2025-004',
      name: 'Muhammad Alfaqih',
      role: 'DIREKTUR_OPERASIONAL',
      roleLabel: 'Direktur Operasional',
      kodeJabatan: '1120.02',
      jabatan: 'Direktur Operasional',
      levelGrade: 'Direksi / Tier 2',
      department: 'Direksi Operasional',
      avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)',
      quotaAnnualLeave: 15,
      remainingAnnualLeave: 13,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-11-26',
      birthPlace: 'Jakarta',
      birthDate: '2001-08-11',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0878-2076-0675',
      email: 'alfaqih@erpmms.co.id',
      username: 'alfaqih',
      password: 'password123',
      nik: '3175041108010000',
      statusKaryawan: 'PKWTT',
      statusPajak: 'K/1',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: '-',
      alamatDomisili: '-',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Jago Syariah',
      rekeningNo: '500531458355',
      rekeningName: 'Muhammad Al Faqih',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Direktur Operasional fokus pada standardisasi teknis & ekspansi titik dapur SPPG.'
    },
    {
      id: 'MK-001',
      nika: 'K-2025-005',
      name: 'Viona',
      role: 'MANAGER_KEUANGAN',
      roleLabel: 'Manager Keuangan',
      kodeJabatan: '1211.99',
      jabatan: 'Manager Keuangan',
      levelGrade: 'Manajerial / Tier 3',
      department: 'Finance & Accounting',
      avatarGrad: 'linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 11,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-11-26',
      birthPlace: '-',
      birthDate: '-',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '-',
      email: 'viona@erpmms.co.id',
      username: 'viona',
      password: 'password123',
      nik: '-',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: '-',
      alamatDomisili: '-',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '-',
      rekeningName: 'Viona',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Supervisi rekonsiliasi kasbon operasional, anggaran belanja, dan pembukuan yayasan.'
    },
    {
      id: 'MA-001',
      nika: 'K-2025-006',
      name: 'Dian Ekawati',
      role: 'MANAGER_AREA',
      roleLabel: 'Manajer Area Jawa Tengah',
      kodeJabatan: '1120.04',
      jabatan: 'Manajer Area Jawa Tengah',
      levelGrade: 'Manajerial / Tier 3',
      department: 'Operasional Wilayah Jawa Tengah',
      avatarGrad: 'linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 10,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-12-08',
      birthPlace: 'Yogyakarta',
      birthDate: '1978-12-05',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-2752-6726',
      email: 'dian.ekawati@erpmms.co.id',
      username: 'dian.ekawati',
      password: 'password123',
      nik: '3471024512780000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Jl. KH Hasyim Ashari Dusun Krajan RT 003 RW 001 Desa Pasekan Kecamatan Ambarawa Kabupaten Semarang Jawa Tengah',
      alamatDomisili: 'Jl. KH Hasyim Ashari Dusun Krajan RT 003 RW 001 Desa Pasekan Kecamatan Ambarawa Kabupaten Semarang Jawa Tengah',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '1370010894349',
      rekeningName: 'Dian Ekawati',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Manager Area koordinasi SPPG Jawa Tengah, supervisi kendala dapur dan approval PR.'
    },
    {
      id: 'MA-002',
      nika: 'K-2026-007',
      name: 'Bivaldie A.R.',
      role: 'MANAGER_AREA',
      roleLabel: 'Manajer Area Jakarta',
      kodeJabatan: '1120.04',
      jabatan: 'Manajer Area Jakarta',
      levelGrade: 'Manajerial / Tier 3',
      department: 'Operasional Wilayah DKI Jakarta',
      avatarGrad: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 11,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-25',
      birthPlace: 'Pagar Alam',
      birthDate: '1976-10-05',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0811-9003-1888',
      email: 'bivaldie@erpmms.co.id',
      username: 'bivaldie',
      password: 'password123',
      nik: '3175050510760000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Jl. Gotong Royong No. 33 RT 007 RW 001 Kelurahan Baru Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      alamatDomisili: 'Jl. Gotong Royong No. 33 RT 007 RW 001 Kelurahan Baru Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '1150011428853',
      rekeningName: 'Bivaldie Ar',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Manager Area koordinasi wilayah Jakarta, pengawasan distribusi & operasional dapur.'
    },
    {
      id: 'MA-003',
      nika: 'K-2026-008',
      name: 'Rendy Seftiana',
      role: 'MANAGER_AREA',
      roleLabel: 'Manajer Area Jakarta & Jawa Barat',
      kodeJabatan: '1120.04',
      jabatan: 'Manajer Area Jakarta & Jawa Barat',
      levelGrade: 'Manajerial / Tier 3',
      department: 'Operasional Wilayah Jakarta & Jabar',
      avatarGrad: 'linear-gradient(135deg, #1D4ED8 0%, #93C5FD 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 11,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-30',
      birthPlace: 'Ciamis',
      birthDate: '1989-09-19',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-2822-9459',
      email: 'rendy.seftiana@erpmms.co.id',
      username: 'rendy.seftiana',
      password: 'password123',
      nik: '3175021909891000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Rusun BSI Blok Melati 4/2/7 RT 019 RW 016 Kelurahan Cengkareng Timur Kecamatan Cengkareng Kota Administrasi Jakarta Barat',
      alamatDomisili: 'Rusun BSI Blok Melati 4/2/7 RT 019 RW 016 Kelurahan Cengkareng Timur Kecamatan Cengkareng Kota Administrasi Jakarta Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BSI (Bank Syariah Indonesia)',
      rekeningNo: '3484245160',
      rekeningName: 'Rendy Seftiana',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Manager Area koordinasi wilayah Jabar & Jakarta, pengawasan rantai pasok dapur.'
    },
    {
      id: 'HC-001',
      nika: 'K-2026-009',
      name: 'Tazkia Aulia',
      role: 'HUMAN_CAPITAL',
      roleLabel: 'Human Capital',
      kodeJabatan: 'WLKP-HC-01',
      jabatan: 'Human Capital Officer',
      levelGrade: 'Staff / Grade 1',
      department: 'Human Capital & GA',
      avatarGrad: 'linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-08',
      birthPlace: 'Pati',
      birthDate: '2001-07-22',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0882-1424-6724',
      email: 'tazkiaaulia227@gmail.com',
      username: 'tazkia.aulia',
      password: 'password123',
      nik: '3318106707010000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Dk. Gembleb RT 004 RW 002 Desa Kutoharjo Kecamatan Pati Kabupaten Pati Jawa Tengah',
      alamatDomisili: 'Dk. Gembleb RT 004 RW 002 Desa Kutoharjo Kecamatan Pati Kabupaten Pati Jawa Tengah',
      statusTempatTinggal: 'SEWA/KONTRAK',
      noNPWP: '-',
      alamatNPWP: 'Dk. Gembleb RT 004 RW 002 Desa Kutoharjo Kecamatan Pati Kabupaten Pati Jawa Tengah',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '980778827',
      rekeningName: 'Tazkia Aulia',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Pengelolaan master data SDM, approval cuti, absensi timesheet, dan SOP perusahaan.'
    },
    {
      id: 'SA-001',
      nika: 'K-2026-010',
      name: 'Sakhiyah Karomah Salam',
      role: 'STAFF_AHLI_KEUANGAN',
      roleLabel: 'Staf Ahli Administrasi dan Keuangan',
      kodeJabatan: 'WLKP-SA-01',
      jabatan: 'Staf Ahli Administrasi dan Keuangan',
      levelGrade: 'Staff / Grade 1',
      department: 'Keuangan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-02',
      birthPlace: 'Jakarta',
      birthDate: '1995-04-17',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0878-8866-7007',
      email: 'acisakhiyah@gmail.com',
      username: 'sakhiyah',
      password: 'password123',
      nik: '3175055704951000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'D’Lapan Townhouse Jl. Lapan 3 No.70 Kelurahan Pekayon Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      alamatDomisili: 'D’Lapan Townhouse Jl. Lapan 3 No.70 Kelurahan Pekayon Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'MILIK SENDIRI',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Jago Syariah',
      rekeningNo: '504153687909',
      rekeningName: 'Sakhiyah Karomah Salam',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: 'Faqih Hindami',
      emergencyRelation: 'Suami',
      emergencyPhone: '0812-9038-3083',
      resignDate: null,
      resignReason: '-',
      notes: 'Verifikasi anggaran belanja pengadaan, administrasi finansial dan master dapur.'
    },
    {
      id: 'SA-002',
      nika: 'K-2026-011',
      name: 'Muhammad Syafiq Al Ghifari',
      role: 'STAFF_AHLI_KEUANGAN',
      roleLabel: 'Staf Ahli Administrasi dan Keuangan',
      kodeJabatan: 'WLKP-SA-02',
      jabatan: 'Staf Ahli Administrasi dan Keuangan',
      levelGrade: 'Staff / Grade 1',
      department: 'Keuangan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #4F46E5 0%, #A5B4FC 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-07',
      birthPlace: 'Jakarta',
      birthDate: '2001-12-28',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-1090-3683',
      email: 'syafiq@erpmms.co.id',
      username: 'syafiq',
      password: 'password123',
      nik: '3175042812010000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Jl. Batu Ampar V No. 13 RT 007 RW 005 Kelurahan Batu Ampar Kecamatan Kramat Jati Kota Administrasi Jakarta Timur',
      alamatDomisili: 'Jl. Batu Ampar V No. 13 RT 007 RW 005 Kelurahan Batu Ampar Kecamatan Kramat Jati Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '7275066567',
      rekeningName: 'Muhammad Syafiq Al Ghifari',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Administrasi keuangan operasional lapangan, verifikasi dokumen dan pengadaan.'
    },
    {
      id: 'FAT-001',
      nika: 'K-2026-012',
      name: 'Muhammad Imam Adamy',
      role: 'FAT_OFFICER',
      roleLabel: 'Finance Accounting and Tax',
      kodeJabatan: 'WLKP-FIN-01',
      jabatan: 'Finance Accounting and Tax',
      levelGrade: 'Staff / Grade 1',
      department: 'Finance & Tax',
      avatarGrad: 'linear-gradient(135deg, #D97706 0%, #FDE68A 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-05-19',
      birthPlace: 'Jakarta',
      birthDate: '2001-08-29',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0857-7835-7028',
      email: 'imam.adamy@erpmms.co.id',
      username: 'imam.adamy',
      password: 'password123',
      nik: '3175072908010000',
      statusKaryawan: 'PKWT',
      statusPajak: 'K/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Kp Kapuk II No. 34 RT 003 RW 006 Kelurahan Klender Kecamatan Duren Sawit Kota Administrasi Jakarta Timur',
      alamatDomisili: 'Kp Kapuk II No. 34 RT 003 RW 006 Kelurahan Klender Kecamatan Duren Sawit Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BSI (Bank Syariah Indonesia)',
      rekeningNo: '8669287940',
      rekeningName: 'Muhammad Imam Adamy',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: 'Kontak Keluarga',
      emergencyRelation: 'Keluarga',
      emergencyPhone: '0822-1784-7462',
      resignDate: null,
      resignReason: '-',
      notes: 'Pencatatan perpajakan PPh, pencairan kasbon FAT, dan pembukuan harian.'
    },
    {
      id: 'SO-001',
      nika: 'K-2026-013',
      name: 'Maulana Raka Pahlevi',
      role: 'STAFF_OPERASIONAL',
      roleLabel: 'Staff Operasional',
      kodeJabatan: 'WLKP-OPS-01',
      jabatan: 'Staff Operasional',
      levelGrade: 'Staff / Grade 1',
      department: 'Operasional Lapangan',
      avatarGrad: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-04',
      birthPlace: 'Jakarta',
      birthDate: '2000-02-15',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0858-1057-4877',
      email: 'raka.pahlevi@erpmms.co.id',
      username: 'raka.pahlevi',
      password: 'password123',
      nik: '3715041502000010',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'SMA / SMK',
      noKK: '-',
      alamatKTP: 'Jl. Baing RT 008 RW 009 Kelurahan Tengah Kecamatan Kramat Jati Kota Administrasi Jakarta Timur',
      alamatDomisili: 'Jl. Baing RT 008 RW 009 Kelurahan Tengah Kecamatan Kramat Jati Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'MILIK ORANG TUA',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '7275347183',
      rekeningName: 'Maulana Raka Pahlevi',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: 'Purnawati Pamungkas',
      emergencyRelation: 'Ibu Kandung',
      emergencyPhone: '0821-2278-0812',
      resignDate: null,
      resignReason: '-',
      notes: 'Monitoring titik dapur, input timesheet log harian dan pencatatan kendala operasional.'
    },
    {
      id: 'SO-002',
      nika: 'K-2026-014',
      name: 'Irawan Dwi Laksono',
      role: 'STAFF_OPERASIONAL',
      roleLabel: 'Staff Operasional (Jawa Timur)',
      kodeJabatan: 'WLKP-OPS-02',
      jabatan: 'Staff Operasional',
      levelGrade: 'Staff / Grade 1',
      department: 'Operasional Lapangan Jawa Timur',
      avatarGrad: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-07',
      birthPlace: 'Solo',
      birthDate: '1977-07-02',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0823-3480-7557',
      email: 'irawan.dwi@erpmms.co.id',
      username: 'irawan.dwi',
      password: 'password123',
      nik: '3574030207770000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'SMA / SMK',
      noKK: '-',
      alamatKTP: 'Jl. Serma Abd Rahman RT 002 RW 004 Kel/Desa Wiroborang Kecamatan Mayangan Kota Probolinggo Jawa Timur',
      alamatDomisili: 'Jl. Serma Abd Rahman RT 002 RW 004 Kel/Desa Wiroborang Kecamatan Mayangan Kota Probolinggo Jawa Timur',
      statusTempatTinggal: 'RUMAH DINAS',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '3870223161',
      rekeningName: 'Irawan Dwi Laksono',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Staff operasional lapangan wilayah Jawa Timur dan pemantauan fasilitas dapur.'
    },
    {
      id: 'SO-003',
      nika: 'K-2026-015',
      name: 'Wawan Hermawan, S.Ag',
      role: 'STAFF_OPERASIONAL',
      roleLabel: 'Staff Operasional (Jawa Barat)',
      kodeJabatan: 'WLKP-OPS-03',
      jabatan: 'Staff Operasional',
      levelGrade: 'Staff / Grade 1',
      department: 'Operasional Lapangan Jawa Barat',
      avatarGrad: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-07',
      birthPlace: 'Ciamis',
      birthDate: '1970-04-30',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0852-2351-4066',
      email: 'wawan.hermawan@erpmms.co.id',
      username: 'wawan.hermawan',
      password: 'password123',
      nik: '3207033004700000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Dusun Sodong RT 007 RW 015 Kel/Desa Bojongmengger Kecamatan Cijeungjing Kabupaten Ciamis Jawa Barat',
      alamatDomisili: 'Dusun Sodong RT 007 RW 015 Kel/Desa Bojongmengger Kecamatan Cijeungjing Kabupaten Ciamis Jawa Barat',
      statusTempatTinggal: 'RUMAH DINAS',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BRI (Bank Rakyat Indonesia)',
      rekeningNo: '10401072229509',
      rekeningName: 'Wawan Hermawan',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: null,
      resignReason: '-',
      notes: 'Staff operasional lapangan wilayah Jawa Barat dan supervisi dapur binaan.'
    },
    {
      id: 'SO-004',
      nika: 'K-2026-016',
      name: 'Syifa Izzatina',
      role: 'STAFF_OPERASIONAL',
      roleLabel: 'Staff Operasional',
      kodeJabatan: 'WLKP-OPS-04',
      jabatan: 'Staff Operasional',
      levelGrade: 'Staff / Grade 1',
      department: 'Operasional Lapangan',
      avatarGrad: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-08-10',
      birthPlace: 'Jakarta',
      birthDate: '2000-06-06',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0858-1018-6835',
      email: 'syifa.izzatina@erpmms.co.id',
      username: 'syifa.izzatina',
      password: 'password123',
      nik: '3175054606000000',
      statusKaryawan: 'PKWT',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Jl. Mesjid VIII No 19 RT 002 RT 001 Kelurahan Gedong Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      alamatDomisili: 'Jl. Mesjid VIII No 19 RT 002 RT 001 Kelurahan Gedong Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'MILIK ORANG TUA',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '4850580893',
      rekeningName: 'Syifa Izzatina',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: 'Leisya Fitriyanti',
      emergencyRelation: 'Ibu Kandung',
      emergencyPhone: '0857-5754-6827',
      resignDate: null,
      resignReason: '-',
      notes: 'Staff operasional pelaporan kendala harian, monitoring kebersihan & operasional dapur.'
    },
    {
      id: 'SV-001',
      nika: 'K-2025-017',
      name: 'Ajjief Damar Geovan Esrinanda',
      role: 'SURVEYOR',
      roleLabel: 'Surveyor (Alumnus)',
      kodeJabatan: 'WLKP-SURV-01',
      jabatan: 'Surveyor Lapangan',
      levelGrade: 'Staff / Grade 1',
      department: 'Operasional Lapangan',
      avatarGrad: 'linear-gradient(135deg, #FF4B01 0%, #FF8A4D 100%)',
      quotaAnnualLeave: 0,
      remainingAnnualLeave: 0,
      quotaPersonalLeave: 0,
      remainingPersonalLeave: 0,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-12-08',
      birthPlace: 'Jakarta',
      birthDate: '1991-12-14',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0851-6112-9414',
      email: 'ajjief.damar@erpmms.co.id',
      username: 'ajjief.damar',
      password: 'password123',
      nik: '3175051412910000',
      statusKaryawan: 'BHL (Alumnus)',
      statusPajak: 'TK/0',
      pendidikan: 'SMA / SMK',
      noKK: '-',
      alamatKTP: 'Rawa Indah Jl. Kalisari Lapan Gg. Sawi No. 21 RT 005 RW 001 Kelurahan Pekayon Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      alamatDomisili: 'Rawa Indah Jl. Kalisari Lapan Gg. Sawi No. 21 RT 005 RW 001 Kelurahan Pekayon Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BRI (Bank Rakyat Indonesia)',
      rekeningNo: '34501024681505',
      rekeningName: 'Ajjief Damar Geovan Esrinanda',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: '2026-07-24',
      resignReason: 'Habis kontrak dan project selesai',
      notes: 'Surveyor titik lokasi dapur, logistik fasilitas. Status: Habis kontrak 24 Juli 2026.'
    },
    {
      id: 'SV-002',
      nika: 'K-2025-018',
      name: 'Hery Purwanto',
      role: 'SURVEYOR',
      roleLabel: 'Surveyor (Alumnus)',
      kodeJabatan: 'WLKP-SURV-02',
      jabatan: 'Surveyor Lapangan',
      levelGrade: 'Staff / Grade 1',
      department: 'Operasional Lapangan',
      avatarGrad: 'linear-gradient(135deg, #F97316 0%, #FDBA74 100%)',
      quotaAnnualLeave: 0,
      remainingAnnualLeave: 0,
      quotaPersonalLeave: 0,
      remainingPersonalLeave: 0,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-12-08',
      birthPlace: 'Jakarta',
      birthDate: '1976-10-06',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0821-1918-9682',
      email: 'hery.purwanto@erpmms.co.id',
      username: 'hery.purwanto',
      password: 'password123',
      nik: '3172030610760000',
      statusKaryawan: 'BHL (Alumnus)',
      statusPajak: 'TK/0',
      pendidikan: 'SMA / SMK',
      noKK: '-',
      alamatKTP: 'Jl Cemara Blok I Gg. III No. 22 RT 007 RW 016 Kelurahan Lagoa Kecamatan Koja Kota Administrasi Jakarta Utara',
      alamatDomisili: 'Jl Cemara Blok I Gg. III No. 22 RT 007 RW 016 Kelurahan Lagoa Kecamatan Koja Kota Administrasi Jakarta Utara',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BRI (Bank Rakyat Indonesia)',
      rekeningNo: '708101012071537',
      rekeningName: 'Hery Purwanto',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: '2026-07-24',
      resignReason: 'Habis kontrak dan project selesai',
      notes: 'Surveyor pemetaan dapur. Status: Habis kontrak 24 Juli 2026.'
    },
    {
      id: 'SV-003',
      nika: 'K-2025-019',
      name: 'Teguh Widodo',
      role: 'SURVEYOR',
      roleLabel: 'Surveyor (Alumnus)',
      kodeJabatan: 'WLKP-SURV-03',
      jabatan: 'Surveyor Lapangan',
      levelGrade: 'Staff / Grade 1',
      department: 'Operasional Lapangan',
      avatarGrad: 'linear-gradient(135deg, #EA580C 0%, #FB923C 100%)',
      quotaAnnualLeave: 0,
      remainingAnnualLeave: 0,
      quotaPersonalLeave: 0,
      remainingPersonalLeave: 0,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2025-12-10',
      birthPlace: 'Gombong',
      birthDate: '1977-02-25',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0813-8037-8425',
      email: 'teguh.widodo@erpmms.co.id',
      username: 'teguh.widodo',
      password: 'password123',
      nik: '3671052502770000',
      statusKaryawan: 'BHL (Alumnus)',
      statusPajak: 'TK/0',
      pendidikan: 'SMA / SMK',
      noKK: '-',
      alamatKTP: 'Kalisari RT 012 RW 002 Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      alamatDomisili: 'Kalisari RT 012 RW 002 Kecamatan Pasar Rebo Kota Administrasi Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '1663195615',
      rekeningName: 'Siti AriFah Hidayati',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      resignDate: '2026-07-24',
      resignReason: 'Habis kontrak dan project selesai',
      notes: 'Surveyor pemetaan kelayakan titik dapur. Status: Habis kontrak 24 Juli 2026.'
    },
    {
      id: 'PY-001',
      nika: 'PY-2026-001',
      name: 'Tri Utari',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-01',
      jabatan: 'Perwakilan Yayasan - Akselerasi Bumi Indonesia',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-02',
      birthPlace: 'Depok',
      birthDate: '1996-05-14',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-001',
      email: 'tri.utari@erpmms.co.id',
      username: 'tri.utari',
      password: 'password123',
      nik: '3276015405960001',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Cilangkap, Kec. Tapos, Kota Depok, Jawa Barat',
      alamatDomisili: 'Cilangkap, Kec. Tapos, Kota Depok, Jawa Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '157-00-1122334-1',
      rekeningName: 'Tri Utari',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'WFC2L9EH',
      sppgName: 'SPPG Cilangkap - Tapos 1',
      yayasanPartner: 'Akselerasi Bumi Indonesia',
      notes: 'Perwakilan Yayasan Akselerasi Bumi Indonesia untuk SPPG Cilangkap - Tapos 1 (ID: WFC2L9EH). Mulai: 2 Juni 2026.'
    },
    {
      id: 'PY-002',
      nika: 'PY-2026-002',
      name: 'Khoirudin',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-02',
      jabatan: 'Perwakilan Yayasan - Adil Berdaya Insani',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-08',
      birthPlace: 'Jakarta',
      birthDate: '1994-08-20',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-9011-002',
      email: 'khoirudin@erpmms.co.id',
      username: 'khoirudin',
      password: 'password123',
      nik: '3175032008940002',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Cipinang Cempedak, Kec. Jatinegara, Jakarta Timur',
      alamatDomisili: 'Cipinang Cempedak, Kec. Jatinegara, Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '682-019-2831',
      rekeningName: 'Khoirudin',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'YPEHMDF0',
      sppgName: 'SPPG Cipinang Cempedak',
      yayasanPartner: 'Adil Berdaya Insani',
      notes: 'Perwakilan Yayasan Adil Berdaya Insani untuk SPPG Cipinang Cempedak (ID: YPEHMDF0). Mulai: 8 Juni 2026.'
    },
    {
      id: 'PY-003',
      nika: 'PY-2026-003',
      name: 'Tresna',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-03',
      jabatan: 'Perwakilan Yayasan - Akselerasi Bumi Indonesia',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-08',
      birthPlace: 'Pandeglang',
      birthDate: '1995-11-12',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-003',
      email: 'tresna@erpmms.co.id',
      username: 'tresna',
      password: 'password123',
      nik: '3601055211950003',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Citaman, Kec. Jiput, Kab. Pandeglang, Banten',
      alamatDomisili: 'Citaman, Kec. Jiput, Kab. Pandeglang, Banten',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '157-00-2233445-2',
      rekeningName: 'Tresna',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'THAH6JZO',
      sppgName: 'SPPG Citaman',
      yayasanPartner: 'Akselerasi Bumi Indonesia',
      notes: 'Perwakilan Yayasan Akselerasi Bumi Indonesia untuk SPPG Citaman (ID: THAH6JZO). Mulai: 8 April 2026.'
    },
    {
      id: 'PY-004',
      nika: 'PY-2026-004',
      name: 'Setiawati',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-04',
      jabatan: 'Perwakilan Yayasan - Akselerasi Bumi Indonesia',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #8B5CF6 0%, #C4B5FD 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-05-04',
      birthPlace: 'Depok',
      birthDate: '1993-02-18',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-004',
      email: 'setiawati@erpmms.co.id',
      username: 'setiawati',
      password: 'password123',
      nik: '3276025802930004',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Harjamukti, Kec. Cimanggis, Kota Depok, Jawa Barat',
      alamatDomisili: 'Harjamukti, Kec. Cimanggis, Kota Depok, Jawa Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BRI (Bank Rakyat Indonesia)',
      rekeningNo: '0341-01-089765-50-2',
      rekeningName: 'Setiawati',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'KJDSEBN6',
      sppgName: 'SPPG Harjamukti',
      yayasanPartner: 'Akselerasi Bumi Indonesia',
      notes: 'Perwakilan Yayasan Akselerasi Bumi Indonesia untuk SPPG Harjamukti (ID: KJDSEBN6). Mulai: 4 Mei 2026.'
    },
    {
      id: 'PY-005',
      nika: 'PY-2026-005',
      name: 'Astri Listia',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-05',
      jabatan: 'Perwakilan Yayasan - Akselerasi Bumi Indonesia',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-06',
      birthPlace: 'Bekasi',
      birthDate: '1997-09-30',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-005',
      email: 'astri.listia@erpmms.co.id',
      username: 'astri.listia',
      password: 'password123',
      nik: '3275087009970005',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat',
      alamatDomisili: 'Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '527-198-4433',
      rekeningName: 'Astri Listia',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'NFXCJ3PI',
      sppgName: 'SPPG Jatiwaringin',
      yayasanPartner: 'Akselerasi Bumi Indonesia',
      notes: 'Perwakilan Yayasan Akselerasi Bumi Indonesia untuk SPPG Jatiwaringin (ID: NFXCJ3PI). Mulai: 6 April 2026.'
    },
    {
      id: 'PY-006',
      nika: 'PY-2026-006',
      name: 'Childa Susanti',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-06',
      jabatan: 'Perwakilan Yayasan - Adil Berdaya Insani',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-15',
      birthPlace: 'Jakarta',
      birthDate: '1992-04-10',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-006',
      email: 'childa.susanti@erpmms.co.id',
      username: 'childa.susanti',
      password: 'password123',
      nik: '3175015004920006',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Kayu Manis, Kec. Matraman, Jakarta Timur',
      alamatDomisili: 'Kayu Manis, Kec. Matraman, Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '157-00-3344556-3',
      rekeningName: 'Childa Susanti',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'HUBRVBTW',
      sppgName: 'SPPG Kayu Manis',
      yayasanPartner: 'Adil Berdaya Insani',
      notes: 'Perwakilan Yayasan Adil Berdaya Insani untuk SPPG Kayu Manis (ID: HUBRVBTW). Mulai: 15 Juni 2026.'
    },
    {
      id: 'PY-007',
      nika: 'PY-2026-007',
      name: 'Syahrir',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-07',
      jabatan: 'Perwakilan Yayasan - Adil Berdaya Insani',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #14B8A6 0%, #5EEAD4 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-29',
      birthPlace: 'Jakarta',
      birthDate: '1989-12-05',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-9011-007',
      email: 'syahrir@erpmms.co.id',
      username: 'syahrir',
      password: 'password123',
      nik: '3175060512890007',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Kelapa Dua Wetan, Kec. Ciracas, Jakarta Timur',
      alamatDomisili: 'Kelapa Dua Wetan, Kec. Ciracas, Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BRI (Bank Rakyat Indonesia)',
      rekeningNo: '0341-01-098712-50-3',
      rekeningName: 'Syahrir',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'VMQ6JXXM',
      sppgName: 'SPPG Kelapa Dua Wetan',
      yayasanPartner: 'Adil Berdaya Insani',
      notes: 'Perwakilan Yayasan Adil Berdaya Insani untuk SPPG Kelapa Dua Wetan (ID: VMQ6JXXM). Mulai: 29 April 2026.'
    },
    {
      id: 'PY-008',
      nika: 'PY-2026-008',
      name: 'Maman Sutarman',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-08',
      jabatan: 'Perwakilan Yayasan - Akselerasi Bumi Indonesia',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #6366F1 0%, #A5B4FC 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-05-11',
      birthPlace: 'Bandung',
      birthDate: '1987-03-22',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-9011-008',
      email: 'maman.sutarman@erpmms.co.id',
      username: 'maman.sutarman',
      password: 'password123',
      nik: '3204122203870008',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Kendan, Kec. Nagreg, Kab. Bandung, Jawa Barat',
      alamatDomisili: 'Kendan, Kec. Nagreg, Kab. Bandung, Jawa Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '527-234-9811',
      rekeningName: 'Maman Sutarman',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'XQQBILKQ',
      sppgName: 'SPPG Kendan',
      yayasanPartner: 'Akselerasi Bumi Indonesia',
      notes: 'Perwakilan Yayasan Akselerasi Bumi Indonesia untuk SPPG Kendan (ID: XQQBILKQ). Mulai: 11 Mei 2026.'
    },
    {
      id: 'PY-009',
      nika: 'PY-2026-009',
      name: 'Jusman Ziliwu',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-09',
      jabatan: 'Perwakilan Yayasan - Akselerasi Bumi Indonesia',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-02-02',
      birthPlace: 'Garut',
      birthDate: '1991-07-15',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-9011-009',
      email: 'jusman.ziliwu@erpmms.co.id',
      username: 'jusman.ziliwu',
      password: 'password123',
      nik: '3205101507910009',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Leles, Kec. Leles, Kab. Garut, Jawa Barat',
      alamatDomisili: 'Leles, Kec. Leles, Kab. Garut, Jawa Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '157-00-4455667-4',
      rekeningName: 'Jusman Ziliwu',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'MLRQXJ1K',
      sppgName: 'SPPG Leles',
      yayasanPartner: 'Akselerasi Bumi Indonesia',
      notes: 'Perwakilan Yayasan Akselerasi Bumi Indonesia untuk SPPG Leles (ID: MLRQXJ1K). Mulai: 2 Februari 2026.'
    },
    {
      id: 'PY-010',
      nika: 'PY-2026-010',
      name: 'Achmad Sofyan Permadi',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-10',
      jabatan: 'Perwakilan Yayasan - Bekah Iman Nafi\'An',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #D97706 0%, #FDE68A 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-05-25',
      birthPlace: 'Bandung',
      birthDate: '1993-06-19',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-9011-010',
      email: 'achmad.sofyan@erpmms.co.id',
      username: 'achmad.sofyan',
      password: 'password123',
      nik: '3204091906930010',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Mandalamekar, Kec. Cimenyan, Kab. Bandung, Jawa Barat',
      alamatDomisili: 'Mandalamekar, Kec. Cimenyan, Kab. Bandung, Jawa Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BRI (Bank Rakyat Indonesia)',
      rekeningNo: '0341-01-076543-50-4',
      rekeningName: 'Achmad Sofyan Permadi',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: '1OAXCXMA',
      sppgName: 'SPPG Mandalamekar',
      yayasanPartner: 'Bekah Iman Nafi\'An',
      notes: 'Perwakilan Yayasan Bekah Iman Nafi\'An untuk SPPG Mandalamekar (ID: 1OAXCXMA). Mulai: 25 Mei 2026.'
    },
    {
      id: 'PY-011',
      nika: 'PY-2026-011',
      name: 'Imam Baiturohim',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-11',
      jabatan: 'Perwakilan Yayasan - Bekah Iman Nafi\'An',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #059669 0%, #34D399 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-06-08',
      birthPlace: 'Kuningan',
      birthDate: '1995-01-27',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-9011-011',
      email: 'imam.baiturohim@erpmms.co.id',
      username: 'imam.baiturohim',
      password: 'password123',
      nik: '3208082701950011',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Mandirancan, Kec. Mandirancan, Kab. Kuningan, Jawa Barat',
      alamatDomisili: 'Mandirancan, Kec. Mandirancan, Kab. Kuningan, Jawa Barat',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '527-345-8722',
      rekeningName: 'Imam Baiturohim',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'PMXKYUEZ',
      sppgName: 'SPPG Mandirancan',
      yayasanPartner: 'Bekah Iman Nafi\'An',
      notes: 'Perwakilan Yayasan Bekah Iman Nafi\'An untuk SPPG Mandirancan (ID: PMXKYUEZ). Mulai: 8 Juni 2026.'
    },
    {
      id: 'PY-012',
      nika: 'PY-2026-012',
      name: 'Yulianti',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-12',
      jabatan: 'Perwakilan Yayasan - Adil Berdaya Insani',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #9333EA 0%, #D8B4FE 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-07-13',
      birthPlace: 'Jakarta',
      birthDate: '1998-03-14',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-012',
      email: 'yulianti@erpmms.co.id',
      username: 'yulianti',
      password: 'password123',
      nik: '3175015403980012',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Pisangan Baru, Kec. Matraman, Jakarta Timur',
      alamatDomisili: 'Pisangan Baru, Kec. Matraman, Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '157-00-5566778-5',
      rekeningName: 'Yulianti',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'WCJP3OPY',
      sppgName: 'SPPG Pisangan Baru',
      yayasanPartner: 'Adil Berdaya Insani',
      notes: 'Perwakilan Yayasan Adil Berdaya Insani untuk SPPG Pisangan Baru (ID: WCJP3OPY). Mulai: 13 Juli 2026.'
    },
    {
      id: 'PY-013',
      nika: 'PY-2026-013',
      name: 'Koko Kiswoko',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-13',
      jabatan: 'Perwakilan Yayasan - Sinergi Kesehatan Negeri',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #EA580C 0%, #FDBA74 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-13',
      birthPlace: 'Magelang',
      birthDate: '1988-10-09',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0812-9011-013',
      email: 'koko.kiswoko@erpmms.co.id',
      username: 'koko.kiswoko',
      password: 'password123',
      nik: '3308090910880013',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Sriwedari, Kec. Salaman, Kab. Magelang, Jawa Tengah',
      alamatDomisili: 'Sriwedari, Kec. Salaman, Kab. Magelang, Jawa Tengah',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BRI (Bank Rakyat Indonesia)',
      rekeningNo: '0341-01-065432-50-5',
      rekeningName: 'Koko Kiswoko',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: 'ZAJXQGBU',
      sppgName: 'SPPG Salaman/Sriwedari',
      yayasanPartner: 'Sinergi Kesehatan Negeri',
      notes: 'Perwakilan Yayasan Sinergi Kesehatan Negeri untuk SPPG Salaman/Sriwedari (ID: ZAJXQGBU). Mulai: 13 April 2026.'
    },
    {
      id: 'PY-014',
      nika: 'PY-2026-014',
      name: 'Farissa Cahyainka',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-14',
      jabatan: 'Perwakilan Yayasan - Sinergi Kesehatan Negeri',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #DB2777 0%, #F472B6 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-07-13',
      birthPlace: 'Semarang',
      birthDate: '1997-12-01',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-014',
      email: 'farissa.cahyainka@erpmms.co.id',
      username: 'farissa.cahyainka',
      password: 'password123',
      nik: '3322104112970014',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Tengaran, Kec. Tengaran, Kab. Semarang, Jawa Tengah',
      alamatDomisili: 'Tengaran, Kec. Tengaran, Kab. Semarang, Jawa Tengah',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BCA (Bank Central Asia)',
      rekeningNo: '527-456-7833',
      rekeningName: 'Farissa Cahyainka',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: '5SGNUNP0',
      sppgName: 'SPPG Tengaran',
      yayasanPartner: 'Sinergi Kesehatan Negeri',
      notes: 'Perwakilan Yayasan Sinergi Kesehatan Negeri untuk SPPG Tengaran (ID: 5SGNUNP0). Mulai: 13 Juli 2026.'
    },
    {
      id: 'PY-015',
      nika: 'PY-2026-015',
      name: 'Titi Hardyati',
      role: 'PERWAKILAN_YAYASAN',
      roleLabel: 'Perwakilan Yayasan',
      kodeJabatan: 'WLKP-PY-15',
      jabatan: 'Perwakilan Yayasan - Adil Berdaya Insani',
      levelGrade: 'Staff Mitra / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #0891B2 0%, #67E8F9 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-07-13',
      birthPlace: 'Jakarta',
      birthDate: '1994-05-24',
      agama: 'Islam',
      gender: 'Perempuan',
      phone: '0812-9011-015',
      email: 'titi.hardyati@erpmms.co.id',
      username: 'titi.hardyati',
      password: 'password123',
      nik: '3175016405940015',
      statusKaryawan: 'PKWT (Mitra Yayasan)',
      statusPajak: 'TK/0',
      pendidikan: 'Sarjana (S1)',
      noKK: '-',
      alamatKTP: 'Utan Kayu Selatan, Kec. Matraman, Jakarta Timur',
      alamatDomisili: 'Utan Kayu Selatan, Kec. Matraman, Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '157-00-6677889-6',
      rekeningName: 'Titi Hardyati',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      sppgId: '36UNM9F5',
      sppgName: 'SPPG Utan Kayu Selatan',
      yayasanPartner: 'Adil Berdaya Insani',
      notes: 'Perwakilan Yayasan Adil Berdaya Insani untuk SPPG Utan Kayu Selatan (ID: 36UNM9F5). Mulai: 13 Juli 2026.'
    },
    {
      id: 'MAKER-003',
      nika: 'MKR-2026-003',
      name: 'Fandru',
      role: 'MAKER_YAYASAN',
      roleLabel: 'Maker Yayasan',
      kodeJabatan: 'WLKP-MKR-03',
      jabatan: 'Maker Pengelola Dapur Yayasan',
      levelGrade: 'Staff Pelaksana Dapur / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-04-01',
      birthPlace: 'Pandeglang',
      birthDate: '1995-03-12',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0813-8899-7711',
      email: 'fandru@erpmms.co.id',
      username: 'fandru',
      password: 'password123',
      nik: '3601051203950001',
      statusKaryawan: 'PKWT (Maker Dapur)',
      statusPajak: 'TK/0',
      pendidikan: 'SMA / SMK',
      noKK: '-',
      alamatKTP: 'Citaman, Kec. Jiput, Kab. Pandeglang, Banten',
      alamatDomisili: 'Citaman, Kec. Jiput, Kab. Pandeglang, Banten',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'BSI (Bank Syariah Indonesia)',
      rekeningNo: '7123984561',
      rekeningName: 'Fandru',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      notes: 'Maker Yayasan pengelola pelaporan transaksi dapur SPPG Citaman & SPPG Cilangkap.'
    },
    {
      id: 'MAKER-002',
      nika: 'MKR-2026-002',
      name: 'Ahmad Syafei',
      role: 'MAKER_YAYASAN',
      roleLabel: 'Maker Yayasan',
      kodeJabatan: 'WLKP-MKR-02',
      jabatan: 'Maker Pengelola Dapur Yayasan',
      levelGrade: 'Staff Pelaksana Dapur / Grade 1',
      department: 'Kemitraan Yayasan',
      avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: '2026-05-01',
      birthPlace: 'Jakarta',
      birthDate: '1992-07-08',
      agama: 'Islam',
      gender: 'Laki-laki',
      phone: '0813-8899-7722',
      email: 'ahmad.syafei@erpmms.co.id',
      username: 'ahmad.syafei',
      password: 'password123',
      nik: '3175050807920002',
      statusKaryawan: 'PKWT (Maker Dapur)',
      statusPajak: 'TK/0',
      pendidikan: 'SMA / SMK',
      noKK: '-',
      alamatKTP: 'Cipinang Cempedak, Jatinegara, Jakarta Timur',
      alamatDomisili: 'Cipinang Cempedak, Jatinegara, Jakarta Timur',
      statusTempatTinggal: 'Milik Sendiri',
      noNPWP: '-',
      alamatNPWP: '-',
      bankName: 'Bank Mandiri',
      rekeningNo: '1570088990011',
      rekeningName: 'Ahmad Syafei',
      noBPJSKesehatan: '-',
      noBPJSTenagaKerja: '-',
      emergencyName: '-',
      emergencyRelation: '-',
      emergencyPhone: '-',
      notes: 'Maker Yayasan pengelola pelaporan transaksi dapur SPPG Cipinang Cempedak.'
    }
  ],

  // Master Database: Dokumen Sosialisasi & Panduan Yayasan (PDF & PPT) - Dikelola oleh Human Capital
  guidelineDocuments: [
    {
      id: 'DOC-001',
      title: 'Panduan Pelaksanaan & Standar Verifikasi Lapangan Program Yayasan 2026.pdf',
      fileType: 'PDF',
      category: 'SOP Lapangan & Verifikasi',
      targetRole: 'PERWAKILAN_YAYASAN',
      targetLabel: 'Khusus Perwakilan Yayasan',
      fileSize: '3.8 MB',
      description: 'Pedoman resmi alur survei calon penerima manfaat, koordinasi teknis dengan Manager Area, serta kepatuhan administrasi program kemitraan.',
      uploadedBy: 'Tazkia Aulia (Human Capital)',
      uploadDate: '2026-08-19'
    },
    {
      id: 'DOC-002',
      title: 'Materi Sosialisasi Kebijakan & Alur Pengajuan Program Kemitraan Sosial.pptx',
      fileType: 'PPT',
      category: 'Materi Sosialisasi & Presentasi',
      targetRole: 'PERWAKILAN_YAYASAN',
      targetLabel: 'Khusus Perwakilan Yayasan',
      fileSize: '12.4 MB',
      description: 'Slide presentasi resmi untuk sosialisasi program kemitraan sosial kepada tokoh masyarakat dan mitra lokal di wilayah kerja.',
      uploadedBy: 'Tazkia Aulia (Human Capital)',
      uploadDate: '2026-08-18'
    },
    {
      id: 'DOC-003',
      title: 'SOP Pengelolaan Bahan Baku, Standar Porsi Dapur & Akuntabilitas Virtual Account.pdf',
      fileType: 'PDF',
      category: 'SOP Dapur & Finansial VA',
      targetRole: 'MAKER_YAYASAN',
      targetLabel: 'Khusus Maker Yayasan',
      fileSize: '4.5 MB',
      description: 'Petunjuk teknis pencatatan transaksi harian bahan baku dapur, formula perhitungan harga efisiensi per porsi, dan rekonsiliasi saldo Virtual Account bank.',
      uploadedBy: 'Tazkia Aulia (Human Capital)',
      uploadDate: '2026-08-19'
    },
    {
      id: 'DOC-004',
      title: 'Sosialisasi Higienitas Dapur Komersial & Manajemen Stok Bahan Makanan Segar.pptx',
      fileType: 'PPT',
      category: 'Materi Sosialisasi & Training',
      targetRole: 'MAKER_YAYASAN',
      targetLabel: 'Khusus Maker Yayasan',
      fileSize: '15.2 MB',
      description: 'Slide edukasi standar sanitasi, keamanan pangan (food safety), dan rotasi bahan makanan (FIFO) di dapur program yayasan.',
      uploadedBy: 'Tazkia Aulia (Human Capital)',
      uploadDate: '2026-08-17'
    },
    {
      id: 'DOC-005',
      title: 'Buku Saku Kode Etik, Tata Kelola & Nilai Integritas Yayasan 2026.pdf',
      fileType: 'PDF',
      category: 'Corporate Governance & Etika',
      targetRole: 'ALL_YAYASAN',
      targetLabel: 'Seluruh Tim Yayasan',
      fileSize: '2.1 MB',
      description: 'Buku saku nilai integritas, transparansi penyaluran bantuan, dan perlindungan privasi data penerima manfaat.',
      uploadedBy: 'Tazkia Aulia (Human Capital)',
      uploadDate: '2026-08-15'
    }
  ],

  // Master Database: Dapur Program Yayasan (Database SPPG Lengkap Real Spreadsheet)
  kitchens: [
    {
      id: 'DAPUR-01',
      idSppg: 'WFC2L9EH',
      namaDapur: 'SPPG Cilangkap - Tapos 1',
      namaYayasan: 'Akselerasi Bumi Indonesia',
      name: 'SPPG Cilangkap - Tapos 1',
      provinsi: 'Jawa Barat',
      kotaKabupaten: 'Kota Depok',
      kecamatan: 'Tapos',
      kelurahan: 'Cilangkap',
      alamatLengkap: 'Cilangkap, Kec. Tapos, Kota Depok, Jawa Barat',
      location: 'Kota Depok, Jawa Barat',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Tri Utari (PY-001)',
      managerArea: 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-02',
      idSppg: 'YPEHMDF0',
      namaDapur: 'SPPG Cipinang Cempedak',
      namaYayasan: 'Adil Berdaya Insani',
      name: 'SPPG Cipinang Cempedak',
      provinsi: 'DKI Jakarta',
      kotaKabupaten: 'Kota Jakarta Timur',
      kecamatan: 'Jatinegara',
      kelurahan: 'Cipinang Cempedak',
      alamatLengkap: 'Cipinang Cempedak, Kec. Jatinegara, Kota Jakarta Timur, DKI Jakarta',
      location: 'Kota Jakarta Timur, DKI Jakarta',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Khoirudin (PY-002)',
      managerArea: 'Bivaldie A.R. (Manajer Area Jakarta)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-03',
      idSppg: 'THAH6JZO',
      namaDapur: 'SPPG Citaman',
      namaYayasan: 'Akselerasi Bumi Indonesia',
      name: 'SPPG Citaman',
      provinsi: 'Banten',
      kotaKabupaten: 'Kabupaten Pandeglang',
      kecamatan: 'Jiput',
      kelurahan: 'Citaman',
      alamatLengkap: 'Citaman, Kec. Jiput, Kab. Pandeglang, Banten',
      location: 'Kabupaten Pandeglang, Banten',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Tresna (PY-003)',
      managerArea: 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-04',
      idSppg: 'KJDSEBN6',
      namaDapur: 'SPPG Harjamukti',
      namaYayasan: 'Akselerasi Bumi Indonesia',
      name: 'SPPG Harjamukti',
      provinsi: 'Jawa Barat',
      kotaKabupaten: 'Kota Depok',
      kecamatan: 'Cimanggis',
      kelurahan: 'Harjamukti',
      alamatLengkap: 'Harjamukti, Kec. Cimanggis, Kota Depok, Jawa Barat',
      location: 'Kota Depok, Jawa Barat',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Setiawati (PY-004)',
      managerArea: 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-05',
      idSppg: 'NFXCJ3PI',
      namaDapur: 'SPPG Jatiwaringin',
      namaYayasan: 'Akselerasi Bumi Indonesia',
      name: 'SPPG Jatiwaringin',
      provinsi: 'Jawa Barat',
      kotaKabupaten: 'Kota Bekasi',
      kecamatan: 'Pondok Gede',
      kelurahan: 'Jatiwaringin',
      alamatLengkap: 'Jatiwaringin, Kec. Pondok Gede, Kota Bekasi, Jawa Barat',
      location: 'Kota Bekasi, Jawa Barat',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Astri Listia (PY-005)',
      managerArea: 'Bivaldie A.R. (Manajer Area Jakarta)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-06',
      idSppg: 'HUBRVBTW',
      namaDapur: 'SPPG Kayu Manis',
      namaYayasan: 'Adil Berdaya Insani',
      name: 'SPPG Kayu Manis',
      provinsi: 'DKI Jakarta',
      kotaKabupaten: 'Kota Jakarta Timur',
      kecamatan: 'Matraman',
      kelurahan: 'Kayu Manis',
      alamatLengkap: 'Kayu Manis, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta',
      location: 'Kota Jakarta Timur, DKI Jakarta',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Childa Susanti (PY-006)',
      managerArea: 'Bivaldie A.R. (Manajer Area Jakarta)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-07',
      idSppg: 'VMQ6JXXM',
      namaDapur: 'SPPG Kelapa Dua Wetan',
      namaYayasan: 'Adil Berdaya Insani',
      name: 'SPPG Kelapa Dua Wetan',
      provinsi: 'DKI Jakarta',
      kotaKabupaten: 'Kota Jakarta Timur',
      kecamatan: 'Ciracas',
      kelurahan: 'Kelapa Dua Wetan',
      alamatLengkap: 'Kelapa Dua Wetan, Kec. Ciracas, Kota Jakarta Timur, DKI Jakarta',
      location: 'Kota Jakarta Timur, DKI Jakarta',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Syahrir (PY-007)',
      managerArea: 'Bivaldie A.R. (Manajer Area Jakarta)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-08',
      idSppg: 'XQQBILKQ',
      namaDapur: 'SPPG Kendan',
      namaYayasan: 'Akselerasi Bumi Indonesia',
      name: 'SPPG Kendan',
      provinsi: 'Jawa Barat',
      kotaKabupaten: 'Kabupaten Bandung',
      kecamatan: 'Nagreg',
      kelurahan: 'Kendan',
      alamatLengkap: 'Kendan, Kec. Nagreg, Kab. Bandung, Jawa Barat',
      location: 'Kabupaten Bandung, Jawa Barat',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Maman Sutarman (PY-008)',
      managerArea: 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-09',
      idSppg: 'MLRQXJ1K',
      namaDapur: 'SPPG Leles',
      namaYayasan: 'Akselerasi Bumi Indonesia',
      name: 'SPPG Leles',
      provinsi: 'Jawa Barat',
      kotaKabupaten: 'Kabupaten Garut',
      kecamatan: 'Leles',
      kelurahan: 'Leles',
      alamatLengkap: 'Leles, Kec. Leles, Kab. Garut, Jawa Barat',
      location: 'Kabupaten Garut, Jawa Barat',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Jusman Ziliwu (PY-009)',
      managerArea: 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-10',
      idSppg: '1OAXCXMA',
      namaDapur: 'SPPG Mandalamekar',
      namaYayasan: 'Bekah Iman Nafi\'An',
      name: 'SPPG Mandalamekar',
      provinsi: 'Jawa Barat',
      kotaKabupaten: 'Kabupaten Bandung',
      kecamatan: 'Cimenyan',
      kelurahan: 'Mandalamekar',
      alamatLengkap: 'Mandalamekar, Kec. Cimenyan, Kab. Bandung, Jawa Barat',
      location: 'Kabupaten Bandung, Jawa Barat',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Achmad Sofyan Permadi (PY-010)',
      managerArea: 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-11',
      idSppg: 'PMXKYUEZ',
      namaDapur: 'SPPG Mandirancan',
      namaYayasan: 'Bekah Iman Nafi\'An',
      name: 'SPPG Mandirancan',
      provinsi: 'Jawa Barat',
      kotaKabupaten: 'Kabupaten Kuningan',
      kecamatan: 'Mandirancan',
      kelurahan: 'Mandirancan',
      alamatLengkap: 'Mandirancan, Kec. Mandirancan, Kab. Kuningan, Jawa Barat',
      location: 'Kabupaten Kuningan, Jawa Barat',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Imam Baiturohim (PY-011)',
      managerArea: 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-12',
      idSppg: 'WCJP3OPY',
      namaDapur: 'SPPG Pisangan Baru',
      namaYayasan: 'Adil Berdaya Insani',
      name: 'SPPG Pisangan Baru',
      provinsi: 'DKI Jakarta',
      kotaKabupaten: 'Kota Jakarta Timur',
      kecamatan: 'Matraman',
      kelurahan: 'Pisangan Baru',
      alamatLengkap: 'Pisangan Baru, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta',
      location: 'Kota Jakarta Timur, DKI Jakarta',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Yulianti (PY-012)',
      managerArea: 'Bivaldie A.R. (Manajer Area Jakarta)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-13',
      idSppg: 'ZAJXQGBU',
      namaDapur: 'SPPG Salaman/Sriwedari',
      namaYayasan: 'Sinergi Kesehatan Negeri',
      name: 'SPPG Salaman/Sriwedari',
      provinsi: 'Jawa Tengah',
      kotaKabupaten: 'Kabupaten Magelang',
      kecamatan: 'Salaman',
      kelurahan: 'Sriwedari',
      alamatLengkap: 'Sriwedari, Kec. Salaman, Kab. Magelang, Jawa Tengah',
      location: 'Kabupaten Magelang, Jawa Tengah',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Koko Kiswoko (PY-013)',
      managerArea: 'Dian Ekawati (Manajer Area Jawa Tengah)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-14',
      idSppg: '5SGNUNP0',
      namaDapur: 'SPPG Tengaran',
      namaYayasan: 'Sinergi Kesehatan Negeri',
      name: 'SPPG Tengaran',
      provinsi: 'Jawa Tengah',
      kotaKabupaten: 'Kabupaten Semarang',
      kecamatan: 'Tengaran',
      kelurahan: 'Tengaran',
      alamatLengkap: 'Tengaran, Kec. Tengaran, Kab. Semarang, Jawa Tengah',
      location: 'Kabupaten Semarang, Jawa Tengah',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Farissa Cahyainka (PY-014)',
      managerArea: 'Dian Ekawati (Manajer Area Jawa Tengah)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    },
    {
      id: 'DAPUR-15',
      idSppg: '36UNM9F5',
      namaDapur: 'SPPG Utan Kayu Selatan',
      namaYayasan: 'Adil Berdaya Insani',
      name: 'SPPG Utan Kayu Selatan',
      provinsi: 'DKI Jakarta',
      kotaKabupaten: 'Kota Jakarta Timur',
      kecamatan: 'Matraman',
      kelurahan: 'Utan Kayu Selatan',
      alamatLengkap: 'Utan Kayu Selatan, Kec. Matraman, Kota Jakarta Timur, DKI Jakarta',
      location: 'Kota Jakarta Timur, DKI Jakarta',
      makerYayasan: 'Belum Ditetapkan',
      perwakilanYayasan: 'Titi Hardyati (PY-015)',
      managerArea: 'Bivaldie A.R. (Manajer Area Jakarta)',
      status: 'AKTIF',
      kapasitasPorsi: 500
    }
  ],

  // Laporan Transaksi Dapur & Saldo VA (Dikelola oleh Maker Yayasan / Pengelola Dapur)
  kitchenReports: [],

  // Cuti & Izin Berdasarkan Pasal 14, 15, & 16 Peraturan Perusahaan
  leaves: [],

  // Default Activity Presets untuk Timesheet (Dikosongkan untuk input manual per user)
  defaultActivities: [],

  // Timesheets (Log Kerja Harian Mandiri)
  timesheets: [],

  // Purchase Requisition (PR - Pengadaan Barang & Fasilitas)
  itemRequests: [],

  // Cash Advance / Kasbon Operasional Data
  cashAdvances: [],

  // Catalog Presets
  catalog: [
    { name: 'Laser Distance Meter 50M', estPrice: 1950000, category: 'Perangkat IT & Survei' },
    { name: 'Heavy Duty Cooking Pot 50L', estPrice: 2200000, category: 'Fasilitas Kantor & Dapur' },
    { name: 'Rice Cooker Komersial 20L', estPrice: 3400000, category: 'Fasilitas Kantor & Dapur' },
    { name: 'Laptop ThinkPad L14 Gen 4', estPrice: 14500000, category: 'Perangkat IT' }
  ],

  // Laporan Kendala Harian Lapangan dari Perwakilan Yayasan
  fieldIssues: [],

  // Activity Log Stream
  activityLogs: [
    { id: 1, text: 'Sistem ERP Yayasan telah siap digunakan secara operasional.', time: '08:00', type: 'system' }
  ],

  // Interactive Org Structure (Tiers, Position Nodes, and Line Connections)
  orgStructure: {
    tiers: [
      { id: 'tier-1', label: 'Tingkat 1: Direktur Utama (CEO)', color: '#EF4444', desc: 'Pucuk pimpinan tertinggi yayasan' },
      { id: 'tier-2', label: 'Tingkat 2: Jajaran Direksi Operasional & Keuangan', color: '#F59E0B', desc: 'Direktur Operasional & Direktur Keuangan' },
      { id: 'tier-3', label: 'Tingkat 3: Manajerial Wilayah & Keuangan', color: '#3B82F6', desc: 'Manager Area & Manager Keuangan' },
      { id: 'tier-4', label: 'Tingkat 4: Human Capital, Staf Ahli & FAT', color: '#10B981', desc: 'Human Capital, Staf Ahli Administrasi Keuangan & FAT Officer' },
      { id: 'tier-5', label: 'Tingkat 5: Staff Operasional Lapangan & Pelaksana', color: '#EC4899', desc: 'Staff Operasional Titik Dapur SPPG & Petugas Lapangan' }
    ],
    nodes: [
      { id: 'org-du-001', userId: 'DU-001', name: 'Rochmad', role: 'DIREKTUR_UTAMA', roleLabel: 'Direktur Utama', department: 'Direksi Eksekutif', tierId: 'tier-1', avatarGrad: 'linear-gradient(135deg, #EF4444 0%, #F87171 100%)' },
      { id: 'org-do-001', userId: 'DO-001', name: 'Muhammad Arrasyid', role: 'DIREKTUR_OPERASIONAL', roleLabel: 'Direktur Operasional', department: 'Direksi Operasional', tierId: 'tier-2', avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)' },
      { id: 'org-dk-001', userId: 'DK-001', name: 'Kody Suryo Nugroho', role: 'DIREKTUR_KEUANGAN', roleLabel: 'Direktur Keuangan', department: 'Direksi Keuangan', tierId: 'tier-2', avatarGrad: 'linear-gradient(135deg, #10B981 0%, #6EE7B7 100%)' },
      { id: 'org-do-002', userId: 'DO-002', name: 'Muhammad Alfaqih', role: 'DIREKTUR_OPERASIONAL', roleLabel: 'Direktur Operasional', department: 'Direksi Operasional', tierId: 'tier-2', avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FB923C 100%)' },
      { id: 'org-mk-001', userId: 'MK-001', name: 'Viona', role: 'MANAGER_KEUANGAN', roleLabel: 'Manager Keuangan', department: 'Finance & Accounting', tierId: 'tier-3', avatarGrad: 'linear-gradient(135deg, #06B6D4 0%, #67E8F9 100%)' },
      { id: 'org-ma-001', userId: 'MA-001', name: 'Dian Ekawati', role: 'MANAGER_AREA', roleLabel: 'Manajer Area Jawa Tengah', department: 'Operasional Wilayah', tierId: 'tier-3', avatarGrad: 'linear-gradient(135deg, #3B82F6 0%, #93C5FD 100%)' },
      { id: 'org-ma-002', userId: 'MA-002', name: 'Bivaldie A.R.', role: 'MANAGER_AREA', roleLabel: 'Manajer Area Jakarta', department: 'Operasional Wilayah', tierId: 'tier-3', avatarGrad: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)' },
      { id: 'org-ma-003', userId: 'MA-003', name: 'Rendy Seftiana', role: 'MANAGER_AREA', roleLabel: 'Manajer Area Jkt & Jabar', department: 'Operasional Wilayah', tierId: 'tier-3', avatarGrad: 'linear-gradient(135deg, #1D4ED8 0%, #93C5FD 100%)' },
      { id: 'org-hc-001', userId: 'HC-001', name: 'Tazkia Aulia', role: 'HUMAN_CAPITAL', roleLabel: 'Human Capital', department: 'Human Capital & GA', tierId: 'tier-4', avatarGrad: 'linear-gradient(135deg, #7C3AED 0%, #C4B5FD 100%)' },
      { id: 'org-sa-001', userId: 'SA-001', name: 'Sakhiyah Karomah Salam', role: 'STAFF_AHLI_KEUANGAN', roleLabel: 'Staf Ahli Adm & Keuangan', department: 'Keuangan Yayasan', tierId: 'tier-4', avatarGrad: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)' },
      { id: 'org-sa-002', userId: 'SA-002', name: 'Muhammad Syafiq Al Ghifari', role: 'STAFF_AHLI_KEUANGAN', roleLabel: 'Staf Ahli Adm & Keuangan', department: 'Keuangan Yayasan', tierId: 'tier-4', avatarGrad: 'linear-gradient(135deg, #4F46E5 0%, #A5B4FC 100%)' },
      { id: 'org-fat-001', userId: 'FAT-001', name: 'Muhammad Imam Adamy', role: 'FAT_OFFICER', roleLabel: 'Finance & Tax', department: 'Finance & Tax', tierId: 'tier-4', avatarGrad: 'linear-gradient(135deg, #D97706 0%, #FDE68A 100%)' },
      { id: 'org-so-001', userId: 'SO-001', name: 'Maulana Raka Pahlevi', role: 'STAFF_OPERASIONAL', roleLabel: 'Staff Operasional', department: 'Operasional Lapangan', tierId: 'tier-5', isRedBadge: true, avatarGrad: 'linear-gradient(135deg, #2563EB 0%, #60A5FA 100%)' },
      { id: 'org-so-002', userId: 'SO-002', name: 'Irawan Dwi Laksono', role: 'STAFF_OPERASIONAL', roleLabel: 'Staff Operasional (Jatim)', department: 'Operasional Lapangan', tierId: 'tier-5', isRedBadge: true, avatarGrad: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)' },
      { id: 'org-so-003', userId: 'SO-003', name: 'Wawan Hermawan, S.Ag', role: 'STAFF_OPERASIONAL', roleLabel: 'Staff Operasional (Jabar)', department: 'Operasional Lapangan', tierId: 'tier-5', isRedBadge: true, avatarGrad: 'linear-gradient(135deg, #059669 0%, #34D399 100%)' },
      { id: 'org-so-004', userId: 'SO-004', name: 'Syifa Izzatina', role: 'STAFF_OPERASIONAL', roleLabel: 'Staff Operasional', department: 'Operasional Lapangan', tierId: 'tier-5', isRedBadge: true, avatarGrad: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)' }
    ],
    connections: [
      { id: 'conn-1', fromNodeId: 'org-du-001', toNodeId: 'org-do-001', type: 'SOLID', label: 'Garis Komando Direksi' },
      { id: 'conn-2', fromNodeId: 'org-du-001', toNodeId: 'org-dk-001', type: 'SOLID', label: 'Garis Komando Direksi' },
      { id: 'conn-3', fromNodeId: 'org-du-001', toNodeId: 'org-do-002', type: 'SOLID', label: 'Garis Komando Direksi' },
      { id: 'conn-4', fromNodeId: 'org-do-001', toNodeId: 'org-ma-001', type: 'SOLID', label: 'Garis Komando Wilayah Jateng' },
      { id: 'conn-5', fromNodeId: 'org-do-001', toNodeId: 'org-ma-002', type: 'SOLID', label: 'Garis Komando Wilayah Jakarta' },
      { id: 'conn-6', fromNodeId: 'org-do-001', toNodeId: 'org-ma-003', type: 'SOLID', label: 'Garis Komando Wilayah Jabar' },
      { id: 'conn-7', fromNodeId: 'org-do-001', toNodeId: 'org-hc-001', type: 'SOLID', label: 'Garis Komando SDM & GA' },
      { id: 'conn-8', fromNodeId: 'org-dk-001', toNodeId: 'org-mk-001', type: 'SOLID', label: 'Garis Komando Keuangan' },
      { id: 'conn-9', fromNodeId: 'org-mk-001', toNodeId: 'org-sa-001', type: 'SOLID', label: 'Supervisi Staf Ahli Keuangan' },
      { id: 'conn-10', fromNodeId: 'org-mk-001', toNodeId: 'org-sa-002', type: 'SOLID', label: 'Supervisi Staf Ahli Administrasi' },
      { id: 'conn-11', fromNodeId: 'org-mk-001', toNodeId: 'org-fat-001', type: 'SOLID', label: 'Supervisi Pembukuan & FAT' },
      { id: 'conn-12', fromNodeId: 'org-ma-001', toNodeId: 'org-so-002', type: 'SOLID', label: 'Instruksi Lapangan Dapur' },
      { id: 'conn-13', fromNodeId: 'org-ma-002', toNodeId: 'org-so-001', type: 'SOLID', label: 'Instruksi Lapangan Dapur' },
      { id: 'conn-14', fromNodeId: 'org-ma-003', toNodeId: 'org-so-003', type: 'SOLID', label: 'Instruksi Lapangan Dapur' },
      { id: 'conn-15', fromNodeId: 'org-ma-003', toNodeId: 'org-so-004', type: 'SOLID', label: 'Instruksi Lapangan Dapur' }
    ]
  }
};

// Database Management Class
class DatabaseManager {
  constructor() {
    this.data = this.load();
  }

  load() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.users)) {
          // Auto-sync missing users from INITIAL_DATABASE
          INITIAL_DATABASE.users.forEach(initUser => {
            if (!parsed.users.some(u => u.id === initUser.id)) {
              parsed.users.push(initUser);
            }
          });

          // Ensure all array collections are properly initialized and persistent
          if (!Array.isArray(parsed.itemRequests)) parsed.itemRequests = [];
          if (!Array.isArray(parsed.kitchenReports)) parsed.kitchenReports = [];
          if (!Array.isArray(parsed.kitchens)) parsed.kitchens = INITIAL_DATABASE.kitchens || [];
          if (!Array.isArray(parsed.leaves)) parsed.leaves = [];
          if (!Array.isArray(parsed.timesheets)) parsed.timesheets = [];
          if (!Array.isArray(parsed.cashAdvances)) parsed.cashAdvances = [];
          if (!Array.isArray(parsed.fieldIssues)) parsed.fieldIssues = [];

          return parsed;
        }
      }
    } catch (e) {
      console.warn('Gagal memuat cache lokal, beralih ke inisialisasi default:', e);
    }
    this.save(INITIAL_DATABASE);
    return JSON.parse(JSON.stringify(INITIAL_DATABASE));
  }

  save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data || this.data));
    } catch (e) {
      console.warn('Gagal menyimpan ke localStorage (kemungkinan ukuran attachment besar), mencoba fallback tanpa binary data:', e);
      try {
        const copy = JSON.parse(JSON.stringify(data || this.data));
        if (Array.isArray(copy.guidelineDocuments)) {
          copy.guidelineDocuments.forEach(doc => {
            if (doc.fileData && doc.fileData.length > 50000) {
              doc.fileData = null; // Lepaskan binary berat agar storage tidak gagal
            }
          });
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
      } catch (err2) {
        console.error('Penyimpanan database fallback juga gagal:', err2);
      }
    }
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.data = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.save(this.data);
    return this.data;
  }

  getCurrentUser() {
    return (this.data && this.data.currentUser) ? this.data.currentUser : INITIAL_DATABASE.currentUser;
  }

  getUsers() {
    return (this.data && Array.isArray(this.data.users)) ? this.data.users : INITIAL_DATABASE.users;
  }

  switchRole(userId) {
    let user = this.getUsers().find(u => u.id === userId);
    if (!user) {
      // Fallback search in INITIAL_DATABASE
      user = INITIAL_DATABASE.users.find(u => u.id === userId);
      if (user && this.data && Array.isArray(this.data.users)) {
        this.data.users.push(user);
      }
    }
    if (user) {
      this.data.currentUser = user;
      this.save();
      return user;
    }
    return this.getCurrentUser();
  }

  // =========================================================================
  // DOKUMEN PANDUAN & SOSIALISASI YAYASAN (PDF / PPT)
  // =========================================================================

  getGuidelineDocuments(targetRoleFilter = null) {
    const docs = (this.data && Array.isArray(this.data.guidelineDocuments)) ? this.data.guidelineDocuments : INITIAL_DATABASE.guidelineDocuments;
    if (!targetRoleFilter) return docs;
    return docs.filter(d => d.targetRole === targetRoleFilter || d.targetRole === 'ALL_YAYASAN');
  }

  addGuidelineDocument(docData) {
    const id = `DOC-${String(this.getGuidelineDocuments().length + 1).padStart(3, '0')}`;
    const newDoc = {
      id,
      title: docData.title,
      fileType: docData.fileType || 'PDF',
      category: docData.category || 'Panduan Operasional',
      targetRole: docData.targetRole || 'ALL_YAYASAN',
      targetLabel: docData.targetRole === 'PERWAKILAN_YAYASAN' ? 'Khusus Perwakilan Yayasan' : docData.targetRole === 'MAKER_YAYASAN' ? 'Khusus Maker Yayasan' : 'Seluruh Tim Yayasan',
      fileSize: docData.fileSize || '3.5 MB',
      description: docData.description || 'Dokumen panduan resmi operasional yayasan.',
      fileData: docData.fileData || null,
      uploadedBy: `${this.getCurrentUser().name} (${this.getCurrentUser().roleLabel})`,
      uploadDate: new Date().toISOString().slice(0, 10)
    };

    if (!Array.isArray(this.data.guidelineDocuments)) this.data.guidelineDocuments = [];
    this.data.guidelineDocuments.unshift(newDoc);
    this.addLog(`Human Capital mengunggah dokumen panduan baru: "${newDoc.title}" (${newDoc.fileType})`, 'hc');
    this.save();
    return newDoc;
  }

  deleteGuidelineDocument(docId) {
    if (!Array.isArray(this.data.guidelineDocuments)) return false;
    const idx = this.data.guidelineDocuments.findIndex(d => d.id === docId);
    if (idx !== -1) {
      const deleted = this.data.guidelineDocuments.splice(idx, 1)[0];
      this.addLog(`Human Capital menghapus dokumen panduan: "${deleted.title}"`, 'hc');
      this.save();
      return true;
    }
    return false;
  }

  // =========================================================================
  // HC HUB: STRUKTUR PERUSAHAAN, DATA KARYAWAN & PENGELOLAAN AKUN
  // =========================================================================

  updateUserRoleName(userId, newName, newRoleLabel) {
    const user = this.getUsers().find(u => u.id === userId);
    if (!user) return false;

    const oldName = user.name;
    user.name = newName;
    if (newRoleLabel) {
      user.roleLabel = newRoleLabel;
      user.jabatan = newRoleLabel;
    }

    if (this.data.currentUser && this.data.currentUser.id === userId) {
      this.data.currentUser.name = newName;
      if (newRoleLabel) {
        this.data.currentUser.roleLabel = newRoleLabel;
        this.data.currentUser.jabatan = newRoleLabel;
      }
    }

    this.addLog(`Human Capital memperbarui nama pejabat [${user.roleLabel}]: "${oldName}" menjadi "${newName}"`, 'hc');
    this.save();
    return true;
  }

  updateEmployeeData(userId, updatedFields) {
    const user = this.getUsers().find(u => u.id === userId);
    if (!user) return false;

    Object.assign(user, updatedFields);

    if (this.data.currentUser && this.data.currentUser.id === userId) {
      Object.assign(this.data.currentUser, updatedFields);
    }

    this.addLog(`Human Capital memperbarui data lengkap HRIS: ${user.name} (${user.id})`, 'hc');
    this.save();

    // Sinkronkan data profil yang diperbarui ke Supabase table "users" secara real-time
    this.syncToSupabase('users', {
      id: user.id,
      nika: user.nika || '',
      name: user.name,
      role: user.role,
      role_label: user.roleLabel || user.jabatan || '',
      kode_jabatan: user.kodeJabatan || '',
      jabatan: user.jabatan || '',
      level_grade: user.levelGrade || '',
      department: user.department || '',
      avatar_grad: user.avatarGrad || '',
      quota_annual_leave: Number(user.quotaAnnualLeave) || 12,
      remaining_annual_leave: Number(user.remainingAnnualLeave) || 12,
      quota_personal_leave: Number(user.quotaPersonalLeave) || 3,
      remaining_personal_leave: Number(user.remainingPersonalLeave) || 3,
      current_quarter: user.currentQuarter || 'Q3 (Juli–September 2026)',
      join_date: (user.joinDate && user.joinDate !== '-') ? user.joinDate : null,
      birth_place: user.birthPlace || '',
      birth_date: (user.birthDate && user.birthDate !== '-') ? user.birthDate : null,
      agama: user.agama || 'Islam',
      gender: user.gender || 'Laki-laki',
      phone: user.phone || '',
      email: user.email || '',
      username: user.username || user.id.toLowerCase(),
      password: user.password || 'password123',
      nik: user.nik || '',
      status_karyawan: user.statusKaryawan || 'Tetap',
      status_pajak: user.statusPajak || 'TK/0',
      pendidikan: user.pendidikan || 'Sarjana (S1)',
      no_kk: user.noKK || '',
      alamat_ktp: user.alamatKTP || '',
      alamat_domisili: user.alamatDomisili || '',
      status_tempat_tinggal: user.statusTempatTinggal || 'Milik Sendiri',
      no_npwp: user.noNPWP || '',
      alamat_npwp: user.alamatNPWP || '',
      bank_name: user.bankName || '',
      rekening_no: user.rekeningNo || '',
      rekening_name: user.rekeningName || user.name,
      no_bpjs_kesehatan: user.noBPJSKesehatan || '',
      no_bpjs_tenagakerja: user.noBPJSTenagaKerja || '',
      emergency_name: user.emergencyName || '',
      emergency_relation: user.emergencyRelation || '',
      emergency_phone: user.emergencyPhone || '',
      notes: user.notes || ''
    });

    return true;
  }

  addUserAccount(newUserData) {
    const id = `EMP-${String(this.getUsers().length + 1).padStart(3, '0')}`;
    const nika = newUserData.nika || `K-2026-${String(this.getUsers().length + 1).padStart(3, '0')}`;
    const colors = [
      'linear-gradient(135deg, #EC4899, #F472B6)',
      'linear-gradient(135deg, #8B5CF6, #C4B5FD)',
      'linear-gradient(135deg, #06B6D4, #67E8F9)',
      'linear-gradient(135deg, #10B981, #6EE7B7)',
      'linear-gradient(135deg, #F59E0B, #FDE68A)'
    ];
    const avatarGrad = colors[Math.floor(Math.random() * colors.length)];

    const user = {
      id,
      nika,
      name: newUserData.name,
      role: newUserData.role || 'STAFF',
      roleLabel: newUserData.roleLabel || 'Staff Karyawan',
      kodeJabatan: newUserData.kodeJabatan || 'WLKP-STF-01',
      jabatan: newUserData.jabatan || newUserData.roleLabel || 'Staff Operasional',
      levelGrade: newUserData.levelGrade || 'Staff / Grade 1',
      department: newUserData.department || 'Operasional Lapangan',
      avatarGrad,
      quotaAnnualLeave: Number(newUserData.quotaAnnualLeave) || 12,
      remainingAnnualLeave: Number(newUserData.quotaAnnualLeave) || 12,
      quotaPersonalLeave: 3,
      remainingPersonalLeave: 3,
      currentQuarter: 'Q3 (Juli–September 2026)',
      joinDate: newUserData.joinDate || '2024-01-01',
      username: newUserData.username || `user.${Date.now().toString().slice(-4)}`,
      password: newUserData.password || 'password123',
      nik: newUserData.nik || '3171000000000000',
      birthPlace: newUserData.birthPlace || 'Jakarta',
      birthDate: newUserData.birthDate || '1995-01-01',
      agama: newUserData.agama || 'Islam',
      gender: newUserData.gender || 'Laki-laki',
      phone: newUserData.phone || '-',
      email: newUserData.email || `${newUserData.username || 'user'}@yayasan.org`,
      statusKaryawan: newUserData.statusKaryawan || 'PKWT',
      statusPajak: newUserData.statusPajak || 'TK/0',
      pendidikan: newUserData.pendidikan || 'Sarjana (S1)',
      noKK: newUserData.noKK || '3171000000000001',
      alamatKTP: newUserData.alamatKTP || 'Jl. Kantor Yayasan No. 1, Jakarta',
      alamatDomisili: newUserData.alamatDomisili || 'Jl. Kantor Yayasan No. 1, Jakarta',
      statusTempatTinggal: newUserData.statusTempatTinggal || 'Sewa / Kontrak',
      noNPWP: newUserData.noNPWP || '-',
      alamatNPWP: newUserData.alamatNPWP || '-',
      bankName: newUserData.bankName || 'Bank Mandiri',
      rekeningNo: newUserData.rekeningNo || '-',
      rekeningName: newUserData.rekeningName || newUserData.name,
      noBPJSKesehatan: newUserData.noBPJSKesehatan || '-',
      noBPJSTenagaKerja: newUserData.noBPJSTenagaKerja || '-',
      emergencyName: newUserData.emergencyName || '-',
      emergencyRelation: newUserData.emergencyRelation || '-',
      emergencyPhone: newUserData.emergencyPhone || '-',
      resignDate: null,
      resignReason: '-',
      notes: newUserData.notes || 'Karyawan aktif.'
    };

    if (!Array.isArray(this.data.users)) this.data.users = [];
    this.data.users.push(user);

    this.addLog(`Human Capital membuat akun baru: ${user.name} (@${user.username})`, 'hc');
    this.save();

    // Sinkronkan user baru ke Supabase
    this.syncToSupabase('users', {
      id: user.id,
      nika: user.nika,
      name: user.name,
      role: user.role,
      role_label: user.roleLabel,
      kode_jabatan: user.kodeJabatan,
      jabatan: user.jabatan,
      level_grade: user.levelGrade,
      department: user.department,
      avatar_grad: user.avatarGrad,
      quota_annual_leave: user.quotaAnnualLeave,
      remaining_annual_leave: user.remainingAnnualLeave,
      quota_personal_leave: user.quotaPersonalLeave,
      remaining_personal_leave: user.remainingPersonalLeave,
      current_quarter: user.currentQuarter,
      join_date: user.joinDate,
      birth_place: user.birthPlace,
      birth_date: user.birthDate,
      agama: user.agama,
      gender: user.gender,
      phone: user.phone,
      email: user.email,
      username: user.username,
      password: user.password,
      nik: user.nik,
      status_karyawan: user.statusKaryawan,
      status_pajak: user.statusPajak,
      pendidikan: user.pendidikan,
      notes: user.notes
    });

    return user;
  }

  deleteUserAccount(userId) {
    if (!Array.isArray(this.data.users)) return false;
    const idx = this.data.users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      const deleted = this.data.users.splice(idx, 1)[0];
      this.addLog(`Human Capital menonaktifkan akun: ${deleted.name} (${deleted.username})`, 'hc');
      this.save();
      return true;
    }
    return false;
  }

  updateUserPassword(userId, newPassword) {
    const user = this.getUsers().find(u => u.id === userId);
    if (!user) return false;
    user.password = newPassword;
    this.addLog(`Human Capital me-reset password: ${user.name} (${user.username})`, 'hc');
    this.save();

    this.syncToSupabase('users', {
      id: user.id,
      password: newPassword
    });

    return true;
  }

  resetToMasterAccounts() {
    const allUsers = JSON.parse(JSON.stringify(INITIAL_DATABASE.users || []));
    const curr = this.getCurrentUser();
    const activeMaster = (curr && allUsers.find(u => u.id === curr.id)) || allUsers.find(u => u.role === 'SUPER_ADMIN') || allUsers[0];

    this.data = {
      currentUser: activeMaster,
      users: allUsers,
      leaves: [],
      timesheets: [],
      itemRequests: [],
      cashAdvances: [],
      kitchenReports: [],
      fieldIssues: [],
      guidelineDocs: (INITIAL_DATABASE.guidelineDocs || []).slice(0, 2),
      catalog: INITIAL_DATABASE.catalog || [],
      activityLogs: [
        { id: Date.now(), text: 'System Master Reset: Database transaksi dibersihkan. Mempertahankan seluruh 20 Master Akun Organisasi Yayasan.', time: new Date().toTimeString().slice(0, 5), type: 'system' }
      ],
      orgStructure: JSON.parse(JSON.stringify(INITIAL_DATABASE.orgStructure))
    };

    this.save();
    return true;
  }

  // =========================================================================
  // DAPUR MASTER & REPORTS (ADMIN HUB DATABASE SPPG)
  // =========================================================================

  getKitchens() {
    return (this.data && Array.isArray(this.data.kitchens)) ? this.data.kitchens : INITIAL_DATABASE.kitchens;
  }

  getKitchenById(id) {
    return this.getKitchens().find(k => k.id === id || k.idSppg === id);
  }

  getKitchenDropdownOptions(user = null) {
    const list = user ? this.getKitchensForUser(user) : this.getKitchens();
    return list.map(k => {
      const idSppg = k.idSppg || k.id;
      const nama = k.namaDapur || k.name || 'Dapur Yayasan';
      return {
        id: k.id,
        idSppg: idSppg,
        namaDapur: nama,
        label: `${idSppg} — ${nama}`
      };
    });
  }

  getKitchensForUser(user) {
    const kitchens = this.getKitchens();
    if (!user) return kitchens;
    if (user.role === 'PERWAKILAN_YAYASAN') {
      const filtered = kitchens.filter(k => {
        if (!k) return false;
        const matchPerwakilan = k.perwakilanYayasan && (
          k.perwakilanYayasan.includes(user.name) ||
          k.perwakilanYayasan.includes(user.id) ||
          (user.name && k.perwakilanYayasan.toLowerCase().includes(user.name.toLowerCase()))
        );
        const matchSppg = user.sppgId && (k.idSppg === user.sppgId || k.id === user.sppgId);
        const matchName = user.sppgName && (k.namaDapur === user.sppgName || k.name === user.sppgName);
        const matchAssigned = user.assignedKitchen && (
          user.assignedKitchen.includes(k.idSppg) ||
          user.assignedKitchen.includes(k.namaDapur) ||
          user.assignedKitchen.includes(k.id)
        );
        return matchPerwakilan || matchSppg || matchName || matchAssigned;
      });
      if (filtered.length > 0) return filtered;
      if (user.sppgId) {
        return [{
          id: user.sppgId,
          idSppg: user.sppgId,
          namaDapur: user.sppgName || 'Dapur SPPG',
          name: user.sppgName || 'Dapur SPPG'
        }];
      }
      return kitchens;
    }
    return kitchens;
  }

  addKitchen(kitchenData) {
    const kitchens = this.getKitchens();
    const nextNum = kitchens.length + 1;
    const id = `DAPUR-0${nextNum}`;
    const idSppg = kitchenData.idSppg || `SPPG-MMS-${String(nextNum).padStart(2, '0')}`;
    const namaDapur = kitchenData.namaDapur || kitchenData.name || 'Dapur Baru Yayasan';

    const newKitchen = {
      id,
      idSppg,
      namaDapur,
      namaYayasan: kitchenData.namaYayasan || 'Yayasan Mitra Mandiri Sejahtera',
      name: namaDapur,
      provinsi: kitchenData.provinsi || 'DKI Jakarta',
      kotaKabupaten: kitchenData.kotaKabupaten || '-',
      kecamatan: kitchenData.kecamatan || '-',
      kelurahan: kitchenData.kelurahan || '-',
      alamatLengkap: kitchenData.alamatLengkap || '-',
      location: `${kitchenData.kotaKabupaten || '-'}, ${kitchenData.provinsi || '-'}`,
      makerYayasan: kitchenData.makerYayasan || 'Belum Ditetapkan',
      perwakilanYayasan: kitchenData.perwakilanYayasan || 'Belum Ditetapkan',
      managerArea: kitchenData.managerArea || 'Rendy Seftiana (Manajer Area Jakarta & Jabar)',
      status: kitchenData.status || 'AKTIF',
      kapasitasPorsi: Number(kitchenData.kapasitasPorsi) || 500,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    if (!Array.isArray(this.data.kitchens)) this.data.kitchens = [...INITIAL_DATABASE.kitchens];
    this.data.kitchens.push(newKitchen);
    this.addLog(`Staf Ahli Keuangan & Administrasi mendaftarkan Dapur baru: ${newKitchen.idSppg} — ${newKitchen.namaDapur}`, 'admin');
    this.save();
    return newKitchen;
  }

  updateKitchen(id, updatedData) {
    if (!Array.isArray(this.data.kitchens)) this.data.kitchens = [...INITIAL_DATABASE.kitchens];
    const kitchen = this.data.kitchens.find(k => k.id === id || k.idSppg === id);
    if (!kitchen) return false;

    Object.assign(kitchen, updatedData);
    if (updatedData.namaDapur) kitchen.name = updatedData.namaDapur;
    
    this.addLog(`Data Dapur ${kitchen.idSppg} (${kitchen.namaDapur}) berhasil diperbarui oleh Staf Ahli Keuangan`, 'admin');
    this.save();
    return kitchen;
  }

  deleteKitchen(id) {
    if (!Array.isArray(this.data.kitchens)) this.data.kitchens = [...INITIAL_DATABASE.kitchens];
    const idx = this.data.kitchens.findIndex(k => k.id === id || k.idSppg === id);
    if (idx !== -1) {
      const deleted = this.data.kitchens.splice(idx, 1)[0];
      this.addLog(`Dapur ${deleted.idSppg} — ${deleted.namaDapur} dinonaktifkan/dihapus dari database SPPG`, 'admin');
      this.save();
      return true;
    }
    return false;
  }

  getKitchenReports() {
    return (this.data && Array.isArray(this.data.kitchenReports)) ? this.data.kitchenReports : INITIAL_DATABASE.kitchenReports;
  }

  addKitchenReport(report) {
    const id = `KR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0${this.getKitchenReports().length + 1}`;
    const porsiBesar = Number(report.porsiBesar) || 0;
    const porsiKecil = Number(report.porsiKecil) || 0;
    const beneficiariesCount = (porsiBesar + porsiKecil > 0) ? (porsiBesar + porsiKecil) : (Number(report.beneficiariesCount) || 1);
    const rawMaterialCost = Number(report.rawMaterialCost) || 0;
    const operationalCost = Number(report.operationalCost) || 0;
    const carRentalCost = Number(report.carRentalCost) || 0;
    const totalDailyExpense = rawMaterialCost + operationalCost + carRentalCost;

    const targetBudget = (porsiBesar * 10000) + (porsiKecil * 8000);
    const costPerPortion = beneficiariesCount > 0 ? Math.round(rawMaterialCost / beneficiariesCount) : 0;
    const costPerPortionAllIn = beneficiariesCount > 0 ? Math.round(totalDailyExpense / beneficiariesCount) : 0;
    
    const newReport = {
      id,
      ...report,
      rawMaterialCost,
      operationalCost,
      carRentalCost,
      totalDailyExpense,
      porsiBesar,
      porsiKecil,
      beneficiariesCount,
      targetBudget,
      costPerPortion,
      costPerPortionAllIn,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16)
    };

    if (!Array.isArray(this.data.kitchenReports)) this.data.kitchenReports = [];
    this.data.kitchenReports.unshift(newReport);

    this.addLog(`${report.reporterName} melaporkan transaksi ${report.kitchenName}: ${beneficiariesCount} Porsi (Bahan: Rp ${rawMaterialCost.toLocaleString('id-ID')} + Ops: Rp ${operationalCost.toLocaleString('id-ID')}${carRentalCost > 0 ? ` + Sewa Mobil: Rp ${carRentalCost.toLocaleString('id-ID')}` : ''} = Total: Rp ${totalDailyExpense.toLocaleString('id-ID')}) · Saldo VA Rp ${Number(report.vaBalance).toLocaleString('id-ID')}`, 'kitchen');
    this.save();
    return newReport;
  }

  // =========================================================================
  // LEAVES (CUTI & IZIN - PASAL 14, 15, 16)
  // =========================================================================

  getLeaves() {
    return (this.data && Array.isArray(this.data.leaves)) ? this.data.leaves : INITIAL_DATABASE.leaves;
  }

  getUserApprovedLeaveOnDate(userId, dateStr) {
    const leaves = this.getLeaves();
    if (!leaves || !userId || !dateStr) return null;
    return leaves.find(l => 
      (l.employeeId === userId || l.employeeName === userId) &&
      l.status === 'APPROVED' &&
      dateStr >= l.startDate &&
      dateStr <= l.endDate
    ) || null;
  }

  addLeave(leaveData) {
    const user = this.getCurrentUser();
    const id = `LV-2026-${String(this.getLeaves().length + 84).padStart(3, '0')}`;
    
    let approvalFlow = 'HC_DIRECT';
    let stage = 'HC_REVIEW';
    let approver = 'Tazkia Aulia (Human Capital)';

    if (user.role === 'SURVEYOR' || user.role === 'PERWAKILAN_YAYASAN' || user.role === 'STAFF_OPERASIONAL') {
      approvalFlow = 'HC_DIRECT';
      stage = 'HC_REVIEW';
      approver = 'Tazkia Aulia (Human Capital)';
    } else if (user.role === 'FAT_OFFICER' || user.role === 'STAFF_AHLI_KEUANGAN' || user.role === 'MAKER_YAYASAN') {
      approvalFlow = 'FINANCE_TIER';
      stage = 'DIR_KEU_REVIEW';
      approver = 'Kody Suryo Nugroho (Direktur Keuangan)';
    } else if (user.role === 'MANAGER_AREA' || user.role === 'MANAGER_KEUANGAN' || user.role === 'HUMAN_CAPITAL') {
      approvalFlow = 'MANAGER_TIER';
      stage = 'DIR_OPS_OR_KEU_REVIEW';
      approver = 'Muhammad Arrasyid / Kody Suryo Nugroho';
    }

    const realTimestamp = getRealtimeTimestamp();

    const newLeave = {
      id,
      employeeId: user.id,
      employeeName: user.name,
      role: user.role,
      department: user.department,
      approvalFlow,
      stage,
      status: 'PENDING',
      approver,
      createdAt: realTimestamp,
      approvalHistory: [
        {
          stage: 'SUBMISSION',
          level: 1,
          action: 'SUBMITTED',
          actorName: user.name,
          actorRole: user.roleLabel || 'Karyawan',
          timestamp: realTimestamp,
          notes: `Permohonan ${leaveData.type} (${leaveData.duration} hari: ${leaveData.startDate} s.d ${leaveData.endDate}). Alasan: "${leaveData.reason || '-'}"`
        }
      ],
      ...leaveData
    };

    if (!Array.isArray(this.data.leaves)) this.data.leaves = [];
    this.data.leaves.unshift(newLeave);
    this.addLog(`${user.name} mengajukan ${leaveData.type} (${leaveData.duration} hari) [Status: Menunggu ${approver}] pada ${realTimestamp}`, 'leave');
    this.save();

    // Background Cloud Sync & Notifikasi Email
    setTimeout(() => {
      this.syncToSupabase('leaves', {
        id: newLeave.id,
        employee_id: newLeave.employeeId,
        employee_name: newLeave.employeeName,
        role: newLeave.role,
        department: newLeave.department,
        leave_type: newLeave.leaveType || newLeave.type,
        start_date: newLeave.startDate,
        end_date: newLeave.endDate,
        duration: newLeave.duration,
        reason: newLeave.reason,
        emergency_contact: newLeave.emergencyContact,
        attachment_url: newLeave.attachmentUrl,
        attachment_name: newLeave.attachmentName,
        stage: newLeave.stage,
        status: newLeave.status,
        approval_history: newLeave.approvalHistory
      });

      // Cari approver dinamis dari database pengguna
      let targetApprover = null;
      if (approvalFlow === 'MANAGER_TIER') {
        // Utamakan Muhammad Alfaqih (DO-002) atau Direktur Operasional dengan email real
        targetApprover = this.getUsers().find(u => (u.id === 'DO-002' || u.name.includes('Alfaqih')) && u.role === 'DIREKTUR_OPERASIONAL') ||
                         this.getUsers().find(u => u.role === 'DIREKTUR_OPERASIONAL' && u.email && (!u.email.includes('@erpmms.co.id') || u.email.includes('@gmail'))) ||
                         this.getUsers().find(u => u.role === 'DIREKTUR_OPERASIONAL') ||
                         this.getUsers().find(u => u.role === 'DIREKTUR_KEUANGAN');
      } else if (approvalFlow === 'FINANCE_TIER') {
        targetApprover = this.getUsers().find(u => u.role === 'DIREKTUR_KEUANGAN');
      } else {
        // Default untuk staff, perwakilan, surveyor: ke Human Capital
        targetApprover = this.getUsers().find(u => u.role === 'HUMAN_CAPITAL');
      }

      const toEmail = targetApprover ? targetApprover.email : 'alfaqih1108@gmail.com';
      const toName = targetApprover ? targetApprover.name : 'Muhammad Alfaqih (Direktur Operasional)';

      this.notifyEmail({
        to: toEmail,
        recipientName: toName,
        subject: `Permohonan Cuti Baru (${newLeave.id} - ${user.name})`,
        notificationType: 'LEAVE_SUBMITTED',
        title: 'Pengajuan Cuti & Izin Karyawan Baru',
        summaryText: `${user.name} (${user.roleLabel}) mengajukan permohonan ${newLeave.leaveType || newLeave.type} selama ${newLeave.duration} hari kerja (${newLeave.startDate} s.d ${newLeave.endDate}).`,
        details: {
          'No. Cuti': newLeave.id,
          'Karyawan': `${user.name} (${user.roleLabel})`,
          'Jenis Cuti': newLeave.leaveType || newLeave.type,
          'Periode': `${newLeave.startDate} s.d ${newLeave.endDate} (${newLeave.duration} Hari)`,
          'Alasan': newLeave.reason || '-'
        }
      });
    }, 0);

    return newLeave;
  }

  advanceLeaveStage(id, nextStage, status = 'PENDING') {
    const leave = this.getLeaves().find(l => l.id === id);
    if (!leave) return false;

    const user = this.getCurrentUser();
    const realTimestamp = getRealtimeTimestamp();
    if (!Array.isArray(leave.approvalHistory)) leave.approvalHistory = [];

    // Pastikan Level 1 ada di riwayat
    if (leave.approvalHistory.length === 0) {
      leave.approvalHistory.push({
        stage: 'SUBMISSION',
        level: 1,
        action: 'SUBMITTED',
        actorName: leave.employeeName,
        actorRole: leave.role ? leave.role.replace(/_/g, ' ') : 'Karyawan',
        timestamp: leave.createdAt || realTimestamp,
        notes: `Permohonan ${leave.type} (${leave.duration} hari: ${leave.startDate} s.d ${leave.endDate}). Alasan: "${leave.reason || '-'}"`
      });
    }

    const isFinance = (leave.approvalFlow === 'FINANCE_TIER');
    const isManagerTier = (leave.approvalFlow === 'MANAGER_TIER');
    const isHCDirect = (leave.approvalFlow === 'HC_DIRECT');

    // Catat approval audit trail real-time
    if (leave.stage === 'DIR_KEU_REVIEW' || leave.stage === 'DIR_OPS_OR_KEU_REVIEW' || leave.stage === 'MANAGER_REVIEW') {
      leave.approvalHistory.push({
        stage: leave.stage,
        level: 2,
        action: status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
        actorName: `${user.name} (${user.roleLabel})`,
        actorRole: user.roleLabel,
        timestamp: realTimestamp,
        notes: status === 'REJECTED' 
          ? `Pengajuan cuti ditolak oleh ${user.name}` 
          : (isFinance 
              ? 'Persetujuan cuti diberikan oleh Direktur Keuangan & diteruskan ke HC' 
              : 'Persetujuan cuti diberikan oleh Direksi & diteruskan ke HC')
      });
    } else if (leave.stage === 'HC_REVIEW' || leave.stage === 'HC_FINAL' || nextStage === 'APPROVED') {
      const hcLevel = isHCDirect ? 2 : 3;
      leave.approvalHistory.push({
        stage: 'HC_FINAL',
        level: hcLevel,
        action: status === 'REJECTED' ? 'REJECTED' : 'APPROVED',
        actorName: `${user.name} (${user.roleLabel})`,
        actorRole: user.roleLabel,
        timestamp: realTimestamp,
        notes: status === 'REJECTED' 
          ? `Pengajuan cuti ditolak oleh Tim Human Capital` 
          : (leave.quotaDeductionType === 'NONE' 
             ? 'Disetujui penuh dengan Upah Penuh (Izin Khusus Pasal 15-16)' 
             : `Disetujui penuh & Kuota ${leave.quotaDeductionType} otomatis dipotong -${leave.duration} hari.`)
      });
    }

    leave.stage = nextStage;
    leave.status = status;

    if (nextStage === 'HC_REVIEW') {
      leave.approver = 'Tazkia Aulia (Human Capital)';
    } else if (status === 'APPROVED') {
      leave.approver = `Disetujui Penuh (${user.name} - ${user.roleLabel})`;
      
      const u = this.getUsers().find(usr => usr.id === leave.employeeId);
      const isCurrent = (this.data.currentUser.id === leave.employeeId);

      if (leave.quotaDeductionType === 'ANNUAL') {
        const deduct = Number(leave.duration) || 1;
        if (u) u.remainingAnnualLeave = Math.max(0, Math.round(((Number(u.remainingAnnualLeave) || 12) - deduct) * 10) / 10);
        if (isCurrent) this.data.currentUser.remainingAnnualLeave = Math.max(0, Math.round(((Number(this.data.currentUser.remainingAnnualLeave) || 12) - deduct) * 10) / 10);
      } else if (leave.quotaDeductionType === 'PERSONAL') {
        const deduct = Number(leave.duration) || 1;
        if (u) u.remainingPersonalLeave = Math.max(0, Math.round(((Number(u.remainingPersonalLeave) || 3) - deduct) * 10) / 10);
        if (isCurrent) this.data.currentUser.remainingPersonalLeave = Math.max(0, Math.round(((Number(this.data.currentUser.remainingPersonalLeave) || 3) - deduct) * 10) / 10);
      }
    }

    this.addLog(`${user.name} (${user.roleLabel}) memproses Cuti ${id} [${status}] pada ${realTimestamp}`, 'leave');
    this.save();

    // Background Cloud Sync & Email ke Pemohon Cuti
    setTimeout(() => {
      this.syncToSupabase('leaves', {
        id: leave.id,
        stage: leave.stage,
        status: leave.status,
        rejection_reason: leave.rejectionReason || null,
        approval_history: leave.approvalHistory
      });

      const applicant = this.getUsers().find(u => u.id === leave.employeeId);
      const applicantEmail = applicant ? applicant.email : null;
      if (applicantEmail) {
        const isApproved = (status === 'APPROVED');
        const isRejected = (status === 'REJECTED');
        this.notifyEmail({
          to: applicantEmail,
          recipientName: leave.employeeName,
          subject: `Status Permohonan Cuti (${leave.id}): ${isApproved ? 'DISETUJUI' : isRejected ? 'DITOLAK' : 'DIPROSES'}`,
          notificationType: isApproved ? 'LEAVE_APPROVED' : isRejected ? 'LEAVE_REJECTED' : 'LEAVE_SUBMITTED',
          title: `Permohonan Cuti Anda Telah ${isApproved ? 'Disetujui' : isRejected ? 'Ditolak' : 'Diverifikasi'}`,
          summaryText: `Permohonan ${leave.leaveType || leave.type} (${leave.duration} hari: ${leave.startDate} s.d ${leave.endDate}) telah diproses oleh ${user.name} (${user.roleLabel}).`,
          details: {
            'No. Permohonan': leave.id,
            'Jenis Cuti': leave.leaveType || leave.type,
            'Status': leave.status,
            'Diproses Oleh': `${user.name} (${user.roleLabel})`
          }
        });
      }
    }, 0);

    return true;
  }

  // =========================================================================
  // TIMESHEETS
  // =========================================================================

  getTimesheets() {
    return (this.data && Array.isArray(this.data.timesheets)) ? this.data.timesheets : INITIAL_DATABASE.timesheets;
  }

  getDefaultActivities() {
    return (this.data && Array.isArray(this.data.defaultActivities)) ? this.data.defaultActivities : INITIAL_DATABASE.defaultActivities;
  }

  addDefaultActivity(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!trimmed) return false;
    if (!Array.isArray(this.data.defaultActivities)) {
      this.data.defaultActivities = [...INITIAL_DATABASE.defaultActivities];
    }
    if (!this.data.defaultActivities.includes(trimmed)) {
      this.data.defaultActivities.push(trimmed);
      this.save();
      return true;
    }
    return false;
  }

  deleteDefaultActivity(name) {
    if (!name || typeof name !== 'string') return false;
    const trimmed = name.trim();
    if (!Array.isArray(this.data.defaultActivities)) {
      this.data.defaultActivities = [...(INITIAL_DATABASE.defaultActivities || [])];
    }
    const idx = this.data.defaultActivities.indexOf(trimmed);
    if (idx !== -1) {
      this.data.defaultActivities.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  clearAllDefaultActivities() {
    this.data.defaultActivities = [];
    this.save();
    return true;
  }

  checkTimesheetCollision(employeeId, date, startTime, endTime) {
    if (!startTime || !endTime) return { collision: false };
    const allTs = this.getTimesheets().filter(t => t.employeeId === employeeId && t.date === date);

    const toMinutes = (timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    const newStart = toMinutes(startTime);
    const newEnd = toMinutes(endTime);

    for (const ts of allTs) {
      if (!ts.startTime || !ts.endTime) continue;
      const existStart = toMinutes(ts.startTime);
      const existEnd = toMinutes(ts.endTime);

      if (Math.max(newStart, existStart) < Math.min(newEnd, existEnd)) {
        return { collision: true, conflictingEntry: ts };
      }
    }
    return { collision: false };
  }

  addTimesheet(tsData) {
    const user = this.getCurrentUser();
    const id = `TS-2026-W33-${String(this.getTimesheets().length + 1).padStart(2, '0')}`;
    const realTimestamp = getRealtimeTimestamp();
    
    const isSurveyor = (user.role === 'SURVEYOR' || user.role === 'PERWAKILAN_YAYASAN' || user.role === 'STAFF_OPERASIONAL');
    const status = isSurveyor ? 'APPROVED' : 'PENDING';
    const approver = isSurveyor ? 'Sistem Lapangan (Auto-Logged Mandiri)' : 'Tazkia Aulia (Human Capital)';

    const newTs = {
      id,
      employeeId: user.id,
      employeeName: user.name,
      role: user.role,
      department: user.department,
      status,
      approver,
      createdAt: realTimestamp,
      approvalHistory: [
        {
          stage: 'SUBMISSION',
          level: 1,
          action: 'SUBMITTED',
          actorName: user.name,
          actorRole: user.roleLabel || 'Karyawan',
          timestamp: realTimestamp,
          notes: `Aktivitas: "${tsData.activityPreset || tsData.activity}" (${tsData.hours} Jam: ${tsData.startTime} - ${tsData.endTime})`
        }
      ],
      ...tsData
    };

    if (isSurveyor) {
      newTs.approvalHistory.push({
        stage: 'HC_VALIDATION',
        level: 3,
        action: 'APPROVED',
        actorName: 'Sistem Lapangan (Auto-Logged Mandiri)',
        actorRole: 'Auto-Logged Mandiri',
        timestamp: realTimestamp,
        notes: 'Presensi jam kerja terverifikasi otomatis via koordinat operasional lapangan.'
      });
    }

    if (!Array.isArray(this.data.timesheets)) this.data.timesheets = [];
    this.data.timesheets.unshift(newTs);
    this.addLog(`${user.name} mencatat log kerja: ${tsData.activityPreset || 'Aktivitas'} (${tsData.hours} Jam) [${status}] pada ${realTimestamp}`, 'timesheet');
    this.save();
    return newTs;
  }

  updateTimesheetStatus(id, status) {
    const ts = this.getTimesheets().find(t => t.id === id);
    if (!ts) return false;

    const user = this.getCurrentUser();
    const realTimestamp = getRealtimeTimestamp();
    if (!Array.isArray(ts.approvalHistory)) ts.approvalHistory = [];

    if (ts.approvalHistory.length === 0) {
      ts.approvalHistory.push({
        stage: 'SUBMISSION',
        level: 1,
        action: 'SUBMITTED',
        actorName: ts.employeeName,
        actorRole: ts.role ? ts.role.replace(/_/g, ' ') : 'Karyawan',
        timestamp: `${ts.date} ${ts.startTime || '08:00'}`,
        notes: `Aktivitas: "${ts.activityPreset || ts.activity}" (${ts.hours} Jam Kerja: ${ts.startTime} - ${ts.endTime})`
      });
    }

    ts.status = status;
    ts.approver = `${user.name} (${user.roleLabel})`;

    ts.approvalHistory.push({
      stage: 'HC_VALIDATION',
      level: 3,
      action: status,
      actorName: `${user.name} (${user.roleLabel})`,
      actorRole: user.roleLabel,
      timestamp: realTimestamp,
      notes: status === 'APPROVED' ? `Presensi ${ts.hours} jam kerja resmi divalidasi dan disahkan.` : 'Log presensi ditolak oleh Human Capital.'
    });

    this.addLog(`${user.name} (${user.roleLabel}) memvalidasi timesheet ${id} [${status}] pada ${realTimestamp}`, 'timesheet');
    this.save();
    return true;
  }

  deleteTimesheet(id) {
    if (!Array.isArray(this.data.timesheets)) return false;
    const idx = this.data.timesheets.findIndex(t => t.id === id);
    if (idx !== -1) {
      const deleted = this.data.timesheets.splice(idx, 1)[0];
      this.addLog(`${this.getCurrentUser().name} menghapus log timesheet: ${deleted.activityPreset || deleted.activity} (${deleted.startTime} - ${deleted.endTime})`, 'timesheet');
      this.save();
      return true;
    }
    return false;
  }

  // =========================================================================
  // PURCHASE REQUISITIONS (PR)
  // =========================================================================

  getItemRequests() {
    return (this.data && Array.isArray(this.data.itemRequests)) ? this.data.itemRequests : INITIAL_DATABASE.itemRequests;
  }

  addItemRequest(prData) {
    const user = this.getCurrentUser();
    const id = `PR-2026-0${this.getItemRequests().length + 44}`;
    const realTimestamp = getRealtimeTimestamp();
    
    const isManagerArea = (user.role === 'MANAGER_AREA');
    const stage = isManagerArea ? 'FINANCE_VERIFICATION' : 'MANAGER_APPROVAL';

    const newPR = {
      id,
      employeeId: user.id,
      employeeName: user.name,
      role: user.role,
      department: user.department,
      targetKitchen: prData.targetKitchen || null,
      stage,
      status: 'PENDING',
      createdAt: realTimestamp,
      approvalHistory: [
        {
          stage: 'SUBMISSION',
          level: 1,
          action: 'SUBMITTED',
          actorName: `${user.name} (${user.roleLabel})`,
          actorRole: user.roleLabel || 'Pemohon',
          timestamp: realTimestamp,
          notes: `Kebutuhan: "${prData.itemName}" (${prData.quantity} unit @ Rp ${Number(prData.unitPrice).toLocaleString('id-ID')}) — ${prData.reason || 'Kebutuhan operasional'}`
        }
      ],
      ...prData
    };

    if (!Array.isArray(this.data.itemRequests)) this.data.itemRequests = [];
    this.data.itemRequests.unshift(newPR);
    this.addLog(`${user.name} mengajukan Purchase Request ${newPR.id} (${newPR.itemName} · Rp ${Number(newPR.totalPrice).toLocaleString('id-ID')}) pada ${realTimestamp}`, 'procurement');
    this.save();

    // Background Cloud Sync & Notifikasi Email
    setTimeout(() => {
      this.syncToSupabase('item_requests', {
        id: newPR.id,
        employee_id: newPR.employeeId,
        employee_name: newPR.employeeName,
        role: newPR.role,
        department: newPR.department,
        item_name: newPR.itemName,
        category: newPR.category,
        quantity: newPR.quantity,
        unit_price: newPR.unitPrice,
        total_price: newPR.totalPrice,
        urgency: newPR.urgency,
        reason: newPR.reason,
        target_kitchen: newPR.targetKitchen,
        attachment_url: newPR.attachmentUrl,
        attachment_name: newPR.attachmentName,
        stage: newPR.stage,
        status: newPR.status,
        approval_history: newPR.approvalHistory
      });

      // Kirim Notifikasi Email ke Manajer Area / Direksi secara dinamis
      let approverUser = null;
      if (isManagerArea) {
        approverUser = this.getUsers().find(u => (u.id === 'DO-002' || u.name.includes('Alfaqih')) && u.role === 'DIREKTUR_OPERASIONAL') ||
                       this.getUsers().find(u => u.role === 'DIREKTUR_OPERASIONAL') || 
                       this.getUsers().find(u => u.role === 'DIREKTUR_KEUANGAN');
      } else {
        const kitchen = (this.data && this.data.kitchens) ? this.data.kitchens.find(k => (k.nama_dapur === newPR.targetKitchen || k.namaDapur === newPR.targetKitchen)) : null;
        if (kitchen && kitchen.manager_area) {
          approverUser = this.getUsers().find(u => kitchen.manager_area.includes(u.name));
        }
        if (!approverUser) {
          approverUser = this.getUsers().find(u => u.role === 'MANAGER_AREA') || 
                         this.getUsers().find(u => (u.id === 'DO-002' || u.name.includes('Alfaqih')) && u.role === 'DIREKTUR_OPERASIONAL') ||
                         this.getUsers().find(u => u.role === 'DIREKTUR_OPERASIONAL');
        }
      }

      const approverEmail = approverUser ? approverUser.email : 'alfaqih1108@gmail.com';
      const approverName = approverUser ? approverUser.name : 'Muhammad Alfaqih (Direktur Operasional)';

      this.notifyEmail({
        to: approverEmail,
        recipientName: approverName,
        subject: `Permintaan Pengadaan Barang Baru (${newPR.id})`,
        notificationType: 'PR_SUBMITTED',
        title: 'Pengajuan Purchase Requisition (PR) Baru',
        summaryText: `${user.name} (${user.roleLabel}) telah mengajukan pengadaan barang untuk ${newPR.targetKitchen}. Mohon untuk meninjau dan memvalidasi permintaan ini.`,
        details: {
          'No. Pengajuan': newPR.id,
          'Pemohon': `${user.name} (${user.roleLabel})`,
          'Nama Barang': newPR.itemName,
          'Jumlah': `${newPR.quantity} Unit`,
          'Estimasi Biaya': `Rp ${Number(newPR.totalPrice).toLocaleString('id-ID')}`,
          'Target Dapur': newPR.targetKitchen,
          'Tingkat Urgensi': newPR.urgency
        }
      });
    }, 0);

    return newPR;
  }

  advanceItemRequestStage(id, nextStage, finalStatus = 'PENDING', adjustmentData = null) {
    const pr = this.getItemRequests().find(p => p.id === id);
    if (!pr) return false;

    const user = this.getCurrentUser();
    const realTimestamp = getRealtimeTimestamp();
    if (!Array.isArray(pr.approvalHistory)) pr.approvalHistory = [];

    // Pastikan Level 1 ada di riwayat
    if (pr.approvalHistory.length === 0) {
      pr.approvalHistory.push({
        stage: 'SUBMISSION',
        level: 1,
        action: 'SUBMITTED',
        actorName: pr.employeeName,
        actorRole: pr.role ? pr.role.replace(/_/g, ' ') : 'Pemohon',
        timestamp: pr.createdAt || realTimestamp,
        notes: `Kebutuhan: "${pr.itemName}" (${pr.originalQuantity || pr.quantity} unit) — ${pr.reason || 'Kebutuhan operasional'}`
      });
    }

    const isManagerRequester = (pr.role === 'MANAGER_AREA' || pr.role === 'MANAGER_KEUANGAN');

    // Simpan data lama jika ada penyesuaian dari Approver
    if (adjustmentData && (adjustmentData.newQty !== undefined || adjustmentData.newUnitPrice !== undefined)) {
      const oldQty = pr.quantity;
      const oldUnitPrice = pr.unitPrice;
      const oldTotalPrice = pr.totalPrice;

      const newQty = (adjustmentData.newQty !== undefined && adjustmentData.newQty > 0) ? Number(adjustmentData.newQty) : oldQty;
      const newUnitPrice = (adjustmentData.newUnitPrice !== undefined && adjustmentData.newUnitPrice > 0) ? Number(adjustmentData.newUnitPrice) : oldUnitPrice;
      const newTotalPrice = newQty * newUnitPrice;

      pr.originalQuantity = pr.originalQuantity || oldQty;
      pr.originalUnitPrice = pr.originalUnitPrice || oldUnitPrice;
      pr.originalTotalPrice = pr.originalTotalPrice || oldTotalPrice;

      pr.quantity = newQty;
      pr.unitPrice = newUnitPrice;
      pr.totalPrice = newTotalPrice;
      pr.hasAdjustment = true;

      if (!Array.isArray(pr.adjustments)) pr.adjustments = [];
      pr.adjustments.push({
        stage: pr.stage,
        adjustedBy: user.name,
        role: user.roleLabel,
        date: realTimestamp,
        oldQty,
        newQty,
        oldUnitPrice,
        newUnitPrice,
        oldTotalPrice,
        newTotalPrice,
        notes: adjustmentData.notes || 'Penyesuaian Qty dan Budget disetujui approver'
      });

      this.addLog(`${user.name} (${user.roleLabel}) menyetujui PR ${id} dengan penyesuaian: ${newQty} unit @ Rp ${newUnitPrice.toLocaleString('id-ID')} (Total: Rp ${newTotalPrice.toLocaleString('id-ID')}) pada ${realTimestamp}`, 'procurement');
    }

    // Catat approval history dengan real-time timestamp akurat
    if (pr.stage === 'MANAGER_APPROVAL') {
      pr.approvalHistory.push({
        stage: 'MANAGER_APPROVAL',
        level: 2,
        action: finalStatus === 'REJECTED' ? 'REJECTED' : 'APPROVED',
        actorName: `${user.name} (${user.roleLabel})`,
        actorRole: user.roleLabel,
        timestamp: realTimestamp,
        notes: finalStatus === 'REJECTED' ? `Ditolak oleh ${user.name}` : 'Kebutuhan telah divalidasi & disetujui untuk diteruskan ke Keuangan'
      });
    } else if (pr.stage === 'FINANCE_VERIFICATION') {
      pr.approvalHistory.push({
        stage: 'FINANCE_VERIFICATION',
        level: isManagerRequester ? 2 : 3,
        action: finalStatus === 'REJECTED' ? 'REJECTED' : adjustmentData ? 'ADJUSTED_AND_APPROVED' : 'APPROVED',
        actorName: `${user.name} (${user.roleLabel})`,
        actorRole: user.roleLabel,
        timestamp: realTimestamp,
        notes: finalStatus === 'REJECTED' 
          ? `Ditolak oleh ${user.name}` 
          : adjustmentData 
          ? `✓ Disetujui dengan penyesuaian: ${pr.quantity} unit @ Rp ${pr.unitPrice.toLocaleString('id-ID')} (Total: Rp ${pr.totalPrice.toLocaleString('id-ID')}). Catatan: "${adjustmentData.notes}"` 
          : 'Plafon anggaran terverifikasi sesuai pagu dana operasional',
        adjustment: adjustmentData
      });
    } else if (pr.stage === 'DIRECTOR_APPROVAL') {
      pr.approvalHistory.push({
        stage: 'DIRECTOR_APPROVAL',
        level: isManagerRequester ? 3 : 4,
        action: finalStatus === 'REJECTED' ? 'REJECTED' : 'APPROVED',
        actorName: `${user.name} (${user.roleLabel})`,
        actorRole: user.roleLabel,
        timestamp: realTimestamp,
        notes: finalStatus === 'REJECTED' 
          ? `Ditolak oleh ${user.name}` 
          : `Purchase Order resmi PO-${pr.id.replace('PR-', '')} telah diterbitkan dan siap dikirim ke vendor.`
      });
    }

    pr.stage = nextStage;
    pr.status = finalStatus;

    if (finalStatus === 'APPROVED') {
      this.addLog(`Purchase Order resmi diterbitkan untuk PR ${id} (${pr.itemName} - ${pr.quantity} Unit · Rp ${Number(pr.totalPrice).toLocaleString('id-ID')}) pada ${realTimestamp}`, 'procurement');
    }
    this.save();

    // Background Cloud Sync & Email ke Pemohon
    setTimeout(() => {
      this.syncToSupabase('item_requests', {
        id: pr.id,
        stage: pr.stage,
        status: pr.status,
        quantity: pr.quantity,
        unit_price: pr.unitPrice,
        total_price: pr.totalPrice,
        rejection_reason: pr.rejectionReason || null,
        approval_history: pr.approvalHistory
      });

      const applicant = this.getUsers().find(u => u.id === pr.employeeId);
      const applicantEmail = applicant ? applicant.email : null;
      if (applicantEmail) {
        const isApproved = (finalStatus === 'APPROVED');
        const isRejected = (finalStatus === 'REJECTED');
        this.notifyEmail({
          to: applicantEmail,
          recipientName: pr.employeeName,
          subject: `Update Status Pengadaan (${pr.id}): ${isApproved ? 'DISETUJUI' : isRejected ? 'DITOLAK' : 'PROSES APPROVAL'}`,
          notificationType: isApproved ? 'PR_APPROVED' : isRejected ? 'PR_REJECTED' : 'PR_SUBMITTED',
          title: `Status Pengajuan PR: ${isApproved ? 'Telah Disetujui Penuh' : isRejected ? 'Ditolak' : 'Diteruskan ke Tahap Selanjutnya'}`,
          summaryText: `Pengajuan barang "${pr.itemName}" (${pr.quantity} unit) telah diproses oleh ${user.name} (${user.roleLabel}).`,
          details: {
            'No. Pengajuan': pr.id,
            'Nama Barang': pr.itemName,
            'Status': pr.status,
            'Tahap Saat Ini': pr.stage,
            'Diproses Oleh': `${user.name} (${user.roleLabel})`
          }
        });
      }
    }, 0);

    return true;
  }

  deleteItemRequest(id) {
    if (!Array.isArray(this.data.itemRequests)) {
      this.data.itemRequests = [...(INITIAL_DATABASE.itemRequests || [])];
    }
    const idx = this.data.itemRequests.findIndex(p => p.id === id);
    if (idx !== -1) {
      const deletedPR = this.data.itemRequests.splice(idx, 1)[0];
      const user = this.getCurrentUser();
      const realTimestamp = getRealtimeTimestamp();
      this.addLog(`${user.name} (${user.roleLabel}) membatalkan/menghapus pengajuan Purchase Request ${deletedPR.id} (${deletedPR.itemName} · ${deletedPR.quantity} unit) pada ${realTimestamp}`, 'procurement');
      this.save();
      return true;
    }
    return false;
  }

  // =========================================================================
  // CASH ADVANCE (KASBON OPERASIONAL & SETTLEMENT LPJ)
  // =========================================================================

  getCashAdvances() {
    return (this.data && Array.isArray(this.data.cashAdvances)) ? this.data.cashAdvances : (INITIAL_DATABASE.cashAdvances || []);
  }

  getCashAdvanceById(id) {
    return this.getCashAdvances().find(c => c.id === id);
  }

  addCashAdvance(caData) {
    const user = this.getCurrentUser();
    const realTimestamp = getRealtimeTimestamp();
    const id = `CA-2026-${String(this.getCashAdvances().length + 1).padStart(3, '0')}`;

    const newCA = {
      id,
      title: caData.title || 'Pengajuan Kasbon Operasional',
      employeeId: user.id,
      employeeName: user.name,
      employeeNika: user.nika,
      employeeRole: user.role,
      department: user.department || 'Operasional Lapangan',
      category: caData.category || 'Operasional Lapangan',
      targetLocation: caData.targetLocation || 'Wilayah Operasional',
      amountRequested: Number(caData.amountRequested) || 0,
      amountApproved: Number(caData.amountRequested) || 0,
      amountDisbursed: 0,
      usagePlanDate: caData.usagePlanDate || realTimestamp.split(' ')[0],
      settlementPlanDate: caData.settlementPlanDate || realTimestamp.split(' ')[0],
      bankName: caData.bankName || user.bankName || 'Bank Mandiri',
      bankAccountNo: caData.bankAccountNo || user.rekeningNo || '-',
      bankAccountName: caData.bankAccountName || user.rekeningName || user.name,
      reason: caData.reason || 'Kebutuhan dana tunai operasional mendesak',
      stage: 'DIRECTOR_REVIEW', // Step 1: In Director Review
      status: 'PENDING',
      createdAt: realTimestamp,
      disbursementDetails: null,
      settlement: null,
      approvalHistory: [
        {
          stage: 'SUBMISSION',
          level: 1,
          action: 'SUBMITTED',
          actorName: user.name,
          actorRole: user.roleLabel,
          timestamp: realTimestamp,
          notes: `Pengajuan Kasbon: Rp ${Number(caData.amountRequested).toLocaleString('id-ID')} untuk "${caData.title}"`
        }
      ]
    };

    if (!Array.isArray(this.data.cashAdvances)) this.data.cashAdvances = [];
    this.data.cashAdvances.unshift(newCA);
    this.addLog(`${user.name} mengajukan Cash Advance ${id} (Rp ${Number(caData.amountRequested).toLocaleString('id-ID')}) pada ${realTimestamp}`, 'procurement');
    this.save();
    return newCA;
  }

  approveCashAdvanceDirector(id, decisionData = {}) {
    const user = this.getCurrentUser();
    const ca = this.getCashAdvanceById(id);
    if (!ca) return false;

    const realTimestamp = getRealtimeTimestamp();
    const isApproved = decisionData.action === 'APPROVED';
    const isAdjusted = Boolean(decisionData.adjustedAmount && Number(decisionData.adjustedAmount) !== Number(ca.amountRequested));

    if (isApproved) {
      if (isAdjusted) {
        ca.amountApproved = Number(decisionData.adjustedAmount);
      }
      ca.stage = 'FAT_DISBURSEMENT';
      ca.status = 'PENDING';

      ca.approvalHistory.push({
        stage: 'DIRECTOR_APPROVAL',
        level: 2,
        action: isAdjusted ? 'ADJUSTED_AND_APPROVED' : 'APPROVED',
        actorName: `${user.name} (${user.roleLabel})`,
        actorRole: user.roleLabel,
        timestamp: realTimestamp,
        notes: isAdjusted 
          ? `Disetujui dengan penyesuaian plafon: Rp ${Number(ca.amountApproved).toLocaleString('id-ID')} (Semula Rp ${Number(ca.amountRequested).toLocaleString('id-ID')}). Catatan: "${decisionData.notes || '-'}"`
          : `Disetujui penuh oleh Direksi. Catatan: "${decisionData.notes || '-'}"`
      });

      this.addLog(`${user.name} menyetujui Cash Advance ${id} (Rp ${Number(ca.amountApproved).toLocaleString('id-ID')}) untuk pencairan FAT`, 'procurement');
    } else {
      ca.stage = 'REJECTED';
      ca.status = 'REJECTED';

      ca.approvalHistory.push({
        stage: 'DIRECTOR_APPROVAL',
        level: 2,
        action: 'REJECTED',
        actorName: `${user.name} (${user.roleLabel})`,
        actorRole: user.roleLabel,
        timestamp: realTimestamp,
        notes: `Ditolak oleh ${user.name}. Alasan: "${decisionData.notes || 'Kebutuhan belum memenuhi syarat pengajuan kasbon'}"`
      });

      this.addLog(`${user.name} menolak Cash Advance ${id} pada ${realTimestamp}`, 'procurement');
    }

    this.save();
    return true;
  }

  disburseCashAdvanceFAT(id, disburseData = {}) {
    const user = this.getCurrentUser();
    const ca = this.getCashAdvanceById(id);
    if (!ca) return false;

    const realTimestamp = getRealtimeTimestamp();
    const disbursedAmount = ca.amountApproved || ca.amountRequested;
    ca.amountDisbursed = disbursedAmount;
    ca.stage = 'DISBURSED';
    ca.status = 'DISBURSED';

    ca.disbursementDetails = {
      disbursedAt: realTimestamp,
      disbursedBy: `${user.name} (${user.roleLabel})`,
      bankRefNo: disburseData.bankRefNo || `TRF-FAT-${Date.now().toString().slice(-6)}`,
      proofUrl: disburseData.proofUrl || null,
      notes: disburseData.notes || 'Dana berhasil ditransfer ke rekening pemohon.'
    };

    ca.approvalHistory.push({
      stage: 'FAT_DISBURSEMENT',
      level: 3,
      action: 'DISBURSED',
      actorName: `${user.name} (${user.roleLabel})`,
      actorRole: user.roleLabel,
      timestamp: realTimestamp,
      notes: `Dana kasbon sebesar Rp ${Number(disbursedAmount).toLocaleString('id-ID')} telah ditransfer ke ${ca.bankName} (${ca.bankAccountNo} a.n ${ca.bankAccountName}). No. Ref: ${ca.disbursementDetails.bankRefNo}`
    });

    this.addLog(`FAT (${user.name}) mencairkan dana Cash Advance ${id} (Rp ${Number(disbursedAmount).toLocaleString('id-ID')}) pada ${realTimestamp}`, 'procurement');
    this.save();
    return true;
  }

  submitCashAdvanceSettlement(id, settlementData) {
    const user = this.getCurrentUser();
    const ca = this.getCashAdvanceById(id);
    if (!ca) return false;

    const realTimestamp = getRealtimeTimestamp();
    const items = Array.isArray(settlementData.items) ? settlementData.items : [];
    const totalSpent = items.reduce((acc, item) => acc + (Number(item.qty || 1) * Number(item.unitPrice || 0)), 0);
    const amountReceived = ca.amountDisbursed || ca.amountApproved || ca.amountRequested;
    
    // Perhitungan otomatis selisih dana
    const refundAmount = Math.max(0, amountReceived - totalSpent); // Dana lebih yg harus dikembalikan ke Yayasan
    const reimburseAmount = Math.max(0, totalSpent - amountReceived); // Dana kurang yg harus diganti Yayasan

    ca.settlement = {
      submittedAt: realTimestamp,
      submittedBy: user.name,
      totalSpent,
      refundAmount,
      reimburseAmount,
      items,
      proofFiles: settlementData.proofFiles || [],
      refundProofUrl: settlementData.refundProofUrl || null,
      notes: settlementData.notes || ''
    };

    ca.stage = 'SETTLEMENT_SUBMITTED';
    ca.status = 'SETTLEMENT_PENDING';

    let settlementSummary = `Realisasi Belanja: Rp ${totalSpent.toLocaleString('id-ID')} (${items.length} item). `;
    if (refundAmount > 0) {
      settlementSummary += `Dana sisa yang harus dikembalikan ke Yayasan: Rp ${refundAmount.toLocaleString('id-ID')}.`;
    } else if (reimburseAmount > 0) {
      settlementSummary += `Kekurangan dana (Reimbursement oleh Yayasan): Rp ${reimburseAmount.toLocaleString('id-ID')}.`;
    } else {
      settlementSummary += `Pengeluaran tepat sesuai kasbon (Rp 0 selisih).`;
    }

    ca.approvalHistory.push({
      stage: 'SETTLEMENT_SUBMISSION',
      level: 4,
      action: 'SETTLEMENT_SUBMITTED',
      actorName: user.name,
      actorRole: user.roleLabel,
      timestamp: realTimestamp,
      notes: settlementSummary
    });

    this.addLog(`${user.name} mengirimkan laporan LPJ Realisasi Cash Advance ${id} (Total Belanja: Rp ${totalSpent.toLocaleString('id-ID')}) pada ${realTimestamp}`, 'procurement');
    this.save();
    return true;
  }

  verifyCashAdvanceSettlementFAT(id, verifyData = {}) {
    const user = this.getCurrentUser();
    const ca = this.getCashAdvanceById(id);
    if (!ca) return false;

    const realTimestamp = getRealtimeTimestamp();
    ca.stage = 'SETTLED';
    ca.status = 'SETTLED';

    ca.approvalHistory.push({
      stage: 'SETTLEMENT_VERIFIED',
      level: 4,
      action: 'SETTLED',
      actorName: `${user.name} (${user.roleLabel})`,
      actorRole: user.roleLabel,
      timestamp: realTimestamp,
      notes: `Laporan Realisasi & Bukti Nota telah diverifikasi sah oleh Tim FAT. Transaksi Kasbon resmi ditutup (SETTLED). Catatan: "${verifyData.notes || 'Kwitansi dan sisa dana telah sesuai'}"`
    });

    this.addLog(`FAT (${user.name}) memverifikasi dan menutup transaksi Cash Advance ${id} (SETTLED) pada ${realTimestamp}`, 'procurement');
    this.save();
    return true;
  }

  // =========================================================================
  // LAPORAN KENDALA HARIAN LAPANGAN (PERWAKILAN YAYASAN -> MANAGER AREA)
  // =========================================================================
  getFieldIssues() {
    const raw = (this.data && Array.isArray(this.data.fieldIssues)) ? this.data.fieldIssues : (INITIAL_DATABASE.fieldIssues || []);
    return raw.map(issue => {
      if (Array.isArray(issue.points)) {
        issue.points = issue.points.map((pt, idx) => {
          if (typeof pt === 'string') {
            return {
              id: `PT-${idx + 1}`,
              text: pt,
              status: issue.status === 'FOLLOWED_UP' ? 'SUDAH_SELESAI' : 'BELUM_DIRESPON',
              response: issue.managerResponse || null,
              respondedAt: issue.managerRespondedAt || null,
              respondedBy: issue.managerRespondedBy || null
            };
          }
          return pt;
        });
      }
      return issue;
    });
  }

  getFieldIssueById(id) {
    return this.getFieldIssues().find(f => f.id === id);
  }

  getFieldIssuesForUser(userId) {
    return this.getFieldIssues().filter(f => f.authorId === userId);
  }

  getFieldIssuesForDate(date) {
    return this.getFieldIssues().filter(f => f.date === date);
  }

  addFieldIssue(issueData) {
    const user = this.getCurrentUser();
    const realTimestamp = getRealtimeTimestamp();
    const allIssues = this.getFieldIssues();
    const id = `KDL-2026-${String(allIssues.length + 1).padStart(3, '0')}`;

    let points = [];
    if (Array.isArray(issueData.points) && issueData.points.length > 0) {
      points = issueData.points.map((p, idx) => {
        if (typeof p === 'object' && p.text) {
          return {
            id: p.id || `PT-${idx + 1}`,
            text: p.text.trim(),
            status: p.status || 'BELUM_DIRESPON',
            response: p.response || null,
            respondedAt: p.respondedAt || null,
            respondedBy: p.respondedBy || null
          };
        }
        return {
          id: `PT-${idx + 1}`,
          text: String(p).trim(),
          status: 'BELUM_DIRESPON',
          response: null,
          respondedAt: null,
          respondedBy: null
        };
      }).filter(p => p.text.length > 0);
    } else if (issueData.pointsText) {
      points = issueData.pointsText
        .split('\n')
        .map(line => line.replace(/^[\s•\-\*\d\.\:\)]+/, '').trim())
        .filter(p => p.length > 0)
        .map((p, idx) => ({
          id: `PT-${idx + 1}`,
          text: p,
          status: 'BELUM_DIRESPON',
          response: null,
          respondedAt: null,
          respondedBy: null
        }));
    }

    if (points.length === 0) {
      points = [{
        id: 'PT-1',
        text: 'Kendala operasional dicatat oleh Perwakilan Yayasan di lapangan.',
        status: 'BELUM_DIRESPON',
        response: null,
        respondedAt: null,
        respondedBy: null
      }];
    }

    const newIssue = {
      id,
      date: issueData.date || realTimestamp.split(' ')[0],
      createdAt: realTimestamp,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.roleLabel || 'Perwakilan Yayasan',
      department: user.department || 'Yayasan - Lapangan',
      kitchenId: issueData.kitchenId || 'DAPUR-01',
      kitchenIdSppg: issueData.kitchenIdSppg || 'SPPG-JKT-01',
      kitchenName: issueData.kitchenName || 'Dapur Sentral Harmoni Tebet',
      formatType: issueData.formatType || 'BULLET', // 'BULLET' or 'NUMBER'
      points: points,
      status: 'PENDING'
    };

    if (!Array.isArray(this.data.fieldIssues)) this.data.fieldIssues = [];
    this.data.fieldIssues.unshift(newIssue);
    this.addLog(`${user.name} melaporkan kendala lapangan ${id} (${points.length} Poin) untuk ${newIssue.kitchenName} pada ${realTimestamp}`, 'kitchen');
    this.save();
    return newIssue;
  }

  updateIssuePointStatus(issueId, pointId, newStatus, responseText = null) {
    const user = this.getCurrentUser();
    const issue = this.getFieldIssueById(issueId);
    if (!issue || !Array.isArray(issue.points)) return false;

    const point = issue.points.find(p => p.id === pointId || (typeof p === 'object' && p.id === pointId));
    if (!point) return false;

    const realTimestamp = getRealtimeTimestamp();
    point.status = newStatus; // 'BELUM_DIRESPON', 'SUDAH_DIRESPON', 'SUDAH_DITANGGAPI', 'SUDAH_SELESAI'
    if (responseText !== null && responseText !== undefined) {
      point.response = responseText;
    }
    point.respondedAt = realTimestamp;
    point.respondedBy = `${user.name} (${user.roleLabel})`;

    // Re-evaluate overall issue status
    const allDone = issue.points.every(p => p.status === 'SUDAH_SELESAI');
    const anyAction = issue.points.some(p => p.status === 'SUDAH_DITANGGAPI' || p.status === 'SUDAH_DIRESPON' || p.status === 'SUDAH_SELESAI');

    if (allDone) {
      issue.status = 'FOLLOWED_UP';
    } else if (anyAction) {
      issue.status = 'IN_PROGRESS';
    } else {
      issue.status = 'PENDING';
    }

    const statusLabel = newStatus === 'SUDAH_SELESAI' ? 'Sudah Selesai' : newStatus === 'SUDAH_DITANGGAPI' ? 'Sudah Ditanggapi' : newStatus === 'SUDAH_DIRESPON' ? 'Sudah Direspon' : 'Belum Direspon';
    this.addLog(`Manager Area (${user.name}) memperbarui status poin kendala di ${issue.kitchenName} menjadi "${statusLabel}" pada ${realTimestamp}`, 'kitchen');
    this.save();
    return true;
  }

  respondFieldIssue(id, responseData = {}) {
    const user = this.getCurrentUser();
    const issue = this.getFieldIssueById(id);
    if (!issue) return false;

    const realTimestamp = getRealtimeTimestamp();
    const response = responseData.response || responseData.notes || 'Telah ditinjau dan ditindaklanjuti oleh Manager Area.';
    
    // Mark all pending points as SUDAH_SELESAI or SUDAH_DITANGGAPI
    if (Array.isArray(issue.points)) {
      issue.points.forEach(p => {
        if (p.status !== 'SUDAH_SELESAI') {
          p.status = 'SUDAH_DITANGGAPI';
          p.response = response;
          p.respondedAt = realTimestamp;
          p.respondedBy = `${user.name} (${user.roleLabel})`;
        }
      });
    }

    issue.status = 'IN_PROGRESS';
    this.addLog(`Manager Area (${user.name}) memberikan tanggapan kendala lapangan ${id} (${issue.kitchenName}) pada ${realTimestamp}`, 'kitchen');
    this.save();
    return true;
  }

  deleteFieldIssue(id) {
    if (!Array.isArray(this.data.fieldIssues)) return false;
    const idx = this.data.fieldIssues.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.data.fieldIssues.splice(idx, 1);
      this.save();
      return true;
    }
    return false;
  }

  // =========================================================================
  // UNIVERSAL APPROVAL TRACKER & AUDIT TRAIL DETAILS
  // =========================================================================
  getApprovalTrackerDetails(type, id) {
    if (!type || !id) return null;
    const typeUpper = type.toUpperCase();

    // 1. PENGADAAN BARANG (PR)
    if (typeUpper === 'PR' || typeUpper === 'PENGAJUAN') {
      const pr = this.getItemRequests().find(p => p.id === id);
      if (!pr) return null;

      const isManagerRequester = (pr.role === 'MANAGER_AREA' || pr.role === 'MANAGER_KEUANGAN');
      const history = Array.isArray(pr.approvalHistory) ? pr.approvalHistory : [];
      const steps = [];

      // Step 1: Submission
      const hist1 = history.find(h => h.level === 1 || h.stage === 'SUBMISSION');
      steps.push({
        level: 1,
        title: 'Pengajuan Purchase Requisition (PR)',
        subtitle: 'Inisiasi Permintaan Barang',
        actorName: hist1 ? hist1.actorName : pr.employeeName,
        actorRole: hist1 ? hist1.actorRole : (pr.role ? pr.role.replace(/_/g, ' ') : 'Pemohon'),
        department: pr.department,
        timestamp: hist1 ? hist1.timestamp : pr.createdAt,
        status: 'COMPLETED',
        notes: hist1 ? hist1.notes : `Kebutuhan: "${pr.itemName}" (${pr.originalQuantity || pr.quantity} unit) — ${pr.reason || 'Kebutuhan operasional'}`
      });

      // Step 2: Manager Review (If requester is staff/surveyor/yayasan)
      if (!isManagerRequester) {
        const hist2 = history.find(h => h.stage === 'MANAGER_APPROVAL' || (h.level === 2 && h.stage !== 'SUBMISSION'));
        const isStep2Current = (pr.stage === 'MANAGER_APPROVAL' && pr.status === 'PENDING');
        const isStep2Rejected = (pr.stage === 'REJECTED' && !hist2);

        steps.push({
          level: 2,
          title: 'Review & Validasi Manager Divisi',
          subtitle: 'Verifikasi Urgensi & Justifikasi Kebutuhan Lapangan',
          actorName: hist2 ? hist2.actorName : (pr.department && pr.department.includes('Lapangan') ? 'Dian Ekawati / Bivaldie A.R. (Manajer Area)' : 'Viona (Manager Keuangan)'),
          actorRole: 'Manager Divisi',
          timestamp: hist2 ? hist2.timestamp : isStep2Current ? '⏳ Sedang Menunggu Review Manager' : isStep2Rejected ? pr.createdAt : '⚪ Menunggu Giliran',
          status: hist2 ? (hist2.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep2Rejected ? 'REJECTED' : isStep2Current ? 'ACTIVE' : 'UPCOMING',
          notes: hist2 ? hist2.notes : isStep2Current ? 'Dalam antrean review Manager Divisi' : 'Menunggu tahap sebelumnya'
        });
      }

      // Step 3: Finance & Budget Verification
      const targetLevel3 = isManagerRequester ? 2 : 3;
      const hist3 = history.find(h => h.stage === 'FINANCE_VERIFICATION' || (h.level === targetLevel3 && h.stage !== 'SUBMISSION' && h.stage !== 'MANAGER_APPROVAL'));
      const isStep3Current = (pr.stage === 'FINANCE_VERIFICATION' && pr.status === 'PENDING');
      const isStep3Rejected = (pr.stage === 'REJECTED' && !hist3 && (pr.stage === 'FINANCE_VERIFICATION'));
      const adj = (pr.adjustments && pr.adjustments.length > 0) ? pr.adjustments[0] : (hist3 ? hist3.adjustment : null);

      steps.push({
        level: targetLevel3,
        title: 'Verifikasi Anggaran Keuangan & FAT',
        subtitle: 'Pengecekan Plafon Biaya, Budget Satuan & Ketersediaan Dana',
        actorName: hist3 ? hist3.actorName : 'Sakhiyah Karomah Salam (Staf Ahli Keuangan) / Muhammad Imam Adamy (FAT)',
        actorRole: 'Staf Ahli Keuangan & FAT Officer',
        timestamp: hist3 ? hist3.timestamp : isStep3Current ? '⏳ Sedang Menunggu Verifikasi Anggaran' : isStep3Rejected ? pr.createdAt : '⚪ Menunggu Giliran',
        status: hist3 ? (hist3.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep3Rejected ? 'REJECTED' : isStep3Current ? 'ACTIVE' : 'UPCOMING',
        notes: hist3 
          ? hist3.notes 
          : isStep3Current ? 'Sedang diverifikasi ketersediaan dana kas operasional' : 'Menunggu tahap sebelumnya',
        adjustment: adj
      });

      // Step 4: Executive Approval & PO Issuance
      const targetLevel4 = isManagerRequester ? 3 : 4;
      const hist4 = history.find(h => h.stage === 'DIRECTOR_APPROVAL' || (h.level === targetLevel4 && h.stage !== 'SUBMISSION' && h.stage !== 'MANAGER_APPROVAL' && h.stage !== 'FINANCE_VERIFICATION'));
      const isStep4Current = (pr.stage === 'DIRECTOR_APPROVAL' && pr.status === 'PENDING');
      const isStep4Rejected = (pr.stage === 'REJECTED' && !hist4 && pr.stage === 'DIRECTOR_APPROVAL');

      steps.push({
        level: targetLevel4,
        title: 'Persetujuan Direksi & Penerbitan PO',
        subtitle: 'Otorisasi Final & Penerbitan Purchase Order Resmi',
        actorName: hist4 ? hist4.actorName : 'Kody Suryo Nugroho (Direktur Keuangan) / Rochmad (Direktur Utama)',
        actorRole: 'Direksi Eksekutif',
        timestamp: hist4 ? hist4.timestamp : isStep4Current ? '⏳ Sedang Menunggu Pengesahan Direksi' : isStep4Rejected ? pr.createdAt : '⚪ Menunggu Giliran',
        status: hist4 ? (hist4.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep4Rejected ? 'REJECTED' : isStep4Current ? 'ACTIVE' : 'UPCOMING',
        notes: hist4 ? hist4.notes : isStep4Current ? 'Menunggu pengesahan Direktur' : 'Menunggu tahap sebelumnya'
      });

      return {
        type: 'PR',
        id: pr.id,
        title: pr.itemName,
        category: pr.category,
        urgency: pr.urgency,
        quantity: pr.quantity,
        unitPrice: pr.unitPrice,
        totalPrice: pr.totalPrice,
        originalQuantity: pr.originalQuantity,
        originalUnitPrice: pr.originalUnitPrice,
        originalTotalPrice: pr.originalTotalPrice,
        hasAdjustment: pr.hasAdjustment || false,
        adjustments: pr.adjustments || [],
        targetKitchen: pr.targetKitchen,
        requester: `${pr.employeeName} (${pr.department})`,
        stage: pr.stage,
        status: pr.status,
        steps
      };
    }

    // 2. CUTI & IZIN (LEAVE)
    if (typeUpper === 'LEAVE' || typeUpper === 'CUTI') {
      const leave = this.getLeaves().find(l => l.id === id);
      if (!leave) return null;

      const isFinance = (leave.approvalFlow === 'FINANCE_TIER');
      const isManagerTier = (leave.approvalFlow === 'MANAGER_TIER');
      const isHCDirect = (leave.approvalFlow === 'HC_DIRECT');
      const history = Array.isArray(leave.approvalHistory) ? leave.approvalHistory : [];
      const steps = [];

      // Step 1: Submission (Semua Role)
      const hist1 = history.find(h => h.level === 1 || h.stage === 'SUBMISSION');
      steps.push({
        level: 1,
        title: 'Pengajuan Cuti / Izin Mandiri',
        subtitle: 'Pengisian Formulir Karyawan Sesuai Ketentuan',
        actorName: hist1 ? hist1.actorName : leave.employeeName,
        actorRole: hist1 ? hist1.actorRole : (leave.role ? leave.role.replace(/_/g, ' ') : 'Karyawan'),
        department: leave.department,
        timestamp: hist1 ? hist1.timestamp : leave.createdAt,
        status: 'COMPLETED',
        notes: hist1 ? hist1.notes : `Permohonan: ${leave.type} (${leave.duration} hari kerja: ${leave.startDate} s.d ${leave.endDate}). Alasan: "${leave.reason || '-'}"`
      });

      // SKENARIO A: Jalur Langsung HC (Perwakilan Yayasan, Staff Operasional, Surveyor, Maker Yayasan)
      if (isHCDirect) {
        const histHC = history.find(h => h.stage === 'HC_FINAL' || h.stage === 'HC_REVIEW' || h.level === 2);
        const isCurrent = (leave.status === 'PENDING' && (leave.stage === 'HC_REVIEW' || leave.stage === 'HC_FINAL'));
        const isRejected = (leave.status === 'REJECTED');

        steps.push({
          level: 2,
          title: 'Validasi & Pengesahan Human Capital',
          subtitle: 'Pencatatan HRIS, Kalender Kerja & Pengesahan Hak Cuti',
          actorName: histHC ? histHC.actorName : 'Tazkia Aulia (Human Capital & GA)',
          actorRole: 'Human Capital & GA',
          timestamp: histHC ? histHC.timestamp : isCurrent ? '⏳ Sedang Menunggu Validasi HC' : isRejected ? leave.createdAt : '⚪ Menunggu Giliran',
          status: histHC ? (histHC.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isRejected ? 'REJECTED' : isCurrent ? 'ACTIVE' : 'UPCOMING',
          notes: histHC 
            ? histHC.notes 
            : isCurrent ? 'Sedang diverifikasi kuota dan kelayakan oleh Tim Human Capital' : 'Menunggu verifikasi'
        });
      }
      // SKENARIO B: Tim Keuangan (FAT & Staff Ahli) -> Review Direktur Keuangan -> HC
      else if (isFinance) {
        const hist2 = history.find(h => h.level === 2 || h.stage === 'DIR_KEU_REVIEW');
        const isStep2Current = (leave.stage === 'DIR_KEU_REVIEW' && leave.status === 'PENDING');
        const isStep2Rejected = (leave.status === 'REJECTED' && !hist2 && leave.stage === 'DIR_KEU_REVIEW');

        steps.push({
          level: 2,
          title: 'Review & Persetujuan Direktur Keuangan',
          subtitle: 'Verifikasi Operasional & Jadwal Tim Finansial',
          actorName: hist2 ? hist2.actorName : 'Kody Suryo Nugroho (Direktur Keuangan)',
          actorRole: 'Direktur Keuangan',
          timestamp: hist2 ? hist2.timestamp : isStep2Current ? '⏳ Sedang Menunggu Persetujuan Direktur' : isStep2Rejected ? leave.createdAt : '⚪ Menunggu Giliran',
          status: hist2 ? (hist2.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep2Rejected ? 'REJECTED' : isStep2Current ? 'ACTIVE' : 'UPCOMING',
          notes: hist2 ? hist2.notes : isStep2Current ? 'Menunggu telaah Direktur Keuangan' : 'Menunggu tahap sebelumnya'
        });

        const hist3 = history.find(h => h.level === 3 || h.stage === 'HC_FINAL');
        const isStep3Current = ((leave.stage === 'HC_FINAL' || leave.stage === 'HC_REVIEW') && leave.status === 'PENDING');
        const isStep3Rejected = (leave.status === 'REJECTED' && leave.stage === 'HC_FINAL');

        steps.push({
          level: 3,
          title: 'Pengesahan & Pemotongan Kuota Human Capital',
          subtitle: 'Pencatatan HRIS, Kalender Kerja & Hak Cuti Normatif',
          actorName: hist3 ? hist3.actorName : 'Tazkia Aulia (Human Capital & GA)',
          actorRole: 'Human Capital & GA',
          timestamp: hist3 ? hist3.timestamp : isStep3Current ? '⏳ Sedang Menunggu Validasi HC' : isStep3Rejected ? leave.createdAt : '⚪ Menunggu Giliran',
          status: hist3 ? (hist3.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep3Rejected ? 'REJECTED' : isStep3Current ? 'ACTIVE' : 'UPCOMING',
          notes: hist3 ? hist3.notes : isStep3Current ? 'Sedang divalidasi oleh Tim Human Capital' : 'Menunggu persetujuan Direktur Keuangan'
        });
      }
      // SKENARIO C: Manajerial (Manager Area, Manager Keuangan, HC) -> Direksi -> Final HC
      else {
        const hist2 = history.find(h => h.level === 2 || h.stage === 'DIR_OPS_OR_KEU_REVIEW' || h.stage === 'MANAGER_REVIEW');
        const isStep2Current = ((leave.stage === 'DIR_OPS_OR_KEU_REVIEW' || leave.stage === 'MANAGER_REVIEW') && leave.status === 'PENDING');
        const isStep2Rejected = (leave.status === 'REJECTED' && !hist2);

        steps.push({
          level: 2,
          title: 'Persetujuan Direksi Eksekutif',
          subtitle: 'Verifikasi Operasional Manajerial Tingkat Wilayah',
          actorName: hist2 ? hist2.actorName : 'Muhammad Arrasyid (Direktur Operasional) / Kody Suryo Nugroho (Direktur Keuangan)',
          actorRole: 'Direksi Eksekutif',
          timestamp: hist2 ? hist2.timestamp : isStep2Current ? '⏳ Sedang Menunggu Persetujuan Direksi' : isStep2Rejected ? leave.createdAt : '⚪ Menunggu Giliran',
          status: hist2 ? (hist2.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep2Rejected ? 'REJECTED' : isStep2Current ? 'ACTIVE' : 'UPCOMING',
          notes: hist2 ? hist2.notes : isStep2Current ? 'Dalam antrean telaah Direksi Eksekutif' : 'Menunggu tahap sebelumnya'
        });

        const hist3 = history.find(h => h.level === 3 || h.stage === 'HC_FINAL');
        const isStep3Current = ((leave.stage === 'HC_FINAL' || leave.stage === 'HC_REVIEW') && leave.status === 'PENDING');
        const isStep3Rejected = (leave.status === 'REJECTED' && leave.stage === 'HC_FINAL');

        steps.push({
          level: 3,
          title: 'Pengesahan & Pencatatan Kalender Human Capital',
          subtitle: 'Pembaruan Database HRIS & Rekapitulasi Presensi',
          actorName: hist3 ? hist3.actorName : 'Tazkia Aulia (Human Capital & GA)',
          actorRole: 'Human Capital & GA',
          timestamp: hist3 ? hist3.timestamp : isStep3Current ? '⏳ Sedang Menunggu Validasi HC' : isStep3Rejected ? leave.createdAt : '⚪ Menunggu Giliran',
          status: hist3 ? (hist3.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep3Rejected ? 'REJECTED' : isStep3Current ? 'ACTIVE' : 'UPCOMING',
          notes: hist3 ? hist3.notes : isStep3Current ? 'Sedang divalidasi oleh Tim Human Capital' : 'Menunggu persetujuan Direksi'
        });
      }

      return {
        type: 'LEAVE',
        id: leave.id,
        title: leave.type,
        duration: leave.duration,
        startDate: leave.startDate,
        endDate: leave.endDate,
        quotaDeductionType: leave.quotaDeductionType,
        requester: `${leave.employeeName} (${leave.department})`,
        reason: leave.reason,
        stage: leave.stage,
        status: leave.status,
        steps
      };
    }

    // 3. TIMESHEET
    if (typeUpper === 'TIMESHEET' || typeUpper === 'TS') {
      const ts = this.getTimesheets().find(t => t.id === id);
      if (!ts) return null;

      const isSurveyor = (ts.role === 'SURVEYOR' || ts.role === 'PERWAKILAN_YAYASAN' || ts.role === 'STAFF_OPERASIONAL');
      const history = Array.isArray(ts.approvalHistory) ? ts.approvalHistory : [];
      const hist1 = history.find(h => h.level === 1 || h.stage === 'SUBMISSION');
      const hist3 = history.find(h => h.level === 3 || h.stage === 'HC_VALIDATION');
      const isPending = (ts.status === 'PENDING');
      const isRejected = (ts.status === 'REJECTED');

      const steps = [
        {
          level: 1,
          title: 'Pencatatan Log Kerja Harian',
          subtitle: 'Pengisian Aktivitas, Durasi & Detail Kegiatan',
          actorName: hist1 ? hist1.actorName : ts.employeeName,
          actorRole: hist1 ? hist1.actorRole : (ts.role ? ts.role.replace(/_/g, ' ') : 'Karyawan'),
          department: ts.department,
          timestamp: hist1 ? hist1.timestamp : `${ts.date} ${ts.startTime || '08:00'}`,
          status: 'COMPLETED',
          notes: hist1 ? hist1.notes : `Aktivitas: "${ts.activityPreset || ts.activity}" (${ts.hours} Jam Kerja: ${ts.startTime} - ${ts.endTime})`
        },
        {
          level: 2,
          title: 'Rekonsiliasi & Verifikasi Atasan Langsung',
          subtitle: 'Validasi Kepatuhan Jam Efektif & Output Kegiatan',
          actorName: isSurveyor ? 'Sistem Presensi Lapangan Mandiri' : 'Viona (Manager Keuangan)',
          actorRole: isSurveyor ? 'Auto-Logged Mandiri' : 'Atasan Langsung',
          timestamp: isSurveyor ? (hist1 ? hist1.timestamp : `${ts.date} ${ts.startTime || '08:00'}`) : (hist3 ? hist3.timestamp : isPending ? '⏳ Sedang Menunggu Verifikasi' : isRejected ? ts.date : '⚪ Menunggu Giliran'),
          status: (hist3 || isSurveyor) ? 'COMPLETED' : isPending ? 'ACTIVE' : isRejected ? 'REJECTED' : 'UPCOMING',
          notes: (hist3 || isSurveyor) ? 'Log jam kerja sesuai dengan jadwal dan target pekerjaan' : 'Sedang dalam antrean review atasan'
        },
        {
          level: 3,
          title: 'Validasi Presensi & Pengesahan Human Capital',
          subtitle: 'Sinkronisasi Rekapitulasi Presensi & Payroll HC',
          actorName: hist3 ? hist3.actorName : (isSurveyor ? 'Sistem Lapangan (Auto-Logged Mandiri)' : 'Tazkia Aulia (Human Capital & GA)'),
          actorRole: isSurveyor ? 'Auto-Logged Mandiri' : 'Human Capital & GA',
          timestamp: hist3 ? hist3.timestamp : isPending ? '⏳ Sedang Menunggu Pengesahan HC' : isRejected ? ts.date : '⚪ Menunggu Giliran',
          status: hist3 ? (hist3.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isPending ? 'ACTIVE' : isRejected ? 'REJECTED' : 'UPCOMING',
          notes: hist3 ? hist3.notes : isPending ? 'Menunggu validasi akhir Human Capital' : 'Menunggu tahap sebelumnya'
        }
      ];

      return {
        type: 'TIMESHEET',
        id: ts.id,
        title: ts.activityPreset || ts.activity,
        date: ts.date,
        hours: ts.hours,
        startTime: ts.startTime,
        endTime: ts.endTime,
        requester: `${ts.employeeName} (${ts.department})`,
        status: ts.status,
        steps
      };
    }

    // 4. CASH ADVANCE (KASBON OPERASIONAL & SETTLEMENT)
    if (typeUpper === 'CA' || typeUpper === 'CASH_ADVANCE' || typeUpper === 'KASBON') {
      const ca = this.getCashAdvances().find(c => c.id === id);
      if (!ca) return null;

      const history = Array.isArray(ca.approvalHistory) ? ca.approvalHistory : [];
      const steps = [];

      // Level 1: Submission
      const hist1 = history.find(h => h.level === 1 || h.stage === 'SUBMISSION');
      steps.push({
        level: 1,
        title: 'Pengajuan Permintaan Cash Advance',
        subtitle: 'Inisiasi Kebutuhan Dana Kasbon Operasional',
        actorName: hist1 ? hist1.actorName : ca.employeeName,
        actorRole: hist1 ? hist1.actorRole : (ca.employeeRole ? ca.employeeRole.replace(/_/g, ' ') : 'Pemohon'),
        department: ca.department,
        timestamp: hist1 ? hist1.timestamp : ca.createdAt,
        status: 'COMPLETED',
        notes: hist1 ? hist1.notes : `Pengajuan Kasbon: Rp ${Number(ca.amountRequested).toLocaleString('id-ID')} untuk "${ca.title}". Target: ${ca.targetLocation}. Rekening: ${ca.bankName} ${ca.bankAccountNo} a.n ${ca.bankAccountName}`
      });

      // Level 2: Director Approval
      const hist2 = history.find(h => h.level === 2 || h.stage === 'DIRECTOR_APPROVAL');
      const isStep2Current = (ca.stage === 'DIRECTOR_REVIEW' && ca.status === 'PENDING');
      const isStep2Rejected = (ca.stage === 'REJECTED' && !hist2);
      steps.push({
        level: 2,
        title: 'Otorisasi & Persetujuan Direksi',
        subtitle: 'Validasi Urgensi & Penetapan Plafon Kasbon oleh Direktur',
        actorName: hist2 ? hist2.actorName : 'Muhammad Arrasyid (Direktur Ops) / Kody Suryo Nugroho (Direktur Keu)',
        actorRole: 'Direktur Operasional / Keuangan',
        timestamp: hist2 ? hist2.timestamp : isStep2Current ? '⏳ Sedang Menunggu Otorisasi Direksi' : isStep2Rejected ? ca.createdAt : '⚪ Menunggu Giliran',
        status: hist2 ? (hist2.action === 'REJECTED' ? 'REJECTED' : 'COMPLETED') : isStep2Rejected ? 'REJECTED' : isStep2Current ? 'ACTIVE' : 'UPCOMING',
        notes: hist2 ? hist2.notes : isStep2Current ? 'Sedang ditelaah oleh Jajaran Direksi' : 'Menunggu tahap sebelumnya'
      });

      // Level 3: FAT Disbursement / Transfer
      const hist3 = history.find(h => h.level === 3 || h.stage === 'FAT_DISBURSEMENT');
      const isStep3Current = (ca.stage === 'FAT_DISBURSEMENT' && ca.status === 'PENDING');
      steps.push({
        level: 3,
        title: 'Pencairan & Transfer Dana Kas Operasional (FAT)',
        subtitle: 'Eksekusi Transfer Bank ke Rekening Pemohon oleh Finance & Accounting',
        actorName: hist3 ? hist3.actorName : 'Muhammad Imam Adamy (FAT Officer) / Sakhiyah Karomah Salam (Staf Ahli Keuangan)',
        actorRole: 'FAT Officer & Keuangan',
        timestamp: hist3 ? hist3.timestamp : isStep3Current ? '⏳ Menunggu Transfer Dana oleh FAT' : (ca.stage === 'REJECTED' ? '✕ Batal (Pengajuan Ditolak)' : '⚪ Menunggu Giliran'),
        status: hist3 ? 'COMPLETED' : isStep3Current ? 'ACTIVE' : (ca.stage === 'REJECTED' ? 'REJECTED' : 'UPCOMING'),
        notes: hist3 
          ? hist3.notes 
          : isStep3Current ? `Plafon Rp ${Number(ca.amountApproved || ca.amountRequested).toLocaleString('id-ID')} siap dicairkan ke rekening pemohon` : 'Menunggu otorisasi Direksi'
      });

      // Level 4: Settlement LPJ & Pengembalian Sisa Dana
      const hist4Sub = history.find(h => h.stage === 'SETTLEMENT_SUBMISSION');
      const hist4Ver = history.find(h => h.stage === 'SETTLEMENT_VERIFIED');
      const isWaitingLPJ = (ca.stage === 'DISBURSED' && ca.status === 'DISBURSED');
      const isLPJSubmitted = (ca.stage === 'SETTLEMENT_SUBMITTED' && ca.status === 'SETTLEMENT_PENDING');
      const isSettled = (ca.stage === 'SETTLED' || ca.status === 'SETTLED');

      let step4Notes = 'Menunggu pencairan kasbon';
      if (isWaitingLPJ) {
        step4Notes = 'Dana telah diterima pemohon. Menunggu penggunaan dana dan pengunggahan nota/kwitansi realisasi LPJ';
      } else if (isLPJSubmitted) {
        step4Notes = `Laporan LPJ dikirim oleh ${ca.settlement?.submittedBy || 'Pemohon'} (Total Realisasi: Rp ${Number(ca.settlement?.totalSpent || 0).toLocaleString('id-ID')}). Sedang diverifikasi Tim FAT.`;
      } else if (isSettled) {
        step4Notes = hist4Ver ? hist4Ver.notes : 'Laporan Realisasi & Nota Kwitansi Sah. Transaksi Kasbon Ditutup (Lunas & Selesai).';
      }

      steps.push({
        level: 4,
        title: 'Pelaporan Realisasi Belanja (LPJ) & Settlement Sisa Dana',
        subtitle: 'Unggah Kwitansi / Struk Nota & Rekonsiliasi Pengembalian / Reimbursement',
        actorName: isSettled ? (hist4Ver ? hist4Ver.actorName : 'FAT Officer') : (hist4Sub ? hist4Sub.actorName : `${ca.employeeName} (Pemohon)`),
        actorRole: isSettled ? 'FAT Officer' : 'Pemohon & FAT',
        timestamp: hist4Ver ? hist4Ver.timestamp : hist4Sub ? hist4Sub.timestamp : isWaitingLPJ ? '⏳ Menunggu Pemohon Mengunggah Nota LPJ' : '⚪ Menunggu Giliran',
        status: isSettled ? 'COMPLETED' : (isLPJSubmitted || isWaitingLPJ) ? 'ACTIVE' : 'UPCOMING',
        notes: step4Notes,
        settlement: ca.settlement || null
      });

      return {
        type: 'CA',
        id: ca.id,
        title: ca.title,
        category: ca.category,
        targetLocation: ca.targetLocation,
        amountRequested: ca.amountRequested,
        amountApproved: ca.amountApproved,
        amountDisbursed: ca.amountDisbursed,
        bankName: ca.bankName,
        bankAccountNo: ca.bankAccountNo,
        bankAccountName: ca.bankAccountName,
        requester: `${ca.employeeName} (${ca.department})`,
        reason: ca.reason,
        stage: ca.stage,
        status: ca.status,
        settlement: ca.settlement,
        steps
      };
    }

    return null;
  }

  getCatalog() {
    return (this.data && Array.isArray(this.data.catalog)) ? this.data.catalog : INITIAL_DATABASE.catalog;
  }

  getActivityLogs() {
    return (this.data && Array.isArray(this.data.activityLogs)) ? this.data.activityLogs : INITIAL_DATABASE.activityLogs;
  }

  addLog(text, type = 'general') {
    const time = new Date().toTimeString().slice(0, 5);
    const newLog = {
      id: Date.now(),
      text,
      time,
      type
    };
    if (!Array.isArray(this.data.activityLogs)) this.data.activityLogs = [];
    this.data.activityLogs.unshift(newLog);
    if (this.data.activityLogs.length > 30) this.data.activityLogs.pop();
    this.save();
  }

  getPendingApprovalsCount() {
    const user = this.getCurrentUser();
    const leaves = this.getLeaves();
    const timesheets = this.getTimesheets();
    const prs = this.getItemRequests();
    const cas = this.getCashAdvances();

    let count = 0;

    if (user.role === 'HUMAN_CAPITAL') {
      count += leaves.filter(l => l.status === 'PENDING' && (l.stage === 'HC_REVIEW' || l.stage === 'HC_FINAL')).length;
      count += timesheets.filter(t => t.status === 'PENDING').length;
    } else if (user.role === 'DIREKTUR_KEUANGAN') {
      count += leaves.filter(l => l.status === 'PENDING' && l.stage === 'DIR_KEU_REVIEW').length;
      count += prs.filter(p => p.status === 'PENDING' && p.stage === 'DIRECTOR_APPROVAL').length;
      count += cas.filter(c => c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW').length;
    } else if (user.role === 'DIREKTUR_OPERASIONAL') {
      count += leaves.filter(l => l.status === 'PENDING' && l.stage === 'DIR_OPS_OR_KEU_REVIEW').length;
      count += prs.filter(p => p.status === 'PENDING' && p.stage === 'DIRECTOR_APPROVAL').length;
      count += cas.filter(c => c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW').length;
    } else if (user.role === 'MANAGER_AREA') {
      count += prs.filter(p => p.status === 'PENDING' && p.stage === 'MANAGER_APPROVAL' && (p.role === 'SURVEYOR' || p.role === 'PERWAKILAN_YAYASAN' || p.role === 'STAFF_OPERASIONAL')).length;
    } else if (user.role === 'MANAGER_KEUANGAN') {
      count += prs.filter(p => p.status === 'PENDING' && p.stage === 'MANAGER_APPROVAL' && (p.role === 'FAT_OFFICER' || p.role === 'STAFF_AHLI_KEUANGAN')).length;
    } else if (user.role === 'STAFF_AHLI_KEUANGAN' || user.role === 'FAT_OFFICER') {
      count += prs.filter(p => p.status === 'PENDING' && p.stage === 'FINANCE_VERIFICATION').length;
      count += cas.filter(c => (c.status === 'PENDING' && c.stage === 'FAT_DISBURSEMENT') || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED')).length;
    } else if (user.role === 'DIREKTUR_UTAMA' || user.role === 'SUPER_ADMIN') {
      count += leaves.filter(l => l.status === 'PENDING').length;
      count += prs.filter(p => p.status === 'PENDING').length;
      count += cas.filter(c => (c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW') || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED')).length;
    }

    return count;
  }

  // =========================================================================
  // ORGANIZATIONAL STRUCTURE (DRAG & DROP & CONNECTIONS)
  // =========================================================================

  getOrgStructure() {
    if (this.data && this.data.orgStructure && Array.isArray(this.data.orgStructure.nodes) && Array.isArray(this.data.orgStructure.tiers)) {
      return this.data.orgStructure;
    }
    return JSON.parse(JSON.stringify(INITIAL_DATABASE.orgStructure));
  }

  saveOrgStructure(structureData) {
    if (!this.data) this.data = {};
    this.data.orgStructure = structureData;
    this.addLog('Human Capital menyimpan penyesuaian struktur organisasi & jalur koordinasi', 'hc');
    this.save();
    return true;
  }

  // =========================================================================
  // SUPABASE CLOUD SYNC & GMAIL NOTIFICATION HELPERS
  // =========================================================================

  async syncToSupabase(table, data, isUpsert = true) {
    if (!window.SupabaseConfig || !window.SupabaseConfig.isConfigured()) {
      console.warn('[Supabase Sync] Supabase belum dikonfigurasi.');
      return null;
    }

    const url = window.SupabaseConfig.getUrl().replace(/\/+$/, '');
    const key = window.SupabaseConfig.getAnonKey();

    try {
      console.log(`[Supabase Sync] Mengirim data ke tabel "${table}"...`, data.id || '');

      // 1. Coba via SDK jika tersedia
      const client = window.SupabaseConfig.getClient();
      if (client) {
        const res = isUpsert ? await client.from(table).upsert(data) : await client.from(table).insert(data);
        if (!res.error) {
          console.log(`✅ [Supabase Sync SDK] Berhasil ke tabel ${table}:`, data.id || '');
          return res;
        }
        console.warn(`⚠️ [Supabase Sync SDK Error] Tabel ${table}:`, res.error);
      }

      // 2. Direct HTTP REST PostgREST API (Fallback 100% Mandiri)
      const headers = {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': isUpsert ? 'resolution=merge-duplicates,return=representation' : 'return=representation'
      };

      const endpoint = `${url}/rest/v1/${table}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      });

      if (response.ok) {
        console.log(`✅ [Supabase Sync REST] Berhasil sinkronisasi ke tabel "${table}":`, data.id || '');
        return { success: true };
      } else {
        const errText = await response.text();
        console.error(`❌ [Supabase Sync REST Error] HTTP ${response.status} pada tabel ${table}:`, errText);
        return { error: errText };
      }
    } catch (e) {
      console.error(`❌ [Supabase Sync Exception] pada tabel ${table}:`, e);
      return null;
    }
  }

  // Sinkronkan 36 Akun Master Users ke Supabase agar Foreign Key Cuti & PR tidak error
  async syncMasterUsersToSupabase() {
    if (!window.SupabaseConfig || !window.SupabaseConfig.isConfigured()) return;
    try {
      const url = window.SupabaseConfig.getUrl().replace(/\/+$/, '');
      const key = window.SupabaseConfig.getAnonKey();

      const checkRes = await fetch(`${url}/rest/v1/users?select=id&limit=1`, {
        headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
      });
      if (checkRes.ok) {
        const existing = await checkRes.json();
        if (Array.isArray(existing) && existing.length > 0) return;
      }

      console.log('[Supabase Seed] Mengunggah master akun 36 pengguna ke tabel "users"...');
      const usersData = this.getUsers().map(u => ({
        id: u.id,
        nika: u.nika || '',
        name: u.name,
        role: u.role,
        role_label: u.roleLabel || '',
        kode_jabatan: u.kodeJabatan || '',
        jabatan: u.jabatan || '',
        level_grade: u.levelGrade || '',
        department: u.department || '',
        avatar_grad: u.avatarGrad || '',
        quota_annual_leave: Number(u.quotaAnnualLeave) || 12,
        remaining_annual_leave: Number(u.remainingAnnualLeave) || 12,
        quota_personal_leave: Number(u.quotaPersonalLeave) || 3,
        remaining_personal_leave: Number(u.remainingPersonalLeave) || 3,
        current_quarter: u.currentQuarter || 'Q3 (Juli–September 2026)',
        join_date: (u.joinDate && u.joinDate !== '-') ? u.joinDate : null,
        birth_place: u.birthPlace || '',
        birth_date: (u.birthDate && u.birthDate !== '-') ? u.birthDate : null,
        agama: u.agama || 'Islam',
        gender: u.gender || 'Laki-laki',
        phone: u.phone || '',
        email: u.email || '',
        username: u.username || u.id.toLowerCase(),
        password: u.password || 'password123',
        nik: u.nik || '',
        status_karyawan: u.statusKaryawan || 'Tetap',
        status_pajak: u.statusPajak || 'TK/0',
        pendidikan: u.pendidikan || 'Sarjana (S1)',
        no_kk: u.noKK || '',
        alamat_ktp: u.alamatKTP || '',
        alamat_domisili: u.alamatDomisili || '',
        status_tempat_tinggal: u.statusTempatTinggal || 'Milik Sendiri',
        no_npwp: u.noNPWP || '',
        alamat_npwp: u.alamatNPWP || '',
        bank_name: u.bankName || '',
        rekening_no: u.rekeningNo || '',
        rekening_name: u.rekeningName || u.name,
        no_bpjs_kesehatan: u.noBPJSKesehatan || '',
        no_bpjs_tenagakerja: u.noBPJSTenagaKerja || '',
        emergency_name: u.emergencyName || '',
        emergency_relation: u.emergencyRelation || '',
        emergency_phone: u.emergencyPhone || '',
        notes: u.notes || ''
      }));

      await fetch(`${url}/rest/v1/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Prefer': 'resolution=merge-duplicates'
        },
        body: JSON.stringify(usersData)
      });
      console.log('✅ [Supabase Seed] 36 Akun Karyawan berhasil terdaftar di tabel "users" Supabase.');
    } catch (e) {
      console.warn('⚠️ Gagal sinkronisasi master users:', e);
    }
  }

  // Push semua transaksi lokal yang ada ke Supabase
  async pushAllLocalDataToSupabase() {
    if (!window.SupabaseConfig || !window.SupabaseConfig.isConfigured()) return;
    
    // 1. Sync seluruh profil master users lokal ke Supabase
    const allUsers = this.getUsers();
    for (const u of allUsers) {
      await this.syncToSupabase('users', {
        id: u.id,
        nika: u.nika || '',
        name: u.name,
        role: u.role,
        role_label: u.roleLabel || u.jabatan || '',
        kode_jabatan: u.kodeJabatan || '',
        jabatan: u.jabatan || '',
        level_grade: u.levelGrade || '',
        department: u.department || '',
        avatar_grad: u.avatarGrad || '',
        quota_annual_leave: Number(u.quotaAnnualLeave) || 12,
        remaining_annual_leave: Number(u.remainingAnnualLeave) || 12,
        quota_personal_leave: Number(u.quotaPersonalLeave) || 3,
        remaining_personal_leave: Number(u.remainingPersonalLeave) || 3,
        current_quarter: u.currentQuarter || 'Q3 (Juli–September 2026)',
        join_date: (u.joinDate && u.joinDate !== '-') ? u.joinDate : null,
        birth_place: u.birthPlace || '',
        birth_date: (u.birthDate && u.birthDate !== '-') ? u.birthDate : null,
        agama: u.agama || 'Islam',
        gender: u.gender || 'Laki-laki',
        phone: u.phone || '',
        email: u.email || '',
        username: u.username || u.id.toLowerCase(),
        password: u.password || 'password123',
        nik: u.nik || '',
        status_karyawan: u.statusKaryawan || 'Tetap',
        status_pajak: u.statusPajak || 'TK/0',
        pendidikan: u.pendidikan || 'Sarjana (S1)',
        no_kk: u.noKK || '',
        alamat_ktp: u.alamatKTP || '',
        alamat_domisili: u.alamatDomisili || '',
        status_tempat_tinggal: u.statusTempatTinggal || 'Milik Sendiri',
        no_npwp: u.noNPWP || '',
        alamat_npwp: u.alamatNPWP || '',
        bank_name: u.bankName || '',
        rekening_no: u.rekeningNo || '',
        rekening_name: u.rekeningName || u.name,
        no_bpjs_kesehatan: u.noBPJSKesehatan || '',
        no_bpjs_tenagakerja: u.noBPJSTenagaKerja || '',
        emergency_name: u.emergencyName || '',
        emergency_relation: u.emergencyRelation || '',
        emergency_phone: u.emergencyPhone || '',
        notes: u.notes || ''
      });
    }

    // 2. Sync Cuti lokal
    const leaves = this.getLeaves();
    for (const l of leaves) {
      await this.syncToSupabase('leaves', {
        id: l.id,
        employee_id: l.employeeId,
        employee_name: l.employeeName,
        role: l.role,
        department: l.department,
        leave_type: l.leaveType || l.type,
        start_date: l.startDate,
        end_date: l.endDate,
        duration: l.duration,
        reason: l.reason,
        emergency_contact: l.emergencyContact,
        attachment_url: l.attachmentUrl || null,
        attachment_name: l.attachmentName || null,
        stage: l.stage,
        status: l.status,
        approval_history: l.approvalHistory || []
      });
    }

    // 3. Sync PR lokal
    const prs = this.getItemRequests();
    for (const p of prs) {
      await this.syncToSupabase('item_requests', {
        id: p.id,
        employee_id: p.employeeId,
        employee_name: p.employeeName,
        role: p.role,
        department: p.department,
        item_name: p.itemName,
        category: p.category,
        quantity: p.quantity,
        unit_price: p.unitPrice,
        total_price: p.totalPrice,
        urgency: p.urgency,
        reason: p.reason,
        target_kitchen: p.targetKitchen,
        attachment_url: p.attachmentUrl || null,
        attachment_name: p.attachmentName || null,
        stage: p.stage,
        status: p.status,
        approval_history: p.approvalHistory || []
      });
    }
  }

  async pullLatestFromSupabase() {
    if (!window.SupabaseConfig || !window.SupabaseConfig.isConfigured()) return;
    const url = window.SupabaseConfig.getUrl().replace(/\/+$/, '');
    const key = window.SupabaseConfig.getAnonKey();

    try {
      console.log('[Supabase Pull] Memuat data terbaru dari database Supabase...');

      // Pull Users via REST API
      try {
        const usersRes = await fetch(`${url}/rest/v1/users?select=*`, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        if (usersRes.ok) {
          const dbUsers = await usersRes.json();
          if (Array.isArray(dbUsers) && dbUsers.length > 0) {
            for (const su of dbUsers) {
              const localU = this.getUsers().find(u => u.id === su.id);
              if (localU) {
                if (su.email) localU.email = su.email;
                if (su.name) localU.name = su.name;
                if (su.phone) localU.phone = su.phone;
              }
            }
          }
        }
      } catch (err) {
        console.warn('Pull Users error:', err);
      }

      // Pull PRs via REST API
      try {
        const prRes = await fetch(`${url}/rest/v1/item_requests?select=*&order=created_at.desc`, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        if (prRes.ok) {
          const prs = await prRes.json();
          if (Array.isArray(prs) && prs.length > 0) {
            this.data.itemRequests = prs.map(p => ({
              id: p.id,
              employeeId: p.employee_id,
              employeeName: p.employee_name,
              role: p.role,
              department: p.department,
              itemName: p.item_name,
              category: p.category,
              quantity: p.quantity,
              unitPrice: Number(p.unit_price) || 0,
              totalPrice: Number(p.total_price) || 0,
              urgency: p.urgency,
              reason: p.reason,
              targetKitchen: p.target_kitchen,
              attachmentUrl: p.attachment_url,
              attachmentName: p.attachment_name,
              stage: p.stage,
              status: p.status,
              rejectionReason: p.rejection_reason,
              approvalHistory: p.approval_history || [],
              createdAt: p.created_at
            }));
          }
        }
      } catch (err) {
        console.warn('Pull PR error:', err);
      }

      // Pull Leaves via REST API
      try {
        const leaveRes = await fetch(`${url}/rest/v1/leaves?select=*&order=created_at.desc`, {
          headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
        });
        if (leaveRes.ok) {
          const leaves = await leaveRes.json();
          if (Array.isArray(leaves) && leaves.length > 0) {
            this.data.leaves = leaves.map(l => ({
              id: l.id,
              employeeId: l.employee_id,
              employeeName: l.employee_name,
              role: l.role,
              department: l.department,
              leaveType: l.leave_type,
              startDate: l.start_date,
              endDate: l.end_date,
              duration: l.duration,
              reason: l.reason,
              emergencyContact: l.emergency_contact,
              attachmentUrl: l.attachment_url,
              attachmentName: l.attachment_name,
              stage: l.stage,
              status: l.status,
              rejectionReason: l.rejection_reason,
              approvalHistory: l.approval_history || [],
              createdAt: l.created_at
            }));
          }
        }
      } catch (err) {
        console.warn('Pull Leave error:', err);
      }

      this.save();
      console.log('✅ [Supabase Pull] Data lokal berhasil disinkronkan.');
    } catch (err) {
      console.warn('⚠️ [Supabase Pull] Gagal mengambil data:', err);
    }
  }

  // Notifikasi Email Helper
  notifyEmail(eventData) {
    if (window.SupabaseConfig && typeof window.SupabaseConfig.sendEmailNotification === 'function') {
      window.SupabaseConfig.sendEmailNotification(eventData).catch(err => {
        console.warn('⚠️ Notifikasi email tertunda / gagal:', err);
      });
    }
  }
}

// Global DB Instance
window.DB = new DatabaseManager();
window.calculateTenure = calculateTenure;
window.calculateAge = calculateAge;
window.hasWorkedOneYear = hasWorkedOneYear;

// Auto-sync data dari Supabase saat awal startup jika sudah dikonfigurasi
setTimeout(() => {
  if (window.DB && typeof window.DB.pushAllLocalDataToSupabase === 'function') {
    window.DB.pushAllLocalDataToSupabase();
  }
}, 500);
