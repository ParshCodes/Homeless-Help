import { useState } from 'react';
import { useSafeSpot } from '../context/SafeSpotContext';

const UploadPanel = ({ userId }) => {
  const { api } = useSafeSpot();
  const [file, setFile] = useState();
  const [status, setStatus] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append('document', file);
    setStatus('Uploading...');
    await api.post(`/uploads/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    setStatus('Uploaded and encrypted');
  };

  return (
    <form className="upload-panel" onSubmit={submit}>
      <label htmlFor="document">Encrypted Medical Document</label>
      <input id="document" type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files[0])} />
      <button type="submit">Upload</button>
      {status && <p>{status}</p>}
    </form>
  );
};

export default UploadPanel;
