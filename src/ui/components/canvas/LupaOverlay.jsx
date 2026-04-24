import { Search, X } from 'lucide-react';

/**
 * LupaOverlay
 *
 * Stateless bottom navigation bar shown while Lupa organisation mode is active.
 * Provides a hint to the user and an exit button.
 */
export default function LupaOverlay({ onExit }) {
  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 pointer-events-auto flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-green-200 px-3 py-2">
        <Search size={14} className="text-green-600 shrink-0" />
        <span className="text-xs font-bold text-green-800 whitespace-nowrap">
          Orden Lupa
          <span className="ml-1 text-green-600">• toca una bolsa para expandir/colapsar</span>
        </span>

        <button
          onClick={onExit}
          className="min-h-[36px] min-w-[36px] flex items-center gap-1.5 px-2 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all text-gray-600 text-xs font-semibold"
          title="Salir del modo Lupa"
        >
          <X size={13} />
          <span className="hidden sm:inline">Salir</span>
        </button>
      </div>
    </div>
  );
}
