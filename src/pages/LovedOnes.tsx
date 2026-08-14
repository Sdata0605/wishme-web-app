import { useState, useEffect } from "react";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Plus, Edit, Trash2, Heart, Calendar, Mail, Phone, Upload } from "lucide-react";
import { format } from "date-fns";

interface Occasion {
  name: string;
  date: string;
  type: string;
}

interface LovedOne {
  id: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  date_of_birth?: string;
  relationship?: string;
  notes?: string;
  import_source?: string;
  created_at: string;
  occasions?: Occasion[];
}

export default function LovedOnes() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [lovedOnes, setLovedOnes] = useState<LovedOne[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [occasionsDialogOpen, setOccasionsDialogOpen] = useState(false);
  const [selectedLovedOne, setSelectedLovedOne] = useState<LovedOne | null>(null);
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const [newOccasion, setNewOccasion] = useState({ name: '', date: '', type: 'Birthday' });
  
  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    relationship: "",
    notes: ""
  });

  useEffect(() => {
    if (profile?.id) {
      fetchLovedOnes();
    }
  }, [profile?.id]);

  const fetchLovedOnes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('loved_ones')
        .select('*')
        .eq('user_id', profile?.id)
        .order('first_name');

      if (error) throw error;
      
      // Parse occasions from JSON
      const parsedData = (data || []).map(item => ({
        ...item,
        occasions: Array.isArray(item.occasions) ? item.occasions as unknown as Occasion[] : []
      }));
      
      setLovedOnes(parsedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load loved ones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.first_name) {
      toast({
        title: "Validation Error",
        description: "First name is required",
        variant: "destructive"
      });
      return;
    }

    try {
      if (editingId) {
        const { error } = await supabase
          .from('loved_ones')
          .update(formData)
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Updated!",
          description: "Loved one updated successfully"
        });
      } else {
        const { error } = await supabase
          .from('loved_ones')
          .insert({
            ...formData,
            user_id: profile?.id,
            import_source: 'manual'
          });

        if (error) throw error;

        toast({
          title: "Added!",
          description: "Loved one added successfully"
        });
      }

      setDialogOpen(false);
      resetForm();
      fetchLovedOnes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleEdit = (lovedOne: LovedOne) => {
    setEditingId(lovedOne.id);
    setFormData({
      first_name: lovedOne.first_name,
      last_name: lovedOne.last_name || "",
      email: lovedOne.email || "",
      phone: lovedOne.phone || "",
      date_of_birth: lovedOne.date_of_birth || "",
      relationship: lovedOne.relationship || "",
      notes: lovedOne.notes || ""
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this loved one?")) return;

    try {
      const { error } = await supabase
        .from('loved_ones')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Deleted",
        description: "Loved one removed successfully"
      });

      fetchLovedOnes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      date_of_birth: "",
      relationship: "",
      notes: ""
    });
    setEditingId(null);
  };

  const handleManageOccasions = (lovedOne: LovedOne) => {
    setSelectedLovedOne(lovedOne);
    // Deep copy to prevent reference issues
    setOccasions(JSON.parse(JSON.stringify(lovedOne.occasions || [])));
    setOccasionsDialogOpen(true);
  };

  const handleAddOccasion = () => {
    if (!newOccasion.name || !newOccasion.date) {
      toast({
        title: "Validation Error",
        description: "Occasion name and date are required",
        variant: "destructive"
      });
      return;
    }
    
    setOccasions([...occasions, { ...newOccasion }]);
    setNewOccasion({ name: '', date: '', type: 'Birthday' });
  };

  const handleRemoveOccasion = (index: number) => {
    setOccasions(occasions.filter((_, i) => i !== index));
  };

  const handleCancelOccasions = () => {
    // Reset to original occasions when cancelling
    if (selectedLovedOne) {
      setOccasions(JSON.parse(JSON.stringify(selectedLovedOne.occasions || [])));
    }
    setOccasionsDialogOpen(false);
    setSelectedLovedOne(null);
  };

  const handleSaveOccasions = async () => {
    if (!selectedLovedOne) return;

    // Confirmation if reducing occasions
    const originalCount = selectedLovedOne.occasions?.length || 0;
    if (occasions.length < originalCount) {
      if (!confirm(`You are removing ${originalCount - occasions.length} occasion(s). Continue?`)) {
        return;
      }
    }

    try {
      const { error } = await supabase
        .from('loved_ones')
        .update({ occasions: occasions as any })
        .eq('id', selectedLovedOne.id);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Occasions updated successfully"
      });

      setOccasionsDialogOpen(false);
      setSelectedLovedOne(null);
      // Fetch fresh data from server instead of relying on local state
      await fetchLovedOnes();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getUpcomingBirthday = (dateOfBirth: string) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    const thisYear = today.getFullYear();
    const birthday = new Date(thisYear, dob.getMonth(), dob.getDate());
    
    if (birthday < today) {
      birthday.setFullYear(thisYear + 1);
    }
    
    const daysUntil = Math.ceil((birthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntil;
  };

  return (
    <AuthenticatedLayout showSidebar>
      <div className="container mx-auto px-4 py-8 pt-20 md:pt-24 mobile-safe-bottom">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center gap-3">
              <Heart className="w-8 h-8" />
              Loved Ones
            </h1>
            <p className="text-muted-foreground">
              Manage your contacts and never miss an occasion
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Loved One
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Loved One" : "Add Loved One"}</DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="relationship">Relationship</Label>
                  <Select value={formData.relationship} onValueChange={(value) => setFormData({ ...formData, relationship: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Family">Family</SelectItem>
                      <SelectItem value="Friend">Friend</SelectItem>
                      <SelectItem value="Partner">Partner</SelectItem>
                      <SelectItem value="Colleague">Colleague</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingId ? "Update" : "Add"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Import Options */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Import Contacts</CardTitle>
            <CardDescription>
              Import contacts from Gmail, Facebook, or your phone (coming soon)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline" disabled>
                <Upload className="w-4 h-4 mr-2" />
                Import from Gmail
              </Button>
              <Button variant="outline" disabled>
                <Upload className="w-4 h-4 mr-2" />
                Import from Facebook
              </Button>
              <Button variant="outline" disabled>
                <Upload className="w-4 h-4 mr-2" />
                Import from Phone
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Import features will be available soon
            </p>
          </CardContent>
        </Card>

        {/* Loved Ones List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : lovedOnes.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg text-muted-foreground mb-4">No loved ones added yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Start by adding your friends and family to never miss their special occasions
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lovedOnes.map((lovedOne) => {
              const daysUntilBirthday = lovedOne.date_of_birth ? getUpcomingBirthday(lovedOne.date_of_birth) : null;
              
              return (
                <Card key={lovedOne.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {lovedOne.first_name} {lovedOne.last_name}
                        </CardTitle>
                        {lovedOne.relationship && (
                          <Badge variant="secondary" className="mt-2">
                            {lovedOne.relationship}
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(lovedOne)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(lovedOne.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {lovedOne.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        <span className="truncate">{lovedOne.email}</span>
                      </div>
                    )}
                    {lovedOne.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{lovedOne.phone}</span>
                      </div>
                    )}
                    {lovedOne.date_of_birth && (
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>{format(new Date(lovedOne.date_of_birth), 'MMM dd, yyyy')}</span>
                        {daysUntilBirthday !== null && daysUntilBirthday <= 30 && (
                          <Badge variant={daysUntilBirthday <= 7 ? "destructive" : "default"} className="text-xs">
                            {daysUntilBirthday === 0 ? "Today!" : `${daysUntilBirthday} days`}
                          </Badge>
                        )}
                      </div>
                    )}
                    {lovedOne.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {lovedOne.notes}
                      </p>
                    )}
                    {lovedOne.occasions && lovedOne.occasions.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {lovedOne.occasions.slice(0, 3).map((occasion, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {occasion.name} - {format(new Date(occasion.date), 'MMM dd')}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleManageOccasions(lovedOne)}
                      className="w-full mt-3"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Manage Occasions
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AuthenticatedLayout>
  );
}
