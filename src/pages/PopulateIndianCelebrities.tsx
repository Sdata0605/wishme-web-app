import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function PopulateIndianCelebrities() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const populateCelebrities = async () => {
    setLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      toast.info('Starting to populate Indian celebrities with AI-generated content...');
      
      const { data, error } = await supabase.functions.invoke('populate-indian-celebrities');

      if (error) {
        throw error;
      }

      console.log('Population result:', data);
      
      setStatus('success');
      setMessage('Successfully populated 15 Indian celebrities with realistic photos and personalized video wishes!');
      toast.success('Database populated successfully!');
      
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error: any) {
      console.error('Error populating celebrities:', error);
      setStatus('error');
      setMessage(error.message || 'Failed to populate celebrities');
      toast.error('Failed to populate celebrities. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-accent/5">
      <Card className="w-full max-w-2xl p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-center">Populate Indian Celebrities</h1>
          <p className="text-muted-foreground text-center">
            Generate realistic photos and personalized video wishes for 15 famous Indian celebrities
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold">This will:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Clear existing celebrity data</li>
              <li>Generate AI photos for Shah Rukh Khan, Deepika Padukone, Virat Kohli, and 12 more stars</li>
              <li>Create personalized video wishes for different occasions (Birthday, Anniversary, Diwali, etc.)</li>
              <li>Use Indian names in wish messages (Rahul, Priya, Amit, Neha, etc.)</li>
              <li>Store all images in Supabase Storage</li>
              <li>Populate the database with bright, attractive content</li>
            </ul>
          </div>

          <Button 
            onClick={populateCelebrities} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating AI Content...
              </>
            ) : (
              'Populate Indian Celebrities'
            )}
          </Button>

          {status === 'success' && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <p className="text-green-600 dark:text-green-400 font-medium">
                ✓ {message}
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-600 dark:text-red-400 font-medium">
                ✗ {message}
              </p>
            </div>
          )}

          {loading && (
            <div className="space-y-3">
              <div className="bg-primary/10 rounded-lg p-4">
                <p className="text-sm text-center animate-pulse">
                  🎬 Generating realistic celebrity photos and videos...
                  <br />
                  <span className="text-xs text-muted-foreground">
                    This may take 2-3 minutes as we generate AI content for 15 celebrities
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}