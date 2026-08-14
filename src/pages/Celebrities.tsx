import { useState, useEffect } from "react";
import { useDebounce } from "@/hooks/useDebounce";
import { useAuth } from "@/hooks/useAuth";
import { 
  Search, 
  Star, 
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { deduplicateCelebrities } from "@/lib/utils";
import Header from "@/components/Header";
import { Footer } from "@/components/ui/footer";
import { MobileBottomNav } from "@/components/ui/mobile-bottom-nav";
import { useIsMobile } from "@/hooks/use-mobile";

const categories = ["All", "Actors", "Singers", "Comedians", "Athletes", "Creators"];
const deliveryTimes = ["All", "Under 24h", "24-48h", "48-72h", "1 week+"];

export default function Celebrities() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedDelivery, setSelectedDelivery] = useState("All");
  const [celebrities, setCelebrities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [subscriptionPrices, setSubscriptionPrices] = useState<Record<string, number>>({});
  const [showPriceDropdown, setShowPriceDropdown] = useState(false);
  const [showDeliveryDropdown, setShowDeliveryDropdown] = useState(false);
  const [priceSort, setPriceSort] = useState<'none' | 'low' | 'high'>('none');
  const ITEMS_PER_PAGE = 8;

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchCelebrities();
  }, [selectedCategory, selectedDelivery, debouncedSearchTerm, currentPage]);

  useEffect(() => {
    if (profile?.id) {
      fetchSubscriptions();
    }
  }, [profile?.id]);

  const fetchSubscriptions = async () => {
    if (!profile?.id) return;
    try {
      const { data } = await supabase
        .from('celebrity_favorites')
        .select('celebrity_id')
        .eq('user_id', profile.id)
        .eq('status', 'active');
      setSubscriptions(data?.map(f => f.celebrity_id) || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
    }
  };

  const isSubscribed = (celebrityId: string) => subscriptions.includes(celebrityId);

  const fetchCelebrities = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('celebrities')
        .select('*', { count: 'exact' })
        .eq('is_active', true)
        .or('consent_status.neq.rejected,consent_status.is.null');

      if (selectedCategory !== "All") {
        query = query.eq('category', selectedCategory);
      }
      if (debouncedSearchTerm) {
        query = query.ilike('name', `%${debouncedSearchTerm}%`);
      }

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data, error, count } = await query
        .order('rating', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setCelebrities(deduplicateCelebrities(data || []));
      setTotalCount(count || 0);

      // Fetch subscription prices for these celebrities
      if (data && data.length > 0) {
        const ids = data.map((c: any) => c.id);
        const { data: pricingData } = await supabase
          .from('celebrity_favorite_pricing')
          .select('celebrity_id, price, is_enabled')
          .in('celebrity_id', ids)
          .eq('is_enabled', true);
        
        const priceMap: Record<string, number> = {};
        pricingData?.forEach((p: any) => {
          priceMap[p.celebrity_id] = p.price;
        });
        setSubscriptionPrices(priceMap);
      }
    } catch (error) {
      console.error('Error fetching celebrities:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getStartingPrice = (celebrity: any) => {
    const prices = celebrity.service_prices;
    if (prices && typeof prices === 'object') {
      const vals = Object.values(prices).filter((v): v is number => typeof v === 'number' && v > 0);
      if (vals.length > 0) return Math.min(...vals);
    }
    return null;
  };

  const needsSubscription = (celebrity: any) => {
    return user && !isSubscribed(celebrity.id);
  };

  // Pagination numbers
  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1, 2, 3);
      if (currentPage > 4) pages.push('...');
      if (currentPage > 3 && currentPage < totalPages - 2) pages.push(currentPage);
      if (currentPage < totalPages - 3) pages.push('...');
      pages.push(totalPages);
    }
    // dedupe
    const unique: (number | '...')[] = [];
    for (const p of pages) {
      if (unique[unique.length - 1] !== p) unique.push(p);
    }
    return unique;
  };

  const isMobile = useIsMobile();

  if (loading && celebrities.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className={isMobile ? "pt-[60px]" : ""}>
      {/* ========== CONTENT ========== */}
      <div className="max-w-7xl mx-auto px-5 md:px-10">

        {/* Header */}
        <div className="pt-12 md:pt-16 pb-4">
          <h1 className="text-[40px] md:text-[72px] font-bold leading-[1.1] tracking-tight text-white">
            Find Your Favorite{' '}
            <span
              className="italic bg-gradient-to-r from-[#FF6B33] to-[#EC4899] bg-clip-text text-transparent"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Celebrity
            </span>
          </h1>
          <p className="mt-4 text-[15px] text-white/55 max-w-[480px] leading-relaxed">
            Book personalized video messages from world-class stars, influencers, and icons. Make your moments unforgettable with a touch of stardom.
          </p>
        </div>

        {/* Search Bar */}
        <div className="mt-8 mb-4">
          <div
            className="flex items-center h-14 rounded-[14px] px-5 border border-white/10"
            style={{ backgroundColor: '#141B2D' }}
          >
            <Search className="h-5 w-5 text-white/40 mr-3 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search for actors, musicians, athletes..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="flex-1 bg-transparent border-none outline-none text-white text-[15px] placeholder:text-white/35"
            />
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-7">
          {/* Category pills */}
          <div 
            className="flex items-center gap-2 pb-1 -mx-3 px-3 md:mx-0 md:px-0 no-scrollbar"
            style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}
          >
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
                className={`shrink-0 whitespace-nowrap px-4 md:px-5 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#FF3D9A] text-white border border-transparent'
                    : 'bg-transparent border border-white/[0.18] text-white/75 hover:border-white hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          {/* Sort dropdowns */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="relative">
              <button
                onClick={() => { setShowPriceDropdown(!showPriceDropdown); setShowDeliveryDropdown(false); }}
                className="flex items-center gap-1.5 px-[18px] py-2 rounded-full text-sm border border-white/[0.18] text-white/75 hover:border-white hover:text-white transition-all"
              >
                Price <ChevronDown className="h-3 w-3" />
              </button>
              {showPriceDropdown && (
                <div className="absolute right-0 top-full mt-2 rounded-xl border border-white/10 py-1 z-50 w-40" style={{ backgroundColor: '#1A2236' }}>
                  {[['none', 'Default'], ['low', 'Low to High'], ['high', 'High to Low']].map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => { setPriceSort(val as any); setShowPriceDropdown(false); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${priceSort === val ? 'text-[#FF3D9A]' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative">
              <button
                onClick={() => { setShowDeliveryDropdown(!showDeliveryDropdown); setShowPriceDropdown(false); }}
                className="flex items-center gap-1.5 px-[18px] py-2 rounded-full text-sm border border-white/[0.18] text-white/75 hover:border-white hover:text-white transition-all"
              >
                Delivery <ChevronDown className="h-3 w-3" />
              </button>
              {showDeliveryDropdown && (
                <div className="absolute right-0 top-full mt-2 rounded-xl border border-white/10 py-1 z-50 w-40" style={{ backgroundColor: '#1A2236' }}>
                  {deliveryTimes.map(dt => (
                    <button
                      key={dt}
                      onClick={() => { setSelectedDelivery(dt); setShowDeliveryDropdown(false); setCurrentPage(1); }}
                      className={`w-full text-left px-4 py-2 text-sm transition-colors ${selectedDelivery === dt ? 'text-[#FF3D9A]' : 'text-white/70 hover:text-white hover:bg-white/5'}`}
                    >
                      {dt}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Celebrity Grid */}
        {celebrities.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/50 text-lg">No celebrities found matching your criteria.</p>
            <button
              onClick={() => { setSelectedCategory("All"); setSelectedDelivery("All"); setSearchTerm(""); setCurrentPage(1); }}
              className="mt-4 text-sm text-[#FF3D9A] hover:text-[#FF6B33] transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
            {[...celebrities].sort((a, b) => {
              const aSubscribed = subscriptions.includes(a.id) ? 0 : 1;
              const bSubscribed = subscriptions.includes(b.id) ? 0 : 1;
              if (aSubscribed !== bSubscribed) return aSubscribed - bSubscribed;
              if (priceSort === 'low') {
                const aPrice = subscriptionPrices[a.id] ?? Infinity;
                const bPrice = subscriptionPrices[b.id] ?? Infinity;
                return aPrice - bPrice;
              }
              if (priceSort === 'high') {
                const aPrice = subscriptionPrices[a.id] ?? 0;
                const bPrice = subscriptionPrices[b.id] ?? 0;
                return bPrice - aPrice;
              }
              return 0;
            }).map((celebrity) => {
              const subPrice = subscriptionPrices[celebrity.id];
              const locked = needsSubscription(celebrity);

              return (
                <Link
                  key={celebrity.id}
                  to={`/celebrity/${celebrity.id}`}
                  className="group rounded-2xl overflow-hidden border border-white/[0.04] transition-all duration-250 hover:-translate-y-1 hover:shadow-[0_20px_40px_rgba(0,0,0,0.4)] hover:border-white/10"
                  style={{ backgroundColor: '#111827' }}
                >
                  {/* Image */}
                  <div className="relative h-[200px] md:h-[260px] overflow-hidden">
                    {celebrity.image_url ? (
                      <img
                        src={celebrity.image_url}
                        alt={`${celebrity.name} - ${celebrity.category}`}
                        className={`w-full h-full object-cover object-top ${locked ? 'blur-[3px]' : ''}`}
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/5">
                        <Star className="w-10 h-10 text-white/20" />
                      </div>
                    )}

                    {/* Coming Soon badge for pending consent */}
                    {celebrity.consent_status === 'pending' && (
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full text-[11px] font-bold text-white bg-amber-500/90 backdrop-blur-md shadow-lg uppercase tracking-wide">
                        Coming Soon
                      </span>
                    )}

                    {/* Subscription Price badge */}
                    {subPrice && (
                      <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-[13px] font-semibold text-white border border-white/15 backdrop-blur-md" style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}>
                        ₹{subPrice.toLocaleString('en-IN')}/mo
                      </span>
                    )}

                    {/* Lock overlay */}
                    {locked && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center backdrop-blur-sm bg-white/15">
                          <Lock className="h-7 w-7 text-white" />
                        </div>
                        <p className="text-[13px] font-semibold text-white mt-2">Subscription Required</p>
                        <span className="mt-2.5 px-5 py-2 rounded-full bg-white text-[#0A0D14] text-[13px] font-semibold hover:bg-white/90 transition-colors">
                          Subscribe Now
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-4 pt-4 pb-[18px]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base md:text-lg font-semibold text-white truncate pr-2">{celebrity.name}</h3>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Star className="w-3.5 h-3.5 fill-[#F5A623] text-[#F5A623]" />
                        <span className="text-[13px] text-white font-medium">{celebrity.rating || 0}</span>
                      </div>
                    </div>
                    <p className="text-[13px] text-white/50 mt-1.5 truncate">
                      {celebrity.category}
                      {celebrity.bio && ` · ${celebrity.bio.split(' ').slice(0, 3).join(' ')}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-12 mb-20 md:mb-0">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:border-white/40 disabled:opacity-30 transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {getPageNumbers().map((p, i) =>
              p === '...' ? (
                <span key={`dots-${i}`} className="w-9 h-9 flex items-center justify-center text-white/40 text-sm">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                    currentPage === p
                      ? 'bg-[#FF3D9A] text-white'
                      : 'border border-white/15 text-white/60 hover:border-white/40'
                  }`}
                >
                  {p}
                </button>
              )
            )}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="w-9 h-9 rounded-full border border-white/15 flex items-center justify-center text-white/60 hover:border-white/40 disabled:opacity-30 transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      </div>

      <Footer />
      <MobileBottomNav isSignedIn={!!user} />
    </div>
  );
}
