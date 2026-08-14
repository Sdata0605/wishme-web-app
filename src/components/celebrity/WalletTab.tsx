import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Clock, Banknote } from "lucide-react";

interface WalletTabProps {
  celebrityId: string;
  stats: {
    totalEarnings: number;
    pendingEarnings: number;
  };
  availableBalance?: number;
}

interface WalletTransaction {
  id: string;
  amount: number;
  commission_percentage: number;
  platform_fee: number;
  status: string;
  created_at: string;
  booking_id: string;
  description: string;
  transaction_type: string;
  bookings: {
    id: string;
    service_type: string;
    final_price: number;
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
}

interface BankDetail {
  id: string;
  account_holder_name: string;
  account_number: string;
  bank_name: string;
  ifsc_code: string;
  is_default: boolean;
}

interface PayoutRequest {
  id: string;
  requested_amount: number;
  status: string;
  requested_at: string;
  processed_at: string | null;
  admin_notes: string | null;
}

export function WalletTab({ celebrityId, stats, availableBalance = 0 }: WalletTabProps) {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankDetail | null>(null);
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [showQuickAddBank, setShowQuickAddBank] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [quickBankForm, setQuickBankForm] = useState({
    bank_name: "", account_holder_name: "", account_number: "", ifsc_code: ""
  });
  const { toast } = useToast();

  useEffect(() => {
    if (celebrityId) {
      fetchTransactions();
      fetchPayoutRequests();
    } else {
      setLoading(false);
    }
  }, [celebrityId]);

  const fetchTransactions = async () => {
    try {
      const { data: walletData, error: walletError } = await supabase
        .from('celebrity_wallet_transactions')
        .select(`
          *,
          bookings (
            id,
            service_type,
            final_price,
            user_id,
            profiles!bookings_user_id_fkey (
              first_name,
              last_name,
              email
            )
          )
        `)
        .eq('celebrity_id', celebrityId)
        .order('created_at', { ascending: false });

      if (walletError) throw walletError;
      
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('image_promotions')
        .select(`
          id,
          price_paid,
          status,
          created_at,
          concept,
          profiles!image_promotions_user_id_fkey (
            first_name,
            last_name,
            email
          )
        `)
        .eq('celebrity_id', celebrityId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false });

      if (promotionsError) throw promotionsError;

      const allTransactions = [
        ...(walletData || []),
        ...(promotionsData || []).map(promo => ({
          id: promo.id,
          amount: Math.floor(promo.price_paid * 0.7),
          commission_percentage: 70,
          platform_fee: Math.floor(promo.price_paid * 0.3),
          status: 'completed',
          created_at: promo.created_at,
          booking_id: promo.id,
          description: 'Image Promotion Commission',
          transaction_type: 'earning',
          bookings: {
            id: promo.id,
            service_type: 'image_promotion',
            final_price: promo.price_paid,
            user_id: '',
            profiles: promo.profiles
          }
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast({
        title: "Error",
        description: "Failed to load wallet transactions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('id, requested_amount, status, requested_at, processed_at, admin_notes')
        .eq('celebrity_id', celebrityId)
        .order('requested_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setPayoutRequests(data || []);
    } catch (error) {
      console.error('Error fetching payout requests:', error);
    }
  };

  const openWithdrawDialog = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, bank_name, bank_account_number, bank_ifsc, bank_account_holder_name, first_name, last_name')
        .eq('user_id', userData.user.id)
        .maybeSingle();
      
      if (!profile) return;

      let { data: banks, error } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', profile.id)
        .order('is_default', { ascending: false });

      if (error) throw error;

      // Auto-sync from profile if bank_details is empty
      if ((!banks || banks.length === 0) && profile.bank_name && profile.bank_account_number) {
        console.log('Syncing bank details from profile for celebrity:', profile.id);
        const { data: newBank, error: insertErr } = await supabase
          .from('bank_details')
          .insert({
            user_id: profile.id,
            bank_name: profile.bank_name,
            account_holder_name: profile.bank_account_holder_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
            account_number: profile.bank_account_number,
            ifsc_code: profile.bank_ifsc || '',
            account_type: 'savings',
            is_default: true
          })
          .select()
          .single();

        if (!insertErr && newBank) {
          banks = [newBank];
        } else {
          console.error('Failed to sync bank details:', insertErr);
        }
      }

      setBankDetails(banks || []);
      setSelectedBank(banks?.[0] || null);
      setWithdrawAmount("");
      setShowQuickAddBank(false);
      setShowWithdrawDialog(true);
    } catch (error) {
      console.error('Error loading bank details:', error);
      toast({
        title: "Error",
        description: "Failed to load bank details.",
        variant: "destructive"
      });
    }
  };

  const handleQuickAddBank = async () => {
    const { bank_name, account_holder_name, account_number, ifsc_code } = quickBankForm;
    if (!bank_name || !account_holder_name || !account_number || !ifsc_code) {
      toast({ title: "All fields required", variant: "destructive" });
      return;
    }
    try {
      setSavingBank(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', userData.user.id).maybeSingle();
      if (!profile) return;

      const { data: newBank, error } = await supabase
        .from('bank_details')
        .insert({
          user_id: profile.id,
          bank_name, account_holder_name, account_number, ifsc_code,
          account_type: 'savings', is_default: true
        })
        .select()
        .single();

      if (error) throw error;
      setBankDetails([newBank]);
      setSelectedBank(newBank);
      setShowQuickAddBank(false);
      setQuickBankForm({ bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "" });
      toast({ title: "Bank account added successfully" });
    } catch (error: any) {
      console.error('Error adding bank:', error);
      toast({ title: "Failed to add bank", description: error.message, variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseInt(withdrawAmount);
    if (!amount || amount <= 0 || amount > availableBalance) {
      toast({
        title: "Invalid amount",
        description: `Enter an amount between ₹1 and ₹${availableBalance.toLocaleString()}`,
        variant: "destructive"
      });
      return;
    }

    if (!selectedBank) {
      toast({
        title: "No bank selected",
        description: "Please add and select a bank account",
        variant: "destructive"
      });
      return;
    }

    try {
      setSubmittingWithdraw(true);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user.id)
        .maybeSingle();

      if (!profile) throw new Error("Profile not found");

      // Insert payout request
      const { error: insertError } = await supabase
        .from('payout_requests')
        .insert({
          celebrity_id: celebrityId,
          profile_id: profile.id,
          requested_amount: amount,
          bank_account_number: selectedBank.account_number,
          bank_name: selectedBank.bank_name,
          ifsc_code: selectedBank.ifsc_code,
          account_holder_name: selectedBank.account_holder_name,
          status: 'pending'
        });

      if (insertError) throw insertError;

      // Deduct from available_balance
      const { error: updateError } = await supabase
        .from('celebrities')
        .update({ available_balance: Math.max(0, availableBalance - amount) })
        .eq('id', celebrityId);

      if (updateError) throw updateError;

      toast({
        title: "Withdrawal request submitted",
        description: "Admin will process within 2-3 business days."
      });

      setShowWithdrawDialog(false);
      fetchPayoutRequests();
    } catch (error: any) {
      console.error('Error submitting withdrawal:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit withdrawal request",
        variant: "destructive"
      });
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  if (!celebrityId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sign up as a celebrity to see wallet transactions.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Commission History</CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No transactions yet
              </p>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{transaction.bookings?.service_type || 'Service'}</p>
                        <Badge variant="outline" className="text-xs">
                          {transaction.commission_percentage}% Commission
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Order: #{transaction.booking_id?.slice(0, 8)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Customer: {transaction.bookings?.profiles?.first_name || 'Unknown'} {transaction.bookings?.profiles?.last_name || ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(transaction.created_at).toLocaleDateString()} at {new Date(transaction.created_at).toLocaleTimeString()}
                      </p>
                      {transaction.platform_fee && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Platform fee: ₹{transaction.platform_fee.toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-lg">₹{transaction.amount.toLocaleString()}</p>
                      <Badge variant={transaction.status === 'completed' ? 'default' : 'secondary'}>
                        {transaction.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Wallet Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Available Balance</p>
              <p className="text-2xl font-bold text-green-600">
                ₹{availableBalance.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending Clearance</p>
              <p className="text-xl font-medium text-orange-600">
                ₹{stats.pendingEarnings.toLocaleString()}
              </p>
            </div>
            <Button className="w-full" onClick={openWithdrawDialog} disabled={availableBalance <= 0}>
              <Banknote className="w-4 h-4 mr-2" />
              Withdraw Funds
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Payout Requests */}
      {payoutRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Payout Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {payoutRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">₹{req.requested_amount.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(req.requested_at).toLocaleDateString()}
                    </p>
                    {req.admin_notes && (
                      <p className="text-xs text-muted-foreground mt-1">Note: {req.admin_notes}</p>
                    )}
                  </div>
                  <Badge variant={
                    req.status === 'processed' ? 'default' :
                    req.status === 'rejected' ? 'destructive' : 'secondary'
                  }>
                    {req.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Available balance: ₹{availableBalance.toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (₹)</Label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter amount"
                min="1"
                max={availableBalance}
              />
            </div>

            {bankDetails.length === 0 ? (
              <div className="space-y-3">
                {!showQuickAddBank ? (
                  <div className="text-center py-2">
                    <p className="text-sm text-muted-foreground mb-3">No bank account found.</p>
                    <Button variant="outline" size="sm" onClick={() => setShowQuickAddBank(true)}>
                      + Add Bank Account
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                    <p className="text-sm font-medium">Add Bank Account</p>
                    <div className="space-y-2">
                      <Input placeholder="Bank Name" value={quickBankForm.bank_name} onChange={(e) => setQuickBankForm(f => ({ ...f, bank_name: e.target.value }))} />
                      <Input placeholder="Account Holder Name" value={quickBankForm.account_holder_name} onChange={(e) => setQuickBankForm(f => ({ ...f, account_holder_name: e.target.value }))} />
                      <Input placeholder="Account Number" value={quickBankForm.account_number} onChange={(e) => setQuickBankForm(f => ({ ...f, account_number: e.target.value }))} />
                      <Input placeholder="IFSC Code" value={quickBankForm.ifsc_code} onChange={(e) => setQuickBankForm(f => ({ ...f, ifsc_code: e.target.value }))} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleQuickAddBank} disabled={savingBank}>
                        {savingBank ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setShowQuickAddBank(false)}>Cancel</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Bank Account</Label>
                {bankDetails.map((bank) => (
                  <div
                    key={bank.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedBank?.id === bank.id ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground'
                    }`}
                    onClick={() => setSelectedBank(bank)}
                  >
                    <p className="font-medium text-sm">{bank.account_holder_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {bank.bank_name} • ****{bank.account_number.slice(-4)} • {bank.ifsc_code}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
            <Button
              onClick={handleWithdraw}
              disabled={submittingWithdraw || bankDetails.length === 0 || !withdrawAmount}
            >
              {submittingWithdraw ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
