import { fanPolarToXY, fanArcPath, getFanSectorColor } from '../../../domain/utils/fanUtils';

/**
 * FanChartRenderer
 *
 * Stateless SVG group that renders the ancestor fan chart (radial view).
 *
 * Props:
 *   fanData           – output of buildFanSlots()
 *   nodes             – full nodes array (for name lookup)
 *   selectedNodeId    – currently selected node id
 *   openedNodeId      – node id currently open in the actions modal
 *   stateRef              – canvas hook state ref (stateRef.current.lastTouchEndTime)
 *   onOpenActionsModal  – (nodeId) => void
 *   renderedNodeById  – Map<nodeId, node> (for overridden positions)
 */
export default function FanChartRenderer({
  fanData,
  nodes,
  selectedNodeId,
  openedNodeId,
  stateRef,
  onOpenActionsModal,
  renderedNodeById,
}) {
  if (!fanData) return null;

  const { rings, focusNodeId: fanFocusId, focusR } = fanData;
  const focusRenderNode = renderedNodeById.get(fanFocusId);
  const fcx = focusRenderNode?.x ?? fanData.cx;
  const fcy = focusRenderNode?.y ?? fanData.cy;
  const allNodes = new Map(nodes.map(n => [n.id, n]));

  const handleSlotMouseDown = (nodeId) => (e) => {
    e.stopPropagation();
    if (Date.now() - (stateRef?.current?.lastTouchEndTime ?? 0) < 500) return;
    onOpenActionsModal(nodeId);
  };

  const handleSlotTouchStart = (nodeId) => (e) => {
    e.stopPropagation();
    onOpenActionsModal(nodeId);
  };

  return (
    <g>
      {/* Outer half-circle border */}
      {rings.length > 0 && (() => {
        const lastRing = rings[rings.length - 1];
        const maxR = lastRing.outerR;
        const left = fanPolarToXY(fcx, fcy, maxR, 0);
        const right = fanPolarToXY(fcx, fcy, maxR, 180);
        return (
          <path
            d={`M ${left.x} ${left.y} A ${maxR} ${maxR} 0 0 0 ${right.x} ${right.y}`}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        );
      })()}

      {/* Arc sectors */}
      {rings.flatMap(ring =>
        ring.slots.map(slot => {
          const path = fanArcPath(fcx, fcy, slot.innerR, slot.outerR, slot.startAngle, slot.endAngle);
          const fill = getFanSectorColor(slot.gen, slot.slotIndex, slot.numSlots, !!slot.nodeId);
          const isSelected = slot.nodeId && (slot.nodeId === selectedNodeId || slot.nodeId === openedNodeId);
          const midAngle = (slot.startAngle + slot.endAngle) / 2;
          const midR = (slot.innerR + slot.outerR) / 2;
          const textPos = fanPolarToXY(fcx, fcy, midR, midAngle);
          const textRotation = midAngle - 90;
          const node = slot.nodeId ? allNodes.get(slot.nodeId) : null;
          const label = node
            ? [node.data?.firstName, node.data?.lastName].filter(Boolean).join(' ') || '?'
            : null;

          const fontSize = Math.max(7, 13 - slot.gen * 1.5);

          if (slot.nodeId) {
            return (
              <g
                key={`fan-${slot.gen}-${slot.slotIndex}`}
                className="pointer-events-auto cursor-pointer"
                onMouseDown={handleSlotMouseDown(slot.nodeId)}
                onTouchStart={handleSlotTouchStart(slot.nodeId)}
              >
                <path
                  d={path}
                  fill={fill}
                  stroke={isSelected ? '#f97316' : '#cbd5e1'}
                  strokeWidth={isSelected ? 2 : 0.8}
                />
                {label && (
                  <text
                    x={textPos.x}
                    y={textPos.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={fontSize}
                    fontWeight="500"
                    fill="#1e293b"
                    transform={`rotate(${textRotation}, ${textPos.x}, ${textPos.y})`}
                    className="pointer-events-none select-none"
                  >
                    {label.length > 14 ? `${label.slice(0, 13)}…` : label}
                  </text>
                )}
              </g>
            );
          }

          return (
            <g key={`fan-empty-${slot.gen}-${slot.slotIndex}`}>
              <path
                d={path}
                fill={fill}
                stroke="#e2e8f0"
                strokeWidth={0.8}
                strokeDasharray="2 2"
              />
            </g>
          );
        })
      )}

      {/* Focus node center circle */}
      <circle
        cx={fcx}
        cy={fcy}
        r={focusR - 2}
        fill="white"
        stroke="#cbd5e1"
        strokeWidth={1.5}
        className="pointer-events-auto cursor-pointer"
        onMouseDown={handleSlotMouseDown(fanFocusId)}
        onTouchStart={handleSlotTouchStart(fanFocusId)}
      />

      {(() => {
        const focusNodeData = allNodes.get(fanFocusId);
        const name = focusNodeData
          ? [focusNodeData.data?.firstName, focusNodeData.data?.lastName].filter(Boolean).join(' ') || '?'
          : '?';
        const words = name.split(' ');
        return (
          <text
            x={fcx}
            y={fcy}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={12}
            fontWeight="600"
            fill="#1e293b"
            className="pointer-events-none select-none"
          >
            {words.slice(0, 2).map((word, i) => (
              <tspan key={i} x={fcx} dy={i === 0 ? (words.length > 1 ? '-0.6em' : '0') : '1.2em'}>
                {word}
              </tspan>
            ))}
          </text>
        );
      })()}
    </g>
  );
}
