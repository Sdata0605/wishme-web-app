import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

interface CreativeGuidelinesStepProps {
  bookingData: any;
  updateBookingData: (data: any) => void;
  onNext: () => void;
  onPrev: () => void;
  celebrity: any;
  serviceType: string;
  currentStep: number;
  totalSteps: number;
}

export function CreativeGuidelinesStep({
  bookingData,
  updateBookingData,
  onNext,
  onPrev,
  celebrity,
  serviceType,
  currentStep,
  totalSteps
}: CreativeGuidelinesStepProps) {
  const [formData, setFormData] = useState({
    goal: '',
    goalOther: '',
    toneAndStyle: '',
    filmingRequirements: '',
    thingsToAvoid: [] as string[],
    thingsToAvoidOther: '',
    otherInfo: '',
    ...bookingData.creativeGuidelines
  });

  const goalOptions = [
    "Birthday wish for a friend",
    "Anniversary celebration",
    "Product launch promotion",
    "Brand ambassador campaign",
    "Social media content",
    "Event invitation",
    "Thank you message",
    "Motivational message",
    "Other"
  ];

  const thingsToAvoidOptions = [
    "Visible brand logos",
    "Political references",
    "Religious content",
    "Controversial topics",
    "Competitor mentions",
    "Profanity or explicit content",
    "Alcohol or tobacco products",
    "Other"
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAvoidToggle = (value: string) => {
    setFormData(prev => ({
      ...prev,
      thingsToAvoid: prev.thingsToAvoid.includes(value)
        ? prev.thingsToAvoid.filter(item => item !== value)
        : [...prev.thingsToAvoid, value]
    }));
  };

  const handleNext = () => {
    updateBookingData({ creativeGuidelines: formData });
    onNext();
  };

  const isFormValid = () => {
    return formData.goal.trim().length > 0 || formData.goalOther.trim().length > 0;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creative guidelines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label htmlFor="goal" className="text-base font-medium">What's the goal of this {serviceType === 'video' ? 'video' : serviceType}? *</Label>
          <Select value={formData.goal} onValueChange={(value) => handleInputChange('goal', value)}>
            <SelectTrigger className="mt-2">
              <SelectValue placeholder="Select a goal..." />
            </SelectTrigger>
            <SelectContent>
              {goalOptions.map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          {formData.goal === 'Other' && (
            <Textarea
              className="mt-3"
              value={formData.goalOther}
              onChange={(e) => handleInputChange('goalOther', e.target.value)}
              placeholder="Please specify your goal..."
              rows={3}
              maxLength={500}
            />
          )}
        </div>

        <div>
          <Label htmlFor="toneAndStyle" className="text-base font-medium">Tone and style (optional)</Label>
          <Textarea
            id="toneAndStyle"
            value={formData.toneAndStyle}
            onChange={(e) => handleInputChange('toneAndStyle', e.target.value)}
            placeholder="Cool, charismatic, and just cheeky enough to make people smile"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">{formData.toneAndStyle.length}/500 characters</p>
        </div>

        {serviceType === 'video' && (
          <div>
            <Label htmlFor="filmingRequirements" className="text-base font-medium">Filming requirements (optional)</Label>
            <Textarea
              id="filmingRequirements"
              value={formData.filmingRequirements}
              onChange={(e) => handleInputChange('filmingRequirements', e.target.value)}
              placeholder="Hold the phone in your hand and film with a blank wall as the background"
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.filmingRequirements.length}/500 characters</p>
          </div>
        )}

        <div>
          <Label className="text-base font-medium mb-3 block">Things to avoid (optional)</Label>
          <div className="space-y-3">
            {thingsToAvoidOptions.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`avoid-${option}`}
                  checked={formData.thingsToAvoid.includes(option)}
                  onCheckedChange={() => handleAvoidToggle(option)}
                />
                <label
                  htmlFor={`avoid-${option}`}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {option}
                </label>
              </div>
            ))}
          </div>
          
          {formData.thingsToAvoid.includes('Other') && (
            <Textarea
              className="mt-3"
              value={formData.thingsToAvoidOther}
              onChange={(e) => handleInputChange('thingsToAvoidOther', e.target.value)}
              placeholder="Please specify what to avoid..."
              rows={2}
              maxLength={500}
            />
          )}
        </div>

        <div>
          <Label htmlFor="otherInfo" className="text-base font-medium">Other things to know (optional)</Label>
          <Textarea
            id="otherInfo"
            value={formData.otherInfo}
            onChange={(e) => handleInputChange('otherInfo', e.target.value)}
            placeholder="Any additional information that might be helpful"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground mt-1">{formData.otherInfo.length}/500 characters</p>
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