/**
 * ERP MMS - Modul Klaim Reimburse (Penggantian Biaya Operasional)
 * 9 Form Fields, Multi-Tier Dynamic Approvals (Jalur 1 Lapangan / Jalur 2 Kantor), & Lightbox Preview
 */

window.ReimburseModule = {
  currentFilter: 'ALL', // 'ALL', 'PENDING', 'FAT_TRANSFER', 'SETTLED', 'REJECTED'
  currentAttachment: { url: null, name: null },

  setFilter: function(filter) {
    this.currentFilter = filter;
    this.render(document.getElementById('main-content-area'));
  },

  render: function(container) {
    if (!container) return;
    const user = DB.getCurrentUser();
    const allRMBs = DB.getReimbursements() || [];

    // Filter mandiri: pengajuan milik akun aktif
    const myRMBs = allRMBs.filter(r => {
      if (!r) return false;
      const matchId = (r.employeeId && user.id && r.employeeId.toLowerCase() === user.id.toLowerCase());
      const matchName = (r.employeeName && user.name && r.employeeName.toLowerCase().includes(user.name.toLowerCase()));
      return matchId || matchName;
    });

    const totalClaimed = myRMBs.reduce((sum, r) => sum + (Number(r.subtotal) || 0), 0);
    const pendingCount = myRMBs.filter(r => r.status === 'PENDING' && r.stage !== 'FAT_DISBURSEMENT').length;
    const fatTransferCount = myRMBs.filter(r => r.status === 'PENDING' && r.stage === 'FAT_DISBURSEMENT').length;
    const settledList = myRMBs.filter(r => r.status === 'SETTLED');
    const totalSettled = settledList.reduce((sum, r) => sum + (Number(r.subtotal) || 0), 0);
    const rejectedCount = myRMBs.filter(r => r.status === 'REJECTED').length;

    // Filtered list
    const filteredRMBs = myRMBs.filter(r => {
      if (this.currentFilter === 'ALL') return true;
      if (this.currentFilter === 'PENDING') return r.status === 'PENDING' && r.stage !== 'FAT_DISBURSEMENT';
      if (this.currentFilter === 'FAT_TRANSFER') return r.status === 'PENDING' && r.stage === 'FAT_DISBURSEMENT';
      if (this.currentFilter === 'SETTLED') return r.status === 'SETTLED';
      if (this.currentFilter === 'REJECTED') return r.status === 'REJECTED';
      return true;
    });

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Header & Nav Action -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-mono-badge" style="color: #10B981; background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3);">KLAIM BIAYA OPERASIONAL</span>
              <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                ● Login: <strong style="color: #fff;">${user.name}</strong> (${user.roleLabel})
              </span>
            </div>
            <h1 style="font-size: 26px; font-weight: 600; margin-top: 2px;">Klaim Reimbursement Operasional</h1>
            <p style="color: var(--text-secondary); font-size: 13.5px; margin-top: 4px;">
              Pengajuan klaim penggantian biaya operasional yang telah dikeluarkan, verifikasi berjenjang & pencairan transfer langsung oleh FAT Officer.
            </p>
          </div>

          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <!-- Sub-navigation 3 Services -->
            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('pengajuan')" style="display: flex; align-items: center; gap: 8px; font-size: 13px;">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span>Pengadaan PR</span>
            </button>

            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('cash-advance')" style="display: flex; align-items: center; gap: 8px; font-size: 13px; color: #FCD34D; border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.08);">
              <span>💵 Cash Advance</span>
            </button>

            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('pesanan')" style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #60A5FA; border-color: rgba(59,130,246,0.4); background: rgba(59,130,246,0.08);">
              <span>📦 Pesanan & PO</span>
            </button>

            <button type="button" class="btn-nalar-primary" onclick="ReimburseModule.openCreateModal()" style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; background: linear-gradient(135deg, #059669 0%, #10B981 100%); border-color: #34D399; color: #fff; box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>+ Buat Klaim Reimburse Baru</span>
            </button>
          </div>
        </div>

        <!-- 3 HUD KPI Cards -->
        <div class="kpi-stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 28px;">
          
          <!-- Card 1: Total Pengajuan Saya -->
          <div class="kpi-chip hud-corner-box aura-box-emerald">
            <div class="card-aura-glow aura-emerald"></div>
            <div class="kpi-chip-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(16, 185, 129, 0.18); color: #34D399; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                  🧾
                </div>
                <span class="kpi-chip-title">Total Klaim Diajukan Saya</span>
              </div>
              <span class="text-mono-badge" style="color: #34D399; background: rgba(16, 185, 129, 0.12); padding: 2px 8px; border-radius: 4px;">TA 2026</span>
            </div>
            <div class="kpi-chip-value" style="color: #34D399; font-family: var(--font-mono); font-size: 26px; font-weight: 700;">
              Rp ${totalClaimed.toLocaleString('id-ID')}
            </div>
            <div class="kpi-chip-footer" style="color: var(--text-muted); font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 8px;">
              <span>Akumulasi ${myRMBs.length} klaim reimburse</span>
              <span style="color: #A7F3D0;">Aktif</span>
            </div>
          </div>

          <!-- Card 2: Menunggu Otorisasi / Approval -->
          <div class="kpi-chip hud-corner-box aura-box-amber">
            <div class="card-aura-glow aura-amber"></div>
            <div class="kpi-chip-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(245, 158, 11, 0.18); color: #FCD34D; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                  ⏳
                </div>
                <span class="kpi-chip-title">Dalam Proses Approval</span>
              </div>
              <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245, 158, 11, 0.12); padding: 2px 8px; border-radius: 4px;">Review</span>
            </div>
            <div class="kpi-chip-value" style="color: #FCD34D; font-family: var(--font-mono); font-size: 26px; font-weight: 700;">
              ${pendingCount + fatTransferCount} <span style="font-size: 15px; font-weight: 400; color: var(--text-secondary);">Berkas</span>
            </div>
            <div class="kpi-chip-footer" style="color: var(--text-muted); font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 8px;">
              <span>${pendingCount} tahap verifikasi</span>
              <span style="color: #FCD34D;">${fatTransferCount} antrean FAT</span>
            </div>
          </div>

          <!-- Card 3: Selesai Dicairkan / Settled -->
          <div class="kpi-chip hud-corner-box" style="border: 1px solid rgba(59, 130, 246, 0.35); background: rgba(15, 23, 42, 0.65);">
            <div class="kpi-chip-header">
              <div style="display: flex; align-items: center; gap: 8px;">
                <div style="width: 28px; height: 28px; border-radius: 6px; background: rgba(59, 130, 246, 0.18); color: #60A5FA; display: flex; align-items: center; justify-content: center; font-size: 14px;">
                  💳
                </div>
                <span class="kpi-chip-title">Selesai Dicairkan (Settled)</span>
              </div>
              <span class="text-mono-badge" style="color: #60A5FA; background: rgba(59, 130, 246, 0.12); padding: 2px 8px; border-radius: 4px;">Settled</span>
            </div>
            <div class="kpi-chip-value" style="color: #60A5FA; font-family: var(--font-mono); font-size: 26px; font-weight: 700;">
              Rp ${totalSettled.toLocaleString('id-ID')}
            </div>
            <div class="kpi-chip-footer" style="color: var(--text-muted); font-size: 12px; display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 8px; margin-top: 8px;">
              <span>${settledList.length} klaim berhasil ditransfer FAT</span>
              <span style="color: #93C5FD;">Selesai 100%</span>
            </div>
          </div>

        </div>

        <!-- Filter Pills Bar -->
        <div class="approval-filter-bar" style="margin-bottom: 20px;">
          <button class="approval-filter-pill pill-all ${this.currentFilter === 'ALL' ? 'active' : ''}" onclick="ReimburseModule.setFilter('ALL')">
            <span class="filter-dot dot-orange"></span>
            <span>Semua Riwayat</span>
            <span class="filter-badge">${myRMBs.length}</span>
          </button>

          <button class="approval-filter-pill pill-pending ${this.currentFilter === 'PENDING' ? 'active' : ''}" onclick="ReimburseModule.setFilter('PENDING')">
            <span class="filter-dot dot-amber"></span>
            <span>Menunggu Approval</span>
            <span class="filter-badge">${pendingCount}</span>
          </button>

          <button class="approval-filter-pill ${this.currentFilter === 'FAT_TRANSFER' ? 'active' : ''}" onclick="ReimburseModule.setFilter('FAT_TRANSFER')" style="${this.currentFilter === 'FAT_TRANSFER' ? 'background: rgba(245, 158, 11, 0.2); border-color: #F59E0B; color: #FCD34D;' : ''}">
            <span class="filter-dot" style="background: #F59E0B;"></span>
            <span>Menunggu Transfer FAT</span>
            <span class="filter-badge" style="background: rgba(245, 158, 11, 0.3); color: #FCD34D;">${fatTransferCount}</span>
          </button>

          <button class="approval-filter-pill pill-settled ${this.currentFilter === 'SETTLED' ? 'active' : ''}" onclick="ReimburseModule.setFilter('SETTLED')">
            <span class="filter-dot dot-emerald"></span>
            <span>Selesai Dicairkan (Settled)</span>
            <span class="filter-badge">${settledList.length}</span>
          </button>

          ${rejectedCount > 0 ? `
            <button class="approval-filter-pill ${this.currentFilter === 'REJECTED' ? 'active' : ''}" onclick="ReimburseModule.setFilter('REJECTED')" style="${this.currentFilter === 'REJECTED' ? 'background: rgba(239, 68, 68, 0.2); border-color: #EF4444; color: #FCA5A5;' : ''}">
              <span class="filter-dot" style="background: #EF4444;"></span>
              <span>Ditolak</span>
              <span class="filter-badge" style="background: rgba(239, 68, 68, 0.3); color: #FCA5A5;">${rejectedCount}</span>
            </button>
          ` : ''}
        </div>

        <!-- Tabel Riwayat Reimburse Saya -->
        <div class="nalar-card" style="padding: 0; overflow: hidden; border: 1px solid var(--border-subtle); background: var(--bg-card);">
          <div style="padding: 16px 20px; border-bottom: 1px solid var(--border-subtle); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <div>
              <h3 style="font-size: 15px; font-weight: 600; color: #fff; margin: 0;">Daftar Pengajuan Reimburse Saya</h3>
              <p style="font-size: 12px; color: var(--text-muted); margin: 2px 0 0 0;">Menampilkan status klaim, lampiran struk pembelian, dan progres pencairan transfer.</p>
            </div>
            <span style="font-size: 12px; font-family: var(--font-mono); color: var(--text-secondary); background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 6px;">
              ${filteredRMBs.length} dari ${myRMBs.length} Berkas
            </span>
          </div>

          <div style="overflow-x: auto;">
            <table class="nalar-table" style="width: 100%; border-collapse: collapse; font-size: 13px;">
              <thead>
                <tr style="background: rgba(255,255,255,0.02); text-align: left; border-bottom: 1px solid var(--border-subtle);">
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted); width: 130px;">NO. KLAIM</th>
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted); width: 110px;">TGL BELI</th>
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted);">RINCIAN BARANG / JASA</th>
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted);">DAPUR ALOKASI</th>
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted); text-align: right;">SUBTOTAL</th>
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted); text-align: center; width: 110px;">BUKTI BAYAR</th>
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted); text-align: center; width: 170px;">STATUS & TAHAP</th>
                  <th style="padding: 12px 16px; font-weight: 600; color: var(--text-muted); text-align: center; width: 130px;">AKSI</th>
                </tr>
              </thead>
              <tbody>
                ${filteredRMBs.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
                      <div style="font-size: 32px; margin-bottom: 8px;">🧾</div>
                      <div style="font-size: 14px; font-weight: 500; color: #fff;">Belum Ada Berkas Reimbursement</div>
                      <div style="font-size: 12px; margin-top: 4px;">Klik tombol "+ Buat Klaim Reimburse Baru" di atas untuk mengajukan penggantian biaya operasional.</div>
                    </td>
                  </tr>
                ` : filteredRMBs.map(rmb => {
                  const stageBadge = this.renderStageBadge(rmb);
                  return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.04); transition: background 0.15s ease;" onmouseover="this.style.background='rgba(255,255,255,0.02)'" onmouseout="this.style.background='transparent'">
                      <td style="padding: 12px 16px; font-family: var(--font-mono); font-size: 12px; font-weight: 600; color: #10B981;">
                        <a href="javascript:void(0)" onclick="ReimburseModule.openDetailModal('${rmb.id}')" style="color: #34D399; text-decoration: none; border-bottom: 1px dashed rgba(52,211,153,0.4);">
                          ${rmb.id}
                        </a>
                      </td>
                      <td style="padding: 12px 16px; font-family: var(--font-mono); font-size: 12px; color: var(--text-secondary); white-space: nowrap;">
                        ${rmb.purchaseDate || '-'}
                      </td>
                      <td style="padding: 12px 16px;">
                        <div style="font-weight: 600; color: #fff; font-size: 13.5px;">${rmb.itemName}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 2px;">
                          <span style="color: #FCD34D;">${rmb.category}</span> · ${rmb.quantity} Unit @ Rp ${(rmb.unitPrice || 0).toLocaleString('id-ID')}
                        </div>
                      </td>
                      <td style="padding: 12px 16px; font-size: 12px; color: var(--text-secondary);">
                        <div style="display: flex; align-items: center; gap: 6px;">
                          <span>🍳</span>
                          <span style="color: #CBD5E1; font-weight: 500;">${rmb.targetKitchen}</span>
                        </div>
                      </td>
                      <td style="padding: 12px 16px; text-align: right; font-family: var(--font-mono); font-weight: 700; color: #34D399; font-size: 13.5px;">
                        Rp ${(rmb.subtotal || 0).toLocaleString('id-ID')}
                      </td>
                      <td style="padding: 12px 16px; text-align: center;">
                        ${rmb.attachmentUrl ? `
                          <button type="button" class="btn-nalar-secondary" onclick="ReimburseModule.previewAttachment('${rmb.id}')" style="padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; border-color: rgba(52, 211, 153, 0.3); color: #34D399; background: rgba(52, 211, 153, 0.08);">
                            <span>📎</span>
                            <span>Lihat Struk</span>
                          </button>
                        ` : `
                          <span style="font-size: 11px; color: var(--text-muted);">-</span>
                        `}
                      </td>
                      <td style="padding: 12px 16px; text-align: center;">
                        ${stageBadge}
                      </td>
                      <td style="padding: 12px 16px; text-align: center;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                          <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11.5px;" onclick="ReimburseModule.openDetailModal('${rmb.id}')" title="Lihat Riwayat & Timeline Approval">
                            👁️ Detail
                          </button>
                          ${rmb.status === 'PENDING' && rmb.stage === (rmb.workflowType === 'FIELD_JALUR_1' ? 'MANAGER_APPROVAL' : 'DIRECTOR_APPROVAL') ? `
                            <button type="button" class="btn-nalar-secondary" style="padding: 4px 6px; font-size: 11.5px; color: #F87171; border-color: rgba(248,113,113,0.3);" onclick="ReimburseModule.handleDelete('${rmb.id}')" title="Batalkan Pengajuan">
                              🗑️
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
        </div>

      </div>

      <!-- Modal Pengajuan Reimburse Baru (9 Field) -->
      <div id="modal-reimburse-create" class="modal-backdrop">
        <div class="modal-box" style="max-width: 680px;">
          <div class="modal-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(16, 185, 129, 0.2); color: #34D399; display: flex; align-items: center; justify-content: center; font-size: 16px;">
                🧾
              </div>
              <div>
                <h3 class="modal-title">Formulir Pengajuan Klaim Reimburse</h3>
                <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 1px;">Penggantian biaya operasional & pembelian barang mandiri</div>
              </div>
            </div>
            <button class="modal-close-btn" onclick="App.closeModal('modal-reimburse-create')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <form onsubmit="ReimburseModule.handleSubmit(event)">
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto; padding: 20px 24px;">
              
              <!-- Pemohon Profile Card -->
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                  <div style="font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px;">Akun Pemohon</div>
                  <div style="font-size: 14px; font-weight: 600; color: #fff; margin-top: 2px;">
                    ${user.name} <span style="font-size: 12px; color: #10B981; font-weight: 400;">(${user.roleLabel})</span>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-size: 11px; color: var(--text-muted);">Alur Approval Otomatis:</div>
                  <div style="font-size: 11.5px; color: #FCD34D; font-weight: 600; margin-top: 2px;">
                    ${['PERWAKILAN_YAYASAN', 'SURVEYOR', 'MAKER_YAYASAN', 'MAKER'].includes(user.role) 
                      ? 'Jalur 1: Lapangan ➔ Mgr Area ➔ Staf Ahli Keu ➔ Direksi ➔ FAT' 
                      : 'Jalur 2: Kantor ➔ Direksi ➔ FAT'}
                  </div>
                </div>
              </div>

              <!-- Field 1: Nama Barang / Jasa -->
              <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" style="font-size: 12.5px; font-weight: 600; color: #CBD5E1;">
                  1. Nama Barang / Jasa Pengeluaran <span style="color: #F87171;">*</span>
                </label>
                <input type="text" id="rmb-item-name" class="form-control" placeholder="Contoh: Pembelian Gas Elpiji 12kg & Minyak Goreng Tambahan" required style="font-size: 13px;">
              </div>

              <!-- Field 2 & 3 & 4: Harga Satuan, Qty, & Subtotal Auto Calc -->
              <div style="display: grid; grid-template-columns: 1.2fr 0.8fr 1.3fr; gap: 14px; margin-bottom: 16px;">
                
                <!-- Field 2: Harga Barang Satuan -->
                <div class="form-group">
                  <label class="form-label" style="font-size: 12px; font-weight: 600; color: #CBD5E1;">
                    2. Harga Satuan (Rp) <span style="color: #F87171;">*</span>
                  </label>
                  <input type="number" id="rmb-unit-price" class="form-control" placeholder="Contoh: 185000" min="100" step="100" oninput="ReimburseModule.calculateSubtotal()" required style="font-family: var(--font-mono); font-weight: 600; font-size: 13px;">
                </div>

                <!-- Field 3: Qty Barang -->
                <div class="form-group">
                  <label class="form-label" style="font-size: 12px; font-weight: 600; color: #CBD5E1;">
                    3. Qty Barang <span style="color: #F87171;">*</span>
                  </label>
                  <input type="number" id="rmb-qty" class="form-control" value="1" min="1" step="1" oninput="ReimburseModule.calculateSubtotal()" required style="font-family: var(--font-mono); font-weight: 600; font-size: 13px; text-align: center;">
                </div>

                <!-- Field 4: Subtotal Barang (Live Auto-Calculation) -->
                <div class="form-group">
                  <label class="form-label" style="font-size: 12px; font-weight: 600; color: #34D399;">
                    4. Subtotal Klaim (Auto)
                  </label>
                  <div style="position: relative;">
                    <input type="text" id="rmb-subtotal-display" class="form-control" value="Rp 0" readonly style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: #34D399; background: rgba(16, 185, 129, 0.08); border-color: rgba(16, 185, 129, 0.35);">
                    <input type="hidden" id="rmb-subtotal" value="0">
                  </div>
                </div>

              </div>

              <!-- Field 5 & 6: Tanggal Pembelian & Kategori Biaya -->
              <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 14px; margin-bottom: 16px;">
                
                <!-- Field 5: Tanggal Pembelian -->
                <div class="form-group">
                  <label class="form-label" style="font-size: 12px; font-weight: 600; color: #CBD5E1;">
                    5. Tanggal Pembelian <span style="color: #F87171;">*</span>
                  </label>
                  <input type="date" id="rmb-purchase-date" class="form-control" value="${getRealtimeDateStr()}" required style="font-family: var(--font-mono); font-size: 13px;">
                </div>

                <!-- Field 6: Kategori Biaya -->
                <div class="form-group">
                  <label class="form-label" style="font-size: 12px; font-weight: 600; color: #CBD5E1;">
                    6. Kategori Biaya <span style="color: #F87171;">*</span>
                  </label>
                  <select id="rmb-category" class="form-control" required style="font-size: 13px;">
                    <option value="Bahan Baku & Dapur">Bahan Baku & Dapur</option>
                    <option value="Transportasi & Operasional Pengiriman">Transportasi & Operasional Pengiriman</option>
                    <option value="Peralatan & Perlengkapan Dapur">Peralatan & Perlengkapan Dapur</option>
                    <option value="Operasional Kantor & Administrasi">Operasional Kantor & Administrasi</option>
                    <option value="Biaya Darurat Lapangan">Biaya Darurat Lapangan</option>
                    <option value="Lain-lain">Lain-lain</option>
                  </select>
                </div>

              </div>

              <!-- Field 7: Untuk Dapur Mana (Dinamis Sesuai Role + Opsi Lainnya) -->
              <div class="form-group" style="margin-bottom: 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 14px;">
                <label class="form-label" style="font-size: 12.5px; font-weight: 600; color: #CBD5E1; margin-bottom: 6px;">
                  7. Untuk Dapur Mana <span style="color: #F87171;">*</span>
                </label>
                
                <select id="rmb-target-kitchen-select" class="form-control" onchange="ReimburseModule.handleKitchenSelectChange(this.value)" required style="font-size: 13px;">
                  ${this.renderKitchenOptions(user)}
                </select>

                <!-- Input Manual Dapur (Muncul saat memilih opsi "Lainnya") -->
                <div id="rmb-manual-kitchen-wrapper" style="display: none; margin-top: 10px;">
                  <input type="text" id="rmb-manual-kitchen-input" class="form-control" placeholder="Contoh: SPPG-006 Dapur Sukajadi (Kel. Sukajadi)" style="font-size: 13px; border-color: #F59E0B; background: rgba(245, 158, 11, 0.05);">
                  <div style="font-size: 11.5px; color: #FCD34D; margin-top: 5px; line-height: 1.4; display: flex; align-items: flex-start; gap: 5px;">
                    <span>ℹ️</span>
                    <span>Untuk dapur yang belum berjalan pastikan format dapurnya adalah <strong>ID SPPG + Nama Dapur (kelurahan)</strong></span>
                  </div>
                </div>
              </div>

              <!-- Field 8: Informasi Rekening Bank (Auto-Prefilled dari Profil) -->
              <div class="form-group" style="margin-bottom: 16px; background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: var(--radius-sm); padding: 12px 14px;">
                <label class="form-label" style="font-size: 12.5px; font-weight: 600; color: #93C5FD; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
                  <span>💳</span>
                  <span>8. Informasi Rekening Bank Tujuan Transfer</span>
                </label>
                <div style="display: grid; grid-template-columns: 1fr 1.2fr 1.2fr; gap: 10px;">
                  <div>
                    <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Nama Bank</label>
                    <input type="text" id="rmb-bank-name" class="form-control" value="${user.bankName || 'Bank Mandiri'}" required style="font-size: 12.5px;">
                  </div>
                  <div>
                    <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">No. Rekening</label>
                    <input type="text" id="rmb-bank-account-no" class="form-control" value="${user.rekeningNo || user.bankAccountNo || ''}" placeholder="No. Rekening Aktif" required style="font-family: var(--font-mono); font-size: 12.5px; font-weight: 600;">
                  </div>
                  <div>
                    <label style="font-size: 11px; color: var(--text-muted); display: block; margin-bottom: 3px;">Atas Nama (Pemilik)</label>
                    <input type="text" id="rmb-bank-account-name" class="form-control" value="${user.rekeningName || user.bankAccountName || user.name}" required style="font-size: 12.5px;">
                  </div>
                </div>
              </div>

              <!-- Field 9: Attachment Bukti Bayar (PNG, Max 2 MB) -->
              <div class="form-group" style="margin-bottom: 16px;">
                <label class="form-label" style="font-size: 12.5px; font-weight: 600; color: #CBD5E1; margin-bottom: 6px;">
                  9. Attachment Bukti Bayar / Struk Nota <span style="color: #F87171;">*</span>
                  <span style="font-size: 11px; font-weight: 400; color: var(--text-muted); margin-left: 6px;">(Format PNG / JPG / PDF, Maks. 2 MB)</span>
                </label>
                
                <div style="border: 2px dashed rgba(255,255,255,0.15); border-radius: var(--radius-sm); padding: 16px; text-align: center; background: rgba(0,0,0,0.2); cursor: pointer; transition: all 0.2s;" onclick="document.getElementById('rmb-proof-input').click()" onmouseover="this.style.borderColor='var(--brand-orange)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)'">
                  <input type="file" id="rmb-proof-input" accept="image/png,image/jpeg,image/jpg,application/pdf,.pdf" style="display: none;" onchange="ReimburseModule.handleFileSelect(event)">
                  
                  <div id="rmb-file-preview-placeholder">
                    <div style="font-size: 24px; margin-bottom: 4px;">📎</div>
                    <div style="font-size: 13px; font-weight: 500; color: #fff;">Klik untuk unggah Struk / Bukti Pembayaran</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Ukuran file maksimal 2 MB (PNG, JPG, PDF)</div>
                  </div>

                  <div id="rmb-file-preview-active" style="display: none; align-items: center; justify-content: center; gap: 12px;">
                    <div id="rmb-preview-thumb-box" style="width: 44px; height: 44px; border-radius: 6px; overflow: hidden; background: #000; border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center;">
                      <img id="rmb-preview-img" src="" alt="Preview" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    <div style="text-align: left;">
                      <div id="rmb-preview-filename" style="font-size: 12.5px; font-weight: 600; color: #34D399; max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"></div>
                      <div style="font-size: 11px; color: var(--text-muted);">Bukti bayar terlampir siap diajukan</div>
                    </div>
                    <button type="button" class="modal-close-btn" style="color: #F87171; margin-left: 8px;" onclick="event.stopPropagation(); ReimburseModule.clearAttachment();" title="Hapus File">✕</button>
                  </div>

                </div>
              </div>

              <!-- Optional Notes -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label" style="font-size: 12px; color: var(--text-muted);">Catatan Tambahan (Opsional)</label>
                <textarea id="rmb-notes" class="form-control" rows="2" placeholder="Catatan atau keterangan darurat pendukung pengeluaran biaya..."></textarea>
              </div>

            </div>

            <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
              <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-reimburse-create')">Batal</button>
              <button type="submit" id="btn-submit-rmb" class="btn-nalar-primary" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); border-color: #34D399; font-weight: 600; padding: 10px 24px;">
                🚀 Ajukan Klaim Reimburse
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Modal Detail & Step-by-Step Approval Timeline -->
      <div id="modal-reimburse-detail" class="modal-backdrop">
        <div class="modal-box" style="max-width: 640px;">
          <div class="modal-header">
            <h3 class="modal-title" id="rmb-detail-title">Detail Berkas Reimbursement</h3>
            <button class="modal-close-btn" onclick="App.closeModal('modal-reimburse-detail')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="modal-body" id="rmb-detail-body" style="max-height: 75vh; overflow-y: auto; padding: 20px 24px;">
            <!-- Rendered dynamically -->
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-reimburse-detail')">Tutup</button>
          </div>
        </div>
      </div>
    `;
  },

  renderKitchenOptions: function(user) {
    const allKitchens = DB.getKitchens() || [];
    let options = [];

    // Jika Perwakilan Yayasan: HANYA tampilkan dapur yang didelegasikan kepadanya
    if (user && user.role === 'PERWAKILAN_YAYASAN') {
      const uName = (user.name || '').toLowerCase();
      const uId = (user.id || '').toLowerCase();
      const uNika = (user.nika || '').toLowerCase();
      const uKitchen = (user.assignedKitchen || '').toLowerCase();

      options = allKitchens.filter(k => {
        if (!k) return false;
        const py = (k.perwakilanYayasan || '').toLowerCase();
        return py.includes(uName) || (uNika && py.includes(uNika)) || (uId && py.includes(uId)) || (uKitchen && (k.namaDapur || '').toLowerCase().includes(uKitchen));
      });

      // Jika belum terdaftar spesifik, fallback ke seluruh dapur agar tidak kosong
      if (options.length === 0) {
        options = allKitchens;
      }
    } else {
      options = allKitchens;
    }

    let html = `<option value="">-- Pilih Dapur Tujuan Operasional --</option>`;
    options.forEach(k => {
      const idSppg = k.idSppg || k.id || '';
      const loc = k.kotaKabupaten || k.location || '';
      const label = idSppg 
        ? `${idSppg} — ${k.namaDapur || k.name}${loc ? ` (${loc})` : ''}`
        : `${k.namaDapur || k.name}${loc ? ` (${loc})` : ''}`;
      html += `<option value="${label}">${label}</option>`;
    });

    html += `<option value="__MANUAL__">➕ Lainnya (Input Manual)</option>`;
    return html;
  },

  handleKitchenSelectChange: function(value) {
    const wrapper = document.getElementById('rmb-manual-kitchen-wrapper');
    const input = document.getElementById('rmb-manual-kitchen-input');
    if (!wrapper) return;

    if (value === '__MANUAL__') {
      wrapper.style.display = 'block';
      if (input) {
        input.required = true;
        input.focus();
      }
    } else {
      wrapper.style.display = 'none';
      if (input) {
        input.required = false;
        input.value = '';
      }
    }
  },

  calculateSubtotal: function() {
    const price = Number(document.getElementById('rmb-unit-price')?.value) || 0;
    const qty = Number(document.getElementById('rmb-qty')?.value) || 0;
    const subtotal = price * qty;

    const display = document.getElementById('rmb-subtotal-display');
    const hidden = document.getElementById('rmb-subtotal');

    if (display) display.value = `Rp ${subtotal.toLocaleString('id-ID')}`;
    if (hidden) hidden.value = subtotal;
  },

  openCreateModal: function() {
    this.currentAttachment = { url: null, name: null };
    this.clearAttachment();

    // Reset Form fields
    const itemName = document.getElementById('rmb-item-name');
    const unitPrice = document.getElementById('rmb-unit-price');
    const qty = document.getElementById('rmb-qty');
    const notes = document.getElementById('rmb-notes');
    const kSelect = document.getElementById('rmb-target-kitchen-select');
    const kInput = document.getElementById('rmb-manual-kitchen-input');
    const pDate = document.getElementById('rmb-purchase-date');

    if (itemName) itemName.value = '';
    if (unitPrice) unitPrice.value = '';
    if (qty) qty.value = '1';
    if (notes) notes.value = '';
    if (kSelect) kSelect.value = '';
    if (kInput) kInput.value = '';
    if (pDate) pDate.value = getRealtimeDateStr();

    this.handleKitchenSelectChange('');
    this.calculateSubtotal();

    App.openModal('modal-reimburse-create');
  },

  handleFileSelect: async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Enforce strict 2 MB limit
    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      App.showToast(`⚠️ Ukuran file bukti bayar (${(file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas maksimal 2 MB!`, 'warn');
      event.target.value = '';
      this.clearAttachment();
      return;
    }

    try {
      const res = await compressImageFile(file, 1200, 0.8);
      this.currentAttachment = {
        url: res.url,
        name: file.name
      };

      const placeholder = document.getElementById('rmb-file-preview-placeholder');
      const active = document.getElementById('rmb-file-preview-active');
      const filenameEl = document.getElementById('rmb-preview-filename');
      const imgEl = document.getElementById('rmb-preview-img');

      if (placeholder) placeholder.style.display = 'none';
      if (active) active.style.display = 'flex';
      if (filenameEl) filenameEl.textContent = file.name;

      if (imgEl) {
        if (file.type && file.type.startsWith('image/')) {
          imgEl.src = res.url;
          imgEl.style.display = 'block';
        } else {
          imgEl.style.display = 'none';
        }
      }

      App.showToast('✅ Bukti bayar berhasil dimuat & divalidasi.', 'success');
    } catch (e) {
      console.error('Error processing attachment:', e);
      App.showToast('Gagal memproses file attachment.', 'danger');
    }
  },

  clearAttachment: function() {
    this.currentAttachment = { url: null, name: null };
    const input = document.getElementById('rmb-proof-input');
    if (input) input.value = '';

    const placeholder = document.getElementById('rmb-file-preview-placeholder');
    const active = document.getElementById('rmb-file-preview-active');
    if (placeholder) placeholder.style.display = 'block';
    if (active) active.style.display = 'none';
  },

  handleSubmit: async function(event) {
    if (event && event.preventDefault) event.preventDefault();

    const itemName = (document.getElementById('rmb-item-name')?.value || '').trim();
    const unitPrice = Number(document.getElementById('rmb-unit-price')?.value) || 0;
    const qty = Number(document.getElementById('rmb-qty')?.value) || 1;
    const subtotal = Number(document.getElementById('rmb-subtotal')?.value) || (unitPrice * qty);
    const purchaseDate = document.getElementById('rmb-purchase-date')?.value || getRealtimeDateStr();
    const category = document.getElementById('rmb-category')?.value || 'Bahan Baku & Dapur';
    
    const kSelect = document.getElementById('rmb-target-kitchen-select')?.value || '';
    let targetKitchen = kSelect;
    let isManualKitchen = false;

    if (kSelect === '__MANUAL__') {
      targetKitchen = (document.getElementById('rmb-manual-kitchen-input')?.value || '').trim();
      isManualKitchen = true;
      if (!targetKitchen) {
        App.showToast('Mohon isi format dapur manual: ID SPPG + Nama Dapur (kelurahan)!', 'warn');
        return;
      }
    } else if (!targetKitchen) {
      App.showToast('Silakan pilih Dapur Tujuan Operasional!', 'warn');
      return;
    }

    const bankName = (document.getElementById('rmb-bank-name')?.value || '').trim();
    const bankAccountNo = (document.getElementById('rmb-bank-account-no')?.value || '').trim();
    const bankAccountName = (document.getElementById('rmb-bank-account-name')?.value || '').trim();
    const notes = (document.getElementById('rmb-notes')?.value || '').trim();

    if (!itemName || unitPrice <= 0 || !bankAccountNo) {
      App.showToast('Mohon lengkapi semua field bertanda bintang (*)!', 'warn');
      return;
    }

    if (!this.currentAttachment || !this.currentAttachment.url) {
      App.showToast('Wajib melampirkan attachment bukti bayar / struk pembelian!', 'warn');
      return;
    }

    const btn = document.getElementById('btn-submit-rmb');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>Menyimpan Klaim...</span>';
    }

    try {
      const newRmb = await DB.addReimbursement({
        itemName,
        unitPrice,
        quantity: qty,
        subtotal,
        purchaseDate,
        category,
        targetKitchen,
        isManualKitchen,
        bankName,
        bankAccountNo,
        bankAccountName,
        attachmentUrl: this.currentAttachment.url,
        attachmentName: this.currentAttachment.name,
        notes
      });

      App.closeModal('modal-reimburse-create');
      App.showToast(`✅ Pengajuan Reimburse ${newRmb.id} berhasil diajukan!`, 'success');
      this.render(document.getElementById('main-content-area'));
    } catch (err) {
      console.error('Error adding reimbursement:', err);
      App.showToast('Gagal mengajukan reimbursement: ' + err.message, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  },

  handleDelete: async function(id) {
    const rmb = DB.getReimbursementById(id);
    if (!rmb) return;

    if (!confirm(`Batalkan dan hapus pengajuan reimbursement ${rmb.id} (${rmb.itemName})?`)) return;

    const ok = await DB.deleteReimbursement(id);
    if (ok) {
      App.showToast(`Pengajuan Reimburse ${id} telah dibatalkan & dihapus.`, 'info');
      this.render(document.getElementById('main-content-area'));
    }
  },

  renderStageBadge: function(rmb) {
    if (rmb.status === 'SETTLED') {
      return `
        <span class="badge-nalar badge-approved" style="background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.4); padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
          <span>✓</span> SETTLED (Dicairkan)
        </span>
      `;
    }
    if (rmb.status === 'REJECTED') {
      return `
        <span class="badge-nalar badge-rejected" style="background: rgba(239, 68, 68, 0.15); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.4); padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
          <span>✕</span> Ditolak
        </span>
      `;
    }

    // Pending Stages
    if (rmb.stage === 'MANAGER_APPROVAL') {
      return `
        <span class="badge-nalar badge-pending" style="background: rgba(59, 130, 246, 0.15); color: #93C5FD; border: 1px solid rgba(59, 130, 246, 0.35); padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
          <span class="live-dot" style="background: #3B82F6;"></span> Review Mgr Area
        </span>
      `;
    }
    if (rmb.stage === 'FINANCE_VERIFICATION') {
      return `
        <span class="badge-nalar badge-pending" style="background: rgba(245, 158, 11, 0.15); color: #FCD34D; border: 1px solid rgba(245, 158, 11, 0.35); padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
          <span class="live-dot" style="background: #F59E0B;"></span> Verif Staf Ahli Keu
        </span>
      `;
    }
    if (rmb.stage === 'DIRECTOR_APPROVAL') {
      return `
        <span class="badge-nalar badge-pending" style="background: rgba(239, 68, 68, 0.15); color: #FCA5A5; border: 1px solid rgba(239, 68, 68, 0.35); padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
          <span class="live-dot" style="background: #EF4444;"></span> Otorisasi Direksi
        </span>
      `;
    }
    if (rmb.stage === 'FAT_DISBURSEMENT') {
      return `
        <span class="badge-nalar" style="background: rgba(217, 119, 6, 0.2); color: #FDE68A; border: 1px solid #D97706; padding: 4px 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px;">
          <span>💸</span> Antrean Transfer FAT
        </span>
      `;
    }

    return `<span class="badge-nalar badge-pending">${rmb.stage}</span>`;
  },

  openDetailModal: function(id) {
    const rmb = DB.getReimbursementById(id);
    if (!rmb) return;

    const titleEl = document.getElementById('rmb-detail-title');
    const bodyEl = document.getElementById('rmb-detail-body');
    if (titleEl) titleEl.textContent = `Detail Klaim Reimburse — ${rmb.id}`;

    if (!bodyEl) return;

    const history = Array.isArray(rmb.approvalHistory) ? rmb.approvalHistory : [];

    bodyEl.innerHTML = `
      <!-- Summary Box -->
      <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 16px; margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
          <div>
            <span class="text-mono-badge" style="color: #34D399; font-size: 12px;">${rmb.id}</span>
            <h2 style="font-size: 18px; font-weight: 700; color: #fff; margin: 4px 0 0 0;">${rmb.itemName}</h2>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
              Pemohon: <strong style="color: #CBD5E1;">${rmb.employeeName}</strong> (${rmb.employeeRoleLabel || rmb.employeeRole}) · Divisi: ${rmb.department}
            </div>
          </div>
          <div>
            ${this.renderStageBadge(rmb)}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; font-size: 12.5px; border-top: 1px solid var(--border-subtle); padding-top: 12px;">
          <div>
            <span style="color: var(--text-muted); display: block; font-size: 11px;">Kategori Biaya:</span>
            <strong style="color: #FCD34D;">${rmb.category}</strong>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; font-size: 11px;">Tanggal Pembelian:</span>
            <span style="color: #fff; font-family: var(--font-mono);">${rmb.purchaseDate}</span>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; font-size: 11px;">Rincian Kuantitas:</span>
            <span style="color: #fff;">${rmb.quantity} Unit @ Rp ${(rmb.unitPrice || 0).toLocaleString('id-ID')}</span>
          </div>
          <div>
            <span style="color: var(--text-muted); display: block; font-size: 11px;">Total Subtotal Klaim:</span>
            <strong style="color: #34D399; font-family: var(--font-mono); font-size: 14px;">Rp ${(rmb.subtotal || 0).toLocaleString('id-ID')}</strong>
          </div>
        </div>

        <div style="margin-top: 12px; border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 10px; font-size: 12px;">
          <span style="color: var(--text-muted);">🍳 Dapur Alokasi:</span> <strong style="color: #CBD5E1;">${rmb.targetKitchen}</strong>
        </div>

        <div style="margin-top: 8px; font-size: 12px;">
          <span style="color: var(--text-muted);">💳 Rekening Tujuan:</span> <strong>${rmb.bankName}</strong> — <code style="color: #93C5FD;">${rmb.bankAccountNo}</code> (a.n ${rmb.bankAccountName})
        </div>

        ${rmb.notes ? `
          <div style="margin-top: 10px; padding: 8px 12px; background: rgba(0,0,0,0.25); border-radius: 4px; font-size: 12px; color: var(--text-secondary);">
            <em>"${rmb.notes}"</em>
          </div>
        ` : ''}

        ${rmb.attachmentUrl ? `
          <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 12px; color: var(--text-muted);">📎 Bukti Bayar / Struk:</span>
            <button type="button" class="btn-nalar-secondary" onclick="ReimburseModule.previewAttachment('${rmb.id}')" style="padding: 4px 12px; font-size: 11.5px; color: #34D399; border-color: rgba(52,211,153,0.4);">
              🔍 Buka Gambar Bukti Struk
            </button>
          </div>
        ` : ''}
      </div>

      <!-- FAT Settlement Disbursed Box (Jika sudah SETTLED) -->
      ${rmb.status === 'SETTLED' && rmb.disbursementDetails ? `
        <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.35); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <div style="font-size: 13px; font-weight: 700; color: #34D399; display: flex; align-items: center; gap: 6px;">
              <span>✅</span> Bukti Pencairan Transfer Bank (FAT)
            </div>
            <span style="font-size: 11px; font-family: var(--font-mono); color: #A7F3D0; background: rgba(16, 185, 129, 0.2); padding: 2px 8px; border-radius: 4px;">SETTLED</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
            <div>
              <span style="color: var(--text-muted);">Waktu Pencairan:</span><br>
              <strong style="color: #fff; font-family: var(--font-mono);">${rmb.disbursementDetails.disbursedAt || '-'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">No. Referensi Transfer:</span><br>
              <strong style="color: #FCD34D; font-family: var(--font-mono);">${rmb.disbursementDetails.bankRefNo || '-'}</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Diproses Oleh:</span><br>
              <span style="color: #fff;">${rmb.disbursementDetails.disbursedBy || 'FAT Officer'}</span>
            </div>
            <div>
              <span style="color: var(--text-muted);">Catatan FAT:</span><br>
              <span style="color: #CBD5E1;">${rmb.disbursementDetails.notes || 'Transfer selesai.'}</span>
            </div>
          </div>
          ${rmb.disbursementDetails.proofUrl ? `
            <div style="margin-top: 10px; text-align: right;">
              <button type="button" class="btn-nalar-secondary" onclick="ReimburseModule.previewCustomImage('${rmb.disbursementDetails.proofUrl}', 'Bukti Transfer Bank FAT — ${rmb.id}')" style="padding: 4px 10px; font-size: 11px; color: #34D399; border-color: rgba(52,211,153,0.4);">
                📄 Lihat Bukti Transfer Bank
              </button>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <!-- Step-by-Step Approval Flow Audit Timeline -->
      <div style="margin-top: 10px;">
        <h4 style="font-size: 13.5px; font-weight: 600; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 6px;">
          <span>📋</span> Log Audit & Timeline Persetujuan
        </h4>

        <div class="approval-flow-timeline">
          ${history.map((step, idx) => {
            const isSettled = (step.action === 'SETTLED');
            const isApproved = (step.action === 'APPROVED' || step.action === 'ADJUSTED_AND_APPROVED');
            const isRejected = (step.action === 'REJECTED');
            const isSubmitted = (step.action === 'SUBMITTED');

            let dotColor = '#3B82F6';
            if (isSettled) dotColor = '#10B981';
            else if (isApproved) dotColor = '#10B981';
            else if (isRejected) dotColor = '#EF4444';
            else if (isSubmitted) dotColor = '#F59E0B';

            return `
              <div style="display: flex; gap: 14px; position: relative; margin-bottom: 16px;">
                ${idx < history.length - 1 ? `
                  <div style="position: absolute; left: 11px; top: 24px; bottom: -16px; width: 2px; background: rgba(255,255,255,0.08);"></div>
                ` : ''}
                <div style="width: 24px; height: 24px; border-radius: 50%; background: ${dotColor}; color: #000; font-weight: 700; font-size: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; box-shadow: 0 0 10px ${dotColor}88;">
                  ${isSettled ? '✓' : isApproved ? '✓' : isRejected ? '✕' : idx + 1}
                </div>
                <div style="flex: 1; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 14px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px;">
                    <div style="font-size: 12.5px; font-weight: 600; color: #fff;">
                      ${step.stage || step.action} · <span style="color: ${dotColor};">${step.actorName || '-'}</span>
                    </div>
                    <div style="font-size: 11px; font-family: var(--font-mono); color: var(--text-muted);">
                      ${step.timestamp || '-'}
                    </div>
                  </div>
                  <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px; line-height: 1.45;">
                    ${step.notes || '-'}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    App.openModal('modal-reimburse-detail');
  },

  previewAttachment: async function(id) {
    let rmb = DB.getReimbursementById(id);
    if (!rmb) {
      const all = DB.getReimbursements() || [];
      rmb = all.find(r => r.id === id);
    }
    if (!rmb) {
      App.showToast('Data pengajuan reimbursement tidak ditemukan.', 'warn');
      return;
    }

    let url = rmb.attachmentUrl;
    const fileName = rmb.attachmentName || `Struk_${rmb.id}`;

    // Jika attachmentUrl belum ter-cache lokal, ambil on-demand dari Supabase Cloud
    if (!url && rmb.attachmentName) {
      App.showToast('Memuat berkas bukti bayar dari cloud...', 'info');
      url = await DB.fetchReimbursementAttachment(id);
    }

    if (!url) {
      App.showToast('Tidak ada lampiran struk / bukti bayar pada berkas ini.', 'info');
      return;
    }

    this.previewCustomImage(url, `Struk Bukti Bayar — ${rmb.id} (${rmb.itemName})`, fileName);
  },

  ensureLightboxModalExists: function() {
    if (document.getElementById('modal-reimburse-lightbox')) return;
    const modalDiv = document.createElement('div');
    modalDiv.id = 'modal-reimburse-lightbox';
    modalDiv.className = 'modal-backdrop';
    modalDiv.setAttribute('onclick', "App.closeModal('modal-reimburse-lightbox')");
    modalDiv.innerHTML = `
      <div class="modal-box" style="max-width: 720px; width: 92%; padding: 0; overflow: hidden; background: #0c101d; border: 1px solid rgba(16, 185, 129, 0.35); box-shadow: 0 20px 60px rgba(0,0,0,0.85); border-radius: 12px;" onclick="event.stopPropagation()">
        <div class="modal-header" style="padding: 14px 20px; border-bottom: 1px solid rgba(255,255,255,0.08); background: #111827; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🧾</span>
            <div style="font-size: 14px; font-weight: 600; color: #fff;" id="rmb-lightbox-title">Lampiran Struk / Bukti Bayar</div>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <a id="rmb-lightbox-download-link" href="#" target="_blank" download="bukti_bayar" style="display: none; padding: 5px 12px; font-size: 11.5px; font-weight: 600; color: #34D399; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35); border-radius: 6px; text-decoration: none; align-items: center; gap: 4px;">
              ⬇️ Unduh / Buka Asli
            </a>
            <button type="button" class="modal-close-btn" onclick="App.closeModal('modal-reimburse-lightbox')" style="background: none; border: none; color: #94A3B8; font-size: 18px; cursor: pointer; padding: 4px;">✕</button>
          </div>
        </div>
        <div id="rmb-lightbox-content" style="padding: 20px; text-align: center; max-height: 75vh; overflow: auto; display: flex; align-items: center; justify-content: center; background: #050811;"></div>
      </div>
    `;
    document.body.appendChild(modalDiv);
  },

  previewCustomImage: function(url, title = 'Lampiran Dokumen', fileName = 'bukti_bayar') {
    this.ensureLightboxModalExists();

    const titleEl = document.getElementById('rmb-lightbox-title');
    const contentEl = document.getElementById('rmb-lightbox-content');
    const dlLink = document.getElementById('rmb-lightbox-download-link');

    if (titleEl) titleEl.textContent = title;

    if (dlLink) {
      dlLink.href = url;
      dlLink.download = fileName;
      dlLink.style.display = 'inline-flex';
    }

    if (contentEl) {
      if (url.startsWith('data:application/pdf') || url.endsWith('.pdf')) {
        contentEl.innerHTML = `
          <div style="width: 100%; height: 70vh;">
            <iframe src="${url}" style="width: 100%; height: 100%; border: none; border-radius: 6px;"></iframe>
          </div>
        `;
      } else {
        contentEl.innerHTML = `
          <img src="${url}" alt="Pratinjau Struk" style="max-width: 100%; max-height: 70vh; object-fit: contain; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
        `;
      }
    }

    App.openModal('modal-reimburse-lightbox');
  }
};
