import { jsPDF } from 'jspdf';
import { SubmittedApplication } from '../types';

export interface GeneratedPdfResult {
  doc: jsPDF;
  blob: Blob;
  base64: string;
  filename: string;
}

export const generateApplicationPdf = async (
  app: SubmittedApplication
): Promise<GeneratedPdfResult> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = 16;

  // Header Box
  doc.setFillColor(20, 20, 20);
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('PROPOSED BANKING AGENTS TRADE UNION', pageWidth / 2, y + 8, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('MEMBERSHIP APPLICATION FORM', pageWidth / 2, y + 15, { align: 'center' });

  y += 28;

  // Reference and Date Strip
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 8, 'S');

  doc.setTextColor(40, 40, 40);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`Application Ref: ${app.applicationId}`, margin + 3, y + 5.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date of Submission: ${app.submittedAt}`, pageWidth - margin - 3, y + 5.5, { align: 'right' });

  y += 13;

  // Section Header: Applicant Particulars
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('1. APPLICANT PARTICULARS', margin + 3, y + 4.2);

  y += 7;

  // Table rows for particulars
  const rows: Array<[string, string]> = [
    ['Full Name of Applicant', app.name || '-'],
    ["Father's / Husband's Name", app.fatherName || '-'],
    ['Gender', app.gender || '-'],
    ['Date of Birth & Age', `${app.dob || '-'} (${app.age ? `${app.age} Years` : '-'})`],
    ['Qualification', app.qualification || '-'],
    ['Mobile Number', app.mobileNo ? `+91 ${app.mobileNo}` : '-'],
    ['Premises / House / Street', app.address || '-'],
    ['Post Office / Postal', app.postal || '-'],
    ['District & State', [app.district, app.state].filter(Boolean).join(', ') || '-'],
    ['PIN Code', app.pincode || '-'],
    ...(app.referredBy ? [['Referred By (App Ref)', app.referredBy] as [string, string]] : []),
  ];

  doc.setFontSize(8.5);
  const rowHeight = 7;
  const col1Width = 55;
  const col2Width = contentWidth - col1Width;

  rows.forEach(([label, val]) => {
    // Border
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, y, col1Width, rowHeight);
    doc.rect(margin + col1Width, y, col2Width, rowHeight);

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text(label, margin + 2.5, y + 4.8);

    // Value
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(10, 10, 10);
    const safeVal = String(val);
    const truncatedVal = safeVal.length > 55 ? `${safeVal.substring(0, 55)}...` : safeVal;
    doc.text(truncatedVal, margin + col1Width + 2.5, y + 4.8);

    y += rowHeight;
  });

  y += 5;

  // Section 2: Declaration & Consent
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('2. DECLARATION & VOLUNTARY CONSENT', margin + 3, y + 4.2);

  y += 8;

  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, y, contentWidth, 24, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 30, 30);
  const declarationText =
    'I hereby declare that the information furnished above is true and correct. I voluntarily consent to become a member of the Proposed Banking Agents Trade Union and agree to abide by its Constitution, Rules and lawful decisions. I support the objectives of the Union for the unity, welfare and legitimate rights and interests of Banking Agents.';

  const splitDeclaration = doc.splitTextToSize(declarationText, contentWidth - 6);
  doc.text(splitDeclaration, margin + 3, y + 4.5);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 120, 50);
  doc.text('[X] Voluntary Consent Ticked & Confirmed by Applicant', margin + 3, y + 20);

  y += 28;

  // Section 3: Place, Date & Digital Signature
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('3. VERIFICATION & SIGNATURE', margin + 3, y + 4.2);

  y += 9;

  const colWidthHalf = contentWidth / 2;

  // Left: Place & Date
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 50);
  doc.text(`Place: `, margin, y + 4);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(app.place || '-', margin + 14, y + 4);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text(`Date: `, margin, y + 11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(app.date || '-', margin + 14, y + 11);

  // Right: Signature Box
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);
  doc.text('Signature of Applicant:', margin + colWidthHalf, y + 4);

  doc.setDrawColor(180, 180, 180);
  doc.rect(margin + colWidthHalf, y + 7, colWidthHalf - 5, 22);

  if (app.signatureDataUrl) {
    try {
      doc.addImage(app.signatureDataUrl, 'PNG', margin + colWidthHalf + 2, y + 8, colWidthHalf - 9, 20);
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text('(Digitally captured signature)', margin + colWidthHalf + 5, y + 18);
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('(Digitally Confirmed)', margin + colWidthHalf + 5, y + 18);
  }

  y += 33;

  // Official Notice Footer
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 5;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Proposed Banking Agents Trade Union • Official Membership Record Document', pageWidth / 2, y, {
    align: 'center',
  });
  doc.text('Recipient: michaelmidhun100@gmail.com', pageWidth / 2, y + 4, {
    align: 'center',
  });

  const filename = `${app.applicationId || 'PBATU'}-membership-application.pdf`;
  const blob = doc.output('blob');
  const base64 = doc.output('datauristring').split(',')[1] || '';

  return {
    doc,
    blob,
    base64,
    filename,
  };
};
