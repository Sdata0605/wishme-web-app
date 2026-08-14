import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Address {
  id: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  pincode: string;
  address_type: string;
  is_default: boolean;
  country_id?: string;
  state_id?: string;
  area?: string;
}

interface Country {
  id: string;
  name: string;
  code: string;
}

interface State {
  id: string;
  name: string;
  country_id: string;
}

interface Area {
  id: string;
  name: string;
  state_id: string;
  pincode: string;
}

export function EnhancedAddressManager() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [filteredStates, setFilteredStates] = useState<State[]>([]);
  const [filteredAreas, setFilteredAreas] = useState<Area[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState({
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    pincode: "",
    address_type: "home",
    is_default: false,
    country_id: "",
    state_id: "",
    area: "",
  });
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (profile) {
      fetchAddresses();
      fetchCountries();
      fetchStates();
      fetchAreas();
    }
  }, [profile]);

  useEffect(() => {
    if (formData.country_id) {
      const filtered = states.filter(state => state.country_id === formData.country_id);
      setFilteredStates(filtered);
    } else {
      setFilteredStates([]);
    }
    setFormData(prev => ({ ...prev, state_id: "", area: "" }));
  }, [formData.country_id, states]);

  useEffect(() => {
    if (formData.state_id) {
      const filtered = areas.filter(area => area.state_id === formData.state_id);
      setFilteredAreas(filtered);
    } else {
      setFilteredAreas([]);
    }
    setFormData(prev => ({ ...prev, area: "" }));
  }, [formData.state_id, areas]);

  const fetchAddresses = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from("addresses")
      .select("*")
      .eq("user_id", profile.id)
      .order("is_default", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch addresses",
        variant: "destructive",
      });
    } else {
      setAddresses(data || []);
    }
  };

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching countries:", error);
    } else {
      setCountries(data || []);
    }
  };

  const fetchStates = async () => {
    const { data, error } = await supabase
      .from("states")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching states:", error);
    } else {
      setStates(data || []);
    }
  };

  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from("areas")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching areas:", error);
    } else {
      setAreas(data || []);
    }
  };

  const handlePincodeChange = (pincode: string) => {
    setFormData({ ...formData, pincode });
    
    // Auto-suggest area based on pincode
    if (pincode.length >= 6) {
      const matchingArea = areas.find(area => area.pincode === pincode);
      if (matchingArea) {
        setFormData(prev => ({
          ...prev,
          area: matchingArea.name,
          state_id: matchingArea.state_id
        }));
      }
    }
  };

  const handleSave = async () => {
    if (!profile) return;

    try {
      const addressData = {
        ...formData,
        user_id: profile.id,
      };

      if (editingAddress) {
        const { error } = await supabase
          .from("addresses")
          .update(addressData)
          .eq("id", editingAddress.id);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Address updated successfully",
        });
      } else {
        const { error } = await supabase
          .from("addresses")
          .insert([addressData]);

        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Address added successfully",
        });
      }

      fetchAddresses();
      resetForm();
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save address",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("addresses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Address deleted successfully",
      });
      
      fetchAddresses();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete address",
        variant: "destructive",
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!profile) return;

    try {
      // First, remove default from all addresses
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", profile.id);

      // Then set the selected address as default
      const { error } = await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Default address updated",
      });
      
      fetchAddresses();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update default address",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      address_line_1: "",
      address_line_2: "",
      city: "",
      state: "",
      pincode: "",
      address_type: "home",
      is_default: false,
      country_id: "",
      state_id: "",
      area: "",
    });
    setEditingAddress(null);
  };

  const openEditDialog = (address: Address) => {
    setEditingAddress(address);
    setFormData({
      address_line_1: address.address_line_1,
      address_line_2: address.address_line_2 || "",
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      address_type: address.address_type,
      is_default: address.is_default,
      country_id: address.country_id || "",
      state_id: address.state_id || "",
      area: address.area || "",
    });
    setIsDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="flex items-center space-x-2 text-base">
            <MapPin className="w-5 h-5 shrink-0" />
            <span>Addresses</span>
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAddDialog} size="sm" className="rounded-full text-xs h-8 px-3 shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Address
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? "Edit Address" : "Add New Address"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="address_line_1">Address Line 1*</Label>
                <Input
                  id="address_line_1"
                  value={formData.address_line_1}
                  onChange={(e) => setFormData({ ...formData, address_line_1: e.target.value })}
                  placeholder="House/Flat number, Building name"
                />
              </div>
              <div>
                <Label htmlFor="address_line_2">Address Line 2</Label>
                <Input
                  id="address_line_2"
                  value={formData.address_line_2}
                  onChange={(e) => setFormData({ ...formData, address_line_2: e.target.value })}
                  placeholder="Area, Street, Sector, Village"
                />
              </div>
              
              <div>
                <Label htmlFor="country">Country*</Label>
                <Select 
                  value={formData.country_id} 
                  onValueChange={(value) => setFormData({ ...formData, country_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="state_select">State*</Label>
                <Select 
                  value={formData.state_id} 
                  onValueChange={(value) => {
                    const selectedState = filteredStates.find(s => s.id === value);
                    setFormData({ 
                      ...formData, 
                      state_id: value,
                      state: selectedState?.name || ""
                    });
                  }}
                  disabled={!formData.country_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStates.map((state) => (
                      <SelectItem key={state.id} value={state.id}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pincode">Pincode*</Label>
                  <Input
                    id="pincode"
                    value={formData.pincode}
                    onChange={(e) => handlePincodeChange(e.target.value)}
                    placeholder="Pincode"
                    maxLength={6}
                  />
                </div>
                <div>
                  <Label htmlFor="area">Area</Label>
                  <Input
                    id="area"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    placeholder="Area/Locality"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="city">City*</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                />
              </div>

              <div>
                <Label htmlFor="address_type">Address Type</Label>
                <Select value={formData.address_type} onValueChange={(value) => setFormData({ ...formData, address_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>
                  {editingAddress ? "Update" : "Add"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {addresses.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No addresses added yet. Click "Add Address" to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {addresses.map((address) => (
              <div key={address.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge variant={address.address_type === 'home' ? 'default' : address.address_type === 'office' ? 'secondary' : 'outline'}>
                        {address.address_type}
                      </Badge>
                      {address.is_default && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Default
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{address.address_line_1}</p>
                    {address.address_line_2 && (
                      <p className="text-muted-foreground">{address.address_line_2}</p>
                    )}
                    {address.area && (
                      <p className="text-muted-foreground">{address.area}</p>
                    )}
                    <p className="text-muted-foreground">
                      {address.city}, {address.state} - {address.pincode}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!address.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(address)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
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