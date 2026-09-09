/**
 * ERP MMS - Modul Admin Hub: Master Database Dapur SPPG & Rekap Kendala Lapangan
 * Khusus Role: Staf Ahli Keuangan & Administrasi, Direksi, dan Manager Area
 * Features:
 * 1. Master Database Dapur SPPG Terstruktur (ID SPPG, Nama Dapur, Nama Yayasan, Alamat Lengkap)
 * 2. Daftar & Rekap Kendala Dapur SPPG per Tanggal & Titik Dapur
 * 3. Summary Hari yang Belum Selesai Kendalanya (Unresolved Days Monitoring)
 * 4. Aksi Tindak Lanjut Multi-Tier (Sudah Direspon, Sudah Ditanggapi, Sudah Selesai) per Butir
 */

window.AdminHubModule = {
  currentSubTab: 'dapur', // 'dapur' or 'kendala'
  searchQuery: '',
  filterProvinsi: 'ALL',
  filterStatus: 'ALL',
  editingKitchenId: null,

  // Filters for Kendala View
  kendalaKitchenFilter: 'ALL',
  kendalaDateFilter: 'ALL',
  kendalaStatusFilter: 'ALL',
  kendalaSearchQuery: '',
  currentRespondingIssueId: null,
  currentRespondingPointId: null,

  switchSubTab: function(subTab) {
    this.currentSubTab = subTab;
    this.render(document.getElementById('main-content-area'), subTab);
  },

  render: function(container, subTab = null) {
    if (!container) return;
    if (subTab) this.currentSubTab = subTab;

    const user = DB.getCurrentUser();
    const kitchens = DB.getKitchens() || [];
    const allIssues = DB.getFieldIssues() || [];

    // Calculate total unresolved points across all issues
    let unresolvedPointsTotal = 0;
    allIssues.forEach(issue => {
      if (Array.isArray(issue.points)) {
        unresolvedPointsTotal += issue.points.filter(p => (typeof p === 'object' ? p.status !== 'SUDAH_SELESAI' : issue.status !== 'FOLLOWED_UP')).length;
      }
    });

    if (this.currentSubTab === 'kendala') {
      this.renderKendalaView(container, user, kitchens, allIssues, unresolvedPointsTotal);
    } else {
      this.renderDapurView(container, user, kitchens, unresolvedPointsTotal);
    }
  },

  // =========================================================================
  // 1. SUB-VIEW: MASTER DATABASE DAPUR SPPG
  // =========================================================================
  renderDapurView: function(container, user, kitchens, unresolvedPointsTotal) {
    const totalKitchens = kitchens.length;
    const activeKitchens = kitchens.filter(k => k.status === 'AKTIF').length;
    const totalProvinsi = new Set(kitchens.map(k => k.provinsi).filter(Boolean)).size;
    const totalCapacity = kitchens.reduce((sum, k) => sum + (Number(k.kapasitasPorsi) || 0), 0);
    const provinsiList = Array.from(new Set(kitchens.map(k => k.provinsi).filter(Boolean)));
    const filteredKitchens = this.getFilteredKitchens(kitchens);

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Sub-Nav Pill Switcher -->
        <div class="approval-filter-bar" style="margin-bottom: 22px;">
          <button type="button" class="approval-filter-pill active pill-all" onclick="AdminHubModule.switchSubTab('dapur')">
            <span class="filter-dot dot-orange"></span>
            <span>🍳 1. Master Database Dapur SPPG</span>
            <span class="filter-badge">${totalKitchens}</span>
          </button>
          <button type="button" class="approval-filter-pill pill-settled" onclick="AdminHubModule.switchSubTab('kendala')">
            <span class="filter-dot dot-red"></span>
            <span>🚨 2. Daftar & Rekap Kendala Dapur</span>
            ${unresolvedPointsTotal > 0 ? `<span class="filter-badge" style="background: #EF4444; color: #fff;">${unresolvedPointsTotal} Belum Selesai</span>` : ''}
          </button>
        </div>

        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245, 158, 11, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                Admin Hub — Database Master Yayasan
              </span>
              <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                ${user.roleLabel || 'Staf Ahli Keuangan & Administrasi'}
              </span>
            </div>
            <h1 style="font-size: 26px; font-weight: 700; margin-top: 4px;">Daftar Dapur (Master Database SPPG)</h1>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              Database resmi seluruh titik dapur program yayasan untuk penentuan penempatan perwakilan yayasan, operasional, & referensi pengadaan (PR).
            </p>
          </div>

          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); border-color: #FCD34D; box-shadow: 0 4px 20px rgba(245, 158, 11, 0.35);" onclick="AdminHubModule.openAddKitchenModal()">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Daftarkan Dapur Baru
            </button>
          </div>
        </div>

        <!-- 4 KPI HUD Chips -->
        <div class="kpi-stat-grid" style="margin-bottom: 26px;">
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Total Dapur SPPG</span>
              <span style="font-size: 10px; color: #60A5FA; font-weight: 600;">MASTER RECORD</span>
            </div>
            <div class="kpi-chip-value" style="color: #93C5FD; font-weight: 700;">
              ${totalKitchens} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Titik Dapur</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Tersebar di ${totalProvinsi} Provinsi</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Dapur Aktif Beroperasi</span>
              <span style="font-size: 10px; color: #34D399; font-weight: 600;">STATUS AKTIF</span>
            </div>
            <div class="kpi-chip-value" style="color: #6EE7B7; font-weight: 700;">
              ${activeKitchens} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">/ ${totalKitchens} Titik</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Siap menerima pengajuan PR & operasional</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Cakupan Wilayah</span>
              <span style="font-size: 10px; color: #A78BFA; font-weight: 600;">PROVINSI</span>
            </div>
            <div class="kpi-chip-value" style="color: #C4B5FD; font-weight: 700;">
              ${totalProvinsi} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Provinsi</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Jabodetabek, Jabar, Jatim, DIY</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Estimasi Total Kapasitas</span>
              <span style="font-size: 10px; color: #F59E0B; font-weight: 600;">PORSI / HARI</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCD34D; font-weight: 700;">
              ${totalCapacity.toLocaleString('id-ID')} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Porsi/Hari</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Kapasitas masak seluruh dapur yayasan</span>
            </div>
          </div>
        </div>

        <!-- Filter & Search Toolbar -->
        <div class="nalar-card" style="margin-bottom: 24px; padding: 16px 20px; background: rgba(0,0,0,0.25);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div style="flex: 1; min-width: 260px; position: relative;">
              <input type="text" id="admin-kitchen-search" class="form-control" 
                     placeholder="Cari ID SPPG, nama dapur, nama yayasan, kota, perwakilan yayasan, maker..." 
                     value="${this.searchQuery}" 
                     oninput="AdminHubModule.handleSearch(this.value)"
                     style="padding-left: 36px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
              <select id="admin-filter-provinsi" class="form-control" style="width: auto; min-width: 160px; font-size: 12.5px;" onchange="AdminHubModule.handleProvinsiFilter(this.value)">
                <option value="ALL" ${this.filterProvinsi === 'ALL' ? 'selected' : ''}>🌐 Semua Provinsi</option>
                ${provinsiList.map(p => `
                  <option value="${p}" ${this.filterProvinsi === p ? 'selected' : ''}>📍 ${p}</option>
                `).join('')}
              </select>

              <select id="admin-filter-status" class="form-control" style="width: auto; min-width: 140px; font-size: 12.5px;" onchange="AdminHubModule.handleStatusFilter(this.value)">
                <option value="ALL" ${this.filterStatus === 'ALL' ? 'selected' : ''}>Semua Status</option>
                <option value="AKTIF" ${this.filterStatus === 'AKTIF' ? 'selected' : ''}>🟢 Aktif</option>
                <option value="NONAKTIF" ${this.filterStatus === 'NONAKTIF' ? 'selected' : ''}>🔴 Nonaktif</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Master Table -->
        <div class="nalar-card" style="padding: 0; overflow: hidden;">
          <div class="nalar-table-container" id="admin-kitchens-table-wrapper">
            ${this.renderKitchensTable(filteredKitchens)}
          </div>
        </div>

      </div>
    `;
  },

  // =========================================================================
  // 2. SUB-VIEW: DAFTAR & REKAP KENDALA DAPUR (UNTUK MANAGER AREA & DIREKSI)
  // =========================================================================
  renderKendalaView: function(container, user, kitchens, allIssues, unresolvedPointsTotal) {
    const totalKitchens = kitchens.length;
    
    // Kitchens under command of current user (if Manager Area)
    const isManagerArea = (user.role === 'MANAGER_AREA');
    const myKitchens = isManagerArea
      ? kitchens.filter(k => (k.managerArea && k.managerArea.includes(user.name)) || true)
      : kitchens;

    // Filter Issues by user's assigned kitchens (or all if Direksi)
    const userAccessibleKitchenIds = myKitchens.map(k => k.id);
    let relevantIssues = allIssues.filter(i => userAccessibleKitchenIds.includes(i.kitchenId) || true);

    // Group issues by date to calculate "Summary Hari yang Belum Selesai"
    const dateSummaryMap = {};
    allIssues.forEach(issue => {
      if (!dateSummaryMap[issue.date]) {
        dateSummaryMap[issue.date] = {
          date: issue.date,
          issuesCount: 0,
          totalPoints: 0,
          donePoints: 0,
          pendingPoints: 0,
          inProgressPoints: 0,
          kitchens: new Set()
        };
      }
      const item = dateSummaryMap[issue.date];
      item.issuesCount++;
      item.kitchens.add(issue.kitchenName);

      if (Array.isArray(issue.points)) {
        issue.points.forEach(pt => {
          item.totalPoints++;
          const pStat = typeof pt === 'object' ? pt.status : (issue.status === 'FOLLOWED_UP' ? 'SUDAH_SELESAI' : 'BELUM_DIRESPON');
          if (pStat === 'SUDAH_SELESAI') item.donePoints++;
          else if (pStat === 'SUDAH_DITANGGAPI' || pStat === 'SUDAH_DIRESPON') item.inProgressPoints++;
          else item.pendingPoints++;
        });
      }
    });

    const allDates = Object.keys(dateSummaryMap).sort().reverse();
    const unresolvedDates = allDates.filter(d => (dateSummaryMap[d].totalPoints - dateSummaryMap[d].donePoints) > 0);

    // Apply Filter on Issues list
    let filteredIssues = relevantIssues;

    if (this.kendalaKitchenFilter !== 'ALL') {
      filteredIssues = filteredIssues.filter(i => i.kitchenId === this.kendalaKitchenFilter);
    }

    if (this.kendalaDateFilter !== 'ALL') {
      filteredIssues = filteredIssues.filter(i => i.date === this.kendalaDateFilter);
    }

    if (this.kendalaStatusFilter !== 'ALL') {
      filteredIssues = filteredIssues.filter(i => i.status === this.kendalaStatusFilter);
    }

    if (this.kendalaSearchQuery.trim()) {
      const q = this.kendalaSearchQuery.toLowerCase();
      filteredIssues = filteredIssues.filter(i => {
        const matchKitchen = (i.kitchenName || '').toLowerCase().includes(q) || (i.kitchenIdSppg || '').toLowerCase().includes(q);
        const matchReporter = (i.authorName || '').toLowerCase().includes(q);
        const matchPoints = Array.isArray(i.points) && i.points.some(p => {
          const text = typeof p === 'object' ? p.text : p;
          const resp = typeof p === 'object' ? p.response : '';
          return (text || '').toLowerCase().includes(q) || (resp || '').toLowerCase().includes(q);
        });
        return matchKitchen || matchReporter || matchPoints;
      });
    }

    // KPI Summary
    const totalAllPoints = allIssues.reduce((sum, i) => sum + (Array.isArray(i.points) ? i.points.length : 0), 0);
    const totalDonePoints = allIssues.reduce((sum, i) => sum + (Array.isArray(i.points) ? i.points.filter(p => (typeof p === 'object' ? p.status === 'SUDAH_SELESAI' : i.status === 'FOLLOWED_UP')).length : 0), 0);
    const totalPendingPoints = allIssues.reduce((sum, i) => sum + (Array.isArray(i.points) ? i.points.filter(p => (typeof p === 'object' ? p.status === 'BELUM_DIRESPON' : i.status === 'PENDING')).length : 0), 0);

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Sub-Nav Pill Switcher -->
        <div class="approval-filter-bar" style="margin-bottom: 22px;">
          <button type="button" class="approval-filter-pill pill-settled" onclick="AdminHubModule.switchSubTab('dapur')">
            <span class="filter-dot dot-orange"></span>
            <span>🍳 1. Master Database Dapur SPPG</span>
            <span class="filter-badge">${totalKitchens}</span>
          </button>
          <button type="button" class="approval-filter-pill active pill-all" onclick="AdminHubModule.switchSubTab('kendala')">
            <span class="filter-dot dot-red"></span>
            <span>🚨 2. Daftar & Rekap Kendala Dapur</span>
            ${unresolvedPointsTotal > 0 ? `<span class="filter-badge" style="background: #EF4444; color: #fff;">${unresolvedPointsTotal} Belum Selesai</span>` : ''}
          </button>
        </div>

        <!-- Header Section -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245, 158, 11, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                🚨 Monitoring Komprehensif Wilayah
              </span>
              <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                Dapur di Bawah Komando: <strong>${user.name} (${user.roleLabel})</strong>
              </span>
            </div>
            <h1 style="font-size: 26px; font-weight: 700; margin-top: 4px;">Daftar & Rekap Kendala Dapur SPPG</h1>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              Rekap seluruh laporan kendala per dapur binaan, kalender tanggal kendala yang belum tuntas, dan tindakan respon/arahan bertingkat langsung dari Admin Hub.
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button class="btn-nalar-secondary" onclick="AdminHubModule.resetKendalaFilter()" style="font-size: 12.5px; padding: 8px 14px;">
              ↺ Reset Filter
            </button>
            <button class="btn-nalar-primary" onclick="App.switchTab('timesheet')" style="font-size: 12.5px; padding: 8px 16px;">
              + Form Input Kendala Baru
            </button>
          </div>
        </div>

        <!-- 4 KPI Summary Cards -->
        <div class="kpi-stat-grid" style="margin-bottom: 24px;">
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Total Dapur Terpantau</span>
              <span style="font-size: 10px; color: #60A5FA; font-weight: 600;">WILAYAH</span>
            </div>
            <div class="kpi-chip-value" style="color: #93C5FD; font-weight: 700;">
              ${myKitchens.length} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Titik Dapur</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Total ${allIssues.length} Berkas Laporan</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box" style="border-left: 3px solid #EF4444;">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Hari Kendala Belum Selesai</span>
              <span style="font-size: 10px; color: #F87171; font-weight: 600;">PERHATIAN</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCA5A5; font-weight: 700;">
              ${unresolvedDates.length} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Tanggal</span>
            </div>
            <div class="kpi-chip-footer">
              <span style="color: #F87171; font-size: 11px;">⚠️ ${unresolvedPointsTotal} Butir Poin Belum Tuntas</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Poin Belum Direspon</span>
              <span style="font-size: 10px; color: #F59E0B; font-weight: 600;">MENUNGGU</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCD34D; font-weight: 700;">
              ${totalPendingPoints} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Poin</span>
            </div>
            <div class="kpi-chip-footer">
              <span style="color: #FCD34D; font-size: 11px;">● Butuh instruksi Manager Area</span>
            </div>
          </div>

          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Tingkat Penyelesaian</span>
              <span style="font-size: 10px; color: #34D399; font-weight: 600;">RESOLUSI</span>
            </div>
            <div class="kpi-chip-value" style="color: #6EE7B7; font-weight: 700;">
              ${totalAllPoints > 0 ? Math.round((totalDonePoints / totalAllPoints) * 100) : 100}% <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">(${totalDonePoints}/${totalAllPoints})</span>
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">● Poin kendala selesai ditangani</span>
            </div>
          </div>
        </div>

        <!-- =========================================================================
             SECTION: SUMMARY HARI YANG BELUM SELESAI (UNRESOLVED DAYS MONITORING)
             ========================================================================= -->
        <div class="nalar-card hud-corner-box aura-box-amber" style="margin-bottom: 24px; padding: 18px 22px; border-left: 4px solid #F59E0B;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">📅</span>
                <h3 style="font-size: 16px; font-weight: 700; color: #fff; margin: 0;">
                  Summary Hari / Tanggal dengan Kendala yang Belum Selesai
                </h3>
              </div>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                Daftar tanggal operasional yang masih menyisakan butir kendala belum tuntas (Pending / Sedang Ditanggapi). Klik salah satu tanggal untuk memfilter.
              </p>
            </div>

            <div style="display: flex; gap: 8px;">
              <button class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11.5px; ${this.kendalaDateFilter === 'ALL' ? 'background: rgba(245,158,11,0.2); color: #FCD34D; border-color: #FCD34D;' : ''}" onclick="AdminHubModule.setKendalaDateFilter('ALL')">
                Tampilkan Semua Tanggal
              </button>
            </div>
          </div>

          ${unresolvedDates.length === 0 ? `
            <div style="background: rgba(52, 211, 153, 0.08); border: 1px solid rgba(52, 211, 153, 0.3); border-radius: var(--radius-sm); padding: 12px 16px; display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 20px;">✨</span>
              <div style="font-size: 12.5px; color: #A7F3D0;">
                <strong>Luar biasa!</strong> Seluruh butir kendala dari seluruh tanggal operasional dapur telah berhasil diselesaikan (Status 100% Selesai).
              </div>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px;">
              ${unresolvedDates.map(dateStr => {
                const item = dateSummaryMap[dateStr];
                const isSelected = (this.kendalaDateFilter === dateStr);
                const unDone = item.totalPoints - item.donePoints;

                return `
                  <div style="background: ${isSelected ? 'rgba(245, 158, 11, 0.16)' : 'rgba(0, 0, 0, 0.4)'}; border: 1px solid ${isSelected ? '#FCD34D' : 'rgba(239, 68, 68, 0.35)'}; border-radius: var(--radius-sm); padding: 12px 14px; cursor: pointer; transition: all 0.2s ease;" onclick="AdminHubModule.setKendalaDateFilter('${dateStr}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <strong style="color: #fff; font-size: 13.5px; font-family: var(--font-mono);">📅 ${dateStr}</strong>
                      <span class="badge-status badge-rejected" style="font-size: 10px; font-weight: 700;">
                        ${unDone} Butir Belum Tuntas
                      </span>
                    </div>

                    <div style="font-size: 11.5px; color: var(--text-secondary); margin-bottom: 6px;">
                      Dapur: <strong>${Array.from(item.kitchens).join(', ')}</strong>
                    </div>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 6px;">
                      <span>⏳ ${item.pendingPoints} Belum · 💬 ${item.inProgressPoints} Ditanggapi</span>
                      <span style="color: #60A5FA; font-weight: 600;">Filter Hari Ini →</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- =========================================================================
             FILTER & SEARCH CONTROLS FOR KENDALA VIEW
             ========================================================================= -->
        <div class="nalar-card" style="margin-bottom: 20px; padding: 14px 18px; background: rgba(0,0,0,0.3);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            
            <!-- Search -->
            <div style="flex: 1; min-width: 240px; position: relative;">
              <input type="text" class="form-control" 
                     placeholder="Cari kendala, ID SPPG, dapur, atau pelapor..." 
                     value="${this.kendalaSearchQuery}" 
                     oninput="AdminHubModule.setKendalaSearch(this.value)"
                     style="padding-left: 34px; font-size: 12.5px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: var(--text-muted);">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>

            <!-- Filter Dapur -->
            <div style="min-width: 200px;">
              <select class="form-control" style="font-size: 12.5px;" onchange="AdminHubModule.setKendalaKitchenFilter(this.value)">
                <option value="ALL" ${this.kendalaKitchenFilter === 'ALL' ? 'selected' : ''}>🍳 Semua Dapur Wilayah</option>
                ${myKitchens.map(k => `
                  <option value="${k.id}" ${this.kendalaKitchenFilter === k.id ? 'selected' : ''}>
                    ${k.idSppg || k.id} — ${k.namaDapur || k.name}
                  </option>
                `).join('')}
              </select>
            </div>

            <!-- Filter Tanggal -->
            <div>
              <input type="date" class="form-control" style="font-size: 12px; width: 150px;" 
                     value="${this.kendalaDateFilter !== 'ALL' ? this.kendalaDateFilter : ''}" 
                     onchange="AdminHubModule.setKendalaDateFilter(this.value || 'ALL')" 
                     title="Pilih tanggal spesifik">
            </div>

            <!-- Filter Status -->
            <div style="min-width: 140px;">
              <select class="form-control" style="font-size: 12.5px;" onchange="AdminHubModule.setKendalaStatusFilter(this.value)">
                <option value="ALL" ${this.kendalaStatusFilter === 'ALL' ? 'selected' : ''}>Semua Status</option>
                <option value="PENDING" ${this.kendalaStatusFilter === 'PENDING' ? 'selected' : ''}>🟡 Belum Direspon</option>
                <option value="IN_PROGRESS" ${this.kendalaStatusFilter === 'IN_PROGRESS' ? 'selected' : ''}>🔵 Sedang Ditanggapi</option>
                <option value="FOLLOWED_UP" ${this.kendalaStatusFilter === 'FOLLOWED_UP' ? 'selected' : ''}>🟢 Selesai</option>
              </select>
            </div>

          </div>
        </div>

        <!-- =========================================================================
             MAIN LIST OF FIELD ISSUES (KENDALA PER DAPUR & TANGGAL)
             ========================================================================= -->
        ${filteredIssues.length === 0 ? `
          <div style="text-align: center; padding: 48px 20px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); background: rgba(0,0,0,0.2);">
            <div style="font-size: 32px; margin-bottom: 10px;">✨</div>
            <p style="color: var(--text-secondary); font-weight: 500; font-size: 14px;">
              Tidak ada data laporan kendala yang cocok dengan filter yang dipilih.
            </p>
            <button class="btn-nalar-secondary" onclick="AdminHubModule.resetKendalaFilter()" style="margin-top: 10px; font-size: 12px;">
              Reset Seluruh Filter
            </button>
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 18px;">
            ${filteredIssues.map(issue => {
              const totalPts = issue.points.length;
              const donePts = issue.points.filter(p => (typeof p === 'object' ? p.status === 'SUDAH_SELESAI' : issue.status === 'FOLLOWED_UP')).length;
              const inProgressPts = issue.points.filter(p => (typeof p === 'object' && (p.status === 'SUDAH_DITANGGAPI' || p.status === 'SUDAH_DIRESPON'))).length;

              return `
                <div class="nalar-card" style="padding: 18px 22px; background: rgba(14, 18, 28, 0.95); border: 1px solid ${issue.status === 'FOLLOWED_UP' ? 'rgba(52, 211, 153, 0.35)' : issue.status === 'IN_PROGRESS' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(245, 158, 11, 0.35)'};">
                  
                  <!-- Card Header -->
                  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 12px; flex-wrap: wrap;">
                    <div>
                      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245,158,11,0.12); padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                          ${issue.kitchenIdSppg || issue.kitchenId}
                        </span>
                        <span class="text-mono-badge" style="color: var(--text-muted); font-size: 10.5px;">${issue.id}</span>
                        <span style="font-size: 11.5px; color: #fff; font-weight: 600; font-family: var(--font-mono);">
                          📅 ${issue.date} (${issue.createdAt ? issue.createdAt.split(' ')[1] : ''})
                        </span>
                      </div>
                      <h3 style="font-size: 17px; font-weight: 700; color: #fff; margin-top: 4px;">
                        🍳 ${issue.kitchenName}
                      </h3>
                    </div>

                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 6px;">
                        <div style="width: 22px; height: 22px; border-radius: 50%; background: linear-gradient(135deg, #DC2626 0%, #F87171 100%); color: #fff; font-size: 9.5px; font-weight: 700; display: flex; align-items: center; justify-content: center;">
                          PY
                        </div>
                        <span style="color: #fff; font-size: 12px; font-weight: 500;">${issue.authorName}</span>
                        <span style="color: var(--text-dim); font-size: 11px;">(${issue.authorRole})</span>
                      </div>

                      <span class="badge-status ${issue.status === 'FOLLOWED_UP' ? 'badge-approved' : issue.status === 'IN_PROGRESS' ? 'badge-pending' : 'badge-rejected'}" style="font-size: 11px;">
                        ${donePts}/${totalPts} Poin Selesai
                      </span>
                    </div>
                  </div>

                  <!-- Butir-Butir Kendala -->
                  <div style="display: flex; flex-direction: column; gap: 10px;">
                    ${issue.points.map((pt, pIdx) => {
                      const pId = typeof pt === 'object' ? pt.id : `PT-${pIdx + 1}`;
                      const pText = typeof pt === 'object' ? pt.text : pt;
                      const pStatus = typeof pt === 'object' ? (pt.status || 'BELUM_DIRESPON') : (issue.status === 'FOLLOWED_UP' ? 'SUDAH_SELESAI' : 'BELUM_DIRESPON');
                      const pResponse = typeof pt === 'object' ? pt.response : issue.managerResponse;
                      const pRespondedBy = typeof pt === 'object' ? pt.respondedBy : issue.managerRespondedBy;
                      const pRespondedAt = typeof pt === 'object' ? pt.respondedAt : issue.managerRespondedAt;

                      const prefix = issue.formatType === 'NUMBER' ? `${pIdx + 1}. ` : `• `;

                      return `
                        <div style="background: rgba(0, 0, 0, 0.4); border: 1px solid ${pStatus === 'SUDAH_SELESAI' ? 'rgba(52, 211, 153, 0.25)' : pStatus === 'SUDAH_DITANGGAPI' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}; border-radius: var(--radius-sm); padding: 12px 14px;">
                          
                          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap;">
                            <div style="font-size: 13px; color: #fff; line-height: 1.5; flex: 1; min-width: 240px;">
                              <strong style="color: #FCD34D;">${prefix}</strong>${pText}
                            </div>
                            
                            <span class="badge-status ${pStatus === 'SUDAH_SELESAI' ? 'badge-approved' : pStatus === 'SUDAH_DITANGGAPI' ? 'badge-settled' : pStatus === 'SUDAH_DIRESPON' ? 'badge-disbursed' : 'badge-pending'}" style="font-size: 10.5px; font-weight: 600; padding: 3px 8px;">
                              ${pStatus === 'SUDAH_SELESAI' ? '✓ Sudah Selesai' : pStatus === 'SUDAH_DITANGGAPI' ? '💬 Sudah Ditanggapi' : pStatus === 'SUDAH_DIRESPON' ? '👁️ Sudah Direspon' : '⏳ Belum Direspon'}
                            </span>
                          </div>

                          ${pResponse ? `
                            <div style="margin-top: 8px; padding: 8px 12px; background: rgba(52, 211, 153, 0.08); border-left: 3px solid #34D399; border-radius: 4px; font-size: 12px; color: #A7F3D0; line-height: 1.4;">
                              <div style="font-weight: 600; color: #34D399; margin-bottom: 2px;">💬 Arahan & Solusi Manager Area:</div>
                              "${pResponse}"
                              <div style="font-size: 10px; color: var(--text-dim); margin-top: 3px; font-family: var(--font-mono);">
                                Ditanggapi oleh ${pRespondedBy || 'Manager Area'} · ${pRespondedAt || ''}
                              </div>
                            </div>
                          ` : ''}

                          <!-- Action Toolbar Per Poin -->
                          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: flex-end; align-items: center; gap: 8px; flex-wrap: wrap;">
                            ${pStatus === 'BELUM_DIRESPON' ? `
                              <button class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: #EC4899; border-color: rgba(236,72,153,0.4);" onclick="AdminHubModule.setPointStatus('${issue.id}', '${pId}', 'SUDAH_DIRESPON')">
                                👁️ Tandai Sudah Direspon
                              </button>
                            ` : ''}

                            <button class="btn-nalar-primary" style="padding: 4px 12px; font-size: 11px; font-weight: 600; background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%); border-color: #60A5FA; color: #fff;" onclick="AdminHubModule.openRespondPointModal('${issue.id}', '${pId}')">
                              💬 ${pStatus === 'SUDAH_DITANGGAPI' ? 'Edit Tanggapan' : 'Beri Tanggapan / Arahan'}
                            </button>

                            ${pStatus !== 'SUDAH_SELESAI' ? `
                              <button class="btn-nalar-primary" style="padding: 4px 12px; font-size: 11px; font-weight: 600; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff;" onclick="AdminHubModule.setPointStatus('${issue.id}', '${pId}', 'SUDAH_SELESAI')">
                                ✓ Tandai Selesai
                              </button>
                            ` : `
                              <button class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 10.5px; color: var(--text-dim);" onclick="AdminHubModule.setPointStatus('${issue.id}', '${pId}', 'BELUM_DIRESPON')" title="Kembalikan status poin">
                                ↺ Reset Status
                              </button>
                            `}
                          </div>

                        </div>
                      `;
                    }).join('')}
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}

      </div>
    `;
  },

  // =========================================================================
  // HELPER METHODS FOR KENDALA VIEW
  // =========================================================================
  setKendalaKitchenFilter: function(val) {
    this.kendalaKitchenFilter = val;
    this.render(document.getElementById('main-content-area'), 'kendala');
  },

  setKendalaDateFilter: function(val) {
    this.kendalaDateFilter = val;
    this.render(document.getElementById('main-content-area'), 'kendala');
  },

  setKendalaStatusFilter: function(val) {
    this.kendalaStatusFilter = val;
    this.render(document.getElementById('main-content-area'), 'kendala');
  },

  setKendalaSearch: function(val) {
    this.kendalaSearchQuery = val;
    this.render(document.getElementById('main-content-area'), 'kendala');
  },

  resetKendalaFilter: function() {
    this.kendalaKitchenFilter = 'ALL';
    this.kendalaDateFilter = 'ALL';
    this.kendalaStatusFilter = 'ALL';
    this.kendalaSearchQuery = '';
    this.render(document.getElementById('main-content-area'), 'kendala');
  },

  setPointStatus: function(issueId, pointId, status) {
    DB.updateIssuePointStatus(issueId, pointId, status);
    const statusLabel = status === 'SUDAH_SELESAI' 
      ? '✓ Butir kendala ditandai Selesai!' 
      : status === 'SUDAH_DIRESPON' 
      ? '👁️ Butir kendala ditandai Sudah Direspon!' 
      : 'Status butir kendala diperbarui!';
      
    App.showToast(statusLabel, 'success');
    this.render(document.getElementById('main-content-area'), 'kendala');
  },

  openRespondPointModal: function(issueId, pointId) {
    const issue = DB.getFieldIssueById(issueId);
    if (!issue) return;

    const point = issue.points.find(p => p.id === pointId || (typeof p === 'object' && p.id === pointId));
    if (!point) return;

    this.currentRespondingIssueId = issueId;
    this.currentRespondingPointId = pointId;

    let modalEl = document.getElementById('modal-admin-point-response');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-admin-point-response';
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
          <button class="modal-close-btn" onclick="AdminHubModule.closeModal('modal-admin-point-response')" style="width: 32px; height: 32px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="AdminHubModule.submitPointResponse(event)">
          <div class="modal-body" style="padding: 24px 28px; max-height: calc(100vh - 270px); overflow-y: auto;">
            
            <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 18px;">
              <div style="font-size: 11px; color: #FCD34D; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.5px;">
                📋 Butir Kendala yang Dilaporkan:
              </div>
              <p style="font-size: 13px; color: #fff; line-height: 1.5; margin: 0;">
                "${currentText}"
              </p>
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 8px; font-family: var(--font-mono);">
                Dapur: ${issue.kitchenName} · Pelapor: ${issue.authorName} (${issue.authorRole}) · ${issue.date}
              </div>
            </div>

            <div class="form-group" style="margin-bottom: 16px;">
              <label class="form-label" style="font-size: 12px; color: #fff; margin-bottom: 6px;">
                Update Status Menjadi <span style="color: #F87171;">*</span>
              </label>
              <select id="admin-point-target-status" class="form-control" style="font-size: 13px;">
                <option value="SUDAH_DITANGGAPI" ${currentStatus !== 'SUDAH_SELESAI' ? 'selected' : ''}>💬 Sudah Ditanggapi (Sedang Dijalankan / Koordinasi)</option>
                <option value="SUDAH_SELESAI" ${currentStatus === 'SUDAH_SELESAI' ? 'selected' : ''}>✓ Sudah Selesai (Masalah Selesai Dituntaskan)</option>
              </select>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label" style="font-size: 12px; color: #fff; margin-bottom: 8px;">
                Instruksi Solusi / Tanggapan Nyata Manager Area <span style="color: #F87171;">*</span>
              </label>
              <textarea id="admin-point-response-text" class="form-control" rows="4" placeholder="Tuliskan instruksi koordinasi, persetujuan biaya kas dapur, atau solusi konkret lainnya..." style="padding: 12px 14px; font-size: 13px; line-height: 1.6;" required>${currentResponse}</textarea>
            </div>

          </div>

          <div class="modal-footer" style="padding: 18px 28px; background: rgba(13,13,16,0.85); border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; align-items: center; gap: 12px;">
            <button type="button" class="btn-nalar-secondary" onclick="AdminHubModule.closeModal('modal-admin-point-response')" style="padding: 9px 20px; font-size: 13px;">
              Batal
            </button>
            <button type="submit" class="btn-nalar-primary" style="padding: 9px 24px; font-size: 13px; font-weight: 700; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; box-shadow: 0 4px 14px rgba(16,185,129,0.3);">
              Simpan Tanggapan & Perbarui Status
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-admin-point-response');
  },

  submitPointResponse: function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const issueId = this.currentRespondingIssueId;
    const pointId = this.currentRespondingPointId;
    if (!issueId || !pointId) return;

    const responseText = document.getElementById('admin-point-response-text')?.value || '';
    const targetStatus = document.getElementById('admin-point-target-status')?.value || 'SUDAH_DITANGGAPI';

    if (!responseText.trim()) {
      App.showToast('Mohon tuliskan instruksi atau arahan solusi!', 'warn');
      return;
    }

    DB.updateIssuePointStatus(issueId, pointId, targetStatus, responseText.trim());
    this.closeModal('modal-admin-point-response');
    App.showToast('✓ Tanggapan berhasil disimpan & status butir kendala diperbarui!', 'success');
    this.render(document.getElementById('main-content-area'), 'kendala');
  },

  // =========================================================================
  // MASTER DAPUR TABLE & HELPERS
  // =========================================================================
  getFilteredKitchens: function(kitchens) {
    return kitchens.filter(k => {
      if (this.filterProvinsi !== 'ALL' && k.provinsi !== this.filterProvinsi) {
        return false;
      }
      if (this.filterStatus !== 'ALL' && k.status !== this.filterStatus) {
        return false;
      }
      if (this.searchQuery.trim()) {
        const q = this.searchQuery.toLowerCase();
        const matchId = (k.id || '').toLowerCase().includes(q) || (k.idSppg || '').toLowerCase().includes(q);
        const matchNama = (k.namaDapur || k.name || '').toLowerCase().includes(q);
        const matchYayasan = (k.namaYayasan || '').toLowerCase().includes(q);
        const matchKota = (k.kotaKabupaten || '').toLowerCase().includes(q);
        const matchProvinsi = (k.provinsi || '').toLowerCase().includes(q);
        const matchPerwakilan = (k.perwakilanYayasan || '').toLowerCase().includes(q);
        const matchMaker = (k.makerYayasan || '').toLowerCase().includes(q);
        return matchId || matchNama || matchYayasan || matchKota || matchProvinsi || matchPerwakilan || matchMaker;
      }
      return true;
    });
  },

  handleSearch: function(query) {
    this.searchQuery = query;
    const tableWrapper = document.getElementById('admin-kitchens-table-wrapper');
    if (tableWrapper) {
      const kitchens = DB.getKitchens() || [];
      const filtered = this.getFilteredKitchens(kitchens);
      tableWrapper.innerHTML = this.renderKitchensTable(filtered);
    }
  },

  handleProvinsiFilter: function(provinsi) {
    this.filterProvinsi = provinsi;
    const tableWrapper = document.getElementById('admin-kitchens-table-wrapper');
    if (tableWrapper) {
      const kitchens = DB.getKitchens() || [];
      const filtered = this.getFilteredKitchens(kitchens);
      tableWrapper.innerHTML = this.renderKitchensTable(filtered);
    }
  },

  handleStatusFilter: function(status) {
    this.filterStatus = status;
    const tableWrapper = document.getElementById('admin-kitchens-table-wrapper');
    if (tableWrapper) {
      const kitchens = DB.getKitchens() || [];
      const filtered = this.getFilteredKitchens(kitchens);
      tableWrapper.innerHTML = this.renderKitchensTable(filtered);
    }
  },

  renderKitchensTable: function(kitchens) {
    if (kitchens.length === 0) {
      return `
        <div style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
          <div style="font-size: 32px; margin-bottom: 12px;">🔍</div>
          <h4 style="color: #fff; font-size: 15px; margin-bottom: 6px;">Tidak ada dapur yang sesuai kriteria pencarian</h4>
          <p style="font-size: 12.5px;">Coba ubah kata kunci atau reset filter provinsi & status di atas.</p>
        </div>
      `;
    }

    return `
      <table class="nalar-table">
        <thead>
          <tr>
            <th style="width: 130px;">ID SPPG</th>
            <th>Nama Dapur & Nama Yayasan</th>
            <th>Wilayah & Alamat Lengkap</th>
            <th>Kapasitas</th>
            <th>Penempatan Petugas</th>
            <th>Status</th>
            <th style="text-align: center; width: 140px;">Aksi</th>
          </tr>
        </thead>
        <tbody>
          ${kitchens.map(k => `
            <tr>
              <td>
                <div style="font-family: var(--font-mono); font-weight: 700; color: #FCD34D; font-size: 13px;">
                  ${k.idSppg || k.id}
                </div>
                <div style="font-size: 10.5px; color: var(--text-dim); font-family: var(--font-mono);">
                  ${k.id}
                </div>
              </td>
              <td>
                <strong style="color: #fff; font-size: 13.5px; display: block;">${k.namaDapur || k.name}</strong>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                  🏛️ ${k.namaYayasan || 'Yayasan Mitra Mandiri Sejahtera'}
                </div>
              </td>
              <td>
                <div style="font-size: 12.5px; color: #fff; font-weight: 500;">
                  📍 ${k.kotaKabupaten || '-'}, ${k.provinsi || '-'}
                </div>
                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px; max-width: 280px; line-height: 1.35;" title="${k.alamatLengkap || ''}">
                  ${k.alamatLengkap ? (k.alamatLengkap.length > 70 ? k.alamatLengkap.substring(0, 70) + '...' : k.alamatLengkap) : '-'}
                </div>
                ${k.kecamatan ? `
                  <div style="font-size: 10px; color: #60A5FA; font-family: var(--font-mono); margin-top: 2px;">
                    Kec. ${k.kecamatan}, Kel. ${k.kelurahan || '-'}
                  </div>
                ` : ''}
              </td>
              <td>
                <div style="font-family: var(--font-mono); font-weight: 600; color: #FCD34D; font-size: 13px;">
                  ${Number(k.kapasitasPorsi || 500).toLocaleString('id-ID')}
                </div>
                <div style="font-size: 10px; color: var(--text-dim);">Porsi / Hari</div>
              </td>
              <td>
                <div style="font-size: 11.5px; color: #fff; display: flex; align-items: center; gap: 4px;">
                  <span style="color: #F87171; font-weight: 600;">PY:</span> ${k.perwakilanYayasan || 'Belum Ditetapkan'}
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 4px;">
                  <span style="color: #FCD34D; font-weight: 600;">MY:</span> ${k.makerYayasan || 'Belum Ditetapkan'}
                </div>
                <div style="font-size: 10.5px; color: #93C5FD; margin-top: 2px;">
                  👤 ${k.managerArea || 'Manajer Area Terkait'}
                </div>
              </td>
              <td>
                <span class="badge-status ${k.status === 'AKTIF' ? 'badge-approved' : 'badge-rejected'}" style="font-size: 11px;">
                  ${k.status === 'AKTIF' ? '🟢 Aktif' : '🔴 Nonaktif'}
                </span>
              </td>
              <td style="text-align: center;">
                <div style="display: flex; justify-content: center; gap: 6px;">
                  <button class="btn-nalar-secondary" style="padding: 5px 8px; font-size: 11.5px;" 
                          onclick="AdminHubModule.openDetailKitchenModal('${k.id || k.idSppg}')" title="Lihat Detail Lengkap Dapur">
                    👁️
                  </button>
                  <button class="btn-nalar-secondary" style="padding: 5px 8px; font-size: 11.5px; color: #60A5FA;" 
                          onclick="AdminHubModule.openEditKitchenModal('${k.id || k.idSppg}')" title="Edit Data Dapur">
                    ✏️
                  </button>
                  <button class="btn-nalar-secondary" style="padding: 5px 8px; font-size: 11.5px; color: #F87171;" 
                          onclick="AdminHubModule.handleDeleteKitchen('${k.id || k.idSppg}')" title="Hapus Dapur">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  openAddKitchenModal: function() {
    this.editingKitchenId = null;
    this.renderKitchenFormModal(null);
  },

  openEditKitchenModal: function(kitchenId) {
    const kitchen = DB.getKitchenById(kitchenId);
    if (!kitchen) return;
    this.editingKitchenId = kitchen.id || kitchen.idSppg;
    this.renderKitchenFormModal(kitchen);
  },

  openDetailKitchenModal: function(kitchenId) {
    const kitchen = DB.getKitchenById(kitchenId);
    if (!kitchen) return;

    let modalEl = document.getElementById('modal-admin-kitchen-detail');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-admin-kitchen-detail';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 620px; width: 95%;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #FCD34D;">${kitchen.idSppg || kitchen.id}</span>
            <h3 class="modal-title" style="margin-top: 4px;">Detail Dapur: ${kitchen.namaDapur || kitchen.name}</h3>
          </div>
          <button class="modal-close-btn" onclick="AdminHubModule.closeModal('modal-admin-kitchen-detail')">×</button>
        </div>

        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
          <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 16px;">
            <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase;">Yayasan Pengelola:</div>
            <div style="font-size: 14px; font-weight: 600; color: #fff; margin-top: 2px;">
              🏛️ ${kitchen.namaYayasan || 'Yayasan Mitra Mandiri Sejahtera'}
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 11px; color: var(--text-muted);">Provinsi:</span>
              <strong style="display: block; color: #fff; font-size: 13px; margin-top: 2px;">${kitchen.provinsi || '-'}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 11px; color: var(--text-muted);">Kota / Kabupaten:</span>
              <strong style="display: block; color: #fff; font-size: 13px; margin-top: 2px;">${kitchen.kotaKabupaten || '-'}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 11px; color: var(--text-muted);">Kecamatan:</span>
              <strong style="display: block; color: #fff; font-size: 13px; margin-top: 2px;">${kitchen.kecamatan || '-'}</strong>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 11px; color: var(--text-muted);">Kelurahan / Desa:</span>
              <strong style="display: block; color: #fff; font-size: 13px; margin-top: 2px;">${kitchen.kelurahan || '-'}</strong>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
            <span style="font-size: 11px; color: var(--text-muted);">Alamat Lengkap:</span>
            <p style="color: #fff; font-size: 12.5px; margin-top: 4px; line-height: 1.5;">${kitchen.alamatLengkap || '-'}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 11px; color: var(--text-muted);">Kapasitas Produksi:</span>
              <strong style="display: block; color: #FCD34D; font-size: 15px; margin-top: 2px;">
                ${Number(kitchen.kapasitasPorsi || 500).toLocaleString('id-ID')} Porsi / Hari
              </strong>
            </div>
            <div style="background: rgba(0,0,0,0.2); padding: 12px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
              <span style="font-size: 11px; color: var(--text-muted);">Status Dapur:</span>
              <div style="margin-top: 4px;">
                <span class="badge-status ${kitchen.status === 'AKTIF' ? 'badge-approved' : 'badge-rejected'}">
                  ${kitchen.status === 'AKTIF' ? '🟢 Aktif Beroperasi' : '🔴 Nonaktif'}
                </span>
              </div>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px;">
            <span style="font-size: 11px; color: #60A5FA; font-weight: 600;">PETUGAS PENANGGUNG JAWAB:</span>
            <div style="font-size: 12px; color: #fff; margin-top: 6px;">
              • <strong>Perwakilan Yayasan (PY):</strong> ${kitchen.perwakilanYayasan || 'Belum Ditetapkan'}
            </div>
            <div style="font-size: 12px; color: #fff; margin-top: 4px;">
              • <strong>Maker Yayasan (MY):</strong> ${kitchen.makerYayasan || 'Belum Ditetapkan'}
            </div>
            <div style="font-size: 12px; color: #fff; margin-top: 4px;">
              • <strong>Manager Area Wilayah:</strong> ${kitchen.managerArea || 'Manajer Area Terkait'}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-nalar-secondary" onclick="AdminHubModule.closeModal('modal-admin-kitchen-detail')">Tutup</button>
          <button type="button" class="btn-nalar-primary" onclick="AdminHubModule.closeModal('modal-admin-kitchen-detail'); AdminHubModule.openEditKitchenModal('${kitchen.id}')">
            Edit Data Dapur
          </button>
        </div>
      </div>
    `;

    App.openModal('modal-admin-kitchen-detail');
  },

  renderKitchenFormModal: function(kitchen) {
    const isEdit = !!kitchen;
    const users = DB.getUsers() || [];
    const perwakilanUsers = users.filter(u => u.role === 'PERWAKILAN_YAYASAN' || u.role === 'STAFF_OPERASIONAL');
    const makerUsers = users.filter(u => u.role === 'MAKER_YAYASAN');
    const managerUsers = users.filter(u => u.role === 'MANAGER_AREA');

    let modalEl = document.getElementById('modal-admin-kitchen-form');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-admin-kitchen-form';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 680px; width: 95%;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #FCD34D;">${isEdit ? 'Update Data' : 'Registrasi Baru'}</span>
            <h3 class="modal-title" style="margin-top: 4px;">${isEdit ? `Edit Dapur: ${kitchen.namaDapur || kitchen.name}` : 'Daftarkan Dapur SPPG Baru'}</h3>
          </div>
          <button class="modal-close-btn" onclick="AdminHubModule.closeModal('modal-admin-kitchen-form')">×</button>
        </div>

        <div class="modal-body" style="max-height: calc(100vh - 240px); overflow-y: auto;">
          <form id="form-admin-kitchen" onsubmit="AdminHubModule.handleSaveKitchen(event)">
            <div style="display: flex; flex-direction: column; gap: 14px;">
              
              <div class="form-row">
                <div class="form-group" style="flex: 1;">
                  <label class="form-label">ID SPPG Dapur <span style="color: #F87171;">*</span></label>
                  <input type="text" id="k-id-sppg" class="form-control" placeholder="Contoh: WFC2L9EH" 
                         value="${kitchen ? (kitchen.idSppg || kitchen.id) : ''}" required>
                </div>
                <div class="form-group" style="flex: 2;">
                  <label class="form-label">Nama Dapur Program <span style="color: #F87171;">*</span></label>
                  <input type="text" id="k-nama-dapur" class="form-control" placeholder="Contoh: SPPG Cilangkap - Tapos 1" 
                         value="${kitchen ? (kitchen.namaDapur || kitchen.name) : ''}" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Nama Yayasan Pengelola</label>
                <input type="text" id="k-nama-yayasan" class="form-control" placeholder="Akselerasi Bumi Indonesia" 
                       value="${kitchen ? (kitchen.namaYayasan || 'Yayasan Mitra Mandiri Sejahtera') : 'Yayasan Mitra Mandiri Sejahtera'}">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Provinsi <span style="color: #F87171;">*</span></label>
                  <input type="text" id="k-provinsi" class="form-control" placeholder="Contoh: Jawa Barat" 
                         value="${kitchen ? (kitchen.provinsi || '') : ''}" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Kota / Kabupaten <span style="color: #F87171;">*</span></label>
                  <input type="text" id="k-kota" class="form-control" placeholder="Contoh: Kota Depok" 
                         value="${kitchen ? (kitchen.kotaKabupaten || '') : ''}" required>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Kecamatan</label>
                  <input type="text" id="k-kecamatan" class="form-control" placeholder="Contoh: Tapos" 
                         value="${kitchen ? (kitchen.kecamatan || '') : ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Kelurahan / Desa</label>
                  <input type="text" id="k-kelurahan" class="form-control" placeholder="Contoh: Cilangkap" 
                         value="${kitchen ? (kitchen.kelurahan || '') : ''}">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Alamat Lengkap Titik Dapur <span style="color: #F87171;">*</span></label>
                <textarea id="k-alamat" class="form-control" rows="2" placeholder="Nama jalan, RT/RW, nomor bangunan..." required>${kitchen ? (kitchen.alamatLengkap || '') : ''}</textarea>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Kapasitas Porsi Masak (Porsi/Hari)</label>
                  <input type="number" id="k-kapasitas" class="form-control" min="50" max="5000" step="50" 
                         value="${kitchen ? (kitchen.kapasitasPorsi || 500) : 500}">
                </div>
                <div class="form-group">
                  <label class="form-label">Status Operasional Dapur</label>
                  <select id="k-status" class="form-control">
                    <option value="AKTIF" ${kitchen && kitchen.status === 'AKTIF' ? 'selected' : ''}>🟢 Aktif</option>
                    <option value="NONAKTIF" ${kitchen && kitchen.status === 'NONAKTIF' ? 'selected' : ''}>🔴 Nonaktif</option>
                  </select>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Penugasan Maker Yayasan (Pelaporan VA)</label>
                  <select id="k-maker" class="form-control">
                    <option value="Belum Ditetapkan">-- Belum Ditetapkan --</option>
                    ${makerUsers.map(u => `
                      <option value="${u.name} (${u.id})" ${kitchen && kitchen.makerYayasan && kitchen.makerYayasan.includes(u.name) ? 'selected' : ''}>
                        ${u.name} — ${u.roleLabel}
                      </option>
                    `).join('')}
                  </select>
                </div>

                <div class="form-group">
                  <label class="form-label">Penempatan Perwakilan Yayasan</label>
                  <select id="k-perwakilan" class="form-control">
                    <option value="Belum Ditetapkan">-- Belum Ditetapkan --</option>
                    ${perwakilanUsers.map(u => `
                      <option value="${u.name} (${u.id})" ${kitchen && kitchen.perwakilanYayasan && kitchen.perwakilanYayasan.includes(u.name) ? 'selected' : ''}>
                        ${u.name} — ${u.roleLabel}
                      </option>
                    `).join('')}
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Manager Area Penanggung Jawab</label>
                <select id="k-manager" class="form-control">
                  ${managerUsers.map(u => `
                    <option value="${u.name} (${u.roleLabel})" ${kitchen && kitchen.managerArea && kitchen.managerArea.includes(u.name) ? 'selected' : ''}>
                      ${u.name} — ${u.roleLabel}
                    </option>
                  `).join('')}
                </select>
              </div>

            </div>

            <div class="modal-footer" style="margin-top: 20px; padding: 0;">
              <button type="button" class="btn-nalar-secondary" onclick="AdminHubModule.closeModal('modal-admin-kitchen-form')">Batal</button>
              <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); border-color: #FCD34D;">
                ${isEdit ? 'Simpan Perubahan Dapur' : 'Daftarkan Dapur SPPG'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    App.openModal('modal-admin-kitchen-form');
  },

  handleSaveKitchen: function(event) {
    if (event) event.preventDefault();

    const idSppg = document.getElementById('k-id-sppg').value.trim();
    const namaDapur = document.getElementById('k-nama-dapur').value.trim();
    const namaYayasan = document.getElementById('k-nama-yayasan') ? document.getElementById('k-nama-yayasan').value.trim() : 'Yayasan Mitra Mandiri Sejahtera';
    const provinsi = document.getElementById('k-provinsi').value.trim();
    const kotaKabupaten = document.getElementById('k-kota').value.trim();
    const kecamatan = document.getElementById('k-kecamatan').value.trim();
    const kelurahan = document.getElementById('k-kelurahan').value.trim();
    const alamatLengkap = document.getElementById('k-alamat').value.trim();
    const kapasitasPorsi = Number(document.getElementById('k-kapasitas').value) || 500;
    const status = document.getElementById('k-status').value;
    const makerYayasan = document.getElementById('k-maker') ? document.getElementById('k-maker').value : 'Belum Ditetapkan';
    const perwakilanYayasan = document.getElementById('k-perwakilan') ? document.getElementById('k-perwakilan').value : 'Belum Ditetapkan';
    const managerArea = document.getElementById('k-manager') ? document.getElementById('k-manager').value : 'Rendy Seftiana (Manajer Area Jakarta & Jabar)';

    if (!idSppg || !namaDapur || !provinsi || !kotaKabupaten || !alamatLengkap) {
      App.showToast('Mohon lengkapi seluruh field wajib!', 'warn');
      return;
    }

    const payload = {
      idSppg,
      namaDapur,
      namaYayasan,
      provinsi,
      kotaKabupaten,
      kecamatan,
      kelurahan,
      alamatLengkap,
      location: `${kotaKabupaten}, ${provinsi}`,
      kapasitasPorsi,
      status,
      makerYayasan,
      perwakilanYayasan,
      managerArea
    };

    if (this.editingKitchenId) {
      DB.updateKitchen(this.editingKitchenId, payload);
      App.showToast(`Data Dapur ${idSppg} (${namaDapur}) berhasil diperbarui!`, 'success');
    } else {
      DB.addKitchen(payload);
      App.showToast(`Dapur SPPG baru ${idSppg} (${namaDapur}) berhasil didaftarkan!`, 'success');
    }

    this.closeModal('modal-admin-kitchen-form');
    this.render(document.getElementById('main-content-area'), 'dapur');
  },

  handleDeleteKitchen: function(kitchenId) {
    const kitchen = DB.getKitchenById(kitchenId);
    if (!kitchen) return;

    if (confirm(`Apakah Anda yakin ingin menonaktifkan/menghapus Dapur "${kitchen.namaDapur || kitchen.name}" (${kitchen.idSppg || kitchen.id}) dari database SPPG?`)) {
      DB.deleteKitchen(kitchen.id || kitchen.idSppg);
      App.showToast(`Dapur ${kitchen.idSppg || kitchen.id} berhasil dihapus dari database SPPG.`, 'info');
      this.render(document.getElementById('main-content-area'), 'dapur');
    }
  },

  closeModal: function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('show', 'active');
      modal.remove();
    }
  }
};
