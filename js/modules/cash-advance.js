/**
 * ERP MMS - Cash Advance Module (Kasbon Operasional & LPJ Settlement)
 * Features:
 * 1. Pengajuan Dana Kasbon Operasional Lapangan & Mendesak
 * 2. Alur Approval 2 Layer: Direktur Ops/Keu -> Pencairan & Transfer FAT
 * 3. Pelaporan LPJ Realisasi Belanja Dinamis (Item-by-item) + Upload Nota/Kwitansi
 * 4. Perhitungan Otomatis Selisih Sisa Dana Pengembalian / Reimbursement
 * 5. Universal Level Tracker Integration
 */

window.CashAdvanceModule = {
  currentFilter: 'ALL',
  selectedCaId: null,
  settlementItems: [
    { name: '', qty: 1, unitPrice: 0 }
  ],
  settlementProofUrl: null,
  refundProofUrl: null,

  render: function(container) {
    if (!container) return;
    const user = DB.getCurrentUser();
    const allCAs = DB.getCashAdvances();
    
    // User only PR & CA scoping (privasi mandiri karyawan)
    const userCAs = allCAs.filter(c => c && c.employeeId === user.id);

    // Hitung KPI Aggregations
    const totalRequested = userCAs.reduce((acc, c) => acc + (Number(c.amountRequested) || 0), 0);
    const totalDisbursed = userCAs.filter(c => c.status === 'DISBURSED' || c.status === 'SETTLEMENT_PENDING' || c.status === 'SETTLED')
      .reduce((acc, c) => acc + (Number(c.amountDisbursed || c.amountApproved || c.amountRequested) || 0), 0);
    const pendingReviewCount = userCAs.filter(c => c.status === 'PENDING').length;
    const waitingLPJCount = userCAs.filter(c => c.status === 'DISBURSED' && c.stage === 'DISBURSED').length;
    const settledCount = userCAs.filter(c => c.status === 'SETTLED').length;

    // Filter list
    const filteredCAs = userCAs.filter(c => {
      if (this.currentFilter === 'ALL') return true;
      if (this.currentFilter === 'PENDING') return c.status === 'PENDING';
      if (this.currentFilter === 'DISBURSED') return c.status === 'DISBURSED' && c.stage === 'DISBURSED';
      if (this.currentFilter === 'SETTLEMENT_PENDING') return c.status === 'SETTLEMENT_PENDING';
      if (this.currentFilter === 'SETTLED') return c.status === 'SETTLED';
      if (this.currentFilter === 'REJECTED') return c.status === 'REJECTED';
      return true;
    });

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Header & Nav Action -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="text-mono-badge" style="color: #F59E0B;">OPERATIONAL FINANCE & DISBURSEMENT</span>
            <h1 style="font-size: 26px; font-weight: 600; margin-top: 2px;">Cash Advance (Kasbon & Uang Muka Operasional)</h1>
            <p style="color: var(--text-secondary); font-size: 13.5px; margin-top: 4px;">
              Pengajuan kasbon operasional, otorisasi 2-layer Direksi & FAT, dan pertanggungjawaban realisasi belanja (LPJ).
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('pengajuan')" style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span>Pengadaan Barang (PR)</span>
            </button>

            <button type="button" class="btn-nalar-primary" onclick="CashAdvanceModule.openCreateModal()" style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color: #FCD34D; color: #000; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.35);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Ajukan Cash Advance Baru</span>
            </button>
          </div>
        </div>

        <!-- 3 KPI Cards Container Layout (Pemisah Dashboard Terpadu) -->
        <div class="kpi-stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 28px;">
          
          <!-- Card 1: Total Plafon Kasbon Saya -->
          <div class="kpi-chip hud-corner-box aura-box-amber">
            <div class="card-aura-glow aura-amber"></div>
            <div class="kpi-chip-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(245, 158, 11, 0.18); color: #FCD34D; display: flex; align-items: center; justify-content: center; font-size: 13px;">
                  💰
                </div>
                <span class="kpi-chip-title">Total Anggaran Kasbon Saya</span>
              </div>
              <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: 4px;">TA 2026</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCD34D; font-family: var(--font-mono); font-size: 28px; font-weight: 700;">
              Rp ${totalRequested.toLocaleString('id-ID')}
            </div>
            <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">
              Akumulasi pengajuan kasbon operasional yang Anda ajukan.
            </p>
            <div class="kpi-chip-footer" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; margin-top: 4px; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">
              Dana Dicairkan FAT: <strong style="color: #34D399; margin-left: 4px;">Rp ${totalDisbursed.toLocaleString('id-ID')}</strong>
            </div>
          </div>

          <!-- Card 2: Status Alur Berjalan -->
          <div class="kpi-chip hud-corner-box aura-box-blue">
            <div class="card-aura-glow aura-blue"></div>
            <div class="kpi-chip-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(59, 130, 246, 0.18); color: #60A5FA; display: flex; align-items: center; justify-content: center; font-size: 13px;">
                  ⏱️
                </div>
                <span class="kpi-chip-title">Antrean Review & Pencairan</span>
              </div>
              <span class="text-mono-badge" style="color: #60A5FA; background: rgba(59, 130, 246, 0.12); padding: 2px 8px; border-radius: 4px;">2-Layer Flow</span>
            </div>
            <div class="kpi-chip-value" style="color: #60A5FA; font-family: var(--font-mono); font-size: 28px; font-weight: 700;">
              ${pendingReviewCount} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">Pengajuan</span>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">
              Menunggu otorisasi Direksi atau eksekusi transfer dana oleh tim FAT.
            </p>
            <div class="kpi-chip-footer" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; margin-top: 4px; font-size: 11.5px; font-family: var(--font-mono);">
              ${pendingReviewCount === 0 ? '<span style="color: #34D399; display: flex; align-items: center; gap: 4px;">✓ Tidak ada antrean pending</span>' : '<span style="color: #FCD34D; display: flex; align-items: center; gap: 4px;">● Sedang dalam proses review</span>'}
            </div>
          </div>

          <!-- Card 3: Status LPJ & Settlement -->
          <div class="kpi-chip hud-corner-box aura-box-violet">
            <div class="card-aura-glow aura-purple"></div>
            <div class="kpi-chip-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(236, 72, 153, 0.18); color: #F472B6; display: flex; align-items: center; justify-content: center; font-size: 13px;">
                  📑
                </div>
                <span class="kpi-chip-title">Pertanggungjawaban (LPJ)</span>
              </div>
              <span class="text-mono-badge" style="color: #C4B5FD; background: rgba(139, 92, 246, 0.12); padding: 2px 8px; border-radius: 4px;">Realisasi Nota</span>
            </div>
            <div class="kpi-chip-value" style="color: ${waitingLPJCount > 0 ? '#FB7185' : '#34D399'}; font-family: var(--font-mono); font-size: 28px; font-weight: 700;">
              ${waitingLPJCount} <span style="font-size: 14px; font-weight: 400; color: var(--text-muted);">Perlu LPJ</span>
            </div>
            <p style="font-size: 12px; color: var(--text-secondary); line-height: 1.5; margin-bottom: 12px;">
              ${waitingLPJCount > 0 ? 'Dana telah cair! Mohon unggah nota realisasi belanja.' : 'Seluruh kasbon telah dilaporkan atau selesai.'}
            </p>
            <div class="kpi-chip-footer" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 10px; margin-top: 4px; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">
              Kasbon Selesai & Lunas: <strong style="color: #34D399; margin-left: 4px;">${settledCount} Kasbon</strong>
            </div>
          </div>

        </div>

        <!-- Thematic Floating Filter Pills (Approval Hub UI/UX Style) -->
        <div class="approval-filter-bar" style="margin-bottom: 24px;">
          <button class="approval-filter-pill pill-all ${this.currentFilter === 'ALL' ? 'active' : ''}" onclick="CashAdvanceModule.setFilter('ALL')">
            <span class="filter-dot dot-orange"></span>
            <span>Semua Pengajuan</span>
            <span class="filter-badge">${userCAs.length}</span>
          </button>

          <button class="approval-filter-pill pill-pending ${this.currentFilter === 'PENDING' ? 'active' : ''}" onclick="CashAdvanceModule.setFilter('PENDING')">
            <span class="filter-dot dot-amber"></span>
            <span>Menunggu Review / Transfer</span>
            <span class="filter-badge">${pendingReviewCount}</span>
          </button>

          <button class="approval-filter-pill pill-disbursed ${this.currentFilter === 'DISBURSED' ? 'active' : ''}" onclick="CashAdvanceModule.setFilter('DISBURSED')">
            <span class="filter-dot dot-pink"></span>
            <span>Dana Diterima (Perlu LPJ)</span>
            <span class="filter-badge">${waitingLPJCount}</span>
          </button>

          <button class="approval-filter-pill pill-settlement ${this.currentFilter === 'SETTLEMENT_PENDING' ? 'active' : ''}" onclick="CashAdvanceModule.setFilter('SETTLEMENT_PENDING')">
            <span class="filter-dot dot-violet"></span>
            <span>LPJ Terkirim (Verifikasi FAT)</span>
            <span class="filter-badge">${userCAs.filter(c => c.status === 'SETTLEMENT_PENDING').length}</span>
          </button>

          <button class="approval-filter-pill pill-settled ${this.currentFilter === 'SETTLED' ? 'active' : ''}" onclick="CashAdvanceModule.setFilter('SETTLED')">
            <span class="filter-dot dot-emerald"></span>
            <span>Selesai & Lunas</span>
            <span class="filter-badge">${settledCount}</span>
          </button>
        </div>

        <!-- Table Container -->
        <div class="nalar-card hud-corner-box" style="padding: 24px; overflow-x: auto; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <h3 style="font-size: 16px; font-weight: 600; color: #fff;">Daftar Cash Advance yang Anda Ajukan</h3>
              <p style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                💡 <em>Klik pada baris pengajuan untuk melihat rincian alur persetujuan bertingkat (Level Tracker).</em>
              </p>
            </div>
            <span class="text-mono-badge" style="color: #60A5FA;">Total: ${filteredCAs.length} Berkas</span>
          </div>

          <table class="nalar-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; font-size: 11.5px; color: var(--text-dim); text-transform: uppercase;">
                <th style="padding: 12px 10px;">NO. KASBON</th>
                <th style="padding: 12px 10px;">KEPERLUAN & LOKASI</th>
                <th style="padding: 12px 10px;">KATEGORI</th>
                <th style="padding: 12px 10px;">NOMINAL DIMINTA</th>
                <th style="padding: 12px 10px;">PENCAIRAN FAT</th>
                <th style="padding: 12px 10px;">TAHAP ALUR</th>
                <th style="padding: 12px 10px;">STATUS</th>
                <th style="padding: 12px 10px; text-align: center;">AKSI</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCAs.length === 0 ? `
                <tr>
                  <td colspan="8" style="text-align: center; padding: 48px 16px; color: var(--text-muted); font-size: 13.5px;">
                    Belum ada pengajuan Cash Advance pada kategori ini.
                  </td>
                </tr>
              ` : filteredCAs.map(ca => {
                const isWaitingLPJ = (ca.status === 'DISBURSED' && ca.stage === 'DISBURSED');
                const isLPJSubmitted = (ca.status === 'SETTLEMENT_PENDING');
                const isSettled = (ca.status === 'SETTLED');
                const isRejected = (ca.status === 'REJECTED');

                let stageBadge = '';
                if (ca.stage === 'DIRECTOR_REVIEW') {
                  stageBadge = '<span class="status-badge" style="background: rgba(245,158,11,0.15); color: #FCD34D; border: 1px solid rgba(245,158,11,0.3);">👑 Otorisasi Direksi</span>';
                } else if (ca.stage === 'FAT_DISBURSEMENT') {
                  stageBadge = '<span class="status-badge" style="background: rgba(59,130,246,0.15); color: #60A5FA; border: 1px solid rgba(59,130,246,0.3);">💰 Pencairan FAT</span>';
                } else if (ca.stage === 'DISBURSED') {
                  stageBadge = '<span class="status-badge" style="background: rgba(236,72,153,0.15); color: #F472B6; border: 1px solid rgba(236,72,153,0.3);">📝 Perlu Input LPJ</span>';
                } else if (ca.stage === 'SETTLEMENT_SUBMITTED') {
                  stageBadge = '<span class="status-badge" style="background: rgba(167,139,250,0.15); color: #C4B5FD; border: 1px solid rgba(167,139,250,0.3);">🔍 Verifikasi LPJ FAT</span>';
                } else if (ca.stage === 'SETTLED') {
                  stageBadge = '<span class="status-badge" style="background: rgba(16,185,129,0.15); color: #34D399; border: 1px solid rgba(16,185,129,0.3);">✓ Selesai & Lunas</span>';
                } else {
                  stageBadge = '<span class="status-badge" style="background: rgba(239,68,68,0.15); color: #F87171; border: 1px solid rgba(239,68,68,0.3);">✕ Ditolak</span>';
                }

                let statusBadge = '';
                if (isSettled) {
                  statusBadge = '<span class="badge-status success">SETTLED</span>';
                } else if (isWaitingLPJ) {
                  statusBadge = '<span class="badge-status warn" style="background: rgba(245,158,11,0.15); color: #FCD34D;">DANA CAIR</span>';
                } else if (isLPJSubmitted) {
                  statusBadge = '<span class="badge-status info">REVIEW LPJ</span>';
                } else if (isRejected) {
                  statusBadge = '<span class="badge-status danger">DITOLAK</span>';
                } else {
                  statusBadge = '<span class="badge-status pending">PENDING</span>';
                }

                return `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer;" onclick="App.openApprovalTracker('CA', '${ca.id}')">
                    <td style="padding: 14px 10px; font-family: var(--font-mono); font-weight: 700; color: #FCD34D;">
                      ${ca.id}
                      <div style="font-size: 10px; color: var(--text-muted); font-weight: 400;">${ca.createdAt.split(' ')[0]}</div>
                    </td>

                    <td style="padding: 14px 10px;">
                      <div style="font-weight: 600; color: #fff; font-size: 13px;">${ca.title}</div>
                      <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                        📍 ${ca.targetLocation || '-'} · 🏦 ${ca.bankName} (${ca.bankAccountNo})
                      </div>
                    </td>

                    <td style="padding: 14px 10px; font-size: 12px; color: var(--text-secondary);">
                      ${ca.category}
                    </td>

                    <td style="padding: 14px 10px; font-family: var(--font-mono); font-weight: 700; color: #fff; font-size: 13.5px;">
                      Rp ${Number(ca.amountRequested).toLocaleString('id-ID')}
                      ${ca.amountApproved && ca.amountApproved !== ca.amountRequested ? `
                        <div style="font-size: 10.5px; color: #34D399; font-weight: 400;">
                          Plafon: Rp ${Number(ca.amountApproved).toLocaleString('id-ID')}
                        </div>
                      ` : ''}
                    </td>

                    <td style="padding: 14px 10px; font-family: var(--font-mono); font-size: 12.5px;">
                      ${ca.amountDisbursed > 0 ? `
                        <strong style="color: #34D399;">Rp ${Number(ca.amountDisbursed).toLocaleString('id-ID')}</strong>
                        <div style="font-size: 10px; color: var(--text-muted);">${ca.disbursementDetails?.disbursedAt?.split(' ')[0] || ''}</div>
                      ` : `
                        <span style="color: var(--text-muted); font-size: 11px;">Belum dicairkan</span>
                      `}
                    </td>

                    <td style="padding: 14px 10px;">
                      ${stageBadge}
                    </td>

                    <td style="padding: 14px 10px;">
                      ${statusBadge}
                    </td>

                    <td style="padding: 14px 10px; text-align: center;" onclick="event.stopPropagation()">
                      <div style="display: flex; gap: 6px; justify-content: center; align-items: center; flex-wrap: wrap;">
                        
                        ${isWaitingLPJ ? `
                          <button type="button" class="btn-nalar-primary" style="padding: 4px 10px; font-size: 11px; background: linear-gradient(135deg, #EC4899 0%, #DB2777 100%); border-color: #F472B6; color: #fff; font-weight: 600;" onclick="CashAdvanceModule.openSettlementModal('${ca.id}')">
                            📝 Input LPJ
                          </button>
                        ` : ''}

                        ${(isLPJSubmitted || isSettled) ? `
                          <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: #A78BFA; border-color: rgba(167,139,250,0.4);" onclick="CashAdvanceModule.openSettlementDetailModal('${ca.id}')">
                            👁️ Lihat LPJ
                          </button>
                        ` : ''}

                        <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: var(--text-muted);" onclick="App.openApprovalTracker('CA', '${ca.id}')" title="Buka Level Tracker">
                          🔍 Tracker
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

      <!-- =========================================================================
           MODAL 1: BUAT PENGAJUAN CASH ADVANCE BARU (PROPORTIONAL & SPACIOUS)
           ========================================================================= -->
      <div id="modal-cash-advance" class="modal-backdrop">
        <div class="modal-box" style="max-width: 860px; width: 95%;">
          
          <!-- Header Modal -->
          <div class="modal-header" style="padding: 22px 32px; border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.35); display: flex; align-items: center; justify-content: center; color: #FCD34D; font-size: 22px; flex-shrink: 0; box-shadow: 0 4px 14px rgba(245,158,11,0.2);">
                💵
              </div>
              <div>
                <h3 class="modal-title" style="font-size: 19px; font-weight: 600; color: #fff;">Form Pengajuan Cash Advance (Kasbon Operasional)</h3>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 3px;">
                  <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245,158,11,0.12); padding: 2px 8px; border-radius: 4px; font-size: 10.5px;">Alur Otorisasi 2-Layer</span>
                  <span style="font-size: 11.5px; color: var(--text-muted);">Persetujuan Direksi & Eksekusi Pencairan FAT</span>
                </div>
              </div>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-cash-advance')" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form onsubmit="CashAdvanceModule.handleCreateSubmit(event)">
            <div class="modal-body" style="padding: 28px 32px; max-height: calc(100vh - 270px); overflow-y: auto;">
              
              <!-- Section 1: Pokok Pengajuan -->
              <div style="margin-bottom: 22px;">
                <div class="form-group" style="margin-bottom: 18px;">
                  <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">
                    Keperluan / Judul Permintaan Kasbon <span style="color: #F87171;">*</span>
                  </label>
                  <input type="text" id="ca-title" class="form-control" placeholder="Contoh: Biaya Operasional Survei Titik Dapur Komunitas Wilayah Jawa Barat" style="padding: 12px 16px; font-size: 13.5px;" required>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">
                      Kategori Kasbon <span style="color: #F87171;">*</span>
                    </label>
                    <select id="ca-category" class="form-control" style="padding: 12px 16px; font-size: 13.5px;" required>
                      <option value="Operasional Lapangan">Operasional Lapangan & Survei</option>
                      <option value="Perjalanan Dinas">Perjalanan Dinas & Transportasi</option>
                      <option value="Belanja Mendesak SPPG">Belanja Mendesak Dapur SPPG</option>
                      <option value="Logistik & Event">Logistik & Sosialisasi Yayasan</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                  </div>

                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">
                      Target Lokasi / Titik SPPG <span style="color: #F87171;">*</span>
                    </label>
                    <input type="text" id="ca-location" class="form-control" placeholder="Contoh: Wilayah Bandung & Sumedang" style="padding: 12px 16px; font-size: 13.5px;" required>
                  </div>
                </div>
              </div>

              <!-- Section 2: Nominal & Jadwal -->
              <div style="margin-bottom: 24px; padding: 20px 22px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.07); border-radius: var(--radius-md);">
                <div style="display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 18px; align-items: start;">
                  
                  <!-- Nominal -->
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #FCD34D;">
                      Nominal Kasbon Diminta (Rp) <span style="color: #F87171;">*</span>
                    </label>
                    <input type="number" id="ca-amount" class="form-control" placeholder="Contoh: 3500000" min="50000" step="10000" oninput="CashAdvanceModule.formatAmountPreview(this.value)" style="font-family: var(--font-mono); font-size: 15px; font-weight: 600; padding: 12px 16px;" required>
                    <div id="ca-amount-preview" style="font-family: var(--font-mono); font-size: 12px; color: #FCD34D; margin-top: 6px; display: inline-flex; align-items: center; gap: 4px; background: rgba(245,158,11,0.12); padding: 3px 8px; border-radius: 4px; border: 1px solid rgba(245,158,11,0.25);">
                      Estimasi: Rp 0
                    </div>
                  </div>

                  <!-- Tgl Penggunaan -->
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">
                      Rencana Penggunaan <span style="color: #F87171;">*</span>
                    </label>
                    <input type="date" id="ca-usage-date" class="form-control" style="padding: 12px 14px; font-size: 13px;" required>
                  </div>

                  <!-- Target LPJ -->
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">
                      Target Laporan LPJ <span style="color: #F87171;">*</span>
                    </label>
                    <input type="date" id="ca-settlement-date" class="form-control" style="padding: 12px 14px; font-size: 13px;" required>
                  </div>

                </div>
              </div>

              <!-- Section 3: Rekening Bank Pemohon -->
              <div style="background: rgba(14, 20, 32, 0.7); border: 1px solid rgba(96, 165, 250, 0.25); border-radius: var(--radius-md); padding: 18px 22px; margin-bottom: 22px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 15px;">💳</span>
                    <span class="text-mono-badge" style="color: #60A5FA; font-size: 11px;">Rekening Bank Tujuan Transfer (Pemohon)</span>
                  </div>
                  <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                    Data rekening penerima dana kasbon
                  </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Nama Bank</label>
                    <input type="text" id="ca-bank-name" class="form-control" value="${user.bankName || 'BCA (Bank Central Asia)'}" style="padding: 10px 14px; font-size: 13px;" required>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Nomor Rekening</label>
                    <input type="text" id="ca-bank-no" class="form-control" value="${user.rekeningNo || '-'}" style="padding: 10px 14px; font-size: 13px; font-family: var(--font-mono);" required>
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">Atas Nama Pemilik</label>
                    <input type="text" id="ca-bank-holder" class="form-control" value="${user.rekeningName || user.name}" style="padding: 10px 14px; font-size: 13px;" required>
                  </div>
                </div>
              </div>

              <!-- Section 4: Justifikasi Kebutuhan -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">
                  Rincian Estimasi & Justifikasi Kebutuhan Pengeluaran <span style="color: #F87171;">*</span>
                </label>
                <textarea id="ca-reason" class="form-control" rows="3" placeholder="Jelaskan kebutuhan pengeluaran dana secara rinci dan urgensi operasional lapangan..." style="padding: 12px 16px; font-size: 13px; line-height: 1.6;" required></textarea>
              </div>

            </div>

            <!-- Modal Footer -->
            <div class="modal-footer" style="padding: 20px 32px; background: rgba(13, 13, 16, 0.85); border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; align-items: center; gap: 14px;">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-cash-advance')" style="padding: 10px 22px; font-size: 13px;">
                Batal
              </button>
              <button type="submit" class="btn-nalar-primary" style="padding: 10px 28px; font-size: 13.5px; font-weight: 700; background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color: #FCD34D; color: #000; box-shadow: 0 4px 18px rgba(245, 158, 11, 0.35);">
                Kirim Pengajuan Kasbon
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- =========================================================================
           MODAL 2: FORM LPJ / PERTANGGUNGJAWABAN REALISASI BELANJA
           ========================================================================= -->
      <div id="modal-ca-settlement" class="modal-backdrop">
        <div class="modal-box" style="max-width: 860px; width: 95%;">
          <div class="modal-header" style="padding: 22px 32px; border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 14px;">
              <div style="width: 42px; height: 42px; border-radius: 10px; background: rgba(236,72,153,0.15); border: 1px solid rgba(236,72,153,0.35); display: flex; align-items: center; justify-content: center; color: #F472B6; font-size: 22px; flex-shrink: 0; box-shadow: 0 4px 14px rgba(236,72,153,0.2);">
                📝
              </div>
              <div>
                <h3 class="modal-title" style="font-size: 19px; font-weight: 600; color: #fff;">Form Laporan Realisasi Belanja (LPJ Kasbon)</h3>
                <p id="settle-ca-subtitle" style="font-size: 11.5px; color: #A78BFA; font-family: var(--font-mono); margin-top: 3px;">
                  Plafon Dana Diterima: Rp 0
                </p>
              </div>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-ca-settlement')" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form onsubmit="CashAdvanceModule.handleSettlementSubmit(event)">
            <input type="hidden" id="settle-ca-id">
            <div class="modal-body" style="padding: 28px 32px; max-height: calc(100vh - 270px); overflow-y: auto;">
              
              <!-- Info Kasbon Diterima -->
              <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 18px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                <div>
                  <span class="text-mono-badge" style="color: var(--text-muted); font-size: 10.5px;">Kasbon Operasional Terpilih</span>
                  <div id="settle-ca-title" style="font-weight: 600; color: #fff; font-size: 14px; margin-top: 2px;">-</div>
                </div>
                <div style="text-align: right;">
                  <span style="font-size: 11px; color: var(--text-muted);">Dana Kasbon Diterima (Disbursed):</span>
                  <div id="settle-ca-amount-received" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: #34D399;">
                    Rp 0
                  </div>
                </div>
              </div>

              <!-- Dynamic Items Table -->
              <div style="margin-bottom: 22px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <label class="form-label" style="margin-bottom: 0; color: #fff; font-size: 12px;">
                    📋 Rincian Item Pengeluaran Realisasi <span style="color: #F87171;">*</span>
                  </label>
                  <button type="button" class="btn-nalar-secondary" onclick="CashAdvanceModule.addSettlementItemRow()" style="padding: 6px 14px; font-size: 12px; color: #60A5FA; border-color: rgba(96,165,250,0.4);">
                    + Tambah Baris Item
                  </button>
                </div>

                <div style="background: rgba(0,0,0,0.25); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; overflow-x: auto;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead>
                      <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; color: var(--text-dim); font-size: 11px;">
                        <th style="padding: 8px 10px; width: 40%;">Nama Item / Deskripsi Pengeluaran</th>
                        <th style="padding: 8px 10px; width: 15%;">Qty</th>
                        <th style="padding: 8px 10px; width: 20%;">Harga Satuan (Rp)</th>
                        <th style="padding: 8px 10px; width: 20%;">Subtotal (Rp)</th>
                        <th style="padding: 8px 6px; width: 5%; text-align: center;">✕</th>
                      </tr>
                    </thead>
                    <tbody id="settle-items-tbody">
                      <!-- Rendered dynamically -->
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Upload Nota / Kwitansi Fisik -->
              <div class="form-group" style="margin-bottom: 22px;">
                <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">
                  Lampiran Foto Nota / Struk / Kwitansi Belanja <span style="color: #F87171;">*</span>
                </label>
                <div style="display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
                  <label class="btn-nalar-secondary" style="cursor: pointer; padding: 10px 18px; font-size: 13px; display: inline-flex; align-items: center; gap: 8px;">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>Pilih Foto Nota (JPG/PNG)</span>
                    <input type="file" id="settle-proof-input" accept="image/*" style="display: none;" onchange="CashAdvanceModule.handleProofFileSelect(event)">
                  </label>
                  <span id="settle-proof-name" style="font-size: 12px; color: var(--text-muted); font-family: var(--font-mono);">Belum ada foto nota dipilih</span>
                </div>
                <div id="settle-proof-preview-box" style="margin-top: 10px; display: none;">
                  <img id="settle-proof-img" src="" alt="Preview Nota" style="max-height: 160px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                </div>
              </div>

              <!-- Kotak Kalkulasi Selisih Otomatis -->
              <div id="settle-calculation-box" style="background: rgba(18, 22, 34, 0.95); border: 1.5px solid var(--border-subtle); border-radius: var(--radius-md); padding: 18px 20px; margin-top: 16px;">
                <span class="text-mono-badge" style="color: #FCD34D; font-size: 11px;">Kalkulasi Otomatis Rekonsiliasi Kas</span>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 12px;">
                  <div style="font-size: 12.5px; color: var(--text-secondary);">
                    Total Kasbon Diterima (A): <strong id="calc-amount-received" style="color: #34D399; font-family: var(--font-mono); margin-left: 4px;">Rp 0</strong>
                  </div>
                  <div style="font-size: 12.5px; color: var(--text-secondary);">
                    Total Realisasi Pengeluaran (B): <strong id="calc-total-spent" style="color: #60A5FA; font-family: var(--font-mono); margin-left: 4px;">Rp 0</strong>
                  </div>
                </div>

                <div id="calc-result-banner" style="margin-top: 14px; padding: 14px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                  <!-- Dynamic calculation result -->
                </div>
              </div>

              <div class="form-group" style="margin-top: 18px; margin-bottom: 0;">
                <label class="form-label" style="font-size: 12px; margin-bottom: 8px; color: #fff;">Catatan Tambahan LPJ</label>
                <textarea id="settle-notes" class="form-control" rows="2" placeholder="Catatan opsional untuk tim FAT mengenai pelaksanaan kegiatan..." style="padding: 12px 16px; font-size: 13px; line-height: 1.6;"></textarea>
              </div>

            </div>

            <div class="modal-footer" style="padding: 20px 32px; background: rgba(13, 13, 16, 0.85); border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; align-items: center; gap: 14px;">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-ca-settlement')" style="padding: 10px 22px; font-size: 13px;">Batal</button>
              <button type="submit" class="btn-nalar-primary" style="padding: 10px 28px; font-size: 13.5px; font-weight: 700; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);">
                Kirim Laporan LPJ & Realisasi
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- =========================================================================
           MODAL 3: LIHAT RINCIAN LPJ & KWITANSI
           ========================================================================= -->
      <div id="modal-ca-settlement-detail" class="modal-backdrop">
        <div class="modal-box" style="max-width: 780px; width: 95%;">
          <div class="modal-header" style="padding: 22px 32px; border-bottom: 1px solid var(--border-subtle);">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(167,139,250,0.15); border: 1px solid rgba(167,139,250,0.35); display: flex; align-items: center; justify-content: center; color: #C4B5FD; font-size: 18px;">
                🔍
              </div>
              <h3 class="modal-title" style="font-size: 18px; font-weight: 600; color: #fff;">Rincian Laporan Realisasi Belanja (LPJ)</h3>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-ca-settlement-detail')" style="width: 34px; height: 34px; border-radius: 50%; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div id="ca-settlement-detail-body" class="modal-body" style="padding: 26px 32px; max-height: calc(100vh - 270px); overflow-y: auto;">
            <!-- Populated dynamically -->
          </div>
          <div class="modal-footer" style="padding: 18px 32px; background: rgba(13, 13, 16, 0.85); border-top: 1px solid var(--border-subtle);">
            <button type="button" class="btn-nalar-primary" onclick="App.closeModal('modal-ca-settlement-detail')" style="padding: 9px 24px;">Tutup</button>
          </div>
        </div>
      </div>
    `;
  },

  setFilter: function(filter) {
    this.currentFilter = filter;
    this.render(document.getElementById('main-content-area'));
  },

  openCreateModal: function() {
    const user = DB.getCurrentUser();
    const today = new Date().toISOString().split('T')[0];
    const nextWeek = new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0];
    
    const usageDateEl = document.getElementById('ca-usage-date');
    const settleDateEl = document.getElementById('ca-settlement-date');
    if (usageDateEl) usageDateEl.value = today;
    if (settleDateEl) settleDateEl.value = nextWeek;

    const titleEl = document.getElementById('ca-title');
    if (titleEl) titleEl.value = '';
    const amountEl = document.getElementById('ca-amount');
    if (amountEl) amountEl.value = '';
    const previewEl = document.getElementById('ca-amount-preview');
    if (previewEl) previewEl.textContent = 'Estimasi: Rp 0';
    const reasonEl = document.getElementById('ca-reason');
    if (reasonEl) reasonEl.value = '';

    const bankNameEl = document.getElementById('ca-bank-name');
    if (bankNameEl && user) bankNameEl.value = user.bankName || 'BCA (Bank Central Asia)';
    const bankNoEl = document.getElementById('ca-bank-no');
    if (bankNoEl && user) bankNoEl.value = user.rekeningNo || '-';
    const bankHolderEl = document.getElementById('ca-bank-holder');
    if (bankHolderEl && user) bankHolderEl.value = user.rekeningName || user.name;

    App.openModal('modal-cash-advance');
  },

  formatAmountPreview: function(val) {
    const previewEl = document.getElementById('ca-amount-preview');
    if (!previewEl) return;
    const num = Number(val) || 0;
    previewEl.textContent = `Estimasi: Rp ${num.toLocaleString('id-ID')}`;
  },

  handleCreateSubmit: function(e) {
    if (e && e.preventDefault) e.preventDefault();
    
    const title = (document.getElementById('ca-title')?.value || '').trim();
    const category = document.getElementById('ca-category')?.value || 'Operasional Lapangan';
    const targetLocation = (document.getElementById('ca-location')?.value || '').trim();
    const amountRequested = Number(document.getElementById('ca-amount')?.value || 0);
    const usagePlanDate = document.getElementById('ca-usage-date')?.value || '';
    const settlementPlanDate = document.getElementById('ca-settlement-date')?.value || '';
    const bankName = (document.getElementById('ca-bank-name')?.value || '').trim();
    const bankAccountNo = (document.getElementById('ca-bank-no')?.value || '').trim();
    const bankAccountName = (document.getElementById('ca-bank-holder')?.value || '').trim();
    const reason = (document.getElementById('ca-reason')?.value || '').trim();

    if (!title || !amountRequested || amountRequested <= 0) {
      App.showToast('Mohon lengkapi judul dan nominal kasbon yang valid!', 'warn');
      return;
    }

    const newCA = DB.addCashAdvance({
      title,
      category,
      targetLocation,
      amountRequested,
      usagePlanDate,
      settlementPlanDate,
      bankName,
      bankAccountNo,
      bankAccountName,
      reason
    });

    App.closeModal('modal-cash-advance');
    App.showToast(`Pengajuan Cash Advance ${newCA.id} sebesar Rp ${amountRequested.toLocaleString('id-ID')} berhasil dibuat! Menunggu otorisasi Direksi.`, 'success');
    this.render(document.getElementById('main-content-area'));
  },

  // Settlement LPJ
  openSettlementModal: function(caId) {
    const ca = DB.getCashAdvanceById(caId);
    if (!ca) return;

    this.selectedCaId = caId;
    this.settlementItems = [
      { name: '', qty: 1, unitPrice: 0 }
    ];
    this.settlementProofUrl = null;

    document.getElementById('settle-ca-id').value = caId;
    const titleEl = document.getElementById('settle-ca-title');
    if (titleEl) titleEl.textContent = `${ca.id} — ${ca.title}`;
    
    const disbursed = ca.amountDisbursed || ca.amountApproved || ca.amountRequested;
    const amountEl = document.getElementById('settle-ca-amount-received');
    if (amountEl) amountEl.textContent = `Rp ${Number(disbursed).toLocaleString('id-ID')}`;

    const subEl = document.getElementById('settle-ca-subtitle');
    if (subEl) subEl.textContent = `Plafon Dana Diterima: Rp ${Number(disbursed).toLocaleString('id-ID')} (Transfer FAT)`;

    const proofNameEl = document.getElementById('settle-proof-name');
    if (proofNameEl) proofNameEl.textContent = 'Belum ada foto nota dipilih';
    const previewBox = document.getElementById('settle-proof-preview-box');
    if (previewBox) previewBox.style.display = 'none';

    this.renderSettlementItemRows();
    this.updateLiveCalculations();

    App.openModal('modal-ca-settlement');
  },

  renderSettlementItemRows: function() {
    const tbody = document.getElementById('settle-items-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.settlementItems.map((item, idx) => {
      const subtotal = (Number(item.qty) || 1) * (Number(item.unitPrice) || 0);
      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
          <td style="padding: 6px 8px;">
            <input type="text" class="form-control" style="font-size: 12px; padding: 6px 10px;" placeholder="Contoh: BBM Kendaraan Operasional / Nota Pembelian Sayur" value="${item.name || ''}" oninput="CashAdvanceModule.updateItemField(${idx}, 'name', this.value)" required>
          </td>
          <td style="padding: 6px 8px;">
            <input type="number" class="form-control" style="font-size: 12px; padding: 6px 10px; font-family: var(--font-mono);" min="1" value="${item.qty || 1}" oninput="CashAdvanceModule.updateItemField(${idx}, 'qty', this.value)" required>
          </td>
          <td style="padding: 6px 8px;">
            <input type="number" class="form-control" style="font-size: 12px; padding: 6px 10px; font-family: var(--font-mono);" min="0" step="500" placeholder="0" value="${item.unitPrice || 0}" oninput="CashAdvanceModule.updateItemField(${idx}, 'unitPrice', this.value)" required>
          </td>
          <td style="padding: 6px 8px; font-family: var(--font-mono); font-weight: 700; color: #60A5FA;">
            Rp ${subtotal.toLocaleString('id-ID')}
          </td>
          <td style="padding: 6px 4px; text-align: center;">
            ${this.settlementItems.length > 1 ? `
              <button type="button" style="background: none; border: none; color: #F87171; cursor: pointer; font-size: 14px;" onclick="CashAdvanceModule.removeSettlementItemRow(${idx})" title="Hapus Baris">✕</button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  addSettlementItemRow: function() {
    this.settlementItems.push({ name: '', qty: 1, unitPrice: 0 });
    this.renderSettlementItemRows();
    this.updateLiveCalculations();
  },

  removeSettlementItemRow: function(idx) {
    if (this.settlementItems.length > 1) {
      this.settlementItems.splice(idx, 1);
      this.renderSettlementItemRows();
      this.updateLiveCalculations();
    }
  },

  updateItemField: function(idx, field, value) {
    if (this.settlementItems[idx]) {
      this.settlementItems[idx][field] = (field === 'qty' || field === 'unitPrice') ? Number(value) : value;
      this.updateLiveCalculations();
      
      // Update subtotal display only without re-rendering inputs to avoid focus loss
      const tbody = document.getElementById('settle-items-tbody');
      if (tbody) {
        const rows = tbody.querySelectorAll('tr');
        if (rows[idx]) {
          const subtotalCell = rows[idx].cells[3];
          if (subtotalCell) {
            const subtotal = (Number(this.settlementItems[idx].qty) || 1) * (Number(this.settlementItems[idx].unitPrice) || 0);
            subtotalCell.textContent = `Rp ${subtotal.toLocaleString('id-ID')}`;
          }
        }
      }
    }
  },

  updateLiveCalculations: function() {
    const ca = DB.getCashAdvanceById(this.selectedCaId);
    if (!ca) return;

    const amountReceived = Number(ca.amountDisbursed || ca.amountApproved || ca.amountRequested) || 0;
    const totalSpent = this.settlementItems.reduce((acc, item) => acc + ((Number(item.qty) || 1) * (Number(item.unitPrice) || 0)), 0);

    const receivedEl = document.getElementById('calc-amount-received');
    if (receivedEl) receivedEl.textContent = `Rp ${amountReceived.toLocaleString('id-ID')}`;

    const spentEl = document.getElementById('calc-total-spent');
    if (spentEl) spentEl.textContent = `Rp ${totalSpent.toLocaleString('id-ID')}`;

    const banner = document.getElementById('calc-result-banner');
    if (!banner) return;

    const diff = amountReceived - totalSpent;

    if (diff > 0) {
      // Ada sisa uang yang harus dikembalikan ke Yayasan
      banner.style.background = 'rgba(16, 185, 129, 0.15)';
      banner.style.border = '1px solid rgba(52, 211, 153, 0.35)';
      banner.style.color = '#34D399';
      banner.innerHTML = `
        <div>
          <span>🟢 SISA DANA YANG HARUS DIKEMBALIKAN KE YAYASAN:</span>
          <div style="font-size: 11px; color: var(--text-secondary); font-weight: 400; margin-top: 2px;">
            Transfer sisa dana ke Rekening FAT: <strong>Bank Mandiri 137-00-5558889-1 a.n Yayasan MMS</strong>
          </div>
        </div>
        <div style="font-size: 18px; font-family: var(--font-mono); font-weight: 700;">
          Rp ${diff.toLocaleString('id-ID')}
        </div>
      `;
    } else if (diff < 0) {
      // Belanja lebih besar (Reimbursement)
      const reimburse = Math.abs(diff);
      banner.style.background = 'rgba(59, 130, 246, 0.15)';
      banner.style.border = '1px solid rgba(96, 165, 250, 0.35)';
      banner.style.color = '#60A5FA';
      banner.innerHTML = `
        <div>
          <span>🔵 KEKURANGAN DANA (REIMBURSEMENT OLEH YAYASAN):</span>
          <div style="font-size: 11px; color: var(--text-secondary); font-weight: 400; margin-top: 2px;">
            Pengeluaran melebihi plafon kasbon. Selisih akan diganti oleh FAT ke rekening Anda.
          </div>
        </div>
        <div style="font-size: 18px; font-family: var(--font-mono); font-weight: 700;">
          Rp ${reimburse.toLocaleString('id-ID')}
        </div>
      `;
    } else {
      // Tepat sama
      banner.style.background = 'rgba(255, 255, 255, 0.05)';
      banner.style.border = '1px solid rgba(255, 255, 255, 0.1)';
      banner.style.color = '#E2E8F0';
      banner.innerHTML = `
        <div>
          <span>⚪ PENGELUARAN TEPAT SESUAI PLAFON KASBON</span>
          <div style="font-size: 11px; color: var(--text-muted); font-weight: 400; margin-top: 2px;">
            Total nota belanja sama persis dengan dana yang diterima (Rp 0 selisih).
          </div>
        </div>
        <div style="font-size: 18px; font-family: var(--font-mono); font-weight: 700; color: #34D399;">
          Rp 0 (Pas)
        </div>
      `;
    }
  },

  handleProofFileSelect: function(e) {
    const file = e.target.files[0];
    if (!file) return;

    const nameEl = document.getElementById('settle-proof-name');
    if (nameEl) nameEl.textContent = `✓ ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;

    const reader = new FileReader();
    reader.onload = (ev) => {
      this.settlementProofUrl = ev.target.result;
      const previewBox = document.getElementById('settle-proof-preview-box');
      const img = document.getElementById('settle-proof-img');
      if (previewBox && img) {
        img.src = ev.target.result;
        previewBox.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  },

  handleSettlementSubmit: function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const caId = document.getElementById('settle-ca-id')?.value || this.selectedCaId;
    const ca = DB.getCashAdvanceById(caId);
    if (!ca) return;

    // Validate items
    const validItems = this.settlementItems.filter(i => i.name && i.name.trim() && Number(i.unitPrice) > 0);
    if (validItems.length === 0) {
      App.showToast('Mohon masukkan minimal 1 baris item pengeluaran beserta harganya!', 'warn');
      return;
    }

    const notes = (document.getElementById('settle-notes')?.value || '').trim();

    DB.submitCashAdvanceSettlement(caId, {
      items: validItems,
      proofFiles: this.settlementProofUrl ? [{ name: 'Bukti-Nota-Kwitansi.jpg', dataUrl: this.settlementProofUrl }] : [],
      notes
    });

    App.closeModal('modal-ca-settlement');
    App.showToast(`Laporan LPJ Realisasi untuk Cash Advance ${caId} berhasil dikirim ke Tim FAT untuk verifikasi penutupan kasbon!`, 'success');
    this.render(document.getElementById('main-content-area'));
  },

  openSettlementDetailModal: function(caId) {
    const ca = DB.getCashAdvanceById(caId);
    if (!ca || !ca.settlement) {
      App.showToast('Laporan LPJ belum disubmit untuk kasbon ini.', 'warn');
      return;
    }

    const s = ca.settlement;
    const disbursed = Number(ca.amountDisbursed || ca.amountApproved || ca.amountRequested) || 0;
    const body = document.getElementById('ca-settlement-detail-body');
    if (!body) return;

    body.innerHTML = `
      <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 16px;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div>
            <span class="text-mono-badge" style="color: #FCD34D;">${ca.id}</span>
            <div style="font-weight: 600; color: #fff; font-size: 15px; margin-top: 2px;">${ca.title}</div>
            <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
              Pelapor: <strong>${s.submittedBy}</strong> · Tanggal LPJ: ${s.submittedAt}
            </div>
          </div>
          <div style="text-align: right;">
            <span class="badge-status ${ca.status === 'SETTLED' ? 'success' : 'info'}">${ca.status}</span>
          </div>
        </div>
      </div>

      <!-- Rekap Angka -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 16px;">
        <div style="background: rgba(255,255,255,0.03); padding: 10px 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 11px; color: var(--text-muted);">Dana Kasbon Diterima</div>
          <div style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: #34D399; margin-top: 2px;">
            Rp ${disbursed.toLocaleString('id-ID')}
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 10px 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 11px; color: var(--text-muted);">Total Realisasi Belanja</div>
          <div style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: #60A5FA; margin-top: 2px;">
            Rp ${Number(s.totalSpent).toLocaleString('id-ID')}
          </div>
        </div>
        <div style="background: rgba(255,255,255,0.03); padding: 10px 14px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
          <div style="font-size: 11px; color: var(--text-muted);">Status Rekonsiliasi</div>
          <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: ${s.refundAmount > 0 ? '#34D399' : s.reimburseAmount > 0 ? '#60A5FA' : '#fff'}; margin-top: 2px;">
            ${s.refundAmount > 0 ? `Sisa Dikembalikan: Rp ${Number(s.refundAmount).toLocaleString('id-ID')}` : s.reimburseAmount > 0 ? `Reimburse: Rp ${Number(s.reimburseAmount).toLocaleString('id-ID')}` : 'Sesuai (Pas)'}
          </div>
        </div>
      </div>

      <!-- Tabel Rincian Belanja -->
      <h4 style="font-size: 13px; color: #fff; margin-bottom: 8px;">Rincian Item Nota Pengeluaran:</h4>
      <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; margin-bottom: 16px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; color: var(--text-dim); font-size: 11px;">
            <th style="padding: 6px 8px;">Item Pengeluaran</th>
            <th style="padding: 6px 8px;">Qty</th>
            <th style="padding: 6px 8px;">Harga Satuan</th>
            <th style="padding: 6px 8px; text-align: right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${(s.items || []).map(item => `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
              <td style="padding: 8px; color: #fff;">${item.name}</td>
              <td style="padding: 8px; font-family: var(--font-mono);">${item.qty}</td>
              <td style="padding: 8px; font-family: var(--font-mono);">Rp ${Number(item.unitPrice).toLocaleString('id-ID')}</td>
              <td style="padding: 8px; font-family: var(--font-mono); font-weight: 700; color: #60A5FA; text-align: right;">
                Rp ${(Number(item.qty) * Number(item.unitPrice)).toLocaleString('id-ID')}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Bukti Nota Struk -->
      ${(s.proofFiles && s.proofFiles.length > 0 && s.proofFiles[0].dataUrl) ? `
        <h4 style="font-size: 13px; color: #fff; margin-bottom: 8px;">Lampiran Foto Struk / Nota Kwitansi:</h4>
        <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px; text-align: center; margin-bottom: 14px;">
          <img src="${s.proofFiles[0].dataUrl}" alt="Foto Bukti Kwitansi" style="max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 4px;">
        </div>
      ` : ''}

      ${s.notes ? `
        <div style="font-size: 12px; color: var(--text-muted); font-style: italic; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px;">
          Catatan: "${s.notes}"
        </div>
      ` : ''}
    `;

    App.openModal('modal-ca-settlement-detail');
  }
};
