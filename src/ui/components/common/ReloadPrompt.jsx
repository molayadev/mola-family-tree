import { useEffect, useRef } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function ReloadPrompt() {
  const intervalRef = useRef(null);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      if (registration) {
        // Check for updates every 60 seconds
        intervalRef.current = setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
  });

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
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
