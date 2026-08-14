import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface BankDetail {
  id: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  ifsc_code: string;
  account_type: string;
  is_default: boolean;
}

export function BankDetailsManager() {
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<BankDetail | null>(null);
  const [formData, setFormData] = useState({
    bank_name: "",
    account_holder_name: "",
    account_number: "",
    ifsc_code: "",
    account_type: "savings",
    is_default: false,
  });
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchBankDetails();
    }
  }, [profile]);

  const fetchBankDetails = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("bank_details")
      .select("*")
      .eq("user_id", profile.id)
      .order("is_default", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch bank details",
        variant: "destructive",
      });
    } else {
      setBankDetails(data || []);
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const bankData = {
        ...formData,
        user_id: profile.id,
      };

      if (editingBank) {
        const { error } = await supabase
          .from("bank_details")
          .update(bankData)
          .eq("id", editingBank.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Bank details updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("bank_details")
          .insert([bankData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Bank details added successfully",
        });
      }

      fetchBankDetails();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Bank details save error:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to save bank details",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("bank_details")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Bank details deleted successfully",
      });
      
      fetchBankDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete bank details",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!profile) return;

    try {
      // First, remove default from all bank details
      await supabase
        .from("bank_details")
        .update({ is_default: false })
        .eq("user_id", profile.id);

      // Then set the selected bank detail as default
      const { error } = await supabase
        .from("bank_details")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Default bank account updated",
      });
      
      fetchBankDetails();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update default bank account",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      bank_name: "",
      account_holder_name: "",
      account_number: "",
      ifsc_code: "",
      account_type: "savings",
      is_default: false,
    });
    setEditingBank(null);
  };

  const openEditDialog = (bankDetail: BankDetail) => {
    setEditingBank(bankDetail);
    setFormData({
      bank_name: bankDetail.bank_name,
      account_holder_name: bankDetail.account_holder_name,
      account_number: bankDetail.account_number,
      ifsc_code: bankDetail.ifsc_code,
      account_type: bankDetail.account_type,
      is_default: bankDetail.is_default,
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return "****" + accountNumber.slice(-4);
  };

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center space-x-2 text-base">
            <CreditCard className="w-5 h-5 shrink-0" />
            <span>Bank Details</span>
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} size="sm" className="rounded-full text-xs h-8 px-3 shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Bank Account
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingBank ? "Edit Bank Details" : "Add New Bank Account"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="bank_name">Bank Name*</Label>
                <Input
                  id="bank_name"
                  value={formData.bank_name}
                  onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
                  placeholder="Bank name"
                />
              </div>
              <div>
                <Label htmlFor="account_holder_name">Account Holder Name*</Label>
                <Input
                  id="account_holder_name"
                  value={formData.account_holder_name}
                  onChange={(e) => setFormData({ ...formData, account_holder_name: e.target.value })}
                  placeholder="Account holder name"
                />
              </div>
              <div>
                <Label htmlFor="account_number">Account Number*</Label>
                <Input
                  id="account_number"
                  value={formData.account_number}
                  onChange={(e) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Account number"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="ifsc_code">IFSC Code*</Label>
                  <Input
                    id="ifsc_code"
                    value={formData.ifsc_code}
                    onChange={(e) => setFormData({ ...formData, ifsc_code: e.target.value.toUpperCase() })}
                    placeholder="IFSC code"
                  />
                </div>
                <div>
                  <Label htmlFor="account_type">Account Type</Label>
                  <Select value={formData.account_type} onValueChange={(value) => setFormData({ ...formData, account_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Savings</SelectItem>
                      <SelectItem value="current">Current</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingBank ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {bankDetails.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No bank accounts added yet. Click "Add Bank Account" to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {bankDetails.map((bank) => (
              <div key={bank.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={bank.account_type === 'savings' ? 'default' : 'secondary'}>
                        {bank.account_type}
                      </Badge>
                      {bank.is_default && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{bank.bank_name}</p>
                    <p className="text-muted-foreground">{bank.account_holder_name}</p>
                    <p className="text-muted-foreground">
                      Account: {maskAccountNumber(bank.account_number)}
                    </p>
                    <p className="text-muted-foreground text-sm">
                      IFSC: {bank.ifsc_code}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!bank.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(bank.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(bank)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(bank.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}