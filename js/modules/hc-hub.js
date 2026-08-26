/**
 * ERP YAYASAN - Human Capital Hub Module (HC Hub)
 * Designed for Human Capital & Direksi:
 * 1. Struktur Perusahaan (Ganti Nama Pejabat di Setiap Role & Posisi)
 * 2. Data Karyawan (Master Data HRIS 36 Field dengan Summary Sederhana + Full Page Form Detail & Save)
 * 3. Pengelolaan Akun (Buat Akun Baru, Kelola Username & Password, Hapus/Nonaktifkan Akun)
 * 4. Dokumen Sosialisasi & Panduan Yayasan (Upload & Unduh File PDF & PPT untuk Perwakilan & Maker Yayasan)
 */

window.HCHubModule = {
  activeTab: 'struktur', // 'struktur', 'karyawan', 'karyawan-detail', 'akun', 'dokumen', 'timesheet-export'
  selectedEmployeeId: null,
  searchQuery: '',
  currentUploadedFile: null,
  orgViewMode: 'tree', // 'tree' (Bagan Pohon Visual) vs 'board' (Papan Bertingkat)
  orgData: null,
  draggedNodeId: null,
  editingNodeId: null,

  exportFilterState: {
    startDate: (function() {
      const d = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000);
      return d.toISOString().slice(0, 10);
    })(),
    endDate: (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10)),
    targetType: 'ALL', // 'ALL', 'ROLE', 'USER'
    selectedRole: 'ALL',
    selectedUserId: 'ALL',
    statusFilter: 'EMPTY', // Default: Khusus user yang belum mengisi timesheet
    formatScope: 'SUMMARY', // 'SUMMARY' (Ringkasan Status Harian) vs 'DETAIL'
    currentPage: 1,
    pageSize: 10 // Batasi 10 nomor per halaman
  },

  render: function(container, subView = null) {
    if (!container) return;
    if (subView) {
      if (typeof subView === 'string' && subView.startsWith('karyawan-detail:')) {
        this.activeTab = 'karyawan-detail';
        this.selectedEmployeeId = subView.split(':')[1];
      } else {
        this.activeTab = subView;
      }
    }

    const users = DB.getUsers() || [];
    const docs = DB.getGuidelineDocuments() || [];
    const allTimesheets = DB.getTimesheets() || [];
    const user = DB.getCurrentUser();

    // If currently viewing Full Page Employee Detail Form
    if (this.activeTab === 'karyawan-detail' && this.selectedEmployeeId) {
      const emp = users.find(u => u.id === this.selectedEmployeeId);
      if (emp) {
        container.innerHTML = this.renderEmployeeDetailPage(emp);
        return;
      }
    }

    // Filtered users for employee directory
    const filteredUsers = users.filter(u => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.nika && u.nika.toLowerCase().includes(q)) ||
        (u.nik && u.nik.includes(q)) ||
        (u.roleLabel && u.roleLabel.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q)) ||
        (u.username && u.username.toLowerCase().includes(q))
      );
    });

    let pageBadge = 'Human Capital & Corporate Governance';
    let pageTitle = 'HC Hub — Manajemen Organisasi & Kepegawaian';

    if (this.activeTab === 'struktur') {
      pageBadge = 'HC Hub — Struktur Organisasi & Pejabat';
      pageTitle = 'Struktur Perusahaan & Pejabat Organisasi';
    } else if (this.activeTab === 'karyawan' || this.activeTab === 'karyawan-detail') {
      pageBadge = 'HC Hub — Database Kepegawaian & HRIS';
      pageTitle = 'Master Data Karyawan (HRIS)';
    } else if (this.activeTab === 'akun') {
      pageBadge = 'HC Hub — Akses & Kredensial Pengguna';
      pageTitle = 'Pengelolaan Akun Pengguna';
    } else if (this.activeTab === 'dokumen') {
      pageBadge = 'HC Hub — Sosialisasi & Regulasi Organisasi';
      pageTitle = 'Pusat Panduan & Dokumen Yayasan';
    } else if (this.activeTab === 'timesheet-export') {
      pageBadge = 'HC Hub — Rekapitulasi & Kepatuhan Jam Kerja';
      pageTitle = 'Export & Analisis Timesheet Karyawan (.xlsx)';
    }

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Top Header Khusus Sub-Modul Mandiri -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="text-mono-badge" style="color: #A78BFA;">${pageBadge}</span>
            <h1 style="font-size: 26px; font-weight: 600; margin-top: 2px;">${pageTitle}</h1>
          </div>
        </div>

        <!-- Sub-View Content Container -->
        <div id="hc-hub-content-area">
          ${this.renderSubView(filteredUsers, docs)}
        </div>

      </div>

      <!-- Modal 1: Tambah Akun & Karyawan Baru -->
      <div id="modal-add-user" class="modal-backdrop">
        <div class="modal-box" style="max-width: 680px;">
          <div class="modal-header">
            <h3 class="modal-title">Tambah Akun Pengguna & Profil Karyawan Baru</h3>
            <button class="modal-close-btn" onclick="App.closeModal('modal-add-user')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form onsubmit="HCHubModule.handleAddUserSubmit(event)">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">NIKA (Nomor Induk Karyawan)</label>
                  <input type="text" id="nu-nika" class="form-control" placeholder="Contoh: K-2026-012" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Nama Lengkap Karyawan</label>
                  <input type="text" id="nu-name" class="form-control" placeholder="Contoh: Muhammad Ridwan" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nomor Induk Kependudukan (NIK KTP)</label>
                  <input type="text" id="nu-nik" class="form-control" placeholder="16 Digit NIK KTP" maxlength="16" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Kode Jabatan (WLKP)</label>
                  <input type="text" id="nu-kodejabatan" class="form-control" placeholder="Contoh: WLKP-STF-01" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Jabatan / Posisi</label>
                  <input type="text" id="nu-jabatan" class="form-control" placeholder="Contoh: Surveyor Lapangan" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Level / Grade</label>
                  <select id="nu-levelgrade" class="form-control" required>
                    <option value="Staff / Grade 1">Staff / Grade 1</option>
                    <option value="Senior Staff / Grade 2">Senior Staff / Grade 2</option>
                    <option value="Supervisor / Grade 3">Supervisor / Grade 3</option>
                    <option value="Manager / Grade 4">Manager / Grade 4</option>
                    <option value="Direksi / Grade 5">Direksi / Grade 5</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Username Login</label>
                  <input type="text" id="nu-username" class="form-control" placeholder="Contoh: m.ridwan" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Password Awal</label>
                  <input type="password" id="nu-password" class="form-control" placeholder="Minimal 6 karakter" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Role Akses Sistem</label>
                  <select id="nu-role" class="form-control" onchange="HCHubModule.handleRoleSelectChange(event)" required>
                    <optgroup label="👑 Jajaran Direksi">
                      <option value="DIREKTUR_UTAMA">Direktur Utama</option>
                      <option value="DIREKTUR_OPERASIONAL">Direktur Operasional</option>
                      <option value="DIREKTUR_KEUANGAN">Direktur Keuangan</option>
                    </optgroup>
                    <optgroup label="🏢 Operasional Lapangan">
                      <option value="MANAGER_AREA">Manager Area</option>
                      <option value="HUMAN_CAPITAL">Human Capital</option>
                      <option value="SURVEYOR" selected>Surveyor Lapangan</option>
                    </optgroup>
                    <optgroup label="💰 Keuangan & FAT">
                      <option value="MANAGER_KEUANGAN">Manager Keuangan</option>
                      <option value="STAFF_AHLI_KEUANGAN">Staff Ahli Keuangan</option>
                      <option value="FAT_OFFICER">FAT Officer</option>
                    </optgroup>
                    <optgroup label="🔴 Entitas Yayasan & Staff Operasional">
                      <option value="PERWAKILAN_YAYASAN">Perwakilan Yayasan</option>
                      <option value="STAFF_OPERASIONAL">Staff Operasional</option>
                      <option value="MAKER_YAYASAN">Maker Yayasan</option>
                    </optgroup>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Departemen / Divisi</label>
                  <input type="text" id="nu-department" class="form-control" placeholder="Contoh: Operasional Lapangan" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tanggal Mulai Bekerja (Join Date)</label>
                  <input type="date" id="nu-joindate" class="form-control" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Status Ketenagakerjaan</label>
                  <select id="nu-statuskaryawan" class="form-control" required>
                    <option value="PKWT">PKWT (Kontrak)</option>
                    <option value="PKWTT">PKWTT (Tetap)</option>
                    <option value="Probation">Probation (Percobaan)</option>
                    <option value="Mitra Lapangan">Mitra Lapangan</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tempat Lahir</label>
                  <input type="text" id="nu-birthplace" class="form-control" placeholder="Contoh: Jakarta" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanggal Lahir</label>
                  <input type="date" id="nu-birthdate" class="form-control" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Jenis Kelamin</label>
                  <select id="nu-gender" class="form-control" required>
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Agama</label>
                  <select id="nu-agama" class="form-control" required>
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Konghucu">Konghucu</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nomor Telepon / WhatsApp</label>
                  <input type="tel" id="nu-phone" class="form-control" placeholder="0812-xxxx-xxxx" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Email Kantor / Pribadi</label>
                  <input type="email" id="nu-email" class="form-control" placeholder="nama@erpyayasan.org" required>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-add-user')">Batal</button>
              <button type="submit" class="btn-nalar-primary">Simpan & Daftarkan Karyawan</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 2: Reset / Ganti Password User -->
      <div id="modal-reset-password" class="modal-backdrop">
        <div class="modal-box" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title">Reset Password Pengguna</h3>
            <button class="modal-close-btn" onclick="App.closeModal('modal-reset-password')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form onsubmit="HCHubModule.handleResetPasswordSubmit(event)">
            <input type="hidden" id="rp-user-id">
            <div class="modal-body">
              <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                Mengatur ulang kata sandi login untuk akun: <strong id="rp-user-name" style="color: #fff;"></strong> (<span id="rp-user-role" style="font-family: var(--font-mono); color: #A78BFA;"></span>)
              </p>
              <div class="form-group">
                <label class="form-label">Password Baru</label>
                <input type="password" id="rp-new-password" class="form-control" placeholder="Ketik kata sandi baru..." minlength="6" required>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-reset-password')">Batal</button>
              <button type="submit" class="btn-nalar-primary">Update Password</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 3: Upload Dokumen Baru (PDF / PPT) -->
      <div id="modal-add-doc" class="modal-backdrop">
        <div class="modal-box" style="max-width: 620px;">
          <div class="modal-header">
            <h3 class="modal-title">Upload Dokumen Sosialisasi & Panduan Yayasan</h3>
            <button class="modal-close-btn" onclick="App.closeModal('modal-add-doc')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form onsubmit="HCHubModule.handleAddDocumentSubmit(event)">
            <div class="modal-body">
              
              <!-- File Upload Dropzone -->
              <div class="form-group">
                <label class="form-label">Pilih File Attachment Dokumen / Slide PPT</label>
                <div style="border: 2px dashed rgba(139, 92, 246, 0.45); border-radius: var(--radius-md); padding: 20px 16px; text-align: center; background: rgba(139, 92, 246, 0.06); cursor: pointer; transition: all 0.2s ease;"
                     onclick="document.getElementById('nd-file-input').click()"
                     onmouseover="this.style.borderColor='#A78BFA'; this.style.background='rgba(139, 92, 246, 0.12)'"
                     onmouseout="this.style.borderColor='rgba(139, 92, 246, 0.45)'; this.style.background='rgba(139, 92, 246, 0.06)'">
                  <input type="file" id="nd-file-input" accept=".pdf,.ppt,.pptx,.doc,.docx" style="display: none;" onchange="HCHubModule.handleFileSelect(event)">
                  <div id="nd-file-label">
                    <div style="font-size: 28px; margin-bottom: 6px;">📂</div>
                    <div style="font-size: 13.5px; font-weight: 600; color: #fff;">Klik di sini untuk Browse & Upload File</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px;">
                      Mendukung PDF, PPT, PPTX (Otomatis dapat diunduh di dashboard tim yayasan)
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Judul Dokumen / Nama File</label>
                <input type="text" id="nd-title" class="form-control" placeholder="Contoh: SOP Standar Kebersihan Dapur Program 2026.pdf" required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Format Dokumen</label>
                  <select id="nd-filetype" class="form-control" required>
                    <option value="PDF">📄 PDF (Dokumen / SOP / Buku Panduan)</option>
                    <option value="PPT">📊 PPT / PPTX (Slide Sosialisasi & Presentasi)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Target Penerima / Ditampilkan Pada Dashboard Role</label>
                  <select id="nd-targetrole" class="form-control" required>
                    <option value="ALL_YAYASAN">🌐 Seluruh Tim Yayasan & Operasional</option>
                    <option value="PERWAKILAN_YAYASAN">🔴 Khusus Perwakilan Yayasan (Pemohon Pengadaan)</option>
                    <option value="STAFF_OPERASIONAL">🔵 Khusus Staff Operasional (Pemohon Pengadaan)</option>
                    <option value="MAKER_YAYASAN">🔴 Khusus Maker Yayasan (Pelaporan Dapur & VA)</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Kategori Panduan</label>
                  <select id="nd-category" class="form-control" required>
                    <option value="SOP Lapangan & Verifikasi">SOP Lapangan & Verifikasi</option>
                    <option value="SOP Dapur & Finansial VA">SOP Dapur & Finansial VA</option>
                    <option value="Materi Sosialisasi & Presentasi">Materi Sosialisasi & Presentasi</option>
                    <option value="Materi Training & Higienitas">Materi Training & Higienitas</option>
                    <option value="Corporate Governance & Etika">Corporate Governance & Etika</option>
                    <option value="Pedoman Operasional Umum">Pedoman Operasional Umum</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Perkiraan Ukuran File</label>
                  <input type="text" id="nd-filesize" class="form-control" placeholder="Contoh: 4.2 MB" value="3.5 MB" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Deskripsi / Ringkasan Isi Dokumen</label>
                <textarea id="nd-desc" class="form-control" rows="2" placeholder="Tuliskan gambaran umum materi dan instruksi pelaksanaan..."></textarea>
              </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-add-doc')">Batal</button>
              <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #7C3AED 0%, #A78BFA 100%);">
                Upload & Terbitkan Dokumen
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  handleFileSelect: function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (re) => {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${Math.round(file.size / 1024)} KB`;
      const isPPT = file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx');

      HCHubModule.currentUploadedFile = {
        name: file.name,
        size: sizeStr,
        type: isPPT ? 'PPT' : 'PDF',
        data: re.target.result
      };

      const titleEl = document.getElementById('nd-title');
      if (titleEl && (!titleEl.value || titleEl.value.includes('Contoh:'))) {
        titleEl.value = file.name;
      }

      const sizeEl = document.getElementById('nd-filesize');
      if (sizeEl) sizeEl.value = sizeStr;

      const typeEl = document.getElementById('nd-filetype');
      if (typeEl) typeEl.value = isPPT ? 'PPT' : 'PDF';

      const labelEl = document.getElementById('nd-file-label');
      if (labelEl) {
        labelEl.innerHTML = `
          <div style="font-size: 28px; margin-bottom: 4px;">✅</div>
          <div style="font-size: 13.5px; font-weight: 600; color: #34D399;">File Terpilih: ${file.name}</div>
          <div style="font-size: 11px; color: #A78BFA; font-family: var(--font-mono); margin-top: 2px;">Ukuran: ${sizeStr} · Format: ${isPPT ? 'PPT / PPTX' : 'PDF'}</div>
        `;
      }
    };
    reader.readAsDataURL(file);
  },

  switchSubTab: function(tabKey) {
    this.activeTab = tabKey;
    this.selectedEmployeeId = null;
    App.switchTab('hc-' + tabKey);
  },

  viewEmployeeDetailPage: function(userId) {
    this.activeTab = 'karyawan-detail';
    this.selectedEmployeeId = userId;
    this.render(document.getElementById('main-content-area'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderSubView: function(users, docs) {
    if (this.activeTab === 'struktur') {
      return this.renderStrukturView(users);
    } else if (this.activeTab === 'karyawan') {
      return this.renderKaryawanView(users);
    } else if (this.activeTab === 'akun') {
      return this.renderAkunView(users);
    } else if (this.activeTab === 'dokumen') {
      return this.renderDokumenView(docs);
    } else if (this.activeTab === 'timesheet-export') {
      return this.renderTimesheetExportView(users);
    }
    return '';
  },

  // =========================================================================
  // 1. VIEW STRUKTUR ORGANISASI: BAGAN POHON VISUAL & INTERACTIVE DRAG & DROP
  // =========================================================================

  ensureOrgData: function() {
    if (!this.orgData || !Array.isArray(this.orgData.nodes)) {
      this.orgData = DB.getOrgStructure();
    }
    return this.orgData;
  },

  setOrgViewMode: function(mode) {
    this.orgViewMode = mode;
    this.render(document.getElementById('main-content-area'));
  },

  renderStrukturView: function(users) {
    const org = this.ensureOrgData();
    const isTreeMode = (this.orgViewMode !== 'board');

    return `
      <div>
        <!-- Top Action & Info Bar -->
        <div class="nalar-card" style="margin-bottom: 24px; padding: 20px 24px; background: linear-gradient(180deg, rgba(20, 24, 38, 0.9) 0%, rgba(14, 18, 28, 0.95) 100%); border: 1px solid rgba(139, 92, 246, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="text-mono-badge" style="color: #A78BFA; background: rgba(139, 92, 246, 0.18);">
                  Visual Interactive Org Chart
                </span>
                <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                  Bagan Pohon Organisasi · Drag & Drop Swap Posisi · Garis Hirarki & Koordinasi
                </span>
              </div>
              <h2 style="font-size: 20px; font-weight: 700; color: #fff; margin-top: 4px;">Bagan Struktur Organisasi & Jalur Koordinasi</h2>
              <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 2px;">
                Visualisasi bagan pohon hierarkis lengkap dengan garis komando solid, garis putus-putus koordinasi fungsional, dan fitur drag & drop untuk menukar/memindahkan posisi.
              </p>
            </div>

            <!-- Action Buttons & View Switcher -->
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <!-- View Mode Toggle -->
              <div style="display: flex; background: rgba(0,0,0,0.4); padding: 3px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                <button type="button" class="btn-nalar-secondary" 
                        style="padding: 6px 12px; font-size: 11.5px; border: none; ${isTreeMode ? 'background: rgba(139, 92, 246, 0.25); color: #fff; font-weight: 600;' : 'color: var(--text-muted);'}"
                        onclick="HCHubModule.setOrgViewMode('tree')">
                  🌳 Bagan Pohon
                </button>
                <button type="button" class="btn-nalar-secondary" 
                        style="padding: 6px 12px; font-size: 11.5px; border: none; ${!isTreeMode ? 'background: rgba(139, 92, 246, 0.25); color: #fff; font-weight: 600;' : 'color: var(--text-muted);'}"
                        onclick="HCHubModule.setOrgViewMode('board')">
                  📑 Papan Bertingkat
                </button>
              </div>

              <button type="button" class="btn-nalar-secondary" onclick="HCHubModule.openAddNodeModal()" style="font-size: 12px; padding: 8px 14px;">
                + Tambah Posisi
              </button>
              <button type="button" class="btn-nalar-secondary" onclick="HCHubModule.openAddConnectionModal()" style="font-size: 12px; padding: 8px 14px; color: #60A5FA; border-color: rgba(96,165,250,0.4);">
                🔗 + Buat Jalur Garis
              </button>
              <button type="button" class="btn-nalar-secondary" onclick="HCHubModule.resetOrgStructure()" style="font-size: 12px; padding: 8px 12px; color: var(--text-muted);" title="Kembalikan ke susunan awal">
                ↺ Reset
              </button>
              <button type="button" class="btn-nalar-primary" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); border-color: #34D399; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35); font-weight: 700; font-size: 13px; padding: 8px 20px;" onclick="HCHubModule.saveOrgStructure()">
                💾 Simpan Struktur Organisasi
              </button>
            </div>
          </div>
        </div>

        ${isTreeMode ? this.renderOrgTreeChart(org) : this.renderOrgBoardTiers(org)}

        <!-- Jalur Koordinasi & Hirarki (Garis Solid & Garis Putus-Putus) Table & Matrix -->
        <div class="nalar-card" style="margin-bottom: 28px; padding: 22px 24px; background: rgba(14, 18, 28, 0.95); border: 1px solid rgba(59, 130, 246, 0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="text-mono-badge" style="color: #60A5FA;">Garis Hirarki & Jalur Koordinasi</span>
                <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                  (Garis Biasa Solid / Garis Putus-Putus)
                </span>
              </div>
              <h3 style="font-size: 17px; margin-top: 2px;">Daftar Hubungan Laporan & Koordinasi Antar Posisi</h3>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 14px; font-size: 11.5px; background: rgba(0,0,0,0.3); padding: 4px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
                <span style="color: #34D399; font-weight: 600;">━ Garis Solid (Hirarki / Komando)</span>
                <span style="color: #60A5FA; font-weight: 600;">╌ Garis Putus-Putus (Koordinasi / Fungsional)</span>
              </div>

              <button type="button" class="btn-nalar-primary" style="padding: 6px 14px; font-size: 12px; background: #2563EB; border-color: #60A5FA;" onclick="HCHubModule.openAddConnectionModal()">
                + Tambah Jalur Garis Baru
              </button>
            </div>
          </div>

          <div class="nalar-table-container">
            <table class="nalar-table">
              <thead>
                <tr>
                  <th style="width: 45px;">No</th>
                  <th>Posisi Asal (Atasan / Mitra)</th>
                  <th style="text-align: center; width: 230px;">Tipe Jalur Garis</th>
                  <th>Posisi Tujuan (Bawahan / Koordinasi)</th>
                  <th>Keterangan / Fungsi Jalur</th>
                  <th style="text-align: center; width: 140px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${(org.connections || []).length === 0 ? `
                  <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 28px;">
                      Belum ada jalur hubungan hirarki atau garis koordinasi yang dibuat. Klik tombol "+ Tambah Jalur Garis Baru" di atas.
                    </td>
                  </tr>
                ` : (org.connections || []).map((c, idx) => {
                  const srcNode = (org.nodes || []).find(n => n.id === c.fromNodeId) || { name: 'Posisi Terhapus', roleLabel: '-' };
                  const tgtNode = (org.nodes || []).find(n => n.id === c.toNodeId) || { name: 'Posisi Terhapus', roleLabel: '-' };
                  const isSolid = (c.type === 'SOLID');

                  return `
                    <tr>
                      <td style="color: var(--text-muted); font-weight: 600;">${idx + 1}</td>
                      <td>
                        <div style="font-weight: 700; color: #fff; font-size: 13px;">${srcNode.name}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${srcNode.roleLabel} (${srcNode.department || '-'})</div>
                      </td>
                      <td style="text-align: center;">
                        <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; width: 100%; justify-content: center; ${isSolid ? 'color: #34D399; border-color: rgba(52,211,153,0.4); background: rgba(16,185,129,0.1);' : 'color: #60A5FA; border-color: rgba(96,165,250,0.4); background: rgba(59,130,246,0.1);'}"
                                onclick="HCHubModule.toggleConnectionType('${c.id}')"
                                title="Klik untuk ubah jenis garis (Solid / Putus-Putus)">
                          ${isSolid ? '━ GARIS SOLID (Hirarki)' : '╌ GARIS PUTUS-PUTUS (Koordinasi)'}
                        </button>
                      </td>
                      <td>
                        <div style="font-weight: 700; color: #fff; font-size: 13px;">${tgtNode.name}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${tgtNode.roleLabel} (${tgtNode.department || '-'})</div>
                      </td>
                      <td style="font-size: 12px; color: var(--text-secondary);">
                        ${c.label || (isSolid ? 'Laporan Langsung' : 'Koordinasi Lintas Divisi')}
                      </td>
                      <td style="text-align: center;">
                        <div style="display: flex; gap: 6px; justify-content: center;">
                          <button type="button" class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 11px;" onclick="HCHubModule.toggleConnectionType('${c.id}')" title="Ubah Tipe Garis">
                            🔄 Ganti
                          </button>
                          <button type="button" class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 11px; color: #F87171; border-color: rgba(248,113,113,0.4);" onclick="HCHubModule.deleteConnection('${c.id}')" title="Hapus Jalur Ini">
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Org Structure Modals Container -->
        <div id="org-modals-container"></div>

      </div>
    `;
  },

  // RENDERER 1: BAGAN POHON ORGANISASI VISUAL (PIXEL-PERFECT SVG VECTOR CANVAS)
  renderOrgTreeChart: function(org) {
    const nodes = org.nodes || [];

    // Identify primary structural nodes based on role / id
    const nodeDU = nodes.find(n => n.role === 'DIREKTUR_UTAMA') || nodes[0] || {};
    const nodeDO = nodes.find(n => n.role === 'DIREKTUR_OPERASIONAL') || nodes[1] || {};
    const nodeDK = nodes.find(n => n.role === 'DIREKTUR_KEUANGAN') || nodes[2] || {};
    const nodeMA = nodes.find(n => n.role === 'MANAGER_AREA') || nodes[3] || {};
    const nodeMK = nodes.find(n => n.role === 'MANAGER_KEUANGAN') || nodes[4] || {};
    const nodePY = nodes.find(n => n.role === 'PERWAKILAN_YAYASAN') || nodes[5] || {};
    const nodeSV = nodes.find(n => n.role === 'SURVEYOR') || nodes[6] || {};
    const nodeHC = nodes.find(n => n.role === 'HUMAN_CAPITAL') || nodes[7] || {};
    const nodeSA = nodes.find(n => n.role === 'STAFF_AHLI_KEUANGAN') || nodes[8] || {};
    const nodeFAT = nodes.find(n => n.role === 'FAT_OFFICER') || nodes[9] || {};
    const nodeMY = nodes.find(n => n.role === 'MAKER_YAYASAN') || nodes[10] || {};

    return `
      <div class="nalar-card" style="margin-bottom: 32px; padding: 32px 20px; background: radial-gradient(circle at 50% 10%, rgba(30, 41, 59, 0.45) 0%, rgba(10, 14, 24, 0.98) 100%); border: 1px solid rgba(139, 92, 246, 0.25); overflow-x: auto;">
        
        <!-- Legend & Notice Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 12px; padding: 0 10px;">
          <div style="display: flex; align-items: center; gap: 16px; font-size: 11.5px;">
            <span style="display: flex; align-items: center; gap: 6px; color: #34D399; font-weight: 600;">
              <span style="font-size: 16px; line-height: 1;">━</span> Garis Komando Struktural (Solid)
            </span>
            <span style="display: flex; align-items: center; gap: 6px; color: #60A5FA; font-weight: 600;">
              <span style="font-size: 16px; line-height: 1;">╌</span> Garis Koordinasi (Putus-Putus)
            </span>
            <span style="display: flex; align-items: center; gap: 6px; color: #F87171; font-weight: 600;">
              <span style="display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: linear-gradient(135deg, #DC2626, #EF4444);"></span> Kartu Mitra Yayasan (Red)
            </span>
          </div>

          <span style="font-size: 11px; color: var(--text-muted); background: rgba(0,0,0,0.5); padding: 4px 14px; border-radius: 20px; border: 1px solid var(--border-subtle);">
            💡 <em>Drag and drop</em> kartu pejabat mana saja ke kartu lainnya untuk menukar posisi pada bagan.
          </span>
        </div>

        <!-- Canvas Container with Exact Coordinates -->
        <div style="width: 1080px; height: 690px; position: relative; margin: 0 auto;">
          
          <!-- ================= SVG CONNECTOR VECTOR LAYER ================= -->
          <svg width="1080" height="690" style="position: absolute; left: 0; top: 0; pointer-events: none; z-index: 1;">
            <defs>
              <!-- Green Arrow Marker for Solid Lines -->
              <marker id="arrow-green" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#34D399" />
              </marker>
              <!-- Blue Arrow Marker for Dashed Lines -->
              <marker id="arrow-blue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#60A5FA" />
              </marker>
            </defs>

            <!-- 1. DU ➔ DO (Solid Green) -->
            <path d="M 540 96 L 540 128 L 210 128 L 210 160" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 2. DU ➔ DK (Solid Green) -->
            <path d="M 540 128 L 870 128 L 870 160" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 3. DO ➔ MA (Solid Green) -->
            <path d="M 210 240 L 210 304" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 4. DO ➔ HC (Solid Green, Routed in Open Channel) -->
            <path d="M 210 240 L 210 272 L 540 272 L 540 448" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 5. DO ╌╌╌➔ Staff Ahli (Dashed Blue, Routed in Open Whitespace between DO & DK, and beside MK) -->
            <path d="M 305 200 L 710 200 L 710 416 L 760 416 L 760 448" fill="none" stroke="#60A5FA" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-blue)" style="filter: drop-shadow(0 0 4px rgba(96,165,250,0.5));" />

            <!-- 6. MA ╌╌╌➔ Perwakilan Yayasan (Dashed Blue) -->
            <path d="M 210 384 L 210 416 L 100 416 L 100 448" fill="none" stroke="#60A5FA" stroke-width="2.5" stroke-dasharray="6 4" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-blue)" style="filter: drop-shadow(0 0 4px rgba(96,165,250,0.5));" />

            <!-- 7. MA ➔ Surveyor (Solid Green) -->
            <path d="M 210 416 L 320 416 L 320 448" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 8. DK ➔ MK (Solid Green) -->
            <path d="M 870 240 L 870 304" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 9. MK ➔ Staff Ahli (Solid Green) -->
            <path d="M 870 384 L 870 416 L 760 416 L 760 448" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 10. MK ➔ FAT Officer (Solid Green) -->
            <path d="M 870 416 L 980 416 L 980 448" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />

            <!-- 11. Staff Ahli ➔ Maker Yayasan (Solid Green) -->
            <path d="M 760 528 L 760 592" fill="none" stroke="#34D399" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#arrow-green)" style="filter: drop-shadow(0 0 4px rgba(52,211,153,0.4));" />
          </svg>

          <!-- ================= LINE LABELS (POSITIONED IN OPEN WHITESPACE) ================= -->
          <!-- Dashed Bridge Label from DO to Staff Ahli -->
          <div style="position: absolute; left: 380px; top: 188px; z-index: 3; background: rgba(10, 14, 24, 0.95); padding: 2px 8px; border-radius: 4px; border: 1px dashed rgba(96,165,250,0.5); font-size: 9px; color: #60A5FA; font-weight: 600; white-space: nowrap; pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
            ╌ Koordinasi Operasional & Finansial
          </div>

          <!-- Label MA ➔ PY -->
          <div style="position: absolute; left: 115px; top: 405px; z-index: 3; background: rgba(10, 14, 24, 0.95); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(96,165,250,0.4); font-size: 8.5px; color: #60A5FA; font-weight: 600; white-space: nowrap; pointer-events: none;">
            ╌ Koordinasi
          </div>

          <!-- Label MA ➔ SV -->
          <div style="position: absolute; left: 245px; top: 405px; z-index: 3; background: rgba(10, 14, 24, 0.95); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(52,211,153,0.4); font-size: 8.5px; color: #34D399; font-weight: 600; white-space: nowrap; pointer-events: none;">
            ━ Komando
          </div>

          <!-- Label DO ➔ HC -->
          <div style="position: absolute; left: 540px; top: 405px; transform: translateX(-50%); z-index: 3; background: rgba(10, 14, 24, 0.95); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(52,211,153,0.4); font-size: 8.5px; color: #34D399; font-weight: 600; white-space: nowrap; pointer-events: none;">
            ━ Komando SDM
          </div>

          <!-- Label MK ➔ SA -->
          <div style="position: absolute; left: 785px; top: 405px; z-index: 3; background: rgba(10, 14, 24, 0.95); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(52,211,153,0.4); font-size: 8.5px; color: #34D399; font-weight: 600; white-space: nowrap; pointer-events: none;">
            ━ Supervisi
          </div>

          <!-- Label MK ➔ FAT -->
          <div style="position: absolute; left: 905px; top: 405px; z-index: 3; background: rgba(10, 14, 24, 0.95); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(52,211,153,0.4); font-size: 8.5px; color: #34D399; font-weight: 600; white-space: nowrap; pointer-events: none;">
            ━ Komando FAT
          </div>

          <!-- Label SA ➔ MY -->
          <div style="position: absolute; left: 760px; top: 550px; transform: translateX(-50%); z-index: 3; background: rgba(10, 14, 24, 0.95); padding: 1px 6px; border-radius: 3px; border: 1px solid rgba(52,211,153,0.4); font-size: 8.5px; color: #34D399; font-weight: 600; white-space: nowrap; pointer-events: none;">
            ━ Pelaporan SPPG
          </div>

          <!-- ================= LEVEL 1: DIREKTUR UTAMA ================= -->
          <div style="position: absolute; left: 435px; top: 16px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeDU, 'Direksi Eksekutif', 210, false, true)}
          </div>

          <!-- ================= LEVEL 2: DIREKTUR OPERASIONAL & DIREKTUR KEUANGAN ================= -->
          <div style="position: absolute; left: 115px; top: 160px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeDO, 'Direksi Operasional', 190)}
          </div>

          <div style="position: absolute; left: 775px; top: 160px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeDK, 'Direksi Keuangan', 190)}
          </div>

          <!-- ================= LEVEL 3: MANAGER AREA & MANAGER KEUANGAN ================= -->
          <div style="position: absolute; left: 120px; top: 304px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeMA, 'Manajerial Operasional', 180)}
          </div>

          <div style="position: absolute; left: 780px; top: 304px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeMK, 'Manajerial Keuangan', 180)}
          </div>

          <!-- ================= LEVEL 4: 5 COLUMNS ROW (PY, SV, HC, SA, FAT) ================= -->
          <!-- Col 1: Perwakilan Yayasan (Red Card) -->
          <div style="position: absolute; left: 10px; top: 448px; z-index: 5;">
            ${this.renderTreeNodeCard(nodePY, 'Kemitraan Yayasan', 180, true)}
          </div>

          <!-- Col 2: Surveyor -->
          <div style="position: absolute; left: 230px; top: 448px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeSV, 'Pelaksana Lapangan', 180, false)}
          </div>

          <!-- Col 3: Human Capital -->
          <div style="position: absolute; left: 450px; top: 448px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeHC, 'Human Capital & GA', 180, false)}
          </div>

          <!-- Col 4: Staff Ahli Keuangan dan Administrasi -->
          <div style="position: absolute; left: 670px; top: 448px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeSA, 'Staf Ahli Finansial', 180, false)}
          </div>

          <!-- Col 5: FAT Officer -->
          <div style="position: absolute; left: 890px; top: 448px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeFAT, 'Finance & Tax', 180, false)}
          </div>

          <!-- ================= LEVEL 5: MAKER YAYASAN (UNDER COL 4) ================= -->
          <!-- Maker Yayasan (Red Card) -->
          <div style="position: absolute; left: 670px; top: 592px; z-index: 5;">
            ${this.renderTreeNodeCard(nodeMY, 'Operasional Dapur & VA', 180, true)}
          </div>

        </div>

        <!-- Bottom Summary Badge -->
        <div style="margin-top: 24px; padding: 12px 24px; background: rgba(0,0,0,0.5); border: 1px dashed rgba(255,255,255,0.15); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; gap: 24px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #F87171;">
            <span>🟥 <strong>Mitra Yayasan:</strong> Perwakilan Yayasan (Wilayah) & Maker Yayasan (Dapur SPPG & Saldo VA)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #60A5FA;">
            <span style="font-size: 16px; line-height: 1;">╌</span>
            <span><strong>Jalur Koordinasi Fungsional:</strong> Direktur Operasional ⇄ Staf Ahli Keuangan & Manager Area ⇄ Perwakilan</span>
          </div>
        </div>

      </div>
    `;
  },

  // Node Card for the Visual Bagan Tree (Supports Red Badge styling for Yayasan partners)
  renderTreeNodeCard: function(node, badgeText = '', customWidth = 180, isRedBadge = false, isRoot = false) {
    if (!node || !node.id) {
      return `<div style="width: ${customWidth}px; height: 80px; padding: 10px; border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; text-align: center; color: var(--text-muted); font-size: 11px;">(Posisi Kosong)</div>`;
    }

    const isPartner = isRedBadge || node.isRedBadge || node.role === 'PERWAKILAN_YAYASAN' || node.role === 'STAFF_OPERASIONAL' || node.role === 'MAKER_YAYASAN';
    const cardBg = isPartner 
      ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.4) 0%, rgba(153, 27, 27, 0.85) 100%)' 
      : isRoot
      ? 'linear-gradient(180deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 1) 100%)'
      : 'rgba(24, 30, 44, 0.96)';
    const borderColor = isPartner 
      ? '#EF4444' 
      : isRoot 
      ? '#38BDF8' 
      : 'rgba(255, 255, 255, 0.18)';
    const shadowColor = isPartner ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 0, 0, 0.45)';

    return `
      <div class="tree-node-box"
           draggable="true"
           id="tree-card-${node.id}"
           ondragstart="HCHubModule.handleOrgDragStart(event, '${node.id}')"
           ondragend="HCHubModule.handleOrgDragEnd(event)"
           ondragover="HCHubModule.handleTreeDragOver(event, '${node.id}')"
           ondragleave="HCHubModule.handleTreeDragLeave(event, '${node.id}')"
           ondrop="HCHubModule.handleTreeDrop(event, '${node.id}')"
           style="width: ${customWidth}px; height: 80px; box-sizing: border-box; background: ${cardBg}; border: 1.5px solid ${borderColor}; border-radius: 10px; padding: 7px 10px; box-shadow: 0 4px 16px ${shadowColor}; text-align: center; position: relative; transition: all 0.2s ease; cursor: grab; display: flex; flex-direction: column; justify-content: space-between;"
           onmouseenter="this.style.transform='translateY(-2px)'; this.style.borderColor='${isPartner ? '#F87171' : '#38BDF8'}'; this.style.boxShadow='0 6px 20px ${shadowColor}'"
           onmouseleave="this.style.transform='none'; this.style.borderColor='${borderColor}'; this.style.boxShadow='0 4px 16px ${shadowColor}'">
        
        <!-- Role / Title Tag on Diagram -->
        <div style="font-size: 8.5px; color: ${isPartner ? '#FECACA' : '#94A3B8'}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">
          ${badgeText || node.department || 'Yayasan'}
        </div>

        <!-- Role Label (Main Position Title) -->
        <div style="font-size: ${isRoot ? '13px' : '11.5px'}; font-weight: 700; color: #fff; line-height: 1.2;" class="truncate" title="${node.roleLabel || ''}">
          ${node.roleLabel || 'Pejabat'}
        </div>

        <!-- Person Name -->
        <div style="font-size: 10.5px; color: ${isPartner ? '#FEE2E2' : 'var(--text-secondary)'}; font-weight: 500;" class="truncate" title="${node.name}">
          ${node.name}
        </div>

        <!-- Card Toolbar -->
        <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 3px; display: flex; justify-content: center; gap: 6px; align-items: center;">
          <button type="button" class="btn-nalar-secondary" style="padding: 0 5px; font-size: 8.5px; height: 16px; line-height: 14px; color: #FCD34D; border-color: rgba(245,158,11,0.3); background: rgba(0,0,0,0.3);" onclick="HCHubModule.openEditNodeModal('${node.id}')" title="Edit nama & jabatan">
            ✏️ Edit
          </button>
          <span style="font-size: 8px; color: var(--text-dim); display: flex; align-items: center;">
            ⋮⋮ Drag
          </span>
        </div>

      </div>
    `;
  },

  // RENDERER 2: PAPAN BERTINGKAT (TIERED BOARD VIEW)
  renderOrgBoardTiers: function(org) {
    const tiers = org.tiers || [];
    const nodes = org.nodes || [];
    const connections = org.connections || [];

    return `
      <div style="display: flex; flex-direction: column; gap: 24px; margin-bottom: 32px;">
        ${tiers.map((tier, tierIdx) => {
          const tierNodes = nodes.filter(n => n.tierId === tier.id);
          return `
            <div class="nalar-card" style="margin-bottom: 0; padding: 20px 22px; background: rgba(14, 18, 28, 0.85); border: 1px solid rgba(255,255,255,0.08); border-left: 4px solid ${tier.color};"
                 id="dropzone-${tier.id}"
                 ondragover="HCHubModule.handleOrgDragOver(event, '${tier.id}')"
                 ondragleave="HCHubModule.handleOrgDragLeave(event, '${tier.id}')"
                 ondrop="HCHubModule.handleOrgDrop(event, '${tier.id}')">
              
              <!-- Tier Header -->
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                  <div style="width: 28px; height: 28px; border-radius: 6px; background: ${tier.color}22; border: 1px solid ${tier.color}55; display: flex; align-items: center; justify-content: center; color: ${tier.color}; font-weight: 700; font-size: 12px;">
                    L${tierIdx + 1}
                  </div>
                  <div>
                    <div style="font-size: 15px; font-weight: 700; color: #fff;">${tier.label}</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-style: italic;">${tier.desc || ''}</div>
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="font-size: 11px; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border-subtle);">
                    ${tierNodes.length} Posisi
                  </span>
                  <button type="button" class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 10.5px; color: ${tier.color}; border-color: ${tier.color}44;" onclick="HCHubModule.openAddNodeModal('${tier.id}')">
                    + Tambah di Tingkat Ini
                  </button>
                </div>
              </div>

              <!-- Tier Grid / Drop Area -->
              <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 14px; min-height: 90px; padding: 10px; border: 1.5px dashed rgba(255,255,255,0.08); border-radius: var(--radius-md); background: rgba(0,0,0,0.25); transition: all 0.2s ease;"
                   id="tier-grid-${tier.id}">
                
                ${tierNodes.length === 0 ? `
                  <div style="grid-column: 1 / -1; display: flex; align-items: center; justify-content: center; min-height: 80px; color: var(--text-muted); font-size: 12px; font-style: italic;">
                    ⚡ Tarik dan jatuhkan (*drag and drop*) kartu posisi ke area ini
                  </div>
                ` : tierNodes.map(node => {
                  const outgoing = connections.filter(c => c.fromNodeId === node.id);

                  return `
                    <div style="background: var(--bg-card-elevated); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 14px 16px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px; cursor: grab; transition: all 0.2s ease; box-shadow: 0 4px 14px rgba(0,0,0,0.3);"
                         draggable="true"
                         id="node-card-${node.id}"
                         ondragstart="HCHubModule.handleOrgDragStart(event, '${node.id}')"
                         ondragend="HCHubModule.handleOrgDragEnd(event)"
                         onmouseenter="this.style.borderColor='${tier.color}'; this.style.transform='translateY(-2px)'"
                         onmouseleave="this.style.borderColor='var(--border-card)'; this.style.transform='none'">
                      
                      <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 10px; color: var(--text-muted); display: flex; align-items: center; gap: 4px; font-weight: 500;">
                          <span>⋮⋮</span> DRAG TO MOVE
                        </span>
                        <span class="text-mono-badge" style="font-size: 9.5px; color: #60A5FA; background: rgba(59,130,246,0.12); padding: 1px 6px; border-radius: 3px;">
                          ${node.department || 'Yayasan'}
                        </span>
                      </div>

                      <div style="display: flex; align-items: center; gap: 12px;">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: ${node.avatarGrad || tier.color}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12.5px; flex-shrink: 0; box-shadow: 0 3px 10px rgba(0,0,0,0.4);">
                          ${node.name ? node.name.split(' ').map(w => w[0]).join('').slice(0, 2) : 'EM'}
                        </div>
                        <div style="min-width: 0; flex: 1;">
                          <div style="font-size: 10px; color: #FCD34D; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">
                            ${node.role || 'POSISI'}
                          </div>
                          <div style="font-size: 13.5px; font-weight: 700; color: #fff; line-height: 1.25; margin-top: 1px;" class="truncate">
                            ${node.name}
                          </div>
                          <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;" class="truncate">
                            ${node.roleLabel || 'Pejabat Organisasi'}
                          </div>
                        </div>
                      </div>

                      ${outgoing.length > 0 ? `
                        <div style="font-size: 10px; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; display: flex; gap: 6px; flex-wrap: wrap; border: 1px solid var(--border-subtle);">
                          ${outgoing.map(c => `
                            <span style="color: ${c.type === 'SOLID' ? '#34D399' : '#60A5FA'}; font-weight: 500;" title="${c.label || ''}">
                              ${c.type === 'SOLID' ? '━ Solid' : '╌ Putus-putus'} ➔
                            </span>
                          `).join('')}
                        </div>
                      ` : ''}

                      <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; gap: 4px;">
                          ${tierIdx > 0 ? `
                            <button type="button" class="btn-nalar-secondary" style="padding: 2px 6px; font-size: 10px;" onclick="HCHubModule.moveNodeTier('${node.id}', -1)" title="Pindah naik tingkat (Level ${tierIdx})">
                              ⬆️
                            </button>
                          ` : ''}
                          ${tierIdx < tiers.length - 1 ? `
                            <button type="button" class="btn-nalar-secondary" style="padding: 2px 6px; font-size: 10px;" onclick="HCHubModule.moveNodeTier('${node.id}', 1)" title="Pindah turun tingkat (Level ${tierIdx + 2})">
                              ⬇️
                            </button>
                          ` : ''}
                        </div>

                        <div style="display: flex; gap: 4px;">
                          <button type="button" class="btn-nalar-secondary" style="padding: 2px 8px; font-size: 10.5px; color: #FCD34D; border-color: rgba(245,158,11,0.35);" onclick="HCHubModule.openEditNodeModal('${node.id}')" title="Edit nama & jabatan">
                            ✏️ Edit
                          </button>
                          <button type="button" class="btn-nalar-secondary" style="padding: 2px 6px; font-size: 10px; color: #F87171; border-color: rgba(248,113,113,0.35);" onclick="HCHubModule.deleteNode('${node.id}')" title="Hapus kartu ini">
                            🗑️
                          </button>
                        </div>
                      </div>

                    </div>
                  `;
                }).join('')}
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  // Tree Drag and Drop Swap Handler
  handleTreeDragOver: function(e, targetNodeId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const card = document.getElementById('tree-card-' + targetNodeId);
    if (card) {
      card.style.borderColor = '#34D399';
      card.style.background = 'rgba(16, 185, 129, 0.2)';
    }
  },

  handleTreeDragLeave: function(e, targetNodeId) {
    const card = document.getElementById('tree-card-' + targetNodeId);
    if (card) {
      card.style.background = 'rgba(18, 22, 34, 0.95)';
    }
  },

  handleTreeDrop: function(e, targetNodeId) {
    e.preventDefault();
    this.handleTreeDragLeave(e, targetNodeId);
    const sourceNodeId = e.dataTransfer.getData('text/plain') || this.draggedNodeId;
    if (!sourceNodeId || sourceNodeId === targetNodeId) return;

    const org = this.ensureOrgData();
    const sourceNode = org.nodes.find(n => n.id === sourceNodeId);
    const targetNode = org.nodes.find(n => n.id === targetNodeId);

    if (sourceNode && targetNode) {
      // Swap their names, roleLabels, and user accounts
      const tempName = sourceNode.name;
      const tempRoleLabel = sourceNode.roleLabel;
      const tempUserId = sourceNode.userId;
      const tempDept = sourceNode.department;

      sourceNode.name = targetNode.name;
      sourceNode.roleLabel = targetNode.roleLabel;
      sourceNode.userId = targetNode.userId;
      sourceNode.department = targetNode.department;

      targetNode.name = tempName;
      targetNode.roleLabel = tempRoleLabel;
      targetNode.userId = tempUserId;
      targetNode.department = tempDept;

      App.showToast(`Posisi "${tempName}" dan "${sourceNode.name}" berhasil ditukar pada bagan!`, 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  handleOrgDragStart: function(e, nodeId) {
    this.draggedNodeId = nodeId;
    e.dataTransfer.setData('text/plain', nodeId);
    e.dataTransfer.effectAllowed = 'move';
    const card = document.getElementById('node-card-' + nodeId) || document.getElementById('tree-card-' + nodeId);
    if (card) card.style.opacity = '0.5';
  },

  handleOrgDragEnd: function(e) {
    if (this.draggedNodeId) {
      const card = document.getElementById('node-card-' + this.draggedNodeId) || document.getElementById('tree-card-' + this.draggedNodeId);
      if (card) card.style.opacity = '1';
    }
    this.draggedNodeId = null;
  },

  handleOrgDragOver: function(e, tierId) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const dropzone = document.getElementById('dropzone-' + tierId);
    if (dropzone) {
      dropzone.style.background = 'rgba(59, 130, 246, 0.12)';
      dropzone.style.borderColor = '#60A5FA';
    }
  },

  handleOrgDragLeave: function(e, tierId) {
    const dropzone = document.getElementById('dropzone-' + tierId);
    if (dropzone) {
      dropzone.style.background = 'rgba(14, 18, 28, 0.85)';
      dropzone.style.borderColor = 'rgba(255,255,255,0.08)';
    }
  },

  handleOrgDrop: function(e, targetTierId) {
    e.preventDefault();
    this.handleOrgDragLeave(e, targetTierId);
    const nodeId = e.dataTransfer.getData('text/plain') || this.draggedNodeId;
    if (!nodeId) return;

    const org = this.ensureOrgData();
    const node = org.nodes.find(n => n.id === nodeId);
    const tier = org.tiers.find(t => t.id === targetTierId);

    if (node && tier && node.tierId !== targetTierId) {
      node.tierId = targetTierId;
      App.showToast(`Posisi "${node.name}" (${node.roleLabel}) dipindahkan ke ${tier.label}!`, 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  moveNodeTier: function(nodeId, direction) {
    const org = this.ensureOrgData();
    const node = org.nodes.find(n => n.id === nodeId);
    if (!node) return;

    const currentTierIdx = org.tiers.findIndex(t => t.id === node.tierId);
    const newTierIdx = currentTierIdx + direction;

    if (newTierIdx >= 0 && newTierIdx < org.tiers.length) {
      node.tierId = org.tiers[newTierIdx].id;
      App.showToast(`Posisi "${node.name}" dipindahkan ke ${org.tiers[newTierIdx].label}!`, 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  saveOrgStructure: function() {
    const org = this.ensureOrgData();
    DB.saveOrgStructure(org);
    App.showToast('✓ Struktur bagan organisasi & seluruh jalur koordinasi berhasil disimpan ke sistem!', 'success');
  },

  resetOrgStructure: function() {
    if (confirm('Kembalikan susunan bagan struktur organisasi dan jalur ke template default Yayasan?')) {
      this.orgData = JSON.parse(JSON.stringify(INITIAL_DATABASE.orgStructure));
      DB.saveOrgStructure(this.orgData);
      App.showToast('Bagan organisasi dikembalikan ke template awal.', 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  toggleConnectionType: function(connId) {
    const org = this.ensureOrgData();
    const conn = org.connections.find(c => c.id === connId);
    if (conn) {
      conn.type = (conn.type === 'SOLID' ? 'DASHED' : 'SOLID');
      conn.label = (conn.type === 'SOLID' ? 'Komando Langsung' : 'Koordinasi Lintas Divisi');
      App.showToast(`Tipe jalur diubah menjadi ${conn.type === 'SOLID' ? 'Garis Solid (Komando)' : 'Garis Putus-Putus (Koordinasi)'}!`, 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  deleteConnection: function(connId) {
    const org = this.ensureOrgData();
    const idx = org.connections.findIndex(c => c.id === connId);
    if (idx !== -1) {
      org.connections.splice(idx, 1);
      App.showToast('Jalur koordinasi/hirarki berhasil dihapus.', 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  deleteNode: function(nodeId) {
    const org = this.ensureOrgData();
    const node = org.nodes.find(n => n.id === nodeId);
    if (!node) return;

    if (confirm(`Hapus posisi "${node.name}" (${node.roleLabel}) dari bagan struktur?`)) {
      org.nodes = org.nodes.filter(n => n.id !== nodeId);
      org.connections = org.connections.filter(c => c.fromNodeId !== nodeId && c.toNodeId !== nodeId);
      App.showToast(`Posisi "${node.name}" berhasil dihapus.`, 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  openEditNodeModal: function(nodeId) {
    const org = this.ensureOrgData();
    const node = org.nodes.find(n => n.id === nodeId);
    if (!node) return;

    this.editingNodeId = nodeId;
    const modalContainer = document.getElementById('org-modals-container');
    if (!modalContainer) return;

    modalContainer.innerHTML = `
      <div id="modal-edit-org-node" class="modal-backdrop show active">
        <div class="modal-box" style="max-width: 540px;">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #FCD34D;">Edit Kartu Bagan</span>
              <h3 class="modal-title" style="margin-top: 2px;">Edit Data Pejabat & Posisi</h3>
            </div>
            <button class="modal-close-btn" onclick="HCHubModule.closeOrgModal('modal-edit-org-node')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form onsubmit="HCHubModule.handleSaveNodeModal(event)">
            <div class="modal-body">
              <div class="form-group">
                <label class="form-label">Nama Lengkap Pejabat <span style="color: #F87171;">*</span></label>
                <input type="text" id="on-name" class="form-control" value="${node.name || ''}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Jabatan / Role Label <span style="color: #F87171;">*</span></label>
                <input type="text" id="on-rolelabel" class="form-control" value="${node.roleLabel || ''}" required>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Departemen / Divisi</label>
                  <input type="text" id="on-dept" class="form-control" value="${node.department || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Tingkat Hirarki</label>
                  <select id="on-tier" class="form-control">
                    ${org.tiers.map(t => `
                      <option value="${t.id}" ${node.tierId === t.id ? 'selected' : ''}>${t.label}</option>
                    `).join('')}
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn-nalar-secondary" onclick="HCHubModule.closeOrgModal('modal-edit-org-node')">Batal</button>
              <button type="submit" class="btn-nalar-primary">Simpan Perubahan</button>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  handleSaveNodeModal: function(e) {
    if (e) e.preventDefault();
    const org = this.ensureOrgData();
    const node = org.nodes.find(n => n.id === this.editingNodeId);
    if (!node) return;

    const name = document.getElementById('on-name').value.trim();
    const roleLabel = document.getElementById('on-rolelabel').value.trim();
    const dept = document.getElementById('on-dept').value.trim();
    const tier = document.getElementById('on-tier').value;

    node.name = name;
    node.roleLabel = roleLabel;
    node.department = dept;
    node.tierId = tier;

    if (node.userId) {
      DB.updateUserRoleName(node.userId, name, roleLabel);
    }

    this.closeOrgModal('modal-edit-org-node');
    App.showToast(`Posisi "${name}" (${roleLabel}) berhasil diperbarui!`, 'success');
    this.render(document.getElementById('main-content-area'));
  },

  // 2. View Data Karyawan (Summary Sederhana pada Direktori Tabel Utama)
  renderKaryawanView: function(users) {
    return `
      <div class="nalar-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
          <div>
            <span class="text-mono-badge" style="color: #60A5FA;">HRIS Database</span>
            <h3 style="font-size: 18px; margin-top: 2px;">Master Data Karyawan Perusahaan</h3>
          </div>

          <!-- Search Bar -->
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="text" class="form-control" placeholder="Cari NIKA, NIK, Nama, atau Divisi..." style="width: 280px; padding: 7px 12px; font-size: 12.5px;"
                   value="${this.searchQuery}" oninput="HCHubModule.handleSearch(event)">
          </div>
        </div>

        <div class="nalar-table-container">
          <table class="nalar-table">
            <thead>
              <tr>
                <th>Nama Lengkap & Role</th>
                <th>Tempat & Tanggal Lahir (TTL)</th>
                <th>Gender</th>
                <th>Kontak & Email</th>
                <th>Sisa Cuti</th>
                <th>Aksi Detail</th>
              </tr>
            </thead>
            <tbody>
              ${users.length === 0 ? `
                <tr>
                  <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 32px;">Tidak ditemukan data karyawan yang sesuai dengan pencarian.</td>
                </tr>
              ` : users.map(u => `
                <tr>
                  <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                      <div style="width: 34px; height: 34px; border-radius: 50%; background: ${u.avatarGrad}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 11px; flex-shrink: 0;">
                        ${u.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div style="font-weight: 600; color: #fff;">${u.name}</div>
                        <div style="font-size: 11px; color: var(--brand-orange); font-family: var(--font-mono);">${u.roleLabel}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style="font-size: 12.5px; color: #fff;">${u.birthPlace || '-'}, ${u.birthDate || '-'}</div>
                    <div style="font-size: 10.5px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">
                      Usia: ${calculateAge(u.birthDate)}
                    </div>
                  </td>
                  <td>
                    <span class="badge-status ${u.gender === 'Perempuan' ? 'badge-pending' : 'badge-approved'}" style="font-size: 10.5px;">
                      ${u.gender || 'Laki-laki'}
                    </span>
                  </td>
                  <td>
                    <div style="font-size: 12px; color: #fff;">${u.phone || '-'}</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${u.email || '-'}</div>
                  </td>
                  <td>
                    ${!hasWorkedOneYear(u.joinDate) ? `
                      <div style="font-family: var(--font-mono); font-weight: 600; color: #FCD34D; font-size: 12px;">
                        ${u.remainingPersonalLeave !== undefined ? u.remainingPersonalLeave : 3} / ${u.quotaPersonalLeave || 3} Hari
                      </div>
                      <div style="font-size: 10px; color: #F59E0B; font-family: var(--font-mono);">
                        Pribadi Q3 (&lt; 1 Thn)
                      </div>
                    ` : `
                      <div style="font-family: var(--font-mono); font-weight: 600; color: #A78BFA; font-size: 12px;">
                        ${u.remainingAnnualLeave !== undefined ? u.remainingAnnualLeave : 12} / ${u.quotaAnnualLeave || 12} Hari
                      </div>
                      <div style="font-size: 10px; color: #34D399; font-family: var(--font-mono);">
                        Cuti Tahunan (≥ 1 Thn)
                      </div>
                    `}
                  </td>
                  <td>
                    <!-- Tombol Aksi Mata: Pindah ke Halaman Dossier Form Baru -->
                    <button class="btn-nalar-primary" style="padding: 6px 12px; font-size: 11.5px; display: inline-flex; align-items: center; gap: 6px;" 
                            title="Buka Halaman Form Detail HRIS" onclick="HCHubModule.viewEmployeeDetailPage('${u.id}')">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span>Lihat & Kelola Detail</span>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  handleSearch: function(event) {
    const cursorPos = event.target.selectionStart;
    this.searchQuery = event.target.value;
    const users = DB.getUsers() || [];
    const docs = DB.getGuidelineDocuments() || [];
    const content = document.getElementById('hc-hub-content-area');
    if (content) {
      const filtered = users.filter(u => {
        if (!this.searchQuery) return true;
        const q = this.searchQuery.toLowerCase();
        return (
          (u.name && u.name.toLowerCase().includes(q)) ||
          (u.nika && u.nika.toLowerCase().includes(q)) ||
          (u.nik && u.nik.includes(q)) ||
          (u.roleLabel && u.roleLabel.toLowerCase().includes(q)) ||
          (u.department && u.department.toLowerCase().includes(q))
        );
      });
      content.innerHTML = this.renderSubView(filtered, docs);

      const searchInput = content.querySelector('input[type="text"]');
      if (searchInput) {
        searchInput.focus();
        try {
          searchInput.setSelectionRange(cursorPos, cursorPos);
        } catch(e) {}
      }
    }
  },

  // =========================================================================
  // FULL PAGE: EXECUTIVE HRIS SUMMARY FORM & LIVE SAVE (36 FIELDS)
  // =========================================================================
  renderEmployeeDetailPage: function(emp) {
    const tenureStr = calculateTenure(emp.joinDate);
    const ageStr = calculateAge(emp.birthDate);

    return `
      <div class="animate-blur-in">
        
        <!-- Breadcrumb & Top Action Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 14px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); margin-bottom: 4px;">
              <span style="cursor: pointer; color: #A78BFA;" onclick="HCHubModule.switchSubTab('karyawan')">HC Hub</span>
              <span>/</span>
              <span style="cursor: pointer; color: #A78BFA;" onclick="HCHubModule.switchSubTab('karyawan')">Master Data Karyawan</span>
              <span>/</span>
              <span style="color: #fff;">Dossier Detail Profil</span>
            </div>
            <h1 style="font-size: 24px; font-weight: 600;">Dossier & Formulir Master HRIS Karyawan</h1>
          </div>

          <div style="display: flex; gap: 10px; align-items: center;">
            <button type="button" class="btn-nalar-secondary" onclick="HCHubModule.switchSubTab('karyawan')">
              ← Kembali ke Direktori
            </button>
            <button type="submit" form="form-employee-page" class="btn-nalar-primary" style="box-shadow: 0 4px 18px rgba(255,75,1,0.4);">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              <span>💾 Simpan Perubahan HRIS</span>
            </button>
          </div>
        </div>

        <!-- Hero Profile Banner Card -->
        <div class="nalar-card hud-corner-box aura-box-orange" style="padding: 24px 28px; margin-bottom: 28px;">
          <div class="card-aura-glow aura-orange" style="opacity: 0.18;"></div>
          
          <div style="position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 18px;">
              <div style="width: 64px; height: 64px; border-radius: 50%; background: ${emp.avatarGrad}; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 22px; flex-shrink: 0; box-shadow: 0 6px 20px rgba(0,0,0,0.6);">
                ${emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <h2 style="font-size: 22px; font-weight: 700; color: #fff; margin: 0;">${emp.name}</h2>
                  <span class="badge-status badge-approved" style="font-size: 10.5px;">${emp.statusKaryawan || 'PKWTT'}</span>
                  <span class="text-mono-badge" style="color: #60A5FA; font-size: 11px;">NIKA: ${emp.nika || emp.id}</span>
                </div>
                <div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px; font-family: var(--font-mono);">
                  ${emp.jabatan || emp.roleLabel} · ${emp.department} · <strong style="color: #FCD34D;">${emp.levelGrade || 'Staff / Grade 1'}</strong>
                </div>
              </div>
            </div>

            <!-- Realtime Auto-Calculated Metrics -->
            <div style="display: flex; gap: 14px; flex-wrap: wrap;">
              <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); padding: 10px 16px; border-radius: var(--radius-sm); text-align: right;">
                <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase;">LAMA KERJA (LIVE)</div>
                <div id="live-tenure-badge" style="font-size: 14px; font-weight: 700; color: #34D399; font-family: var(--font-mono); margin-top: 2px;">
                  ${tenureStr}
                </div>
              </div>
              <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); padding: 10px 16px; border-radius: var(--radius-sm); text-align: right;">
                <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase;">USIA KARYAWAN (LIVE)</div>
                <div id="live-age-badge" style="font-size: 14px; font-weight: 700; color: #FCD34D; font-family: var(--font-mono); margin-top: 2px;">
                  ${ageStr}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Form 36 Fields Structured in Elegant Summary Form Cards -->
        <form id="form-employee-page" onsubmit="HCHubModule.handleSaveFullPageForm(event, '${emp.id}')">
          
          <div style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- SECTION 1: DATA JABATAN & ORGANISASI -->
            <div class="nalar-card" style="padding: 24px 28px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
                <div>
                  <span class="text-mono-badge" style="color: var(--brand-orange);">Struktur Organisasi & Status Kerja</span>
                  <h3 style="font-size: 17px; margin-top: 2px;">1. Data Pekerjaan & Jabatan Organisasi</h3>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">NIKA (Nomor Induk Karyawan)</label>
                  <input type="text" id="fp-nika" class="form-control" value="${emp.nika || emp.id}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Nama Lengkap Karyawan</label>
                  <input type="text" id="fp-name" class="form-control" value="${emp.name}" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">NIK KTP (16 Digit Sesuai e-KTP)</label>
                  <input type="text" id="fp-nik" class="form-control" value="${emp.nik || ''}" maxlength="16" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Kode Jabatan (WLKP)</label>
                  <input type="text" id="fp-kodejabatan" class="form-control" value="${emp.kodeJabatan || ''}" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Jabatan / Posisi</label>
                  <input type="text" id="fp-jabatan" class="form-control" value="${emp.jabatan || emp.roleLabel}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Level / Grade</label>
                  <select id="fp-levelgrade" class="form-control" required>
                    <option value="Staff / Grade 1" ${emp.levelGrade === 'Staff / Grade 1' ? 'selected' : ''}>Staff / Grade 1</option>
                    <option value="Senior Staff / Grade 2" ${emp.levelGrade === 'Senior Staff / Grade 2' ? 'selected' : ''}>Senior Staff / Grade 2</option>
                    <option value="Supervisor / Grade 3" ${emp.levelGrade === 'Supervisor / Grade 3' ? 'selected' : ''}>Supervisor / Grade 3</option>
                    <option value="Assistant Manager / Grade 4" ${emp.levelGrade === 'Assistant Manager / Grade 4' ? 'selected' : ''}>Assistant Manager / Grade 4</option>
                    <option value="Manager / Grade 5" ${emp.levelGrade === 'Manager / Grade 5' ? 'selected' : ''}>Manager / Grade 5</option>
                    <option value="Director / Grade 6" ${emp.levelGrade === 'Director / Grade 6' ? 'selected' : ''}>Director / Grade 6</option>
                    <option value="Executive / Grade 7" ${emp.levelGrade === 'Executive / Grade 7' ? 'selected' : ''}>Executive / Grade 7</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Divisi / Departemen</label>
                  <select id="fp-department" class="form-control" required>
                    <option value="Operasional Lapangan" ${emp.department === 'Operasional Lapangan' ? 'selected' : ''}>Operasional Lapangan</option>
                    <option value="Finance & Tax" ${emp.department === 'Finance & Tax' ? 'selected' : ''}>Finance & Tax</option>
                    <option value="Keuangan & Administrasi" ${emp.department === 'Keuangan & Administrasi' ? 'selected' : ''}>Keuangan & Administrasi</option>
                    <option value="Human Capital & People" ${emp.department === 'Human Capital & People' ? 'selected' : ''}>Human Capital & People</option>
                    <option value="Yayasan - Lapangan" ${emp.department === 'Yayasan - Lapangan' ? 'selected' : ''}>Yayasan - Lapangan</option>
                    <option value="Yayasan - Dapur & VA" ${emp.department === 'Yayasan - Dapur & VA' ? 'selected' : ''}>Yayasan - Dapur & VA</option>
                    <option value="Direksi Eksekutif" ${emp.department === 'Direksi Eksekutif' ? 'selected' : ''}>Direksi Eksekutif</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanggal Mulai Bekerja (Join Date)</label>
                  <input type="date" id="fp-joindate" class="form-control" value="${emp.joinDate || '2024-01-01'}" onchange="HCHubModule.updateLiveCalculations()" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Status Karyawan</label>
                  <select id="fp-statuskaryawan" class="form-control" required>
                    <option value="PKWT" ${emp.statusKaryawan === 'PKWT' ? 'selected' : ''}>PKWT (Perjanjian Kerja Waktu Tertentu / Kontrak)</option>
                    <option value="PKWTT" ${emp.statusKaryawan === 'PKWTT' ? 'selected' : ''}>PKWTT (Karyawan Tetap)</option>
                    <option value="PHL" ${emp.statusKaryawan === 'PHL' ? 'selected' : ''}>PHL (Pekerja Harian Lepas)</option>
                    <option value="Terminate" ${emp.statusKaryawan === 'Terminate' ? 'selected' : ''}>Terminate (Nonaktif / Resign)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Hak Kuota Cuti Tahunan (Hari)</label>
                  <input type="number" id="fp-quotaannual" class="form-control" value="${emp.quotaAnnualLeave || 12}" min="0" required>
                </div>
              </div>

              <div class="form-group" style="margin-top: 6px;">
                <label class="form-label">Penempatan Dapur Yayasan (Database SPPG)</label>
                <select id="fp-penempatandapur" class="form-control" style="font-weight: 500;">
                  <option value="">-- Kantor Pusat Yayasan (Non-Dapur SPPG) --</option>
                  ${(DB.getKitchenDropdownOptions() || []).map(k => `
                    <option value="${k.idSppg} — ${k.namaDapur}" ${emp.assignedKitchen === `${k.idSppg} — ${k.namaDapur}` || emp.assignedKitchenIdSppg === k.idSppg ? 'selected' : ''}>
                      ${k.idSppg} — ${k.namaDapur}
                    </option>
                  `).join('')}
                </select>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                  *Digunakan dalam penugasan resmi Perwakilan Yayasan & personil operasional dapur.
                </div>
              </div>
            </div>

            <!-- SECTION 2: DATA PRIBADI & KEPENDUDUKAN -->
            <div class="nalar-card" style="padding: 24px 28px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
                <div>
                  <span class="text-mono-badge" style="color: #60A5FA;">Identitas & Kependudukan</span>
                  <h3 style="font-size: 17px; margin-top: 2px;">2. Data Pribadi, Demografi & Kependudukan</h3>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tempat Lahir</label>
                  <input type="text" id="fp-birthplace" class="form-control" value="${emp.birthPlace || ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanggal Lahir</label>
                  <input type="date" id="fp-birthdate" class="form-control" value="${emp.birthDate || '1995-01-01'}" onchange="HCHubModule.updateLiveCalculations()" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Jenis Kelamin</label>
                  <select id="fp-gender" class="form-control" required>
                    <option value="Laki-laki" ${emp.gender === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                    <option value="Perempuan" ${emp.gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Agama</label>
                  <select id="fp-agama" class="form-control" required>
                    <option value="Islam" ${emp.agama === 'Islam' ? 'selected' : ''}>Islam</option>
                    <option value="Kristen Protestan" ${emp.agama === 'Kristen Protestan' ? 'selected' : ''}>Kristen Protestan</option>
                    <option value="Katolik" ${emp.agama === 'Katolik' ? 'selected' : ''}>Katolik</option>
                    <option value="Hindu" ${emp.agama === 'Hindu' ? 'selected' : ''}>Hindu</option>
                    <option value="Buddha" ${emp.agama === 'Buddha' ? 'selected' : ''}>Buddha</option>
                    <option value="Konghucu" ${emp.agama === 'Konghucu' ? 'selected' : ''}>Konghucu</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Pendidikan Terakhir</label>
                  <select id="fp-pendidikan" class="form-control" required>
                    <option value="SD" ${emp.pendidikan === 'SD' ? 'selected' : ''}>SD</option>
                    <option value="SMP" ${emp.pendidikan === 'SMP' ? 'selected' : ''}>SMP</option>
                    <option value="SMA / SMK" ${emp.pendidikan === 'SMA / SMK' ? 'selected' : ''}>SMA / SMK</option>
                    <option value="Diploma (D3)" ${emp.pendidikan === 'Diploma (D3)' ? 'selected' : ''}>Diploma (D3)</option>
                    <option value="Sarjana (S1)" ${emp.pendidikan === 'Sarjana (S1)' ? 'selected' : ''}>Sarjana (S1)</option>
                    <option value="Magister (S2)" ${emp.pendidikan === 'Magister (S2)' ? 'selected' : ''}>Magister (S2)</option>
                    <option value="Doktor (S3)" ${emp.pendidikan === 'Doktor (S3)' ? 'selected' : ''}>Doktor (S3)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Nomor Kartu Keluarga (KK)</label>
                  <input type="text" id="fp-nokk" class="form-control" value="${emp.noKK || ''}" maxlength="16">
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Status Tempat Tinggal</label>
                  <select id="fp-statustempattinggal" class="form-control">
                    <option value="Milik Sendiri" ${emp.statusTempatTinggal === 'Milik Sendiri' ? 'selected' : ''}>Milik Sendiri</option>
                    <option value="Sewa / Kontrak" ${emp.statusTempatTinggal === 'Sewa / Kontrak' ? 'selected' : ''}>Sewa / Kontrak</option>
                    <option value="Rumah Orang Tua" ${emp.statusTempatTinggal === 'Rumah Orang Tua' ? 'selected' : ''}>Rumah Orang Tua</option>
                    <option value="Mess Perusahaan" ${emp.statusTempatTinggal === 'Mess Perusahaan' ? 'selected' : ''}>Mess Perusahaan</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">No. Telepon / WhatsApp</label>
                  <input type="text" id="fp-phone" class="form-control" value="${emp.phone || ''}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Email Kantor / Pribadi</label>
                <input type="email" id="fp-email" class="form-control" value="${emp.email || ''}" required>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Alamat Sesuai KTP</label>
                  <input type="text" id="fp-alamatktp" class="form-control" value="${emp.alamatKTP || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Alamat Domisili Tinggal Sekarang</label>
                  <input type="text" id="fp-alamatdomisili" class="form-control" value="${emp.alamatDomisili || ''}">
                </div>
              </div>
            </div>

            <!-- SECTION 3: PERPAJAKAN, BPJS & REKENING BANK -->
            <div class="nalar-card" style="padding: 24px 28px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
                <div>
                  <span class="text-mono-badge" style="color: #34D399;">Kompensasi & Jaminan Sosial</span>
                  <h3 style="font-size: 17px; margin-top: 2px;">3. Perpajakan, BPJS & Payroll Perbankan</h3>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Status Pajak / PTKP</label>
                  <select id="fp-statuspajak" class="form-control" required>
                    <option value="TK/0" ${emp.statusPajak === 'TK/0' ? 'selected' : ''}>TK/0 (Tidak Kawin - 0 Tanggungan)</option>
                    <option value="TK/1" ${emp.statusPajak === 'TK/1' ? 'selected' : ''}>TK/1 (Tidak Kawin - 1 Tanggungan)</option>
                    <option value="TK/2" ${emp.statusPajak === 'TK/2' ? 'selected' : ''}>TK/2 (Tidak Kawin - 2 Tanggungan)</option>
                    <option value="TK/3" ${emp.statusPajak === 'TK/3' ? 'selected' : ''}>TK/3 (Tidak Kawin - 3 Tanggungan)</option>
                    <option value="K/0" ${emp.statusPajak === 'K/0' ? 'selected' : ''}>K/0 (Kawin - 0 Tanggungan)</option>
                    <option value="K/1" ${emp.statusPajak === 'K/1' ? 'selected' : ''}>K/1 (Kawin - 1 Tanggungan)</option>
                    <option value="K/2" ${emp.statusPajak === 'K/2' ? 'selected' : ''}>K/2 (Kawin - 2 Tanggungan)</option>
                    <option value="K/3" ${emp.statusPajak === 'K/3' ? 'selected' : ''}>K/3 (Kawin - 3 Tanggungan)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Nomor Pokok Wajib Pajak (No. NPWP)</label>
                  <input type="text" id="fp-nonpwp" class="form-control" value="${emp.noNPWP || ''}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Alamat Terdaftar pada NPWP</label>
                <input type="text" id="fp-alamatnpwp" class="form-control" value="${emp.alamatNPWP || ''}">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nama Bank</label>
                  <input type="text" id="fp-bankname" class="form-control" value="${emp.bankName || 'Bank Mandiri'}">
                </div>
                <div class="form-group">
                  <label class="form-label">Nomor Rekening Bank</label>
                  <input type="text" id="fp-rekeningno" class="form-control" value="${emp.rekeningNo || ''}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Nama Pemilik Rekening (Harus Sesuai Buku Tabungan)</label>
                <input type="text" id="fp-rekeningname" class="form-control" value="${emp.rekeningName || emp.name}">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nomor BPJS Kesehatan</label>
                  <input type="text" id="fp-nobpjskesehatan" class="form-control" value="${emp.noBPJSKesehatan || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Nomor BPJS Ketenagakerjaan</label>
                  <input type="text" id="fp-nobpjstenagakerja" class="form-control" value="${emp.noBPJSTenagaKerja || ''}">
                </div>
              </div>
            </div>

            <!-- SECTION 4: KONTAK DARURAT, TERMINASI & CATATAN -->
            <div class="nalar-card" style="padding: 24px 28px;">
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
                <div>
                  <span class="text-mono-badge" style="color: #F59E0B;">Emergency & Administrasi Akhir</span>
                  <h3 style="font-size: 17px; margin-top: 2px;">4. Kontak Darurat, Status Keluar & Catatan HRD</h3>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nama Kontak Darurat</label>
                  <input type="text" id="fp-emergencyname" class="form-control" value="${emp.emergencyName || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Hubungan dengan Kontak Darurat</label>
                  <input type="text" id="fp-emergencyrelation" class="form-control" placeholder="Contoh: Istri / Ayah Kandung / Saudara" value="${emp.emergencyRelation || ''}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Nomor Kontak Darurat</label>
                <input type="text" id="fp-emergencyphone" class="form-control" value="${emp.emergencyPhone || ''}">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Tanggal Keluar (Jika Resign/Terminate)</label>
                  <input type="date" id="fp-resigndate" class="form-control" value="${emp.resignDate || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Alasan Keluar</label>
                  <input type="text" id="fp-resignreason" class="form-control" value="${emp.resignReason || '-'}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Catatan & Keterangan Tambahan HRD</label>
                <textarea id="fp-notes" class="form-control" rows="3" placeholder="Tuliskan catatan khusus terkait performa, riwayat kontrak, dll...">${emp.notes || ''}</textarea>
              </div>
            </div>

            <!-- Sticky Bottom Action Bar -->
            <div style="background: rgba(18,14,10,0.92); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 18px 24px; display: flex; justify-content: space-between; align-items: center; backdrop-filter: blur(16px); position: sticky; bottom: 20px; z-index: 10; box-shadow: 0 10px 30px rgba(0,0,0,0.6);">
              <div style="font-size: 12.5px; color: var(--text-muted);">
                Pastikan seluruh data 36 atribut HRIS telah diverifikasi sebelum menyimpan.
              </div>
              <div style="display: flex; gap: 12px;">
                <button type="button" class="btn-nalar-secondary" onclick="HCHubModule.switchSubTab('karyawan')">
                  Batal / Kembali
                </button>
                <button type="submit" class="btn-nalar-primary" style="padding: 10px 24px; font-size: 13.5px; box-shadow: 0 4px 20px rgba(255,75,1,0.5);">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  <span>💾 Simpan Perubahan HRIS</span>
                </button>
              </div>
            </div>

          </div>
        </form>

      </div>
    `;
  },

  updateLiveCalculations: function() {
    const joinDateEl = document.getElementById('fp-joindate');
    const birthDateEl = document.getElementById('fp-birthdate');
    const tenureBadge = document.getElementById('live-tenure-badge');
    const ageBadge = document.getElementById('live-age-badge');

    if (joinDateEl && tenureBadge) {
      tenureBadge.textContent = calculateTenure(joinDateEl.value);
    }
    if (birthDateEl && ageBadge) {
      ageBadge.textContent = calculateAge(birthDateEl.value);
    }
  },

  handleSaveFullPageForm: function(e, userId) {
    e.preventDefault();
    if (!userId) return;

    const updatedData = {
      nika: document.getElementById('fp-nika').value.trim(),
      name: document.getElementById('fp-name').value.trim(),
      nik: document.getElementById('fp-nik').value.trim(),
      kodeJabatan: document.getElementById('fp-kodejabatan').value.trim(),
      jabatan: document.getElementById('fp-jabatan').value.trim(),
      roleLabel: document.getElementById('fp-jabatan').value.trim(),
      levelGrade: document.getElementById('fp-levelgrade').value,
      department: document.getElementById('fp-department').value,
      joinDate: document.getElementById('fp-joindate').value,
      statusKaryawan: document.getElementById('fp-statuskaryawan').value,
      quotaAnnualLeave: Number(document.getElementById('fp-quotaannual').value) || 12,

      birthPlace: document.getElementById('fp-birthplace').value.trim(),
      birthDate: document.getElementById('fp-birthdate').value,
      gender: document.getElementById('fp-gender').value,
      agama: document.getElementById('fp-agama').value,
      pendidikan: document.getElementById('fp-pendidikan').value,
      noKK: document.getElementById('fp-nokk').value.trim(),
      statustempattinggal: document.getElementById('fp-statustempattinggal').value,
      statusTempatTinggal: document.getElementById('fp-statustempattinggal').value,
      phone: document.getElementById('fp-phone').value.trim(),
      email: document.getElementById('fp-email').value.trim(),
      alamatKTP: document.getElementById('fp-alamatktp').value.trim(),
      alamatDomisili: document.getElementById('fp-alamatdomisili').value.trim(),

      statusPajak: document.getElementById('fp-statuspajak').value,
      noNPWP: document.getElementById('fp-nonpwp').value.trim(),
      alamatNPWP: document.getElementById('fp-alamatnpwp').value.trim(),
      bankName: document.getElementById('fp-bankname').value.trim(),
      rekeningNo: document.getElementById('fp-rekeningno').value.trim(),
      rekeningName: document.getElementById('fp-rekeningname').value.trim(),
      noBPJSKesehatan: document.getElementById('fp-nobpjskesehatan').value.trim(),
      noBPJSTenagaKerja: document.getElementById('fp-nobpjstenagakerja').value.trim(),

      emergencyName: document.getElementById('fp-emergencyname').value.trim(),
      emergencyRelation: document.getElementById('fp-emergencyrelation').value.trim(),
      emergencyPhone: document.getElementById('fp-emergencyphone').value.trim(),
      resignDate: document.getElementById('fp-resigndate').value || null,
      resignReason: document.getElementById('fp-resignreason').value.trim(),
      assignedKitchen: document.getElementById('fp-penempatandapur') ? document.getElementById('fp-penempatandapur').value : '',
      notes: document.getElementById('fp-notes').value.trim()
    };

    DB.updateEmployeeData(userId, updatedData);
    App.showToast(`Seluruh data HRIS & Penempatan Dapur untuk "${updatedData.name}" berhasil disimpan!`, 'success');
    App.updateUserHeader();
    this.switchSubTab('karyawan');
  },

  // 3. View Pengelolaan Akun & Password
  renderAkunView: function(users) {
    return `
      <div class="nalar-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
          <div>
            <span class="text-mono-badge" style="color: var(--brand-orange);">Access Control & Identity</span>
            <h3 style="font-size: 18px; margin-top: 2px;">Pengelolaan Akun Pengguna & Kredensial Login</h3>
          </div>
          <button class="btn-nalar-primary" onclick="HCHubModule.openAddUserModal()">
            + Buat Akun Baru
          </button>
        </div>

        <div class="nalar-table-container">
          <table class="nalar-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Nama Pengguna</th>
                <th>Username Login</th>
                <th>Password (Kredensial)</th>
                <th>Role Sistem</th>
                <th>Status Akun</th>
                <th>Aksi / Kelola</th>
              </tr>
            </thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td style="font-family: var(--font-mono); color: var(--brand-orange); font-weight: 600;">${u.id}</td>
                  <td>
                    <div style="font-weight: 600; color: #fff;">${u.name}</div>
                    <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${u.department}</div>
                  </td>
                  <td style="font-family: var(--font-mono); font-weight: 600; color: #60A5FA;">
                    @${u.username || u.id.toLowerCase()}
                  </td>
                  <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span id="pwd-text-${u.id}" style="font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; letter-spacing: 0.1em;">
                        ••••••••
                      </span>
                      <button type="button" style="background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 2px;" title="Lihat Password" onclick="HCHubModule.togglePasswordVisibility('${u.id}', '${u.password || 'password123'}')">
                        👁️
                      </button>
                    </div>
                  </td>
                  <td>
                    <span class="badge-status badge-approved" style="font-size: 10px;">${u.roleLabel}</span>
                  </td>
                  <td>
                    <span class="live-status-pill" style="padding: 2px 8px; font-size: 10px;">
                      <span class="live-dot"></span> Aktif
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn-preview-link" style="padding: 4px 8px; font-size: 10px;" onclick="HCHubModule.promptResetPassword('${u.id}', '${u.name}')">
                        🔑 Reset Pwd
                      </button>
                      <button class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 10px; border-color: rgba(248,113,113,0.4); color: #F87171;" onclick="HCHubModule.handleDeleteUser('${u.id}', '${u.name}')">
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 4. View Pusat Panduan & Dokumen Sosialisasi Yayasan (PDF & PPT)
  renderDokumenView: function(docs) {
    return `
      <div class="nalar-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
          <div>
            <span class="text-mono-badge" style="color: #FB7185;">Pusat Sumber Daya & Knowledge Management</span>
            <h3 style="font-size: 18px; margin-top: 2px;">Manajemen Dokumen Sosialisasi & Panduan Yayasan (PDF/PPT)</h3>
          </div>
          <button class="btn-nalar-primary" onclick="HCHubModule.openAddDocModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
            + Upload Dokumen / PPT Baru
          </button>
        </div>

        <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 24px;">
          Dokumen dan slide presentasi yang diunggah di sini akan otomatis muncul di section dashboard khusus milik role <strong style="color: #FB7185;">Perwakilan Yayasan</strong> dan <strong style="color: #FDA4AF;">Maker Yayasan</strong> serta siap diunduh (*downloadable*):
        </p>

        <div class="nalar-table-container">
          <table class="nalar-table">
            <thead>
              <tr>
                <th>Format</th>
                <th>Judul Dokumen & Deskripsi</th>
                <th>Kategori</th>
                <th>Target Ditampilkan Pada</th>
                <th>Ukuran File</th>
                <th>Tanggal Upload</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              ${docs.length === 0 ? `
                <tr>
                  <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 32px;">Belum ada dokumen panduan atau slide sosialisasi yang diunggah.</td>
                </tr>
              ` : docs.map(d => `
                <tr>
                  <td>
                    <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px; background: ${d.fileType === 'PDF' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; border: 1px solid ${d.fileType === 'PDF' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}; color: ${d.fileType === 'PDF' ? '#F87171' : '#FCD34D'}; font-weight: 700; font-family: var(--font-mono); font-size: 11px;">
                      ${d.fileType}
                    </span>
                  </td>
                  <td>
                    <div style="font-weight: 600; color: #fff; line-height: 1.3;">${d.title}</div>
                    <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px; max-width: 320px;">${d.description}</div>
                  </td>
                  <td>
                    <span class="text-mono-badge" style="font-size: 10px; color: var(--text-secondary);">${d.category}</span>
                  </td>
                  <td>
                    <span class="badge-status ${d.targetRole === 'PERWAKILAN_YAYASAN' ? 'badge-rejected' : d.targetRole === 'MAKER_YAYASAN' ? 'badge-pending' : 'badge-approved'}" style="font-size: 10.5px;">
                      ${d.targetLabel}
                    </span>
                  </td>
                  <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-secondary);">${d.fileSize}</td>
                  <td style="font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted);">${d.uploadDate}</td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <button class="btn-preview-link" style="padding: 4px 8px; font-size: 10px; background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.35); color: #60A5FA;" onclick="HCHubModule.downloadDocument('${d.id}')">
                        📥 Unduh
                      </button>
                      <button class="btn-preview-link" style="padding: 4px 8px; font-size: 10px;" onclick="DashboardModule.openDocPreview('${d.id}', '${d.title.replace(/'/g, "\\'")}', '${d.fileType}', '${d.description.replace(/'/g, "\\'")}')">
                        👁️ Preview
                      </button>
                      <button class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 10px; border-color: rgba(248,113,113,0.4); color: #F87171;" onclick="HCHubModule.handleDeleteDoc('${d.id}', '${d.title.replace(/'/g, "\\'")}')">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // 5. View Export Timesheet Karyawan (.xlsx)
  renderTimesheetExportView: function(users) {
    const filter = this.exportFilterState;
    const allTimesheets = DB.getTimesheets() || [];
    const reportData = this.getFilteredTimesheetData(users);

    // Calculate Summary KPIs
    const totalRecords = reportData.length;
    const totalHours = reportData.reduce((sum, r) => sum + (Number(r.totalHours) || Number(r.hours) || 0), 0);
    const completeCount = reportData.filter(r => r.statusKey === 'COMPLETE').length;
    const incompleteCount = reportData.filter(r => r.statusKey === 'INCOMPLETE').length;
    const emptyCount = reportData.filter(r => r.statusKey === 'EMPTY').length;
    const complianceRate = totalRecords > 0 ? Math.round((completeCount / totalRecords) * 100) : 0;

    // Pagination (Maksimal 10 nomor per halaman)
    const pageSize = filter.pageSize || 10;
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;
    const currentPage = Math.min(Math.max(1, filter.currentPage || 1), totalPages);
    filter.currentPage = currentPage;

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedRows = reportData.slice(startIndex, startIndex + pageSize);

    // Distinct roles list for dropdown
    const roleOptions = Array.from(new Set(users.map(u => u.role))).map(roleKey => {
      const u = users.find(x => x.role === roleKey);
      return { role: roleKey, label: u ? u.roleLabel : roleKey };
    });

    // Generate Pagination Number Buttons
    let pageButtonsHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
        pageButtonsHtml += `
          <button type="button" class="btn-preset-pill ${p === currentPage ? 'active' : ''}" 
                  style="min-width: 28px; text-align: center; font-weight: ${p === currentPage ? '700' : '400'}; ${p === currentPage ? 'background: rgba(16, 185, 129, 0.25); border-color: #34D399; color: #34D399;' : ''}" 
                  onclick="HCHubModule.changeExportPage(${p})">
            ${p}
          </button>
        `;
      } else if (p === currentPage - 2 || p === currentPage + 2) {
        pageButtonsHtml += `<span style="color: var(--text-muted); font-size: 11px; padding: 0 2px;">...</span>`;
      }
    }

    return `
      <div>
        <!-- Filter & Parameter Box -->
        <div class="nalar-card" style="margin-bottom: 24px; border: 1px solid rgba(16, 185, 129, 0.25); background: linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(15, 23, 42, 0.45) 100%);">
          
          <!-- Header Bar with Download Excel Button -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid rgba(255,255,255,0.07); padding-bottom: 14px; flex-wrap: wrap; gap: 14px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="text-mono-badge" style="color: #34D399; background: rgba(16, 185, 129, 0.12); padding: 2px 8px; border-radius: 4px; font-size: 11px;">Filter & Parameter</span>
                <span style="font-size: 12px; color: var(--text-muted);">Audit Kepatuhan & Rekapitulasi Kerja</span>
              </div>
              <h3 style="font-size: 18px; margin-top: 4px; font-weight: 600;">Konfigurasi Penarikan & Fetching Timesheet</h3>
            </div>
            
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); border-color: #34D399; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); font-weight: 600; padding: 8px 18px; font-size: 13px;" 
                    onclick="HCHubModule.exportTimesheetToExcel()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              <span>Download Excel (.xlsx)</span>
            </button>
          </div>

          <!-- Bar 1: Periode Tanggal & Tombol Fetching & Presets -->
          <div style="background: rgba(0, 0, 0, 0.28); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
              
              <!-- Date Range Inputs + Fetch Button -->
              <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                <label style="font-size: 12px; font-weight: 600; color: #CBD5E1; display: flex; align-items: center; gap: 5px; margin: 0;">
                  <span>📅 Rentang Tanggal:</span>
                </label>
                
                <input type="date" id="ts-filter-start" class="form-control" value="${filter.startDate}" style="width: 140px; padding: 6px 10px; font-size: 12px; font-family: var(--font-mono); margin: 0;">
                <span style="color: var(--text-muted); font-size: 12px;">s.d</span>
                <input type="date" id="ts-filter-end" class="form-control" value="${filter.endDate}" style="width: 140px; padding: 6px 10px; font-size: 12px; font-family: var(--font-mono); margin: 0;">
                
                <button type="button" class="btn-nalar-primary" style="padding: 6px 14px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; background: #059669; border-color: #34D399; margin: 0;" 
                        onclick="HCHubModule.handleProcessFetch()" title="Tarik data timesheet sesuai rentang tanggal">
                  <span>⚡ Proses Data</span>
                </button>
              </div>

              <!-- Quick Presets -->
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span style="font-size: 11px; color: var(--text-muted); margin-right: 2px;">Preset:</span>
                <button type="button" class="btn-preset-pill ${(filter.preset === 'last7' || !filter.preset) ? 'active' : ''}" onclick="HCHubModule.setExportDatePreset('last7')">1 Minggu (Default)</button>
                <button type="button" class="btn-preset-pill ${filter.preset === 'today' ? 'active' : ''}" onclick="HCHubModule.setExportDatePreset('today')">Hari Ini</button>
                <button type="button" class="btn-preset-pill ${filter.preset === 'thisMonth' ? 'active' : ''}" onclick="HCHubModule.setExportDatePreset('thisMonth')">Bulan Ini</button>
                <button type="button" class="btn-preset-pill ${filter.preset === 'q3' ? 'active' : ''}" onclick="HCHubModule.setExportDatePreset('q3')">Kuartal 3 (Q3)</button>
              </div>

            </div>
          </div>

          <!-- Bar 2: 3 Dropdown Filter Columns -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px;">
            
            <!-- Filter 1: Filter Status Pengisian -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 5px; font-size: 12px; font-weight: 600;">
                <span>⚡ Status Pengisian</span>
                <span style="font-size: 10.5px; color: ${filter.statusFilter === 'EMPTY' ? '#F87171' : '#34D399'}; font-family: var(--font-mono);">
                  ${filter.statusFilter === 'EMPTY' ? '● Fokus: Belum Isi' : '● Filter Aktif'}
                </span>
              </label>
              <select id="ts-filter-status" class="form-control" onchange="HCHubModule.handleExportFilterChange()" style="padding: 7px 10px; font-size: 12px;">
                <option value="EMPTY" ${filter.statusFilter === 'EMPTY' ? 'selected' : ''}>🔴 Khusus User Belum Mengisi (0 Jam - Default)</option>
                <option value="INCOMPLETE" ${filter.statusFilter === 'INCOMPLETE' ? 'selected' : ''}>🟡 User Belum Lengkap (&lt; 8 Jam / Hari)</option>
                <option value="COMPLETE" ${filter.statusFilter === 'COMPLETE' ? 'selected' : ''}>🟢 User Sudah Lengkap (≥ 8 Jam / Hari)</option>
                <option value="ALL" ${filter.statusFilter === 'ALL' ? 'selected' : ''}>🌐 Semua Status Karyawan</option>
              </select>
            </div>

            <!-- Filter 2: Target Karyawan / Role -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="margin-bottom: 5px; font-size: 12px; font-weight: 600;">👥 Target Karyawan / Role</label>
              <select id="ts-filter-target-type" class="form-control" onchange="HCHubModule.handleExportFilterChange()" style="padding: 7px 10px; font-size: 12px;">
                <option value="ALL" ${filter.targetType === 'ALL' ? 'selected' : ''}>🌐 Semua Karyawan (Seluruh 11 Role)</option>
                <option value="ROLE" ${filter.targetType === 'ROLE' ? 'selected' : ''}>🏢 Spesifik Berdasarkan Role / Jabatan</option>
                <option value="USER" ${filter.targetType === 'USER' ? 'selected' : ''}>👤 Spesifik Individu Karyawan</option>
              </select>

              ${filter.targetType === 'ROLE' ? `
                <select id="ts-filter-role" class="form-control" onchange="HCHubModule.handleExportFilterChange()" style="margin-top: 6px; padding: 6px 10px; font-size: 11.5px;">
                  <option value="ALL">-- Pilih Role Jabatan --</option>
                  ${roleOptions.map(r => `
                    <option value="${r.role}" ${filter.selectedRole === r.role ? 'selected' : ''}>${r.label} (${r.role})</option>
                  `).join('')}
                </select>
              ` : filter.targetType === 'USER' ? `
                <select id="ts-filter-user" class="form-control" onchange="HCHubModule.handleExportFilterChange()" style="margin-top: 6px; padding: 6px 10px; font-size: 11.5px;">
                  <option value="ALL">-- Pilih Nama Karyawan --</option>
                  ${users.map(u => `
                    <option value="${u.id}" ${filter.selectedUserId === u.id ? 'selected' : ''}>${u.name} — ${u.roleLabel} (${u.nika})</option>
                  `).join('')}
                </select>
              ` : ''}
            </div>

            <!-- Filter 3: Cakupan Format Excel -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="margin-bottom: 5px; font-size: 12px; font-weight: 600;">📊 Format Laporan Excel</label>
              <select id="ts-filter-scope" class="form-control" onchange="HCHubModule.handleExportFilterChange()" style="padding: 7px 10px; font-size: 12px;">
                <option value="SUMMARY" ${filter.formatScope === 'SUMMARY' ? 'selected' : ''}>
                  📑 Ringkasan Status Harian & Total Jam
                </option>
                <option value="DETAIL" ${filter.formatScope === 'DETAIL' ? 'selected' : ''}>
                  📋 Informasi Timesheet Lengkap & Rincian Log
                </option>
              </select>
            </div>

          </div>
        </div>

        <!-- 4 Executive KPI Stat Cards -->
        <div class="kpi-stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); margin-bottom: 24px; gap: 14px;">
          
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Total Rekod Dievaluasi</span>
              <span style="font-size: 10px; color: #60A5FA; font-family: var(--font-mono); font-weight: 600;">HARI KERJA</span>
            </div>
            <div class="kpi-chip-value" style="color: #93C5FD; font-weight: 700;">
              ${totalRecords} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Baris</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Periode ${filter.startDate} s.d ${filter.endDate}</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box" style="border-color: rgba(248, 113, 113, 0.35); background: rgba(248, 113, 113, 0.04);">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title" style="color: #FCA5A5;">Belum Mengisi (0 Jam)</span>
              <span style="font-size: 10px; color: #F87171; font-family: var(--font-mono); font-weight: 600;">PERLU TINDAKAN</span>
            </div>
            <div class="kpi-chip-value" style="color: #F87171; font-weight: 700;">
              ${emptyCount} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Entri</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-warn" style="color: #FCA5A5;">● Karyawan tanpa log timesheet</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Belum Lengkap (&lt; 8 Jam)</span>
              <span style="font-size: 10px; color: #F59E0B; font-family: var(--font-mono); font-weight: 600;">KURANG JAM</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCD34D; font-weight: 700;">
              ${incompleteCount} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Entri</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-warn">● Belum memenuhi kuota 8 jam harian</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Sudah Lengkap (≥ 8 Jam)</span>
              <span style="font-size: 10px; color: #34D399; font-family: var(--font-mono); font-weight: 600;">KEPATUHAN ${complianceRate}%</span>
            </div>
            <div class="kpi-chip-value" style="color: #6EE7B7; font-weight: 700;">
              ${completeCount} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Entri</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Memenuhi kuota kerja standar harian</span>
            </div>
          </div>

        </div>

        <!-- Tabel Live Preview Data (Maksimal 10 Baris per Halaman) -->
        <div class="nalar-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
            <div>
              <span class="text-mono-badge" style="color: ${filter.statusFilter === 'EMPTY' ? '#F87171' : '#34D399'};">
                ${filter.statusFilter === 'EMPTY' ? 'Audit Kepatuhan: Belum Mengisi' : 'Data Grid Preview'}
              </span>
              <h3 style="font-size: 17px; margin-top: 2px;">
                ${filter.statusFilter === 'EMPTY' 
                  ? 'Daftar Karyawan yang Belum Mengisi Timesheet' 
                  : filter.statusFilter === 'INCOMPLETE' 
                  ? 'Daftar Karyawan dengan Jam Kerja Belum Lengkap (&lt; 8 Jam)' 
                  : 'Preview Rekapitulasi Status & Total Jam Kerja'}
              </h3>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
              Menampilkan <strong style="color: #fff;">${totalRecords > 0 ? startIndex + 1 : 0}</strong> - <strong style="color: #fff;">${Math.min(startIndex + pageSize, totalRecords)}</strong> dari total <strong style="color: ${filter.statusFilter === 'EMPTY' ? '#F87171' : '#34D399'};">${totalRecords}</strong> data
            </div>
          </div>

          <div class="nalar-table-container">
            <table class="nalar-table">
              <thead>
                ${filter.formatScope === 'SUMMARY' ? `
                  <tr>
                    <th style="width: 50px;">No</th>
                    <th>Tanggal</th>
                    <th>Nama Karyawan & Role</th>
                    <th>NIKA & Divisi</th>
                    <th style="text-align: center;">Total Jam Terisi</th>
                    <th style="text-align: center;">Status Timesheet</th>
                    <th>Keterangan / Evaluasi HC</th>
                    <th style="text-align: center;">Tindakan</th>
                  </tr>
                ` : `
                  <tr>
                    <th style="width: 45px;">No</th>
                    <th>ID & Tanggal</th>
                    <th>Nama Karyawan & Role</th>
                    <th>Waktu & Durasi</th>
                    <th>Kategori Aktivitas</th>
                    <th>Uraian Detail Pekerjaan</th>
                    <th style="text-align: center;">Status Pengisian</th>
                    <th>Status Approval</th>
                  </tr>
                `}
              </thead>
              <tbody>
                ${paginatedRows.length === 0 ? `
                  <tr>
                    <td colspan="${filter.formatScope === 'SUMMARY' ? '8' : '8'}" style="text-align: center; color: var(--text-muted); padding: 36px;">
                      🎉 Tidak ada data yang sesuai filter (Misal: seluruh karyawan telah mengisi timesheet dengan lengkap pada periode ${filter.startDate} s.d ${filter.endDate}).
                    </td>
                  </tr>
                ` : paginatedRows.map((row, idx) => `
                  <tr>
                    <td style="font-family: var(--font-mono); color: var(--text-muted); font-weight: 600;">
                      ${startIndex + idx + 1}
                    </td>
                    
                    ${filter.formatScope === 'SUMMARY' ? `
                      <td style="font-family: var(--font-mono); color: #fff; font-weight: 600; font-size: 12px;">${row.date}</td>
                      <td>
                        <div style="font-weight: 600; color: #fff;">${row.userName}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${row.roleLabel}</div>
                      </td>
                      <td>
                        <div style="font-family: var(--font-mono); color: #A78BFA; font-size: 11.5px; font-weight: 600;">${row.nika}</div>
                        <div style="font-size: 10.5px; color: var(--text-muted);">${row.department}</div>
                      </td>
                      <td style="text-align: center;">
                        <span style="font-family: var(--font-mono); font-weight: 700; font-size: 13.5px; color: ${row.statusKey === 'COMPLETE' ? '#34D399' : row.statusKey === 'INCOMPLETE' ? '#FCD34D' : '#F87171'};">
                          ${row.totalHours.toFixed(1)} Jam
                        </span>
                      </td>
                      <td style="text-align: center;">
                        <span class="badge-status ${row.badgeClass}" style="font-size: 11px; font-weight: 600;">
                          ${row.statusLabel}
                        </span>
                      </td>
                      <td>
                        <span style="font-size: 11.5px; color: ${row.statusKey === 'COMPLETE' ? '#34D399' : row.statusKey === 'INCOMPLETE' ? '#FCD34D' : 'var(--text-muted)'};">
                          ${row.notes}
                        </span>
                      </td>
                      <td style="text-align: center;">
                        ${row.statusKey === 'EMPTY' ? `
                          <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: #F87171; border-color: rgba(248,113,113,0.35);" 
                                  onclick="HCHubModule.sendTimesheetReminder('${row.userId}', '${row.userName.replace(/'/g, "\\'")}', '${row.date}')" title="Kirim notifikasi pengingat timesheet">
                            🔔 Ingatkan
                          </button>
                        ` : `
                          <span style="font-size: 11px; color: #34D399; font-family: var(--font-mono);">✓ Sesuai</span>
                        `}
                      </td>
                    ` : `
                      <td>
                        <div style="font-family: var(--font-mono); color: var(--brand-orange); font-weight: 600; font-size: 11px;">${row.id || '-'}</div>
                        <div style="font-family: var(--font-mono); color: #fff; font-size: 11px;">${row.date}</div>
                      </td>
                      <td>
                        <div style="font-weight: 600; color: #fff;">${row.userName}</div>
                        <div style="font-size: 10.5px; color: var(--text-muted); font-family: var(--font-mono);">${row.roleLabel} (${row.nika})</div>
                      </td>
                      <td>
                        <div style="font-family: var(--font-mono); color: #fff; font-size: 11.5px;">${row.startTime || '-'} - ${row.endTime || '-'}</div>
                        <div style="font-size: 11.5px; color: var(--brand-orange); font-weight: 700; font-family: var(--font-mono);">${row.hours} Jam</div>
                      </td>
                      <td>
                        <span style="font-size: 11.5px; color: #A78BFA; font-weight: 600;">${row.activityPreset || 'Reguler'}</span>
                      </td>
                      <td>
                        <div style="font-size: 11.5px; color: var(--text-secondary); max-width: 320px; line-height: 1.4;">${row.activity || '-'}</div>
                      </td>
                      <td style="text-align: center;">
                        <span class="badge-status ${row.badgeClass}" style="font-size: 10.5px;">
                          ${row.statusLabel}
                        </span>
                      </td>
                      <td>
                        <span class="badge-status ${row.approvalStatus === 'APPROVED' ? 'badge-approved' : row.approvalStatus === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}" style="font-size: 10px;">
                          ${row.approvalStatus === 'APPROVED' ? 'Disetujui' : row.approvalStatus === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
                        </span>
                        <div style="font-size: 9.5px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 2px;">${row.approver || '-'}</div>
                      </td>
                    `}
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Pagination Bar (Batasan 10 Data per Halaman) -->
          ${totalPages > 1 ? `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-card); flex-wrap: wrap; gap: 12px;">
              <div style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">
                Halaman <strong style="color: #fff;">${currentPage}</strong> dari <strong style="color: #fff;">${totalPages}</strong> (10 Data/Halaman)
              </div>

              <div style="display: flex; align-items: center; gap: 6px;">
                <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px;" 
                        onclick="HCHubModule.changeExportPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}>
                  ‹ Sebelumnya
                </button>
                
                ${pageButtonsHtml}

                <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px;" 
                        onclick="HCHubModule.changeExportPage(${currentPage + 1})" ${currentPage >= totalPages ? 'disabled style="opacity: 0.35; cursor: not-allowed;"' : ''}>
                  Selanjutnya ›
                </button>
              </div>
            </div>
          ` : ''}

        </div>

      </div>
    `;
  },

  handleProcessFetch: function() {
    const startEl = document.getElementById('ts-filter-start');
    const endEl = document.getElementById('ts-filter-end');
    const targetTypeEl = document.getElementById('ts-filter-target-type');
    const roleEl = document.getElementById('ts-filter-role');
    const userEl = document.getElementById('ts-filter-user');
    const scopeEl = document.getElementById('ts-filter-scope');
    const statusEl = document.getElementById('ts-filter-status');

    if (startEl) this.exportFilterState.startDate = startEl.value;
    if (endEl) this.exportFilterState.endDate = endEl.value;
    if (targetTypeEl) this.exportFilterState.targetType = targetTypeEl.value;
    if (roleEl) this.exportFilterState.selectedRole = roleEl.value;
    if (userEl) this.exportFilterState.selectedUserId = userEl.value;
    if (scopeEl) this.exportFilterState.formatScope = scopeEl.value;
    if (statusEl) this.exportFilterState.statusFilter = statusEl.value;

    this.exportFilterState.currentPage = 1;
    this.render(document.getElementById('main-content-area'));
    App.showToast(`Data timesheet periode ${this.exportFilterState.startDate} s.d ${this.exportFilterState.endDate} berhasil diproses!`, 'success');
  },

  changeExportPage: function(page) {
    const users = DB.getUsers() || [];
    const reportData = this.getFilteredTimesheetData(users);
    const totalPages = Math.ceil(reportData.length / this.exportFilterState.pageSize) || 1;
    if (page < 1 || page > totalPages) return;
    this.exportFilterState.currentPage = page;
    this.render(document.getElementById('main-content-area'));
  },

  sendTimesheetReminder: function(userId, userName, date) {
    App.showToast(`Pengingat timesheet tanggal ${date} berhasil dikirimkan ke ${userName}!`, 'success');
  },

  setExportDatePreset: function(presetKey) {
    const today = new Date();
    let startStr = '';
    let endStr = today.toISOString().slice(0, 10);

    if (presetKey === 'today') {
      startStr = endStr;
    } else if (presetKey === 'last7') {
      const past = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
      startStr = past.toISOString().slice(0, 10);
    } else if (presetKey === 'thisMonth') {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      startStr = `${y}-${m}-01`;
    } else if (presetKey === 'q3') {
      startStr = '2026-07-01';
      endStr = '2026-09-30';
    } else if (presetKey === 'all') {
      startStr = '2026-01-01';
      endStr = '2026-12-31';
    }

    this.exportFilterState.startDate = startStr;
    this.exportFilterState.endDate = endStr;
    this.exportFilterState.preset = presetKey;
    this.exportFilterState.currentPage = 1;
    this.render(document.getElementById('main-content-area'));
  },

  handleExportFilterChange: function() {
    const startEl = document.getElementById('ts-filter-start');
    const endEl = document.getElementById('ts-filter-end');
    const targetTypeEl = document.getElementById('ts-filter-target-type');
    const roleEl = document.getElementById('ts-filter-role');
    const userEl = document.getElementById('ts-filter-user');
    const scopeEl = document.getElementById('ts-filter-scope');
    const statusEl = document.getElementById('ts-filter-status');

    if (startEl) this.exportFilterState.startDate = startEl.value;
    if (endEl) this.exportFilterState.endDate = endEl.value;
    if (targetTypeEl) this.exportFilterState.targetType = targetTypeEl.value;
    if (roleEl) this.exportFilterState.selectedRole = roleEl.value;
    if (userEl) this.exportFilterState.selectedUserId = userEl.value;
    if (scopeEl) this.exportFilterState.formatScope = scopeEl.value;
    if (statusEl) this.exportFilterState.statusFilter = statusEl.value;

    this.exportFilterState.currentPage = 1;
    this.render(document.getElementById('main-content-area'));
  },

  getFilteredTimesheetData: function(users) {
    const filter = this.exportFilterState;
    const allTimesheets = DB.getTimesheets() || [];

    // 1. Determine Target Users
    let targetUsers = [...users];
    if (filter.targetType === 'ROLE' && filter.selectedRole && filter.selectedRole !== 'ALL') {
      targetUsers = users.filter(u => u.role === filter.selectedRole);
    } else if (filter.targetType === 'USER' && filter.selectedUserId && filter.selectedUserId !== 'ALL') {
      targetUsers = users.filter(u => u.id === filter.selectedUserId);
    }

    // 2. Generate Dates in Range (day by day)
    const startDate = new Date(filter.startDate);
    const endDate = new Date(filter.endDate);
    const dateList = [];

    // Safety limit to max 180 days
    const cur = new Date(startDate.getTime());
    let safetyCounter = 0;
    while (cur <= endDate && safetyCounter < 180) {
      dateList.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
      safetyCounter++;
    }

    const rows = [];

    // 3. Construct Data based on format scope
    if (filter.formatScope === 'SUMMARY') {
      // Each day for each target employee
      for (const dStr of dateList) {
        for (const u of targetUsers) {
          const userLogs = allTimesheets.filter(t => t.employeeId === u.id && t.date === dStr);
          const totalHours = userLogs.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
          const approvedLeave = DB.getUserApprovedLeaveOnDate(u.id, dStr);

          let statusKey = 'EMPTY';
          let statusLabel = 'Belum Mengisi';
          let badgeClass = 'badge-rejected';
          let notes = 'Tidak ada log aktivitas (0 Jam)';

          if (approvedLeave && !approvedLeave.isHalfDay) {
            statusKey = 'ON_LEAVE';
            statusLabel = '🏖️ Cuti Resmi';
            badgeClass = 'badge-approved';
            notes = `Sedang Cuti Resmi: ${approvedLeave.type} (${approvedLeave.reason})`;
          } else if (totalHours >= 8 || (approvedLeave && approvedLeave.isHalfDay && totalHours >= 4)) {
            statusKey = 'COMPLETE';
            statusLabel = 'Sudah Lengkap';
            badgeClass = 'badge-approved';
            notes = approvedLeave && approvedLeave.isHalfDay ? `Cuti 0.5 Hari + Kerja ${totalHours} Jam` : `Lengkap memenuhi standar kerja (${totalHours} Jam)`;
          } else if (totalHours > 0) {
            statusKey = 'INCOMPLETE';
            statusLabel = 'Belum Lengkap';
            badgeClass = 'badge-pending';
            notes = `Kurang ${(8 - totalHours).toFixed(1)} Jam dari kuota standar 8 jam`;
          }

          // Filter by status if applied
          if (filter.statusFilter === 'ALL' || filter.statusFilter === statusKey) {
            rows.push({
              date: dStr,
              userId: u.id,
              nika: u.nika || '-',
              userName: u.name,
              role: u.role,
              roleLabel: u.roleLabel,
              department: u.department,
              totalHours,
              statusKey,
              statusLabel,
              badgeClass,
              notes
            });
          }
        }
      }
    } else {
      // DETAIL SCOPE: Activity log details
      for (const dStr of dateList) {
        for (const u of targetUsers) {
          const userLogs = allTimesheets.filter(t => t.employeeId === u.id && t.date === dStr);
          const dayTotalHours = userLogs.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);

          let dayStatusKey = 'EMPTY';
          let dayStatusLabel = 'Belum Mengisi';
          let dayBadgeClass = 'badge-rejected';

          if (dayTotalHours >= 8) {
            dayStatusKey = 'COMPLETE';
            dayStatusLabel = 'Sudah Lengkap';
            dayBadgeClass = 'badge-approved';
          } else if (dayTotalHours > 0) {
            dayStatusKey = 'INCOMPLETE';
            dayStatusLabel = 'Belum Lengkap';
            dayBadgeClass = 'badge-pending';
          }

          if (userLogs.length > 0) {
            for (const log of userLogs) {
              if (filter.statusFilter === 'ALL' || filter.statusFilter === dayStatusKey) {
                rows.push({
                  id: log.id,
                  date: dStr,
                  userId: u.id,
                  nika: u.nika || '-',
                  userName: u.name,
                  role: u.role,
                  roleLabel: u.roleLabel,
                  department: u.department,
                  startTime: log.startTime,
                  endTime: log.endTime,
                  hours: Number(log.hours) || 0,
                  totalHours: Number(log.hours) || 0,
                  activityPreset: log.activityPreset || 'Reguler',
                  activity: log.activity,
                  approvalStatus: log.status,
                  approver: log.approver,
                  statusKey: dayStatusKey,
                  statusLabel: dayStatusLabel,
                  badgeClass: dayBadgeClass
                });
              }
            }
          } else {
            // Day with 0 hours logged
            if (filter.statusFilter === 'ALL' || filter.statusFilter === 'EMPTY') {
              rows.push({
                id: '-',
                date: dStr,
                userId: u.id,
                nika: u.nika || '-',
                userName: u.name,
                role: u.role,
                roleLabel: u.roleLabel,
                department: u.department,
                startTime: '-',
                endTime: '-',
                hours: 0,
                totalHours: 0,
                activityPreset: '-',
                activity: 'Tidak ada entri log timesheet pada tanggal ini (0 Jam)',
                approvalStatus: 'NONE',
                approver: '-',
                statusKey: 'EMPTY',
                statusLabel: 'Belum Mengisi',
                badgeClass: 'badge-rejected'
              });
            }
          }
        }
      }
    }

    return rows;
  },

  exportTimesheetToExcel: function() {
    const users = DB.getUsers() || [];
    const filter = this.exportFilterState;
    const reportData = this.getFilteredTimesheetData(users);
    const currentUser = DB.getCurrentUser();

    if (reportData.length === 0) {
      App.showToast('Tidak ada data timesheet untuk diekspor pada filter yang dipilih!', 'warn');
      return;
    }

    const totalRecords = reportData.length;
    const totalHours = reportData.reduce((sum, r) => sum + (Number(r.totalHours) || Number(r.hours) || 0), 0);
    const completeCount = reportData.filter(r => r.statusKey === 'COMPLETE').length;
    const incompleteCount = reportData.filter(r => r.statusKey === 'INCOMPLETE').length;
    const emptyCount = reportData.filter(r => r.statusKey === 'EMPTY').length;
    const compliancePct = totalRecords > 0 ? ((completeCount / totalRecords) * 100).toFixed(1) : '0';

    const now = new Date();
    const exportTimeStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    let targetLabel = 'Seluruh Karyawan (11 Role Organisasi)';
    if (filter.targetType === 'ROLE') {
      targetLabel = `Role: ${filter.selectedRole}`;
    } else if (filter.targetType === 'USER') {
      const u = users.find(x => x.id === filter.selectedUserId);
      targetLabel = u ? `Karyawan: ${u.name} (${u.roleLabel})` : 'Karyawan Spesifik';
    }

    const scopeTitle = filter.formatScope === 'SUMMARY' 
      ? 'RINGKASAN STATUS KEPATUHAN & TOTAL JAM KERJA HARIAN' 
      : 'RINCIAN LENGKAP LOG AKTIVITAS & TIMESHEET PEKERJAAN';

    let tableHtml = '';

    if (filter.formatScope === 'SUMMARY') {
      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #1E1B4B; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px; width: 40px;">No</th>
              <th style="padding: 10px; width: 100px;">Tanggal</th>
              <th style="padding: 10px; width: 110px;">NIKA</th>
              <th style="padding: 10px; width: 180px;">Nama Karyawan</th>
              <th style="padding: 10px; width: 160px;">Role / Jabatan</th>
              <th style="padding: 10px; width: 140px;">Divisi / Departemen</th>
              <th style="padding: 10px; width: 120px;">Total Jam Kerja</th>
              <th style="padding: 10px; width: 160px;">Status Pengisian Timesheet</th>
              <th style="padding: 10px; width: 240px;">Keterangan & Evaluasi Kepatuhan</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map((row, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              let statusBg = '#D1FAE5';
              let statusColor = '#065F46';
              if (row.statusKey === 'INCOMPLETE') {
                statusBg = '#FEF3C7';
                statusColor = '#92400E';
              } else if (row.statusKey === 'EMPTY') {
                statusBg = '#FEE2E2';
                statusColor = '#991B1B';
              }

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${row.date}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${row.nika}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${row.userName}</td>
                  <td style="border: 1px solid #CBD5E1;">${row.roleLabel}</td>
                  <td style="border: 1px solid #CBD5E1;">${row.department}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${row.totalHours.toFixed(1)} Jam</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">
                    ${row.statusLabel}
                  </td>
                  <td style="border: 1px solid #CBD5E1; color: ${row.statusKey === 'EMPTY' ? '#64748B' : '#0F172A'};">${row.notes}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #0F172A; color: #FFFFFF; font-weight: bold;">
              <td colspan="6" style="text-align: right; padding: 10px; font-size: 11pt;">TOTAL KESELURUHAN JAM KERJA:</td>
              <td style="text-align: center; padding: 10px; font-size: 11pt; color: #FCD34D;">${totalHours.toFixed(1)} Jam</td>
              <td colspan="2" style="padding: 10px; font-size: 10pt; color: #34D399; text-align: center;">Tingkat Kepatuhan: ${compliancePct}%</td>
            </tr>
          </tfoot>
        </table>
      `;
    } else {
      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #1E1B4B; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px; width: 40px;">No</th>
              <th style="padding: 10px; width: 120px;">ID Timesheet</th>
              <th style="padding: 10px; width: 100px;">Tanggal</th>
              <th style="padding: 10px; width: 100px;">NIKA</th>
              <th style="padding: 10px; width: 170px;">Nama Karyawan</th>
              <th style="padding: 10px; width: 150px;">Role / Jabatan</th>
              <th style="padding: 10px; width: 80px;">Jam Mulai</th>
              <th style="padding: 10px; width: 80px;">Jam Selesai</th>
              <th style="padding: 10px; width: 90px;">Durasi (Jam)</th>
              <th style="padding: 10px; width: 180px;">Kategori Aktivitas</th>
              <th style="padding: 10px; width: 280px;">Uraian Rincian Tugas / Pekerjaan</th>
              <th style="padding: 10px; width: 140px;">Status Harian</th>
              <th style="padding: 10px; width: 120px;">Status Approval</th>
              <th style="padding: 10px; width: 160px;">Verifikator / Approver</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.map((row, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              let statusBg = '#D1FAE5';
              let statusColor = '#065F46';
              if (row.statusKey === 'INCOMPLETE') {
                statusBg = '#FEF3C7';
                statusColor = '#92400E';
              } else if (row.statusKey === 'EMPTY') {
                statusBg = '#FEE2E2';
                statusColor = '#991B1B';
              }

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1; color: #4338CA;">${row.id || '-'}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${row.date}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${row.nika}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${row.userName}</td>
                  <td style="border: 1px solid #CBD5E1;">${row.roleLabel}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${row.startTime || '-'}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${row.endTime || '-'}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${row.hours} Jam</td>
                  <td style="border: 1px solid #CBD5E1; font-weight: 500;">${row.activityPreset || 'Umum'}</td>
                  <td style="border: 1px solid #CBD5E1;">${row.activity || '-'}</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">
                    ${row.statusLabel}
                  </td>
                  <td style="text-align: center; font-weight: 600; border: 1px solid #CBD5E1; color: ${row.approvalStatus === 'APPROVED' ? '#065F46' : '#92400E'};">
                    ${row.approvalStatus === 'APPROVED' ? 'Disetujui' : row.approvalStatus === 'REJECTED' ? 'Ditolak' : 'Menunggu'}
                  </td>
                  <td style="border: 1px solid #CBD5E1;">${row.approver || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
          <tfoot>
            <tr style="background-color: #0F172A; color: #FFFFFF; font-weight: bold;">
              <td colspan="8" style="text-align: right; padding: 10px; font-size: 11pt;">TOTAL KESELURUHAN JAM LOG:</td>
              <td style="text-align: center; padding: 10px; font-size: 11pt; color: #FCD34D;">${totalHours.toFixed(1)} Jam</td>
              <td colspan="5" style="padding: 10px; font-size: 10pt; color: #34D399; text-align: center;">Total ${totalRecords} Baris Log Aktivitas</td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Laporan Timesheet</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #0F172A; }
          .banner-title { background-color: #1E1B4B; color: #FFFFFF; font-size: 15pt; font-weight: bold; text-align: center; padding: 12px; }
          .banner-subtitle { background-color: #312E81; color: #E0E7FF; font-size: 10.5pt; text-align: center; padding: 6px; }
          .meta-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; }
        </style>
      </head>
      <body>
        <!-- Header Banner Perusahaan -->
        <table border="0" cellpadding="4" cellspacing="0" style="width: 100%; margin-bottom: 12px;">
          <tr>
            <td colspan="${filter.formatScope === 'SUMMARY' ? '9' : '14'}" class="banner-title">
              ERP YAYASAN — LAPORAN REKAPITULASI TIMESHEET & KEPATUHAN KERJA
            </td>
          </tr>
          <tr>
            <td colspan="${filter.formatScope === 'SUMMARY' ? '9' : '14'}" class="banner-subtitle">
              ${scopeTitle}
            </td>
          </tr>
        </table>

        <!-- Metadata Laporan -->
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 16px; border-color: #CBD5E1;">
          <tr style="background-color: #F1F5F9;">
            <td style="font-weight: bold; width: 160px;">Periode Evaluasi:</td>
            <td>${filter.startDate} s.d ${filter.endDate}</td>
            <td style="font-weight: bold; width: 160px;">Target Karyawan/Role:</td>
            <td>${targetLabel}</td>
          </tr>
          <tr style="background-color: #F1F5F9;">
            <td style="font-weight: bold;">Tanggal Ditarik:</td>
            <td>${exportTimeStr}</td>
            <td style="font-weight: bold;">Dicetak Oleh:</td>
            <td>${currentUser.name} (${currentUser.roleLabel})</td>
          </tr>
        </table>

        <!-- KPI Summary Table -->
        <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%; margin-bottom: 18px; border-color: #818CF8; text-align: center;">
          <tr style="background-color: #4338CA; color: #FFFFFF; font-weight: bold; font-size: 9pt;">
            <td style="width: 25%;">TOTAL REKOD DIEVALUASI</td>
            <td style="width: 25%;">TOTAL JAM TERKUMPUL</td>
            <td style="width: 25%;">SUDAH LENGKAP (≥ 8 JAM)</td>
            <td style="width: 25%;">BELUM LENGKAP / BELUM MENGISI</td>
          </tr>
          <tr style="background-color: #EEF2FF; font-weight: bold; font-size: 13pt;">
            <td style="color: #1E1B4B;">${totalRecords} Hari/Entri</td>
            <td style="color: #4338CA;">${totalHours.toFixed(1)} Jam</td>
            <td style="color: #065F46;">${completeCount} (${compliancePct}%)</td>
            <td style="color: #991B1B;">${incompleteCount + emptyCount} Entri</td>
          </tr>
        </table>

        <!-- Main Data Table -->
        ${tableHtml}

        <br>
        <div style="font-size: 9pt; color: #64748B; font-style: italic;">
          * Dokumen ini digenerate secara otomatis oleh Modul Human Capital (HC Hub) - ERP YAYASAN pada ${exportTimeStr}.
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const cleanStartDate = filter.startDate.replace(/-/g, '');
    const cleanEndDate = filter.endDate.replace(/-/g, '');
    link.href = url;
    link.download = `Laporan_Timesheet_ERP_Yayasan_${cleanStartDate}_sd_${cleanEndDate}_${filter.formatScope}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    App.showToast(`Laporan Timesheet Excel (${filter.formatScope}) berhasil didownload!`, 'success');
  },

  downloadDocument: function(docId) {
    const doc = (DB.getGuidelineDocuments() || []).find(d => d.id === docId);
    if (!doc) return;

    let filename = doc.title || `dokumen-${doc.id}.${doc.fileType.toLowerCase()}`;
    if (!filename.includes('.')) {
      filename += doc.fileType === 'PDF' ? '.pdf' : '.pptx';
    }

    if (doc.fileData) {
      const a = document.createElement('a');
      a.href = doc.fileData;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const sampleContent = `=======================================================\n` +
        `ERP YAYASAN - DOKUMEN RESMI PANDUAN & SOSIALISASI\n` +
        `=======================================================\n\n` +
        `Judul Dokumen : ${doc.title}\n` +
        `Format        : ${doc.fileType}\n` +
        `Kategori      : ${doc.category}\n` +
        `Target Role   : ${doc.targetLabel}\n` +
        `Diterbitkan   : ${doc.uploadDate} oleh ${doc.uploadedBy}\n\n` +
        `RINGKASAN & INSTRUKSI:\n` +
        `${doc.description}\n\n` +
        `=======================================================\n` +
        `Dokumen ini diterbitkan resmi oleh Human Capital ERP YAYASAN.\n` +
        `Status: Terverifikasi & Sah.\n`;

      const blob = new Blob([sampleContent], { type: doc.fileType === 'PDF' ? 'application/pdf' : 'application/vnd.ms-powerpoint' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    App.showToast(`Berhasil mengunduh: "${filename}"!`, 'success');
  },

  openAddUserModal: function() {
    App.openModal('modal-add-user');
  },

  openAddDocModal: function() {
    this.currentUploadedFile = null;
    App.openModal('modal-add-doc');
    setTimeout(() => {
      const labelEl = document.getElementById('nd-file-label');
      if (labelEl) {
        labelEl.innerHTML = `
          <div style="font-size: 28px; margin-bottom: 6px;">📂</div>
          <div style="font-size: 13.5px; font-weight: 600; color: #fff;">Klik di sini untuk Browse & Upload File</div>
          <div style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 4px;">
            Mendukung PDF, PPT, PPTX (Otomatis dapat diunduh di dashboard tim yayasan)
          </div>
        `;
      }
      const titleEl = document.getElementById('nd-title');
      if (titleEl) titleEl.value = '';
      const descEl = document.getElementById('nd-description');
      if (descEl) descEl.value = '';
    }, 50);
  },

  togglePasswordVisibility: function(userId, password) {
    const el = document.getElementById(`pwd-text-${userId}`);
    if (!el) return;
    if (el.textContent === '••••••••') {
      el.textContent = password;
      el.style.color = '#34D399';
    } else {
      el.textContent = '••••••••';
      el.style.color = 'var(--text-secondary)';
    }
  },

  promptResetPassword: function(userId, userName) {
    const user = DB.getUsers().find(u => u.id === userId);
    const modal = document.getElementById('modal-reset-password');
    if (!modal) return;
    const uidEl = document.getElementById('rp-user-id');
    const unameEl = document.getElementById('rp-user-name');
    const uroleEl = document.getElementById('rp-user-role');
    const upassEl = document.getElementById('rp-new-password');
    if (uidEl) uidEl.value = userId;
    if (unameEl) unameEl.textContent = userName;
    if (uroleEl) uroleEl.textContent = user ? user.roleLabel : '';
    if (upassEl) upassEl.value = '';
    App.openModal('modal-reset-password');
  },

  handleResetPasswordSubmit: function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const userId = document.getElementById('rp-user-id')?.value;
    const newPassword = (document.getElementById('rp-new-password')?.value || '').trim();
    if (!userId || !newPassword) {
      App.showToast('Password baru tidak boleh kosong!', 'warn');
      return;
    }
    DB.updateUserPassword(userId, newPassword);
    App.closeModal('modal-reset-password');
    App.showToast('Password pengguna berhasil diupdate!', 'success');
    this.render(document.getElementById('main-content-area'));
  },

  handleDeleteUser: async function(userId, userName) {
    if (confirm(`Apakah Anda yakin ingin menonaktifkan dan menghapus akun "${userName}"?`)) {
      const success = await DB.deleteUserAccount(userId);
      if (success) {
        App.showToast(`Akun ${userName} berhasil dihapus dari sistem & database cloud!`, 'success');
        this.render(document.getElementById('main-content-area'));
      }
    }
  },

  handleDeleteDoc: async function(docId, title) {
    if (confirm(`Hapus dokumen panduan "${title}"?`)) {
      await DB.deleteGuidelineDocument(docId);
      App.showToast(`Dokumen panduan berhasil dihapus!`, 'success');
      this.render(document.getElementById('main-content-area'));
    }
  },

  handleAddDocumentSubmit: async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const title = (document.getElementById('nd-title')?.value || '').trim();
    const fileType = document.getElementById('nd-filetype')?.value || 'PDF';
    const targetRole = document.getElementById('nd-targetrole')?.value || 'ALL_YAYASAN';
    const category = document.getElementById('nd-category')?.value || 'Pedoman Operasional Umum';
    const fileSize = (document.getElementById('nd-filesize')?.value || (this.currentUploadedFile ? this.currentUploadedFile.size : '3.5 MB')).trim();
    const description = (document.getElementById('nd-desc')?.value || document.getElementById('nd-description')?.value || 'Dokumen resmi panduan & materi sosialisasi yayasan.').trim();

    if (!title || !description) {
      App.showToast('Mohon lengkapi Judul Dokumen dan Deskripsi!', 'warn');
      return;
    }

    await DB.addGuidelineDocument({
      title,
      fileType,
      targetRole,
      category,
      fileSize,
      description,
      fileData: this.currentUploadedFile ? this.currentUploadedFile.data : null
    });

    this.currentUploadedFile = null;
    App.closeModal('modal-add-doc');
    App.showToast(`Dokumen "${title}" berhasil diunggah & diterbitkan ke dashboard tim yayasan!`, 'success');
    
    // Refresh sub-view aktif
    this.switchSubTab('dokumen');
  },

  handleAddDocSubmit: function(e) {
    return this.handleAddDocumentSubmit(e);
  },

  handleRoleSelectChange: function(e) {
    const role = e.target.value;
    const deptInput = document.getElementById('nu-department') || document.getElementById('nu-dept');
    const jabatanInput = document.getElementById('nu-jabatan');
    if (!deptInput) return;

    if (role === 'DIREKTUR_UTAMA' || role === 'DIREKTUR_OPERASIONAL' || role === 'DIREKTUR_KEUANGAN') {
      if (deptInput && !deptInput.value) deptInput.value = 'Direksi Eksekutif';
      if (jabatanInput && !jabatanInput.value) jabatanInput.value = e.target.options[e.target.selectedIndex].text;
    } else if (role === 'MANAGER_AREA' || role === 'SURVEYOR') {
      if (deptInput && !deptInput.value) deptInput.value = 'Operasional Lapangan';
      if (jabatanInput && !jabatanInput.value) jabatanInput.value = e.target.options[e.target.selectedIndex].text;
    } else if (role === 'HUMAN_CAPITAL') {
      if (deptInput && !deptInput.value) deptInput.value = 'Human Capital & GA';
      if (jabatanInput && !jabatanInput.value) jabatanInput.value = 'Human Capital Officer';
    } else if (role === 'MANAGER_KEUANGAN' || role === 'STAFF_AHLI_KEUANGAN' || role === 'FAT_OFFICER') {
      if (deptInput && !deptInput.value) deptInput.value = 'Finance & Accounting (FAT)';
      if (jabatanInput && !jabatanInput.value) jabatanInput.value = e.target.options[e.target.selectedIndex].text;
    } else if (role === 'PERWAKILAN_YAYASAN' || role === 'STAFF_OPERASIONAL' || role === 'MAKER_YAYASAN') {
      if (deptInput && !deptInput.value) deptInput.value = role === 'STAFF_OPERASIONAL' ? 'Operasional Lapangan & Dapur' : 'Kemitraan Yayasan';
      if (jabatanInput && !jabatanInput.value) jabatanInput.value = e.target.options[e.target.selectedIndex].text;
    }
  },

  handleAddUserSubmit: async function(event) {
    if (event) event.preventDefault();

    const nika = (document.getElementById('nu-nika')?.value || '').trim();
    const name = (document.getElementById('nu-name')?.value || '').trim();
    const nik = (document.getElementById('nu-nik')?.value || '').trim();
    const kodeJabatan = (document.getElementById('nu-kodejabatan')?.value || '').trim();
    const jabatan = (document.getElementById('nu-jabatan')?.value || '').trim();
    const levelGrade = document.getElementById('nu-levelgrade')?.value || 'Staff / Grade 1';
    const roleSelect = document.getElementById('nu-role');
    const role = roleSelect ? roleSelect.value : 'STAFF';
    const roleLabel = (roleSelect && roleSelect.selectedIndex >= 0) ? roleSelect.options[roleSelect.selectedIndex].text : 'Staff';
    const deptEl = document.getElementById('nu-department') || document.getElementById('nu-dept');
    const department = (deptEl ? deptEl.value : 'Operasional Lapangan').trim();
    const username = (document.getElementById('nu-username')?.value || '').trim();
    const password = (document.getElementById('nu-password')?.value || '').trim();
    const joinDate = document.getElementById('nu-joindate')?.value || (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10));
    const statusKaryawan = document.getElementById('nu-statuskaryawan')?.value || 'PKWT';
    const birthPlace = (document.getElementById('nu-birthplace')?.value || 'Jakarta').trim();
    const birthDate = document.getElementById('nu-birthdate')?.value || '1995-01-01';
    const gender = document.getElementById('nu-gender')?.value || 'Laki-laki';
    const agama = document.getElementById('nu-agama')?.value || 'Islam';
    const phone = (document.getElementById('nu-phone')?.value || '-').trim();
    const email = (document.getElementById('nu-email')?.value || `${username}@erpyayasan.org`).trim();

    if (!name || !username || !password) {
      App.showToast('Mohon lengkapi Nama Lengkap, Username, dan Password!', 'warn');
      return;
    }

    const submitBtn = document.querySelector('#form-add-user button[type="submit"]');
    const origBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Menyimpan ke Cloud Supabase...</span>';
    }

    await DB.addUserAccount({
      nika: nika || `K-2026-${String(DB.getUsers().length + 1).padStart(3, '0')}`,
      name,
      nik: nik || '3171000000000000',
      kodeJabatan: kodeJabatan || 'WLKP-STF-01',
      jabatan: jabatan || roleLabel,
      levelGrade,
      username,
      password,
      role,
      roleLabel,
      department: department || 'Operasional Lapangan',
      joinDate,
      statusKaryawan,
      birthPlace,
      birthDate,
      gender,
      agama,
      phone,
      email,
      quotaAnnualLeave: 12,
      quotaPersonalLeave: 3
    });

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = origBtnHtml;
    }

    App.closeModal('modal-add-user');
    App.showToast(`Akun & data HRIS baru untuk "${name}" (@${username}) berhasil didaftarkan & disinkronkan ke Supabase!`, 'success');
    
    // Refresh sub-view aktif
    if (this.activeTab === 'akun') {
      this.switchSubTab('akun');
    } else {
      this.switchSubTab('karyawan');
    }
  }
};
