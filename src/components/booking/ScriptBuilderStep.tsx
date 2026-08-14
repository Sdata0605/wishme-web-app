import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Wand2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScriptBuilderStepProps {
  bookingData: any;
  updateBookingData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  celebrity: any;
  serviceType: string;
  currentStep: number;
  totalSteps: number;
}

export function ScriptBuilderStep({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
  celebrity,
  serviceType,
  currentStep,
  totalSteps
}: ScriptBuilderStepProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    scriptType: 'talking_points',
    talkingPoints: '',
    requiredLines: '',
    exactScript: '',
    generatedScript: '',
    ...bookingData.scriptBuilder
  });
  const [isGenerating, setIsGenerating] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateScript = async () => {
    if (!formData.talkingPoints.trim()) {
      toast({
        title: "Error",
        description: "Please provide talking points first",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Determine language from request details
      const preferredLocale = bookingData.requestDetails?.preferredLanguage || 'en-US';
      const localeNames: Record<string, string> = {
        'en-US': 'English', 'hi-IN': 'Hindi', 'es-ES': 'Spanish', 'fr-FR': 'French',
        'de-DE': 'German', 'pt-BR': 'Portuguese', 'it-IT': 'Italian', 'zh-CN': 'Chinese',
        'ja-JP': 'Japanese', 'ko-KR': 'Korean', 'tr-TR': 'Turkish', 'ar-SA': 'Arabic',
        'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'bn-IN': 'Bengali', 'mr-IN': 'Marathi',
        'gu-IN': 'Gujarati', 'kn-IN': 'Kannada', 'ml-IN': 'Malayalam', 'pa-IN': 'Punjabi',
        'ur-PK': 'Urdu', 'ru-RU': 'Russian', 'th-TH': 'Thai', 'vi-VN': 'Vietnamese',
      };
      const langName = localeNames[preferredLocale] || 'English';
      const languageNote = langName !== 'English' 
        ? `\n\nIMPORTANT: Write the ENTIRE script in ${langName}. The celebrity should speak naturally in ${langName}.` 
        : '';

      const prompt = `Generate a ${serviceType} script for ${celebrity.name} based on the following details:
      
      Service Type: ${serviceType}
      Celebrity: ${celebrity.name} (${celebrity.category})
      Talking Points: ${formData.talkingPoints}
      Required Lines: ${formData.requiredLines || 'None specified'}
      Request Details: ${JSON.stringify(bookingData.requestDetails)}
      Creative Guidelines: ${JSON.stringify(bookingData.creativeGuidelines)}
      
      Create a natural, engaging script that incorporates these elements while maintaining ${celebrity.name}'s personality and style.${languageNote}`;

      const { data, error } = await supabase.functions.invoke('generate-script', {
        body: { prompt }
      });

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        generatedScript: data.script
      }));

      toast({
        title: "Success",
        description: "Script generated successfully!"
      });
    } catch (error) {
      console.error('Error generating script:', error);
      toast({
        title: "Error",
        description: "Failed to generate script. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNext = () => {
    updateBookingData({ scriptBuilder: formData });
    onNext();
  };

  const isFormValid = () => {
    if (formData.scriptType === 'talking_points') {
      return formData.talkingPoints.trim().length > 0;
    } else {
      return formData.exactScript.trim().length > 0;
    }
  };

  if (serviceType === 'ad') {
    // For ad service, we show image generation options
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ad Creative Builder</CardTitle>
          <p className="text-sm text-muted-foreground">
            {celebrity.name} will create a promotional image based on your requirements.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="adDescription" className="text-base font-medium">Ad description</Label>
            <Textarea
              id="adDescription"
              value={formData.talkingPoints}
              onChange={(e) => handleInputChange('talkingPoints', e.target.value)}
              placeholder="Describe what the ad should convey and any specific elements to include..."
              rows={4}
              maxLength={1500}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.talkingPoints.length}/1500 characters</p>
          </div>

          <div>
            <Label htmlFor="imageStyle" className="text-base font-medium">Image style preferences (optional)</Label>
            <Textarea
              id="imageStyle"
              value={formData.requiredLines}
              onChange={(e) => handleInputChange('requiredLines', e.target.value)}
              placeholder="Professional, casual, vibrant colors, minimalist, etc."
              rows={2}
              maxLength={300}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.requiredLines.length}/300 characters</p>
          </div>

          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onPrev}>
              Back
            </Button>
            <Button onClick={handleNext} disabled={!isFormValid()}>
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Script builder</CardTitle>
        <p className="text-sm text-muted-foreground">
          {celebrity.name} will refer to the details below while recording. Don't worry about introductions - we'll remind them to introduce themselves at the start.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium mb-4 block">How should {celebrity.name} use this request?</Label>
          <RadioGroup 
            value={formData.scriptType} 
            onValueChange={(value) => handleInputChange('scriptType', value)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2 border rounded-lg p-4">
              <RadioGroupItem value="talking_points" id="talking_points" />
              <div>
                <Label htmlFor="talking_points" className="font-medium">Talking points</Label>
                <p className="text-sm text-muted-foreground">Ad-lib on these points</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-4">
              <RadioGroupItem value="exact_script" id="exact_script" />
              <div>
                <Label htmlFor="exact_script" className="font-medium">Exact script</Label>
                <p className="text-sm text-muted-foreground">Read this verbatim</p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {formData.scriptType === 'talking_points' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="talkingPoints" className="text-base font-medium">Talking points</Label>
              <Button
                onClick={generateScript}
                disabled={isGenerating || !formData.talkingPoints.trim()}
                size="sm"
                variant="outline"
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4 mr-2" />
                )}
                Generate Script
              </Button>
            </div>
            <Textarea
              id="talkingPoints"
              value={formData.talkingPoints}
              onChange={(e) => handleInputChange('talkingPoints', e.target.value)}
              placeholder="Key points for the celebrity to cover..."
              rows={6}
              maxLength={1500}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.talkingPoints.length}/1500 characters</p>
          </div>
        )}

        {formData.scriptType === 'exact_script' && (
          <div>
            <Label htmlFor="exactScript" className="text-base font-medium">Exact script</Label>
            <Textarea
              id="exactScript"
              value={formData.exactScript}
              onChange={(e) => handleInputChange('exactScript', e.target.value)}
              placeholder="The exact words you want the celebrity to say..."
              rows={6}
              maxLength={1500}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.exactScript.length}/1500 characters</p>
          </div>
        )}

        <div>
          <Label htmlFor="requiredLines" className="text-base font-medium">Required lines (optional)</Label>
          <Input
            id="requiredLines"
            value={formData.requiredLines}
            onChange={(e) => handleInputChange('requiredLines', e.target.value)}
            placeholder="Be sure to say the phrase 'Just do it' at some point in the video."
            maxLength={150}
          />
          <p className="text-xs text-muted-foreground mt-1">{formData.requiredLines.length}/150 characters</p>
        </div>

        {formData.generatedScript && (
          <div>
            <Label className="text-base font-medium">AI Generated Script</Label>
            <div className="border rounded-lg p-4 bg-muted/50 mt-2">
              <p className="text-sm whitespace-pre-wrap">{formData.generatedScript}</p>
            </div>
            <Button
              onClick={() => handleInputChange(formData.scriptType === 'talking_points' ? 'talkingPoints' : 'exactScript', formData.generatedScript)}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              Use This Script
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev}>
            Back
          </Button>
          <Button onClick={handleNext} disabled={!isFormValid()}>
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}