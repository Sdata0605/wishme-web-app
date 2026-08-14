import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { signInSchema, signUpSchema, normalizePhone } from '@/utils/validation';
import { logActivity } from '@/utils/auditLogger';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  role: 'user' | 'celebrity' | 'admin';
  plan: 'basic' | 'premium' | 'elite';
  avatar_url?: string;
  is_active: boolean;
  referral_code?: string;
  referred_by?: string;
  referral_url?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phone?: string, referralCode?: string) => Promise<{ error: any }>;
  signIn: (emailOrPhone: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any }>;
  changePassword: (newPassword: string) => Promise<{ error: any }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Handle stale refresh tokens gracefully
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('[AUTH] Stale refresh token detected, clearing state');
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer Supabase calls to avoid deadlocks
        setTimeout(async () => {
          await ensureProfile(session.user);
          await fetchUserProfile(session.user.id);
          setLoading(false);
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    // Check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await ensureProfile(session.user);
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    // Safety timeout to prevent infinite loading if auth hangs
    const safetyTimeout = setTimeout(() => setLoading(false), 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const ensureProfile = async (u: User) => {
    try {
      const meta = (u.user_metadata || {}) as Record<string, any>;
      const normalizedPhone = meta.phone ? String(meta.phone).replace(/\s+/g, '') : null;
      const referredById = meta.referred_by || null;

      const { data } = await supabase
        .from('profiles')
        .select('id, phone, first_name, last_name, referred_by')
        .eq('user_id', u.id)
        .maybeSingle();

      if (!data) {
        await supabase.from('profiles').insert({
          user_id: u.id,
          email: u.email as string,
          role: 'user',
          plan: 'basic',
          is_active: true,
          first_name: meta.first_name || null,
          last_name: meta.last_name || null,
          phone: normalizedPhone,
          referred_by: referredById
        });
      } else {
        const updates: Record<string, any> = {};
        if (!data.phone && normalizedPhone) updates.phone = normalizedPhone;
        if (!data.first_name && meta.first_name) updates.first_name = meta.first_name;
        if (!data.last_name && meta.last_name) updates.last_name = meta.last_name;
        if (!data.referred_by && referredById) updates.referred_by = referredById;
        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('user_id', u.id);
        }
      }
    } catch (e) {
      console.error('ensureProfile error:', e);
    }
  };

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data ?? null);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, phone?: string, referralCode?: string) => {
    try {
      // Validate inputs with zod
      const parsed = signUpSchema.safeParse({ 
        email, 
        password, 
        firstName, 
        lastName, 
        phone 
      });
      
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message || 'Invalid input';
        toast({ title: 'Sign up failed', description: message, variant: 'destructive' });
        return { error: new Error(message) };
      }

      const redirectUrl = `${window.location.origin}/`;
      
      // Normalize phone number to E.164 format
      const normalizedPhone = phone ? normalizePhone(phone) : null;
      
      // Check if referral code is provided and find the referrer
      let referrerId: string | null = null;
      if (referralCode) {
        const { data: referrerData } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', referralCode)
          .maybeSingle();
        
        if (referrerData) {
          referrerId = referrerData.id;
        }
      }
      
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName?.trim(),
            last_name: lastName?.trim(),
            phone: normalizedPhone,
            referral_code: referralCode,
            referred_by: referrerId
          }
        }
      });

      if (error) {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to complete your sign up."
        });

        // Log signup
        logActivity({
          action_category: 'auth',
          action_type: 'signup_completed',
          action_label: `New user signed up: ${email}`,
          severity: 'info',
          metadata: { email, firstName, referralCode: referralCode || null },
        }).catch(() => {});

        // Trigger welcome notification via unified engine (fire and forget)
        supabase.functions.invoke('send-wishme-notification', {
          body: {
            event_key: 'user_registered',
            recipient_type: 'user',
            data: {
              first_name: firstName?.trim() || 'there',
              email: email.trim().toLowerCase(),
              referral_code: '',
              platform_url: 'https://wishme.today',
              recipient_email: email.trim().toLowerCase(),
              recipient_phone: normalizedPhone || '',
            }
          }
        }).catch(e => console.log('Welcome notification failed:', e));

        // Admin new user alert (fire and forget)
        supabase.functions.invoke('send-wishme-notification', {
          body: {
            event_key: 'admin_new_user_alert',
            recipient_type: 'admin',
            data: {
              full_name: `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim() || 'Unknown',
              email: email.trim().toLowerCase(),
              phone: normalizedPhone || 'N/A',
              plan: 'basic',
              timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            }
          }
        }).catch(e => console.log('Admin alert failed:', e));

        // If referred, notify referrer
        if (referrerId) {
          supabase.functions.invoke('send-wishme-notification', {
            body: {
              event_key: 'referral_friend_joined',
              recipient_type: 'user',
              recipient_id: referrerId,
              data: { friend_name: firstName?.trim() || 'Someone', friend_email: email.trim().toLowerCase() }
            }
          }).catch(e => console.log('Referral notification failed:', e));
        }
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Sign up failed", 
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const signIn = async (emailOrPhone: string, password: string) => {
    try {
      console.log('[AUTH] === LOGIN ATTEMPT STARTED ===');
      console.log('[AUTH] Input:', { emailOrPhone, passwordLength: password?.length });

      // Validate inputs with zod
      const parsed = signInSchema.safeParse({ emailOrPhone, password });
      if (!parsed.success) {
        console.error('[AUTH] Zod validation failed:', parsed.error.issues);
        const message = parsed.error.issues[0]?.message || 'Invalid credentials';
        toast({ title: 'Sign in failed', description: message, variant: 'destructive' });
        return { error: new Error(message) };
      }

      const input = parsed.data.emailOrPhone.trim();
      const isEmail = input.includes('@');
      console.log('[AUTH] Parsed input:', { input, isEmail });
      let signInError;

      if (isEmail) {
        const email = input.toLowerCase();
        console.log('[AUTH] Attempting Supabase signInWithPassword for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        signInError = error;

        if (error) {
          console.error('[AUTH] Supabase auth error:', {
            message: error.message,
            status: error.status,
            name: error.name
          });
          // If email not confirmed, proactively resend confirmation
          if (error.message?.toLowerCase?.().includes('confirm') || error.message?.toLowerCase?.().includes('not confirmed')) {
            console.log('[AUTH] Email not confirmed, resending confirmation...');
            await supabase.auth.resend({ type: 'signup', email });
          }
        } else {
          console.log('[AUTH] Supabase auth SUCCESS:', {
            userId: data.user?.id,
            email: data.user?.email,
            emailConfirmed: data.user?.email_confirmed_at,
            sessionExpiry: data.session?.expires_at
          });
        }
      } else {
        console.log('[AUTH] Phone login attempted - not supported');
        // For security and RLS reasons, phone-based login is not supported
        const message = 'Please sign in using your email address. Phone number login is not supported.';
        toast({ title: 'Sign in with email', description: message, variant: 'destructive' });
        return { error: new Error(message) };
      }

      if (signInError) {
        const msg = signInError?.message || 'An error occurred during sign in';
        toast({
          title: 'Sign in failed',
          description: msg,
          variant: 'destructive'
        });
        logActivity({
          action_category: 'auth',
          action_type: 'login_failed',
          action_label: `Login failed for ${input}`,
          severity: 'warning',
          metadata: { error: msg },
        }).catch(() => {});
      } else {
        toast({ title: 'Welcome back!', description: 'You have successfully signed in.' });
        logActivity({
          action_category: 'auth',
          action_type: 'login_success',
          action_label: `User logged in: ${input}`,
          severity: 'info',
        }).catch(() => {});
      }

      console.log('[AUTH] === LOGIN ATTEMPT COMPLETED ===', { success: !signInError });
      return { error: signInError };
    } catch (error: any) {
      console.error('[AUTH] UNEXPECTED LOGIN ERROR:', error);
      toast({
        title: 'Sign in failed',
        description: error?.message || 'An unexpected error occurred',
        variant: 'destructive'
      });
      return { error };
    }
  };


  const signOut = async () => {
    // Log before clearing session
    logActivity({
      action_category: 'auth',
      action_type: 'logout',
      action_label: 'User logged out',
      severity: 'info',
    }).catch(() => {});

    try {
      // Attempt to sign out from Supabase (may 403 if session already gone)
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut warning (treated as success):', e);
    } finally {
      try {
        // Clear plan skip flag
        sessionStorage.removeItem('plan_skipped_this_session');
        // Proactively clear any Supabase auth tokens in localStorage
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) {
            // remove after loop to avoid index shift
          }
        }
        // Second pass to actually remove (avoids index issues)
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sb-')) keysToRemove.push(key);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('LocalStorage cleanup warning:', e);
      }

      // Clear local state immediately regardless of remote result
      setUser(null);
      setSession(null);
      setProfile(null);

      toast({
        title: 'Signed out',
        description: 'You have been successfully signed out.'
      });

      // Navigate using SPA routing — state is already cleared above
      window.location.replace('/');
    }

    return { error: null };
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id);

      if (error) {
        toast({
          title: "Update failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        await fetchUserProfile(user.id);
        toast({
          title: "Profile updated",
          description: "Your profile has been updated successfully."
        });
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const changePassword = async (newPassword: string) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        toast({
          title: "Password change failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Password updated",
          description: "Your password has been changed successfully."
        });
        logActivity({
          action_category: 'auth',
          action_type: 'password_changed',
          action_label: 'User changed their password',
          severity: 'warning',
        }).catch(() => {});
      }

      return { error };
    } catch (error: any) {
      toast({
        title: "Password change failed",
        description: error.message,
        variant: "destructive"
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    changePassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}