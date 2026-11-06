# MBTA Live 🚇

A real-time tracker for Boston's MBTA subway and commuter rail. Pick a line to see every train moving on the map, tap any station for live arrival predictions, and check active service alerts.

Built with **React**, **TypeScript**, **Vite** and **Leaflet**, powered by the official [MBTA V3 API](https://www.mbta.com/developers/v3-api).

<!-- Add a screenshot: save one as docs/screenshot.png and uncomment the line below -->
<!-- ![MBTA Live screenshot](docs/screenshot.png) -->

## Features

- **Live vehicle positions** for all subway lines (Red, Orange, Blue, Green B–E, Mattapan) and 12+ commuter rail lines, with direction arrows and smooth animated movement between updates
- **Station arrival predictions** grouped by direction, counting down in real time
- **Service alerts** ranked by severity (delays, shuttles, closures)
- **Route maps** drawn from MBTA's encoded route-shape polylines, auto-fit to the selected line
- **Shareable links**: the selected line lives in the URL (`/#Orange`)
- **Rate-limit aware polling**: intervals adapt to whether an API key is set, and polling pauses when the tab is hidden
- Responsive layout that works on phones

## Getting started

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

### API key (optional)

The MBTA API works without a key, but allows only 20 requests/minute. For faster updates, [register for a free key](https://api-v3.mbta.com/register) and add it:

```bash
cp .env.example .env
# then set VITE_MBTA_API_KEY=your_key in .env
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm test` | Run unit tests (Vitest) |
| `npm run preview` | Serve the production build locally |

## How it works

```
src/
├── api/mbta.ts          # Typed client for the MBTA JSON:API (routes, shapes, stops, vehicles, predictions, alerts)
├── hooks/usePolling.ts  # Generic polling hook: interval refresh, stale-response guard, pauses when tab hidden
├── lib/polyline.ts      # Google encoded-polyline decoder for route shapes
├── lib/time.ts          # ETA / "updated 10s ago" formatting
└── components/          # MapView, RouteList, Alerts, StopPanel
```

- The MBTA API follows the [JSON:API](https://jsonapi.org/) spec. Related resources (like a vehicle's trip and stop) are side-loaded with `include=` and joined client-side, so each refresh is a **single request**.
- `usePolling` is keyed by route/stop. When you switch lines, responses still in flight for the old line are discarded, so stale data never flashes on screen.
- Vehicle markers animate with a CSS transform transition. It's turned off during map zooms so markers don't slide across the screen.

## Deploying

The included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and publishes to **GitHub Pages** on every push to `main`. In your repo, go to **Settings → Pages → Source: GitHub Actions**. To use an API key in production, add it as a repository secret named `VITE_MBTA_API_KEY`.

---

Data provided by the MBTA. This project is not affiliated with or endorsed by the MBTA.
