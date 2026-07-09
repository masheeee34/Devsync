'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV === 'production') {
      const registerSW = async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js');
          console.log('Service Worker registered with scope:', reg.scope);
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      };

      if (document.readyState === 'complete') {
        registerSW();
      } else {
        window.addEventListener('load', registerSW);
        return () => window.removeEventListener('load', registerSW);
      }
    } else {
      // In development, clean up any registered service workers silently to prevent HMR conflicts
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().then(() => {
            console.log('Dev Mode: Unregistered active Service Worker successfully.');
          });
        }
      });
    }
  }, []);

  return null;
}
