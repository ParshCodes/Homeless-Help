import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const SAN_DIEGO_COORDS = Object.freeze({ lat: 32.7157, lng: -117.1611 });

const DEFAULT_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000,
};

const GEOLOCATION_PERMISSION = { name: 'geolocation' };

export function useDeviceLocation(options = {}) {
  const mergedOptions = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);
  const [coords, setCoords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [permission, setPermission] = useState('prompt');
  const [isSupported, setIsSupported] = useState(false);
  const watchIdRef = useRef(null);
  const mountedRef = useRef(false);

  const resolvePosition = useCallback((position) => {
    if (!position) return null;
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };
  }, []);

  const clearWatch = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (watchIdRef.current != null) {
      const nav = typeof navigator !== 'undefined' ? navigator : null;
      if (nav?.geolocation?.clearWatch) {
        nav.geolocation.clearWatch(watchIdRef.current);
      }
      watchIdRef.current = null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      const unavailableError = new Error('Geolocation is unavailable in this environment.');
      setError(unavailableError);
      setLoading(false);
      setIsSupported(false);
      return Promise.reject(unavailableError);
    }

    setIsSupported(true);
    setLoading(true);

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (!mountedRef.current) {
            resolve(null);
            return;
          }

          const nextCoords = resolvePosition(position);
          setCoords(nextCoords);
          setError(null);
          setLoading(false);
          resolve(nextCoords);
        },
        (err) => {
          if (!mountedRef.current) {
            resolve(null);
            return;
          }

          setError(err);
          setCoords(null);
          setLoading(false);
          resolve(null);
        },
        mergedOptions
      );
    });
  }, [mergedOptions, resolvePosition]);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined') {
      return () => {
        mountedRef.current = false;
      };
    }

    const nav = typeof navigator !== 'undefined' ? navigator : null;
    setIsSupported(Boolean(nav?.geolocation));

    return () => {
      mountedRef.current = false;
      clearWatch();
    };
  }, [clearWatch]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setError(() => new Error('Geolocation is unavailable in this environment.'));
      setLoading(false);
      setIsSupported(false);
      return undefined;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!mountedRef.current) return;
        const nextCoords = resolvePosition(position);
        setCoords(nextCoords);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (!mountedRef.current) return;
        setError(err);
        setCoords(null);
        setLoading(false);
      },
      mergedOptions
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current != null) {
        const nav = typeof navigator !== 'undefined' ? navigator : null;
        if (nav?.geolocation?.clearWatch) {
          nav.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = null;
      }
    };
  }, [mergedOptions, resolvePosition]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    const hasPermissionsApi =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      navigator.permissions &&
      typeof navigator.permissions.query === 'function';

    if (!hasPermissionsApi) {
      return undefined;
    }

    let cancelled = false;
    let permissionStatus;

    navigator.permissions
      .query(GEOLOCATION_PERMISSION)
      .then((status) => {
        if (cancelled) return;

        permissionStatus = status;

        const updatePermission = () => {
          if (cancelled) return;
          setPermission(status.state);
          if (status.state === 'granted') {
            requestLocation();
          }
          if (status.state === 'denied') {
            setCoords(null);
          }
        };

        updatePermission();
        status.onchange = updatePermission;
      })
      .catch(() => {
        if (!cancelled) {
          setPermission('prompt');
        }
      });

    return () => {
      cancelled = true;
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [requestLocation]);

  const coordinatePair = useMemo(() => {
    if (!coords) {
      return null;
    }

    return [coords.lat, coords.lng];
  }, [coords]);

  return {
    coords,
    resolvedCoords: coords,
    coordinatePair,
    error,
    loading,
    permission,
    isSupported,
    refresh: requestLocation,
  };
}

export default useDeviceLocation;
