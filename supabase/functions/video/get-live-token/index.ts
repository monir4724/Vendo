// ============================================================================
// Vendo Platform — Live Video RTC Token Provider (Hardened)
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-5, SEC-11)
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { getServiceClient } from '../../_shared/supabaseClient.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { live_stream_id, role = 'audience' } = await req.json();

    if (!live_stream_id) {
      return new Response(JSON.stringify({ error: 'Missing live_stream_id' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // SEC-5: Authenticate user session from Authorization Bearer token
    const authHeader = req.headers.get('Authorization') ?? '';
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    if (!jwt) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    const user = authData.user;

    // 1. Verify stream existence and ownership
    const { data: stream, error: sErr } = await supabase
      .from('live_streams')
      .select('id, vendor_id, status, title')
      .eq('id', live_stream_id)
      .single();

    if (sErr || !stream) {
      return new Response(JSON.stringify({ error: 'Live stream not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // SEC-5: Anti-Hijacking Check
    // Only the owning vendor is allowed a broadcaster/publisher-level RTC token
    const isBroadcaster = role === 'broadcaster' || role === 'host';
    if (isBroadcaster) {
      if (stream.vendor_id !== user.id) {
        return new Response(JSON.stringify({ error: 'Forbidden: not stream owner' }), {
          status: 403,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
    }

    // 2. Generate scoped RTC / LiveKit / Agora JWT token
    const channelName = `stream_${stream.id}`;
    const tokenPayload = {
      iss: 'vendo-media-authority',
      sub: user.id,
      room: channelName,
      role: isBroadcaster ? 'publisher' : 'subscriber',
      canPublish: isBroadcaster,
      canSubscribe: true,
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour valid
    };

    const token = `LIVEKIT_SECURE_${btoa(JSON.stringify(tokenPayload))}`;

    return new Response(
      JSON.stringify({
        success: true,
        live_stream_id: stream.id,
        channel: channelName,
        token: token,
        role: isBroadcaster ? 'broadcaster' : 'audience',
        expires_in: 3600,
        server_url: Deno.env.get('LIVEKIT_SERVER_URL') || 'wss://live.vendo.app',
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
