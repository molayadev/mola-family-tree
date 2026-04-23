/**
 * LupaBagNode — SVG node rendered as a "bag" (cloud/oval) in Orden Lupa mode.
 *
 * A bag collapses a child + their family into a single tappable element.
 * Clicking it drills down into that family nucleus.
 */
export default function LupaBagNode({ bag, onClick }) {
  if (!bag) return null;

  const { x, y, label, childrenCount, memberNodeIds } = bag;
  const memberCount = memberNodeIds?.length ?? 0;
  const hasChildren = childrenCount > 0;

  // Truncate long labels for display
  const displayLabel = label.length > 20 ? `${label.slice(0, 19)}…` : label;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className="pointer-events-auto cursor-pointer"
      onMouseDown={(e) => { e.stopPropagation(); onClick(bag); }}
      onTouchStart={(e) => { e.stopPropagation(); onClick(bag); }}
    >
      {/* Drop shadow */}
      <ellipse rx="56" ry="34" cx="0" cy="4" fill="black" opacity="0.10" />

      {/* Main bag oval */}
      <ellipse
        rx="54"
        ry="32"
        fill="#f0fdf4"
        stroke="#16a34a"
        strokeWidth="2"
      />

      {/* Inner subtle fill */}
      <ellipse rx="46" ry="24" fill="#dcfce7" opacity="0.6" />

      {/* "Cloud bumps" on top — two small arcs to suggest a cloud shape */}
      <circle cx="-20" cy="-28" r="12" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
      <circle cx="8" cy="-33" r="15" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />
      <circle cx="30" cy="-27" r="11" fill="#f0fdf4" stroke="#16a34a" strokeWidth="2" />

      {/* Cover the green lines where bumps meet the oval */}
      <ellipse rx="53" ry="31" fill="#f0fdf4" />

      {/* Members icon row */}
      <text
        y="-6"
        textAnchor="middle"
        className="text-[11px] pointer-events-none select-none"
        style={{ fontSize: '11px' }}
      >
        {Array.from({ length: Math.min(memberCount, 4) }, (_, i) => (
          <tspan key={i} dx={i === 0 ? 0 : 4}>👤</tspan>
        ))}
      </text>

      {/* Label (surnames) */}
      <text
        y="10"
        textAnchor="middle"
        className="pointer-events-none select-none"
        style={{
          fontSize: '9px',
          fontWeight: '700',
          fill: '#15803d',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
        }}
      >
        {displayLabel}
      </text>

      {/* Children count badge */}
      {hasChildren && (
        <g transform="translate(42, -20)">
          <circle r="11" fill="#16a34a" stroke="white" strokeWidth="1.5" />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: '8px', fontWeight: '700', fill: 'white' }}
          >
            {childrenCount > 9 ? '9+' : childrenCount}
          </text>
        </g>
      )}

      {/* Lupa / zoom-in icon in bottom-right area */}
      <g transform="translate(40, 18)">
        <circle r="9" fill="white" stroke="#16a34a" strokeWidth="1.5" opacity="0.9" />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: '9px', fill: '#16a34a' }}
        >
          🔍
        </text>
      </g>
    </g>
  );
}
