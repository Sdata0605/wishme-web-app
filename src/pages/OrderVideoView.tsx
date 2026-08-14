import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Lock, LogIn, AlertCircle, CheckCircle, ShieldCheck, Gift, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

type ViewState = 'loading' | 'not_available' | 'video_preparing' | 'auth_prompt' | 'code_entry' | 'playing' | 'error';

export default function OrderVideoView() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  const [viewState, setViewState] = useState<ViewState>('loading');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      checkAccess();
    }
  }, [bookingId, user, authLoading]);

  const checkAccess = async () => {
    if (!bookingId) {
      setViewState('not_available');
      return;
    }

    setViewState('loading');
    try {
      const headers: Record<string, string> = {};
      if (user) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('verify-video-access', {
        body: { bookingId },
        headers,
      });

      if (error) {
        setViewState('not_available');
        return;
      }

      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setRecipientName(data.recipientName || '');
        setIsOwner(!!data.isOwner);
        setViewState('playing');
      } else if (data.videoNotReady) {
        setViewState('video_preparing');
      } else if (data.error === 'Video not available' || data.error === 'No video available for this booking') {
        setViewState('not_available');
      } else if (data.requiresCode) {
        setRecipientName(data.recipientName || '');
        if (!user) {
          setViewState('auth_prompt');
        } else {
          setViewState('code_entry');
        }
      } else {
        setViewState('not_available');
      }
    } catch {
      setViewState('not_available');
    }
  };

  const handleVerifyCode = async () => {
    if (!bookingId || !verificationCode.trim()) return;
    
    setVerifying(true);
    setErrorMessage('');
    try {
      const headers: Record<string, string> = {};
      if (user) {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session?.access_token) {
          headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
        }
      }

      const { data, error } = await supabase.functions.invoke('verify-video-access', {
        body: { bookingId, verificationCode: verificationCode.trim().toUpperCase() },
        headers,
      });

      if (error) throw error;

      if (data.success && data.videoUrl) {
        setVideoUrl(data.videoUrl);
        setRecipientName(data.recipientName || '');
        setViewState('playing');
      } else if (data.codeInvalid) {
        setErrorMessage('Incorrect code. Please check the message we sent you.');
      } else {
        setErrorMessage('Unable to verify. Please try again.');
      }
    } catch {
      setErrorMessage('Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (viewState === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading your video...</p>
        </div>
      </div>
    );
  }

  if (viewState === 'video_preparing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="h-12 w-12 text-primary mx-auto animate-spin" />
            <h2 className="text-xl font-bold text-foreground">Your Video is Being Prepared</h2>
            <p className="text-muted-foreground">
              We're still creating your personalized video. Check back soon!
            </p>
            <Button onClick={() => checkAccess()}>
              Refresh
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === 'not_available') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <h2 className="text-xl font-bold text-foreground">Video Not Available</h2>
            <p className="text-muted-foreground">
              This video is not available. It may not have been sent yet or the link is invalid.
            </p>
            <Button variant="outline" onClick={() => navigate('/')}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === 'auth_prompt') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {recipientName ? `A Special Video for ${recipientName}` : 'Personalized Video'}
            </CardTitle>
            <CardDescription>
              Choose how you'd like to access this video
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Option A: I placed this order */}
            <div className="p-4 border-2 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">I placed this order</p>
                  <p className="text-sm text-muted-foreground">Login to view your video directly</p>
                </div>
              </div>
              <Button className="w-full" onClick={() => navigate(`/auth?redirect=/order/${bookingId}/view`)}>
                <LogIn className="h-4 w-4 mr-2" /> Login to View
              </Button>
            </div>

            {/* Option B: I received this as a gift */}
            <div className="p-4 border-2 rounded-xl space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Gift className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">I received this as a gift</p>
                  <p className="text-sm text-muted-foreground">Enter the verification code sent to you</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. WM7K2XP4"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="font-mono text-center tracking-widest uppercase"
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
                />
                <Button 
                  onClick={handleVerifyCode}
                  disabled={verifying || verificationCode.length < 6}
                >
                  {verifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                </Button>
              </div>
              {errorMessage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === 'code_entry') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Enter Verification Code</CardTitle>
            <CardDescription>
              {user 
                ? "This order belongs to another account. If you're the recipient, enter the code that was sent to you."
                : `Enter the verification code to view this video${recipientName ? ` for ${recipientName}` : ''}.`
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="e.g. WM7K2XP4"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.toUpperCase())}
              maxLength={8}
              className="font-mono text-center text-2xl tracking-[0.3em] uppercase h-14"
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyCode()}
            />
            <Button 
              className="w-full"
              onClick={handleVerifyCode}
              disabled={verifying || verificationCode.length < 6}
            >
              {verifying ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Verifying...</>
              ) : (
                <><ShieldCheck className="h-4 w-4 mr-2" /> Unlock Video</>
              )}
            </Button>
            {errorMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (viewState === 'playing' && videoUrl) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-2xl w-full space-y-4">
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2 text-green-600 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {isOwner ? 'You placed this order' : 'Video Verified'}
                </span>
              </div>
              <CardTitle className="text-xl">
                {recipientName ? `A Special Video for ${recipientName}` : 'Your Personalized Video'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <video
                src={videoUrl}
                controls
                autoPlay
                className="w-full rounded-lg shadow-lg"
                controlsList="nodownload"
              >
                Your browser does not support video playback.
              </video>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground">
            Made with ❤️ on WishMe
          </p>
        </div>
      </div>
    );
  }

  return null;
}
