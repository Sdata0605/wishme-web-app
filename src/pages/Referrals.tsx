import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Share2, Users, TrendingUp, DollarSign, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

interface ReferralTransaction {
  id: string;
  referred_id: string;
  commission_level: number;
  commission_amount: number;
  status: string;
  created_at: string;
  booking_id?: string;
}

interface ReferredUser {
  id: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

interface CommissionRates {
  l1: number;
  l2: number;
  planName: string;
}

export default function Referrals() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [referredUsers, setReferredUsers] = useState<Map<string, ReferredUser>>(new Map());
  const [loading, setLoading] = useState(true);
  const [commissionRates, setCommissionRates] = useState<CommissionRates>({ l1: 5, l2: 2, planName: 'Basic' });
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    level1Count: 0,
    level2Count: 0
  });

  useEffect(() => {
    if (profile) {
      fetchReferralData();
      fetchCommissionRates();
    }
  }, [profile]);

  const fetchCommissionRates = async () => {
    try {
      // Fetch commission rates from the plans table based on user's plan
      const { data: planData, error } = await supabase
        .from('plans')
        .select('name, referral_commission_l1, referral_commission_l2')
        .eq('name', profile?.plan || 'basic')
        .maybeSingle();

      if (!error && planData) {
        setCommissionRates({
          l1: planData.referral_commission_l1 ?? 5,
          l2: planData.referral_commission_l2 ?? 0,
          planName: planData.name
        });
      }
    } catch (error) {
      console.error('Error fetching commission rates:', error);
    }
  };

  const fetchReferralData = async () => {
    try {
      // Fetch referral transactions
      const { data: txData, error: txError } = await supabase
        .from('referral_transactions')
        .select('*')
        .eq('referrer_id', profile?.id)
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      const txList = txData || [];
      setTransactions(txList);

      // Fetch referred user profiles separately
      const referredIds = [...new Set(txList.map(t => t.referred_id).filter(Boolean))];
      
      // Fetch ALL users who signed up with this user's referral code (bypasses RLS)
      const { data: directReferrals, error: refError } = await supabase.rpc('get_my_referrals');
      
      if (refError) {
        console.error('Error fetching referrals via RPC:', refError);
      }

      const allDirectReferralIds = (directReferrals || []).map((u: any) => u.id);
      const allReferredIds = [...new Set([...referredIds, ...allDirectReferralIds])];
      
      // Build users map from RPC results + transaction referred users
      const usersMap = new Map<string, ReferredUser>();
      (directReferrals || []).forEach((u: any) => usersMap.set(u.id, u));
      
      // For any transaction referred_ids not in directReferrals, they're already covered
      setReferredUsers(usersMap);

      // Calculate stats
      const totalEarnings = txList
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + (t.commission_amount || 0), 0);

      const pendingEarnings = txList
        .filter(t => t.status === 'pending')
        .reduce((sum, t) => sum + (t.commission_amount || 0), 0);

      const level1 = txList.filter(t => t.commission_level === 1).length;
      const level2 = txList.filter(t => t.commission_level === 2).length;

      // Count unique direct referrals (users who signed up with this user's code)
      const directReferralCount = directReferrals?.length || 0;

      setStats({
        totalReferrals: directReferralCount,
        totalEarnings,
        pendingEarnings,
        level1Count: level1,
        level2Count: level2
      });
    } catch (error: any) {
      console.error('Error fetching referral data:', error);
      toast({
        title: "Error",
        description: "Could not load referral data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralCode = () => {
    if (profile?.referral_code) {
      navigator.clipboard.writeText(profile.referral_code);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard"
      });
    }
  };

  const copyReferralURL = () => {
    if (profile?.referral_url) {
      navigator.clipboard.writeText(profile.referral_url);
      toast({
        title: "Copied!",
        description: "Referral URL copied to clipboard"
      });
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Referral Program</h1>
          <p className="text-muted-foreground">
            Share your referral code and earn commissions on every booking!
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-blue-500 mr-2" />
                <div className="text-lg md:text-2xl font-bold">{stats.totalReferrals}</div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                L1 Tx: {stats.level1Count} | L2 Tx: {stats.level2Count}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <DollarSign className="w-6 h-6 md:w-8 md:h-8 text-green-500 mr-2" />
                <div className="text-lg md:text-2xl font-bold">₹{stats.totalEarnings.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="w-6 h-6 md:w-8 md:h-8 text-orange-500 mr-2" />
                <div className="text-lg md:text-2xl font-bold">₹{stats.pendingEarnings.toLocaleString()}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Commission Rates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg md:text-2xl font-bold">L1: {commissionRates.l1}% | L2: {commissionRates.l2}%</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {commissionRates.planName} Plan
                <Link to="/plan" className="text-primary hover:underline ml-1">Upgrade</Link>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Referral Code Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5" />
              Your Referral Links
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Referral Code</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={profile?.referral_code || 'Loading...'}
                  readOnly
                  className="bg-background"
                />
                <Button onClick={copyReferralCode} variant="outline" className="w-full sm:w-auto">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Referral URL</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={profile?.referral_url || 'Loading...'}
                  readOnly
                  className="bg-background min-w-0"
                />
                <Button onClick={copyReferralURL} variant="outline" className="w-full sm:w-auto">
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
              <p className="text-sm">
                <strong>How it works:</strong> Share your referral code or URL with friends. 
                When they sign up and make a booking, you earn:
              </p>
              <ul className="text-sm list-disc list-inside mt-2 space-y-1">
                <li><strong>Level 1:</strong> {commissionRates.l1}% commission on direct referrals' bookings</li>
                <li><strong>Level 2:</strong> {commissionRates.l2}% commission on your referrals' referrals' bookings</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-3">
                Want higher commission rates? <Link to="/plan" className="text-primary hover:underline">Upgrade your plan</Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* My Referred Users */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>My Referred Users</CardTitle>
          </CardHeader>
          <CardContent>
            {referredUsers.size === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No referrals yet. Start sharing your code!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from(referredUsers.values()).map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">{user.first_name} {user.last_name || ''}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <Badge variant="outline">Signed Up</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Commission History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No commission transactions yet. Commissions are earned when your referrals make bookings or purchases.</p>
              </div>
            ) : (
              <>
              <div className="block sm:hidden space-y-3">
                {transactions.map((tx) => {
                  const refUser = referredUsers.get(tx.referred_id);
                  return (
                    <div key={tx.id} className="mobile-card-row">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          {refUser?.first_name} {refUser?.last_name || '(User)'}
                        </span>
                        <Badge variant={tx.commission_level === 1 ? "default" : "secondary"}>
                          Level {tx.commission_level}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</span>
                        <span className="font-bold text-green-600">₹{tx.commission_amount.toLocaleString()}</span>
                      </div>
                      <div className="mt-1">
                        <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Desktop table view */}
              <Table className="hidden sm:table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Referred User</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => {
                    const refUser = referredUsers.get(tx.referred_id);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell>{new Date(tx.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {refUser?.first_name} {refUser?.last_name || '(User)'}
                            </div>
                            <div className="text-xs text-muted-foreground">{refUser?.email || '-'}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.commission_level === 1 ? "default" : "secondary"}>
                            Level {tx.commission_level}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-bold text-green-600">
                          ₹{tx.commission_amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={tx.status === 'completed' ? 'default' : 'secondary'}>
                            {tx.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthenticatedLayout>
  );
}