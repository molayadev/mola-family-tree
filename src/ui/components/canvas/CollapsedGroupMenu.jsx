/**
 * CollapsedGroupMenu
 *
 * Stateless floating context menu that appears when the user taps a collapsed
 * family-group bubble on the canvas.
 *
 * Props:
 *   group             – the selected collapsed group object
 *   position          – { left, top } in screen-space pixels
 *   onExpand          – () => void
 *   onEditMembers     – () => void
 *   onOpenManager     – () => void
 *   onMouseDown       – (e) => void  (stop propagation wrapper)
 *   onTouchStart      – (e) => void  (stop propagation wrapper)
 */
export default function CollapsedGroupMenu({ group, position, onExpand, onEditMembers, onOpenManager, onMouseDown, onTouchStart }) {
  if (!group || !position) return null;

  return (
    <div
      className="absolute z-30 pointer-events-auto"
      data-collapsed-group-menu="true"
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        transform: 'translate(-50%, -110%)',
      }}
    >
      <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-2 min-w-[190px]">
        <p className="text-xs font-semibold text-gray-700 px-2 pb-2">
          {group.emoji} {group.label}
        </p>
        <div className="space-y-1">
          <button
            onClick={onExpand}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-orange-50 text-xs font-semibold text-orange-700"
          >
            Expandir grupo
          </button>
          <button
            onClick={onEditMembers}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-blue-50 text-xs font-semibold text-blue-700"
          >
            Editar miembros
          </button>
          <button
            onClick={onOpenManager}
            className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-100 text-xs font-semibold text-gray-700"
          >
            Abrir gestión de grupos
          </button>
        </div>
      </div>
    </div>
  );
}
