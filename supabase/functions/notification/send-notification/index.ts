import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../../_shared/cors.ts';
import { getServiceClient } from '../../_shared/supabaseClient.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { user_id, type, title, message, payload = {} } = await req.json();

    if (!user_id || !type || !title || !message) {
      return new Response(JSON.stringify({ error: 'Missing required notification fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // 1. Insert notification into DB
    const { data: notif, error: nErr } = await supabase
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        payload,
      })
      .select()
      .single();

    if (nErr) {
      return new Response(JSON.stringify({ error: nErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Broadcast via Supabase Realtime channel
    const channel = supabase.channel(`user:${user_id}:notifications`);
    await channel.send({
      type: 'broadcast',
      event: 'new_notification',
      payload: notif,
    });

    return new Response(JSON.stringify({ success: true, notification: notif }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
