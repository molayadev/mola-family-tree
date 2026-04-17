import { User } from 'lucide-react';
import { COLORS } from '../../../domain/config/constants';
import { formatNodeDates, isDeceased } from '../../../domain/utils/dateUtils';

/** Small badge colours per twin type */
const TWIN_BADGE = {
  twins:      { fill: '#7C3AED', label: '=' },   // purple – identical twins
  fraternal:  { fill: '#0D9488', label: '≈' },   // teal   – fraternal twins
};

export default function FamilyNode({ node, isSelected, isDimmed, isLinkTarget, onPointerDown }) {
  const deceased = isDeceased(node.data);
  const style = COLORS[node.data.gender] || COLORS.unknown;

  let strokeClass = 'stroke-white stroke-[3px]';
  if (isSelected) strokeClass = 'stroke-orange-400 stroke-[4px]';
  else if (isLinkTarget) strokeClass = 'stroke-green-500 stroke-[4px]';

  const dateText = formatNodeDates(node.data);
  const twinBadge = node.data.twinType ? TWIN_BADGE[node.data.twinType] : null;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className="pointer-events-auto cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => onPointerDown(e, node.id)}
      onTouchStart={(e) => onPointerDown(e, node.id)}
      opacity={isDimmed ? 0.4 : 1}
    >
      {/* Invisible hit-area covering the circle + text below to ensure mobile taps register */}
      <rect x="-40" y="-36" width="80" height="104" fill="transparent" />

      <circle r="32" fill="black" opacity="0.1" cy="4" />
      <circle
        r="30"
        className={`${isDimmed ? 'fill-gray-200' : (deceased ? 'fill-gray-200' : style.bg)} ${strokeClass} transition-all`}
      />

      {/* Diagonal cross overlay for deceased nodes */}
      {deceased && !isDimmed && (
        <g stroke="#9CA3AF" strokeWidth="1.5" opacity="0.5">
          <line x1="-20" y1="-20" x2="20" y2="20" />
          <line x1="20" y1="-20" x2="-20" y2="20" />
        </g>
      )}

      <foreignObject x="-20" y="-20" width="40" height="40" className="pointer-events-none">
        <div className={`w-full h-full flex items-center justify-center ${isDimmed ? 'text-gray-400' : (deceased ? 'text-gray-400' : style.icon)}`}>
          <User size={24} strokeWidth={2.5} />
        </div>
      </foreignObject>

      {/* Twin / fraternal badge */}
      {twinBadge && !isDimmed && (
        <g>
          <circle cx="22" cy="-22" r="10" fill={twinBadge.fill} stroke="white" strokeWidth="2" />
          <text x="22" y="-18" textAnchor="middle" fill="white" className="text-[11px] font-bold pointer-events-none">
            {twinBadge.label}
          </text>
        </g>
      )}

      <text y="48" textAnchor="middle" className={`text-[10px] font-bold uppercase tracking-wider pointer-events-none ${deceased ? 'fill-gray-400' : 'fill-gray-700'}`}>
        {node.data.firstName}
      </text>
      <text y="60" textAnchor="middle" className="text-[9px] fill-gray-500 pointer-events-none">
        {dateText}
      </text>
    </g>
  );
}
