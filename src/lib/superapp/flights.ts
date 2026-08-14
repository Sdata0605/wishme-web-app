export type TripType = "oneway" | "round" | "multicity";
export type CabinClass = "economy" | "premiumEconomy" | "business" | "first";
export type SpecialFare = "regular" | "student" | "armed" | "senior" | "doctor" | "doubleSeat" | "group";
export type TimeSlot = "before6" | "6to12" | "12to6" | "after6";
export type TripStatus = "upcoming" | "completed" | "cancelled" | "changed";
export type PaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "emi";

export type FlightCity = {
  code: string;
  city: string;
  airport: string;
  nearby: string[];
};

export type FlightOffer = {
  id: string;
  airline: string;
  airlineCode: string;
  code: string;
  aircraft: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration: string;
  durationMins: number;
  stops: 0 | 1 | 2;
  layover?: string;
  layoverCity?: string;
  price: number;
  originalPrice: number;
  refundable: boolean;
  onTime: number;
  seatsLeft: number;
  nearbyAirport?: boolean;
  splitTicket?: boolean;
};

export type FareTier = {
  key: string;
  label: string;
  badge?: string;
  featured?: boolean;
  priceOffset: number;
  promo?: string;
  baggage: { cabin: string; checkin: string };
  cancellation: string;
  dateChange: string;
  cancelFee: number;
  changeFee: number;
  benefits: string[];
  seatsAndMeals?: boolean;
};

export type MultiCityLeg = { from: string; to: string; depart: string };

export type FlightSearchState = {
  trip: TripType;
  from: string;
  to: string;
  depart: string;
  returnDate: string;
  adults: number;
  children: number;
  infants: number;
  cabin: CabinClass;
  fare: SpecialFare;
  groupSize?: number;
  doubleSeat?: boolean;
  legs?: MultiCityLeg[];
};

export type Traveller = {
  type: "adult" | "child" | "infant";
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  passport?: string;
  passportExpiry?: string;
  nationality?: string;
  frequentFlyer?: string;
};

export type GstInfo = { enabled: boolean; gstin: string; company: string; email: string };

export type SeatPick = { paxIndex: number; seat: string; price: number };
export type MealPick = { paxIndex: number; meal: string; price: number };

export type AddOns = {
  extraBaggageKg: number;
  insurance: boolean;
  transfer: boolean;
  lounge: boolean;
  visa: boolean;
  forex: boolean;
  whatsapp: boolean;
  sms: boolean;
  priceDropAlert: boolean;
};

export type StoredBooking = {
  search: FlightSearchState;
  flight: FlightOffer;
  returnFlight?: FlightOffer;
  extraFlights?: FlightOffer[];
  fareKey: string;
  protection: boolean;
  coupon?: string;
  couponOff?: number;
  travellers?: Traveller[];
  contact?: { email: string; phone: string };
  gst?: GstInfo;
  seats?: SeatPick[];
  meals?: MealPick[];
  addons?: AddOns;
  priceLock?: { until: string; fee: number };
  paymentMethod?: PaymentMethod;
  pnr?: string;
  status?: TripStatus;
  paidAt?: string;
  total?: number;
};

export const BOOKING_KEY = "wishme_flight_booking";
export const RECENTS_KEY = "wishme_flight_recents";
export const SAVED_PAX_KEY = "wishme_saved_travellers";
export const TRIPS_KEY = "wishme_flight_trips";
export const ALERTS_KEY = "wishme_price_alerts";

