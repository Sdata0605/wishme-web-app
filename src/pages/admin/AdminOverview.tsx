import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Users, Star, CreditCard, BookOpen, TrendingUp, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
interface Stats {
  totalUsers: number;
  totalCelebrities: number;
  totalBookings: number;
  totalRevenue: number;
  activeUsers: number;
  recentSignups: number;
}

export default function AdminOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCelebrities: 0,
    totalBookings: 0,
    totalRevenue: 0,
    activeUsers: 0,
    recentSignups: 0,
  });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch users count
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch celebrities count
      const { count: celebritiesCount } = await supabase
        .from('celebrities')
        .select('*', { count: 'exact', head: true });

      // Fetch bookings count
      const { count: bookingsCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true });

      // Fetch active users (users with plans other than basic)
      const { count: activeUsersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .neq('plan', 'basic');

      // Fetch recent signups (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: recentSignupsCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgo.toISOString());

      // Calculate total revenue (sum of all bookings final_price)
      const { data: bookings } = await supabase
        .from('bookings')
        .select('final_price');

      const totalRevenue = bookings?.reduce((sum, booking) => sum + (booking.final_price || 0), 0) || 0;

      setStats({
        totalUsers: usersCount || 0,
        totalCelebrities: celebritiesCount || 0,
        totalBookings: bookingsCount || 0,
        totalRevenue,
        activeUsers: activeUsersCount || 0,
        recentSignups: recentSignupsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      description: "Registered users",
      icon: Users,
      color: "text-blue-600",
    },
    {
      title: "Active Users",
      value: stats.activeUsers,
      description: "Premium subscribers",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      title: "Celebrities",
      value: stats.totalCelebrities,
      description: "Active celebrities",
      icon: Star,
      color: "text-yellow-600",
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings,
      description: "All time bookings",
      icon: BookOpen,
      color: "text-purple-600",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString()}`,
      description: "All time revenue",
      icon: DollarSign,
      color: "text-emerald-600",
    },
    {
      title: "Recent Signups",
      value: stats.recentSignups,
      description: "Last 7 days",
      icon: Users,
      color: "text-orange-600",
    },
  ];

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl md:text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-muted-foreground">Welcome to the admin dashboard</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Dashboard Overview</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Welcome to the admin dashboard. Here's what's happening.
          </p>
        </div>
        <Badge variant="secondary" className="bg-primary/10 text-primary w-fit">
          Live Data
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common administrative tasks
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card 
            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate('/admin/users')}
          >
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-medium">Manage Users</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              View and edit user accounts
            </p>
          </Card>
          
          <Card 
            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate('/admin/celebrities')}
          >
            <div className="flex items-center space-x-2">
              <Star className="w-5 h-5 text-yellow-600" />
              <span className="font-medium">Manage Celebrities</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Add or edit celebrity profiles
            </p>
          </Card>
          
          <Card 
            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate('/admin/plans')}
          >
            <div className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5 text-green-600" />
              <span className="font-medium">Manage Plans</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Update subscription plans
            </p>
          </Card>
          
          <Card 
            className="p-4 hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => navigate('/admin/bookings')}
          >
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span className="font-medium">View Bookings</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Monitor booking activity
            </p>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}