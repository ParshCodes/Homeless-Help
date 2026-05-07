import { useCallback, useEffect, useMemo, useState } from 'react';
import TopNav from './TopNav';

const STORAGE_KEY = 'carevault-theme';

const AppLayout = ({ children }) => {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
      return;
    }

    if (window.matchMedia('(prefers-color-scheme: light)').matches) {
      setTheme('light');
    }
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.dataset.theme = theme;

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, theme);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const overlays = useMemo(() => {
    if (theme === 'light') {
      return (
        <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-b from-white via-slate-100 to-slate-200" />
      );
    }

    return (
      <>
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_65%)]" />
        <div className="pointer-events-none fixed inset-0 -z-20 bg-slate-950/60 backdrop-blur-sm" />
      </>
    );
  }, [theme]);

  return (
    <div className="relative min-h-screen transition-colors">
      {overlays}
      <TopNav theme={theme} onToggleTheme={toggleTheme} />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
};

export default AppLayout;
