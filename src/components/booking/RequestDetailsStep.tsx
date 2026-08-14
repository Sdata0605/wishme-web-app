import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LanguageOption {
  language: string;
  locale: string;
}

const FALLBACK_LANGUAGES: LanguageOption[] = [
  { language: 'English', locale: 'en-US' },
  { language: 'Hindi', locale: 'hi-IN' },
  { language: 'Spanish', locale: 'es-ES' },
  { language: 'French', locale: 'fr-FR' },
  { language: 'German', locale: 'de-DE' },
  { language: 'Portuguese', locale: 'pt-BR' },
  { language: 'Italian', locale: 'it-IT' },
  { language: 'Chinese', locale: 'zh-CN' },
  { language: 'Japanese', locale: 'ja-JP' },
  { language: 'Korean', locale: 'ko-KR' },
  { language: 'Turkish', locale: 'tr-TR' },
  { language: 'Arabic', locale: 'ar-SA' },
  { language: 'Tamil', locale: 'ta-IN' },
  { language: 'Telugu', locale: 'te-IN' },
  { language: 'Bengali', locale: 'bn-IN' },
  { language: 'Marathi', locale: 'mr-IN' },
  { language: 'Gujarati', locale: 'gu-IN' },
  { language: 'Kannada', locale: 'kn-IN' },
  { language: 'Malayalam', locale: 'ml-IN' },
  { language: 'Punjabi', locale: 'pa-IN' },
  { language: 'Urdu', locale: 'ur-PK' },
  { language: 'Russian', locale: 'ru-RU' },
  { language: 'Dutch', locale: 'nl-NL' },
  { language: 'Polish', locale: 'pl-PL' },
  { language: 'Indonesian', locale: 'id-ID' },
  { language: 'Thai', locale: 'th-TH' },
  { language: 'Vietnamese', locale: 'vi-VN' },
  { language: 'Swedish', locale: 'sv-SE' },
  { language: 'Romanian', locale: 'ro-RO' },
  { language: 'Greek', locale: 'el-GR' },
  { language: 'Czech', locale: 'cs-CZ' },
  { language: 'Filipino', locale: 'fil-PH' },
  { language: 'Malay', locale: 'ms-MY' },
  { language: 'Ukrainian', locale: 'uk-UA' },
  { language: 'Finnish', locale: 'fi-FI' },
  { language: 'Danish', locale: 'da-DK' },
  { language: 'Bulgarian', locale: 'bg-BG' },
  { language: 'Croatian', locale: 'hr-HR' },
  { language: 'Slovak', locale: 'sk-SK' },
];

interface RequestDetailsStepProps {
  bookingData: any;
  updateBookingData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  celebrity: any;
  serviceType: string;
  currentStep: number;
  totalSteps: number;
}

