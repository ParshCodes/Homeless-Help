import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode.react';
import toast from 'react-hot-toast';
import { createSecurityHeaders } from '../utils/securityAuth';

const initialForm = {
  name: '',
  dateOfBirth: '',
  gender: '',
  ssn: '',
  medicalInfo: '',
  emergencyContact: '',
};

const RegisterPerson = () => {
  const [formData, setFormData] = useState(initialForm);
  const [qrId, setQrId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [photoFile, setPhotoFile] = useState(null);
  const [photoFileName, setPhotoFileName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const apiBase = useMemo(() => (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5050/api').replace(/\/$/, ''), []);

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
    } catch (err) {
      stopCamera();
      setCameraError(err.message || 'Unable to access the camera.');
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const capturePhoto = async () => {
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
      } catch (error) {
        file = new Blob([blob], { type: blob.type || 'image/png' });
        file.name = fileName;
      }

      clearExistingPreview();
      const previewUrl = URL.createObjectURL(blob);
      setPhotoPreview(previewUrl);
      setPhotoFile(file);
      setPhotoFileName(fileName);
      setCameraError('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      stopCamera();
    }, 'image/png');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (event) => {
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (!photoFile) {
        throw new Error('A profile photo is required.');
      }

      const payload = {
        ...formData,
        dateOfBirth: formData.dateOfBirth || undefined,
      };

      const signaturePayload = Object.entries(payload).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});

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
        const message = await response.json().catch(() => ({ message: 'Registration failed.' }));
        throw new Error(message.message || 'Registration failed.');
      }

      const data = await response.json();
      setQrId(data.barcodeId);
      setSuccess('Person registered successfully.');
      setFormData(initialForm);
      clearPhotoSelection();
      toast.success('Person registered successfully.');
    } catch (err) {
      setError(err.message);
      setQrId(null);
      toast.error(err.message || 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <h1>Register Person</h1>
      <form className="register-form" onSubmit={handleSubmit}>
        <label htmlFor="name">
          Name
          <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} required />
        </label>
        <label htmlFor="photo">
          Profile Photo
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            ref={fileInputRef}
            required={!photoFile}
          />
        </label>
        <div className="camera-options">
          {cameraActive ? (
            <div className="camera-preview">
              <video ref={videoRef} autoPlay playsInline muted />
              <div className="camera-actions">
                <button type="button" onClick={capturePhoto} disabled={submitting}>
                  Capture Photo
                </button>
                <button type="button" onClick={stopCamera} disabled={submitting}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={startCamera} disabled={submitting}>
              Use Camera Now
            </button>
          )}
          {cameraError && <p className="error">{cameraError}</p>}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        {photoPreview && (
          <div className="photo-preview">
            <img src={photoPreview} alt="Profile preview" />
            <button type="button" onClick={clearPhotoSelection} disabled={submitting}>
              Remove Photo
            </button>
          </div>
        )}
        <label htmlFor="dateOfBirth">
          Date of Birth
          <input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            value={formData.dateOfBirth}
            onChange={handleChange}
          />
        </label>
        <label htmlFor="gender">
          Gender
          <input id="gender" name="gender" type="text" value={formData.gender} onChange={handleChange} />
        </label>
        <label htmlFor="ssn">
          SSN
          <input id="ssn" name="ssn" type="text" value={formData.ssn} onChange={handleChange} />
        </label>
        <label htmlFor="medicalInfo">
          Medical Information
          <textarea id="medicalInfo" name="medicalInfo" rows="4" value={formData.medicalInfo} onChange={handleChange} />
        </label>
        <label htmlFor="emergencyContact">
          Emergency Contact
          <textarea id="emergencyContact" name="emergencyContact" rows="3" value={formData.emergencyContact} onChange={handleChange} />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Registering…' : 'Register Person'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}
      {qrId && (
        <div className="qr-preview">
          <h2>SafeSpot QR Code</h2>
          <p className="qr-code-id">{qrId}</p>
          <QRCode value={qrId} size={192} />
          <p className="qr-instructions">Share or print this code to quickly retrieve the person&apos;s profile.</p>
        </div>
      )}
    </div>
  );
};

export default RegisterPerson;
