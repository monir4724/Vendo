// ============================================================================
// Vendo Platform — Initiate Payment & Checkout Gateway (Hardened)
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-9, SEC-11, SEC-12, SEC-17)
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
    const supabase = getServiceClient();
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // SEC-9: Sliding-window rate limiting on payment initiation (max 20 per 60s)
    const { data: allowedRate } = await supabase.rpc('check_rate_limit', {
      p_key: `initiate-payment:${clientIp}`,
      p_max: 20,
      p_window_seconds: 60,
    });

    if (allowedRate === false) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded: Please wait before initiating payment' }), {
        status: 429,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const { order_id, items, payment_method, return_url } = await req.json();

    let resolvedOrder: any = null;
    let computedTotal = 0;

    // SEC-17: Server-side price and stock validation
    // If items are passed directly, calculate line items and total purely from DB rows
    if (items && Array.isArray(items) && items.length > 0) {
      computedTotal = 0;
      const verifiedItems = [];

      for (const item of items) {
        const { data: product, error: pErr } = await supabase
          .from('products')
          .select('id, title, price, inventory_count, is_active')
          .eq('id', item.product_id)
          .single();

        if (pErr || !product || !product.is_active) {
          return new Response(JSON.stringify({ error: `Product unavailable or inactive: ${item.product_id}` }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        if (product.inventory_count < item.quantity) {
          return new Response(JSON.stringify({ error: `Insufficient stock for product: ${product.title}` }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
          });
        }

        // PRICE IS ALWAYS READ FROM THE DATABASE — NEVER FROM CLIENT REQUEST BODY
        const lineTotal = Number(product.price) * Number(item.quantity);
        computedTotal += lineTotal;
        verifiedItems.push({
          product_id: product.id,
          unit_price: Number(product.price),
          quantity: item.quantity,
          total_price: lineTotal,
        });
      }
    }

    // If order_id is provided, verify order and validate that order total matches DB product prices
    if (order_id) {
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*, items:order_items(*), customer:customer_id(email, full_name, phone)')
        .eq('id', order_id)
        .single();

      if (orderError || !order) {
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // Re-verify order items against DB products to block tampering between order creation & checkout
      let recomputedOrderTotal = 0;
      for (const item of order.items || []) {
        const { data: prod } = await supabase
          .from('products')
          .select('price')
          .eq('id', item.product_id)
          .single();

        if (prod) {
          recomputedOrderTotal += Number(prod.price) * item.quantity;
        }
      }

      // Add tax & shipping fee, subtract discount
      const calculatedExpected = recomputedOrderTotal + Number(order.tax_amount || 0) + Number(order.shipping_fee || 0) - Number(order.discount_amount || 0);
      
      // If discrepancy detected, enforce database calculated price
      if (Math.abs(calculatedExpected - Number(order.total_amount)) > 0.01) {
        await supabase
          .from('orders')
          .update({
            subtotal: recomputedOrderTotal,
            total_amount: calculatedExpected,
          })
          .eq('id', order.id);
        order.total_amount = calculatedExpected;
      }

      resolvedOrder = order;
      computedTotal = Number(order.total_amount);
    }

    if (!resolvedOrder && !items) {
      return new Response(JSON.stringify({ error: 'Missing order_id or checkout items' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const orderNumber = resolvedOrder?.order_number || `ORD-${Date.now()}`;
    const transactionId = `TXN-${orderNumber}-${Date.now().toString(36).toUpperCase()}`;

    // 2. Gateway selection (bKash, SSLCommerz, Stripe/Card, COD)
    let paymentUrl = '';
    let clientSecret = '';

    if (payment_method === 'bkash') {
      paymentUrl = `https://checkout.sandbox.bka.sh/v1.2.0-beta/checkout?trxID=${transactionId}&amount=${computedTotal}`;
    } else if (payment_method === 'card' || payment_method === 'sslcommerz') {
      paymentUrl = `https://sandbox.sslcommerz.com/gwprocess/v4/gw.php?Q=pay&sessionKey=${transactionId}`;
      clientSecret = `cs_test_${transactionId}`;
    } else {
      // Cash on delivery
      if (resolvedOrder) {
        await supabase
          .from('orders')
          .update({
            payment_status: 'authorized',
            payment_gateway_ref: transactionId,
            status: 'processing',
          })
          .eq('id', resolvedOrder.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          method: 'cod',
          order_id: resolvedOrder?.id,
          total_amount: computedTotal,
          message: 'Order confirmed with Cash on Delivery.',
        }),
        { headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Update order with gateway reference
    if (resolvedOrder) {
      await supabase
        .from('orders')
        .update({
          payment_gateway_ref: transactionId,
        })
        .eq('id', resolvedOrder.id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_id: resolvedOrder?.id,
        order_number: orderNumber,
        total_amount: computedTotal,
        transaction_id: transactionId,
        payment_url: paymentUrl,
        client_secret: clientSecret,
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
