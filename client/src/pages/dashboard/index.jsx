"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { createSecurityHeaders } from '../../utils/securityAuth';
import {
  SCANNER_ROLE_DETAILS,
  SCANNER_ROLE_ORDER,
  normalizeScannerRoleKey,
} from '../../constants/scannerRoles';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const emptyContact = { name: '', phone: '' };
const emptyCondition = { conditionName: '', description: '' };

const formatDateInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const DashboardPage = () => {
  const router = useRouter();
  const { personId } = router.query;
  const [lookupValue, setLookupValue] = useState('');
  const [person, setPerson] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ name: '', dateOfBirth: '', gender: '', ssn: '', medicalInfo: '' });
  const [emergencyContacts, setEmergencyContacts] = useState([{ ...emptyContact }]);
  const [medicalConditions, setMedicalConditions] = useState([{ ...emptyCondition }]);
  const [scans, setScans] = useState([]);
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api', []);
  const assetBase = useMemo(() => {
    const normalized = (apiBase || '').replace(/\/$/, '');
    return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized;
  }, [apiBase]);

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

  const personPhotoUrl = useMemo(() => resolveAssetUrl(person?.photo?.url), [person?.photo?.url, resolveAssetUrl]);

  const loadPerson = useCallback(
    async (id) => {
      try {
        setLoadingProfile(true);
        const response = await fetch(`${apiBase}/person/${id}`);
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.message || 'Failed to load profile.');
        }
        const data = await response.json();
        setPerson(data);
        setForm({
          name: data.name || '',
          dateOfBirth: formatDateInput(data.dateOfBirth || data.dob),
          gender: data.gender || '',
          ssn: data.ssn || '',
          medicalInfo: data.medicalInfo || '',
        });
        setEmergencyContacts(
          data.emergencyContacts?.length ? data.emergencyContacts : [{ ...emptyContact }]
        );
        setMedicalConditions(
          data.medicalConditions?.length ? data.medicalConditions : [{ ...emptyCondition }]
        );
      } catch (error) {
        toast.error(error.message || 'Failed to load profile');
      } finally {
        setLoadingProfile(false);
      }
    },
    [apiBase]
  );

  const loadScans = useCallback(
    async (id) => {
      try {
        const response = await fetch(`${apiBase}/person/${id}/scans`);
        if (!response.ok) return;
        const data = await response.json();
        setScans(data || []);
      } catch (error) {
        console.error('Failed to load scans', error);
      }
    },
    [apiBase]
  );

  useEffect(() => {
    if (personId) {
      loadPerson(personId);
      loadScans(personId);
    }
  }, [personId, loadPerson, loadScans]);

  const handleLookup = async () => {
    if (!lookupValue.trim()) return;
    try {
      const response = await fetch(`${apiBase}/person/barcode/${encodeURIComponent(lookupValue.trim())}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Profile not found.');
      }
      const data = await response.json();
      router.push(`/dashboard/${data._id}`);
    } catch (error) {
      toast.error(error.message || 'Failed to find profile');
    }
  };

  const updateContact = (index, key, value) => {
    setEmergencyContacts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addContact = () => setEmergencyContacts((prev) => [...prev, { ...emptyContact }]);
  const removeContact = (index) => {
    setEmergencyContacts((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.length ? filtered : [{ ...emptyContact }];
    });
  };

  const updateCondition = (index, key, value) => {
    setMedicalConditions((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const addCondition = () => setMedicalConditions((prev) => [...prev, { ...emptyCondition }]);
  const removeCondition = (index) => {
    setMedicalConditions((prev) => {
      const filtered = prev.filter((_, idx) => idx !== index);
      return filtered.length ? filtered : [{ ...emptyCondition }];
    });
  };

  const handleProfileSave = async () => {
    if (!personId) return;
    setSavingProfile(true);
    try {
      const payload = {
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
        emergencyContacts,
        medicalConditions,
      };
      const securityHeaders = await createSecurityHeaders({
        url: `${apiBase}/person/${personId}`,
        method: 'PUT',
        body: payload,
      });
      const response = await fetch(`${apiBase}/person/${personId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...securityHeaders },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to update profile.');
      }
      const data = await response.json();
      setPerson(data);
      setForm({
        name: data.name || '',
        dateOfBirth: formatDateInput(data.dateOfBirth || data.dob),
        gender: data.gender || '',
        ssn: data.ssn || '',
        medicalInfo: data.medicalInfo || '',
      });
      setEmergencyContacts(
        data.emergencyContacts?.length ? data.emergencyContacts : [{ ...emptyContact }]
      );
      setMedicalConditions(
        data.medicalConditions?.length ? data.medicalConditions : [{ ...emptyCondition }]
      );
      toast.success('Profile updated');
    } catch (error) {
      toast.error(error.message || 'Update failed');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!personId || !file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append('document', file);
      const securityHeaders = await createSecurityHeaders({
        url: `${apiBase}/person/${personId}/documents`,
        method: 'POST',
        body: {},
      });
      const response = await fetch(`${apiBase}/person/${personId}/documents`, {
        method: 'POST',
        headers: { ...securityHeaders },
        body,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Failed to upload document.');
      }
      const data = await response.json();
      setPerson(data.person);
      toast.success('Document uploaded');
    } catch (error) {
      toast.error(error.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (event) => {
    const file = event.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const preventDefault = (event) => event.preventDefault();

  const scansWithRole = useMemo(() => {
    const parseNumber = (value) => {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null;
      }

      if (typeof value === 'string' && value.trim()) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
      }

      return null;
    };

    return scans.map((scan) => {
      const roleKey = normalizeScannerRoleKey(scan.role || scan.type);
      const roleDetails = SCANNER_ROLE_DETAILS[roleKey] || SCANNER_ROLE_DETAILS.medical;

      const coords = scan.coords || {};
      let lat = parseNumber(coords.lat) ?? parseNumber(coords.latitude);
      let lon = parseNumber(coords.lon) ?? parseNumber(coords.lng) ?? parseNumber(coords.longitude);

      if ((lat === null || lon === null) && Array.isArray(scan.location?.coordinates) && scan.location.coordinates.length === 2) {
        const [maybeLon, maybeLat] = scan.location.coordinates;
        lat = lat ?? parseNumber(maybeLat);
        lon = lon ?? parseNumber(maybeLon);
      }

      const locationLabel =
        coords.address ||
        scan.location?.address ||
        (Number.isFinite(lat) && Number.isFinite(lon) ? `${lat.toFixed(4)}, ${lon.toFixed(4)}` : 'Location unavailable');

      return {
        ...scan,
        roleKey,
        roleDetails,
        lat,
        lon,
        locationLabel,
        resolvedTimestamp: scan.timestamp || scan.createdAt,
      };
    });
  }, [scans]);

  const roleCounts = useMemo(() => {
    return scansWithRole.reduce((acc, scan) => {
      acc[scan.roleKey] = (acc[scan.roleKey] || 0) + 1;
      return acc;
    }, {});
  }, [scansWithRole]);

  const scansByDate = scansWithRole.reduce((acc, scan) => {
    if (!scan.resolvedTimestamp) return acc;
    const dateKey = new Date(scan.resolvedTimestamp).toLocaleDateString();
    acc[dateKey] = (acc[dateKey] || 0) + 1;
    return acc;
  }, {});

  const labels = Object.keys(scansByDate).sort((a, b) => new Date(a) - new Date(b));

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Scans',
        data: labels.map((label) => scansByDate[label]),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96, 165, 250, 0.3)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: { display: true, labels: { color: '#e2e8f0' } },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: '#60a5fa',
        borderWidth: 1,
      },
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' } },
      y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(148, 163, 184, 0.1)' }, beginAtZero: true },
    },
  };

  if (!personId) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-white">CareVault Dashboard</h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Access uploaded documents, edit profiles, and review scan activity. Look up a CareVault ID to get started.
          </p>
        </div>
        <div className="card space-y-4 p-6">
          <h2 className="text-lg font-semibold text-white">Find a CareVault Profile</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="input"
              value={lookupValue}
              onChange={(event) => setLookupValue(event.target.value)}
              placeholder="Enter barcode ID"
            />
            <button type="button" className="primary-button sm:w-36" onClick={handleLookup}>
              Search
            </button>
          </div>
          <p className="text-xs text-slate-400">Or scan a code on the Scanner page to jump directly into the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-white">CareVault Profile Dashboard</h1>
            {person?.barcodeId && (
              <p className="text-xs uppercase tracking-widest text-safespot-primaryAccent">{person.barcodeId}</p>
            )}
          </div>
          <button type="button" className="secondary-button" onClick={() => router.push('/scan')}>
            ← Back to Scan
          </button>
        </div>
        {loadingProfile && <p className="text-xs text-slate-400">Loading profile…</p>}
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.2fr_1fr]">
        <section className="card space-y-6 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Profile</h2>
            <button
              type="button"
              className="primary-button"
              onClick={handleProfileSave}
              disabled={savingProfile}
            >
              {savingProfile ? 'Saving…' : 'Save Changes'}
            </button>
          </div>

          {personPhotoUrl && (
            <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/40">
              <img
                src={personPhotoUrl}
                alt={person?.name ? `Profile photo of ${person.name}` : 'Profile photo'}
                className="h-56 w-full object-cover"
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Full Name</label>
              <input
                className="input"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Date of Birth</label>
              <input
                className="input"
                type="date"
                value={form.dateOfBirth}
                onChange={(event) => setForm((prev) => ({ ...prev, dateOfBirth: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Gender</label>
              <input
                className="input"
                value={form.gender}
                onChange={(event) => setForm((prev) => ({ ...prev, gender: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">SSN / Identifier</label>
              <input
                className="input"
                value={form.ssn}
                onChange={(event) => setForm((prev) => ({ ...prev, ssn: event.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Medical Notes</label>
            <textarea
              className="input h-24"
              value={form.medicalInfo}
              onChange={(event) => setForm((prev) => ({ ...prev, medicalInfo: event.target.value }))}
            />
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Emergency Contacts</h3>
              <button type="button" className="secondary-button" onClick={addContact}>
                ➕ Add Contact
              </button>
            </div>
            <div className="space-y-3">
              {emergencyContacts.map((contact, index) => (
                <div key={`profile-contact-${index}`} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input"
                        value={contact.name}
                        onChange={(event) => updateContact(index, 'name', event.target.value)}
                        placeholder="Contact name"
                      />
                      <input
                        className="input"
                        value={contact.phone}
                        onChange={(event) => updateContact(index, 'phone', event.target.value)}
                        placeholder="Phone"
                      />
                    </div>
                    <button type="button" className="secondary-button" onClick={() => removeContact(index)}>
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-white">Medical Conditions</h3>
              <button type="button" className="secondary-button" onClick={addCondition}>
                ➕ Add Condition
              </button>
            </div>
            <div className="space-y-3">
              {medicalConditions.map((condition, index) => (
                <div key={`profile-condition-${index}`} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="space-y-3">
                      <input
                        className="input"
                        value={condition.conditionName}
                        onChange={(event) => updateCondition(index, 'conditionName', event.target.value)}
                        placeholder="Condition"
                      />
                      <textarea
                        className="input h-24"
                        value={condition.description}
                        onChange={(event) => updateCondition(index, 'description', event.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                    <button type="button" className="secondary-button" onClick={() => removeCondition(index)}>
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </section>

        <aside className="space-y-6">
          <section
            className="card space-y-4 p-6"
            onDrop={handleDrop}
            onDragOver={preventDefault}
            onDragEnter={preventDefault}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Upload Documents</h2>
              <input type="file" accept=".pdf,image/*" className="hidden" id="document-upload" onChange={handleFileInput} />
              <label htmlFor="document-upload" className="primary-button cursor-pointer">
                {uploading ? 'Uploading…' : 'Browse'}
              </label>
            </div>
            <div className="rounded-2xl border border-dashed border-safespot-primary/40 bg-slate-900/30 p-6 text-center">
              <p className="text-sm text-slate-300">
                Drag and drop PDF or image files here, or click browse to upload securely.
              </p>
            </div>
            {person?.documents?.length ? (
              <ul className="space-y-3 text-sm text-slate-200">
                {person.documents
                  .slice()
                  .reverse()
                  .map((doc) => (
                    <li
                      key={`${doc.filename}-${doc.uploadedAt}`}
                      className="flex items-center justify-between rounded-xl border border-white/5 bg-slate-900/40 px-4 py-3"
                    >
                      <div>
                        <p className="font-semibold text-white">{doc.originalName}</p>
                        <p className="text-xs text-slate-400">
                          {Math.round(doc.size / 1024)} KB · {new Date(doc.uploadedAt).toLocaleString()}
                        </p>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="secondary-button"
                      >
                        View
                      </a>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No documents uploaded yet.</p>
            )}
          </section>

          <section className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Scan Ledger</h2>
              <span className="text-xs text-slate-400">Last {scansWithRole.length} scans</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {SCANNER_ROLE_ORDER.map((key) => {
                const details = SCANNER_ROLE_DETAILS[key];
                const count = roleCounts[key] || 0;
                return (
                  <div
                    key={key}
                    className={`rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-widest text-white ${details.badgeClass}`}
                  >
                    <p className="text-[0.65rem] text-white/70">{details.authRole}</p>
                    <p className="mt-1 text-lg font-semibold">{count}</p>
                  </div>
                );
              })}
            </div>
            {scansWithRole.length ? (
              <ul className="space-y-3">
                {scansWithRole.map((scan) => (
                  <li
                    key={scan._id || `${scan.resolvedTimestamp}-${scan.roleKey}`}
                    className={`rounded-2xl border px-4 py-3 text-sm text-white ${scan.roleDetails.ledgerClass}`}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-white/80">
                          {scan.roleDetails.authRole}
                        </p>
                        <p className="text-sm text-white">{scan.locationLabel}</p>
                      </div>
                      <p className="text-xs text-white/70">
                        {scan.resolvedTimestamp ? new Date(scan.resolvedTimestamp).toLocaleString() : 'Timestamp unavailable'}
                      </p>
                    </div>
                    {Number.isFinite(scan.lat) && Number.isFinite(scan.lon) ? (
                      <p className="mt-2 text-xs text-white/80">
                        Coordinates {scan.lat.toFixed(4)}, {scan.lon.toFixed(4)}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No scans logged for this profile yet.</p>
            )}
          </section>

          <section className="card space-y-4 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Scan Trends</h2>
              <span className="text-xs text-slate-400">Last {scansWithRole.length} scans</span>
            </div>
            {scansWithRole.length ? (
              <Line data={chartData} options={chartOptions} className="!h-56" />
            ) : (
              <p className="text-xs text-slate-400">No scans logged for this profile yet.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
