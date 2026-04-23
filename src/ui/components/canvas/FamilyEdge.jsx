import { EDGE_TYPES, isPartnerEdgeType, isBrokenLabel, resolveEdgeLabel } from '../../../domain/config/constants';

/** Vertical offset so parent-child lines start/end at the node circle edge */
const NODE_RADIUS = 32;
const CURVE_ENTRY_FACTOR = 0.45;
const MAX_CUSTOM_BADGE_LABEL_LENGTH = 12;
const truncateBadgeLabel = (label = '') => (
  label.length > MAX_CUSTOM_BADGE_LABEL_LENGTH
    ? `${label.slice(0, MAX_CUSTOM_BADGE_LABEL_LENGTH - 1)}…`
    : label
);

export default function FamilyEdge({ edge, fromNode, toNode, onLineClick, curveMode = 'geometric' }) {
  if (!fromNode || !toNode) return null;
  if (edge.type === EDGE_TYPES.SIBLING) return null;

  const isPartner = isPartnerEdgeType(edge.type);
  const isParentBundle = edge.type === 'parent_bundle';
  const currentLabel = resolveEdgeLabel(edge);
  const isBroken = edge.type === EDGE_TYPES.EX_SPOUSE || isBrokenLabel(currentLabel);

  let d = '';
  let strokeColor;
  let strokeWidth;
  let strokeDash;

  const isCurved = curveMode === 'curved';

  if (isPartner) {
    // Partner lines: straight horizontal-ish, always pink; broken relations are dashed.
    if (isCurved) {
      const cx = (fromNode.x + toNode.x) / 2;
      d = `M ${fromNode.x} ${fromNode.y} Q ${cx} ${Math.min(fromNode.y, toNode.y) - 28} ${toNode.x} ${toNode.y}`;
    } else {
      d = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
    }
    strokeColor = '#F9A8D4';
    strokeWidth = 1.5;
    strokeDash = isBroken ? '6,4' : '0';
  } else if (edge.type === EDGE_TYPES.CUSTOM) {
    if (isCurved) {
      const controlY = (fromNode.y + toNode.y) / 2;
      d = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x} ${controlY}, ${toNode.x} ${controlY}, ${toNode.x} ${toNode.y}`;
    } else {
      d = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
    }
    strokeColor = edge.styleColor || '#8B5CF6';
    strokeWidth = 1.5;
    strokeDash = edge.styleMode === 'dashed' ? '6,4' : '0';
  } else if (isParentBundle) {
    // Couple-connector → child line (single branch)
    if (isCurved) {
      const childEntryY = toNode.y - (NODE_RADIUS * CURVE_ENTRY_FACTOR);
      const controlY = fromNode.y + ((childEntryY - fromNode.y) * 0.45);
      d = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x} ${controlY}, ${toNode.x} ${controlY}, ${toNode.x} ${childEntryY}`;
    } else {
      const midY = (fromNode.y + toNode.y) / 2;
      d = `M ${fromNode.x} ${fromNode.y} L ${fromNode.x} ${midY} L ${toNode.x} ${midY} L ${toNode.x} ${toNode.y - NODE_RADIUS}`;
    }
    strokeColor = edge.styleColor || '#F9A8D4';
    strokeWidth = 1.2;
    strokeDash = edge.styleDash || '0';
  } else {
    // Single-parent → child line
    if (isCurved) {
      const startY = fromNode.y;
      const childEntryY = toNode.y - (NODE_RADIUS * CURVE_ENTRY_FACTOR);
      const controlY = startY + ((childEntryY - startY) * 0.5);
      d = `M ${fromNode.x} ${startY} C ${fromNode.x} ${controlY}, ${toNode.x} ${controlY}, ${toNode.x} ${childEntryY}`;
    } else {
      const midY = (fromNode.y + toNode.y) / 2;
      d = `M ${fromNode.x} ${fromNode.y + NODE_RADIUS} L ${fromNode.x} ${midY} L ${toNode.x} ${midY} L ${toNode.x} ${toNode.y - NODE_RADIUS}`;
    }
    strokeColor = edge.styleColor || '#111827';
    strokeWidth = 1;
    strokeDash = edge.styleDash || '0';
  }

  return (
    <g>
      {/* Invisible wide hit-area for click/tap */}
      <path
        d={d}
        stroke="transparent"
        strokeWidth="20"
        fill="none"
        className="pointer-events-auto cursor-pointer hover:stroke-purple-300/20 transition-colors"
        onClick={(e) => { e.stopPropagation(); onLineClick(edge.id, edge.sourceNodeId || fromNode.id); }}
      />
      {/* Visible line */}
      {edge.type !== EDGE_TYPES.CUSTOM || edge.styleMode !== 'badge' ? (
        <path
          d={d}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDash}
          strokeLinejoin="round"
        />
      ) : null}
      {/* Midpoint dot on partner edges – placed on the true curve centre in curved mode */}
      {isPartner && (() => {
        let dotCx = (fromNode.x + toNode.x) / 2;
        let dotCy = (fromNode.y + toNode.y) / 2;
        if (isCurved) {
          // Quadratic Bézier midpoint (t=0.5): 0.25*P0 + 0.5*P_ctrl + 0.25*P2
          const curveControlY = Math.min(fromNode.y, toNode.y) - 28;
          dotCy = 0.25 * fromNode.y + 0.5 * curveControlY + 0.25 * toNode.y;
        }
        return <circle cx={dotCx} cy={dotCy} r="3" fill={strokeColor} />;
      })()}
      {edge.type === EDGE_TYPES.CUSTOM && edge.styleMode === 'badge' && (
        <g>
          <rect
            x={((fromNode.x + toNode.x) / 2) - 34}
            y={((fromNode.y + toNode.y) / 2) - 11}
            width="68"
            height="22"
            rx="11"
            fill={edge.styleColor || '#8B5CF6'}
            opacity="0.92"
          />
          <text
            x={(fromNode.x + toNode.x) / 2}
            y={((fromNode.y + toNode.y) / 2) + 4}
            textAnchor="middle"
            className="fill-white text-[10px] font-bold pointer-events-none select-none"
          >
            {truncateBadgeLabel(edge.label || '')}
          </text>
        </g>
      )}
    </g>
  );
}
