import { User, ArrowDown, ArrowUp, Heart, HeartCrack, Users, Link as LinkIcon, Tag } from 'lucide-react';
import { COLORS, LINK_TYPES } from '../../../domain/config/constants';

const LINK_ICONS = {
  child: { icon: ArrowDown, color: 'text-orange-500', border: 'border-orange-200', hover: 'hover:bg-orange-50 hover:border-orange-400' },
  parent: { icon: ArrowUp, color: 'text-orange-500', border: 'border-orange-200', hover: 'hover:bg-orange-50 hover:border-orange-400' },
  spouse: { icon: Heart, color: 'text-pink-500', border: 'border-pink-200', hover: 'hover:bg-pink-50 hover:border-pink-400' },
  ex_spouse: { icon: HeartCrack, color: 'text-gray-400', border: 'border-gray-200', hover: 'hover:bg-gray-50 hover:border-gray-400' },
  sibling: { icon: Users, color: 'text-indigo-500', border: 'border-indigo-200', hover: 'hover:bg-indigo-50 hover:border-indigo-400' },
};

export default function LinkTypeSelectionModal({ sourceNode, targetNode, customLinkTypes = [], disableSpouse, onSelect, onClose }) {
  if (!sourceNode || !targetNode) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full animate-in zoom-in duration-200"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-bold text-xl mb-2 text-gray-800">Tipo de Vínculo</h3>
        <p className="text-gray-500 text-sm mb-4">
          ¿Qué relación tiene <strong>{targetNode.data.firstName}</strong> con <strong>{sourceNode.data.firstName}</strong>?
        </p>

        {/* Node previews */}
        <div className="flex items-center justify-center gap-3 mb-5 p-3 bg-gray-50 rounded-2xl">
          <div className="flex flex-col items-center gap-1">
            <div className={`p-2 rounded-full ${COLORS[sourceNode.data.gender]?.bg || COLORS.unknown.bg}`}>
              <User size={18} className={COLORS[sourceNode.data.gender]?.icon || COLORS.unknown.icon} />
            </div>
            <span className="text-[10px] font-bold text-gray-600">{sourceNode.data.firstName}</span>
          </div>
          <span className="text-gray-300 text-lg">↔</span>
          <div className="flex flex-col items-center gap-1">
            <div className={`p-2 rounded-full ${COLORS[targetNode.data.gender]?.bg || COLORS.unknown.bg}`}>
              <User size={18} className={COLORS[targetNode.data.gender]?.icon || COLORS.unknown.icon} />
            </div>
            <span className="text-[10px] font-bold text-gray-600">{targetNode.data.firstName}</span>
          </div>
        </div>

        {/* Link type buttons */}
        <div className="space-y-2">
          {LINK_TYPES.map(lt => {
            const iconInfo = LINK_ICONS[lt.value];
            const Icon = iconInfo.icon;
            const isDisabled = lt.value === 'spouse' && disableSpouse;

            return (
              <button
                key={lt.value}
                disabled={isDisabled}
                onClick={() => onSelect(lt.value)}
                className={`w-full p-3 text-left border-2 rounded-2xl transition-all flex items-center gap-3 ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed border-gray-100 bg-gray-50'
                    : `${iconInfo.border} bg-white ${iconInfo.hover} active:scale-[0.98] shadow-sm`
                }`}
              >
                <Icon size={22} className={isDisabled ? 'text-gray-300' : iconInfo.color} />
                <div className="flex-1">
                  <span className={`font-bold text-sm ${isDisabled ? 'text-gray-400' : 'text-gray-700'}`}>{lt.label}</span>
                  <p className={`text-[10px] ${isDisabled ? 'text-gray-300' : 'text-gray-400'}`}>
                    {isDisabled ? 'Ya tiene cónyuge activo' : lt.description}
                  </p>
                </div>
              </button>
            );
          })}

          {customLinkTypes.length > 0 && (
            <div className="pt-2 mt-2 border-t border-gray-100 space-y-2">
              <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Vínculos personalizados</p>
              {customLinkTypes.map((customType) => {
                const Icon = customType.visualType === 'badge' ? Tag : LinkIcon;
                return (
                  <button
                    key={customType.id}
                    onClick={() => onSelect(`custom:${customType.id}`)}
                    className="w-full p-3 text-left border-2 rounded-2xl transition-all flex items-center gap-3 border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-400 active:scale-[0.98] shadow-sm"
                  >
                    <Icon size={22} style={{ color: customType.color }} />
                    <div className="flex-1">
                      <span className="font-bold text-sm text-gray-700">{customType.name}</span>
                      <p className="text-[10px] text-gray-400">Personalizado • {customType.visualType}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2 text-gray-400 hover:text-gray-600 font-medium"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
