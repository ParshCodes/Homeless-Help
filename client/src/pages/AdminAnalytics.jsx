import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSafeSpot } from '../context/SafeSpotContext';

const MapPanel = dynamic(() => import('../components/MapPanel'), { ssr: false });

const AdminAnalytics = () => {
  const { api, state, dispatch } = useSafeSpot();
  const [registrations, setRegistrations] = useState([]);
  const [metrics, setMetrics] = useState({ scanCount: 0 });
  const [metricsError, setMetricsError] = useState(null);

  const authHeaders = useMemo(
    () => (state.token ? { Authorization: `Bearer ${state.token}` } : {}),
    [state.token]
  );

  useEffect(() => {
    if (!state.token) return undefined;

    let cancelled = false;

    const loadRegistrations = async () => {
      try {
        const { data } = await api.get('/analytics/registrations', { headers: { ...authHeaders } });
        if (!cancelled) {
          setRegistrations(data.registrations || []);
        }
      } catch (err) {
        console.error('Failed to load registration events', err);
        if (!cancelled) {
          setRegistrations([]);
        }
      }
    };

    const loadScans = async () => {
      try {
        const { data } = await api.get('/analytics/scans?limit=200', { headers: { ...authHeaders } });
        if (!cancelled) {
          const scans = Array.isArray(data?.scans) ? data.scans : [];
          dispatch({ type: 'SET_SCANS', payload: scans });
        }
      } catch (err) {
        console.error('Failed to load scan events', err);
        if (!cancelled) {
          dispatch({ type: 'SET_SCANS', payload: [] });
        }
      }
    };

    const loadMetrics = async () => {
      try {
        const { data } = await api.get('/analytics/metrics', { headers: { ...authHeaders } });
        if (!cancelled) {
          setMetrics({ scanCount: Number(data?.scanCount) || 0 });
          setMetricsError(null);
        }
      } catch (err) {
        console.error('Failed to load scan metrics', err);
        if (!cancelled) {
          setMetrics({ scanCount: 0 });
          setMetricsError(err);
        }
      }
    };

    loadRegistrations();
    loadScans();
    loadMetrics();

    return () => {
      cancelled = true;
    };
  }, [api, authHeaders, dispatch, state.token]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Administrative Analytics</h1>
        <p className="text-sm text-slate-300">Monitor verified outreach activity across San Diego.</p>
      </header>
      <section>
        <div className="card flex flex-col gap-2 p-6">
          <h2 className="text-xl font-medium text-white">Scan Ledger</h2>
          <p className="text-sm text-slate-300">Total scans recorded</p>
          <strong className="text-4xl font-semibold text-safespot-primary">{metrics.scanCount.toLocaleString()}</strong>
          {metricsError ? (
            <span className="text-xs text-amber-300">Unable to load full history right now.</span>
          ) : null}
        </div>
      </section>
      <section className="card overflow-hidden p-2">
        <MapPanel events={state.scans} registrations={registrations} />
      </section>
    </div>
  );
};

export default AdminAnalytics;
