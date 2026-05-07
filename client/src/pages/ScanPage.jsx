"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useSafeSpot } from '../context/SafeSpotContext';
import useDeviceLocation from '../hooks/useDeviceLocation';
import { resolveScannerRoleDetails } from '../constants/scannerRoles';

const BarcodeScannerComponent = dynamic(
  () =>
    import('react-qr-barcode-scanner').then((mod) => mod.BarcodeScannerComponent),
  { ssr: false }
);

const ScanPage = () => {
  const [barcodeInput, setBarcodeInput] = useState('');
  const [detectedCode, setDetectedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [person, setPerson] = useState(null);
  const [error, setError] = useState('');
  const [eligibility, setEligibility] = useState(null);
  const [eligibilityError, setEligibilityError] = useState('');
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [pendingScanId, setPendingScanId] = useState(null);
  const router = useRouter();
  const { api, state } = useSafeSpot();
  const {
    resolvedCoords,
    loading: locating,
    error: locationError,
    refresh: requestDeviceLocation,
    isSupported: isDeviceLocationSupported,
    permission: locationPermission,
  } = useDeviceLocation();
  const apiBase = useMemo(() => {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api';
  }, []);

  const assetBase = useMemo(() => {
    const normalized = (apiBase || '').replace(/\/$/, '');
    return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized;
  }, [apiBase]);

  const roleDetails = useMemo(() => resolveScannerRoleDetails(state.role), [state.role]);
  const permissions = roleDetails.permissions;

  const resolveAssetUrl = useCallback(
    (path) => {
      if (!path) return null;
      if (/^https?:/i.test(path)) {
        return path;
      }

      const base = assetBase.replace(/\/$/, '');
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      return `${base}${normalizedPath}`;
    },
    [assetBase]
  );

  const formattedDob = useMemo(() => {
    if (!person?.dateOfBirth) return null;
    const parsed = new Date(person.dateOfBirth);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString();
  }, [person?.dateOfBirth]);

  const eligibilityPresentation = useMemo(() => {
    if (!eligibility) return null;

    switch (eligibility.status) {
      case 'active':
        return {
          eligibilityLabel: 'Eligible',
          statusLabel: 'Active',
          badgeClass: 'border border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
          statusClass: 'text-emerald-300',
        };
      case 'inactive':
        return {
          eligibilityLabel: 'Ineligible',
          statusLabel: 'Inactive',
          badgeClass: 'border border-amber-500/40 bg-amber-500/10 text-amber-200',
          statusClass: 'text-amber-300',
        };
      case 'not-found':
        return {
          eligibilityLabel: 'Not Found',
          statusLabel: 'No record located',
          badgeClass: 'border border-rose-500/40 bg-rose-500/10 text-rose-200',
          statusClass: 'text-rose-300',
        };
      default:
        return {
          eligibilityLabel: 'Unavailable',
          statusLabel: String(eligibility.status),
          badgeClass: 'border border-slate-500/40 bg-slate-800/60 text-slate-200',
          statusClass: 'text-slate-300',
        };
    }
  }, [eligibility]);

  useEffect(() => {
    setEligibility(null);
    setEligibilityError('');
    setEligibilityLoading(false);
  }, [person?._id]);

  const personPhotoUrl = useMemo(() => resolveAssetUrl(person?.photo?.url), [person?.photo?.url, resolveAssetUrl]);


  const logScanEvent = useCallback(
    async (personId) => {
      if (!personId) return;

      const coordsPayload = resolvedCoords
        ? { lat: resolvedCoords.lat, lon: resolvedCoords.lng }
        : undefined;

      if (!coordsPayload) {
        return;
      }

      try {
        await api.post('/scan', {
          personId,
          coords: coordsPayload,
          type: roleDetails.scanType,
          role: roleDetails.authRole,
        });
      } catch (err) {
        console.error('Failed to log scan location', err);
      }
    },
    [api, resolvedCoords, roleDetails.authRole, roleDetails.scanType]
  );

  const fetchPerson = useCallback(
    async (barcodeId) => {
      const trimmed = barcodeId.trim();
      if (!trimmed) {
        toast.error('Enter or scan a barcode ID');
        return;
      }

      try {
        setLoading(true);
        setError('');
        const response = await fetch(`${apiBase}/person/barcode/${encodeURIComponent(trimmed)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Profile not found.');
        }

        setPerson(data);
        toast.success('Profile loaded');
        if (resolvedCoords) {
          logScanEvent(data._id);
        } else {
          setPendingScanId(data._id);
        }

      } catch (err) {
        setPerson(null);
        const message = err.message || 'Unable to load profile';
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [apiBase, logScanEvent, resolvedCoords]
  );

  useEffect(() => {
    if (!pendingScanId || !resolvedCoords) {
      return;
    }

    logScanEvent(pendingScanId);
    setPendingScanId(null);
  }, [logScanEvent, pendingScanId, resolvedCoords]);

  const handleScan = useCallback(
    (value) => {
      if (!value) return;
      if (value === detectedCode) return;
      setDetectedCode(value);
      setBarcodeInput(value);
      fetchPerson(value);
    },
    [detectedCode, fetchPerson]
  );

  const handleEmergency = async () => {
    if (!person?._id) return;
    if (!permissions.allowEmergency) {
      toast.error('Emergency escalation is limited to authorized responders.');
      return;
    }
    try {
      const response = await fetch(`${apiBase}/person/${person._id}/emergency`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to notify contacts.');
      }
      toast.success('Emergency contacts notified');
    } catch (err) {
      toast.error(err.message || 'Failed to mark emergency');
    }
  };

  const handleEligibilityCheck = useCallback(async () => {
    if (!person) {
      toast.error('Load a profile before checking eligibility');
      return;
    }

    if (!person.dateOfBirth) {
      const message = 'Date of birth is required for eligibility lookup.';
      setEligibilityError(message);
      toast.error(message);
      return;
    }

    const parsedDob = new Date(person.dateOfBirth);
    if (Number.isNaN(parsedDob.getTime())) {
      const message = 'Stored date of birth is invalid.';
      setEligibilityError(message);
      toast.error(message);
      return;
    }

    const [firstName = '', ...rest] = (person.name || '').trim().split(/\s+/);
    const lastName = rest.length ? rest[rest.length - 1] : firstName;
    const payload = {
      pid: person._id,
      first: firstName || person.name || 'Unknown',
      last: lastName || person.name || 'Unknown',
      dob: parsedDob.toISOString().slice(0, 10),
    };

    try {
      setEligibilityLoading(true);
      setEligibilityError('');
      const response = await fetch(`${apiBase}/medicaid/eligibility`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Eligibility check failed.');
      }

      setEligibility(data);

      if (data.status === 'active') {
        toast.success('Medicaid record is active');
      } else if (data.status === 'inactive') {
        toast.error('Medicaid record is inactive');
      } else {
        toast('Medicaid record not found', { icon: 'ℹ️' });
      }
    } catch (err) {
      setEligibility(null);
      const message = err.message || 'Unable to check eligibility.';
      setEligibilityError(message);
      toast.error(message);
    } finally {
      setEligibilityLoading(false);
    }
  }, [apiBase, person]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">CareVault Scanner</h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Use your webcam or manually enter a CareVault barcode ID to verify identities and surface the details your
              team is cleared to review.
            </p>
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => router.push('/')}
          >
            Change Access
          </button>
        </div>
        <span
          className={`inline-flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white ${roleDetails.badgeClass}`}
        >
          <span className="text-slate-100">Current access</span>
          <span>{roleDetails.title}</span>
        </span>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="card space-y-6 p-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-200">Manual Lookup</label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                className="input"
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                placeholder="Enter barcode ID"
              />
              <button type="button" className="primary-button sm:w-32" onClick={() => fetchPerson(barcodeInput)}>
                Search
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Webcam Scanner</h2>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
              <BarcodeScannerComponent
                width={480}
                height={320}
                onUpdate={(err, result) => {
                  if (result?.text) {
                    handleScan(result.text.trim());
                  }
                }}
              />
            </div>
            <p className="text-xs text-slate-400">
              {detectedCode ? `Last scanned: ${detectedCode}` : 'Align the QR or barcode within the frame.'}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Profile Details</h2>
              {loading && <span className="text-xs text-slate-400">Loading…</span>}
            </div>
            {!person && !loading && (
              <p className="text-sm text-slate-400">
                Scan a CareVault QR or search by barcode to view a profile instantly.
              </p>
            )}
            {error && <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
            {person && (
              <div className="space-y-4">
                {personPhotoUrl && (
                  <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40">
                    <img
                      src={personPhotoUrl}
                      alt={person.name ? `Profile photo of ${person.name}` : 'Profile photo'}
                      className="h-48 w-full object-cover"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-safespot-primaryAccent">
                    {person.barcodeId}
                  </span>
                  <h3 className="text-2xl font-semibold text-white">{person.name}</h3>
                  <div className="space-y-1 text-sm text-slate-300">
                    <p>{person.gender || 'Gender not specified'}</p>
                    <p>{formattedDob ? `Date of birth: ${formattedDob}` : 'Date of birth not provided'}</p>
                  </div>
                </div>

                {permissions.showMedical && person.medicalInfo && (
                  <div className="rounded-2xl border border-white/5 bg-slate-900/40 p-4 text-sm text-slate-200">
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Medical Notes</h4>
                    <p>{person.medicalInfo}</p>
                  </div>
                )}

                {permissions.showMedical && person.medicalConditions?.length ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Medical Conditions</h4>
                    <ul className="space-y-2">
                      {person.medicalConditions.map((condition) => (
                        <li
                          key={`${condition.conditionName}-${condition.description}`}
                          className="rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3 text-sm text-slate-200"
                        >
                          <span className="font-semibold text-white">{condition.conditionName}</span>
                          {condition.description && <p className="text-xs text-slate-300">{condition.description}</p>}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {!permissions.showMedical && (person.medicalInfo || person.medicalConditions?.length) ? (
                  <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-100">
                    Clinical notes stay locked to Medical access. Switch access above to review them on-site.
                  </p>
                ) : null}

                {permissions.showEmergencyContacts && person.emergencyContacts?.length ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Emergency Contacts</h4>
                    <ul className="space-y-2 text-sm text-slate-200">
                      {person.emergencyContacts.map((contact) => (
                        <li
                          key={`${contact.name}-${contact.phone}`}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/30 px-4 py-3"
                        >
                          <div>
                            <p className="font-semibold text-white">{contact.name}</p>
                            <p className="text-xs text-slate-300">{contact.phone}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {!permissions.showEmergencyContacts && person?.emergencyContacts?.length ? (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
                    Emergency contacts are reserved for Police & Safety and Medical teams. Switch access above to view them.
                  </p>
                ) : null}

                {permissions.showEligibility ? (
                  <div className="space-y-3 rounded-2xl border border-white/5 bg-slate-900/40 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Medicaid Eligibility</h4>
                      {eligibilityLoading && <span className="text-xs text-slate-400">Checking…</span>}
                    </div>
                    <p className="text-xs text-slate-400">
                      Send a mock Medi-Cal eligibility request using this profile&apos;s demographics.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <button
                        type="button"
                        className="primary-button sm:w-48"
                        onClick={handleEligibilityCheck}
                        disabled={eligibilityLoading}
                      >
                        {eligibilityLoading ? 'Checking…' : 'Check Eligibility'}
                      </button>
                      {formattedDob ? (
                        <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">DOB {formattedDob}</span>
                      ) : null}
                    </div>
                    {eligibilityError && (
                      <p className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                        {eligibilityError}
                      </p>
                    )}
                    {eligibilityPresentation && (
                      <div className="space-y-3 text-sm text-slate-200">
                        <div className={`flex items-center justify-between rounded-xl px-3 py-2 ${eligibilityPresentation.badgeClass}`}>
                          <span className="font-semibold">Eligibility</span>
                          <span className="text-xs font-semibold uppercase tracking-widest">
                            {eligibilityPresentation.eligibilityLabel}
                          </span>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-slate-950/40 px-3 py-2">
                          <p className={`text-xs font-semibold uppercase tracking-wide ${eligibilityPresentation.statusClass}`}>
                            {eligibilityPresentation.statusLabel}
                          </p>
                          {eligibility.plan ? (
                            <p className="mt-2 text-sm">Plan: {eligibility.plan}</p>
                          ) : null}
                          {eligibility.effective_from ? (
                            <p className="text-xs text-slate-400">
                              Effective {eligibility.effective_from}
                              {eligibility.effective_to ? ` – ${eligibility.effective_to}` : ''}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}

                <div className="flex flex-col gap-3 sm:flex-row">
                  {permissions.allowDocuments ? (
                    <button
                      type="button"
                      className="primary-button flex-1"
                      onClick={() => person?._id && router.push(`/dashboard/${person._id}`)}
                    >
                      Upload Documents
                    </button>
                  ) : null}
                  {permissions.allowEmergency ? (
                    <button type="button" className="secondary-button flex-1" onClick={handleEmergency}>
                      Mark Emergency
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanPage;
