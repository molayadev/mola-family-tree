import Input from '../common/Input';

export default function FamilyGroupsModal({
  isOpen,
  groups,
  isolatedGroupId,
  onClose,
  onShowOnly,
  onToggleCollapse,
  onExpandAll,
  onStartCreate,
  onStartEdit,
  onDelete,
  onIdentifyMembers,
  draft,
  onDraftLabelChange,
  onDraftColorChange,
  onDraftEmojiRandom,
  onSaveDraft,
  onCancelDraft,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-[85vh] overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Grupos familiares</h3>
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">Cerrar</button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto max-h-[70vh]">
          {!draft && (
            <div className="flex flex-wrap gap-2">
              <button onClick={onStartCreate} className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
                Nuevo grupo
              </button>
              <button onClick={onExpandAll} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700">
                Expandir todos
              </button>
            </div>
          )}

          {draft && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-white border border-orange-200 flex items-center justify-center text-2xl">
                  {draft.emoji}
                </div>
                <button onClick={onDraftEmojiRandom} className="px-3 py-2 rounded-lg bg-white border border-orange-200 hover:bg-orange-100 text-sm">
                  Emoji random
                </button>
              </div>
              <Input
                label="Etiqueta del grupo"
                value={draft.label}
                onChange={(e) => onDraftLabelChange(e.target.value)}
                placeholder="Ej. Familia de Ana y Carlos"
              />
              <div className="mb-4">
                <label htmlFor="family-group-color-input" className="block text-sm font-medium text-gray-600 mb-1 ml-1">
                  Color del grupo
                </label>
                <input
                  id="family-group-color-input"
                  type="color"
                  value={draft.color}
                  onChange={(e) => onDraftColorChange(e.target.value)}
                  className="w-full h-11 rounded-xl border border-gray-300 bg-white px-2"
                />
              </div>
              <p className="text-xs text-gray-600">
                Selecciona nodos tocándolos en el árbol. Toca de nuevo para deseleccionar. Seleccionados: {draft.nodeIds.length}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={onSaveDraft}
                  disabled={!draft.label.trim() || draft.nodeIds.length === 0}
                  className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold"
                >
                  Guardar selección
                </button>
                <button onClick={onCancelDraft} className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-sm font-semibold text-gray-700">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {groups.length === 0 && (
              <p className="text-sm text-gray-500">Aún no hay grupos creados.</p>
            )}
            {groups.map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-xl p-3 bg-white">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{group.emoji}</span>
                    <span className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: group.color }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-800 truncate">{group.label}</p>
                      <p className="text-xs text-gray-500">{group.nodeIds.length} miembros</p>
                    </div>
                  </div>
                  {isolatedGroupId === group.id && (
                    <span className="text-[10px] px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold">Solo</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button onClick={() => onIdentifyMembers(group.id)} className="px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold">
                    Identificar integrantes
                  </button>
                  <button onClick={() => onShowOnly(group.id)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold">
                    Ver solo
                  </button>
                  <label className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer">
                    <span>{group.collapsed ? 'Colapsado' : 'Expandido'}</span>
                    <input
                      type="checkbox"
                      checked={!group.collapsed}
                      onChange={() => onToggleCollapse(group.id)}
                      className="accent-orange-500"
                    />
                  </label>
                  <button onClick={() => onStartEdit(group.id)} className="px-2.5 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold">
                    Editar
                  </button>
                  <button onClick={() => onDelete(group.id)} className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold">
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