export const FLIGHT_CITIES: FlightCity[] = [
  { code: "DEL", city: "New Delhi", airport: "Indira Gandhi Intl", nearby: ["AMD"] },
  { code: "BOM", city: "Mumbai", airport: "Chhatrapati Shivaji", nearby: ["GOI"] },
  { code: "BLR", city: "Bengaluru", airport: "Kempegowda Intl", nearby: ["HYD"] },
  { code: "HYD", city: "Hyderabad", airport: "Rajiv Gandhi Intl", nearby: ["BLR"] },
  { code: "MAA", city: "Chennai", airport: "Chennai Intl", nearby: ["BLR"] },
  { code: "CCU", city: "Kolkata", airport: "Netaji Subhas Chandra Bose", nearby: ["BBI"] },
  { code: "GOI", city: "Goa Dabolim", airport: "Dabolim", nearby: ["GOX", "BOM"] },
  { code: "GOX", city: "Goa Mopa", airport: "Manohar Intl", nearby: ["GOI"] },
  { code: "PNQ", city: "Pune", airport: "Pune Intl", nearby: ["BOM"] },
  { code: "AMD", city: "Ahmedabad", airport: "Sardar Vallabhbhai Patel", nearby: ["DEL"] },
  { code: "JAI", city: "Jaipur", airport: "Jaipur Intl", nearby: ["DEL"] },
  { code: "COK", city: "Kochi", airport: "Cochin Intl", nearby: ["MAA"] },
  { code: "BBI", city: "Bhubaneswar", airport: "Biju Patnaik", nearby: ["CCU"] },
  { code: "SIN", city: "Singapore", airport: "Changi", nearby: ["KUL"] },
  { code: "DXB", city: "Dubai", airport: "Dubai Intl", nearby: ["AUH"] },
  { code: "AUH", city: "Abu Dhabi", airport: "Zayed Intl", nearby: ["DXB"] },
  { code: "CAI", city: "Cairo", airport: "Cairo Intl", nearby: ["DXB"] },
  { code: "LHR", city: "London", airport: "Heathrow", nearby: ["LGW"] },
  { code: "LGW", city: "London Gatwick", airport: "Gatwick", nearby: ["LHR"] },
  { code: "KUL", city: "Kuala Lumpur", airport: "KLIA", nearby: ["SIN"] },
];

export const AIRLINES = [
  { name: "IndiGo", code: "6E", aircraft: "A320neo" },
  { name: "Air India", code: "AI", aircraft: "A321neo" },
  { name: "Vistara", code: "UK", aircraft: "A321neo" },
  { name: "SpiceJet", code: "SG", aircraft: "B737-800" },
  { name: "Akasa Air", code: "QP", aircraft: "B737 MAX 8" },
  { name: "Air India Express", code: "IX", aircraft: "B737-800" },
];

export const CABIN_OPTIONS: { id: CabinClass; label: string }[] = [
  { id: "economy", label: "Economy" },
  { id: "premiumEconomy", label: "Premium Economy" },
  { id: "business", label: "Business" },
  { id: "first", label: "First" },
];

export const SPECIAL_FARES: { id: SpecialFare; label: string; hint: string }[] = [
  { id: "regular", label: "Regular", hint: "Standard fares" },
  { id: "student", label: "Student", hint: "Extra baggage" },
  { id: "armed", label: "Armed Forces", hint: "ID required" },
  { id: "senior", label: "Senior Citizen", hint: "60+ years" },
  { id: "doctor", label: "Doctor & Nurses", hint: "Medical ID" },
  { id: "doubleSeat", label: "Double Seat", hint: "Extra seat" },
  { id: "group", label: "Group", hint: "9+ travellers" },
];

export const FARE_TIERS: FareTier[] = [
  {
    key: "saver",
    label: "Saver",
    priceOffset: -600,
    promo: "WISH10",
    baggage: { cabin: "7 kg", checkin: "15 kg" },
    cancellation: "Airline fee + Wish Me service fee",
    dateChange: "Allowed with date-change fee",
    cancelFee: 4999,
    changeFee: 2999,
    benefits: ["Lowest fare", "Standard seat"],
  },
  {
    key: "wishspecial",
    label: "Fare by WishMe",
    badge: "WISHSPECIAL",
    featured: true,
    priceOffset: 0,
    promo: "WISHME",
    baggage: { cabin: "7 kg", checkin: "25 kg" },
    cancellation: "Lower airline fee within 24 hrs",
    dateChange: "One free date change*",
    cancelFee: 3499,
    changeFee: 0,
    benefits: ["Extra check-in bag", "Priority support", "Easy reschedule"],
    seatsAndMeals: true,
  },
  {
    key: "flexi",
    label: "Flexi",
    priceOffset: 500,
    baggage: { cabin: "7 kg", checkin: "30 kg" },
    cancellation: "Free cancellation up to 4 hrs before departure*",
    dateChange: "Free date change*",
    cancelFee: 0,
    changeFee: 0,
    benefits: ["Seat + meal included", "Flexible changes", "Higher baggage"],
    seatsAndMeals: true,
  },
];

