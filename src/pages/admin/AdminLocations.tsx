import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, MapPin, Building, Plus, Edit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Country {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface State {
  id: string;
  name: string;
  country_id: string;
  code?: string;
  is_active: boolean;
  country_name?: string;
}

interface Area {
  id: string;
  name: string;
  state_id: string;
  pincode: string;
  is_active: boolean;
  state_name?: string;
  country_name?: string;
}

export default function AdminLocations() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [activeTab, setActiveTab] = useState("countries");
  const { toast } = useToast();

  // Dialog states
  const [countryDialog, setCountryDialog] = useState(false);
  const [stateDialog, setStateDialog] = useState(false);
  const [areaDialog, setAreaDialog] = useState(false);

  // Form states
  const [countryForm, setCountryForm] = useState({ name: "", code: "" });
  const [stateForm, setStateForm] = useState({ name: "", country_id: "", code: "" });
  const [areaForm, setAreaForm] = useState({ name: "", state_id: "", pincode: "" });

  // Editing states
  const [editingCountry, setEditingCountry] = useState<Country | null>(null);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  useEffect(() => {
    fetchCountries();
    fetchStates();
    fetchAreas();
  }, []);

  const fetchCountries = async () => {
    const { data, error } = await supabase
      .from("countries")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch countries",
        variant: "destructive",
      });
    } else {
      setCountries(data || []);
    }
  };

  const fetchStates = async () => {
    const { data, error } = await supabase
      .from("states")
      .select(`
        *,
        countries!inner(name)
      `)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch states",
        variant: "destructive",
      });
    } else {
      const statesWithCountry = data?.map(state => ({
        ...state,
        country_name: (state as any).countries.name
      })) || [];
      setStates(statesWithCountry);
    }
  };

  const fetchAreas = async () => {
    const { data, error } = await supabase
      .from("areas")
      .select(`
        *,
        states!inner(
          name,
          countries!inner(name)
        )
      `)
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch areas",
        variant: "destructive",
      });
    } else {
      const areasWithLocation = data?.map(area => ({
        ...area,
        state_name: (area as any).states.name,
        country_name: (area as any).states.countries.name
      })) || [];
      setAreas(areasWithLocation);
    }
  };

  // Country operations
  const handleSaveCountry = async () => {
    try {
      if (editingCountry) {
        const { error } = await supabase
          .from("countries")
          .update(countryForm)
          .eq("id", editingCountry.id);

        if (error) throw error;
        toast({ title: "Success", description: "Country updated successfully" });
      } else {
        const { error } = await supabase
          .from("countries")
          .insert([countryForm]);

        if (error) throw error;
        toast({ title: "Success", description: "Country added successfully" });
      }

      fetchCountries();
      resetCountryForm();
      setCountryDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save country",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCountry = async (id: string) => {
    try {
      const { error } = await supabase
        .from("countries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Country deleted successfully" });
      fetchCountries();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete country",
        variant: "destructive",
      });
    }
  };

  // State operations
  const handleSaveState = async () => {
    try {
      if (editingState) {
        const { error } = await supabase
          .from("states")
          .update(stateForm)
          .eq("id", editingState.id);

        if (error) throw error;
        toast({ title: "Success", description: "State updated successfully" });
      } else {
        const { error } = await supabase
          .from("states")
          .insert([stateForm]);

        if (error) throw error;
        toast({ title: "Success", description: "State added successfully" });
      }

      fetchStates();
      resetStateForm();
      setStateDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save state",
        variant: "destructive",
      });
    }
  };

  const handleDeleteState = async (id: string) => {
    try {
      const { error } = await supabase
        .from("states")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "State deleted successfully" });
      fetchStates();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete state",
        variant: "destructive",
      });
    }
  };

  // Area operations
  const handleSaveArea = async () => {
    try {
      if (editingArea) {
        const { error } = await supabase
          .from("areas")
          .update(areaForm)
          .eq("id", editingArea.id);

        if (error) throw error;
        toast({ title: "Success", description: "Area updated successfully" });
      } else {
        const { error } = await supabase
          .from("areas")
          .insert([areaForm]);

        if (error) throw error;
        toast({ title: "Success", description: "Area added successfully" });
      }

      fetchAreas();
      resetAreaForm();
      setAreaDialog(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save area",
        variant: "destructive",
      });
    }
  };

  const handleDeleteArea = async (id: string) => {
    try {
      const { error } = await supabase
        .from("areas")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast({ title: "Success", description: "Area deleted successfully" });
      fetchAreas();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete area",
        variant: "destructive",
      });
    }
  };

  // Reset forms
  const resetCountryForm = () => {
    setCountryForm({ name: "", code: "" });
    setEditingCountry(null);
  };

  const resetStateForm = () => {
    setStateForm({ name: "", country_id: "", code: "" });
    setEditingState(null);
  };

  const resetAreaForm = () => {
    setAreaForm({ name: "", state_id: "", pincode: "" });
    setEditingArea(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-3xl font-bold">Manage Locations</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="countries">Countries</TabsTrigger>
          <TabsTrigger value="states">States</TabsTrigger>
          <TabsTrigger value="areas">Areas</TabsTrigger>
        </TabsList>

        <TabsContent value="countries">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Globe className="w-5 h-5 mr-2" />
                Countries
              </CardTitle>
              <Dialog open={countryDialog} onOpenChange={setCountryDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetCountryForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Country
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingCountry ? "Edit Country" : "Add New Country"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="country_name">Country Name*</Label>
                      <Input
                        id="country_name"
                        value={countryForm.name}
                        onChange={(e) => setCountryForm({ ...countryForm, name: e.target.value })}
                        placeholder="Enter country name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="country_code">Country Code*</Label>
                      <Input
                        id="country_code"
                        value={countryForm.code}
                        onChange={(e) => setCountryForm({ ...countryForm, code: e.target.value })}
                        placeholder="Enter country code (e.g., IN, US)"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setCountryDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveCountry}>
                        {editingCountry ? "Update" : "Add"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {countries.map((country) => (
                  <div key={country.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{country.name}</h3>
                      <p className="text-sm text-muted-foreground">Code: {country.code}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={country.is_active ? "default" : "secondary"}>
                        {country.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingCountry(country);
                          setCountryForm({ name: country.name, code: country.code });
                          setCountryDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteCountry(country.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="states">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                States
              </CardTitle>
              <Dialog open={stateDialog} onOpenChange={setStateDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetStateForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add State
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingState ? "Edit State" : "Add New State"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="state_name">State Name*</Label>
                      <Input
                        id="state_name"
                        value={stateForm.name}
                        onChange={(e) => setStateForm({ ...stateForm, name: e.target.value })}
                        placeholder="Enter state name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state_country">Country*</Label>
                      <Select 
                        value={stateForm.country_id} 
                        onValueChange={(value) => setStateForm({ ...stateForm, country_id: value })}
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
                      <Label htmlFor="state_code">State Code</Label>
                      <Input
                        id="state_code"
                        value={stateForm.code}
                        onChange={(e) => setStateForm({ ...stateForm, code: e.target.value })}
                        placeholder="Enter state code (optional)"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setStateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveState}>
                        {editingState ? "Update" : "Add"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {states.map((state) => (
                  <div key={state.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{state.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Country: {state.country_name}
                        {state.code && ` • Code: ${state.code}`}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={state.is_active ? "default" : "secondary"}>
                        {state.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingState(state);
                          setStateForm({ 
                            name: state.name, 
                            country_id: state.country_id,
                            code: state.code || ""
                          });
                          setStateDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteState(state.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="areas">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center">
                <Building className="w-5 h-5 mr-2" />
                Areas
              </CardTitle>
              <Dialog open={areaDialog} onOpenChange={setAreaDialog}>
                <DialogTrigger asChild>
                  <Button onClick={resetAreaForm}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Area
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingArea ? "Edit Area" : "Add New Area"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="area_name">Area Name*</Label>
                      <Input
                        id="area_name"
                        value={areaForm.name}
                        onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                        placeholder="Enter area name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="area_state">State*</Label>
                      <Select 
                        value={areaForm.state_id} 
                        onValueChange={(value) => setAreaForm({ ...areaForm, state_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select state" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state.id} value={state.id}>
                              {state.name} ({state.country_name})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="area_pincode">Pincode*</Label>
                      <Input
                        id="area_pincode"
                        value={areaForm.pincode}
                        onChange={(e) => setAreaForm({ ...areaForm, pincode: e.target.value })}
                        placeholder="Enter pincode"
                      />
                    </div>
                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setAreaDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveArea}>
                        {editingArea ? "Update" : "Add"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {areas.map((area) => (
                  <div key={area.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{area.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {area.state_name}, {area.country_name} • Pincode: {area.pincode}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={area.is_active ? "default" : "secondary"}>
                        {area.is_active ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingArea(area);
                          setAreaForm({ 
                            name: area.name, 
                            state_id: area.state_id,
                            pincode: area.pincode
                          });
                          setAreaDialog(true);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteArea(area.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}