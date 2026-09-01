/**
 * ERP MMS - Modul Timesheet & Log Aktivitas Harian
 * Integrasi Cuti / Leave & Validasi Kepatuhan Jam Kerja:
 * 1. Integrasi Leave/Cuti Approved:
 *    - Jika tanggal terpilih jatuh pada Cuti yang Disetujui (Full Day), timesheet otomatis DIKUNCI dan TIDAK BISA DIISI.
 *    - Tampil pemberitahuan resmi bahwa karyawan sedang cuti pada tanggal tersebut.
 *    - Jika Cuti Setengah Hari (0.5 Hari), batas maksimal jam kerja dibatasi 4.0 jam.
 * 2. Logika Anti-Tabrakan Jam (Conflict / Overlap Detection)
 * 3. Batas Maksimal 4 Jam per Sesi Aktivitas
 * 4. Kalkulasi Otomatis Durasi Real-Time dengan indikator visual
 * 5. Layout Terpadu: Summary & Timeline (Kiri) vs Form Input Terproteksi (Kanan)
 */

window.TimesheetModule = {
  selectedDate: (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10)),

  render: function(container) {
    if (!container) return;

    if (!this.selectedDate) {
      this.selectedDate = (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10));
    }

    const todayDateStr = (typeof getRealtimeDateStr === 'function' ? getRealtimeDateStr() : new Date().toISOString().slice(0, 10));
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const user = DB.getCurrentUser();
    const allTimesheets = DB.getTimesheets() || [];
    const userTimesheets = allTimesheets.filter(t => t.employeeId === user.id);
    
    // Check Integrasi Cuti: Apakah user sedang Cuti Approved pada tanggal yang dipilih?
    const approvedLeave = DB.getUserApprovedLeaveOnDate(user.id, this.selectedDate);
    const isFullDayLeave = approvedLeave && !approvedLeave.isHalfDay;
    const isHalfDayLeave = approvedLeave && approvedLeave.isHalfDay;

    // Filter activities for selected date and sort chronologically by startTime
    const dayTimesheets = userTimesheets
      .filter(t => t.date === this.selectedDate)
      .sort((a, b) => (a.startTime || '00:00').localeCompare(b.startTime || '00:00'));

    const dayTotalHours = dayTimesheets.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const targetHours = isHalfDayLeave ? 4.0 : 8.0;
    const progressPercent = Math.min(100, Math.round((dayTotalHours / targetHours) * 100));

    const totalAllHours = userTimesheets.reduce((acc, curr) => acc + (Number(curr.hours) || 0), 0);
    const defaultActivities = DB.getDefaultActivities() || [];

    container.innerHTML = `
      <div class="animate-blur-in">
        
        <!-- Top Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 26px; flex-wrap: wrap; gap: 16px;">
          <div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="text-mono-badge" style="color: #60A5FA; background: rgba(59, 130, 246, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 11px;">
                Presensi & Kepatuhan Jam Kerja
              </span>
              <span style="font-size: 11.5px; color: var(--text-muted); font-style: italic;">
                ● Akun: <strong style="color: #fff;">${user.name}</strong> (${user.roleLabel})
              </span>
            </div>
            <h1 style="font-size: 26px; font-weight: 700; margin-top: 4px;">Timesheet & Log Aktivitas Harian</h1>
          </div>
        </div>

        <!-- 2-Column Integrated Layout -->
        <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 28px; margin-bottom: 28px; align-items: start;">
          
          <!-- LEFT / CENTER COLUMN: Date Selector, Summary Total Durasi & Timeline -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            
            <!-- Summary Total Durasi Hari Terpilih -->
            <div class="nalar-card hud-corner-box aura-box-blue" style="margin-bottom: 0;">
              <div class="card-aura-glow aura-blue"></div>

              <div style="position: relative; z-index: 2;">
                
                <!-- Date Selector Header -->
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px; margin-bottom: 18px;">
                  <div>
                    <span class="text-mono-badge" style="color: var(--text-muted);">Pilih Hari & Tanggal Kerja</span>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                      <input type="date" id="ts-view-date" class="form-control" style="width: auto; padding: 7px 12px; font-size: 13px;" 
                             value="${this.selectedDate}" onchange="TimesheetModule.changeDate(this.value)">
                      <button class="btn-nalar-secondary ${this.selectedDate === todayDateStr ? 'active' : ''}" style="padding: 6px 12px; font-size: 11.5px; ${this.selectedDate === todayDateStr ? 'background: rgba(59,130,246,0.25); color: #60A5FA; border-color: #60A5FA;' : ''}" onclick="TimesheetModule.changeDate('${todayDateStr}')">
                        📅 Hari Ini
                      </button>
                      <button class="btn-nalar-secondary" style="padding: 6px 12px; font-size: 11.5px; ${this.selectedDate === yesterday ? 'background: rgba(59,130,246,0.25); color: #60A5FA; border-color: #60A5FA;' : ''}" onclick="TimesheetModule.changeDate('${yesterday}')">
                        Kemarin
                      </button>
                      <button class="btn-nalar-secondary" style="padding: 6px 12px; font-size: 11.5px; ${this.selectedDate === tomorrow ? 'background: rgba(59,130,246,0.25); color: #60A5FA; border-color: #60A5FA;' : ''}" onclick="TimesheetModule.changeDate('${tomorrow}')">
                        Besok
                      </button>
                    </div>
                  </div>

                  <!-- Day Total Duration Badge (Rata Kiri) -->
                  <div style="display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                    <span class="text-mono-badge" style="color: ${isFullDayLeave ? '#34D399' : '#60A5FA'}; margin-bottom: 2px;">
                      ${isFullDayLeave ? 'STATUS HARI INI' : 'TOTAL DURASI HARI ITU'}
                    </span>
                    
                    ${isFullDayLeave ? `
                      <div style="display: flex; align-items: center; justify-content: flex-start; gap: 6px; margin-top: 4px; width: 100%;">
                        <span style="font-size: 24px; font-weight: 700; color: #34D399; line-height: 1.2;">
                          🏖️ CUTI RESMI
                        </span>
                      </div>
                      <div style="font-size: 11px; color: #6EE7B7; font-style: italic; margin-top: 2px; text-align: left; width: 100%;">
                        ${approvedLeave.type} (Disetujui)
                      </div>
                    ` : `
                      <div style="display: flex; align-items: baseline; justify-content: flex-start; gap: 6px; margin-top: 4px; width: 100%;">
                        <span style="font-size: 34px; font-weight: 700; color: ${dayTotalHours >= targetHours ? '#34D399' : '#60A5FA'}; line-height: 1; font-family: var(--font-mono);">
                          ${dayTotalHours.toFixed(1)}
                        </span>
                        <span style="color: var(--text-muted); font-size: 13px; font-weight: 400; font-family: var(--font-mono);">/ ${targetHours.toFixed(1)} Jam</span>
                      </div>
                      <div style="font-size: 11.5px; color: ${dayTotalHours >= targetHours ? '#34D399' : '#FCD34D'}; margin-top: 4px; display: flex; align-items: center; justify-content: flex-start; gap: 5px; width: 100%; text-align: left;">
                        ${dayTotalHours >= targetHours ? '<span>✓</span><span>Target kerja harian tercapai</span>' : `<span>⏳</span><span>Kurang ${(targetHours - dayTotalHours).toFixed(1)} jam dari target ${targetHours} jam</span>`}
                      </div>
                    `}
                  </div>
                </div>

                <!-- Visual Progress Bar for Selected Day -->
                <div style="background: rgba(255,255,255,0.08); height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 6px;">
                  <div style="background: ${isFullDayLeave ? 'var(--grad-emerald)' : dayTotalHours >= targetHours ? 'var(--grad-emerald)' : 'var(--grad-timesheet)'}; width: ${isFullDayLeave ? 100 : progressPercent}%; height: 100%; border-radius: 4px; transition: width 0.4s ease;"></div>
                </div>

              </div>
            </div>

            <!-- Banner Keterangan Khusus Cuti (Jika User Sedang Cuti Approved pada Tanggal Ini) -->
            ${approvedLeave ? `
              <div class="nalar-card" style="margin-bottom: 0; padding: 20px 22px; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(52, 211, 153, 0.4); border-left: 4px solid #34D399;">
                <div style="display: flex; align-items: flex-start; gap: 14px;">
                  <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(52, 211, 153, 0.4); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">
                    🏖️
                  </div>
                  <div style="flex: 1;">
                    <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
                      <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge-status badge-approved" style="font-size: 11px; padding: 2px 8px;">
                          🟢 CUTI RESMI TELAH DISETUJUI
                        </span>
                        <span style="font-size: 11.5px; color: #A78BFA; font-weight: 600;">
                          ${approvedLeave.id}
                        </span>
                      </div>
                      <span style="font-size: 11px; color: var(--text-muted); font-style: italic;">
                        Periode: ${approvedLeave.startDate} s.d ${approvedLeave.endDate}
                      </span>
                    </div>

                    <h3 style="font-size: 16.5px; font-weight: 700; color: #fff; margin-top: 6px;">
                      ${approvedLeave.type}
                    </h3>
                    
                    <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; line-height: 1.5;">
                      Alasan: <em>"${approvedLeave.reason}"</em>
                    </p>

                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: #6EE7B7; margin-top: 10px; padding-top: 8px; border-top: 1px solid rgba(52, 211, 153, 0.2); flex-wrap: wrap; gap: 8px;">
                      <span>✓ Durasi Cuti: <strong>${approvedLeave.duration} Hari Kerja</strong></span>
                      <span>Disetujui oleh: <strong>${approvedLeave.approver || 'Human Capital'}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}

            <!-- Timeline Rincian Aktivitas pada Tanggal Terpilih -->
            <div class="nalar-card aura-box-blue" style="margin-bottom: 0;">
              <div class="card-aura-glow aura-blue" style="opacity: 0.15; top: -50%; left: -20%;"></div>
              
              <div style="position: relative; z-index: 2;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px;">
                  <div>
                    <span class="text-mono-badge" style="color: var(--text-muted);">Summary Log Harian</span>
                    <h3 style="font-size: 17px; margin-top: 2px;">Aktivitas Tercatat: <span style="color: #60A5FA;">${this.selectedDate}</span></h3>
                  </div>
                  <span style="font-size: 11px; color: var(--text-muted); background: rgba(59,130,246,0.12); padding: 3px 8px; border-radius: 4px;">
                    ${dayTimesheets.length} Entri Terjadwal
                  </span>
                </div>

                <!-- List of Day Activities -->
                ${dayTimesheets.length === 0 ? `
                  <div style="text-align: center; padding: 36px 20px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); background: rgba(0,0,0,0.2);">
                    <div style="font-size: 28px; margin-bottom: 6px;">
                      ${isFullDayLeave ? '🏖️' : '⏱️'}
                    </div>
                    <p style="color: var(--text-secondary); font-weight: 500; font-size: 13.5px;">
                      ${isFullDayLeave ? 'Tidak ada catatan kerja karena Anda sedang cuti resmi.' : 'Belum ada aktivitas yang dicatat pada tanggal ini.'}
                    </p>
                    <p style="color: var(--text-muted); font-size: 12px; margin-top: 4px; font-weight: 300;">
                      ${isFullDayLeave ? 'Selamat menikmati waktu istirahat / cuti Anda.' : 'Gunakan form di sebelah kanan untuk langsung menambahkan pekerjaan Anda.'}
                    </p>
                  </div>
                ` : `
                  <div style="display: flex; flex-direction: column; gap: 12px;">
                    ${dayTimesheets.map(t => `
                      <div style="background: rgba(14, 18, 28, 0.9); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-md); padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.3); cursor: pointer; transition: all 0.15s ease;"
                           onclick="App.showApprovalTracker('timesheet', '${t.id}')"
                           onmouseenter="this.style.borderColor='#60A5FA'; this.style.transform='translateY(-1px)'"
                           onmouseleave="this.style.borderColor='rgba(59, 130, 246, 0.25)'; this.style.transform='none'">
                        <div style="display: flex; align-items: flex-start; gap: 14px;">
                          <!-- Time Range Chip -->
                          <div style="background: rgba(59, 130, 246, 0.15); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: var(--radius-sm); padding: 8px 12px; text-align: center; min-width: 100px;">
                            <div style="font-size: 13px; font-weight: 600; color: #60A5FA;">
                              ${t.startTime || '08:00'} - ${t.endTime || '12:00'}
                            </div>
                            <div style="font-size: 10.5px; color: var(--text-muted); margin-top: 2px;">
                              Durasi: ${t.hours} Jam
                            </div>
                          </div>

                          <div>
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                              <span class="text-mono-badge" style="color: #60A5FA; background: rgba(59, 130, 246, 0.12); padding: 3px 8px; border-radius: 4px; font-size: 10px;">
                                ${t.activityPreset || 'Aktivitas Kerja'}
                              </span>
                              <span style="font-size: 10px; color: var(--text-dim); font-family: var(--font-mono);">${t.id}</span>
                            </div>
                            <h4 style="font-size: 14.5px; color: #fff; margin: 6px 0 3px 0; font-weight: 500;">${t.activity}</h4>
                            <div style="font-size: 11px; color: var(--text-dim);">
                              Status: <strong style="color: ${t.status === 'APPROVED' ? '#34D399' : '#FBBF24'};">${t.status}</strong> · Reviewer: ${t.approver || 'Manager'}
                            </div>
                          </div>
                        </div>

                        <div style="display: flex; align-items: center; gap: 8px;">
                          <button class="btn-nalar-secondary" style="padding: 4px 10px; font-size: 11px; color: #60A5FA; border-color: rgba(59,130,246,0.4);" onclick="event.stopPropagation(); App.showApprovalTracker('timesheet', '${t.id}')">
                            🔍 Detail Alur
                          </button>
                          <span class="badge-status ${t.status === 'APPROVED' ? 'badge-approved' : t.status === 'PENDING' ? 'badge-pending' : 'badge-rejected'}">
                            ${t.status}
                          </span>
                          <button class="btn-nalar-secondary" style="padding: 4px 8px; font-size: 11px; color: var(--text-dim);" title="Hapus aktivitas ini" onclick="event.stopPropagation(); TimesheetModule.deleteEntry('${t.id}')">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                          </button>
                        </div>
                      </div>
                    `).join('')}
                  </div>
                `}
              </div>
            </div>

          </div>

          <!-- RIGHT COLUMN: Direct Input Form Container OR Locked Leave Card + (Khusus Perwakilan Yayasan) Laporan Kendala -->
          <div style="display: flex; flex-direction: column; gap: 24px;">
            ${isFullDayLeave ? `
              <!-- KONDISI 1: CUTI FULL DAY APPROVED -> FORM TIMESHEET DIKUNCI TOTAL -->
              <div class="nalar-card hud-corner-box" style="margin-bottom: 0; background: linear-gradient(180deg, rgba(24, 18, 18, 0.95) 0%, rgba(18, 14, 14, 0.98) 100%); border: 1px solid rgba(239, 68, 68, 0.35); text-align: center; padding: 36px 24px;">
                <div style="width: 60px; height: 60px; border-radius: 50%; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; font-size: 28px; margin: 0 auto 16px auto; box-shadow: 0 4px 20px rgba(239, 68, 68, 0.2);">
                  ⛔
                </div>
                
                <span class="text-mono-badge" style="color: #F87171; background: rgba(239, 68, 68, 0.15); padding: 2px 10px; border-radius: 4px; font-size: 11px;">
                  Timesheet Dinonaktifkan
                </span>

                <h3 style="font-size: 19px; font-weight: 700; color: #fff; margin-top: 10px;">
                  Kamu Telah Cuti di Tanggal Ini
                </h3>

                <p style="font-size: 13px; color: var(--text-secondary); margin-top: 10px; line-height: 1.6; max-width: 320px; margin-left: auto; margin-right: auto;">
                  Anda tercatat memiliki permohonan <strong>${approvedLeave.type}</strong> pada tanggal <strong>${this.selectedDate}</strong> yang telah berstatus <strong style="color: #34D399;">Disetujui</strong>.
                </p>

                <div style="background: rgba(0,0,0,0.35); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 12px 16px; margin: 18px 0; text-align: left; font-size: 11.5px; color: var(--text-muted);">
                  <div>📅 Periode Cuti: <strong style="color: #fff;">${approvedLeave.startDate} s.d ${approvedLeave.endDate}</strong></div>
                  <div style="margin-top: 4px;">📝 Alasan: <em>"${approvedLeave.reason}"</em></div>
                  <div style="margin-top: 4px;">✅ Persetujuan: <span style="color: #6EE7B7;">${approvedLeave.approver || 'Human Capital'}</span></div>
                </div>

                <div style="font-size: 11.5px; color: var(--text-muted); font-style: italic; margin-bottom: 18px;">
                  *Pengisian jam kerja tidak dapat dilakukan selama hari cuti resmi berlangsung.
                </div>

                <button type="button" class="btn-nalar-secondary" onclick="App.switchTab('cuti')" style="width: 100%; justify-content: center; padding: 10px; font-size: 12.5px; color: #A78BFA; border-color: rgba(167, 139, 250, 0.4);">
                  🗓️ Buka Kalender Manajemen Cuti
                </button>
              </div>
            ` : `
              <!-- KONDISI 2: FORM AKTIF (Hari Kerja Reguler atau Cuti Setengah Hari) -->
              <div class="nalar-card hud-corner-box aura-box-blue" style="margin-bottom: 0; background: linear-gradient(180deg, rgba(20, 24, 36, 0.95) 0%, rgba(14, 18, 28, 0.98) 100%);">
                <div class="card-aura-glow aura-blue" style="top: -20%; right: -20%;"></div>

                <div style="position: relative; z-index: 2;">
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px;">
                    <div>
                      <span class="text-mono-badge" style="color: #60A5FA;">Form Input Langsung</span>
                      <h3 style="font-size: 18px; font-weight: 600; margin-top: 2px;">Catat Pekerjaan Baru</h3>
                    </div>
                    <span class="live-dot" style="background: #60A5FA;"></span>
                  </div>

                  ${isHalfDayLeave ? `
                    <div style="background: rgba(245, 158, 11, 0.12); border: 1px solid rgba(245, 158, 11, 0.35); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 16px; font-size: 11.5px; color: #FDE68A;">
                      ⚡ <strong>Cuti Setengah Hari Aktif:</strong> Anda mengambil cuti 0.5 hari pada tanggal ini. Kuota pengisian timesheet dibatasi maksimal <strong>4.0 Jam Kerja</strong>.
                    </div>
                  ` : ''}

                  <form id="inline-form-timesheet" onsubmit="TimesheetModule.handleInlineSubmit(event)">
                    <!-- 1. Tanggal -->
                    <div class="form-group">
                      <label class="form-label">1. Tanggal Aktivitas</label>
                      <input type="date" id="inline-ts-date" class="form-control" value="${this.selectedDate}" required onchange="TimesheetModule.onInlineDateChange(this.value)">
                    </div>

                    <!-- 2. Jam Mulai & Jam Selesai -->
                    <div class="form-row" style="margin-bottom: 8px;">
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">2. Jam Mulai</label>
                        <input type="time" id="inline-ts-start-time" class="form-control" value="08:30" required onchange="TimesheetModule.calculateInlineDuration()">
                      </div>
                      <div class="form-group" style="margin-bottom: 0;">
                        <label class="form-label">Jam Selesai</label>
                        <input type="time" id="inline-ts-end-time" class="form-control" value="12:30" required onchange="TimesheetModule.calculateInlineDuration()">
                      </div>
                    </div>

                    <!-- Live Auto Duration & Conflict Calculation Banner -->
                    <div id="inline-ts-duration-box" style="background: rgba(0,0,0,0.35); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 18px; font-size: 11.5px; display: flex; align-items: center; justify-content: space-between; transition: all 0.2s ease;">
                      <span id="inline-ts-duration-preview" style="color: #34D399; font-weight: 500;">⏱️ Dihitung Otomatis: 4 Jam (4.0 Jam)</span>
                    </div>

                    <!-- 3. Nama Aktivitas / Pekerjaan (Input Manual dengan Tombol Silang ✕) -->
                    <div class="form-group">
                      <label class="form-label">3. Nama Aktivitas / Pekerjaan <span style="color: #F87171;">*</span></label>
                      <div style="position: relative; display: flex; align-items: center;">
                        <input type="text" id="inline-ts-activity-name" class="form-control" 
                               placeholder="Ketik nama aktivitas / pekerjaan harian Anda..." 
                               required value="" 
                               style="padding-right: 36px;" 
                               oninput="TimesheetModule.toggleClearBtn(this.value)">
                        <button type="button" id="btn-clear-ts-activity" 
                                onclick="TimesheetModule.clearActivityInput()" 
                                title="Hapus / Kosongkan teks aktivitas" 
                                style="position: absolute; right: 10px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: #9CA3AF; cursor: pointer; font-size: 12px; display: none; width: 22px; height: 22px; border-radius: 50%; align-items: center; justify-content: center; line-height: 1; transition: all 0.2s ease;">
                          ✕
                        </button>
                      </div>
                    </div>

                    <!-- 4. Keterangan / Kegiatan Detail -->
                    <div class="form-group">
                      <label class="form-label">4. Keterangan / Rincian Kegiatan</label>
                      <textarea id="inline-ts-detail" class="form-control" rows="3" placeholder="Tuliskan rincian tugas yang diselesaikan pada rentang jam tersebut..." required></textarea>
                    </div>

                    <button type="submit" id="btn-submit-timesheet" class="btn-nalar-primary" style="width: 100%; justify-content: center; padding: 12px; margin-top: 6px;">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                      Simpan Aktivitas & Update Summary
                    </button>
                  </form>
                </div>
              </div>
            `}

            <!-- =========================================================================
                 KONTAINER TAMBAHAN KHUSUS ROLE: PERWAKILAN YAYASAN & STAFF OPERASIONAL
                 (LEBAR SAMA PERSIS DENGAN FORM INPUT LANGSUNG DI ATASNYA)
                 ========================================================================= -->
            ${(user.role === 'PERWAKILAN_YAYASAN' || user.role === 'STAFF_OPERASIONAL' || user.role === 'SURVEYOR') ? (function() {
              const dayIssues = (DB.getFieldIssues() || []).filter(f => f.authorId === user.id && f.date === TimesheetModule.selectedDate);
              const allKitchens = DB.getKitchens() || [];
              // Filter khusus titik dapur SPPG yang didelegasikan ke Perwakilan Yayasan / Staff Operasional yang sedang login
              const delegatedKitchens = allKitchens.filter(k => {
                if (!k) return false;
                const matchPerwakilan = k.perwakilanYayasan && (
                  k.perwakilanYayasan.includes(user.name) ||
                  k.perwakilanYayasan.includes(user.id) ||
                  k.perwakilanYayasan.toLowerCase().includes((user.name || '').toLowerCase())
                );
                const matchAssigned = user.assignedKitchen && (
                  user.assignedKitchen.includes(k.idSppg) ||
                  user.assignedKitchen.includes(k.namaDapur) ||
                  user.assignedKitchen.includes(k.id)
                );
                return matchPerwakilan || matchAssigned;
              });

              // Jika ada delegasi spesifik gunakan delegatedKitchens, jika belum diatur penugasan gunakan master dapur aktif
              const kitchens = delegatedKitchens.length > 0 ? delegatedKitchens : allKitchens;
              const formatMode = TimesheetModule.issueFormatMode || 'BULLET';

              return `
                <div class="nalar-card hud-corner-box aura-box-amber" style="margin-bottom: 0; background: linear-gradient(180deg, rgba(26, 20, 16, 0.95) 0%, rgba(16, 14, 12, 0.98) 100%); border: 1px solid rgba(245, 158, 11, 0.35);">
                  <div class="card-aura-glow aura-amber" style="top: -20%; right: -20%; opacity: 0.18;"></div>

                  <div style="position: relative; z-index: 2;">
                    
                    <!-- Header Kontainer Kendala -->
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; border-bottom: 1px solid rgba(245, 158, 11, 0.2); padding-bottom: 14px;">
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <span class="text-mono-badge" style="color: #FCD34D; background: rgba(245, 158, 11, 0.15); padding: 2px 8px; border-radius: 4px; font-size: 10.5px;">
                            Pelaporan Lapangan
                          </span>
                          <span class="text-mono-badge" style="color: #F87171; background: rgba(239, 68, 68, 0.12); padding: 2px 6px; border-radius: 4px; font-size: 10px;">
                            ${user.roleLabel || 'Perwakilan / Staff Ops'}
                          </span>
                        </div>
                        <h3 style="font-size: 17.5px; font-weight: 600; margin-top: 4px; color: #fff;">
                          Laporan Kendala Harian di Dapur
                        </h3>
                        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 3px; line-height: 1.4;">
                          Tuliskan kendala di hari ini (<strong style="color: #FCD34D;">${TimesheetModule.selectedDate}</strong>). Otomatis tampil di <strong>Dashboard Manager Area</strong>.
                        </p>
                      </div>
                      <div style="width: 38px; height: 38px; border-radius: 8px; background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.35); display: flex; align-items: center; justify-content: center; font-size: 18px; color: #FCD34D; flex-shrink: 0; box-shadow: 0 4px 12px rgba(245,158,11,0.2);">
                        🚨
                      </div>
                    </div>

                    <!-- Form Input Kendala (Hanya Berbasis Pilihan Dapur & Rincian Poin) -->
                    <form id="form-field-issue" onsubmit="TimesheetModule.handleFieldIssueSubmit(event)">
                      
                      <!-- 1. Pilihan Dapur SPPG Binaan -->
                      <div class="form-group" style="margin-bottom: 16px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                          <label class="form-label" style="font-size: 12px; color: #fff; margin-bottom: 0;">
                            1. Titik Dapur SPPG Binaan <span style="color: #F87171;">*</span>
                          </label>
                          <span style="font-size: 11px; color: #FCD34D; font-family: var(--font-mono);">
                            ${delegatedKitchens.length > 0 ? `(${delegatedKitchens.length} Dapur Terdelegasi)` : ''}
                          </span>
                        </div>
                        <select id="issue-kitchen-id" class="form-control" style="font-size: 13px;" required>
                          ${kitchens.map((k, idx) => `
                            <option value="${k.id}" ${idx === 0 ? 'selected' : ''}>
                              ${k.idSppg || k.id} — ${k.namaDapur || k.name} (${k.kotaKabupaten || k.provinsi || 'Wilayah'})
                            </option>
                          `).join('')}
                        </select>
                      </div>

                      <!-- 2. Rincian Poin-Poin Kendala (Bullet / Numbering Toolbar) -->
                      <div class="form-group" style="margin-bottom: 18px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
                          <label class="form-label" style="margin-bottom: 0; font-size: 12px; color: #fff;">
                            2. Rincian Poin-Poin Kendala di Dapur <span style="color: #F87171;">*</span>
                          </label>

                          <!-- Toolbar Poin (Bullet / Numbering Switcher) -->
                          <div style="display: flex; align-items: center; gap: 4px; background: rgba(0,0,0,0.5); padding: 2px 4px; border-radius: 6px; border: 1px solid var(--border-subtle);">
                            <button type="button" id="btn-mode-bullet" class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 11px; border-radius: 4px; ${formatMode === 'BULLET' ? 'background: rgba(245,158,11,0.25); color: #FCD34D; border-color: #FCD34D; font-weight: 600;' : 'color: var(--text-muted);'}" onclick="TimesheetModule.toggleIssueFormat('BULLET')">
                              • Bullet
                            </button>
                            <button type="button" id="btn-mode-number" class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 11px; border-radius: 4px; ${formatMode === 'NUMBER' ? 'background: rgba(245,158,11,0.25); color: #FCD34D; border-color: #FCD34D; font-weight: 600;' : 'color: var(--text-muted);'}" onclick="TimesheetModule.toggleIssueFormat('NUMBER')">
                              1. Numbering
                            </button>
                          </div>
                        </div>

                        <!-- Dynamic Point Rows List -->
                        <div id="issue-points-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 8px;">
                          ${TimesheetModule.renderIssuePointRows(formatMode)}
                        </div>

                        <button type="button" class="btn-nalar-secondary" onclick="TimesheetModule.addIssuePointRow()" style="width: 100%; justify-content: center; padding: 7px 12px; font-size: 12px; color: #FCD34D; border-color: rgba(245,158,11,0.35); border-style: dashed; background: rgba(245,158,11,0.04);">
                          + Tambah Poin Kendala Berikutnya
                        </button>
                      </div>

                      <!-- Submit Button -->
                      <button type="submit" class="btn-nalar-primary" style="width: 100%; justify-content: center; padding: 12px; font-weight: 700; font-size: 13px; background: linear-gradient(135deg, #D97706 0%, #B45309 100%); border-color: #FCD34D; color: #fff; box-shadow: 0 4px 18px rgba(217, 119, 6, 0.35);">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        Simpan & Teruskan Laporan Kendala ke Manager Area
                      </button>
                    </form>

                    <!-- Riwayat Kendala Tanggal Terpilih & Status Bertingkat Per Poin -->
                    ${dayIssues.length > 0 ? `
                      <div style="margin-top: 22px; padding-top: 16px; border-top: 1px dashed rgba(245, 158, 11, 0.25);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                          <span class="text-mono-badge" style="color: #FCD34D; font-size: 10.5px;">
                            Laporan Hari ${TimesheetModule.selectedDate} (${dayIssues.length})
                          </span>
                          <span style="font-size: 10.5px; color: var(--text-dim); font-family: var(--font-mono);">
                            Status Bertingkat Per Poin
                          </span>
                        </div>
                        
                        <div style="display: flex; flex-direction: column; gap: 12px;">
                          ${dayIssues.map(issue => `
                            <div style="background: rgba(0, 0, 0, 0.45); border: 1px solid ${issue.status === 'FOLLOWED_UP' ? 'rgba(52, 211, 153, 0.35)' : issue.status === 'IN_PROGRESS' ? 'rgba(59, 130, 246, 0.35)' : 'rgba(245, 158, 11, 0.35)'}; border-radius: var(--radius-sm); padding: 14px 16px;">
                              <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; margin-bottom: 10px;">
                                <div>
                                  <strong style="color: #fff; font-size: 13.5px;">🍳 ${issue.kitchenName}</strong>
                                  <div style="font-size: 11px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 1px;">
                                    ${issue.id} · ${issue.createdAt ? issue.createdAt.split(' ')[1] : ''}
                                  </div>
                                </div>
                                <span class="badge-status ${issue.status === 'FOLLOWED_UP' ? 'badge-approved' : issue.status === 'IN_PROGRESS' ? 'badge-pending' : 'badge-rejected'}" style="font-size: 10.5px;">
                                  ${issue.status === 'FOLLOWED_UP' ? '🟢 Seluruh Poin Selesai' : issue.status === 'IN_PROGRESS' ? '🔵 Sedang Ditindaklanjuti' : '🟡 Menunggu Respon'}
                                </span>
                              </div>

                              <!-- Rincian Status Per Poin -->
                              <div style="display: flex; flex-direction: column; gap: 8px;">
                                ${issue.points.map((pt, pIdx) => {
                                  const pText = typeof pt === 'object' ? pt.text : pt;
                                  const pStatus = typeof pt === 'object' ? (pt.status || 'BELUM_DIRESPON') : (issue.status === 'FOLLOWED_UP' ? 'SUDAH_SELESAI' : 'BELUM_DIRESPON');
                                  const pResponse = typeof pt === 'object' ? pt.response : issue.managerResponse;
                                  const pRespondedBy = typeof pt === 'object' ? pt.respondedBy : issue.managerRespondedBy;

                                  const prefix = issue.formatType === 'NUMBER' ? `${pIdx + 1}. ` : `• `;

                                  return `
                                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 10px 12px;">
                                      <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                                        <div style="font-size: 12.5px; color: #fff; line-height: 1.5;">
                                          <strong style="color: #FCD34D;">${prefix}</strong>${pText}
                                        </div>
                                        <span class="badge-status ${pStatus === 'SUDAH_SELESAI' ? 'badge-approved' : pStatus === 'SUDAH_DITANGGAPI' ? 'badge-settled' : pStatus === 'SUDAH_DIRESPON' ? 'badge-disbursed' : 'badge-pending'}" style="font-size: 10px; font-weight: 600; white-space: nowrap; flex-shrink: 0;">
                                          ${pStatus === 'SUDAH_SELESAI' ? '✓ Selesai' : pStatus === 'SUDAH_DITANGGAPI' ? '💬 Ditanggapi' : pStatus === 'SUDAH_DIRESPON' ? '👁️ Direspon' : '⏳ Belum Direspon'}
                                        </span>
                                      </div>

                                      ${pResponse ? `
                                        <div style="margin-top: 8px; padding: 6px 10px; background: rgba(52, 211, 153, 0.08); border-left: 2px solid #34D399; border-radius: 4px; font-size: 11.5px; color: #A7F3D0; line-height: 1.4;">
                                          <strong>Arahan Manager:</strong> "${pResponse}"
                                          ${pRespondedBy ? `<div style="font-size: 10px; color: var(--text-dim); margin-top: 2px; font-family: var(--font-mono);">${pRespondedBy}</div>` : ''}
                                        </div>
                                      ` : ''}
                                    </div>
                                  `;
                                }).join('')}
                              </div>

                              <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                                <button type="button" class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 10.5px; color: var(--text-dim);" onclick="TimesheetModule.deleteFieldIssueEntry('${issue.id}')">
                                  Hapus Laporan
                                </button>
                              </div>
                            </div>
                          `).join('')}
                        </div>
                      </div>
                    ` : ''}

                  </div>
                </div>
              `;
            })() : ''}
          </div>

        </div>

        <!-- Master History Table (All Records & Approved Leaves) -->
        <div class="nalar-card">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
            <div>
              <span class="text-mono-badge" style="color: var(--text-muted);">Riwayat Kumulatif</span>
              <h3 style="font-size: 18px; margin-top: 2px;">Seluruh Catatan Timesheet & Log Aktivitas Anda</h3>
            </div>
            <div style="font-size: 12px; color: var(--text-muted);">
              Total Terakumulasi: <strong style="color: #60A5FA;">${totalAllHours} Jam</strong>
            </div>
          </div>

          <div class="nalar-table-container">
            <table class="nalar-table">
              <thead>
                <tr>
                  <th>ID Log</th>
                  <th>Tanggal</th>
                  <th>Rentang Jam</th>
                  <th>Kategori Aktivitas</th>
                  <th>Rincian Tugas Detail</th>
                  <th>Durasi</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${userTimesheets.length === 0 ? `
                  <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 32px;">Belum ada riwayat timesheet.</td>
                  </tr>
                ` : userTimesheets.map(t => `
                  <tr>
                    <td style="color: #60A5FA; font-weight: 500;">${t.id}</td>
                    <td>${t.date}</td>
                    <td style="color: #fff;">${t.startTime || '08:00'} - ${t.endTime || '12:00'}</td>
                    <td>
                      <span class="text-mono-badge" style="color: var(--text-secondary); font-size: 9.5px;">${t.activityPreset || 'Aktivitas'}</span>
                    </td>
                    <td style="max-width: 260px; color: var(--text-secondary); font-size: 13px;">${t.activity}</td>
                    <td><strong style="color: #fff; font-size: 13.5px;">${t.hours}</strong> Jam</td>
                    <td>
                      <span class="badge-status ${t.status === 'APPROVED' ? 'badge-approved' : t.status === 'PENDING' ? 'badge-pending' : 'badge-rejected'}">
                        ${t.status}
                      </span>
                    </td>
                    <td>
                      <button class="btn-nalar-secondary" style="padding: 3px 8px; font-size: 11px; color: var(--text-dim);" title="Hapus entri" onclick="TimesheetModule.deleteEntry('${t.id}')">
                        Hapus
                      </button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    // Initialize duration and validation state if form exists
    if (!isFullDayLeave) {
      this.calculateInlineDuration();
    }
  },

  changeDate: function(newDate) {
    this.selectedDate = newDate;
    const inlineDate = document.getElementById('inline-ts-date');
    if (inlineDate) inlineDate.value = newDate;
    this.render(document.getElementById('main-content-area'));
  },

  onInlineDateChange: function(newDate) {
    this.selectedDate = newDate;
    this.render(document.getElementById('main-content-area'));
  },

  calculateInlineDuration: function() {
    const user = DB.getCurrentUser();
    const date = document.getElementById('inline-ts-date')?.value || this.selectedDate;
    const start = document.getElementById('inline-ts-start-time')?.value;
    const end = document.getElementById('inline-ts-end-time')?.value;
    const badge = document.getElementById('inline-ts-duration-preview');
    const box = document.getElementById('inline-ts-duration-box');
    const submitBtn = document.getElementById('btn-submit-timesheet');

    // Validasi Cuti Approved
    const approvedLeave = DB.getUserApprovedLeaveOnDate(user.id, date);
    if (approvedLeave && !approvedLeave.isHalfDay) {
      if (badge) {
        badge.innerHTML = `⛔ <strong>Sedang Cuti Resmi:</strong> Tidak dapat mengisi timesheet pada hari cuti (${approvedLeave.type}).`;
        badge.style.color = '#F87171';
      }
      if (box) box.style.borderColor = 'rgba(248, 113, 113, 0.5)';
      if (submitBtn) submitBtn.disabled = true;
      return { valid: false, hours: 0, reason: 'Sedang cuti resmi' };
    }

    if (!start || !end) return { valid: false, hours: 0 };

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    let startMinutes = startH * 60 + startM;
    let endMinutes = endH * 60 + endM;

    // Rule 1: Jam selesai harus lebih besar dari jam mulai
    if (endMinutes <= startMinutes) {
      if (badge) {
        badge.innerHTML = `⚠️ <strong>Jam selesai harus lebih besar dari jam mulai!</strong>`;
        badge.style.color = '#F87171';
      }
      if (box) box.style.borderColor = 'rgba(248, 113, 113, 0.4)';
      return { valid: false, hours: 0, reason: 'Jam selesai harus lebih besar dari jam mulai' };
    }

    const diffMinutes = endMinutes - startMinutes;
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    const decimalHours = Number((diffMinutes / 60).toFixed(1));

    // Rule 2: Batas Maksimal 4 Jam per Aktivitas
    if (diffMinutes > 240) {
      if (badge) {
        badge.innerHTML = `⚠️ <strong>Melebihi batas maksimal 4 jam per entri!</strong> (Terhitung: ${hours} Jam ${mins > 0 ? mins + ' Menit' : ''} / ${decimalHours} Jam). Mohon perbarui jam awal atau akhir.`;
        badge.style.color = '#F87171';
      }
      if (box) box.style.borderColor = 'rgba(248, 113, 113, 0.5)';
      return { valid: false, hours: decimalHours, reason: 'Batas maksimal 4 jam per aktivitas terlampaui' };
    }

    // Rule 3: Anti-Tabrakan Jam (Conflict with existing logged activities on that date)
    const collisionCheck = DB.checkTimesheetCollision(user.id, date, start, end);
    if (collisionCheck.collision) {
      const conflict = collisionCheck.conflictingEntry;
      if (badge) {
        badge.innerHTML = `⚠️ <strong>Jam bertabrakan</strong> dengan jadwal yang sudah ada (${conflict.startTime} - ${conflict.endTime}: ${conflict.activityPreset || conflict.activity})!`;
        badge.style.color = '#FBBF24';
      }
      if (box) box.style.borderColor = 'rgba(251, 191, 36, 0.5)';
      return { valid: false, hours: decimalHours, reason: `Bertabrakan dengan log ${conflict.startTime} - ${conflict.endTime}` };
    }

    // Rule 4: Jika Cuti Setengah Hari, pastikan total hari tidak melebihi 4 jam
    if (approvedLeave && approvedLeave.isHalfDay) {
      const allTimesheets = DB.getTimesheets() || [];
      const userLogs = allTimesheets.filter(t => t.employeeId === user.id && t.date === date);
      const existingHours = userLogs.reduce((sum, t) => sum + (Number(t.hours) || 0), 0);
      if (existingHours + decimalHours > 4.0) {
        if (badge) {
          badge.innerHTML = `⚠️ <strong>Melebihi kuota cuti 0.5 hari!</strong> Total jam kerja maksimal 4.0 jam (Saat ini terisi: ${existingHours} jam).`;
          badge.style.color = '#FBBF24';
        }
        if (box) box.style.borderColor = 'rgba(251, 191, 36, 0.5)';
        return { valid: false, hours: decimalHours, reason: 'Melebihi kuota 4.0 jam untuk cuti setengah hari' };
      }
    }

    // All validations PASSED
    if (badge) {
      badge.innerHTML = `⏱️ <strong>Dihitung Otomatis:</strong> ${hours} Jam ${mins > 0 ? mins + ' Menit' : ''} (${decimalHours} Jam) — <span style="color: #34D399;">Valid & Siap Disimpan</span>`;
      badge.style.color = '#34D399';
    }
    if (box) box.style.borderColor = 'rgba(52, 211, 153, 0.4)';
    if (submitBtn) submitBtn.disabled = false;

    return { valid: true, hours: decimalHours };
  },

  toggleClearBtn: function(val) {
    const btn = document.getElementById('btn-clear-ts-activity');
    if (btn) {
      btn.style.display = (val && val.trim().length > 0) ? 'inline-flex' : 'none';
    }
  },

  clearActivityInput: function() {
    const input = document.getElementById('inline-ts-activity-name');
    if (input) {
      input.value = '';
      input.focus();
      this.toggleClearBtn('');
    }
  },

  deleteEntry: function(tsId) {
    if (confirm('Apakah Anda yakin ingin menghapus catatan aktivitas ini?')) {
      const success = DB.deleteTimesheet(tsId);
      if (success) {
        App.showToast('Catatan aktivitas berhasil dihapus!', 'success');
        this.render(document.getElementById('main-content-area'));
      }
    }
  },

  handleInlineSubmit: function(e) {
    e.preventDefault();
    const user = DB.getCurrentUser();
    const date = document.getElementById('inline-ts-date').value || this.selectedDate;
    const startTime = document.getElementById('inline-ts-start-time').value;
    const endTime = document.getElementById('inline-ts-end-time').value;
    const activityName = (document.getElementById('inline-ts-activity-name')?.value || '').trim();
    const detail = document.getElementById('inline-ts-detail').value;

    // Cek Integrasi Cuti Approved
    const approvedLeave = DB.getUserApprovedLeaveOnDate(user.id, date);
    if (approvedLeave && !approvedLeave.isHalfDay) {
      App.showToast(`Gagal: Anda telah mengambil cuti pada tanggal ${date} (${approvedLeave.type}) yang telah disetujui. Timesheet tidak dapat diisi!`, 'error');
      return;
    }

    if (!activityName) {
      App.showToast('Mohon ketikkan nama aktivitas / pekerjaan Anda!', 'warn');
      const input = document.getElementById('inline-ts-activity-name');
      if (input) input.focus();
      return;
    }

    const validation = this.calculateInlineDuration();

    if (!startTime || !endTime || !detail) {
      App.showToast('Mohon lengkapi jam mulai, jam selesai, dan rincian kegiatan detail!', 'warn');
      return;
    }

    // Validasi 1: Batas Maksimal 4 Jam
    if (validation.hours > 4.0) {
      App.showToast('Gagal: Batas maksimal pengisian aktivitas di timesheet adalah 4 jam! Mohon perbarui jam awal atau jam akhir Anda.', 'error');
      return;
    }

    // Validasi 2: Deteksi Tabrakan Jam
    const collisionCheck = DB.checkTimesheetCollision(user.id, date, startTime, endTime);
    if (collisionCheck.collision) {
      const conflict = collisionCheck.conflictingEntry;
      App.showToast(`Gagal: Jam ${startTime} - ${endTime} bertabrakan dengan aktivitas yang sudah tercatat (${conflict.startTime} - ${conflict.endTime}: ${conflict.activityPreset})! Silakan ubah jam kerja.`, 'error');
      return;
    }

    if (!validation.valid || validation.hours <= 0) {
      App.showToast(`Gagal: ${validation.reason || 'Periksa kembali rentang jam kerja Anda.'}`, 'error');
      return;
    }

    // Simpan entri ke database
    DB.addTimesheet({
      date,
      startTime,
      endTime,
      activityPreset: activityName,
      activity: detail,
      hours: validation.hours
    });

    this.selectedDate = date;
    App.showToast(`✓ Aktivitas "${activityName}" (${startTime} - ${endTime} · ${validation.hours} Jam) berhasil dicatat & summary diperbarui!`, 'success');
    this.render(document.getElementById('main-content-area'));
  },

  // =========================================================================
  // METODE KHUSUS LAPORAN KENDALA HARIAN LAPANGAN (PERWAKILAN YAYASAN)
  // =========================================================================
  issueFormatMode: 'BULLET',
  currentIssuePoints: [''],

  toggleIssueFormat: function(mode) {
    this.issueFormatMode = mode;
    this.collectCurrentIssuePointValues();
    const container = document.getElementById('issue-points-list');
    if (container) {
      container.innerHTML = this.renderIssuePointRows(mode);
    }
    const btnB = document.getElementById('btn-mode-bullet');
    const btnN = document.getElementById('btn-mode-number');
    if (btnB) {
      btnB.style.background = mode === 'BULLET' ? 'rgba(245,158,11,0.25)' : '';
      btnB.style.color = mode === 'BULLET' ? '#FCD34D' : 'var(--text-muted)';
      btnB.style.borderColor = mode === 'BULLET' ? '#FCD34D' : '';
      btnB.style.fontWeight = mode === 'BULLET' ? '600' : 'normal';
    }
    if (btnN) {
      btnN.style.background = mode === 'NUMBER' ? 'rgba(245,158,11,0.25)' : '';
      btnN.style.color = mode === 'NUMBER' ? '#FCD34D' : 'var(--text-muted)';
      btnN.style.borderColor = mode === 'NUMBER' ? '#FCD34D' : '';
      btnN.style.fontWeight = mode === 'NUMBER' ? '600' : 'normal';
    }
  },

  collectCurrentIssuePointValues: function() {
    const inputs = document.querySelectorAll('.issue-point-input');
    if (inputs && inputs.length > 0) {
      this.currentIssuePoints = Array.from(inputs).map(inp => inp.value);
    }
  },

  renderIssuePointRows: function(mode) {
    const points = (this.currentIssuePoints && this.currentIssuePoints.length > 0) 
      ? this.currentIssuePoints 
      : [''];
    
    return points.map((val, idx) => `
      <div class="issue-point-row" style="display: flex; align-items: center; gap: 8px;">
        <span class="issue-point-badge" style="display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; border-radius: 4px; background: rgba(245,158,11,0.15); border: 1px solid rgba(245,158,11,0.3); color: #FCD34D; font-size: 11.5px; font-weight: 700; flex-shrink: 0; font-family: var(--font-mono);">
          ${mode === 'NUMBER' ? `${idx + 1}.` : '•'}
        </span>
        <input type="text" class="form-control issue-point-input" placeholder="Tuliskan poin kendala ${idx + 1}..." value="${val ? val.replace(/"/g, '&quot;') : ''}" style="padding: 8px 12px; font-size: 12.5px;" required>
        ${points.length > 1 ? `
          <button type="button" class="btn-nalar-secondary" onclick="TimesheetModule.removeIssuePointRow(${idx})" style="padding: 6px 8px; font-size: 11px; color: #F87171; border-color: rgba(248,113,113,0.3);" title="Hapus baris ini">
            ✕
          </button>
        ` : ''}
      </div>
    `).join('');
  },

  addIssuePointRow: function() {
    this.collectCurrentIssuePointValues();
    this.currentIssuePoints.push('');
    const container = document.getElementById('issue-points-list');
    if (container) {
      container.innerHTML = this.renderIssuePointRows(this.issueFormatMode || 'BULLET');
      const inputs = container.querySelectorAll('.issue-point-input');
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }
  },

  removeIssuePointRow: function(index) {
    this.collectCurrentIssuePointValues();
    if (this.currentIssuePoints.length > 1) {
      this.currentIssuePoints.splice(index, 1);
      const container = document.getElementById('issue-points-list');
      if (container) {
        container.innerHTML = this.renderIssuePointRows(this.issueFormatMode || 'BULLET');
      }
    }
  },

  handleFieldIssueSubmit: function(e) {
    if (e && e.preventDefault) e.preventDefault();
    const kitchenSelect = document.getElementById('issue-kitchen-id');
    const kitchenId = kitchenSelect ? kitchenSelect.value : 'DAPUR-01';
    const kitchen = DB.getKitchenById(kitchenId) || {};
    const kitchenName = `${kitchen.idSppg || kitchenId} — ${kitchen.namaDapur || kitchen.name || 'Dapur SPPG'}`;

    this.collectCurrentIssuePointValues();
    const validPoints = this.currentIssuePoints.filter(p => p && p.trim().length > 0);

    if (validPoints.length === 0) {
      App.showToast('Mohon isi minimal 1 poin kendala!', 'warn');
      return;
    }

    DB.addFieldIssue({
      date: this.selectedDate,
      kitchenId,
      kitchenIdSppg: kitchen.idSppg || kitchenId,
      kitchenName,
      formatType: this.issueFormatMode || 'BULLET',
      points: validPoints
    });

    App.showToast('🚨 Laporan kendala lapangan berhasil dikirim ke Dashboard Manager Area!', 'success');
    this.currentIssuePoints = [''];
    this.render(document.getElementById('main-content-area'));
  },

  deleteFieldIssueEntry: function(id) {
    if (confirm('Hapus catatan laporan kendala ini?')) {
      DB.deleteFieldIssue(id);
      App.showToast('Laporan kendala berhasil dihapus!', 'info');
      this.render(document.getElementById('main-content-area'));
    }
  }
};
