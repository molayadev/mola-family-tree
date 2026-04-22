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
  onStartEditMembers,
  onDelete,
  onIdentifyMembers,
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
          <div className="flex flex-wrap gap-2">
            <button onClick={onStartCreate} className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold">
              Nuevo grupo
            </button>
            <button onClick={onExpandAll} className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700">
              Expandir todos
            </button>
          </div>

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
                    Editar grupo
                  </button>
                  <button onClick={() => onStartEditMembers(group.id)} className="px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold">
                    Editar miembros
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
