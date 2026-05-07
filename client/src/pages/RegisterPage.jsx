import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { createSecurityHeaders } from '../utils/securityAuth';
import useDeviceLocation from '../hooks/useDeviceLocation';

const LocationPicker = dynamic(() => import('../components/LocationPicker'), { ssr: false });

const emptyContact = { name: '', phone: '' };
const emptyCondition = { conditionName: '', description: '' };

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    gender: '',
    ssn: '',
    medicalInfo: '',
    consent: '',
  });
  const [emergencyContacts, setEmergencyContacts] = useState([{ ...emptyContact }]);
  const [medicalConditions, setMedicalConditions] = useState([{ ...emptyCondition }]);
  const [loading, setLoading] = useState(false);
  const [registeredPerson, setRegisteredPerson] = useState(null);
  const [location, setLocation] = useState(null);
  const qrCanvasRef = useRef(null);
  const photoInputRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const {
    resolvedCoords,
    loading: locating,
    error: locationError,
    refresh: requestDeviceLocation,
    isSupported: isDeviceLocationSupported,
    permission: locationPermission,
  } = useDeviceLocation();
  const apiBase = useMemo(
    () => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api').replace(/\/$/, ''),
    []
  );
  const assetBase = useMemo(() => {
    const normalized = apiBase.replace(/\/$/, '');
    return normalized.endsWith('/api') ? normalized.slice(0, -4) : normalized;
  }, [apiBase]);

  const hasManualLocation = useMemo(
    () => typeof location?.lat === 'number' && typeof location?.lng === 'number',
    [location?.lat, location?.lng]
  );

  useEffect(() => {
    if (hasManualLocation || !resolvedCoords) {
      return;
    }

    setLocation((prev) => ({
      ...(prev || {}),
      lat: resolvedCoords.lat,
      lng: resolvedCoords.lng,
      accuracy: resolvedCoords.accuracy,
    }));
  }, [hasManualLocation, resolvedCoords]);

  useEffect(() => () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
  }, [photoPreview]);

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera capture is not supported on this device.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      setCameraError('');
      setCameraActive(true);

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
    } catch (error) {
      stopCamera();
      setCameraError(error.message || 'Unable to access the camera.');
    }
  };

  const clearExistingPreview = () => {
    if (photoPreview && photoPreview.startsWith('blob:')) {
      URL.revokeObjectURL(photoPreview);
    }
    setPhotoPreview('');
  };

  const clearPhotoSelection = () => {
    setPhotoFile(null);
    setPhotoFileName('');
    clearExistingPreview();
    setCameraError('');
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      setCameraError('Camera is not ready yet.');
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob((blob) => {
      if (!blob) {
        setCameraError('Failed to capture photo. Please try again.');
        return;
      }

      const fileName = `captured-${Date.now()}.png`;
      let file;
      try {
        file = new File([blob], fileName, { type: blob.type || 'image/png' });
      } catch (err) {
        file = new Blob([blob], { type: blob.type || 'image/png' });
        file.name = fileName;
      }

      clearExistingPreview();
      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreview(previewUrl);
      setPhotoFile(file);
      setPhotoFileName(fileName);
      setCameraError('');
      if (photoInputRef.current) {
        photoInputRef.current.value = '';
      }
      stopCamera();
    }, 'image/png');
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;
    stopCamera();
    if (file) {
      clearExistingPreview();
      setCameraError('');
      setPhotoFile(file);
      setPhotoFileName(file.name);
      const objectUrl = URL.createObjectURL(file);
      setPhotoPreview(objectUrl);
    } else {
      clearPhotoSelection();
    }
  };

  const updateForm = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateEmergencyContact = (index, key, value) => {
    setEmergencyContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const addEmergencyContact = () => {
    setEmergencyContacts((prev) => [...prev, { ...emptyContact }]);
  };

  const removeEmergencyContact = (index) => {
    setEmergencyContacts((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length ? updated : [{ ...emptyContact }];
    });
  };

  const updateMedicalCondition = (index, key, value) => {
    setMedicalConditions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [key]: value };
      return updated;
    });
  };

  const addMedicalCondition = () => {
    setMedicalConditions((prev) => [...prev, { ...emptyCondition }]);
  };

  const removeMedicalCondition = (index) => {
    setMedicalConditions((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.length ? updated : [{ ...emptyCondition }];
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (formData.consent !== 'yes') {
      toast.error('Consent is required to register.');
      return;
    }
    setLoading(true);

    const contactsPayload = emergencyContacts
      .filter((contact) => contact.name.trim() && contact.phone.trim())
      .map((contact) => ({
        name: contact.name.trim(),
        phone: contact.phone.trim(),
      }));

    const conditionsPayload = medicalConditions
      .filter((condition) => condition.conditionName.trim())
      .map((condition) => ({
        conditionName: condition.conditionName.trim(),
        description: condition.description.trim() || undefined,
      }));

    try {
      if (!photoFile) {
        throw new Error('A profile photo is required.');
      }

      const locationPayload =
        location?.lat != null && location?.lng != null
          ? {
              latitude: location.lat,
              longitude: location.lng,
              address: location.address?.trim() || undefined,
            }
          : undefined;

      const signaturePayload = {};

      Object.entries({
        name: formData.name,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender,
        ssn: formData.ssn,
        medicalInfo: formData.medicalInfo,
        consent: formData.consent,
      }).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          signaturePayload[key] = value;
        }
      });

      if (contactsPayload.length) {
        signaturePayload.emergencyContacts = JSON.stringify(contactsPayload);
      }

      if (conditionsPayload.length) {
        signaturePayload.medicalConditions = JSON.stringify(conditionsPayload);
      }

      if (locationPayload) {
        signaturePayload.location = JSON.stringify(locationPayload);
      }

      const requestUrl = `${apiBase}/person/register`;
      const securityHeaders = await createSecurityHeaders({ url: requestUrl, method: 'POST', body: signaturePayload });

      const submission = new FormData();
      Object.entries(signaturePayload).forEach(([key, value]) => {
        submission.append(key, value);
      });
      if (photoFile instanceof Blob) {
        submission.append('photo', photoFile, photoFileName || 'profile-photo.png');
      } else {
        submission.append('photo', photoFile);
      }

      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: { ...securityHeaders },
        body: submission,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message || 'Registration failed.');
      }

      const data = await response.json();
      setRegisteredPerson(data);
      setFormData({ name: '', dateOfBirth: '', gender: '', ssn: '', medicalInfo: '', consent: '' });
      setEmergencyContacts([{ ...emptyContact }]);
      setMedicalConditions([{ ...emptyCondition }]);
      setLocation(null);
      clearPhotoSelection();
      toast.success('Person registered successfully');
    } catch (error) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const registeredPhotoUrl = useMemo(() => {
    if (!registeredPerson?.photo?.url) {
      return null;
    }

    if (/^https?:/i.test(registeredPerson.photo.url)) {
      return registeredPerson.photo.url;
    }

    const base = assetBase.replace(/\/$/, '');
    const normalizedPath = registeredPerson.photo.url.startsWith('/')
      ? registeredPerson.photo.url
      : `/${registeredPerson.photo.url}`;
    return `${base}${normalizedPath}`;
  }, [assetBase, registeredPerson?.photo?.url]);

  const downloadQr = () => {
    if (!registeredPerson?.barcodeId || !qrCanvasRef.current) {
      toast.error('QR code is not available yet.');
      return;
    }

    let dataUrl;
    if (typeof qrCanvasRef.current.toDataURL === 'function') {
      dataUrl = qrCanvasRef.current.toDataURL('image/png');
    } else if (qrCanvasRef.current instanceof HTMLCanvasElement) {
      dataUrl = qrCanvasRef.current.toDataURL('image/png');
    } else if (qrCanvasRef.current?.querySelector) {
      const canvasElement = qrCanvasRef.current.querySelector('canvas');
      dataUrl = canvasElement?.toDataURL('image/png');
    }

    if (!dataUrl) {
      toast.error('Unable to export the QR code.');
      return;
    }

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${registeredPerson.barcodeId}.png`;
    link.click();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">Register a Person</h1>
        <p className="max-w-2xl text-sm text-slate-300">
          Capture essential profile, medical, and emergency contact information in minutes. Generate a QR-coded badge for
          rapid retrieval at shelters, clinics, and outreach checkpoints.
        </p>
      </div>

      <div className="grid gap-8 xl:grid-cols-[2fr_1fr]">
        <form onSubmit={handleSubmit} className="card space-y-6 p-6">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Full Name</label>
            <input
              className="input"
              name="name"
              value={formData.name}
              onChange={(event) => updateForm('name', event.target.value)}
              placeholder="Jane Doe"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Profile Photo</label>
            <input
              className="input"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              ref={photoInputRef}
              required={!photoFile}
            />
            <p className="mt-1 text-xs text-slate-400">Upload a clear photo to verify identity during future scans.</p>
            <div className="mt-3 flex flex-col gap-3">
              {cameraActive ? (
                <div className="overflow-hidden rounded-2xl border border-safespot-primary/40 bg-slate-900/40">
                  <video ref={videoRef} autoPlay playsInline muted className="h-48 w-full object-cover" />
                  <div className="flex divide-x divide-white/10 border-t border-white/10">
                    <button
                      type="button"
                      className="primary-button flex-1 rounded-none"
                      onClick={capturePhoto}
                      disabled={loading}
                    >
                      Capture Photo
                    </button>
                    <button
                      type="button"
                      className="secondary-button flex-1 rounded-none"
                      onClick={stopCamera}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="secondary-button w-full sm:w-auto"
                  onClick={startCamera}
                  disabled={loading}
                >
                  Use Camera Now
                </button>
              )}
              {cameraError ? <p className="text-xs text-amber-400">{cameraError}</p> : null}
              <canvas ref={canvasRef} className="hidden" />
            </div>
            {photoPreview ? (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60">
                <img src={photoPreview} alt="Selected profile preview" className="h-40 w-full object-cover" />
                <button
                  type="button"
                  className="secondary-button w-full rounded-none"
                  onClick={clearPhotoSelection}
                  disabled={loading}
                >
                  Remove Photo
                </button>
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Date of Birth</label>
              <input
                className="input"
                type="date"
                value={formData.dateOfBirth}
                onChange={(event) => updateForm('dateOfBirth', event.target.value)}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">Gender</label>
              <input
                className="input"
                value={formData.gender}
                onChange={(event) => updateForm('gender', event.target.value)}
                placeholder="Female"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200">SSN / Identifier</label>
              <input
                className="input"
                value={formData.ssn}
                onChange={(event) => updateForm('ssn', event.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-200">Medical Notes</label>
            <textarea
              className="input h-28 resize-none"
              value={formData.medicalInfo}
              onChange={(event) => updateForm('medicalInfo', event.target.value)}
              placeholder="Allergies, chronic conditions, important considerations"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-slate-200">Consent to Store Information</legend>
            <p className="text-xs text-slate-400">
              Please confirm that the individual agrees to have their information stored and shared with SafeSpot support
              teams as needed for care coordination.
            </p>
            <div className="flex gap-4">
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-200 transition hover:border-safespot-primary/50">
                <input
                  type="radio"
                  name="consent"
                  value="yes"
                  checked={formData.consent === 'yes'}
                  onChange={() => updateForm('consent', 'yes')}
                  required
                  className="h-4 w-4 border-white/30 bg-slate-900/60 text-safespot-primary focus:ring-safespot-primary"
                />
                Yes, consent is given
              </label>
              <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-slate-900/40 p-3 text-sm text-slate-200 transition hover:border-safespot-primary/50">
                <input
                  type="radio"
                  name="consent"
                  value="no"
                  checked={formData.consent === 'no'}
                  onChange={() => updateForm('consent', 'no')}
                  className="h-4 w-4 border-white/30 bg-slate-900/60 text-safespot-primary focus:ring-safespot-primary"
                />
                No, consent is not given
              </label>
            </div>
          </fieldset>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Emergency Contacts</h2>
              <button type="button" className="secondary-button" onClick={addEmergencyContact}>
                ➕ Add Another Contact
              </button>
            </div>
            <div className="space-y-4">
              {emergencyContacts.map((contact, index) => (
                <div key={`contact-${index}`} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input"
                        value={contact.name}
                        onChange={(event) => updateEmergencyContact(index, 'name', event.target.value)}
                        placeholder="Contact name"
                        required={index === 0}
                      />
                      <input
                        className="input"
                        value={contact.phone}
                        onChange={(event) => updateEmergencyContact(index, 'phone', event.target.value)}
                        placeholder="Phone number"
                        required={index === 0}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeEmergencyContact(index)}
                      className="secondary-button h-full"
                      aria-label="Remove emergency contact"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Medical Conditions</h2>
              <button type="button" className="secondary-button" onClick={addMedicalCondition}>
                ➕ Add Condition
              </button>
            </div>
            <div className="space-y-4">
              {medicalConditions.map((condition, index) => (
                <div key={`condition-${index}`} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div className="grid gap-3">
                      <input
                        className="input"
                        value={condition.conditionName}
                        onChange={(event) => updateMedicalCondition(index, 'conditionName', event.target.value)}
                        placeholder="Condition name"
                        required={index === 0}
                      />
                      <textarea
                        className="input h-24"
                        value={condition.description}
                        onChange={(event) => updateMedicalCondition(index, 'description', event.target.value)}
                        placeholder="Optional notes"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMedicalCondition(index)}
                      className="secondary-button h-full"
                      aria-label="Remove medical condition"
                    >
                      🗑️ Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white">Registration Location</h2>
              {location?.lat != null && location?.lng != null ? (
                <span className="rounded-full bg-safespot-primary/15 px-3 py-1 text-xs font-medium text-safespot-primary">
                  {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-400">
              Tap the map to drop a pin where this registration is occurring. These coordinates sync with analytics and field
              operations maps.
            </p>
            <LocationPicker
              value={location}
              defaultCenter={resolvedCoords ? [resolvedCoords.lat, resolvedCoords.lng] : undefined}
              onChange={(coords) =>
                setLocation((prev) => ({
                  ...(prev || {}),
                  lat: coords.lat,
                  lng: coords.lng,
                }))
              }
            />
            <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
              <div>
                {locating ? (
                  <p className="text-slate-400">Detecting your current location…</p>
                ) : locationError ? (
                  <p className="text-amber-400">
                    Unable to access device location. You can still drop a pin manually on the map.
                  </p>
                ) : locationPermission === 'denied' ? (
                  <p className="text-amber-400">Location access is blocked in your browser settings. Drop a pin manually.</p>
                ) : resolvedCoords ? (
                  <p className="text-slate-300">
                    Device location ready: {resolvedCoords.lat.toFixed(4)}, {resolvedCoords.lng.toFixed(4)}
                  </p>
                ) : null}
              </div>
              {isDeviceLocationSupported ? (
                <button
                  type="button"
                  className="secondary-button px-3 py-1 text-xs"
                  onClick={requestDeviceLocation}
                  disabled={locating}
                >
                  {locating ? 'Requesting…' : 'Use current location'}
                </button>
              ) : null}
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="location-notes">
                Location Notes
              </label>
              <input
                id="location-notes"
                className="input"
                value={location?.address || ''}
                onChange={(event) =>
                  setLocation((prev) => ({
                    ...(prev || {}),
                    address: event.target.value,
                  }))
                }
                placeholder="Shelter name, encampment description, or intersection"
              />
            </div>
          </section>

          <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" className="secondary-button sm:w-auto" onClick={() => setLocation(null)}>
              Clear Location
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Registering…' : 'Register Person'}
            </button>
          </div>
        </form>

        <aside className="space-y-4">
          {registeredPhotoUrl ? (
            <div className="card overflow-hidden p-0">
              <img
                src={registeredPhotoUrl}
                alt={registeredPerson?.name ? `Profile photo of ${registeredPerson.name}` : 'Registered profile photo'}
                className="h-56 w-full object-cover"
              />
            </div>
          ) : null}
          <div className="card flex flex-col items-center gap-4 p-6 text-center">
            <h2 className="text-lg font-semibold text-white">QR Code Preview</h2>
            {registeredPerson?.barcodeId ? (
              <>
                <span className="rounded-full bg-safespot-primary/20 px-3 py-1 text-xs uppercase tracking-widest text-safespot-primaryAccent">
                  {registeredPerson.barcodeId}
                </span>
                <QRCodeCanvas
                  ref={qrCanvasRef}
                  value={registeredPerson.barcodeId}
                  size={220}
                  bgColor="#0f172a"
                  fgColor="#ffffff"
                  includeMargin
                />
                <p className="text-sm text-slate-300">
                  Share or print this QR code so field teams can quickly access the person profile.
                </p>
                <button type="button" className="primary-button w-full" onClick={downloadQr}>
                  Download QR
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                Register a person to generate their SafeSpot QR badge instantly.
              </p>
            )}
          </div>
          {Array.isArray(registeredPerson?.location?.coordinates) ? (
            <div className="card space-y-2 p-6 text-left">
              <h3 className="text-sm font-semibold text-white">Registered Location</h3>
              <p className="text-sm text-slate-200">
                {registeredPerson.location.address || 'Coordinates captured'}
              </p>
              <p className="text-xs text-slate-400">
                {(() => {
                  const [lng, lat] = registeredPerson.location.coordinates;
                  const latLabel = typeof lat === 'number' ? lat.toFixed(4) : lat;
                  const lngLabel = typeof lng === 'number' ? lng.toFixed(4) : lng;
                  return `${latLabel}, ${lngLabel}`;
                })()}
              </p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
};

export default RegisterPage;
