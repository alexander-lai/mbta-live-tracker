import { decodePolyline, type LatLng } from '../lib/polyline';

/**
 * Thin client for the MBTA V3 API (https://api-v3.mbta.com), which follows the
 * JSON:API spec: every response has `data` plus optional `included` side-loads.
 */

const BASE_URL = 'https://api-v3.mbta.com';
export const API_KEY = (import.meta.env.VITE_MBTA_API_KEY as string | undefined) || undefined;

type Ref = { id: string; type: string };
interface Resource<A> {
  id: string;
  type: string;
  attributes: A;
  relationships?: Record<string, { data: Ref | Ref[] | null }>;
}
interface Document<A> {
  data: Resource<A>[];
  included?: Resource<any>[];
}

async function get<A>(path: string, params: Record<string, string>): Promise<Document<A>> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // Query param (not header) so the browser doesn't need a CORS preflight.
  if (API_KEY) url.searchParams.set('api_key', API_KEY);

  const res = await fetch(url);
  if (res.status === 429) {
    throw new Error('Rate limited by the MBTA API. Add a free API key to go faster (see README).');
  }
  if (!res.ok) throw new Error(`MBTA API error (${res.status})`);
  return res.json();
}

function relId(r: Resource<unknown>, name: string): string | undefined {
  const data = r.relationships?.[name]?.data;
  return data && !Array.isArray(data) ? data.id : undefined;
}

function indexIncluded(doc: Document<unknown>) {
  const map = new Map<string, Resource<any>>();
  for (const r of doc.included ?? []) map.set(`${r.type}:${r.id}`, r);
  return (type: string, id: string | undefined) => (id ? map.get(`${type}:${id}`) : undefined);
}

// ---------- Routes ----------

export interface Route {
  id: string;
  name: string;
  shortName: string;
  /** 0 = light rail, 1 = subway, 2 = commuter rail */
  type: number;
  color: string;
  textColor: string;
  directionNames: string[];
  directionDestinations: string[];
}

export async function fetchRoutes(): Promise<Route[]> {
  const doc = await get<any>('/routes', { 'filter[type]': '0,1,2', sort: 'sort_order' });
  return doc.data.map((r) => ({
    id: r.id,
    name: r.attributes.long_name,
    shortName: r.attributes.short_name,
    type: r.attributes.type,
    color: `#${r.attributes.color}`,
    textColor: `#${r.attributes.text_color}`,
    directionNames: r.attributes.direction_names ?? [],
    directionDestinations: r.attributes.direction_destinations ?? [],
  }));
}

// ---------- Shapes (the line drawn on the map) ----------

/** Returns one polyline per typical route pattern (e.g. both Red Line branches). */
export async function fetchRouteShapes(routeId: string): Promise<LatLng[][]> {
  const doc = await get<any>('/route_patterns', {
    'filter[route]': routeId,
    include: 'representative_trip.shape',
  });
  const lookup = indexIncluded(doc);
  const typical = doc.data.filter((p) => p.attributes.typicality === 1);
  const patterns = typical.length ? typical : doc.data;

  const seen = new Set<string>();
  const shapes: LatLng[][] = [];
  for (const p of patterns) {
    const trip = lookup('trip', relId(p, 'representative_trip'));
    const shape = trip && lookup('shape', relId(trip, 'shape'));
    if (shape && !seen.has(shape.id) && shape.attributes.polyline) {
      seen.add(shape.id);
      shapes.push(decodePolyline(shape.attributes.polyline));
    }
  }
  return shapes;
}

// ---------- Stops ----------

export interface Stop {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export async function fetchStops(routeId: string): Promise<Stop[]> {
  const doc = await get<any>('/stops', { 'filter[route]': routeId });
  return doc.data.map((s) => ({
    id: s.id,
    name: s.attributes.name,
    lat: s.attributes.latitude,
    lng: s.attributes.longitude,
  }));
}

// ---------- Vehicles (live positions) ----------

export type VehicleStatus = 'IN_TRANSIT_TO' | 'STOPPED_AT' | 'INCOMING_AT';

export interface Vehicle {
  id: string;
  label: string;
  lat: number;
  lng: number;
  bearing: number;
  directionId: number;
  status: VehicleStatus;
  headsign?: string;
  stopName?: string;
  updatedAt: string;
}

export async function fetchVehicles(routeId: string): Promise<Vehicle[]> {
  const doc = await get<any>('/vehicles', { 'filter[route]': routeId, include: 'trip,stop' });
  const lookup = indexIncluded(doc);
  return doc.data
    .filter((v) => v.attributes.latitude != null && v.attributes.longitude != null)
    .map((v) => ({
      id: v.id,
      label: v.attributes.label,
      lat: v.attributes.latitude,
      lng: v.attributes.longitude,
      bearing: v.attributes.bearing ?? 0,
      directionId: v.attributes.direction_id,
      status: v.attributes.current_status,
      headsign: lookup('trip', relId(v, 'trip'))?.attributes.headsign,
      stopName: lookup('stop', relId(v, 'stop'))?.attributes.name,
      updatedAt: v.attributes.updated_at,
    }));
}

// ---------- Predictions (arrival times at a stop) ----------

export interface Prediction {
  id: string;
  directionId: number;
  time: string;
  status?: string;
  headsign?: string;
}

export async function fetchPredictions(stopId: string, routeId: string): Promise<Prediction[]> {
  const doc = await get<any>('/predictions', {
    'filter[stop]': stopId,
    'filter[route]': routeId,
    include: 'trip',
    sort: 'time',
  });
  const lookup = indexIncluded(doc);
  return doc.data
    .map((p) => ({
      id: p.id,
      directionId: p.attributes.direction_id,
      time: p.attributes.arrival_time ?? p.attributes.departure_time,
      status: p.attributes.status ?? undefined,
      headsign: lookup('trip', relId(p, 'trip'))?.attributes.headsign,
    }))
    .filter((p) => p.time);
}

// ---------- Alerts ----------

export interface Alert {
  id: string;
  header: string;
  effect: string;
  severity: number;
  lifecycle: string;
}

export async function fetchAlerts(routeId: string): Promise<Alert[]> {
  const doc = await get<any>('/alerts', {
    'filter[route]': routeId,
    'filter[datetime]': 'NOW',
  });
  return doc.data
    .map((a) => ({
      id: a.id,
      header: a.attributes.header,
      effect: a.attributes.effect,
      severity: a.attributes.severity,
      lifecycle: a.attributes.lifecycle,
    }))
    .sort((a, b) => b.severity - a.severity);
}
