import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Users } from "lucide-react";

interface FollowersTabProps {
  celebrityId: string | undefined;
}

interface Follower {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  subscription_start_date: string;
  subscription_expires_at: string | null;
  profiles: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string | null;
  };
}

export function FollowersTab({ celebrityId }: FollowersTabProps) {
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!celebrityId) {
      setLoading(false);
      return;
    }

    fetchFollowers();

    // Set up real-time subscription
    const subscription = supabase
      .channel('celebrity-followers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'celebrity_favorites',
          filter: `celebrity_id=eq.${celebrityId}`
        },
        () => {
          fetchFollowers();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [celebrityId]);

  const fetchFollowers = async () => {
    if (!celebrityId) return;
    
    try {
      const { data, error } = await supabase
        .from('celebrity_favorites')
        .select(`
          *,
          profiles:user_id (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('celebrity_id', celebrityId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFollowers(data || []);
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!celebrityId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Sign up as a celebrity to see your followers.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Followers</p>
              <p className="text-3xl font-bold">{followers.length}</p>
            </div>
            <Users className="w-12 h-12 text-primary" />
          </div>
        </CardContent>
      </Card>

      {/* Followers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Your Followers</CardTitle>
        </CardHeader>
        <CardContent>
          {followers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No followers yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Follower</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Followed On</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followers.map((follower) => (
                  <TableRow key={follower.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={follower.profiles?.avatar_url || ''} />
                          <AvatarFallback>
                            {follower.profiles?.first_name?.charAt(0) || ''}
                            {follower.profiles?.last_name?.charAt(0) || ''}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {follower.profiles?.first_name} {follower.profiles?.last_name}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-muted-foreground">
                        {follower.profiles?.email}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={follower.status === 'active' ? 'default' : 'secondary'}>
                        {follower.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {new Date(follower.subscription_start_date).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {follower.subscription_expires_at 
                          ? new Date(follower.subscription_expires_at).toLocaleDateString()
                          : 'Lifetime'}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
