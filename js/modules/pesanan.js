/**
 * ERP MMS - Modul Utama "Pesanan" (PO Execution, Delivery Tracking & FAT Invoice Settlement)
 * 
 * Pengelola Utama (Primary Operators):
 * 1. Muhammad Syafiq Al Ghifari (ID: SA-002, NIKA: K-2026-011 - Staf Ahli Keuangan & Anggaran)
 * 2. Syifa Izzatina (ID: SO-004, NIKA: K-2026-016 - Staff Operasional)
 * 
 * Fitur:
 * - Tracking Pengadaan PR yang telah disetujui Direksi (APPROVED / COMPLETED)
 * - 5 Status Pesanan: Masih dalam antrian, Sudah di pesan, Sedang di kirim, Sudah di terima, Gagal Pengiriman
 * - Live Keyword Filter & Status Tabs
 * - Kirimkan Invoice Vendor ke FAT Officer (Upload File Invoice/Kuitansi max 2MB)
 * - FAT Settlement & Preview Bukti Transfer Bank
 */

window.PesananModule = {
  currentFilter: 'ALL',     // 'ALL', 'DALAM_ANTRIAN', 'SUDAH_DIPESAN', 'SEDANG_DIKIRIM', 'SUDAH_DITERIMA', 'GAGAL_PENGIRIMAN', 'INVOICE_SUBMITTED', 'SETTLEMENT'
  searchQuery: '',
  currentInvoiceFile: { url: null, name: null },
  activeModalPRId: null,

  // Cek apakah user aktif adalah operator yang berhak mengubah status & mengirim invoice
  canManageOrders: function(user) {
    if (!user) user = DB.getCurrentUser();
    if (!user) return false;

    const isDesignatedOperator = (
      user.id === 'SA-002' || 
      user.id === 'SO-004' || 
      (user.nika && (user.nika === 'K-2026-011' || user.nika === 'K-2026-016')) ||
      (user.name && (user.name.includes('Syafiq') || user.name.includes('Syifa Izzatina')))
    );

    const isExecutive = [
      'SUPER_ADMIN',
      'DIREKTUR_UTAMA',
      'DIREKTUR_OPERASIONAL',
      'DIREKTUR_KEUANGAN',
      'FAT_OFFICER'
    ].includes(user.role);

    return isDesignatedOperator || isExecutive;
  },

  // Status Enum & Config
  STATUS_CONFIG: {
    'DALAM_ANTRIAN': {
      label: 'Masih dalam antrian',
      badgeClass: 'badge-pending',
      badgeStyle: 'background: rgba(245,158,11,0.15); color: #FCD34D; border: 1px solid rgba(245,158,11,0.35);',
      icon: '⏳'
    },
    'SUDAH_DIPESAN': {
      label: 'Sudah di pesan',
      badgeClass: 'badge-info',
      badgeStyle: 'background: rgba(59,130,246,0.15); color: #60A5FA; border: 1px solid rgba(59,130,246,0.35);',
      icon: '🛒'
    },
    'SEDANG_DIKIRIM': {
      label: 'Sedang di kirim',
      badgeClass: 'badge-info',
      badgeStyle: 'background: rgba(168,85,247,0.15); color: #C084FC; border: 1px solid rgba(168,85,247,0.35);',
      icon: '🚚'
    },
    'SUDAH_DITERIMA': {
      label: 'Sudah di terima',
      badgeClass: 'badge-approved',
      badgeStyle: 'background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.35);',
      icon: '📦'
    },
    'GAGAL_PENGIRIMAN': {
      label: 'Gagal Pengiriman',
      badgeClass: 'badge-rejected',
      badgeStyle: 'background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.35);',
      icon: '⚠️'
    },
    'INVOICE_SUBMITTED': {
      label: 'Invoice Menunggu FAT',
      badgeClass: 'badge-warning',
      badgeStyle: 'background: rgba(245,158,11,0.2); color: #FBBF24; border: 1px solid rgba(245,158,11,0.4);',
      icon: '📄'
    },
    'SETTLEMENT': {
      label: 'Settlement (Lunas)',
      badgeClass: 'badge-approved',
      badgeStyle: 'background: linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(5,150,105,0.2) 100%); color: #6EE7B7; border: 1px solid #10B981; font-weight: 700;',
      icon: '✓'
    }
  },

  setFilter: function(filter) {
    this.currentFilter = filter;
    this.render(document.getElementById('main-content-area'));
  },

  handleSearchInput: function(query) {
    this.searchQuery = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.pesanan-table-row');
    let visibleCount = 0;

    rows.forEach(row => {
      const text = row.getAttribute('data-search-text') || '';
      const match = !this.searchQuery || text.includes(this.searchQuery);
      row.style.display = match ? '' : 'none';
      if (match) visibleCount++;
    });

    const emptyEl = document.getElementById('pesanan-empty-search');
    if (emptyEl) {
      emptyEl.style.display = (visibleCount === 0 && rows.length > 0) ? 'block' : 'none';
    }
  },

  render: function(container) {
    if (!container) return;

    const user = DB.getCurrentUser();
    const allApprovedPRs = DB.getApprovedOrders() || [];
    const isOperator = this.canManageOrders(user);

    // Hitung Metrik Statistik
    const totalOrders = allApprovedPRs.length;
    const inQueueCount = allApprovedPRs.filter(p => (p.orderStatus || 'DALAM_ANTRIAN') === 'DALAM_ANTRIAN').length;
    const inProgressCount = allApprovedPRs.filter(p => ['SUDAH_DIPESAN', 'SEDANG_DIKIRIM'].includes(p.orderStatus)).length;
    const receivedCount = allApprovedPRs.filter(p => p.orderStatus === 'SUDAH_DITERIMA').length;
    const failedCount = allApprovedPRs.filter(p => p.orderStatus === 'GAGAL_PENGIRIMAN').length;
    const waitingFATCount = allApprovedPRs.filter(p => p.orderStatus === 'INVOICE_SUBMITTED').length;
    const settledCount = allApprovedPRs.filter(p => p.orderStatus === 'SETTLEMENT').length;

    // Filter berdasarkan tab filter aktif
    const filteredPRs = allApprovedPRs.filter(p => {
      const st = p.orderStatus || 'DALAM_ANTRIAN';
      if (this.currentFilter === 'ALL') return true;
      if (this.currentFilter === 'DALAM_ANTRIAN') return st === 'DALAM_ANTRIAN';
      if (this.currentFilter === 'SUDAH_DIPESAN') return st === 'SUDAH_DIPESAN';
      if (this.currentFilter === 'SEDANG_DIKIRIM') return st === 'SEDANG_DIKIRIM';
      if (this.currentFilter === 'SUDAH_DITERIMA') return st === 'SUDAH_DITERIMA';
      if (this.currentFilter === 'GAGAL_PENGIRIMAN') return st === 'GAGAL_PENGIRIMAN';
      if (this.currentFilter === 'INVOICE_SUBMITTED') return st === 'INVOICE_SUBMITTED';
      if (this.currentFilter === 'SETTLEMENT') return st === 'SETTLEMENT';
      return true;
    });

    container.innerHTML = `
      <div class="animate-blur-in" style="max-width: 1400px; margin: 0 auto;">
        
        <!-- Header & Top Action Banner -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 22px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="text-mono-badge" style="color: #60A5FA; background: rgba(59,130,246,0.12); padding: 3px 8px; border-radius: 4px; font-size: 11px;">
                📦 PO Execution & Delivery Tracking
              </span>
              <span style="font-size: 11.5px; color: var(--text-muted);">
                ● Operator Ditugaskan: <strong style="color: #FCD34D;">Muhammad Syafiq Al Ghifari</strong> & <strong style="color: #FCD34D;">Syifa Izzatina</strong>
              </span>
            </div>
            <h1 style="font-size: 26px; font-weight: 700; margin-top: 4px; color: #fff; letter-spacing: -0.01em;">
              Modul Pelacakan Pesanan & Pengiriman Barang (PO)
            </h1>
            <p style="font-size: 13px; color: var(--text-secondary); margin-top: 2px;">
              Kelola status proses pemesanan, pengiriman ke dapur/kantor, upload invoice tagihan supplier, dan monitoring settlement FAT.
            </p>
          </div>

          <!-- Quick Navigation Sub-Bar -->
          <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('pengajuan')" style="font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px;">
              <span>🛒</span>
              <span>Pengadaan Barang (PR)</span>
            </button>
            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('cash-advance')" style="font-size: 12.5px; color: #FCD34D; border-color: rgba(245,158,11,0.35); display: inline-flex; align-items: center; gap: 6px;">
              <span>💵</span>
              <span>Cash Advance</span>
            </button>
            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('reimburse')" style="font-size: 12.5px; color: #34D399; border-color: rgba(16,185,129,0.35); display: inline-flex; align-items: center; gap: 6px;">
              <span>🧾</span>
              <span>Klaim Reimburse</span>
            </button>
          </div>
        </div>

        <!-- 4 HUD KPI Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px;">
          
          <!-- Card 1: Total Approved PR -->
          <div class="nalar-card" style="margin-bottom: 0; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(59, 130, 246, 0.25); position: relative; overflow: hidden;">
            <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
              Total PR Disetujui Direksi
            </div>
            <div style="font-size: 28px; font-weight: 700; color: #60A5FA; margin-top: 6px; font-family: var(--font-mono);">
              ${totalOrders} <span style="font-size: 13px; font-weight: 400; color: var(--text-dim);">Berkas</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px;">
              ⏳ Antrian: <strong style="color: #FCD34D;">${inQueueCount}</strong> · 🛒 Dipesan: <strong style="color: #93C5FD;">${allApprovedPRs.filter(p => p.orderStatus === 'SUDAH_DIPESAN').length}</strong>
            </div>
          </div>

          <!-- Card 2: Sedang Dikirim / Diterima -->
          <div class="nalar-card" style="margin-bottom: 0; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(168, 85, 247, 0.25);">
            <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
              Pengiriman & Penerimaan
            </div>
            <div style="font-size: 28px; font-weight: 700; color: #C084FC; margin-top: 6px; font-family: var(--font-mono);">
              ${allApprovedPRs.filter(p => p.orderStatus === 'SEDANG_DIKIRIM').length} <span style="font-size: 13px; font-weight: 400; color: var(--text-dim);">Dikirim</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px;">
              📦 Diterima: <strong style="color: #34D399;">${receivedCount}</strong> · ⚠️ Gagal: <strong style="color: #F87171;">${failedCount}</strong>
            </div>
          </div>

          <!-- Card 3: Menunggu Verifikasi FAT -->
          <div class="nalar-card" style="margin-bottom: 0; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(245, 158, 11, 0.25);">
            <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
              Invoice Terkirim ke FAT
            </div>
            <div style="font-size: 28px; font-weight: 700; color: #FCD34D; margin-top: 6px; font-family: var(--font-mono);">
              ${waitingFATCount} <span style="font-size: 13px; font-weight: 400; color: var(--text-dim);">Invoice</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px;">
              Menunggu transfer kasir FAT & upload bukti bayar
            </div>
          </div>

          <!-- Card 4: Selesai & Lunas (Settlement) -->
          <div class="nalar-card" style="margin-bottom: 0; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(16, 185, 129, 0.25);">
            <div style="font-size: 11.5px; color: var(--text-muted); text-transform: uppercase; font-weight: 600; letter-spacing: 0.5px;">
              Status Settlement (Lunas)
            </div>
            <div style="font-size: 28px; font-weight: 700; color: #34D399; margin-top: 6px; font-family: var(--font-mono);">
              ${settledCount} <span style="font-size: 13px; font-weight: 400; color: var(--text-dim);">Selesai</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px;">
              Dana telah ditransfer & bukti transfer tersedia
            </div>
          </div>

        </div>

        <!-- Filter Bar & Search Keyword -->
        <div class="nalar-card" style="padding: 16px; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            
            <!-- Filter Status Tabs (Pills) -->
            <div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'ALL' ? 'active' : ''}" onclick="PesananModule.setFilter('ALL')">
                Semua (${totalOrders})
              </button>
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'DALAM_ANTRIAN' ? 'active' : ''}" onclick="PesananModule.setFilter('DALAM_ANTRIAN')">
                ⏳ Antrian (${inQueueCount})
              </button>
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'SUDAH_DIPESAN' ? 'active' : ''}" onclick="PesananModule.setFilter('SUDAH_DIPESAN')">
                🛒 Dipesan (${allApprovedPRs.filter(p => p.orderStatus === 'SUDAH_DIPESAN').length})
              </button>
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'SEDANG_DIKIRIM' ? 'active' : ''}" onclick="PesananModule.setFilter('SEDANG_DIKIRIM')">
                🚚 Dikirim (${allApprovedPRs.filter(p => p.orderStatus === 'SEDANG_DIKIRIM').length})
              </button>
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'SUDAH_DITERIMA' ? 'active' : ''}" onclick="PesananModule.setFilter('SUDAH_DITERIMA')">
                📦 Diterima (${receivedCount})
              </button>
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'GAGAL_PENGIRIMAN' ? 'active' : ''}" onclick="PesananModule.setFilter('GAGAL_PENGIRIMAN')">
                ⚠️ Gagal (${failedCount})
              </button>
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'INVOICE_SUBMITTED' ? 'active' : ''}" onclick="PesananModule.setFilter('INVOICE_SUBMITTED')">
                📄 Menunggu FAT (${waitingFATCount})
              </button>
              <button type="button" class="btn-preset-pill ${this.currentFilter === 'SETTLEMENT' ? 'active' : ''}" onclick="PesananModule.setFilter('SETTLEMENT')">
                ✓ Settlement (${settledCount})
              </button>
            </div>

            <!-- Keyword Search Input -->
            <div style="position: relative; min-width: 280px; flex: 1; max-width: 380px;">
              <input type="text" id="pesanan-keyword-search" class="form-control" 
                     placeholder="🔍 Cari Dapur, Barang, Tanggal, ID PR..." 
                     value="${this.searchQuery}"
                     oninput="PesananModule.handleSearchInput(this.value)"
                     style="padding-left: 36px; font-size: 13px; background: rgba(0,0,0,0.35); height: 38px; border-radius: 8px;">
              <span style="position: absolute; left: 12px; top: 10px; font-size: 14px; opacity: 0.6;">🔍</span>
            </div>

          </div>
        </div>

        <!-- Tracking Table -->
        <div class="nalar-card" style="padding: 0; overflow: hidden;">
          <div class="nalar-table-container" style="margin-bottom: 0;">
            <table class="nalar-table" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 11px; text-transform: uppercase; color: var(--text-dim); text-align: left;">
                  <th style="padding: 12px 14px;">NO. PR & TGL PO</th>
                  <th style="padding: 12px 14px;">NAMA BARANG & ANGGARAN</th>
                  <th style="padding: 12px 14px;">DAPUR / LOKASI SPPG</th>
                  <th style="padding: 12px 14px;">PEMOHON</th>
                  <th style="padding: 12px 14px; min-width: 180px;">STATUS PESANAN</th>
                  <th style="padding: 12px 14px; min-width: 170px;">INVOICE & FAT SETTLEMENT</th>
                  <th style="padding: 12px 14px; text-align: center; min-width: 140px;">AKSI</th>
                </tr>
              </thead>
              <tbody id="pesanan-table-body">
                ${filteredPRs.length === 0 ? `
                  <tr>
                    <td colspan="7" style="text-align: center; padding: 48px 16px; color: var(--text-muted); font-size: 13.5px;">
                      Belum ada pesanan pengadaan barang yang disetujui Direksi pada filter ini.
                    </td>
                  </tr>
                ` : filteredPRs.map(pr => {
                  const currentStatus = pr.orderStatus || 'DALAM_ANTRIAN';
                  const stConfig = this.STATUS_CONFIG[currentStatus] || this.STATUS_CONFIG['DALAM_ANTRIAN'];
                  const isReceived = (currentStatus === 'SUDAH_DITERIMA');
                  const isInvoiceSubmitted = (currentStatus === 'INVOICE_SUBMITTED');
                  const isSettled = (currentStatus === 'SETTLEMENT');
                  const hasDisbursementProof = (pr.orderDisbursement && (pr.orderDisbursement.transferProofUrl || pr.orderDisbursement.bankRefNo));

                  const searchText = `${pr.id} ${pr.itemName} ${pr.targetKitchen} ${pr.employeeName} ${pr.createdAt} ${pr.category} ${stConfig.label}`.toLowerCase();

                  return `
                    <tr class="pesanan-table-row" data-search-text="${searchText}" style="border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s ease;">
                      
                      <!-- 1. ID PR & Tanggal -->
                      <td style="padding: 14px; font-family: var(--font-mono); vertical-align: top;">
                        <span style="color: #FCD34D; font-weight: 700; font-size: 13px;">${pr.id}</span>
                        <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                          ${pr.createdAt ? pr.createdAt.split(' ')[0] : '-'}
                        </div>
                        <span style="display: inline-block; margin-top: 4px; font-size: 9.5px; color: #34D399; background: rgba(16,185,129,0.12); padding: 1px 6px; border-radius: 3px;">
                          PO Resmi Terbit
                        </span>
                      </td>

                      <!-- 2. Nama Barang & Kuantiti & Plafon Biaya -->
                      <td style="padding: 14px; vertical-align: top;">
                        <div style="font-weight: 600; color: #fff; font-size: 13.5px;">
                          ${pr.itemName}
                        </div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                          Kategori: <strong style="color: var(--text-secondary);">${pr.category || 'Operasional'}</strong> · Qty: <strong style="color: #fff;">${pr.quantity} Unit</strong>
                        </div>
                        <div style="font-size: 13px; font-family: var(--font-mono); font-weight: 700; color: #FCD34D; margin-top: 4px;">
                          Rp ${(Number(pr.totalPrice) || 0).toLocaleString('id-ID')}
                        </div>
                      </td>

                      <!-- 3. Dapur Tujuan SPPG -->
                      <td style="padding: 14px; vertical-align: top; font-size: 12px;">
                        <div style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); padding: 4px 8px; border-radius: 6px; color: #CBD5E1; max-width: 230px; word-break: break-word;">
                          <span>🍳</span>
                          <strong>${pr.targetKitchen || 'Kantor Pusat'}</strong>
                        </div>
                      </td>

                      <!-- 4. Pemohon -->
                      <td style="padding: 14px; vertical-align: top; font-size: 12px;">
                        <div style="font-weight: 600; color: #fff;">${pr.employeeName}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${pr.department || pr.role}</div>
                      </td>

                      <!-- 5. Status Pesanan (Dropdown untuk Operator Syafiq/Syifa/Admin) -->
                      <td style="padding: 14px; vertical-align: top;">
                        ${isOperator && !isSettled ? `
                          <div>
                            <select class="form-control pesanan-status-select" 
                                    style="padding: 6px 10px; font-size: 12px; font-weight: 600; ${stConfig.badgeStyle}; border-radius: 6px; cursor: pointer; width: 100%;"
                                    onchange="PesananModule.handleStatusChangeDropdown('${pr.id}', this.value)">
                              <option value="DALAM_ANTRIAN" ${currentStatus === 'DALAM_ANTRIAN' ? 'selected' : ''}>⏳ Masih dalam antrian</option>
                              <option value="SUDAH_DIPESAN" ${currentStatus === 'SUDAH_DIPESAN' ? 'selected' : ''}>🛒 Sudah di pesan</option>
                              <option value="SEDANG_DIKIRIM" ${currentStatus === 'SEDANG_DIKIRIM' ? 'selected' : ''}>🚚 Sedang di kirim</option>
                              <option value="SUDAH_DITERIMA" ${currentStatus === 'SUDAH_DITERIMA' ? 'selected' : ''}>📦 Sudah di terima</option>
                              <option value="GAGAL_PENGIRIMAN" ${currentStatus === 'GAGAL_PENGIRIMAN' ? 'selected' : ''}>⚠️ Gagal Pengiriman</option>
                            </select>
                            ${pr.lastTrackingNote ? `
                              <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px; font-style: italic; max-width: 200px;">
                                "${pr.lastTrackingNote}"
                              </div>
                            ` : ''}
                          </div>
                        ` : `
                          <div>
                            <span class="status-badge" style="${stConfig.badgeStyle}">
                              ${stConfig.icon} ${stConfig.label}
                            </span>
                            ${pr.lastTrackingNote ? `
                              <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 4px; font-style: italic;">
                                "${pr.lastTrackingNote}"
                              </div>
                            ` : ''}
                          </div>
                        `}
                      </td>

                      <!-- 6. Invoice & FAT Settlement Column -->
                      <td style="padding: 14px; vertical-align: top; font-size: 12px;">
                        ${isSettled ? `
                          <div>
                            <span style="font-size: 11px; font-weight: 700; color: #34D399; background: rgba(16,185,129,0.15); border: 1px solid #10B981; padding: 2px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                              ✓ SETTLEMENT
                            </span>
                            <div style="font-size: 10.5px; color: #94A3B8; font-family: var(--font-mono); margin-top: 4px;">
                              Ref: ${pr.orderDisbursement ? pr.orderDisbursement.bankRefNo : '-'}
                            </div>
                            ${pr.orderDisbursement && pr.orderDisbursement.transferProofUrl ? `
                              <button type="button" class="btn-preview-link" style="margin-top: 4px; font-size: 10.5px; color: #6EE7B7; background: rgba(16,185,129,0.12); padding: 2px 6px; border-radius: 4px;" onclick="PesananModule.previewTransferProof('${pr.id}')">
                                💳 Lihat Bukti Transfer ↗
                              </button>
                            ` : ''}
                          </div>
                        ` : isInvoiceSubmitted ? `
                          <div>
                            <span style="font-size: 10.5px; color: #FCD34D; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.35); padding: 2px 6px; border-radius: 4px; display: inline-block;">
                              📄 Invoice Terkirim ke FAT
                            </span>
                            ${pr.orderInvoice && pr.orderInvoice.fileUrl ? `
                              <div style="margin-top: 4px;">
                                <button type="button" class="btn-preview-link" style="font-size: 10px; color: #FCD34D;" onclick="PesananModule.previewInvoice('${pr.id}')">
                                  📎 Cek Invoice (${pr.orderInvoice.fileName || 'Faktur'}) ↗
                                </button>
                              </div>
                            ` : ''}
                          </div>
                        ` : isReceived ? `
                          <div>
                            <button type="button" class="btn-nalar-primary" style="padding: 6px 12px; font-size: 11px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; font-weight: 700; width: 100%;" onclick="PesananModule.openInvoiceModal('${pr.id}')">
                              📄 Kirimkan Invoice
                            </button>
                            <div style="font-size: 10px; color: #94A3B8; margin-top: 3px;">
                              Barang telah tiba. Lampirkan invoice untuk diteruskan ke FAT.
                            </div>
                          </div>
                        ` : `
                          <span style="font-size: 11px; color: var(--text-dim); font-style: italic;">
                            Menunggu barang diterima
                          </span>
                        `}
                      </td>

                      <!-- 7. Action Column -->
                      <td style="padding: 14px; vertical-align: top; text-align: center;">
                        <div style="display: flex; flex-direction: column; gap: 6px; align-items: center;">
                          <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; width: 100%; border-color: rgba(255,255,255,0.15);" onclick="PesananModule.openTimelineModal('${pr.id}')">
                            📜 Log Detail
                          </button>

                          ${(pr.attachmentUrl || pr.attachmentName) ? `
                            <button type="button" class="btn-preview-link" style="padding: 3px 8px; font-size: 10.5px; color: #60A5FA; width: 100%; text-align: center;" onclick="PengajuanBarangModule.openLightbox('${pr.id}', '${pr.itemName}')">
                              🔍 Foto PR ↗
                            </button>
                          ` : ''}
                        </div>
                      </td>

                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <!-- Empty search callout -->
          <div id="pesanan-empty-search" style="display: none; padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px;">
            Tidak ditemukan pesanan dengan kata kunci pencarian tersebut.
          </div>
        </div>

      </div>

      <!-- Modal 1: Kirimkan Invoice Vendor (Upload File Saja) -->
      <div id="modal-pesanan-invoice" class="modal-backdrop">
        <div class="modal-box" style="max-width: 500px;">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #34D399;">Lampiran Tagihan Vendor</span>
              <h3 class="modal-title" style="margin-top: 2px;">Kirimkan Invoice ke FAT Officer</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-pesanan-invoice')">✕</button>
          </div>

          <form onsubmit="PesananModule.handleSubmitInvoice(event)">
            <div class="modal-body">
              <div id="pesanan-invoice-info" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.25); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; font-size: 12.5px;">
                <!-- PR brief filled here -->
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-weight: 600; color: #fff;">
                  Upload File Invoice / Kuitansi Supplier <span style="color: #F87171;">*</span>
                </label>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-bottom: 8px;">
                  Format: PNG, JPG, JPEG, atau PDF (Maksimal 2 MB).
                </div>
                
                <input type="file" id="pesanan-invoice-file-input" 
                       accept="image/png,image/jpeg,image/jpg,application/pdf" 
                       class="form-control" 
                       onchange="PesananModule.handleInvoiceFileSelect(event)" 
                       required>
                
                <div id="pesanan-invoice-file-status" style="font-size: 11px; margin-top: 6px; color: var(--text-dim);">
                  Pilih berkas invoice fisik/digital dari perangkat Anda.
                </div>
              </div>
            </div>

            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 14px 20px;">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-pesanan-invoice')">Batal</button>
              <button type="submit" id="btn-submit-pesanan-invoice" class="btn-nalar-primary" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; font-weight: 700; padding: 8px 18px;">
                🚀 Kirimkan ke FAT Officer
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 2: Catatan Gagal Pengiriman -->
      <div id="modal-pesanan-gagal" class="modal-backdrop">
        <div class="modal-box" style="max-width: 480px; border-color: rgba(239,68,68,0.4);">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #F87171;">Kendala Pengiriman Barang</span>
              <h3 class="modal-title" style="margin-top: 2px;">Alasan Gagal Pengiriman / Ketidaksesuaian</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-pesanan-gagal')">✕</button>
          </div>

          <form onsubmit="PesananModule.handleSubmitGagalPengiriman(event)">
            <div class="modal-body">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">
                  Jelaskan Kendala / Ketidaksesuaian Barang di Lokasi <span style="color: #F87171;">*</span>
                </label>
                <textarea id="pesanan-gagal-reason" class="form-control" rows="4" 
                          placeholder="Contoh: Barang tiba dalam kondisi kemasan rusak berat dan spesifikasi voltase tidak sesuai dengan pesanan PR..." required></textarea>
              </div>
            </div>

            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-pesanan-gagal')">Batal</button>
              <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-color: #F87171; color: #fff;">
                ⚠️ Simpan Status Gagal Pengiriman
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal 3: Timeline & Riwayat Log Pesanan -->
      <div id="modal-pesanan-timeline" class="modal-backdrop">
        <div class="modal-box" style="max-width: 600px;">
          <div class="modal-header">
            <div>
              <span class="text-mono-badge" style="color: #60A5FA;">Audit Trail PO</span>
              <h3 class="modal-title" style="margin-top: 2px;" id="pesanan-timeline-title">Riwayat Log Pesanan</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-pesanan-timeline')">✕</button>
          </div>

          <div class="modal-body" id="pesanan-timeline-body" style="max-height: 70vh; overflow-y: auto;">
            <!-- Timeline records rendered dynamically -->
          </div>

          <div class="modal-footer" style="display: flex; justify-content: flex-end;">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-pesanan-timeline')">Tutup</button>
          </div>
        </div>
      </div>
    `;
  },

  // Handler perubahan status dari Dropdown tabel secara langsung
  handleStatusChangeDropdown: async function(prId, newStatus) {
    if (newStatus === 'GAGAL_PENGIRIMAN') {
      this.activeModalPRId = prId;
      const textarea = document.getElementById('pesanan-gagal-reason');
      if (textarea) textarea.value = '';
      App.openModal('modal-pesanan-gagal');
      return;
    }

    const pr = DB.getItemRequests().find(p => p.id === prId);
    if (!pr) return;

    const user = DB.getCurrentUser();
    const stConfig = this.STATUS_CONFIG[newStatus] || { label: newStatus };

    const success = await DB.updateOrderStatus(prId, newStatus, `Status pesanan diubah menjadi "${stConfig.label}" oleh ${user.name}`);
    if (success) {
      App.showToast(`Status pesanan ${prId} berhasil diubah menjadi "${stConfig.label}"!`, 'success');
      App.refreshCurrentTab();
    } else {
      App.showToast('Gagal memperbarui status pesanan.', 'warn');
    }
  },

  handleSubmitGagalPengiriman: async function(e) {
    if (e) e.preventDefault();
    const prId = this.activeModalPRId;
    if (!prId) return;

    const reason = (document.getElementById('pesanan-gagal-reason')?.value || '').trim();
    if (!reason) {
      App.showToast('Mohon isi alasan kendala / ketidakcocokan barang!', 'warn');
      return;
    }

    const user = DB.getCurrentUser();
    const success = await DB.updateOrderStatus(prId, 'GAGAL_PENGIRIMAN', `Gagal Pengiriman: ${reason}`);
    
    App.closeModal('modal-pesanan-gagal');
    if (success) {
      App.showToast(`Status pesanan ${prId} dicatat sebagai Gagal Pengiriman.`, 'warn');
      App.refreshCurrentTab();
    }
  },

  openInvoiceModal: function(prId) {
    const pr = DB.getItemRequests().find(p => p.id === prId);
    if (!pr) return;

    this.activeModalPRId = prId;
    this.currentInvoiceFile = { url: null, name: null };

    const infoEl = document.getElementById('pesanan-invoice-info');
    if (infoEl) {
      infoEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong style="color: #34D399; font-family: var(--font-mono);">${pr.id}</strong>
          <span style="color: #FCD34D; font-weight: 700; font-family: var(--font-mono);">Rp ${(Number(pr.totalPrice) || 0).toLocaleString('id-ID')}</span>
        </div>
        <div style="font-weight: 600; color: #fff;">${pr.itemName} (${pr.quantity} Unit)</div>
        <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
          Dapur/Lokasi: <strong>${pr.targetKitchen}</strong> · Pemohon: <strong>${pr.employeeName}</strong>
        </div>
      `;
    }

    const fileInput = document.getElementById('pesanan-invoice-file-input');
    const statusEl = document.getElementById('pesanan-invoice-file-status');
    if (fileInput) fileInput.value = '';
    if (statusEl) statusEl.innerHTML = `Pilih berkas invoice fisik/digital dari perangkat Anda.`;

    App.openModal('modal-pesanan-invoice');
  },

  handleInvoiceFileSelect: async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSizeBytes = 2 * 1024 * 1024; // 2 MB
    if (file.size > maxSizeBytes) {
      App.showToast(`Ukuran file (${(file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas maksimal 2 MB!`, 'warn');
      event.target.value = '';
      return;
    }

    const statusEl = document.getElementById('pesanan-invoice-file-status');
    if (file.type === 'application/pdf') {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentInvoiceFile = { url: e.target.result, name: file.name };
        if (statusEl) statusEl.innerHTML = `<span style="color: #34D399;">✓ File PDF dipilih: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(0)} KB)</span>`;
      };
      reader.readAsDataURL(file);
    } else if (file.type.startsWith('image/')) {
      try {
        const res = await compressImageFile(file, 1400, 0.82);
        this.currentInvoiceFile = { url: res.url, name: file.name };
        if (statusEl) statusEl.innerHTML = `<span style="color: #34D399;">✓ File Gambar siap: <strong>${file.name}</strong></span>`;
      } catch (err) {
        console.warn('Compress error:', err);
      }
    }
  },

  handleSubmitInvoice: async function(e) {
    if (e) e.preventDefault();
    const prId = this.activeModalPRId;
    if (!prId) return;

    if (!this.currentInvoiceFile || !this.currentInvoiceFile.url) {
      App.showToast('Mohon lampirkan file invoice / kuitansi supplier!', 'warn');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-pesanan-invoice');
    const origText = submitBtn ? submitBtn.innerHTML : '🚀 Kirimkan ke FAT Officer';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '⏳ Mengunggah ke Cloud...';
    }

    try {
      const success = await DB.submitOrderInvoice(prId, {
        fileUrl: this.currentInvoiceFile.url,
        fileName: this.currentInvoiceFile.name
      });

      App.closeModal('modal-pesanan-invoice');
      if (success) {
        App.showToast(`Invoice untuk PR ${prId} berhasil dikirimkan ke antrean Approval Hub FAT Officer!`, 'success');
        App.refreshCurrentTab();
      }
    } catch (err) {
      console.error('Invoice submit error:', err);
      App.showToast('Terjadi kendala saat mengirimkan invoice.', 'warn');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = origText;
      }
    }
  },

  previewInvoice: async function(prId) {
    const pr = DB.getItemRequests().find(p => p.id === prId);
    if (!pr) return;

    let url = pr.orderInvoice ? pr.orderInvoice.fileUrl : null;
    let name = pr.orderInvoice ? (pr.orderInvoice.fileName || `Invoice_${pr.id}`) : `Invoice_${pr.id}`;

    if (!url && pr.orderInvoice && pr.orderInvoice.fileName) {
      App.showToast('Memuat file invoice dari cloud...', 'info');
      url = await DB.fetchOrderInvoiceAttachment(prId);
    }

    if (!url) {
      App.showToast('File invoice tidak tersedia.', 'warn');
      return;
    }

    if (window.ReimburseModule && typeof window.ReimburseModule.previewCustomImage === 'function') {
      window.ReimburseModule.previewCustomImage(url, `Invoice Tagihan Vendor — ${pr.id} (${pr.itemName})`, name);
    } else {
      window.open(url, '_blank');
    }
  },

  previewTransferProof: async function(prId) {
    const pr = DB.getItemRequests().find(p => p.id === prId);
    if (!pr) return;

    let url = pr.orderDisbursement ? pr.orderDisbursement.transferProofUrl : null;
    let name = pr.orderDisbursement ? (pr.orderDisbursement.transferProofName || `Bukti_Transfer_${pr.id}`) : `Bukti_Transfer_${pr.id}`;

    if (!url && pr.orderDisbursement) {
      App.showToast('Memuat bukti transfer dari cloud...', 'info');
      url = await DB.fetchOrderTransferProof(prId);
    }

    if (!url) {
      App.showToast('Bukti transfer FAT belum diunggah.', 'info');
      return;
    }

    if (window.ReimburseModule && typeof window.ReimburseModule.previewCustomImage === 'function') {
      window.ReimburseModule.previewCustomImage(url, `Bukti Transfer Pembayaran FAT — ${pr.id} (Ref: ${pr.orderDisbursement?.bankRefNo || '-'})`, name);
    } else {
      window.open(url, '_blank');
    }
  },

  openTimelineModal: function(prId) {
    const pr = DB.getItemRequests().find(p => p.id === prId);
    if (!pr) return;

    const titleEl = document.getElementById('pesanan-timeline-title');
    const bodyEl = document.getElementById('pesanan-timeline-body');
    if (titleEl) titleEl.textContent = `Log Perjalanan PO: ${pr.id}`;

    const history = Array.isArray(pr.orderTrackingHistory) ? pr.orderTrackingHistory : [];
    const approvalHistory = Array.isArray(pr.approvalHistory) ? pr.approvalHistory : [];

    let timelineHtml = `
      <div style="background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px 16px; margin-bottom: 16px;">
        <div style="font-weight: 700; color: #fff; font-size: 14px;">${pr.itemName} (${pr.quantity} Unit)</div>
        <div style="font-size: 12px; color: #FCD34D; font-family: var(--font-mono); margin-top: 2px;">
          Anggaran: Rp ${(Number(pr.totalPrice) || 0).toLocaleString('id-ID')} · Dapur: ${pr.targetKitchen}
        </div>
      </div>

      <h4 style="font-size: 13px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 12px; letter-spacing: 0.5px;">
        Tahapan Approval Direksi & Eksekusi Pesanan:
      </h4>
      <div style="display: flex; flex-direction: column; gap: 12px; position: relative; padding-left: 20px; border-left: 2px solid rgba(59,130,246,0.3); margin-left: 10px;">
    `;

    // 1. Log Approval PR
    approvalHistory.forEach(h => {
      timelineHtml += `
        <div style="position: relative;">
          <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #3B82F6; border: 2px solid #0F172A;"></div>
          <div style="font-size: 12px; font-weight: 600; color: #fff;">
            ${h.stage === 'DIRECTOR_APPROVAL' ? '👑 Otorisasi Direksi (PO Terbit)' : h.stage} — <span style="color: #34D399;">${h.action}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
            ${h.timestamp} · Oleh: ${h.actorName || '-'}
          </div>
          ${h.notes ? `<div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">"${h.notes}"</div>` : ''}
        </div>
      `;
    });

    // 2. Log Tracking Pesanan
    history.forEach(h => {
      const stConfig = this.STATUS_CONFIG[h.status] || { label: h.status, icon: '📦' };
      timelineHtml += `
        <div style="position: relative;">
          <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #10B981; border: 2px solid #0F172A;"></div>
          <div style="font-size: 12px; font-weight: 600; color: #fff;">
            ${stConfig.icon} Status: <span style="color: #6EE7B7;">${stConfig.label}</span>
          </div>
          <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
            ${h.timestamp} · Oleh: ${h.updatedByName || h.updatedBy || '-'}
          </div>
          ${h.notes ? `<div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">"${h.notes}"</div>` : ''}
        </div>
      `;
    });

    // 3. Log Disbursement FAT
    if (pr.orderDisbursement) {
      timelineHtml += `
        <div style="position: relative;">
          <div style="position: absolute; left: -27px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: #F59E0B; border: 2px solid #0F172A;"></div>
          <div style="font-size: 12.5px; font-weight: 700; color: #FCD34D;">
            ✓ Pencairan Transfer FAT — SETTLEMENT LUNAS
          </div>
          <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
            ${pr.orderDisbursement.disbursedAt} · Kasir: ${pr.orderDisbursement.disbursedBy || 'FAT Officer'} · Ref: ${pr.orderDisbursement.bankRefNo}
          </div>
          ${pr.orderDisbursement.notes ? `<div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">"${pr.orderDisbursement.notes}"</div>` : ''}
        </div>
      `;
    }

    timelineHtml += `</div>`;
    if (bodyEl) bodyEl.innerHTML = timelineHtml;

    App.openModal('modal-pesanan-timeline');
  }
};
