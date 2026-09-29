// supabase/functions/seed-accounts/index.ts
//
// Seeds 3 demo users for end-to-end testing of the Vendo platform:
//   - admin@monir.com  /  Monir1122   (role = "admin")
//   - vendor@monir.com /  Vendor1122  (role = "vendor")
//   - customer@monir.com / Customer1122 (role = "customer")
//
// Idempotent: re-running won't error if the user already exists.
// email_confirm is set true so the user can immediately sign in
// without going through the Supabase email-verification step.
//
// This function is INTERNAL — it must never be exposed to the
// public internet. The caller passes a one-shot shared secret
// via the `x-seed-key` header, which must equal the
// SEED_ACCOUNTS_KEY env var (default: "vendo-dev-seed").
//
// Usage:
//   curl -X POST http://127.0.0.1:54321/functions/v1/seed-accounts \
//     -H 'x-seed-key: vendo-dev-seed' -H 'Content-Type: application/json' -d '{}'

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-seed-key",
};

const SEED_KEY = Deno.env.get("SEED_ACCOUNTS_KEY") ?? "vendo-dev-seed";

interface SeedUser {
  email: string;
  password: string;
  full_name: string;
  role: "admin" | "vendor" | "customer";
}

const SEED_USERS: SeedUser[] = [
  { email: "monir@gmail.com", password: "Monir1122", full_name: "Moniruzzaman (Admin)", role: "admin" },
  { email: "vendor@monir.com", password: "Vendor1122", full_name: "Atelier North Vendor", role: "vendor" },
  { email: "customer@monir.com", password: "Customer1122", full_name: "Demo Customer", role: "customer" },
];

async function upsertUser(admin: ReturnType<typeof createClient>, u: SeedUser) {
  // Check if user already exists
  const existing = await admin.auth.admin.listUsers({ perPage: 200 });
  const found = existing.data?.users?.find((x) => x.email === u.email);

  if (found) {
    // Update metadata + password to keep credentials in sync with seed
    const { error: updErr } = await admin.auth.admin.updateUserById(found.id, {
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name, role: u.role },
    });
    if (updErr) return { email: u.email, status: "error", error: updErr.message };
    return { email: u.email, status: "updated", id: found.id, role: u.role };
  }

  // Create new user with email_confirm = true so they can sign in immediately
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name, role: u.role },
  });
  if (error) return { email: u.email, status: "error", error: error.message };
  return { email: u.email, status: "created", id: data.user?.id, role: u.role };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const seedKey = req.headers.get("x-seed-key") ?? "";
  if (seedKey !== SEED_KEY) {
    return new Response(
      JSON.stringify({ ok: false, error: "Forbidden — invalid seed key" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return new Response(
      JSON.stringify({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: any[] = [];
  for (const u of SEED_USERS) {
    try {
      results.push(await upsertUser(admin, u));
    } catch (e) {
      results.push({ email: u.email, status: "exception", error: String(e) });
    }
  }

  return new Response(
    JSON.stringify({ ok: true, results }, null, 2),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});