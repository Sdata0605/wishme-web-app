import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Gift, Mail, Phone } from "lucide-react";

interface RecipientSchedulingProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  recipientData: {
    name: string;
    email: string;
    phone: string;
  };
  onDataChange: (data: {
    name: string;
    email: string;
    phone: string;
  }) => void;
}

export function RecipientScheduling({
  enabled,
  onEnabledChange,
  recipientData,
  onDataChange,
}: RecipientSchedulingProps) {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="schedule-gift"
            checked={enabled}
            onCheckedChange={(checked) => onEnabledChange(checked as boolean)}
          />
          <Label
            htmlFor="schedule-gift"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Gift className="w-4 h-4 text-primary" />
            <span className="font-medium">Send this as a gift to someone else</span>
          </Label>
        </div>
        {enabled && (
          <p className="text-sm text-muted-foreground mt-1">
            Enter your friend's details so they receive the wish too
          </p>
        )}
      </CardHeader>

      {enabled && (
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Recipient's Name *</Label>
            <Input
              id="recipient-name"
              placeholder="Enter recipient's name"
              value={recipientData.name}
              onChange={(e) => onDataChange({ ...recipientData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Recipient's Email
            </Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="recipient@example.com"
              value={recipientData.email}
              onChange={(e) => onDataChange({ ...recipientData, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient-phone" className="flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Recipient's WhatsApp Number
            </Label>
            <Input
              id="recipient-phone"
              type="tel"
              placeholder="+91 9876543210"
              value={recipientData.phone}
              onChange={(e) => onDataChange({ ...recipientData, phone: e.target.value })}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            * The recipient will receive an email/WhatsApp with a link to view their personalized message when the admin sends the order.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
