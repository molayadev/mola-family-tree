import { Layers3, Atom, WandSparkles, Undo, X } from 'lucide-react';

const OPTIONS = [
  {
    key: 'levels',
    title: 'Orden por niveles',
    description: 'Generaciones ordenadas y hermanos por nacimiento (mayor → menor).',
    icon: Layers3,
  },
  {
    key: 'atomic',
    title: 'Orden atómico',
    description: 'Conexiones curvas y ramificación de hijos desde el vínculo parental.',
    icon: Atom,
  },
  {
    key: 'aizado',
    title: 'Orden Aizado',
    // "Aizado" follows the exact product wording requested for this mode.
    description: 'Distribución despejada para facilitar foco y expansión.',
    icon: WandSparkles,
  },
];

export default function OrganizeTreeModal({
  isOpen,
  onClose,
  onSelectMode,
  onUndo,
  canUndo,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/35 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Organizar árbol</h3>
            <p className="text-xs text-gray-500 mt-1">Disponible solo en vistas Árbol y Todo.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            title="Cerrar"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          {OPTIONS.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.key}
                onClick={() => onSelectMode(option.key)}
                className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-orange-500">
                    <Icon size={18} />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-gray-800">{option.title}</span>
                    <span className="block text-xs text-gray-500 mt-0.5">{option.description}</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">Puedes deshacer cualquier organización.</span>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-orange-50 disabled:opacity-40 disabled:cursor-not-allowed text-sm text-gray-700"
          >
            <Undo size={14} />
            Deshacer
          </button>
        </div>
      </div>
    </div>
  );
}
