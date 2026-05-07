import { useMemo, useState } from 'react';
import { downloadMedicalHistoryPdf } from '../utils/pdf';

const tabs = ['Basic Info', 'Medical', 'Service History', 'Emergency Contacts'];

const MedicalTabs = ({ profile }) => {
  const [active, setActive] = useState(tabs[0]);
  const content = useMemo(() => {
    switch (active) {
      case 'Medical':
        return (
          <div className="space-y-2 text-sm text-slate-200">
            <p>
              <span className="font-semibold text-white">Conditions:</span>{' '}
              {profile.medical_info_encrypted?.conditions || 'Not recorded'}
            </p>
            <p>
              <span className="font-semibold text-white">Allergies:</span>{' '}
              {profile.medical_info_encrypted?.allergies || 'Not recorded'}
            </p>
            <p>
              <span className="font-semibold text-white">Medications:</span>{' '}
              {profile.medical_info_encrypted?.meds || 'Not recorded'}
            </p>
            <p>
              <span className="font-semibold text-white">Vaccinations:</span>{' '}
              {profile.medical_info_encrypted?.vaccinations || 'Not recorded'}
            </p>
          </div>
        );
      case 'Service History':
        return (
          <ul className="space-y-2 text-sm text-slate-200">
            {Array.isArray(profile.service_history) && profile.service_history.length > 0 ? (
              profile.service_history.map((item) => (
                <li key={item.date} className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-widest text-slate-400">{item.date}</p>
                  <p>{item.note}</p>
                </li>
              ))
            ) : (
              <li className="text-slate-400">No service history yet.</li>
            )}
          </ul>
        );
      case 'Emergency Contacts':
        return (
          <ul className="space-y-2 text-sm text-slate-200">
            {Array.isArray(profile.emergency_contacts) && profile.emergency_contacts.length > 0 ? (
              profile.emergency_contacts.map((contact) => (
                <li key={`${contact.email || contact.phone}`} className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
                  <p className="font-medium text-white">{contact.name}</p>
                  <p className="text-xs text-slate-400">{contact.phone || 'No phone on record'}</p>
                </li>
              ))
            ) : (
              <li className="text-slate-400">No emergency contacts stored.</li>
            )}
          </ul>
        );
      case 'Basic Info':
      default:
        return (
          <div className="space-y-2 text-sm text-slate-200">
            <p>
              <span className="font-semibold text-white">Sex:</span> {profile.sex || 'N/A'}
            </p>
            <p>
              <span className="font-semibold text-white">Date of Birth:</span> {profile.dob || 'N/A'}
            </p>
            <p>
              <span className="font-semibold text-white">Consent Expires:</span> {profile.consent_expires || 'N/A'}
            </p>
          </div>
        );
    }
  }, [active, profile]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <nav className="flex w-full flex-wrap gap-2 overflow-x-auto rounded-xl border border-white/5 bg-slate-900/40 p-2">
          {tabs.map((tab) => {
            const isActive = active === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActive(tab)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  isActive
                    ? 'bg-safespot-primary text-white shadow shadow-safespot-primary/40'
                    : 'text-slate-300 hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => downloadMedicalHistoryPdf(profile)}
          className="primary-button w-full md:w-auto"
        >
          Download Medical PDF
        </button>
      </div>
      <section className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">{content}</section>
    </div>
  );
};

export default MedicalTabs;
