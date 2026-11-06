import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import type { Route, Stop, Vehicle } from '../api/mbta';
import type { LatLng } from '../lib/polyline';
import { formatAgo } from '../lib/time';

const BOSTON: LatLng = [42.3555, -71.0605];

const STATUS_TEXT: Record<Vehicle['status'], string> = {
  STOPPED_AT: 'Stopped at',
  INCOMING_AT: 'Arriving at',
  IN_TRANSIT_TO: 'Heading to',
};

interface Props {
  route?: Route;
  shapes: LatLng[][];
  stops: Stop[];
  vehicles: Vehicle[];
  selectedStopId: string | null;
  onSelectStop: (id: string) => void;
  now: number;
}

export function MapView({ route, shapes, stops, vehicles, selectedStopId, onSelectStop, now }: Props) {
  const color = route?.color ?? '#888';

  return (
    <MapContainer center={BOSTON} zoom={12} className="map" zoomControl={false}>
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={19}
      />
      <FitToRoute routeId={route?.id} shapes={shapes} />
      <SmoothMarkers />

      {shapes.map((points, i) => (
        <Polyline key={i} positions={points} pathOptions={{ color, weight: 5, opacity: 0.85 }} />
      ))}

      {stops.map((s) => {
        const selected = s.id === selectedStopId;
        return (
          <CircleMarker
            key={s.id}
            center={[s.lat, s.lng]}
            radius={selected ? 8 : 5}
            pathOptions={{
              color,
              weight: selected ? 4 : 2,
              fillColor: selected ? color : '#fff',
              fillOpacity: 1,
            }}
            eventHandlers={{ click: () => onSelectStop(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -6]}>
              {s.name}
            </Tooltip>
          </CircleMarker>
        );
      })}

      {vehicles.map((v) => (
        <Marker key={v.id} position={[v.lat, v.lng]} icon={vehicleIcon(color, v.bearing)} zIndexOffset={1000}>
          <Popup>
            <div className="vehicle-popup">
              <strong>{v.headsign ? `To ${v.headsign}` : route?.name}</strong>
              {v.stopName && (
                <div>
                  {STATUS_TEXT[v.status]} {v.stopName}
                </div>
              )}
              <div className="muted">
                {route?.type === 2 ? 'Train' : 'Car'} {v.label} · updated {formatAgo(Date.parse(v.updatedAt), now)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

/** Zooms the map to the selected route whenever its shape loads. */
function FitToRoute({ routeId, shapes }: { routeId?: string; shapes: LatLng[][] }) {
  const map = useMap();
  const bounds = useMemo(() => {
    const all = shapes.flat();
    return all.length ? L.latLngBounds(all) : null;
  }, [shapes]);

  useEffect(() => {
    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, routeId, bounds]);
  return null;
}

/**
 * Vehicles glide between position updates via a CSS transition on the marker.
 * The transition is switched off during zooms so markers don't slide across the map.
 */
function SmoothMarkers() {
  const map = useMapEvents({
    zoomstart: () => map.getContainer().classList.remove('animate-vehicles'),
    zoomend: () => setTimeout(() => map.getContainer().classList.add('animate-vehicles'), 50),
  });
  useEffect(() => {
    map.getContainer().classList.add('animate-vehicles');
  }, [map]);
  return null;
}

const iconCache = new Map<string, L.DivIcon>();
function vehicleIcon(color: string, bearing: number): L.DivIcon {
  const angle = Math.round(bearing / 5) * 5;
  const key = `${color}:${angle}`;
  let icon = iconCache.get(key);
  if (!icon) {
    icon = L.divIcon({
      className: 'vehicle-icon',
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -12],
      html: `<div class="vehicle" style="--c:${color}">
        <svg viewBox="0 0 24 24" style="transform:rotate(${angle}deg)"><path d="M12 3 L19 19 L12 15 L5 19 Z"/></svg>
      </div>`,
    });
    iconCache.set(key, icon);
  }
  return icon;
}
