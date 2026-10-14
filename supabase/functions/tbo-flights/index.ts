import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SHARED_BASE = 'http://Sharedapi.tektravels.com/SharedData.svc/rest';
const AIR_BASE = 'http://api.tektravels.com/BookingEngineService_Air/AirService.svc/rest';

const AIRLINE_LOGOS: Record<string, string> = {
  '6E': '🟦', AI: '🔴', UK: '🟪', QP: '🟧', IX: '🟥', SG: '🟨', G8: '🟩',
};

let cachedToken: { id: string; at: number } | null = null;

function endUserIp(): string {
  return Deno.env.get('TBO_END_USER_IP') || '1.1.1.1';
}

async function tboPost(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`TBO returned non-JSON (${res.status}): ${text.slice(0, 200)}`);
  }
  return json;
}

async function authenticate(force = false): Promise<string> {
  if (!force && cachedToken && Date.now() - cachedToken.at < 1000 * 60 * 50) {
    return cachedToken.id;
  }

  const userName = Deno.env.get('TBO_USERNAME');
  const password = Deno.env.get('TBO_PASSWORD');
  if (!userName || !password) throw new Error('TBO_USERNAME / TBO_PASSWORD not configured');

  const data = await tboPost(`${SHARED_BASE}/Authenticate`, {
    ClientId: Deno.env.get('TBO_CLIENT_ID') || 'ApiIntegrationNew',
    UserName: userName,
    Password: password,
    EndUserIp: endUserIp(),
  }) as { Status?: number; TokenId?: string; Error?: { ErrorMessage?: string } };

  if (data.Status !== 1 || !data.TokenId) {
    throw new Error(data.Error?.ErrorMessage || 'TBO authentication failed');
  }

  cachedToken = { id: data.TokenId, at: Date.now() };
  return data.TokenId;
}

/** Runs a TBO air call, re-authenticating once if the token has gone stale. */
async function airCall(path: string, payload: Record<string, unknown>) {
  const run = async (token: string) =>
    await tboPost(`${AIR_BASE}/${path}`, { ...payload, EndUserIp: endUserIp(), TokenId: token });

  let token = await authenticate();
  let json = await run(token) as { Response?: { Error?: { ErrorCode?: number; ErrorMessage?: string } } };

  // ErrorCode 6 = invalid/expired token — retry once with a fresh one.
  if (json?.Response?.Error?.ErrorCode === 6) {
    token = await authenticate(true);
    json = await run(token) as typeof json;
  }

  const err = json?.Response?.Error;
  if (err && err.ErrorCode !== 0) {
    throw new Error(err.ErrorMessage || `TBO ${path} failed (code ${err.ErrorCode})`);
  }
  return json;
}

function hhmm(iso: string): string {
  if (!iso) return '';
  const t = iso.split('T')[1] ?? '';
  return t.slice(0, 5);
}

function durationLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

interface TboSegment {
  Airline: { AirlineCode: string; AirlineName: string; FlightNumber: string; FareClass: string };
  Origin: { Airport: Record<string, string>; DepTime: string };
  Destination: { Airport: Record<string, string>; ArrTime: string };
  Duration: number;
  GroundTime: number;
  Baggage?: string;
  CabinBaggage?: string;
  NoOfSeatAvailable?: number;
  Craft?: string;
}

