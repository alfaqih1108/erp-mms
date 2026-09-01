/**
 * ERP MMS - Executive Dashboard Module
 * Modern Dark Obsidian Dashboard featuring:
 * 1. Hero Section with Animated Neural/Sine Wave Motion Illustration ("Empowered Connections, Elevated Growth")
 * 2. Nalar KPI HUD Chips & Approval Pipeline Showcase
 * 3. User Submissions & Realtime Audit Trail Feed
 */

window.DashboardModule = {
  waveAnimationId: null,
  issueFilter: 'ALL',
  procurementFilter: 'ALL',

  setProcurementFilter: function(filter) {
    this.procurementFilter = filter;
    this.render(document.getElementById('main-content-area'));
  },

  render: function(container) {
    if (!container) return;

    // Clean up previous wave animation frame if any
    if (this.waveAnimationId) {
      cancelAnimationFrame(this.waveAnimationId);
      this.waveAnimationId = null;
    }

    const user = DB.getCurrentUser() || {
      id: 'SO-001',
      name: 'Maulana Raka Pahlevi',
      role: 'STAFF_OPERASIONAL',
      roleLabel: 'Staff Operasional',
      department: 'Operasional Lapangan',
      quotaAnnualLeave: 12,
      remainingAnnualLeave: 12
    };

    const leaves = DB.getLeaves() || [];
    const timesheets = DB.getTimesheets() || [];
    const prs = DB.getItemRequests() || [];
    const cashAdvances = (DB.getCashAdvances ? DB.getCashAdvances() : []) || [];
    const logs = DB.getActivityLogs() || [];

    // Aggregations per User & Role
    const userLeaves = leaves.filter(l => l && (l.employeeId === user.id || l.employeeName === user.name));
    const userTimesheets = timesheets.filter(t => t && (t.employeeId === user.id || t.employeeName === user.name));
    const userPrs = prs.filter(p => p && (p.employeeId === user.id || p.employeeName === user.name));
    const userCashAdvances = cashAdvances.filter(ca => ca && (ca.employeeId === user.id || ca.requesterId === user.id || ca.employeeName === user.name));

    // Timesheet Real-Time Metrics (Hari Ini vs Rekap Bulan)
    const todayStr = (window.getRealtimeDateStr ? window.getRealtimeDateStr() : new Date().toISOString().slice(0, 10));
    const todayTimesheets = userTimesheets.filter(t => t.date === todayStr);
    const todayHours = todayTimesheets.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const totalMonthHours = userTimesheets.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const targetDailyHours = 8.0;
    const todayPercent = Math.min(100, Math.round((todayHours / targetDailyHours) * 100));

    // Role-Based PR & Approval Scopes
    const isApproverRole = ['SUPER_ADMIN', 'HUMAN_CAPITAL', 'DIREKTUR_KEUANGAN', 'DIREKTUR_OPERASIONAL', 'DIREKTUR_UTAMA', 'MANAGER_AREA', 'MANAGER_KEUANGAN', 'STAFF_AHLI_KEUANGAN', 'FAT_OFFICER'].includes(user.role);
    const userPendingPrCount = userPrs.filter(p => p && p.status === 'PENDING').length;
    const userTotalPrSpend = userPrs.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);

    const pendingApprovals = DB.getPendingApprovalsCount() || 0;
    const userActiveSubmissions = userPendingPrCount + userLeaves.filter(l => l.status === 'PENDING').length + userTimesheets.filter(t => t.status === 'PENDING').length;

    const isSenior = hasWorkedOneYear(user.joinDate);
    const displayLeaveRemaining = isSenior ? (user.remainingAnnualLeave !== undefined ? user.remainingAnnualLeave : 12) : (user.remainingPersonalLeave !== undefined ? user.remainingPersonalLeave : 3);
    const displayLeaveQuota = isSenior ? (user.quotaAnnualLeave || 12) : (user.quotaPersonalLeave || 3);

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- ==========================================================================
             HERO SECTION WITH MOTION ILLUSTRATION WAVE (NALAR STYLE - FULL SCREEN EDGE-TO-EDGE)
             ========================================================================== -->
        <div class="hero-motion-showcase">
          <!-- Animated Neural Sine Wave Canvas Background -->
          <div class="hero-wave-canvas-wrapper">
            <canvas id="hero-neural-wave-canvas" class="hero-wave-canvas"></canvas>
          </div>

          <div class="hero-content-inner">
            <!-- Glowing Live Status Badge -->
            <div class="hero-badge-pill">
              <span class="live-dot"></span>
              <span>Enterprise Intelligent Workflow Engine</span>
            </div>

            <!-- Main Iconic Headline -->
            <h1 class="hero-title-headline">
              Empowered Connections,<br>Elevated Growth
            </h1>

            <!-- Subtitle -->
            <p class="hero-subtitle-desc">
              Platform operasional terpadu yang menyatukan manajemen kepegawaian, pencatatan produktivitas presensi harian, dan pengadaan aset kantor dalam satu alur persetujuan cerdas tanpa hambatan.
            </p>

            <!-- Quick Action Buttons -->
            <div class="hero-actions-group">
              ${user.role === 'MAKER_YAYASAN' ? `
                <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-color: #F87171;" onclick="App.switchTab('dapur'); setTimeout(() => DapurYayasanModule.openReportModal(), 150);">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  + Input Laporan Dapur & Saldo VA
                </button>
              ` : `
                <button class="btn-nalar-primary" onclick="App.openModal('modal-cuti')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Ajukan Cuti Baru
                </button>
              `}
              <button class="btn-nalar-secondary" onclick="App.switchTab('timesheet')">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Catat Timesheet Hari Ini
              </button>
              <button class="btn-nalar-secondary" onclick="PengajuanBarangModule.openPRModal()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                Pengajuan Barang (PR)
              </button>
            </div>
          </div>
        </div>

        <!-- ==========================================================================
             USER CORE ENGINE STATUS BANNER
             ========================================================================== -->
        <div class="nalar-card hud-corner-box aura-box-orange" style="padding: 26px 32px; margin-bottom: 28px;">
          <div class="card-aura-glow aura-orange"></div>
          
          <div style="position: relative; z-index: 2; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span class="live-dot"></span>
                <span class="text-mono-badge" style="color: var(--brand-orange);">Sesi Aktif: ${user.department}</span>
              </div>
              <h2 style="font-size: 22px; font-weight: 600;">
                Selamat Datang, <span style="font-style: italic; font-weight: 400; color: #fff;">${user.name}</span>
                <span style="font-size: 13px; font-weight: 400; color: var(--text-muted); font-family: var(--font-mono); margin-left: 6px;">(${user.roleLabel})</span>
              </h2>
            </div>

            <div style="display: flex; align-items: center; gap: 14px;">
              <span style="font-family: var(--font-mono); font-size: 12px; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 8px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                ${!isSenior ? `
                  Status Cuti: <strong style="color: #FCD34D;">${displayLeaveRemaining} Hari Pribadi (Q3)</strong> · Masa Kerja: <strong style="color: #34D399;">${calculateTenure(user.joinDate)}</strong>
                ` : `
                  Status Cuti: <strong style="color: #A78BFA;">${displayLeaveRemaining} Hari Tahunan</strong> · Jam TS Hari Ini: <strong style="color: #60A5FA;">${todayHours.toFixed(1)} Jam</strong>
                `}
              </span>
            </div>
          </div>
        </div>

        <!-- ==========================================================================
             4 KPI HUD CHIPS
             ========================================================================== -->
        <div class="kpi-stat-grid">
          <!-- Chip 1: Sisa Kuota Cuti Sesuai Masa Kerja (Pasal 14) -->
          <div class="kpi-chip hud-corner-box" style="cursor: pointer;" onclick="App.switchTab('cuti')">
            ${!isSenior ? `
              <div class="kpi-chip-header">
                <span class="kpi-chip-title">Cuti Pribadi (Personal Leave)</span>
                <span style="font-size: 10px; color: #F59E0B; font-family: var(--font-mono); font-weight: 600;">MASA KERJA &lt; 1 THN</span>
              </div>
              <div class="kpi-chip-value" style="color: #FCD34D; font-weight: 700; font-family: var(--font-mono);">
                ${displayLeaveRemaining} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">/ ${displayLeaveQuota} Hari (Q3)</span>
              </div>
              <div class="kpi-chip-footer">
                <span class="stat-trend-warn">● Kuota Cuti Pribadi Kuartalan (Annual Leave aktif setelah 1 thn)</span>
              </div>
            ` : `
              <div class="kpi-chip-header">
                <span class="kpi-chip-title">Cuti Tahunan (Annual Leave)</span>
                <span style="font-size: 10px; color: #8B5CF6; font-family: var(--font-mono); font-weight: 600;">MASA KERJA ≥ 1 THN</span>
              </div>
              <div class="kpi-chip-value" style="color: #A78BFA; font-weight: 700; font-family: var(--font-mono);">
                ${displayLeaveRemaining} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">/ ${displayLeaveQuota} Hari (2026)</span>
              </div>
              <div class="kpi-chip-footer">
                <span class="stat-trend-up">● Hak Cuti Tahunan Penuh (Carry over maks. 4 hari)</span>
              </div>
            `}
          </div>

          <!-- Chip 2: Timesheet Jam Kerja Real-Time -->
          <div class="kpi-chip hud-corner-box" style="cursor: pointer;" onclick="App.switchTab('timesheet')">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Total Jam Timesheet</span>
              <span style="font-size: 11px; color: #3B82F6; font-family: var(--font-mono); font-weight: 600;">HARI INI</span>
            </div>
            <div class="kpi-chip-value" style="color: #60A5FA; font-weight: 700; font-family: var(--font-mono);">
              ${todayHours.toFixed(1)} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">/ ${targetDailyHours.toFixed(1)} Jam</span>
            </div>
            <div class="kpi-chip-footer">
              ${todayHours >= targetDailyHours 
                ? `<span class="stat-trend-up">↑ 100%</span> Target harian tercapai · Rekap: ${totalMonthHours.toFixed(1)} Jam`
                : todayHours > 0 
                ? `<span class="stat-trend-warn">⏳ ${todayPercent}%</span> Kurang ${(targetDailyHours - todayHours).toFixed(1)} jam · Rekap: ${totalMonthHours.toFixed(1)} Jam`
                : `<span class="stat-trend-warn" style="color: #94A3B8;">○ 0%</span> Belum ada log hari ini · Rekap: ${totalMonthHours.toFixed(1)} Jam`}
            </div>
          </div>

          <!-- Chip 3: Pengadaan / PR Aktif (Selalu Selaras dengan Halaman Pengadaan PR Saya) -->
          <div class="kpi-chip hud-corner-box" style="cursor: pointer;" onclick="App.switchTab('pengajuan')">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Pengajuan Barang Aktif</span>
              <span style="font-size: 11px; color: #F59E0B; font-family: var(--font-mono); font-weight: 600;">PR SAYA</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCD34D; font-weight: 700; font-family: var(--font-mono);">
              ${userPendingPrCount} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">Permintaan</span>
            </div>
            <div class="kpi-chip-footer">
              ${userPendingPrCount === 0 
                ? `<span style="color: #34D399; font-size: 11px; font-family: var(--font-mono);">✓ Tidak ada PR aktif pending</span>`
                : `<span class="stat-trend-warn">● ${userPendingPrCount} Menunggu Review / Approval</span>`}
            </div>
          </div>

          <!-- Chip 4: Approval Hub (untuk Approver) ATAU Laporan Dapur (untuk Maker Yayasan) ATAU Status Pengajuan (Karyawan) -->
          ${user.role === 'MAKER_YAYASAN' ? `
            <div class="kpi-chip hud-corner-box" style="cursor: pointer;" onclick="App.switchTab('dapur')">
              <div class="kpi-chip-header">
                <span class="kpi-chip-title">Laporan Dapur & VA</span>
                <span style="font-size: 11px; color: #FB7185; font-family: var(--font-mono); font-weight: 600;">YAYASAN</span>
              </div>
              <div class="kpi-chip-value" style="color: #FDA4AF; font-weight: 700; font-family: var(--font-mono);">
                ${(DB.getKitchenReports() || []).length} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">Laporan</span>
              </div>
              <div class="kpi-chip-footer">
                <span style="color: #FB7185; font-size: 11px; font-family: var(--font-mono);">Kelola Transaksi Dapur →</span>
              </div>
            </div>
          ` : isApproverRole ? `
            <div class="kpi-chip hud-corner-box" style="cursor: pointer;" onclick="App.switchTab('approval')">
              <div class="kpi-chip-header">
                <span class="kpi-chip-title">Universal Approval</span>
                <span style="font-size: 11px; color: var(--brand-orange); font-family: var(--font-mono); font-weight: 600;">INBOX REVIEW</span>
              </div>
              <div class="kpi-chip-value" style="color: #FF8A4D; font-weight: 700; font-family: var(--font-mono);">
                ${pendingApprovals} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">Pending</span>
              </div>
              <div class="kpi-chip-footer">
                ${pendingApprovals === 0 
                  ? `<span style="color: #34D399; font-size: 11px; font-family: var(--font-mono);">✓ Inbox bersih, tidak ada antrean pending</span>`
                  : `<span style="color: var(--brand-orange); font-size: 11px; font-family: var(--font-mono);">● ${pendingApprovals} Tugas Menunggu Tindakan Anda →</span>`}
              </div>
            </div>
          ` : `
            <div class="kpi-chip hud-corner-box" style="cursor: pointer;" onclick="App.switchTab('pengajuan')">
              <div class="kpi-chip-header">
                <span class="kpi-chip-title">Pengajuan Aktif Saya</span>
                <span style="font-size: 11px; color: var(--brand-orange); font-family: var(--font-mono); font-weight: 600;">STATUS</span>
              </div>
              <div class="kpi-chip-value" style="color: #FF8A4D; font-weight: 700; font-family: var(--font-mono);">
                ${userActiveSubmissions} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">Berkas</span>
              </div>
              <div class="kpi-chip-footer">
                ${userActiveSubmissions === 0 
                  ? `<span style="color: #34D399; font-size: 11px; font-family: var(--font-mono);">✓ Tidak ada pengajuan aktif</span>`
                  : `<span style="color: var(--brand-orange); font-size: 11px; font-family: var(--font-mono);">● Pengajuan sedang diproses →</span>`}
              </div>
            </div>
          `}
        </div>

        <!-- ==========================================================================
             DOKUMEN SOSIALISASI, SOP & PANDUAN YAYASAN (KHUSUS PERWAKILAN, STAFF OPS & MAKER)
             ========================================================================== -->
        ${(user.role === 'PERWAKILAN_YAYASAN' || user.role === 'STAFF_OPERASIONAL' || user.role === 'MAKER_YAYASAN') ? (function() {
          const docs = DB.getGuidelineDocuments(user.role) || [];
          return `
            <div class="nalar-card hud-corner-box aura-box-violet" style="margin-bottom: 28px; border-left: 3px solid #E11D48;">
              <div class="card-aura-glow aura-purple" style="opacity: 0.15;"></div>
              
              <div style="position: relative; z-index: 2;">
                <!-- Header with Title & Left/Right Scroll Controls -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="text-mono-badge" style="color: #FB7185;">Pusat Sumber Daya & Pengetahuan Yayasan</span>
                      <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                        (${docs.length} Dokumen Tersedia)
                      </span>
                    </div>
                    <h3 style="font-size: 18px; margin-top: 2px;">📚 Dokumen Sosialisasi, SOP & Panduan Resmi Yayasan</h3>
                  </div>
                  
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted); background: rgba(225,29,72,0.12); padding: 4px 10px; border-radius: var(--radius-full); border: 1px solid rgba(225,29,72,0.25);">
                      Dikelola oleh Human Capital
                    </span>
                    
                    <!-- Navigation Scroll Buttons -->
                    <div style="display: flex; gap: 6px;">
                      <button type="button" class="btn-nalar-secondary" style="padding: 4px 12px; font-size: 13px; min-width: 34px; border-radius: 6px; border-color: rgba(225,29,72,0.4); color: #FDA4AF; cursor: pointer;" onclick="DashboardModule.scrollDocSlider('left')" title="Geser ke kiri">
                        ◀
                      </button>
                      <button type="button" class="btn-nalar-secondary" style="padding: 4px 12px; font-size: 13px; min-width: 34px; border-radius: 6px; border-color: rgba(225,29,72,0.4); color: #FDA4AF; cursor: pointer;" onclick="DashboardModule.scrollDocSlider('right')" title="Geser ke kanan">
                        ▶
                      </button>
                    </div>
                  </div>
                </div>

                <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 16px; line-height: 1.6;">
                  Berikut adalah kumpulan dokumen Standard Operating Procedure (SOP), materi sosialisasi kemitraan, dan slide presentasi yang relevan untuk mendukung tugas Anda sebagai <strong style="color: #fff;">${user.roleLabel}</strong> <em>(geser/scroll ke samping untuk melihat seluruh dokumen)</em>:
                </p>

                <!-- Horizontal Scrollable Container (Scroll Ke Samping) -->
                <div id="doc-horizontal-slider" style="display: flex; gap: 16px; overflow-x: auto; scroll-snap-type: x mandatory; padding-bottom: 12px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: rgba(225,29,72,0.4) transparent;">
                  ${docs.map(d => `
                    <div style="flex: 0 0 350px; min-width: 320px; max-width: 380px; scroll-snap-align: start; background: var(--bg-card-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px; transition: all 0.2s ease;"
                         onmouseover="this.style.borderColor='rgba(225,29,72,0.4)'; this.style.transform='translateY(-2px)'"
                         onmouseout="this.style.borderColor='var(--border-subtle)'; this.style.transform='none'">
                      
                      <div>
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 10px;">
                          <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="display: inline-flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 6px; background: ${d.fileType === 'PDF' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'}; border: 1px solid ${d.fileType === 'PDF' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}; color: ${d.fileType === 'PDF' ? '#F87171' : '#FCD34D'}; font-weight: 700; font-family: var(--font-mono); font-size: 11px;">
                              ${d.fileType}
                            </span>
                            <span class="text-mono-badge" style="font-size: 10px; color: var(--text-secondary);">${d.category}</span>
                          </div>
                          <span style="font-family: var(--font-mono); font-size: 10.5px; color: var(--text-muted);">${d.fileSize}</span>
                        </div>

                        <h4 style="font-size: 14px; font-weight: 600; color: #fff; line-height: 1.4; margin-bottom: 6px; word-break: break-word;">
                          ${d.title}
                        </h4>
                        <p style="font-size: 12px; color: var(--text-muted); line-height: 1.5; margin-bottom: 4px; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden;">
                          ${d.description}
                        </p>
                      </div>

                      <div style="border-top: 1px solid var(--border-subtle); padding-top: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
                        <span style="font-size: 10.5px; color: var(--text-dim); font-family: var(--font-mono);">
                          Oleh: ${d.uploadedBy ? d.uploadedBy.split(' ')[0] : 'HC'} · ${d.uploadDate}
                        </span>
                        <div style="display: flex; gap: 8px;">
                          <button class="btn-preview-link" style="padding: 4px 10px; font-size: 11px; background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.35); color: #60A5FA;" onclick="DashboardModule.downloadDocument('${d.id}')">
                            📥 Unduh ${d.fileType}
                          </button>
                          <button class="btn-preview-link" style="padding: 4px 10px; font-size: 11px;" onclick="DashboardModule.openDocPreview('${d.id}', '${d.title.replace(/'/g, "\\'")}', '${d.fileType}', '${d.description.replace(/'/g, "\\'")}')">
                            👁️ Preview
                          </button>
                        </div>
                      </div>

                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
          `;
        })() : ''}

        <!-- ==========================================================================
             REKAP LAPORAN KENDALA LAPANGAN DARI PERWAKILAN YAYASAN
             (KHUSUS ROLE: MANAGER AREA, DIREKSI OPERASIONAL & SUPER ADMIN - 3 HARI TERAKHIR & COMPACT)
             ========================================================================== -->
        ${(user.role === 'MANAGER_AREA' || user.role === 'DIREKTUR_OPERASIONAL' || user.role === 'DIREKTUR_UTAMA' || user.role === 'SUPER_ADMIN') ? (function() {
          const allIssues = DB.getFieldIssues() || [];
          
          // Filter to 3 most recent unique dates
          const allDates = Array.from(new Set(allIssues.map(i => i.date))).sort().reverse();
          const recent3Dates = allDates.slice(0, 3);
          const recentIssues = allIssues.filter(i => recent3Dates.includes(i.date));
          const archivedIssuesCount = allIssues.length - recentIssues.length;

          const filter = DashboardModule.issueFilter || 'ALL';
          const pendingCount = recentIssues.filter(i => i.status === 'PENDING').length;
          const inProgressCount = recentIssues.filter(i => i.status === 'IN_PROGRESS').length;
          const followedUpCount = recentIssues.filter(i => i.status === 'FOLLOWED_UP').length;

          const filteredIssues = filter === 'ALL' 
            ? recentIssues 
            : filter === 'PENDING' 
            ? recentIssues.filter(i => i.status === 'PENDING') 
            : filter === 'IN_PROGRESS'
            ? recentIssues.filter(i => i.status === 'IN_PROGRESS')
            : recentIssues.filter(i => i.status === 'FOLLOWED_UP');

          return `
            <div class="nalar-card hud-corner-box aura-box-amber" style="margin-bottom: 22px; padding: 16px 20px; border-left: 4px solid #F59E0B;">
              <div class="card-aura-glow aura-amber" style="opacity: 0.12;"></div>
              
              <div style="position: relative; z-index: 2;">
                
                <!-- Compact Header Section -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245, 158, 11, 0.15); padding: 2px 6px; border-radius: 4px; font-size: 10.5px;">
                        🚨 Monitoring Kendala Lapangan
                      </span>
                      <span style="font-size: 11px; color: #60A5FA; font-weight: 600; font-family: var(--font-mono);">
                        (3 Hari Terakhir: ${recent3Dates.join(' · ') || 'Terbaru'})
                      </span>
                    </div>
                    <h3 style="font-size: 17px; font-weight: 700; color: #fff; margin-top: 3px; margin-bottom: 0;">
                      Kendala Operasional Dapur Terkini
                    </h3>
                  </div>

                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('admin-kendala')" style="padding: 5px 12px; font-size: 11.5px; color: #60A5FA; border-color: rgba(96,165,250,0.35);">
                      🔍 Buka Seluruh Rekap di Admin Hub →
                    </button>
                  </div>
                </div>

                <!-- Compact Filter Bar -->
                <div class="approval-filter-bar" style="margin-bottom: 12px; gap: 6px;">
                  <button type="button" class="approval-filter-pill pill-all ${filter === 'ALL' ? 'active' : ''}" style="padding: 4px 10px; font-size: 11.5px;" onclick="DashboardModule.setIssueFilter('ALL')">
                    <span class="filter-dot dot-orange"></span>
                    <span>Semua (3 Hari)</span>
                    <span class="filter-badge" style="font-size: 10px; padding: 1px 5px;">${recentIssues.length}</span>
                  </button>
                  <button type="button" class="approval-filter-pill pill-rejected ${filter === 'PENDING' ? 'active' : ''}" style="padding: 4px 10px; font-size: 11.5px;" onclick="DashboardModule.setIssueFilter('PENDING')">
                    <span class="filter-dot dot-red"></span>
                    <span>Belum Direspon</span>
                    <span class="filter-badge" style="font-size: 10px; padding: 1px 5px;">${pendingCount}</span>
                  </button>
                  <button type="button" class="approval-filter-pill pill-pending ${filter === 'IN_PROGRESS' ? 'active' : ''}" style="padding: 4px 10px; font-size: 11.5px;" onclick="DashboardModule.setIssueFilter('IN_PROGRESS')">
                    <span class="filter-dot dot-orange"></span>
                    <span>Ditanggapi</span>
                    <span class="filter-badge" style="font-size: 10px; padding: 1px 5px;">${inProgressCount}</span>
                  </button>
                  <button type="button" class="approval-filter-pill pill-settled ${filter === 'FOLLOWED_UP' ? 'active' : ''}" style="padding: 4px 10px; font-size: 11.5px;" onclick="DashboardModule.setIssueFilter('FOLLOWED_UP')">
                    <span class="filter-dot dot-emerald"></span>
                    <span>Selesai</span>
                    <span class="filter-badge" style="font-size: 10px; padding: 1px 5px;">${followedUpCount}</span>
                  </button>
                </div>

                <!-- Compact List of Issues -->
                ${filteredIssues.length === 0 ? `
                  <div style="text-align: center; padding: 18px 12px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-sm); background: rgba(0,0,0,0.2);">
                    <span style="font-size: 18px;">✨</span>
                    <span style="color: var(--text-secondary); font-size: 12.5px; margin-left: 6px;">
                      Tidak ada laporan kendala aktif dalam 3 hari terakhir.
                    </span>
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${filteredIssues.map(issue => {
                      const totalPoints = issue.points.length;
                      const donePoints = issue.points.filter(p => (typeof p === 'object' ? p.status === 'SUDAH_SELESAI' : issue.status === 'FOLLOWED_UP')).length;

                      return `
                        <div style="background: rgba(14, 18, 28, 0.95); border: 1px solid ${issue.status === 'FOLLOWED_UP' ? 'rgba(52, 211, 153, 0.3)' : issue.status === 'IN_PROGRESS' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}; border-radius: var(--radius-sm); padding: 10px 14px;">
                          
                          <!-- Compact Card Header -->
                          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245,158,11,0.12); padding: 1px 6px; border-radius: 3px; font-size: 10px;">
                                ${issue.kitchenIdSppg || issue.kitchenId}
                              </span>
                              <strong style="font-size: 13px; color: #fff;">🍳 ${issue.kitchenName}</strong>
                              <span style="font-size: 10.5px; color: var(--text-dim); font-family: var(--font-mono);">
                                📅 ${issue.date}
                              </span>
                            </div>

                            <div style="display: flex; align-items: center; gap: 8px;">
                              <span style="font-size: 11px; color: var(--text-muted);">
                                Pelapor: <strong style="color: #fff;">${issue.authorName}</strong> (PY)
                              </span>
                              <span class="badge-status ${issue.status === 'FOLLOWED_UP' ? 'badge-approved' : issue.status === 'IN_PROGRESS' ? 'badge-pending' : 'badge-rejected'}" style="font-size: 10px; padding: 2px 6px;">
                                ${donePoints}/${totalPoints} Selesai
                              </span>
                            </div>
                          </div>

                          <!-- Compact Points List -->
                          <div style="display: flex; flex-direction: column; gap: 6px;">
                            ${issue.points.map((pt, pIdx) => {
                              const pId = typeof pt === 'object' ? pt.id : `PT-${pIdx + 1}`;
                              const pText = typeof pt === 'object' ? pt.text : pt;
                              const pStatus = typeof pt === 'object' ? (pt.status || 'BELUM_DIRESPON') : (issue.status === 'FOLLOWED_UP' ? 'SUDAH_SELESAI' : 'BELUM_DIRESPON');
                              const pResponse = typeof pt === 'object' ? pt.response : issue.managerResponse;
                              const prefix = issue.formatType === 'NUMBER' ? `${pIdx + 1}. ` : `• `;

                              return `
                                <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255,255,255,0.06); border-radius: 4px; padding: 7px 10px;">
                                  <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap;">
                                    <div style="font-size: 12px; color: #fff; line-height: 1.4; flex: 1; min-width: 220px;">
                                      <strong style="color: #FCD34D;">${prefix}</strong>${pText}
                                    </div>

                                    <div style="display: flex; align-items: center; gap: 6px;">
                                      <span class="badge-status ${pStatus === 'SUDAH_SELESAI' ? 'badge-approved' : pStatus === 'SUDAH_DITANGGAPI' ? 'badge-settled' : pStatus === 'SUDAH_DIRESPON' ? 'badge-disbursed' : 'badge-pending'}" style="font-size: 9.5px; font-weight: 600; padding: 2px 6px;">
                                        ${pStatus === 'SUDAH_SELESAI' ? '✓ Selesai' : pStatus === 'SUDAH_DITANGGAPI' ? '💬 Ditanggapi' : pStatus === 'SUDAH_DIRESPON' ? '👁️ Direspon' : '⏳ Belum'}
                                      </span>

                                      <!-- Compact Action Buttons -->
                                      ${pStatus === 'BELUM_DIRESPON' ? `
                                        <button class="btn-nalar-secondary" style="padding: 2px 6px; font-size: 10px; color: #EC4899; border-color: rgba(236,72,153,0.4);" onclick="DashboardModule.setPointStatus('${issue.id}', '${pId}', 'SUDAH_DIRESPON')">
                                          👁️ Direspon
                                        </button>
                                      ` : ''}

                                      <button class="btn-nalar-primary" style="padding: 2px 8px; font-size: 10px; font-weight: 600; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-color: #60A5FA; color: #fff;" onclick="DashboardModule.openRespondPointModal('${issue.id}', '${pId}')">
                                        💬 ${pStatus === 'SUDAH_DITANGGAPI' ? 'Edit' : 'Tanggapi'}
                                      </button>

                                      ${pStatus !== 'SUDAH_SELESAI' ? `
                                        <button class="btn-nalar-primary" style="padding: 2px 8px; font-size: 10px; font-weight: 600; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff;" onclick="DashboardModule.setPointStatus('${issue.id}', '${pId}', 'SUDAH_SELESAI')">
                                          ✓ Selesai
                                        </button>
                                      ` : `
                                        <button class="btn-nalar-secondary" style="padding: 1px 5px; font-size: 9.5px; color: var(--text-dim);" onclick="DashboardModule.setPointStatus('${issue.id}', '${pId}', 'BELUM_DIRESPON')" title="Reset status">
                                          ↺
                                        </button>
                                      `}
                                    </div>
                                  </div>

                                  ${pResponse ? `
                                    <div style="margin-top: 5px; padding: 4px 8px; background: rgba(52, 211, 153, 0.08); border-left: 2px solid #34D399; border-radius: 3px; font-size: 11px; color: #A7F3D0; line-height: 1.3;">
                                      <strong>Arahan:</strong> "${pResponse}"
                                    </div>
                                  ` : ''}
                                </div>
                              `;
                            }).join('')}
                          </div>

                        </div>
                      `;
                    }).join('')}
                  </div>
                `}

                <!-- Compact Footer Note -->
                ${archivedIssuesCount > 0 ? `
                  <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-dim); flex-wrap: wrap; gap: 6px;">
                    <span>📂 Menampilkan laporan kendala 3 hari terkini. Ada <strong>${archivedIssuesCount} laporan terdahulu</strong> di arsip.</span>
                    <a href="javascript:void(0)" onclick="App.switchTab('admin-kendala')" style="color: #60A5FA; font-weight: 600; text-decoration: underline;">
                      Buka Seluruh Rekap Kendala di Admin Hub →
                    </a>
                  </div>
                ` : ''}

              </div>
            </div>
          `;
        })() : ''}

        <!-- ==========================================================================
             NOTIFIKASI & MONITORING TIMESHEET YANG BELUM TERISI
             ========================================================================== -->
        ${(() => {
          const today = new Date();
          const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
          
          const missingDates = [];
          // Check last 7 days up to today
          for (let i = 6; i >= 0; i--) {
            const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const dStr = d.toISOString().slice(0, 10);
            const dayOfWeek = d.getDay();
            
            // Skip Sunday if not a standard work day
            const isSunday = dayOfWeek === 0;
            
            const dayLogs = userTimesheets.filter(t => t.date === dStr);
            const dayHours = dayLogs.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
            
            const formattedDate = `${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
            const dayName = dayNames[dayOfWeek];
            
            if (dayHours === 0 && !isSunday) {
              missingDates.push({
                date: dStr,
                formattedDate,
                dayName,
                hours: 0,
                status: 'EMPTY',
                label: 'Belum Mengisi (0 Jam)',
                color: '#F87171',
                bg: 'rgba(248, 113, 113, 0.12)',
                icon: '🔴'
              });
            } else if (dayHours > 0 && dayHours < 8 && !isSunday) {
              missingDates.push({
                date: dStr,
                formattedDate,
                dayName,
                hours: dayHours,
                status: 'INCOMPLETE',
                label: `Kurang Jam (${dayHours.toFixed(1)} / 8 Jam)`,
                color: '#F59E0B',
                bg: 'rgba(245, 158, 11, 0.12)',
                icon: '🟡'
              });
            }
          }

          return `
            <div class="nalar-card" style="border: 1px solid ${missingDates.length > 0 ? 'rgba(248, 113, 113, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; background: ${missingDates.length > 0 ? 'linear-gradient(180deg, rgba(248, 113, 113, 0.04) 0%, rgba(15, 23, 42, 0.45) 100%)' : 'linear-gradient(180deg, rgba(16, 185, 129, 0.04) 0%, rgba(15, 23, 42, 0.45) 100%)'}; margin-bottom: 28px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px;">
                <div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="text-mono-badge" style="color: ${missingDates.length > 0 ? '#F87171' : '#34D399'}; background: ${missingDates.length > 0 ? 'rgba(248, 113, 113, 0.15)' : 'rgba(16, 185, 129, 0.15)'}; padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                      Notifikasi Kepatuhan Timesheet
                    </span>
                    <span style="font-size: 12px; color: var(--text-muted);">Evaluasi 7 Hari Kerja Terakhir</span>
                  </div>
                  <h3 style="font-size: 18px; margin-top: 4px; font-weight: 600;">
                    Informasi Timesheet yang Belum Terisi
                  </h3>
                </div>
                
                <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                  <span class="badge-status ${missingDates.length > 0 ? 'badge-rejected' : 'badge-approved'}" style="font-size: 11.5px; padding: 4px 12px; font-weight: 600;">
                    ${missingDates.length > 0 ? `⚠️ ${missingDates.length} Tanggal Perlu Diisi` : '✅ Semua Tanggal Terisi Lengkap'}
                  </span>
                  <button class="btn-nalar-primary" style="padding: 7px 14px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;" onclick="App.switchTab('timesheet')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                    <span>Isi Timesheet Sekarang</span>
                  </button>
                </div>
              </div>

              ${missingDates.length === 0 ? `
                <div style="padding: 20px; text-align: center; color: #34D399; font-size: 13px; background: rgba(16, 185, 129, 0.08); border-radius: var(--radius-sm); border: 1px solid rgba(16, 185, 129, 0.2);">
                  🎉 <strong>Luar biasa!</strong> Seluruh catatan log aktivitas kerja Anda dalam periode 7 hari terakhir telah terisi lengkap (≥ 8 Jam/Hari).
                </div>
              ` : `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px;">
                  ${missingDates.map(item => `
                    <div style="background: rgba(0, 0, 0, 0.35); border: 1px solid ${item.status === 'EMPTY' ? 'rgba(248, 113, 113, 0.3)' : 'rgba(245, 158, 11, 0.3)'}; border-radius: var(--radius-sm); padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; transition: all var(--transition-fast);">
                      <div>
                        <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${item.dayName}</div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #fff; margin: 2px 0;">${item.formattedDate}</div>
                        <div style="font-size: 11px; font-weight: 600; color: ${item.color}; display: flex; align-items: center; gap: 4px;">
                          <span>${item.icon}</span> ${item.label}
                        </div>
                      </div>
                      <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: var(--brand-orange); border-color: rgba(249, 115, 22, 0.4); font-weight: 600;" onclick="App.switchTab('timesheet')">
                        + Isi Log
                      </button>
                    </div>
                  `).join('')}
                </div>
              `}
            </div>
          `;
        })()}

        <!-- ==========================================================================
             FULL-WIDTH TRACKING CONTAINER: TRACKING SELURUH PROSES PENGADAAN & PERMOHONAN SAYA
             (PROGRESS STATUS SELESAI HANYA BERTAHAN 1 HARI UNTUK MENCEGAH PENUMPUKAN)
             ========================================================================== -->
        ${(() => {
          const procFilter = DashboardModule.procurementFilter || 'ALL';

          // Helper: Cek apakah item aktif dalam Live Tracking (status Selesai/Approved/Rejected hanya bertahan 1 hari)
          const isItemActiveInLiveTracking = (item) => {
            const isFinished = (
              item.status === 'APPROVED' || 
              item.status === 'SETTLED' || 
              item.status === 'REJECTED' || 
              item.status === 'COMPLETED' ||
              item.stage === 'APPROVED' || 
              item.stage === 'SETTLED' || 
              item.stage === 'COMPLETED'
            );

            // Jika status masih PENDING / DALAM PROSES, SELALU tampil di Live Tracking
            if (!isFinished) return true;

            // Cari timestamp penyelesaian (dari approvalHistory terakhir atau tanggal record)
            let completedTimeMs = null;
            if (Array.isArray(item.approvalHistory) && item.approvalHistory.length > 0) {
              const lastHist = item.approvalHistory[item.approvalHistory.length - 1];
              const tsStr = lastHist.timestamp || lastHist.time || lastHist.date;
              if (tsStr) {
                const parsed = new Date(tsStr.replace(' ', 'T')).getTime();
                if (!isNaN(parsed)) completedTimeMs = parsed;
              }
            }

            if (!completedTimeMs) {
              const raw = item.raw || item;
              const fallbackStr = raw.approvedAt || raw.completedAt || raw.updatedAt || raw.createdAt || raw.date || raw.submittedAt || raw.startDate;
              if (fallbackStr) {
                const parsed = new Date(fallbackStr.replace(' ', 'T')).getTime();
                if (!isNaN(parsed)) completedTimeMs = parsed;
              }
            }

            if (!completedTimeMs) return true;

            const nowMs = Date.now();
            const ONE_DAY_MS = 24 * 60 * 60 * 1000;
            const diffMs = nowMs - completedTimeMs;

            // Bertahan maksimal 24 jam (1 hari) atau hari kalender yang sama
            const isWithin24Hours = (diffMs >= 0 && diffMs <= ONE_DAY_MS);
            const compDateStr = new Date(completedTimeMs).toISOString().slice(0, 10);
            const nowDateStr = (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10));
            const isSameDay = (compDateStr === nowDateStr);

            return isWithin24Hours || isSameDay;
          };

          // Build unified array of user submissions with 1-day retention rule
          const allUserProcItems = [];

          userPrs.forEach(p => {
            const item = {
              type: 'PR',
              id: p.id,
              title: p.itemName,
              subtitle: `${p.quantity} Unit @ Rp ${Number(p.unitPrice || 0).toLocaleString('id-ID')} · Kategori: ${p.category || 'Operasional'} · Dapur: ${p.targetKitchen || 'Sentral'}`,
              nominal: p.totalPrice,
              date: p.createdAt || p.date || '-',
              stage: p.stage,
              status: p.status,
              approvalHistory: p.approvalHistory || [],
              raw: p
            };
            if (isItemActiveInLiveTracking(item)) {
              allUserProcItems.push(item);
            }
          });

          userCashAdvances.forEach(ca => {
            const item = {
              type: 'CA',
              id: ca.id,
              title: ca.title || `Kasbon Operasional (${ca.category || 'Lapangan'})`,
              subtitle: `Alokasi: ${ca.targetLocation || 'Operasional'} · Rekening: ${ca.bankName || 'BCA'} (${ca.bankAccountNo || '-'})`,
              nominal: ca.amountRequested,
              date: ca.createdAt || '-',
              stage: ca.stage,
              status: ca.status,
              approvalHistory: ca.approvalHistory || [],
              raw: ca
            };
            if (isItemActiveInLiveTracking(item)) {
              allUserProcItems.push(item);
            }
          });

          userLeaves.forEach(l => {
            const item = {
              type: 'CUTI',
              id: l.id,
              title: `${l.type} (${l.duration} Hari)`,
              subtitle: `Periode: ${l.startDate} s/d ${l.endDate} · Alasan: "${l.reason || 'Keperluan pribadi'}"`,
              nominal: null,
              date: l.submittedAt || l.startDate || '-',
              stage: l.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
              status: l.status,
              approvalHistory: l.approvalHistory || [],
              raw: l
            };
            if (isItemActiveInLiveTracking(item)) {
              allUserProcItems.push(item);
            }
          });

          // Sort newest first
          allUserProcItems.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

          const filteredProcItems = procFilter === 'ALL'
            ? allUserProcItems
            : procFilter === 'PR'
            ? allUserProcItems.filter(i => i.type === 'PR')
            : procFilter === 'CA'
            ? allUserProcItems.filter(i => i.type === 'CA')
            : allUserProcItems.filter(i => i.type === 'CUTI');

          return `
            <div class="nalar-card hud-corner-box aura-box-blue" style="margin-top: 12px; margin-bottom: 26px; padding: 22px 24px; border-left: 4px solid #3B82F6;">
              <div class="card-aura-glow aura-blue" style="opacity: 0.12;"></div>
              
              <div style="position: relative; z-index: 2;">
                <!-- Header Section -->
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; gap: 14px;">
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <span class="text-mono-badge" style="color: #93C5FD; background: rgba(59, 130, 246, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                        📦 Tracking Pengadaan & Permohonan Saya
                      </span>
                      <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                        Pemohon: <strong>${user.name} (${user.roleLabel})</strong>
                      </span>
                    </div>
                    <h3 style="font-size: 20px; font-weight: 700; color: #fff; margin-top: 4px; margin-bottom: 0;">
                      Live Tracking Seluruh Proses Pengadaan & Permohonan
                    </h3>
                    <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 3px; margin-bottom: 0;">
                      Lacak alur verifikasi anggaran, progres persetujuan bertingkat, penerbitan PO, pencairan kasbon, dan realisasi pengadaan Anda secara real-time. Permohonan berstatus selesai bertahan 1 hari di dashboard sebelum diarsipkan ke modul masing-masing.
                    </p>
                  </div>

                  <!-- Action Buttons -->
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <button type="button" class="btn-nalar-primary" style="padding: 7px 14px; font-size: 12px; font-weight: 600;" onclick="PengajuanBarangModule.openPRModal()">
                      + Ajukan PR Baru
                    </button>
                    <button type="button" class="btn-nalar-secondary" style="padding: 7px 14px; font-size: 12px; color: #34D399; border-color: rgba(52,211,153,0.4);" onclick="App.switchTab('cash-advance')">
                      + Ajukan Kasbon
                    </button>
                    <button type="button" class="btn-nalar-secondary" style="padding: 7px 14px; font-size: 12px; color: #A78BFA; border-color: rgba(167,139,250,0.4);" onclick="App.openModal('modal-cuti')">
                      + Ajukan Cuti
                    </button>
                  </div>
                </div>

                <!-- Filter Pills -->
                <div class="approval-filter-bar" style="margin-bottom: 18px; gap: 8px;">
                  <button type="button" class="approval-filter-pill ${procFilter === 'ALL' ? 'active pill-all' : ''}" onclick="DashboardModule.setProcurementFilter('ALL')">
                    <span class="filter-dot dot-orange"></span>
                    <span>Semua Permohonan</span>
                    <span class="filter-badge">${allUserProcItems.length}</span>
                  </button>
                  <button type="button" class="approval-filter-pill ${procFilter === 'PR' ? 'active pill-all' : ''}" onclick="DashboardModule.setProcurementFilter('PR')">
                    <span class="filter-dot dot-orange"></span>
                    <span>🛒 Purchase Request / PR</span>
                    <span class="filter-badge">${allUserProcItems.filter(i => i.type === 'PR').length}</span>
                  </button>
                  <button type="button" class="approval-filter-pill ${procFilter === 'CA' ? 'active pill-all' : ''}" onclick="DashboardModule.setProcurementFilter('CA')">
                    <span class="filter-dot dot-emerald"></span>
                    <span>💰 Cash Advance / Kasbon</span>
                    <span class="filter-badge">${allUserProcItems.filter(i => i.type === 'CA').length}</span>
                  </button>
                  <button type="button" class="approval-filter-pill ${procFilter === 'CUTI' ? 'active pill-all' : ''}" onclick="DashboardModule.setProcurementFilter('CUTI')">
                    <span class="filter-dot dot-purple"></span>
                    <span>🌴 Permohonan Cuti</span>
                    <span class="filter-badge">${allUserProcItems.filter(i => i.type === 'CUTI').length}</span>
                  </button>
                </div>

                <!-- List of Full-Width Tracking Stepper Cards -->
                ${filteredProcItems.length === 0 ? `
                  <div style="text-align: center; padding: 42px 20px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); background: rgba(0,0,0,0.25);">
                    <div style="font-size: 32px; margin-bottom: 8px;">📦</div>
                    <h4 style="color: #fff; font-size: 15px; margin-bottom: 4px;">Belum Ada Pengadaan atau Permohonan Aktif</h4>
                    <p style="color: var(--text-muted); font-size: 12.5px; max-width: 480px; margin: 0 auto 16px auto;">
                      Anda belum membuat pengajuan barang (PR) atau kasbon operasional. Gunakan tombol di atas untuk mengajukan kebutuhan pengadaan baru.
                    </p>
                    <div style="display: flex; justify-content: center; gap: 10px;">
                      <button type="button" class="btn-nalar-primary" style="font-size: 12px; padding: 6px 16px;" onclick="PengajuanBarangModule.openPRModal()">
                        + Ajukan PR Baru
                      </button>
                      <button type="button" class="btn-nalar-secondary" style="font-size: 12px; padding: 6px 16px;" onclick="App.switchTab('cash-advance')">
                        + Ajukan Kasbon
                      </button>
                    </div>
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: 16px;">
                    ${filteredProcItems.map(item => {
                      const isPR = item.type === 'PR';
                      const isCA = item.type === 'CA';
                      const isCuti = item.type === 'CUTI';
                      const lastHistory = (Array.isArray(item.approvalHistory) && item.approvalHistory.length > 0)
                        ? item.approvalHistory[item.approvalHistory.length - 1]
                        : null;

                      // Define Stages for PR
                      const prSteps = [
                        { name: '1. Diajukan', status: 'done', label: 'Pemohon' },
                        { 
                          name: '2. Verifikasi Anggaran', 
                          status: item.status === 'APPROVED' || ['FINANCE_VERIFICATION', 'DIRECTOR_APPROVAL', 'APPROVED', 'PO_ISSUED'].includes(item.stage) ? (item.stage === 'FINANCE_VERIFICATION' && item.status === 'PENDING' ? 'current' : 'done') : 'pending',
                          label: 'Staff FAT / Manager'
                        },
                        { 
                          name: '3. Approval Direksi', 
                          status: item.status === 'APPROVED' || item.stage === 'APPROVED' ? 'done' : (item.stage === 'DIRECTOR_APPROVAL' ? 'current' : 'pending'),
                          label: 'Direktur Ops/Keu'
                        },
                        { 
                          name: '4. Terbit PO & Selesai', 
                          status: item.status === 'APPROVED' ? 'done' : (item.status === 'REJECTED' ? 'rejected' : 'pending'),
                          label: 'Procurement / FAT'
                        }
                      ];

                      // Define Stages for Cash Advance
                      const caSteps = [
                        { name: '1. Diajukan', status: 'done', label: 'Pemohon' },
                        { 
                          name: '2. Approval Direksi', 
                          status: ['DIRECTOR_APPROVAL', 'FAT_DISBURSEMENT', 'DISBURSED', 'SETTLEMENT_SUBMITTED', 'SETTLED'].includes(item.stage) || ['DISBURSED', 'SETTLED'].includes(item.status) ? (item.stage === 'DIRECTOR_APPROVAL' ? 'current' : 'done') : 'pending',
                          label: 'Direktur Keuangan'
                        },
                        { 
                          name: '3. Pencairan Dana', 
                          status: ['DISBURSED', 'SETTLEMENT_SUBMITTED', 'SETTLED'].includes(item.stage) || ['DISBURSED', 'SETTLED'].includes(item.status) ? (item.stage === 'FAT_DISBURSEMENT' ? 'current' : 'done') : 'pending',
                          label: 'FAT Officer'
                        },
                        { 
                          name: '4. Pelaporan LPJ', 
                          status: ['SETTLEMENT_SUBMITTED', 'SETTLED'].includes(item.stage) || item.status === 'SETTLED' ? (item.stage === 'SETTLEMENT_SUBMITTED' ? 'current' : 'done') : (item.status === 'DISBURSED' ? 'current' : 'pending'),
                          label: 'Upload Nota & Bukti'
                        },
                        { 
                          name: '5. Selesai (Settled)', 
                          status: item.status === 'SETTLED' ? 'done' : (item.status === 'REJECTED' ? 'rejected' : 'pending'),
                          label: 'Kasbon Ditutup'
                        }
                      ];

                      // Define Stages for Cuti
                      const cutiSteps = [
                        { name: '1. Pengajuan Dikirim', status: 'done', label: 'Pemohon' },
                        { 
                          name: '2. Persetujuan Human Capital & Atasan', 
                          status: item.status === 'APPROVED' ? 'done' : (item.status === 'REJECTED' ? 'rejected' : 'current'),
                          label: 'Human Capital'
                        }
                      ];

                      const steps = isPR ? prSteps : isCA ? caSteps : cutiSteps;

                      return `
                        <div style="background: rgba(14, 18, 28, 0.95); border: 1px solid ${item.status === 'APPROVED' || item.status === 'SETTLED' ? 'rgba(52, 211, 153, 0.35)' : item.status === 'DISBURSED' ? 'rgba(59, 130, 246, 0.35)' : item.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}; border-radius: var(--radius-md); padding: 18px 22px; box-shadow: 0 4px 18px rgba(0,0,0,0.35);">
                          
                          <!-- Top Card Info -->
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 14px; flex-wrap: wrap;">
                            <div>
                              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span class="text-mono-badge" style="color: ${isPR ? '#FCD34D' : isCA ? '#34D399' : '#A78BFA'}; background: ${isPR ? 'rgba(245,158,11,0.15)' : isCA ? 'rgba(52,211,153,0.15)' : 'rgba(139,92,246,0.15)'}; padding: 2px 8px; border-radius: 4px; font-size: 10.5px; font-weight: 700;">
                                  ${isPR ? '🛒 PURCHASE REQUEST (PR)' : isCA ? '💰 CASH ADVANCE (KASBON)' : '🌴 PERMOHONAN CUTI'}
                                </span>
                                <span class="text-mono-badge" style="color: #60A5FA; font-size: 11px;">${item.id}</span>
                                <span style="font-size: 11.5px; color: var(--text-dim); font-family: var(--font-mono);">
                                  📅 ${item.date}
                                </span>
                              </div>

                              <h4 style="font-size: 16px; font-weight: 700; color: #fff; margin-top: 6px; margin-bottom: 2px;">
                                ${item.title}
                              </h4>
                              <p style="font-size: 12px; color: var(--text-secondary); margin: 0;">
                                ${item.subtitle}
                              </p>
                            </div>

                            <div style="text-align: right; min-width: 140px;">
                              ${item.nominal !== null ? `
                                <div style="font-size: 11px; color: var(--text-muted);">Total Anggaran:</div>
                                <div style="font-size: 16.5px; font-weight: 700; color: ${isPR ? '#FCD34D' : '#34D399'}; font-family: var(--font-mono);">
                                  Rp ${Number(item.nominal).toLocaleString('id-ID')}
                                </div>
                              ` : ''}
                              <div style="margin-top: 4px;">
                                <span class="badge-status ${item.status === 'APPROVED' || item.status === 'SETTLED' ? 'badge-approved' : item.status === 'DISBURSED' ? 'badge-disbursed' : item.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}" style="font-size: 11px; font-weight: 600; padding: 4px 10px;">
                                  ${item.status === 'APPROVED' ? '✓ Disetujui (PO Terbit)' : item.status === 'SETTLED' ? '✓ Selesai (Kasbon Settled)' : item.status === 'DISBURSED' ? '🔵 Dana Cair (Menunggu LPJ)' : item.status === 'REJECTED' ? '✕ Ditolak' : '⏳ Dalam Proses Approval'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <!-- Visual Stepper Progress Bar -->
                          <div style="margin: 18px 0 14px 0; padding: 0 10px;">
                            <div style="display: flex; justify-content: space-between; position: relative;">
                              <!-- Connecting Line -->
                              <div style="position: absolute; top: 14px; left: 20px; right: 20px; height: 2px; background: rgba(255,255,255,0.08); z-index: 1;"></div>
                              
                              ${steps.map((st, sIdx) => {
                                const isDone = st.status === 'done';
                                const isCurrent = st.status === 'current';
                                const isRejected = st.status === 'rejected';

                                return `
                                  <div style="display: flex; flex-direction: column; align-items: center; position: relative; z-index: 2; flex: 1; text-align: center;">
                                    <div style="width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-bottom: 6px; 
                                      background: ${isDone ? '#10B981' : isCurrent ? '#F59E0B' : isRejected ? '#EF4444' : 'rgba(255,255,255,0.08)'}; 
                                      color: ${isDone || isRejected ? '#fff' : isCurrent ? '#000' : 'var(--text-muted)'}; 
                                      border: 2px solid ${isDone ? '#34D399' : isCurrent ? '#FCD34D' : isRejected ? '#F87171' : 'rgba(255,255,255,0.15)'};
                                      box-shadow: ${isDone ? '0 0 12px rgba(16,185,129,0.4)' : isCurrent ? '0 0 14px rgba(245,158,11,0.5)' : 'none'};">
                                      ${isDone ? '✓' : isCurrent ? '⏳' : isRejected ? '✕' : (sIdx + 1)}
                                    </div>
                                    <div style="font-size: 11px; font-weight: 600; color: ${isDone ? '#34D399' : isCurrent ? '#FCD34D' : isRejected ? '#F87171' : 'var(--text-muted)'}; line-height: 1.3;">
                                      ${st.name}
                                    </div>
                                    <div style="font-size: 9.5px; color: var(--text-dim); margin-top: 2px;">
                                      ${st.label}
                                    </div>
                                  </div>
                                `;
                              }).join('')}
                            </div>
                          </div>

                          <!-- Footer / Last Action Trail & Quick Button -->
                          <div style="margin-top: 14px; padding-top: 10px; border-top: 1px dashed rgba(255,255,255,0.08); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                            <div style="font-size: 11.5px; color: var(--text-secondary); flex: 1; min-width: 240px;">
                              ${lastHistory ? `
                                <span style="color: #60A5FA; font-weight: 600;">Status Terakhir:</span> 
                                "${lastHistory.notes || lastHistory.action}" 
                                <span style="color: var(--text-dim); font-size: 10.5px; font-family: var(--font-mono);">
                                  (${lastHistory.actorName || lastHistory.actorRole} · ${lastHistory.timestamp || ''})
                                </span>
                              ` : `
                                <span style="color: var(--text-muted);">Sedang menunggu antrean review persetujuan.</span>
                              `}
                            </div>

                            <div>
                              ${isPR ? `
                                <div style="display: flex; gap: 8px; align-items: center;">
                                  <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: #F87171; border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.06);" onclick="PengajuanBarangModule.confirmDeletePR('${item.id}', '${(item.title || 'Barang').replace(/'/g, "\\'")}')">
                                    🗑️ Hapus PR
                                  </button>
                                  <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: #FCD34D; border-color: rgba(245,158,11,0.35);" onclick="App.switchTab('pengajuan')">
                                    Lihat di Pengajuan Barang →
                                  </button>
                                </div>
                              ` : isCA ? `
                                <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: #34D399; border-color: rgba(52,211,153,0.35);" onclick="App.switchTab('cash-advance')">
                                  Lihat di Cash Advance →
                                </button>
                              ` : `
                                <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: #A78BFA; border-color: rgba(167,139,250,0.35);" onclick="App.switchTab('cuti')">
                                  Lihat di Modul Cuti →
                                </button>
                              `}
                            </div>
                          </div>

                        </div>
                      `;
                    }).join('')}
                  </div>
                `}

              </div>
            </div>
          `;
        })()}
      </div>
    `;

    // Initialize the animated sine/neural wave on canvas
    this.initWaveAnimation();
  },

  initWaveAnimation: function() {
    const canvas = document.getElementById('hero-neural-wave-canvas');
    if (!canvas) return;

    if (DashboardModule.waveAnimationId) {
      cancelAnimationFrame(DashboardModule.waveAnimationId);
      DashboardModule.waveAnimationId = null;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = (canvas.width = canvas.parentElement.offsetWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement.offsetHeight || 320);

    const onResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.offsetWidth;
      height = canvas.height = canvas.parentElement.offsetHeight;
    };
    window.addEventListener('resize', onResize);

    let step = 0;
    const waves = [
      { color: 'rgba(255, 75, 1, 0.45)', frequency: 0.008, speed: 0.02, amplitude: 35, offset: 0, lineWidth: 2 },
      { color: 'rgba(139, 92, 246, 0.35)', frequency: 0.012, speed: 0.015, amplitude: 28, offset: Math.PI / 3, lineWidth: 1.5 },
      { color: 'rgba(59, 130, 246, 0.30)', frequency: 0.006, speed: 0.025, amplitude: 40, offset: Math.PI / 2, lineWidth: 1.5 },
      { color: 'rgba(245, 158, 11, 0.25)', frequency: 0.015, speed: 0.018, amplitude: 22, offset: Math.PI, lineWidth: 1 }
    ];

    // Neural particles along the waves
    const particles = Array.from({ length: 16 }, () => ({
      xRatio: Math.random(),
      waveIndex: Math.floor(Math.random() * waves.length),
      radius: Math.random() * 2.5 + 1.5,
      speed: Math.random() * 0.0015 + 0.0008
    }));

    const renderFrame = () => {
      // Check if canvas is still attached in DOM
      if (!document.body.contains(canvas) || !ctx) {
        if (DashboardModule.waveAnimationId) {
          cancelAnimationFrame(DashboardModule.waveAnimationId);
          DashboardModule.waveAnimationId = null;
        }
        return;
      }

      ctx.clearRect(0, 0, width, height);
      step += 1;

      const midY = height * 0.55;

      // Draw flowing sine waves
      waves.forEach((w) => {
        ctx.beginPath();
        ctx.strokeStyle = w.color;
        ctx.lineWidth = w.lineWidth;

        for (let x = 0; x <= width; x += 4) {
          // Harmonic wave equation with taper at sides
          const taper = Math.sin((x / width) * Math.PI);
          const y = midY + Math.sin(x * w.frequency + step * w.speed + w.offset) * w.amplitude * taper;
          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });

      // Draw flowing neural particles with subtle glowing connection lines
      particles.forEach((p) => {
        p.xRatio += p.speed;
        if (p.xRatio > 1) p.xRatio = 0;

        const currentX = p.xRatio * width;
        const w = waves[p.waveIndex];
        const taper = Math.sin(p.xRatio * Math.PI);
        const currentY = midY + Math.sin(currentX * w.frequency + step * w.speed + w.offset) * w.amplitude * taper;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(currentX, currentY, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = w.color;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      DashboardModule.waveAnimationId = requestAnimationFrame(renderFrame);
    };

    DashboardModule.waveAnimationId = requestAnimationFrame(renderFrame);
  },

  scrollDocSlider: function(direction) {
    const slider = document.getElementById('doc-horizontal-slider');
    if (!slider) return;
    const scrollAmount = 370;
    if (direction === 'left') {
      slider.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      slider.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  },

  openDocPreview: function(docId, title, fileType, description) {
    alert(`📄 [PANDUAN & SOSIALISASI YAYASAN]\n\nJudul File: ${title}\nFormat: ${fileType}\n\nRingkasan / Abstrak:\n${description}\n\n*Dokumen sah & terverifikasi oleh Divisi Human Capital.`);
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
        `ERP MMS - DOKUMEN RESMI PANDUAN & SOSIALISASI YAYASAN\n` +
        `=======================================================\n\n` +
        `Judul Dokumen : ${doc.title}\n` +
        `Format        : ${doc.fileType}\n` +
        `Kategori      : ${doc.category}\n` +
        `Target Role   : ${doc.targetLabel}\n` +
        `Diterbitkan   : ${doc.uploadDate} oleh ${doc.uploadedBy}\n\n` +
        `RINGKASAN & INSTRUKSI:\n` +
        `${doc.description}\n\n` +
        `=======================================================\n` +
        `Dokumen ini diterbitkan resmi oleh Human Capital ERP MMS.\n` +
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

  // =========================================================================
  // METODE MONITORING & TINDAK LANJUT KENDALA LAPANGAN (MANAGER AREA)
  // =========================================================================
  issueFilter: 'ALL',
  currentRespondingIssueId: null,
  currentRespondingPointId: null,

  setIssueFilter: function(filter) {
    this.issueFilter = filter;
    this.render(document.getElementById('main-content-area'));
  },

  setPointStatus: function(issueId, pointId, status) {
    const issue = DB.getFieldIssueById(issueId);
    if (!issue) return;

    DB.updateIssuePointStatus(issueId, pointId, status);
    
    const statusLabel = status === 'SUDAH_SELESAI' 
      ? '✓ Butir kendala ditandai Selesai!' 
      : status === 'SUDAH_DIRESPON' 
      ? '👁️ Butir kendala ditandai Sudah Direspon!' 
      : 'Status butir kendala diperbarui!';
      
    App.showToast(statusLabel, 'success');
    this.render(document.getElementById('main-content-area'));
  },

  openRespondPointModal: function(issueId, pointId) {
    const issue = DB.getFieldIssueById(issueId);
    if (!issue) return;

    const point = issue.points.find(p => p.id === pointId || (typeof p === 'object' && p.id === pointId));
    if (!point) return;

    this.currentRespondingIssueId = issueId;
    this.currentRespondingPointId = pointId;

    let modalEl = document.getElementById('modal-manager-point-response');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-manager-point-response';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const currentText = typeof point === 'object' ? point.text : point;
    const currentResponse = typeof point === 'object' ? (point.response || '') : '';
    const currentStatus = typeof point === 'object' ? (point.status || 'BELUM_DIRESPON') : 'BELUM_DIRESPON';

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 660px; width: 95%;">
        <div class="modal-header" style="padding: 22px 28px; border-bottom: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.35); display: flex; align-items: center; justify-content: center; font-size: 20px; color: #60A5FA; flex-shrink: 0;">
              💬
            </div>
            <div>
              <h3 class="modal-title" style="font-size: 18px; font-weight: 600; color: #fff;">Tanggapan & Arahan Manager Area</h3>
              <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                Tindak lanjut untuk butir kendala di <strong style="color: #FCD34D;">${issue.kitchenName}</strong> (${issue.id})
              </p>
            </div>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-manager-point-response')" style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="DashboardModule.submitPointResponse(event)">
          <div class="modal-body" style="padding: 24px 28px; max-height: calc(100vh - 270px); overflow-y: auto;">
            
            <!-- Butir Kendala Lapangan -->
            <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 18px;">
              <div style="font-size: 11px; color: #FCD34D; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                📋 Butir Kendala yang Dilaporkan Perwakilan:
              </div>
              <p style="font-size: 13px; color: #fff; line-height: 1.5; margin: 0;">
                "${currentText}"
              </p>
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 8px; font-family: var(--font-mono);">
                Pelapor: ${issue.authorName} (${issue.authorRole}) · ${issue.date}
              </div>
            </div>

            <!-- Pilihan Status Target -->
            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label" style="font-size: 12px; color: #fff; margin-bottom: 6px;">
                Update Status Menjadi <span style="color: #F87171;">*</span>
              </label>
              <select id="point-target-status" class="form-control" style="font-size: 13px;">
                <option value="SUDAH_DITANGGAPI" ${currentStatus !== 'SUDAH_SELESAI' ? 'selected' : ''}>💬 Sudah Ditanggapi (Sedang Dijalankan / Koordinasi)</option>
                <option value="SUDAH_SELESAI" ${currentStatus === 'SUDAH_SELESAI' ? 'selected' : ''}>✓ Sudah Selesai (Masalah Selesai Dituntaskan)</option>
              </select>
            </div>

            <!-- Input Arahan & Solusi -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px; color: #fff; margin-bottom: 8px;">
                Instruksi Solusi / Tanggapan Nyata Manager Area <span style="color: #F87171;">*</span>
              </label>
              <textarea id="point-response-text" class="form-control" rows="4" placeholder="Contoh: Telah dikoordinasikan dengan vendor pasar lokal untuk penambahan kuota sayur. Disetujui pembelian sparepart via kas dapur..." style="padding: 12px 14px; font-size: 13px; line-height: 1.6;" required>${currentResponse}</textarea>
            </div>

          </div>

          <div class="modal-footer" style="padding: 18px 28px; background: rgba(13,13,16,0.85); border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-manager-point-response')" style="padding: 9px 20px; font-size: 13px;">
              Batal
            </button>
            <button type="submit" class="btn-nalar-primary" style="padding: 9px 24px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,0.3);">
              Simpan Tanggapan & Perbarui Status
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-manager-point-response');
  },

  submitPointResponse: function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const issueId = this.currentRespondingIssueId;
    const pointId = this.currentRespondingPointId;
    if (!issueId || !pointId) return;

    const responseText = document.getElementById('point-response-text')?.value || '';
    const targetStatus = document.getElementById('point-target-status')?.value || 'SUDAH_DITANGGAPI';

    if (!responseText.trim()) {
      App.showToast('Mohon tuliskan instruksi atau arahan solusi!', 'warn');
      return;
    }

    DB.updateIssuePointStatus(issueId, pointId, targetStatus, responseText.trim());
    App.closeModal('modal-manager-point-response');
    App.showToast('✓ Tanggapan berhasil disimpan & status butir kendala diperbarui!', 'success');
    this.render(document.getElementById('main-content-area'));
  }
};
