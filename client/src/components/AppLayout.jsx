import TopNav from './TopNav';

const AppLayout = ({ children }) => {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.2),_transparent_65%)]" />
      <div className="pointer-events-none fixed inset-0 -z-20 bg-slate-950/60 backdrop-blur-sm" />
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
};

export default AppLayout;
