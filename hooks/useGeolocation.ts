import { useState, useEffect, useRef } from 'react';

const TOKYO_STATION = { latitude: 35.6812, longitude: 139.7671 };

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  error: string | null;
  loading: boolean;
}

export function useGeolocation(): GeolocationState {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    error: null,
    loading: true,
  });

  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setState({
        latitude: TOKYO_STATION.latitude,
        longitude: TOKYO_STATION.longitude,
        error: 'Geolocation is not supported by this browser',
        loading: false,
      });
      return;
    }

    const onSuccess = (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        loading: false,
      });
    };

    const onError = (error: GeolocationPositionError) => {
      let message: string;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          message = 'Location permission denied';
          break;
        case error.POSITION_UNAVAILABLE:
          message = 'Location information unavailable';
          break;
        case error.TIMEOUT:
          message = 'Location request timed out';
          break;
        default:
          message = 'An unknown error occurred';
          break;
      }

      setState({
        latitude: TOKYO_STATION.latitude,
        longitude: TOKYO_STATION.longitude,
        error: message,
        loading: false,
      });
    };

    watchIdRef.current = navigator.geolocation.watchPosition(onSuccess, onError, {
      enableHighAccuracy: true,
    });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return state;
}