/** Collapses one TBO itinerary into the flat shape the app's flight list renders. */
function mapFlight(result: Record<string, any>, traceId: string, id: number) {
  const legs: TboSegment[] = (result.Segments ?? []).flat();
  if (legs.length === 0) return null;

  const first = legs[0];
  const last = legs[legs.length - 1];
  const stops = Math.min(legs.length - 1, 2) as 0 | 1 | 2;

  const travelMins = legs.reduce((sum, s) => sum + (s.Duration ?? 0) + (s.GroundTime ?? 0), 0);
  const fare = result.Fare ?? {};
  const published = Math.round(fare.PublishedFare ?? 0);
  const offered = Math.round(fare.OfferedFare ?? published);

  // TBO reports a connection's wait time as GroundTime on the *arriving* leg,
  // so the stopover airport comes from the leg before it.
  const connecting = legs.length > 1 ? legs[1] : null;

  return {
    id,
    resultIndex: result.ResultIndex,
    traceId,
    isLCC: !!result.IsLCC,
    source: result.Source,

    airline: first.Airline.AirlineName,
    airlineName: first.Airline.AirlineName,
    airlineCode: first.Airline.AirlineCode,
    flightNumber: `${first.Airline.AirlineCode}-${first.Airline.FlightNumber}`,
    logo: AIRLINE_LOGOS[first.Airline.AirlineCode] ?? '✈️',

    depart: hhmm(first.Origin.DepTime),
    arrive: hhmm(last.Destination.ArrTime),
    departTime: first.Origin.DepTime,
    arriveTime: last.Destination.ArrTime,

    fromCode: first.Origin.Airport.AirportCode,
    toCode: last.Destination.Airport.AirportCode,
    depAirport: first.Origin.Airport.AirportCode,
    arrAirport: last.Destination.Airport.AirportCode,
    depTerminal: first.Origin.Airport.Terminal ?? '',
    arrTerminal: last.Destination.Airport.Terminal ?? '',
    depCity: first.Origin.Airport.CityName,
    arrCity: last.Destination.Airport.CityName,

    duration: durationLabel(travelMins),
    durationMins: travelMins,
    stops,
    layoverAirport: connecting ? legs[0].Destination.Airport.AirportCode : undefined,
    layoverMins: connecting ? connecting.GroundTime : undefined,

    price: offered,
    originalPrice: published,
    baseFare: Math.round(fare.BaseFare ?? 0),
    tax: Math.round(fare.Tax ?? 0),
    currency: fare.Currency ?? 'INR',

    refundable: !!result.IsRefundable,
    fareType: result.ResultFareType ?? '',
    fareClass: result.FareClassification?.Type ?? '',
    baggage: first.Baggage ?? '',
    cabinBaggage: first.CabinBaggage ?? '',
    seatsAvailable: first.NoOfSeatAvailable ?? 0,
    craft: first.Craft ?? '',

    isPanRequired: !!result.IsPanRequiredAtBook,
    isPassportRequired: !!result.IsPassportRequiredAtBook,
    isHoldAllowed: !!result.IsHoldAllowed,
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
      case 'search': {
        const {
          origin, destination, departDate, returnDate,
          adults = 1, children = 0, infants = 0,
          cabinClass = 1, directOnly = false, preferredAirlines = null,
        } = body;

        if (!origin || !destination || !departDate) {
          throw new Error('origin, destination and departDate are required');
        }

        const segments = [{
          Origin: String(origin).toUpperCase(),
          Destination: String(destination).toUpperCase(),
          FlightCabinClass: String(cabinClass),
          PreferredDepartureTime: `${departDate}T00:00:00`,
          PreferredArrivalTime: `${departDate}T00:00:00`,
        }];

        if (returnDate) {
          segments.push({
            Origin: String(destination).toUpperCase(),
            Destination: String(origin).toUpperCase(),
            FlightCabinClass: String(cabinClass),
            PreferredDepartureTime: `${returnDate}T00:00:00`,
            PreferredArrivalTime: `${returnDate}T00:00:00`,
          });
        }

        const json = await airCall('Search', {
          AdultCount: String(adults),
          ChildCount: String(children),
          InfantCount: String(infants),
          DirectFlight: String(!!directOnly),
          OneStopFlight: 'false',
          JourneyType: returnDate ? '2' : '1',
          PreferredAirlines: preferredAirlines,
          Segments: segments,
          Sources: null,
        }) as { Response: { TraceId: string; Results?: Record<string, any>[][] } };

        const traceId = json.Response.TraceId;
        const groups = json.Response.Results ?? [];

        let counter = 0;
        const mapped = groups.map((group) =>
          group.map((r) => mapFlight(r, traceId, ++counter)).filter(Boolean),
        );

        return ok({
          traceId,
          isReturn: !!returnDate,
          outbound: mapped[0] ?? [],
          inbound: mapped[1] ?? [],
          totalResults: mapped.reduce((n, g) => n + g.length, 0),
        });
      }

      case 'farerule': {
        const { traceId, resultIndex } = body;
        if (!traceId || !resultIndex) throw new Error('traceId and resultIndex are required');
        const json = await airCall('FareRule', { TraceId: traceId, ResultIndex: resultIndex }) as
          { Response: { FareRules?: Record<string, any>[] } };
        return ok({ fareRules: json.Response.FareRules ?? [] });
      }

      case 'farequote': {
        const { traceId, resultIndex } = body;
        if (!traceId || !resultIndex) throw new Error('traceId and resultIndex are required');
        const json = await airCall('FareQuote', { TraceId: traceId, ResultIndex: resultIndex }) as
          { Response: { Results?: Record<string, any>; IsPriceChanged?: boolean } };

        const r = json.Response.Results;
        if (!r) throw new Error('Fare is no longer available. Please search again.');

        const quoted = mapFlight(r, traceId, 0);
        return ok({
          isPriceChanged: !!json.Response.IsPriceChanged,
          flight: quoted,
          fare: r.Fare,
          fareBreakdown: r.FareBreakdown ?? [],
          isPanRequiredAtBook: !!r.IsPanRequiredAtBook,
          isPassportRequiredAtBook: !!r.IsPassportRequiredAtBook,
          isGSTMandatory: !!r.IsGSTMandatory,
          isLCC: !!r.IsLCC,
        });
      }

      case 'ssr': {
        const { traceId, resultIndex } = body;
        if (!traceId || !resultIndex) throw new Error('traceId and resultIndex are required');
        const json = await airCall('SSR', { TraceId: traceId, ResultIndex: resultIndex }) as
          { Response: Record<string, any> };
        const r = json.Response ?? {};
        return ok({
          seats: r.SeatDynamic ?? r.SeatPreference ?? [],
          meals: r.MealDynamic ?? r.Meal ?? [],
          baggage: r.Baggage ?? [],
        });
      }

      case 'book': {
        const { traceId, resultIndex, passengers } = body;
        if (!traceId || !resultIndex || !Array.isArray(passengers) || passengers.length === 0) {
          throw new Error('traceId, resultIndex and passengers are required');
        }
        const json = await airCall('Book', {
          TraceId: traceId, ResultIndex: resultIndex, Passengers: passengers,
        }) as { Response: Record<string, any> };
        return ok({ booking: json.Response.Response ?? json.Response });
      }

      case 'ticket': {
        const { traceId, resultIndex, passengers, pnr, bookingId } = body;
        if (!traceId) throw new Error('traceId is required');
        // LCC fares ticket straight from the result; non-LCC ticket an existing booking.
        const payload: Record<string, unknown> = { TraceId: traceId };
        if (pnr && bookingId) {
          payload.PNR = pnr;
          payload.BookingId = bookingId;
        } else {
          payload.ResultIndex = resultIndex;
          payload.Passengers = passengers;
        }
        const json = await airCall('Ticket', payload) as { Response: Record<string, any> };
        return ok({ ticket: json.Response.Response ?? json.Response });
      }

      case 'bookingdetails': {
        const { pnr, bookingId, traceId } = body;
        if (!bookingId) throw new Error('bookingId is required');
        const json = await airCall('GetBookingDetails', {
          BookingId: bookingId, PNR: pnr, TraceId: traceId,
        }) as { Response: Record<string, any> };
        return ok({ booking: json.Response.Response ?? json.Response });
      }

      default:
        throw new Error(`Unknown action "${action}"`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'TBO request failed';
    console.error('tbo-flights error:', message);
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
