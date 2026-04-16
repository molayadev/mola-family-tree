import { User } from 'lucide-react';
import { COLORS } from '../../../domain/config/constants';

export default function FamilyNode({ node, isSelected, onPointerDown }) {
  const style = COLORS[node.data.gender] || COLORS.unknown;

  return (
    <g
      transform={`translate(${node.x}, ${node.y})`}
      className="pointer-events-auto cursor-grab active:cursor-grabbing"
      onMouseDown={(e) => onPointerDown(e, node.id)}
      onTouchStart={(e) => onPointerDown(e, node.id)}
    >
      <circle r="32" fill="black" opacity="0.1" cy="4" />
      <circle
        r="30"
        className={`${style.bg} ${isSelected ? 'stroke-orange-400 stroke-[4px]' : 'stroke-white stroke-[3px]'} transition-all`}
      />

      <foreignObject x="-20" y="-20" width="40" height="40" className="pointer-events-none">
        <div className={`w-full h-full flex items-center justify-center ${style.icon}`}>
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