export const MEALS = [
  { id: "veg", label: "Veg thali", price: 350 },
  { id: "nveg", label: "Chicken meal", price: 420 },
  { id: "jain", label: "Jain meal", price: 380 },
  { id: "fruit", label: "Fruit platter", price: 280 },
];

export const COUPONS: Record<string, number> = {
  WISH10: 10,
  WISHME: 8,
  FLY500: 500,
  UPI100: 100,
};

export const PAYMENT_OPTIONS: { id: PaymentMethod; label: string; discount: number }[] = [
  { id: "upi", label: "UPI", discount: 150 },
  { id: "card", label: "Credit / Debit card", discount: 0 },
  { id: "netbanking", label: "Net banking", discount: 50 },
  { id: "wallet", label: "Wish Me Wallet", discount: 200 },
  { id: "emi", label: "EMI", discount: 0 },
];

export const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function cityByCode(code: string) {
  return FLIGHT_CITIES.find((c) => c.code === code) ?? FLIGHT_CITIES[0];
}

export function cabinLabel(cabin: CabinClass) {
  return CABIN_OPTIONS.find((c) => c.id === cabin)?.label ?? "Economy";
}

export function formatInr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function defaultDepartDate(offset = 2) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export function formatDateLabel(iso: string) {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
}

export function travellerSummary(s: FlightSearchState) {
  const parts = [`${s.adults} Adult${s.adults > 1 ? "s" : ""}`];
  if (s.children) parts.push(`${s.children} Child`);
  if (s.infants) parts.push(`${s.infants} Infant`);
  return parts.join(", ");
}

export function paxCount(s: FlightSearchState) {
  return s.adults + s.children + s.infants;
}

export function emptyTravellers(s: FlightSearchState): Traveller[] {
  const list: Traveller[] = [];
  for (let i = 0; i < s.adults; i++) list.push({ type: "adult", firstName: "", lastName: "", gender: "male", dob: "", nationality: "IN" });
  for (let i = 0; i < s.children; i++) list.push({ type: "child", firstName: "", lastName: "", gender: "male", dob: "", nationality: "IN" });
  for (let i = 0; i < s.infants; i++) list.push({ type: "infant", firstName: "", lastName: "", gender: "male", dob: "", nationality: "IN" });
  return list;
}

export function isInternational(from: string, to: string) {
  const intl = new Set(["SIN", "DXB", "AUH", "CAI", "LHR", "LGW", "KUL"]);
  return intl.has(from) || intl.has(to);
}

export function getTimeSlot(hhmm: string): TimeSlot {
  const h = Number(hhmm.slice(0, 2));
  if (h < 6) return "before6";
  if (h < 12) return "6to12";
  if (h < 18) return "12to6";
  return "after6";
}

export const TIME_SLOTS: { id: TimeSlot; label: string }[] = [
  { id: "before6", label: "Before 6am" },
  { id: "6to12", label: "6am – 12pm" },
  { id: "12to6", label: "12pm – 6pm" },
  { id: "after6", label: "After 6pm" },
];

function minsToLabel(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
}

function addMins(hhmm: string, add: number) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + add + 24 * 60) % (24 * 60);
  const nh = String(Math.floor(total / 60)).padStart(2, "0");
  const nm = String(total % 60).padStart(2, "0");
  return `${nh}:${nm}`;
}

