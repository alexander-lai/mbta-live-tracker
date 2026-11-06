import type { Route } from '../api/mbta';

interface Props {
  routes: Route[];
  selectedId: string;
  onSelect: (id: string) => void;
}

export function RouteList({ routes, selectedId, onSelect }: Props) {
  const subway = routes.filter((r) => r.type === 0 || r.type === 1);
  const commuter = routes.filter((r) => r.type === 2);

  return (
    <nav className="routes">
      <RouteGroup title="Subway" routes={subway} selectedId={selectedId} onSelect={onSelect} />
      <RouteGroup
        title="Commuter Rail"
        routes={commuter}
        selectedId={selectedId}
        onSelect={onSelect}
        label={(r) => r.name.replace(/ Line$/, '')}
      />
    </nav>
  );
}

function RouteGroup({
  title,
  routes,
  selectedId,
  onSelect,
  label = (r) => r.shortName || r.name.replace(/ Line$/, ''),
}: Props & { title: string; label?: (r: Route) => string }) {
  if (!routes.length) return null;
  return (
    <section>
      <h2 className="section-title">{title}</h2>
      <div className="route-pills">
        {routes.map((r) => {
          const active = r.id === selectedId;
          return (
            <button
              key={r.id}
              className={`route-pill${active ? ' active' : ''}`}
              style={{ '--c': r.color, '--tc': r.textColor } as React.CSSProperties}
              onClick={() => onSelect(r.id)}
              aria-pressed={active}
              title={r.name}
            >
              {r.id.startsWith('Green-') ? `Green ${r.shortName}` : label(r)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
