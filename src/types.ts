export interface AuthUser {
  name: string;
  email: string;
  photoUrl?: string;
  provider: 'google' | 'firebase';
  id: string;
}

export type QualificationOption = 'SSLC' | 'PLUS TWO (+2)' | 'DEGREE' | 'POST GRADUATION';

export interface ApplicationFormData {
  name: string;
  fatherName: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  dob: string;
  age: string;
  pincode: string;
  state: string;
  district: string;
  postal: string; // Post Office Name
  address: string; // House / Building / Street / Landmark
  qualification: string;
  mobileNo: string;
  email?: string;
  place: string;
  date: string;
  consentAgreed: boolean;
  signatureDataUrl: string;
  referredBy?: string; // Application Ref No of referrer (e.g. PBATU-20260916-7504)
  bankName?: string;
  corporateBcName?: string;
}

export interface SubmittedApplication extends ApplicationFormData {
  applicationId: string;
  submittedAt: string;
  status: 'Submitted' | 'Verified';
  pdfSentStatus?: 'sent' | 'pending' | 'manual' | 'prepared' | 'test_preview';
  pdfSentTo?: string;
  pdfFilename?: string;
  pdfMessageId?: string;
  referredBy?: string;
}

