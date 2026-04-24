import { Eye, Pencil, Venus, Mars, GitBranch } from 'lucide-react';

/**
 * CanvasNodeControls
 *
 * Stateless SVG foreignObject overlay rendered above the currently
 * selected/focused node. Shows:
 *   - Parent branch filter buttons (maternal / paternal)
 *   - "Eye" button to set the node as the focus / perspective root
 *   - "Pencil" button to open the NodeActionsModal
 *
 * Props:
 *   controlsRenderNode     – node object with { id, x, y } (may have overridden position)
 *   controlsNode           – canonical node object (for id lookups)
 *   showTreeParentFilters  – whether to show the branch-filter buttons
 *   showTreeEyeButton      – whether to show the perspective eye button
 *   nodeParentControls     – { options: [...], activeParentId }
 *   lineageViewMode        – current view mode string
 *   stateRef               – canvas hook state ref (stateRef.current.lastTouchEndTime)
 *   setSelectedNodeId      – setter
 *   setFocusNodeId         – setter
 *   setParentChoiceByChildId – updater
 *   setRelativesBranchMode – setter
 *   setLineageViewMode     – setter
 *   pendingViewCenterRef   – ref flag
 *   onOpenActionsModal     – (nodeId) => void
 */
export default function CanvasNodeControls({
  controlsRenderNode,
  controlsNode,
  showTreeParentFilters,
  showTreeEyeButton,
  nodeParentControls,
  lineageViewMode,
  stateRef,
  setSelectedNodeId,
  setFocusNodeId,
  setParentChoiceByChildId,
  setRelativesBranchMode,
  setLineageViewMode,
  pendingViewCenterRef,
  onOpenActionsModal,
}) {
  if (!controlsRenderNode) return null;

  return (
    <g
      className="pointer-events-auto"
      transform={`translate(${controlsRenderNode.x}, ${controlsRenderNode.y - 56})`}
    >
      <foreignObject x={-70} y={-12} width={140} height={24}>
        <div className="w-full h-full flex items-center justify-center gap-1">
          {showTreeParentFilters && nodeParentControls.options.slice(0, 2).map((option) => {
            const isActive = nodeParentControls.activeParentId === option.id;
            const ParentIcon = option.gender === 'female'
              ? Venus
              : (option.gender === 'male' ? Mars : GitBranch);
            const branchMode = option.gender === 'female'
              ? 'maternal'
              : (option.gender === 'male' ? 'paternal' : 'ancestors');

            const handleBranchSelect = (e) => {
              e.stopPropagation();
              if (e.type === 'mousedown' && Date.now() - (stateRef?.current?.lastTouchEndTime ?? 0) < 500) return;
              setSelectedNodeId(controlsNode.id);
              setFocusNodeId(controlsNode.id);
              setParentChoiceByChildId(prev => ({ ...prev, [controlsNode.id]: option.id }));
              setRelativesBranchMode(branchMode);
              if (lineageViewMode === 'all') {
                setLineageViewMode('relatives');
                pendingViewCenterRef.current = true;
              }
            };

            return (
              <button
                key={option.id}
                type="button"
                onMouseDown={handleBranchSelect}
                onTouchStart={handleBranchSelect}
                className={`w-5 h-5 rounded-full text-white flex items-center justify-center ${
                  isActive ? 'bg-orange-500' : 'bg-slate-400'
                }`}
                title={option.label}
              >
                <ParentIcon size={11} />
              </button>
            );
          })}

          {showTreeEyeButton && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.stopPropagation();
                if (Date.now() - (stateRef?.current?.lastTouchEndTime ?? 0) < 500) return;
                setSelectedNodeId(controlsNode.id);
                setFocusNodeId(controlsNode.id);
                setRelativesBranchMode(null);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                setSelectedNodeId(controlsNode.id);
                setFocusNodeId(controlsNode.id);
                setRelativesBranchMode(null);
              }}
              className="w-5 h-5 rounded-full border border-slate-300 bg-white text-slate-600 flex items-center justify-center"
              title="Activar perspectiva"
            >
              <Eye size={12} />
            </button>
          )}

          <button
            type="button"
            onMouseDown={(e) => {
              e.stopPropagation();
              if (Date.now() - (stateRef?.current?.lastTouchEndTime ?? 0) < 500) return;
              onOpenActionsModal(controlsNode.id);
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              onOpenActionsModal(controlsNode.id);
            }}
            className="w-5 h-5 rounded-full border border-orange-300 bg-white text-orange-600 flex items-center justify-center"
            title="Editar acciones"
          >
            <Pencil size={12} />
          </button>
        </div>
      </foreignObject>
    </g>
  );
}
