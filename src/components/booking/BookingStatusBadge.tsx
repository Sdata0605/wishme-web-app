import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export interface BookingStatusInfo {
  label: string;
  color: string;
  pulse?: boolean;
}

/**
 * Derives the correct display status from a booking's composite state.
 * Works for both admin and user views.
 */
export function getBookingStatusInfo(booking: {
  status?: string;
  generation_status?: string;
  video_status?: string;
  video_sent_at?: string;
}): BookingStatusInfo {
  const status = booking.status;
  const genStatus = booking.generation_status;
  const vidStatus = booking.video_status;

  // Terminal / error states
  if (status === 'cancelled') return { label: '❌ Cancelled', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
  if (status === 'failed' || vidStatus === 'failed' || genStatus === 'failed')
    return { label: '⚠️ Failed', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' };
  if (genStatus === 'timeout' || vidStatus === 'timeout')
    return { label: '⚠️ Timed Out', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' };

  // Delivery states
  if (status === 'completed') return { label: '✅ Completed', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  if (status === 'video_sent') return { label: '📤 Video Sent', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };
  // Legacy 'sent' status support
  if (status === 'sent') return { label: '📤 Video Sent', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' };

  // Video ready but not sent
  if (genStatus === 'completed' && vidStatus === 'ready')
    return { label: '🎥 Video Ready', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' };

  // Active processing states
  if (genStatus === 'uploading') return { label: '⬆️ Uploading Video', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', pulse: true };
  if (genStatus === 'downloading') return { label: '⬇️ Processing Video', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', pulse: true };
  if (genStatus === 'video_generating') return { label: '🎬 Creating Video', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', pulse: true };
  if (genStatus === 'script_generating') return { label: '🤖 Generating Script', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200', pulse: true };

  // Base states
  if (status === 'confirmed') return { label: '✅ Confirmed', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' };
  if (status === 'pending') return { label: '⏳ Pending Review', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' };

  return { label: status || 'Unknown', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' };
}

interface BookingStatusBadgeProps {
  booking: {
    status?: string;
    generation_status?: string;
    video_status?: string;
    video_sent_at?: string;
    generation_error?: string;
  };
  showSentTime?: boolean;
  showErrorTooltip?: boolean;
}

export function BookingStatusBadge({ booking, showSentTime = false, showErrorTooltip = false }: BookingStatusBadgeProps) {
  const { label, color, pulse } = getBookingStatusInfo(booking);

  const isFailed = booking.status === 'failed' || booking.generation_status === 'failed' || booking.video_status === 'failed';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <Badge className={`${color} flex items-center gap-1.5`}>
          {pulse && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
            </span>
          )}
          {label}
        </Badge>
        {showErrorTooltip && isFailed && booking.generation_error && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{booking.generation_error}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      {showSentTime && (booking.status === 'video_sent' || booking.status === 'sent') && booking.video_sent_at && (
        <span className="text-xs text-muted-foreground">
          Sent {formatDistanceToNow(new Date(booking.video_sent_at), { addSuffix: true })}
        </span>
      )}
    </div>
  );
}
