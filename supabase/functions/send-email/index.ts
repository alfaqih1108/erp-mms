// ============================================================================
// SUPABASE EDGE FUNCTION: send-email (Gmail SMTP via Google App Password)
// ============================================================================
import nodemailer from "npm:nodemailer@6.9.13";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EmailNotificationPayload {
  to: string;
  recipientName?: string;
  subject: string;
  notificationType?: string;
  title?: string;
  summaryText?: string;
  details?: Record<string, string | number>;
  actionUrl?: string;
  actionButtonText?: string;
}

Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload: EmailNotificationPayload = await req.json();

    if (!payload.to || !payload.subject) {
      return new Response(
        JSON.stringify({ success: false, error: "Parameter 'to' (email penerima) dan 'subject' wajib diisi." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smtpUser = (Deno.env.get("SMTP_USER") || "").trim();
    const smtpPass = (Deno.env.get("SMTP_PASS") || "").replace(/\s+/g, "").trim();
    const senderName = Deno.env.get("SENDER_NAME") || "ERP MMS Yayasan";

    if (!smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Secrets belum lengkap di Supabase Dashboard. SMTP_USER: ${smtpUser ? 'Terisi (' + smtpUser + ')' : 'KOSONG'}, SMTP_PASS: ${smtpPass ? 'Terisi (16 Digit)' : 'KOSONG'}. Silakan periksa di Supabase ➔ Edge Functions ➔ Secrets.`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure Nodemailer Transporter with Gmail Service
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Generate Rich HTML Template
    const htmlContent = generateEmailHtml(payload, senderName);

    // Send Mail
    const info = await transporter.sendMail({
      from: `"${senderName}" <${smtpUser}>`,
      to: payload.to,
      subject: payload.subject.startsWith("[ERP MMS]") ? payload.subject : `[ERP MMS] ${payload.subject}`,
      html: htmlContent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        messageId: info.messageId,
        recipient: payload.to,
        sender: smtpUser,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Gmail SMTP Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Gagal mengirim email via Gmail SMTP",
        detail: error.response || error.code || String(error),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper: Generate Corporate Responsive HTML Email
function generateEmailHtml(data: EmailNotificationPayload, senderName: string): string {
  const detailsHtml = data.details
    ? Object.entries(data.details)
        .map(
          ([key, value]) => `
          <tr>
            <td style="padding: 9px 12px; border-bottom: 1px solid #2D3748; color: #A0AEC0; font-size: 12.5px; font-weight: 500;">${key}</td>
            <td style="padding: 9px 12px; border-bottom: 1px solid #2D3748; color: #FFFFFF; font-size: 13px; font-weight: 600; text-align: right;">${value}</td>
          </tr>`
        )
        .join("")
    : "";

  const actionButton = data.actionUrl
    ? `
    <div style="text-align: center; margin: 32px 0 20px 0;">
      <a href="${data.actionUrl}" target="_blank" style="background: linear-gradient(135deg, #2563EB 0%, #3B82F6 100%); color: #FFFFFF; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 13.5px; font-weight: 700; display: inline-block; box-shadow: 0 4px 14px rgba(37,99,235,0.4);">
        ${data.actionButtonText || "Buka & Tinjau di ERP MMS"} →
      </a>
    </div>`
    : "";

  const title = data.title || data.subject;
  const summary = data.summaryText || "Terdapat aktivitas notifikasi baru pada sistem ERP Yayasan.";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${data.subject}</title>
  </head>
  <body style="margin: 0; padding: 24px 12px; background-color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 560px; margin: 0 auto; background: #1E293B; border: 1px solid #334155; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.45);">
      
      <!-- Top Brand Header -->
      <div style="background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%); padding: 24px; border-bottom: 1px solid #334155; text-align: center;">
        <div style="display: inline-block; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
          🏢 <span style="color: #60A5FA;">ERP</span> MMS YAYASAN
        </div>
        <div style="font-size: 11px; color: #94A3B8; margin-top: 4px; letter-spacing: 0.5px; text-transform: uppercase;">
          Sistem Informasi Manajemen Terpadu & SPPG
        </div>
      </div>

      <!-- Main Body -->
      <div style="padding: 28px 24px;">
        <div style="font-size: 13px; color: #94A3B8; margin-bottom: 6px;">
          Halo, <strong style="color: #F1F5F9;">${data.recipientName || "Bapak/Ibu"}</strong>
        </div>

        <h2 style="font-size: 18px; font-weight: 700; color: #FFFFFF; margin: 0 0 14px 0; line-height: 1.4;">
          ${title}
        </h2>

        <p style="font-size: 13.5px; color: #CBD5E1; line-height: 1.6; margin: 0 0 22px 0;">
          ${summary}
        </p>

        <!-- Details Box -->
        ${
          detailsHtml
            ? `
        <div style="background: #0F172A; border: 1px solid #334155; border-radius: 10px; padding: 6px 14px; margin-bottom: 24px;">
          <table style="width: 100%; border-collapse: collapse;">
            ${detailsHtml}
          </table>
        </div>`
            : ""
        }

        ${actionButton}

        <div style="border-top: 1px solid #334155; margin-top: 28px; padding-top: 16px; font-size: 11px; color: #64748B; line-height: 1.5; text-align: center;">
          Email ini dikirimkan secara otomatis oleh sistem <strong>${senderName}</strong>.<br>
          Mohon tidak membalas langsung ke email ini.
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}
