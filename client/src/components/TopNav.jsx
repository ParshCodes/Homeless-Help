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

const TopNav = () => {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const { state } = useSafeSpot();
  const roleDetails = resolveScannerRoleDetails(state.role);

  const navItemClassNames = (isActive) =>
    isActive
      ? 'bg-safespot-primary text-white shadow shadow-safespot-primary/50'
      : 'text-slate-300 hover:bg-white/10';

  useEffect(() => {
    setIsOpen(false);
  }, [router.asPath]);

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-slate-950/80 text-white backdrop-blur transition">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-semibold tracking-wide text-white transition">
          CareVault
        </Link>
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-900/60 text-white transition hover:bg-white/10"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-expanded={isOpen}
            aria-label="Toggle navigation"
          >
            {isOpen ? '✕' : '☰'}
          </button>
        </div>
        <nav className="hidden items-center gap-3 text-sm font-medium text-slate-200 md:flex">
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
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white ${roleDetails.badgeClass}`}
          >
            {roleDetails.authRole}
          </span>
        </nav>
      </div>
      {isOpen && (
        <nav className="border-t border-white/5 bg-slate-950/90 px-4 py-3 md:hidden">
          <ul className="flex flex-col gap-2 text-sm font-medium text-slate-200">
            {navItems.map((item) => {
              const isActive = router.asPath === item.href || router.asPath.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-xl px-4 py-2 transition ${
                      isActive
                        ? 'bg-safespot-primary text-white shadow shadow-safespot-primary/40'
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
                className={`inline-flex w-full items-center justify-center rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white ${roleDetails.badgeClass}`}
              >
                {roleDetails.authRole}
              </span>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
};

export default TopNav;
