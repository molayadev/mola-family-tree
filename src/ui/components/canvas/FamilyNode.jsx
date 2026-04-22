import { COLORS } from '../../../domain/config/constants';
import { formatNodeDates, isDeceased } from '../../../domain/utils/dateUtils';

/** Small badge colours per twin type */
const TWIN_BADGE = {
  twins:      { fill: '#7C3AED', label: '=' },   // purple – identical twins
  fraternal:  { fill: '#0D9488', label: '≈' },   // teal   – fraternal twins
};

/** Male silhouette SVG (short hair, broader shoulders) */
function MaleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="24" height="24">
      {/* Head */}
      <circle cx="12" cy="7" r="4" />
      {/* Short hair */}
      <path d="M8 7c0-3 1.5-5 4-5s4 2 4 5" />
      {/* Shoulders / torso */}
      <path d="M5.5 21c0-4 2.9-7.5 6.5-7.5s6.5 3.5 6.5 7.5" />
    </svg>
  );
}

/** Female silhouette SVG (longer hair, dress shape) */
function FemaleIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="24" height="24">
      {/* Head */}
      <circle cx="12" cy="7" r="4" />
      {/* Long hair falling from top */}
      <path d="M7 7c-.5-2 0-5 5-5s5.5 3 5 5" />
      {/* Hair strands left */}
      <path d="M7 7c-1 2-1 4 0 6" />
      {/* Hair strands right */}
      <path d="M17 7c1 2 1 4 0 6" />
      {/* Dress / skirt silhouette */}
      <path d="M5 21l3-8h8l3 8" />
    </svg>
  );
}

/** Unknown/neutral silhouette SVG */
function UnknownIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} width="24" height="24">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 21c0-4 2.7-7 6-7s6 3 6 7" />
    </svg>
  );
}

function GenderIcon({ gender, className }) {
  if (gender === 'male') return <MaleIcon className={className} />;
  if (gender === 'female') return <FemaleIcon className={className} />;
  return <UnknownIcon className={className} />;
}

export default function FamilyNode({
  node,
  isSelected,
  isDimmed,
  isLinkTarget,
  isGroupMemberHighlighted,
  groupHighlightColor,
  defaultGroupColor,
  onPointerDown,
}) {
  const deceased = isDeceased(node.data);
  const style = COLORS[node.data.gender] || COLORS.unknown;

  let strokeClass = 'stroke-white stroke-[3px]';
  if (isSelected) strokeClass = 'stroke-orange-400 stroke-[4px]';
  else if (isLinkTarget) strokeClass = 'stroke-green-500 stroke-[4px]';

  const dateText = formatNodeDates(node.data);
  const twinBadge = node.data.twinType ? TWIN_BADGE[node.data.twinType] : null;
  const membershipLineColor = !isDimmed
    ? (isGroupMemberHighlighted ? (groupHighlightColor || defaultGroupColor) : defaultGroupColor)
    : null;

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
      {isSelected && (
        <circle r="35" fill="none" stroke="#FB923C" strokeWidth="2.5" opacity="0.35" />
      )}
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
          <GenderIcon gender={node.data.gender} className="w-6 h-6" />
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
      {membershipLineColor && (
        <line x1="-20" y1="66" x2="20" y2="66" stroke={membershipLineColor} strokeWidth="3" strokeLinecap="round" />
      )}
    </g>
  );
}
