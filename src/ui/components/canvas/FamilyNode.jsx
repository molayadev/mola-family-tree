import { User } from 'lucide-react';
import { COLORS } from '../../../domain/config/constants';

export default function FamilyNode({ node, isSelected, isDimmed, isLinkTarget, onPointerDown }) {
  const style = COLORS[node.data.gender] || COLORS.unknown;

  let strokeClass = 'stroke-white stroke-[3px]';
  if (isSelected) strokeClass = 'stroke-orange-400 stroke-[4px]';
  else if (isLinkTarget) strokeClass = 'stroke-green-500 stroke-[4px]';

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className="pointer-events-auto cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => onPointerDown(e, node.id)}
      onTouchStart={(e) => onPointerDown(e, node.id)}
      opacity={isDimmed ? 0.4 : 1}
    >
      <circle r="32" fill="black" opacity="0.1" cy="4" />
      <circle
        r="30"
        className={`${isDimmed ? 'fill-gray-200' : style.bg} ${strokeClass} transition-all`}
      />

      <foreignObject x="-20" y="-20" width="40" height="40" className="pointer-events-none">
        <div className={`w-full h-full flex items-center justify-center ${isDimmed ? 'text-gray-400' : style.icon}`}>
          <User size={24} strokeWidth={2.5} />
        </div>
      </foreignObject>

      <text y="48" textAnchor="middle" className="text-[10px] font-bold fill-gray-700 uppercase tracking-wider pointer-events-none">
        {node.data.firstName}
      </text>
      <text y="60" textAnchor="middle" className="text-[9px] fill-gray-500 pointer-events-none">
        {node.data.deathYear ? `${node.data.birthYear || '?'} - ${node.data.deathYear}` : node.data.birthYear || ''}
      </text>
    </g>
  );
}
