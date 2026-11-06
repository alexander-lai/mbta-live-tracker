import type { Prediction, Route, Stop } from '../api/mbta';
import { formatEta } from '../lib/time';

interface Props {
  route: Route;
  stops: Stop[];
  selectedStopId: string | null;
  onSelectStop: (id: string | null) => void;
  predictions?: Prediction[];
  loading: boolean;
  error?: string;
  now: number;
}

export function StopPanel({ route, stops, selectedStopId, onSelectStop, predictions, loading, error, now }: Props) {
  const stop = stops.find((s) => s.id === selectedStopId);

  return (
    <section>
      <h2 className="section-title">Arrivals</h2>
      <select
        className="stop-select"
        value={selectedStopId ?? ''}
        onChange={(e) => onSelectStop(e.target.value || null)}
        aria-label="Choose a stop"
      >
        <option value="">Choose a stop (or tap one on the map)</option>
        {stops.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      {stop && (
        <div className="predictions">
          {error && <p className="error">{error}</p>}
          {loading && <p className="muted">Loading arrivals…</p>}
          {predictions && <PredictionList route={route} predictions={predictions} now={now} />}
        </div>
      )}
    </section>
  );
}

function PredictionList({ route, predictions, now }: { route: Route; predictions: Prediction[]; now: number }) {
  const upcoming = predictions
    .map((p) => ({ ...p, eta: formatEta(p.time, now) }))
    .filter((p) => p.eta)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));

  if (!upcoming.length) return <p className="muted">No upcoming trains predicted.</p>;

  return (
    <>
      {[0, 1].map((dir) => {
        const list = upcoming.filter((p) => p.directionId === dir).slice(0, 3);
        if (!list.length) return null;
        return (
          <div key={dir} className="direction">
            <h3>
              {route.directionNames[dir]} <span className="muted">· {route.directionDestinations[dir]}</span>
            </h3>
            <ul>
              {list.map((p) => (
                <li key={p.id}>
                  <span className="trip">
                    {p.headsign ?? route.directionDestinations[dir]}
                    {p.status && <small className="muted">{p.status}</small>}
                  </span>
                  <span className={`eta${p.eta === 'Now' ? ' now' : ''}`}>{p.eta}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}
