import { Platform } from 'react-native';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Расстояние по поверхности Земли (гаверсинус), метры. Та же формула будет в проверке check-in. */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Число и единица для перевода: 350 → «350» м, 1234 → «1,2» км (разделитель языка). */
export function distanceParts(meters: number, locale: string): { value: string; unit: 'm' | 'km' } {
  if (meters < 1000) return { value: String(Math.round(meters / 10) * 10), unit: 'm' };
  const km = meters / 1000;
  const value =
    km < 10 ? km.toLocaleString(locale, { maximumFractionDigits: 1 }) : String(Math.round(km));
  return { value, unit: 'km' };
}

/**
 * Ссылка «Построить маршрут»: на iOS — Apple Maps, на Android — любое приложение карт
 * (2GIS, Google, Яндекс) через geo:, в вебе — Google Maps.
 */
export function buildRouteUrl(
  to: LatLng,
  label: string,
  platform: typeof Platform.OS = Platform.OS,
): string {
  const coords = `${to.lat},${to.lng}`;
  switch (platform) {
    case 'ios':
      return `https://maps.apple.com/?daddr=${coords}&q=${encodeURIComponent(label)}`;
    case 'android':
      return `geo:0,0?q=${coords}(${encodeURIComponent(label)})`;
    default:
      return `https://www.google.com/maps/dir/?api=1&destination=${coords}`;
  }
}
