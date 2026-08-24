const fs = require('fs');

const content = fs.readFileSync('js/modules/data.js', 'utf8');
const match = content.match(/users:\s*(\[\s*\{[\s\S]*?\}\s*\])\s*,\s*itemRequests/);
if (!match) {
  console.error('Users array not matched');
  process.exit(1);
}

const users = eval(match[1]);
console.log('Total users parsed:', users.length);

const escapeSql = (str) => {
  if (str === null || str === undefined || str === '-') return 'NULL';
  if (typeof str === 'number') return str;
  return "'" + String(str).replace(/'/g, "''") + "'";
};

const sqlRows = users.map(u => {
  const joinDate = (u.joinDate && u.joinDate !== '-' && !isNaN(new Date(u.joinDate).getTime())) ? escapeSql(u.joinDate) : 'NULL';
  const birthDate = (u.birthDate && u.birthDate !== '-' && !isNaN(new Date(u.birthDate).getTime())) ? escapeSql(u.birthDate) : 'NULL';

  return `('${u.id}', ${escapeSql(u.nika)}, ${escapeSql(u.name)}, '${u.role}', ${escapeSql(u.roleLabel)}, ${escapeSql(u.kodeJabatan)}, ${escapeSql(u.jabatan)}, ${escapeSql(u.levelGrade)}, ${escapeSql(u.department)}, ${escapeSql(u.avatarGrad)}, ${Number(u.quotaAnnualLeave) || 12}, ${Number(u.remainingAnnualLeave) || 12}, ${Number(u.quotaPersonalLeave) || 3}, ${Number(u.remainingPersonalLeave) || 3}, ${escapeSql(u.currentQuarter)}, ${joinDate}, ${escapeSql(u.birthPlace)}, ${birthDate}, ${escapeSql(u.agama || 'Islam')}, ${escapeSql(u.gender || 'Laki-laki')}, ${escapeSql(u.phone)}, ${escapeSql(u.email)}, ${escapeSql(u.username || u.id.toLowerCase())}, ${escapeSql(u.password || 'password123')}, ${escapeSql(u.nik)}, ${escapeSql(u.statusKaryawan)}, ${escapeSql(u.statusPajak)}, ${escapeSql(u.pendidikan)}, ${escapeSql(u.noKK)}, ${escapeSql(u.alamatKTP)}, ${escapeSql(u.alamatDomisili)}, ${escapeSql(u.statusTempatTinggal)}, ${escapeSql(u.noNPWP)}, ${escapeSql(u.alamatNPWP)}, ${escapeSql(u.bankName)}, ${escapeSql(u.rekeningNo)}, ${escapeSql(u.rekeningName)}, ${escapeSql(u.noBPJSKesehatan)}, ${escapeSql(u.noBPJSTenagaKerja)}, ${escapeSql(u.emergencyName)}, ${escapeSql(u.emergencyRelation)}, ${escapeSql(u.emergencyPhone)}, ${escapeSql(u.notes)})`;
}).join(',\n');

const sqlHeader = `
-- ============================================================================
-- 5. MASTER SEED DATA: 36 AKUN MASTER KARYAWAN & PENGGUNA HRIS
-- ============================================================================
INSERT INTO users (id, nika, name, role, role_label, kode_jabatan, jabatan, level_grade, department, avatar_grad, quota_annual_leave, remaining_annual_leave, quota_personal_leave, remaining_personal_leave, current_quarter, join_date, birth_place, birth_date, agama, gender, phone, email, username, password, nik, status_karyawan, status_pajak, pendidikan, no_kk, alamat_ktp, alamat_domisili, status_tempat_tinggal, no_npwp, alamat_npwp, bank_name, rekening_no, rekening_name, no_bpjs_kesehatan, no_bpjs_tenagakerja, emergency_name, emergency_relation, emergency_phone, notes)
VALUES
`;

const fullSql = sqlHeader + sqlRows + '\nON CONFLICT (id) DO NOTHING;\n';
fs.appendFileSync('schema_supabase.sql', fullSql);
console.log('Appended user seed SQL to schema_supabase.sql successfully!');
