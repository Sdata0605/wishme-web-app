import React from 'react';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAIPreferences } from '@/hooks/useAIPreferences';

export const PreferencesDialog = () => {
  const { preferences, isLoading, updatePreferences } = useAIPreferences();

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="hidden md:flex items-center justify-center transition-colors cursor-pointer"
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.45)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
          }}
          title="AI Assistant Settings"
        >
          <Settings style={{ width: '14px', height: '14px' }} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Assistant Preferences</DialogTitle>
          <DialogDescription>
            Customize your AI assistant experience
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="voice-enabled">Voice Output</Label>
              <p className="text-xs text-muted-foreground">
                Enable text-to-speech for AI responses
              </p>
            </div>
            <Switch
              id="voice-enabled"
              checked={preferences.voice_enabled}
              onCheckedChange={(checked) => 
                updatePreferences({ voice_enabled: checked })
              }
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="auto-open">Auto Open on Voice</Label>
              <p className="text-xs text-muted-foreground">
                Open chat interface when using voice input
              </p>
            </div>
            <Switch
              id="auto-open"
              checked={preferences.auto_open_on_voice}
              onCheckedChange={(checked) => 
                updatePreferences({ auto_open_on_voice: checked })
              }
              disabled={isLoading}
            />
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-0.5">
              <Label htmlFor="default-minimized">Start Minimized</Label>
              <p className="text-xs text-muted-foreground">
                Open chat interface in minimized state
              </p>
            </div>
            <Switch
              id="default-minimized"
              checked={preferences.default_minimized}
              onCheckedChange={(checked) => 
                updatePreferences({ default_minimized: checked })
              }
              disabled={isLoading}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
