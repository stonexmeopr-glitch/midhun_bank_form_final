import { SubmittedApplication } from '../types';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  recipient?: string;
  previewUrl?: string;
  mode?: 'live_smtp' | 'test_transport' | 'resend_api';
  message: string;
  error?: string;
}

/**
 * Dispatch confirmation email with attached PDF to the applicant's submitted email ID
 * via the backend server route /api/send-confirmation-email.
 */
export async function sendConfirmationEmailToServer(
  app: SubmittedApplication,
  pdfBase64?: string,
  pdfFilename?: string
): Promise<SendEmailResult> {
  const recipient = (app.email || '').trim();
  if (!recipient || !recipient.includes('@')) {
    return {
      success: false,
      message: 'Invalid recipient email address.',
      error: 'No valid recipient email provided',
    };
  }

  try {
    const response = await fetch('/api/send-confirmation-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipientEmail: recipient,
        applicantName: app.name,
        applicationId: app.applicationId,
        pdfBase64: pdfBase64 || '',
        pdfFilename: pdfFilename || `${app.applicationId}-membership-application.pdf`,
        mobileNo: app.mobileNo,
        bankName: app.bankName,
        bcName: app.corporateBcName,
        district: app.district,
        state: app.state,
        pincode: app.pincode,
        fatherName: app.fatherName,
        gender: app.gender,
        dob: app.dob,
        age: app.age,
        postal: app.postal,
        address: app.address,
        qualification: app.qualification,
        place: app.place,
        date: app.date,
        submittedAt: app.submittedAt,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || 'Server failed to send email');
    }

    return {
      success: true,
      messageId: data.messageId,
      recipient: data.recipient || recipient,
      previewUrl: data.previewUrl,
      mode: data.mode,
      message:
        data.message ||
        `Confirmation email with PDF attachment dispatched to ${recipient}.`,
    };
  } catch (err: any) {
    console.error('Error dispatching confirmation email via backend:', err);
    return {
      success: false,
      message: err.message || 'Failed to dispatch email from server.',
      error: err.message,
    };
  }
}
