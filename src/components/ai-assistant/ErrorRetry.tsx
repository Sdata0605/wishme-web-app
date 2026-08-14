import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorRetryProps {
  error: string;
  onRetry: () => void;
}

export const ErrorRetry = ({ error, onRetry }: ErrorRetryProps) => {
  return (
    <Card className="p-4 border-destructive/50 bg-destructive/5 animate-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-4 w-4 text-destructive" />
        </div>
        <div className="flex-1 space-y-2">
          <div>
            <p className="text-sm font-medium text-destructive">Connection Error</p>
            <p className="text-xs text-muted-foreground mt-1">{error}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs"
            onClick={onRetry}
          >
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        </div>
      </div>
    </Card>
  );
};
