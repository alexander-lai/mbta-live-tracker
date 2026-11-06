export type LatLng = [number, number];

/**
 * Decodes a Google encoded polyline (the format MBTA uses for route shapes)
 * into [lat, lng] pairs. See:
 * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(encoded: string): LatLng[] {
  const coords: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  const nextValue = (): number => {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (index < encoded.length) {
    lat += nextValue();
    lng += nextValue();
    coords.push([lat / 1e5, lng / 1e5]);
  }
  return coords;
}
