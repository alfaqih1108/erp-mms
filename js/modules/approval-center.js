/**
 * ERP MMS - Universal Approval Center Module (Multi-Tier Enterprise Matrix)
 * Tailored precisely to office structure:
 * 1. Cuti: Surveyor/Yayasan -> HC; Keuangan -> Dir Keuangan -> HC; Manager -> Dir Ops/Keu -> HC.
 * 2. Timesheet: Lapangan mandiri; Keuangan -> HC.
 * 3. PR: Staff -> Manager -> Verifikasi Keuangan -> Direktur (Final & Terbitkan PO).
 * 4. PR Manager Area (Dapur): Skip Manager -> Verifikasi Keuangan -> Direktur.
 */

window.ApprovalCenterModule = {
  activeFilter: 'ALL', // ALL, LEAVE, TIMESHEET, PR

  render: function(container) {
    if (!container) return;

    const user = DB.getCurrentUser();
    const leaves = DB.getLeaves() || [];
    const timesheets = DB.getTimesheets() || [];
    const prs = DB.getItemRequests() || [];
    const cas = DB.getCashAdvances() || [];

    // Filter Items Relevan sesuai Hak Akses Role
    let relevantLeaves = [];
    let relevantTimesheets = [];
    let relevantPrs = [];
    let relevantCAs = [];

    // 1. Human Capital: Cuti tahap HC + Timesheet tim
    if (user.role === 'HUMAN_CAPITAL') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && (l.stage === 'HC_REVIEW' || l.stage === 'HC_FINAL'));
      relevantTimesheets = timesheets.filter(t => t.status === 'PENDING');
    }
    // 2. Direktur Keuangan: Cuti Keuangan Tahap 1 + PR Tahap Direktur + Cash Advance Tahap Direktur
    else if (user.role === 'DIREKTUR_KEUANGAN') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && (l.stage === 'DIR_KEU_REVIEW' || l.stage === 'DIR_OPS_OR_KEU_REVIEW'));
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'DIRECTOR_APPROVAL');
      relevantCAs = cas.filter(c => c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW');
    }
    // 3. Direktur Operasional: Cuti Manager/HC + PR Tahap Direktur + Cash Advance Tahap Direktur
    else if (user.role === 'DIREKTUR_OPERASIONAL') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && l.stage === 'DIR_OPS_OR_KEU_REVIEW');
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'DIRECTOR_APPROVAL');
      relevantCAs = cas.filter(c => c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW');
    }
    // 4. Manager Area: PR dari Surveyor, Perwakilan Yayasan, & Staff Operasional
    else if (user.role === 'MANAGER_AREA') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'MANAGER_APPROVAL' && (p.role === 'SURVEYOR' || p.role === 'PERWAKILAN_YAYASAN' || p.role === 'STAFF_OPERASIONAL'));
    }
    // 5. Manager Keuangan: PR dari FAT & Staff Ahli
    else if (user.role === 'MANAGER_KEUANGAN') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'MANAGER_APPROVAL' && (p.role === 'FAT_OFFICER' || p.role === 'STAFF_AHLI_KEUANGAN'));
    }
    // 6. Staff Ahli Keuangan & FAT Officer: Verifikasi Anggaran PR Tahap 2/3 + Pencairan Kasbon & Verifikasi LPJ Kasbon
    else if (user.role === 'STAFF_AHLI_KEUANGAN' || user.role === 'FAT_OFFICER') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'FINANCE_VERIFICATION');
      relevantCAs = cas.filter(c => (c.status === 'PENDING' && c.stage === 'FAT_DISBURSEMENT') || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED'));
    }
    // 7. Direktur Utama & Super Admin: Oversight Semua
    else if (user.role === 'DIREKTUR_UTAMA' || user.role === 'SUPER_ADMIN') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING');
      relevantTimesheets = timesheets.filter(t => t.status === 'PENDING');
      relevantPrs = prs.filter(p => p.status === 'PENDING');
      relevantCAs = cas.filter(c => (c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW') || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED'));
    }

    const totalPending = relevantLeaves.length + relevantTimesheets.length + relevantPrs.length + relevantCAs.length;

    container.innerHTML = `
      <div class="animate-blur-in">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="text-mono-badge" style="color: var(--brand-orange);">Universal Approval Hub</span>
            <h1 style="font-size: 26px; font-weight: 600; margin-top: 2px;">Pusat Persetujuan Terpadu</h1>
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="live-status-pill">
              <span class="live-dot" style="background: var(--brand-orange);"></span>
              ${totalPending} Pengajuan Menunggu Respon Anda
            </span>
          </div>
        </div>

        <!-- Role Context Notice -->
        <div class="nalar-card" style="padding: 16px 20px; background: rgba(255, 75, 1, 0.05); border-color: rgba(255, 75, 1, 0.2); margin-bottom: 24px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div style="width: 28px; height: 28px; border-radius: 50%; background: var(--grad-primary); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 11px; font-weight: 700; flex-shrink: 0;">
                ✓
              </div>
              <div>
                <div style="font-size: 13px; font-weight: 500; color: #fff;">
                  Wewenang Approval: <strong style="color: var(--brand-orange);">${user.name}</strong> (${user.roleLabel})
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Sistem secara otomatis menampilkan antrean pengajuan yang membutuhkan keputusan sesuai hirarki Anda.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Thematic Floating Filter Pills -->
        <div class="approval-filter-bar">
          <button class="approval-filter-pill pill-all ${this.activeFilter === 'ALL' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('ALL')">
            <span class="filter-dot dot-orange"></span>
            <span>Semua Pengajuan</span>
            <span class="filter-badge">${totalPending}</span>
          </button>

          <button class="approval-filter-pill pill-leave ${this.activeFilter === 'LEAVE' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('LEAVE')">
            <span class="filter-dot dot-violet"></span>
            <span>Cuti & Izin</span>
            <span class="filter-badge">${relevantLeaves.length}</span>
          </button>

          <button class="approval-filter-pill pill-timesheet ${this.activeFilter === 'TIMESHEET' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('TIMESHEET')">
            <span class="filter-dot dot-blue"></span>
            <span>Timesheet</span>
            <span class="filter-badge">${relevantTimesheets.length}</span>
          </button>

          <button class="approval-filter-pill pill-pr ${this.activeFilter === 'PR' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('PR')">
            <span class="filter-dot dot-amber"></span>
            <span>Pengadaan Barang (PR)</span>
            <span class="filter-badge">${relevantPrs.length}</span>
          </button>

          <button class="approval-filter-pill pill-ca ${this.activeFilter === 'CA' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('CA')">
            <span class="filter-dot dot-orange"></span>
            <span>Cash Advance (Kasbon)</span>
            <span class="filter-badge">${relevantCAs.length}</span>
          </button>
        </div>v>

        <!-- Pending Items List -->
        <div style="display: flex; flex-direction: column; gap: 16px;">
          ${totalPending === 0 ? `
            <div class="nalar-card" style="text-align: center; padding: 48px;">
              <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
              <h3 style="font-size: 18px; color: #fff; margin-bottom: 4px;">Tidak Ada Antrean Approval</h3>
              <p style="font-size: 12.5px; color: var(--text-muted);">Seluruh pengajuan cuti, timesheet, atau barang yang membutuhkan wewenang Anda telah selesai diproses.</p>
            </div>
          ` : ''}

          <!-- Pending Leaves -->
          ${(this.activeFilter === 'ALL' || this.activeFilter === 'LEAVE') ? relevantLeaves.map(l => `
            <div class="nalar-card aura-box-violet" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #8B5CF6; margin-bottom: 0;">
              <div style="display: flex; align-items: flex-start; gap: 16px;">
                <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); display: flex; align-items: center; justify-content: center; color: #A78BFA; flex-shrink: 0;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="text-mono-badge" style="color: #A78BFA;">CUTI / IZIN · ${l.id}</span>
                    <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${l.createdAt}</span>
                    <span style="font-size: 10px; color: #C4B5FD; background: rgba(139,92,246,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                      Tahap: ${l.stage === 'DIR_KEU_REVIEW' ? 'Review Direktur Keuangan' : l.stage === 'DIR_OPS_OR_KEU_REVIEW' ? 'Review Direktur' : 'Verifikasi Final Human Capital'}
                    </span>
                    <button type="button" class="btn-nalar-secondary" style="padding: 2px 8px; font-size: 10px; color: #A78BFA; border-color: rgba(139,92,246,0.4);" onclick="App.showApprovalTracker('leave', '${l.id}')">
                      🔍 Cek Level Approval
                    </button>
                  </div>
                  <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 500;">${l.employeeName} — ${l.type} (${l.duration} Hari)</h4>
                  <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">Alasan: ${l.reason}</p>
                  <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                    Periode: ${l.startDate} s/d ${l.endDate} · Divisi: ${l.department}
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectLeave('${l.id}')">
                  Tolak
                </button>
                <button class="btn-nalar-primary" style="background: #34D399; color: #064E3B;" onclick="ApprovalCenterModule.approveLeave('${l.id}', '${l.stage}')">
                  ${l.stage === 'DIR_KEU_REVIEW' || l.stage === 'DIR_OPS_OR_KEU_REVIEW' ? 'Setujui & Teruskan ke HC' : 'Setujui Cuti Final'}
                </button>
              </div>
            </div>
          `).join('') : ''}

          <!-- Pending Timesheets -->
          ${(this.activeFilter === 'ALL' || this.activeFilter === 'TIMESHEET') ? relevantTimesheets.map(t => `
            <div class="nalar-card aura-box-blue" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #3B82F6; margin-bottom: 0;">
              <div style="display: flex; align-items: flex-start; gap: 16px;">
                <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); display: flex; align-items: center; justify-content: center; color: #60A5FA; flex-shrink: 0;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="text-mono-badge" style="color: #60A5FA;">TIMESHEET · ${t.id}</span>
                    <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${t.date}</span>
                    <button type="button" class="btn-nalar-secondary" style="padding: 2px 8px; font-size: 10px; color: #60A5FA; border-color: rgba(59,130,246,0.4);" onclick="App.showApprovalTracker('timesheet', '${t.id}')">
                      🔍 Cek Level Approval
                    </button>
                  </div>
                  <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 500;">${t.employeeName} — ${t.activityPreset || 'Aktivitas Kerja'} (${t.hours} Jam)</h4>
                  <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">Aktivitas: ${t.activity}</p>
                  <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                    Rentang: ${t.startTime || '08:00'} - ${t.endTime || '12:00'} · Divisi: ${t.department}
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectTimesheet('${t.id}')">
                  Tolak
                </button>
                <button class="btn-nalar-primary" style="background: #34D399; color: #064E3B;" onclick="ApprovalCenterModule.approveTimesheet('${t.id}')">
                  Validasi Jam Kerja
                </button>
              </div>
            </div>
          `).join('') : ''}

          <!-- Pending PRs -->
          ${(this.activeFilter === 'ALL' || this.activeFilter === 'PR') ? relevantPrs.map(p => `
            <div class="nalar-card aura-box-amber" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #F59E0B; margin-bottom: 0;">
              <div style="display: flex; align-items: flex-start; gap: 16px;">
                <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; align-items: center; justify-content: center; color: #FCD34D; flex-shrink: 0;">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                </div>

                <div>
                  <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                    <span class="text-mono-badge" style="color: #FCD34D;">PURCHASE REQ · ${p.id}</span>
                    <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${p.createdAt}</span>
                    <span style="font-size: 10px; color: #FDE68A; background: rgba(245,158,11,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                      Tahap: ${p.stage === 'MANAGER_APPROVAL' ? '1. Review Manager' : p.stage === 'FINANCE_VERIFICATION' ? '2. Verifikasi Anggaran Keuangan' : '3. Persetujuan Akhir Direktur'}
                    </span>
                    <button type="button" class="btn-nalar-secondary" style="padding: 2px 8px; font-size: 10px; color: #FCD34D; border-color: rgba(245,158,11,0.4);" onclick="App.showApprovalTracker('pr', '${p.id}')">
                      🔍 Cek Level Approval
                    </button>
                  </div>
                  <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 500;">
                    ${p.itemName} (${p.quantity} Unit) — <span style="color: #FCD34D; font-weight: 600;">Rp ${(p.totalPrice || 0).toLocaleString('id-ID')}</span>
                    ${p.hasAdjustment ? `<span style="font-size: 10.5px; color: #34D399; background: rgba(52,211,153,0.15); padding: 1px 6px; border-radius: 3px; margin-left: 6px;">📝 Telah Disesuaikan</span>` : ''}
                  </h4>
                  ${p.targetKitchen ? `
                    <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #FCD34D; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); padding: 2px 8px; border-radius: 4px; margin: 2px 0 4px 0; font-weight: 500;">
                      🍳 Untuk Kepentingan Dapur: ${p.targetKitchen}
                    </div>
                  ` : ''}
                  <p style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 8px;">Alasan: ${p.reason}</p>
                  
                  <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                    <span>Pemohon: <strong style="color: #fff;">${p.employeeName}</strong> (${p.department})</span>
                    <span>·</span>
                    <span>Kategori: ${p.category}</span>
                    ${p.attachmentUrl ? `
                      <span>·</span>
                      <button class="btn-preview-link" onclick="PengajuanBarangModule.openLightbox('${p.attachmentUrl}', '${p.itemName}')">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        <span>Lihat Foto Barang yang Diajukan ↗</span>
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectPR('${p.id}')">
                  ✕ Tolak
                </button>
                <button class="btn-nalar-secondary" style="border-color: rgba(245, 158, 11, 0.5); color: #FCD34D; background: rgba(245, 158, 11, 0.1);" onclick="ApprovalCenterModule.openAdjustPRModal('${p.id}')">
                  ✏️ Setujui dgn Penyesuaian
                </button>
                <button class="btn-nalar-primary" style="background: #34D399; color: #064E3B;" onclick="ApprovalCenterModule.advancePR('${p.id}', '${p.stage}')">
                  ✓ ${p.stage === 'MANAGER_APPROVAL' ? 'Setujui & Teruskan' : p.stage === 'FINANCE_VERIFICATION' ? 'Verifikasi Dana' : 'Setujui & Terbitkan PO'}
                </button>
              </div>
            </div>
          `).join('') : ''}

          <!-- Pending Cash Advances (Kasbon Operasional & LPJ) -->
          ${(this.activeFilter === 'ALL' || this.activeFilter === 'CA') ? relevantCAs.map(c => {
            const isDirectorStage = (c.stage === 'DIRECTOR_REVIEW');
            const isDisburseStage = (c.stage === 'FAT_DISBURSEMENT');
            const isSettlementReviewStage = (c.stage === 'SETTLEMENT_SUBMITTED');

            return `
              <div class="nalar-card aura-box-amber" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #F59E0B; margin-bottom: 0;">
                <div style="display: flex; align-items: flex-start; gap: 16px;">
                  <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; align-items: center; justify-content: center; color: #FCD34D; flex-shrink: 0; font-size: 20px;">
                    💵
                  </div>
                  <div>
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                      <span class="text-mono-badge" style="color: #FCD34D;">CASH ADVANCE · ${c.id}</span>
                      <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${c.createdAt}</span>
                      <span style="font-size: 10px; color: #FDE68A; background: rgba(245,158,11,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                        Tahap: ${isDirectorStage ? '👑 Otorisasi Direksi' : isDisburseStage ? '💰 Pencairan / Transfer FAT' : '🔍 Verifikasi LPJ Belanja FAT'}
                      </span>
                      <button type="button" class="btn-nalar-secondary" style="padding: 2px 8px; font-size: 10px; color: #FCD34D; border-color: rgba(245,158,11,0.4);" onclick="App.openApprovalTracker('CA', '${c.id}')">
                        🔍 Cek Level Tracker
                      </button>
                    </div>

                    <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 600;">
                      ${c.title} — <span style="font-family: var(--font-mono); color: #34D399;">Rp ${Number(c.amountApproved || c.amountRequested).toLocaleString('id-ID')}</span>
                    </h4>

                    <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">
                      Pemohon: <strong>${c.employeeName}</strong> (${c.department}) · Lokasi: <strong>${c.targetLocation}</strong>
                    </div>

                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px; font-style: italic;">
                      Justifikasi: "${c.reason}"
                    </p>

                    <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                      Rekening Pemohon: <strong>${c.bankName}</strong> (${c.bankAccountNo} a.n ${c.bankAccountName}) · Target LPJ: ${c.settlementPlanDate}
                    </div>

                    ${isSettlementReviewStage && c.settlement ? `
                      <div style="margin-top: 8px; background: rgba(0,0,0,0.35); padding: 8px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06); font-size: 11.5px;">
                        📊 <strong>Data Realisasi LPJ:</strong> Total Belanja: <strong style="color: #60A5FA;">Rp ${Number(c.settlement.totalSpent).toLocaleString('id-ID')}</strong> · 
                        ${c.settlement.refundAmount > 0 ? `Sisa Dikembalikan ke Yayasan: <strong style="color: #34D399;">Rp ${Number(c.settlement.refundAmount).toLocaleString('id-ID')}</strong>` : c.settlement.reimburseAmount > 0 ? `Kekurangan (Reimburse): <strong style="color: #60A5FA;">Rp ${Number(c.settlement.reimburseAmount).toLocaleString('id-ID')}</strong>` : 'Sesuai Plafon (Pas)'}
                      </div>
                    ` : ''}
                  </div>
                </div>

                <!-- Action Buttons per Stage -->
                <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                  ${isDirectorStage ? `
                    <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectCA('${c.id}')">
                      ✕ Tolak
                    </button>
                    <button class="btn-nalar-secondary" style="border-color: rgba(245, 158, 11, 0.5); color: #FCD34D; background: rgba(245, 158, 11, 0.1);" onclick="ApprovalCenterModule.openAdjustCAModal('${c.id}')">
                      ✏️ Setujui dgn Penyesuaian
                    </button>
                    <button class="btn-nalar-primary" style="background: #34D399; color: #064E3B; font-weight: 600;" onclick="ApprovalCenterModule.approveCADirector('${c.id}')">
                      ✓ Setujui Kasbon
                    </button>
                  ` : isDisburseStage ? `
                    <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; font-weight: 700;" onclick="ApprovalCenterModule.openDisburseCAModal('${c.id}')">
                      💸 Transfer & Cairkan Dana
                    </button>
                  ` : isSettlementReviewStage ? `
                    <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); border-color: #60A5FA; color: #fff; font-weight: 700;" onclick="ApprovalCenterModule.openVerifyCASettlementModal('${c.id}')">
                      🔍 Verifikasi LPJ & Tutup Kasbon
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('') : ''}
        </div>
      </div>
    `;
  },

  setFilter: function(filter) {
    this.activeFilter = filter;
    this.render(document.getElementById('main-content-area'));
  },

  approveLeave: function(id, currentStage) {
    if (currentStage === 'DIR_KEU_REVIEW' || currentStage === 'DIR_OPS_OR_KEU_REVIEW') {
      DB.advanceLeaveStage(id, 'HC_FINAL', 'PENDING');
      App.showToast(`Persetujuan tingkat Direktur untuk ${id} berhasil! Pengajuan diteruskan ke Human Capital untuk pemotongan kuota.`, 'success');
    } else {
      DB.advanceLeaveStage(id, 'APPROVED', 'APPROVED');
      App.showToast(`Cuti ${id} disetujui penuh oleh Human Capital! Saldo kuota karyawan otomatis dipotong.`, 'success');
    }
    App.refreshCurrentTab();
  },

  rejectLeave: function(id) {
    DB.advanceLeaveStage(id, 'REJECTED', 'REJECTED');
    App.showToast(`Cuti ${id} ditolak.`, 'warn');
    App.refreshCurrentTab();
  },

  approveTimesheet: function(id) {
    DB.updateTimesheetStatus ? DB.updateTimesheetStatus(id, 'APPROVED') : (function() {
      const ts = DB.getTimesheets().find(t => t.id === id);
      if (ts) { ts.status = 'APPROVED'; DB.save(); }
    })();
    App.showToast(`Timesheet ${id} berhasil divalidasi oleh Human Capital!`, 'success');
    App.refreshCurrentTab();
  },

  rejectTimesheet: function(id) {
    DB.updateTimesheetStatus(id, 'REJECTED');
    App.showToast(`Timesheet ${id} ditolak.`, 'warn');
    App.refreshCurrentTab();
  },

  advancePR: function(id, currentStage) {
    if (currentStage === 'MANAGER_APPROVAL') {
      DB.advanceItemRequestStage(id, 'FINANCE_VERIFICATION', 'PENDING');
      App.showToast(`PR ${id} disetujui Manager & diteruskan ke Verifikasi Anggaran Keuangan (Staff Ahli/FAT)!`, 'success');
    } else if (currentStage === 'FINANCE_VERIFICATION') {
      DB.advanceItemRequestStage(id, 'DIRECTOR_APPROVAL', 'PENDING');
      App.showToast(`Anggaran PR ${id} telah diverifikasi & diteruskan ke Direktur untuk persetujuan akhir!`, 'success');
    } else if (currentStage === 'DIRECTOR_APPROVAL') {
      DB.advanceItemRequestStage(id, 'COMPLETED', 'APPROVED');
      App.showToast(`Persetujuan Direktur disahkan & Purchase Order resmi (PO) untuk PR ${id} diterbitkan!`, 'success');
    }
    App.refreshCurrentTab();
  },

  rejectPR: function(id) {
    DB.advanceItemRequestStage(id, 'REJECTED', 'REJECTED');
    App.showToast(`Pengajuan Barang ${id} ditolak.`, 'warn');
    App.refreshCurrentTab();
  },

  // =========================================================================
  // APPROVAL DENGAN PENYESUAIAN QTY & HARGA BUDGET
  // =========================================================================
  currentAdjustingPRId: null,

  openAdjustPRModal: function(id) {
    const pr = DB.getItemRequests().find(p => p.id === id);
    if (!pr) return;

    this.currentAdjustingPRId = id;
    const user = DB.getCurrentUser();

    let modalEl = document.getElementById('modal-pr-adjust');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-pr-adjust';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const nextStageName = pr.stage === 'MANAGER_APPROVAL' ? 'Verifikasi Anggaran Keuangan' : pr.stage === 'FINANCE_VERIFICATION' ? 'Persetujuan Direktur' : 'Penerbitan PO & Selesai';

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 600px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #FCD34D;">Penyesuaian Persetujuan Wewenang</span>
            <h3 class="modal-title" style="margin-top: 2px;">Setujui PR dengan Penyesuaian Qty / Harga</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-pr-adjust')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="ApprovalCenterModule.submitAdjustedPR(event)">
          <div class="modal-body">
            
            <!-- PR Header Info -->
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-mono-badge" style="color: #FCD34D;">${pr.id}</span>
                <span style="font-size: 11px; color: var(--text-muted);">${pr.createdAt}</span>
              </div>
              <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 4px;">
                ${pr.itemName}
              </div>
              <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 2px;">
                Pemohon: <strong>${pr.employeeName}</strong> (${pr.department}) ${pr.targetKitchen ? `· 🍲 ${pr.targetKitchen}` : ''}
              </div>
              <div style="font-size: 11.5px; color: var(--text-muted); margin-top: 4px; font-style: italic;">
                Alasan Pengajuan: "${pr.reason}"
              </div>
            </div>

            <!-- Approver Role Authority Banner -->
            <div style="display: flex; align-items: center; gap: 10px; background: rgba(52,211,153,0.08); border: 1px solid rgba(52,211,153,0.3); border-radius: 6px; padding: 8px 12px; margin-bottom: 20px; font-size: 11.5px; color: #6EE7B7;">
              <span>🛡️ Disahkan oleh: <strong>${user.name}</strong> (${user.roleLabel}) ➔ Melanjutkan ke tahap: <strong>${nextStageName}</strong></span>
            </div>

            <!-- Comparison Form: Qty & Price -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              
              <!-- Quantity Field -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">
                  Jumlah / Qty Disetujui <span style="color: #F87171;">*</span>
                </label>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
                  Diajukan Awal: <strong style="color: #fff;">${pr.originalQuantity || pr.quantity} unit</strong>
                </div>
                <input type="number" id="adjust-pr-qty" class="form-control" min="1" max="999" value="${pr.quantity}" 
                       oninput="ApprovalCenterModule.handleAdjustCalculate()" required>
              </div>

              <!-- Unit Price Field -->
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">
                  Harga Satuan / Budget (Rp) <span style="color: #F87171;">*</span>
                </label>
                <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 6px;">
                  Harga Awal: <strong style="color: #FCD34D;">Rp ${(pr.originalUnitPrice || pr.unitPrice).toLocaleString('id-ID')}</strong>
                </div>
                <input type="number" id="adjust-pr-price" class="form-control" min="1000" step="1000" value="${pr.unitPrice}" 
                       oninput="ApprovalCenterModule.handleAdjustCalculate()" required>
              </div>

            </div>

            <!-- Dynamic Total Price Calculation Callout -->
            <div style="background: rgba(0,0,0,0.5); border: 1px dashed rgba(245,158,11,0.4); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 20px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 12px; color: var(--text-muted); text-transform: uppercase; font-weight: 600;">
                  Total Anggaran Pengadaan Baru:
                </span>
                <div style="text-align: right;">
                  <div id="adjust-calc-total" style="font-size: 20px; font-weight: 700; color: #34D399; font-family: var(--font-mono);">
                    Rp ${Number(pr.totalPrice).toLocaleString('id-ID')}
                  </div>
                  <div id="adjust-calc-delta" style="font-size: 11px; color: var(--text-dim);">
                    Semula: Rp ${Number(pr.originalTotalPrice || pr.totalPrice).toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            </div>

            <!-- Justification / Catatan Penyesuaian -->
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">
                Alasan Penyesuaian Anggaran / Kuantiti <span style="color: #F87171;">*</span>
              </label>
              <textarea id="adjust-pr-notes" class="form-control" rows="3" 
                        placeholder="Contoh: Disesuaikan kuantiti dari 2 unit menjadi 1 unit sesuai plafon pagu anggaran fasilitas kantor Q3..." required></textarea>
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-pr-adjust')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #F59E0B, #FF4B01);">
              ✓ Sahkan Penyesuaian & Teruskan
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-pr-adjust');
  },

  handleAdjustCalculate: function() {
    const qtyEl = document.getElementById('adjust-pr-qty');
    const priceEl = document.getElementById('adjust-pr-price');
    const totalEl = document.getElementById('adjust-calc-total');
    const deltaEl = document.getElementById('adjust-calc-delta');

    if (!qtyEl || !priceEl || !totalEl) return;

    const qty = Number(qtyEl.value) || 0;
    const price = Number(priceEl.value) || 0;
    const newTotal = qty * price;

    totalEl.textContent = `Rp ${newTotal.toLocaleString('id-ID')}`;

    const pr = DB.getItemRequests().find(p => p.id === this.currentAdjustingPRId);
    if (pr && deltaEl) {
      const orig = pr.originalTotalPrice || pr.totalPrice;
      const diff = newTotal - orig;
      if (diff === 0) {
        deltaEl.textContent = `Sama dengan estimasi awal: Rp ${orig.toLocaleString('id-ID')}`;
        deltaEl.style.color = 'var(--text-muted)';
      } else if (diff < 0) {
        deltaEl.textContent = `Hemat Rp ${Math.abs(diff).toLocaleString('id-ID')} dari pengajuan awal (Rp ${orig.toLocaleString('id-ID')})`;
        deltaEl.style.color = '#34D399';
      } else {
        deltaEl.textContent = `Bertambah +Rp ${diff.toLocaleString('id-ID')} dari pengajuan awal (Rp ${orig.toLocaleString('id-ID')})`;
        deltaEl.style.color = '#F87171';
      }
    }
  },

  submitAdjustedPR: function(e) {
    if (e) e.preventDefault();
    const id = this.currentAdjustingPRId;
    if (!id) return;

    const pr = DB.getItemRequests().find(p => p.id === id);
    if (!pr) return;

    const newQty = Number(document.getElementById('adjust-pr-qty').value) || 1;
    const newUnitPrice = Number(document.getElementById('adjust-pr-price').value) || 0;
    const notes = document.getElementById('adjust-pr-notes').value;

    if (newQty <= 0 || newUnitPrice <= 0 || !notes) {
      App.showToast('Mohon isi kuantiti, harga budget baru, serta alasan penyesuaian!', 'warn');
      return;
    }

    let nextStage = 'FINANCE_VERIFICATION';
    let finalStatus = 'PENDING';

    if (pr.stage === 'MANAGER_APPROVAL') {
      nextStage = 'FINANCE_VERIFICATION';
      finalStatus = 'PENDING';
    } else if (pr.stage === 'FINANCE_VERIFICATION') {
      nextStage = 'DIRECTOR_APPROVAL';
      finalStatus = 'PENDING';
    } else if (pr.stage === 'DIRECTOR_APPROVAL') {
      nextStage = 'COMPLETED';
      finalStatus = 'APPROVED';
    }

    DB.advanceItemRequestStage(id, nextStage, finalStatus, {
      newQty,
      newUnitPrice,
      notes
    });

    App.closeModal('modal-pr-adjust');
    App.showToast(`PR ${id} disetujui dengan penyesuaian (${newQty} unit @ Rp ${newUnitPrice.toLocaleString('id-ID')}) dan berhasil diteruskan!`, 'success');
    App.refreshCurrentTab();
  },

  // =========================================================================
  // CASH ADVANCE (KASBON) APPROVAL & DISBURSEMENT HANDLERS
  // =========================================================================

  currentAdjustingCAId: null,
  currentDisbursingCAId: null,
  currentVerifyingCAId: null,

  approveCADirector: function(id) {
    DB.approveCashAdvanceDirector(id, { action: 'APPROVED', notes: 'Disetujui penuh oleh Direksi' });
    App.showToast(`Cash Advance ${id} disetujui Direksi dan diteruskan ke Tim FAT untuk pencairan dana transfer!`, 'success');
    App.refreshCurrentTab();
  },

  rejectCA: function(id) {
    const reason = prompt('Masukkan alasan penolakan Cash Advance:', 'Kebutuhan belum memenuhi kriteria pengajuan kasbon');
    if (reason !== null) {
      DB.approveCashAdvanceDirector(id, { action: 'REJECTED', notes: reason.trim() });
      App.showToast(`Cash Advance ${id} ditolak.`, 'warn');
      App.refreshCurrentTab();
    }
  },

  openAdjustCAModal: function(id) {
    const ca = DB.getCashAdvanceById(id);
    if (!ca) return;

    this.currentAdjustingCAId = id;
    const user = DB.getCurrentUser();

    let modalEl = document.getElementById('modal-ca-adjust');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-ca-adjust';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #FCD34D;">Otorisasi Direksi</span>
            <h3 class="modal-title" style="margin-top: 2px;">Setujui Kasbon dgn Penyesuaian Plafon</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-ca-adjust')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="ApprovalCenterModule.submitAdjustedCA(event)">
          <div class="modal-body">
            
            <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-mono-badge" style="color: #FCD34D;">${ca.id}</span>
                <span style="font-size: 11px; color: var(--text-muted);">${ca.createdAt}</span>
              </div>
              <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 4px;">
                ${ca.title}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                Pemohon: <strong>${ca.employeeName}</strong> (${ca.department}) · Plafon Awal: <strong style="color: #FCD34D;">Rp ${Number(ca.amountRequested).toLocaleString('id-ID')}</strong>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nominal Plafon Disetujui (Rp) <span style="color: #F87171;">*</span></label>
              <input type="number" id="adjust-ca-amount" class="form-control" value="${ca.amountRequested}" min="10000" step="10000" required>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Alasan Penyesuaian Plafon Kasbon <span style="color: #F87171;">*</span></label>
              <textarea id="adjust-ca-notes" class="form-control" rows="3" placeholder="Contoh: Disesuaikan dengan batas pagu operasional perjalanan dinas survei..." required></textarea>
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-ca-adjust')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #F59E0B, #D97706); color: #000; font-weight: 700;">
              ✓ Sahkan Penyesuaian & Teruskan ke FAT
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-ca-adjust');
  },

  submitAdjustedCA: function(e) {
    if (e) e.preventDefault();
    const id = this.currentAdjustingCAId;
    if (!id) return;

    const adjustedAmount = Number(document.getElementById('adjust-ca-amount')?.value || 0);
    const notes = document.getElementById('adjust-ca-notes')?.value || '';

    if (adjustedAmount <= 0 || !notes.trim()) {
      App.showToast('Mohon lengkapi nominal dan alasan penyesuaian kasbon!', 'warn');
      return;
    }

    DB.approveCashAdvanceDirector(id, {
      action: 'APPROVED',
      adjustedAmount,
      notes: notes.trim()
    });

    App.closeModal('modal-ca-adjust');
    App.showToast(`Cash Advance ${id} disetujui dengan plafon Rp ${adjustedAmount.toLocaleString('id-ID')} dan diteruskan ke FAT!`, 'success');
    App.refreshCurrentTab();
  },

  openDisburseCAModal: function(id) {
    const ca = DB.getCashAdvanceById(id);
    if (!ca) return;

    this.currentDisbursingCAId = id;
    const user = DB.getCurrentUser();
    const amountToDisburse = Number(ca.amountApproved || ca.amountRequested) || 0;

    let modalEl = document.getElementById('modal-ca-disburse');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-ca-disburse';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 600px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #34D399;">Pencairan Kasbon Operasional (FAT)</span>
            <h3 class="modal-title" style="margin-top: 2px;">Konfirmasi Transfer Dana Kas Operasional</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-ca-disburse')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="ApprovalCenterModule.submitDisburseCA(event)">
          <div class="modal-body">
            
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-mono-badge" style="color: #34D399;">${ca.id}</span>
                <span style="font-size: 11px; color: var(--text-muted);">${ca.createdAt}</span>
              </div>
              <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 4px;">
                ${ca.title}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                Pemohon: <strong>${ca.employeeName}</strong> (${ca.department})
              </div>
              <div style="font-size: 18px; font-family: var(--font-mono); font-weight: 700; color: #34D399; margin-top: 8px;">
                Total Transfer: Rp ${amountToDisburse.toLocaleString('id-ID')}
              </div>
            </div>

            <!-- Rekening Tujuan -->
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
              <span class="text-mono-badge" style="color: #60A5FA; font-size: 10px;">Rekening Penerima Pemohon</span>
              <div style="color: #fff; font-weight: 600; margin-top: 4px;">
                ${ca.bankName} — ${ca.bankAccountNo} a.n ${ca.bankAccountName}
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nomor Referensi Bank / Bukti Transfer <span style="color: #F87171;">*</span></label>
              <input type="text" id="disburse-ca-ref" class="form-control" placeholder="Contoh: TRF-MANDIRI-998821 / Ref: 882910" value="TRF-FAT-${Date.now().toString().slice(-6)}" required>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Catatan Pencairan Kasir FAT</label>
              <input type="text" id="disburse-ca-notes" class="form-control" placeholder="Dana ditransfer via m-Banking Mandiri Kas Operasional" value="Dana telah berhasil ditransfer ke rekening pemohon.">
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-ca-disburse')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; font-weight: 700;">
              💸 Konfirmasi Transfer & Buka Status LPJ
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-ca-disburse');
  },

  submitDisburseCA: function(e) {
    if (e) e.preventDefault();
    const id = this.currentDisbursingCAId;
    if (!id) return;

    const bankRefNo = document.getElementById('disburse-ca-ref')?.value || '';
    const notes = document.getElementById('disburse-ca-notes')?.value || '';

    DB.disburseCashAdvanceFAT(id, {
      bankRefNo,
      notes
    });

    App.closeModal('modal-ca-disburse');
    App.showToast(`Dana Cash Advance ${id} berhasil dicairkan! Notifikasi pelaporan LPJ diterbitkan ke pemohon.`, 'success');
    App.refreshCurrentTab();
  },

  openVerifyCASettlementModal: function(id) {
    const ca = DB.getCashAdvanceById(id);
    if (!ca || !ca.settlement) return;

    this.currentVerifyingCAId = id;
    const s = ca.settlement;
    const disbursed = Number(ca.amountDisbursed || ca.amountApproved || ca.amountRequested) || 0;

    let modalEl = document.getElementById('modal-ca-verify-settlement');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-ca-verify-settlement';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 680px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #60A5FA;">Verifikasi LPJ Belanja (FAT)</span>
            <h3 class="modal-title" style="margin-top: 2px;">Verifikasi Nota Realisasi & Tutup Kasbon</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-ca-verify-settlement')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="ApprovalCenterModule.submitVerifyCASettlement(event)">
          <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
            
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px;">
              <span class="text-mono-badge" style="color: #FCD34D;">${ca.id}</span>
              <div style="font-weight: 600; color: #fff; font-size: 15px; margin-top: 2px;">${ca.title}</div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                Pemohon: <strong>${ca.employeeName}</strong> (${ca.department}) · Tanggal LPJ: ${s.submittedAt}
              </div>
            </div>

            <!-- Rekap Angka -->
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 16px;">
              <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted);">Dana Ditransfer FAT</div>
                <div style="font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: #34D399; margin-top: 2px;">
                  Rp ${disbursed.toLocaleString('id-ID')}
                </div>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted);">Total Belanja Nota</div>
                <div style="font-family: var(--font-mono); font-size: 15px; font-weight: 700; color: #60A5FA; margin-top: 2px;">
                  Rp ${Number(s.totalSpent).toLocaleString('id-ID')}
                </div>
              </div>
              <div style="background: rgba(255,255,255,0.03); padding: 10px 12px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.06);">
                <div style="font-size: 11px; color: var(--text-muted);">Hasil Rekonsiliasi</div>
                <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: ${s.refundAmount > 0 ? '#34D399' : s.reimburseAmount > 0 ? '#60A5FA' : '#fff'}; margin-top: 2px;">
                  ${s.refundAmount > 0 ? `Sisa: Rp ${Number(s.refundAmount).toLocaleString('id-ID')}` : s.reimburseAmount > 0 ? `Reimburse: Rp ${Number(s.reimburseAmount).toLocaleString('id-ID')}` : 'Sesuai (Pas)'}
                </div>
              </div>
            </div>

            <!-- Tabel Rincian Belanja -->
            <h4 style="font-size: 12.5px; color: #fff; margin-bottom: 6px;">Rincian Item Belanja:</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px;">
              <thead>
                <tr style="border-bottom: 1px solid rgba(255,255,255,0.08); text-align: left; color: var(--text-dim); font-size: 10.5px;">
                  <th style="padding: 6px 8px;">Item Pengeluaran</th>
                  <th style="padding: 6px 8px;">Qty</th>
                  <th style="padding: 6px 8px;">Harga Satuan</th>
                  <th style="padding: 6px 8px; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${(s.items || []).map(item => `
                  <tr style="border-bottom: 1px solid rgba(255,255,255,0.04);">
                    <td style="padding: 6px 8px; color: #fff;">${item.name}</td>
                    <td style="padding: 6px 8px; font-family: var(--font-mono);">${item.qty}</td>
                    <td style="padding: 6px 8px; font-family: var(--font-mono);">Rp ${Number(item.unitPrice).toLocaleString('id-ID')}</td>
                    <td style="padding: 6px 8px; font-family: var(--font-mono); font-weight: 700; color: #60A5FA; text-align: right;">
                      Rp ${(Number(item.qty) * Number(item.unitPrice)).toLocaleString('id-ID')}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <!-- Bukti Kwitansi -->
            ${(s.proofFiles && s.proofFiles.length > 0 && s.proofFiles[0].dataUrl) ? `
              <h4 style="font-size: 12.5px; color: #fff; margin-bottom: 6px;">Lampiran Foto Struk / Nota:</h4>
              <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px; text-align: center; margin-bottom: 14px;">
                <img src="${s.proofFiles[0].dataUrl}" alt="Foto Bukti Kwitansi" style="max-width: 100%; max-height: 220px; object-fit: contain; border-radius: 4px;">
              </div>
            ` : ''}

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Catatan Pengesahan Verifikasi FAT</label>
              <input type="text" id="verify-ca-notes" class="form-control" value="Nota kwitansi dan rekonsiliasi pengembalian dana telah diverifikasi sesuai & sah.">
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-ca-verify-settlement')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); border-color: #60A5FA; color: #fff; font-weight: 700;">
              ✓ Sahkan LPJ & Tutup Kasbon (SETTLED)
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-ca-verify-settlement');
  },

  submitVerifyCASettlement: function(e) {
    if (e) e.preventDefault();
    const id = this.currentVerifyingCAId;
    if (!id) return;

    const notes = document.getElementById('verify-ca-notes')?.value || '';
    DB.verifyCashAdvanceSettlementFAT(id, { notes });

    App.closeModal('modal-ca-verify-settlement');
    App.showToast(`Laporan LPJ Cash Advance ${id} telah diverifikasi sah! Transaksi resmi ditutup (SETTLED).`, 'success');
    App.refreshCurrentTab();
  }
};

