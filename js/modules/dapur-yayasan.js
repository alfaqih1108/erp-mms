/**
 * ERP MMS - Modul Khusus Yayasan: Pelaporan Transaksi Dapur Program & Saldo Virtual Account (VA)
 * Digunakan oleh Pengelola Dapur Yayasan, Staff Keuangan, dan Direksi
 * Features:
 * 1. Filter Dinamis Tanggal & Dapur Delegasi Maker di Atas Summary KPI
 * 2. Perhitungan Akurat Porsi Besar (Budget Rp 10.000) & Porsi Kecil (Budget Rp 8.000)
 * 3. Upload & Lampiran Dokumen SPM (Surat Perintah Membayar / Nota Belanja Bahan Baku)
 * 4. Analisis Biaya Efisiensi per Porsi Makanan (Rp/Porsi vs Target Anggaran)
 * 5. Jaringan Distribusi Dapur Aktif Berdasarkan Delegasi Maker di Master Database
 */

window.DapurYayasanModule = {
  selectedKitchenFilter: 'ALL',
  selectedDateFilter: 'ALL',
  startDate: (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10)),
  endDate: (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10)),
  customDate: (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10)),
  uploadedSPMUrl: '',
  uploadedSPMName: '',

  render: function(container) {
    if (!container) return;

    const todayStr = (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10));
    const currentMonthStr = todayStr.slice(0, 7);
    const nowD = new Date();
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthsFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    const todayFormatted = `${nowD.getDate()} ${monthsShort[nowD.getMonth()]} ${nowD.getFullYear()}`;
    const thisMonthFormatted = `${monthsFull[nowD.getMonth()]} ${nowD.getFullYear()}`;

    const allReports = DB.getKitchenReports() || [];
    const allKitchens = DB.getKitchens() || [];
    const user = DB.getCurrentUser();
    const isMaker = (user.role === 'MAKER_YAYASAN');

    // 1. Dapur yang didelegasikan ke user ini
    const delegatedKitchens = isMaker 
      ? allKitchens.filter(k => k.makerYayasan && (k.makerYayasan.includes(user.name) || k.makerYayasan.includes(user.id)))
      : allKitchens;

    // 2. Filter Laporan berdasarkan Akses Role & Pilihan Filter
    const activeKitchensForReports = isMaker ? delegatedKitchens : allKitchens;
    const activeKitchenNames = activeKitchensForReports.map(k => (k.namaDapur || k.name || '').toLowerCase());
    const activeKitchenIds = activeKitchensForReports.map(k => (k.id || '').toLowerCase());
    const activeKitchenSppgs = activeKitchensForReports.map(k => (k.idSppg || '').toLowerCase());

    const filteredReports = allReports.filter(r => {
      // Role scope check
      if (isMaker) {
        const rKName = (r.kitchenName || '').toLowerCase();
        const rKId = (r.kitchenId || '').toLowerCase();
        const isMyKitchen = activeKitchenNames.some(name => rKName.includes(name) || name.includes(rKName)) ||
                            activeKitchenIds.includes(rKId) ||
                            activeKitchenSppgs.some(sppg => rKName.includes(sppg));
        if (!isMyKitchen) return false;
      }

      // Kitchen Dropdown Filter
      if (this.selectedKitchenFilter !== 'ALL') {
        const targetKitchen = allKitchens.find(k => (k.id === this.selectedKitchenFilter || k.idSppg === this.selectedKitchenFilter));
        const filterName = targetKitchen ? (targetKitchen.namaDapur || targetKitchen.name).toLowerCase() : '';
        const filterId = (this.selectedKitchenFilter || '').toLowerCase();
        const rName = (r.kitchenName || '').toLowerCase();
        const rId = (r.kitchenId || '').toLowerCase();

        const matchKitchen = (rId === filterId || (filterName && rName.includes(filterName)) || (filterName && filterName.includes(rName)));
        if (!matchKitchen) return false;
      }

      // Date Filter (Support Range Tanggal Mulai s.d. Tanggal Akhir)
      if (this.selectedDateFilter === 'TODAY' && r.date !== todayStr) {
        return false;
      } else if (this.selectedDateFilter === 'MONTH' && !r.date.startsWith(currentMonthStr)) {
        return false;
      } else if (this.selectedDateFilter === 'RANGE' || this.selectedDateFilter === 'SPECIFIC') {
        const sDate = this.startDate || this.customDate;
        const eDate = this.endDate || this.customDate;
        if (sDate && eDate) {
          if (r.date < sDate || r.date > eDate) return false;
        } else if (sDate && r.date < sDate) {
          return false;
        } else if (eDate && r.date > eDate) {
          return false;
        }
      }

      return true;
    });

    // 3. Dynamic Aggregations & Calculations
    const totalRawCost = filteredReports.reduce((acc, curr) => acc + (Number(curr.rawMaterialCost) || 0), 0);
    const totalOpsCost = filteredReports.reduce((acc, curr) => acc + (Number(curr.operationalCost) || 0), 0);
    const totalCarRentalCost = filteredReports.reduce((acc, curr) => acc + (Number(curr.carRentalCost) || 0), 0);
    const totalDailyExpense = filteredReports.reduce((acc, curr) => {
      const explicit = Number(curr.totalDailyExpense);
      if (!isNaN(explicit) && explicit > 0) return acc + explicit;
      return acc + (Number(curr.rawMaterialCost) || 0) + (Number(curr.operationalCost) || 0) + (Number(curr.carRentalCost) || 0);
    }, 0);

    const totalBeneficiaries = filteredReports.reduce((acc, curr) => acc + (Number(curr.beneficiariesCount) || 0), 0);
    const totalPorsiBesar = filteredReports.reduce((acc, curr) => acc + (Number(curr.porsiBesar) || 0), 0);
    const totalPorsiKecil = filteredReports.reduce((acc, curr) => acc + (Number(curr.porsiKecil) || 0), 0);
    const totalTargetBudget = (totalPorsiBesar * 10000) + (totalPorsiKecil * 8000);

    const avgRawCostPerPortion = totalBeneficiaries > 0 ? Math.round(totalRawCost / totalBeneficiaries) : 0;
    const avgAllInCostPerPortion = totalBeneficiaries > 0 ? Math.round(totalDailyExpense / totalBeneficiaries) : 0;
    const overallEfficiency = totalTargetBudget > 0 ? Math.round((totalRawCost / totalTargetBudget) * 100) : 100;

    // Hitung Saldo VA Terkini
    let latestVABalance = 0;
    let vaAccountLabel = '';
    if (this.selectedKitchenFilter !== 'ALL') {
      const latestKitchenReport = filteredReports.find(r => r.vaBalance !== undefined);
      latestVABalance = latestKitchenReport ? (Number(latestKitchenReport.vaBalance) || 0) : 0;
      vaAccountLabel = latestKitchenReport ? (latestKitchenReport.vaBankName || 'Virtual Account Bank') : 'Rekening VA Dapur';
    } else {
      // Konsolidasi saldo VA dari seluruh dapur yang aktif di filter
      const kitchenBalanceMap = {};
      allReports.forEach(r => {
        const kKey = r.kitchenId || r.kitchenName;
        if (!kitchenBalanceMap[kKey] && r.vaBalance !== undefined) {
          if (!isMaker || activeKitchenNames.some(name => (r.kitchenName || '').toLowerCase().includes(name))) {
            kitchenBalanceMap[kKey] = Number(r.vaBalance) || 0;
          }
        }
      });
      latestVABalance = Object.values(kitchenBalanceMap).reduce((sum, b) => sum + b, 0);
      vaAccountLabel = isMaker ? 'Total Konsolidasi VA Delegasi Saya' : 'Total Saldo Konsolidasi Seluruh VA Dapur';
    }

    // 4. Jaringan Distribusi Dapur Aktif
    const displayedKitchens = isMaker ? delegatedKitchens : allKitchens;

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-mono-badge" style="color: #F87171; background: rgba(239, 68, 68, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                Operasional Program & Akuntabilitas Yayasan
              </span>
              ${isMaker ? `
                <span style="font-size: 11.5px; color: #34D399; font-weight: 500; font-style: italic;">
                  ● Login sebagai Maker Yayasan (Akses Dapur Delegasi: ${delegatedKitchens.length} Titik)
                </span>
              ` : `
                <span style="font-size: 11.5px; color: #60A5FA; font-weight: 500; font-style: italic;">
                  ● Mode Akses Eksekutif (Konsolidasi Seluruh Dapur SPPG)
                </span>
              `}
            </div>
            <h1 style="font-size: 26px; font-weight: 700; margin-top: 4px;">Pelaporan Transaksi Dapur & Saldo Virtual Account (VA)</h1>
          </div>
          
          <div style="display: flex; gap: 12px; flex-wrap: wrap;">
            <button class="btn-nalar-primary" onclick="DapurYayasanModule.openReportModal()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              + Input Laporan Transaksi Dapur Baru
            </button>
          </div>
        </div>

        <!-- Filter Bar di Atas Saldo / Summary KPI Cards -->
        <div class="nalar-card" style="margin-bottom: 36px; padding: 18px 22px; background: rgba(18, 14, 10, 0.88); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-md); box-shadow: 0 4px 20px rgba(0,0,0,0.4);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            
            <!-- Left Info -->
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; align-items: center; justify-content: center; font-size: 16px;">
                🔍
              </div>
              <div>
                <div style="font-size: 12px; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.05em;">
                  Filter Analisis Transaksi & Saldo VA
                </div>
                <div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 2px;">
                  ${isMaker ? 'Menyesuaikan summary berdasarkan tanggal & dapur yang didelegasikan ke Anda' : 'Pilih tanggal & dapur tertentu atau tampilkan konsolidasi seluruh dapur'}
                </div>
              </div>
            </div>

            <!-- Right Controls -->
            <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
              
              <!-- Dapur Selector -->
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Dapur SPPG:</span>
                <select id="dy-filter-kitchen" class="form-control" style="width: auto; min-width: 240px; font-size: 12px; font-weight: 500;" onchange="DapurYayasanModule.handleKitchenFilterChange(this.value)">
                  ${isMaker ? `
                    <option value="ALL" ${this.selectedKitchenFilter === 'ALL' ? 'selected' : ''}>
                      🍳 Semua Dapur Delegasi Saya (${delegatedKitchens.length} Titik)
                    </option>
                    ${delegatedKitchens.map(k => `
                      <option value="${k.idSppg || k.id}" ${this.selectedKitchenFilter === (k.idSppg || k.id) ? 'selected' : ''}>
                        ${k.idSppg} — ${k.namaDapur || k.name}
                      </option>
                    `).join('')}
                  ` : `
                    <option value="ALL" ${this.selectedKitchenFilter === 'ALL' ? 'selected' : ''}>
                      🌐 Semua Dapur SPPG (Konsolidasi Seluruh Titik)
                    </option>
                    ${allKitchens.map(k => `
                      <option value="${k.idSppg || k.id}" ${this.selectedKitchenFilter === (k.idSppg || k.id) ? 'selected' : ''}>
                        ${k.idSppg} — ${k.namaDapur || k.name}
                      </option>
                    `).join('')}
                  `}
                </select>
              </div>

              <!-- Date Selector (Range Support) -->
              <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                <span style="font-size: 11.5px; color: var(--text-muted); font-weight: 600;">Periode:</span>
                <select id="dy-filter-date" class="form-control" style="width: auto; min-width: 180px; font-size: 12px; font-weight: 500;" onchange="DapurYayasanModule.handleDateFilterChange(this.value)">
                  <option value="ALL" ${this.selectedDateFilter === 'ALL' ? 'selected' : ''}>🗓️ Semua Riwayat</option>
                  <option value="TODAY" ${this.selectedDateFilter === 'TODAY' ? 'selected' : ''}>📅 Hari Ini (${todayFormatted})</option>
                  <option value="MONTH" ${this.selectedDateFilter === 'MONTH' ? 'selected' : ''}>📆 Bulan Ini (${thisMonthFormatted})</option>
                  <option value="RANGE" ${(this.selectedDateFilter === 'RANGE' || this.selectedDateFilter === 'SPECIFIC') ? 'selected' : ''}>🎯 Rentang Tanggal (Mulai s/d Akhir)...</option>
                </select>

                ${(this.selectedDateFilter === 'RANGE' || this.selectedDateFilter === 'SPECIFIC') ? `
                  <div style="display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.5); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 6px; padding: 4px 10px;">
                    <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Mulai:</span>
                    <input type="date" id="dy-start-date" class="form-control" value="${this.startDate || this.customDate}" 
                           style="width: 130px; padding: 4px 8px; font-size: 11.5px; margin: 0; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); color: #fff;"
                           onchange="DapurYayasanModule.handleStartDateChange(this.value)">
                    <span style="font-size: 11px; color: #FCD34D; font-weight: 700;">s/d</span>
                    <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">Sampai:</span>
                    <input type="date" id="dy-end-date" class="form-control" value="${this.endDate || this.customDate}" 
                           style="width: 130px; padding: 4px 8px; font-size: 11.5px; margin: 0; background: rgba(255,255,255,0.06); border: 1px solid var(--border-subtle); color: #fff;"
                           onchange="DapurYayasanModule.handleEndDateChange(this.value)">
                  </div>
                ` : ''}
              </div>

            </div>

          </div>
        </div>

        <!-- 6 KPI HUD Chips Dapur & VA (Belanja Bahan, Ops, Sewa Mobil, Total, Porsi, Saldo VA, Biaya/Porsi) -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; margin-bottom: 28px;">
          
          <!-- Chip 1: Total Belanja Bahan Baku -->
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Belanja Bahan Baku</span>
              <span style="font-size: 10px; color: #F87171; font-weight: 700; background: rgba(239,68,68,0.12); padding: 1px 5px; border-radius: 3px;">BAHAN POKOK</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCA5A5; font-weight: 700; font-size: 20px;">
              Rp ${totalRawCost.toLocaleString('id-ID')}
            </div>
            <div class="kpi-chip-footer">
              <span class="stat-trend-up">●</span> ${filteredReports.length} laporan belanja tercatat
            </div>
          </div>

          <!-- Chip 2: Biaya Operasional Hari Itu -->
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Biaya Operasional</span>
              <span style="font-size: 10px; color: #FCD34D; font-weight: 700; background: rgba(245,158,11,0.12); padding: 1px 5px; border-radius: 3px;">GAS & UTILITAS</span>
            </div>
            <div class="kpi-chip-value" style="color: #FDE68A; font-weight: 700; font-size: 20px;">
              Rp ${totalOpsCost.toLocaleString('id-ID')}
            </div>
            <div class="kpi-chip-footer" style="color: #FCD34D;">
              <span>● Gas LPG, bumbu & utilitas harian</span>
            </div>
          </div>

          <!-- Chip 3: Biaya Sewa Mobil (Opsional) -->
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Biaya Sewa Mobil</span>
              <span style="font-size: 10px; color: #60A5FA; font-weight: 700; background: rgba(59,130,246,0.12); padding: 1px 5px; border-radius: 3px;">DISTRIBUSI</span>
            </div>
            <div class="kpi-chip-value" style="color: #93C5FD; font-weight: 700; font-size: 20px;">
              Rp ${totalCarRentalCost.toLocaleString('id-ID')}
            </div>
            <div class="kpi-chip-footer" style="color: #93C5FD;">
              <span>● Armada pengantaran porsi santri</span>
            </div>
          </div>

          <!-- Chip 4: Total Akumulasi Pengeluaran Dapur -->
          <div class="kpi-chip hud-corner-box" style="border-color: rgba(255, 75, 1, 0.4); background: linear-gradient(180deg, rgba(255,75,1,0.08) 0%, rgba(20,15,10,0.6) 100%);">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title" style="color: var(--brand-orange); font-weight: 700;">Total Pengeluaran</span>
              <span style="font-size: 10px; color: #FF4B01; font-weight: 800; background: rgba(255,75,1,0.15); padding: 1px 5px; border-radius: 3px;">ALL-IN BIAYA</span>
            </div>
            <div class="kpi-chip-value" style="color: #FF8A4C; font-weight: 800; font-size: 22px;">
              Rp ${totalDailyExpense.toLocaleString('id-ID')}
            </div>
            <div class="kpi-chip-footer" style="color: #FF8A4C; font-weight: 500;">
              <span>● Bahan + Operasional + Sewa Mobil</span>
            </div>
          </div>

          <!-- Chip 5: Total Penerima Manfaat & Porsi -->
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Penerima Manfaat</span>
              <span style="font-size: 10px; color: #34D399; font-weight: 700; background: rgba(52,211,153,0.12); padding: 1px 5px; border-radius: 3px;">PORSI TERBAGI</span>
            </div>
            <div class="kpi-chip-value" style="color: #6EE7B7; font-weight: 700; font-size: 20px;">
              ${totalBeneficiaries.toLocaleString('id-ID')} <span style="font-size: 13px; font-weight: 400; color: var(--text-muted);">Porsi</span>
            </div>
            <div class="kpi-chip-footer" style="display: flex; gap: 8px; flex-wrap: wrap;">
              <span style="color: #FCD34D; font-size: 10.5px;">● ${totalPorsiBesar.toLocaleString('id-ID')} Bsr</span>
              <span style="color: #60A5FA; font-size: 10.5px;">● ${totalPorsiKecil.toLocaleString('id-ID')} Kcl</span>
            </div>
          </div>

          <!-- Chip 6: Saldo Terakhir Virtual Account (VA) -->
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Saldo Virtual Account</span>
              <span style="font-size: 10px; color: #38BDF8; font-weight: 700; background: rgba(56,189,248,0.12); padding: 1px 5px; border-radius: 3px;">MUTASI VA</span>
            </div>
            <div class="kpi-chip-value" style="color: #7DD3FC; font-weight: 700; font-size: 20px;">
              Rp ${latestVABalance.toLocaleString('id-ID')}
            </div>
            <div class="kpi-chip-footer" style="color: #7DD3FC; font-size: 10.5px; font-style: italic;">
              <span>${vaAccountLabel}</span>
            </div>
          </div>

          <!-- Chip 7: Biaya Rata-Rata per Porsi Makanan -->
          <div class="kpi-chip hud-corner-box">
            <div class="kpi-chip-header">
              <span class="kpi-chip-title">Biaya per Porsi Makanan</span>
              <span style="font-size: 10px; font-weight: 700; color: ${overallEfficiency <= 100 ? '#34D399' : '#F87171'};">
                ${overallEfficiency <= 100 ? '🟢 EFISIEN (' + overallEfficiency + '%)' : '🔴 OVER BUDGET'}
              </span>
            </div>
            <div class="kpi-chip-value" style="color: #FDE68A; font-weight: 700; font-size: 20px;">
              Rp ${avgRawCostPerPortion.toLocaleString('id-ID')} <span style="font-size: 12px; font-weight: 400; color: var(--text-muted);">/ porsi</span>
            </div>
            <div class="kpi-chip-footer" style="font-size: 10.5px; color: var(--text-muted);">
              All-In: <strong style="color: #fff;">Rp ${avgAllInCostPerPortion.toLocaleString('id-ID')}</strong> · Target: Rp ${totalTargetBudget.toLocaleString('id-ID')}
            </div>
          </div>

        </div>

        <!-- Master Dapur Quick View Cards (Hanya muncul berdasarkan penentuan peranan Maker di Database Master) -->
        <div class="nalar-card" style="margin-bottom: 28px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="text-mono-badge" style="color: #FCD34D;">Jaringan Distribusi Dapur</span>
                <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                  (Berdasarkan Delegasi Peran Maker di Database SPPG)
                </span>
              </div>
              <h3 style="font-size: 18px; margin-top: 2px;">
                ${isMaker ? 'Daftar Dapur Program yang Didelegasikan ke Anda' : 'Daftar Seluruh Titik Dapur Program Yayasan Aktif'}
              </h3>
            </div>

            ${!isMaker ? `
              <button class="btn-nalar-secondary" onclick="App.switchTab('admin-dapur')" style="font-size: 12px; padding: 6px 14px; border-color: rgba(245, 158, 11, 0.4); color: #FCD34D;">
                ⚙️ Buka Database & Kelola Delegasi Maker
              </button>
            ` : `
              <div style="font-size: 11.5px; color: #34D399; font-weight: 600; background: rgba(52, 211, 153, 0.12); padding: 4px 10px; border-radius: 4px; border: 1px solid rgba(52, 211, 153, 0.25);">
                ✓ ${displayedKitchens.length} Titik Dapur Diberikan Otoritas Pelaporan
              </div>
            `}
          </div>

          ${displayedKitchens.length === 0 ? `
            <div style="background: rgba(0,0,0,0.3); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 32px; text-align: center; color: var(--text-muted);">
              <div style="font-size: 28px; margin-bottom: 6px;">🍳</div>
              <div style="font-weight: 600; color: #fff; font-size: 14px;">Belum Ada Dapur yang Didelegasikan</div>
              <p style="font-size: 12.5px; margin-top: 4px;">
                Akun Maker Anda belum ditautkan ke titik dapur manapun pada pengaturan database dapur SPPG oleh Staf Ahli Keuangan.
              </p>
            </div>
          ` : `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
              ${displayedKitchens.map(k => {
                const isSelected = (this.selectedKitchenFilter === (k.idSppg || k.id));
                return `
                  <div style="background: ${isSelected ? 'rgba(245, 158, 11, 0.08)' : 'var(--bg-card-elevated)'}; border: 1px solid ${isSelected ? 'var(--brand-orange)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); padding: 16px 18px; display: flex; flex-direction: column; justify-content: space-between; transition: all 0.2s ease; cursor: pointer;"
                       onclick="DapurYayasanModule.handleKitchenCardClick('${k.idSppg || k.id}')"
                       title="Klik untuk filter summary dapur ini">
                    
                    <div style="display: flex; align-items: flex-start; gap: 14px; margin-bottom: 12px;">
                      <div style="width: 42px; height: 42px; border-radius: var(--radius-sm); background: rgba(225, 29, 72, 0.15); border: 1px solid rgba(225, 29, 72, 0.3); display: flex; align-items: center; justify-content: center; color: #FB7185; font-size: 20px; flex-shrink: 0;">
                        🍲
                      </div>
                      <div style="flex: 1;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                          <span style="font-size: 11px; font-weight: 700; color: #60A5FA; background: rgba(59,130,246,0.12); padding: 1px 6px; border-radius: 4px; border: 1px solid rgba(59,130,246,0.25);">
                            ${k.idSppg || k.id}
                          </span>
                          <span class="badge-status ${k.status === 'AKTIF' ? 'badge-approved' : 'badge-rejected'}" style="font-size: 9.5px; padding: 2px 6px;">
                            ${k.status === 'AKTIF' ? '🟢 Aktif' : '🔴 Nonaktif'}
                          </span>
                        </div>
                        <div style="font-size: 13.5px; font-weight: 600; color: #fff; margin-top: 4px; line-height: 1.3;">
                          ${k.namaDapur || k.name}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px;">
                          📍 ${k.kotaKabupaten || k.location || '-'}, ${k.provinsi || '-'}
                        </div>
                      </div>
                    </div>

                    <div style="border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary);">
                      <div>
                        👩‍🍳 Maker: <strong style="color: #FCD34D;">${k.makerYayasan || 'Belum Ditetapkan'}</strong>
                      </div>
                      <div style="color: #6EE7B7; font-weight: 500;">
                        🍱 ${k.kapasitasPorsi || 500} porsi/hari
                      </div>
                    </div>

                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Tabel Riwayat Laporan Transaksi Dapur & Mutasi Saldo VA -->
        <div class="nalar-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div>
              <span class="text-mono-badge" style="color: var(--text-muted);">Rekap Transaksi & Audit</span>
              <h3 style="font-size: 18px; margin-top: 2px;">Riwayat Pelaporan Transaksi Bahan Baku, Biaya Operasional, Sewa Mobil & Saldo VA</h3>
            </div>
            <div style="font-size: 12px; color: var(--text-muted); background: rgba(0,0,0,0.3); padding: 4px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
              Menampilkan <strong style="color: #fff;">${filteredReports.length}</strong> laporan
            </div>
          </div>

          <div class="nalar-table-container" style="overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: var(--radius-sm); border: 1px solid var(--border-card);">
            <table class="nalar-table" style="min-width: 1850px; border-collapse: separate; border-spacing: 0;">
              <thead>
                <tr>
                  <th style="min-width: 150px; white-space: nowrap;">No. Laporan</th>
                  <th style="min-width: 115px; white-space: nowrap;">Tanggal</th>
                  <th style="min-width: 220px;">Nama Dapur & SPPG</th>
                  <th style="min-width: 175px; white-space: nowrap; background: rgba(245, 158, 11, 0.08); color: #FCD34D;">Target Budget (Anggaran)</th>
                  <th style="min-width: 160px; white-space: nowrap;">Belanja Bahan Baku</th>
                  <th style="min-width: 150px; white-space: nowrap;">Biaya Operasional</th>
                  <th style="min-width: 135px; white-space: nowrap;">Sewa Mobil</th>
                  <th style="min-width: 170px; white-space: nowrap; background: rgba(255, 75, 1, 0.08); color: #FF8A4C;">Total Pengeluaran</th>
                  <th style="min-width: 160px; white-space: nowrap;">Rincian Porsi</th>
                  <th style="min-width: 175px; white-space: nowrap;">Biaya / Porsi</th>
                  <th style="min-width: 160px; white-space: nowrap;">Saldo Akhir VA</th>
                  <th style="min-width: 155px; white-space: nowrap;">Lampiran SPM</th>
                  <th style="min-width: 165px;">Pelapor (Maker)</th>
                  <th style="min-width: 90px; text-align: center; white-space: nowrap;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${filteredReports.length === 0 ? `
                  <tr>
                    <td colspan="14" style="text-align: center; color: var(--text-muted); padding: 42px;">
                      Belum ada laporan transaksi dapur yang sesuai dengan kriteria filter saat ini.
                    </td>
                  </tr>
                ` : filteredReports.map(r => {
                  const pBesar = Number(r.porsiBesar) || 0;
                  const pKecil = Number(r.porsiKecil) || 0;
                  const rawCost = Number(r.rawMaterialCost) || 0;
                  const opsCost = Number(r.operationalCost) || 0;
                  const carCost = Number(r.carRentalCost) || 0;
                  const totExpense = Number(r.totalDailyExpense) || (rawCost + opsCost + carCost);

                  // Auto generate perhitungan target budget: Porsi Besar (@Rp10.000) + Porsi Kecil (@Rp8.000)
                  const targetBudg = Number(r.targetBudget) || ((pBesar * 10000) + (pKecil * 8000));
                  const eff = targetBudg > 0 ? Math.round((rawCost / targetBudg) * 100) : 100;
                  const costPerPortionAllIn = (r.beneficiariesCount || (pBesar + pKecil)) > 0 ? Math.round(totExpense / (r.beneficiariesCount || (pBesar + pKecil))) : 0;
                  
                  return `
                    <tr>
                      <td style="color: #FB7185; font-weight: 700; white-space: nowrap; font-family: monospace; font-size: 12.5px;">
                        ${r.id}
                      </td>
                      <td style="font-size: 12px; white-space: nowrap; color: #E2E8F0;">
                        ${r.date}
                      </td>
                      <td style="min-width: 220px;">
                        <div style="font-weight: 600; color: #fff; font-size: 13px; line-height: 1.35;">${r.kitchenName}</div>
                        <div style="font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 2px;">
                          Titik Dapur SPPG Terdaftar
                        </div>
                      </td>
                      <td style="background: rgba(245, 158, 11, 0.04); border-left: 1px solid rgba(245, 158, 11, 0.15); border-right: 1px solid rgba(245, 158, 11, 0.15); white-space: nowrap;">
                        <div style="color: #FDE68A; font-weight: 700; font-size: 13px;">
                          Rp ${targetBudg.toLocaleString('id-ID')}
                        </div>
                        <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                          Budget Auto-Generate
                        </div>
                      </td>
                      <td style="color: #FCA5A5; font-weight: 600; font-size: 13px; white-space: nowrap;">
                        Rp ${rawCost.toLocaleString('id-ID')}
                      </td>
                      <td style="color: #FDE68A; font-weight: 600; font-size: 13px; white-space: nowrap;">
                        Rp ${opsCost.toLocaleString('id-ID')}
                      </td>
                      <td style="color: ${carCost > 0 ? '#93C5FD' : 'var(--text-muted)'}; font-weight: 600; font-size: 12.5px; white-space: nowrap;">
                        ${carCost > 0 ? `Rp ${carCost.toLocaleString('id-ID')}` : '<span style="font-style: italic; font-weight: 400; font-size: 11px; color: var(--text-dim);">- (Tidak Ada)</span>'}
                      </td>
                      <td style="color: #FF8A4C; font-weight: 800; font-size: 13.5px; background: rgba(255, 75, 1, 0.06); white-space: nowrap;">
                        Rp ${totExpense.toLocaleString('id-ID')}
                      </td>
                      <td style="white-space: nowrap;">
                        <div style="font-weight: 700; color: #6EE7B7; font-size: 12.5px;">
                          🍱 ${(r.beneficiariesCount || (pBesar + pKecil)).toLocaleString('id-ID')} Porsi
                        </div>
                        <div style="display: flex; gap: 8px; font-size: 11px; margin-top: 3px;">
                          <span style="color: #FCD34D; font-weight: 500;">● ${pBesar.toLocaleString('id-ID')} Bsr</span>
                          <span style="color: #60A5FA; font-weight: 500;">● ${pKecil.toLocaleString('id-ID')} Kcl</span>
                        </div>
                      </td>
                      <td style="white-space: nowrap;">
                        <div style="color: #FDE68A; font-weight: 600; font-size: 12px;">
                          Bahan: Rp ${(r.costPerPortion || 0).toLocaleString('id-ID')}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                          All-In: <strong style="color: #fff;">Rp ${costPerPortionAllIn.toLocaleString('id-ID')}</strong>
                        </div>
                        <div style="font-size: 10px; margin-top: 4px;">
                          <span class="badge-status ${eff <= 100 ? 'badge-approved' : 'badge-rejected'}" style="font-size: 9.5px; padding: 2px 6px;">
                            ${eff <= 100 ? `🟢 Hemat (${eff}%)` : `🔴 Over (${eff}%)`}
                          </span>
                        </div>
                      </td>
                      <td style="white-space: nowrap;">
                        <div style="color: #7DD3FC; font-weight: 700; font-size: 13px;">
                          Rp ${(r.vaBalance || 0).toLocaleString('id-ID')}
                        </div>
                        <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 2px;">
                          ${r.vaBankName || 'Bank Mandiri VA'}
                        </div>
                      </td>
                      <td style="white-space: nowrap;">
                        ${r.spmFileName ? `
                          <button type="button" class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 10.5px; color: #FCD34D; border-color: rgba(245, 158, 11, 0.4);"
                                  onclick="DapurYayasanModule.openSPMLightbox('${r.spmAttachmentUrl || ''}', '${r.spmFileName || 'Dokumen SPM'}')">
                            📄 ${r.spmFileName.length > 14 ? r.spmFileName.slice(0, 12) + '...' : r.spmFileName}
                          </button>
                        ` : `
                          <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                            📄 SPM Terlampir
                          </span>
                        `}
                      </td>
                      <td style="min-width: 165px;">
                        <div style="font-weight: 500; color: #fff; font-size: 12px;">${r.reporterName}</div>
                        <div style="font-size: 10.5px; color: var(--text-muted); font-style: italic; margin-top: 2px;">${r.createdAt || '-'}</div>
                      </td>
                      <td style="text-align: center; white-space: nowrap;">
                        <button type="button" class="btn-nalar-secondary" style="padding: 4px 12px; font-size: 11.5px;" 
                                onclick="DapurYayasanModule.viewReportDetail('${r.id}')">
                          👁️ Detail
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <!-- Modal Input Laporan Dapur -->
      <div id="modal-kitchen-report" class="modal-backdrop">
        <div class="modal-box" style="max-width: 720px;">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #F87171;">Formulir Harian Maker Yayasan</span>
              <h3 class="modal-title" style="margin-top: 2px;">Input Laporan Transaksi Dapur & Saldo VA</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-kitchen-report')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <form id="form-kitchen-report" onsubmit="DapurYayasanModule.handleSubmit(event)">
            <div class="modal-body">
              
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Pilih Dapur Program (Database SPPG) <span style="color: #F87171;">*</span></label>
                  <select id="kr-kitchen-select" class="form-control" required style="font-weight: 500;">
                    ${(isMaker ? delegatedKitchens : allKitchens).map(k => `
                      <option value="${k.idSppg} — ${k.namaDapur || k.name}">${k.idSppg} — ${k.namaDapur || k.name}</option>
                    `).join('')}
                  </select>
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 3px; font-style: italic;">
                    ${isMaker ? '*Menampilkan daftar dapur yang didelegasikan ke akun Anda' : '*Menampilkan seluruh database master dapur SPPG'}
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Tanggal Pelaporan <span style="color: #F87171;">*</span></label>
                  <input type="date" id="kr-date" class="form-control" value="${todayStr}" required>
                </div>
              </div>

              <!-- Distribusi Porsi Makanan (Porsi Besar @10k & Porsi Kecil @8k) -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span class="text-mono-badge" style="color: #6EE7B7;">Distribusi Penerima Manfaat & Porsi</span>
                  <span id="kr-live-budget-estimate" style="font-size: 11.5px; color: #FCD34D; font-weight: 600;">
                    Target Anggaran Bahan: Rp 0
                  </span>
                </div>

                <div class="form-row">
                  <div class="form-group" style="margin-bottom: 8px;">
                    <label class="form-label">Total Penerima Manfaat (Porsi) <span style="color: #F87171;">*</span></label>
                    <input type="number" id="kr-beneficiaries" class="form-control" placeholder="Contoh: 650" min="1" required 
                           oninput="DapurYayasanModule.handlePorsiTotalChange(this.value)"
                           style="font-weight: 700; color: #6EE7B7;">
                  </div>
                  <div class="form-group" style="margin-bottom: 8px;">
                    <label class="form-label">Jumlah Porsi Besar (Budget Rp 10.000) <span style="color: #F87171;">*</span></label>
                    <input type="number" id="kr-porsi-besar" class="form-control" placeholder="Contoh: 400" min="0" required 
                           oninput="DapurYayasanModule.recalculatePorsiBreakdown('besar')"
                           style="font-weight: 600; color: #FCD34D;">
                  </div>
                  <div class="form-group" style="margin-bottom: 8px;">
                    <label class="form-label">Jumlah Porsi Kecil (Budget Rp 8.000) <span style="color: #F87171;">*</span></label>
                    <input type="number" id="kr-porsi-kecil" class="form-control" placeholder="Contoh: 250" min="0" required 
                           oninput="DapurYayasanModule.recalculatePorsiBreakdown('kecil')"
                           style="font-weight: 600; color: #60A5FA;">
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-muted); font-style: italic; margin-top: 4px;">
                  <span>*Porsi Besar: Santri Dewasa (Standar Rp 10.000/porsi)</span>
                  <span>*Porsi Kecil: Santri Anak/Balita (Standar Rp 8.000/porsi)</span>
                </div>
              </div>

              <!-- Rincian Biaya Pengeluaran Dapur (Bahan Baku + Biaya Operasional + Sewa Mobil) -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                  <span class="text-mono-badge" style="color: #FCA5A5;">Rincian Pengeluaran Dapur Hari Ini</span>
                  <div id="kr-live-total-expense" style="font-size: 13px; font-weight: 700; color: #FF8A4C;">
                    Total Pengeluaran: Rp 0
                  </div>
                </div>

                <!-- 1. Total Belanja Bahan Baku (Wajib) -->
                <div class="form-group" style="margin-bottom: 12px;">
                  <label class="form-label">1. Total Belanja Bahan Baku Aktual (Rp) <span style="color: #F87171;">*</span></label>
                  <input type="number" id="kr-raw-cost" class="form-control" placeholder="Contoh: 4850000" min="1000" required
                         oninput="DapurYayasanModule.recalculateLiveTotals()"
                         style="font-weight: 700; color: #FCA5A5;">
                  <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                    *Pembelian beras, sayur mayur, lauk pauk, telur/daging, dan bahan pangan pokok.
                  </div>
                </div>

                <div class="form-row">
                  <!-- 2. Biaya Operasional Hari Itu (Wajib) -->
                  <div class="form-group" style="margin-bottom: 8px;">
                    <label class="form-label">2. Biaya Operasional Hari Itu (Rp) <span style="color: #F87171;">*</span></label>
                    <input type="number" id="kr-operational-cost" class="form-control" placeholder="Contoh: 450000" min="0" required
                           oninput="DapurYayasanModule.recalculateLiveTotals()"
                           style="font-weight: 600; color: #FCD34D;">
                    <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                      *Gas LPG, bumbu pelengkap, air galon, plastik kemasan, & utilitas harian.
                    </div>
                  </div>

                  <!-- 3. Biaya Sewa Mobil (Opsional) -->
                  <div class="form-group" style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                      <label class="form-label">3. Biaya Sewa Mobil (Rp)</label>
                      <span style="font-size: 10px; color: #60A5FA; font-weight: 700; background: rgba(59,130,246,0.15); padding: 1px 5px; border-radius: 3px;">OPSIONAL</span>
                    </div>
                    <input type="number" id="kr-car-rental-cost" class="form-control" placeholder="0 / Kosongkan jika tidak ada sewa" min="0" value="0"
                           oninput="DapurYayasanModule.recalculateLiveTotals()"
                           style="font-weight: 600; color: #93C5FD;">
                    <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                      *Sewa pick-up/van pengantaran makanan ke asrama santri jika ada.
                    </div>
                  </div>
                </div>

                <div id="kr-live-efficiency-badge" style="font-size: 11.5px; color: var(--text-muted); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-subtle);">
                  Masukkan rincian biaya untuk melihat kalkulasi biaya per porsi dan efisiensi.
                </div>
              </div>

              <!-- Lampiran Dokumen SPM (Surat Perintah Membayar / Nota Pembelian) -->
              <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label">Lampiran Dokumen SPM (Surat Perintah Membayar / Nota Belanja Bahan Baku) <span style="color: #F87171;">*</span></label>
                
                <div style="background: rgba(255,255,255,0.02); border: 2px dashed rgba(245, 158, 11, 0.4); border-radius: var(--radius-md); padding: 18px; text-align: center; position: relative;">
                  <input type="file" id="kr-spm-file" accept="image/*,.pdf,.doc,.docx" 
                         style="position: absolute; top:0; left:0; width:100%; height:100%; opacity:0; cursor:pointer; z-index:2;"
                         onchange="DapurYayasanModule.handleSPMFileUpload(event)">
                  
                  <div id="kr-spm-upload-preview">
                    <div style="font-size: 26px; margin-bottom: 4px;">📑</div>
                    <div style="font-weight: 600; color: #fff; font-size: 13px;">
                      Klik atau Seret Berkas Dokumen SPM di Sini
                    </div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                      Format: File Dokumen SPM / Nota Belanja (JPG, PNG, PDF maks 10MB)
                    </div>
                  </div>
                </div>

                <input type="hidden" id="kr-spm-url" value="">
                <input type="hidden" id="kr-spm-filename" value="">
              </div>

              <!-- Saldo VA Bank -->
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Nama Bank Virtual Account (VA) <span style="color: #F87171;">*</span></label>
                  <input type="text" id="kr-va-bank" class="form-control" value="Bank Mandiri VA - Dapur Yayasan" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Saldo Terakhir VA per Tanggal Lapor (Rp) <span style="color: #F87171;">*</span></label>
                  <input type="number" id="kr-va-balance" class="form-control" placeholder="Contoh: 32450000" min="0" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Catatan Operasional Dapur & Keterangan</label>
                <textarea id="kr-notes" class="form-control" rows="2" placeholder="Tuliskan catatan penyaluran, kendala, atau kondisi logistik di dapur hari ini..."></textarea>
              </div>

            </div>
            <div class="modal-footer">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-kitchen-report')">Batal</button>
              <button type="submit" class="btn-nalar-primary">Submit Laporan Dapur & SPM</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Detail Laporan -->
      <div id="modal-kitchen-detail-view" class="modal-backdrop">
        <div class="modal-box" style="max-width: 650px;">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #60A5FA;">Audit Detail Laporan & SPM</span>
              <h3 id="dt-report-id" class="modal-title" style="margin-top: 2px;">Detail Laporan Dapur</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-kitchen-detail-view')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body">
            <div id="dt-report-body"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-kitchen-detail-view')">Tutup</button>
          </div>
        </div>
      </div>

      <!-- Modal SPM Lightbox Preview -->
      <div id="modal-spm-lightbox" class="modal-backdrop">
        <div class="modal-box" style="max-width: 720px;">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #FCD34D;">Dokumen Lampiran SPM</span>
              <h3 id="spm-lightbox-title" class="modal-title" style="margin-top: 2px;">Pratinjau Dokumen SPM</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-spm-lightbox')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" style="text-align: center;">
            <div id="spm-lightbox-content" style="max-height: 480px; overflow-y: auto; display: flex; justify-content: center; align-items: center;"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-spm-lightbox')">Tutup</button>
          </div>
        </div>
      </div>
    `;
  },

  handleKitchenFilterChange: function(val) {
    this.selectedKitchenFilter = val;
    this.render(document.getElementById('main-content-area'));
  },

  handleKitchenCardClick: function(kitchenId) {
    if (this.selectedKitchenFilter === kitchenId) {
      this.selectedKitchenFilter = 'ALL';
    } else {
      this.selectedKitchenFilter = kitchenId;
    }
    this.render(document.getElementById('main-content-area'));
  },

  handleDateFilterChange: function(val) {
    this.selectedDateFilter = val;
    this.render(document.getElementById('main-content-area'));
  },

  handleCustomDateChange: function(val) {
    this.customDate = val;
    this.render(document.getElementById('main-content-area'));
  },

  // Interactive Live Calculation Helpers in Modal Form
  handlePorsiTotalChange: function(totalVal) {
    const total = Number(totalVal) || 0;
    const pBesarEl = document.getElementById('kr-porsi-besar');
    const pKecilEl = document.getElementById('kr-porsi-kecil');

    if (pBesarEl && pKecilEl) {
      if (!pBesarEl.value && !pKecilEl.value) {
        const besarEst = Math.round(total * 0.65);
        const kecilEst = total - besarEst;
        pBesarEl.value = besarEst;
        pKecilEl.value = kecilEst;
      }
    }
    this.updateTargetBudgetDisplay();
  },

  recalculatePorsiBreakdown: function(source) {
    const pBesarEl = document.getElementById('kr-porsi-besar');
    const pKecilEl = document.getElementById('kr-porsi-kecil');
    const totalEl = document.getElementById('kr-beneficiaries');

    const pBesar = Number(pBesarEl ? pBesarEl.value : 0) || 0;
    const pKecil = Number(pKecilEl ? pKecilEl.value : 0) || 0;

    if (totalEl) {
      totalEl.value = pBesar + pKecil;
    }
    this.updateTargetBudgetDisplay();
  },

  updateTargetBudgetDisplay: function() {
    const pBesar = Number(document.getElementById('kr-porsi-besar')?.value) || 0;
    const pKecil = Number(document.getElementById('kr-porsi-kecil')?.value) || 0;
    const targetBudget = (pBesar * 10000) + (pKecil * 8000);

    const budgetEl = document.getElementById('kr-live-budget-estimate');
    if (budgetEl) {
      budgetEl.innerHTML = `Target Anggaran Bahan: <strong style="color: #FCD34D;">Rp ${targetBudget.toLocaleString('id-ID')}</strong> (${pBesar} Besar + ${pKecil} Kecil)`;
    }
    this.recalculateLiveTotals();
  },

  recalculateLiveTotals: function() {
    const pBesar = Number(document.getElementById('kr-porsi-besar')?.value) || 0;
    const pKecil = Number(document.getElementById('kr-porsi-kecil')?.value) || 0;
    const rawCost = Number(document.getElementById('kr-raw-cost')?.value) || 0;
    const opsCost = Number(document.getElementById('kr-operational-cost')?.value) || 0;
    const carRentalCost = Number(document.getElementById('kr-car-rental-cost')?.value) || 0;

    const totalPorsi = pBesar + pKecil;
    const targetBudget = (pBesar * 10000) + (pKecil * 8000);
    const totalDailyExpense = rawCost + opsCost + carRentalCost;

    const totalExpenseEl = document.getElementById('kr-live-total-expense');
    if (totalExpenseEl) {
      totalExpenseEl.innerHTML = `Total Pengeluaran: <strong style="color: #FF8A4C;">Rp ${totalDailyExpense.toLocaleString('id-ID')}</strong>`;
    }

    const badgeEl = document.getElementById('kr-live-efficiency-badge');
    if (!badgeEl) return;

    if (rawCost > 0 && totalPorsi > 0 && targetBudget > 0) {
      const avgRawCost = Math.round(rawCost / totalPorsi);
      const avgAllInCost = Math.round(totalDailyExpense / totalPorsi);
      const eff = Math.round((rawCost / targetBudget) * 100);
      const isHemat = (eff <= 100);
      
      badgeEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div>
            <span style="color: ${isHemat ? '#34D399' : '#F87171'}; font-weight: 600;">
              ${isHemat ? `🟢 Biaya Bahan: Rp ${avgRawCost.toLocaleString('id-ID')} / Porsi (Hemat ${100 - eff}% dari target)` : `🔴 Biaya Bahan: Rp ${avgRawCost.toLocaleString('id-ID')} / Porsi (Over ${eff - 100}%)`}
            </span>
            <span style="color: var(--text-muted); margin-left: 8px;">
              · Biaya All-In: <strong style="color: #fff;">Rp ${avgAllInCost.toLocaleString('id-ID')} / Porsi</strong>
            </span>
          </div>
        </div>
      `;
    } else {
      badgeEl.textContent = 'Masukkan rincian biaya untuk melihat kalkulasi biaya per porsi dan efisiensi.';
    }
  },

  recalculateEfficiencyLive: function() {
    this.recalculateLiveTotals();
  },

  handleSPMFileUpload: function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const preview = document.getElementById('kr-spm-upload-preview');
    const urlInput = document.getElementById('kr-spm-url');
    const nameInput = document.getElementById('kr-spm-filename');

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const fileData = uploadEvent.target.result;
      if (urlInput) urlInput.value = fileData;
      if (nameInput) nameInput.value = file.name;

      if (preview) {
        preview.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            <span style="font-size: 24px;">📄</span>
            <div style="text-align: left;">
              <div style="font-size: 13px; font-weight: 600; color: #6EE7B7;">${file.name}</div>
              <div style="font-size: 10.5px; color: var(--text-muted);">${(file.size / 1024).toFixed(1)} KB · Berkas Dokumen SPM Terlampir</div>
            </div>
            <button type="button" class="btn-nalar-secondary" style="padding: 2px 8px; font-size: 10.5px; margin-left: 10px;" onclick="DapurYayasanModule.removeSPMUpload(event)">
              ✕ Ganti
            </button>
          </div>
        `;
      }
    };
    reader.readAsDataURL(file);
  },

  removeSPMUpload: function(e) {
    if (e) e.stopPropagation();
    const fileInput = document.getElementById('kr-spm-file');
    const urlInput = document.getElementById('kr-spm-url');
    const nameInput = document.getElementById('kr-spm-filename');
    const preview = document.getElementById('kr-spm-upload-preview');

    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    if (nameInput) nameInput.value = '';
    if (preview) {
      preview.innerHTML = `
        <div style="font-size: 26px; margin-bottom: 4px;">📑</div>
        <div style="font-weight: 600; color: #fff; font-size: 13px;">
          Klik atau Seret Berkas Dokumen SPM di Sini
        </div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
          Format: File Dokumen SPM / Nota Belanja (JPG, PNG, PDF maks 10MB)
        </div>
      `;
    }
  },

  openReportModal: function() {
    const user = DB.getCurrentUser();
    const isMaker = (user.role === 'MAKER_YAYASAN');
    const select = document.getElementById('kr-kitchen-select');
    
    if (select) {
      const allKitchens = DB.getKitchens() || [];
      const options = isMaker
        ? allKitchens.filter(k => k.makerYayasan && (k.makerYayasan.includes(user.name) || k.makerYayasan.includes(user.id)))
        : allKitchens;

      select.innerHTML = options.map(k => `
        <option value="${k.idSppg} — ${k.namaDapur || k.name}">${k.idSppg} — ${k.namaDapur || k.name}</option>
      `).join('');
    }

    // Reset Form to Fresh State
    const form = document.getElementById('form-kitchen-report');
    if (form) {
      const bEl = document.getElementById('kr-beneficiaries');
      const pbEl = document.getElementById('kr-porsi-besar');
      const pkEl = document.getElementById('kr-porsi-kecil');
      const rawEl = document.getElementById('kr-raw-cost');
      const opsEl = document.getElementById('kr-operational-cost');
      const carEl = document.getElementById('kr-car-rental-cost');
      const notesEl = document.getElementById('kr-notes');

      if (bEl) bEl.value = '';
      if (pbEl) pbEl.value = '';
      if (pkEl) pkEl.value = '';
      if (rawEl) rawEl.value = '';
      if (opsEl) opsEl.value = '';
      if (carEl) carEl.value = '0';
      if (notesEl) notesEl.value = '';
      this.removeSPMUpload();
      this.updateTargetBudgetDisplay();
      this.recalculateLiveTotals();
    }

    App.openModal('modal-kitchen-report');
  },

  handleSubmit: function(e) {
    e.preventDefault();
    const user = DB.getCurrentUser();
    const kitchenSelectVal = document.getElementById('kr-kitchen-select').value;
    const date = document.getElementById('kr-date').value;
    
    const rawMaterialCost = Number(document.getElementById('kr-raw-cost').value) || 0;
    const operationalCost = Number(document.getElementById('kr-operational-cost').value) || 0;
    const carRentalCost = Number(document.getElementById('kr-car-rental-cost').value) || 0;
    const totalDailyExpense = rawMaterialCost + operationalCost + carRentalCost;

    const porsiBesar = Number(document.getElementById('kr-porsi-besar').value) || 0;
    const porsiKecil = Number(document.getElementById('kr-porsi-kecil').value) || 0;
    const beneficiariesCount = (porsiBesar + porsiKecil > 0) ? (porsiBesar + porsiKecil) : (Number(document.getElementById('kr-beneficiaries').value) || 0);

    const spmUrl = document.getElementById('kr-spm-url')?.value || 'https://images.unsplash.com/photo-1554415707-9e4966a64230?w=1000&auto=format&fit=crop&q=80';
    const spmFileName = document.getElementById('kr-spm-filename')?.value || `SPM-${kitchenSelectVal.split(' — ')[0]}-${date.replace(/-/g, '')}.pdf`;

    const vaBankName = document.getElementById('kr-va-bank').value.trim();
    const vaBalance = Number(document.getElementById('kr-va-balance').value) || 0;
    const notes = document.getElementById('kr-notes').value.trim();

    if (!kitchenSelectVal || !date || rawMaterialCost <= 0 || beneficiariesCount <= 0) {
      App.showToast('Mohon lengkapi rincian belanja bahan baku dan jumlah porsi!', 'warn');
      return;
    }

    const report = {
      kitchenName: kitchenSelectVal,
      date,
      reporterId: user.id,
      reporterName: `${user.name} (${user.roleLabel})`,
      rawMaterialCost,
      operationalCost,
      carRentalCost,
      totalDailyExpense,
      porsiBesar,
      porsiKecil,
      beneficiariesCount,
      spmFileName,
      spmAttachmentUrl: spmUrl,
      vaBankName,
      vaBalance,
      notes
    };

    DB.addKitchenReport(report);
    App.closeModal('modal-kitchen-report');
    App.showToast(`Laporan transaksi ${kitchenSelectVal} (Total: Rp ${totalDailyExpense.toLocaleString('id-ID')}) berhasil disimpan!`, 'success');
    this.render(document.getElementById('main-content-area'));
  },

  viewReportDetail: function(reportId) {
    const reports = DB.getKitchenReports() || [];
    const r = reports.find(item => item.id === reportId);
    if (!r) return;

    const titleEl = document.getElementById('dt-report-id');
    const bodyEl = document.getElementById('dt-report-body');

    const pBesar = Number(r.porsiBesar) || 0;
    const pKecil = Number(r.porsiKecil) || 0;
    const rawCost = Number(r.rawMaterialCost) || 0;
    const opsCost = Number(r.operationalCost) || 0;
    const carCost = Number(r.carRentalCost) || 0;
    const totExpense = Number(r.totalDailyExpense) || (rawCost + opsCost + carCost);

    const targetBudg = Number(r.targetBudget) || ((pBesar * 10000) + (pKecil * 8000));
    const eff = targetBudg > 0 ? Math.round((rawCost / targetBudg) * 100) : 100;
    const costPerPortionAllIn = (r.beneficiariesCount || (pBesar + pKecil)) > 0 ? Math.round(totExpense / (r.beneficiariesCount || (pBesar + pKecil))) : 0;

    if (titleEl) titleEl.textContent = `Laporan Transaksi: ${r.id}`;
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 18px; margin-bottom: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <span style="font-size: 14px; font-weight: 700; color: #60A5FA;">${r.kitchenName}</span>
            <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">Tanggal: ${r.date}</span>
          </div>

          <!-- Rincian Biaya Grid -->
          <div style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px; margin-bottom: 14px;">
            <div style="font-size: 11px; font-weight: 700; color: #FCA5A5; text-transform: uppercase; margin-bottom: 8px;">
              Rincian Biaya Pengeluaran Harian:
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px;">
              <div>1. Belanja Bahan Baku: <strong style="color: #FCA5A5;">Rp ${rawCost.toLocaleString('id-ID')}</strong></div>
              <div>2. Biaya Operasional: <strong style="color: #FCD34D;">Rp ${opsCost.toLocaleString('id-ID')}</strong></div>
              <div>3. Sewa Mobil (Distribusi): <strong style="color: #93C5FD;">Rp ${carCost.toLocaleString('id-ID')}</strong></div>
              <div>Total Pengeluaran: <strong style="color: #FF8A4C; font-size: 13px;">Rp ${totExpense.toLocaleString('id-ID')}</strong></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; margin-bottom: 12px;">
            <div>Target Anggaran Bahan: <strong style="color: #FCD34D;">Rp ${targetBudg.toLocaleString('id-ID')}</strong></div>
            <div>Porsi Besar (@Rp10.000): <strong style="color: #FCD34D;">${pBesar} Porsi</strong></div>
            <div>Porsi Kecil (@Rp8.000): <strong style="color: #60A5FA;">${pKecil} Porsi</strong></div>
            <div>Total Penerima Manfaat: <strong style="color: #6EE7B7;">${(r.beneficiariesCount || (pBesar + pKecil))} Porsi</strong></div>
            <div>Biaya Bahan per Porsi: <strong style="color: #FDE68A;">Rp ${(r.costPerPortion || 0).toLocaleString('id-ID')}</strong></div>
            <div>Biaya All-In per Porsi: <strong style="color: #fff;">Rp ${costPerPortionAllIn.toLocaleString('id-ID')}</strong></div>
          </div>

          <div style="border-top: 1px solid var(--border-subtle); padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 12px;">Saldo Akhir VA: <strong style="color: #7DD3FC;">Rp ${(r.vaBalance || 0).toLocaleString('id-ID')}</strong> (${r.vaBankName || 'Bank Mandiri VA'})</div>
            <span class="badge-status ${eff <= 100 ? 'badge-approved' : 'badge-rejected'}" style="font-size: 10px;">
              ${eff <= 100 ? `🟢 Efisiensi ${eff}% (Hemat)` : `🔴 Over Budget (${eff}%)`}
            </span>
          </div>
        </div>

        <!-- Lampiran SPM -->
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px 16px; margin-bottom: 14px;">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">DOKUMEN LAMPIRAN SPM (SURAT PERINTAH MEMBAYAR):</div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">📄</span>
              <span style="font-size: 12.5px; font-weight: 600; color: #fff;">${r.spmFileName || 'Berkas-SPM-Terlampir.pdf'}</span>
            </div>
            <button type="button" class="btn-nalar-secondary" style="padding: 4px 12px; font-size: 11px; color: #FCD34D; border-color: rgba(245, 158, 11, 0.4);"
                    onclick="DapurYayasanModule.openSPMLightbox('${r.spmAttachmentUrl || ''}', '${r.spmFileName || 'Dokumen SPM'}')">
              Pratinjau Dokumen ↗
            </button>
          </div>
        </div>

        <div style="font-size: 12px; color: var(--text-secondary); background: rgba(255,255,255,0.03); padding: 12px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px;">Catatan Operasional:</div>
          <div>${r.notes || 'Tidak ada catatan tambahan.'}</div>
          <div style="font-size: 10.5px; color: var(--text-dim); margin-top: 8px; font-style: italic;">
            Dilaporkan oleh: ${r.reporterName} (${r.createdAt || '-'})
          </div>
        </div>
      `;
    }

    App.openModal('modal-kitchen-detail-view');
  },

  openSPMLightbox: function(url, title) {
    const titleEl = document.getElementById('spm-lightbox-title');
    const contentEl = document.getElementById('spm-lightbox-content');

    if (titleEl) titleEl.textContent = `Dokumen: ${title}`;
    if (contentEl) {
      if (url && (url.startsWith('data:image') || url.startsWith('http'))) {
        contentEl.innerHTML = `
          <div style="width: 100%;">
            <img src="${url}" alt="Dokumen SPM" style="max-width: 100%; max-height: 420px; border-radius: var(--radius-sm); border: 1px solid var(--border-card); box-shadow: 0 8px 30px rgba(0,0,0,0.7);">
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 8px; font-style: italic;">
              ${title} — Terverifikasi Sistem ERP Yayasan
            </div>
          </div>
        `;
      } else {
        contentEl.innerHTML = `
          <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-card); border-radius: var(--radius-md); padding: 36px; text-align: center; width: 100%;">
            <div style="font-size: 40px; margin-bottom: 8px;">📑</div>
            <div style="font-size: 14px; font-weight: 600; color: #fff;">${title}</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
              Dokumen Surat Perintah Membayar (SPM) Digital Tersimpan Aman
            </div>
          </div>
        `;
      }
    }

    App.openModal('modal-spm-lightbox');
  },

  handleKitchenFilterChange: function(kitchenVal) {
    this.selectedKitchenFilter = kitchenVal;
    this.render(document.getElementById('main-content-area'));
  },

  handleKitchenCardClick: function(kitchenId) {
    this.selectedKitchenFilter = kitchenId;
    this.render(document.getElementById('main-content-area'));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  handleDateFilterChange: function(dateVal) {
    this.selectedDateFilter = dateVal;
    this.render(document.getElementById('main-content-area'));
  },

  handleStartDateChange: function(val) {
    this.startDate = val;
    this.customDate = val;
    if (this.endDate && this.startDate > this.endDate) {
      this.endDate = this.startDate;
    }
    this.render(document.getElementById('main-content-area'));
  },

  handleEndDateChange: function(val) {
    this.endDate = val;
    if (this.startDate && this.endDate < this.startDate) {
      this.startDate = this.endDate;
    }
    this.render(document.getElementById('main-content-area'));
  },

  handleCustomDateChange: function(val) {
    this.customDate = val;
    this.startDate = val;
    this.endDate = val;
    this.render(document.getElementById('main-content-area'));
  }
};
