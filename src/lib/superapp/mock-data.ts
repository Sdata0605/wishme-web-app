import type { LucideIcon } from "lucide-react";
import {
  Bus,
  Car,
  CreditCard,
  Droplets,
  Flame,
  Gift,
  Hotel,
  IndianRupee,
  Landmark,
  Plane,
  ShieldCheck,
  Smartphone,
  Train,
  Tv,
  Wallet,
  Wifi,
  Zap,
  Phone,
  LayoutGrid,
} from "lucide-react";

export type ServiceItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: string;
  bg: string;
  href: string;
};

export const quickActions: ServiceItem[] = [
  { id: "bills", label: "Bill Pay", icon: Zap, accent: "text-[#ff5c00]", bg: "bg-[#fff1e8]", href: "/bills" },
  { id: "recharge", label: "Recharge", icon: Smartphone, accent: "text-[#ff5c00]", bg: "bg-[#fff1e8]", href: "/bills" },
  { id: "flights", label: "Flights", icon: Plane, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel/flights" },
  { id: "bus", label: "Bus", icon: Bus, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel/bus" },
  { id: "wallet", label: "Wallet", icon: Wallet, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/wallet" },
  { id: "rewards", label: "Rewards", icon: Gift, accent: "text-[#ff5c00]", bg: "bg-[#fff1e8]", href: "/wallet" },
  { id: "offers", label: "Offers", icon: IndianRupee, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/all-services" },
];

export const homeServiceGrid: ServiceItem[] = [
  { id: "flights", label: "Flights", icon: Plane, accent: "text-[#7c3aed]", bg: "bg-[#f5f3ff]", href: "/travel/flights" },
  { id: "hotels", label: "Hotels", icon: Hotel, accent: "text-[#7c3aed]", bg: "bg-[#f5f3ff]", href: "/travel/hotels" },
  { id: "bus", label: "Bus", icon: Bus, accent: "text-[#7c3aed]", bg: "bg-[#f5f3ff]", href: "/travel/bus" },
  { id: "electricity", label: "Electricity", icon: Zap, accent: "text-[#d97706]", bg: "bg-[#fffbeb]", href: "/bills/pay?category=electricity" },
  { id: "water", label: "Water", icon: Droplets, accent: "text-[#2563eb]", bg: "bg-[#eff6ff]", href: "/bills/pay?category=water" },
  { id: "gas", label: "Gas", icon: Flame, accent: "text-[#ff8c42]", bg: "bg-[#fff7ed]", href: "/bills/pay?category=gas" },
  { id: "mobile", label: "Mobile", icon: Smartphone, accent: "text-[#7c3aed]", bg: "bg-[#f5f3ff]", href: "/recharge" },
  { id: "dth", label: "DTH", icon: Tv, accent: "text-[#374151]", bg: "bg-[#f9fafb]", href: "/recharge" },
  { id: "fastag", label: "FASTag", icon: Car, accent: "text-[#ff8c42]", bg: "bg-[#fff7ed]", href: "/bills" },
  { id: "broadband", label: "Broadband", icon: Wifi, accent: "text-[#7c3aed]", bg: "bg-[#f5f3ff]", href: "/bills/pay?category=broadband" },
  { id: "cc", label: "Credit Card", icon: CreditCard, accent: "text-[#ff8c42]", bg: "bg-[#fff7ed]", href: "/bills" },
  { id: "emi", label: "Loan EMI", icon: Landmark, accent: "text-[#22c55e]", bg: "bg-[#ecfdf5]", href: "/bills" },
  { id: "insurance", label: "Insurance", icon: ShieldCheck, accent: "text-[#22c55e]", bg: "bg-[#ecfdf5]", href: "/bills" },
];

export const billCategories: ServiceItem[] = [
  { id: "mobile", label: "Mobile Recharge", icon: Smartphone, accent: "text-[#ff5c00]", bg: "bg-[#fff4ec]", href: "/bills" },
  { id: "electricity", label: "Electricity", icon: Zap, accent: "text-[#f59e0b]", bg: "bg-[#fff8eb]", href: "/bills" },
  { id: "water", label: "Water", icon: Droplets, accent: "text-[#286ee8]", bg: "bg-[#eef5ff]", href: "/bills" },
  { id: "gas", label: "Gas", icon: Flame, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/bills" },
  { id: "broadband", label: "Broadband", icon: Wifi, accent: "text-[#10a56a]", bg: "bg-[#eafff4]", href: "/bills" },
  { id: "landline", label: "Landline", icon: Phone, accent: "text-[#0d9488]", bg: "bg-[#ecfdf8]", href: "/bills" },
  { id: "fastag", label: "FASTag", icon: Car, accent: "text-[#ff5c00]", bg: "bg-[#fff4ec]", href: "/bills" },
  { id: "insurance", label: "Insurance", icon: ShieldCheck, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/bills" },
  { id: "emi", label: "Loan EMI", icon: Landmark, accent: "text-[#10a56a]", bg: "bg-[#eafff4]", href: "/bills" },
  { id: "cc", label: "Credit Card Bill", icon: CreditCard, accent: "text-[#ff5c00]", bg: "bg-[#fff4ec]", href: "/bills" },
];

export const dueSoonBills = [
  { id: "1", name: "Tata Power", category: "Electricity", amount: "₹ 1,248.00", due: "Due on 25 May 2025" },
  { id: "2", name: "BWSSB", category: "Water", amount: "₹ 680.00", due: "Due on 27 May 2025" },
  { id: "3", name: "Indane Gas", category: "Gas", amount: "₹ 1,050.00", due: "Due on 30 May 2025" },
];

export const savedBillers = [
  { id: "1", name: "Tata Power", meta: "XXXX 5678", autoPay: true },
  { id: "2", name: "BWSSB", meta: "Water", autoPay: false },
  { id: "3", name: "Airtel Prepaid", meta: "98XXXX4321", autoPay: true },
  { id: "4", name: "Jio Prepaid", meta: "99XXXX8877", autoPay: false },
  { id: "5", name: "HDFC Bank", meta: "Credit Card", autoPay: true },
];

export const recentTransactions = [
  { id: "1", title: "Electricity Bill", vendor: "BESCOM", amount: "- ₹1,250.00", status: "Success" as const, when: "18 May, 10:24 AM", kind: "bill" },
  { id: "2", title: "Mobile Recharge", vendor: "Airtel", amount: "- ₹299.00", status: "Success" as const, when: "16 May, 8:02 PM", kind: "recharge" },
  { id: "3", title: "DTH Recharge", vendor: "Tata Play", amount: "- ₹450.00", status: "Pending" as const, when: "15 May, 1:40 PM", kind: "recharge" },
  { id: "4", title: "Flight Booking Refund", vendor: "DEL → BOM", amount: "+ ₹3,780.00", status: "Refund" as const, when: "12 May, 4:18 PM", kind: "travel" },
];

export const fareDeals = [
  { id: "1", route: "Delhi → Goa", meta: "24 May · One Way", price: "₹2,299", was: "₹3,099", off: "25% OFF" },
  { id: "2", route: "Bengaluru → Jaipur", meta: "28 May · One Way", price: "₹3,149", was: "₹4,199", off: "25% OFF" },
  { id: "3", route: "Mumbai → Kochi", meta: "01 Jun · Round Trip", price: "₹5,890", was: "₹7,450", off: "21% OFF" },
];

export const travelModes = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "bus", label: "Bus", icon: Bus },
  { id: "trains", label: "Trains", icon: Train },
  { id: "hotels", label: "Hotels", icon: Hotel },
  { id: "insurance", label: "Travel Insurance", icon: ShieldCheck },
];

export const allServicesSections: { title: string; seeAll?: boolean; items: ServiceItem[] }[] = [
  {
    title: "Recommended",
    seeAll: true,
    items: [
      { id: "r1", label: "Recharge", icon: Smartphone, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/bills" },
      { id: "r2", label: "Bill Payments", icon: Zap, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/bills" },
      { id: "r3", label: "Flights", icon: Plane, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel/flights" },
      { id: "r4", label: "Bus", icon: Bus, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel/bus" },
      { id: "r5", label: "Trains", icon: Train, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel" },
    ],
  },
  {
    title: "Pay & Manage",
    items: [
      ...billCategories.slice(0, 5),
      { id: "wallet", label: "Wallet", icon: Wallet, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/wallet" },
      { id: "rewards", label: "Rewards", icon: Gift, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/wallet" },
      { id: "insurance2", label: "Insurance", icon: ShieldCheck, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/all-services" },
      { id: "upi", label: "UPI", icon: LayoutGrid, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/scan" },
      { id: "gifts", label: "Gift Cards", icon: Gift, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/all-services" },
    ],
  },
  {
    title: "Travel & Stay",
    items: [
      { id: "t1", label: "Flights", icon: Plane, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel/flights" },
      { id: "t2", label: "Bus", icon: Bus, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel/bus" },
      { id: "t3", label: "Trains", icon: Train, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel" },
      { id: "t4", label: "Hotels", icon: Hotel, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel/hotels" },
      { id: "t5", label: "Holiday Packages", icon: Gift, accent: "text-[#7c3aed]", bg: "bg-[#f3eaff]", href: "/travel" },
    ],
  },
];

export const spendingBreakdown = [
  { label: "Electricity", amount: "₹2,248", color: "bg-[#ff5c00]", pct: 33 },
  { label: "Recharge", amount: "₹1,499", color: "bg-[#7c3aed]", pct: 22 },
  { label: "Gas", amount: "₹1,050", color: "bg-[#10a56a]", pct: 15 },
  { label: "Water", amount: "₹680", color: "bg-[#286ee8]", pct: 10 },
  { label: "Others", amount: "₹1,305", color: "bg-[#94a3b8]", pct: 20 },
];

export const categorySummary = [
  { label: "Bills", amount: "₹8,620.50", pct: "34.8%", color: "text-[#ff5c00]", bar: "bg-[#ff5c00]", icon: Zap },
  { label: "Recharge", amount: "₹4,210.00", pct: "17.0%", color: "text-[#7c3aed]", bar: "bg-[#7c3aed]", icon: Smartphone },
  { label: "Travel", amount: "₹6,840.00", pct: "27.6%", color: "text-[#286ee8]", bar: "bg-[#286ee8]", icon: Plane },
  { label: "Cashback", amount: "₹1,250.00", pct: "5.0%", color: "text-[#0d9488]", bar: "bg-[#0d9488]", icon: Wallet },
  { label: "Rewards", amount: "₹263.80", pct: "1.1%", color: "text-[#d97706]", bar: "bg-[#d97706]", icon: Gift },
];
