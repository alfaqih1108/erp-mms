/**
 * ERP MMS - Core Application Router & UI Controller
 * Features:
 * 1. Top-Center Floating Navbar Router with Multi-Module Tabs (including Dapur Yayasan)
 * 2. 11-Role RBAC Filtering & Dynamic Navigation Visibility
 * 3. Mobile Navigation Drawer & Toast System
 */

window.App = {
  currentTab: 'dashboard',

  init: function() {
    this.initRoleSwitcher();
    this.initEventListeners();
    this.applyRoleRestrictions();
    this.initLoginWaveAnimation();
    this.updateCloudBadge();
    this.switchTab('dashboard');

    // Real-Time Background Pull dari Supabase saat startup tanpa re-render berlebih
    if (window.DB && typeof window.DB.pullLatestFromSupabase === 'function') {
      window.DB.pullLatestFromSupabase().then(() => {
        this.updateUserHeader();
        this.applyRoleRestrictions();
        this.updateSidebarBadges();
        this.updateCloudBadge();
      }).catch(e => {
        console.warn('Real-time sync on start notice:', e);
      });
    }
  },

  initRoleSwitcher: function() {
    const select = document.getElementById('sidebar-role-select');
    const mobileSelect = document.getElementById('mobile-drawer-role-select');
    const user = DB.getCurrentUser();
    if (select) {
      select.value = user.id;
      select.addEventListener('change', (e) => {
        this.handleLoginAs(e.target.value);
      });
    }
    if (mobileSelect) {
      mobileSelect.value = user.id;
      mobileSelect.addEventListener('change', (e) => {
        this.handleLoginAs(e.target.value);
      });
    }
    this.updateUserHeader();
  },

  updateUserHeader: function() {
    const user = DB.getCurrentUser();
    const nameEl = document.getElementById('sidebar-user-name');
    const roleEl = document.getElementById('sidebar-user-role');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const chipEl = document.querySelector('.navbar-user-chip');

    if (nameEl) nameEl.textContent = user.name;
    if (roleEl) roleEl.textContent = user.roleLabel;
    if (avatarEl) {
      avatarEl.textContent = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
      if (user.avatarGrad) {
        avatarEl.style.background = user.avatarGrad;
      }
      avatarEl.setAttribute('title', `👤 ${user.name} (${user.roleLabel || user.jabatan})`);
    }
    if (chipEl) {
      chipEl.setAttribute('title', `👤 ${user.name} (${user.roleLabel || user.jabatan})`);
    }
  },

  // Role-Based Access Control (RBAC) Dynamic Filter
  applyRoleRestrictions: function() {
    const user = DB.getCurrentUser();
    const isSuperAdmin = (user.role === 'SUPER_ADMIN');

    const navApproval = document.getElementById('nav-item-approval');
    const drawerWorkflow = document.getElementById('mobile-drawer-workflow');
    const navDapur = document.getElementById('nav-item-dapur');
    const drawerDapur = document.getElementById('mobile-drawer-dapur');

    // Rule 0: Super Admin Mode vs Single Employee Mode (Navbar Role Switcher & Auth Action)
    const selectRoleEl = document.getElementById('sidebar-role-select');
    const mobileRoleBox = document.getElementById('mobile-drawer-role-box');
    const mobileRoleSelect = document.getElementById('mobile-drawer-role-select');

    if (selectRoleEl) {
      selectRoleEl.style.display = isSuperAdmin ? 'inline-block' : 'none';
      selectRoleEl.value = user.id;
    }
    if (mobileRoleBox) {
      mobileRoleBox.style.display = isSuperAdmin ? 'flex' : 'none';
    }
    if (mobileRoleSelect) {
      mobileRoleSelect.value = user.id;
    }

    const btnAuth = document.getElementById('btn-header-auth-action');
    if (btnAuth) {
      if (isSuperAdmin) {
        btnAuth.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span id="btn-header-auth-label">Ganti Akun / Keluar</span>
        `;
        btnAuth.title = 'Akses Keluar & Ganti Akun';
        btnAuth.onclick = () => App.handleLogout();
      } else {
        btnAuth.innerHTML = `
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          <span id="btn-header-auth-label">Log Out</span>
        `;
        btnAuth.title = `Keluar dari Akun (${user.name})`;
        btnAuth.onclick = () => App.handleLogout();
      }
    }

    // Rule 1: Approval Hub hanya untuk posisi yang memiliki wewenang menyetujui
    // (Perwakilan Yayasan, Staff Operasional, Surveyor, dan Maker Yayasan TIDAK memiliki hak approval)
    const isNonApprover = (!isSuperAdmin) && (user.role === 'SURVEYOR' || user.role === 'PERWAKILAN_YAYASAN' || user.role === 'STAFF_OPERASIONAL' || user.role === 'MAKER_YAYASAN');

    if (navApproval) {
      navApproval.style.display = isNonApprover ? 'none' : 'inline-flex';
    }
    if (drawerWorkflow) {
      drawerWorkflow.style.display = isNonApprover ? 'none' : 'block';
    }

    // Rule 2: HC Hub tampil untuk Human Capital, Direktur Utama & Super Admin
    const hasHCAccess = isSuperAdmin || (user.role === 'HUMAN_CAPITAL' || user.role === 'DIREKTUR_UTAMA');
    const navHCHub = document.getElementById('nav-item-hc-hub');
    const drawerHC = document.getElementById('mobile-drawer-hc');

    if (navHCHub) {
      navHCHub.style.display = hasHCAccess ? 'inline-flex' : 'none';
    }
    if (drawerHC) {
      drawerHC.style.display = hasHCAccess ? 'block' : 'none';
    }

    // Rule 3: Admin Hub (Daftar Dapur SPPG & Laporan Dapur VA) tampil khusus untuk Staf Ahli Keuangan & Administrasi, Maker Yayasan, Manager Area, Jajaran Direksi & Super Admin
    const hasAdminHubAccess = isSuperAdmin || [
      'STAFF_AHLI_KEUANGAN',
      'MAKER_YAYASAN',
      'MANAGER_AREA',
      'DIREKTUR_UTAMA',
      'DIREKTUR_OPERASIONAL',
      'DIREKTUR_KEUANGAN'
    ].includes(user.role);

    const navAdminHub = document.getElementById('nav-item-admin-hub');
    const drawerAdminHub = document.getElementById('mobile-drawer-admin-hub');

    if (navAdminHub) {
      navAdminHub.style.display = hasAdminHubAccess ? 'inline-flex' : 'none';
    }
    if (drawerAdminHub) {
      drawerAdminHub.style.display = hasAdminHubAccess ? 'block' : 'none';
    }

    // Sub-item RBAC:
    // a. Pada role MAKER_YAYASAN, sub-menu "Daftar Dapur" & "Daftar Kendala" disembunyikan
    // b. Pada role MANAGER_AREA, sub-menu "Laporan Dapur & Saldo VA" disembunyikan
    const adminItemDapur = document.getElementById('admin-dropdown-dapur');
    const adminItemLaporanVA = document.getElementById('admin-dropdown-laporan-va');
    const adminItemKendala = document.getElementById('admin-dropdown-kendala');

    const mobileAdminDapur = document.getElementById('mobile-admin-sub-dapur');
    const mobileAdminLaporan = document.getElementById('mobile-admin-sub-laporan');
    const mobileAdminKendala = document.getElementById('mobile-admin-sub-kendala');

    const canAccessDaftarDapur = isSuperAdmin || ((user.role !== 'MAKER_YAYASAN') && [
      'STAFF_AHLI_KEUANGAN',
      'MANAGER_AREA',
      'DIREKTUR_UTAMA',
      'DIREKTUR_OPERASIONAL',
      'DIREKTUR_KEUANGAN'
    ].includes(user.role));

    const canAccessLaporanVA = isSuperAdmin || ((user.role !== 'MANAGER_AREA') && [
      'STAFF_AHLI_KEUANGAN',
      'MAKER_YAYASAN',
      'DIREKTUR_UTAMA',
      'DIREKTUR_OPERASIONAL',
      'DIREKTUR_KEUANGAN'
    ].includes(user.role));

    const canAccessKendala = isSuperAdmin || [
      'STAFF_AHLI_KEUANGAN',
      'MANAGER_AREA',
      'DIREKTUR_UTAMA',
      'DIREKTUR_OPERASIONAL',
      'DIREKTUR_KEUANGAN'
    ].includes(user.role);

    if (adminItemDapur) adminItemDapur.style.display = canAccessDaftarDapur ? 'flex' : 'none';
    if (adminItemLaporanVA) adminItemLaporanVA.style.display = canAccessLaporanVA ? 'flex' : 'none';
    if (adminItemKendala) adminItemKendala.style.display = canAccessKendala ? 'flex' : 'none';

    if (mobileAdminDapur) mobileAdminDapur.style.display = canAccessDaftarDapur ? 'flex' : 'none';
    if (mobileAdminLaporan) mobileAdminLaporan.style.display = canAccessLaporanVA ? 'flex' : 'none';
    if (mobileAdminKendala) mobileAdminKendala.style.display = canAccessKendala ? 'flex' : 'none';

    if (isNonApprover && this.currentTab === 'approval') {
      this.switchTab('dashboard');
    }
    if (!hasHCAccess && ['hc-struktur', 'hc-karyawan', 'hc-akun', 'hc-dokumen', 'hc-timesheet', 'hc-hub'].includes(this.currentTab)) {
      this.switchTab('dashboard');
    }
    if (!hasAdminHubAccess && ['admin-dapur', 'admin-hub', 'dapur', 'admin-kendala'].includes(this.currentTab)) {
      this.switchTab('dashboard');
    }
    if (user.role === 'MAKER_YAYASAN' && (this.currentTab === 'admin-dapur' || this.currentTab === 'admin-hub' || this.currentTab === 'admin-kendala')) {
      this.switchTab('dapur');
    }
    if (user.role === 'MANAGER_AREA' && this.currentTab === 'dapur') {
      this.switchTab('admin-dapur');
    }

    const drawerAdminLabel = document.getElementById('mobile-drawer-admin-label');
    if (drawerAdminLabel) {
      if (user.role === 'MAKER_YAYASAN') {
        drawerAdminLabel.textContent = 'Admin Hub (Laporan Dapur & Saldo VA)';
      } else if (user.role === 'MANAGER_AREA') {
        drawerAdminLabel.textContent = 'Admin Hub (Daftar Dapur SPPG)';
      } else {
        drawerAdminLabel.textContent = 'Admin Hub (Dapur & Saldo VA)';
      }
    }

    this.updateSidebarBadges();
    this.updateFloatingSettingsVisibility();
  },

  updateFloatingSettingsVisibility: function() {
    const user = DB.getCurrentUser();
    const fab = document.getElementById('fab-system-settings');
    if (!fab) return;
    const canAccessMaintenance = (user && (user.role === 'SUPER_ADMIN' || user.role === 'HUMAN_CAPITAL' || user.role === 'DIREKTUR_OPERASIONAL'));
    fab.style.display = canAccessMaintenance ? 'flex' : 'none';
  },

  openSystemMaintenanceModal: function() {
    const user = DB.getCurrentUser();
    const canAccessMaintenance = (user && (user.role === 'HUMAN_CAPITAL' || user.role === 'DIREKTUR_OPERASIONAL'));
    if (!canAccessMaintenance) {
      this.showToast('Fitur ini khusus untuk wewenang Human Capital & Direktur Operasional!', 'warn');
      return;
    }

    const statsContainer = document.getElementById('maintenance-db-stats');
    if (statsContainer) {
      const usersCount = (DB.getUsers() || []).length;
      const leavesCount = (DB.getLeaves() || []).length;
      const tsCount = (DB.getTimesheets() || []).length;
      const prCount = (DB.getItemRequests() || []).length;

      statsContainer.innerHTML = `
        <div style="background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          👥 Total Akun Karyawan: <strong style="color: #60A5FA;">${usersCount} Akun</strong>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          🌴 Total Pengajuan Cuti: <strong style="color: #34D399;">${leavesCount} Pengajuan</strong>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          ⏱️ Total Log Timesheet: <strong style="color: #FCD34D;">${tsCount} Catatan</strong>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          📦 Total Pengadaan PR: <strong style="color: #F87171;">${prCount} Berkas</strong>
        </div>
      `;
    }

    const confirmInput = document.getElementById('maintenance-confirm-input');
    if (confirmInput) confirmInput.value = '';

    this.openModal('modal-system-maintenance');
  },

  executeMasterReset: function() {
    const confirmInput = document.getElementById('maintenance-confirm-input');
    const typedText = confirmInput ? confirmInput.value.trim().toUpperCase() : '';
    if (typedText !== 'RESET DATA') {
      this.showToast('Ketik kata "RESET DATA" untuk memvalidasi pembersihan database!', 'warn');
      if (confirmInput) confirmInput.focus();
      return;
    }

    DB.resetToMasterAccounts();
    this.closeModal('modal-system-maintenance');
    this.showToast('✅ Database berhasil dibersihkan total! 2 Akun Master (HC & Dir Ops) aktif.', 'success');
    
    // Update header, role restrictions, and reload view
    this.updateUserHeader();
    this.applyRoleRestrictions();
    this.switchTab('dashboard');
  },

  toggleMobileDrawerAccordion: function(subId) {
    const subEl = document.getElementById(subId);
    if (!subEl) return;
    const isClosed = (subEl.style.display === 'none' || !subEl.style.display);
    subEl.style.display = isClosed ? 'flex' : 'none';
    
    // Update chevron indicator
    const chevronId = (subId === 'drawer-hc-sub') ? 'chevron-drawer-hc' : 'chevron-drawer-admin';
    const chevron = document.getElementById(chevronId);
    if (chevron) {
      chevron.textContent = isClosed ? '▴' : '▾';
    }
  },

  toggleHCDropdown: function(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const dropdown = document.getElementById('nav-item-hc-hub');
    if (dropdown) {
      dropdown.classList.toggle('dropdown-open');
    }
    // Close other dropdown
    const adminDropdown = document.getElementById('nav-item-admin-hub');
    if (adminDropdown) adminDropdown.classList.remove('dropdown-open');
  },

  toggleAdminDropdown: function(e) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const dropdown = document.getElementById('nav-item-admin-hub');
    if (dropdown) {
      dropdown.classList.toggle('dropdown-open');
    }
    // Close other dropdown
    const hcDropdown = document.getElementById('nav-item-hc-hub');
    if (hcDropdown) hcDropdown.classList.remove('dropdown-open');
  },

  // Interactive Login Hero Feature Carousel
  loginFeatureIndex: 0,
  loginFeatures: [
    {
      avatar: '👑',
      grad: 'linear-gradient(135deg, #EF4444 0%, #F59E0B 100%)',
      title: 'Universal Approval Hub',
      desc: 'Persetujuan Cuti, Pengadaan PR & Kasbon Multi-Tier'
    },
    {
      avatar: '🍳',
      grad: 'linear-gradient(135deg, #3B82F6 0%, #60A5FA 100%)',
      title: 'Dapur SPPG & Saldo VA',
      desc: 'Monitoring 5 Titik Dapur Wilayah & Rekap Kendala'
    },
    {
      avatar: '👥',
      grad: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
      title: 'HRIS & Master Kepegawaian',
      desc: 'Organogram Interaktif & Rekap Presensi Timesheet'
    },
    {
      avatar: '📦',
      grad: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
      title: 'Procurement & Cash Advance',
      desc: 'Pengadaan Aset & Pelaporan Pertanggungjawaban (LPJ)'
    }
  ],
  loginWaveAnimationId: null,

  initLoginWaveAnimation: function() {
    const canvas = document.getElementById('login-neural-wave-canvas');
    if (!canvas) return;

    if (this.loginWaveAnimationId) {
      cancelAnimationFrame(this.loginWaveAnimationId);
      this.loginWaveAnimationId = null;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize);

    let step = 0;
    const waves = [
      { color: 'rgba(255, 75, 1, 0.40)', frequency: 0.005, speed: 0.018, amplitude: 52, offset: 0, lineWidth: 2 },
      { color: 'rgba(139, 92, 246, 0.32)', frequency: 0.008, speed: 0.012, amplitude: 42, offset: Math.PI / 3, lineWidth: 1.5 },
      { color: 'rgba(59, 130, 246, 0.28)', frequency: 0.004, speed: 0.022, amplitude: 58, offset: Math.PI / 2, lineWidth: 1.5 },
      { color: 'rgba(245, 158, 11, 0.24)', frequency: 0.010, speed: 0.015, amplitude: 36, offset: Math.PI, lineWidth: 1 }
    ];

    // Glowing neural particles along the waves
    const particles = Array.from({ length: 18 }, () => ({
      xRatio: Math.random(),
      waveIndex: Math.floor(Math.random() * waves.length),
      radius: Math.random() * 2.8 + 1.2,
      speed: Math.random() * 0.0012 + 0.0006
    }));

    const renderFrame = () => {
      // Stop loop if login screen is not active
      const overlay = document.getElementById('login-screen-overlay');
      if (!overlay || !overlay.classList.contains('active') || !ctx || !canvas) {
        if (App.loginWaveAnimationId) {
          cancelAnimationFrame(App.loginWaveAnimationId);
          App.loginWaveAnimationId = null;
        }
        return;
      }
      
      ctx.clearRect(0, 0, width, height);
      step += 1;

      const midY = height * 0.52;

      // Draw flowing sine waves
      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.lineWidth;

        for (let x = 0; x <= width; x += 6) {
          const taper = Math.sin((x / width) * Math.PI);
          const y = midY + Math.sin(x * w.frequency + step * w.speed + w.offset) * w.amplitude * (0.4 + 0.6 * taper);
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Draw flowing glowing neural particle nodes
      particles.forEach((p) => {
        p.xRatio += p.speed;
        if (p.xRatio > 1) p.xRatio = 0;

        const currentX = p.xRatio * width;
        const w = waves[p.waveIndex];
        const taper = Math.sin(p.xRatio * Math.PI);
        const currentY = midY + Math.sin(currentX * w.frequency + step * w.speed + w.offset) * w.amplitude * (0.4 + 0.6 * taper);

        ctx.beginPath();
        ctx.arc(currentX, currentY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      App.loginWaveAnimationId = requestAnimationFrame(renderFrame);
    };

    this.loginWaveAnimationId = requestAnimationFrame(renderFrame);
  },

  updateLoginFeatureDisplay: function() {
    const feat = this.loginFeatures[this.loginFeatureIndex];
    if (!feat) return;
    const avatarEl = document.getElementById('split-hero-avatar');
    const titleEl = document.getElementById('split-hero-title');
    const descEl = document.getElementById('split-hero-desc');
    if (avatarEl) {
      avatarEl.textContent = feat.avatar;
      avatarEl.style.background = feat.grad;
    }
    if (titleEl) titleEl.textContent = feat.title;
    if (descEl) descEl.textContent = feat.desc;
  },

  nextLoginFeature: function() {
    this.loginFeatureIndex = (this.loginFeatureIndex + 1) % this.loginFeatures.length;
    this.updateLoginFeatureDisplay();
  },

  prevLoginFeature: function() {
    this.loginFeatureIndex = (this.loginFeatureIndex - 1 + this.loginFeatures.length) % this.loginFeatures.length;
    this.updateLoginFeatureDisplay();
  },

  togglePasswordVisibility: function(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  },

  showSystemGuidelineDoc: function() {
    this.showToast('Dokumen SOP Panduan Operasional ERP Yayasan dapat diakses setelah login di menu HC Hub.', 'info');
  },

  handleLoginAs: function(userId) {
    DB.switchRole(userId);
    const user = DB.getCurrentUser();
    
    // Sync select dropdown
    const select = document.getElementById('sidebar-role-select');
    if (select) select.value = user.id;

    this.updateUserHeader();
    this.applyRoleRestrictions();
    this.closeLoginScreen();
    this.refreshCurrentTab();

    this.showToast(`Login berhasil sebagai: ${user.name} (${user.roleLabel})`, 'success');
  },

  handleCredentialLogin: async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const uname = (document.getElementById('login-input-username')?.value || '').trim().toLowerCase();
    const pwd = (document.getElementById('login-input-password')?.value || '').trim();

    if (!uname || !pwd) {
      this.openModal('modal-login-failed');
      this.showToast('Mohon masukkan Username dan Password akun Anda!', 'warn');
      return;
    }

    const btnSubmit = document.querySelector('#form-credential-login button[type="submit"]');
    const origBtnHtml = btnSubmit ? btnSubmit.innerHTML : '';
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<span>Memverifikasi...</span>';
    }

    const checkMatch = () => {
      const users = DB.getUsers() || [];
      return users.find(u => {
        const matchUname = (u.username && u.username.toLowerCase() === uname) || 
                           (u.email && u.email.toLowerCase() === uname) || 
                           (u.name && u.name.toLowerCase() === uname) ||
                           (u.id && u.id.toLowerCase() === uname);
        const matchPwd = (u.password || 'password123') === pwd;
        return matchUname && matchPwd;
      });
    };

    // 1. Cek langsung kecocokan di memori (instant 0ms)
    let matchedUser = checkMatch();

    // 2. Jika belum cocok (misal akun baru dibuat di device lain / password baru direset), tarik HANYA tabel users dari cloud (~100ms)
    if (!matchedUser && window.DB && typeof window.DB.pullUsersFromSupabase === 'function') {
      try {
        await window.DB.pullUsersFromSupabase();
        matchedUser = checkMatch();
      } catch (err) {
        console.warn('Fast auth pull notice:', err);
      }
    }

    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = origBtnHtml;
    }

    if (matchedUser) {
      // 3. Masuk ke dashboard seketika tanpa jeda
      this.handleLoginAs(matchedUser.id);

      // 4. Sinkronkan seluruh data transaksi di background secara senyap tanpa glitch/re-render ulang
      if (window.DB && typeof window.DB.pullLatestFromSupabase === 'function') {
        window.DB.pullLatestFromSupabase().then(() => {
          this.updateUserHeader();
          this.applyRoleRestrictions();
          this.updateSidebarBadges();
          this.updateCloudBadge();
        }).catch(() => {});
      }
    } else {
      this.openModal('modal-login-failed');
      this.showToast('Autentikasi Gagal: Username atau Password salah!', 'danger');
    }
  },

  retryLoginInput: function() {
    this.closeModal('modal-login-failed');
    const pwdInput = document.getElementById('login-input-password');
    const unameInput = document.getElementById('login-input-username');
    if (pwdInput) pwdInput.value = '';
    if (unameInput && !unameInput.value) {
      unameInput.focus();
    } else if (pwdInput) {
      pwdInput.focus();
      pwdInput.select();
    }
  },

  handleLogout: function() {
    const user = DB.getCurrentUser();
    const nameEl = document.getElementById('logout-confirm-user-name');
    const cardNameEl = document.getElementById('logout-confirm-name');
    const cardRoleEl = document.getElementById('logout-confirm-role');
    const avatarEl = document.getElementById('logout-confirm-avatar');

    if (nameEl) nameEl.textContent = user.name;
    if (cardNameEl) cardNameEl.textContent = user.name;
    if (cardRoleEl) cardRoleEl.textContent = user.roleLabel || user.role;
    if (avatarEl) {
      avatarEl.textContent = user.name.split(' ').map(n => n[0]).join('').slice(0, 2);
      if (user.avatarGrad) avatarEl.style.background = user.avatarGrad;
    }

    this.openModal('modal-logout-confirm');
  },

  confirmLogout: function() {
    this.closeModal('modal-logout-confirm');
    this.openLoginScreen();
    this.showToast('Anda telah berhasil keluar dari sistem (Log Out). Silakan login kembali.', 'info');
  },

  openLoginScreen: function() {
    const screen = document.getElementById('login-screen-overlay');
    if (screen) {
      screen.classList.add('show', 'active');
      // Reset input values
      const uInput = document.getElementById('login-input-username');
      const pInput = document.getElementById('login-input-password');
      if (uInput) uInput.value = '';
      if (pInput) pInput.value = '';
      this.initLoginWaveAnimation();
    }
  },

  closeLoginScreen: function() {
    const screen = document.getElementById('login-screen-overlay');
    if (screen) screen.classList.remove('show', 'active');
    if (this.loginWaveAnimationId) {
      cancelAnimationFrame(this.loginWaveAnimationId);
      this.loginWaveAnimationId = null;
    }
  },

  // Mobile Drawer Navigation
  toggleMobileSidebar: function(open) {
    const sidebar = document.getElementById('app-sidebar');
    const backdrop = document.getElementById('sidebar-backdrop');

    if (open) {
      if (sidebar) sidebar.classList.add('open');
      if (backdrop) backdrop.classList.add('show');
    } else {
      if (sidebar) sidebar.classList.remove('open');
      if (backdrop) backdrop.classList.remove('show');
    }
  },

  initEventListeners: function() {
    // Form submissions
    const cutiForm = document.getElementById('form-cuti');
    if (cutiForm) cutiForm.addEventListener('submit', (e) => CutiModule.handleSubmit(e));

    const prForm = document.getElementById('form-pr');
    if (prForm) prForm.addEventListener('submit', (e) => PengajuanBarangModule.handleSubmit(e));

    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('show', 'active');
        }
      });
    });

    // Close dropdowns when clicking anywhere outside
    document.addEventListener('click', (e) => {
      const hcDropdown = document.getElementById('nav-item-hc-hub');
      if (hcDropdown && !hcDropdown.contains(e.target)) {
        hcDropdown.classList.remove('dropdown-open');
      }
      const adminDropdown = document.getElementById('nav-item-admin-hub');
      if (adminDropdown && !adminDropdown.contains(e.target)) {
        adminDropdown.classList.remove('dropdown-open');
      }
    });

    // ESC key closes modals & drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.show').forEach(m => m.classList.remove('show', 'active'));
        this.toggleMobileSidebar(false);
        this.closeLoginScreen();
        const hcDropdown = document.getElementById('nav-item-hc-hub');
        if (hcDropdown) hcDropdown.classList.remove('dropdown-open');
        const adminDropdown = document.getElementById('nav-item-admin-hub');
        if (adminDropdown) adminDropdown.classList.remove('dropdown-open');
      }
    });
  },

  // Main Tab Router
  switchTab: function(tabId, subView = null) {
    this.currentTab = tabId;

    // Tutup dropdown HC Hub & Admin Hub dan sidebar mobile
    const hcDropdown = document.getElementById('nav-item-hc-hub');
    if (hcDropdown) hcDropdown.classList.remove('dropdown-open');
    const adminDropdown = document.getElementById('nav-item-admin-hub');
    if (adminDropdown) adminDropdown.classList.remove('dropdown-open');
    this.toggleMobileSidebar(false);

    // Update active state on Top Navbar Pills
    const isHCTab = ['hc-struktur', 'hc-karyawan', 'hc-akun', 'hc-dokumen', 'hc-timesheet', 'hc-hub'].includes(tabId);
    const isAdminTab = ['admin-dapur', 'admin-hub', 'dapur', 'admin-kendala'].includes(tabId);

    document.querySelectorAll('.nav-pill-item').forEach(btn => {
      const bTab = btn.getAttribute('data-tab');
      if (bTab === 'hc-hub') {
        btn.classList.toggle('active', isHCTab);
      } else if (bTab === 'admin-hub') {
        btn.classList.toggle('active', isAdminTab);
      } else {
        btn.classList.toggle('active', bTab === tabId);
      }
    });

    // Update active state on Mobile Drawer Nav items
    document.querySelectorAll('.drawer-nav-btn').forEach(btn => {
      const bTab = btn.getAttribute('data-tab');
      if (bTab === 'hc-hub') {
        btn.classList.toggle('active', isHCTab);
      } else if (bTab === 'admin-hub') {
        btn.classList.toggle('active', isAdminTab);
      } else {
        btn.classList.toggle('active', bTab === tabId);
      }
    });

    document.querySelectorAll('.drawer-sub-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });

    // Auto expand accordion if child tab is active
    if (isHCTab) {
      const hcSub = document.getElementById('drawer-hc-sub');
      const hcChevron = document.getElementById('chevron-drawer-hc');
      if (hcSub) hcSub.style.display = 'flex';
      if (hcChevron) hcChevron.textContent = '▴';
    }
    if (isAdminTab) {
      const adminSub = document.getElementById('drawer-admin-sub');
      const adminChevron = document.getElementById('chevron-drawer-admin');
      if (adminSub) adminSub.style.display = 'flex';
      if (adminChevron) adminChevron.textContent = '▴';
    }

    // Render module
    const container = document.getElementById('main-content-area');
    if (!container) return;

    try {
      switch (tabId) {
        case 'dashboard':
          DashboardModule.render(container);
          break;
        case 'cuti':
          CutiModule.render(container);
          break;
        case 'timesheet':
          TimesheetModule.render(container);
          break;
        case 'pengajuan':
          PengajuanBarangModule.render(container);
          break;
        case 'cash-advance':
          CashAdvanceModule.render(container);
          break;
        case 'dapur':
          DapurYayasanModule.render(container);
          break;
        case 'hc-struktur':
          HCHubModule.render(container, 'struktur');
          break;
        case 'hc-karyawan':
          HCHubModule.render(container, 'karyawan');
          break;
        case 'hc-akun':
          HCHubModule.render(container, 'akun');
          break;
        case 'hc-dokumen':
          HCHubModule.render(container, 'dokumen');
          break;
        case 'hc-timesheet':
          HCHubModule.render(container, 'timesheet-export');
          break;
        case 'hc-hub':
          HCHubModule.render(container, subView || 'struktur');
          break;
        case 'admin-dapur':
        case 'admin-hub':
          AdminHubModule.render(container, subView || 'dapur');
          break;
        case 'admin-kendala':
          AdminHubModule.render(container, 'kendala');
          break;
        case 'approval':
          ApprovalCenterModule.render(container);
          break;
        default:
          DashboardModule.render(container);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Error rendering tab:', tabId, err);
      container.innerHTML = `
        <div class="nalar-card" style="border: 1px solid rgba(248, 113, 113, 0.4); padding: 36px; text-align: center; max-width: 600px; margin: 40px auto;">
          <div style="font-size: 36px; margin-bottom: 12px;">⚠️</div>
          <h3 style="color: #F87171; font-size: 18px; margin-bottom: 8px;">Sinkronisasi Data Cache Organisasi</h3>
          <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 20px; line-height: 1.6;">
            Struktur data lokal telah dimutakhirkan ke V3. Silakan klik tombol di bawah untuk menyinkronkan data.
          </p>
          <button class="btn-nalar-primary" onclick="DB.reset(); location.reload();">
            🔄 Sinkronkan Data & Muat Ulang
          </button>
        </div>
      `;
    }

    this.updateSidebarBadges();
  },

  refreshCurrentTab: function() {
    this.switchTab(this.currentTab);
  },

  updateSidebarBadges: function() {
    const pendingCount = DB.getPendingApprovalsCount();
    
    // Top Navbar Badge
    const badge = document.getElementById('approval-badge-count');
    if (badge) {
      badge.textContent = pendingCount;
      badge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }

    // Mobile Drawer Badge
    const mobileBadge = document.querySelector('.mobile-badge-count');
    if (mobileBadge) {
      mobileBadge.textContent = pendingCount;
      mobileBadge.style.display = pendingCount > 0 ? 'inline-block' : 'none';
    }
  },

  // Modal Controls
  openModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('show', 'active');
    }
  },

  closeModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show', 'active');
    }
  },

  // Supabase & Gmail SMTP Configuration Modal Handlers
  openSupabaseConfig: function() {
    const urlInput = document.getElementById('cfg-supabase-url');
    const anonInput = document.getElementById('cfg-supabase-anon');
    const resultBox = document.getElementById('cfg-test-result');
    if (urlInput && window.SupabaseConfig) urlInput.value = window.SupabaseConfig.getUrl();
    if (anonInput && window.SupabaseConfig) anonInput.value = window.SupabaseConfig.getAnonKey();
    if (resultBox) resultBox.style.display = 'none';
    this.openModal('modal-supabase-config');
  },

  testSupabaseConnection: async function() {
    console.log('[Supabase] Menguji koneksi...');
    const resultBox = document.getElementById('cfg-test-result');
    const urlInput = document.getElementById('cfg-supabase-url');
    const anonInput = document.getElementById('cfg-supabase-anon');

    const url = urlInput ? urlInput.value.trim() : '';
    const anon = anonInput ? anonInput.value.trim() : '';

    if (!url || !anon) {
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
        resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        resultBox.style.color = '#FCA5A5';
        resultBox.textContent = '❌ Harap isi Project URL dan Anon Key terlebih dahulu.';
      }
      return;
    }

    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.style.background = 'rgba(59, 130, 246, 0.15)';
      resultBox.style.border = '1px solid rgba(59, 130, 246, 0.4)';
      resultBox.style.color = '#93C5FD';
      resultBox.textContent = '⏳ Menguji koneksi ke database Supabase...';
    }

    try {
      const test = await window.SupabaseConfig.testConnection(url, anon);
      if (resultBox) {
        if (test.success) {
          resultBox.style.background = 'rgba(16, 185, 129, 0.15)';
          resultBox.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          resultBox.style.color = '#6EE7B7';
          resultBox.textContent = '✅ ' + test.message;
        } else {
          resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
          resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          resultBox.style.color = '#FCA5A5';
          resultBox.textContent = '❌ ' + test.message;
        }
      }
    } catch (err) {
      console.error('Error saat tes koneksi:', err);
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
        resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        resultBox.style.color = '#FCA5A5';
        resultBox.textContent = '❌ Terjadi kesalahan: ' + (err.message || err);
      }
    }
  },

  testDirectEmailSend: async function() {
    const urlInput = document.getElementById('cfg-supabase-url');
    const anonInput = document.getElementById('cfg-supabase-anon');
    const emailInput = document.getElementById('cfg-test-email-input');
    const resultBox = document.getElementById('cfg-email-test-result');
    const btn = document.getElementById('btn-run-email-test');
    
    const url = urlInput ? urlInput.value.trim().replace(/\/+$/, '') : '';
    const anon = anonInput ? anonInput.value.trim() : '';
    const targetEmail = emailInput ? emailInput.value.trim() : 'alfaqih1108@gmail.com';

    if (!url || !anon) {
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
        resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        resultBox.style.color = '#FCA5A5';
        resultBox.textContent = '❌ Harap isi Project URL dan Anon Key terlebih dahulu!';
      }
      return;
    }

    // Pastikan kredensial aktif sinkron dengan yang ada di form input
    if (window.SupabaseConfig) {
      window.SupabaseConfig.setCredentials(url, anon);
    }

    if (!targetEmail || !targetEmail.includes('@')) {
      if (resultBox) {
        resultBox.style.display = 'block';
        resultBox.style.background = 'rgba(245, 158, 11, 0.15)';
        resultBox.style.border = '1px solid rgba(245, 158, 11, 0.4)';
        resultBox.style.color = '#FDE68A';
        resultBox.textContent = '⚠️ Masukkan alamat email tujuan yang valid!';
      }
      return;
    }

    if (btn) {
      btn.disabled = true;
      btn.textContent = '⏳ Mengirim...';
    }

    if (resultBox) {
      resultBox.style.display = 'block';
      resultBox.style.background = 'rgba(59, 130, 246, 0.15)';
      resultBox.style.border = '1px solid rgba(59, 130, 246, 0.4)';
      resultBox.style.color = '#93C5FD';
      resultBox.textContent = `⏳ Menghubungi Supabase Edge Function & mengirim email ke ${targetEmail}...`;
    }

    try {
      const res = await window.SupabaseConfig.testDirectEmailSend(targetEmail);
      if (resultBox) {
        if (res.success) {
          resultBox.style.background = 'rgba(16, 185, 129, 0.15)';
          resultBox.style.border = '1px solid rgba(16, 185, 129, 0.4)';
          resultBox.style.color = '#6EE7B7';
          resultBox.textContent = res.message;
        } else {
          resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
          resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
          resultBox.style.color = '#FCA5A5';
          resultBox.textContent = res.message;
        }
      }
    } catch (e) {
      if (resultBox) {
        resultBox.style.background = 'rgba(239, 68, 68, 0.15)';
        resultBox.style.border = '1px solid rgba(239, 68, 68, 0.4)';
        resultBox.style.color = '#FCA5A5';
        resultBox.textContent = '❌ Terjadi kesalahan: ' + e.message;
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '🚀 Kirim Tes';
      }
    }
  },

  saveSupabaseConfig: async function() {
    const urlInput = document.getElementById('cfg-supabase-url');
    const anonInput = document.getElementById('cfg-supabase-anon');
    const url = urlInput ? urlInput.value.trim() : '';
    const anon = anonInput ? anonInput.value.trim() : '';

    if (!url || !anon) {
      this.showToast('Mohon lengkapi Project URL dan Anon Key Supabase!', 'warn');
      return;
    }

    if (window.SupabaseConfig) {
      window.SupabaseConfig.setCredentials(url, anon);
    }
    
    this.updateCloudBadge();
    this.closeModal('modal-supabase-config');
    this.showToast('⚡ Database Supabase Berhasil Disimpan & Terhubung Aktif!', 'success');
    
    if (window.DB && typeof window.DB.pullLatestFromSupabase === 'function') {
      await window.DB.pullLatestFromSupabase();
    }
    this.refreshCurrentTab();
  },

  updateCloudBadge: function() {
    const btn = document.getElementById('btn-header-cloud-config');
    if (!btn) return;

    const isOnline = window.SupabaseConfig && window.SupabaseConfig.isConfigured();
    btn.className = `btn-header-cloud ${isOnline ? 'is-online' : 'is-offline'}`;
    btn.setAttribute('title', isOnline ? 'Supabase Database: Online & Real-time Terhubung (Klik untuk Konfigurasi)' : 'Server Supabase: Offline (Klik untuk Hubungkan)');

    btn.innerHTML = `
      <span class="cloud-pulse-dot"></span>
      <svg class="cloud-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
      <span id="btn-header-cloud-label" class="cloud-status-text">${isOnline ? 'Supabase Online' : 'Cloud DB'}</span>
    `;
  },

  // =========================================================================
  // UNIVERSAL MULTI-LEVEL APPROVAL PROGRESS TRACKER MODAL
  // =========================================================================
  showApprovalTracker: function(type, id) {
    const details = DB.getApprovalTrackerDetails(type, id);
    if (!details) {
      this.showToast('Data pengajuan tidak ditemukan!', 'warn');
      return;
    }

    let modalEl = document.getElementById('modal-approval-tracker');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-approval-tracker';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const typeBadge = details.type === 'PR' ? 'Pengadaan Barang & Pembelian (PR)' : details.type === 'LEAVE' ? 'Cuti & Izin Karyawan' : 'Timesheet & Presensi';
    const typeColor = details.type === 'PR' ? '#FCD34D' : details.type === 'LEAVE' ? '#A78BFA' : '#60A5FA';

    const activeStep = details.steps.find(s => s.status === 'ACTIVE');
    const isCompleted = details.status === 'APPROVED' || details.status === 'COMPLETED';
    const isRejected = details.status === 'REJECTED';

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: ${typeColor};">${typeBadge} · ${details.id}</span>
            <h3 class="modal-title" style="margin-top: 2px;">Rincian Alur & Tahap Persetujuan</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-approval-tracker')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="modal-body" style="padding-top: 20px;">
          
          <!-- Request Header Card -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; flex-wrap: wrap;">
              <div>
                <h4 style="font-size: 15.5px; color: #fff; font-weight: 600; margin: 0 0 4px 0;">${details.title}</h4>
                <div style="font-size: 12px; color: var(--text-secondary);">
                  Diajukan oleh: <strong>${details.requester}</strong>
                  ${details.targetKitchen ? ` · <span style="color: #FCD34D;">🍲 Untuk: ${details.targetKitchen}</span>` : ''}
                </div>
              </div>
              <div>
                <span class="badge-status ${isCompleted ? 'badge-approved' : isRejected ? 'badge-rejected' : 'badge-pending'}" style="font-size: 11px; padding: 4px 10px;">
                  ${isCompleted ? '🟢 Disetujui Penuh' : isRejected ? '🔴 Ditolak' : '⏳ Sedang Berjalan'}
                </span>
              </div>
            </div>

            <!-- Current Level Summary Banner -->
            <div style="margin-top: 12px; padding: 8px 12px; border-radius: 6px; font-size: 11.5px; display: flex; align-items: center; gap: 8px; ${isCompleted ? 'background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.3); color: #6EE7B7;' : isRejected ? 'background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #F87171;' : 'background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3); color: #FCD34D;'}">
              <span>${isCompleted ? '✅' : isRejected ? '❌' : '⏳'}</span>
              <span>
                ${isCompleted 
                  ? '<strong>Persetujuan Lengkap:</strong> Semua level wewenang telah menyetujui pengajuan ini.'
                  : isRejected 
                  ? '<strong>Pengajuan Ditolak:</strong> Proses approval telah dihentikan.'
                  : `<strong>Posisi Level Saat Ini:</strong> Level ${activeStep ? activeStep.level : '1'} dari ${details.steps.length} (<strong>${activeStep ? activeStep.title : 'Sedang Diproses'}</strong>)`
                }
              </span>
            </div>
          </div>

          <!-- If PR has adjustment callout -->
          ${details.hasAdjustment && details.adjustments && details.adjustments.length > 0 ? `
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 22px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 700; color: #FCD34D; margin-bottom: 10px;">
                <span>📝 Catatan Penyesuaian Anggaran & Kuantiti oleh Approver</span>
              </div>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; font-size: 11.5px; margin-bottom: 10px;">
                <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="color: var(--text-dim); font-size: 10px; text-transform: uppercase;">Jumlah (Qty)</div>
                  <div style="color: var(--text-muted); text-decoration: line-through;">Semula: ${details.originalQuantity} unit</div>
                  <div style="color: #34D399; font-weight: 700; font-size: 13px;">Disetujui: ${details.quantity} unit</div>
                </div>

                <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="color: var(--text-dim); font-size: 10px; text-transform: uppercase;">Harga Satuan Budget</div>
                  <div style="color: var(--text-muted); text-decoration: line-through;">Rp ${Number(details.originalUnitPrice).toLocaleString('id-ID')}</div>
                  <div style="color: #34D399; font-weight: 700; font-size: 13px;">Rp ${Number(details.unitPrice).toLocaleString('id-ID')}</div>
                </div>

                <div style="background: rgba(0,0,0,0.3); padding: 8px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.06);">
                  <div style="color: var(--text-dim); font-size: 10px; text-transform: uppercase;">Total Anggaran</div>
                  <div style="color: var(--text-muted); text-decoration: line-through;">Rp ${Number(details.originalTotalPrice).toLocaleString('id-ID')}</div>
                  <div style="color: #34D399; font-weight: 700; font-size: 13px;">Rp ${Number(details.totalPrice).toLocaleString('id-ID')}</div>
                </div>
              </div>

              ${details.adjustments.map(a => `
                <div style="font-size: 11.5px; color: var(--text-secondary); line-height: 1.5; border-top: 1px dashed rgba(245, 158, 11, 0.25); padding-top: 8px;">
                  💬 <em>"${a.notes}"</em> — <strong style="color: #FCD34D;">${a.adjustedBy}</strong> (${a.role}) · <span style="color: var(--text-dim); font-size: 10.5px;">${a.date}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Visual Multi-Level Approval Stepper -->
          <div style="margin-bottom: 12px;">
            <span class="text-mono-badge" style="color: var(--text-muted); font-size: 10px; margin-bottom: 8px; display: block;">
              URUTAN TAHAP HIRARKI APPROVAL (STEP-BY-STEP)
            </span>

            <div class="approval-tracker-stepper">
              ${details.steps.map((step, idx) => {
                const isLast = (idx === details.steps.length - 1);
                const nodeClass = step.status === 'COMPLETED' ? 'completed' : step.status === 'ACTIVE' ? 'active' : step.status === 'REJECTED' ? 'rejected' : 'upcoming';
                const lineClass = step.status === 'COMPLETED' ? 'completed' : step.status === 'ACTIVE' ? 'active' : '';

                return `
                  <div class="tracker-step-item ${nodeClass}">
                    <div class="tracker-step-rail">
                      <div class="tracker-step-node ${nodeClass}">
                        ${step.status === 'COMPLETED' ? '✓' : step.status === 'ACTIVE' ? '⏳' : step.status === 'REJECTED' ? '✕' : step.level}
                      </div>
                      ${!isLast ? `<div class="tracker-step-line ${lineClass}"></div>` : ''}
                    </div>

                    <div class="tracker-step-content">
                      <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span style="font-size: 10px; font-weight: 700; font-family: var(--font-mono); color: ${step.status === 'COMPLETED' ? '#34D399' : step.status === 'ACTIVE' ? '#FCD34D' : 'var(--text-dim)'}; background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px;">
                            LEVEL ${step.level}
                          </span>
                          <h4 style="font-size: 13.5px; font-weight: 600; color: #fff; margin: 0;">${step.title}</h4>
                        </div>
                        <span style="font-size: 10.5px; color: ${step.status === 'COMPLETED' ? '#34D399' : step.status === 'ACTIVE' ? '#FCD34D' : 'var(--text-dim)'}; font-weight: 600;">
                          ${step.status === 'COMPLETED' ? '✅ Disetujui / Selesai' : step.status === 'ACTIVE' ? '⏳ Sedang Meninjau (Level Aktif)' : step.status === 'REJECTED' ? '🔴 Ditolak' : '⚪ Menunggu Giliran'}
                        </span>
                      </div>

                      <div style="font-size: 11px; color: var(--text-dim); margin-bottom: 6px;">
                        ${step.subtitle}
                      </div>

                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-secondary); border-top: 1px solid rgba(255,255,255,0.06); padding-top: 6px; margin-top: 6px; flex-wrap: wrap; gap: 6px;">
                        <div>
                          👤 Pejabat / Aktor: <strong style="color: #fff;">${step.actorName}</strong>
                        </div>
                        <div style="font-size: 10.5px; color: var(--text-muted); font-family: var(--font-mono);">
                          ⏱️ ${step.timestamp}
                        </div>
                      </div>

                      <div style="font-size: 11.5px; color: ${step.status === 'ACTIVE' ? '#FDE68A' : 'var(--text-muted)'}; margin-top: 6px; line-height: 1.45; font-style: italic;">
                        💬 "${step.notes}"
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>

        <div class="modal-footer" style="padding: 14px 28px; display: flex; justify-content: ${(details.type === 'PR' || details.type === 'LEAVE') ? 'space-between' : 'flex-end'}; align-items: center; flex-wrap: wrap; gap: 10px;">
          ${details.type === 'PR' ? `
            <button type="button" class="btn-nalar-secondary" style="padding: 6px 14px; font-size: 12px; color: #F87171; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08);" onclick="PengajuanBarangModule.confirmDeletePR('${details.id}', '${(details.title || 'Barang').replace(/'/g, "\\'")}')">
              🗑️ Hapus Pengajuan PR Ini
            </button>
          ` : (details.type === 'LEAVE' && (!Array.isArray(details.steps) || !details.steps.some(s => s.level === 2 && s.status === 'COMPLETED')) && details.status !== 'APPROVED') ? `
            <button type="button" class="btn-nalar-secondary" style="padding: 6px 14px; font-size: 12px; color: #F87171; border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.08);" onclick="App.closeModal('modal-approval-tracker'); CutiModule.handleCancelLeave('${details.id}')">
              🗑️ Batalkan & Hapus Permohonan Cuti Ini
            </button>
          ` : ''}
          <button type="button" class="btn-nalar-primary" style="padding: 6px 18px; font-size: 12.5px;" onclick="App.closeModal('modal-approval-tracker')">
            Tutup Rincian
          </button>
        </div>
      </div>
    `;

    this.openModal('modal-approval-tracker');
  },

  // Toast System
  showToast: function(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `nalar-toast ${type}`;
    
    const icon = type === 'success' ? '✓' : type === 'warn' ? '⚠' : '✕';
    toast.innerHTML = `
      <span style="font-weight: bold; font-family: var(--font-mono);">${icon}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Launch on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => App.init());
} else {
  App.init();
}
