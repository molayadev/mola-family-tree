import { User } from 'lucide-react';
import { COLORS } from '../../../domain/config/constants';
import { formatNodeDates, isDeceased } from '../../../domain/utils/dateUtils';

export default function FamilyNode({ node, isSelected, isDimmed, isLinkTarget, onPointerDown }) {
  const deceased = isDeceased(node.data);
  const style = COLORS[node.data.gender] || COLORS.unknown;

  let strokeClass = 'stroke-white stroke-[3px]';
  if (isSelected) strokeClass = 'stroke-orange-400 stroke-[4px]';
  else if (isLinkTarget) strokeClass = 'stroke-green-500 stroke-[4px]';

  const dateText = formatNodeDates(node.data);

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

      <text y="48" textAnchor="middle" className={`text-[10px] font-bold uppercase tracking-wider pointer-events-none ${deceased ? 'fill-gray-400' : 'fill-gray-700'}`}>
        {node.data.firstName}
      </text>
      <text y="60" textAnchor="middle" className="text-[9px] fill-gray-500 pointer-events-none">
        {dateText}
      </text>
    </g>
  );
}
