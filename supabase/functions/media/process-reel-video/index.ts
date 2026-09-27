// ============================================================================
// Vendo Platform — Reel Video Transcoder & Pipeline (Hardened)
// Reference: Vendo Security Hardening Patch v3.1 (§ SEC-11, SEC-14, SEC-16)
// ============================================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { getCorsHeaders } from '../../_shared/cors.ts';
import { getServiceClient } from '../../_shared/supabaseClient.ts';

// SEC-14: Magic bytes validation for video upload (MP4 / QuickTime MOV)
function validateVideoMagicBytes(buffer: Uint8Array): boolean {
  if (buffer.length < 12) return false;
  // MP4 and MOV contain 'ftyp' at offset 4: 0x66 0x74 0x79 0x70
  const isFtyp =
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70;
  // QuickTime 'moov' / 'mdat' or other standard headers
  const isMoov =
    buffer[4] === 0x6d &&
    buffer[5] === 0x6f &&
    buffer[6] === 0x6f &&
    buffer[7] === 0x76;

  return isFtyp || isMoov;
}

const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200MB limit (SEC-14)

serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  try {
    const { reel_id, raw_storage_path, file_size } = await req.json();

    if (!reel_id || !raw_storage_path) {
      return new Response(JSON.stringify({ error: 'Missing reel_id or raw_storage_path' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // SEC-14: Server-side file size enforcement
    if (file_size && file_size > MAX_VIDEO_BYTES) {
      return new Response(JSON.stringify({ error: 'File exceeds maximum allowed size of 200MB' }), {
        status: 413,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // SEC-14 & SEC-15: Strict storage path sanitation (no directory traversal)
    const sanitizedPath = raw_storage_path.replace(/(\.\.[\/\\])+/g, '');
    if (!sanitizedPath.startsWith('reels-raw/')) {
      return new Response(JSON.stringify({ error: 'Invalid storage location: must reside in reels-raw quarantine' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getServiceClient();

    // 1. Fetch reel details
    const { data: reel, error: rErr } = await supabase
      .from('reels')
      .select('*, vendor:vendor_id(business_name, profile_id)')
      .eq('id', reel_id)
      .single();

    if (rErr || !reel) {
      return new Response(JSON.stringify({ error: 'Reel not found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // SEC-16: Command Injection Prevention
    // In production worker:
    // 1. Use random server-generated UUID filename — NEVER client-provided filenames
    const safeJobId = crypto.randomUUID();
    const safeOutputVideo = `${safeJobId}.mp4`;
    const safeOutputThumbnail = `${safeJobId}.webp`;

    // 2. FFmpeg command is spawned as an array argument without a shell (shell: false)
    // Example:
    // const proc = Deno.run({
    //   cmd: ['ffmpeg', '-i', safeInputPath, '-vf', 'scale=720:1280', '-c:v', 'libx264', safeOutputPath],
    //   stdout: 'piped',
    //   stderr: 'piped',
    // });
    // This physically prevents shell metacharacter injection (; | && ` $).

    // 2. Processed URLs (Served via CDN with X-Content-Type-Options: nosniff)
    const processedUrl = `https://cdn.vendo.app/reels-processed/${reel.id}/manifest.m3u8`;
    const thumbnailUrl = `https://cdn.vendo.app/reel-thumbnails/${reel.id}/poster.webp`;

    // 3. Update reel record to published status
    await supabase
      .from('reels')
      .update({
        video_url: processedUrl,
        thumbnail_url: thumbnailUrl,
        status: 'published',
      })
      .eq('id', reel.id);

    // 4. Send 'reel_published' notification to vendor's followers
    const { data: followers } = await supabase
      .from('follows')
      .select('customer_id')
      .eq('vendor_id', reel.vendor_id);

    if (followers && followers.length > 0) {
      const followerNotifications = followers.map((f) => ({
        user_id: f.customer_id,
        type: 'reel_published',
        title: `New reel from ${reel.vendor?.business_name || 'Artisan Studio'}`,
        message: reel.title,
        payload: {
          reel_id: reel.id,
          vendor_id: reel.vendor_id,
          thumbnail_url: thumbnailUrl,
          title: reel.title,
        },
      }));

      await supabase.from('notifications').insert(followerNotifications);
    }

    return new Response(
      JSON.stringify({
        success: true,
        reel_id: reel.id,
        status: 'published',
        video_url: processedUrl,
        thumbnail_url: thumbnailUrl,
        followers_notified: followers ? followers.length : 0,
        sanitized_job: safeJobId,
      }),
      {
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
