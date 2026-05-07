import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { createSecurityHeaders } from '../utils/securityAuth';
import { resolveScannerRoleDetails } from '../constants/scannerRoles';

const SafeSpotContext = createContext();
const initialState = {
  user: null,
  role: null,
  token: null,
  alerts: [],
  scans: [],
  profiles: [],
};

const normalizeNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const normalizeScanEvent = (scan) => {
  if (!scan || typeof scan !== 'object') {
    return null;
  }

  const coords = scan.coords || {};
  const lat = normalizeNumber(coords.lat ?? coords.latitude);
  const lon = normalizeNumber(coords.lon ?? coords.lng ?? coords.longitude);

  const normalizedCoords = lat !== null && lon !== null ? { lat, lon } : undefined;

  const resolvedType = (() => {
    if (typeof scan.role === 'string' && scan.role.trim()) {
      return scan.role.trim();
    }

    if (typeof scan.type === 'string' && scan.type.trim()) {
      return scan.type.trim();
    }

    return 'Outreach';
  })();

  return {
    _id: scan._id || scan.id || null,
    type: resolvedType,
    coords: normalizedCoords,
    timestamp: scan.timestamp || scan.createdAt || scan.updatedAt || null,
    name: scan.name,
    address: scan.address || coords.address,
    barcodeId: scan.barcodeId,
    personId: scan.personId || scan.user_id || scan.userId || null,
    orgId: scan.orgId || scan.org_id || null,
    role: scan.role || scan.scanRole || null,
  };
};

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':
      return { ...state, user: action.payload.user, role: action.payload.role, token: action.payload.token };
    case 'SET_ALERTS':
      return { ...state, alerts: action.payload };
    case 'PUSH_ALERT':
      return { ...state, alerts: [action.payload, ...state.alerts] };
    case 'SET_SCANS':
      return {
        ...state,
        scans: Array.isArray(action.payload)
          ? action.payload.map((scan) => normalizeScanEvent(scan)).filter(Boolean)
          : [],
      };
    case 'PUSH_SCAN': {
      const normalized = normalizeScanEvent(action.payload);
      if (!normalized) {
        return state;
      }
      return { ...state, scans: [normalized, ...state.scans] };
    }
    case 'SET_PROFILES':
      return { ...state, profiles: action.payload };
    case 'CLEAR_AUTH':
      return { ...state, token: null, user: null, role: null };
    default:
      return state;
  }
}

export function SafeSpotProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loginPromiseRef = useRef(null);
  const loginStateRef = useRef({ role: resolveScannerRoleDetails().authRole });

  const api = useMemo(
    () =>
      axios.create({
        baseURL: (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api').replace(/\/$/, ''),
      }),
    []
  );

  const setAuth = useCallback((payload) => {
    if (!payload) {
      return;
    }

    dispatch({ type: 'SET_AUTH', payload });
  }, [dispatch]);

  const clearAuth = useCallback(() => {
    dispatch({ type: 'CLEAR_AUTH' });
  }, [dispatch]);

  const performLogin = useCallback(
    async (roleOverride) => {
      const requestedRole = roleOverride || loginStateRef.current.role || resolveScannerRoleDetails().authRole;

      if (loginPromiseRef.current?.role === requestedRole) {
        return loginPromiseRef.current.promise;
      }

      const loginPromise = (async () => {
        const { data } = await api.post('/auth/login', {
          email: 'admin@carevault.local',
          role: requestedRole,
        });

        const payload = { ...data, role: requestedRole };
        setAuth(payload);
        loginStateRef.current.role = requestedRole;
        return payload;
      })();

      loginPromiseRef.current = { role: requestedRole, promise: loginPromise };

      try {
        return await loginPromise;
      } finally {
        loginPromiseRef.current = null;
      }
    },
    [api, setAuth]
  );

  const setScannerRole = useCallback(
    async (role) => {
      if (!role) {
        return null;
      }

      loginStateRef.current.role = role;
      return performLogin(role);
    },
    [performLogin]
  );

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5050');
    socket.on('connect', () => console.info('Socket connected'));
    socket.on('emergency-alert', (alert) => {
      dispatch({ type: 'PUSH_ALERT', payload: alert });
    });
    socket.on('scan-event', (scan) => {
      dispatch({ type: 'PUSH_SCAN', payload: scan });
    });
    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (state.token) {
      api.defaults.headers.common.Authorization = `Bearer ${state.token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [state.token, api]);

  useEffect(() => {
    if (typeof window === 'undefined' || state.token) {
      return undefined;
    }

    let cancelled = false;

    const bootstrapAuth = async () => {
      try {
        const stored = window.localStorage.getItem('safespot-auth');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (!cancelled && parsed?.token) {
              setAuth(parsed);
              if (parsed.role) {
                loginStateRef.current.role = parsed.role;
              }
              return;
            }
            window.localStorage.removeItem('safespot-auth');
          } catch (error) {
            window.localStorage.removeItem('safespot-auth');
          }
          if (!cancelled) {
            await performLogin();
          }
          return;
        }

        await performLogin();
      } catch (error) {
        console.error('Failed to bootstrap SafeSpot auth', error);
      }
    };

    bootstrapAuth();

    return () => {
      cancelled = true;
    };
  }, [performLogin, setAuth, state.token]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    if (state.token) {
      window.localStorage.setItem(
        'safespot-auth',
        JSON.stringify({ token: state.token, user: state.user, role: state.role })
      );
    } else {
      window.localStorage.removeItem('safespot-auth');
    }

    return undefined;
  }, [state.token, state.user, state.role]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const interceptorId = api.interceptors.request.use(async (config) => {
      const method = (config.method || 'get').toLowerCase();

      if (['post', 'put'].includes(method) && (config.url?.includes('/person') || config.url?.includes('/uploads'))) {
        const fullUrl = config.url?.startsWith('http')
          ? config.url
          : `${api.defaults.baseURL}${config.url?.startsWith('/') ? '' : '/'}${config.url}`;

        let payload = config.data;
        if (typeof payload === 'string') {
          try {
            payload = JSON.parse(payload);
          } catch (error) {
            payload = {};
          }
        }

        const securityHeaders = await createSecurityHeaders({
          url: fullUrl,
          method: method.toUpperCase(),
          body: payload,
        });
        config.headers = { ...config.headers, ...securityHeaders };
      }

      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptorId);
    };
  }, [api]);

  useEffect(() => {
    const interceptorId = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const status = error?.response?.status;
        const originalRequest = error?.config;

        if (
          status === 401 &&
          originalRequest &&
          !originalRequest._retry &&
          typeof originalRequest.url === 'string' &&
          !originalRequest.url.includes('/auth/login')
        ) {
          originalRequest._retry = true;

          try {
            const refreshed = await performLogin();
            const refreshedToken = refreshed?.token;

            if (refreshedToken) {
              originalRequest.headers = {
                ...(originalRequest.headers || {}),
                Authorization: `Bearer ${refreshedToken}`,
              };
              return api(originalRequest);
            }
          } catch (authError) {
            console.error('Failed to refresh authentication after 401', authError);
          }

          clearAuth();
        }

        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptorId);
    };
  }, [api, clearAuth, performLogin]);

  const value = { state, dispatch, api, setScannerRole, performLogin };

  return <SafeSpotContext.Provider value={value}>{children}</SafeSpotContext.Provider>;
}

export function useSafeSpot() {
  const ctx = useContext(SafeSpotContext);
  if (!ctx) {
    throw new Error('SafeSpot context must be used within provider');
  }
  return ctx;
}
