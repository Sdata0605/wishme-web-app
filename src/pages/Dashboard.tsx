import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWalletBalance } from "@/hooks/useWalletBalance";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { deduplicateCelebrities } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import { DashboardSwitcher } from "@/components/dashboard/DashboardSwitcher";
import {
  Star, Heart, Video, MessageSquare, Image, Music, Crown, Plus,
  Search, SlidersHorizontal, Grid3X3, List, Check
} from "lucide-react";

interface Celebrity {
  id: string;
  name: string;
  category: string;
  image_url: string | null;
  rating: number | null;
  bio: string | null;
  is_verified: boolean | null;
  service_prices: any;
  consent_status?: string | null;
}

export default function Dashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { balance: walletBalance } = useWalletBalance();

  const [celebrities, setCelebrities] = useState<Celebrity[]>([]);
  const [loadingCelebs, setLoadingCelebs] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterFeatured, setFilterFeatured] = useState(false);
  const [filterTopRated, setFilterTopRated] = useState(true);
  const [subscribedIds, setSubscribedIds] = useState<string[]>([]);

  // Profile completion
  const profileCompletion = useMemo(() => {
    if (!profile) return 0;
    let score = 0;
    const total = 9;
    if (profile.first_name) score++;
    if (profile.last_name) score++;
    if (profile.email) score++;
    if (profile.phone) score++;
    if (profile.avatar_url) score++;
    if (profile.plan && profile.plan !== "basic") score++;
    if (profile.referral_code) score++;
    if (profile.role) score++;
    if (profile.is_active) score++;
    return Math.round((score / total) * 100);
  }, [profile]);

  useEffect(() => {
    fetchCelebrities();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      supabase
        .from('celebrity_favorites')
        .select('celebrity_id')
        .eq('user_id', profile.id)
        .eq('status', 'active')
        .then(({ data }) => setSubscribedIds(data?.map(f => f.celebrity_id) || []));
    }
  }, [profile?.id]);

  const fetchCelebrities = async () => {
    try {
      setLoadingCelebs(true);
      const { data, error } = await supabase
        .from("celebrities")
        .select("id, name, category, image_url, rating, bio, is_verified, service_prices, consent_status")
        .eq("is_active", true)
        .or('consent_status.neq.rejected,consent_status.is.null')
        .order("rating", { ascending: false });
      if (error) throw error;
      setCelebrities(deduplicateCelebrities(data || []));
    } catch {
      /* silent */
    } finally {
      setLoadingCelebs(false);
    }
  };

  const filteredCelebrities = useMemo(() => {
    let result = celebrities;
    if (searchQuery) {
      result = result.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (selectedCategory !== "All Categories") {
      result = result.filter(c => c.category === selectedCategory);
    }
    if (filterTopRated) {
      result = result.filter(c => (c.rating || 0) >= 4.5);
    }
    // Sort subscribed celebrities to top
    result = [...result].sort((a, b) => {
      const aSubscribed = subscribedIds.includes(a.id) ? 0 : 1;
      const bSubscribed = subscribedIds.includes(b.id) ? 0 : 1;
      return aSubscribed - bSubscribed;
    });
    return result;
  }, [celebrities, searchQuery, selectedCategory, filterTopRated, filterFeatured, subscribedIds]);

  const categories = useMemo(() => {
    const cats = [...new Set(celebrities.map(c => c.category).filter(Boolean))];
    return ["All Categories", ...cats];
  }, [celebrities]);

  const quickActions = [
    { icon: Star, label: "Wish Celebrity", color: "#F59E0B", bg: "rgba(245,158,11,0.12)", route: "/celebrities" },
    { icon: Heart, label: "Loved Ones", color: "#10B981", bg: "rgba(16,185,129,0.12)", route: "/loved-ones" },
    { icon: Video, label: "Celebrity Call", color: "#F97316", bg: "rgba(249,115,22,0.12)", route: "/celebrities" },
    { icon: MessageSquare, label: "Messages", color: "#3B82F6", bg: "rgba(59,130,246,0.12)", route: "/messages" },
    { icon: Image, label: "Greeting Cards", color: "#EC4899", bg: "rgba(236,72,153,0.12)", route: "/greeting-cards" },
    { icon: Image, label: "Image Promo", color: "#8B5CF6", bg: "rgba(139,92,246,0.12)", route: "/image-promotions" },
    { icon: Music, label: "AI Music", color: "#F43F5E", bg: "rgba(244,63,94,0.12)", route: "/ai-music" },
    { icon: Crown, label: "Upgrade Plan", color: "#6366F1", bg: "rgba(99,102,241,0.15)", route: "/plan", isPlan: true },
  ];

  const firstName = profile?.first_name || "User";

  return (
    <AuthenticatedLayout>
      <div className="min-h-screen" style={{ background: "#0A0D14" }}>
        <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">

          {/* Profile Completion Bar */}
          <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-white">Complete Your Profile</p>
                <span className="text-xs text-white/50">{profileCompletion}%</span>
              </div>
              <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${profileCompletion}%`,
                    background: "linear-gradient(90deg, #FF6B33, #EC4899, #B44CFF)",
                  }}
                />
              </div>
            </div>
            <Link to="/profile">
              <Button size="sm" variant="outline" className="rounded-full text-xs border-white/20 text-white hover:bg-white/10 whitespace-nowrap">
                Update Profile
              </Button>
            </Link>
          </div>

          {/* Welcome + Wallet */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">
                Welcome back,<br />{firstName}!
              </h1>
              <p className="text-sm text-white/40 mt-1">Your curated stardust experience is ready.</p>
            </div>
            <div className="rounded-2xl p-5 min-w-[220px]" style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}>
              <p className="text-[10px] uppercase tracking-[2px] text-white/40">Wallet Balance</p>
              <p className="text-3xl font-bold text-white mt-1">₹{walletBalance.toLocaleString("en-IN")}</p>
              <Link to="/wallet" className="block mt-3">
                <button className="w-full py-2.5 rounded-full text-sm font-semibold text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #10B981, #059669)" }}>
                  <Plus className="w-4 h-4" /> Add Money
                </button>
              </Link>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => navigate(action.route)}
                className="rounded-2xl p-3 md:p-4 flex flex-col items-center justify-center text-center transition-all hover:scale-[1.04] hover:brightness-125 relative group"
                style={{
                  background: action.isPlan ? "rgba(99,102,241,0.15)" : "#111827",
                  border: `1px solid ${action.isPlan ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center mb-2" style={{ background: action.bg }}>
                  <action.icon className="w-4.5 h-4.5 md:w-5 md:h-5" style={{ color: action.color }} />
                </div>
                {action.isPlan && profile?.plan && (
                  <p className="text-[8px] md:text-[9px] uppercase tracking-[1px] font-semibold mb-0.5" style={{ color: "#F59E0B" }}>
                    {profile.plan}
                  </p>
                )}
                <p className="text-[11px] md:text-sm font-medium text-white leading-tight line-clamp-2">
                  {action.label}
                </p>
              </button>
            ))}
          </div>

          {/* Browse Section */}
          <div className="space-y-4">
            {/* Search Bar */}
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-white/40" />
              <span className="text-sm font-semibold text-white">Browse</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                className="w-full md:w-72 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                placeholder="Search celebrities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Header Row */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl md:text-2xl font-bold text-white">Top Rated Stars</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setViewMode("grid")}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: viewMode === "grid" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${viewMode === "grid" ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <Grid3X3 className="w-4 h-4" style={{ color: viewMode === "grid" ? "#818CF8" : "rgba(255,255,255,0.4)" }} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                  style={{
                    background: viewMode === "list" ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${viewMode === "list" ? "rgba(99,102,241,0.4)" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  <List className="w-4 h-4" style={{ color: viewMode === "list" ? "#818CF8" : "rgba(255,255,255,0.4)" }} />
                </button>
              </div>
            </div>

            {/* Filters + Grid */}
            <div className="flex flex-col md:flex-row gap-5">
              {/* Sidebar Filters - horizontal on mobile, vertical sidebar on desktop */}
              <div className="w-full md:w-52 shrink-0 space-y-3 md:space-y-4">
                <div className="flex items-center gap-2 text-white/50">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="text-sm font-medium">Filters</span>
                </div>
                <div className="flex md:flex-col gap-3 md:gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                    <div
                      onClick={() => setFilterFeatured(!filterFeatured)}
                      className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
                      style={{ borderColor: filterFeatured ? "#EC4899" : "rgba(255,255,255,0.2)", background: filterFeatured ? "#EC4899" : "transparent" }}
                    >
                      {filterFeatured && <Check className="w-3 h-3 text-white" />}
                    </div>
                    Featured
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-white/70">
                    <div
                      onClick={() => setFilterTopRated(!filterTopRated)}
                      className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0"
                      style={{ borderColor: filterTopRated ? "#10B981" : "rgba(255,255,255,0.2)", background: filterTopRated ? "#10B981" : "transparent" }}
                    >
                      {filterTopRated && <Check className="w-3 h-3 text-white" />}
                    </div>
                    Top Rated
                  </label>
                </div>

                <div>
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Category</p>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full rounded-lg py-2 px-3 text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat} className="bg-gray-900">{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Celebrity Grid / List */}
              <div className="flex-1">
                {loadingCelebs ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="rounded-2xl animate-pulse" style={{ background: "#111827", height: 300 }} />
                    ))}
                  </div>
                ) : filteredCelebrities.length === 0 ? (
                  <div className="text-center py-16 text-white/40 text-sm">No celebrities found</div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredCelebrities.map((celeb) => (
                      <Link to={`/celebrity/${celeb.id}`} key={celeb.id}>
                        <div
                          className="rounded-2xl overflow-hidden transition-all hover:scale-[1.02] hover:shadow-lg cursor-pointer h-full"
                          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          <div className="relative aspect-[3/4] overflow-hidden">
                            {celeb.image_url ? (
                              <img src={celeb.image_url} alt={celeb.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <Star className="w-10 h-10 text-white/20" />
                              </div>
                            )}
                            {celeb.is_verified && (
                              <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: "rgba(16,185,129,0.9)", color: "white" }}>
                                <Check className="w-3 h-3" /> Verified
                              </div>
                            )}
                            {celeb.consent_status === 'pending' && (
                              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                style={{ background: "rgba(245,158,11,0.9)", color: "white" }}>
                                Coming Soon
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-white truncate pr-2">{celeb.name}</h3>
                              {celeb.rating && (
                                <div className="flex items-center gap-1 shrink-0">
                                  <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                  <span className="text-xs font-semibold text-white">{celeb.rating}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold mt-0.5" style={{ color: "#EC4899" }}>
                              {celeb.category}
                            </p>
                            {celeb.bio && (
                              <p className="text-xs text-white/40 mt-1.5 line-clamp-2">{celeb.bio}</p>
                            )}
                            <button
                              className="w-full mt-3 py-2 rounded-lg text-xs font-semibold text-white transition-colors"
                              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
                            >
                              Book Shoutout
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  /* List View */
                  <div className="space-y-3">
                    {filteredCelebrities.map((celeb) => (
                      <Link to={`/celebrity/${celeb.id}`} key={celeb.id}>
                        <div
                          className="flex items-center gap-4 rounded-2xl p-3 transition-all hover:brightness-110 cursor-pointer"
                          style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.06)" }}
                        >
                          {/* Avatar */}
                          <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 relative">
                            {celeb.image_url ? (
                              <img src={celeb.image_url} alt={celeb.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
                                <Star className="w-6 h-6 text-white/20" />
                              </div>
                            )}
                            {celeb.consent_status === 'pending' && (
                              <div className="absolute inset-0 flex items-end justify-center pb-1" style={{ background: "linear-gradient(transparent 40%, rgba(0,0,0,0.7))" }}>
                                <span className="text-[8px] font-bold uppercase text-amber-400 tracking-wide">Soon</span>
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-bold text-white truncate">{celeb.name}</h3>
                              {celeb.is_verified && (
                                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0"
                                  style={{ background: "rgba(16,185,129,0.15)", color: "#10B981" }}>
                                  <Check className="w-2.5 h-2.5" /> Verified
                                </div>
                              )}
                            </div>
                            <p className="text-[10px] uppercase tracking-wider font-semibold mt-0.5" style={{ color: "#EC4899" }}>
                              {celeb.category}
                            </p>
                            {celeb.bio && (
                              <p className="text-xs text-white/40 mt-1 line-clamp-1">{celeb.bio}</p>
                            )}
                          </div>
                          {/* Rating + CTA */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {celeb.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                <span className="text-xs font-semibold text-white">{celeb.rating}</span>
                              </div>
                            )}
                            <button
                              className="px-4 py-1.5 rounded-full text-[11px] font-semibold text-white transition-colors whitespace-nowrap"
                              style={{ background: "linear-gradient(135deg, #FF6B33, #EC4899)", }}
                            >
                              Book
                            </button>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DashboardSwitcher />
      </div>
    </AuthenticatedLayout>
  );
}
