/**
 * ERP MMS v3 - Supabase Client Configuration & Hybrid Cloud Sync
 * Menghubungkan Frontend Vanilla JS dengan Backend Supabase (PostgreSQL & Edge Functions)
 */

// Otomatis bersihkan cache versi lama (V1 - V21) untuk membebaskan kuota LocalStorage browser (5MB)
(function cleanStaleLocalStorage() {
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ERP_YAYASAN_DATABASE_V') && k !== 'ERP_YAYASAN_DATABASE_V22') {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
    if (keysToRemove.length > 0) {
      console.log(`[Storage Cleanup] Berhasil membebaskan kuota localStorage (dihapus ${keysToRemove.length} cache lama).`);
    }
  } catch (e) {
    console.warn('Storage cleanup notice:', e);
  }
})();

window.SupabaseConfig = {
  // Default URL & Anon Public Key proyek Supabase Produksi Yayasan
  DEFAULT_URL: 'https://nqppaneieqknrellyugc.supabase.co',
  DEFAULT_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xcHBhbmVpZXFrbnJlbGx5dWdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0OTE0MzcslmV4cCI6MjEwMzA2NzQzN30.Jdal9seSqTU_KWjLQKEUOb8QMvR9BOr9daaiDak6-ik',

  STORAGE_KEY_URL: 'ERP_SUPABASE_URL',
  STORAGE_KEY_ANON: 'ERP_SUPABASE_ANON_KEY',

  client: null,
  inMemoryUrl: '',
  inMemoryKey: '',

  getUrl: function() {
    return this.inMemoryUrl || localStorage.getItem(this.STORAGE_KEY_URL) || this.DEFAULT_URL || '';
  },

  getAnonKey: function() {
    return this.inMemoryKey || localStorage.getItem(this.STORAGE_KEY_ANON) || this.DEFAULT_ANON_KEY || '';
  },

  isConfigured: function() {
    const url = this.getUrl();
    const key = this.getAnonKey();
    return Boolean(url && key && url.startsWith('https://') && key.length > 20);
  },

  init: function() {
    if (this.isConfigured() && window.supabase && typeof window.supabase.createClient === 'function') {
      try {
        this.client = window.supabase.createClient(this.getUrl(), this.getAnonKey(), {
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        });
        console.log('✅ Supabase Client initialized successfully via SDK.');
      } catch (err) {
        console.warn('⚠️ Gagal inisialisasi Supabase SDK client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
    return this.client;
  },

  getClient: function() {
    if (!this.client && this.isConfigured()) {
      return this.init();
    }
    return this.client;
  },

  setCredentials: function(url, anonKey) {
    const cleanUrl = url ? url.trim().replace(/\/+$/, '') : '';
    const cleanKey = anonKey ? anonKey.trim() : '';

    this.inMemoryUrl = cleanUrl;
    this.inMemoryKey = cleanKey;

    try {
      if (cleanUrl) localStorage.setItem(this.STORAGE_KEY_URL, cleanUrl);
      if (cleanKey) localStorage.setItem(this.STORAGE_KEY_ANON, cleanKey);
    } catch (e) {
      console.warn('LocalStorage kuota penuh, membersihkan cache lama...', e);
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (k && k.startsWith('ERP_YAYASAN_DATABASE_V')) {
            localStorage.removeItem(k);
          }
        }
        if (cleanUrl) localStorage.setItem(this.STORAGE_KEY_URL, cleanUrl);
        if (cleanKey) localStorage.setItem(this.STORAGE_KEY_ANON, cleanKey);
      } catch (err2) {
        console.warn('LocalStorage tetap penuh, kredensial disimpan di memori sesi.');
      }
    }

    this.init();
    return this.isConfigured();
  },

  clearCredentials: function() {
    this.inMemoryUrl = '';
    this.inMemoryKey = '';
    try {
      localStorage.removeItem(this.STORAGE_KEY_URL);
      localStorage.removeItem(this.STORAGE_KEY_ANON);
    } catch (e) {}
    this.client = null;
  },

  // Helper Pengiriman Email Notifikasi via Supabase Edge Function (Gmail SMTP)
  sendEmailNotification: async function(payload) {
    if (!this.isConfigured()) {
      console.log('ℹ️ Supabase belum dikonfigurasi. Simulasi notifikasi email ke:', payload?.to);
      return { success: true, simulated: true };
    }

    if (!payload || !payload.to || !payload.to.includes('@')) {
      console.warn('⚠️ [Email Dispatch Dibatalkan] Alamat email penerima tidak valid:', payload?.to);
      return { success: false, error: 'Email tujuan tidak valid' };
    }

    const url = this.getUrl();
    const key = this.getAnonKey();
    const endpoints = [
      `${url}/functions/v1/quick-action`,
      `${url}/functions/v1/send-email`
    ];

    let lastError = null;
    for (const ep of endpoints) {
      try {
        console.log(`[Email Dispatch] Mengirim ke ${ep} untuk ${payload.to}...`);
        const res = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const json = await res.json().catch(() => ({ success: true }));
          console.log('✅ [Email Dispatch Berhasil] Terkirim ke:', payload.to, json);
          return { success: true, data: json };
        } else {
          const errText = await res.text().catch(() => '');
          console.warn(`⚠️ [Email Dispatch ${ep} HTTP ${res.status}]`, errText);
          lastError = errText;
        }
      } catch (e) {
        console.warn(`⚠️ [Email Dispatch ${ep} Exception]`, e.message);
        lastError = e.message;
      }
    }

    return { success: false, error: lastError };
  },

  // Direct Live Diagnostic Email Tester
  testDirectEmailSend: async function(targetEmail) {
    if (!this.isConfigured()) {
      return { success: false, message: 'Supabase belum dikonfigurasi. Harap isi URL dan Anon Key terlebih dahulu.' };
    }

    const emailTo = (targetEmail || 'alfaqih1108@gmail.com').trim();
    const url = this.getUrl();
    const key = this.getAnonKey();

    const payload = {
      to: emailTo,
      recipientName: "Bapak Muhammad Alfaqih (Direktur Operasional)",
      subject: "Tes Koneksi Notifikasi Email Gmail SMTP ERP MMS",
      title: "Uji Coba Sistem Notifikasi Email Otomatis",
      summaryText: "Selamat! Sistem pengiriman email notifikasi otomatis ERP Yayasan & SPPG via Gmail SMTP Supabase Edge Functions telah BERHASIL terhubung dan aktif 100%.",
      details: {
        "Status Server": "Online & Terhubung (200 OK)",
        "Metode Pengiriman": "Google SMTP SSL (Port 465)",
        "Waktu Pengujian": new Date().toLocaleString("id-ID"),
        "Tujuan Email": emailTo
      },
      actionUrl: window.location.href,
      actionButtonText: "Buka Portal ERP MMS"
    };

    const endpoints = [
      `${url}/functions/v1/quick-action`,
      `${url}/functions/v1/send-email`
    ];

    let lastError = '';
    for (const ep of endpoints) {
      try {
        console.log(`[Email Test] Mencoba memanggil endpoint ${ep}...`);
        const res = await fetch(ep, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': key,
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify(payload)
        });

        let json = null;
        try {
          json = await res.json();
        } catch(e) {
          const rawText = await res.text();
          json = { error: rawText };
        }

        if (res.ok && json.success) {
          return {
            success: true,
            message: `✅ Email Berhasil Terkirim ke ${emailTo}! (Message ID: ${json.messageId || 'OK'}). Silakan periksa inbox / spam Gmail Anda.`
          };
        } else {
          lastError = (json && json.error) ? json.error : `HTTP Status ${res.status}`;
        }
      } catch (err) {
        lastError = err.message;
      }
    }

    return {
      success: false,
      message: `❌ Gagal Kirim: ${lastError}`
    };
  },

  // Test Koneksi ke Supabase Database menggunakan PostgREST API
  testConnection: async function(overrideUrl = null, overrideKey = null) {
    const url = (overrideUrl || this.getUrl() || '').trim().replace(/\/+$/, '');
    const key = (overrideKey || this.getAnonKey() || '').trim();

    if (!url || !key) {
      return { success: false, message: 'Harap isi Project URL dan Anon Key terlebih dahulu.' };
    }

    try {
      // 1. Tes langsung via REST API ke tabel 'users'
      const endpoint = `${url}/rest/v1/users?select=id,name&limit=1`;
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Range': '0-0'
        }
      });

      if (response.ok) {
        const data = await response.json();
        this.setCredentials(url, key);
        return { 
          success: true, 
          message: `Koneksi Berhasil! Database Supabase terhubung aktif (${Array.isArray(data) ? data.length + ' data karyawan terverifikasi' : 'OK'}).` 
        };
      } else {
        const errText = await response.text();
        return { 
          success: false, 
          message: `Gagal Terhubung (HTTP ${response.status}): ${errText || 'Kunci Anon API Key tidak valid.'}` 
        };
      }
    } catch (err) {
      console.error('Test Connection Error:', err);
      const isFailedFetch = err.message && err.message.includes('fetch');
      return { 
        success: false, 
        message: isFailedFetch
          ? `Gagal Menghubungi Supabase (Failed to fetch). Pastikan koneksi internet aktif dan Project URL benar.`
          : `Error: ${err.message}` 
      };
    }
  }
};

// Inisialisasi awal saat script dimuat
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.SupabaseConfig.init());
} else {
  window.SupabaseConfig.init();
}
