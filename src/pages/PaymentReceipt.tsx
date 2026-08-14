import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Copy, ArrowLeft, Receipt } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function PaymentReceipt() {
  const { wishmePaymentId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    if (!wishmePaymentId) { navigate('/dashboard'); return; }
    fetchTransaction();
  }, [user, wishmePaymentId, authLoading]);

  const fetchTransaction = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('wishme_payment_id', wishmePaymentId)
        .single();

      if (error) throw error;
      setTransaction(data);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      toast({ title: "Not Found", description: "Payment receipt not found", variant: "destructive" });
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentId = () => {
    if (wishmePaymentId) {
      navigator.clipboard.writeText(wishmePaymentId);
      toast({ title: "Copied!", description: "Payment ID copied to clipboard" });
    }
  };

  const getServiceLabel = (type: string) => {
    const labels: Record<string, string> = {
      booking: 'Celebrity Booking',
      wish_order: 'Celebrity Wish',
      music: 'AI Music',
      greeting_card: 'Greeting Card',
      photo_wish: 'Photo Wish',
      image_promotion: 'Image Promotion',
      voice_call: 'Voice Call',
      celebrity_subscription: 'Celebrity Subscription',
      deposit: 'Wallet Deposit',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  if (!transaction) return null;

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-12 pt-24 mobile-safe-bottom">
        <div className="max-w-lg mx-auto">
          <Card className="border-2 border-primary/20 shadow-xl">
            <CardContent className="p-8">
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h1 className="text-2xl font-bold mb-1">Payment Receipt</h1>
                <p className="text-muted-foreground">WishMe</p>
              </div>

              {/* Payment ID Box */}
              <div 
                className="rounded-xl p-4 mb-6 text-center border"
                style={{
                  background: 'rgba(16,185,129,0.1)',
                  borderColor: 'rgba(16,185,129,0.3)',
                }}
              >
                <p className="text-xs text-muted-foreground mb-1">Payment ID</p>
                <p className="font-mono text-2xl font-bold text-green-600 dark:text-green-400 tracking-wider">
                  {wishmePaymentId}
                </p>
                <Button variant="ghost" size="sm" onClick={copyPaymentId} className="mt-2">
                  <Copy className="w-4 h-4 mr-1" /> Copy ID
                </Button>
              </div>

              {/* Details */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" /> Paid
                  </Badge>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-semibold text-lg">₹{transaction.amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Method</span>
                  <span className="capitalize">{transaction.payment_method === 'razorpay' ? 'Online Payment' : 'Wallet'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Service</span>
                  <span>{getServiceLabel(transaction.service_type)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span className="text-sm">{format(new Date(transaction.paid_at), 'MMM dd, yyyy · h:mm a')}</span>
                </div>
                {transaction.description && (
                  <div className="py-2">
                    <span className="text-muted-foreground text-sm">Description</span>
                    <p className="text-sm mt-1">{transaction.description}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-8 space-y-3">
                <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
                <Button variant="ghost" onClick={() => navigate('/bookings')} className="w-full">
                  <Receipt className="w-4 h-4 mr-2" /> View All Orders
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
