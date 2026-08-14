import { defaultDate, formatDateLabel, formatInr } from "@/lib/superapp/hotels";

export { defaultDate, formatDateLabel, formatInr };

export const BUS_CITIES = [
  "Mumbai",
  "Delhi",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Goa",
  "Lucknow",
  "Indore",
  "Nagpur",
  "Chandigarh",
  "Manali",
];

export type BusOffer = {
  id: string;
  company: string;
  ac: boolean;
  sleeper: boolean;
  seater: boolean;
  luxury: boolean;
  layout: string;
  price: number;
  originalPrice: number;
  seatsLeft: number;
  rating: number;
  reviews: number;
  depart: string;
  arrive: string;
  duration: string;
  night: boolean;
  photos: number;
  liveTracking: boolean;
};

export type StopPoint = { id: string; name: string; landmark: string; time: string };

export type BusSearch = {
  from: string;
  to: string;
  date: string;
  women: boolean;
};

export type BusSeat = { id: string; deck: "L" | "U"; price: number };

export type BusPassenger = { name: string; age: string; gender: string };

export type BusBooking = {
  search: BusSearch;
  bus: BusOffer;
  seats: BusSeat[];
  boarding?: StopPoint;
  dropping?: StopPoint;
  passengers: BusPassenger[];
  contact: { email: string; phone: string; state: string };
  coupon?: string;
  couponOff?: number;
  pnr?: string;
  status?: "upcoming" | "cancelled" | "completed";
  total?: number;
};

export const BUS_KEY = "wishme_bus_booking";
export const BUS_TRIPS = "wishme_bus_trips";

const OPERATORS = [
  { company: "RedLine Travels", ac: true, sleeper: true, luxury: true, layout: "1+1" },
  { company: "BlueWave Express", ac: true, sleeper: false, luxury: false, layout: "2+2" },
  { company: "GreenGo Coaches", ac: false, sleeper: false, luxury: false, layout: "2+2" },
  { company: "NightRider Sleepers", ac: true, sleeper: true, luxury: false, layout: "1+2" },
  { company: "SunCity Travels", ac: true, sleeper: false, luxury: true, layout: "2+2" },
  { company: "Coastal Kings", ac: true, sleeper: true, luxury: true, layout: "1+1" },
  { company: "MorningStar Bus Co.", ac: false, sleeper: false, luxury: false, layout: "3+2" },
  { company: "Highway Hopper", ac: true, sleeper: false, luxury: false, layout: "2+2" },
  { company: "DreamLiner Sleepers", ac: true, sleeper: true, luxury: false, layout: "1+2" },
  { company: "Royal Roadways", ac: true, sleeper: false, luxury: true, layout: "2+2" },
];

const TIMES = [
  { dep: "05:45", dur: "5h 30m", night: false },
  { dep: "06:15", dur: "5h 15m", night: false },
  { dep: "09:30", dur: "5h 30m", night: false },
  { dep: "13:15", dur: "5h 35m", night: false },
  { dep: "20:00", dur: "8h 30m", night: true },
  { dep: "21:30", dur: "8h 15m", night: true },
  { dep: "22:45", dur: "7h 25m", night: true },
  { dep: "23:30", dur: "7h 30m", night: true },
];

function addTime(hhmm: string, hours: number, minutes = 0) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + hours * 60 + minutes;
  const hh = Math.floor(total / 60) % 24;
  const mm = ((total % 60) + 60) % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function busesForRoute(from: string, to: string, date: string): BusOffer[] {
  return OPERATORS.map((op, i) => {
    const t = TIMES[i % TIMES.length];
    const hours = Number(t.dur.split("h")[0]);
    const base = 349 + i * 110 + (op.luxury ? 400 : 0) + (op.sleeper ? 250 : 0);
    return {
      id: `${from}-${to}-${date}-${i}`,
      company: op.company,
      ac: op.ac,
      sleeper: op.sleeper,
      seater: !op.sleeper,
      luxury: op.luxury,
      layout: op.layout,
      price: base,
      originalPrice: base + 200,
      seatsLeft: 4 + ((i * 7) % 24),
      rating: 3.9 + (i % 10) / 10,
      reviews: 120 + i * 37,
      depart: t.dep,
      arrive: addTime(t.dep, hours),
      duration: t.dur,
      night: t.night,
      photos: 4 + (i % 5),
      liveTracking: i % 2 === 0,
    };
  });
}

export function boardingPoints(city: string, depart: string): StopPoint[] {
  return [
    { id: "b1", name: `${city} ISBT`, landmark: "Main bus stand gate 1", time: depart },
    { id: "b2", name: `${city} Railway`, landmark: "Opp. station exit 2", time: addTime(depart, 0, 15) },
    { id: "b3", name: `${city} Airport road`, landmark: "Near metro feeder stop", time: addTime(depart, 0, 25) },
    { id: "b4", name: `${city} City mall`, landmark: "Mall parking bay 4", time: addTime(depart, 0, 40) },
  ];
}

export function droppingPoints(city: string, arrive: string): StopPoint[] {
  return [
    { id: "d1", name: `${city} ISBT`, landmark: "Platform 3 drop bay", time: arrive },
    { id: "d2", name: `${city} Cantonment`, landmark: "Near clock tower", time: addTime(arrive, 0, 12) },
    { id: "d3", name: `${city} Tech park`, landmark: "Infosys / IT park gate", time: addTime(arrive, 0, 22) },
    { id: "d4", name: `${city} University`, landmark: "Main gate bus stop", time: addTime(arrive, 0, 35) },
  ];
}

export function busSearchQuery(s: BusSearch) {
  const p = new URLSearchParams({ from: s.from, to: s.to, date: s.date });
  if (s.women) p.set("women", "1");
  return p.toString();
}
export function queryToBus(sp: URLSearchParams): BusSearch {
  return {
    from: sp.get("from") || "Mumbai",
    to: sp.get("to") || "Pune",
    date: sp.get("date") || defaultDate(1),
    women: sp.get("women") === "1",
  };
}

export function readBus(): BusBooking | null {
  try {
    return JSON.parse(sessionStorage.getItem(BUS_KEY) || "null") as BusBooking | null;
  } catch {
    return null;
  }
}
export function writeBus(b: BusBooking) {
  sessionStorage.setItem(BUS_KEY, JSON.stringify(b));
}
export function readBusTrips(): BusBooking[] {
  try {
    return JSON.parse(localStorage.getItem(BUS_TRIPS) || "[]") as BusBooking[];
  } catch {
    return [];
  }
}
export function upsertBusTrip(b: BusBooking) {
  const list = readBusTrips().filter((t) => t.pnr !== b.pnr);
  list.unshift(b);
  localStorage.setItem(BUS_TRIPS, JSON.stringify(list));
}
export function writeBusTrips(list: BusBooking[]) {
  localStorage.setItem(BUS_TRIPS, JSON.stringify(list));
}

export function busTotal(b: BusBooking) {
  const seats = b.seats.reduce((s, x) => s + x.price, 0);
  return Math.max(0, seats + 30 - (b.couponOff ?? 0));
}

export const BUS_COUPONS: Record<string, number> = { BUS50: 50, FESTIVE300: 150, WISHBUS: 80 };

export function isSeatTaken(id: string, busId: string) {
  let h = 0;
  const s = busId + id;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h % 6 === 0;
}

export function seatPrice(sleeper: boolean, luxury: boolean) {
  return (sleeper ? 899 : 449) + (luxury ? 200 : 0);
}
