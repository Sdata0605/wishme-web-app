import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect, lazy, Suspense, ComponentType } from "react";
import { ErrorBoundary } from "@/components/ui/error-boundary";


// Retry dynamic imports on failure (handles stale cache after deployments)
function lazyRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(() =>
    factory()
      .then((module) => {
        // Successful load — clear reload flag so future failures can retry
        sessionStorage.removeItem('chunk_reload');
        return module;
      })
      .catch((error) => {
        const hasReloaded = sessionStorage.getItem('chunk_reload');
        if (!hasReloaded) {
          sessionStorage.setItem('chunk_reload', '1');
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
        sessionStorage.removeItem('chunk_reload');
        // Wrap in a user-friendly error so ErrorBoundary never shows raw technical messages
        throw new Error('Page failed to load. Please refresh and try again.');
      })
  );
}
import { CookieConsent } from "@/components/gdpr/CookieConsent";

// Eager load critical pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Lazy load all other pages for better performance
const Celebrities = lazyRetry(() => import("./pages/Celebrities"));
const Business = lazyRetry(() => import("./pages/Business"));
const AIMusic = lazyRetry(() => import("./pages/AIMusic"));
const MusicStudio = lazyRetry(() => import("./pages/MusicStudio"));
const MyMusic = lazyRetry(() => import("./pages/MyMusic"));
const HowItWorks = lazyRetry(() => import("./pages/HowItWorks"));
const CelebrityProfile = lazyRetry(() => import("./pages/CelebrityProfile"));
const Pricing = lazyRetry(() => import("./pages/Pricing"));
const Plan = lazyRetry(() => import("./pages/Plan"));
const BookingDetail = lazyRetry(() => import("./pages/BookingDetail"));
const Admin = lazyRetry(() => import("./pages/Admin"));
const CelebritySignup = lazyRetry(() => import("./pages/CelebritySignup"));
const Following = lazyRetry(() => import("./pages/Following"));
const Dashboard = lazyRetry(() => import("./pages/Dashboard"));
const Profile = lazyRetry(() => import("./pages/Profile"));
const Booking = lazyRetry(() => import("./pages/Booking"));
const Bookings = lazyRetry(() => import("./pages/Bookings"));
const Occasions = lazyRetry(() => import("./pages/Occasions"));
const OccasionBooking = lazyRetry(() => import("./pages/OccasionBooking"));
const Referrals = lazyRetry(() => import("./pages/Referrals"));
const Wallet = lazyRetry(() => import("./pages/superapp/WalletOverview"));
const WalletLegacy = lazyRetry(() => import("./pages/Wallet"));
const BillPayFlow = lazyRetry(() => import("./pages/superapp/BillPayFlow"));
const RechargePage = lazyRetry(() => import("./pages/superapp/RechargePage"));
const Commission = lazyRetry(() => import("./pages/Commission"));
const GreetingCards = lazyRetry(() => import("./pages/GreetingCards"));
const ImagePromotions = lazyRetry(() => import("./pages/ImagePromotions"));
const UGCVideos = lazyRetry(() => import("./pages/UGCVideos"));
const UGCAds = lazyRetry(() => import("./pages/UGCAds"));
const OccasionWishes = lazyRetry(() => import("./pages/OccasionWishes"));
const Messages = lazyRetry(() => import("./pages/Messages"));
const LovedOnes = lazyRetry(() => import("./pages/LovedOnes"));
const OccasionAlerts = lazyRetry(() => import("./pages/OccasionAlerts"));
const WishACelebrity = lazyRetry(() => import("./pages/WishACelebrity"));
const WishCelebrityOccasion = lazyRetry(() => import("./pages/WishCelebrityOccasion"));
const BookingSummary = lazyRetry(() => import("./pages/BookingSummary"));
const WishOrders = lazyRetry(() => import("./pages/WishOrders"));
const WishCongratulations = lazyRetry(() => import("./pages/WishCongratulations"));
const WishBooking = lazyRetry(() => import("./pages/WishBooking"));
const WishConfirmation = lazyRetry(() => import("./pages/WishConfirmation"));