export function flightsForRoute(from: string, to: string, date = defaultDepartDate()): FlightOffer[] {
  const seed = hash(`${from}${to}${date}`);
  const nearbyFrom = cityByCode(from).nearby[0];
  const templates = [
    { dep: "05:40", dur: 125, stops: 0 as const },
    { dep: "07:15", dur: 135, stops: 0 as const },
    { dep: "09:05", dur: 130, stops: 0 as const },
    { dep: "11:20", dur: 205, stops: 1 as const, lay: "AMD", layCity: "Ahmedabad" },
    { dep: "13:10", dur: 140, stops: 0 as const },
    { dep: "16:35", dur: 135, stops: 0 as const },
    { dep: "18:25", dur: 230, stops: 1 as const, lay: "HYD", layCity: "Hyderabad" },
    { dep: "20:00", dur: 140, stops: 0 as const },
    { dep: "21:40", dur: 135, stops: 0 as const },
    { dep: "23:10", dur: 145, stops: 0 as const },
  ];
  return templates.map((t, i) => {
    const al = AIRLINES[i % AIRLINES.length];
    const wobble = ((seed + i * 97) % 1800) - 400;
    const base = 3499 + wobble + (t.stops ? -400 : 200);
    const price = Math.max(2199, base);
    return {
      id: `${from}${to}${date}-${i}`,
      airline: al.name,
      airlineCode: al.code,
      code: `${al.code}-${200 + ((seed + i) % 700)}`,
      aircraft: al.aircraft,
      from,
      to,
      depart: t.dep,
      arrive: addMins(t.dep, t.dur),
      duration: minsToLabel(t.dur),
      durationMins: t.dur,
      stops: t.stops,
      layover: t.stops ? `${t.lay} · 45m` : undefined,
      layoverCity: t.layCity,
      price,
      originalPrice: price + 900,
      refundable: i % 3 !== 0,
      onTime: 72 + ((seed + i) % 24),
      seatsLeft: 4 + ((seed + i) % 18),
      nearbyAirport: i === 4 && !!nearbyFrom,
      splitTicket: i === 6,
    };
  });
}

export function fareCalendar(from: string, to: string, start = defaultDepartDate()) {
  return Array.from({ length: 14 }, (_, i) => {
    const date = addDays(start, i - 1);
    const list = flightsForRoute(from, to, date);
    const min = Math.min(...list.map((f) => f.price));
    return { date, min };
  });
}

export function readBooking(): StoredBooking | null {
  try {
    const raw = sessionStorage.getItem(BOOKING_KEY);
    return raw ? (JSON.parse(raw) as StoredBooking) : null;
  } catch {
    return null;
  }
}

export function writeBooking(next: StoredBooking) {
  sessionStorage.setItem(BOOKING_KEY, JSON.stringify(next));
}

export function searchToQuery(s: FlightSearchState) {
  const p = new URLSearchParams({
    trip: s.trip,
    from: s.from,
    to: s.to,
    depart: s.depart,
    adults: String(s.adults),
    children: String(s.children),
    infants: String(s.infants),
    cabin: s.cabin,
    fare: s.fare,
  });
  if (s.returnDate) p.set("return", s.returnDate);
  if (s.doubleSeat) p.set("doubleSeat", "1");
  if (s.groupSize) p.set("group", String(s.groupSize));
  if (s.legs?.length) p.set("legs", JSON.stringify(s.legs));
  return p.toString();
}

export function queryToSearch(sp: URLSearchParams): FlightSearchState {
  let legs: MultiCityLeg[] | undefined;
  try {
    const raw = sp.get("legs");
    if (raw) legs = JSON.parse(raw) as MultiCityLeg[];
  } catch {
    legs = undefined;
  }
  const trip = (sp.get("trip") as TripType) || "oneway";
  return {
    trip: trip === "round" || trip === "multicity" ? trip : "oneway",
    from: (sp.get("from") || "DEL").toUpperCase(),
    to: (sp.get("to") || "BOM").toUpperCase(),
    depart: sp.get("depart") || defaultDepartDate(),
    returnDate: sp.get("return") || "",
    adults: Math.max(1, Number(sp.get("adults") || 1)),
    children: Math.max(0, Number(sp.get("children") || 0)),
    infants: Math.max(0, Number(sp.get("infants") || 0)),
    cabin: (sp.get("cabin") as CabinClass) || "economy",
    fare: (sp.get("fare") as SpecialFare) || "regular",
    doubleSeat: sp.get("doubleSeat") === "1",
    groupSize: sp.get("group") ? Number(sp.get("group")) : undefined,
    legs,
  };
}

