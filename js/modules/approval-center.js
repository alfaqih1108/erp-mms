/**
 * ERP MMS - Universal Approval Center Module (Multi-Tier Enterprise Matrix)
 * Tailored precisely to office structure:
 * 1. Cuti: Surveyor/Yayasan -> HC; Keuangan -> Dir Keuangan -> HC; Manager -> Dir Ops/Keu -> HC.
 * 2. Timesheet: Lapangan mandiri; Keuangan -> HC.
 * 3. PR: Staff -> Manager -> Verifikasi Keuangan -> Direktur (Final & Terbitkan PO).
 * 4. PR Manager Area (Dapur): Skip Manager -> Verifikasi Keuangan -> Direktur.
 */

window.ApprovalCenterModule = {
  activeTab: 'PENDING', // 'PENDING' (Antrean) or 'HISTORY' (Riwayat Approval Saya)
  activeFilter: 'ALL',   // 'ALL', 'LEAVE', 'TIMESHEET', 'PR', 'CA'

  // Periksa apakah user memiliki hak akses fitur Export Data Pengajuan (Direksi & FAT)
  isExportAllowed: function(role) {
    if (!role) return false;
    const allowed = [
      'SUPER_ADMIN',
      'DIREKTUR_UTAMA',
      'DIREKTUR_OPERASIONAL',
      'DIREKTUR_KEUANGAN',
      'FAT_OFFICER',
      'STAFF_AHLI_KEUANGAN',
      'MANAGER_KEUANGAN',
      'HUMAN_CAPITAL'
    ];
    return allowed.includes(role) || role.startsWith('DIREKTUR_');
  },

  setTab: function(tab) {
    this.activeTab = tab;
    this.render(document.getElementById('main-content-area'));
  },

  setFilter: function(filter) {
    this.activeFilter = filter;
    this.render(document.getElementById('main-content-area'));
  },

  // Mengumpulkan seluruh riwayat pengajuan yang BENAR-BENAR telah diapprove / diproses oleh user aktif
  getMyApprovalHistory: function(user) {
    if (!user) return [];

    const leaves = DB.getLeaves() || [];
    const prs = DB.getItemRequests() || [];
    const cas = DB.getCashAdvances() || [];

    const history = [];

    const uName = (user.name || '').trim().toLowerCase();
    const uId = (user.id || '').trim().toLowerCase();
    const uNika = (user.nika || '').trim().toLowerCase();

    // Helper untuk memverifikasi apakah log tindakan persetujuan dilakukan oleh user aktif ini
    const isStepByCurrentUser = (h) => {
      if (!h) return false;
      // Jangan masukkan aksi awal SUBMITTED oleh pemohon
      if (h.action === 'SUBMITTED' || h.stage === 'SUBMISSION') return false;

      const actorName = (h.actorName || '').toLowerCase();
      const actorId = (h.actorId || '').toLowerCase();

      return (
        (uName && actorName.includes(uName)) ||
        (uId && (actorId === uId || actorName.includes(uId))) ||
        (uNika && actorName.includes(uNika))
      );
    };

    // 1. LEAVES (CUTI & IZIN)
    leaves.forEach(l => {
      let historyList = l.approvalHistory || l.approval_history || [];
      if (typeof historyList === 'string') {
        try { historyList = JSON.parse(historyList); } catch (e) { historyList = []; }
      }
      if (!Array.isArray(historyList)) historyList = [];

      const userStep = historyList.find(h => isStepByCurrentUser(h));

      if (userStep) {
        const timestamp = userStep.timestamp || (l.updatedAt || l.createdAt || '-');
        const action = userStep.action || l.status;
        history.push({
          type: 'LEAVE',
          id: l.id,
          date: l.createdAt || l.startDate,
          employeeName: l.employeeName || l.employee_name,
          department: l.department || l.role,
          title: `${l.employeeName || l.employee_name} — ${l.leaveType || l.type || l.leave_type} (${l.duration} Hari)`,
          summary: `Periode: ${l.startDate || l.start_date} s/d ${l.endDate || l.end_date} · Alasan: "${l.reason || '-'}"`,
          stage: l.stage,
          status: l.status,
          decision: action,
          decisionTimestamp: timestamp,
          approverName: userStep.actorName || userStep.actor_name || user.name,
          notes: userStep.notes || (l.status === 'APPROVED' ? 'Disetujui' : 'Diproses'),
          raw: l
        });
      }
    });

    // 2. PURCHASE REQUESTS (PR)
    prs.forEach(p => {
      let historyList = p.approvalHistory || p.approval_history || [];
      if (typeof historyList === 'string') {
        try { historyList = JSON.parse(historyList); } catch (e) { historyList = []; }
      }
      if (!Array.isArray(historyList)) historyList = [];

      const userStep = historyList.find(h => isStepByCurrentUser(h));
      const userAdj = Array.isArray(p.adjustments) ? p.adjustments.find(a => a.adjustedBy && a.adjustedBy.toLowerCase().includes(uName)) : null;

      if (userStep || userAdj) {
        const decisionStep = userStep || (historyList.length > 0 ? historyList[historyList.length - 1] : null);
        const timestamp = decisionStep ? decisionStep.timestamp : (p.updatedAt || p.createdAt || '-');
        const action = decisionStep ? decisionStep.action : p.status;
        history.push({
          type: 'PR',
          id: p.id,
          date: p.createdAt,
          employeeName: p.employeeName || p.employee_name,
          department: p.department || p.role,
          title: `${p.itemName || p.item_name} (${p.quantity} ${p.unit || 'Unit'}) — Rp ${(p.totalPrice || p.total_price || 0).toLocaleString('id-ID')}`,
          summary: `Kategori: ${p.category} ${p.targetKitchen || p.target_kitchen ? `· Dapur: ${p.targetKitchen || p.target_kitchen}` : ''} · Alasan: "${p.reason || '-'}"`,
          stage: p.stage,
          status: p.status,
          decision: p.hasAdjustment || p.has_adjustment ? 'ADJUSTED_APPROVED' : action,
          decisionTimestamp: timestamp,
          approverName: decisionStep ? (decisionStep.actorName || decisionStep.actor_name) : user.name,
          notes: userAdj ? `Disesuaikan (${userAdj.newQty} unit @ Rp ${Number(userAdj.newUnitPrice).toLocaleString('id-ID')})` : (decisionStep ? decisionStep.notes : '-'),
          raw: p
        });
      }
    });

    // 3. CASH ADVANCE (CA)
    cas.forEach(c => {
      let historyList = c.approvalHistory || c.approval_history || [];
      if (typeof historyList === 'string') {
        try { historyList = JSON.parse(historyList); } catch (e) { historyList = []; }
      }
      if (!Array.isArray(historyList)) historyList = [];

      const userStep = historyList.find(h => isStepByCurrentUser(h));

      if (userStep) {
        const timestamp = userStep.timestamp || (c.disbursedAt || c.createdAt || '-');
        const action = userStep.action || c.status;
        history.push({
          type: 'CA',
          id: c.id,
          date: c.createdAt,
          employeeName: c.employeeName || c.employee_name,
          department: c.department || c.role,
          title: `Kasbon: Rp ${(c.amount || 0).toLocaleString('id-ID')} — ${c.title || c.purpose || 'Kebutuhan Operasional'}`,
          summary: `Target: ${c.targetLocation || c.targetExpense || 'Operasional'} · Rekening: ${c.bankName} ${c.bankAccountNo}`,
          stage: c.stage,
          status: c.status,
          decision: action,
          decisionTimestamp: timestamp,
          approverName: userStep.actorName || userStep.actor_name || user.name,
          notes: userStep.notes || '-',
          raw: c
        });
      }
    });

    // Urutkan dari keputusan approval terbaru
    return history.sort((a, b) => (b.decisionTimestamp || '').localeCompare(a.decisionTimestamp || ''));
  },

  render: function(container) {
    if (!container) return;

    const user = DB.getCurrentUser();
    const leaves = DB.getLeaves() || [];
    const prs = DB.getItemRequests() || [];
    const cas = DB.getCashAdvances() || [];

    // Filter Items Relevan sesuai Matriks Persetujuan Resmi (Antrean Pending)
    let relevantLeaves = [];
    let relevantPrs = [];
    let relevantCAs = [];

    // 1. Human Capital: Cuti tahap HC (Level 2)
    if (user.role === 'HUMAN_CAPITAL') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && (l.stage === 'HC_REVIEW' || l.stage === 'HC_FINAL'));
    }
    // 2. Direktur Keuangan / Direktur Operasional:
    //    - PR: Level 3 PR Perwakilan Yayasan, Level 1 PR Staff/FAT/Staff Ahli, Level 2 PR Manager
    //    - Cuti: Level 1 Cuti Manager/Staff/FAT/Staff Ahli/HC
    //    - Kasbon: Level 1 Kasbon Semua Role
    else if (user.role === 'DIREKTUR_KEUANGAN' || user.role === 'DIREKTUR_OPERASIONAL') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && (l.stage === 'DIR_OPS_OR_KEU_REVIEW' || l.stage === 'DIR_KEU_REVIEW'));
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'DIRECTOR_APPROVAL');
      relevantCAs = cas.filter(c => c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW');
    }
    // 3. Manager Area:
    //    - PR: Level 1 PR Perwakilan Yayasan (Dapur SPPG Terkait)
    //    - Cuti: Level 1 Cuti Perwakilan Yayasan & Surveyor
    else if (user.role === 'MANAGER_AREA') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'MANAGER_APPROVAL' && p.role === 'PERWAKILAN_YAYASAN');
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && l.stage === 'MANAGER_AREA_REVIEW' && (l.role === 'PERWAKILAN_YAYASAN' || l.role === 'SURVEYOR'));
    }
    // 4. Staff Ahli Keuangan:
    //    - PR: Level 2 PR Perwakilan Yayasan, Level 1 PR Manager Area & Manager Keuangan & HC
    //    - Cuti: Level 1 Cuti Maker Yayasan
    else if (user.role === 'STAFF_AHLI_KEUANGAN') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'FINANCE_VERIFICATION' && (p.role === 'PERWAKILAN_YAYASAN' || p.role === 'MANAGER_AREA' || p.role === 'MANAGER_KEUANGAN' || p.role === 'HUMAN_CAPITAL'));
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && l.stage === 'STAFF_AHLI_REVIEW' && l.role === 'MAKER_YAYASAN');
    }
    // 5. FAT Officer:
    //    - Kasbon: Pencairan Kasbon Level 2 & Verifikasi LPJ Kasbon
    else if (user.role === 'FAT_OFFICER') {
      relevantCAs = cas.filter(c => (c.status === 'PENDING' && c.stage === 'FAT_DISBURSEMENT') || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED'));
    }
    // 6. Direktur Utama & Super Admin: Oversight Semua
    else if (user.role === 'DIREKTUR_UTAMA' || user.role === 'SUPER_ADMIN') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING');
      relevantPrs = prs.filter(p => p.status === 'PENDING');
      relevantCAs = cas.filter(c => (c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW') || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED'));
    }

    const totalPending = relevantLeaves.length + relevantPrs.length + relevantCAs.length;

    // Dapatkan data riwayat approval saya
    const allHistory = this.getMyApprovalHistory(user);
    const historyLeaves = allHistory.filter(h => h.type === 'LEAVE');
    const historyPrs = allHistory.filter(h => h.type === 'PR');
    const historyCAs = allHistory.filter(h => h.type === 'CA');
    const totalHistory = allHistory.length;

    const showExportBtn = this.isExportAllowed(user.role);

    container.innerHTML = `
      <div class="animate-blur-in">
        <!-- Header Universal Approval Hub -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 16px;">
          <div>
            <span class="text-mono-badge" style="color: var(--brand-orange);">Universal Approval Hub</span>
            <h1 style="font-size: 26px; font-weight: 600; margin-top: 2px;">Pusat Persetujuan Terpadu</h1>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            ${showExportBtn ? `
              <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); border-color: #34D399; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3); font-weight: 600; padding: 8px 18px; font-size: 13px;" onclick="ApprovalCenterModule.openExportModal()">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export Data Pengajuan (Excel)</span>
              </button>
            ` : ''}
            <span class="live-status-pill">
              <span class="live-dot" style="background: ${this.activeTab === 'PENDING' ? 'var(--brand-orange)' : '#10B981'};"></span>
              ${this.activeTab === 'PENDING' ? `${totalPending} Antrean Menunggu Respon Anda` : `${totalHistory} Pengajuan Telah Anda Proses`}
            </span>
          </div>
        </div>

        <!-- Role Context Notice -->
        <div class="nalar-card" style="padding: 14px 20px; background: rgba(255, 75, 1, 0.05); border-color: rgba(255, 75, 1, 0.2); margin-bottom: 20px;">
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
                  Sistem secara otomatis menampilkan antrean persetujuan Cuti, Pengadaan Barang (PR), dan Kasbon yang memerlukan keputusan Anda sesuai matriks wewenang resmi.
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab Navigasi Utama: Antrean vs Riwayat Approval Saya -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; margin-bottom: 20px;">
          <div class="approval-tab-switcher">
            <button class="approval-tab-btn ${this.activeTab === 'PENDING' ? 'active' : ''}" onclick="ApprovalCenterModule.setTab('PENDING')">
              <span>⏳ Antrean Persetujuan</span>
              <span class="filter-badge" style="background: ${this.activeTab === 'PENDING' ? 'var(--brand-orange)' : 'rgba(255,255,255,0.08)'}; color: #fff;">${totalPending}</span>
            </button>
            <button class="approval-tab-btn tab-history ${this.activeTab === 'HISTORY' ? 'active' : ''}" onclick="ApprovalCenterModule.setTab('HISTORY')">
              <span>📋 Riwayat Approval Saya</span>
              <span class="filter-badge" style="background: ${this.activeTab === 'HISTORY' ? '#10B981' : 'rgba(255,255,255,0.08)'}; color: #fff;">${totalHistory}</span>
            </button>
          </div>
        </div>

        <!-- Thematic Floating Filter Pills (Semua, Cuti, PR, Cash Advance) -->
        <div class="approval-filter-bar">
          <button class="approval-filter-pill pill-all ${this.activeFilter === 'ALL' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('ALL')">
            <span class="filter-dot dot-orange"></span>
            <span>Semua Pengajuan</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? totalPending : totalHistory}</span>
          </button>

          <button class="approval-filter-pill pill-leave ${this.activeFilter === 'LEAVE' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('LEAVE')">
            <span class="filter-dot dot-violet"></span>
            <span>Cuti & Izin</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? relevantLeaves.length : historyLeaves.length}</span>
          </button>

          <button class="approval-filter-pill pill-pr ${this.activeFilter === 'PR' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('PR')">
            <span class="filter-dot dot-amber"></span>
            <span>Pengadaan Barang (PR)</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? relevantPrs.length : historyPrs.length}</span>
          </button>

          <button class="approval-filter-pill pill-ca ${this.activeFilter === 'CA' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('CA')">
            <span class="filter-dot dot-emerald"></span>
            <span>Cash Advance (Kasbon)</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? relevantCAs.length : historyCAs.length}</span>
          </button>
        </div>

        <!-- TAB KONTEN 1: ANTREAN PERSETUJUAN (PENDING) -->
        ${this.activeTab === 'PENDING' ? `
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${totalPending === 0 ? `
              <div class="nalar-card" style="text-align: center; padding: 48px;">
                <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
                <h3 style="font-size: 18px; color: #fff; margin-bottom: 4px;">Tidak Ada Antrean Approval</h3>
                <p style="font-size: 12.5px; color: var(--text-muted);">Seluruh pengajuan cuti, PR, atau kasbon yang membutuhkan wewenang Anda telah selesai diproses.</p>
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
                        Tahap: ${l.stage === 'MANAGER_AREA_REVIEW' ? 'Review Manager Area' : l.stage === 'STAFF_AHLI_REVIEW' ? 'Verifikasi Staff Ahli Keuangan' : l.stage === 'DIR_OPS_OR_KEU_REVIEW' || l.stage === 'DIR_KEU_REVIEW' ? 'Review Direksi' : 'Verifikasi Final Human Capital'}
                      </span>
                      <button type="button" class="btn-nalar-secondary" style="padding: 2px 8px; font-size: 10px; color: #A78BFA; border-color: rgba(139,92,246,0.4);" onclick="App.showApprovalTracker('leave', '${l.id}')">
                        🔍 Cek Level Approval
                      </button>
                    </div>
                    <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 500;">${l.employeeName} — ${l.leaveType || l.type} (${l.duration} Hari)</h4>
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
                    ${l.stage === 'HC_REVIEW' ? 'Setujui Cuti Final' : 'Setujui & Teruskan ke HC'}
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
                        Tahap: ${p.stage === 'MANAGER_APPROVAL' ? '1. Review Manager Area' : p.stage === 'FINANCE_VERIFICATION' ? '2. Verifikasi Anggaran Keuangan' : '3. Persetujuan Akhir Direktur'}
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
                      <div style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; ${p.targetKitchen.includes('KANTOR') ? 'color: #93C5FD; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.3);' : 'color: #FCD34D; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3);'} padding: 2px 8px; border-radius: 4px; margin: 2px 0 4px 0; font-weight: 500;">
                        ${p.targetKitchen.includes('KANTOR') ? '🏢 Keperluan:' : '🍳 Untuk Kepentingan Dapur:'} ${p.targetKitchen}
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
        ` : `
          <!-- TAB KONTEN 2: RIWAYAT APPROVAL SAYA (APPROVED & PROCESSED AUDIT LOG) -->
          <div style="display: flex; flex-direction: column; gap: 16px;">
            ${(function() {
              const filteredHistory = allHistory.filter(h => {
                if (ApprovalCenterModule.activeFilter === 'ALL') return true;
                return h.type === ApprovalCenterModule.activeFilter;
              });

              if (filteredHistory.length === 0) {
                return `
                  <div class="nalar-card" style="text-align: center; padding: 48px;">
                    <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
                    <h3 style="font-size: 18px; color: #fff; margin-bottom: 4px;">Belum Ada Riwayat Persetujuan</h3>
                    <p style="font-size: 12.5px; color: var(--text-muted);">Seluruh data pengajuan yang telah Anda setujui atau proses akan tercatat otomatis di sini lengkap dengan tanggal & jam keputusan.</p>
                  </div>
                `;
              }

              return filteredHistory.map(item => {
                const isLeave = (item.type === 'LEAVE');
                const isTS = (item.type === 'TIMESHEET');
                const isPR = (item.type === 'PR');
                const isCA = (item.type === 'CA');

                const themeColor = isLeave ? '#A78BFA' : isTS ? '#60A5FA' : isPR ? '#FCD34D' : '#34D399';
                const typeLabel = isLeave ? 'CUTI / IZIN' : isTS ? 'TIMESHEET' : isPR ? 'PENGADAAN BARANG (PR)' : 'CASH ADVANCE (KASBON)';

                const isApproved = (item.decision === 'APPROVED' || item.status === 'APPROVED' || item.status === 'COMPLETED' || item.status === 'SETTLED');
                const isRejected = (item.decision === 'REJECTED' || item.status === 'REJECTED');
                const isAdjusted = (item.decision === 'ADJUSTED_APPROVED');

                const decisionBadgeBg = isRejected ? 'rgba(239, 68, 68, 0.15)' : isAdjusted ? 'rgba(245, 158, 11, 0.15)' : 'rgba(52, 211, 153, 0.15)';
                const decisionBadgeColor = isRejected ? '#F87171' : isAdjusted ? '#FCD34D' : '#34D399';
                const decisionBadgeBorder = isRejected ? 'rgba(239, 68, 68, 0.35)' : isAdjusted ? 'rgba(245, 158, 11, 0.35)' : 'rgba(52, 211, 153, 0.35)';
                const decisionText = isRejected ? '✕ Ditolak' : isAdjusted ? '✏️ Disetujui Dgn Penyesuaian' : '✓ Disetujui / Tervalidasi';

                return `
                  <div class="nalar-card" style="border-left: 3px solid ${themeColor}; padding: 18px 22px; margin-bottom: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
                      
                      <!-- Info Utama -->
                      <div style="flex: 1; min-width: 280px;">
                        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
                          <span class="text-mono-badge" style="color: ${themeColor}; font-size: 11px;">
                            ${typeLabel} · ${item.id}
                          </span>
                          
                          <!-- Badge Keputusan -->
                          <span style="font-size: 11px; font-weight: 700; color: ${decisionBadgeColor}; background: ${decisionBadgeBg}; border: 1px solid ${decisionBadgeBorder}; padding: 2px 8px; border-radius: 4px; font-family: var(--font-mono);">
                            ${decisionText}
                          </span>

                          <!-- Badge Tanggal & Jam Approval -->
                          <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #34D399; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 2px 10px; border-radius: 4px; font-family: var(--font-mono);">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                            <span>Waktu Approval: <strong>${item.decisionTimestamp || '-'}</strong></span>
                          </span>
                        </div>

                        <h4 style="font-size: 16px; color: #fff; font-weight: 600; margin: 4px 0 4px 0;">
                          ${item.title}
                        </h4>

                        <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">
                          ${item.summary}
                        </div>

                        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
                          <span>Pemohon: <strong style="color: #CBD5E1;">${item.employeeName}</strong> (${item.department})</span>
                          <span>·</span>
                          <span>Diproses oleh: <strong style="color: #FCD34D;">${item.approverName || user.name}</strong></span>
                          ${item.notes && item.notes !== '-' ? `
                            <span>·</span>
                            <span>Catatan: <em>"${item.notes}"</em></span>
                          ` : ''}
                        </div>
                      </div>

                      <!-- Tombol Action Detail Tracker -->
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <button type="button" class="btn-nalar-secondary" style="padding: 6px 12px; font-size: 11.5px; border-color: rgba(255,255,255,0.15);" onclick="${isCA ? `App.openApprovalTracker('CA', '${item.id}')` : `App.showApprovalTracker('${item.type.toLowerCase()}', '${item.id}')`}">
                          🔍 Cek Alur & Rincian
                        </button>
                      </div>

                    </div>
                  </div>
                `;
              }).join('');
            })()}
          </div>
        `}
      </div>
    `;
  },

  approveLeave: function(id, currentStage) {
    if (currentStage === 'HC_REVIEW') {
      DB.advanceLeaveStage(id, 'HC_FINAL', 'APPROVED');
      App.showToast(`Cuti ${id} disetujui penuh oleh Human Capital! Saldo kuota karyawan otomatis dipotong.`, 'success');
    } else {
      DB.advanceLeaveStage(id, 'HC_REVIEW', 'PENDING');
      App.showToast(`Persetujuan Level 1 untuk ${id} berhasil! Pengajuan diteruskan ke Human Capital untuk pengesahan kuota.`, 'success');
    }
    App.refreshCurrentTab();
  },

  rejectLeave: function(id) {
    DB.advanceLeaveStage(id, 'REJECTED', 'REJECTED');
    App.showToast(`Cuti ${id} ditolak.`, 'warn');
    App.refreshCurrentTab();
  },

  advancePR: function(id, currentStage) {
    if (currentStage === 'MANAGER_APPROVAL') {
      DB.advanceItemRequestStage(id, 'FINANCE_VERIFICATION', 'PENDING');
      App.showToast(`PR ${id} disetujui Manager Area & diteruskan ke Verifikasi Anggaran Keuangan (Staff Ahli Keuangan)!`, 'success');
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
  },

  // =========================================================================
  // UNIVERSAL EXCEL EXPORT ENGINE FOR DIRECTORS & FAT OFFICERS
  // =========================================================================

  openExportModal: function() {
    const user = DB.getCurrentUser();
    if (!this.isExportAllowed(user.role)) {
      App.showToast('Akses ditolak: Fitur ini khusus Direksi & Tim Keuangan/FAT.', 'warn');
      return;
    }

    let modalEl = document.getElementById('modal-export-approval-excel');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-export-approval-excel';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    const firstDay = `${y}-${m}-01`;
    const lastDay = `${y}-${m}-${d}`;

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 620px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #34D399;">Export Data Resmi</span>
            <h3 class="modal-title" style="margin-top: 2px;">Export Laporan Pengajuan ke Excel (.xlsx)</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-export-approval-excel')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div class="modal-body">
          <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.28); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 18px;">
            <div style="font-size: 13px; font-weight: 600; color: #fff;">
              📥 Rekapitulasi Data Terpadu Organisasi
            </div>
            <div style="font-size: 11.5px; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">
              File Excel akan diexport secara rapi dengan format tabel resmi, header tematik, kolom tanggal & jam persetujuan, serta detail isian formulir lengkap.
            </div>
          </div>

          <!-- Pilihan Kategori Pengajuan -->
          <div class="form-group">
            <label class="form-label" style="font-weight: 600;">1. Kategori Pengajuan yang Ingin Diexport <span style="color: #F87171;">*</span></label>
            <select id="export-modal-category" class="form-control" style="font-size: 13px;">
              <option value="ALL" selected>📑 Semua Pengajuan (Master Konsolidasi: Cuti, PR & Kasbon)</option>
              <option value="LEAVE">🌴 Cuti & Izin Karyawan</option>
              <option value="PR">📦 Pengadaan Barang & Pembelian (PR)</option>
              <option value="CA">💰 Cash Advance & LPJ Kasbon</option>
            </select>
          </div>

          <!-- Pilihan Status Pengajuan -->
          <div class="form-group">
            <label class="form-label" style="font-weight: 600;">2. Filter Status Pengajuan</label>
            <select id="export-modal-status" class="form-control" style="font-size: 13px;">
              <option value="ALL" selected>🌐 Semua Status (Approved, Pending, Rejected, Settled)</option>
              <option value="APPROVED">🟢 Hanya yang Disetujui (Approved / Validated / Settled)</option>
              <option value="PENDING">🟡 Hanya yang Sedang Berjalan (Pending Approval / Verification)</option>
              <option value="REJECTED">🔴 Hanya yang Ditolak (Rejected)</option>
            </select>
          </div>

          <!-- Rentang Tanggal Pengajuan -->
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <label class="form-label" style="margin-bottom: 0; font-weight: 600;">3. Rentang Tanggal Pengajuan</label>
              <div style="display: flex; gap: 4px;">
                <button type="button" class="btn-preset-pill" onclick="ApprovalCenterModule.setExportModalPreset('thisMonth')">Bulan Ini</button>
                <button type="button" class="btn-preset-pill" onclick="ApprovalCenterModule.setExportModalPreset('today')">Hari Ini</button>
                <button type="button" class="btn-preset-pill" onclick="ApprovalCenterModule.setExportModalPreset('all')">Semua Waktu</button>
              </div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px; align-items: center;">
              <input type="date" id="export-modal-start-date" class="form-control" value="${firstDay}" style="font-size: 12.5px; font-family: var(--font-mono);">
              <span style="color: var(--text-muted); font-size: 12px;">s/d</span>
              <input type="date" id="export-modal-end-date" class="form-control" value="${lastDay}" style="font-size: 12.5px; font-family: var(--font-mono);">
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-export-approval-excel')">Batal</button>
          <button type="button" class="btn-nalar-primary" style="background: linear-gradient(135deg, #059669 0%, #10B981 100%); border-color: #34D399; font-weight: 700; display: inline-flex; align-items: center; gap: 8px;" onclick="ApprovalCenterModule.executeExportExcel()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            <span>Unduh Laporan Excel (.xlsx)</span>
          </button>
        </div>
      </div>
    `;

    App.openModal('modal-export-approval-excel');
  },

  setExportModalPreset: function(preset) {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');

    const startEl = document.getElementById('export-modal-start-date');
    const endEl = document.getElementById('export-modal-end-date');
    if (!startEl || !endEl) return;

    if (preset === 'today') {
      startEl.value = `${y}-${m}-${d}`;
      endEl.value = `${y}-${m}-${d}`;
    } else if (preset === 'thisMonth') {
      startEl.value = `${y}-${m}-01`;
      endEl.value = `${y}-${m}-${d}`;
    } else if (preset === 'all') {
      startEl.value = '2026-01-01';
      endEl.value = '2026-12-31';
    }
  },

  executeExportExcel: function() {
    const user = DB.getCurrentUser();
    const category = document.getElementById('export-modal-category')?.value || 'ALL';
    const statusFilter = document.getElementById('export-modal-status')?.value || 'ALL';
    const startDate = document.getElementById('export-modal-start-date')?.value || '';
    const endDate = document.getElementById('export-modal-end-date')?.value || '';

    const leaves = DB.getLeaves() || [];
    const prs = DB.getItemRequests() || [];
    const cas = DB.getCashAdvances() || [];

    const now = new Date();
    const exportTimeStr = now.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) + ' ' + now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // Helper filter tanggal
    const isDateInRange = (dStr) => {
      if (!dStr) return true;
      const cleanDate = dStr.slice(0, 10);
      if (startDate && cleanDate < startDate) return false;
      if (endDate && cleanDate > endDate) return false;
      return true;
    };

    // Helper status match
    const isStatusMatch = (status) => {
      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'APPROVED') return (status === 'APPROVED' || status === 'COMPLETED' || status === 'SETTLED');
      if (statusFilter === 'PENDING') return (status === 'PENDING' || status === 'SETTLEMENT_PENDING');
      if (statusFilter === 'REJECTED') return (status === 'REJECTED');
      return true;
    };

    let tableHtml = '';
    let categoryTitle = 'SEMUA PENGAJUAN (MASTER KONSOLIDASI)';
    let filenameSuffix = 'Master_Konsolidasi';

    // 1. EXPORT KHUSUS CUTI & IZIN
    if (category === 'LEAVE') {
      categoryTitle = 'CUTI & IZIN KARYAWAN';
      filenameSuffix = 'Cuti_Izin';
      const filteredLeaves = leaves.filter(l => isDateInRange(l.createdAt || l.startDate) && isStatusMatch(l.status));

      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #5B21B6; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px;">No</th>
              <th style="padding: 10px;">ID Pengajuan</th>
              <th style="padding: 10px;">Tgl Pengajuan</th>
              <th style="padding: 10px;">NIKA</th>
              <th style="padding: 10px;">Nama Pemohon</th>
              <th style="padding: 10px;">Divisi / Jabatan</th>
              <th style="padding: 10px;">Kategori Cuti</th>
              <th style="padding: 10px;">Tgl Mulai</th>
              <th style="padding: 10px;">Tgl Selesai</th>
              <th style="padding: 10px;">Total Hari</th>
              <th style="padding: 10px;">Alasan / Keperluan</th>
              <th style="padding: 10px;">Lampiran Surat</th>
              <th style="padding: 10px;">Status Pengajuan</th>
              <th style="padding: 10px;">Tahap Terakhir</th>
              <th style="padding: 10px;">Waktu Approval (Tgl & Jam)</th>
              <th style="padding: 10px;">Pejabat Penyetuju (Approver)</th>
              <th style="padding: 10px;">Catatan Keputusan</th>
            </tr>
          </thead>
          <tbody>
            ${filteredLeaves.map((l, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              const lastStep = Array.isArray(l.approvalHistory) && l.approvalHistory.length > 0 ? l.approvalHistory[l.approvalHistory.length - 1] : null;
              const approvalTime = lastStep && lastStep.action !== 'SUBMITTED' ? lastStep.timestamp : (l.status === 'APPROVED' ? l.createdAt : '-');
              const approver = lastStep && lastStep.action !== 'SUBMITTED' ? lastStep.actorName : (l.approver || '-');
              const notes = lastStep ? lastStep.notes : '-';

              let statusBg = l.status === 'APPROVED' ? '#D1FAE5' : l.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = l.status === 'APPROVED' ? '#065F46' : l.status === 'REJECTED' ? '#991B1B' : '#92400E';

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${l.id}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${l.createdAt || '-'}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${l.nika || '-'}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${l.employeeName}</td>
                  <td style="border: 1px solid #CBD5E1;">${l.department || l.role}</td>
                  <td style="border: 1px solid #CBD5E1;">${l.leaveType || l.type}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${l.startDate}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${l.endDate}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${l.duration} Hari</td>
                  <td style="border: 1px solid #CBD5E1;">${l.reason || '-'}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${l.attachmentUrl ? 'Ada Lampiran' : 'Tidak Ada'}</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${l.status}</td>
                  <td style="border: 1px solid #CBD5E1; text-align: center;">${l.stage}</td>
                  <td style="text-align: center; font-weight: bold; color: #059669; border: 1px solid #CBD5E1;">${approvalTime}</td>
                  <td style="border: 1px solid #CBD5E1;">${approver}</td>
                  <td style="border: 1px solid #CBD5E1;">${notes}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
    // 3. EXPORT KHUSUS PENGADAAN BARANG (PR)
    else if (category === 'PR') {
      categoryTitle = 'PENGADAAN BARANG & PEMBELIAN (PR)';
      filenameSuffix = 'Pengadaan_PR';
      const filteredPRs = prs.filter(p => isDateInRange(p.createdAt) && isStatusMatch(p.status));

      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #B45309; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px;">No</th>
              <th style="padding: 10px;">ID PR</th>
              <th style="padding: 10px;">Tgl Pengajuan</th>
              <th style="padding: 10px;">NIKA</th>
              <th style="padding: 10px;">Nama Pemohon</th>
              <th style="padding: 10px;">Divisi / Jabatan</th>
              <th style="padding: 10px;">Kategori Pengadaan</th>
              <th style="padding: 10px;">Nama Barang / Kebutuhan</th>
              <th style="padding: 10px;">Qty Awal</th>
              <th style="padding: 10px;">Qty Disetujui</th>
              <th style="padding: 10px;">Satuan</th>
              <th style="padding: 10px;">Harga Satuan (Rp)</th>
              <th style="padding: 10px;">Total Estimasi Biaya (Rp)</th>
              <th style="padding: 10px;">Target Kepentingan / Dapur</th>
              <th style="padding: 10px;">Alasan Kebutuhan</th>
              <th style="padding: 10px;">Status PR</th>
              <th style="padding: 10px;">Tahap Terakhir</th>
              <th style="padding: 10px;">Waktu Approval (Tgl & Jam)</th>
              <th style="padding: 10px;">Pejabat Penyetuju (Approver)</th>
              <th style="padding: 10px;">Catatan Penyesuaian & Approval</th>
            </tr>
          </thead>
          <tbody>
            ${filteredPRs.map((p, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              const lastStep = Array.isArray(p.approvalHistory) && p.approvalHistory.length > 0 ? p.approvalHistory[p.approvalHistory.length - 1] : null;
              const approvalTime = lastStep && lastStep.action !== 'SUBMITTED' ? lastStep.timestamp : (p.status === 'COMPLETED' || p.status === 'APPROVED' ? p.createdAt : '-');
              const approver = lastStep && lastStep.action !== 'SUBMITTED' ? lastStep.actorName : (p.approver || '-');
              const notes = lastStep ? lastStep.notes : (p.reason || '-');

              let statusBg = (p.status === 'APPROVED' || p.status === 'COMPLETED') ? '#D1FAE5' : p.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = (p.status === 'APPROVED' || p.status === 'COMPLETED') ? '#065F46' : p.status === 'REJECTED' ? '#991B1B' : '#92400E';

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${p.id}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${p.createdAt}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${p.nika || '-'}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${p.employeeName}</td>
                  <td style="border: 1px solid #CBD5E1;">${p.department || p.role}</td>
                  <td style="border: 1px solid #CBD5E1;">${p.category}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${p.itemName}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${p.originalQuantity || p.quantity}</td>
                  <td style="text-align: center; font-weight: bold; color: #047857; border: 1px solid #CBD5E1;">${p.quantity}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${p.unit || 'Unit'}</td>
                  <td style="text-align: right; border: 1px solid #CBD5E1;">Rp ${Number(p.unitPrice || 0).toLocaleString('id-ID')}</td>
                  <td style="text-align: right; font-weight: bold; color: #B45309; border: 1px solid #CBD5E1;">Rp ${Number(p.totalPrice || 0).toLocaleString('id-ID')}</td>
                  <td style="border: 1px solid #CBD5E1;">${p.targetKitchen || 'Kantor / Operasional'}</td>
                  <td style="border: 1px solid #CBD5E1;">${p.reason || '-'}</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${p.status}</td>
                  <td style="border: 1px solid #CBD5E1; text-align: center;">${p.stage}</td>
                  <td style="text-align: center; font-weight: bold; color: #059669; border: 1px solid #CBD5E1;">${approvalTime}</td>
                  <td style="border: 1px solid #CBD5E1;">${approver}</td>
                  <td style="border: 1px solid #CBD5E1;">${notes}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
    // 4. EXPORT KHUSUS CASH ADVANCE (KASBON)
    else if (category === 'CA') {
      categoryTitle = 'CASH ADVANCE & LPJ KASBON';
      filenameSuffix = 'Cash_Advance';
      const filteredCAs = cas.filter(c => isDateInRange(c.createdAt) && isStatusMatch(c.status));

      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #065F46; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px;">No</th>
              <th style="padding: 10px;">ID Kasbon</th>
              <th style="padding: 10px;">Tgl Pengajuan</th>
              <th style="padding: 10px;">NIKA</th>
              <th style="padding: 10px;">Nama Pemohon</th>
              <th style="padding: 10px;">Divisi / Jabatan</th>
              <th style="padding: 10px;">Nominal Pengajuan (Rp)</th>
              <th style="padding: 10px;">Bank Pencairan</th>
              <th style="padding: 10px;">No. Rekening</th>
              <th style="padding: 10px;">Rekening a.n</th>
              <th style="padding: 10px;">Target Penggunaan</th>
              <th style="padding: 10px;">Uraian Keperluan</th>
              <th style="padding: 10px;">Tgl Pencairan FAT</th>
              <th style="padding: 10px;">Realisasi Belanja LPJ (Rp)</th>
              <th style="padding: 10px;">Sisa / Pengembalian (Rp)</th>
              <th style="padding: 10px;">Status Kasbon & LPJ</th>
              <th style="padding: 10px;">Waktu Approval Direktur (Tgl & Jam)</th>
              <th style="padding: 10px;">Pejabat Penyetuju (Direksi)</th>
              <th style="padding: 10px;">Catatan Verifikasi FAT</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCAs.map((c, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              const s = c.settlement || {};
              const lastStep = Array.isArray(c.approvalHistory) && c.approvalHistory.length > 0 ? c.approvalHistory[c.approvalHistory.length - 1] : null;
              const approvalTime = lastStep && lastStep.action !== 'SUBMITTED' ? lastStep.timestamp : (c.disbursedAt || c.createdAt || '-');

              let statusBg = (c.status === 'APPROVED' || c.status === 'COMPLETED' || c.status === 'SETTLED') ? '#D1FAE5' : c.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = (c.status === 'APPROVED' || c.status === 'COMPLETED' || c.status === 'SETTLED') ? '#065F46' : c.status === 'REJECTED' ? '#991B1B' : '#92400E';

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${c.id}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${c.createdAt}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${c.nika || '-'}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${c.employeeName}</td>
                  <td style="border: 1px solid #CBD5E1;">${c.department || c.role}</td>
                  <td style="text-align: right; font-weight: bold; color: #047857; border: 1px solid #CBD5E1;">Rp ${Number(c.amount || c.amountRequested || 0).toLocaleString('id-ID')}</td>
                  <td style="border: 1px solid #CBD5E1;">${c.bankName || '-'}</td>
                  <td style="border: 1px solid #CBD5E1;">${c.bankAccountNo || '-'}</td>
                  <td style="border: 1px solid #CBD5E1;">${c.bankAccountName || c.employeeName}</td>
                  <td style="border: 1px solid #CBD5E1;">${c.targetLocation || c.targetExpense || 'Operasional'}</td>
                  <td style="border: 1px solid #CBD5E1;">${c.title || c.reason || '-'}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${c.disbursedAt || '-'}</td>
                  <td style="text-align: right; border: 1px solid #CBD5E1;">Rp ${Number(s.totalSpent || 0).toLocaleString('id-ID')}</td>
                  <td style="text-align: right; border: 1px solid #CBD5E1;">Rp ${Number(s.refundAmount || 0).toLocaleString('id-ID')}</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${c.status} (${c.stage})</td>
                  <td style="text-align: center; font-weight: bold; color: #059669; border: 1px solid #CBD5E1;">${approvalTime}</td>
                  <td style="border: 1px solid #CBD5E1;">${c.approvedByDirectorName || 'Direktur Keuangan / Ops'}</td>
                  <td style="border: 1px solid #CBD5E1;">${s.verificationNotes || '-'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }
    // 5. EXPORT KONSOLIDASI SEMUA PENGAJUAN
    else {
      categoryTitle = 'SELURUH DATA PENGAJUAN OPERASIONAL & KEUANGAN';
      filenameSuffix = 'Semua_Pengajuan_Master';
      
      const allHistory = this.getMyApprovalHistory(user);
      const filteredHistory = allHistory.filter(h => isDateInRange(h.date) && isStatusMatch(h.status));

      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #0F172A; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px;">No</th>
              <th style="padding: 10px;">Kategori Modul</th>
              <th style="padding: 10px;">ID Pengajuan</th>
              <th style="padding: 10px;">Tgl Pengajuan</th>
              <th style="padding: 10px;">Nama Pemohon</th>
              <th style="padding: 10px;">Divisi / Jabatan</th>
              <th style="padding: 10px;">Rincian / Kebutuhan Pengajuan</th>
              <th style="padding: 10px;">Keterangan / Alasan</th>
              <th style="padding: 10px;">Status Terkini</th>
              <th style="padding: 10px;">Tahap Alur</th>
              <th style="padding: 10px;">Waktu Approval (Tgl & Jam)</th>
              <th style="padding: 10px;">Pejabat Penyetuju (Approver)</th>
              <th style="padding: 10px;">Catatan Keputusan</th>
            </tr>
          </thead>
          <tbody>
            ${filteredHistory.map((h, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              let statusBg = (h.status === 'APPROVED' || h.status === 'COMPLETED' || h.status === 'SETTLED') ? '#D1FAE5' : h.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = (h.status === 'APPROVED' || h.status === 'COMPLETED' || h.status === 'SETTLED') ? '#065F46' : h.status === 'REJECTED' ? '#991B1B' : '#92400E';

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${h.type}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${h.id}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${h.date}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${h.employeeName}</td>
                  <td style="border: 1px solid #CBD5E1;">${h.department}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${h.title}</td>
                  <td style="border: 1px solid #CBD5E1;">${h.summary}</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${h.status}</td>
                  <td style="border: 1px solid #CBD5E1; text-align: center;">${h.stage}</td>
                  <td style="text-align: center; font-weight: bold; color: #059669; border: 1px solid #CBD5E1;">${h.decisionTimestamp}</td>
                  <td style="border: 1px solid #CBD5E1;">${h.approverName || user.name}</td>
                  <td style="border: 1px solid #CBD5E1;">${h.notes}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // Bangun Dokumen Lengkap HTML XML Spreadsheet
    const fullHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>${filenameSuffix}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; }
          .header-title { font-size: 16pt; font-weight: bold; color: #0F172A; }
          .header-subtitle { font-size: 11pt; color: #475569; }
          .meta-label { font-size: 9.5pt; font-weight: bold; color: #334155; }
          .meta-value { font-size: 9.5pt; color: #0F172A; }
        </style>
      </head>
      <body style="padding: 20px;">
        <table border="0" style="margin-bottom: 20px;">
          <tr>
            <td colspan="4" class="header-title">YAYASAN MERAH PUTIH SEJAHTERA (ERP MMS V3)</td>
          </tr>
          <tr>
            <td colspan="4" class="header-subtitle">LAPORAN REKAPITULASI RESMI: ${categoryTitle}</td>
          </tr>
          <tr><td colspan="4" style="height: 10px;"></td></tr>
          <tr>
            <td class="meta-label" style="width: 150px;">Tanggal & Waktu Export:</td>
            <td class="meta-value">${exportTimeStr}</td>
            <td class="meta-label" style="width: 130px;">Diexport Oleh:</td>
            <td class="meta-value">${user.name} (${user.roleLabel})</td>
          </tr>
          <tr>
            <td class="meta-label">Filter Status:</td>
            <td class="meta-value">${statusFilter === 'ALL' ? 'Semua Status' : statusFilter}</td>
            <td class="meta-label">Periode Tanggal:</td>
            <td class="meta-value">${startDate || 'Awal'} s/d ${endDate || 'Sekarang'}</td>
          </tr>
        </table>
        
        ${tableHtml}
      </body>
      </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Laporan_ERP_MMS_${filenameSuffix}_${now.toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    App.closeModal('modal-export-approval-excel');
    App.showToast(`✓ Laporan Excel (${filenameSuffix}) berhasil diunduh!`, 'success');
  }
};


