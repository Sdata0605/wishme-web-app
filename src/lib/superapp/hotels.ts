export const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary";

export function formatInr(n: number) {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function defaultDate(offset = 1) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function formatDateLabel(iso: string) {
  if (!iso) return "";
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function nightsBetween(a: string, b: string) {
  const s = new Date(`${a}T12:00:00`).getTime();
  const e = new Date(`${b}T12:00:00`).getTime();
  return Math.max(1, Math.round((e - s) / 86400000));
}

export type HotelRoom = {
  id: string;
  name: string;
  bed: string;
  size: string;
  guests: number;
  amenities: string[];
  price: number;
  originalPrice: number;
  freeCancel: boolean;
  breakfast: boolean;
  payAtHotel: boolean;
  zeroPay: boolean;
};

export type Hotel = {
  id: string;
  name: string;
  area: string;
  city: string;
  stars: 3 | 4 | 5;
  rating: number;
  reviews: string;
  price: number;
  originalPrice: number;
  tags: string[];
  amenities: string[];
  propertyType: "Hotel" | "Resort" | "Homestay" | "Apartment";
  freeCancel: boolean;
  breakfast: boolean;
  payAtHotel: boolean;
  zeroPay: boolean;
  distance: string;
  description: string;
  rooms: HotelRoom[];
};

export type HotelSearch = {
  city: string;
  checkIn: string;
  checkOut: string;
  rooms: number;
  adults: number;
  children: number;
  query?: string;
};

export type HotelGuest = { firstName: string; lastName: string; email: string; phone: string };

export type HotelBooking = {
  search: HotelSearch;
  hotel: Hotel;
  room: HotelRoom;
  guests: HotelGuest[];
  gst?: { enabled: boolean; gstin: string; company: string };
  breakfastAdd: boolean;
  extraBed: boolean;
  insurance: boolean;
  payMode: "now" | "hotel" | "zero";
  coupon?: string;
  couponOff?: number;
  confirmation?: string;
  status?: "upcoming" | "cancelled" | "completed";
  total?: number;
};

export const HOTEL_CITIES = [
  "Goa",
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Jaipur",
  "Manali",
  "Udaipur",
  "Shimla",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
];

export const AMENITIES = ["Wi-Fi", "Pool", "Spa", "Breakfast", "Parking", "Gym", "Restaurant", "AC"];

const TEMPLATES: Omit<Hotel, "id" | "city" | "rooms" | "price" | "originalPrice">[] = [
  {
    name: "WishMe Grand",
    area: "City Centre",
    stars: 5,
    rating: 4.6,
    reviews: "2.4K",
    tags: ["Couple Friendly", "MMT-style deal"],
    amenities: ["Wi-Fi", "Pool", "Spa", "Breakfast", "Parking"],
    propertyType: "Resort",
    freeCancel: true,
    breakfast: true,
    payAtHotel: true,
    zeroPay: true,
    distance: "0.4 km from centre",
    description: "Pool, spa and breakfast included. Free cancellation on selected rooms.",
  },
  {
    name: "UrbanStay Business",
    area: "Business District",
    stars: 4,
    rating: 4.3,
    reviews: "1.8K",
    tags: ["Business", "Metro Nearby"],
    amenities: ["Wi-Fi", "Gym", "Restaurant", "Parking", "AC"],
    propertyType: "Hotel",
    freeCancel: true,
    breakfast: false,
    payAtHotel: true,
    zeroPay: false,
    distance: "1.2 km from metro",
    description: "Work desks, fast Wi-Fi and easy access to meetings.",
  },
  {
    name: "Heritage Palace Inn",
    area: "Old Town",
    stars: 5,
    rating: 4.8,
    reviews: "3.1K",
    tags: ["Heritage", "Family"],
    amenities: ["Wi-Fi", "Pool", "Restaurant", "Spa", "Parking"],
    propertyType: "Hotel",
    freeCancel: true,
    breakfast: true,
    payAtHotel: false,
    zeroPay: true,
    distance: "0.8 km from landmark",
    description: "Heritage stay with courtyard dining and family suites.",
  },
  {
    name: "PineView Homestay",
    area: "Hillside",
    stars: 3,
    rating: 4.4,
    reviews: "986",
    tags: ["Homestay", "View"],
    amenities: ["Wi-Fi", "Parking", "Breakfast"],
    propertyType: "Homestay",
    freeCancel: false,
    breakfast: true,
    payAtHotel: true,
    zeroPay: false,
    distance: "2.5 km from mall road",
    description: "Home-cooked breakfast and a quiet hillside vibe.",
  },
  {
    name: "LakeSide Apartments",
    area: "Lakeside",
    stars: 4,
    rating: 4.5,
    reviews: "1.2K",
    tags: ["Apartment", "Kitchen"],
    amenities: ["Wi-Fi", "Parking", "AC"],
    propertyType: "Apartment",
    freeCancel: true,
    breakfast: false,
    payAtHotel: true,
    zeroPay: true,
    distance: "0.6 km from lake",
    description: "Self-catering apartments for longer family stays.",
  },
  {
    name: "Budget Nest Inn",
    area: "Near Station",
    stars: 3,
    rating: 4.0,
    reviews: "640",
    tags: ["Budget", "Transit"],
    amenities: ["Wi-Fi", "AC"],
    propertyType: "Hotel",
    freeCancel: true,
    breakfast: false,
    payAtHotel: true,
    zeroPay: true,
    distance: "0.3 km from station",
    description: "Clean budget rooms close to transit.",
  },
];

export const HOTEL_KEY = "wishme_hotel_booking";
export const HOTEL_TRIPS = "wishme_hotel_trips";

export function hotelsForCity(city: string): Hotel[] {
  return TEMPLATES.map((t, i) => {
    const base = 1899 + i * 700 + city.length * 40;
    const rooms: HotelRoom[] = [
      {
        id: `${city}-r${i}a`,
        name: "Deluxe Room",
        bed: "1 King Bed",
        size: "24 sq.m",
        guests: 2,
        amenities: t.amenities.slice(0, 3),
        price: base,
        originalPrice: base + 1400,
        freeCancel: t.freeCancel,
        breakfast: t.breakfast,
        payAtHotel: t.payAtHotel,
        zeroPay: t.zeroPay,
      },
      {
        id: `${city}-r${i}b`,
        name: "Family Suite",
        bed: "1 King + Sofa",
        size: "38 sq.m",
        guests: 3,
        amenities: [...t.amenities.slice(0, 3), "Extra space"],
        price: base + 1600,
        originalPrice: base + 3200,
        freeCancel: true,
        breakfast: true,
        payAtHotel: t.payAtHotel,
        zeroPay: t.zeroPay,
      },
    ];
    return {
      ...t,
      name: `${t.name} ${city}`,
      city,
      id: `${city}-${i}`,
      price: rooms[0].price,
      originalPrice: rooms[0].originalPrice,
      rooms,
    };
  });
}

export function hotelById(id: string) {
  const city = id.split("-")[0];
  return hotelsForCity(city).find((h) => h.id === id);
}

export function hotelNights(s: HotelSearch) {
  return nightsBetween(s.checkIn, s.checkOut);
}

export function hotelTotal(b: HotelBooking) {
  const nights = hotelNights(b.search);
  const rooms = b.search.rooms;
  let total = b.room.price * nights * rooms;
  if (b.breakfastAdd) total += 450 * nights * b.search.adults;
  if (b.extraBed) total += 700 * nights;
  if (b.insurance) total += 149 * b.search.adults;
  total += 99 * rooms;
  total -= b.couponOff ?? 0;
  if (b.payMode === "zero" || b.payMode === "hotel") return Math.max(0, total);
  return Math.max(0, total);
}

export function readHotel(): HotelBooking | null {
  try {
    return JSON.parse(sessionStorage.getItem(HOTEL_KEY) || "null") as HotelBooking | null;
  } catch {
    return null;
  }
}
export function writeHotel(b: HotelBooking) {
  sessionStorage.setItem(HOTEL_KEY, JSON.stringify(b));
}
export function readHotelTrips(): HotelBooking[] {
  try {
    return JSON.parse(localStorage.getItem(HOTEL_TRIPS) || "[]") as HotelBooking[];
  } catch {
    return [];
  }
}
export function upsertHotelTrip(b: HotelBooking) {
  const list = readHotelTrips().filter((t) => t.confirmation !== b.confirmation);
  list.unshift(b);
  localStorage.setItem(HOTEL_TRIPS, JSON.stringify(list));
}
export function writeHotelTrips(list: HotelBooking[]) {
  localStorage.setItem(HOTEL_TRIPS, JSON.stringify(list));
}

export function hotelSearchQuery(s: HotelSearch) {
  const p = new URLSearchParams({
    city: s.city,
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    rooms: String(s.rooms),
    adults: String(s.adults),
    children: String(s.children),
  });
  if (s.query) p.set("q", s.query);
  return p.toString();
}

export function queryToHotel(sp: URLSearchParams): HotelSearch {
  return {
    city: sp.get("city") || "Goa",
    checkIn: sp.get("checkIn") || defaultDate(1),
    checkOut: sp.get("checkOut") || defaultDate(3),
    rooms: Math.max(1, Number(sp.get("rooms") || 1)),
    adults: Math.max(1, Number(sp.get("adults") || 2)),
    children: Math.max(0, Number(sp.get("children") || 0)),
    query: sp.get("q") || "",
  };
}

export const HOTEL_COUPONS: Record<string, number> = { WISHSTAY: 12, HOTEL500: 500, ZERO99: 99 };
