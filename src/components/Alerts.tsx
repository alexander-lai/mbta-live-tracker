import { useState } from 'react';
import type { Alert } from '../api/mbta';

const EFFECT_LABEL: Record<string, string> = {
  DELAY: 'Delay',
  SHUTTLE: 'Shuttle',
  SUSPENSION: 'Suspension',
  STATION_CLOSURE: 'Station closed',
  STOP_CLOSURE: 'Stop closed',
  DETOUR: 'Detour',
  TRACK_CHANGE: 'Track change',
  SERVICE_CHANGE: 'Service change',
  ELEVATOR_CLOSURE: 'Elevator',
  ESCALATOR_CLOSURE: 'Escalator',
};

export function Alerts({ alerts }: { alerts: Alert[] }) {
  const [expanded, setExpanded] = useState(false);
  // Accessibility (elevator/escalator) alerts are numerous; show service-impacting ones first.
  const service = alerts.filter((a) => !/ELEVATOR|ESCALATOR/.test(a.effect));
  const shown = expanded ? alerts : service.slice(0, 3);

  if (!alerts.length) {
    return <p className="ok">✓ No active alerts. Good service.</p>;
  }

  return (
    <section>
      <h2 className="section-title">
        Alerts <span className="count">{alerts.length}</span>
      </h2>
      <ul className="alerts">
        {shown.map((a) => (
          <li key={a.id} className={`alert sev-${a.severity >= 7 ? 'high' : a.severity >= 4 ? 'mid' : 'low'}`}>
            <span className="alert-tag">{EFFECT_LABEL[a.effect] ?? a.effect.replace(/_/g, ' ').toLowerCase()}</span>
            {a.header}
          </li>
        ))}
      </ul>
      {alerts.length > shown.length && (
        <button className="link" onClick={() => setExpanded(true)}>
          Show all {alerts.length} alerts
        </button>
      )}
      {expanded && service.length > 3 && (
        <button className="link" onClick={() => setExpanded(false)}>
          Show fewer
        </button>
      )}
    </section>
  );
}
