import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Briefcase, Archive, Settings, Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function Layout() {
  const online = useOnlineStatus();
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen min-h-dvh bg-dark">
      <header className="sticky top-0 z-40 bg-dark/95 backdrop-blur border-b border-slate-800 safe-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Basic ITS" className="h-7 opacity-90" />
            <div className="h-4 w-px bg-slate-700" />
            <span className="text-xs font-semibold text-slate-400 tracking-widest uppercase">Install Log</span>
          </div>
          <div className="flex items-center gap-2">
            {online ? (
              <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                <Wifi size={13} />
                <span className="hidden sm:inline">Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
                <WifiOff size={13} />
                <span className="hidden sm:inline">Offline</span>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full pb-20">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-slate-700/50 safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-3 h-16">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <Briefcase size={20} />
            <span>Jobs</span>
          </NavLink>
          <NavLink
            to="/archive"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <Archive size={20} />
            <span>Archive</span>
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                isActive ? 'text-brand-400' : 'text-slate-500 hover:text-slate-300'
              }`
            }
          >
            <Settings size={20} />
            <span>Admin</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
