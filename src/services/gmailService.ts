import { SubmittedApplication } from '../types';

// PERMANENTLY FIXED ADMIN RECIPIENT - DO NOT CHANGE OR PROMPT FOR THIS VALUE
export const TARGET_GMAIL_RECIPIENT = 'michaelmidhun100@gmail.com';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  recipient?: string;
  error?: string;
  method?: 'gmail_api' | 'webmail_client' | 'saved_record';
}

export interface SentEmailRecord {
  to: string;
  applicationId: string;
  applicantName: string;
  subject: string;
  sentAt: string;
  pdfFilename: string;
  status: 'sent' | 'prepared';
  congratsMessage: string;
}

/**
 * Creates a raw RFC 2822 MIME message with an attached PDF
 */
function buildMimeMessage(
  to: string,
  bcc: string | undefined,
  subject: string,
  htmlContent: string,
  pdfBase64: string,
  pdfFilename: string
): string {
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const crlf = '\r\n';

  const utf8Subject = btoa(unescape(encodeURIComponent(subject)));

  let mime = '';
  mime += `To: ${to}${crlf}`;
  if (bcc && bcc !== to) {
    mime += `Bcc: ${bcc}${crlf}`;
  }
  mime += `Subject: =?UTF-8?B?${utf8Subject}?=${crlf}`;
  mime += `MIME-Version: 1.0${crlf}`;
  mime += `Content-Type: multipart/mixed; boundary="${boundary}"${crlf}${crlf}`;

  // Part 1: HTML Body
  mime += `--${boundary}${crlf}`;
  mime += `Content-Type: text/html; charset="UTF-8"${crlf}`;
  mime += `Content-Transfer-Encoding: 7bit${crlf}${crlf}`;
  mime += htmlContent + crlf + crlf;

  // Part 2: PDF Attachment
  mime += `--${boundary}${crlf}`;
  mime += `Content-Type: application/pdf; name="${pdfFilename}"${crlf}`;
  mime += `Content-Disposition: attachment; filename="${pdfFilename}"${crlf}`;
  mime += `Content-Transfer-Encoding: base64${crlf}${crlf}`;

  // Split base64 into 76-character chunks
  const chunkLength = 76;
  for (let i = 0; i < pdfBase64.length; i += chunkLength) {
    mime += pdfBase64.substring(i, i + chunkLength) + crlf;
  }
  mime += crlf;

  // End boundary
  mime += `--${boundary}--`;

  // URL-safe base64 encoding (RFC 4648 § 5)
  return btoa(unescape(encodeURIComponent(mime)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Builds the official applicant confirmation HTML email with congratulations message,
 * application number, and official application details.
 */
export function buildApplicantEmailHtml(
  application: SubmittedApplication,
  pdfFilename: string
): string {
  const congratsText = `Congratulations ${application.name}! Your membership application for Proposed Banking Agents Trade Union has been successfully submitted and verified.`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #1c2415; margin: 0; padding: 0; background-color: #f7f8f5; }
    .wrapper { max-width: 620px; margin: 20px auto; background: #ffffff; border: 1px solid #d9e2cb; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
    .header { background: #8B9A6E; color: #ffffff; padding: 24px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; }
    .header p { margin: 6px 0 0 0; font-size: 13px; color: #f1f5eb; font-weight: 500; }
    .content { padding: 24px 20px; }
    .congrats-card { background: #f3f6ee; border: 1.5px solid #8B9A6E; border-radius: 8px; padding: 18px 20px; text-align: center; margin-bottom: 22px; }
    .congrats-title { color: #43512b; font-size: 18px; font-weight: 800; margin: 0 0 6px 0; }
    .congrats-msg { color: #2e3b1c; font-size: 14px; margin: 0; line-height: 1.5; }
    .app-number-box { margin-top: 14px; display: inline-block; background: #ffffff; border: 1.5px dashed #8B9A6E; border-radius: 6px; padding: 8px 18px; }
    .app-number-label { font-size: 11px; text-transform: uppercase; font-weight: 700; color: #697850; display: block; letter-spacing: 0.5px; }
    .app-number-value { font-size: 18px; font-weight: 800; color: #1f2a12; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; letter-spacing: 1px; }
    .pdf-notice { background: #eaf0e2; border-left: 4px solid #8B9A6E; border-radius: 4px; padding: 12px 14px; font-size: 13px; color: #2e3a19; margin-bottom: 22px; }
    .pdf-notice strong { color: #1b260d; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; border: 1px solid #e0e7d6; }
    th, td { border: 1px solid #e0e7d6; padding: 9px 12px; text-align: left; }
    th { background: #f6f8f2; width: 36%; color: #4b5a34; font-weight: 700; }
    td { color: #222c15; }
    .badge-ticked { background: #e6f3d9; color: #2e6616; padding: 3px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; display: inline-block; border: 1px solid #c8e3b2; }
    .footer { background: #fafbf9; padding: 16px 20px; font-size: 11px; color: #728062; border-top: 1px solid #e4ecda; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>Proposed Banking Agents Trade Union</h1>
      <p>Official Membership Application Confirmation</p>
    </div>

    <div class="content">
      <div class="congrats-card">
        <div class="congrats-title">🎉 Congratulations, ${application.name}!</div>
        <p class="congrats-msg">${congratsText}</p>
        <div class="app-number-box">
          <span class="app-number-label">Application Reference Number</span>
          <span class="app-number-value">${application.applicationId}</span>
        </div>
      </div>

      <div class="pdf-notice">
        <strong>Attached Official PDF Form:</strong> Your official signed <strong>Membership Application Form (${pdfFilename})</strong> has been generated and attached to this email for your official records and union verification.
      </div>

      <div style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #45532c; margin-bottom: 8px;">
        Registered Application Particulars
      </div>

      <table>
        <tr><th>Application ID</th><td><strong style="font-family: monospace;">${application.applicationId}</strong></td></tr>
        <tr><th>Applicant Name</th><td><strong>${application.name}</strong></td></tr>
        <tr><th>Father's / Husband's Name</th><td>${application.fatherName}</td></tr>
        <tr><th>Gender</th><td>${application.gender}</td></tr>
        <tr><th>Date of Birth & Age</th><td>${application.dob} (${application.age} Years)</td></tr>
        <tr><th>Qualification</th><td>${application.qualification}</td></tr>
        <tr><th>Mobile Number</th><td>+91 ${application.mobileNo}</td></tr>
        <tr><th>Registered Email</th><td>${application.email || '-'}</td></tr>
        <tr><th>Address</th><td>${application.address}</td></tr>
        <tr><th>Post Office / Postal</th><td>${application.postal || 'N/A'}</td></tr>
        <tr><th>District & State</th><td>${[application.district, application.state].filter(Boolean).join(', ')}</td></tr>
        <tr><th>PIN Code</th><td>${application.pincode}</td></tr>
        <tr><th>Place & Date</th><td>${application.place} • ${application.date}</td></tr>
        <tr><th>Submission Time</th><td>${application.submittedAt}</td></tr>
        <tr><th>Voluntary Declaration</th><td><span class="badge-ticked">&#10003; Voluntary Consent Ticked & Confirmed</span></td></tr>
        <tr><th>Official Document</th><td><strong>${pdfFilename}</strong> (PDF Form)</td></tr>
      </table>

      <div style="margin-top: 20px; padding: 14px; background: #ffffff; border: 1px solid #d9e2cb; border-radius: 6px; font-size: 12px; color: #4b5837;">
        <strong>Notice:</strong> Please preserve your Application Reference Number (<strong>${application.applicationId}</strong>) and the attached PDF form for all future union communications, identity cards, and membership proceedings.
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 4px 0;"><strong>Proposed Banking Agents Trade Union</strong></p>
      <p style="margin: 0;">This official automated confirmation was dispatched to ${application.email || 'your registered email'}. Secretariat copy transmitted to ${TARGET_GMAIL_RECIPIENT}.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Saves a local dispatch record of the sent email for user confirmation
 */
export function recordSentEmail(record: SentEmailRecord) {
  try {
    const existingStr = localStorage.getItem('pbtu_sent_emails');
    const records: SentEmailRecord[] = existingStr ? JSON.parse(existingStr) : [];
    records.unshift(record);
    localStorage.setItem('pbtu_sent_emails', JSON.stringify(records.slice(0, 30)));
  } catch {
    // Ignore storage issues
  }
}

/**
 * Retrieves all sent email records
 */
export function getSentEmailRecords(): SentEmailRecord[] {
  try {
    const existingStr = localStorage.getItem('pbtu_sent_emails');
    return existingStr ? JSON.parse(existingStr) : [];
  } catch {
    return [];
  }
}

/**
 * Sends the official application confirmation email with attached PDF, congratulations message,
 * and application number to the user-provided email address (and copies the secretariat).
 */
export async function sendApplicationPdfToGmail(
  accessToken: string | null | undefined,
  application: SubmittedApplication,
  pdfBase64: string,
  pdfFilename: string,
  targetUserEmail?: string
): Promise<SendEmailResult> {
  const userRecipient = (targetUserEmail || application.email || '').trim();
  const recipient = userRecipient || TARGET_GMAIL_RECIPIENT;
  const bcc = userRecipient ? TARGET_GMAIL_RECIPIENT : undefined;

  const subject = `🎉 Congratulations! Your Membership Application #${application.applicationId} - Proposed Banking Agents Trade Union`;
  const htmlContent = buildApplicantEmailHtml(application, pdfFilename);
  const congratsMsg = `Congratulations ${application.name}! Your membership application for Proposed Banking Agents Trade Union has been successfully submitted and verified.`;

  // Always log a local record
  recordSentEmail({
    to: recipient,
    applicationId: application.applicationId,
    applicantName: application.name,
    subject,
    sentAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    pdfFilename,
    status: accessToken ? 'sent' : 'prepared',
    congratsMessage: congratsMsg,
  });

  if (!accessToken) {
    return {
      success: true,
      recipient,
      method: 'saved_record',
    };
  }

  try {
    const rawMessage = buildMimeMessage(recipient, bcc, subject, htmlContent, pdfBase64, pdfFilename);

    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: rawMessage }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Gmail API Error HTTP ${res.status}`);
    }

    const data = await res.json();
    return {
      success: true,
      messageId: data.id,
      recipient,
      method: 'gmail_api',
    };
  } catch (err: any) {
    console.warn('Gmail API dispatch attempt:', err?.message);
    return {
      success: false,
      recipient,
      error: err?.message || 'Failed to dispatch via Gmail API',
      method: 'saved_record',
    };
  }
}

/**
 * Helper to construct a Gmail web compose link for the applicant to inspect or send their email
 */
export function getGmailWebComposeUrl(
  application: SubmittedApplication,
  pdfFilename: string
): string {
  const to = encodeURIComponent(application.email || TARGET_GMAIL_RECIPIENT);
  const subject = encodeURIComponent(
    `🎉 Congratulations! [${application.applicationId}] Membership Application - ${application.name}`
  );
  const body = encodeURIComponent(
    `Congratulations ${application.name}!\n\n` +
      `Your membership application for the Proposed Banking Agents Trade Union has been successfully submitted and verified.\n\n` +
      `========================================\n` +
      `APPLICATION NUMBER: ${application.applicationId}\n` +
      `========================================\n\n` +
      `Applicant Particulars:\n` +
      `• Name: ${application.name}\n` +
      `• Father's Name: ${application.fatherName}\n` +
      `• Gender: ${application.gender}\n` +
      `• DOB / Age: ${application.dob} (${application.age} Years)\n` +
      `• Qualification: ${application.qualification}\n` +
      `• Mobile: +91 ${application.mobileNo}\n` +
      `• Address: ${application.address}, P.O. ${application.postal || ''}, ${application.district || ''}, ${application.state || ''} - ${application.pincode || ''}\n` +
      `• Consent: [x] Voluntary Consent Ticked & Confirmed\n` +
      `• Official PDF Form: ${pdfFilename}\n\n` +
      `Submitted Date & Time: ${application.submittedAt}\n\n` +
      `Proposed Banking Agents Trade Union Secretariat`
  );

  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
}
