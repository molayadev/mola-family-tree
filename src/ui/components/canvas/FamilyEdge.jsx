import { isPartnerEdgeType, isBrokenLabel, resolveEdgeLabel } from '../../../domain/config/constants';

export default function FamilyEdge({ edge, fromNode, toNode, onLineClick }) {
  if (!fromNode || !toNode) return null;

  let d = '';
  const isPartner = isPartnerEdgeType(edge.type);

  if (isPartner) {
    d = `M ${fromNode.x} ${fromNode.y} L ${toNode.x} ${toNode.y}`;
  } else {
    d = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x} ${fromNode.y + 75}, ${toNode.x} ${toNode.y - 75}, ${toNode.x} ${toNode.y}`;
  }

  const currentLabel = resolveEdgeLabel(edge);
  const isBroken = isBrokenLabel(currentLabel);

  const strokeColor = isPartner ? (isBroken ? '#9CA3AF' : '#F9A8D4') : '#CBD5E1';
  const strokeDash = isPartner ? (isBroken ? '5,5' : '0') : '0';

  return (
    <g>
      <path
        d={d}
        stroke="transparent"
        strokeWidth="30"
        className="pointer-events-auto cursor-pointer hover:stroke-purple-300/30 transition-colors"
        onClick={(e) => { e.stopPropagation(); onLineClick(edge.id, fromNode.id); }}
      />
      <path d={d} stroke="white" strokeWidth="6" fill="none" opacity="0.8" />
      <path
        d={d}
        stroke={strokeColor}
        strokeWidth="2"
        fill="none"
        strokeDasharray={strokeDash}
      />
      {isPartner && (
        <circle cx={(fromNode.x + toNode.x) / 2} cy={(fromNode.y + toNode.y) / 2} r="4" fill={strokeColor} />
      )}
    </g>
  );
}
