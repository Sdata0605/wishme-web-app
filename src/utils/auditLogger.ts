import { supabase } from "@/integrations/supabase/client";

type ActionCategory = 
  | 'auth' | 'booking' | 'payment' | 'profile' | 'celebrity' 
  | 'admin' | 'content' | 'referral' | 'wallet' | 'messaging' | 'security';

type Severity = 'info' | 'warning' | 'critical';

interface LogActivityPayload {
  action_category: ActionCategory;
  action_type: string;
  action_label: string;
  severity?: Severity;
  entity_type?: string;
  entity_id?: string;
  entity_label?: string;
  metadata?: Record<string, any>;
}

function getDeviceType(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

export async function logActivity(payload: LogActivityPayload): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch profile info (non-blocking best effort)
    let profileData: any = null;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role, plan')
        .eq('user_id', user.id)
        .maybeSingle();
      profileData = data;
    } catch {
      // silent
    }

    const userName = profileData 
      ? [profileData.first_name, profileData.last_name].filter(Boolean).join(' ') || profileData.email 
      : user.email || '';

    await supabase.from('user_activity_logs' as any).insert({
      user_id: user.id,
      profile_id: profileData?.id || null,
      user_email: profileData?.email || user.email || null,
      user_name: userName,
      user_role: profileData?.role || 'user',
      user_plan: profileData?.plan || 'basic',
      action_category: payload.action_category,
      action_type: payload.action_type,
      action_label: payload.action_label,
      severity: payload.severity || 'info',
      entity_type: payload.entity_type || null,
      entity_id: payload.entity_id || null,
      entity_label: payload.entity_label || null,
      metadata: payload.metadata || {},
      user_agent: navigator.userAgent,
      device_type: getDeviceType(),
      ip_address: null, // not available client-side
    });
  } catch (err) {
    console.warn('[AuditLog] Failed to log activity:', err);
  }
}
