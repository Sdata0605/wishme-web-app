import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  checkPasswordStrength, 
  generateStrongPassword,
  PASSWORD_REQUIREMENTS,
  type PasswordStrength 
} from '@/utils/passwordStrength';
import { Check, X, RefreshCw, Eye, EyeOff, Copy, Sparkles, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  password: string;
  onPasswordChange: (password: string) => void;
  onValidityChange?: (isValid: boolean) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export function PasswordStrengthMeter({
  password,
  onPasswordChange,
  onValidityChange,
  id = 'password',
  name = 'password',
  placeholder = 'Enter password',
  required = true,
  className,
}: PasswordStrengthMeterProps) {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    label: 'Very Weak',
    color: 'bg-destructive',
    isValid: false,
    feedback: [],
  });

  useEffect(() => {
    const newStrength = checkPasswordStrength(password);
    setStrength(newStrength);
    onValidityChange?.(newStrength.isValid);
  }, [password, onValidityChange]);

  const handleGeneratePassword = () => {
    const newPassword = generateStrongPassword(16);
    onPasswordChange(newPassword);
    toast({
      title: "Strong password generated!",
      description: "A secure password has been created for you.",
    });
  };

  const handleCopyPassword = async () => {
    if (password) {
      await navigator.clipboard.writeText(password);
      toast({
        title: "Password copied!",
        description: "Make sure to save it in a secure location.",
      });
    }
  };

  const progressValue = (strength.score / 5) * 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          Password
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleGeneratePassword}
          className="h-7 text-xs gap-1 text-primary hover:text-primary/80"
        >
          <Sparkles className="w-3 h-3" />
          Generate Strong Password
        </Button>
      </div>

      <div className="relative">
        <Input
          id={id}
          name={name}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={cn(
            'pr-20',
            !strength.isValid && password ? 'border-destructive focus-visible:ring-destructive' : '',
            strength.isValid ? 'border-green-500 focus-visible:ring-green-500' : '',
            className
          )}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {password && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCopyPassword}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </Button>
        </div>
      </div>

      {/* Strength indicator */}
      {password && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Password Strength:</span>
            <span className={cn(
              'font-medium',
              strength.score <= 1 ? 'text-destructive' : '',
              strength.score === 2 ? 'text-orange-500' : '',
              strength.score === 3 ? 'text-yellow-500' : '',
              strength.score >= 4 ? 'text-green-500' : '',
            )}>
              {strength.label}
            </span>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2"
          />
        </div>
      )}

      {/* Requirements checklist */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Password must have:</p>
        <div className="grid gap-1">
          {PASSWORD_REQUIREMENTS.map((req) => {
            const passed = req.regex.test(password);
            return (
              <div 
                key={req.id} 
                className={cn(
                  'flex items-center gap-2 text-xs transition-colors',
                  passed ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'
                )}
              >
                {passed ? (
                  <Check className="w-3.5 h-3.5" />
                ) : (
                  <X className="w-3.5 h-3.5" />
                )}
                <span>{req.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {!strength.isValid && password && (
        <p className="text-xs text-destructive">
          Please use a stronger password that meets all requirements above.
        </p>
      )}
    </div>
  );
}