// Lazy load admin components
const AdminLayout = lazyRetry(() => import("./components/admin/AdminLayout").then(m => ({ default: m.AdminLayout })));
const AdminOverview = lazyRetry(() => import("./pages/admin/AdminOverview"));
const AdminUsers = lazyRetry(() => import("./pages/admin/AdminUsers"));
const AdminCelebrities = lazyRetry(() => import("./pages/admin/AdminCelebrities"));
const AdminCelebrityCategories = lazyRetry(() => import("./pages/admin/AdminCelebrityCategories"));
const AdminPlans = lazyRetry(() => import("./pages/admin/AdminPlans"));
const AdminBookings = lazyRetry(() => import("./pages/admin/AdminBookings"));
const AdminAnalytics = lazyRetry(() => import("./pages/admin/AdminAnalytics"));
const AdminSettings = lazyRetry(() => import("./pages/admin/AdminSettings"));
const AdminCelebrityEdit = lazyRetry(() => import("./pages/admin/AdminCelebrityEdit"));
const AdminLocations = lazyRetry(() => import("./pages/admin/AdminLocations"));
const AdminOccasions = lazyRetry(() => import("./pages/admin/AdminOccasions"));
const AdminWalletManagement = lazyRetry(() => import("./pages/admin/AdminWalletManagement"));
const AdminTDSReports = lazyRetry(() => import("./pages/admin/AdminTDSReports"));
const AdminSubscriptions = lazyRetry(() => import("./pages/admin/AdminSubscriptions"));

const AdminWishOrders = lazyRetry(() => import("./pages/admin/AdminWishOrders"));
const AdminMediaLibrary = lazyRetry(() => import("./pages/admin/AdminMediaLibrary"));
const AdminBannerMediaLibrary = lazyRetry(() => import("./pages/admin/AdminBannerMediaLibrary"));
const AdminMessaging = lazyRetry(() => import("./pages/admin/AdminMessaging"));
const AdminCommunicationHub = lazyRetry(() => import("./pages/admin/AdminCommunicationHub"));
const AdminApiHealth = lazyRetry(() => import("./pages/admin/AdminApiHealth"));
const AdminAIAssistant = lazyRetry(() => import("./pages/admin/AdminAIAssistant"));
const AdminAuditLog = lazyRetry(() => import("./pages/admin/AdminAuditLog"));
const AdminDatabaseBackup = lazyRetry(() => import("./pages/admin/AdminDatabaseBackup"));

// Lazy load celebrity pages
const CelebrityDashboard = lazyRetry(() => import("./pages/CelebrityDashboard"));
const CelebrityNotifications = lazyRetry(() => import("./pages/CelebrityNotifications"));
const CelebritySettings = lazyRetry(() => import("./pages/CelebritySettings"));
const Settings = lazyRetry(() => import("./pages/Settings"));

