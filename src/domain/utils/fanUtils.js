/** Fan chart (radial view): angle convention → 0=left, 90=top(up), 180=right */
/** Coord formula: x = cx - r*cos(θ), y = cy - r*sin(θ)  (Y flipped: SVG Y increases down) */

export const fanPolarToXY = (cx, cy, r, angleDeg) => {
  const θ = (angleDeg * Math.PI) / 180;
  return { x: cx - r * Math.cos(θ), y: cy - r * Math.sin(θ) };
};

export const fanArcPath = (cx, cy, innerR, outerR, startDeg, endDeg) => {
  const GAP = 0.6; // visual gap between sectors (degrees)
  const s = startDeg + GAP;
  const e = endDeg - GAP;
  if (e <= s) return '';
  const largeArc = (e - s) > 180 ? 1 : 0;
  const p1 = fanPolarToXY(cx, cy, outerR, s);
  const p2 = fanPolarToXY(cx, cy, outerR, e);
  const p3 = fanPolarToXY(cx, cy, innerR, e);
  const p4 = fanPolarToXY(cx, cy, innerR, s);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
};

export const FAN_RING_WIDTHS = [0, 120, 100, 85, 75, 65]; // index = generation
export const FAN_FOCUS_R = 55;
export const FAN_MAX_GEN = 5;

const buildFanInnerRadii = () => {
  const radii = [0, FAN_FOCUS_R];
  for (let g = 2; g <= FAN_MAX_GEN; g++) {
    radii[g] = radii[g - 1] + (FAN_RING_WIDTHS[g - 1] || 65);
  }
  return radii;
};
export const FAN_INNER_RADII = buildFanInnerRadii();

export const getFanSectorColor = (gen, slot, numSlots, hasNode) => {
  if (!hasNode) return '#f8fafc';
  const isLeft = slot < numSlots / 2;
  const lightness = Math.min(91, 76 + gen * 3);
  return isLeft ? `hsl(208, 65%, ${lightness}%)` : `hsl(338, 60%, ${lightness}%)`;
};

/**
 * Build the complete slot/ring data structure used to render the radial fan chart.
 * Returns null if no focusNodeId is provided or the node is missing.
 */
export const buildFanSlots = (nodes, edges, focusNodeId) => {
  if (!focusNodeId) return null;
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const focusNode = nodeMap.get(focusNodeId);
  if (!focusNode) return null;

  const parentsByChild = new Map();
  edges.forEach((edge) => {
    if (edge.type !== 'parent') return;
    if (!parentsByChild.has(edge.to)) parentsByChild.set(edge.to, []);
    parentsByChild.get(edge.to).push(edge.from);
  });

  // (gen:slot) → nodeId
  const genSlotToNode = new Map([['0:0', focusNodeId]]);

  for (let gen = 0; gen < FAN_MAX_GEN; gen++) {
    const genSlots = 1 << gen;
    for (let s = 0; s < genSlots; s++) {
      const nodeId = genSlotToNode.get(`${gen}:${s}`);
      if (!nodeId) continue;
      const parentIds = [...new Set(parentsByChild.get(nodeId) || [])]
        .filter(id => nodeMap.has(id))
        .sort((a, b) => {
          const w = g => (g === 'male' ? 0 : g === 'female' ? 1 : 2);
          return w(nodeMap.get(a)?.data?.gender) - w(nodeMap.get(b)?.data?.gender);
        });
      parentIds.forEach((parentId, i) => {
        const key = `${gen + 1}:${s * 2 + i}`;
        if (!genSlotToNode.has(key)) genSlotToNode.set(key, parentId);
      });
    }
  }

  // Determine max generation that has actual nodes (min 1, max FAN_MAX_GEN)
  let maxGen = 1;
  genSlotToNode.forEach((_, key) => {
    const g = parseInt(key.split(':')[0], 10);
    if (g > maxGen) maxGen = g;
  });
  maxGen = Math.min(maxGen + 1, FAN_MAX_GEN);

  const cx = focusNode.x;
  const cy = focusNode.y;

  const rings = [];
  for (let gen = 1; gen <= maxGen; gen++) {
    const innerR = FAN_INNER_RADII[gen];
    const outerR = innerR + (FAN_RING_WIDTHS[gen] || 65);
    const numSlots = 1 << gen;
    const slots = [];
    for (let s = 0; s < numSlots; s++) {
      const startAngle = (s * 180) / numSlots;
      const endAngle = ((s + 1) * 180) / numSlots;
      const nodeId = genSlotToNode.get(`${gen}:${s}`) || null;
      const childNodeId = genSlotToNode.get(`${gen - 1}:${Math.floor(s / 2)}`) || null;
      slots.push({ gen, slotIndex: s, numSlots, startAngle, endAngle, innerR, outerR, nodeId, childNodeId });
    }
    rings.push({ generation: gen, innerR, outerR, slots });
  }

  return { cx, cy, focusR: FAN_FOCUS_R, focusNodeId, rings };
};

/**
 * Derive virtual node positions for all ancestors in the radial fan layout.
 * Returns a Map<nodeId, {x, y}>.
 */
export const buildRadialPositions = (nodes, edges, focusNodeId) => {
  const fanData = buildFanSlots(nodes, edges, focusNodeId);
  if (!fanData) return new Map();
  const positions = new Map();
  const focusNode = nodes.find(n => n.id === focusNodeId);
  if (focusNode) positions.set(focusNodeId, { x: fanData.cx, y: fanData.cy });
  fanData.rings.forEach(ring => {
    ring.slots.forEach(slot => {
      if (!slot.nodeId) return;
      const midAngle = (slot.startAngle + slot.endAngle) / 2;
      const midR = (slot.innerR + slot.outerR) / 2;
      const { x, y } = fanPolarToXY(fanData.cx, fanData.cy, midR, midAngle);
      positions.set(slot.nodeId, { x, y });
    });
  });
  return positions;
};
