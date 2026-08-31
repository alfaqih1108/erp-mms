/**
 * ERP YAYASAN - Modul Manajemen Cuti & Izin Karyawan
 * Features:
 * 1. Riwayat Pengajuan Cuti & Izin Karyawan Khusus Milik User yang Sedang Login (Personalized)
 * 2. Visual Interactive Calendar Widget:
 *    - Kalender Bulanan Interaktif dengan Navigasi Bulan (◀ / ▶)
 *    - Highlight Tanggal Cuti yang Sudah Disetujui (Approved) & Pending
 *    - Informasi Lengkap Tanggal Merah & Hari Libur Nasional Indonesia
 *    - Klik Tanggal Interaktif untuk Melihat Detail Agenda Cuti / Libur
 * 3. Mekanisme Cuti Adaptif Berdasarkan Masa Kerja (Personal Leave < 1 th vs Annual Leave >= 1 th)
 * 4. Dukungan Cuti Setengah Hari (0.5 Hari) & Izin Khusus Upah Penuh (Pasal 14-16)
 */

window.CutiModule = {
  currentAttachment: { url: null, name: null },
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  selectedDateStr: null,
  activeViewMode: 'PERSONAL',

  // Kamus Tanggal Merah & Libur Nasional Indonesia 2026
  holidays: {
    '2026-01-01': 'Tahun Baru 2026 Masehi',
    '2026-01-16': "Isra Mi'raj Nabi Muhammad SAW",
    '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
    '2026-03-20': 'Hari Suci Nyepi (Tahun Baru Saka 1948)',
    '2026-03-21': 'Hari Raya Idul Fitri 1447 H (Hari 1)',
    '2026-03-22': 'Hari Raya Idul Fitri 1447 H (Hari 2)',
    '2026-03-23': 'Cuti Bersama Hari Raya Idul Fitri 1447 H',
    '2026-04-03': 'Wafat Isa Almasih (Jumat Agung)',
    '2026-05-01': 'Hari Buruh Internasional',
    '2026-05-14': 'Kenaikan Isa Almasih',
    '2026-05-27': 'Hari Raya Idul Adha 1447 H',
    '2026-05-31': 'Hari Raya Waisak 2570 BE',
    '2026-06-01': 'Hari Lahir Pancasila',
    '2026-06-16': 'Tahun Baru Islam 1448 H',
    '2026-08-17': 'Hari Kemerdekaan Republik Indonesia ke-81',
    '2026-08-25': 'Maulid Nabi Muhammad SAW',
    '2026-12-25': 'Hari Raya Natal'
  },

  monthNames: [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ],

  render: function(container) {
    if (!container) return;

    const user = DB.getCurrentUser();
    const allLeaves = DB.getLeaves() || [];
    const isSenior = hasWorkedOneYear(user.joinDate);
    const tenureStr = calculateTenure(user.joinDate);

    // 1. Filter Riwayat Pengajuan
    const myLeaves = allLeaves.filter(l => l.employeeId === user.id || l.employeeName === user.name);
    const isLeadershipRole = ['SUPER_ADMIN', 'DIREKTUR_OPERASIONAL', 'DIREKTUR_KEUANGAN', 'HUMAN_CAPITAL', 'MANAGER_AREA', 'MANAGER_KEUANGAN'].includes(user.role);
    const displayLeaves = (this.activeViewMode === 'ALL' && isLeadershipRole) ? allLeaves : myLeaves;

    // Quota Calculations
    const personalQuota = user.quotaPersonalLeave || 3;
    const personalRemaining = user.remainingPersonalLeave !== undefined ? user.remainingPersonalLeave : 3;
    const personalUsed = personalQuota - personalRemaining;
    const personalPercent = Math.round((personalUsed / personalQuota) * 100);

    const annualQuota = user.quotaAnnualLeave || 12;
    const annualRemaining = user.remainingAnnualLeave !== undefined ? user.remainingAnnualLeave : 12;
    const annualUsed = annualQuota - annualRemaining;
    const annualPercent = Math.round((annualUsed / annualQuota) * 100);

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Header Actions -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-mono-badge" style="color: #A78BFA; background: rgba(139, 92, 246, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                Kepatuhan Ketenagakerjaan & HRIS
              </span>
              <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                ● Akun Aktif: <strong style="color: #fff;">${user.name}</strong> (${user.roleLabel})
              </span>
            </div>
            <h1 style="font-size: 26px; font-weight: 700; margin-top: 4px;">Manajemen Cuti & Izin Karyawan</h1>
          </div>
          <button class="btn-nalar-primary" onclick="CutiModule.openLeaveModal()">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + Buat Pengajuan Cuti / Izin Baru
          </button>
        </div>

        <!-- 2 KPI HUD Cards: Hak Kuota Cuti Karyawan -->
        <div class="kpi-stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); margin-bottom: 24px;">
          
          ${!isSenior ? `
            <!-- KARYAWAN < 1 TAHUN: HANYA CUTI PRIBADI (PERSONAL LEAVE KUARTALAN) -->
            <div class="kpi-chip hud-corner-box">
              <div class="kpi-chip-header">
                <span class="kpi-chip-title">Cuti Pribadi (Personal Leave)</span>
                <span style="font-size: 10px; color: #F59E0B; font-weight: 600;">MASA KERJA &lt; 1 TAHUN (${tenureStr})</span>
              </div>
              <div class="kpi-chip-value" style="color: #FCD34D; font-weight: 700;">
                ${personalRemaining} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">/ ${personalQuota} Hari (Q3)</span>
              </div>
              
              <div style="background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden; margin: 10px 0 6px 0;">
                <div style="background: linear-gradient(90deg, #F59E0B, #FCD34D); width: ${personalPercent}%; height: 100%; border-radius: 3px;"></div>
              </div>

              <div class="kpi-chip-footer" style="color: #FCD34D;">
                <span class="stat-trend-warn">● 1 Hari/bln kuartalan · Wajib habis di Q3 (Hangus di akhir kuartal)</span>
              </div>
            </div>
          ` : `
            <!-- KARYAWAN >= 1 TAHUN: HANYA CUTI TAHUNAN (ANNUAL LEAVE) -->
            <div class="kpi-chip hud-corner-box">
              <div class="kpi-chip-header">
                <span class="kpi-chip-title">Cuti Tahunan (Annual Leave)</span>
                <span style="font-size: 10px; color: #8B5CF6; font-weight: 600;">MASA KERJA ≥ 1 TAHUN (${tenureStr})</span>
              </div>
              <div class="kpi-chip-value" style="color: #A78BFA; font-weight: 700;">
                ${annualRemaining} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">/ ${annualQuota} Hari (2026)</span>
              </div>

              <div style="background: rgba(255,255,255,0.08); height: 6px; border-radius: 3px; overflow: hidden; margin: 10px 0 6px 0;">
                <div style="background: linear-gradient(90deg, #8B5CF6, #A78BFA); width: ${annualPercent}%; height: 100%; border-radius: 3px;"></div>
              </div>

              <div class="kpi-chip-footer">
                <span class="stat-trend-up">● Hak Cuti Normatif Penuh · Carry over maks. 4 hari</span>
              </div>
            </div>
          `}

          <!-- Card 2: Ringkasan Pengajuan Cuti User -->
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Status Pengajuan Anda</span>
              <span style="font-size: 10px; color: #34D399; font-weight: 600;">PORTAL MANDIRI</span>
            </div>
            <div class="kpi-chip-value" style="color: #6EE7B7; font-weight: 700;">
              ${myLeaves.filter(l => l.status === 'APPROVED').length} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">Disetujui</span>
              ${myLeaves.filter(l => l.status === 'PENDING').length > 0 ? `
                <span style="font-size: 13px; color: #FCD34D; font-weight: 600; margin-left: 8px;">(${myLeaves.filter(l => l.status === 'PENDING').length} Menunggu)</span>
              ` : ''}
            </div>
            <div class="kpi-chip-footer" style="margin-top: 14px;">
              <span class="stat-trend-up">●</span> Terverifikasi di Kalender & Sistem HC
            </div>
          </div>

        </div>

        <!-- Visual Interactive Calendar Widget -->
        <div class="cuti-calendar-card nalar-card">
          
          <!-- Calendar Header & Navigation Controls -->
          <div class="cal-header-row">
            <div class="cal-header-title-box">
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span class="text-mono-badge" style="color: #A78BFA; background: rgba(139, 92, 246, 0.18);">
                  Interactive Calendar
                </span>
                <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                  (Cuti Disetujui & Tanggal Merah)
                </span>
              </div>
              <h3 style="font-size: 17px; margin-top: 3px; font-weight: 700; color: #FFFFFF;">Kalender Cuti Karyawan & Hari Libur</h3>
            </div>

            <!-- Month Navigator -->
            <div class="cal-nav-toolbar">
              <button type="button" class="btn-nalar-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="CutiModule.prevMonth()" title="Bulan Sebelumnya">
                ◀
              </button>
              
              <div class="cal-month-title">
                ${this.monthNames[this.calendarMonth]} ${this.calendarYear}
              </div>

              <button type="button" class="btn-nalar-secondary" style="padding: 5px 10px; font-size: 12px;" onclick="CutiModule.nextMonth()" title="Bulan Berikutnya">
                ▶
              </button>

              <button type="button" class="btn-nalar-secondary" style="padding: 5px 10px; font-size: 11px; color: #60A5FA; border-color: rgba(96,165,250,0.4);" onclick="CutiModule.setToday()" title="Kembali ke Hari Ini">
                Hari Ini
              </button>
            </div>
          </div>

          <!-- Calendar Grid Content -->
          <div id="cuti-calendar-grid-container" style="width: 100%; overflow-x: hidden;">
            ${this.renderCalendarGrid(user, myLeaves)}
          </div>

          <!-- Legend Bar -->
          <div class="cal-legend-bar" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--border-subtle); font-size: 11.5px;">
            <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #10B981; display: inline-block;"></span>
                <span style="color: #6EE7B7; font-weight: 500;">Cuti Disetujui</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #F59E0B; display: inline-block;"></span>
                <span style="color: #FDE68A; font-weight: 500;">Menunggu Approval</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #EF4444; display: inline-block;"></span>
                <span style="color: #FCA5A5; font-weight: 500;">Libur Nasional / Tanggal Merah</span>
              </div>
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #3B82F6; display: inline-block;"></span>
                <span style="color: #93C5FD; font-weight: 500;">Hari Ini</span>
              </div>
            </div>
            <div style="color: var(--text-muted); font-style: italic; font-size: 10.5px;">
              *Klik tanggal untuk melihat detail rincian atau mengajukan cuti.
            </div>
          </div>

        </div>

        <!-- Tabel Riwayat Pengajuan Cuti & Izin Karyawan -->
        <div class="nalar-card" style="margin-bottom: 28px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div>
              <span class="text-mono-badge" style="color: var(--text-muted);">${(this.activeViewMode === 'ALL' && isLeadershipRole) ? 'Organization-Wide Leaves' : 'Personal Tracking & History'}</span>
              <h3 style="font-size: 18px; margin-top: 2px;">${(this.activeViewMode === 'ALL' && isLeadershipRole) ? 'Seluruh Pengajuan Cuti Karyawan Organisasi' : 'Riwayat Pengajuan Cuti & Izin Anda'}</h3>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              ${isLeadershipRole ? `
                <div style="display: inline-flex; background: rgba(0,0,0,0.4); padding: 3px; border-radius: 8px; border: 1px solid var(--border-card);">
                  <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; ${this.activeViewMode !== 'ALL' ? 'background: rgba(139,92,246,0.25); color: #fff; border-color: rgba(139,92,246,0.5);' : 'border-color: transparent;'}" onclick="CutiModule.setViewMode('PERSONAL')">
                    👤 Cuti Saya (${myLeaves.length})
                  </button>
                  <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; ${this.activeViewMode === 'ALL' ? 'background: rgba(139,92,246,0.25); color: #fff; border-color: rgba(139,92,246,0.5);' : 'border-color: transparent;'}" onclick="CutiModule.setViewMode('ALL')">
                    🏢 Semua Karyawan (${allLeaves.length})
                  </button>
                </div>
              ` : ''}
              
              <div style="font-size: 12px; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
                Menampilkan <strong style="color: #fff;">${displayLeaves.length}</strong> permohonan
              </div>
            </div>
          </div>

          <div class="nalar-table-container">
            <table class="nalar-table">
              <thead>
                <tr>
                  <th style="width: 130px;">ID Permohonan</th>
                  <th style="width: 180px;">Nama Pemohon</th>
                  <th>Tipe Permohonan & Keterangan</th>
                  <th style="width: 170px;">Periode & Durasi</th>
                  <th style="width: 150px;">Pengurangan Saldo</th>
                  <th style="width: 140px; text-align: center;">Status & Tahap</th>
                  <th style="width: 110px; text-align: center;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${displayLeaves.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 36px;">
                      ${(this.activeViewMode === 'PERSONAL' && isLeadershipRole) 
                        ? `Belum ada permohonan cuti yang diajukan atas nama akun Anda sendiri (${user.name}). Pengajuan dari staf (seperti Sakhiyah Karomah Salam) dapat Anda tinjau di menu <strong>Approval Hub</strong> atau klik tombol <em>"Semua Karyawan"</em> di atas.` 
                        : 'Belum ada riwayat permohonan cuti atau izin yang tercatat.'}
                    </td>
                  </tr>
                ` : displayLeaves.map(l => `
                  <tr style="cursor: pointer; transition: background 0.15s ease;" 
                      onclick="App.showApprovalTracker('leave', '${l.id}')"
                      onmouseenter="this.style.background='rgba(139, 92, 246, 0.06)'"
                      onmouseleave="this.style.background='transparent'">
                    <td style="color: var(--brand-orange); font-weight: 600;">${l.id}</td>
                    <td>
                      <div style="font-weight: 600; color: #fff;">${l.employeeName}</div>
                      <div style="font-size: 11px; color: var(--text-muted);">${l.department || (user ? user.department : 'Yayasan MMS')}</div>
                    </td>
                    <td>
                      <div style="font-weight: 600; color: #fff; font-size: 13px;">${l.type || l.leaveType || 'Cuti Tahunan'}</div>
                      <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                        ${l.isHalfDay ? '<span style="color: #FCD34D; font-weight: 600;">⚡ 0.5 Hari (Setengah Hari)</span> · ' : ''}
                        ${l.reason}
                      </div>
                      ${l.attachmentName ? `
                        <div style="font-size: 11px; color: #34D399; margin-top: 2px;">
                          📎 ${l.attachmentName}
                        </div>
                      ` : ''}
                    </td>
                    <td>
                      <div style="font-size: 12px; color: #fff; font-weight: 500;">${l.startDate} s.d ${l.endDate}</div>
                      <div style="font-size: 11px; color: var(--brand-orange); font-weight: 600; margin-top: 2px;">
                        ${l.duration} Hari Kerja
                      </div>
                    </td>
                    <td>
                      ${l.quotaDeductionType === 'PERSONAL' ? `
                        <span class="badge-status badge-pending" style="font-size: 10px;">- ${l.duration} Hari Pribadi (Q3)</span>
                      ` : l.quotaDeductionType === 'ANNUAL' ? `
                        <span class="badge-status badge-rejected" style="font-size: 10px;">- ${l.duration} Hari Tahunan</span>
                      ` : `
                        <span class="badge-status badge-approved" style="font-size: 10px;">0 Hari (Upah Penuh)</span>
                      `}
                    </td>
                    <td style="text-align: center;">
                      <span class="badge-status ${l.status === 'APPROVED' ? 'badge-approved' : l.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'}">
                        ${l.status === 'APPROVED' ? '🟢 Disetujui' : l.status === 'REJECTED' ? '🔴 Ditolak' : '🟡 Menunggu'}
                      </span>
                      <div style="font-size: 10px; color: var(--text-muted); margin-top: 4px; font-style: italic;">
                        ${l.approver || '-'}
                      </div>
                    </td>
                    <td style="text-align: center;">
                      <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap;">
                        <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: #A78BFA; border-color: rgba(139,92,246,0.4);" onclick="event.stopPropagation(); App.showApprovalTracker('leave', '${l.id}')">
                          🔍 Detail
                        </button>
                        ${((!Array.isArray(l.approvalHistory) || !l.approvalHistory.some(h => (h.level === 2 && h.action === 'APPROVED') || h.level >= 3)) && l.status !== 'APPROVED') ? `
                          <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: #F87171; border-color: rgba(248,113,113,0.4);" onclick="event.stopPropagation(); CutiModule.handleCancelLeave('${l.id}')" title="Batalkan & Hapus Permohonan Cuti">
                            🗑️ Batal
                          </button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Ketentuan Pengajuan Cuti & Izin Berdasarkan Peraturan Perusahaan -->
        <div class="nalar-card" style="margin-bottom: 28px; background: rgba(139, 92, 246, 0.04); border-color: rgba(139, 92, 246, 0.25); padding: 22px 26px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px; border-bottom: 1px solid rgba(139, 92, 246, 0.2); padding-bottom: 12px;">
            <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(139, 92, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #A78BFA; font-size: 16px; flex-shrink: 0;">
              📋
            </div>
            <h3 style="font-size: 15.5px; font-weight: 600; color: #fff; margin: 0;">
              Ketentuan Pengajuan Cuti & Izin Berdasarkan Peraturan Perusahaan:
            </h3>
          </div>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            
            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 14px; border-left: 3px solid #F59E0B;">
              <div style="font-size: 13px; font-weight: 600; color: #FCD34D;">1. Mekanisme Cuti Berdasarkan Masa Kerja</div>
              <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.55;">
                Karyawan dengan masa kerja <strong>&lt; 1 tahun</strong> berlaku <em>Personal Leave</em> kuartalan (1 hari per bulan masa kerja, diakumulasi kuartalan, hangus di akhir kuartal). Karyawan dengan masa kerja <strong>≥ 1 tahun</strong> berlaku <em>Annual Leave</em> sebanyak 12 hari per tahun (hak normatif penuh dengan carry-over maksimal 4 hari).
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 14px; border-left: 3px solid #A78BFA;">
              <div style="font-size: 13px; font-weight: 600; color: #C4B5FD;">2. Batas Waktu Pengajuan Cuti (H-7)</div>
              <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.55;">
                Permohonan cuti tahunan maupun cuti pribadi wajib diajukan ke Atasan Langsung & Human Capital selambat-lambatnya <strong>1 minggu (7 hari kalender)</strong> sebelum tanggal pelaksanaan cuti.
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 14px; border-left: 3px solid #60A5FA;">
              <div style="font-size: 13px; font-weight: 600; color: #93C5FD;">3. Fleksibilitas Waktu Cuti (Opsi 0,5 Hari Kerja)</div>
              <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.55;">
                Pengambilan cuti dapat diajukan dalam satuan <strong>1 hari kerja penuh</strong> atau <strong>0,5 hari kerja (setengah hari)</strong> dengan batas maksimal 4 jam kerja efektif per hari.
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 14px; border-left: 3px solid #EC4899;">
              <div style="font-size: 13px; font-weight: 600; color: #F472B6;">4. Hak Istirahat Khusus Karyawan Perempuan (Upah Penuh)</div>
              <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.55;">
                Meliputi istirahat hari pertama haid (1 hari kerja), istirahat melahirkan (3 bulan / 90 hari kalender), dan istirahat keguguran kandungan (1,5 bulan / 45 hari kalender) dengan hak upah penuh tanpa memotong saldo cuti.
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 4px; padding-left: 14px; border-left: 3px solid #34D399;">
              <div style="font-size: 13px; font-weight: 600; color: #6EE7B7;">5. Izin Meninggalkan Pekerjaan dengan Upah Penuh (Izin Khusus)</div>
              <div style="font-size: 12px; color: var(--text-secondary); line-height: 1.55;">
                Pernikahan karyawan sendiri (3 hari), pernikahan anak kandung (2 hari), pengkhitanan/baptis/potong gigi anak (2 hari), istri sah melahirkan/keguguran (2 hari), duka keluarga inti meninggal dunia (2 hari), duka anggota keluarga serumah (1 hari), bencana alam (2 hari), serta ibadah keagamaan luar negeri (disesuaikan jadwal resmi).
              </div>
            </div>

          </div>
        </div>

      </div>

      <!-- Modal Pengajuan Cuti / Izin -->
      <div id="modal-cuti" class="modal-backdrop">
        <div class="modal-box" style="max-width: 650px;">
          <div class="modal-header">
            <h3 class="modal-title">Form Pengajuan Cuti & Izin Karyawan</h3>
            <button class="modal-close-btn" onclick="App.closeModal('modal-cuti')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form id="form-cuti" onsubmit="CutiModule.handleSubmit(event)">
            <div class="modal-body">
              
              <!-- Info Skema Cuti User Sesuai Masa Kerja -->
              <div style="background: rgba(139, 92, 246, 0.08); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 16px;">
                <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">SKEMA CUTI SESUAI MASA KERJA</div>
                <div style="font-size: 13px; font-weight: 600; color: #fff; margin-top: 2px;">
                  ${user.name} (${user.roleLabel}) · Masa Kerja: <span style="color: #FCD34D;">${tenureStr}</span>
                </div>
                <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 4px;">
                  ${isSenior ? `
                    ✅ Berhak atas <strong>Cuti Tahunan (12 Hari)</strong>. Saldo aktif: <span style="color: #A78BFA; font-weight: 700;">${annualRemaining} Hari</span>.
                  ` : `
                    ⚡ Masa kerja &lt; 1 tahun: Berhak atas <strong>Cuti Pribadi Kuartalan</strong> (1 hari/bln). Saldo Q3 aktif: <span style="color: #FCD34D; font-weight: 700;">${personalRemaining} Hari</span>.
                  `}
                </div>
              </div>

              <!-- Pilihan Tipe Cuti / Izin -->
              <div class="form-group">
                <label class="form-label">Jenis Permohonan <span style="color: #F87171;">*</span></label>
                <select id="leave-type-select" class="form-control" onchange="CutiModule.handleTypeChange()" required>
                  <option value="">-- Pilih Jenis Cuti / Izin --</option>
                  
                  ${!isSenior ? `
                    <optgroup label="⚡ Cuti Pribadi (Masa Kerja < 1 Tahun)">
                      <option value="CUTI_PRIBADI_FULL" data-pasal="PASAL_14" data-deduct="PERSONAL">Cuti Pribadi (1 Hari Penuh)</option>
                      <option value="CUTI_PRIBADI_HALF" data-pasal="PASAL_14" data-deduct="PERSONAL" data-half="true">Cuti Pribadi Setengah Hari (0.5 Hari / Maks. 4 Jam)</option>
                    </optgroup>
                  ` : `
                    <optgroup label="🏖️ Cuti Tahunan (Masa Kerja ≥ 1 Tahun)">
                      <option value="CUTI_TAHUNAN_FULL" data-pasal="PASAL_14" data-deduct="ANNUAL">Cuti Tahunan (1 Hari atau Lebih)</option>
                      <option value="CUTI_TAHUNAN_HALF" data-pasal="PASAL_14" data-deduct="ANNUAL" data-half="true">Cuti Tahunan Setengah Hari (0.5 Hari / Maks. 4 Jam)</option>
                    </optgroup>
                  `}

                  <optgroup label="🌸 Hak Istirahat Perempuan (Upah Penuh)">
                    <option value="HAID" data-pasal="PASAL_15" data-deduct="NONE">Istirahat Hari Pertama Haid (1 Hari Kerja)</option>
                    <option value="MELAHIRKAN" data-pasal="PASAL_15" data-deduct="NONE">Istirahat Melahirkan (3 Bulan / 90 Hari)</option>
                    <option value="KEGUGURAN" data-pasal="PASAL_15" data-deduct="NONE">Istirahat Gugur Kandungan (1.5 Bulan / 45 Hari)</option>
                  </optgroup>

                  <optgroup label="🤝 Izin Khusus Meninggalkan Pekerjaan (Upah Penuh)">
                    <option value="NIKAH_SENDIRI" data-pasal="PASAL_16" data-deduct="NONE">Pernikahan Karyawan Sendiri (3 Hari)</option>
                    <option value="NIKAH_ANAK" data-pasal="PASAL_16" data-deduct="NONE">Pernikahan Anak Kandung (2 Hari)</option>
                    <option value="KHITAN_BAPTIS" data-pasal="PASAL_16" data-deduct="NONE">Khitanan / Pembaptisan Anak (2 Hari)</option>
                    <option value="ISTRI_LAHIRAN" data-pasal="PASAL_16" data-deduct="NONE">Istri Sah Melahirkan / Keguguran (2 Hari)</option>
                    <option value="DUKA_INTI" data-pasal="PASAL_16" data-deduct="NONE">Duka Keluarga Inti (Suami/Istri/Orang Tua/Anak Meninggal - 2 Hari)</option>
                    <option value="DUKA_SERUMAH" data-pasal="PASAL_16" data-deduct="NONE">Duka Anggota Keluarga Serumah Meninggal (1 Hari)</option>
                    <option value="BENCANA" data-pasal="PASAL_16" data-deduct="NONE">Musibah Kebakaran / Bencana Alam (2 Hari)</option>
                    <option value="IBADAH_LUAR_NEGERI" data-pasal="PASAL_16" data-deduct="NONE">Ibadah Keagamaan Luar Negeri (Haji/Umrah/Ziarah Resmi)</option>
                  </optgroup>
                </select>
              </div>

              <!-- Date Picker Range -->
              <div class="form-row" id="leave-date-row" style="display: flex; gap: 12px;">
                <div class="form-group" id="leave-start-date-group" style="flex: 1;">
                  <label class="form-label" id="leave-start-date-label">Tanggal Mulai <span style="color: #F87171;">*</span></label>
                  <input type="date" id="leave-start-date" class="form-control" onchange="CutiModule.handleDateChange()" required>
                </div>
                <div class="form-group" id="leave-end-date-group" style="flex: 1;">
                  <label class="form-label" id="leave-end-date-label">Tanggal Selesai <span style="color: #F87171;">*</span></label>
                  <input type="date" id="leave-end-date" class="form-control" onchange="CutiModule.handleDateChange()" required>
                </div>
              </div>

              <div id="leave-calc-summary" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-card); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 16px; display: none;"></div>

              <div class="form-group">
                <label class="form-label">Alasan / Keperluan <span style="color: #F87171;">*</span></label>
                <textarea id="leave-reason" class="form-control" rows="2" placeholder="Tuliskan keterangan detail permohonan cuti / izin..." required></textarea>
              </div>

              <div class="form-group" id="leave-attachment-group">
                <label class="form-label" id="leave-attachment-label">Dokumen / Surat Keterangan Pendukung</label>
                <input type="file" id="leave-file-input" class="form-control" accept="image/*,.pdf,.doc,.docx" onchange="CutiModule.handleFileUpload(event)">
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                  *Wajib melampirkan surat dokter/surat rujukan untuk izin medis, atau undangan/dokumen pendukung.
                </div>
              </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-cuti')">Batal</button>
              <button type="submit" class="btn-nalar-primary">Kirim Permohonan Cuti</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Detail Tanggal Kalender -->
      <div id="modal-date-detail" class="modal-backdrop">
        <div class="modal-box" style="max-width: 500px;">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #A78BFA;">Agenda Tanggal</span>
              <h3 id="cal-modal-title" class="modal-title" style="margin-top: 2px;">Detail Tanggal</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-date-detail')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="cal-modal-body"></div>
          <div class="modal-footer" id="cal-modal-footer"></div>
        </div>
      </div>
    `;
  },

  // Helper Kalender: Bulan Sebelumnya
  prevMonth: function() {
    this.calendarMonth--;
    if (this.calendarMonth < 0) {
      this.calendarMonth = 11;
      this.calendarYear--;
    }
    this.updateCalendarView();
  },

  // Helper Kalender: Bulan Berikutnya
  nextMonth: function() {
    this.calendarMonth++;
    if (this.calendarMonth > 11) {
      this.calendarMonth = 0;
      this.calendarYear++;
    }
    this.updateCalendarView();
  },

  // Helper Kalender: Kembali ke Hari Ini Real-Time
  setToday: function() {
    const now = new Date();
    this.calendarYear = now.getFullYear();
    this.calendarMonth = now.getMonth();
    this.updateCalendarView();
  },

  updateCalendarView: function() {
    const user = DB.getCurrentUser();
    const allLeaves = DB.getLeaves() || [];
    const myLeaves = allLeaves.filter(l => l.employeeId === user.id || l.employeeName === user.name);
    
    const container = document.getElementById('cuti-calendar-grid-container');
    if (container) {
      container.innerHTML = this.renderCalendarGrid(user, myLeaves);
    }
    
    // Update header label
    const titleEl = document.querySelector('.cal-month-title');
    if (titleEl) {
      titleEl.textContent = `${this.monthNames[this.calendarMonth]} ${this.calendarYear}`;
    }
  },

  // Render Grid Kalender Lengkap
  renderCalendarGrid: function(user, myLeaves) {
    const year = this.calendarYear;
    const month = this.calendarMonth;

    // First day of month (convert Sunday=0 to Monday=0)
    const firstDay = new Date(year, month, 1);
    const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // 0=Senin, 6=Minggu

    // Days in current, previous and next months
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const dayHeaders = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'];

    let html = `
      <div class="cuti-calendar-grid">
        ${dayHeaders.map((dh, idx) => `
          <div class="cal-day-header ${idx >= 5 ? 'weekend' : ''}">
            ${dh}
          </div>
        `).join('')}
    `;

    // 1. Previous month overflow days
    for (let i = 0; i < startingDayOfWeek; i++) {
      const prevDateNum = daysInPrevMonth - startingDayOfWeek + i + 1;
      html += `
        <div class="cal-cell is-prev-next">
          <div class="cal-date-number" style="color: var(--text-dim); opacity: 0.5;">${prevDateNum}</div>
        </div>
      `;
    }

    // 2. Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayOfWeek = (new Date(year, month, d).getDay() + 6) % 7;
      const isWeekend = (dayOfWeek >= 5); // Sabtu (5) atau Minggu (6)
      const isToday = (dateStr === (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10)));

      // Check Holiday
      const holidayName = this.holidays[dateStr];
      const isHoliday = !!holidayName;

      // Check My Leaves on this date
      const activeLeaves = myLeaves.filter(l => {
        return (dateStr >= l.startDate && dateStr <= l.endDate);
      });

      const hasApprovedLeave = activeLeaves.some(l => l.status === 'APPROVED');
      const hasPendingLeave = activeLeaves.some(l => l.status === 'PENDING');
      const leaveObj = activeLeaves[0];

      let cellExtraClass = '';
      if (hasApprovedLeave) cellExtraClass += ' has-approved';
      if (hasPendingLeave) cellExtraClass += ' has-pending';
      if (isHoliday) cellExtraClass += ' has-holiday';
      if (isWeekend) cellExtraClass += ' is-weekend';
      if (isToday) cellExtraClass += ' is-today';

      html += `
        <div class="cal-cell ${cellExtraClass}" onclick="CutiModule.openDateDetail('${dateStr}')">
          
          <!-- Top: Date Number & Badges -->
          <div class="cal-cell-top">
            ${isToday ? `<span class="cal-today-badge">HARI INI</span>` : '<span></span>'}
            <div class="cal-date-number ${isHoliday || isWeekend ? 'is-holiday' : ''}">
              ${d}
            </div>
          </div>

          <!-- Bottom: Event Indicators -->
          <div class="cal-cell-bottom">
            ${hasApprovedLeave ? `
              <div class="cal-event-pill approved" title="${leaveObj ? leaveObj.type : 'Cuti Disetujui'}">
                🟢 ${leaveObj ? (leaveObj.isHalfDay ? '0.5 Cuti' : 'Cuti Approved') : 'Cuti Approved'}
              </div>
            ` : hasPendingLeave ? `
              <div class="cal-event-pill pending" title="${leaveObj ? leaveObj.type : 'Menunggu Approval'}">
                🟡 Menunggu
              </div>
            ` : isHoliday ? `
              <div class="cal-event-pill holiday" title="${holidayName}">
                🔴 ${holidayName.length > 12 ? holidayName.slice(0, 10) + '...' : holidayName}
              </div>
            ` : isWeekend ? `
              <div class="cal-status-text" style="color: var(--text-dim);">
                Libur
              </div>
            ` : `
              <div class="cal-status-text" style="color: var(--text-muted); opacity: 0.5;">
                Kerja
              </div>
            `}
          </div>

        </div>
      `;
    }

    // 3. Next month filler days to complete grid (up to 35 or 42 cells)
    const totalFilled = startingDayOfWeek + daysInMonth;
    const totalCells = totalFilled <= 35 ? 35 : 42;
    for (let j = 1; j <= (totalCells - totalFilled); j++) {
      html += `
        <div class="cal-cell is-prev-next">
          <div class="cal-date-number" style="color: var(--text-dim); opacity: 0.5;">${j}</div>
        </div>
      `;
    }

    html += `</div>`;
    return html;
  },

  // Modal Detail Tanggal saat di-klik
  openDateDetail: function(dateStr) {
    const user = DB.getCurrentUser();
    const allLeaves = DB.getLeaves() || [];
    const myLeaves = allLeaves.filter(l => l.employeeId === user.id || l.employeeName === user.name);

    const holidayName = this.holidays[dateStr];
    const userLeaves = myLeaves.filter(l => (dateStr >= l.startDate && dateStr <= l.endDate));
    
    const dObj = new Date(dateStr);
    const dayOfWeek = (dObj.getDay() + 6) % 7;
    const dayNameIndo = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'][dayOfWeek];
    const isWeekend = (dayOfWeek >= 5);

    const titleEl = document.getElementById('cal-modal-title');
    const bodyEl = document.getElementById('cal-modal-body');
    const footerEl = document.getElementById('cal-modal-footer');

    if (titleEl) titleEl.textContent = `${dayNameIndo}, ${dateStr.split('-').reverse().join('/')}`;
    
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Status Tanggal -->
          <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">STATUS TANGGAL</div>
            <div style="font-size: 15px; font-weight: 700; color: #fff; margin-top: 3px;">
              ${holidayName ? `
                <span style="color: #F87171;">🔴 Libur Nasional: ${holidayName}</span>
              ` : isWeekend ? `
                <span style="color: #FCA5A5;">☕ Akhir Pekan (${dayNameIndo})</span>
              ` : `
                <span style="color: #6EE7B7;">💼 Hari Kerja Efektif</span>
              `}
            </div>
          </div>

          <!-- Status Cuti User -->
          <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 16px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">JADWAL CUTI ANDA</div>
            ${userLeaves.length > 0 ? userLeaves.map(l => `
              <div style="margin-top: 6px; padding: 10px; border-radius: var(--radius-sm); background: ${l.status === 'APPROVED' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)'}; border: 1px solid ${l.status === 'APPROVED' ? 'rgba(52,211,153,0.3)' : 'rgba(245,158,11,0.3)'};">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: 700; color: #fff; font-size: 13px;">${l.type}</span>
                  <span class="badge-status ${l.status === 'APPROVED' ? 'badge-approved' : 'badge-pending'}">
                    ${l.status === 'APPROVED' ? '🟢 Disetujui' : '🟡 Menunggu'}
                  </span>
                </div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                  Alasan: ${l.reason}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
                  Durasi: ${l.duration} Hari (${l.startDate} s.d ${l.endDate})
                </div>
              </div>
            `).join('') : `
              <div style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px;">
                Tidak ada permohonan cuti aktif pada tanggal ini.
              </div>
            `}
          </div>

        </div>
      `;
    }

    if (footerEl) {
      footerEl.innerHTML = `
        <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-date-detail')">Tutup</button>
        <button type="button" class="btn-nalar-primary" onclick="App.closeModal('modal-date-detail'); CutiModule.openLeaveModalWithDate('${dateStr}')">
          + Ajukan Cuti Pada Tanggal Ini
        </button>
      `;
    }

    App.openModal('modal-date-detail');
  },

  openLeaveModalWithDate: function(dateStr) {
    this.openLeaveModal();
    const startInput = document.getElementById('leave-start-date');
    const endInput = document.getElementById('leave-end-date');
    if (startInput) startInput.value = dateStr;
    if (endInput) endInput.value = dateStr;
    this.calculateDuration();
  },

  openLeaveModal: function() {
    this.currentAttachment = { url: null, name: null };
    const form = document.getElementById('form-cuti');
    if (form) form.reset();

    const todayStr = (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10));
    const startInput = document.getElementById('leave-start-date');
    const endInput = document.getElementById('leave-end-date');
    if (startInput) startInput.value = todayStr;
    if (endInput) endInput.value = todayStr;

    // Reset visibilitas field tanggal
    const endGroup = document.getElementById('leave-end-date-group');
    const startLabel = document.getElementById('leave-start-date-label');
    if (endGroup) endGroup.style.display = 'block';
    if (startLabel) startLabel.innerHTML = 'Tanggal Mulai <span style="color: #F87171;">*</span>';

    this.handleTypeChange();
    this.calculateDuration();
    App.openModal('modal-cuti');
  },

  handleTypeChange: function() {
    const select = document.getElementById('leave-type-select');
    if (!select) return;
    const opt = select.selectedOptions[0];
    if (!opt) return;

    const isHalf = opt.getAttribute('data-half') === 'true';
    const endGroup = document.getElementById('leave-end-date-group');
    const startLabel = document.getElementById('leave-start-date-label');
    const startInput = document.getElementById('leave-start-date');
    const endInput = document.getElementById('leave-end-date');

    if (isHalf) {
      // Untuk cuti setengah hari: Sembunyikan tanggal selesai, cukup 1 input tanggal pelaksanaan
      if (endGroup) endGroup.style.display = 'none';
      if (startLabel) startLabel.innerHTML = 'Tanggal Cuti (Setengah Hari / 0.5 Hari) <span style="color: #F87171;">*</span>';
      if (startInput && endInput) {
        endInput.value = startInput.value;
      }
    } else {
      // Untuk cuti reguler: Tampilkan kembali rentang tanggal mulai & selesai
      if (endGroup) endGroup.style.display = 'block';
      if (startLabel) startLabel.innerHTML = 'Tanggal Mulai <span style="color: #F87171;">*</span>';
    }

    this.calculateDuration();
  },

  handleDateChange: function() {
    const select = document.getElementById('leave-type-select');
    const opt = select ? select.selectedOptions[0] : null;
    const isHalf = opt && opt.getAttribute('data-half') === 'true';

    const startInput = document.getElementById('leave-start-date');
    const endInput = document.getElementById('leave-end-date');

    if (isHalf && startInput && endInput) {
      endInput.value = startInput.value;
    }

    this.calculateDuration();
  },

  calculateDuration: function() {
    const startVal = document.getElementById('leave-start-date')?.value;
    const endVal = document.getElementById('leave-end-date')?.value;
    const select = document.getElementById('leave-type-select');
    const summaryEl = document.getElementById('leave-calc-summary');
    if (!summaryEl) return;

    if (!startVal || !select || !select.value) {
      summaryEl.style.display = 'none';
      return;
    }

    const opt = select.selectedOptions[0];
    const isHalf = opt.getAttribute('data-half') === 'true';
    const deductType = opt.getAttribute('data-deduct');
    const pasal = opt.getAttribute('data-pasal') || 'PASAL_14';

    let duration = 0;
    if (isHalf) {
      duration = 0.5;
    } else {
      if (!endVal) {
        summaryEl.style.display = 'none';
        return;
      }
      const d1 = new Date(startVal);
      const d2 = new Date(endVal);
      const diffTime = d2 - d1;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      duration = diffDays > 0 ? diffDays : 1;
    }

    summaryEl.style.display = 'block';
    summaryEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
        <span style="color: var(--text-secondary);">Estimasi Durasi Pengajuan:</span>
        <strong style="color: #FCD34D; font-size: 13px;">${duration} Hari Kerja</strong>
      </div>
      <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">
        Rujukan Regulasi: <strong style="color: #A78BFA;">${pasal.replace('_', ' ')}</strong> · Pengurangan Saldo: <strong style="color: #34D399;">${deductType === 'NONE' ? '0 Hari (Upah Penuh)' : deductType === 'PERSONAL' ? duration + ' Hari Pribadi' : duration + ' Hari Tahunan'}</strong>
      </div>
    `;
  },

  handleFileUpload: function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      this.currentAttachment = {
        url: ev.target.result,
        name: file.name
      };
      App.showToast(`Berkas "${file.name}" siap dilampirkan.`, 'info');
    };
    reader.readAsDataURL(file);
  },

  handleSubmit: function(e) {
    e.preventDefault();
    const user = DB.getCurrentUser();
    const select = document.getElementById('leave-type-select');
    const opt = select.selectedOptions[0];
    const startDate = document.getElementById('leave-start-date').value;
    let endDate = document.getElementById('leave-end-date').value;
    const reason = document.getElementById('leave-reason').value.trim();

    const isHalf = opt.getAttribute('data-half') === 'true';
    if (isHalf) {
      endDate = startDate;
    }

    if (!select.value || !startDate || !endDate || !reason) {
      App.showToast('Mohon lengkapi seluruh field formulir cuti!', 'warn');
      return;
    }

    const deductType = opt.getAttribute('data-deduct');
    const pasal = opt.getAttribute('data-pasal');

    let duration = 0;
    if (isHalf) {
      duration = 0.5;
    } else {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      const diffTime = d2 - d1;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      duration = diffDays > 0 ? diffDays : 1;
    }

    const newLeave = {
      employeeId: user.id,
      employeeName: user.name,
      role: user.role,
      department: user.department,
      pasal,
      type: opt.text,
      startDate,
      endDate,
      duration,
      isHalfDay: isHalf,
      quotaDeductionType: deductType,
      quotaDeducted: deductType === 'NONE' ? 0 : duration,
      reason,
      attachmentName: this.currentAttachment.name || null,
      attachmentUrl: this.currentAttachment.url || null
    };

    DB.addLeave(newLeave);
    App.closeModal('modal-cuti');
    App.showToast(`Permohonan cuti "${opt.text}" (${duration} Hari) berhasil diajukan!`, 'success');
    this.render(document.getElementById('main-content-area'));
  },

  handleCancelLeave: async function(leaveId) {
    const leave = (DB.getLeaves() || []).find(l => l.id === leaveId);
    if (!leave) return;

    if (confirm(`Apakah Anda yakin ingin membatalkan dan menghapus permohonan Cuti "${leave.type || leave.leaveType}" (${leave.id})?\n\nPengajuan ini akan dihapus secara permanen dari sistem & database cloud Supabase.`)) {
      const success = await DB.deleteLeave(leaveId);
      if (success) {
        App.showToast(`Permohonan cuti ${leaveId} berhasil dibatalkan dan dihapus!`, 'success');
        this.render(document.getElementById('main-content-area'));
      }
    }
  },

  setViewMode: function(mode) {
    this.activeViewMode = mode;
    this.render(document.getElementById('main-content-area'));
  }
};
