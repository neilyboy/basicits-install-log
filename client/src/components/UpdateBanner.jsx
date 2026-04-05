import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw } from 'lucide-react';

export default function UpdateBanner() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] animate-slide-down">
      <div className="max-w-2xl mx-auto px-3 pt-2">
        <div className="bg-brand-600 rounded-xl shadow-xl px-4 py-3 flex items-center gap-3">
          <RefreshCw size={16} className="text-white flex-shrink-0 animate-spin-slow" />
          <p className="flex-1 text-sm font-medium text-white">App update available</p>
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1.5 bg-white text-brand-700 rounded-lg text-xs font-bold hover:bg-brand-50 transition-colors flex-shrink-0"
          >
            Reload
          </button>
        </div>
      </div>
    </div>
  );
}
