import { useState, useEffect } from "react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { TrendingUp, Calendar, Filter, DollarSign } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CommissionTransaction {
  id: string;
  booking_id: string;
  commission_level: number;
  commission_amount: number;
  status: string;
  created_at: string;
  order_type: string | null;
}

const getServiceLabel = (orderType: string | null | undefined): string => {
  const labels: Record<string, string> = {
    'booking': 'Video Wish',
    'music_generation': 'AI Music',
    'celebrity_favorite': 'Celebrity Subscription',
    'voice_call_wish': 'Celebrity Voice Call',
    'photo_wish': 'Photo Wish',
    'greeting_card': 'Greeting Card',
    'image_promotion': 'Image Promotion',
    'wish_celebrity_order': 'Celebrity Wish',
    'plan_upgrade': 'Plan Upgrade',
    'ugc_video': 'UGC Video',
  };
  return labels[orderType || ''] || orderType || 'Purchase';
};

interface CelebrityCommission {
  id: string;
  booking_id: string;
  gross_amount: number;
  tds_percentage: number;
  tds_amount: number;
  amount: number;
  description: string;
  status: string;
  created_at: string;
}

export default function Commission() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [referralCommissions, setReferralCommissions] = useState<CommissionTransaction[]>([]);
  const [celebrityCommissions, setCelebrityCommissions] = useState<CelebrityCommission[]>([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [totalReferralEarned, setTotalReferralEarned] = useState(0);
  const [totalCelebrityEarned, setTotalCelebrityEarned] = useState(0);
  const [totalTdsDeducted, setTotalTdsDeducted] = useState(0);

  useEffect(() => {
    if (profile?.id) {
      fetchCommissionData();
    }
  }, [profile?.id, startDate, endDate]);

  const fetchCommissionData = async () => {
    try {
      setLoading(true);

      // Build query with date filters
      let referralQuery = supabase
        .from('referral_transactions')
        .select('*')
        .eq('referrer_id', profile?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      let celebrityQuery = supabase
        .from('celebrity_wallet_transactions')
        .select('*')
        .eq('celebrity_id', profile?.id)
        .eq('transaction_type', 'earning')
        .order('created_at', { ascending: false });

      if (startDate) {
        referralQuery = referralQuery.gte('created_at', startDate);
        celebrityQuery = celebrityQuery.gte('created_at', startDate);
      }
      if (endDate) {
        referralQuery = referralQuery.lte('created_at', endDate);
        celebrityQuery = celebrityQuery.lte('created_at', endDate);
      }

      const { data: refData, error: refError } = await referralQuery;
      const { data: celData, error: celError } = await celebrityQuery;

      if (refError) throw refError;
      if (celError) throw celError;

      setReferralCommissions(refData || []);
      setCelebrityCommissions(celData || []);

      // Calculate totals
      const refTotal = (refData || []).reduce((sum, tx) => sum + (tx.commission_amount || 0), 0);
      const celTotal = (celData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const tdsTotal = (celData || []).reduce((sum, tx) => sum + (tx.tds_amount || 0), 0);

      setTotalReferralEarned(refTotal);
      setTotalCelebrityEarned(celTotal);
      setTotalTdsDeducted(tdsTotal);
    } catch (error: any) {
      toast({
        title: "Error loading commissions",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = async () => {
    setStartDate("");
    setEndDate("");
    // Manually re-fetch data without filters
    try {
      setLoading(true);
      
      const { data: refData } = await supabase
        .from('referral_transactions')
        .select('*')
        .eq('referrer_id', profile?.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      const { data: celData } = await supabase
        .from('celebrity_wallet_transactions')
        .select('*')
        .eq('celebrity_id', profile?.id)
        .eq('transaction_type', 'earning')
        .order('created_at', { ascending: false });

      setReferralCommissions(refData || []);
      setCelebrityCommissions(celData || []);

      // Recalculate totals
      const refTotal = (refData || []).reduce((sum, tx) => sum + (tx.commission_amount || 0), 0);
      const celTotal = (celData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
      const tdsTotal = (celData || []).reduce((sum, tx) => sum + (tx.tds_amount || 0), 0);

      setTotalReferralEarned(refTotal);
      setTotalCelebrityEarned(celTotal);
      setTotalTdsDeducted(tdsTotal);
    } catch (error) {
      console.error('Error clearing filters:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <TrendingUp className="w-10 h-10" />
            Commission Earnings
          </h1>
          <p className="text-muted-foreground">Track your commission earnings with transparent TDS breakdown</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-success/20 to-success/5">
            <CardHeader>
              <CardTitle className="text-lg">Total Earned</CardTitle>
              <CardDescription>After TDS deduction</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-success">
                ₹{(totalReferralEarned + totalCelebrityEarned).toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/20 to-primary/5">
            <CardHeader>
              <CardTitle className="text-lg">Referral Commissions</CardTitle>
              <CardDescription>From referrals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ₹{totalReferralEarned.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-destructive/20 to-destructive/5">
            <CardHeader>
              <CardTitle className="text-lg">TDS Deducted</CardTitle>
              <CardDescription>Total tax deducted</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">
                ₹{totalTdsDeducted.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter by Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleClearFilters} variant="outline" className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Celebrity Commissions */}
        {celebrityCommissions.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Celebrity Earnings
              </CardTitle>
              <CardDescription>Booking commissions with TDS breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading commissions...</div>
              ) : (
                <div className="space-y-4">
                  {celebrityCommissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Booking Commission</div>
                        <Badge>{commission.status}</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Gross Amount:</span>
                          <span className="ml-2 font-medium">₹{commission.gross_amount?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">TDS ({commission.tds_percentage}%):</span>
                          <span className="ml-2 font-medium text-destructive">-₹{commission.tds_amount?.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Net Amount:</span>
                          <span className="ml-2 font-bold text-success">₹{commission.amount.toLocaleString()}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Date:</span>
                          <span className="ml-2">{format(new Date(commission.created_at), 'PP')}</span>
                        </div>
                      </div>
                      
                      {commission.description && (
                        <div className="mt-2 text-sm text-muted-foreground">
                          {commission.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Referral Commissions */}
        {referralCommissions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Referral Commissions
              </CardTitle>
              <CardDescription>Earnings from referrals</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading commissions...</div>
              ) : (
                <div className="space-y-4">
                  {referralCommissions.map((commission) => (
                    <div
                      key={commission.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-medium">
                          Level {commission.commission_level} Commission — {getServiceLabel(commission.order_type)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(commission.created_at), 'PPp')}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-bold text-success text-lg">
                            +₹{commission.commission_amount.toLocaleString()}
                          </div>
                        </div>
                        <Badge variant="default">{commission.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && referralCommissions.length === 0 && celebrityCommissions.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>No commission earnings yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
