/**
 * ERP MMS - Modul Pengadaan & Pengajuan Barang (Purchase Requisitions / Procurement)
 * Features Item Catalog Presets, Dapur Program Integration for Manager Area, & Lightbox Photo Preview
 */

window.PengajuanBarangModule = {
  currentAttachment: { url: null, name: null },

  render: function(container) {
    if (!container) return;

    const user = DB.getCurrentUser();

    // Maker Yayasan: Fitur Pengadaan PR Dinonaktifkan
    if (user.role === 'MAKER_YAYASAN') {
      container.innerHTML = `
        <div class="animate-blur-in">
          <div class="nalar-card" style="text-align: center; padding: 60px 24px; max-width: 680px; margin: 40px auto; border: 1px solid rgba(245,158,11,0.25);">
            <div style="font-size: 48px; margin-bottom: 16px;">⛔</div>
            <span class="text-mono-badge" style="color: #FCD34D;">Akses Khusus</span>
            <h2 style="font-size: 22px; color: #fff; margin: 8px 0 12px 0;">Fitur Pengadaan Barang Tidak Tersedia</h2>
            <p style="font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 24px;">
              Akun <strong>Maker Yayasan</strong> difokuskan untuk pencatatan & pelaporan operasional dapur SPPG harian serta administrasi kemitraan. Pengajuan pengadaan barang & aset (PR) dilakukan melalui akun <strong>Perwakilan Yayasan</strong> atau <strong>Staff Operasional</strong>.
            </p>
            <button class="btn-nalar-primary" onclick="App.switchTab('dapur-yayasan')" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color: #FCD34D; font-weight: 600;">
              <span>Ke Modul Dapur & Pelaporan Yayasan ↗</span>
            </button>
          </div>
        </div>
      `;
      return;
    }

    const allPrs = DB.getItemRequests() || [];
    const catalog = DB.getCatalog() || [];

    // Filter ketat: Hanya tampilkan pengajuan milik akun pemohon yang sedang login
    const myPrs = allPrs.filter(p => {
      if (!p) return false;
      const matchId = (p.employeeId && user.id && p.employeeId.toLowerCase() === user.id.toLowerCase());
      const matchName = (p.employeeName && user.name && p.employeeName.toLowerCase().includes(user.name.toLowerCase()));
      return matchId || matchName;
    });

    const prs = myPrs;
    const totalSpend = prs.reduce((acc, curr) => acc + (Number(curr.totalPrice) || 0), 0);
    const pendingPrs = prs.filter(p => p.status === 'PENDING');

    container.innerHTML = `
      <div class="animate-blur-in">
        <!-- Top Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-mono-badge" style="color: #FCD34D;">Procurement & Asset Management</span>
              <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                ● Login: <strong style="color: #fff;">${user.name}</strong> (${user.roleLabel})
              </span>
            </div>
            <h1 style="font-size: 26px; font-weight: 600; margin-top: 2px;">Pengajuan Barang & Pembelian (PR)</h1>
          </div>
          <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
            <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('cash-advance')" style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; color: #FCD34D; border-color: rgba(245,158,11,0.4); background: rgba(245,158,11,0.08);">
              <span>💵</span>
              <span>Pengajuan Cash Advanced</span>
            </button>

            <button class="btn-nalar-primary" onclick="PengajuanBarangModule.openPRModal()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
              <span>Buat Pengajuan Barang Baru</span>
            </button>
          </div>
        </div>

        <!-- Budget & Catalog Highlight Cards -->
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; margin-bottom: 24px;">
          <!-- Budget Stat Card with Amber Aura -->
          <div class="nalar-card hud-corner-box aura-box-amber">
            <div class="card-aura-glow aura-amber"></div>

            <div style="position: relative; z-index: 2;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-mono-badge" style="color: var(--text-muted);">Total Anggaran Diajukan Saya</span>
                <span style="font-size: 11px; color: #FCD34D; font-family: var(--font-mono);">${prs.length} Berkas PR</span>
              </div>
              <div style="margin: 12px 0 6px 0;">
                <span style="font-size: 32px; font-weight: 700; color: #FCD34D; line-height: 1.1;">Rp ${totalSpend.toLocaleString('id-ID')}</span>
              </div>
              <p style="color: var(--text-muted); font-size: 12.5px; font-weight: 300; margin-bottom: 16px; line-height: 1.5;">
                Akumulasi seluruh Purchase Request yang diajukan oleh akun Anda.
              </p>

              <div style="display: flex; gap: 18px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border-subtle); padding-top: 12px; flex-wrap: wrap;">
                <div>Menunggu Approval: <strong style="color: var(--status-pending);">${pendingPrs.length} PR</strong></div>
                <div>Selesai / PO Terbit: <strong style="color: var(--status-approved);">${prs.length - pendingPrs.length} PR</strong></div>
              </div>
            </div>
          </div>

          <!-- Quick Catalog Presets with Amber Aura -->
          <div class="nalar-card aura-box-amber">
            <div class="card-aura-glow aura-amber" style="opacity: 0.15; top: -40%; left: -20%;"></div>
            
            <div style="position: relative; z-index: 2;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div>
                  <span class="text-mono-badge" style="color: var(--text-muted);">Katalog Barang Cepat</span>
                  <h3 style="font-size: 16px; margin-top: 2px;">Pilih Langsung dari Master Item Kantor & Dapur</h3>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                ${catalog.slice(0, 4).map(item => `
                  <div style="background: rgba(18, 14, 10, 0.9); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: var(--radius-sm); padding: 10px 12px; cursor: pointer; transition: all var(--transition-fast); display: flex; align-items: center; gap: 10px;" 
                       onclick="PengajuanBarangModule.selectCatalogPreset('${item.name}', ${item.estPrice}, '${item.category}')"
                       onmouseover="this.style.borderColor='var(--brand-orange)'; this.style.transform='translateY(-2px)'" 
                       onmouseout="this.style.borderColor='rgba(245, 158, 11, 0.25)'; this.style.transform='none'">
                    <div style="width: 34px; height: 34px; border-radius: var(--radius-sm); background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; justify-content: center; color: #FCD34D; flex-shrink: 0;">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                    </div>
                    <div>
                      <div style="font-size: 12px; font-weight: 500; color: #fff; line-height: 1.3;">${item.name}</div>
                      <div style="font-family: var(--font-mono); font-size: 10.5px; color: #FCD34D; margin-top: 2px; font-weight: 600;">
                        Rp ${item.estPrice.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>

        <!-- PR History Table (Hanya Pengajuan Saya) -->
        <div class="nalar-card" style="width: 100%;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="text-mono-badge" style="color: var(--text-muted);">Riwayat Permintaan Pengadaan</span>
              <h3 style="font-size: 18px; margin-top: 2px;">
                Daftar Purchase Requisition (PR) yang Anda Ajukan
              </h3>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="live-status-pill">
                <span class="live-dot" style="background: #FCD34D;"></span>
                ${prs.length} Berkas Pengajuan Anda
              </span>
            </div>
          </div>

          <div class="nalar-table-container">
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; font-style: italic;">
              💡 Klik pada baris pengajuan mana saja untuk melihat keterangan detail alur & tingkat persetujuan (Level Tracker).
            </div>
            <table class="nalar-table">
              <thead>
                <tr>
                  <th>No. PR</th>
                  <th>Pemohon & Divisi</th>
                  <th>Deskripsi & Target Lokasi</th>
                  <th>Kategori</th>
                  <th>Qty</th>
                  <th>Total Estimasi</th>
                  <th>Urgensi</th>
                  <th>Tahap Alur Approval</th>
                  <th>Status</th>
                  <th style="text-align: center; min-width: 150px;">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${prs.length === 0 ? `
                  <tr>
                    <td colspan="10" style="text-align: center; color: var(--text-muted); padding: 32px;">Belum ada pengajuan barang yang Anda buat.</td>
                  </tr>
                ` : prs.map(p => `
                  <tr style="cursor: pointer; transition: background 0.15s ease;" 
                      onclick="App.showApprovalTracker('pr', '${p.id}')"
                      onmouseenter="this.style.background='rgba(245, 158, 11, 0.05)'"
                      onmouseleave="this.style.background='transparent'">
                    <td style="font-family: var(--font-mono); color: #FCD34D; font-weight: 500;">${p.id}</td>
                    <td>
                      <div style="font-weight: 500; color: #fff;">${p.employeeName}</div>
                      <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${p.department}</div>
                    </td>
                    <td>
                      <div style="display: flex; align-items: flex-start; gap: 12px;">
                        <div style="width: 38px; height: 38px; border-radius: var(--radius-sm); background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.3); display: flex; align-items: center; justify-content: center; color: #FCD34D; flex-shrink: 0; margin-top: 2px;">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                        </div>
                        <div>
                          <div style="font-weight: 500; color: #fff;">${p.itemName}</div>
                          ${p.targetKitchen ? `
                            <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; ${p.targetKitchen.includes('KANTOR') ? 'color: #93C5FD; background: rgba(59,130,246,0.14); border: 1px solid rgba(59,130,246,0.25);' : 'color: #FB7185; background: rgba(225,29,72,0.12);'} padding: 1px 6px; border-radius: 4px; margin: 2px 0;">
                              ${p.targetKitchen.includes('KANTOR') ? '🏢' : '🍲'} Untuk: ${p.targetKitchen}
                            </div>
                          ` : ''}
                          <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">${p.reason}</div>
                          ${p.attachmentUrl ? `
                            <button class="btn-preview-link" style="padding: 3px 8px; font-size: 10px;" onclick="event.stopPropagation(); PengajuanBarangModule.openLightbox('${p.attachmentUrl}', '${p.itemName}')">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                              <span>Lihat Foto Barang yang Diajukan ↗</span>
                            </button>
                          ` : ''}
                        </div>
                      </div>
                    </td>
                    <td><span class="text-mono-badge" style="color: var(--text-secondary); font-size: 9.5px;">${p.category}</span></td>
                    <td style="font-family: var(--font-mono);">
                      <strong style="color: #fff;">${p.quantity}</strong> unit
                      ${p.hasAdjustment && p.originalQuantity && p.originalQuantity !== p.quantity ? `
                        <div style="font-size: 9.5px; color: var(--text-dim); text-decoration: line-through;">Semula ${p.originalQuantity} unit</div>
                      ` : ''}
                    </td>
                    <td style="font-family: var(--font-mono); color: #FCD34D; font-weight: 600;">
                      <div>Rp ${(p.totalPrice || 0).toLocaleString('id-ID')}</div>
                      ${p.hasAdjustment ? `
                        <span style="font-size: 9px; color: #34D399; background: rgba(52,211,153,0.15); padding: 1px 5px; border-radius: 3px; font-weight: normal; display: inline-block; margin-top: 2px;">
                          📝 Disesuaikan Approver
                        </span>
                      ` : ''}
                    </td>
                    <td>
                      <span style="font-family: var(--font-mono); font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 600; background: ${p.urgency === 'HIGH' ? 'rgba(248,113,113,0.15); color: #F87171;' : 'rgba(251,191,36,0.15); color: #FBBF24;'}">
                        ${p.urgency}
                      </span>
                    </td>
                    <td>
                      <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-secondary);">
                        ${p.stage === 'MANAGER_APPROVAL' ? '⏳ 1. Review Manager' : p.stage === 'FINANCE_VERIFICATION' ? '💼 2. Verifikasi Keuangan' : p.stage === 'DIRECTOR_APPROVAL' ? '👑 3. Persetujuan Direktur' : '✅ PO Terbit & Selesai'}
                      </span>
                    </td>
                    <td>
                      <span class="badge-status ${p.status === 'APPROVED' ? 'badge-approved' : p.status === 'PENDING' ? 'badge-pending' : 'badge-rejected'}">
                        ${p.status}
                      </span>
                    </td>
                    <td style="text-align: center;">
                      <div style="display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: nowrap;">
                        <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: #FCD34D; border-color: rgba(245,158,11,0.4);" onclick="event.stopPropagation(); App.showApprovalTracker('pr', '${p.id}')">
                          🔍 Detail
                        </button>
                        <button type="button" class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: #F87171; border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.08);" onclick="event.stopPropagation(); PengajuanBarangModule.confirmDeletePR('${p.id}', '${(p.itemName || 'Barang').replace(/'/g, "\\'")}')" title="Hapus Pengajuan PR">
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
      </div>
    `;
  },

  confirmDeletePR: function(prId, itemName) {
    let modalEl = document.getElementById('modal-delete-pr-confirm');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-delete-pr-confirm';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 480px; border: 1px solid rgba(239, 68, 68, 0.4); background: rgba(16, 12, 12, 0.98); box-shadow: 0 16px 40px rgba(0,0,0,0.8);">
        <div class="modal-header" style="border-bottom: 1px solid rgba(239, 68, 68, 0.2);">
          <div>
            <span class="text-mono-badge" style="color: #F87171; background: rgba(239,68,68,0.15); padding: 2px 8px; border-radius: 4px; font-size: 10.5px;">
              Konfirmasi Hapus Pengajuan
            </span>
            <h3 class="modal-title" style="margin-top: 2px; color: #fff; font-size: 17.5px;">Hapus Purchase Request?</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-delete-pr-confirm')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="modal-body" style="padding-top: 18px;">
          <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.25); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 14px; display: flex; gap: 12px; align-items: flex-start;">
            <div style="font-size: 24px; line-height: 1;">⚠️</div>
            <div style="font-size: 12.5px; color: #FECACA; line-height: 1.5;">
              Apakah Anda yakin ingin menghapus berkas pengajuan <strong style="color: #fff; font-family: var(--font-mono);">${prId}</strong> untuk item <strong style="color: #fff;">"${itemName}"</strong>?
              <div style="font-size: 11px; color: var(--text-dim); margin-top: 6px;">
                Pengajuan yang dihapus akan ditarik dari antrean approval & log pengadaan secara permanen.
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px; padding: 12px 24px;">
          <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-delete-pr-confirm')">
            Batal
          </button>
          <button type="button" class="btn-nalar-primary" style="background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%); border-color: #F87171; color: #fff; font-weight: 600; padding: 6px 16px;" onclick="PengajuanBarangModule.executeDeletePR('${prId}')">
            🗑️ Ya, Hapus Pengajuan PR
          </button>
        </div>
      </div>
    `;

    App.openModal('modal-delete-pr-confirm');
  },

  executeDeletePR: function(prId) {
    const success = DB.deleteItemRequest(prId);
    App.closeModal('modal-delete-pr-confirm');
    App.closeModal('modal-approval-tracker');

    if (success) {
      App.showToast(`Pengajuan Purchase Request ${prId} berhasil dihapus!`, 'success');
      App.refreshCurrentTab();
    } else {
      App.showToast(`Gagal menghapus pengajuan ${prId} atau data tidak ditemukan.`, 'warn');
    }
  },

  openPRModal: function() {
    const user = DB.getCurrentUser();
    if (user && user.role === 'MAKER_YAYASAN') {
      App.showToast('Fitur Pengadaan Barang tidak tersedia untuk Maker Yayasan.', 'warn');
      return;
    }
    this.removeAttachment();
    const kitchenContainer = document.getElementById('pr-kitchen-container');
    const kitchenSelect = document.getElementById('pr-kitchen-select');
    const kitchenLabel = document.getElementById('pr-kitchen-label');
    const hintEl = document.getElementById('pr-kitchen-hint');

    // Tampilkan pilihan Dapur Program / Kantor
    if (kitchenContainer && kitchenSelect) {
      kitchenContainer.style.display = 'block';
      const isPerwakilanYayasan = (user && user.role === 'PERWAKILAN_YAYASAN');

      if (isPerwakilanYayasan) {
        if (kitchenLabel) {
          kitchenLabel.innerHTML = `🍳 Untuk Kepentingan Dapur Apa? (Pilih Database SPPG) <span style="color: #F87171;">*</span>`;
        }
        const kitchenOptions = DB.getKitchenDropdownOptions(user) || [];
        kitchenSelect.innerHTML = kitchenOptions.map(k => `
          <option value="${k.idSppg} — ${k.namaDapur}">${k.idSppg} — ${k.namaDapur}</option>
        `).join('');

        if (kitchenOptions.length > 0) {
          kitchenSelect.value = `${kitchenOptions[0].idSppg} — ${kitchenOptions[0].namaDapur}`;
        }
        if (hintEl) {
          hintEl.innerHTML = `🔒 <strong style="color: #FCD34D;">Dapur SPPG Penugasan:</strong> Terkunci otomatis 1 titik dapur sesuai penugasan resmi yayasan Anda (${user.name}).`;
        }
      } else {
        // Untuk peran selain Perwakilan Yayasan & Maker: sediakan opsi Kantor & seluruh Dapur SPPG
        if (kitchenLabel) {
          kitchenLabel.innerHTML = `🏢 / 🍳 Untuk Keperluan Apa? (Pilih Kantor atau Database Dapur SPPG) <span style="color: #F87171;">*</span>`;
        }
        const allKitchens = DB.getKitchenDropdownOptions() || [];

        let optionsHtml = `
          <option value="KANTOR — Fasilitas & Operasional Kantor" selected>🏢 KANTOR — Fasilitas & Operasional Kantor</option>
          <optgroup label="── Titik Dapur SPPG Yayasan ──">
        `;
        optionsHtml += allKitchens.map(k => `
          <option value="${k.idSppg} — ${k.namaDapur}">🍳 ${k.idSppg} — ${k.namaDapur}</option>
        `).join('');
        optionsHtml += `</optgroup>`;

        kitchenSelect.innerHTML = optionsHtml;
        kitchenSelect.value = "KANTOR — Fasilitas & Operasional Kantor";

        if (hintEl) {
          hintEl.innerHTML = `*Pilih opsi <strong style="color: #93C5FD;">"KANTOR"</strong> jika pengadaan untuk fasilitas/kebutuhan kantor, atau pilih titik <strong style="color: #FCD34D;">Dapur SPPG</strong> jika untuk operasional dapur yayasan.`;
        }
      }
    }

    App.openModal('modal-pr');
  },

  handleFileSelect: function(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      App.showToast('Mohon upload file gambar (PNG, JPG, WebP)!', 'warn');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.currentAttachment = {
        url: e.target.result,
        name: file.name
      };

      const promptEl = document.getElementById('pr-attachment-prompt');
      const previewEl = document.getElementById('pr-attachment-preview');
      const previewImg = document.getElementById('pr-preview-img');
      const previewName = document.getElementById('pr-preview-filename');

      if (promptEl) promptEl.style.display = 'none';
      if (previewEl) previewEl.style.display = 'flex';
      if (previewImg) previewImg.src = e.target.result;
      if (previewName) previewName.textContent = file.name;
    };
    reader.readAsDataURL(file);
  },

  removeAttachment: function() {
    this.currentAttachment = { url: null, name: null };
    const inputEl = document.getElementById('pr-attachment');
    const promptEl = document.getElementById('pr-attachment-prompt');
    const previewEl = document.getElementById('pr-attachment-preview');
    if (inputEl) inputEl.value = '';
    if (promptEl) promptEl.style.display = 'block';
    if (previewEl) previewEl.style.display = 'none';
  },

  selectCatalogPreset: function(name, price, category) {
    this.openPRModal();
    const nameEl = document.getElementById('pr-name');
    const priceEl = document.getElementById('pr-price');
    const catEl = document.getElementById('pr-category');
    if (nameEl) nameEl.value = name;
    if (priceEl) priceEl.value = price;
    if (catEl) catEl.value = category;
  },

  openLightbox: function(imgUrl, title) {
    const lightboxImg = document.getElementById('lightbox-img');
    const lightboxTitle = document.getElementById('lightbox-title');
    if (lightboxImg) lightboxImg.src = imgUrl;
    if (lightboxTitle) lightboxTitle.textContent = title ? `Foto Spesifikasi: ${title}` : 'Foto Barang';
    App.openModal('modal-image-preview');
  },

  handleSubmit: function(e) {
    e.preventDefault();
    const user = DB.getCurrentUser();
    const itemName = document.getElementById('pr-name').value;
    const category = document.getElementById('pr-category').value;
    const quantity = Number(document.getElementById('pr-qty').value) || 1;
    const unitPrice = Number(document.getElementById('pr-price').value) || 0;
    const urgency = document.getElementById('pr-urgency').value;
    const reason = document.getElementById('pr-reason').value;

    const kitchenEl = document.getElementById('pr-kitchen-select');
    let targetKitchen = kitchenEl ? kitchenEl.value : '';
    if (!targetKitchen && user && user.role === 'PERWAKILAN_YAYASAN' && user.sppgId) {
      targetKitchen = `${user.sppgId} — ${user.sppgName || 'Dapur SPPG'}`;
    } else if (!targetKitchen) {
      targetKitchen = (user && user.role === 'PERWAKILAN_YAYASAN') ? 'WFC2L9EH — SPPG Cilangkap - Tapos 1' : 'KANTOR — Fasilitas & Operasional Kantor';
    }

    if (!itemName || !reason || unitPrice <= 0 || !targetKitchen) {
      App.showToast('Mohon lengkapi seluruh data pengajuan barang & pilih tujuan keperluan pengadaan!', 'warn');
      return;
    }

    const totalPrice = quantity * unitPrice;

    DB.addItemRequest({
      itemName,
      category,
      quantity,
      unitPrice,
      totalPrice,
      urgency,
      reason,
      targetKitchen,
      attachmentUrl: this.currentAttachment.url,
      attachmentName: this.currentAttachment.name
    });

    App.closeModal('modal-pr');
    this.removeAttachment();
    App.showToast(`Pengajuan ${itemName} (${quantity} unit untuk ${targetKitchen}) berhasil disubmit!`, 'success');
    App.refreshCurrentTab();
  }
};
