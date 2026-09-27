// ============================================================================
// Vendo Platform — Authentication Brute-Force Protection
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-18)
// ============================================================================

import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

export async function checkLoginRateLimit(
  supabase: SupabaseClient,
  ip: string,
  email: string
): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  const sanitizedEmail = email.trim().toLowerCase();
  const rateLimitKey = `login:${ip}:${sanitizedEmail}`;

  // SEC-18: Maximum 5 failed attempts per 5-minute (300 seconds) sliding window
  const { data: isAllowed, error } = await supabase.rpc('check_rate_limit', {
    p_key: rateLimitKey,
    p_max: 5,
    p_window_seconds: 300,
  });

  if (error || isAllowed === false) {
    return { allowed: false, retryAfterSeconds: 300 };
  }

  return { allowed: true };
}
