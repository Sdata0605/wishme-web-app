import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HOTEL_BASE = 'https://affiliate.tektravels.com/HotelAPI';

const AMENITY_ICONS: Record<string, string> = {
  wifi: 'Wi-Fi', pool: 'Pool', spa: 'Spa', parking: 'Parking',
  breakfast: 'Breakfast', gym: 'Gym', restaurant: 'Restaurant', bar: 'Bar',
};

/**
 * The hotel API authenticates with HTTP Basic per request — it does not use the
 * TokenId flow that the flight API does, and TBO issues it separate credentials.
 */
function hotelAuthHeader(): string {
  const user = Deno.env.get('TBO_HOTEL_USERNAME');
  const pass = Deno.env.get('TBO_HOTEL_PASSWORD');
  if (!user || !pass) {
    throw new Error(
      'TBO hotel API credentials are not configured. TBO issues separate credentials for the Hotel API — ' +
      'set TBO_HOTEL_USERNAME and TBO_HOTEL_PASSWORD once your account manager provisions them.',
    );
  }
  return `Basic ${btoa(`${user}:${pass}`)}`;
}

async function hotelCall(path: string, body?: Record<string, unknown>) {
  const res = await fetch(`${HOTEL_BASE}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: hotelAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: Record<string, any>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`TBO hotel API returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  const status = json.Status;
  if (status && status.Code !== 200) {
    if (status.Code === 401) {
      throw new Error('TBO hotel API rejected the credentials (401). Confirm hotel API access is active for this agency.');
    }
    throw new Error(status.Description || `TBO hotel API error ${status.Code}`);
  }
  return json;
}

function starsOf(rating: unknown): 3 | 4 | 5 {
  const n = Math.round(Number(rating) || 0);
  if (n >= 5) return 5;
  if (n === 4) return 4;
  return 3;
}

function amenitiesOf(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  const out = new Set<string>();
  for (const raw of list) {
    const key = String(raw).toLowerCase();
    for (const [needle, label] of Object.entries(AMENITY_ICONS)) {
      if (key.includes(needle)) out.add(label);
    }
  }
  return [...out];
}

/** Collapses a TBO hotel + its cheapest room into the shape the app's hotel list renders. */
function mapHotel(h: Record<string, any>, id: number) {
  const rooms: Record<string, any>[] = h.Rooms ?? [];
  const prices = rooms.map((r) => Number(r.TotalFare ?? 0)).filter((n) => n > 0);
  const cheapest = prices.length ? Math.min(...prices) : 0;

  const anyRefundable = rooms.some((r) => r.IsRefundable);
  const anyBreakfast = rooms.some((r) =>
    String(r.MealType ?? '').toLowerCase().includes('breakfast'),
  );

  return {
    id: String(h.HotelCode ?? id),
    hotelCode: String(h.HotelCode ?? ''),
    name: h.HotelName ?? 'Hotel',
    area: h.Address ?? h.CityName ?? '',
    city: h.CityName ?? '',
    stars: starsOf(h.HotelRating ?? h.StarRating),
    rating: Number(h.TripAdvisorRating ?? h.HotelRating ?? 0) || 0,
    reviews: String(h.TripAdvisorReviewCount ?? ''),
    price: Math.round(cheapest),
    originalPrice: Math.round(cheapest),
    currency: h.Currency ?? 'INR',
    tags: [],
    amenities: amenitiesOf(h.HotelFacilities),
    propertyType: 'Hotel' as const,
    freeCancel: anyRefundable,
    breakfast: anyBreakfast,
    distance: '',
    description: h.Description ?? '',
    image: Array.isArray(h.Images) ? h.Images[0] ?? '' : '',
    images: Array.isArray(h.Images) ? h.Images.slice(0, 8) : [],
    latitude: h.Latitude ?? null,
    longitude: h.Longitude ?? null,
    rooms: rooms.map((r, i) => ({
      id: String(r.BookingCode ?? i),
      bookingCode: r.BookingCode ?? '',
      name: Array.isArray(r.Name) ? r.Name[0] : r.Name ?? 'Room',
      bed: r.BedTypes ?? '',
      size: '',
      guests: Number(r.MaxOccupancy ?? 2) || 2,
      amenities: Array.isArray(r.Amenities) ? r.Amenities.slice(0, 6) : [],
      price: Math.round(Number(r.TotalFare ?? 0)),
      originalPrice: Math.round(Number(r.TotalFare ?? 0)),
      mealType: r.MealType ?? '',
      freeCancel: !!r.IsRefundable,
      breakfast: String(r.MealType ?? '').toLowerCase().includes('breakfast'),
      cancelPolicies: r.CancelPolicies ?? [],
    })),
    fanReviews: [],
    tint: '#0F766E',
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = String(body.action || '').toLowerCase();

    switch (action) {
      case 'citylist': {
        const { countryCode = 'IN' } = body;
        const json = await hotelCall('CityList', { CountryCode: countryCode });
        return ok({ cities: json.CityList ?? [] });
      }

      case 'hotelcodes': {
        const { cityCode } = body;
        if (!cityCode) throw new Error('cityCode is required');
        const json = await hotelCall('TBOHotelCodeList', {
          CityCode: String(cityCode),
          IsDetailedResponse: 'false',
        });
        return ok({ hotels: json.Hotels ?? [] });
      }

      case 'search': {
        const {
          checkIn, checkOut, hotelCodes,
          adults = 2, children = 0, childrenAges = [],
          rooms = 1, guestNationality = 'IN', refundableOnly = false, mealType = 'All',
        } = body;

        if (!checkIn || !checkOut) throw new Error('checkIn and checkOut are required');
        if (!hotelCodes) throw new Error('hotelCodes is required — look them up with the hotelcodes action first');

        const paxRooms = Array.from({ length: Math.max(1, Number(rooms)) }, () => ({
          Adults: Number(adults),
          Children: Number(children),
          ChildrenAges: Array.isArray(childrenAges) ? childrenAges : [],
        }));

        const json = await hotelCall('Search', {
          CheckIn: checkIn,
          CheckOut: checkOut,
          HotelCodes: String(hotelCodes),
          GuestNationality: guestNationality,
          PaxRooms: paxRooms,
          ResponseTime: 23,
          IsDetailedResponse: true,
          Filters: { Refundable: !!refundableOnly, NoOfRooms: Number(rooms), MealType: mealType },
        });

        const list: Record<string, any>[] = json.HotelResult ?? json.HotelSearchResult ?? [];
        return ok({
          hotels: list.map((h, i) => mapHotel(h, i + 1)),
          totalResults: list.length,
        });
      }

      case 'prebook': {
        const { bookingCode, paymentMode = 'Limit' } = body;
        if (!bookingCode) throw new Error('bookingCode is required');
        const json = await hotelCall('PreBook', { BookingCode: bookingCode, PaymentMode: paymentMode });
        return ok({
          rooms: json.HotelResult?.[0]?.Rooms ?? [],
          raw: json.HotelResult ?? null,
        });
      }

      case 'book': {
        const {
          bookingCode, customerDetails, clientReferenceId,
          guestNationality = 'IN', totalFare, emailId, phoneNumber,
          bookingType = 'Voucher', paymentMode = 'Limit',
        } = body;
        if (!bookingCode || !customerDetails) {
          throw new Error('bookingCode and customerDetails are required');
        }
        const json = await hotelCall('Book', {
          BookingCode: bookingCode,
          CustomerDetails: customerDetails,
          ClientReferenceId: clientReferenceId ?? `WM-${Date.now()}`,
          BookingReferenceId: clientReferenceId ?? `WM-${Date.now()}`,
          TotalFare: totalFare,
          EmailId: emailId,
          PhoneNumber: phoneNumber,
          BookingType: bookingType,
          PaymentMode: paymentMode,
          GuestNationality: guestNationality,
        });
        return ok({ booking: json });
      }

      case 'bookingdetail': {
        const { confirmationNumber, bookingReferenceId } = body;
        if (!confirmationNumber && !bookingReferenceId) {
          throw new Error('confirmationNumber or bookingReferenceId is required');
        }
        const json = await hotelCall('BookingDetail', {
          ConfirmationNumber: confirmationNumber,
          BookingReferenceId: bookingReferenceId,
          PaymentMode: 'Limit',
        });
        return ok({ booking: json });
      }

      default:
        throw new Error(`Unknown action "${action}"`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TBO hotel request failed';
    console.error('tbo-hotels error:', message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function ok(data: Record<string, unknown>) {
  return new Response(JSON.stringify({ success: true, ...data }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
