// ============================================================================
// Vendo Platform — Safe Fetch SSRF Mitigation Helper
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-15)
// ============================================================================

import { isIP } from 'node:net';

const BLOCKED_HOSTS = [
  '169.254.169.254', // AWS/GCP/Azure instance metadata service
  'metadata.google.internal',
  'localhost',
  '127.0.0.1',
  '::1',
  '0.0.0.0',
];

const BLOCKED_RANGES = [
  /^10\./,                          // 10.0.0.0/8 (RFC 1918)
  /^172\.(1[6-9]|2\d|3[01])\./,     // 172.16.0.0/12 (RFC 1918)
  /^192\.168\./,                    // 192.168.0.0/16 (RFC 1918)
  /^127\./,                         // Loopback
  /^169\.254\./,                    // Link-local
];

export async function safeFetch(userUrl: string, init?: RequestInit): Promise<Response> {
  const url = new URL(userUrl);

  // 1. Enforce HTTPS only
  if (url.protocol !== 'https:') {
    throw new Error('SSRF Protection: Only HTTPS protocol is permitted');
  }

  // 2. Block prohibited hostnames & cloud metadata services
  if (BLOCKED_HOSTS.includes(url.hostname.toLowerCase())) {
    throw new Error('SSRF Protection: Access to internal/metadata host is prohibited');
  }

  // 3. Block private IP ranges
  if (isIP(url.hostname) && BLOCKED_RANGES.some((r) => r.test(url.hostname))) {
    throw new Error('SSRF Protection: Access to private internal IP range is prohibited');
  }

  // 4. Fetch with strict manual redirect control to prevent open-redirect SSRF bypass
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second timeout

  try {
    return await fetch(url.toString(), {
      ...init,
      signal: controller.signal,
      redirect: 'manual', // Never follow redirects to internal IP space
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