export function saveRecent(s: FlightSearchState) {
  const recents = readRecents().filter((r) => !(r.from === s.from && r.to === s.to && r.depart === s.depart));
  recents.unshift(s);
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents.slice(0, 6)));
}

export function readRecents(): FlightSearchState[] {
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]") as FlightSearchState[];
  } catch {
    return [];
  }
}

export function readSavedPax(): Traveller[] {
  try {
    return JSON.parse(localStorage.getItem(SAVED_PAX_KEY) || "[]") as Traveller[];
  } catch {
    return [];
  }
}

export function writeSavedPax(list: Traveller[]) {
  localStorage.setItem(SAVED_PAX_KEY, JSON.stringify(list.slice(0, 12)));
}

export function readTrips(): StoredBooking[] {
  try {
    return JSON.parse(localStorage.getItem(TRIPS_KEY) || "[]") as StoredBooking[];
  } catch {
    return [];
  }
}

export function writeTrips(list: StoredBooking[]) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(list));
}

export function upsertTrip(trip: StoredBooking) {
  const list = readTrips().filter((t) => t.pnr !== trip.pnr);
  list.unshift(trip);
  writeTrips(list);
}

export function defaultAddons(): AddOns {
  return {
    extraBaggageKg: 0,
    insurance: false,
    transfer: false,
    lounge: false,
    visa: false,
    forex: false,
    whatsapp: true,
    sms: true,
    priceDropAlert: false,
  };
}

export function farePrice(flight: FlightOffer, fareKey: string, protection: boolean) {
  const tier = FARE_TIERS.find((t) => t.key === fareKey) ?? FARE_TIERS[1];
  return flight.price + tier.priceOffset + (protection ? 199 : 0);
}

export function bookingTotal(b: StoredBooking) {
  const adults = b.search.adults + b.search.children;
  const outbound = farePrice(b.flight, b.fareKey, b.protection) * adults;
  const inbound = b.returnFlight ? farePrice(b.returnFlight, b.fareKey, false) * adults : 0;
  const seats = (b.seats ?? []).reduce((s, x) => s + x.price, 0);
  const meals = (b.meals ?? []).reduce((s, x) => s + x.price, 0);
  const bag = (b.addons?.extraBaggageKg ?? 0) * 450;
  const ins = b.addons?.insurance ? 199 * adults : 0;
  const transfer = b.addons?.transfer ? 899 : 0;
  const lounge = b.addons?.lounge ? 1299 * adults : 0;
  const visa = b.addons?.visa ? 2499 : 0;
  const forex = b.addons?.forex ? 199 : 0;
  const lock = b.priceLock?.fee ?? 0;
  const doubleSeat = b.search.doubleSeat || b.search.fare === "doubleSeat" ? 2199 * b.search.adults : 0;
  const convenience = 249 * adults;
  const sub = outbound + inbound + seats + meals + bag + ins + transfer + lounge + visa + forex + lock + doubleSeat + convenience;
  const couponOff = b.couponOff ?? 0;
  const payOff = PAYMENT_OPTIONS.find((p) => p.id === b.paymentMethod)?.discount ?? 0;
  return Math.max(0, sub - couponOff - payOff);
}

export function makePnr() {
  return `WM${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function applyCoupon(code: string, subtotal: number) {
  const key = code.trim().toUpperCase();
  const val = COUPONS[key];
  if (!val) return { ok: false, off: 0, key };
  const off = val <= 20 ? Math.round(subtotal * (val / 100)) : val;
  return { ok: true, off, key };
}

export const SEAT_ROWS = 12;
export const SEAT_COLS = ["A", "B", "C", "D", "E", "F"];

export function seatPrice(col: string) {
  if (col === "A" || col === "F") return 449;
  if (col === "C" || col === "D") return 349;
  return 249;
}

export function isSeatTaken(row: number, col: string, flightId: string) {
  return hash(`${flightId}${row}${col}`) % 5 === 0;
}
