import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { useSafeSpot } from '../context/SafeSpotContext';
import {
  SCANNER_ROLE_OPTIONS,
  normalizeScannerRoleKey,
  resolveScannerRoleDetails,
} from '../constants/scannerRoles';

const AccessCard = ({ option, isActive, onSelect, loading }) => (
  <button
    type="button"
    onClick={onSelect}
    disabled={loading}
    className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-left shadow-lg transition focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 focus:ring-white md:p-8 ${
      isActive
        ? 'border-white/50 shadow-2xl ring-2 ring-white/40'
        : 'hover:border-white/30 hover:ring-2 hover:ring-white/20'
    }`}
  >
    <div className="absolute inset-0 opacity-70">
      <div className={`absolute inset-0 bg-gradient-to-br ${option.accent}`} />
    </div>
    <div className="relative flex flex-col gap-4 text-white">
      <div className="text-4xl">{option.key === 'medical' ? '⛑️' : option.key === 'police' ? '🛡️' : '🥗'}</div>
      <div>
        <h3 className="text-xl font-semibold md:text-2xl">{option.title}</h3>
        <p className="mt-2 text-sm text-slate-100/90 md:text-base">{option.description}</p>
      </div>
    </div>
    <div className="relative mt-6 flex items-center justify-between text-sm font-semibold text-white/90">
      <span>{isActive ? 'Selected' : 'Switch access'}</span>
      <span className="text-xs uppercase tracking-widest text-white/80">CareVault</span>
    </div>
    {loading ? (
      <div className="absolute inset-x-0 bottom-0 h-1 animate-pulse bg-white/70" />
    ) : null}
  </button>
);

const HomePage = () => {
  const router = useRouter();
  const { state, setScannerRole } = useSafeSpot();
  const [loadingRole, setLoadingRole] = useState(null);

  const activeRoleKey = normalizeScannerRoleKey(state.role);
  const activeRole = resolveScannerRoleDetails(state.role);

  const handleSelect = async (option) => {
    if (loadingRole) return;
    setLoadingRole(option.key);
    try {
      await setScannerRole(option.authRole);
      toast.success(`${option.title} access enabled`);
      router.push('/scan');
    } catch (error) {
      console.error('Failed to switch scanner access', error);
      toast.error('Unable to switch access right now. Please try again.');
    } finally {
      setLoadingRole(null);
    }
  };

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-900/30 p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_60%)]" />
        <div className="relative flex flex-col gap-6 text-white">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-4">
              <p className="text-sm uppercase tracking-[0.4em] text-cyan-200/80">Welcome to CareVault</p>
              <h1 className="text-3xl font-semibold leading-tight md:text-4xl">
                Choose the access lane that matches your team&apos;s mission
              </h1>
              <p className="text-sm text-slate-200 md:text-base">
                CareVault routes every scan through a tailored privacy lens. Pick the role that reflects who is verifying
                someone today so we only surface the details you truly need.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-6 py-4 text-sm text-slate-200">
              <p className="text-xs uppercase tracking-widest text-white/70">Currently active</p>
              <p className="mt-1 text-lg font-semibold text-white">{activeRole.title}</p>
              <p className="text-xs text-slate-300">{activeRole.authRole}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {SCANNER_ROLE_OPTIONS.map((option) => (
          <AccessCard
            key={option.key}
            option={option}
            isActive={option.key === activeRoleKey}
            loading={loadingRole === option.key}
            onSelect={() => handleSelect(option)}
          />
        ))}
      </section>
    </div>
  );
};

export default HomePage;
