import { SubmittedApplication } from '../types';

const STORAGE_KEY = 'pbtu_applications';

/**
 * Retrieve all submitted applications from persistent storage
 */
export function getRegisteredApplications(): SubmittedApplication[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Error reading registered applications:', err);
  }
  return [];
}

/**
 * Check if an email ID has already been used for an application
 */
export function isEmailAlreadySubmitted(email: string): SubmittedApplication | null {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  const applications = getRegisteredApplications();
  return (
    applications.find(
      (app) => app.email && app.email.trim().toLowerCase() === normalized
    ) || null
  );
}

/**
 * Check if a mobile number has already been used for an application
 */
export function isMobileAlreadySubmitted(mobileNo: string): SubmittedApplication | null {
  if (!mobileNo) return null;
  const cleanDigits = mobileNo.replace(/\D/g, '').slice(-10);
  if (cleanDigits.length !== 10) return null;

  const applications = getRegisteredApplications();
  return (
    applications.find(
      (app) =>
        app.mobileNo &&
        app.mobileNo.replace(/\D/g, '').slice(-10) === cleanDigits
    ) || null
  );
}

export interface DuplicateCheckResult {
  isBlocked: boolean;
  field?: 'email' | 'mobile';
  reason?: string;
  existingApp?: SubmittedApplication;
}

/**
 * Duplicate Blocker Service
 * Multiple submissions with the same Email ID or Mobile Number are explicitly permitted.
 */
export function validateEmailAndMobileUniqueness(
  _email: string,
  _mobileNo: string,
  _currentAppId?: string
): DuplicateCheckResult {
  // Restriction removed: Allow multiple applications with the same email and phone number
  return { isBlocked: false };
}
