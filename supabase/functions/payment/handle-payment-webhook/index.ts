// ============================================================================
// Vendo Platform — Payment Webhook Handler (Hardened)
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-3, SEC-11, SEC-12)
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { getServiceClient } from '../../_shared/supabaseClient.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-gateway-signature') ?? '';
    const secret = Deno.env.get('PAYMENT_GATEWAY_WEBHOOK_SECRET') || 'vendo_webhook_secret_sandbox_2026';

    // SEC-3: Constant-time HMAC SHA256 Signature Verification
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const sigBuf = new TextEncoder().encode(signatureHeader);
    const expBuf = new TextEncoder().encode(expected);

    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
        status: 401,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(rawBody);
    const { transaction_id, status, amount, gateway = 'sslcommerz' } = payload;

    if (!transaction_id) {
      return new Response(JSON.stringify({ error: 'Missing transaction_id in webhook payload' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // SEC-3: Idempotency Check via payment_transactions table
    const { data: existingTxn } = await supabase
      .from('payment_transactions')
      .select('id, status')
      .eq('gateway_transaction_id', transaction_id)
      .maybeSingle();

    if (existingTxn?.status === 'completed') {
      return new Response(JSON.stringify({ message: 'Already processed', status: 'completed' }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // 1. Locate matching order (parameterized query, SEC-12 compliant)
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('payment_gateway_ref', transaction_id)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: 'Order not found for transaction' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const isSuccess = status === 'SUCCESS' || status === 'COMPLETED' || status === 'captured';

    if (isSuccess) {
      // 2. Mark order as paid & record transaction in single idempotent flow
      await supabase
        .from('orders')
        .update({
          payment_status: 'captured',
          status: 'paid',
        })
        .eq('id', order.id);

      // Record idempotent payment transaction
      await supabase
        .from('payment_transactions')
        .upsert({
          order_id: order.id,
          gateway_transaction_id: transaction_id,
          gateway: gateway,
          amount: Number(amount || order.total_amount),
          status: 'completed',
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'gateway_transaction_id' });

      // 3. Deduct inventory for purchased items
      for (const item of order.items || []) {
        await supabase.rpc('decrement_inventory', {
          p_product_id: item.product_id,
          p_qty: item.quantity,
        }).catch(() => {
          supabase
            .from('products')
            .update({ inventory_count: Math.max(0, (item.inventory_count || 1) - item.quantity) })
            .eq('id', item.product_id);
        });
      }

      // 4. Send notifications to customer & vendor
      await supabase.from('notifications').insert([
        {
          user_id: order.customer_id,
          type: 'payment_success',
          title: 'Payment Successful',
          message: `Your payment of $${order.total_amount} for Order #${order.order_number} has been confirmed.`,
          payload: { order_id: order.id, order_number: order.order_number },
        },
        {
          user_id: order.vendor_id,
          type: 'order_placed',
          title: 'New Paid Order Received',
          message: `Order #${order.order_number} received ($${order.total_amount}). Please prepare for dispatch.`,
          payload: { order_id: order.id, order_number: order.order_number },
        },
      ]);

      return new Response(
        JSON.stringify({ success: true, order_id: order.id, status: 'paid', transaction_id }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    } else {
      // Payment Failed
      await supabase
        .from('orders')
        .update({ payment_status: 'failed' })
        .eq('id', order.id);

      await supabase
        .from('payment_transactions')
        .upsert({
          order_id: order.id,
          gateway_transaction_id: transaction_id,
          gateway: gateway,
          amount: Number(amount || order.total_amount),
          status: 'failed',
          raw_payload: payload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'gateway_transaction_id' });

      await supabase.from('notifications').insert({
        user_id: order.customer_id,
        type: 'payment_failed',
        title: 'Payment Failed',
        message: `Payment authorization failed for Order #${order.order_number}. Please retry your payment.`,
        payload: { order_id: order.id },
      });

      return new Response(
        JSON.stringify({ success: false, status: 'failed', transaction_id }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
