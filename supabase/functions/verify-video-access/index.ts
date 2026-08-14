import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { AwsClient } from "https://esm.sh/aws4fetch@1.0.17";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const arr = new Uint8Array(8);
  crypto.getRandomValues(arr);
  for (let i = 0; i < 8; i++) {
    code += chars[arr[i] % chars.length];
  }
  return code;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { bookingId, verificationCode } = await req.json();

    if (!bookingId) {
      return new Response(JSON.stringify({ error: 'bookingId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Fetch booking with service role
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status, video_status, user_id, recipient_name, recipient_verification_code, video_file_key, video_url, recipient_video_accessed')
      .eq('id', bookingId)
      .single();

    if (fetchError || !booking) {
      console.log('Booking not found:', bookingId, fetchError);
      return new Response(JSON.stringify({ error: 'Video not available' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Booking found:', { id: booking.id, status: booking.status, video_status: booking.video_status, has_file_key: !!booking.video_file_key });

    // Video is only available to users AFTER admin has sent it
    const videoReady = booking.status === 'completed' || 
                       booking.status === 'video_sent' ||
                       booking.status === 'sent';

    if (!videoReady) {
      return new Response(JSON.stringify({ error: 'Video not available yet', videoNotReady: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!booking.video_file_key) {
      return new Response(JSON.stringify({ error: 'No video available for this booking' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Safety net: auto-generate verification code if missing
    let currentCode = booking.recipient_verification_code;
    if (!currentCode) {
      currentCode = generateCode();
      await supabase
        .from('bookings')
        .update({ recipient_verification_code: currentCode })
        .eq('id', bookingId);
      console.log('Auto-generated verification code for booking:', bookingId);
    }

    // Check auth - resolve profile ID from auth UID
    const authHeader = req.headers.get('Authorization');
    let isOwner = false;
    let isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (!authError && authUser?.id) {
        const authUid = authUser.id;
        
        // Look up profile by auth UID (profiles.user_id = auth.uid)
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', authUid)
          .maybeSingle();
        
        if (profileData?.id) {
          // Compare profile.id against booking.user_id
          if (profileData.id === booking.user_id) {
            isOwner = true;
            console.log('Owner access granted via profile match');
          }
        }
        
        // Also check admin role
        const { data: adminCheck } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', authUid)
          .eq('role', 'admin')
          .maybeSingle();
        if (adminCheck) {
          isAdmin = true;
          isOwner = true; // admins get owner-level access
          console.log('Admin access granted');
        }
      }
    }

    // Owner or admin: return video directly
    if (isOwner) {
      const signedUrl = await getSignedUrl(booking.video_file_key);
      return new Response(JSON.stringify({
        success: true,
        videoUrl: signedUrl,
        recipientName: booking.recipient_name,
        isOwner: true,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check verification code
    let codeValid = false;
    if (verificationCode && currentCode) {
      codeValid = verificationCode.toUpperCase() === currentCode.toUpperCase();
    }

    if (codeValid) {
      // Mark as accessed
      await supabase
        .from('bookings')
        .update({
          recipient_video_accessed: true,
          recipient_video_accessed_at: new Date().toISOString(),
        })
        .eq('id', bookingId);

      const signedUrl = await getSignedUrl(booking.video_file_key);
      return new Response(JSON.stringify({
        success: true,
        videoUrl: signedUrl,
        recipientName: booking.recipient_name,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // If code was provided but wrong
    if (verificationCode) {
      return new Response(JSON.stringify({
        requiresCode: true,
        codeInvalid: true,
        recipientName: booking.recipient_name,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // No code provided, not owner — return auth/code prompt
    return new Response(JSON.stringify({
      requiresAuth: !authHeader,
      requiresCode: true,
      recipientName: booking.recipient_name,
      isAuthenticated: !!authHeader,
      hasCode: !!currentCode,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error in verify-video-access:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function getSignedUrl(fileKey: string): Promise<string> {
  const b2KeyId = Deno.env.get('B2_KEY_ID')!;
  const b2AppKey = Deno.env.get('B2_APPLICATION_KEY')!;
  const b2BucketName = Deno.env.get('B2_BUCKET_NAME') || 'wishmetoday';
  const b2Endpoint = Deno.env.get('B2_ENDPOINT') || 's3.us-east-005.backblazeb2.com';

  const aws = new AwsClient({
    accessKeyId: b2KeyId,
    secretAccessKey: b2AppKey,
    service: 's3',
    region: 'us-east-005',
  });

  const endpoint = b2Endpoint.startsWith('http') ? b2Endpoint : `https://${b2Endpoint}`;
  const fileUrl = `${endpoint}/${b2BucketName}/${fileKey}`;

  const signedRequest = await aws.sign(fileUrl, {
    method: 'GET',
    aws: { signQuery: true },
  });

  return signedRequest.url;
}
