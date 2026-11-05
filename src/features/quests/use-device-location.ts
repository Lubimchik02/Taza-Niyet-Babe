import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { LatLng } from './geo';

type Status = 'unknown' | 'granted' | 'denied' | 'loading';

/**
 * Местоположение устройства. Разрешение не запрашивается само — только по кнопке,
 * но если оно уже выдано, координаты берутся сразу.
 */
export function useDeviceLocation() {
  const [coords, setCoords] = useState<LatLng | null>(null);
  const [status, setStatus] = useState<Status>('unknown');

  const read = useCallback(async () => {
    setStatus('loading');
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setStatus('granted');
    } catch {
      setStatus('denied');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Location.getForegroundPermissionsAsync()
      .then((p) => {
        if (!cancelled && p.granted) void read();
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [read]);

  const request = useCallback(async () => {
    const p = await Location.requestForegroundPermissionsAsync();
    if (p.granted) await read();
    else setStatus('denied');
  }, [read]);

  return { coords, status, request };
}
