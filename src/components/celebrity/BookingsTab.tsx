import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Image, Video, FileText } from "lucide-react";
import { B2VideoPlayer } from "@/components/media/B2VideoPlayer";

interface BookingsTabProps {
  celebrityId: string;
}

interface Booking {
  id: string;
  service_type: string;
  final_price: number;
  status: string;
  created_at: string;
  delivery_date: string;
  message: string;
  instructions: string;
  commission_percentage: number;
  celebrity_commission: number;
  platform_fee: number;
  video_url?: string;
  heygen_video_id?: string;
  video_file_key?: string;
  video_status?: string;
  card_url?: string;
  generated_card_image_url?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

interface ImagePromotion {
  id: string;
  celebrity_id: string;
  user_id: string;
  concept: string;
  branding_details?: string;
  generated_image_url?: string;
  price_paid: number;
  status: string;
  created_at: string;
  completed_at?: string;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export function BookingsTab({ celebrityId }: BookingsTabProps) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [imagePromotions, setImagePromotions] = useState<ImagePromotion[]>([]);
  // Wish a Friend, UGC video and UGC ad orders: the admin makes the video; the celebrity is paid when it is completed.
  const [friendOrders, setFriendOrders] = useState<Array<{ id: string; label: string; title: string; customer: string; price: number; status: string; created_at: string; earned?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<ImagePromotion | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (celebrityId) {
      fetchAllOrders();
    } else {
      setLoading(false);
    }
  }, [celebrityId]);

