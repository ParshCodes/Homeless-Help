import { useEffect, useState } from 'react';
import { useSafeSpot } from '../context/SafeSpotContext';
import MedicalTabs from '../components/MedicalTabs';

const Medical = () => {
  const { api } = useSafeSpot();
  const [profiles, setProfiles] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await api.get('/users');
      setProfiles(data);
      setSelected(data[0]);
    };

    fetchProfiles();
  }, [api]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold text-white">Medical Records</h1>
        <p className="max-w-3xl text-sm text-slate-300">
          Review encrypted medical summaries, service history, and emergency contacts. Export snapshots as PDF files to share
          securely with clinics and partner organizations.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="card h-fit max-h-[70vh] overflow-y-auto p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-300">Clients</h2>
          <ul className="mt-4 space-y-2">
            {profiles.map((profile) => {
              const isActive = selected?._id === profile._id;
              return (
                <li key={profile._id}>
                  <button
                    type="button"
                    onClick={() => setSelected(profile)}
                    className={`w-full rounded-xl px-4 py-3 text-left text-sm transition ${
                      isActive
                        ? 'bg-safespot-primary/20 text-white shadow-inner shadow-safespot-primary/40'
                        : 'bg-slate-900/40 text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    <span className="block font-medium">{profile.name}</span>
                    <span className="block text-xs text-slate-400">{profile.sex || 'No demographic data'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <section className="card p-6">
          {selected ? (
            <MedicalTabs profile={selected} />
          ) : (
            <p className="text-sm text-slate-300">Select a client to view their medical details.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default Medical;
