import { Link as LinkIcon, X } from 'lucide-react';

/**
 * LinkingModeBanner
 *
 * Stateless overlay shown while the user is in the manual node-linking flow
 * (step 1: waiting for the user to tap a target node).
 */
export default function LinkingModeBanner({ onCancel }) {
  return (
    <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
        <LinkIcon size={18} />
        <span className="text-sm font-bold">Toca el nodo que quieres vincular</span>
        <button
          onClick={onCancel}
          className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
          title="Cancelar"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}