export function RequestDetailsStep({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
  celebrity,
  serviceType,
  currentStep,
  totalSteps
}: RequestDetailsStepProps) {
  const [languages, setLanguages] = useState<LanguageOption[]>(FALLBACK_LANGUAGES);
  const [loadingLanguages, setLoadingLanguages] = useState(false);

  const [formData, setFormData] = useState({
    videoType: serviceType === 'video' ? 'marketing' : '',
    businessName: '',
    businessPronunciation: '',
    recipientName: '',
    recipientRelation: '',
    occasion: '',
    message: '',
    preferredLanguage: 'en-US',
    ...bookingData.requestDetails
  });

  useEffect(() => {
    if (serviceType === 'video' || serviceType === 'wish') {
      fetchLanguages();
    }
  }, [serviceType]);

  const fetchLanguages = async () => {
    setLoadingLanguages(true);
    try {
      const { data, error } = await supabase.functions.invoke('heygen-get-languages');
      if (!error && data?.languages?.length > 0) {
        setLanguages(data.languages);
      }
    } catch (e) {
      console.error('Failed to fetch languages, using fallback:', e);
    } finally {
      setLoadingLanguages(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    updateBookingData({ requestDetails: formData });
    onNext();
  };

  const isFormValid = () => {
    if (serviceType === 'video') {
      return formData.videoType && formData.businessName;
    } else if (serviceType === 'wish') {
      return formData.recipientName && formData.occasion;
    } else if (serviceType === 'ad') {
      return formData.businessName;
    }
    return false;
  };

  const selectedLangLabel = languages.find(l => l.locale === formData.preferredLanguage)?.language || 'English';

  const LanguageSelector = () => (
    <div>
      <Label className="text-base font-medium flex items-center gap-2">
        <Globe className="w-4 h-4" />
        Video Language
      </Label>
      <p className="text-sm text-muted-foreground mb-2">
        Choose the language for the celebrity's video message
      </p>
      {loadingLanguages ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading languages...
        </div>
      ) : (
        <Select
          value={formData.preferredLanguage}
          onValueChange={(value) => handleInputChange('preferredLanguage', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select language" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px]">
            {languages.map((lang) => (
              <SelectItem key={lang.locale} value={lang.locale}>
                {lang.language}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Request details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {serviceType === 'video' && (
          <>
            <div>
              <Label className="text-base font-medium mb-4 block">What type of video are you requesting?</Label>
              <RadioGroup 
                value={formData.videoType} 
                onValueChange={(value) => handleInputChange('videoType', value)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div className="flex items-center space-x-2 border rounded-lg p-4">
                  <RadioGroupItem value="marketing" id="marketing" />
                  <div>
                    <Label htmlFor="marketing" className="font-medium">Marketing</Label>
                    <p className="text-sm text-muted-foreground">Promote a business or product</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-4">
                  <RadioGroupItem value="business_event" id="business_event" />
                  <div>
                    <Label htmlFor="business_event" className="font-medium">Business event</Label>
                    <p className="text-sm text-muted-foreground">Show at an event, conference, or meeting</p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="businessName" className="text-base font-medium">Business name</Label>
              <p className="text-sm text-muted-foreground mb-2">What is the name of the business you're booking this video for?</p>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                placeholder="Enter business name"
              />
            </div>

            <div>
              <Label htmlFor="businessPronunciation" className="text-base font-medium">Business name pronunciation (optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">This could be a phonetic pronunciation, or an example of something the name sounds like.</p>
              <Input
                id="businessPronunciation"
                value={formData.businessPronunciation}
                onChange={(e) => handleInputChange('businessPronunciation', e.target.value)}
                placeholder="How to pronounce the business name"
              />
            </div>

            <LanguageSelector />
          </>
        )}

        {serviceType === 'wish' && (
          <>
            <div>
              <Label htmlFor="recipientName" className="text-base font-medium">Recipient's name</Label>
              <p className="text-sm text-muted-foreground mb-2">Who is this message for?</p>
              <Input
                id="recipientName"
                value={formData.recipientName}
                onChange={(e) => handleInputChange('recipientName', e.target.value)}
                placeholder="Enter recipient's name"
              />
            </div>

            <div>
              <Label htmlFor="recipientRelation" className="text-base font-medium">Your relationship (optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">How do you know this person?</p>
              <Input
                id="recipientRelation"
                value={formData.recipientRelation}
                onChange={(e) => handleInputChange('recipientRelation', e.target.value)}
                placeholder="e.g., best friend, cousin, colleague"
              />
            </div>

            <div>
              <Label htmlFor="occasion" className="text-base font-medium">Occasion</Label>
              <p className="text-sm text-muted-foreground mb-2">What's the special occasion?</p>
              <Input
                id="occasion"
                value={formData.occasion}
                onChange={(e) => handleInputChange('occasion', e.target.value)}
                placeholder="e.g., birthday, anniversary, graduation"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-base font-medium">Special message (optional)</Label>
              <p className="text-sm text-muted-foreground mb-2">Any specific message you'd like to include?</p>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Enter your message here..."
                rows={4}
              />
            </div>

            <LanguageSelector />
          </>
        )}

        {serviceType === 'ad' && (
          <>
            <div>
              <Label htmlFor="businessName" className="text-base font-medium">Business/Product name</Label>
              <p className="text-sm text-muted-foreground mb-2">What are you promoting?</p>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                placeholder="Enter business or product name"
              />
            </div>

            <div>
              <Label htmlFor="message" className="text-base font-medium">Ad description</Label>
              <p className="text-sm text-muted-foreground mb-2">Describe what you want to promote</p>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => handleInputChange('message', e.target.value)}
                placeholder="Describe your product/service..."
                rows={4}
              />
            </div>
          </>
        )}

        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onPrev} disabled={currentStep === 1}>
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
