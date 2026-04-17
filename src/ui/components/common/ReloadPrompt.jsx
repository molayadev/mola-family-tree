import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const POLL_INTERVAL_MS = 60 * 1000;   // check every 60 s
const POLL_DURATION_MS = 5 * 60 * 1000; // stop after 5 min

export default function ReloadPrompt() {
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Poll for updates every 60 s, but only during the first 5 minutes
        intervalRef.current = setInterval(() => {
          registration.update();
        }, POLL_INTERVAL_MS);

        timeoutRef.current = setTimeout(() => {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }, POLL_DURATION_MS);
      }
    },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-white border border-orange-200 rounded-2xl shadow-xl px-5 py-4 flex items-center gap-4 max-w-sm w-[calc(100%-2rem)]">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-800">Nueva versión disponible</p>
        <p className="text-xs text-gray-500">Actualiza para obtener las mejoras.</p>
      </div>
      <button
        onClick={() => updateServiceWorker(true)}
        className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors whitespace-nowrap"
      >
        Actualizar
      </button>
    </div>
  );
}
