import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../../_shared/cors.ts';
import { getServiceClient } from '../../_shared/supabaseClient.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { query, limit = 10 } = await req.json();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Missing query parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();
    const formattedQuery = query.trim().split(/\s+/).join(' & ');

    // 1. Search products via full-text search vector
    const { data: products } = await supabase
      .from('products')
      .select('id, title, description, price, images, vendor:vendor_id(business_name)')
      .textSearch('search_vector', formattedQuery, { type: 'websearch' })
      .eq('is_active', true)
      .limit(limit);

    // 2. PATCH 6: Full-text search on reels search_vector
    const { data: reels } = await supabase
      .from('reels')
      .select('id, title, caption, thumbnail_url, view_count, vendor:vendor_id(business_name)')
      .textSearch('search_vector', formattedQuery, { type: 'websearch' })
      .eq('status', 'published')
      .limit(limit);

    // 3. Combine results with typed indicators
    const results = [
      ...(products || []).map((p) => ({
        result_type: 'product',
        id: p.id,
        title: p.title,
        price: p.price,
        image: Array.isArray(p.images) ? p.images[0] : null,
        vendor: p.vendor?.business_name,
      })),
      ...(reels || []).map((r) => ({
        result_type: 'reel',
        id: r.id,
        title: r.title,
        caption: r.caption,
        thumbnail: r.thumbnail_url,
        vendor: r.vendor?.business_name,
      })),
    ];

    return new Response(JSON.stringify({ success: true, count: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
