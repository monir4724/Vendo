// ============================================================================
// Vendo Platform — Broadcast Live Reaction (Hardened)
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-7, SEC-9, SEC-11)
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
    const { live_stream_id, reaction_type } = await req.json();

    if (!live_stream_id || !reaction_type) {
      return new Response(JSON.stringify({ error: 'Missing live_stream_id or reaction_type' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const validReactions = ['heart', 'fire', 'clap', 'wow'];
    if (!validReactions.includes(reaction_type)) {
      return new Response(JSON.stringify({ error: 'Invalid reaction_type' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();
    const clientKey = req.headers.get('x-forwarded-for') || 'anon';

    // SEC-9: Distributed rate limiting via Postgres check_rate_limit (max 10 reactions/sec)
    const { data: allowedRate } = await supabase.rpc('check_rate_limit', {
      p_key: `reaction:${clientKey}:${live_stream_id}`,
      p_max: 10,
      p_window_seconds: 1,
    });

    if (allowedRate === false) {
      return new Response(JSON.stringify({ error: 'Reaction rate limit exceeded (10/sec)' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 2. Validate live_stream exists and status is live (SEC-12 parameterized)
    const { data: stream, error: sErr } = await supabase
      .from('live_streams')
      .select('id, status')
      .eq('id', live_stream_id)
      .single();

    if (sErr || !stream) {
      return new Response(JSON.stringify({ error: 'Live stream not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    if (stream.status !== 'live') {
      return new Response(JSON.stringify({ error: 'Live stream has ended' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // SEC-7: Supabase Realtime Authorization — private channel config
    const channel = supabase.channel(`live:${live_stream_id}:reactions`, {
      config: { private: true },
    });

    await channel.send({
      type: 'broadcast',
      event: 'reaction',
      payload: {
        reaction_type,
        timestamp: Date.now(),
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        broadcast: true,
        reaction_type,
      }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
