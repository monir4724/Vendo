// ============================================================================
// Vendo Platform — Vendor Payout Processor (Hardened)
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-6, SEC-11)
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
    const { payout_id, idempotency_key } = await req.json();

    if (!payout_id) {
      return new Response(JSON.stringify({ error: 'Missing payout_id' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // 1. Fetch payout record
    const { data: payout, error: pErr } = await supabase
      .from('payouts')
      .select('*, vendor:vendor_id(business_name, profile_id)')
      .eq('id', payout_id)
      .single();

    if (pErr || !payout) {
      return new Response(JSON.stringify({ error: 'Payout record not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 2. Idempotency check: never disburse twice
    if (payout.status === 'paid') {
      return new Response(
        JSON.stringify({ message: 'Payout already processed', status: 'paid', payout }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // SEC-6: Execute atomic row-locked payout deduction via RPC
    // Stored procedure public.process_vendor_payout locks public.vendor_profiles with FOR UPDATE
    const { error: rpcErr } = await supabase.rpc('process_vendor_payout', {
      p_vendor_id: payout.vendor_id,
      p_amount: payout.net_amount || payout.amount,
    });

    if (rpcErr) {
      return new Response(JSON.stringify({ error: `Payout failed: ${rpcErr.message}` }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 3. Mark payout complete with idempotency key
    const executionKey = idempotency_key || `IDEMP-${payout.payout_number || payout.id}-${Date.now()}`;

    await supabase
      .from('payouts')
      .update({
        status: 'paid',
        idempotency_key: executionKey,
        processed_at: new Date().toISOString(),
      })
      .eq('id', payout.id);

    // 4. Notify vendor of disbursement
    await supabase.from('notifications').insert({
      user_id: payout.vendor_id,
      type: 'payout_processed',
      title: 'Payout Disbursement Complete',
      message: `Your withdrawal of $${payout.net_amount || payout.amount} has been processed via ${payout.payout_method || 'Bank Transfer'}.`,
      payload: { payout_id: payout.id, net_amount: payout.net_amount || payout.amount },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
        net_amount: payout.net_amount || payout.amount,
        status: 'paid',
        idempotency_key: executionKey,
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
