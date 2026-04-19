import { EDGE_TYPES, isPartnerEdgeType, isBrokenLabel, resolveEdgeLabel } from '../../../domain/config/constants';

/** Vertical offset so parent-child lines start/end at the node circle edge */
const NODE_RADIUS = 32;

export default function FamilyEdge({ edge, fromNode, toNode, onLineClick }) {
  if (!fromNode || !toNode) return null;
  if (edge.type === EDGE_TYPES.SIBLING) return null;

  const isPartner = isPartnerEdgeType(edge.type);
  const currentLabel = resolveEdgeLabel(edge);
  const isBroken = isBrokenLabel(currentLabel);

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
      <path
        d={d}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={strokeDash}
        strokeLinejoin="round"
      />
      {/* Midpoint dot on partner edges */}
      {isPartner && (
        <circle
          cx={(fromNode.x + toNode.x) / 2}
          cy={(fromNode.y + toNode.y) / 2}
          r="3"
          fill={strokeColor}
        />
      )}
    </g>
  );
}
