import { buildRouteUrl, distanceMeters, distanceParts } from '../geo';

const almatyCenter = { lat: 43.2389, lng: 76.8897 };

describe('distanceMeters', () => {
  it('ноль до той же точки', () => {
    expect(distanceMeters(almatyCenter, almatyCenter)).toBe(0);
  });

  it('Алматы — Астана около 970 км', () => {
    const km = distanceMeters(almatyCenter, { lat: 51.1694, lng: 71.4491 }) / 1000;
    expect(km).toBeGreaterThan(950);
    expect(km).toBeLessThan(990);
  });

  it('0.0027° широты ≈ 300 м (радиус check-in)', () => {
    const m = distanceMeters(almatyCenter, {
      lat: almatyCenter.lat + 0.0027,
      lng: almatyCenter.lng,
    });
    expect(m).toBeGreaterThan(295);
    expect(m).toBeLessThan(305);
  });

  it('симметрично', () => {
    const b = { lat: 43.1574, lng: 77.059 };
    expect(distanceMeters(almatyCenter, b)).toBeCloseTo(distanceMeters(b, almatyCenter), 6);
  });
});

describe('distanceParts', () => {
  it.each([
    [347, 'ru', { value: '350', unit: 'm' }],
    [1234, 'ru', { value: '1,2', unit: 'km' }],
    [1234, 'en', { value: '1.2', unit: 'km' }],
    [18_400, 'ru', { value: '18', unit: 'km' }],
  ])('%d м (%s)', (m, locale, expected) => {
    expect(distanceParts(m, locale)).toEqual(expected);
  });
});

describe('buildRouteUrl', () => {
  const point = { lat: 43.2614, lng: 76.9666 };

  it('iOS — Apple Maps', () => {
    expect(buildRouteUrl(point, 'Парк Горького', 'ios')).toBe(
      'https://maps.apple.com/?daddr=43.2614,76.9666&q=%D0%9F%D0%B0%D1%80%D0%BA%20%D0%93%D0%BE%D1%80%D1%8C%D0%BA%D0%BE%D0%B3%D0%BE',
    );
  });

  it('Android — любое приложение карт через geo:', () => {
    expect(buildRouteUrl(point, 'Park', 'android')).toBe('geo:0,0?q=43.2614,76.9666(Park)');
  });

  it('веб — Google Maps', () => {
    expect(buildRouteUrl(point, 'Park', 'web')).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=43.2614,76.9666',
    );
  });
});
