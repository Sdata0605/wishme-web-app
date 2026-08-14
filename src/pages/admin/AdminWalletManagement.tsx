import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Check, X, Eye, Plus, RefreshCw, Banknote, Search, ArrowDownLeft } from "lucide-react";
import { format } from "date-fns";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AdminWalletManagement() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAddFundsModal, setShowAddFundsModal] = useState(false);
  const [adminNote, setAdminNote] = useState("");
  
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addNote, setAddNote] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [paymentIdSearch, setPaymentIdSearch] = useState("");
  const [paymentTxMap, setPaymentTxMap] = useState<Record<string, any>>({});

  // Payout requests state
  const [payoutRequests, setPayoutRequests] = useState<any[]>([]);
  const [payoutLoading, setPayoutLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<any>(null);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAdminNote, setPayoutAdminNote] = useState("");

  // User withdrawal requests state
  const [userWithdrawals, setUserWithdrawals] = useState<any[]>([]);
  const [userWithdrawalsLoading, setUserWithdrawalsLoading] = useState(true);
  const [selectedUserWithdrawal, setSelectedUserWithdrawal] = useState<any>(null);
  const [showUserWithdrawalModal, setShowUserWithdrawalModal] = useState(false);
  const [userWithdrawalNote, setUserWithdrawalNote] = useState("");

  useEffect(() => {
    fetchData();
    fetchPayoutRequests();
    fetchUserWithdrawals();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: txData, error: txError } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          profiles:user_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (txError) throw txError;
      setTransactions(txData || []);

      const { data: usersData, error: usersError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, wallet_balance')
        .order('email');

      if (usersError) throw usersError;
      setUsers(usersData || []);

      const { data: ptData } = await supabase
        .from('payment_transactions')
        .select('wishme_payment_id, razorpay_payment_id, user_id, amount, paid_at')
        .order('paid_at', { ascending: false })
        .limit(500);
      
      if (ptData) {
        const map: Record<string, any> = {};
        ptData.forEach((pt: any) => {
          const key = `${pt.user_id}_${pt.amount}`;
          if (!map[key]) map[key] = pt;
        });
        setPaymentTxMap(map);
      }
    } catch (error: any) {
      toast({ title: "Error loading data", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchPayoutRequests = async () => {
    try {
      setPayoutLoading(true);
      const { data, error } = await supabase
        .from('payout_requests')
        .select(`
          *,
          celebrities (name, image_url),
          profiles:profile_id (first_name, last_name, email)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setPayoutRequests(data || []);
    } catch (error: any) {
      console.error('Error fetching payout requests:', error);
    } finally {
      setPayoutLoading(false);
    }
  };

  const fetchUserWithdrawals = async () => {
    try {
      setUserWithdrawalsLoading(true);
      const { data, error } = await supabase
        .from('user_withdrawal_requests')
        .select(`
          *,
          profiles:profile_id (first_name, last_name, email, wallet_balance)
        `)
        .order('requested_at', { ascending: false });

      if (error) throw error;
      setUserWithdrawals(data || []);
    } catch (error: any) {
      console.error('Error fetching user withdrawals:', error);
    } finally {
      setUserWithdrawalsLoading(false);
    }
  };

  const handleApproveUserWithdrawal = async (withdrawal: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .maybeSingle();

      const { error } = await supabase
        .from('user_withdrawal_requests')
        .update({
          status: 'processed',
          admin_notes: userWithdrawalNote || null,
          processed_at: new Date().toISOString(),
          processed_by: adminProfile?.id
        })
        .eq('id', withdrawal.id);

      if (error) throw error;

      toast({ title: "Withdrawal approved", description: `₹${withdrawal.requested_amount.toLocaleString()} marked as processed` });
      setShowUserWithdrawalModal(false);
      setUserWithdrawalNote("");
      fetchUserWithdrawals();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectUserWithdrawal = async (withdrawal: any) => {
    if (!userWithdrawalNote.trim()) {
      toast({ title: "Note required", description: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .maybeSingle();

      // Reject the withdrawal
      const { error: updateError } = await supabase
        .from('user_withdrawal_requests')
        .update({
          status: 'rejected',
          admin_notes: userWithdrawalNote,
          processed_at: new Date().toISOString(),
          processed_by: adminProfile?.id
        })
        .eq('id', withdrawal.id);

      if (updateError) throw updateError;

      // Refund: insert a deposit transaction to restore balance
      const { error: refundError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: withdrawal.profile_id,
          transaction_type: 'deposit',
          amount: withdrawal.requested_amount,
          status: 'completed',
          payment_method: 'admin',
          description: `Refund: Withdrawal request rejected - ${userWithdrawalNote}`,
          admin_note: `Refund for rejected withdrawal ${withdrawal.id}`,
          processed_by: adminProfile?.id,
          processed_at: new Date().toISOString()
        });

      if (refundError) throw refundError;

      toast({ title: "Withdrawal rejected", description: "Balance restored to user's wallet" });
      setShowUserWithdrawalModal(false);
      setUserWithdrawalNote("");
      fetchUserWithdrawals();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleApprovePayout = async (payout: any) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .maybeSingle();

      const { error } = await supabase
        .from('payout_requests')
        .update({
          status: 'processed',
          admin_notes: payoutAdminNote || null,
          processed_at: new Date().toISOString(),
          processed_by: adminProfile?.id
        })
        .eq('id', payout.id);

      if (error) throw error;

      toast({ title: "Payout approved", description: `₹${payout.requested_amount.toLocaleString()} marked as processed` });
      setShowPayoutModal(false);
      setPayoutAdminNote("");
      fetchPayoutRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRejectPayout = async (payout: any) => {
    if (!payoutAdminNote.trim()) {
      toast({ title: "Note required", description: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', userData.user?.id)
        .maybeSingle();

      const { error: updateError } = await supabase
        .from('payout_requests')
        .update({
          status: 'rejected',
          admin_notes: payoutAdminNote,
          processed_at: new Date().toISOString(),
          processed_by: adminProfile?.id
        })
        .eq('id', payout.id);

      if (updateError) throw updateError;

      const { data: celeb } = await supabase
        .from('celebrities')
        .select('available_balance')
        .eq('id', payout.celebrity_id)
        .maybeSingle();

      if (celeb) {
        await supabase
          .from('celebrities')
          .update({ available_balance: (celeb.available_balance || 0) + payout.requested_amount })
          .eq('id', payout.celebrity_id);
      }

      toast({ title: "Payout rejected", description: "Balance restored to celebrity" });
      setShowPayoutModal(false);
      setPayoutAdminNote("");
      fetchPayoutRequests();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleApprove = async (transactionId: string) => {
    try {
      const { data: profileData } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', profileData.user?.id)
        .single();

      const { error } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'approved',
          admin_note: adminNote || null,
          processed_by: adminProfile?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast({ title: "Transaction approved", description: "Funds have been added to user's wallet" });
      setShowDetailModal(false);
      setAdminNote("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error approving transaction", description: error.message, variant: "destructive" });
    }
  };

  const handleReject = async (transactionId: string) => {
    if (!adminNote.trim()) {
      toast({ title: "Note required", description: "Please provide a reason for rejection", variant: "destructive" });
      return;
    }

    try {
      const { data: profileData } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', profileData.user?.id)
        .single();

      const { error } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'rejected',
          admin_note: adminNote,
          processed_by: adminProfile?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (error) throw error;

      toast({ title: "Transaction rejected", description: "User will be notified" });
      setShowDetailModal(false);
      setAdminNote("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error rejecting transaction", description: error.message, variant: "destructive" });
    }
  };

  const handleAddFunds = async () => {
    if (!selectedUserId || !addAmount || parseFloat(addAmount) <= 0) {
      toast({ title: "Invalid input", description: "Please select a user and enter a valid amount", variant: "destructive" });
      return;
    }

    try {
      const { data: profileData } = await supabase.auth.getUser();
      const { data: adminProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', profileData.user?.id)
        .single();

      const { error } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: selectedUserId,
          transaction_type: 'admin_credit',
          amount: Math.round(parseFloat(addAmount)),
          status: 'completed',
          payment_method: 'admin',
          admin_note: addNote || 'Manual credit by admin',
          processed_by: adminProfile?.id,
          processed_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({ title: "Funds added successfully", description: "User's wallet has been credited" });
      setShowAddFundsModal(false);
      setSelectedUserId("");
      setAddAmount("");
      setAddNote("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error adding funds", description: error.message, variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      completed: "default",
      pending: "secondary",
      rejected: "destructive",
      approved: "default",
      processed: "default"
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const handleSyncAllWallets = async () => {
    try {
      setSyncing(true);
      const { error } = await supabase.rpc('sync_all_wallet_balances' as any);
      if (error) throw error;
      await fetchData();
      toast({ title: "Wallets Synchronized", description: "All wallet balances have been recalculated" });
      setSyncResults({ success: true });
    } catch (error: any) {
      toast({ title: "Sync Failed", description: error.message, variant: "destructive" });
      setSyncResults({ success: false, error: error.message });
    } finally {
      setSyncing(false);
    }
  };

  const pendingPayouts = payoutRequests.filter(p => p.status === 'pending');
  const pendingUserWithdrawals = userWithdrawals.filter(w => w.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-3xl font-bold flex items-center gap-2">
            <Wallet className="w-6 h-6 md:w-8 md:h-8" />
            Wallet Management
          </h2>
          <p className="text-sm text-muted-foreground">Manage user wallet deposits, credits, and withdrawals</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleSyncAllWallets} variant="outline" disabled={syncing} size="sm" className="flex-1 sm:flex-none">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button onClick={() => setShowAddFundsModal(true)} size="sm" className="flex-1 sm:flex-none">
            <Plus className="w-4 h-4 mr-2" />
            Add Funds
          </Button>
        </div>
      </div>

      {syncResults && (
        <Alert variant={syncResults.success ? "default" : "destructive"}>
          <AlertDescription>
            {syncResults.success ? "All wallet balances synchronized!" : `Sync failed: ${syncResults.error}`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="transactions">
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="transactions" className="text-xs sm:text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="user-withdrawals" className="flex items-center gap-1 text-xs sm:text-sm">
            <ArrowDownLeft className="w-4 h-4" />
            <span className="hidden sm:inline">User</span> Withdrawals
            {pendingUserWithdrawals.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{pendingUserWithdrawals.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payouts" className="flex items-center gap-1 text-xs sm:text-sm">
            <Banknote className="w-4 h-4" />
            <span className="hidden sm:inline">Celebrity</span> Payouts
            {pendingPayouts.length > 0 && (
              <Badge variant="destructive" className="ml-1 text-xs">{pendingPayouts.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Wallet Transactions</CardTitle>
              <CardDescription>Review and approve user deposit requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by Payment ID (WM...)"
                    value={paymentIdSearch}
                    onChange={(e) => setPaymentIdSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {loading ? (
                <div className="text-center py-8">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No transactions found</div>
              ) : (
                <>
                  {/* Mobile card view */}
                  <div className="block md:hidden space-y-3">
                    {transactions
                      .filter(tx => {
                        if (!paymentIdSearch) return true;
                        const ptKey = `${tx.user_id}_${Math.abs(tx.amount)}`;
                        const pt = paymentTxMap[ptKey];
                        return pt?.wishme_payment_id?.toLowerCase().includes(paymentIdSearch.toLowerCase());
                      })
                      .map((tx) => {
                        const ptKey = `${tx.user_id}_${Math.abs(tx.amount)}`;
                        const pt = paymentTxMap[ptKey];
                        return (
                          <div key={tx.id} className="p-4 border rounded-xl space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="min-w-0">
                                <p className="font-medium text-sm">{tx.profiles?.first_name} {tx.profiles?.last_name}</p>
                                <p className="text-xs text-muted-foreground truncate">{tx.profiles?.email}</p>
                              </div>
                              {getStatusBadge(tx.status)}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="capitalize text-muted-foreground">{tx.transaction_type}</span>
                              <span className="font-bold">₹{tx.amount.toLocaleString()}</span>
                            </div>
                            {pt?.wishme_payment_id && (
                              <p className="text-xs font-mono text-emerald-500 font-semibold">{pt.wishme_payment_id}</p>
                            )}
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">{format(new Date(tx.created_at), 'PP')}</span>
                              <Button variant="ghost" size="sm" className="h-8" onClick={() => { setSelectedTransaction(tx); setShowDetailModal(true); }}>
                                <Eye className="w-3 h-3 mr-1" /> View
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Desktop table */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Payment ID</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .filter(tx => {
                          if (!paymentIdSearch) return true;
                          const ptKey = `${tx.user_id}_${Math.abs(tx.amount)}`;
                          const pt = paymentTxMap[ptKey];
                          return pt?.wishme_payment_id?.toLowerCase().includes(paymentIdSearch.toLowerCase());
                        })
                        .map((tx) => {
                        const ptKey = `${tx.user_id}_${Math.abs(tx.amount)}`;
                        const pt = paymentTxMap[ptKey];
                        return (
                        <TableRow key={tx.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tx.profiles?.first_name} {tx.profiles?.last_name}</div>
                              <div className="text-sm text-muted-foreground">{tx.profiles?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="capitalize">{tx.transaction_type}</TableCell>
                          <TableCell>
                            {pt?.wishme_payment_id ? (
                              <div>
                                <span className="font-mono font-bold text-emerald-500">{pt.wishme_payment_id}</span>
                                {pt.razorpay_payment_id && (
                                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{pt.razorpay_payment_id}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="font-bold">₹{tx.amount.toLocaleString()}</TableCell>
                          <TableCell>{tx.payment_method || '-'}</TableCell>
                          <TableCell>{getStatusBadge(tx.status)}</TableCell>
                          <TableCell>{format(new Date(tx.created_at), 'PP')}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedTransaction(tx); setShowDetailModal(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
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
        </TabsContent>

        {/* User Withdrawals Tab */}
        <TabsContent value="user-withdrawals">
          <Card>
            <CardHeader>
              <CardTitle>User Withdrawal Requests</CardTitle>
              <CardDescription>Review and process user withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {userWithdrawalsLoading ? (
                <div className="text-center py-8">Loading withdrawal requests...</div>
              ) : userWithdrawals.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No withdrawal requests</div>
              ) : (
                <>
                  {/* Mobile card view */}
                  <div className="block md:hidden space-y-3">
                    {userWithdrawals.map((wr) => (
                      <div key={wr.id} className="p-4 border rounded-xl space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="min-w-0">
                            <p className="font-medium text-sm">{wr.profiles?.first_name} {wr.profiles?.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{wr.profiles?.email}</p>
                          </div>
                          {getStatusBadge(wr.status)}
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{wr.bank_name} ****{wr.account_number?.slice(-4)}</span>
                          <span className="font-bold">₹{wr.requested_amount.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">{format(new Date(wr.requested_at), 'PP')}</span>
                          {wr.status === 'pending' ? (
                            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setSelectedUserWithdrawal(wr); setUserWithdrawalNote(""); setShowUserWithdrawalModal(true); }}>
                              <Eye className="w-3 h-3 mr-1" /> Review
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {wr.processed_at ? format(new Date(wr.processed_at), 'PP') : '-'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <Table className="hidden md:table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Bank Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userWithdrawals.map((wr) => (
                        <TableRow key={wr.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{wr.profiles?.first_name} {wr.profiles?.last_name}</div>
                              <div className="text-sm text-muted-foreground">{wr.profiles?.email}</div>
                            </div>
                          </TableCell>
                          <TableCell className="font-bold">₹{wr.requested_amount.toLocaleString()}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{wr.bank_name}</div>
                              <div className="text-muted-foreground">****{wr.account_number?.slice(-4)} • {wr.ifsc_code}</div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(wr.status)}</TableCell>
                          <TableCell>{format(new Date(wr.requested_at), 'PP')}</TableCell>
                          <TableCell>
                            {wr.status === 'pending' ? (
                              <Button variant="ghost" size="sm" onClick={() => { setSelectedUserWithdrawal(wr); setUserWithdrawalNote(""); setShowUserWithdrawalModal(true); }}>
                                <Eye className="w-4 h-4" />
                              </Button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {wr.processed_at ? format(new Date(wr.processed_at), 'PP') : '-'}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Celebrity Payout Requests</CardTitle>
              <CardDescription>Review and process celebrity withdrawal requests</CardDescription>
            </CardHeader>
            <CardContent>
              {payoutLoading ? (
                <div className="text-center py-8">Loading payout requests...</div>
              ) : payoutRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No payout requests</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Celebrity</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payoutRequests.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{payout.celebrities?.name || 'Unknown'}</div>
                            <div className="text-sm text-muted-foreground">{payout.profiles?.email}</div>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold">₹{payout.requested_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{payout.bank_name}</div>
                            <div className="text-muted-foreground">****{payout.bank_account_number?.slice(-4)} • {payout.ifsc_code}</div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(payout.status)}</TableCell>
                        <TableCell>{format(new Date(payout.requested_at), 'PP')}</TableCell>
                        <TableCell>
                          {payout.status === 'pending' ? (
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedPayout(payout); setPayoutAdminNote(""); setShowPayoutModal(true); }}>
                              <Eye className="w-4 h-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {payout.processed_at ? format(new Date(payout.processed_at), 'PP') : '-'}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Transaction Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
            <DialogDescription>Review and approve/reject this transaction</DialogDescription>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <div className="font-medium">{selectedTransaction.profiles?.first_name} {selectedTransaction.profiles?.last_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedTransaction.profiles?.email}</div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="text-2xl font-bold">₹{selectedTransaction.amount.toLocaleString()}</div>
                </div>
                <div>
                  <Label>Payment Method</Label>
                  <div className="capitalize">{selectedTransaction.payment_method}</div>
                </div>
                <div>
                  <Label>Status</Label>
                  <div>{getStatusBadge(selectedTransaction.status)}</div>
                </div>
              </div>
              {selectedTransaction.transaction_details?.details && (
                <div>
                  <Label>Transaction Details</Label>
                  <p className="text-sm mt-1">{selectedTransaction.transaction_details.details}</p>
                </div>
              )}
              {selectedTransaction.payment_screenshot_url && (
                <div>
                  <Label>Payment Receipt</Label>
                  <img src={selectedTransaction.payment_screenshot_url} alt="Payment receipt" className="mt-2 rounded-lg border max-h-96 object-contain" />
                </div>
              )}
              {selectedTransaction.status === 'pending' && (
                <div className="space-y-2">
                  <Label htmlFor="admin-note">Admin Note</Label>
                  <Textarea id="admin-note" value={adminNote} onChange={(e) => setAdminNote(e.target.value)} placeholder="Enter note..." rows={3} />
                </div>
              )}
              {selectedTransaction.admin_note && (
                <div>
                  <Label>Admin Note</Label>
                  <p className="text-sm mt-1">{selectedTransaction.admin_note}</p>
                </div>
              )}
            </div>
          )}
          {selectedTransaction?.status === 'pending' && (
            <DialogFooter>
              <Button variant="destructive" onClick={() => handleReject(selectedTransaction.id)}>
                <X className="w-4 h-4 mr-2" /> Reject
              </Button>
              <Button onClick={() => handleApprove(selectedTransaction.id)}>
                <Check className="w-4 h-4 mr-2" /> Approve
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Payout Detail Modal */}
      <Dialog open={showPayoutModal} onOpenChange={setShowPayoutModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process Payout Request</DialogTitle>
            <DialogDescription>Review and approve/reject this payout</DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Celebrity</Label>
                  <div className="font-medium">{selectedPayout.celebrities?.name}</div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="text-2xl font-bold">₹{selectedPayout.requested_amount.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <Label>Bank Details</Label>
                <div className="text-sm mt-1 space-y-1">
                  <p><strong>Name:</strong> {selectedPayout.account_holder_name}</p>
                  <p><strong>Bank:</strong> {selectedPayout.bank_name}</p>
                  <p><strong>A/C:</strong> {selectedPayout.bank_account_number}</p>
                  <p><strong>IFSC:</strong> {selectedPayout.ifsc_code}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Admin Note (required for rejection)</Label>
                <Textarea value={payoutAdminNote} onChange={(e) => setPayoutAdminNote(e.target.value)} placeholder="Enter note..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => selectedPayout && handleRejectPayout(selectedPayout)}>
              <X className="w-4 h-4 mr-2" /> Reject
            </Button>
            <Button onClick={() => selectedPayout && handleApprovePayout(selectedPayout)}>
              <Check className="w-4 h-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Withdrawal Detail Modal */}
      <Dialog open={showUserWithdrawalModal} onOpenChange={setShowUserWithdrawalModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Process User Withdrawal</DialogTitle>
            <DialogDescription>Review and approve/reject this withdrawal request</DialogDescription>
          </DialogHeader>
          {selectedUserWithdrawal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>User</Label>
                  <div className="font-medium">{selectedUserWithdrawal.profiles?.first_name} {selectedUserWithdrawal.profiles?.last_name}</div>
                  <div className="text-sm text-muted-foreground">{selectedUserWithdrawal.profiles?.email}</div>
                </div>
                <div>
                  <Label>Amount</Label>
                  <div className="text-2xl font-bold">₹{selectedUserWithdrawal.requested_amount.toLocaleString()}</div>
                </div>
              </div>
              <div>
                <Label>Bank Details</Label>
                <div className="text-sm mt-1 space-y-1">
                  <p><strong>Name:</strong> {selectedUserWithdrawal.account_holder_name}</p>
                  <p><strong>Bank:</strong> {selectedUserWithdrawal.bank_name}</p>
                  <p><strong>A/C:</strong> {selectedUserWithdrawal.account_number}</p>
                  <p><strong>IFSC:</strong> {selectedUserWithdrawal.ifsc_code}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Admin Note (required for rejection)</Label>
                <Textarea value={userWithdrawalNote} onChange={(e) => setUserWithdrawalNote(e.target.value)} placeholder="Enter note..." rows={3} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="destructive" onClick={() => selectedUserWithdrawal && handleRejectUserWithdrawal(selectedUserWithdrawal)}>
              <X className="w-4 h-4 mr-2" /> Reject & Refund
            </Button>
            <Button onClick={() => selectedUserWithdrawal && handleApproveUserWithdrawal(selectedUserWithdrawal)}>
              <Check className="w-4 h-4 mr-2" /> Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Funds Modal */}
      <Dialog open={showAddFundsModal} onOpenChange={setShowAddFundsModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds to User Wallet</DialogTitle>
            <DialogDescription>Manually credit a user's wallet</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.email}) - Balance: ₹{user.wallet_balance}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-amount">Amount (₹)</Label>
              <Input id="add-amount" type="number" value={addAmount} onChange={(e) => setAddAmount(e.target.value)} placeholder="Enter amount" min="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-note">Note (Optional)</Label>
              <Textarea id="add-note" value={addNote} onChange={(e) => setAddNote(e.target.value)} placeholder="Enter reason for credit..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFundsModal(false)}>Cancel</Button>
            <Button onClick={handleAddFunds}>Add Funds</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
