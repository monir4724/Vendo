// supabase/functions/get-live-token/index.ts
//
// This Edge Function issues short-lived Agora RTC tokens so that
// vendors (publishers) and customers (audience) can join a live
// stream channel securely. The Agora App ID and App Certificate
// never leave the server — only the generated token is sent back
// to the client.
//
// Package used: agora-token (works in Deno via npm: specifier)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import pkg from "npm:agora-token@2.0.4";

const { RtcTokenBuilder, RtcRole } = pkg;

// CORS headers so your Flutter web build / any browser client can call this
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ---- 1. Read secrets (set via `supabase secrets set`) ----
    const AGORA_APP_ID = Deno.env.get("AGORA_APP_ID");
    const AGORA_APP_CERTIFICATE = Deno.env.get("AGORA_APP_CERTIFICATE");

    if (!AGORA_APP_ID || !AGORA_APP_CERTIFICATE) {
      return new Response(
        JSON.stringify({ error: "Agora credentials not configured on server" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- 2. Authenticate the calling user via Supabase Auth ----
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- 3. Parse request body ----
    // Expected JSON body: { "channelName": "shop123", "role": "publisher" | "audience" }
    // uid is derived from the authenticated user, not trusted from the client.
    const body = await req.json();
    const { channelName, role } = body;

    if (!channelName || typeof channelName !== "string") {
      return new Response(
        JSON.stringify({ error: "channelName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (role !== "publisher" && role !== "audience") {
      return new Response(
        JSON.stringify({ error: "role must be 'publisher' or 'audience'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ---- 4. Optional: verify vendor ownership for publisher role ----
    // If role is "publisher", you may want to check that this user is
    // actually the vendor who owns this live_streams channel.
    // Example (uncomment and adjust to your schema):
    //
    // if (role === "publisher") {
    //   const { data: stream } = await supabaseClient
    //     .from("live_streams")
    //     .select("vendor_id")
    //     .eq("channel_name", channelName)
    //     .single();
    //
    //   if (!stream || stream.vendor_id !== user.id) {
    //     return new Response(
    //       JSON.stringify({ error: "Not authorized to publish on this channel" }),
    //       { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    //     );
    //   }
    // }

    // ---- 5. Build the Agora numeric uid from the Supabase user id ----
    // Agora RTC uids are 32-bit unsigned integers, so we hash the
    // Supabase UUID down into a stable numeric value.
    const uid = hashUuidToUint32(user.id);

    // ---- 6. Generate the Agora RTC token ----
    const agoraRole =
      role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const expirationTimeInSeconds = 3600; // token valid for 1 hour
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
      AGORA_APP_ID,
      AGORA_APP_CERTIFICATE,
      channelName,
      uid,
      agoraRole,
      privilegeExpiredTs,
      privilegeExpiredTs,
    );

    // ---- 7. Return the token + connection info to the client ----
    return new Response(
      JSON.stringify({
        token,
        appId: AGORA_APP_ID,
        channelName,
        uid,
        role,
        expiresAt: privilegeExpiredTs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-live-token error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

// Simple, stable string -> uint32 hash (djb2 variant).
// Ensures the same Supabase user always maps to the same Agora uid.
function hashUuidToUint32(uuid: string): number {
  let hash = 5381;
  for (let i = 0; i < uuid.length; i++) {
    hash = (hash * 33) ^ uuid.charCodeAt(i);
  }
  // Force unsigned 32-bit range
  return hash >>> 0;
}
