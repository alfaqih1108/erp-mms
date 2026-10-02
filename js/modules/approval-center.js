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
  activeFilter: 'ALL',   // 'ALL', 'LEAVE', 'PR', 'CA', 'REIMBURSE', 'ORDER'
  sortBy: 'DATE_DESC',   // 'DATE_DESC', 'DATE_ASC', 'AMOUNT_DESC', 'AMOUNT_ASC', 'NAME_ASC', 'NAME_DESC'
  searchQuery: '',       // Search text query
  filterDept: 'ALL',     // 'ALL' or specific department
  filterKitchen: 'ALL',  // 'ALL' or specific kitchen
  filterDateRange: 'ALL',// 'ALL', 'TODAY', '7_DAYS', 'THIS_MONTH', 'LAST_MONTH'
  filterDecision: 'ALL', // 'ALL', 'APPROVED', 'ADJUSTED', 'REJECTED', 'FAILED' (History only)

  // Helper: Format tanggal & jam ke format representasi Indonesia (WIB)
  formatDisplayDateTime: function(str) {
    if (!str || str === '-' || str === 'undefined' || str === 'null') return '-';
    
    if (str instanceof Date) {
      if (isNaN(str.getTime())) return '-';
      const d = str.getDate();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      return `${d} ${months[str.getMonth()]} ${str.getFullYear()}, ${String(str.getHours()).padStart(2, '0')}:${String(str.getMinutes()).padStart(2, '0')} WIB`;
    }

    if (typeof str !== 'string') {
      try {
        str = String(str);
      } catch (e) {
        return '-';
      }
    }
    str = str.trim();

    // Format tanggal murni YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const parts = str.split('-');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const mIdx = parseInt(parts[1], 10) - 1;
      return `${parseInt(parts[2], 10)} ${months[mIdx] || parts[1]} ${parts[0]}`;
    }

    // Format ISO / SQL Datetime
    let dt;
    if (str.includes(' ') && !str.includes('T')) {
      dt = new Date(str.replace(' ', 'T'));
    } else {
      dt = new Date(str);
    }

    if (isNaN(dt.getTime())) return str;

    const d = dt.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthName = months[dt.getMonth()];
    const y = dt.getFullYear();
    const hh = String(dt.getHours()).padStart(2, '0');
    const mm = String(dt.getMinutes()).padStart(2, '0');

    return `${d} ${monthName} ${y}, ${hh}:${mm} WIB`;
  },

  // Helper: Dapatkan angka epoch timestamp untuk sorting dan filter rentang waktu akurat
  getTimestampNumber: function(str) {
    if (!str || str === '-' || str === 'undefined' || str === 'null') return 0;
    if (str instanceof Date) {
      return isNaN(str.getTime()) ? 0 : str.getTime();
    }
    if (typeof str === 'number') return str;
    if (typeof str !== 'string') {
      try { str = String(str); } catch (e) { return 0; }
    }
    str = str.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      const dt = new Date(str + 'T00:00:00');
      return isNaN(dt.getTime()) ? 0 : dt.getTime();
    }
    let dt;
    if (str.includes(' ') && !str.includes('T')) {
      dt = new Date(str.replace(' ', 'T'));
    } else {
      dt = new Date(str);
    }
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  },

  // Helper: Pengecekan filter rentang waktu
  isDateInSelectedRange: function(dateStr, range) {
    if (!range || range === 'ALL') return true;
    const ts = this.getTimestampNumber(dateStr);
    if (!ts) return false;
    
    const itemDate = new Date(ts);
    const now = new Date();
    
    if (range === 'TODAY') {
      return itemDate.getFullYear() === now.getFullYear() &&
             itemDate.getMonth() === now.getMonth() &&
             itemDate.getDate() === now.getDate();
    }
    if (range === '7_DAYS') {
      const diffMs = now.getTime() - ts;
      return diffMs >= 0 && diffMs <= 7 * 24 * 60 * 60 * 1000;
    }
    if (range === 'THIS_MONTH') {
      return itemDate.getFullYear() === now.getFullYear() &&
             itemDate.getMonth() === now.getMonth();
    }
    if (range === 'LAST_MONTH') {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return itemDate.getFullYear() === lastMonth.getFullYear() &&
             itemDate.getMonth() === lastMonth.getMonth();
    }
    return true;
  },

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

  setSortBy: function(val) {
    this.sortBy = val;
    this.renderList();
  },

  handleSearch: function(val) {
    this.searchQuery = val || '';
    this.renderList();
  },

  clearSearch: function() {
    this.searchQuery = '';
    const searchInput = document.getElementById('approval-search-input');
    if (searchInput) searchInput.value = '';
    this.render(document.getElementById('main-content-area'));
  },

  setFilterDept: function(val) {
    this.filterDept = val;
    this.renderList();
  },

  setFilterKitchen: function(val) {
    this.filterKitchen = val;
    this.renderList();
  },

  setFilterDateRange: function(val) {
    this.filterDateRange = val;
    this.renderList();
  },

  setFilterDecision: function(val) {
    this.filterDecision = val;
    this.renderList();
  },

  resetFilters: function() {
    this.searchQuery = '';
    this.sortBy = 'DATE_DESC';
    this.filterDept = 'ALL';
    this.filterKitchen = 'ALL';
    this.filterDateRange = 'ALL';
    this.filterDecision = 'ALL';
    this.render(document.getElementById('main-content-area'));
    if (window.App && App.showToast) {
      App.showToast('Filter dan pengurutan telah direset ke default.', 'info');
    }
  },

  // Mengumpulkan seluruh riwayat pengajuan yang telah diapprove / diproses secara spesifik oleh user aktif
  getMyApprovalHistory: function(user) {
    if (!user) return [];

    const leaves = DB.getLeaves() || [];
    const prs = DB.getItemRequests() || [];
    const cas = DB.getCashAdvances() || [];
    const rmbs = DB.getReimbursements() || [];

    const history = [];

    // Helper untuk memastikan riwayat selalu bertipe array
    const toArray = (h) => {
      if (Array.isArray(h)) return h;
      if (typeof h === 'string') {
        try {
          const parsed = JSON.parse(h);
          return Array.isArray(parsed) ? parsed : (parsed && typeof parsed === 'object' ? [parsed] : []);
        } catch (e) {
          return [];
        }
      }
      if (h && typeof h === 'object') return [h];
      return [];
    };

    // Helper pengecekan: hanya step yang dieksekusi / diapprove oleh akun user saat ini
    const isUserApprovalActor = (h) => {
      if (!h) return false;
      // Kecualikan pembuatan/pengajuan awal dari pemohon
      if (['SUBMITTED', 'PENDING', 'DRAFT', 'RECORDED'].includes(h.action)) return false;

      const actorName = (h.actorName || '').toLowerCase().trim();
      const currentName = (user.name || '').toLowerCase().trim();
      const actorId = (h.actorId || '').toLowerCase().trim();
      const currentId = (user.id || '').toLowerCase().trim();
      const actorRole = (h.actorRole || '').toLowerCase().trim();

      if (currentId && actorId && currentId === actorId) return true;
      if (actorName && currentName && (actorName.includes(currentName) || currentName.includes(actorName))) return true;

      // Pencocokan hierarki wewenang jabatan approver
      if (user.role === 'DIREKTUR_OPERASIONAL') {
        if (actorRole.includes('operasional') || actorName.includes('operasional') || actorName.includes('alfaqih') || h.stage === 'DIRECTOR_APPROVAL' || h.stage === 'DIR_OPS_OR_KEU_REVIEW') return true;
      } else if (user.role === 'DIREKTUR_KEUANGAN') {
        if (actorRole.includes('keuangan') || actorName.includes('keuangan') || actorName.includes('hafidz') || h.stage === 'DIR_KEU_REVIEW') return true;
      } else if (user.role === 'HUMAN_CAPITAL') {
        if (actorRole.includes('human capital') || actorName.includes('tazkia') || h.stage === 'HC_REVIEW' || h.stage === 'HC_FINAL') return true;
      } else if (user.role === 'FAT_OFFICER') {
        if (actorRole.includes('fat') || actorName.includes('imam') || h.stage === 'FAT_DISBURSEMENT' || h.stage === 'SETTLEMENT_SUBMITTED' || h.stage === 'SETTLEMENT_VERIFICATION') return true;
      } else if (user.role === 'STAFF_AHLI_KEUANGAN') {
        if (actorRole.includes('ahli keuangan') || actorName.includes('nurhaliza') || h.stage === 'FINANCE_VERIFICATION') return true;
      } else if (user.role === 'MANAGER_AREA') {
        if (actorRole.includes('manager area') || actorName.includes('rendy') || h.stage === 'MANAGER_APPROVAL' || h.stage === 'MANAGER_AREA_REVIEW') return true;
      } else if (user.role === 'SUPER_ADMIN' || user.role === 'DIREKTUR_UTAMA') {
        return true;
      }

      return false;
    };

    // 1. LEAVES (CUTI & IZIN)
    leaves.forEach(l => {
      const histArr = toArray(l.approvalHistory);
      const userStep = histArr.slice().reverse().find(isUserApprovalActor);

      const isDirector = (user.role === 'DIREKTUR_OPERASIONAL' || user.role === 'DIREKTUR_KEUANGAN' || user.role === 'SUPER_ADMIN' || user.role === 'DIREKTUR_UTAMA');
      const isHC = (user.role === 'HUMAN_CAPITAL');
      const isMgr = (user.role === 'MANAGER_AREA' && (l.role === 'SURVEYOR' || l.role === 'PERWAKILAN_YAYASAN' || l.role === 'STAFF_OPERASIONAL' || l.role === 'MAKER_YAYASAN'));
      const isDone = (l.status === 'APPROVED' || l.status === 'COMPLETED' || l.status === 'REJECTED');

      if (userStep || (isDone && (isDirector || isHC || isMgr))) {
        const decisionStep = userStep || (histArr.length > 0 ? histArr[histArr.length - 1] : null);
        const timestamp = decisionStep ? decisionStep.timestamp : (l.updatedAt || l.createdAt || '-');
        const action = decisionStep ? decisionStep.action : l.status;
        history.push({
          type: 'LEAVE',
          id: l.id,
          date: l.createdAt || l.startDate,
          employeeName: l.employeeName,
          department: l.department || l.role,
          title: `${l.employeeName} — ${l.leaveType || l.type} (${l.duration} Hari)`,
          summary: `Periode: ${l.startDate} s/d ${l.endDate} · Alasan: "${l.reason || '-'}"`,
          stage: l.stage,
          status: l.status,
          decision: action,
          decisionTimestamp: timestamp,
          approverName: decisionStep ? decisionStep.actorName : user.name,
          notes: decisionStep ? decisionStep.notes : (l.status === 'APPROVED' ? 'Disetujui penuh & kuota dipotong' : (l.rejectionReason || 'Ditolak')),
          raw: l
        });
      }
    });

    // 2. PURCHASE REQUESTS (PR)
    prs.forEach(p => {
      const histArr = toArray(p.approvalHistory);
      const userStep = histArr.slice().reverse().find(isUserApprovalActor);

      const userAdj = Array.isArray(p.adjustments) ? p.adjustments.find(a => 
        a.adjustedBy && (a.adjustedBy.toLowerCase().includes(user.name.toLowerCase()) || user.name.toLowerCase().includes(a.adjustedBy.toLowerCase()))
      ) : null;

      const isDirector = (user.role === 'DIREKTUR_OPERASIONAL' || user.role === 'DIREKTUR_KEUANGAN' || user.role === 'SUPER_ADMIN' || user.role === 'DIREKTUR_UTAMA');
      const isFinStaff = (user.role === 'STAFF_AHLI_KEUANGAN');
      const isMgr = (user.role === 'MANAGER_AREA');
      const isDone = (p.status === 'APPROVED' || p.stage === 'COMPLETED' || p.status === 'REJECTED');

      if (userStep || userAdj || (isDone && (isDirector || isFinStaff || isMgr))) {
        const decisionStep = userStep || (histArr.length > 0 ? histArr[histArr.length - 1] : null);
        const timestamp = decisionStep ? decisionStep.timestamp : (p.updatedAt || p.createdAt || '-');
        const action = decisionStep ? decisionStep.action : p.status;

        const isFailedDelivery = (p.orderStatus === 'GAGAL_PENGIRIMAN');
        let failureNote = '';
        if (isFailedDelivery) {
          const trackHist = Array.isArray(p.orderTrackingHistory) ? p.orderTrackingHistory : [];
          const failedStep = trackHist.slice().reverse().find(t => t.status === 'GAGAL_PENGIRIMAN');
          failureNote = failedStep ? (failedStep.notes || 'Gagal Pengiriman') : 'Gagal Pengiriman dari Supplier';
        }

        history.push({
          type: 'PR',
          id: p.id,
          date: p.createdAt,
          employeeName: p.employeeName,
          department: p.department || p.role,
          title: `${p.itemName} (${p.quantity} ${p.unit || 'Unit'}) — Rp ${(p.totalPrice || 0).toLocaleString('id-ID')}`,
          summary: `Kategori: ${p.category} ${p.targetKitchen ? `· Dapur: ${p.targetKitchen}` : ''} · Alasan: "${p.reason || '-'}"`,
          stage: isFailedDelivery ? 'GAGAL_PENGIRIMAN' : p.stage,
          status: isFailedDelivery ? 'GAGAL_PENGIRIMAN' : p.status,
          decision: isFailedDelivery ? 'GAGAL_PENGIRIMAN' : (p.hasAdjustment ? 'ADJUSTED_APPROVED' : action),
          decisionTimestamp: timestamp,
          approverName: decisionStep ? decisionStep.actorName : user.name,
          notes: isFailedDelivery ? failureNote : (userAdj ? `Disesuaikan (${userAdj.newQty} unit @ Rp ${Number(userAdj.newUnitPrice).toLocaleString('id-ID')})` : (decisionStep ? decisionStep.notes : (p.status === 'APPROVED' ? 'Disetujui Direktur & PO Resmi Diterbitkan' : (p.rejectionReason || '-')))),
          raw: p
        });
      }
    });

    // 3. CASH ADVANCE (CA & LPJ)
    cas.forEach(c => {
      const histArr = toArray(c.approvalHistory);
      const userStep = histArr.slice().reverse().find(isUserApprovalActor);

      const isDirector = (user.role === 'DIREKTUR_OPERASIONAL' || user.role === 'DIREKTUR_KEUANGAN' || user.role === 'SUPER_ADMIN' || user.role === 'DIREKTUR_UTAMA');
      const isFAT = (user.role === 'FAT_OFFICER');
      const isDone = (c.status === 'APPROVED' || c.status === 'DISBURSED' || c.status === 'SETTLED' || c.status === 'SETTLEMENT_PENDING' || c.status === 'REJECTED');

      if (userStep || (isDone && (isDirector || isFAT))) {
        const decisionStep = userStep || (histArr.length > 0 ? histArr[histArr.length - 1] : null);
        const timestamp = decisionStep ? decisionStep.timestamp : (c.disbursedAt || c.updatedAt || c.createdAt || '-');
        const action = decisionStep ? decisionStep.action : (c.status === 'DISBURSED' ? 'DISBURSED' : c.status === 'SETTLED' ? 'SETTLED' : c.status);
        history.push({
          type: 'CA',
          id: c.id,
          date: c.createdAt,
          employeeName: c.employeeName,
          department: c.department || c.role,
          title: `Kasbon: Rp ${(c.amount || c.amountApproved || c.amountRequested || 0).toLocaleString('id-ID')} — ${c.title || c.purpose || 'Kebutuhan Operasional'}`,
          summary: `Target: ${c.targetLocation || c.targetExpense || 'Operasional'} · Rekening: ${c.bankName} ${c.bankAccountNo}`,
          stage: c.stage,
          status: c.status,
          decision: action,
          decisionTimestamp: timestamp,
          approverName: decisionStep ? decisionStep.actorName : user.name,
          notes: decisionStep ? decisionStep.notes : (c.status === 'SETTLED' ? 'Disetujui Direktur & LPJ Tuntas' : c.status === 'DISBURSED' ? 'Dana kasbon telah dicairkan FAT' : 'Disetujui Direktur'),
          raw: c
        });
      }
    });

    // 4. REIMBURSEMENTS (KLAIM BIAYA OPERASIONAL)
    rmbs.forEach(r => {
      const histArr = toArray(r.approvalHistory);
      const userStep = histArr.slice().reverse().find(isUserApprovalActor);

      const isDirector = (user.role === 'DIREKTUR_OPERASIONAL' || user.role === 'DIREKTUR_KEUANGAN' || user.role === 'SUPER_ADMIN' || user.role === 'DIREKTUR_UTAMA');
      const isFAT = (user.role === 'FAT_OFFICER');
      const isFinStaff = (user.role === 'STAFF_AHLI_KEUANGAN');
      const isMgr = (user.role === 'MANAGER_AREA');
      const isDone = (r.status === 'APPROVED' || r.status === 'DISBURSED' || r.status === 'SETTLED' || r.status === 'REJECTED');

      if (userStep || (isDone && (isDirector || isFAT || isFinStaff || isMgr))) {
        const decisionStep = userStep || (histArr.length > 0 ? histArr[histArr.length - 1] : null);
        const timestamp = decisionStep ? decisionStep.timestamp : (r.disbursementDetails ? r.disbursementDetails.disbursedAt : (r.updatedAt || r.createdAt || '-'));
        const action = decisionStep ? decisionStep.action : (r.status === 'SETTLED' ? 'SETTLED' : r.status === 'DISBURSED' ? 'DISBURSED' : r.status);
        history.push({
          type: 'REIMBURSE',
          id: r.id,
          date: r.createdAt,
          employeeName: r.employeeName,
          department: r.department || r.employeeRole,
          title: `Klaim: ${r.itemName} (${r.quantity} Unit) — Rp ${(r.subtotal || 0).toLocaleString('id-ID')}`,
          summary: `Kategori: ${r.category} · Dapur: ${r.targetKitchen} · Tgl Beli: ${r.purchaseDate}`,
          stage: r.stage,
          status: r.status,
          decision: r.hasAdjustment ? 'ADJUSTED_APPROVED' : action,
          decisionTimestamp: timestamp,
          approverName: decisionStep ? decisionStep.actorName : user.name,
          notes: decisionStep ? decisionStep.notes : (r.status === 'SETTLED' ? 'Disetujui Direktur & Pencairan Selesai' : 'Disetujui'),
          raw: r
        });
      }
    });

    // 5. PESANAN PO (SETTLEMENT INVOICE VENDOR FAT)
    prs.forEach(p => {
      if (p.orderDisbursement && (
        user.role === 'FAT_OFFICER' || 
        user.role === 'SUPER_ADMIN' ||
        user.role === 'DIREKTUR_OPERASIONAL' ||
        user.role === 'DIREKTUR_KEUANGAN' ||
        user.role === 'DIREKTUR_UTAMA' ||
        (p.orderDisbursement.disbursedById === user.id) ||
        (p.orderDisbursement.disbursedBy && p.orderDisbursement.disbursedBy.toLowerCase().includes(user.name.toLowerCase()))
      )) {
        history.push({
          type: 'ORDER',
          id: p.id,
          date: p.orderInvoice ? p.orderInvoice.submittedAt : p.createdAt,
          employeeName: p.employeeName,
          department: p.department || p.role,
          title: `Settlement PO: ${p.itemName} (${p.quantity} Unit) — Rp ${(Number(p.totalPrice) || 0).toLocaleString('id-ID')}`,
          summary: `Dapur: ${p.targetKitchen} · Ref Bank: ${p.orderDisbursement.bankRefNo} · Status: Settlement Lunas`,
          stage: 'SETTLEMENT',
          status: 'APPROVED',
          decision: 'SETTLEMENT_COMPLETED',
          decisionTimestamp: p.orderDisbursement.disbursedAt || '-',
          approverName: p.orderDisbursement.disbursedBy || user.name,
          notes: p.orderDisbursement.notes || 'Pembayaran vendor lunas ditransfer',
          raw: p
        });
      }
    });

    return history;
  },

  // Helper: Kumpulkan semua data antrean pending yang relevan dengan user aktif
  getPendingItemsList: function(user) {
    if (!user) return [];

    const leaves = DB.getLeaves() || [];
    const prs = DB.getItemRequests() || [];
    const cas = DB.getCashAdvances() || [];
    const rmbs = DB.getReimbursements() || [];

    let relevantLeaves = [];
    let relevantPrs = [];
    let relevantCAs = [];
    let relevantRmbs = [];
    let relevantOrderInvoices = [];

    // 1. Human Capital
    if (user.role === 'HUMAN_CAPITAL') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && (l.stage === 'HC_REVIEW' || l.stage === 'HC_FINAL'));
    }
    // 2. Direktur Keuangan
    else if (user.role === 'DIREKTUR_KEUANGAN') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && (l.stage === 'DIR_KEU_REVIEW' || l.stage === 'DIR_OPS_OR_KEU_REVIEW'));
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'DIRECTOR_APPROVAL');
      relevantCAs = cas.filter(c => c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW');
      relevantRmbs = rmbs.filter(r => r.status === 'PENDING' && r.stage === 'DIRECTOR_APPROVAL');
    }
    // 3. Direktur Operasional
    else if (user.role === 'DIREKTUR_OPERASIONAL') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && (l.stage === 'DIR_OPS_OR_KEU_REVIEW' || l.stage === 'DIR_KEU_REVIEW'));
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'DIRECTOR_APPROVAL');
      relevantCAs = cas.filter(c => c.status === 'PENDING' && c.stage === 'DIRECTOR_REVIEW');
      relevantRmbs = rmbs.filter(r => r.status === 'PENDING' && r.stage === 'DIRECTOR_APPROVAL');
    }
    // 4. Manager Area
    else if (user.role === 'MANAGER_AREA') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'MANAGER_APPROVAL' && (p.role === 'SURVEYOR' || p.role === 'PERWAKILAN_YAYASAN' || p.role === 'STAFF_OPERASIONAL' || p.role === 'MAKER_YAYASAN'));
      relevantLeaves = leaves.filter(l => l.status === 'PENDING' && l.stage === 'MANAGER_AREA_REVIEW' && (l.role === 'SURVEYOR' || l.role === 'PERWAKILAN_YAYASAN' || l.role === 'STAFF_OPERASIONAL' || l.role === 'MAKER_YAYASAN'));
      relevantRmbs = rmbs.filter(r => r.status === 'PENDING' && r.stage === 'MANAGER_APPROVAL' && r.workflowType === 'FIELD_JALUR_1');
    }
    // 5. Manager Keuangan
    else if (user.role === 'MANAGER_KEUANGAN') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'MANAGER_APPROVAL' && p.role !== 'FAT_OFFICER' && p.role !== 'STAFF_AHLI_KEUANGAN');
    }
    // 6. FAT Officer
    else if (user.role === 'FAT_OFFICER') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'FINANCE_VERIFICATION');
      relevantCAs = cas.filter(c => (c.status === 'PENDING' && (c.stage === 'FINANCE_VERIFICATION' || c.stage === 'FAT_DISBURSEMENT')) || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED'));
      relevantRmbs = rmbs.filter(r => r.status === 'PENDING' && (r.stage === 'FINANCE_VERIFICATION' || r.stage === 'FAT_DISBURSEMENT'));
      relevantOrderInvoices = prs.filter(p => p.orderStatus === 'INVOICE_SUBMITTED');
    }
    // 7. Staff Ahli Keuangan
    else if (user.role === 'STAFF_AHLI_KEUANGAN') {
      relevantPrs = prs.filter(p => p.status === 'PENDING' && p.stage === 'FINANCE_VERIFICATION');
      relevantRmbs = rmbs.filter(r => r.status === 'PENDING' && r.stage === 'FINANCE_VERIFICATION');
      relevantCAs = cas.filter(c => c.status === 'PENDING' && c.stage === 'FINANCE_VERIFICATION');
    }
    // 8. Direktur Utama & Super Admin
    else if (user.role === 'DIREKTUR_UTAMA' || user.role === 'SUPER_ADMIN') {
      relevantLeaves = leaves.filter(l => l.status === 'PENDING');
      relevantPrs = prs.filter(p => p.status === 'PENDING');
      relevantCAs = cas.filter(c => (c.status === 'PENDING' && (c.stage === 'FINANCE_VERIFICATION' || c.stage === 'DIRECTOR_REVIEW' || c.stage === 'FAT_DISBURSEMENT')) || (c.status === 'SETTLEMENT_PENDING' && c.stage === 'SETTLEMENT_SUBMITTED'));
      relevantRmbs = rmbs.filter(r => r.status === 'PENDING');
      relevantOrderInvoices = prs.filter(p => p.orderStatus === 'INVOICE_SUBMITTED');
    }

    const items = [];

    // Normalisasi struktur item antrean
    relevantLeaves.forEach(l => {
      items.push({
        _raw: l,
        _type: 'LEAVE',
        _id: l.id,
        _dateStr: l.createdAt || l.startDate,
        _timestamp: this.getTimestampNumber(l.createdAt || l.startDate),
        _amount: 0,
        _duration: Number(l.duration) || 0,
        _employeeName: l.employeeName || '',
        _department: l.department || l.role || '',
        _targetKitchen: '',
        _stage: l.stage || '',
        _title: `${l.employeeName} — ${l.leaveType || l.type}`,
        _searchKey: `${l.id} ${l.employeeName} ${l.leaveType || l.type} ${l.department || l.role} ${l.reason || ''} ${l.stage || ''}`.toLowerCase()
      });
    });

    relevantPrs.forEach(p => {
      items.push({
        _raw: p,
        _type: 'PR',
        _id: p.id,
        _dateStr: p.createdAt,
        _timestamp: this.getTimestampNumber(p.createdAt),
        _amount: Number(p.totalPrice) || 0,
        _duration: 0,
        _employeeName: p.employeeName || '',
        _department: p.department || p.role || '',
        _targetKitchen: p.targetKitchen || '',
        _stage: p.stage || '',
        _title: `${p.itemName} (${p.quantity} Unit)`,
        _searchKey: `${p.id} ${p.employeeName} ${p.itemName} ${p.category || ''} ${p.department || p.role} ${p.targetKitchen || ''} ${p.reason || ''} ${p.stage || ''}`.toLowerCase()
      });
    });

    relevantCAs.forEach(c => {
      items.push({
        _raw: c,
        _type: 'CA',
        _id: c.id,
        _dateStr: c.createdAt,
        _timestamp: this.getTimestampNumber(c.createdAt),
        _amount: Number(c.amountApproved || c.amountRequested || c.amount) || 0,
        _duration: 0,
        _employeeName: c.employeeName || '',
        _department: c.department || c.role || '',
        _targetKitchen: c.targetLocation || c.targetExpense || '',
        _stage: c.stage || '',
        _title: `${c.title || c.purpose || 'Kasbon Operasional'}`,
        _searchKey: `${c.id} ${c.employeeName} ${c.title || ''} ${c.purpose || ''} ${c.bankName || ''} ${c.department || c.role} ${c.targetLocation || c.targetExpense || ''} ${c.stage || ''}`.toLowerCase()
      });
    });

    relevantRmbs.forEach(r => {
      items.push({
        _raw: r,
        _type: 'REIMBURSE',
        _id: r.id,
        _dateStr: r.createdAt || r.purchaseDate,
        _timestamp: this.getTimestampNumber(r.createdAt || r.purchaseDate),
        _amount: Number(r.subtotal) || 0,
        _duration: 0,
        _employeeName: r.employeeName || '',
        _department: r.department || r.employeeRole || r.role || '',
        _targetKitchen: r.targetKitchen || '',
        _stage: r.stage || '',
        _title: `${r.itemName} (${r.quantity} Unit)`,
        _searchKey: `${r.id} ${r.employeeName} ${r.itemName} ${r.category || ''} ${r.department || r.employeeRole || r.role} ${r.targetKitchen || ''} ${r.stage || ''}`.toLowerCase()
      });
    });

    relevantOrderInvoices.forEach(p => {
      items.push({
        _raw: p,
        _type: 'ORDER',
        _id: p.id,
        _dateStr: p.orderInvoice?.submittedAt || p.createdAt,
        _timestamp: this.getTimestampNumber(p.orderInvoice?.submittedAt || p.createdAt),
        _amount: Number(p.totalPrice) || 0,
        _duration: 0,
        _employeeName: p.employeeName || '',
        _department: p.department || p.role || '',
        _targetKitchen: p.targetKitchen || '',
        _stage: 'SETTLEMENT',
        _title: `Invoice: ${p.itemName}`,
        _searchKey: `${p.id} ${p.employeeName} ${p.itemName} ${p.orderInvoice?.submittedBy || ''} ${p.orderInvoice?.fileName || ''} ${p.targetKitchen || ''}`.toLowerCase()
      });
    });

    return items;
  },

  // Helper: Kumpulkan semua data riwayat approval dalam bentuk ternormalisasi
  getNormalizedHistoryList: function(user) {
    const rawHistory = this.getMyApprovalHistory(user);
    return rawHistory.map(h => ({
      _raw: h.raw,
      _history: h,
      _type: h.type,
      _id: h.id,
      _dateStr: h.decisionTimestamp || h.date,
      _timestamp: this.getTimestampNumber(h.decisionTimestamp || h.date),
      _amount: (function() {
        if (h.type === 'PR' || h.type === 'ORDER') return Number(h.raw?.totalPrice) || 0;
        if (h.type === 'CA') return Number(h.raw?.amountApproved || h.raw?.amountRequested || h.raw?.amount) || 0;
        if (h.type === 'REIMBURSE') return Number(h.raw?.subtotal) || 0;
        return 0;
      })(),
      _employeeName: h.employeeName || '',
      _department: h.department || '',
      _targetKitchen: (function() {
        if (h.raw?.targetKitchen) return h.raw.targetKitchen;
        if (h.raw?.targetLocation) return h.raw.targetLocation;
        return '';
      })(),
      _stage: h.stage || '',
      _decision: h.decision || h.status || '',
      _title: h.title,
      _searchKey: `${h.id} ${h.employeeName} ${h.title} ${h.summary || ''} ${h.department || ''} ${h.notes || ''} ${h.approverName || ''} ${h.stage || ''} ${h.decision || ''}`.toLowerCase()
    }));
  },

  // Ekstraksi daftar opsi unik (Departemen & Dapur) untuk dropdown filter
  getUniqueOptions: function(items) {
    const depts = new Set();
    const kitchens = new Set();
    (items || []).forEach(item => {
      if (item._department && item._department !== '-' && item._department !== 'undefined') {
        depts.add(item._department);
      }
      if (item._targetKitchen && item._targetKitchen !== '-' && item._targetKitchen !== 'undefined' && item._targetKitchen !== 'Operasional') {
        kitchens.add(item._targetKitchen);
      }
    });
    return {
      departments: Array.from(depts).sort(),
      kitchens: Array.from(kitchens).sort()
    };
  },

  // Universal Filter & Sort Engine
  applyFilterAndSort: function(items, isHistory = false) {
    let result = (items || []).slice();

    // 1. Filter Sub-Pill Jenis Pengajuan
    if (this.activeFilter !== 'ALL') {
      result = result.filter(item => item._type === this.activeFilter);
    }

    // 2. Filter Keyword Search
    if (this.searchQuery && this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase().trim();
      result = result.filter(item => item._searchKey.includes(q));
    }

    // 3. Filter Departemen
    if (this.filterDept && this.filterDept !== 'ALL') {
      result = result.filter(item => item._department === this.filterDept);
    }

    // 4. Filter Dapur
    if (this.filterKitchen && this.filterKitchen !== 'ALL') {
      result = result.filter(item => item._targetKitchen === this.filterKitchen);
    }

    // 5. Filter Rentang Waktu
    if (this.filterDateRange && this.filterDateRange !== 'ALL') {
      result = result.filter(item => this.isDateInSelectedRange(item._dateStr, this.filterDateRange));
    }

    // 6. Filter Keputusan (Khusus History)
    if (isHistory && this.filterDecision && this.filterDecision !== 'ALL') {
      result = result.filter(item => {
        const dec = item._decision;
        const isFailed = (dec === 'GAGAL_PENGIRIMAN' || item._raw?.orderStatus === 'GAGAL_PENGIRIMAN');
        const isAdjusted = (!isFailed && (dec === 'ADJUSTED_APPROVED' || item._raw?.hasAdjustment));
        const isRejected = (!isFailed && (dec === 'REJECTED' || item._raw?.status === 'REJECTED'));
        const isApproved = (!isFailed && !isRejected && !isAdjusted);

        if (this.filterDecision === 'APPROVED') return isApproved;
        if (this.filterDecision === 'ADJUSTED') return isAdjusted;
        if (this.filterDecision === 'REJECTED') return isRejected;
        if (this.filterDecision === 'FAILED') return isFailed;
        return true;
      });
    }

    // 7. Pengurutan (Sort By)
    result.sort((a, b) => {
      if (this.sortBy === 'DATE_DESC') {
        return (b._timestamp || 0) - (a._timestamp || 0);
      }
      if (this.sortBy === 'DATE_ASC') {
        return (a._timestamp || 0) - (b._timestamp || 0);
      }
      if (this.sortBy === 'AMOUNT_DESC') {
        return (b._amount || 0) - (a._amount || 0);
      }
      if (this.sortBy === 'AMOUNT_ASC') {
        return (a._amount || 0) - (b._amount || 0);
      }
      if (this.sortBy === 'NAME_ASC') {
        return (a._employeeName || '').localeCompare(b._employeeName || '');
      }
      if (this.sortBy === 'NAME_DESC') {
        return (b._employeeName || '').localeCompare(a._employeeName || '');
      }
      return 0;
    });

    return result;
  },

  // =========================================================================
  // CARD RENDERERS (Clean Indonesian Datetime & Action Handlers)
  // =========================================================================

  renderPendingLeaveCard: function(l) {
    const formattedDate = this.formatDisplayDateTime(l.createdAt || l.startDate);
    const stageLabel = l.stage === 'DIR_KEU_REVIEW' ? 'Review Direktur Keuangan' 
      : l.stage === 'DIR_OPS_OR_KEU_REVIEW' ? 'Review Direktur Ops/Keu' 
      : l.stage === 'MANAGER_AREA_REVIEW' ? 'Review Manager Area' 
      : 'Verifikasi Final HC';

    return `
      <div class="nalar-card aura-box-violet" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #8B5CF6; margin-bottom: 0;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); display: flex; align-items: center; justify-content: center; color: #A78BFA; flex-shrink: 0;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="text-mono-badge" style="color: #A78BFA;">CUTI / IZIN · ${l.id}</span>
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${formattedDate}</span>
              <span style="font-size: 10px; color: #C4B5FD; background: rgba(139,92,246,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                Tahap: ${stageLabel}
              </span>
            </div>

            <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 600;">
              ${l.employeeName} — <span style="color: #A78BFA;">${l.leaveType || l.type}</span> (${l.duration} Hari)
            </h4>

            <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 4px;">
              Periode: <strong>${this.formatDisplayDateTime(l.startDate)}</strong> s/d <strong>${this.formatDisplayDateTime(l.endDate)}</strong> · Departemen: <strong>${l.department || l.role}</strong>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
              Alasan: "${l.reason || '-'}" · Kontak Darurat: <strong>${l.emergencyContact || '-'}</strong>
            </div>

            ${(l.attachmentUrl || l.attachmentName) ? `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <button type="button" class="btn-preview-link" onclick="CutiModule.openAttachmentModal('${l.id}')" style="color: #A78BFA; background: rgba(139,92,246,0.15); border: 1px solid rgba(139,92,246,0.35); padding: 2px 8px; border-radius: 4px; font-size: 10.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  <span>📎 Lihat Lampiran Surat Dokter ↗</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action Buttons per Stage -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectLeave('${l.id}')">
            ✕ Tolak
          </button>
          <button class="btn-nalar-primary" style="background: #A78BFA; color: #1E1B4B; font-weight: 600;" onclick="ApprovalCenterModule.approveLeave('${l.id}', '${l.stage}')">
            ✓ Setujui Pengajuan
          </button>
        </div>
      </div>
    `;
  },

  renderPendingPRCard: function(p) {
    const formattedDate = this.formatDisplayDateTime(p.createdAt);
    const isManagerStage = (p.stage === 'MANAGER_APPROVAL');
    const isFinanceStage = (p.stage === 'FINANCE_VERIFICATION');
    const isDirectorStage = (p.stage === 'DIRECTOR_APPROVAL');

    const stageName = isManagerStage 
      ? '1. Review Manager Area' 
      : isFinanceStage 
      ? '2. Verifikasi Anggaran FAT Officer' 
      : '3. Otorisasi Direksi (Penerbitan PO)';

    return `
      <div class="nalar-card aura-box-amber" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #F59E0B; margin-bottom: 0;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; align-items: center; justify-content: center; color: #FCD34D; flex-shrink: 0; font-size: 20px;">
            🛒
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="text-mono-badge" style="color: #FCD34D;">PR · ${p.id}</span>
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${formattedDate}</span>
              <span style="font-size: 10px; color: #FDE68A; background: rgba(245,158,11,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                Tahap: ${stageName}
              </span>
            </div>

            <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 600;">
              ${p.itemName} (${p.quantity} Unit) — <span style="font-family: var(--font-mono); color: #FCD34D;">Rp ${(Number(p.totalPrice) || 0).toLocaleString('id-ID')}</span>
            </h4>

            <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 4px;">
              Pemohon: <strong>${p.employeeName}</strong> (${p.role}) · <span style="color: #93C5FD; font-size: 11.5px;">📧 ${p.applicantEmail || p.email || '-'}</span> · Kategori: <strong style="color: #60A5FA;">${p.category}</strong>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
              Target Dapur: <strong>${p.targetKitchen || '-'}</strong> · Alasan: "${p.reason || '-'}"
            </div>

            ${(p.attachmentUrl || p.attachmentName) ? `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <button type="button" class="btn-preview-link" onclick="PengajuanBarangModule.openLightbox('${p.id}', '${p.itemName}')" style="color: #60A5FA; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.35); padding: 2px 8px; border-radius: 4px; font-size: 10.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  <span>📎 Lihat Foto Barang / Estimasi Harga ↗</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action Buttons per Stage -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectPR('${p.id}')">
            ✕ Tolak
          </button>

          ${(isFinanceStage || isDirectorStage) ? `
            <button class="btn-nalar-secondary" style="border-color: rgba(245, 158, 11, 0.5); color: #FCD34D; background: rgba(245, 158, 11, 0.1);" onclick="ApprovalCenterModule.openAdjustPRModal('${p.id}')">
              ✏️ Setujui dgn Penyesuaian
            </button>
          ` : ''}

          ${isManagerStage ? `
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); border-color: #60A5FA; color: #fff; font-weight: 600;" onclick="ApprovalCenterModule.advancePR('${p.id}', '${p.stage}')">
              ✓ Setujui & Teruskan ke FAT Officer
            </button>
          ` : isFinanceStage ? `
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color: #FCD34D; color: #000; font-weight: 700;" onclick="ApprovalCenterModule.advancePR('${p.id}', '${p.stage}')">
              ✓ Verifikasi Sah & Teruskan ke Direksi
            </button>
          ` : `
            <button class="btn-nalar-primary" style="background: #34D399; color: #064E3B; font-weight: 700;" onclick="ApprovalCenterModule.advancePR('${p.id}', '${p.stage}')">
              👑 Otorisasi & Terbitkan PO Resmi
            </button>
          `}
        </div>
      </div>
    `;
  },

  renderPendingCACard: function(c) {
    const formattedDate = this.formatDisplayDateTime(c.createdAt);
    const isFinanceStage = (c.stage === 'FINANCE_VERIFICATION');
    const isDirectorStage = (c.stage === 'DIRECTOR_REVIEW');
    const isDisburseStage = (c.stage === 'FAT_DISBURSEMENT');
    const isSettlementReviewStage = (c.stage === 'SETTLEMENT_SUBMITTED');

    const stageName = isFinanceStage 
      ? '1. Verifikasi Plafon & Justifikasi FAT Officer' 
      : isDirectorStage 
      ? '2. Review & Otorisasi Direksi' 
      : isDisburseStage 
      ? '3. Pencairan Transfer FAT' 
      : '4. Verifikasi LPJ Kasir FAT';

    return `
      <div class="nalar-card aura-box-emerald" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #10B981; margin-bottom: 0;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); display: flex; align-items: center; justify-content: center; color: #34D399; flex-shrink: 0; font-size: 20px;">
            💵
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="text-mono-badge" style="color: #34D399;">KASBON · ${c.id}</span>
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${formattedDate}</span>
              <span style="font-size: 10px; color: #A7F3D0; background: rgba(16,185,129,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                Tahap: ${stageName}
              </span>
            </div>

            <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 600;">
              ${c.title || c.purpose || 'Kasbon Operasional'} — <span style="font-family: var(--font-mono); color: #34D399;">Rp ${(Number(c.amountApproved || c.amountRequested || c.amount) || 0).toLocaleString('id-ID')}</span>
            </h4>

            <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 4px;">
              Pemohon: <strong>${c.employeeName}</strong> (${c.department || c.role}) · <span style="color: #93C5FD; font-size: 11.5px;">📧 ${c.applicantEmail || c.email || '-'}</span> · Target Lokasi: <strong style="color: #FCD34D;">${c.targetLocation || c.targetExpense || 'Operasional'}</strong>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
              💳 Rekening Penerima: <strong>${c.bankName}</strong> (${c.bankAccountNo} a.n ${c.bankAccountName}) · <span style="color: #6EE7B7;">📧 ${c.applicantEmail || c.email || '-'}</span>
            </div>

            ${(c.attachmentUrl || c.attachmentName) ? `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <button type="button" class="btn-preview-link" onclick="CashAdvanceModule.openLightbox('${c.id}')" style="color: #34D399; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35); padding: 2px 8px; border-radius: 4px; font-size: 10.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  <span>📎 Lihat Rincian Kasbon / LPJ ↗</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action Buttons per Stage -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          ${isFinanceStage ? `
            <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectCA('${c.id}')">
              ✕ Tolak
            </button>
            <button class="btn-nalar-secondary" style="border-color: rgba(245, 158, 11, 0.5); color: #FCD34D; background: rgba(245, 158, 11, 0.1);" onclick="ApprovalCenterModule.openAdjustCAModal('${c.id}')">
              ✏️ Setujui dgn Penyesuaian
            </button>
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color: #FCD34D; color: #000; font-weight: 700;" onclick="ApprovalCenterModule.advanceCA('${c.id}', '${c.stage}')">
              ✓ Verifikasi Sah & Teruskan ke Direksi
            </button>
          ` : isDirectorStage ? `
            <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectCA('${c.id}')">
              ✕ Tolak
            </button>
            <button class="btn-nalar-secondary" style="border-color: rgba(245, 158, 11, 0.5); color: #FCD34D; background: rgba(245, 158, 11, 0.1);" onclick="ApprovalCenterModule.openAdjustCAModal('${c.id}')">
              ✏️ Setujui dgn Penyesuaian
            </button>
            <button class="btn-nalar-primary" style="background: #34D399; color: #064E3B; font-weight: 600;" onclick="ApprovalCenterModule.approveCADirector('${c.id}')">
              👑 Otorisasi Kasbon
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
  },

  renderPendingRMBCard: function(r) {
    const formattedDate = this.formatDisplayDateTime(r.createdAt);
    const isManagerStage = (r.stage === 'MANAGER_APPROVAL');
    const isFinanceStage = (r.stage === 'FINANCE_VERIFICATION');
    const isDirectorStage = (r.stage === 'DIRECTOR_APPROVAL');
    const isFATStage = (r.stage === 'FAT_DISBURSEMENT');

    const stageName = isManagerStage 
      ? '1. Review Manager Area' 
      : isFinanceStage 
      ? (r.workflowType === 'FIELD_JALUR_1' ? '2. Verifikasi FAT Officer' : '1. Verifikasi FAT Officer') 
      : isDirectorStage 
      ? (r.workflowType === 'FIELD_JALUR_1' ? '3. Otorisasi Direksi' : '2. Otorisasi Direksi') 
      : (r.workflowType === 'FIELD_JALUR_1' ? '4. Pencairan Dana FAT' : '3. Pencairan Dana FAT');

    return `
      <div class="nalar-card aura-box-emerald" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #10B981; margin-bottom: 0;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); display: flex; align-items: center; justify-content: center; color: #34D399; flex-shrink: 0; font-size: 20px;">
            💸
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="text-mono-badge" style="color: #34D399;">REIMBURSE · ${r.id}</span>
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${formattedDate}</span>
              <span style="font-size: 10px; color: #A7F3D0; background: rgba(16,185,129,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                Tahap: ${stageName}
              </span>
            </div>

            <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 600;">
              ${r.itemName} (${r.quantity} Unit) — <span style="font-family: var(--font-mono); color: #34D399;">Rp ${(Number(r.subtotal) || 0).toLocaleString('id-ID')}</span>
            </h4>

            <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 4px;">
              Pemohon: <strong>${r.employeeName}</strong> (${r.department || r.employeeRole || r.role}) · <span style="color: #93C5FD; font-size: 11.5px;">📧 ${r.applicantEmail || r.email || '-'}</span> · Dapur: <strong style="color: #FCD34D;">${r.targetKitchen || '-'}</strong>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
              💳 Rekening Transfer: <strong>${r.bankName || '-'}</strong> (${r.bankAccountNo || '-'} a.n ${r.bankAccountName || r.employeeName}) · <span style="color: #6EE7B7;">📧 ${r.applicantEmail || r.email || '-'}</span> · Tgl Beli: <strong>${this.formatDisplayDateTime(r.purchaseDate) || '-'}</strong>
            </div>

            ${(r.attachmentUrl || r.attachmentName) ? `
              <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                <button type="button" class="btn-preview-link" onclick="ReimburseModule.previewAttachment('${r.id}')" style="color: #34D399; background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.35); padding: 2px 8px; border-radius: 4px; font-size: 10.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                  <span>📎 Lihat Bukti Struk/Nota Pembelian ↗</span>
                </button>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action Buttons per Stage -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn-nalar-secondary" style="border-color: rgba(248, 113, 113, 0.4); color: #F87171;" onclick="ApprovalCenterModule.rejectReimburse('${r.id}')">
            ✕ Tolak
          </button>
          
          ${(isFinanceStage || isDirectorStage) ? `
            <button class="btn-nalar-secondary" style="border-color: rgba(245, 158, 11, 0.5); color: #FCD34D; background: rgba(245, 158, 11, 0.1);" onclick="ApprovalCenterModule.openAdjustReimburseModal('${r.id}')">
              ✏️ Setujui dgn Penyesuaian
            </button>
          ` : ''}

          ${isManagerStage ? `
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); border-color: #60A5FA; color: #fff; font-weight: 600;" onclick="ApprovalCenterModule.advanceReimburse('${r.id}', '${r.stage}')">
              ✓ Setujui & Teruskan ke FAT Officer
            </button>
          ` : isFinanceStage ? `
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); border-color: #FCD34D; color: #000; font-weight: 700;" onclick="ApprovalCenterModule.advanceReimburse('${r.id}', '${r.stage}')">
              ✓ Verifikasi Sah & Teruskan ke Direksi
            </button>
          ` : isDirectorStage ? `
            <button class="btn-nalar-primary" style="background: #34D399; color: #064E3B; font-weight: 700;" onclick="ApprovalCenterModule.advanceReimburse('${r.id}', '${r.stage}')">
              👑 Otorisasi & Teruskan ke FAT
            </button>
          ` : isFATStage ? `
            <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; font-weight: 700;" onclick="ApprovalCenterModule.openDisburseReimburseModal('${r.id}')">
              💸 Transfer Pembayaran Reimburse
            </button>
          ` : ''}
        </div>
      </div>
    `;
  },

  renderPendingOrderCard: function(p) {
    const formattedDate = this.formatDisplayDateTime(p.orderInvoice?.submittedAt || p.createdAt);

    return `
      <div class="nalar-card aura-box-emerald" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; border-left: 3px solid #3B82F6; margin-bottom: 0;">
        <div style="display: flex; align-items: flex-start; gap: 16px;">
          <div style="width: 44px; height: 44px; border-radius: var(--radius-md); background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); display: flex; align-items: center; justify-content: center; color: #60A5FA; flex-shrink: 0; font-size: 20px;">
            📄
          </div>
          <div>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span class="text-mono-badge" style="color: #60A5FA;">INVOICE PESANAN · ${p.id}</span>
              <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${formattedDate}</span>
              <span style="font-size: 10px; color: #93C5FD; background: rgba(59,130,246,0.2); padding: 1px 6px; border-radius: 4px; font-family: var(--font-mono);">
                Tahap: Settlement Transfer FAT ke Vendor
              </span>
            </div>

            <h4 style="font-size: 16px; color: #fff; margin: 4px 0 2px 0; font-weight: 600;">
              Tagihan Invoice: ${p.itemName} (${p.quantity} Unit) — <span style="font-family: var(--font-mono); color: #34D399;">Rp ${(Number(p.totalPrice) || 0).toLocaleString('id-ID')}</span>
            </h4>

            <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 4px;">
              Pemohon PR: <strong>${p.employeeName}</strong> · 📧 <strong style="color: #93C5FD;">${p.orderInvoice?.recipientEmail || p.applicantEmail || p.email || '-'}</strong> · Lokasi Dapur: <strong style="color: #FCD34D;">${p.targetKitchen || '-'}</strong>
            </div>

            <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 6px;">
              Pengunggah Tagihan: <strong style="color: #CBD5E1;">${p.orderInvoice?.submittedBy || 'Operator Pesanan'}</strong> · Berkas: <strong style="color: #60A5FA;">${p.orderInvoice?.fileName || 'Invoice/Kuitansi'}</strong>
            </div>

            <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
              <button type="button" class="btn-preview-link" onclick="ApprovalCenterModule.previewOrderInvoice('${p.id}')" style="color: #60A5FA; background: rgba(59,130,246,0.15); border: 1px solid rgba(59,130,246,0.35); padding: 2px 8px; border-radius: 4px; font-size: 10.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                <span>📎 Pratinjau Berkas Invoice Vendor ↗</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="btn-nalar-primary" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; font-weight: 700;" onclick="ApprovalCenterModule.openDisburseOrderInvoiceModal('${p.id}')">
            💸 Bayar Vendor & Upload Bukti Transfer (Settlement)
          </button>
        </div>
      </div>
    `;
  },

  renderHistoryCard: function(item, user) {
    if (!item) return '';
    user = user || (window.DB ? DB.getCurrentUser() : null) || {};

    const isLeave = (item.type === 'LEAVE');
    const isTS = (item.type === 'TIMESHEET');
    const isPR = (item.type === 'PR');
    const isCA = (item.type === 'CA');
    const isRMB = (item.type === 'REIMBURSE');

    const themeColor = isLeave ? '#A78BFA' : isTS ? '#60A5FA' : isPR ? '#FCD34D' : isCA ? '#34D399' : '#10B981';
    const typeLabel = isLeave ? 'CUTI / IZIN' : isTS ? 'TIMESHEET' : isPR ? 'PENGADAAN BARANG (PR)' : isCA ? 'CASH ADVANCE (KASBON)' : 'KLAIM REIMBURSEMENT';

    const isFailedDelivery = (item.decision === 'GAGAL_PENGIRIMAN' || item.status === 'GAGAL_PENGIRIMAN' || (item.raw && item.raw.orderStatus === 'GAGAL_PENGIRIMAN'));
    const isApproved = !isFailedDelivery && (item.decision === 'APPROVED' || item.status === 'APPROVED' || item.status === 'COMPLETED' || item.status === 'SETTLED');
    const isRejected = !isFailedDelivery && (item.decision === 'REJECTED' || item.status === 'REJECTED');
    const isAdjusted = !isFailedDelivery && (item.decision === 'ADJUSTED_APPROVED');

    const decisionBadgeBg = isFailedDelivery ? 'rgba(239, 68, 68, 0.18)' : isRejected ? 'rgba(239, 68, 68, 0.15)' : isAdjusted ? 'rgba(245, 158, 11, 0.15)' : 'rgba(52, 211, 153, 0.15)';
    const decisionBadgeColor = isFailedDelivery ? '#F87171' : isRejected ? '#F87171' : isAdjusted ? '#FCD34D' : '#34D399';
    const decisionBadgeBorder = isFailedDelivery ? 'rgba(239, 68, 68, 0.5)' : isRejected ? 'rgba(239, 68, 68, 0.35)' : isAdjusted ? 'rgba(245, 158, 11, 0.35)' : 'rgba(52, 211, 153, 0.35)';
    const decisionText = isFailedDelivery ? '⚠️ Gagal Pengiriman' : isRejected ? '✕ Ditolak' : isAdjusted ? '✏️ Disetujui Dgn Penyesuaian' : '✓ Disetujui / Tervalidasi';

    const formattedDecisionTime = this.formatDisplayDateTime(item.decisionTimestamp);
    const formattedSubmitDate = this.formatDisplayDateTime(item.date);

    const empInitials = ((item.employeeName || 'U').trim().split(/\s+/).map(n => n ? n[0] : '').join('').slice(0, 2) || 'U').toUpperCase();

    return `
      <div class="nalar-card" style="border-left: 3px solid ${isFailedDelivery ? '#EF4444' : themeColor}; padding: 18px 22px; margin-bottom: 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
          
          <!-- Info Utama -->
          <div style="flex: 1; min-width: 280px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px;">
              <span class="text-mono-badge" style="color: ${themeColor}; font-size: 11px;">
                ${typeLabel} · ${item.id || '-'}
              </span>
              
              <!-- Badge Keputusan -->
              <span style="font-size: 11px; font-weight: 700; color: ${decisionBadgeColor}; background: ${decisionBadgeBg}; border: 1px solid ${decisionBadgeBorder}; padding: 2px 8px; border-radius: 4px; font-family: var(--font-mono);">
                ${decisionText}
              </span>

              <!-- Badge Tanggal & Jam Approval -->
              <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: #34D399; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); padding: 2px 10px; border-radius: 4px; font-family: var(--font-mono);">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>Waktu Approval: <strong>${formattedDecisionTime}</strong></span>
              </span>

              ${item.date ? `
                <span style="font-size: 10.5px; color: var(--text-muted); font-family: var(--font-mono);">
                  (Diajukan: ${formattedSubmitDate})
                </span>
              ` : ''}
            </div>

            <div style="display: flex; align-items: center; gap: 8px; margin: 4px 0 6px 0;">
              <div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                ${empInitials}
              </div>
              <h4 style="font-size: 15.5px; color: #fff; font-weight: 600; margin: 0;">
                ${item.title || '-'}
              </h4>
            </div>

            <div style="font-size: 12.5px; color: var(--text-secondary); margin-bottom: 6px;">
              ${item.summary || '-'}
            </div>

            <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
              <span style="background: rgba(255,255,255,0.06); padding: 2px 8px; border-radius: 4px; color: #E2E8F0;">
                👤 Pemohon: <strong style="color: #60A5FA;">${item.employeeName || '-'}</strong> (${item.department || '-'}) · <span style="color: #93C5FD;">📧 ${item.applicantEmail || item.raw?.applicantEmail || item.raw?.email || item.raw?.orderInvoice?.recipientEmail || '-'}</span>
              </span>
              <span>·</span>
              <span>Diproses oleh: <strong style="color: #FCD34D;">${item.approverName || user.name || 'Approver'}</strong></span>
              ${item.notes && item.notes !== '-' ? `
                <span>·</span>
                <span>Catatan: <em style="color: #94A3B8;">"${item.notes}"</em></span>
              ` : ''}
              ${isLeave && item.raw && (item.raw.attachmentName || item.raw.attachmentUrl) ? `
                <span>·</span>
                <button type="button" class="btn-preview-link" style="color: #A78BFA; background: rgba(139, 92, 246, 0.15); border: 1px solid rgba(139, 92, 246, 0.35); padding: 2px 8px; border-radius: 4px; font-size: 10.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="CutiModule.openAttachmentModal('${item.id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                  <span>📎 Lihat Lampiran ↗</span>
                </button>
              ` : ''}
              ${isRMB && item.raw && (item.raw.attachmentUrl || item.raw.attachmentName) ? `
                <span>·</span>
                <button type="button" class="btn-preview-link" style="color: #34D399; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.35); padding: 2px 8px; border-radius: 4px; font-size: 10.5px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;" onclick="ReimburseModule.previewAttachment('${item.id}')">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>Lihat Struk ↗</span>
                </button>
              ` : ''}
            </div>
          </div>

          <!-- Tombol Action Detail Tracker -->
          <div style="display: flex; align-items: center; gap: 8px;">
            <button type="button" class="btn-nalar-secondary" style="padding: 6px 12px; font-size: 11.5px; border-color: rgba(255,255,255,0.15);" onclick="${isRMB ? `ReimburseModule.openDetailModal('${item.id}')` : isCA ? `App.openApprovalTracker('CA', '${item.id}')` : `App.showApprovalTracker('${(item.type || '').toLowerCase()}', '${item.id}')`}">
              🔍 Cek Alur & Rincian
            </button>
          </div>

        </div>
      </div>
    `;
  },

  // =========================================================================
  // MAIN RENDER & DYNAMIC LIST UPDATE
  // =========================================================================

  render: function(container) {
    if (!container) return;

    const user = (window.DB ? DB.getCurrentUser() : null) || {};
    const pendingItems = this.getPendingItemsList(user);
    const historyItems = this.getNormalizedHistoryList(user);

    const totalPending = pendingItems.length;
    const totalHistory = historyItems.length;

    // Hitung count per sub-tipe untuk badge pill
    const countPendingLeaves = pendingItems.filter(i => i._type === 'LEAVE').length;
    const countPendingPrs = pendingItems.filter(i => i._type === 'PR').length;
    const countPendingCAs = pendingItems.filter(i => i._type === 'CA').length;
    const countPendingRmbs = pendingItems.filter(i => i._type === 'REIMBURSE').length;
    const countPendingOrders = pendingItems.filter(i => i._type === 'ORDER').length;

    const countHistoryLeaves = historyItems.filter(i => i._type === 'LEAVE').length;
    const countHistoryPrs = historyItems.filter(i => i._type === 'PR').length;
    const countHistoryCAs = historyItems.filter(i => i._type === 'CA').length;
    const countHistoryRmbs = historyItems.filter(i => i._type === 'REIMBURSE').length;
    const countHistoryOrders = historyItems.filter(i => i._type === 'ORDER').length;

    // Dapatkan data yang aktif untuk tab saat ini
    const currentBaseItems = this.activeTab === 'PENDING' ? pendingItems : historyItems;
    const options = this.getUniqueOptions(currentBaseItems);
    const filteredItems = this.applyFilterAndSort(currentBaseItems, this.activeTab === 'HISTORY');

    const showExportBtn = this.isExportAllowed(user.role);

    // Cek apakah ada filter selain default yang aktif
    const hasActiveFilters = Boolean(
      this.searchQuery ||
      this.sortBy !== 'DATE_DESC' ||
      this.filterDept !== 'ALL' ||
      this.filterKitchen !== 'ALL' ||
      this.filterDateRange !== 'ALL' ||
      (this.activeTab === 'HISTORY' && this.filterDecision !== 'ALL')
    );

    let activeFilterCount = 0;
    if (this.searchQuery) activeFilterCount++;
    if (this.sortBy !== 'DATE_DESC') activeFilterCount++;
    if (this.filterDept !== 'ALL') activeFilterCount++;
    if (this.filterKitchen !== 'ALL') activeFilterCount++;
    if (this.filterDateRange !== 'ALL') activeFilterCount++;
    if (this.activeTab === 'HISTORY' && this.filterDecision !== 'ALL') activeFilterCount++;

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
                  Wewenang Approval: <strong style="color: var(--brand-orange);">${user.name || 'User'}</strong> (${user.roleLabel || user.role || 'Pejabat Approval'})
                </div>
                <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">
                  Sistem secara otomatis menampilkan antrean yang memerlukan keputusan serta rekapitulasi audit log yang sudah Anda setujui.
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

        <!-- Thematic Floating Filter Pills (Semua, Cuti, PR, Kasbon, Reimburse, Invoice) -->
        <div class="approval-filter-bar">
          <button class="approval-filter-pill pill-all ${this.activeFilter === 'ALL' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('ALL')">
            <span class="filter-dot dot-orange"></span>
            <span>Semua Pengajuan</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? totalPending : totalHistory}</span>
          </button>

          <button class="approval-filter-pill pill-leave ${this.activeFilter === 'LEAVE' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('LEAVE')">
            <span class="filter-dot dot-violet"></span>
            <span>Cuti & Izin</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? countPendingLeaves : countHistoryLeaves}</span>
          </button>

          <button class="approval-filter-pill pill-pr ${this.activeFilter === 'PR' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('PR')">
            <span class="filter-dot dot-amber"></span>
            <span>Pengadaan Barang (PR)</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? countPendingPrs : countHistoryPrs}</span>
          </button>

          <button class="approval-filter-pill pill-ca ${this.activeFilter === 'CA' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('CA')">
            <span class="filter-dot dot-emerald"></span>
            <span>Cash Advance (Kasbon)</span>
            <span class="filter-badge">${this.activeTab === 'PENDING' ? countPendingCAs : countHistoryCAs}</span>
          </button>

          <button class="approval-filter-pill pill-rmb ${this.activeFilter === 'REIMBURSE' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('REIMBURSE')" style="${this.activeFilter === 'REIMBURSE' ? 'background: rgba(16, 185, 129, 0.2); border-color: #10B981; color: #34D399;' : ''}">
            <span class="filter-dot" style="background: #10B981;"></span>
            <span>Klaim Reimburse</span>
            <span class="filter-badge" style="background: rgba(16, 185, 129, 0.3); color: #34D399;">${this.activeTab === 'PENDING' ? countPendingRmbs : countHistoryRmbs}</span>
          </button>

          ${(countPendingOrders > 0 || countHistoryOrders > 0 || user.role === 'FAT_OFFICER') ? `
            <button class="approval-filter-pill pill-order ${this.activeFilter === 'ORDER' ? 'active' : ''}" onclick="ApprovalCenterModule.setFilter('ORDER')" style="${this.activeFilter === 'ORDER' ? 'background: rgba(59, 130, 246, 0.2); border-color: #3B82F6; color: #60A5FA;' : ''}">
              <span class="filter-dot" style="background: #3B82F6;"></span>
              <span>Invoice Pesanan (FAT)</span>
              <span class="filter-badge" style="background: rgba(59, 130, 246, 0.3); color: #60A5FA;">${this.activeTab === 'PENDING' ? countPendingOrders : countHistoryOrders}</span>
            </button>
          ` : ''}
        </div>

        <!-- Universal Sort & Filter Control Panel Bar -->
        <div class="nalar-card" style="padding: 16px 20px; background: rgba(22, 22, 26, 0.75); border: 1px solid rgba(255, 255, 255, 0.08); backdrop-filter: blur(12px); border-radius: var(--radius-md); margin-bottom: 22px;">
          <div style="display: flex; flex-direction: column; gap: 14px;">
            
            <!-- Top Row: Live Search Input + Sort By Selector + Reset Button -->
            <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
              
              <!-- Search Input -->
              <div style="position: relative; flex: 1; min-width: 260px;">
                <svg style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none;" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input 
                  type="text" 
                  id="approval-search-input"
                  class="form-control" 
                  placeholder="Cari ID pengajuan, nama pemohon, barang, lokasi dapur, alasan..." 
                  value="${this.searchQuery}" 
                  oninput="ApprovalCenterModule.handleSearch(this.value)"
                  style="padding-left: 40px; padding-right: ${this.searchQuery ? '36px' : '14px'}; background: rgba(0, 0, 0, 0.4); border-color: rgba(255, 255, 255, 0.12); height: 42px; border-radius: 8px; font-size: 13px;"
                />
                ${this.searchQuery ? `
                  <button 
                    type="button" 
                    onclick="ApprovalCenterModule.clearSearch()"
                    style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px; display: flex; align-items: center; justify-content: center; font-size: 14px;"
                    title="Hapus pencarian">✕</button>
                ` : ''}
              </div>

              <!-- Sort By Dropdown -->
              <div style="display: flex; align-items: center; gap: 8px; min-width: 220px;">
                <span style="font-size: 12px; font-weight: 600; color: var(--text-muted); white-space: nowrap; display: flex; align-items: center; gap: 4px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M6 12h12M10 18h4"/></svg>
                  Urutkan:
                </span>
                <select 
                  class="form-control" 
                  onchange="ApprovalCenterModule.setSortBy(this.value)"
                  style="background: rgba(0, 0, 0, 0.4); border-color: rgba(255, 255, 255, 0.12); height: 42px; border-radius: 8px; font-size: 12.5px; font-weight: 500; color: #fff; cursor: pointer;">
                  <option value="DATE_DESC" ${this.sortBy === 'DATE_DESC' ? 'selected' : ''}>⚡ Tanggal Terbaru</option>
                  <option value="DATE_ASC" ${this.sortBy === 'DATE_ASC' ? 'selected' : ''}>⏳ Tanggal Terlama</option>
                  <option value="AMOUNT_DESC" ${this.sortBy === 'AMOUNT_DESC' ? 'selected' : ''}>💰 Nominal Terbesar</option>
                  <option value="AMOUNT_ASC" ${this.sortBy === 'AMOUNT_ASC' ? 'selected' : ''}>💵 Nominal Terkecil</option>
                  <option value="NAME_ASC" ${this.sortBy === 'NAME_ASC' ? 'selected' : ''}>👤 Pemohon (A - Z)</option>
                  <option value="NAME_DESC" ${this.sortBy === 'NAME_DESC' ? 'selected' : ''}>👤 Pemohon (Z - A)</option>
                </select>
              </div>

              <!-- Reset Filter Button (if any filter is active) -->
              ${hasActiveFilters ? `
                <button 
                  type="button" 
                  class="btn-nalar-secondary" 
                  onclick="ApprovalCenterModule.resetFilters()"
                  style="height: 42px; padding: 0 14px; font-size: 12px; border-color: rgba(248, 113, 113, 0.4); color: #FCA5A5; background: rgba(239, 68, 68, 0.08); display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; border-radius: 8px;">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                  <span>Reset Filter</span>
                  <span style="background: rgba(239, 68, 68, 0.25); color: #fff; padding: 1px 6px; border-radius: 10px; font-size: 10px; font-weight: 700;">${activeFilterCount}</span>
                </button>
              ` : ''}

            </div>

            <!-- Bottom Row: Filter Dropdowns (Department, Kitchen, Date Range, Decision Status) -->
            <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.05);">
              
              <span style="font-size: 11.5px; font-weight: 600; color: var(--text-muted); display: flex; align-items: center; gap: 4px; margin-right: 4px;">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                Filter by:
              </span>

              <!-- Department Filter -->
              <select 
                class="form-control" 
                onchange="ApprovalCenterModule.setFilterDept(this.value)"
                style="width: auto; min-width: 150px; background: rgba(0, 0, 0, 0.3); border-color: ${this.filterDept !== 'ALL' ? 'var(--brand-orange)' : 'rgba(255, 255, 255, 0.1)'}; height: 34px; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: ${this.filterDept !== 'ALL' ? '#FDBA74' : 'var(--text-secondary)'};">
                <option value="ALL">🏢 Semua Divisi</option>
                ${options.departments.map(d => `<option value="${d}" ${this.filterDept === d ? 'selected' : ''}>${d}</option>`).join('')}
              </select>

              <!-- Kitchen / Location Filter -->
              ${options.kitchens.length > 0 ? `
                <select 
                  class="form-control" 
                  onchange="ApprovalCenterModule.setFilterKitchen(this.value)"
                  style="width: auto; min-width: 150px; background: rgba(0, 0, 0, 0.3); border-color: ${this.filterKitchen !== 'ALL' ? '#F59E0B' : 'rgba(255, 255, 255, 0.1)'}; height: 34px; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: ${this.filterKitchen !== 'ALL' ? '#FDE68A' : 'var(--text-secondary)'};">
                  <option value="ALL">📍 Semua Lokasi Dapur</option>
                  ${options.kitchens.map(k => `<option value="${k}" ${this.filterKitchen === k ? 'selected' : ''}>${k}</option>`).join('')}
                </select>
              ` : ''}

              <!-- Date Range Preset Filter -->
              <select 
                class="form-control" 
                onchange="ApprovalCenterModule.setFilterDateRange(this.value)"
                style="width: auto; min-width: 140px; background: rgba(0, 0, 0, 0.3); border-color: ${this.filterDateRange !== 'ALL' ? '#10B981' : 'rgba(255, 255, 255, 0.1)'}; height: 34px; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: ${this.filterDateRange !== 'ALL' ? '#6EE7B7' : 'var(--text-secondary)'};">
                <option value="ALL">📅 Semua Waktu</option>
                <option value="TODAY" ${this.filterDateRange === 'TODAY' ? 'selected' : ''}>Hari Ini</option>
                <option value="7_DAYS" ${this.filterDateRange === '7_DAYS' ? 'selected' : ''}>7 Hari Terakhir</option>
                <option value="THIS_MONTH" ${this.filterDateRange === 'THIS_MONTH' ? 'selected' : ''}>Bulan Ini</option>
                <option value="LAST_MONTH" ${this.filterDateRange === 'LAST_MONTH' ? 'selected' : ''}>Bulan Lalu</option>
              </select>

              <!-- Decision Status Filter (For History Tab Only) -->
              ${this.activeTab === 'HISTORY' ? `
                <select 
                  class="form-control" 
                  onchange="ApprovalCenterModule.setFilterDecision(this.value)"
                  style="width: auto; min-width: 150px; background: rgba(0, 0, 0, 0.3); border-color: ${this.filterDecision !== 'ALL' ? '#3B82F6' : 'rgba(255, 255, 255, 0.1)'}; height: 34px; padding: 4px 10px; border-radius: 6px; font-size: 12px; color: ${this.filterDecision !== 'ALL' ? '#93C5FD' : 'var(--text-secondary)'};">
                  <option value="ALL">⚖️ Semua Keputusan</option>
                  <option value="APPROVED" ${this.filterDecision === 'APPROVED' ? 'selected' : ''}>✓ Disetujui Penuh</option>
                  <option value="ADJUSTED" ${this.filterDecision === 'ADJUSTED' ? 'selected' : ''}>✏️ Disetujui Dgn Penyesuaian</option>
                  <option value="REJECTED" ${this.filterDecision === 'REJECTED' ? 'selected' : ''}>✕ Ditolak</option>
                  <option value="FAILED" ${this.filterDecision === 'FAILED' ? 'selected' : ''}>⚠️ Gagal Pengiriman</option>
                </select>
              ` : ''}

              <!-- Result Counter -->
              <div id="approval-counter-container" style="margin-left: auto; font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono); display: flex; align-items: center; gap: 6px;">
                <span>Menampilkan <strong style="color: #fff;">${filteredItems.length}</strong> dari <strong>${currentBaseItems.length}</strong> ${this.activeTab === 'PENDING' ? 'antrean' : 'riwayat'}</span>
              </div>

            </div>

          </div>
        </div>

        <!-- ITEMS LIST CONTAINER -->
        <div id="approval-list-container" style="display: flex; flex-direction: column; gap: 16px;">
          ${this.renderItemsListHTML(filteredItems, user)}
        </div>

      </div>
    `;
  },

  // Helper untuk rendering isi list items
  renderItemsListHTML: function(filteredItems, user) {
    if (!filteredItems || filteredItems.length === 0) {
      if (this.activeTab === 'PENDING') {
        return `
          <div class="nalar-card" style="text-align: center; padding: 48px;">
            <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
            <h3 style="font-size: 18px; color: #fff; margin-bottom: 4px;">Tidak Ada Antrean Approval yang Cocok</h3>
            <p style="font-size: 12.5px; color: var(--text-muted);">Tidak ditemukan antrean persetujuan yang sesuai dengan filter atau kata kunci pencarian Anda.</p>
          </div>
        `;
      } else {
        return `
          <div class="nalar-card" style="text-align: center; padding: 48px;">
            <div style="font-size: 32px; margin-bottom: 8px;">📂</div>
            <h3 style="font-size: 18px; color: #fff; margin-bottom: 4px;">Tidak Ada Riwayat Approval yang Cocok</h3>
            <p style="font-size: 12.5px; color: var(--text-muted);">Tidak ditemukan riwayat persetujuan yang sesuai dengan kriteria filter atau kata kunci Anda.</p>
          </div>
        `;
      }
    }

    if (this.activeTab === 'PENDING') {
      return filteredItems.map(item => {
        try {
          if (item._type === 'LEAVE') return this.renderPendingLeaveCard(item._raw);
          if (item._type === 'PR') return this.renderPendingPRCard(item._raw);
          if (item._type === 'CA') return this.renderPendingCACard(item._raw);
          if (item._type === 'REIMBURSE') return this.renderPendingRMBCard(item._raw);
          if (item._type === 'ORDER') return this.renderPendingOrderCard(item._raw);
        } catch (e) {
          console.error('Error rendering pending card:', e, item);
        }
        return '';
      }).join('');
    } else {
      return filteredItems.map(item => {
        try {
          return this.renderHistoryCard(item._history, user);
        } catch (e) {
          console.error('Error rendering history card:', e, item);
          return '';
        }
      }).join('');
    }
  },

  // Update dinamis hanya list container tanpa reset focus input search
  renderList: function() {
    const listContainer = document.getElementById('approval-list-container');
    const counterContainer = document.getElementById('approval-counter-container');
    if (!listContainer) {
      this.render(document.getElementById('main-content-area'));
      return;
    }

    const user = (window.DB ? DB.getCurrentUser() : null) || {};
    const currentBaseItems = this.activeTab === 'PENDING' 
      ? this.getPendingItemsList(user) 
      : this.getNormalizedHistoryList(user);

    const filteredItems = this.applyFilterAndSort(currentBaseItems, this.activeTab === 'HISTORY');

    listContainer.innerHTML = this.renderItemsListHTML(filteredItems, user);
    if (counterContainer) {
      counterContainer.innerHTML = `<span>Menampilkan <strong style="color: #fff;">${filteredItems.length}</strong> dari <strong>${currentBaseItems.length}</strong> ${this.activeTab === 'PENDING' ? 'antrean' : 'riwayat'}</span>`;
    }
  },

  approveLeave: async function(id, currentStage) {
    if (currentStage === 'MANAGER_AREA_REVIEW') {
      await DB.advanceLeaveStage(id, 'HC_REVIEW', 'PENDING');
      App.showToast(`Persetujuan Manager Area untuk ${id} berhasil! Pengajuan diteruskan ke Human Capital untuk verifikasi & pemotongan kuota.`, 'success');
    } else if (currentStage === 'DIR_KEU_REVIEW' || currentStage === 'DIR_OPS_OR_KEU_REVIEW') {
      await DB.advanceLeaveStage(id, 'HC_FINAL', 'PENDING');
      App.showToast(`Persetujuan tingkat Direktur untuk ${id} berhasil! Pengajuan diteruskan ke Human Capital untuk pemotongan kuota.`, 'success');
    } else {
      await DB.advanceLeaveStage(id, 'APPROVED', 'APPROVED');
      App.showToast(`Cuti ${id} disetujui penuh oleh Human Capital! Saldo kuota karyawan otomatis dipotong.`, 'success');
    }
    App.refreshCurrentTab();
  },

  rejectLeave: async function(id) {
    await DB.advanceLeaveStage(id, 'REJECTED', 'REJECTED');
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

  advancePR: async function(id, currentStage) {
    if (currentStage === 'MANAGER_APPROVAL') {
      await DB.advanceItemRequestStage(id, 'FINANCE_VERIFICATION', 'PENDING');
      App.showToast(`PR ${id} disetujui Manager Area & diteruskan ke Verifikasi Anggaran (FAT Officer)!`, 'success');
    } else if (currentStage === 'FINANCE_VERIFICATION') {
      await DB.advanceItemRequestStage(id, 'DIRECTOR_APPROVAL', 'PENDING');
      App.showToast(`Anggaran & spesifikasi PR ${id} telah diverifikasi FAT Officer & diteruskan ke Direktur untuk persetujuan!`, 'success');
    } else if (currentStage === 'DIRECTOR_APPROVAL') {
      await DB.advanceItemRequestStage(id, 'COMPLETED', 'APPROVED');
      App.showToast(`Persetujuan Direktur disahkan & Purchase Order resmi (PO) untuk PR ${id} diterbitkan!`, 'success');
    }
    App.refreshCurrentTab();
  },

  rejectPR: async function(id) {
    await DB.advanceItemRequestStage(id, 'REJECTED', 'REJECTED');
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
                <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${ApprovalCenterModule.formatDisplayDateTime(pr.createdAt)}</span>
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

  submitAdjustedPR: async function(e) {
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

    await DB.advanceItemRequestStage(id, nextStage, finalStatus, {
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

  advanceCA: async function(id, currentStage) {
    const ca = DB.getCashAdvanceById(id);
    if (!ca) return;

    if (currentStage === 'FINANCE_VERIFICATION') {
      await DB.advanceCashAdvanceStage(id, 'DIRECTOR_REVIEW', 'PENDING');
      App.showToast(`Cash Advance ${id} diverifikasi sah oleh FAT Officer & diteruskan ke Direksi untuk otorisasi!`, 'success');
    } else if (currentStage === 'DIRECTOR_REVIEW') {
      await DB.advanceCashAdvanceStage(id, 'FAT_DISBURSEMENT', 'PENDING');
      App.showToast(`Cash Advance ${id} disetujui Direksi dan diteruskan ke Tim FAT untuk pencairan transfer!`, 'success');
    }
    App.refreshCurrentTab();
  },

  approveCADirector: async function(id) {
    await DB.advanceCashAdvanceStage(id, 'FAT_DISBURSEMENT', 'PENDING', { action: 'APPROVED', notes: 'Disetujui penuh oleh Direksi' });
    App.showToast(`Cash Advance ${id} disetujui Direksi dan diteruskan ke Tim FAT untuk pencairan dana transfer!`, 'success');
    App.refreshCurrentTab();
  },

  rejectCA: async function(id) {
    const reason = prompt('Masukkan alasan penolakan Cash Advance:', 'Kebutuhan belum memenuhi kriteria pengajuan kasbon');
    if (reason !== null) {
      await DB.advanceCashAdvanceStage(id, 'REJECTED', 'REJECTED', { action: 'REJECTED', notes: reason.trim() });
      App.showToast(`Cash Advance ${id} ditolak.`, 'warn');
      App.refreshCurrentTab();
    }
  },

  openAdjustCAModal: function(id) {
    const ca = DB.getCashAdvanceById(id);
    if (!ca) return;

    this.currentAdjustingCAId = id;
    const user = DB.getCurrentUser();
    const isFinanceStage = (ca.stage === 'FINANCE_VERIFICATION');

    let modalEl = document.getElementById('modal-ca-adjust');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-ca-adjust';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const stageTitle = isFinanceStage ? 'Verifikasi FAT Officer' : 'Otorisasi Direksi';
    const nextTarget = isFinanceStage ? 'Direksi' : 'FAT';

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #FCD34D;">${stageTitle}</span>
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
                <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${ApprovalCenterModule.formatDisplayDateTime(ca.createdAt)}</span>
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
              <input type="number" id="adjust-ca-amount" class="form-control" value="${ca.amountApproved || ca.amountRequested}" min="10000" step="10000" required>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Alasan Penyesuaian Plafon Kasbon <span style="color: #F87171;">*</span></label>
              <textarea id="adjust-ca-notes" class="form-control" rows="3" placeholder="Contoh: Disesuaikan dengan batas pagu operasional perjalanan dinas survei..." required></textarea>
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-ca-adjust')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #F59E0B, #D97706); color: #000; font-weight: 700;">
              ✓ Sahkan Penyesuaian & Teruskan ke ${nextTarget}
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-ca-adjust');
  },

  submitAdjustedCA: async function(e) {
    if (e) e.preventDefault();
    const id = this.currentAdjustingCAId;
    if (!id) return;

    const ca = DB.getCashAdvanceById(id);
    if (!ca) return;

    const adjustedAmount = Number(document.getElementById('adjust-ca-amount')?.value || 0);
    const notes = document.getElementById('adjust-ca-notes')?.value || '';

    if (adjustedAmount <= 0 || !notes.trim()) {
      App.showToast('Mohon lengkapi nominal dan alasan penyesuaian kasbon!', 'warn');
      return;
    }

    const nextStage = (ca.stage === 'FINANCE_VERIFICATION') ? 'DIRECTOR_REVIEW' : 'FAT_DISBURSEMENT';
    const nextTargetName = (ca.stage === 'FINANCE_VERIFICATION') ? 'Direksi' : 'FAT';

    await DB.advanceCashAdvanceStage(id, nextStage, 'PENDING', {
      action: 'APPROVED',
      adjustedAmount,
      notes: notes.trim()
    });

    App.closeModal('modal-ca-adjust');
    App.showToast(`Cash Advance ${id} disetujui dengan penyesuaian plafon Rp ${adjustedAmount.toLocaleString('id-ID')} dan diteruskan ke ${nextTargetName}!`, 'success');
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
                <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${ApprovalCenterModule.formatDisplayDateTime(ca.createdAt)}</span>
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

            <!-- Rekening Tujuan & Email Pemohon -->
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
              <span class="text-mono-badge" style="color: #60A5FA; font-size: 10px;">Rekening Penerima Pemohon</span>
              <div style="color: #fff; font-weight: 600; margin-top: 4px;">
                ${ca.bankName} — ${ca.bankAccountNo} a.n ${ca.bankAccountName}
              </div>
              <div style="margin-top: 6px; color: #93C5FD; font-size: 11.5px; display: flex; align-items: center; gap: 4px;">
                <span>📧</span>
                <span>Email Notifikasi Bukti Transfer: <strong style="color: #6EE7B7; font-family: var(--font-mono);">${ca.applicantEmail || ca.email || '-'}</strong></span>
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

  submitDisburseCA: async function(e) {
    if (e) e.preventDefault();
    const id = this.currentDisbursingCAId;
    if (!id) return;

    const bankRefNo = document.getElementById('disburse-ca-ref')?.value || '';
    const notes = document.getElementById('disburse-ca-notes')?.value || '';

    await DB.disburseCashAdvanceFAT(id, {
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

            <!-- Bukti Kwitansi / Dokumen PDF -->
            ${(s.proofFiles && s.proofFiles.length > 0 && s.proofFiles[0].dataUrl) ? (function() {
              const pf = s.proofFiles[0];
              const isPdf = pf.fileType === 'application/pdf' || (pf.name && pf.name.toLowerCase().endsWith('.pdf'));
              return `
                <div style="margin-bottom: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <h4 style="font-size: 12.5px; color: #fff; margin: 0;">Lampiran Nota / Kwitansi / Dokumen Belanja:</h4>
                    <a href="${pf.dataUrl}" download="${pf.name || 'Nota-Kwitansi-Kasbon'}" target="_blank" class="btn-nalar-primary" style="padding: 4px 12px; font-size: 11px; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff;">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      <span>Download Berkas (${isPdf ? 'PDF' : 'Gambar'})</span>
                    </a>
                  </div>
                  
                  ${isPdf ? `
                    <div style="background: rgba(239, 68, 68, 0.08); border: 1px dashed rgba(239, 68, 68, 0.35); border-radius: var(--radius-sm); padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                      <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 30px;">📄</span>
                        <div>
                          <div style="font-size: 13px; font-weight: 600; color: #fff;">${pf.name}</div>
                          <div style="font-size: 11px; color: #FCA5A5;">Dokumen Rekap Nota PDF dari Pemohon</div>
                        </div>
                      </div>
                      <a href="${pf.dataUrl}" download="${pf.name}" target="_blank" class="btn-nalar-secondary" style="padding: 5px 12px; font-size: 11px; color: #FCA5A5; border-color: rgba(239,68,68,0.4); text-decoration: none;">
                        Buka / Unduh PDF ➔
                      </a>
                    </div>
                  ` : `
                    <div style="background: rgba(0,0,0,0.4); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px; text-align: center;">
                      <img src="${pf.dataUrl}" alt="Foto Bukti Kwitansi" style="max-width: 100%; max-height: 220px; object-fit: contain; border-radius: 4px; display: inline-block;">
                    </div>
                  `}
                </div>
              `;
            })() : `
              <div style="padding: 10px; background: rgba(245, 158, 11, 0.08); border: 1px dashed rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); font-size: 11.5px; color: #FCD34D; margin-bottom: 14px;">
                ⚠️ Pemohon belum melampirkan berkas nota digital.
              </div>
            `}

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

  submitVerifyCASettlement: async function(e) {
    if (e) e.preventDefault();
    const id = this.currentVerifyingCAId;
    if (!id) return;

    const notes = document.getElementById('verify-ca-notes')?.value || '';
    await DB.verifyCashAdvanceSettlementFAT(id, { notes });

    App.closeModal('modal-ca-verify-settlement');
    App.showToast(`Laporan LPJ Cash Advance ${id} telah diverifikasi sah! Transaksi resmi ditutup (SETTLED).`, 'success');
    App.refreshCurrentTab();
  },

  // =========================================================================
  // REIMBURSEMENT (KLAIM BIAYA OPERASIONAL) APPROVAL & DISBURSEMENT HANDLERS
  // =========================================================================

  currentAdjustingRMBId: null,
  currentDisbursingRMBId: null,
  currentDisburseRMBProof: { url: null, name: null },

  advanceReimburse: async function(id, currentStage) {
    const rmb = DB.getReimbursementById(id);
    if (!rmb) return;

    if (currentStage === 'MANAGER_APPROVAL') {
      await DB.advanceReimbursementStage(id, 'FINANCE_VERIFICATION', 'PENDING');
      App.showToast(`Klaim Reimburse ${id} disetujui Manager Area & diteruskan ke Verifikasi FAT Officer!`, 'success');
    } else if (currentStage === 'FINANCE_VERIFICATION') {
      await DB.advanceReimbursementStage(id, 'DIRECTOR_APPROVAL', 'PENDING');
      App.showToast(`Verifikasi Keuangan untuk ${id} selesai & diteruskan ke Direksi untuk otorisasi!`, 'success');
    } else if (currentStage === 'DIRECTOR_APPROVAL') {
      await DB.advanceReimbursementStage(id, 'FAT_DISBURSEMENT', 'PENDING');
      App.showToast(`Otorisasi Direksi untuk ${id} disahkan & diteruskan ke FAT Officer untuk pencairan transfer!`, 'success');
    }
    App.refreshCurrentTab();
  },

  rejectReimburse: async function(id) {
    const reason = prompt('Masukkan alasan penolakan Klaim Reimburse:', 'Bukti bayar tidak valid atau pengeluaran tidak sesuai pagu');
    if (reason !== null) {
      await DB.advanceReimbursementStage(id, 'REJECTED', 'REJECTED', { notes: reason.trim() });
      App.showToast(`Klaim Reimburse ${id} ditolak.`, 'warn');
      App.refreshCurrentTab();
    }
  },

  openAdjustReimburseModal: function(id) {
    const rmb = DB.getReimbursementById(id);
    if (!rmb) return;

    this.currentAdjustingRMBId = id;
    const user = DB.getCurrentUser();

    let modalEl = document.getElementById('modal-rmb-adjust');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-rmb-adjust';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    const nextStageName = rmb.stage === 'FINANCE_VERIFICATION' ? 'Otorisasi Direksi' : 'Pencairan Transfer FAT';

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 560px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #FCD34D;">Penyesuaian Nominal Klaim</span>
            <h3 class="modal-title" style="margin-top: 2px;">Setujui Reimburse dgn Penyesuaian</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-rmb-adjust')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="ApprovalCenterModule.submitAdjustedReimburse(event)">
          <div class="modal-body">
            
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-mono-badge" style="color: #34D399;">${rmb.id}</span>
                <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${ApprovalCenterModule.formatDisplayDateTime(rmb.createdAt)}</span>
              </div>
              <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 4px;">
                ${rmb.itemName}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 2px;">
                Pemohon: <strong>${rmb.employeeName}</strong> (${rmb.employeeRoleLabel || rmb.employeeRole}) · Dapur: <strong>${rmb.targetKitchen}</strong>
              </div>
              <div style="font-size: 12px; color: #FCD34D; margin-top: 4px;">
                Nominal Awal: <strong>Rp ${Number(rmb.originalSubtotal || rmb.subtotal).toLocaleString('id-ID')}</strong> (${rmb.quantity} unit @ Rp ${Number(rmb.unitPrice).toLocaleString('id-ID')})
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nominal Subtotal Disetujui (Rp) <span style="color: #F87171;">*</span></label>
              <input type="number" id="adjust-rmb-subtotal" class="form-control" value="${rmb.subtotal}" min="100" step="100" required style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: #34D399;">
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Alasan Penyesuaian Nominal <span style="color: #F87171;">*</span></label>
              <textarea id="adjust-rmb-notes" class="form-control" rows="3" placeholder="Contoh: Disesuaikan dengan nominal sah yang tertera pada struk fisik..." required></textarea>
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-rmb-adjust')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #F59E0B, #D97706); color: #000; font-weight: 700;">
              ✓ Sahkan Penyesuaian & Teruskan ke ${nextStageName}
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-rmb-adjust');
  },

  submitAdjustedReimburse: async function(e) {
    if (e) e.preventDefault();
    const id = this.currentAdjustingRMBId;
    if (!id) return;

    const rmb = DB.getReimbursementById(id);
    if (!rmb) return;

    const adjustedSubtotal = Number(document.getElementById('adjust-rmb-subtotal')?.value || 0);
    const notes = document.getElementById('adjust-rmb-notes')?.value || '';

    if (adjustedSubtotal <= 0 || !notes.trim()) {
      App.showToast('Mohon lengkapi nominal dan alasan penyesuaian!', 'warn');
      return;
    }

    let nextStage = 'DIRECTOR_APPROVAL';
    if (rmb.stage === 'FINANCE_VERIFICATION') {
      nextStage = 'DIRECTOR_APPROVAL';
    } else if (rmb.stage === 'DIRECTOR_APPROVAL') {
      nextStage = 'FAT_DISBURSEMENT';
    }

    await DB.advanceReimbursementStage(id, nextStage, 'PENDING', {
      adjustedSubtotal,
      notes: notes.trim()
    });

    App.closeModal('modal-rmb-adjust');
    App.showToast(`Klaim Reimburse ${id} disetujui dengan nominal Rp ${adjustedSubtotal.toLocaleString('id-ID')} dan diteruskan!`, 'success');
    App.refreshCurrentTab();
  },

  openDisburseReimburseModal: function(id) {
    const rmb = DB.getReimbursementById(id);
    if (!rmb) return;

    this.currentDisbursingRMBId = id;
    this.currentDisburseRMBProof = { url: null, name: null };
    const user = DB.getCurrentUser();
    const amountToDisburse = Number(rmb.subtotal) || 0;

    let modalEl = document.getElementById('modal-rmb-disburse');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-rmb-disburse';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 620px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #34D399;">Pencairan Klaim Reimbursement (FAT)</span>
            <h3 class="modal-title" style="margin-top: 2px;">Transfer Dana & Selesaikan Klaim (Settlement)</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-rmb-disburse')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="ApprovalCenterModule.submitDisburseReimburse(event)">
          <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
            
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-mono-badge" style="color: #34D399;">${rmb.id}</span>
                <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${ApprovalCenterModule.formatDisplayDateTime(rmb.createdAt)}</span>
              </div>
              <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 4px;">
                ${rmb.itemName}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                Pemohon: <strong>${rmb.employeeName}</strong> (${rmb.employeeRoleLabel || rmb.employeeRole}) · Dapur: <strong>${rmb.targetKitchen}</strong>
              </div>
              <div style="font-size: 20px; font-family: var(--font-mono); font-weight: 700; color: #34D399; margin-top: 8px;">
                Total Nominal Transfer: Rp ${amountToDisburse.toLocaleString('id-ID')}
              </div>
            </div>

            <!-- Rekening Penerima & Email -->
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px; font-size: 12px;">
              <span class="text-mono-badge" style="color: #60A5FA; font-size: 10px;">Rekening Bank Tujuan Transfer</span>
              <div style="color: #fff; font-weight: 600; font-size: 13.5px; margin-top: 4px;">
                ${rmb.bankName} — <code style="color: #93C5FD; font-size: 13px;">${rmb.bankAccountNo}</code> a.n ${rmb.bankAccountName}
              </div>
              <div style="margin-top: 6px; color: #93C5FD; font-size: 11.5px; display: flex; align-items: center; gap: 4px;">
                <span>📧</span>
                <span>Email Notifikasi Bukti Transfer: <strong style="color: #6EE7B7; font-family: var(--font-mono);">${rmb.applicantEmail || rmb.email || '-'}</strong></span>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Nomor Referensi Transfer Bank <span style="color: #F87171;">*</span></label>
              <input type="text" id="disburse-rmb-ref" class="form-control" placeholder="Contoh: TRF-MANDIRI-998821 / Ref: 882910" value="TRF-FAT-${Date.now().toString().slice(-6)}" required style="font-family: var(--font-mono);">
            </div>

            <!-- Attachment Bukti Transfer Perbankan -->
            <div class="form-group">
              <label class="form-label">Upload Bukti Transfer Bank (Opsional)</label>
              <input type="file" id="disburse-rmb-proof-input" accept="image/png,image/jpeg,image/jpg,application/pdf" class="form-control" onchange="ApprovalCenterModule.handleReimburseDisburseProofSelect(event)">
              <div id="disburse-rmb-proof-status" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Pilih foto bukti transfer atau struk mutasi bank jika tersedia.</div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Catatan Pencairan Kasir FAT</label>
              <input type="text" id="disburse-rmb-notes" class="form-control" value="Dana reimbursement telah ditransfer ke rekening pemohon.">
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-rmb-disburse')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; font-weight: 700;">
              💸 Konfirmasi Transfer & Settlement Selesai
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-rmb-disburse');
  },

  handleReimburseDisburseProofSelect: async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      App.showToast(`Ukuran bukti transfer (${(file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas maksimal 2 MB!`, 'warn');
      event.target.value = '';
      return;
    }

    try {
      const res = await compressImageFile(file, 1200, 0.8);
      this.currentDisburseRMBProof = {
        url: res.url,
        name: file.name
      };
      const statusEl = document.getElementById('disburse-rmb-proof-status');
      if (statusEl) statusEl.innerHTML = `<span style="color: #34D399;">✓ Bukti transfer terlampir: ${file.name}</span>`;
    } catch (err) {
      console.warn('Disburse proof error:', err);
    }
  },

  submitDisburseReimburse: async function(e) {
    if (e) e.preventDefault();
    const id = this.currentDisbursingRMBId;
    if (!id) return;

    const bankRefNo = document.getElementById('disburse-rmb-ref')?.value || '';
    const notes = document.getElementById('disburse-rmb-notes')?.value || '';

    await DB.disburseReimbursement(id, {
      bankRefNo,
      proofUrl: this.currentDisburseRMBProof ? this.currentDisburseRMBProof.url : null,
      notes
    });

    App.closeModal('modal-rmb-disburse');
    App.showToast(`Klaim Reimburse ${id} telah dicairkan dan berstatus SETTLED!`, 'success');
    App.refreshCurrentTab();
  },

  previewReimburseAttachment: function(id) {
    if (window.ReimburseModule && typeof window.ReimburseModule.previewAttachment === 'function') {
      window.ReimburseModule.previewAttachment(id);
    } else {
      const rmb = DB.getReimbursementById(id);
      if (rmb && rmb.attachmentUrl) {
        window.open(rmb.attachmentUrl, '_blank');
      } else {
        App.showToast('Lampiran bukti bayar tidak tersedia.', 'warn');
      }
    }
  },

  // =========================================================================
  // SETTLEMENT INVOICE VENDOR MODAL & HANDLERS (FAT OFFICER)
  // =========================================================================

  currentDisbursingOrderId: null,
  currentDisburseOrderProof: { url: null, name: null },

  openDisburseOrderInvoiceModal: function(id) {
    const prs = DB.getItemRequests() || [];
    const pr = prs.find(p => p.id === id);
    if (!pr) return;

    this.currentDisbursingOrderId = id;
    this.currentDisburseOrderProof = { url: null, name: null };
    const amountToDisburse = Number(pr.totalPrice) || 0;

    let modalEl = document.getElementById('modal-order-invoice-disburse');
    if (!modalEl) {
      modalEl = document.createElement('div');
      modalEl.id = 'modal-order-invoice-disburse';
      modalEl.className = 'modal-backdrop';
      document.body.appendChild(modalEl);
    }

    modalEl.innerHTML = `
      <div class="modal-box" style="max-width: 620px;">
        <div class="modal-header">
          <div>
            <span class="text-mono-badge" style="color: #38BDF8;">Settlement Tagihan Vendor (FAT)</span>
            <h3 class="modal-title" style="margin-top: 2px;">Transfer Dana & Settlement Pembayaran Vendor</h3>
          </div>
          <button class="modal-close-btn" onclick="App.closeModal('modal-order-invoice-disburse')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <form onsubmit="ApprovalCenterModule.submitDisburseOrderInvoice(event)">
          <div class="modal-body" style="max-height: 75vh; overflow-y: auto;">
            
            <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: var(--radius-sm); padding: 14px 16px; margin-bottom: 18px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="text-mono-badge" style="color: #60A5FA;">${pr.id}</span>
                <span style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">${ApprovalCenterModule.formatDisplayDateTime(pr.orderInvoice?.submittedAt || pr.createdAt)}</span>
              </div>
              <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 4px;">
                ${pr.itemName} (${pr.quantity} Unit)
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">
                Dapur: <strong>${pr.targetKitchen}</strong> · Pemohon: <strong>${pr.employeeName}</strong>
              </div>
              <div style="font-size: 11.5px; color: #93C5FD; margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                <span>📧</span>
                <span>Email Penerima Bukti Transfer: <strong style="color: #6EE7B7; font-family: var(--font-mono);">${pr.orderInvoice?.recipientEmail || pr.applicantEmail || pr.email || '-'}</strong></span>
              </div>
              <div style="font-size: 20px; font-family: var(--font-mono); font-weight: 700; color: #34D399; margin-top: 8px;">
                Total Tagihan Invoice: Rp ${amountToDisburse.toLocaleString('id-ID')}
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 16px;">
              <div style="font-size: 12px; color: #CBD5E1;">
                Berkas Invoice: <strong style="color: #60A5FA;">${pr.orderInvoice?.fileName || 'Invoice/Kuitansi'}</strong>
              </div>
              <button type="button" class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: #60A5FA; border-color: rgba(59,130,246,0.4);" onclick="ApprovalCenterModule.previewOrderInvoice('${pr.id}')">
                📎 Lihat Invoice ↗
              </button>
            </div>

            <div class="form-group">
              <label class="form-label">Nomor Referensi Transfer Bank / Kasir FAT <span style="color: #F87171;">*</span></label>
              <input type="text" id="disburse-order-ref" class="form-control" placeholder="Contoh: TRF-MANDIRI-883910" value="TRF-PO-${Date.now().toString().slice(-6)}" required style="font-family: var(--font-mono);">
            </div>

            <div class="form-group">
              <label class="form-label">Upload Bukti Transfer Bank (Opsional)</label>
              <input type="file" id="disburse-order-proof-input" accept="image/png,image/jpeg,image/jpg,application/pdf" class="form-control" onchange="ApprovalCenterModule.handleOrderDisburseProofSelect(event)">
              <div id="disburse-order-proof-status" style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Pilih foto bukti transfer atau resi transfer bank ke vendor.</div>
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Catatan Pencairan FAT</label>
              <input type="text" id="disburse-order-notes" class="form-control" value="Pembayaran tagihan invoice vendor telah berhasil ditransfer.">
            </div>

          </div>

          <div class="modal-footer">
            <button type="button" class="btn-nalar-secondary" onclick="App.closeModal('modal-order-invoice-disburse')">Batal</button>
            <button type="submit" class="btn-nalar-primary" style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-color: #34D399; color: #fff; font-weight: 700;">
              💸 Konfirmasi Transfer & Settlement Selesai
            </button>
          </div>
        </form>
      </div>
    `;

    App.openModal('modal-order-invoice-disburse');
  },

  handleOrderDisburseProofSelect: async function(event) {
    const file = event.target.files[0];
    if (!file) return;

    const maxSizeBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      App.showToast(`Ukuran bukti transfer (${(file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas maksimal 2 MB!`, 'warn');
      event.target.value = '';
      return;
    }

    try {
      const res = await compressImageFile(file, 1200, 0.8);
      this.currentDisburseOrderProof = {
        url: res.url,
        name: file.name
      };
      const statusEl = document.getElementById('disburse-order-proof-status');
      if (statusEl) statusEl.innerHTML = `<span style="color: #34D399;">✓ Bukti transfer terlampir: ${file.name}</span>`;
    } catch (err) {
      console.warn('Disburse proof error:', err);
    }
  },

  submitDisburseOrderInvoice: async function(e) {
    if (e) e.preventDefault();
    const id = this.currentDisbursingOrderId;
    if (!id) return;

    const bankRefNo = document.getElementById('disburse-order-ref')?.value || '';
    const notes = document.getElementById('disburse-order-notes')?.value || '';

    await DB.disburseOrderInvoice(id, {
      bankRefNo,
      transferProofUrl: this.currentDisburseOrderProof ? this.currentDisburseOrderProof.url : null,
      transferProofName: this.currentDisburseOrderProof ? this.currentDisburseOrderProof.name : null,
      notes
    });

    App.closeModal('modal-order-invoice-disburse');
    App.showToast(`Pembayaran tagihan vendor PR ${id} telah ditransfer dan berstatus SETTLEMENT!`, 'success');
    App.refreshCurrentTab();
  },

  previewOrderInvoice: function(id) {
    if (window.PesananModule && typeof window.PesananModule.previewInvoice === 'function') {
      window.PesananModule.previewInvoice(id);
    } else {
      const prs = DB.getItemRequests() || [];
      const pr = prs.find(p => p.id === id);
      if (pr && pr.orderInvoice && pr.orderInvoice.fileUrl) {
        window.open(pr.orderInvoice.fileUrl, '_blank');
      } else {
        App.showToast('Lampiran invoice tidak tersedia.', 'warn');
      }
    }
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
              <option value="ALL" selected>📑 Semua Pengajuan (Master Konsolidasi: Cuti, Timesheet, PR, Kasbon & Reimburse)</option>
              <option value="LEAVE">🌴 Cuti & Izin Karyawan</option>
              <option value="TIMESHEET">⏱️ Timesheet & Presensi Kerja</option>
              <option value="PR">📦 Pengadaan Barang & Pembelian (PR)</option>
              <option value="CA">💰 Cash Advance & LPJ Kasbon</option>
              <option value="REIMBURSE">💸 Klaim Reimbursement Operasional</option>
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
    const timesheets = DB.getTimesheets() || [];
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
    // 2. EXPORT KHUSUS TIMESHEET
    else if (category === 'TIMESHEET') {
      categoryTitle = 'TIMESHEET & PRESENSI KERJA';
      filenameSuffix = 'Timesheet_Presensi';
      const filteredTimesheets = timesheets.filter(t => isDateInRange(t.date) && isStatusMatch(t.status));

      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #1E40AF; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px;">No</th>
              <th style="padding: 10px;">ID Log</th>
              <th style="padding: 10px;">Tanggal Kerja</th>
              <th style="padding: 10px;">NIKA</th>
              <th style="padding: 10px;">Nama Karyawan</th>
              <th style="padding: 10px;">Divisi / Jabatan</th>
              <th style="padding: 10px;">Jam Mulai</th>
              <th style="padding: 10px;">Jam Selesai</th>
              <th style="padding: 10px;">Total Jam Kerja</th>
              <th style="padding: 10px;">Kategori Aktivitas</th>
              <th style="padding: 10px;">Uraian Aktivitas / Tugas</th>
              <th style="padding: 10px;">Status Validasi</th>
              <th style="padding: 10px;">Waktu Approval (Tgl & Jam)</th>
              <th style="padding: 10px;">Pejabat Penyetuju (HC)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredTimesheets.map((t, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              const lastStep = Array.isArray(t.approvalHistory) && t.approvalHistory.length > 0 ? t.approvalHistory[t.approvalHistory.length - 1] : null;
              const approvalTime = lastStep ? lastStep.timestamp : (t.status === 'APPROVED' ? t.date + ' ' + (t.endTime || '17:00') : '-');

              let statusBg = t.status === 'APPROVED' ? '#D1FAE5' : t.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = t.status === 'APPROVED' ? '#065F46' : t.status === 'REJECTED' ? '#991B1B' : '#92400E';

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${t.id}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${t.date}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${t.nika || '-'}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${t.employeeName}</td>
                  <td style="border: 1px solid #CBD5E1;">${t.department || t.role}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${t.startTime || '08:00'}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${t.endTime || '17:00'}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${Number(t.hours || 0).toFixed(1)} Jam</td>
                  <td style="border: 1px solid #CBD5E1;">${t.activityPreset || 'Reguler'}</td>
                  <td style="border: 1px solid #CBD5E1;">${t.activity || '-'}</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${t.status}</td>
                  <td style="text-align: center; font-weight: bold; color: #059669; border: 1px solid #CBD5E1;">${approvalTime}</td>
                  <td style="border: 1px solid #CBD5E1;">${t.approver || 'Human Capital'}</td>
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
              
              const isFailed = (p.orderStatus === 'GAGAL_PENGIRIMAN');
              const trackHist = Array.isArray(p.orderTrackingHistory) ? p.orderTrackingHistory : [];
              const failedStep = trackHist.slice().reverse().find(t => t.status === 'GAGAL_PENGIRIMAN');
              const notes = isFailed ? (failedStep?.notes || 'Gagal Pengiriman') : (lastStep ? lastStep.notes : (p.reason || '-'));

              let displayStatus = isFailed ? 'GAGAL PENGIRIMAN' : p.status;
              let displayStage = isFailed ? 'Gagal Pengiriman (PO)' : p.stage;
              let statusBg = isFailed ? '#FEE2E2' : (p.status === 'APPROVED' || p.status === 'COMPLETED') ? '#D1FAE5' : p.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = isFailed ? '#991B1B' : (p.status === 'APPROVED' || p.status === 'COMPLETED') ? '#065F46' : p.status === 'REJECTED' ? '#991B1B' : '#92400E';

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
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${displayStatus}</td>
                  <td style="border: 1px solid #CBD5E1; text-align: center;">${displayStage}</td>
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
    // 5. EXPORT KHUSUS REIMBURSEMENT
    else if (category === 'REIMBURSE') {
      categoryTitle = 'KLAIM REIMBURSEMENT OPERASIONAL';
      filenameSuffix = 'Klaim_Reimbursement';
      const rmbs = DB.getReimbursements() || [];
      const filteredRmbs = rmbs.filter(r => isDateInRange(r.purchaseDate || r.createdAt) && isStatusMatch(r.status));

      tableHtml = `
        <table border="1" cellpadding="6" cellspacing="0" style="border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif; width: 100%;">
          <thead>
            <tr style="background-color: #047857; color: #FFFFFF; font-weight: bold; text-align: center;">
              <th style="padding: 10px;">No</th>
              <th style="padding: 10px;">ID Reimburse</th>
              <th style="padding: 10px;">Tgl Pengajuan</th>
              <th style="padding: 10px;">Nama Pemohon</th>
              <th style="padding: 10px;">Divisi / Jabatan</th>
              <th style="padding: 10px;">Kategori Biaya</th>
              <th style="padding: 10px;">Nama Barang / Keperluan</th>
              <th style="padding: 10px;">Qty</th>
              <th style="padding: 10px;">Harga Satuan (Rp)</th>
              <th style="padding: 10px;">Total Nominal (Rp)</th>
              <th style="padding: 10px;">Target Dapur / Lokasi</th>
              <th style="padding: 10px;">Tgl Transaksi / Beli</th>
              <th style="padding: 10px;">Rekening Pencairan</th>
              <th style="padding: 10px;">Status Klaim</th>
              <th style="padding: 10px;">Tahap Alur</th>
              <th style="padding: 10px;">Waktu Approval (Tgl & Jam)</th>
              <th style="padding: 10px;">Pejabat Penyetuju (Approver)</th>
              <th style="padding: 10px;">Catatan Keputusan</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRmbs.map((r, idx) => {
              const bgRow = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
              const histArr = Array.isArray(r.approvalHistory) ? r.approvalHistory : [];
              const lastStep = histArr.length > 0 ? histArr[histArr.length - 1] : null;
              const approvalTime = lastStep && lastStep.action !== 'SUBMITTED' ? lastStep.timestamp : (r.disbursementDetails?.disbursedAt || r.updatedAt || r.createdAt || '-');
              const approver = lastStep && lastStep.action !== 'SUBMITTED' ? lastStep.actorName : (r.approver || '-');
              const notes = lastStep ? lastStep.notes : (r.notes || '-');

              let statusBg = (r.status === 'APPROVED' || r.status === 'COMPLETED' || r.status === 'SETTLED' || r.status === 'DISBURSED') ? '#D1FAE5' : r.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = (r.status === 'APPROVED' || r.status === 'COMPLETED' || r.status === 'SETTLED' || r.status === 'DISBURSED') ? '#065F46' : r.status === 'REJECTED' ? '#991B1B' : '#92400E';

              return `
                <tr style="background-color: ${bgRow};">
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${idx + 1}</td>
                  <td style="text-align: center; font-weight: bold; border: 1px solid #CBD5E1;">${r.id}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${r.createdAt || '-'}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${r.employeeName}</td>
                  <td style="border: 1px solid #CBD5E1;">${r.department || r.role || '-'}</td>
                  <td style="border: 1px solid #CBD5E1;">${r.category || '-'}</td>
                  <td style="font-weight: 600; border: 1px solid #CBD5E1;">${r.itemName}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${r.quantity || 1}</td>
                  <td style="text-align: right; border: 1px solid #CBD5E1;">Rp ${Number(r.unitPrice || 0).toLocaleString('id-ID')}</td>
                  <td style="text-align: right; font-weight: bold; color: #047857; border: 1px solid #CBD5E1;">Rp ${Number(r.subtotal || 0).toLocaleString('id-ID')}</td>
                  <td style="border: 1px solid #CBD5E1;">${r.targetKitchen || '-'}</td>
                  <td style="text-align: center; border: 1px solid #CBD5E1;">${r.purchaseDate || '-'}</td>
                  <td style="border: 1px solid #CBD5E1;">${r.bankName || '-'} (${r.bankAccountNo || '-'} a.n ${r.bankAccountName || r.employeeName})</td>
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${r.status}</td>
                  <td style="border: 1px solid #CBD5E1; text-align: center;">${r.stage}</td>
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
    // 6. EXPORT KONSOLIDASI SEMUA PENGAJUAN
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
              const isFailed = (h.status === 'GAGAL_PENGIRIMAN' || h.decision === 'GAGAL_PENGIRIMAN');
              let statusBg = isFailed ? '#FEE2E2' : (h.status === 'APPROVED' || h.status === 'COMPLETED' || h.status === 'SETTLED') ? '#D1FAE5' : h.status === 'REJECTED' ? '#FEE2E2' : '#FEF3C7';
              let statusColor = isFailed ? '#991B1B' : (h.status === 'APPROVED' || h.status === 'COMPLETED' || h.status === 'SETTLED') ? '#065F46' : h.status === 'REJECTED' ? '#991B1B' : '#92400E';
              let displayStatus = isFailed ? 'GAGAL PENGIRIMAN' : h.status;
              let displayStage = isFailed ? 'Gagal Pengiriman (PO)' : h.stage;

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
                  <td style="background-color: ${statusBg}; color: ${statusColor}; font-weight: bold; text-align: center; border: 1px solid #CBD5E1;">${displayStatus}</td>
                  <td style="border: 1px solid #CBD5E1; text-align: center;">${displayStage}</td>
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


