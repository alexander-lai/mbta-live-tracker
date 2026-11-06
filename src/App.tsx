import { useEffect, useState } from 'react';
import {
  API_KEY,
  fetchAlerts,
  fetchPredictions,
  fetchRouteShapes,
  fetchRoutes,
  fetchStops,
  fetchVehicles,
} from './api/mbta';
import { Alerts } from './components/Alerts';
import { MapView } from './components/MapView';
import { RouteList } from './components/RouteList';
import { StopPanel } from './components/StopPanel';
import { useNow, usePolling } from './hooks/usePolling';
import { formatAgo } from './lib/time';

// Without an API key MBTA allows 20 req/min, so poll more gently.
const VEHICLE_MS = API_KEY ? 5_000 : 15_000;
const PREDICTION_MS = API_KEY ? 10_000 : 20_000;
const ALERT_MS = 120_000;

const initialRoute = () => decodeURIComponent(window.location.hash.slice(1)) || 'Red';

export default function App() {
  const [routeId, setRouteId] = useState(initialRoute);
  const [stopId, setStopId] = useState<string | null>(null);
  const now = useNow(1000);

  // Keep the selected line in the URL so links are shareable (…#Orange).
  useEffect(() => {
    window.history.replaceState(null, '', `#${encodeURIComponent(routeId)}`);
  }, [routeId]);

  const selectRoute = (id: string) => {
    setRouteId(id);
    setStopId(null);
  };

  const routes = usePolling('routes', fetchRoutes, 0);
  const shapes = usePolling(`shapes:${routeId}`, () => fetchRouteShapes(routeId), 0);
  const stops = usePolling(`stops:${routeId}`, () => fetchStops(routeId), 0);
  const vehicles = usePolling(`vehicles:${routeId}`, () => fetchVehicles(routeId), VEHICLE_MS);
  const alerts = usePolling(`alerts:${routeId}`, () => fetchAlerts(routeId), ALERT_MS);
  const predictions = usePolling(
    stopId ? `predictions:${routeId}:${stopId}` : null,
    () => fetchPredictions(stopId!, routeId),
    PREDICTION_MS,
  );

  const route = routes.data?.find((r) => r.id === routeId);
  const vehicleList = vehicles.data ?? [];
  const byDirection = [0, 1].map((d) => vehicleList.filter((v) => v.directionId === d).length);
  const error = routes.error ?? vehicles.error ?? shapes.error;

  return (
    <div className="app">
      <aside className="sidebar">
        <header className="brand">
          <div className="logo">T</div>
          <div>
            <h1>MBTA Live</h1>
            <p className="muted">
              <span className={`live-dot${vehicles.error ? ' stale' : ''}`} />
              {vehicles.updatedAt ? `Updated ${formatAgo(vehicles.updatedAt, now)}` : 'Connecting…'}
            </p>
          </div>
        </header>

        {error && <p className="error">{error}</p>}

        {routes.data && <RouteList routes={routes.data} selectedId={routeId} onSelect={selectRoute} />}

        {route && (
          <>
            <section className="summary" style={{ '--c': route.color } as React.CSSProperties}>
              <h2>{route.name}</h2>
              <div className="stats">
                <Stat value={vehicleList.length} label="trains running" />
                {[0, 1].map((d) => (
                  <Stat key={d} value={byDirection[d]} label={`to ${route.directionDestinations[d] ?? '—'}`} />
                ))}
              </div>
            </section>

            {alerts.data && <Alerts alerts={alerts.data} />}

            <StopPanel
              route={route}
              stops={stops.data ?? []}
              selectedStopId={stopId}
              onSelectStop={setStopId}
              predictions={predictions.data}
              loading={predictions.loading}
              error={predictions.error}
              now={now}
            />
          </>
        )}

        <footer className="muted">
          Live data from the <a href="https://www.mbta.com/developers/v3-api">MBTA V3 API</a>. Not affiliated
          with the MBTA.
        </footer>
      </aside>

      <main className="map-wrap">
        <MapView
          route={route}
          shapes={shapes.data ?? []}
          stops={stops.data ?? []}
          vehicles={vehicleList}
          selectedStopId={stopId}
          onSelectStop={setStopId}
          now={now}
        />
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
