// Utility to extract clean, short referral codes and format short referral URLs

/**
 * Extracts a concise referral code from an application reference or custom code.
 * E.g. "PBATU-20260916-7504" -> "7504" (short 4-digit code)
 * Or preserves custom alphanumeric codes (e.g. "AG7504", "7504").
 */
export function getShortReferralCode(appIdOrCode: string): string {
  if (!appIdOrCode) return '';
  const trimmed = appIdOrCode.trim();

  // If full standard ID like PBATU-20260916-7504
  const parts = trimmed.split('-');
  if (parts.length === 3 && parts[0].toUpperCase() === 'PBATU') {
    return parts[2]; // e.g. "7504"
  }

  // If already a short code or other format
  return trimmed;
}

/**
 * Checks if an application matches a given referral query (which may be a short 4-digit code
 * or the full application ID).
 */
export function matchesReferralCode(fullAppId: string, searchRef: string): boolean {
  if (!fullAppId || !searchRef) return false;
  const cleanFull = fullAppId.trim().toLowerCase();
  const cleanSearch = searchRef.trim().toLowerCase();

  if (cleanFull === cleanSearch) return true;

  // Check if searchRef is just the short suffix (e.g. "7504")
  const shortCode = getShortReferralCode(fullAppId).toLowerCase();
  if (shortCode && shortCode === cleanSearch) return true;

  // Check if fullAppId ends with "-searchRef"
  if (cleanFull.endsWith(`-${cleanSearch}`)) return true;

  return false;
}

/**
 * Resolves short referral code into full application ID if found in saved applications list.
 */
export function resolveFullAppId(
  searchRef: string,
  savedApplications: Array<{ applicationId: string }>
): string {
  if (!searchRef) return '';
  const matched = savedApplications.find((a) =>
    matchesReferralCode(a.applicationId, searchRef)
  );
  return matched ? matched.applicationId : searchRef;
}

/**
 * Builds a clean, minimal short referral link.
 * Instead of long URLs with full PBATU-20260916-7504, uses clean short parameter:
 * e.g., https://your-domain.com/?ref=7504
 * Also supports custom hosting domains via environment variable VITE_PUBLIC_APP_URL
 */
export function buildShortReferralUrl(appId: string): { url: string; shortCode: string } {
  const shortCode = getShortReferralCode(appId);

  // Check if custom hosting domain is defined in env (e.g. VITE_PUBLIC_APP_URL)
  let baseUrl = '';
  try {
    const envUrl = (import.meta as any).env?.VITE_PUBLIC_APP_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
      baseUrl = envUrl.replace(/\/+$/, '');
    }
  } catch {}

  if (!baseUrl && typeof window !== 'undefined') {
    baseUrl = `${window.location.origin}${window.location.pathname}`.replace(/\/+$/, '');
  }

  if (!baseUrl) {
    baseUrl = 'https://proposed-banking-agents-trade-union.web.app';
  }

  const url = `${baseUrl}?ref=${encodeURIComponent(shortCode)}`;
  return { url, shortCode };
}
