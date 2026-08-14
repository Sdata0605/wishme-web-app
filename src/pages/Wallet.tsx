import { useState, useEffect } from "react";
import { generateWishMePaymentId } from "@/utils/paymentId";
import { useNavigate } from "react-router-dom";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import {
  Wallet as WalletIcon, Clock, CheckCircle, XCircle,
  Plus, ArrowDownLeft, CreditCard, Smartphone, Users,
  MessageCircle, Video, TrendingUp, Gift, Music, Image,
  Phone, Star, ShoppingBag, Banknote
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";

const QUICK_AMOUNTS = [500, 1000, 2500, 5000];

interface BankDetail {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  is_default: boolean;
}

interface WithdrawalRequest {
  id: string;
  requested_amount: number;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  status: string;
  admin_notes: string | null;
  requested_at: string;
  processed_at: string | null;
}

export default function Wallet() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { balance: walletBalance, refetch: refetchBalance } = useWalletBalance();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [showAllTx, setShowAllTx] = useState(false);
  const [paymentIdSearch, setPaymentIdSearch] = useState("");
  const [paymentTxLookup, setPaymentTxLookup] = useState<Record<string, string>>({});

  // Referral stats
  const [referralStats, setReferralStats] = useState({ totalEarned: 0, friends: 0, pending: 0 });

  // Withdrawal state
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedBankId, setSelectedBankId] = useState("");
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);

  // Quick add bank form state
  const [showQuickAddBank, setShowQuickAddBank] = useState(false);
  const [quickBankForm, setQuickBankForm] = useState({
    bank_name: "", account_holder_name: "", account_number: "", ifsc_code: ""
  });
  const [savingBank, setSavingBank] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  useEffect(() => {
    if (profile?.user_id || profile?.id) {
      fetchWalletData();
      fetchReferralStats();
      fetchBankDetails();
      fetchWithdrawalRequests();
    }
  }, [profile?.user_id, profile?.id]);

  const fetchBankDetails = async () => {
    if (!profile?.id) return;
    try {
      setBankLoading(true);
      console.log('Fetching bank details for profile:', profile.id);
      const { data, error } = await supabase
        .from('bank_details')
        .select('*')
        .eq('user_id', profile.id)
        .order('is_default', { ascending: false });
      if (error) {
        console.error('Error fetching bank details:', error);
        toast({ title: "Error loading bank details", description: error.message, variant: "destructive" });
        return;
      }
      console.log('Bank details found:', data?.length || 0);

      // If bank_details table is empty, check if profile has bank info stored directly
      if ((!data || data.length === 0) && profile) {
        const profileAny = profile as any;
        const profileBankName = profileAny.bank_name;
        const profileAccountNumber = profileAny.bank_account_number;
        const profileIfsc = profileAny.bank_ifsc;
        const profileHolderName = profileAny.bank_account_holder_name;

        if (profileBankName && profileAccountNumber && profileIfsc) {
          console.log('Found bank details on profile, syncing to bank_details table...');
          // Auto-sync profile bank details to bank_details table
          const { data: insertedBank, error: insertError } = await supabase
            .from('bank_details')
            .insert({
              user_id: profile.id,
              bank_name: profileBankName,
              account_holder_name: profileHolderName || profileAny.first_name || 'Account Holder',
              account_number: profileAccountNumber,
              ifsc_code: profileIfsc,
              account_type: 'savings',
              is_default: true
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error syncing profile bank details:', insertError);
          } else if (insertedBank) {
            console.log('Profile bank details synced successfully');
            setBankDetails([insertedBank]);
            setSelectedBankId(insertedBank.id);
            return;
          }
        }
      }

      setBankDetails(data || []);
      const defaultBank = (data || []).find(b => b.is_default);
      if (defaultBank) setSelectedBankId(defaultBank.id);
      else if (data && data.length > 0) setSelectedBankId(data[0].id);
    } catch (err: any) {
      console.error('Error fetching bank details:', err);
    } finally {
      setBankLoading(false);
    }
  };

  const handleQuickAddBank = async () => {
    if (!profile?.id) return;
    const { bank_name, account_holder_name, account_number, ifsc_code } = quickBankForm;
    if (!bank_name || !account_holder_name || !account_number || !ifsc_code) {
      toast({ title: "All fields required", description: "Please fill in all bank details", variant: "destructive" });
      return;
    }
    try {
      setSavingBank(true);
      const { data, error } = await supabase.from('bank_details').insert({
        user_id: profile.id,
        bank_name,
        account_holder_name,
        account_number,
        ifsc_code,
        account_type: 'savings',
        is_default: true
      }).select().single();
      if (error) {
        console.error('Quick add bank error:', error);
        toast({ title: "Failed to save bank details", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Bank account added!", description: "You can now proceed with withdrawal" });
      setQuickBankForm({ bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "" });
      setShowQuickAddBank(false);
      await fetchBankDetails();
      if (data?.id) setSelectedBankId(data.id);
    } catch (err: any) {
      console.error('Quick add bank error:', err);
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingBank(false);
    }
  };

  const fetchWithdrawalRequests = async () => {
    if (!profile?.id) return;
    const { data } = await supabase
      .from('user_withdrawal_requests')
      .select('*')
      .eq('profile_id', profile.id)
      .order('requested_at', { ascending: false });
    setWithdrawalRequests((data as WithdrawalRequest[]) || []);
  };

  const fetchReferralStats = async () => {
    try {
      const profileId = profile?.id;
      const { data, error } = await supabase
        .from('referral_transactions')
        .select('*')
        .eq('referrer_id', profileId);
      if (error) throw error;
      const completed = (data || []).filter(t => t.status === 'completed');
      const pending = (data || []).filter(t => t.status === 'pending');
      const uniqueUsers = new Set(completed.map(t => t.referred_id));
      setReferralStats({
        totalEarned: completed.reduce((sum, t) => sum + (t.commission_amount || 0), 0),
        friends: uniqueUsers.size,
        pending: pending.length
      });
    } catch { /* silent */ }
  };

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      refetchBalance();
      const profileId = profile?.id;

      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', profileId)
        .order('created_at', { ascending: false });
      if (txError) throw txError;

      const { data: refTxData, error: refTxError } = await supabase
        .from('referral_transactions')
        .select('*')
        .eq('referrer_id', profileId)
        .order('created_at', { ascending: false });
      if (refTxError) throw refTxError;

      // Fetch payment_transactions for WM IDs
      const { data: ptData } = await supabase
        .from('payment_transactions')
        .select('wishme_payment_id, user_id, amount, paid_at')
        .eq('user_id', profileId)
        .order('paid_at', { ascending: false });

      if (ptData) {
        const lookup: Record<string, string> = {};
        ptData.forEach((pt: any) => {
          const key = `${Math.abs(pt.amount)}`;
          if (!lookup[key]) lookup[key] = pt.wishme_payment_id;
        });
        setPaymentTxLookup(lookup);
      }

      const allTransactions = [
        ...(txData || []).map(tx => ({ ...tx, source: 'wallet' })),
        ...(refTxData || []).map(tx => ({
          ...tx, source: 'referral',
          transaction_type: 'referral_commission',
          amount: tx.commission_amount,
          status: tx.status
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setTransactions(allTransactions);
    } catch (error: any) {
      toast({ title: "Error loading wallet", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async (amount?: number) => {
    const finalAmount = amount || parseFloat(depositAmount);
    if (!finalAmount || finalAmount <= 0 || finalAmount < 1) {
      toast({ title: "Invalid amount", description: "Minimum deposit is ₹1", variant: "destructive" });
      return;
    }

    try {
      setProcessingPayment(true);
      const { data: orderData, error: orderError } = await supabase.functions.invoke(
        'create-razorpay-order',
        { body: { amount: Math.round(finalAmount), currency: 'INR', receipt: `wallet_${profile?.id}_${Date.now()}`, notes: { user_id: profile?.id, type: 'wallet_deposit' } } }
      );

      if (orderError) throw new Error(orderData?.error || orderError.message || 'Failed to create payment order');
      if (!orderData?.id) throw new Error(orderData?.error || 'Failed to create payment order');

      const options = {
        key: orderData.key_id,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'WishMe',
        description: 'Add money to wallet',
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const { error: verifyError } = await supabase.functions.invoke('verify-razorpay-payment', {
              body: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id, razorpay_signature: response.razorpay_signature }
            });
            if (verifyError) throw verifyError;

            await supabase.from('wallet_transactions').insert({
              user_id: profile?.id, transaction_type: 'deposit', amount: Math.round(finalAmount),
              status: 'completed', payment_method: 'razorpay',
              transaction_details: { razorpay_order_id: response.razorpay_order_id, razorpay_payment_id: response.razorpay_payment_id }
            });

            // Generate WishMe Payment ID for deposit
            try {
              const wmId = generateWishMePaymentId();
              await supabase.from('payment_transactions').insert({
                wishme_payment_id: wmId,
                user_id: profile?.id,
                amount: Math.round(finalAmount),
                payment_method: 'razorpay',
                service_type: 'deposit',
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                description: `Wallet deposit of ₹${finalAmount}`,
                status: 'completed',
                paid_at: new Date().toISOString(),
              });
            } catch (e) { console.warn('Payment ID generation failed:', e); }

            toast({ title: "Payment successful!", description: `₹${finalAmount} added to your wallet` });
            setDepositAmount("");
            setCustomDialogOpen(false);
            fetchWalletData();
          } catch (error: any) {
            toast({ title: "Payment verification failed", description: error.message, variant: "destructive" });
          }
        },
        prefill: { name: `${profile?.first_name} ${profile?.last_name}`, email: profile?.email, contact: profile?.phone },
        theme: { color: '#EC4899' },
        config: {
          display: {
            blocks: {
              upi: {
                name: "Pay using UPI",
                instruments: [{ method: "upi", flows: ["collect", "intent", "qr"] }]
              }
            },
            sequence: ["block.upi", "block.other"],
            preferences: { show_default_blocks: true }
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        toast({ title: "Payment failed", description: response.error.description, variant: "destructive" });
      });
      rzp.open();
    } catch (error: any) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 1) {
      toast({ title: "Invalid amount", description: "Minimum withdrawal is ₹1", variant: "destructive" });
      return;
    }
    if (amount > walletBalance) {
      toast({ title: "Insufficient balance", description: `Your balance is ₹${walletBalance.toLocaleString()}`, variant: "destructive" });
      return;
    }
    const selectedBank = bankDetails.find(b => b.id === selectedBankId);
    if (!selectedBank) {
      toast({ title: "Select a bank account", description: "Please select a bank account for withdrawal", variant: "destructive" });
      return;
    }

    try {
      setProcessingWithdrawal(true);

      // 1. Insert wallet_transaction to deduct balance (trigger handles it)
      const { error: txError } = await supabase.from('wallet_transactions').insert({
        user_id: profile?.id,
        transaction_type: 'withdrawal',
        amount: Math.round(amount),
        status: 'completed',
        payment_method: 'bank_transfer',
        description: `Withdrawal to ${selectedBank.bank_name} ****${selectedBank.account_number.slice(-4)}`
      });
      if (txError) throw txError;

      // 2. Insert withdrawal request for admin tracking
      const { error: wrError } = await supabase.from('user_withdrawal_requests').insert({
        profile_id: profile?.id,
        requested_amount: Math.round(amount),
        bank_name: selectedBank.bank_name,
        account_holder_name: selectedBank.account_holder_name,
        account_number: selectedBank.account_number,
        ifsc_code: selectedBank.ifsc_code,
        status: 'pending'
      });
      if (wrError) throw wrError;

      toast({ title: "Withdrawal requested", description: `₹${amount.toLocaleString()} withdrawal is being processed` });
      setWithdrawAmount("");
      setWithdrawDialogOpen(false);
      fetchWalletData();
      fetchWithdrawalRequests();
    } catch (error: any) {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const getTxIcon = (type: string) => {
    const map: Record<string, { icon: any; color: string }> = {
      deposit: { icon: TrendingUp, color: 'text-emerald-400' },
      admin_credit: { icon: TrendingUp, color: 'text-emerald-400' },
      withdrawal: { icon: ArrowDownLeft, color: 'text-orange-400' },
      booking: { icon: Video, color: 'text-orange-400' },
      music_generation: { icon: Music, color: 'text-purple-400' },
      music_download: { icon: Music, color: 'text-purple-400' },
      greeting_card_generation: { icon: Gift, color: 'text-pink-400' },
      referral_commission: { icon: Users, color: 'text-pink-400' },
      commission_earning: { icon: Users, color: 'text-pink-400' },
      image_promotion: { icon: Image, color: 'text-blue-400' },
      ugc_video: { icon: Video, color: 'text-orange-400' },
      photo_wish: { icon: Image, color: 'text-cyan-400' },
      celebrity_call: { icon: Phone, color: 'text-yellow-400' },
      voice_call: { icon: Phone, color: 'text-yellow-400' },
      celebrity_subscription: { icon: Star, color: 'text-amber-400' },
      plan_upgrade: { icon: Star, color: 'text-amber-400' },
      service_payment: { icon: ShoppingBag, color: 'text-indigo-400' },
    };
    const entry = map[type] || { icon: WalletIcon, color: 'text-muted-foreground' };
    const Icon = entry.icon;
    return (
      <div className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0 ${entry.color}`}>
        <Icon className="w-4 h-4" />
      </div>
    );
  };

  const getLabel = (type: string) => {
    const labels: Record<string, string> = {
      deposit: "Wallet Top-up", withdrawal: "Withdrawal", admin_credit: "Admin Credit",
      music_generation: "Music Generation", music_download: "Music Download",
      commission_earning: "Commission Earned", referral_commission: "Referral Bonus",
      greeting_card_generation: "Greeting Card", celebrity_subscription: "Celebrity Subscription",
      booking: "Video Shoutout", image_promotion: "Image Promotion", ugc_video: "UGC Video",
      photo_wish: "Photo Wish", celebrity_call: "Celebrity Call", voice_call: "Voice Call",
      plan_upgrade: "Plan Upgrade", service_payment: "Service Payment", debit: "Debit"
    };
    return labels[type] || type?.replace(/_/g, ' ')?.replace(/\b\w/g, l => l.toUpperCase()) || 'Transaction';
  };

  const isCredit = (type: string) => ['deposit', 'admin_credit', 'commission_earning', 'referral_commission'].includes(type);

  const filteredTx = paymentIdSearch
    ? transactions.filter(tx => {
        const key = `${Math.abs(tx.amount || 0)}`;
        const wmId = paymentTxLookup[key];
        return wmId?.toLowerCase().includes(paymentIdSearch.toLowerCase());
      })
    : transactions;
  const displayedTx = showAllTx ? filteredTx : filteredTx.slice(0, 5);

  const getWithdrawalStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge variant="secondary" className="text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved': case 'processed': return <Badge variant="default" className="text-[10px]"><CheckCircle className="w-3 h-3 mr-1" />Processed</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-[10px]"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default: return <Badge variant="secondary" className="text-[10px]">{status}</Badge>;
    }
  };

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4 max-w-7xl space-y-6">
          {/* Page Header */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <WalletIcon className="w-7 h-7" /> My Wallet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your balance, transactions & payments</p>
          </div>

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* LEFT COLUMN — 3/5 */}
            <div className="lg:col-span-3 space-y-6">

              {/* Balance Card */}
              <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-pink-500/80 via-purple-500/60 to-purple-600/80 text-white">
                <WalletIcon className="absolute top-4 right-4 w-16 h-16 text-white/10" />
                <p className="text-[11px] uppercase tracking-widest text-white/70 font-medium">Total Balance</p>
                <p className="text-4xl sm:text-5xl font-bold mt-2">₹{walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                <div className="flex gap-3 mt-6">
                  <Dialog open={customDialogOpen} onOpenChange={setCustomDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-white/15 hover:bg-white/25 border border-white/20 text-white rounded-full px-5 backdrop-blur-sm">
                        <Plus className="w-4 h-4 mr-1" /> Add Funds
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Money to Wallet</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="space-y-2">
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number" placeholder="Enter amount (min ₹1)" min="1"
                            value={depositAmount} onChange={e => setDepositAmount(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {QUICK_AMOUNTS.map(amt => (
                            <Button key={amt} variant="outline" size="sm" onClick={() => setDepositAmount(String(amt))}>
                              ₹{amt.toLocaleString()}
                            </Button>
                          ))}
                        </div>
                        <Button
                          className="w-full" size="lg"
                          disabled={processingPayment || !depositAmount}
                          onClick={() => handleRazorpayPayment()}
                        >
                          {processingPayment ? "Processing..." : `Pay ₹${depositAmount || "0"}`}
                        </Button>
                        <div className="flex flex-wrap gap-2 justify-center">
                          <Badge variant="secondary">UPI</Badge>
                          <Badge variant="secondary">Cards</Badge>
                          <Badge variant="secondary">NetBanking</Badge>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Withdraw Button */}
                  <Dialog open={withdrawDialogOpen} onOpenChange={(open) => { setWithdrawDialogOpen(open); if (open) fetchBankDetails(); }}>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="border border-white/20 text-white rounded-full px-5 hover:bg-white/10">
                        <ArrowDownLeft className="w-4 h-4 mr-1" /> Withdraw
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Withdraw Funds</DialogTitle>
                        <DialogDescription>Withdraw money to your bank account</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 pt-2">
                        <div className="rounded-xl border border-border p-3 bg-muted/50">
                          <p className="text-xs text-muted-foreground">Available Balance</p>
                          <p className="text-2xl font-bold">₹{walletBalance.toLocaleString('en-IN')}</p>
                        </div>

                        {bankLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            <span className="ml-2 text-sm text-muted-foreground">Loading bank accounts...</span>
                          </div>
                        ) : bankDetails.length === 0 ? (
                          <div className="space-y-3">
                            <div className="text-center py-2">
                              <Banknote className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                              <p className="text-sm text-muted-foreground">No bank accounts found.</p>
                            </div>
                            {!showQuickAddBank ? (
                              <div className="flex flex-col gap-2">
                                <Button size="sm" onClick={() => setShowQuickAddBank(true)}>
                                  <Plus className="w-4 h-4 mr-1" /> Add Bank Account Now
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => { setWithdrawDialogOpen(false); navigate('/profile'); }}>
                                  Go to Profile instead
                                </Button>
                              </div>
                            ) : (
                              <div className="space-y-3 border border-border rounded-xl p-3">
                                <p className="text-sm font-medium">Quick Add Bank Account</p>
                                <div className="space-y-2">
                                  <Input
                                    placeholder="Bank Name *"
                                    value={quickBankForm.bank_name}
                                    onChange={e => setQuickBankForm(f => ({ ...f, bank_name: e.target.value }))}
                                  />
                                  <Input
                                    placeholder="Account Holder Name *"
                                    value={quickBankForm.account_holder_name}
                                    onChange={e => setQuickBankForm(f => ({ ...f, account_holder_name: e.target.value }))}
                                  />
                                  <Input
                                    placeholder="Account Number *"
                                    value={quickBankForm.account_number}
                                    onChange={e => setQuickBankForm(f => ({ ...f, account_number: e.target.value }))}
                                  />
                                  <Input
                                    placeholder="IFSC Code *"
                                    value={quickBankForm.ifsc_code}
                                    onChange={e => setQuickBankForm(f => ({ ...f, ifsc_code: e.target.value.toUpperCase() }))}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowQuickAddBank(false)}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" className="flex-1" disabled={savingBank} onClick={handleQuickAddBank}>
                                    {savingBank ? "Saving..." : "Save & Continue"}
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              <Label>Select Bank Account</Label>
                              <Select value={selectedBankId} onValueChange={setSelectedBankId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select bank account" />
                                </SelectTrigger>
                                <SelectContent>
                                  {bankDetails.map(bank => (
                                    <SelectItem key={bank.id} value={bank.id}>
                                      {bank.bank_name} — ****{bank.account_number.slice(-4)} {bank.is_default ? '(Default)' : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label>Amount (₹)</Label>
                              <Input
                                type="number" placeholder="Enter amount (min ₹1)" min="1"
                                max={walletBalance}
                                value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                              />
                            </div>

                            <Button
                              className="w-full" size="lg"
                              disabled={processingWithdrawal || !withdrawAmount || !selectedBankId}
                              onClick={handleWithdraw}
                            >
                              {processingWithdrawal ? "Processing..." : `Withdraw ₹${withdrawAmount || "0"}`}
                            </Button>

                            <p className="text-xs text-muted-foreground text-center">
                              Withdrawals are processed within 2-3 business days after admin approval.
                            </p>
                          </>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Quick Recharge */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="font-semibold text-base mb-3">Quick Recharge</h3>
                <div className="flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map(amt => (
                    <Button
                      key={amt} variant="outline" size="sm"
                      className="rounded-full px-5"
                      disabled={processingPayment}
                      onClick={() => handleRazorpayPayment(amt)}
                    >
                      ₹{amt.toLocaleString()}
                    </Button>
                  ))}
                  <Button variant="outline" size="sm" className="rounded-full px-5" onClick={() => setCustomDialogOpen(true)}>
                    Custom
                  </Button>
                </div>
              </div>

              {/* Withdrawal Requests */}
              {withdrawalRequests.length > 0 && (
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                    <Banknote className="w-5 h-5" /> Withdrawal Requests
                  </h3>
                  <div className="space-y-2">
                    {withdrawalRequests.map(wr => (
                      <div key={wr.id} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                        <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                          <ArrowDownLeft className="w-4 h-4 text-orange-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">₹{wr.requested_amount.toLocaleString()} → {wr.bank_name}</p>
                          <p className="text-xs text-muted-foreground">****{wr.account_number.slice(-4)} • {format(new Date(wr.requested_at), 'dd MMM yyyy')}</p>
                          {wr.admin_notes && wr.status === 'rejected' && (
                            <p className="text-xs text-destructive mt-0.5">Reason: {wr.admin_notes}</p>
                          )}
                        </div>
                        <div className="shrink-0">
                          {getWithdrawalStatusBadge(wr.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-base">Recent Activity</h3>
                  {filteredTx.length > 5 && (
                    <button onClick={() => setShowAllTx(!showAllTx)} className="text-xs text-primary hover:underline">
                      {showAllTx ? 'Show Less' : 'View All'}
                    </button>
                  )}
                </div>
                <div className="mb-3">
                  <Input
                    placeholder="Search by Payment ID..."
                    value={paymentIdSearch}
                    onChange={(e) => setPaymentIdSearch(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {loading ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">Loading transactions…</p>
                ) : transactions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No transactions yet</p>
                ) : (
                  <div className="space-y-1">
                    {displayedTx.map(tx => {
                      const credit = isCredit(tx.transaction_type);
                      return (
                        <div key={`${tx.source}-${tx.id}`} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                          {getTxIcon(tx.transaction_type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{getLabel(tx.transaction_type)}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'dd MMM yyyy, hh:mm a')}</p>
                            {(() => {
                              const key = `${Math.abs(tx.amount || 0)}`;
                              const wmId = paymentTxLookup[key];
                              return wmId ? <p className="font-mono text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{wmId}</p> : null;
                            })()}
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-sm font-semibold ${credit ? 'text-emerald-400' : 'text-destructive'}`}>
                              {credit ? '+' : '-'}₹{tx.amount?.toLocaleString() || 0}
                            </p>
                            <Badge variant={tx.status === 'completed' ? 'default' : tx.status === 'rejected' ? 'destructive' : 'secondary'} className="text-[10px] px-1.5 py-0">
                              {tx.status}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN — 2/5 */}
            <div className="lg:col-span-2 space-y-6">

              {/* Referral Earnings */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <h3 className="font-semibold text-base bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                  Referral Earnings
                </h3>
                <p className="text-xs text-muted-foreground">Earn commissions when your referrals make bookings</p>
                <p className="text-3xl font-bold">₹{referralStats.totalEarned.toLocaleString()}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border p-3 text-center">
                    <p className="text-xl font-bold">{referralStats.friends}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Friends</p>
                  </div>
                  <div className="rounded-xl border border-border p-3 text-center">
                    <p className="text-xl font-bold">{referralStats.pending}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Pending</p>
                  </div>
                </div>
                <Button className="w-full rounded-full" variant="gradient" onClick={() => navigate('/referrals')}>
                  <Users className="w-4 h-4 mr-1" /> Invite Friends
                </Button>
              </div>

              {/* Saved Methods */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <h3 className="font-semibold text-base">Saved Methods</h3>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <CreditCard className="w-5 h-5 text-blue-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">VISA ••••4242</p>
                    <p className="text-xs text-muted-foreground">Expires 12/27</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl border border-border">
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">UPI</p>
                    <p className="text-xs text-muted-foreground">rahul@axl</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full rounded-full" size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Add New Method
                </Button>
              </div>

              {/* Need Assistance */}
              <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
                <h3 className="font-semibold text-base">Need Assistance?</h3>
                <p className="text-xs text-muted-foreground">Our support team is available 24/7 to help you with any wallet or payment issues.</p>
                <Button variant="outline" className="w-full rounded-full" size="sm" onClick={() => navigate('/support')}>
                  <MessageCircle className="w-4 h-4 mr-1" /> Chat Now
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AuthenticatedLayout>
  );
}