  const fetchAllOrders = async () => {
    try {
      // Fetch regular bookings (video wishes, greeting cards, etc.)
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!bookings_user_id_fkey (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('celebrity_id', celebrityId)
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;
      setBookings(bookingsData || []);

      // Fetch image promotions
      const { data: promotionsData, error: promotionsError } = await supabase
        .from('image_promotions')
        .select(`
          *,
          profiles!image_promotions_user_id_fkey (
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .eq('celebrity_id', celebrityId)
        .order('created_at', { ascending: false });

      if (promotionsError) throw promotionsError;
      setImagePromotions(promotionsData || []);

      const { data: wfData } = await supabase
        .from('wish_friend_orders' as any)
        .select('id, order_type, recipient_name, occasion, price_paid, status, created_at, profiles!wish_friend_orders_user_id_fkey (first_name, last_name)')
        .eq('celebrity_id', celebrityId)
        .order('created_at', { ascending: false });
      const { data: uaData } = await supabase
        .from('ugc_ads' as any)
        .select('id, product_name, price_paid, status, created_at')
        .eq('celebrity_id', celebrityId)
        .order('created_at', { ascending: false });

      const merged = [
        ...((wfData as any[]) || []).map((o) => ({
          id: o.id as string,
          label: o.order_type === 'ugc_video' ? 'UGC video' : 'Video wish',
          title: `${o.recipient_name ?? 'Friend'}${o.occasion ? ` - ${o.occasion}` : ''}`,
          customer: `${o.profiles?.first_name ?? ''} ${o.profiles?.last_name ?? ''}`.trim() || 'Customer',
          price: Number(o.price_paid ?? 0),
          status: o.status as string,
          created_at: o.created_at as string,
        })),
        ...((uaData as any[]) || []).map((o) => ({
          id: o.id as string,
          label: 'UGC ad',
          title: (o.product_name as string) ?? 'UGC ad',
          customer: 'Customer',
          price: Number(o.price_paid ?? 0),
          status: o.status as string,
          created_at: o.created_at as string,
        })),
      ] as Array<{ id: string; label: string; title: string; customer: string; price: number; status: string; created_at: string; earned?: number }>;

      if (merged.length > 0) {
        // What the celebrity was actually paid on each order comes from the earnings ledger.
        const { data: ledger } = await supabase
          .from('celebrity_wallet_transactions')
          .select('booking_id, amount')
          .eq('celebrity_id', celebrityId)
          .eq('transaction_type', 'earning')
          .in('booking_id', merged.map((o) => o.id));
        const earned = new Map((ledger || []).map((l: any) => [l.booking_id as string, Number(l.amount)]));
        merged.forEach((o) => { if (earned.has(o.id)) o.earned = earned.get(o.id); });
      }
      merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setFriendOrders(merged);
      
      // Subscribe to booking updates for real-time updates
      const bookingSubscription = supabase
        .channel('celebrity_booking_updates')
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'bookings', filter: `celebrity_id=eq.${celebrityId}` },
          () => {
            fetchAllOrders();
          }
        )
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'image_promotions', filter: `celebrity_id=eq.${celebrityId}` },
          () => {
            fetchAllOrders();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'wish_friend_orders', filter: `celebrity_id=eq.${celebrityId}` },
          () => {
            fetchAllOrders();
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'ugc_ads', filter: `celebrity_id=eq.${celebrityId}` },
          () => {
            fetchAllOrders();
          }
        )
        .subscribe();
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType) {
      case 'image_promotion':
        return <Image className="w-4 h-4" />;
      case 'video_promotion':
        return <Video className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const parseBookingMessage = (message: string) => {
    try {
      const parsed = JSON.parse(message);
      const details = parsed.requestDetails || parsed.step1 || {};
      
      const parts = [];
      
      if (details.recipientName) {
        parts.push(`For: ${details.recipientName}`);
      }
      
      if (details.recipientRelation) {
        parts.push(`Relationship: ${details.recipientRelation}`);
      }
      
      if (details.occasion) {
        parts.push(`Occasion: ${details.occasion}`);
      }
      
      if (details.message) {
        parts.push(`\n\nMessage:\n${details.message}`);
      }
      
      if (parsed.creativeGuidelines) {
        const guidelines = parsed.creativeGuidelines;
        if (guidelines.toneAndStyle) {
          parts.push(`\n\nTone & Style: ${guidelines.toneAndStyle}`);
        }
        if (guidelines.otherInfo) {
          parts.push(`Additional Info: ${guidelines.otherInfo}`);
        }
      }
      
      return parts.length > 0 ? parts.join('\n') : message;
    } catch {
      return message;
    }
  };

  if (!celebrityId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Sign up as a celebrity to receive bookings.</p>
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

  const totalOrders = bookings.length + imagePromotions.length + friendOrders.length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>All Orders ({totalOrders})</CardTitle>
        </CardHeader>
        <CardContent>
          {totalOrders === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No orders yet
            </p>
          ) : (
            <div className="space-y-4">
              {/* Video Bookings */}
              {bookings.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground">Video Wishes & Cards</h3>
                  {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getServiceIcon(booking.service_type)}
                      <p className="font-medium">
                        #{booking.id.slice(0, 8)} - {booking.profiles?.first_name || 'Unknown'}{' '}
                        {booking.profiles?.last_name || ''}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground capitalize">
                      {booking.service_type.replace('_', ' ')}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span>Commission: {booking.commission_percentage}%</span>
                      <span>Your earnings: ₹{booking.celebrity_commission?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    <div>
                      <p className="font-medium">₹{booking.final_price.toLocaleString()}</p>
                      <Badge variant={getStatusColor(booking.status)}>
                        {booking.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedBooking(booking);
                        setDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  </div>
                  ))}
                </div>
              )}

              {/* Wish a Friend, UGC videos and UGC ads */}
              {friendOrders.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground mt-4">Wish a Friend &amp; UGC Orders</h3>
                  {friendOrders.map((o) => (
                    <div key={`${o.label}-${o.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">#{o.id.slice(0, 8)} - {o.customer}</p>
                        <p className="text-sm text-muted-foreground">{o.label} - {o.title}</p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          {o.earned != null ? (
                            <span className="text-green-600 font-medium">You earned ₹{o.earned.toLocaleString()}</span>
                          ) : o.status === 'completed' ? (
                            'Earning is being added'
                          ) : (
                            'You are paid when the order is completed'
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">₹{o.price.toLocaleString()}</p>
                        <Badge variant={o.status === 'completed' ? 'default' : o.status === 'rejected' || o.status === 'failed' ? 'destructive' : 'outline'}>
                          {o.status.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Image Promotions */}
              {imagePromotions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-sm text-muted-foreground mt-4">Promotional Images</h3>
                  {imagePromotions.map((promo) => (
                    <div
                      key={promo.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Image className="w-4 h-4" />
                          <p className="font-medium">
                            #{promo.id.slice(0, 8)} - {promo.profiles?.first_name || 'Unknown'}{' '}
                            {promo.profiles?.last_name || ''}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Image Promotion
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {promo.concept.substring(0, 60)}...
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-4">
                        <div>
                          <p className="font-medium">₹{promo.price_paid.toLocaleString()}</p>
                          <Badge variant={promo.status === 'completed' ? 'default' : promo.status === 'pending' ? 'outline' : 'secondary'}>
                            {promo.status}
                          </Badge>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPromotion(promo);
                            setPromoDialogOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription className="sr-only">View details of the selected booking</DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                  <p className="font-medium">#{selectedBooking.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={getStatusColor(selectedBooking.status)}>
                    {selectedBooking.status.replace('_', ' ')}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p>
                    {selectedBooking.profiles?.first_name} {selectedBooking.profiles?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedBooking.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Service Type</p>
                  <p className="capitalize">{selectedBooking.service_type.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Amount</p>
                  <p className="font-medium">₹{selectedBooking.final_price.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Your Commission</p>
                  <p className="font-medium text-green-600">
                    ₹{selectedBooking.celebrity_commission?.toLocaleString()} ({selectedBooking.commission_percentage}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Platform Fee</p>
                  <p>₹{selectedBooking.platform_fee?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                  <p>{new Date(selectedBooking.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedBooking.message && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Customer Message</p>
                  <p className="text-sm p-3 bg-muted rounded-lg whitespace-pre-wrap">{parseBookingMessage(selectedBooking.message)}</p>
                </div>
              )}

              {selectedBooking.instructions && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Special Instructions</p>
                  <p className="text-sm p-3 bg-muted rounded-lg">{selectedBooking.instructions}</p>
                </div>
              )}

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Video Status & Delivery</p>
                {/* Video Section */}
                {selectedBooking.video_file_key && selectedBooking.video_status === 'ready' ? (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-primary">
                        <Video className="w-5 h-5" />
                        <p className="font-medium">Video Generated Successfully</p>
                      </div>
                      <B2VideoPlayer 
                        fileKey={selectedBooking.video_file_key}
                        className="w-full rounded-lg"
                      />
                      <p className="text-xs text-muted-foreground">File: {selectedBooking.video_file_key}</p>
                    </div>
                  </div>
                ) : selectedBooking.status === 'confirmed' ? (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <div>
                        <p className="font-medium">Video is being created...</p>
                        <p className="text-sm text-muted-foreground">
                          This may take a few minutes. The video will appear here automatically.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : selectedBooking.status === 'completed' ? (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="flex items-center gap-3">
                      {selectedBooking.service_type === 'image_promotion' ? (
                        <>
                          <Image className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Image Delivered</p>
                            <p className="text-sm text-muted-foreground">
                              Promotional image sent to customer
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <FileText className="w-8 h-8 text-primary" />
                          <div>
                            <p className="font-medium">Order Completed</p>
                            <p className="text-sm text-muted-foreground">
                              Delivery sent to customer
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <p className="text-sm text-muted-foreground">
                      Order is {selectedBooking.status.replace('_', ' ')}. Video will be generated once order is confirmed by admin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Promotion Dialog */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Image Promotion Details</DialogTitle>
            <DialogDescription className="sr-only">View details of the selected image promotion</DialogDescription>
          </DialogHeader>
          {selectedPromotion && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order ID</p>
                  <p className="font-medium">#{selectedPromotion.id.slice(0, 8)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <Badge variant={selectedPromotion.status === 'completed' ? 'default' : 'secondary'}>
                    {selectedPromotion.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Customer</p>
                  <p>
                    {selectedPromotion.profiles?.first_name} {selectedPromotion.profiles?.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">{selectedPromotion.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Amount Paid</p>
                  <p className="font-medium">₹{selectedPromotion.price_paid.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Order Date</p>
                  <p>{new Date(selectedPromotion.created_at).toLocaleDateString()}</p>
                </div>
                {selectedPromotion.completed_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Completed Date</p>
                    <p>{new Date(selectedPromotion.completed_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Concept</p>
                <p className="text-sm p-3 bg-muted rounded-lg whitespace-pre-wrap">{selectedPromotion.concept}</p>
              </div>

              {selectedPromotion.branding_details && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Branding Details</p>
                  <p className="text-sm p-3 bg-muted rounded-lg">{selectedPromotion.branding_details}</p>
                </div>
              )}

              {selectedPromotion.generated_image_url && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Generated Image</p>
                  <img 
                    src={selectedPromotion.generated_image_url} 
                    alt="Promotional content" 
                    className="w-full rounded-lg border"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
