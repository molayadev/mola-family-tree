import { EDGE_TYPES, isPartnerEdgeType, isBrokenLabel, resolveEdgeLabel } from '../../../domain/config/constants';

/** Vertical offset so parent-child lines start/end at the node circle edge */
const NODE_RADIUS = 32;
const MAX_CUSTOM_BADGE_LABEL_LENGTH = 12;
const truncateBadgeLabel = (label = '') => (
  label.length > MAX_CUSTOM_BADGE_LABEL_LENGTH
    ? `${label.slice(0, MAX_CUSTOM_BADGE_LABEL_LENGTH - 1)}…`
    : label
);

export default function FamilyEdge({ edge, fromNode, toNode, onLineClick }) {
  if (!fromNode || !toNode) return null;
  if (edge.type === EDGE_TYPES.SIBLING) return null;

  const isPartner = isPartnerEdgeType(edge.type);
  const currentLabel = resolveEdgeLabel(edge);
  const isBroken = edge.type === EDGE_TYPES.EX_SPOUSE || isBrokenLabel(currentLabel);

  let d = '';
  let strokeColor;
  let strokeWidth;
  let strokeDash;

  if (isPartner) {
    // Partner lines: straight horizontal-ish, solid pink or dashed grey
    d = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
    strokeColor = isBroken ? '#9CA3AF' : '#F9A8D4';
    strokeWidth = isBroken ? 1 : 1.5;
    strokeDash = isBroken ? '6,4' : '0';
  } else if (edge.type === EDGE_TYPES.CUSTOM) {
    d = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
    strokeColor = edge.styleColor || '#8B5CF6';
    strokeWidth = 1.5;
    strokeDash = edge.styleMode === 'dashed' ? '6,4' : '0';
  } else {
    // Parent→child lines: orthogonal step path (down, across, down)
    const midY = (fromNode.y + toNode.y) / 2;
    d = `M ${fromNode.x} ${fromNode.y + NODE_RADIUS} L ${fromNode.x} ${midY} L ${toNode.x} ${midY} L ${toNode.x} ${toNode.y - NODE_RADIUS}`;
    strokeColor = '#94A3B8';
    strokeWidth = 1;
    strokeDash = '0';
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
        onClick={(e) => { e.stopPropagation(); onLineClick(edge.id, fromNode.id); }}
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
      {/* Midpoint dot on partner edges */}
      {isPartner && (
        <circle
          cx={(fromNode.x + toNode.x) / 2}
          cy={(fromNode.y + toNode.y) / 2}
          r="3"
          fill={strokeColor}
        />
      )}
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
