// ============================================================================
// Vendo Platform — Shared CORS & Header Hardening
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-11)
// ============================================================================

const ALLOWED_ORIGINS = [
  "https://vendo.app",
  "https://admin.vendo.app",
  "http://localhost:5173",
  "http://localhost:2640",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:2640"
];

export function getCorsHeaders(origin: string | null) {
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gateway-signature, x-csrf-token",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
    "Access-Control-Allow-Credentials": "true",
  };
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-gateway-signature, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT, DELETE",
  "Access-Control-Allow-Credentials": "true",
};
