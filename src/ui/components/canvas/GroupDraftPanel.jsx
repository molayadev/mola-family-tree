import Input from '../common/Input';
import { normalizeGroupColor, randomGroupEmoji } from '../../../domain/utils/groupUtils';

/**
 * GroupDraftPanel
 *
 * Stateless overlay panel shown on the canvas while a family group is being
 * created or edited (members are selected by tapping nodes directly on the
 * canvas).
 *
 * Props:
 *   groupDraft        – current draft object { mode, label, emoji, color, nodeIds }
 *   onFieldChange     – (field, value) => void
 *   onSave            – () => void
 *   onCancel          – () => void
 *   onRandomEmoji     – () => void
 */
export default function GroupDraftPanel({ groupDraft, onFieldChange, onSave, onCancel, onRandomEmoji }) {
  if (!groupDraft) return null;

  const canSave = groupDraft.label.trim().length > 0 && groupDraft.nodeIds.length > 0;

  return (
    <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="w-[min(90vw,460px)] bg-white/95 backdrop-blur-md text-gray-700 p-4 rounded-2xl shadow-xl border border-orange-200">
        <div className="flex items-start gap-2">
          <div className="w-16">
            <label htmlFor="group-emoji-input" className="block text-xs font-semibold text-gray-500 mb-1">Emoji</label>
            <input
              id="group-emoji-input"
              type="text"
              value={groupDraft.emoji}
              onChange={(e) => onFieldChange('emoji', e.target.value)}
              className="w-full px-2 py-2 rounded-lg border border-gray-300 text-center text-xl"
              placeholder="🙂"
            />
          </div>
          <div className="flex-1">
            <Input
              label="Alias del grupo"
              value={groupDraft.label}
              onChange={(e) => onFieldChange('label', e.target.value)}
              placeholder="Ej. Familia de Ana y Carlos"
            />
          </div>
        </div>

        <div className="mb-3">
          <label htmlFor="group-color-input-canvas" className="block text-xs font-semibold text-gray-500 mb-1">Color del grupo</label>
          <input
            id="group-color-input-canvas"
            type="color"
            value={normalizeGroupColor(groupDraft.color)}
            onChange={(e) => onFieldChange('color', e.target.value)}
            className="w-full h-10 rounded-lg border border-gray-300 bg-white px-2"
          />
        </div>

        <p className="text-xs text-gray-600 mb-3">
          Edición de miembros: toca nodos para seleccionar o deseleccionar. Seleccionados: {groupDraft.nodeIds.length}
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={onSave}
            disabled={!canSave}
            className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold"
          >
            Aceptar
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-sm font-semibold text-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={onRandomEmoji}
            className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold"
          >
            Emoji random
          </button>
        </div>
      </div>
    </div>
  );
}
