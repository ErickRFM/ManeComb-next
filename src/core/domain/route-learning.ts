export type GeoPoint = { latitude: number; longitude: number };

const EARTH_RADIUS_M = 6_371_000;

function toXY(point: GeoPoint, origin: GeoPoint) {
  const lat0 = origin.latitude * Math.PI / 180;
  const x = (point.longitude - origin.longitude) * Math.PI / 180 * EARTH_RADIUS_M * Math.cos(lat0);
  const y = (point.latitude - origin.latitude) * Math.PI / 180 * EARTH_RADIUS_M;
  return { x, y };
}

function segmentDistanceM(point: GeoPoint, start: GeoPoint, end: GeoPoint) {
  const origin = start;
  const p = toXY(point, origin);
  const a = toXY(start, origin);
  const b = toXY(end, origin);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  const px = a.x + t * dx;
  const py = a.y + t * dy;
  return Math.hypot(p.x - px, p.y - py);
}

export function simplifyRoute(points: GeoPoint[], toleranceM = 20): GeoPoint[] {
  if (points.length <= 2) return points.slice();
  let maxDistance = 0;
  let index = 0;
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = segmentDistanceM(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  if (maxDistance <= toleranceM) return [points[0], points[points.length - 1]];
  const left = simplifyRoute(points.slice(0, index + 1), toleranceM);
  const right = simplifyRoute(points.slice(index), toleranceM);
  return [...left.slice(0, -1), ...right];
}
