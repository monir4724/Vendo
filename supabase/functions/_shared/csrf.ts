// ============================================================================
// Vendo Platform — CSRF Defense Helper
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-13)
// ============================================================================

export function getCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('Cookie');
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

export function setCsrfCookie(resHeaders: Headers, token: string): void {
  resHeaders.append(
    'Set-Cookie',
    `csrf_token=${token}; Secure; SameSite=Strict; Path=/; Max-Age=86400`
  );
}

export function verifyCsrfToken(req: Request): boolean {
  // Safe HTTP methods do not mutate state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }

  // Mobile/SPA clients using Authorization: Bearer JWT headers are immune to browser cross-site form posts
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return true;
  }

  // For cookie-authenticated sessions (e.g. Admin portal via @supabase/ssr),
  // enforce double-submit CSRF token matching
  const headerToken = req.headers.get('x-csrf-token');
  const cookieToken = getCookie(req, 'csrf_token');

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return false;
  }

  return true;
}