// Lazy load legal pages
const PrivacyPolicy = lazyRetry(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazyRetry(() => import("./pages/TermsOfService"));
const CelebrityAgreement = lazyRetry(() => import("./pages/CelebrityAgreement"));
const CelebrityWishes = lazyRetry(() => import("./pages/CelebrityWishes"));
const BusinessCampaigns = lazyRetry(() => import("./pages/BusinessCampaigns"));
const AIMusicCreation = lazyRetry(() => import("./pages/AIMusicCreation"));
const ReferralProgram = lazyRetry(() => import("./pages/ReferralProgram"));
const RefundPolicy = lazyRetry(() => import("./pages/RefundPolicy"));
const Support = lazyRetry(() => import("./pages/Support"));
const PopulateCelebrities = lazyRetry(() => import("./pages/PopulateCelebrities"));
const PopulateIndianCelebrities = lazyRetry(() => import("./pages/PopulateIndianCelebrities"));
const GenerateVideoMessages = lazyRetry(() => import("./pages/GenerateVideoMessages"));
const VoiceCallWish = lazyRetry(() => import("./pages/VoiceCallWish"));
const CelebrityVoiceCall = lazyRetry(() => import("./pages/CelebrityVoiceCall"));
const PhotoWish = lazyRetry(() => import("./pages/PhotoWish"));
const ResetPassword = lazyRetry(() => import("./pages/ResetPassword"));
const OrderVideoView = lazyRetry(() => import("./pages/OrderVideoView"));
const PaymentReceipt = lazyRetry(() => import("./pages/PaymentReceipt"));

// Mobile app builder
const MobileAppBuilder = lazyRetry(() => import("./pages/MobileAppBuilder"));

// Super-app consumer surfaces (screenshot-driven)
const AppHome = lazyRetry(() => import("./pages/superapp/AppHome"));
const BalanceHome = lazyRetry(() => import("./pages/superapp/BalanceHome"));
const BillPayments = lazyRetry(() => import("./pages/superapp/BillPayments"));
const TravelHub = lazyRetry(() => import("./pages/superapp/TravelHub"));
const FlightSearch = lazyRetry(() => import("./pages/superapp/travel/FlightSearch"));
const FlightResults = lazyRetry(() => import("./pages/superapp/travel/FlightResults"));
const FlightFares = lazyRetry(() => import("./pages/superapp/travel/FlightFares"));
const FlightTravellers = lazyRetry(() => import("./pages/superapp/travel/FlightTravellers"));
const FlightSeats = lazyRetry(() => import("./pages/superapp/travel/FlightSeats"));
const FlightAddons = lazyRetry(() => import("./pages/superapp/travel/FlightAddons"));
const FlightReview = lazyRetry(() => import("./pages/superapp/travel/FlightReview"));
const FlightPayment = lazyRetry(() => import("./pages/superapp/travel/FlightPayment"));
const FlightTicket = lazyRetry(() => import("./pages/superapp/travel/FlightTicket"));
const MyTrips = lazyRetry(() => import("./pages/superapp/travel/MyTrips"));
const HotelSearch = lazyRetry(() => import("./pages/superapp/travel/HotelSearch"));
const HotelResults = lazyRetry(() => import("./pages/superapp/travel/HotelResults"));
const HotelDetail = lazyRetry(() => import("./pages/superapp/travel/HotelDetail"));
const HotelGuests = lazyRetry(() => import("./pages/superapp/travel/HotelGuests"));
const HotelReview = lazyRetry(() => import("./pages/superapp/travel/HotelReview"));
const HotelPay = lazyRetry(() => import("./pages/superapp/travel/HotelPay"));
const HotelVoucher = lazyRetry(() => import("./pages/superapp/travel/HotelVoucher"));
const BusSearch = lazyRetry(() => import("./pages/superapp/travel/BusSearch"));
const BusResults = lazyRetry(() => import("./pages/superapp/travel/BusResults"));
const BusSeats = lazyRetry(() => import("./pages/superapp/travel/BusSeats"));
const BusPoints = lazyRetry(() => import("./pages/superapp/travel/BusPoints"));
const BusPassenger = lazyRetry(() => import("./pages/superapp/travel/BusPassenger"));
const BusPay = lazyRetry(() => import("./pages/superapp/travel/BusPay"));
const BusTicket = lazyRetry(() => import("./pages/superapp/travel/BusTicket"));
const Passbook = lazyRetry(() => import("./pages/superapp/Passbook"));
const AllServices = lazyRetry(() => import("./pages/superapp/AllServices"));
const ScanPay = lazyRetry(() => import("./pages/superapp/ScanPay"));
const AIGreetings = lazyRetry(() => import("./pages/superapp/AIGreetings"));
const RewardsOffers = lazyRetry(() => import("./pages/superapp/RewardsOffers"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});

// Scroll to top component
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ScrollToTop />
          <Toaster />
          <Sonner />
          <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/app" element={<AppHome />} />
            <Route path="/app/balance" element={<BalanceHome />} />
            <Route path="/bills" element={<BillPayments />} />
            <Route path="/travel" element={<TravelHub />} />
            <Route path="/travel/flights" element={<FlightSearch />} />
            <Route path="/travel/flights/results" element={<FlightResults />} />
            <Route path="/travel/flights/fares" element={<FlightFares />} />
            <Route path="/travel/flights/travellers" element={<FlightTravellers />} />
            <Route path="/travel/flights/seats" element={<FlightSeats />} />
            <Route path="/travel/flights/addons" element={<FlightAddons />} />
            <Route path="/travel/flights/review" element={<FlightReview />} />
            <Route path="/travel/flights/pay" element={<FlightPayment />} />
            <Route path="/travel/flights/ticket" element={<FlightTicket />} />
            <Route path="/travel/trips" element={<MyTrips />} />
            <Route path="/travel/hotels" element={<HotelSearch />} />
            <Route path="/travel/hotels/results" element={<HotelResults />} />
            <Route path="/travel/hotels/guests" element={<HotelGuests />} />
            <Route path="/travel/hotels/review" element={<HotelReview />} />
            <Route path="/travel/hotels/pay" element={<HotelPay />} />
            <Route path="/travel/hotels/voucher" element={<HotelVoucher />} />
            <Route path="/travel/hotels/:id" element={<HotelDetail />} />
            <Route path="/travel/bus" element={<BusSearch />} />
            <Route path="/travel/bus/results" element={<BusResults />} />
            <Route path="/travel/bus/seats" element={<BusSeats />} />
            <Route path="/travel/bus/points" element={<BusPoints />} />
            <Route path="/travel/bus/passenger" element={<BusPassenger />} />
            <Route path="/travel/bus/pay" element={<BusPay />} />
            <Route path="/travel/bus/ticket" element={<BusTicket />} />
            <Route path="/passbook" element={<Passbook />} />
            <Route path="/all-services" element={<AllServices />} />
            <Route path="/scan" element={<ScanPay />} />
            <Route path="/ai-greetings" element={<AIGreetings />} />
            <Route path="/rewards" element={<RewardsOffers />} />
            <Route path="/celebrities" element={<Celebrities />} />
            <Route path="/celebrity/:id" element={<CelebrityProfile />} />
            <Route path="/booking/:celebrityId" element={<Booking />} />
            <Route path="/business" element={<Business />} />
            <Route path="/ai-music" element={<AIMusic />} />
            <Route path="/music-studio" element={<MusicStudio />} />
            <Route path="/my-music" element={<MyMusic />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/wallet/legacy" element={<WalletLegacy />} />
            <Route path="/bills/pay" element={<BillPayFlow />} />
            <Route path="/recharge" element={<RechargePage />} />
            <Route path="/commission" element={<Commission />} />
            <Route path="/greeting-cards" element={<GreetingCards />} />
            <Route path="/image-promotions" element={<ImagePromotions />} />
            <Route path="/ugc-videos" element={<UGCVideos />} />
            <Route path="/ugc-ads" element={<UGCAds />} />
            <Route path="/occasion-wishes" element={<OccasionWishes />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/loved-ones" element={<LovedOnes />} />
          <Route path="/occasion-alerts" element={<OccasionAlerts />} />
           <Route path="/wish-celebrity" element={<WishACelebrity />} />
           <Route path="/wish-a-celebrity" element={<Navigate to="/wish-celebrity" replace />} />
          <Route path="/wish-booking/:celebrityId" element={<WishBooking />} />
          <Route path="/wish-confirmation/:orderId" element={<WishConfirmation />} />
          <Route path="/occasions/wish-celebrity/:celebrityId" element={<WishCelebrityOccasion />} />
          <Route path="/booking-summary" element={<BookingSummary />} />
          <Route path="/wish-orders" element={<WishOrders />} />
          <Route path="/wish-congratulations" element={<WishCongratulations />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/plan" element={<Plan />} />
            <Route path="/celebrity/:id/book" element={<BookingDetail />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/occasions" element={<Occasions />} />
            <Route path="/occasions/:occasionId/book" element={<OccasionBooking />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="celebrities" element={<AdminCelebrities />} />
              <Route path="celebrity-categories" element={<AdminCelebrityCategories />} />
              <Route path="celebrities/:id/edit" element={<AdminCelebrityEdit />} />
              <Route path="plans" element={<AdminPlans />} />
              <Route path="bookings" element={<AdminBookings />} />
              <Route path="occasions" element={<AdminOccasions />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="tds-reports" element={<AdminTDSReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="locations" element={<Navigate to="/admin" replace />} />
              <Route path="wallet" element={<AdminWalletManagement />} />
              <Route path="subscriptions" element={<AdminSubscriptions />} />
              
              <Route path="wish-orders" element={<AdminWishOrders />} />
              <Route path="media-library" element={<AdminMediaLibrary />} />
              <Route path="banner-media-library" element={<AdminBannerMediaLibrary />} />
              <Route path="messaging" element={<Navigate to="/admin/communication-hub" replace />} />
              <Route path="communication-hub" element={<AdminCommunicationHub />} />
              <Route path="ai-assistant" element={<AdminAIAssistant />} />
              <Route path="api-health" element={<AdminApiHealth />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="database-backup" element={<AdminDatabaseBackup />} />
              <Route path="populate-celebrities" element={<PopulateCelebrities />} />
              <Route path="populate-indian-celebrities" element={<PopulateIndianCelebrities />} />
              <Route path="generate-video-messages" element={<GenerateVideoMessages />} />
            </Route>
            <Route path="/celebrity-signup" element={<CelebritySignup />} />
            <Route path="/celebrity-dashboard" element={<CelebrityDashboard />} />
            <Route path="/celebrity-notifications" element={<CelebrityNotifications />} />
            <Route path="/celebrity-settings" element={<CelebritySettings />} />
            <Route path="/following" element={<Following />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/celebrity-agreement" element={<CelebrityAgreement />} />
            <Route path="/celebrity-wishes" element={<CelebrityWishes />} />
            <Route path="/business-campaigns" element={<BusinessCampaigns />} />
            <Route path="/ai-music-creation" element={<AIMusicCreation />} />
            <Route path="/referral-program" element={<ReferralProgram />} />
            <Route path="/refund-policy" element={<RefundPolicy />} />
            <Route path="/support" element={<Support />} />
            <Route path="/mobile-app-builder" element={<MobileAppBuilder />} />
            <Route path="/voice-call-wish" element={<VoiceCallWish />} />
            <Route path="/celebrity-voice-call" element={<CelebrityVoiceCall />} />
            <Route path="/photo-wish" element={<PhotoWish />} />
            <Route path="/order/:bookingId/view" element={<OrderVideoView />} />
            <Route path="/payment/:wishmePaymentId" element={<PaymentReceipt />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          </ErrorBoundary>
          <CookieConsent />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
