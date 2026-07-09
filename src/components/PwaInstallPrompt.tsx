'use client';

import { useState, useEffect } from 'react';
import { Share2, PlusSquare, X } from 'lucide-react';

export default function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    const isStandalone = 
      (window.navigator as any).standalone === true || 
      window.matchMedia('(display-mode: standalone)').matches;

    const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed') === 'true';

    if (isIOS && !isStandalone && !isDismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 z-50 max-w-md mx-auto bg-[#180b10]/95 border border-[#2a131b]/80 backdrop-blur-md rounded-2xl p-4 shadow-[0_8px_30px_rgb(0,0,0,0.6)] border-t-[#48202f]/80 transition-all duration-300 animate-in slide-in-from-bottom-5">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#f8deed] flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-rose-400 animate-pulse"></span>
            Installer DevSync sur iPhone
          </h3>
          <p className="text-xs text-rose-350/70 mt-1 leading-relaxed">
            Ajoutez l&apos;application sur votre écran d&apos;accueil pour profiter d&apos;une expérience fluide en plein écran.
          </p>
        </div>
        <button 
          onClick={handleDismiss} 
          className="text-rose-350/40 hover:text-[#f8deed] transition-colors p-1 cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-4 pt-3 border-t border-[#2a131b]/60 flex flex-col gap-2.5">
        <div className="flex items-center gap-3 text-xs text-rose-300">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#2a131b]/60 font-bold border border-[#48202f]/40">1</span>
          <p className="flex items-center gap-1.5">
            Appuyez sur le bouton de partage <Share2 className="w-4 h-4 text-[#f8deed] inline" /> dans Safari.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-rose-300">
          <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-[#2a131b]/60 font-bold border border-[#48202f]/40">2</span>
          <p className="flex items-center gap-1.5 flex-wrap">
            Défilez et sélectionnez <span className="font-semibold text-[#f8deed] flex items-center gap-1">Sur l&apos;écran d&apos;accueil <PlusSquare className="w-4 h-4 text-[#f8deed] inline" /></span>.
          </p>
        </div>
      </div>
    </div>
  );
}
