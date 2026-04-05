import { useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

export default function InstallBanner() {
  const { isIOS, shouldShow, install, dismiss } = useInstallPrompt();
  const [installing, setInstalling] = useState(false);

  if (!shouldShow) return null;

  const handleInstall = async () => {
    setInstalling(true);
    await install();
    setInstalling(false);
  };

  if (isIOS) {
    return (
      <div className="fixed bottom-[72px] left-0 right-0 z-50 px-3 pb-1 animate-slide-up">
        <div className="max-w-2xl mx-auto">
          <div className="bg-slate-800 border border-slate-600/60 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-700/60">
              <div className="flex items-center gap-3">
                <img src="/icon-192.png" alt="App icon" className="w-10 h-10 rounded-xl" />
                <div>
                  <p className="text-sm font-bold text-white">Install Basic ITS</p>
                  <p className="text-xs text-slate-400">Add to your Home Screen</p>
                </div>
              </div>
              <button
                onClick={dismiss}
                className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="px-4 py-3 space-y-2.5">
              <p className="text-xs text-slate-400 font-medium">Follow these steps in Safari:</p>
              <div className="flex items-center gap-3 bg-slate-700/50 rounded-xl px-3 py-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                <span className="text-sm text-slate-200">Tap the</span>
                <div className="flex items-center gap-1 bg-slate-600 rounded-lg px-2 py-1">
                  <Share size={14} className="text-brand-400" />
                  <span className="text-xs text-slate-300 font-medium">Share</span>
                </div>
                <span className="text-sm text-slate-200">button</span>
              </div>
              <div className="flex items-center gap-3 bg-slate-700/50 rounded-xl px-3 py-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</span>
                <div className="flex items-center gap-1 bg-slate-600 rounded-lg px-2 py-1">
                  <Plus size={14} className="text-brand-400" />
                  <span className="text-xs text-slate-300 font-medium">Add to Home Screen</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-slate-700/50 rounded-xl px-3 py-2.5">
                <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">3</span>
                <span className="text-sm text-slate-200">Tap <strong className="text-white">Add</strong> to confirm</span>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={dismiss}
                className="w-full text-xs text-slate-500 hover:text-slate-400 py-1 transition-colors"
              >
                Remind me later
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-[72px] left-0 right-0 z-50 px-3 pb-1 animate-slide-up">
      <div className="max-w-2xl mx-auto">
        <div className="bg-slate-800 border border-slate-600/60 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-4 px-4 py-4">
            <img src="/icon-192.png" alt="App icon" className="w-12 h-12 rounded-2xl shadow-lg flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Install Basic ITS</p>
              <p className="text-xs text-slate-400 mt-0.5">Works offline &bull; Fast &bull; No App Store needed</p>
            </div>
            <button
              onClick={dismiss}
              className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-600 transition-colors flex-shrink-0"
            >
              <X size={14} />
            </button>
          </div>
          <div className="flex gap-2 px-4 pb-4">
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-slate-400 bg-slate-700/60 hover:bg-slate-700 transition-colors"
            >
              Not now
            </button>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-600 hover:bg-brand-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              <Download size={15} />
              {installing ? 'Installing…' : 'Install App'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
