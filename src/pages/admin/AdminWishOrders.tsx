import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Search, Heart, Eye, Download, Image as ImageIcon, Video } from "lucide-react";

interface WishOrder {
  id: string;
  user_id: string;
  celebrity_id: string;
  occasion_type: string;
  recipient_name: string;
  message: string;
  status: string;
  payment_status: string;
  amount_paid: number;
  card_generation_type: string;
  user_uploaded_card_url: string | null;
  user_uploaded_video_url: string | null;
  card_url: string | null;
  created_at: string;
  profiles: { first_name: string; last_name: string };
  celebrities: { name: string; image_url: string };
}

export default function AdminWishOrders() {
  const [orders, setOrders] = useState<WishOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<WishOrder | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('wish_celebrity_orders')
        .select(`
          *,
          profiles!inner(first_name, last_name),
          celebrities!inner(name, image_url)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Could not load wish orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCardTypeBadge = (type: string) => {
    switch (type) {
      case 'ai':
        return <Badge variant="default">AI Generated</Badge>;
      case 'uploaded_image':
        return <Badge className="bg-blue-100 text-blue-800">User Image</Badge>;
      case 'uploaded_video':
        return <Badge className="bg-purple-100 text-purple-800">User Video</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const handleViewOrder = (order: WishOrder) => {
    setSelectedOrder(order);
    setViewModalOpen(true);
  };

  const downloadMedia = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast({
        title: "Downloaded!",
        description: "File saved successfully"
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Could not download file",
        variant: "destructive"
      });
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.celebrities.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.profiles.first_name} ${order.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    completed: orders.filter(o => o.status === 'completed').length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.amount_paid || 0), 0),
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Wish Celebrity Orders</h1>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-3xl font-bold">Wish Celebrity Orders</h1>
        <p className="text-sm text-muted-foreground">
          View-only access to all user wishes sent to celebrities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
              <Heart className="w-4 h-4 mr-2" />
              Total Wishes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{stats.totalRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search by recipient, celebrity, or user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Wish Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            Read-only view of all celebrity wish orders
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mobile card view */}
          <div className="block md:hidden space-y-3">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-4 border rounded-xl space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <img src={order.celebrities.image_url} alt={order.celebrities.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{order.celebrities.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.occasion_type}</p>
                    </div>
                  </div>
                  {getStatusBadge(order.status)}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">To: {order.recipient_name}</span>
                  <span className="font-semibold">₹{order.amount_paid?.toLocaleString() || 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => handleViewOrder(order)}>
                    <Eye className="w-3 h-3 mr-1" /> View
                  </Button>
                </div>
              </div>
            ))}
            {filteredOrders.length === 0 && <p className="text-center text-muted-foreground py-8">No orders found</p>}
          </div>

          {/* Desktop table */}
          <Table className="hidden md:table">
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Celebrity</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Occasion</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>{order.profiles.first_name} {order.profiles.last_name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <img src={order.celebrities.image_url} alt={order.celebrities.name} className="w-8 h-8 rounded-full object-cover" />
                      <span>{order.celebrities.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>{order.recipient_name}</TableCell>
                  <TableCell>{order.occasion_type}</TableCell>
                  <TableCell>{getCardTypeBadge(order.card_generation_type)}</TableCell>
                  <TableCell>₹{order.amount_paid?.toLocaleString() || 0}</TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>{new Date(order.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleViewOrder(order)}>
                      <Eye className="w-4 h-4 mr-2" /> View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Order Modal */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-2xl w-[calc(100vw-32px)] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Wish Order Details</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Order ID</p>
                  <p className="font-mono text-sm">{selectedOrder.id.slice(0, 8)}...</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">
                    {selectedOrder.profiles.first_name} {selectedOrder.profiles.last_name}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Celebrity</p>
                  <p className="font-medium">{selectedOrder.celebrities.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Recipient</p>
                  <p className="font-medium">{selectedOrder.recipient_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Occasion</p>
                  <p className="font-medium">{selectedOrder.occasion_type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                  <p className="font-medium">₹{selectedOrder.amount_paid?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Card Type</p>
                  {getCardTypeBadge(selectedOrder.card_generation_type)}
                </div>
              </div>

              {/* Message */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">User's Message</p>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{selectedOrder.message || 'No message'}</p>
                </div>
              </div>

              {/* Media */}
              <div className="space-y-4">
                {selectedOrder.card_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">AI Generated Card</p>
                    <img 
                      src={selectedOrder.card_url} 
                      alt="Generated Card" 
                      className="w-full rounded-lg border"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => downloadMedia(selectedOrder.card_url!, `card-${selectedOrder.id}.jpg`)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Card
                    </Button>
                  </div>
                )}

                {selectedOrder.user_uploaded_card_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">User Uploaded Card</p>
                    <img 
                      src={selectedOrder.user_uploaded_card_url} 
                      alt="User Card" 
                      className="w-full rounded-lg border"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => downloadMedia(selectedOrder.user_uploaded_card_url!, `user-card-${selectedOrder.id}.jpg`)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                )}

                {selectedOrder.user_uploaded_video_url && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">User Uploaded Video</p>
                    <video 
                      src={selectedOrder.user_uploaded_video_url} 
                      controls 
                      className="w-full rounded-lg border"
                    />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => downloadMedia(selectedOrder.user_uploaded_video_url!, `user-video-${selectedOrder.id}.mp4`)}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Video
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}