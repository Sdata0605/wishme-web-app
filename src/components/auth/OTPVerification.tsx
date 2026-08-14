import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OTPVerificationProps {
  email: string;
  onVerified: () => void;
  onBack?: () => void;
  className?: string;
  /** Parent controls whether the initial OTP has already been sent */
  initialOtpSent?: boolean;
  /** Callback to notify parent that OTP was sent */
  onOtpSent?: () => void;
}

export function OTPVerification({
  email,
  onVerified,
  onBack,
  className,
  initialOtpSent = false,
  onOtpSent,
}: OTPVerificationProps) {
  const { toast } = useToast();
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(initialOtpSent ? 60 : 0);
  const [otpSent, setOtpSent] = useState(initialOtpSent);
  const sendingRef = useRef(false);
  const mountedRef = useRef(true);
  const lastSentRef = useRef<number>(initialOtpSent ? Date.now() : 0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Send OTP on mount ONLY if not already sent (parent-controlled)
  useEffect(() => {
    if (!sendingRef.current && !otpSent && !initialOtpSent && email) {
      sendingRef.current = true;
      handleSendOTP();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSendOTP = async () => {
    if (!email || isSending) return;

    // Client-side cooldown: prevent sends within 30s of last send
    const timeSinceLast = Date.now() - lastSentRef.current;
    if (lastSentRef.current > 0 && timeSinceLast < 30000) {
      const waitSec = Math.ceil((30000 - timeSinceLast) / 1000);
      setError(`Please wait ${waitSec}s before requesting a new code.`);
      setCountdown(waitSec);
      return;
    }

    setIsSending(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-email-otp', {
        body: { email }
      });

      // Parse edge function errors (e.g. 409 email_exists)
      if (error) {
        let serverMessage = 'Failed to send OTP. Please try again.';
        let isEmailExists = false;
        try {
          const errorBody = await (error as any).context?.json?.();
          if (errorBody?.error === 'email_exists') {
            serverMessage = errorBody.message || 'An account with this email already exists. Please login.';
            isEmailExists = true;
          } else if (errorBody?.error) {
            serverMessage = errorBody.error;
          }
        } catch {
          if (data?.error === 'email_exists') {
            serverMessage = data.message || 'An account with this email already exists. Please login.';
            isEmailExists = true;
          } else if (data?.error) {
            serverMessage = data.error;
          }
        }
        if (mountedRef.current) {
          sendingRef.current = false;
          setError(serverMessage);
        }
        if (!isEmailExists) {
          toast({ title: "Error", description: serverMessage, variant: "destructive" });
        }
        return;
      }

      if (data?.success) {
        lastSentRef.current = Date.now();
        if (mountedRef.current) {
          setOtpSent(true);
          setCountdown(60);
          onOtpSent?.();
        }
        toast({
          title: "OTP Sent!",
          description: `A 6-digit code has been sent to ${email}`,
        });
      } else {
        const msg = data?.error === 'email_exists'
          ? (data.message || 'An account with this email already exists. Please login.')
          : (data?.error || 'Failed to send OTP');
        throw new Error(msg);
      }
    } catch (err: any) {
      console.error('Error sending OTP:', err);
      if (mountedRef.current) {
        sendingRef.current = false;
        setError(err.message || 'Failed to send OTP. Please try again.');
      }
      toast({
        title: "Error",
        description: err.message || "Failed to send OTP. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.functions.invoke('verify-email-otp', {
        body: { email, otp }
      });

      // Extract the actual error message from the edge function response
      if (error) {
        let serverMessage = 'Verification failed. Please try again.';
        try {
          // FunctionsHttpError stores the response in context
          const errorBody = await error.context?.json?.();
          if (errorBody?.error) {
            serverMessage = errorBody.error;
          }
        } catch {
          // If we can't parse, check if data has the error (some versions put it there)
          if (data?.error) {
            serverMessage = data.error;
          }
        }
        setError(serverMessage);
        setOtp('');
        return;
      }

      if (data?.verified) {
        setIsVerified(true);
        toast({
          title: "Email Verified!",
          description: "Your email has been successfully verified.",
        });
        setTimeout(() => {
          onVerified();
        }, 500);
      } else {
        setError(data?.error || 'Invalid or expired OTP. Please try again.');
        setOtp('');
      }
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      setError('Something went wrong. Please try again.');
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-verify when 6 digits entered
  useEffect(() => {
    if (otp.length === 6 && !isLoading && !isVerified) {
      handleVerifyOTP();
    }
  }, [otp]);

  if (isVerified) {
    return (
      <div className={cn("text-center py-8 space-y-4", className)}>
        <div className="w-16 h-16 mx-auto bg-green-500/10 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-500" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Email Verified!</h3>
          <p className="text-sm text-muted-foreground">
            Your email has been successfully verified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Mail className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-semibold text-lg">Verify Your Email</h3>
        <p className="text-sm text-muted-foreground">
          We've sent a 6-digit code to<br />
          <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {/* OTP Input */}
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <Label className="sr-only">Enter verification code</Label>
          <InputOTP
            value={otp}
            onChange={setOtp}
            maxLength={6}
            disabled={isLoading}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Verify Button */}
        <Button
          type="button"
          className="w-full"
          onClick={handleVerifyOTP}
          disabled={isLoading || otp.length !== 6}
        >
          {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Verify Email
        </Button>

        {/* Resend OTP */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Didn't receive the code?
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSendOTP}
            disabled={countdown > 0 || isSending}
            className="gap-2"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
          </Button>
        </div>

        {/* Back button */}
        {onBack && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onBack}
          >
            Back to Registration
          </Button>
        )}
      </div>
    </div>
  );
}
