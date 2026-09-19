import nodemailer from 'nodemailer';
import { jsPDF } from 'jspdf';

// PERMANENTLY FIXED ADMIN RECIPIENT - DO NOT CHANGE OR PROMPT FOR THIS VALUE
const ADMIN_EMAIL = 'michaelmidhun100@gmail.com';

/**
 * Netlify Serverless Function Handler
 * Supports Dual-Email Dispatch:
 * 1. Admin Email: Form data converted to PDF and sent as attachment to hardcoded ADMIN_EMAIL.
 * 2. User Confirmation Email: Separate email sent to applicant with simple success message (zero admin email visibility).
 */
export const handler = async (event: any, _context: any) => {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method Not Allowed. Use POST.' }),
    };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
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
      qualification,
      address,
      place,
      date,
      submittedAt,
    } = payload;

    if (!recipientEmail || !recipientEmail.includes('@')) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'A valid recipient email address is required.',
        }),
      };
    }

    const appRef = applicationId || `PBATU-${Date.now()}`;
    const name = applicantName || 'Valued Applicant';
    const filename = pdfFilename || `${appRef}-membership-application.pdf`;

    // 1. Convert form data into PDF attachment buffer
    let pdfBuffer: Buffer;
    if (pdfBase64 && pdfBase64.trim().length > 0) {
      const cleanBase64 = pdfBase64.includes(',') ? pdfBase64.split(',')[1] : pdfBase64;
      pdfBuffer = Buffer.from(cleanBase64, 'base64');
    } else {
      // Server-side PDF generation using jsPDF
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentWidth = pageWidth - margin * 2;
      let y = 16;

      // Header Banner
      doc.setFillColor(35, 45, 25);
      doc.rect(margin, y, contentWidth, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('PROPOSED BANKING AGENTS TRADE UNION', pageWidth / 2, y + 8, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text('MEMBERSHIP APPLICATION FORM (OFFICIAL RECORD)', pageWidth / 2, y + 15, { align: 'center' });

      y += 28;

      // Ref box
      doc.setFillColor(245, 248, 240);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setDrawColor(200, 210, 190);
      doc.rect(margin, y, contentWidth, 8, 'S');
      doc.setTextColor(40, 50, 30);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(`Application Ref: ${appRef}`, margin + 3, y + 5.5);
      doc.setFont('helvetica', 'normal');
      doc.text(`Date: ${submittedAt || date || new Date().toLocaleDateString('en-IN')}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });

      y += 13;

      const addRow = (label: string, value: string | undefined) => {
        const val = value && value.trim() ? value.trim() : '—';
        doc.setFillColor(248, 249, 246);
        doc.rect(margin, y, 62, 7.5, 'F');
        doc.setDrawColor(215, 222, 205);
        doc.rect(margin, y, 62, 7.5, 'S');
        doc.rect(margin + 62, y, contentWidth - 62, 7.5, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(50, 60, 40);
        doc.text(label, margin + 3, y + 5.2);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(20, 20, 20);
        doc.text(val, margin + 65, y + 5.2);
        y += 7.5;
      };

      addRow('Full Name of Applicant', name);
      if (fatherName) addRow("Father's / Husband's Name", fatherName);
      if (gender) addRow('Gender', gender);
      if (dob) addRow('Date of Birth', dob);
      if (age) addRow('Age', `${age} years`);
      addRow('Mobile Number', mobileNo || '—');
      addRow('Email Address', recipientEmail);
      if (bankName) addRow('Bank Name', bankName);
      if (bcName) addRow('Corporate BC Name', bcName);
      if (qualification) addRow('Educational Qualification', qualification);
      if (address) addRow('Full Address', address);
      if (district || state) addRow('District & State', `${district || ''}${district && state ? ', ' : ''}${state || ''}`);
      if (pincode) addRow('PIN Code', pincode);
      if (place) addRow('Place of Submission', place);

      const arrayBuffer = doc.output('arraybuffer');
      pdfBuffer = Buffer.from(arrayBuffer);
    }

    // 2. Transporter configuration
    let transporter: any;
    let senderAddress = process.env.SENDER_EMAIL || process.env.SMTP_USER || 'noreply@pbtu.org';
    const hasLiveSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

    if (hasLiveSmtp) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
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
        host: 'smtp.ethereal.email',
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
    // EMAIL 1: ADMIN EMAIL (Form converted to PDF attachment)
    // Sent ONLY to ADMIN_EMAIL. The user NEVER sees this email.
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
      <p style="margin:4px 0 0; font-size:12px; opacity:0.9;">Proposed Banking Agents Trade Union</p>
    </div>
    <div class="body">
      <p>A new membership application has been submitted. The official filled Application Form is attached as a PDF (<strong>${filename}</strong>).</p>
      <table class="table">
        <tr><td class="label">Application Ref</td><td class="val"><strong>${appRef}</strong></td></tr>
        <tr><td class="label">Applicant Name</td><td class="val"><strong>${name}</strong></td></tr>
        <tr><td class="label">Mobile Number</td><td class="val">${mobileNo || '—'}</td></tr>
        <tr><td class="label">Email Address</td><td class="val">${recipientEmail}</td></tr>
        ${bankName ? `<tr><td class="label">Bank Name</td><td class="val">${bankName}</td></tr>` : ''}
        ${district ? `<tr><td class="label">District & State</td><td class="val">${district}, ${state || ''}</td></tr>` : ''}
      </table>
      <div class="alert-box">
        <strong>PDF Attachment:</strong> ${filename} (${Math.round(pdfBuffer.length / 1024)} KB) attached for union records.
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();

    const adminMailOptions = {
      from: `"Proposed Banking Agents Trade Union" <${senderAddress}>`,
      to: ADMIN_EMAIL,
      subject: `[New Member Application] ${appRef} - ${name}`,
      text: `New Application Submitted:\n\nApplication ID: ${appRef}\nApplicant: ${name}\nMobile: ${mobileNo || '—'}\nEmail: ${recipientEmail}\n\nAttached is the converted application PDF (${filename}).`,
      html: adminHtml,
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    };

    const adminSendInfo = await transporter.sendMail(adminMailOptions);

    // -------------------------------------------------------------
    // EMAIL 2: USER CONFIRMATION EMAIL (Simple Success Message)
    // Sent ONLY to the applicant. The user NEVER sees the admin email.
    // -------------------------------------------------------------
    const userHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7f9f5; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #d8e2cc; border-radius: 8px; overflow: hidden; }
    .header { background: #8B9A6E; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 800; }
    .content { padding: 28px 24px; }
    .congrats { font-size: 18px; font-weight: 700; color: #2d381c; margin-bottom: 12px; }
    .message { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 18px; }
    .ref-badge { background-color: #f3f6ee; border: 1px solid #c8d5b8; border-radius: 6px; padding: 14px; text-align: center; margin: 16px 0; }
    .ref-code { font-size: 18px; font-weight: 800; font-family: monospace; color: #1e293b; }
    .footer { background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Proposed Banking Agents Trade Union</h1>
      <p style="margin:4px 0 0; font-size:11px; opacity:0.9; text-transform:uppercase;">Official Membership Portal</p>
    </div>
    <div class="content">
      <div class="congrats">Congratulations, ${name}!</div>
      <p class="message">
        Congratulations! You have successfully submitted your application form for the Proposed Banking Agents Trade Union.
      </p>
      <div class="ref-badge">
        <div style="font-size:10px; font-weight:700; text-transform:uppercase; color:#55673d; margin-bottom:4px;">Application Reference Number</div>
        <div class="ref-code">${appRef}</div>
      </div>
      <p class="message" style="font-size:13px;">
        Your membership application has been recorded in the union registry. Please keep your Application Reference Number for your records.
      </p>
    </div>
    <div class="footer">
      Proposed Banking Agents Trade Union • Automated Notification
    </div>
  </div>
</body>
</html>
    `.trim();

    const userMailOptions = {
      from: `"Proposed Banking Agents Trade Union" <${senderAddress}>`,
      to: recipientEmail,
      subject: `Application Submitted Successfully - ${appRef}`,
      text: `Congratulations ${name}!\n\nCongratulations! You have successfully submitted your application form for the Proposed Banking Agents Trade Union.\n\nApplication Reference Number: ${appRef}\nApplicant Name: ${name}\n\nThank you for submitting your application.`,
      html: userHtml,
    };

    const userSendInfo = await transporter.sendMail(userMailOptions);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        message: 'Both admin and user emails dispatched successfully.',
        applicationId: appRef,
        recipient: recipientEmail,
        userMessageId: userSendInfo.messageId,
        adminMessageId: adminSendInfo.messageId,
      }),
    };
  } catch (error: any) {
    console.error('Netlify Function Dispatch Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal Server Error during email dispatch.',
      }),
    };
  }
};
