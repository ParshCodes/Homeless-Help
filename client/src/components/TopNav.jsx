import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSafeSpot } from '../context/SafeSpotContext';
import { resolveScannerRoleDetails } from '../constants/scannerRoles';

const navItems = [
  { label: 'Access', href: '/' },
  { label: 'Register', href: '/register' },
  { label: 'Scan', href: '/scan' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Analytics', href: '/analytics' },
];

const ThemeToggleButton = ({ isLight, onToggle, className = '', fullWidth = false }) => {
  const nextTheme = isLight ? 'dark' : 'light';
  const icon = isLight ? '🌙' : '☀️';
  const baseClasses =
    'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-safespot-primary/60';
  const paletteClasses = isLight
    ? 'border-slate-300 bg-white text-slate-900 hover:bg-slate-100 focus-visible:ring-offset-2 focus-visible:ring-offset-white'
    : 'border-white/10 bg-slate-900/60 text-white hover:bg-white/10 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900';

  return (
    <button
      type="button"
      className={`${baseClasses} ${paletteClasses} ${fullWidth ? 'w-full justify-center text-base' : ''} ${className}`}
      onClick={onToggle}
      aria-pressed={isLight}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <span className="text-lg" aria-hidden="true">
        {icon}
      </span>
      <span className="hidden sm:inline">{`Switch to ${nextTheme} mode`}</span>
    </button>
  );
};

const TopNav = ({ theme = 'dark', onToggleTheme }) => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { state } = useSafeSpot();
  const roleDetails = resolveScannerRoleDetails(state.role);
  const isLight = theme === 'light';

  const headerClasses = isLight
    ? 'border-slate-200 bg-white/80 text-slate-900'
    : 'border-white/5 bg-slate-950/80 text-white';

  const navClasses = isLight ? 'text-slate-800' : 'text-slate-200';

  const navItemClassNames = (isActive) => {
    if (isActive) {
      return 'bg-safespot-primary text-white shadow shadow-safespot-primary/50';
    }

    return isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-white/10';
  };

  const mobileNavWrapper = isLight
    ? 'border-slate-200 bg-white/90'
    : 'border-white/5 bg-slate-950/90';

  const handleThemeToggle = () => {
    if (typeof onToggleTheme === 'function') {
      onToggleTheme();
    }
  };

  useEffect(() => {
    setIsOpen(false);
  }, [router.asPath]);

  return (
    <header className={`sticky top-0 z-30 border-b backdrop-blur transition ${headerClasses}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link
          href="/"
          className={`text-lg font-semibold tracking-wide transition ${isLight ? 'text-slate-900' : 'text-white'}`}
        >
          CareVault
        </Link>
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full text-base transition ${
              isLight
                ? 'border border-slate-200 bg-white text-slate-900 hover:bg-slate-100'
                : 'border border-white/10 bg-slate-900/60 text-white hover:bg-white/10'
            }`}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation"
          >
            {isOpen ? '✕' : '☰'}
          </button>
          <ThemeToggleButton isLight={isLight} onToggle={handleThemeToggle} className="shrink-0" />
        </div>
        <nav className={`hidden items-center gap-3 text-sm font-medium md:flex ${navClasses}`}>
          {navItems.map((item) => {
            const isActive = router.asPath === item.href || router.asPath.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 transition ${navItemClassNames(isActive)}`}
              >
                {item.label}
              </Link>
            );
          })}
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
              isLight ? 'text-slate-900' : 'text-white'
            } ${roleDetails.badgeClass}`}
          >
            {roleDetails.authRole}
          </span>
          <ThemeToggleButton
            isLight={isLight}
            onToggle={handleThemeToggle}
            className="ml-2 shrink-0 md:ml-4"
          />
        </nav>
      </div>
      {isOpen ? (
        <nav className={`border-t px-4 py-3 md:hidden ${mobileNavWrapper}`}>
          <ul className={`flex flex-col gap-2 text-sm font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
            {navItems.map((item) => {
              const isActive = router.asPath === item.href || router.asPath.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-xl px-4 py-2 transition ${
                      isActive
                        ? 'bg-safespot-primary text-white shadow shadow-safespot-primary/40'
                        : isLight
                          ? 'hover:bg-slate-100'
                          : 'hover:bg-white/10'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
            <li className="pt-2">
              <span
                className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest ${
                  isLight ? 'text-slate-900' : 'text-white'
                } ${roleDetails.badgeClass}`}
              >
                {roleDetails.authRole}
              </span>
            </li>
            <li className="pt-2">
              <ThemeToggleButton isLight={isLight} onToggle={handleThemeToggle} fullWidth />
            </li>
          </ul>
        </nav>
      ) : null}
    </header>
  );
};

export default TopNav;
