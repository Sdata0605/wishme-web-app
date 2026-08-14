import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Loader2, Video, CheckCircle, XCircle, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function GenerateVideoMessages() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [generatedCount, setGeneratedCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    checkAdminAccess();
  }, [user, profile]);

  const checkAdminAccess = async () => {
    if (!user || !profile) {
      setCheckingAuth(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
    } catch (error) {
      console.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');
    
    try {
      toast({
        title: "Starting Generation",
        description: "Generating celebrity video messages with AI...",
      });

      const { data, error } = await supabase.functions.invoke('generate-celebrity-video-messages');

      if (error) throw error;

      setStatus('success');
      setGeneratedCount(data.data?.length || 0);
      setMessage(data.message || 'Video messages generated successfully!');
      
      toast({
        title: "Success!",
        description: `Generated ${data.data?.length || 0} video messages`,
      });

    } catch (error: any) {
      console.error('Error generating video messages:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to generate video messages');
      
      toast({
        title: "Generation Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <ShieldAlert className="w-16 h-16 mx-auto text-muted-foreground" />
            <CardTitle>Authentication Required</CardTitle>
            <p className="text-muted-foreground">Please log in to access this tool</p>
            <Button onClick={() => navigate('/auth')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-8 text-center space-y-4">
            <ShieldAlert className="w-16 h-16 mx-auto text-destructive" />
            <CardTitle>Admin Access Required</CardTitle>
            <p className="text-muted-foreground">
              This tool is only available to administrators
            </p>
            <Button onClick={() => navigate('/')}>Go Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Generate Celebrity Video Messages
          </h1>
          <p className="text-muted-foreground text-lg">
            Create AI-powered sample video messages for Indian celebrities
          </p>
        </div>

        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="w-6 h-6 text-primary" />
              AI Video Message Generator
            </CardTitle>
            <CardDescription>
              This tool uses Lovable AI (Gemini 2.5 Flash Image Preview) to generate
              realistic video message thumbnails for celebrities wishing common people
              on special occasions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-lg">What will be generated:</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• AI-generated video message thumbnails</li>
                <li>• Personalized wishes for Indian names</li>
                <li>• Multiple occasions (Birthday, Anniversary, Diwali, etc.)</li>
                <li>• Featuring verified Indian celebrities</li>
                <li>• Stored in celebrity_media table as promotional content</li>
              </ul>
            </div>

            {status === 'success' && (
              <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {message}
                  <br />
                  <span className="font-semibold">Generated {generatedCount} video messages</span>
                </AlertDescription>
              </Alert>
            )}

            {status === 'error' && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
                <XCircle className="h-5 w-5 text-red-600" />
                <AlertDescription className="text-red-800 dark:text-red-200">
                  {message}
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGenerate}
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Video Messages...
                </>
              ) : (
                <>
                  <Video className="mr-2 h-5 w-5" />
                  Generate Video Messages
                </>
              )}
            </Button>

            {loading && (
              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary animate-pulse w-full" />
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  This may take a few minutes. Please wait...
                </p>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <h4 className="font-semibold text-sm">Expected Celebrities:</h4>
              <div className="flex flex-wrap gap-2">
                {[
                  'Shah Rukh Khan',
                  'Deepika Padukone',
                  'Virat Kohli',
                  'Priyanka Chopra',
                  'Ranveer Singh',
                  'Alia Bhatt',
                  'MS Dhoni',
                  'Katrina Kaif',
                  'Ranbir Kapoor',
                  'Kareena Kapoor Khan'
                ].map(name => (
                  <span key={name} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <p className="font-semibold text-foreground">Fetch Celebrities</p>
                <p>Retrieves active, verified Indian celebrities from database</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <p className="font-semibold text-foreground">Generate AI Images</p>
                <p>Uses Lovable AI to create realistic video message thumbnails</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <p className="font-semibold text-foreground">Upload to Storage</p>
                <p>Stores generated images in Supabase Storage</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <p className="font-semibold text-foreground">Create Database Records</p>
                <p>Inserts video message records in celebrity_media table</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}