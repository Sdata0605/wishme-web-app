import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export function ProfileAlert() {
  const { profile } = useAuth();
  
  if (!profile) return null;

  const completionPercentage = (profile as any).profile_completion_percentage || 20;
  
  if (completionPercentage >= 100) return null;

  return (
    <Alert className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertCircle className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-orange-800 dark:text-orange-200">
              Complete Your Profile
            </span>
            <span className="text-sm text-orange-600 dark:text-orange-300">
              {completionPercentage}% complete
            </span>
          </div>
          <Progress value={completionPercentage} className="mb-2 h-2" />
          <p className="text-sm text-orange-700 dark:text-orange-300">
            Complete your profile with bank details, address, and KYC verification to unlock all features.
          </p>
        </div>
        <Button asChild className="ml-4 bg-orange-600 hover:bg-orange-700">
          <Link to="/profile">Update Profile</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}