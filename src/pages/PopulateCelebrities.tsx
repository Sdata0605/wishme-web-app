import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PopulateCelebrities() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const clearAndPopulate = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('Clearing existing data...');

    try {
      // Clear existing celebrity-related data
      await supabase.from('celebrity_media').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('celebrity_occasions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('celebrity_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('celebrities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      
      setMessage('Generating new celebrity data and AI videos...');
      
      // Populate with new data
      const { data, error } = await supabase.functions.invoke('insert-sample-celebrity');

      if (error) throw error;

      setStatus('success');
      setMessage(data.message || 'Successfully populated database with celebrity data and AI videos!');
      
      // Redirect to home after 2 seconds
      setTimeout(() => navigate('/'), 2000);
    } catch (error) {
      console.error('Error populating data:', error);
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to populate data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">Populate Celebrity Database</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-center">
            This will populate the database with sample Indian celebrity data and generate AI video samples for different occasions.
          </p>

          <Button 
            onClick={clearAndPopulate} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating celebrities and AI videos...
              </>
            ) : (
              'Clear & Populate Database'
            )}
          </Button>

          {status === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {status === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm">{message}</p>
            </div>
          )}

          {loading && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                {message || 'This may take 1-2 minutes as we generate AI videos for each celebrity...'}
              </p>
              <div className="flex justify-center">
                <div className="animate-pulse text-xs text-primary">
                  Generating realistic Indian celebrity images and videos...
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
