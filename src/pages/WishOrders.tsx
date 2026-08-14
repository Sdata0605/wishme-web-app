import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { useNavigate } from "react-router-dom";

export default function WishOrders() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchOrders();
  }, [user, authLoading]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('wish_celebrity_orders')
        .select(`
          *,
          celebrities (
            id,
            name,
            image_url
          )
        `)
        .eq('user_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'processing':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const downloadCard = async (cardUrl: string, orderId: string) => {
    try {
      toast({
        title: "Downloading...",
        description: "Preparing your card"
      });

      const response = await fetch(cardUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `wish-card-${orderId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success!",
        description: "Card downloaded to your device"
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Please try again or check your connection",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <AuthenticatedLayout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground animate-pulse">Loading your wishes...</p>
        </div>
      </AuthenticatedLayout>
    );
  }

  // Separate orders into pending and completed
  const pendingOrders = orders.filter(order => 
    order.payment_status === 'completed' && order.status !== 'sent'
  );
  
  const completedOrders = orders.filter(order => 
    order.status === 'sent'
  );

  return (
    <AuthenticatedLayout>
      <div className="container mx-auto px-4 py-12 pt-24 mobile-safe-bottom">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">My Wish Orders</h1>
              <p className="text-muted-foreground">
                Track your celebrity wishes and greeting cards
              </p>
            </div>
            <Button onClick={() => navigate('/wish-celebrity')}>
              Make New Wish
            </Button>
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">No wishes yet</p>
                <Button onClick={() => navigate('/wish-celebrity')}>
                  Create Your First Wish
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-8">
              {/* Pending Orders Section */}
              {pendingOrders.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Loader2 className="w-5 h-5 text-orange-500" />
                    Active/Pending Orders
                  </h2>
                  <div className="space-y-4">
                    {pendingOrders.map((order) => (
                      <Card key={order.id} className="border-orange-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <img 
                              src={order.celebrities?.image_url || '/placeholder.svg'}
                              alt={order.celebrities?.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-semibold text-lg">{order.celebrities?.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {order.occasion_type} • To: {order.recipient_name}
                                  </p>
                                </div>
                                <Badge variant={getStatusColor(order.status)}>
                                  {order.status}
                                </Badge>
                              </div>
                              
                              <p className="text-sm mb-4 line-clamp-2">{order.message}</p>
                              
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => navigate(`/wish-confirmation/${order.id}`)}
                                >
                                  Continue Wish
                                </Button>
                                {order.generated_card_image_url && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => window.open(order.generated_card_image_url, '_blank')}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Card
                                    </Button>
                                  </>
                                )}
                                {order.status === 'processing' && (
                                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating your card...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Orders Section */}
              {completedOrders.length > 0 && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Badge className="bg-green-500">✓</Badge>
                    Completed Wishes
                  </h2>
                  <div className="space-y-4">
                    {completedOrders.map((order) => (
                      <Card key={order.id} className="border-green-500/20">
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <img 
                              src={order.celebrities?.image_url || '/placeholder.svg'}
                              alt={order.celebrities?.name}
                              className="w-16 h-16 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between mb-2">
                                <div>
                                  <h3 className="font-semibold text-lg">{order.celebrities?.name}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {order.occasion_type} • To: {order.recipient_name}
                                  </p>
                                </div>
                                <Badge variant="default" className="bg-green-500">
                                  Sent
                                </Badge>
                              </div>
                              
                              <p className="text-sm mb-4 line-clamp-2">{order.message}</p>
                              
                              <div className="flex items-center gap-2">
                                <Button 
                                  size="sm"
                                  onClick={() => navigate('/messages')}
                                >
                                  View Conversation
                                </Button>
                                {order.generated_card_image_url && (
                                  <>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => window.open(order.generated_card_image_url, '_blank')}
                                    >
                                      <Eye className="w-4 h-4 mr-2" />
                                      View Card
                                    </Button>
                                    <Button 
                                      size="sm"
                                      variant="outline"
                                      onClick={() => downloadCard(order.generated_card_image_url, order.id)}
                                    >
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthenticatedLayout>
  );
}