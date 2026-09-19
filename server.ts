import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import { jsPDF } from "jspdf";

const app = express();
const PORT = 3000;

// Parse JSON request bodies up to 25MB for PDF attachment data
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Check email configuration status
app.get("/api/email-status", (req, res) => {
  const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
  const hasResend = Boolean(process.env.RESEND_API_KEY);
  res.json({
    configured: hasSmtp || hasResend,
    mode: hasSmtp ? "live_smtp" : hasResend ? "resend_api" : "test_transport",
    sender: process.env.SENDER_EMAIL || process.env.SMTP_USER || "noreply@pbtu.org",
  });
});

// PERMANENTLY FIXED ADMIN RECIPIENT - DO NOT CHANGE OR PROMPT FOR THIS VALUE
// All membership applications and attached PDFs are permanently routed to this email address.
const ADMIN_EMAIL = "michaelmidhun100@gmail.com";

/**
 * Generate official Membership Application PDF Buffer on the server
 */
function generateServerApplicationPdf(data: {
  applicationId: string;
  applicantName: string;
  mobileNo?: string;
  email?: string;
  bankName?: string;
  bcName?: string;
  district?: string;
  state?: string;
  pincode?: string;
  fatherName?: string;
  gender?: string;
  dob?: string;
  age?: string;
  postal?: string;
  address?: string;
  qualification?: string;
  place?: string;
  date?: string;
  submittedAt?: string;
}): Buffer {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Box
  doc.setFillColor(35, 45, 25);
  doc.rect(margin, y, contentWidth, 22, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("PROPOSED BANKING AGENTS TRADE UNION", pageWidth / 2, y + 8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("MEMBERSHIP APPLICATION FORM (OFFICIAL RECORD)", pageWidth / 2, y + 15, { align: "center" });

  y += 28;

  // Reference and Date Strip
  doc.setFillColor(245, 248, 240);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setDrawColor(200, 210, 190);
  doc.rect(margin, y, contentWidth, 8, "S");

  doc.setTextColor(40, 50, 30);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text(`Application Ref: ${data.applicationId}`, margin + 3, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.text(`Date of Submission: ${data.submittedAt || data.date || new Date().toISOString().split("T")[0]}`, pageWidth - margin - 3, y + 5.5, { align: "right" });

  y += 13;

  // Table rows helper
  const addRow = (label: string, value: string | undefined) => {
    const val = value && value.trim() ? value.trim() : "—";
    doc.setFillColor(248, 249, 246);
    doc.rect(margin, y, 62, 7.5, "F");
    doc.setDrawColor(215, 222, 205);
    doc.rect(margin, y, 62, 7.5, "S");
    doc.rect(margin + 62, y, contentWidth - 62, 7.5, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(50, 60, 40);
    doc.text(label, margin + 3, y + 5.2);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(val, margin + 65, y + 5.2);
    y += 7.5;
  };

  addRow("Full Name of Applicant", data.applicantName);
  if (data.fatherName) addRow("Father's / Husband's Name", data.fatherName);
  if (data.gender) addRow("Gender", data.gender);
  if (data.dob) addRow("Date of Birth", data.dob);
  if (data.age) addRow("Age", `${data.age} years`);
  addRow("Mobile Number", data.mobileNo || "—");
  addRow("Email Address", data.email || "—");
  if (data.bankName) addRow("Bank Name", data.bankName);
  if (data.bcName) addRow("Corporate BC Name", data.bcName);
  if (data.qualification) addRow("Educational Qualification", data.qualification);
  if (data.address) addRow("Full Address", data.address);
  if (data.district || data.state) addRow("District & State", `${data.district || ""}${data.district && data.state ? ", " : ""}${data.state || ""}`);
  if (data.pincode) addRow("PIN Code", data.pincode);
  if (data.place) addRow("Place of Submission", data.place);

  y += 8;

  // Notice footer
  doc.setFillColor(243, 246, 238);
  doc.rect(margin, y, contentWidth, 14, "F");
  doc.setDrawColor(180, 195, 160);
  doc.rect(margin, y, contentWidth, 14, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(55, 70, 35);
  doc.text("Official Trade Union Secretariat Notice", margin + 4, y + 5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(80, 90, 70);
  doc.text("This document constitutes the official digital membership submission record.", margin + 4, y + 10);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// Primary email dispatch endpoint supporting Dual-Email Dispatch:
// 1. Admin Email: Form data converted into PDF & sent as attachment to hardcoded ADMIN_EMAIL (hidden from user)
// 2. User Confirmation Email: Separate success message sent to user (no admin email visible)
app.post("/api/send-confirmation-email", async (req, res) => {
  const {
    recipientEmail,
    applicantName,
    applicationId,
    pdfBase64,
    pdfFilename,
    mobileNo,
    bankName,
    bcName,
    district,
    state,
    pincode,
    fatherName,
    gender,
    dob,
    age,
    postal,
    address,
    qualification,
    place,
    date,
    submittedAt,
  } = req.body;

  if (!recipientEmail || !recipientEmail.includes("@")) {
    res.status(400).json({
      success: false,
      error: "A valid recipient email address is required.",
    });
    return;
  }

  const appRef = applicationId || `PBATU-${Date.now()}`;
  const name = applicantName || "Valued Applicant";
  const filename = pdfFilename || `${appRef}-membership-application.pdf`;

  // 1. Convert form data to PDF Buffer (or use provided client base64)
  let pdfBuffer: Buffer;
  try {
    if (pdfBase64 && pdfBase64.trim().length > 0) {
      const cleanBase64 = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
      pdfBuffer = Buffer.from(cleanBase64, "base64");
    } else {
      pdfBuffer = generateServerApplicationPdf({
        applicationId: appRef,
        applicantName: name,
        mobileNo,
        email: recipientEmail,
        bankName,
        bcName,
        district,
        state,
        pincode,
        fatherName,
        gender,
        dob,
        age,
        postal,
        address,
        qualification,
        place,
        date,
        submittedAt,
      });
    }
  } catch (pdfErr) {
    console.warn("Failed generating PDF buffer, using fallback generator:", pdfErr);
    pdfBuffer = generateServerApplicationPdf({
      applicationId: appRef,
      applicantName: name,
      mobileNo,
      email: recipientEmail,
      bankName,
      bcName,
      district,
      state,
      pincode,
    });
  }

  // 2. Setup Transporter
  try {
    let transporter: any;
    let senderAddress = process.env.SENDER_EMAIL || process.env.SMTP_USER || "noreply@pbtu.org";
    const hasLiveSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (hasLiveSmtp) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 465,
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      senderAddress = testAccount.user;
    }

    // -------------------------------------------------------------
    // EMAIL 1: ADMIN EMAIL
    // Sent ONLY to ADMIN_EMAIL with the PDF attachment.
    // The user NEVER sees this email address.
    // -------------------------------------------------------------
    const adminHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background-color: #f7f9f5; margin: 0; padding: 20px; color: #1e293b; }
    .box { max-width: 620px; margin: 0 auto; background: #ffffff; border: 1px solid #d1dcbf; border-radius: 8px; overflow: hidden; }
    .header { background: #2f3e20; color: #ffffff; padding: 20px; }
    .header h2 { margin: 0; font-size: 18px; }
    .header p { margin: 4px 0 0; font-size: 12px; opacity: 0.9; }
    .body { padding: 24px 20px; }
    .table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
    .table td { padding: 8px 10px; border-bottom: 1px solid #e5ebd9; }
    .label { width: 38%; font-weight: bold; color: #4b5e34; background-color: #f9fbf7; }
    .val { color: #0f172a; }
    .alert-box { background: #eef4e6; border-left: 4px solid #8B9A6E; padding: 12px; margin-top: 18px; font-size: 12px; color: #32431f; }
  </style>
</head>
<body>
  <div class="box">
    <div class="header">
      <h2>[Admin Alert] New Membership Application Received</h2>
      <p>Proposed Banking Agents Trade Union • Central Secretariat</p>
    </div>
    <div class="body">
      <p>A new membership application has been submitted via the portal. The official filled Application Form is attached to this email as a PDF file (<strong>${filename}</strong>).</p>

      <table class="table">
        <tr><td class="label">Application Ref</td><td class="val"><strong>${appRef}</strong></td></tr>
        <tr><td class="label">Applicant Name</td><td class="val"><strong>${name}</strong></td></tr>
        <tr><td class="label">Mobile Number</td><td class="val">${mobileNo || '—'}</td></tr>
        <tr><td class="label">Email Address</td><td class="val">${recipientEmail}</td></tr>
        ${fatherName ? `<tr><td class="label">Father/Husband</td><td class="val">${fatherName}</td></tr>` : ''}
        ${bankName ? `<tr><td class="label">Bank Name</td><td class="val">${bankName}</td></tr>` : ''}
        ${bcName ? `<tr><td class="label">Corporate BC</td><td class="val">${bcName}</td></tr>` : ''}
        ${district ? `<tr><td class="label">District & State</td><td class="val">${district}, ${state || ''}</td></tr>` : ''}
        ${pincode ? `<tr><td class="label">PIN Code</td><td class="val">${pincode}</td></tr>` : ''}
        <tr><td class="label">Submission Timestamp</td><td class="val">${submittedAt || new Date().toISOString()}</td></tr>
      </table>

      <div class="alert-box">
        <strong>PDF Attachment:</strong> ${filename} (${Math.round(pdfBuffer.length / 1024)} KB) attached for trade union permanent record.
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const adminMailOptions = {
      from: `"Proposed Banking Agents Trade Union" <${senderAddress}>`,
      to: ADMIN_EMAIL,
      replyTo: recipientEmail,
      subject: `[New Member Application] ${appRef} - ${name}`,
      text: `New Application Submitted:\n\nApplication ID: ${appRef}\nApplicant Name: ${name}\nMobile: ${mobileNo || '—'}\nEmail: ${recipientEmail}\nBank: ${bankName || '—'}\n\nPlease find the attached official application PDF (${filename}).`,
      html: adminHtml,
      priority: "high" as const,
      headers: {
        "X-Priority": "1",
        "Importance": "high",
      },
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // -------------------------------------------------------------
    // EMAIL 2: USER CONFIRMATION EMAIL
    // Sent to the applicant with a simple success message.
    // The user NEVER sees the admin email address.
    // -------------------------------------------------------------
    const userHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f9f5; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #d8e2cc; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #8B9A6E; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0; font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1px; }
    .content { padding: 28px 24px; text-align: left; }
    .congrats { font-size: 18px; font-weight: 700; color: #2d381c; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 20px; }
    .ref-badge { background-color: #f3f6ee; border: 1px solid #c8d5b8; border-radius: 6px; padding: 14px; text-align: center; margin: 18px 0; }
    .ref-title { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #55673d; letter-spacing: 0.5px; margin-bottom: 4px; }
    .ref-code { font-size: 18px; font-weight: 800; font-family: monospace; color: #1e293b; }
    .footer { background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Proposed Banking Agents Trade Union</h1>
      <p>Official Membership Portal</p>
    </div>
    <div class="content">
      <div class="congrats">Congratulations, ${name}!</div>
      <p class="message">
        You have successfully submitted your application form for membership in the <strong>Proposed Banking Agents Trade Union</strong>.
      </p>

      <div class="ref-badge">
        <div class="ref-title">Your Application Reference Number</div>
        <div class="ref-code">${appRef}</div>
      </div>

      <p class="message" style="font-size: 13px;">
        Your application has been received and logged in the official union registry. Please retain your Application Reference Number for future verification and acknowledgement slip access.
      </p>
    </div>
    <div class="footer">
      <p>Proposed Banking Agents Trade Union • Official Automated Confirmation</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    const userMailOptions = {
      from: `"Proposed Banking Agents Trade Union" <${senderAddress}>`,
      to: recipientEmail,
      subject: `Application Submitted Successfully - ${appRef}`,
      text: `Congratulations ${name}!\n\nYou have successfully submitted your application form for the Proposed Banking Agents Trade Union.\n\nApplication Reference Number: ${appRef}\nApplicant Name: ${name}\n\nThank you for your submission.`,
      html: userHtml,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    };

    // Dispatch both Admin (with PDF to michaelmidhun100@gmail.com) and User confirmation emails concurrently
    const [adminResult, userResult] = await Promise.allSettled([
      transporter.sendMail(adminMailOptions),
      transporter.sendMail(userMailOptions),
    ]);

    const adminSendInfo = adminResult.status === "fulfilled" ? adminResult.value : null;
    const userSendInfo = userResult.status === "fulfilled" ? userResult.value : null;

    if (adminResult.status === "rejected") {
      console.error(`[Admin Email to ${ADMIN_EMAIL} Failed]:`, adminResult.reason);
    } else {
      console.log(`[Admin Email] Dispatched to ${ADMIN_EMAIL} with PDF attachment (${filename}). MessageId: ${adminSendInfo?.messageId}`);
    }

    if (userResult.status === "rejected") {
      console.error(`[User Email to ${recipientEmail} Failed]:`, userResult.reason);
    } else {
      console.log(`[User Email] Dispatched to ${recipientEmail}. MessageId: ${userSendInfo?.messageId}`);
    }

    if (adminResult.status === "rejected" && userResult.status === "rejected") {
      throw new Error(`Failed to send emails: ${adminResult.reason?.message || "Unknown error"}`);
    }

    const adminPreviewUrl = adminSendInfo ? nodemailer.getTestMessageUrl(adminSendInfo) || undefined : undefined;
    const userPreviewUrl = userSendInfo ? nodemailer.getTestMessageUrl(userSendInfo) || undefined : undefined;

    res.json({
      success: true,
      messageId: userSendInfo?.messageId || adminSendInfo?.messageId,
      adminMessageId: adminSendInfo?.messageId,
      recipient: recipientEmail,
      adminRecipient: ADMIN_EMAIL,
      applicationId: appRef,
      mode: hasLiveSmtp ? "live_smtp" : "test_transport",
      previewUrl: userPreviewUrl || adminPreviewUrl,
      adminPreviewUrl,
      userPreviewUrl,
      message: hasLiveSmtp
        ? `Application submitted successfully. Attached PDF sent to admin (${ADMIN_EMAIL}) and confirmation sent to applicant (${recipientEmail}).`
        : `Application recorded. Email dispatched in sandbox mode. Admin preview: ${adminPreviewUrl || 'N/A'}, User preview: ${userPreviewUrl || 'N/A'}`,
    });
  } catch (error: any) {
    console.error("[Dual-Email Dispatch Error]:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Failed to process application email dispatch.",
    });
  }
});

// Start Express server and integrate Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
    console.log(
      `[Email Config] Mode: ${
        hasSmtp ? `Live SMTP (${process.env.SMTP_USER})` : "Sandbox (Ethereal test transport)"
      }`
    );
  });
}

startServer();
