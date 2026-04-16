import { User } from 'lucide-react';
import { COLORS } from '../../../domain/config/constants';

export default function PartnerSelectionModal({ selection, nodes, onClose, onSelect }) {
  if (!selection) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
        <h3 className="font-bold text-xl mb-2 text-gray-800">Añadir Hijo</h3>
        <p className="text-gray-500 text-sm mb-6">¿Con quién tuvo este hijo? El sistema conectará al hijo con ambos padres automáticamente.</p>

        <div className="space-y-3">
          {selection.partners.map(pId => {
            const p = nodes.find(n => n.id === pId);
            if (!p) return null;
            return (
              <button
                key={pId}
                className="w-full p-4 text-left border-2 border-orange-100 rounded-2xl hover:bg-orange-50 hover:border-orange-300 transition-colors flex items-center gap-3 shadow-sm"
                onClick={() => onSelect(pId)}
              >
                <div className={`p-2 rounded-full ${COLORS[p.data.gender]?.bg || COLORS.unknown.bg}`}>
                  <User size={20} className={COLORS[p.data.gender]?.icon || COLORS.unknown.icon} />
                </div>
                <span className="font-bold text-gray-700">{p.data.firstName} {p.data.lastName}</span>
              </button>
            );
          })}

          <div className="relative py-4 flex items-center">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">O alternativamente</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          <button
            className="w-full p-4 text-center border-2 border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-500 font-medium"
            onClick={() => onSelect(null)}
          >
            Padre/Madre Desconocido (Solo)
          </button>
        </div>

        <button onClick={onClose} className="mt-6 w-full py-2 text-gray-400 hover:text-gray-600 font-medium">Cancelar</button>
      </div>
    </div>
  );
}
