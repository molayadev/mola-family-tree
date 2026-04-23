import { isPartnerEdgeType } from '../../domain/config/constants';

/**
 * A "bag" node is a synthetic node that collapses a child and their family
 * (partners + children) into a single clickable visual element.
 *
 * BagNode shape:
 *   id            — "bag:<primaryChildId>"
 *   type          — "bag"
 *   x, y          — canvas position (centroid of member node positions)
 *   label         — combined surnames of the bag members
 *   memberNodeIds — all real node IDs collapsed in this bag
 *   primaryNodeId — the direct child (entry point for drill-down)
 *   childrenCount — number of grandchildren hidden inside
 */

/**
 * Build a short label (up to two surnames) from a list of node IDs.
 * Falls back to firstName when lastName is absent.
 */
function bagLabel(memberIds, nodeMap) {
  const surnames = memberIds
    .map((id) => {
      const node = nodeMap.get(id);
      if (!node) return null;
      return (node.data?.lastName || '').trim() || (node.data?.firstName || '').trim() || null;
    })
    .filter(Boolean);

  const unique = [...new Set(surnames)];
  return unique.slice(0, 2).join(' / ') || '?';
}

/**
 * Given a full nodes/edges dataset and an anchor set (the nodes currently
 * "focused" at this lupa level), compute what should be displayed.
 *
 * @param {Array}  nodes         — all tree nodes
 * @param {Array}  edges         — all tree edges
 * @param {Array}  anchorNodeIds — IDs of the anchor nodes at this level
 * @returns {{
 *   visibleRegularNodeIds: Set<string>,
 *   bagNodes: Array,
 *   visibleEdgeIds: Set<string>,
 *   syntheticBagEdges: Array,
 *   positions: Map<string, {x: number, y: number}>
 * }}
 */
export function computeLupaLevel(nodes, edges, anchorNodeIds) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const anchorSet = new Set(anchorNodeIds);

  // ── Build relationship maps ────────────────────────────────────────────────
  const childrenByParent = new Map();
  const partnersByNode = new Map();

  edges.forEach((edge) => {
    if (edge.type === 'parent') {
      if (!childrenByParent.has(edge.from)) childrenByParent.set(edge.from, []);
      childrenByParent.get(edge.from).push(edge.to);
      return;
    }

    if (isPartnerEdgeType(edge.type)) {
      if (!partnersByNode.has(edge.from)) partnersByNode.set(edge.from, []);
      if (!partnersByNode.has(edge.to)) partnersByNode.set(edge.to, []);
      partnersByNode.get(edge.from).push(edge.to);
      partnersByNode.get(edge.to).push(edge.from);
    }
  });

  // ── Direct children of anchor nodes ───────────────────────────────────────
  const directChildIds = new Set();
  anchorNodeIds.forEach((anchorId) => {
    (childrenByParent.get(anchorId) || []).forEach((childId) => {
      // Don't include anchor nodes as their own children (defensive)
      if (!anchorSet.has(childId)) directChildIds.add(childId);
    });
  });

  // ── Classify each child as regular or bag ────────────────────────────────
  const regularChildIds = [];
  const bagNodes = [];

  directChildIds.forEach((childId) => {
    const childPartners = (partnersByNode.get(childId) || []).filter(
      (pid) => !anchorSet.has(pid),
    );
    const childChildren = (childrenByParent.get(childId) || []).filter(
      (cid) => !anchorSet.has(cid),
    );

    const isBag = childPartners.length > 0 || childChildren.length > 0;

    if (!isBag) {
      regularChildIds.push(childId);
      return;
    }

    // Bag: collapse child + their partners
    const memberIds = [childId, ...childPartners];
    const label = bagLabel(memberIds, nodeMap);

    // Position: centroid of member positions (will be overridden by layout)
    const memberNodes = memberIds.map((id) => nodeMap.get(id)).filter(Boolean);
    const cx = memberNodes.reduce((s, n) => s + n.x, 0) / (memberNodes.length || 1);
    const cy = memberNodes.reduce((s, n) => s + n.y, 0) / (memberNodes.length || 1);

    bagNodes.push({
      id: `bag:${childId}`,
      type: 'bag',
      x: cx,
      y: cy,
      label,
      memberNodeIds: memberIds,
      primaryNodeId: childId,
      childrenCount: childChildren.length,
    });
  });

  // ── Layout: compute clean positions ──────────────────────────────────────
  //
  // Strategy:
  //   – Anchor nodes on row 0, horizontally centred, gap = ANCHOR_GAP.
  //   – Children (regular + bags) on row 1 (CHILD_ROW_OFFSET below), same
  //     horizontal centring, gap = CHILD_GAP.
  //
  // We derive the "origin" from the centroid of the anchor node positions so
  // the view stays coherent after each drill-down.

  const ANCHOR_GAP = 140;
  const CHILD_GAP = 170;
  const CHILD_ROW_OFFSET = 230;

  const anchorRealNodes = anchorNodeIds
    .map((id) => nodeMap.get(id))
    .filter(Boolean);

  const originX =
    anchorRealNodes.reduce((s, n) => s + n.x, 0) / (anchorRealNodes.length || 1);
  const originY =
    anchorRealNodes.reduce((s, n) => s + n.y, 0) / (anchorRealNodes.length || 1);

  const positions = new Map();

  // Anchor node row
  const anchorCount = anchorNodeIds.length;
  anchorNodeIds.forEach((id, i) => {
    const offset = (i - (anchorCount - 1) / 2) * ANCHOR_GAP;
    positions.set(id, { x: originX + offset, y: originY });
  });

  // Child row (regular + bag)
  const childItems = [
    ...regularChildIds.map((id) => ({ id, isBag: false })),
    ...bagNodes.map((bag) => ({ id: bag.id, isBag: true })),
  ];
  const childCount = childItems.length;
  childItems.forEach((item, i) => {
    const offset = (i - (childCount - 1) / 2) * CHILD_GAP;
    positions.set(item.id, {
      x: originX + offset,
      y: originY + CHILD_ROW_OFFSET,
    });
  });

  // ── Visible edge IDs (partner between anchors + parent → regular child) ──
  const visibleEdgeIds = new Set();
  const regularChildSet = new Set(regularChildIds);

  edges.forEach((edge) => {
    if (isPartnerEdgeType(edge.type) && anchorSet.has(edge.from) && anchorSet.has(edge.to)) {
      visibleEdgeIds.add(edge.id);
    }
    if (edge.type === 'parent' && anchorSet.has(edge.from) && regularChildSet.has(edge.to)) {
      visibleEdgeIds.add(edge.id);
    }
  });

  // ── Synthetic bag connector edges ─────────────────────────────────────────
  //
  // One edge per bag: from "the anchor midpoint" down to the bag.
  const syntheticBagEdges = bagNodes.map((bag) => ({
    id: `bag-edge:${bag.id}`,
    type: 'bag_connector',
    fromAnchorIds: anchorNodeIds,
    toBagId: bag.id,
  }));

  return {
    visibleRegularNodeIds: new Set([...anchorNodeIds, ...regularChildIds]),
    bagNodes,
    visibleEdgeIds,
    syntheticBagEdges,
    positions,
  };
}

/**
 * Derive the initial anchor for lupa mode from focusNodeId.
 * The initial anchor is focusNodeId plus any active partners.
 *
 * @param {Array}  nodes
 * @param {Array}  edges
 * @param {string} focusNodeId
 * @returns {string[]} anchorNodeIds
 */
export function getLupaInitialAnchor(nodes, edges, focusNodeId) {
  if (!focusNodeId || !nodes.some((n) => n.id === focusNodeId)) {
    return nodes[0] ? [nodes[0].id] : [];
  }

  const partnerIds = edges
    .filter(
      (e) =>
        isPartnerEdgeType(e.type) &&
        (e.from === focusNodeId || e.to === focusNodeId),
    )
    .map((e) => (e.from === focusNodeId ? e.to : e.from));

  return [focusNodeId, ...partnerIds];
}

/**
 * Build the label shown in the "Volver a: X" navigation button for a lupa
 * stack entry, using the anchor node data.
 *
 * @param {string[]} anchorNodeIds
 * @param {Map}      nodeMap
 * @returns {string}
 */
export function buildLupaStackLabel(anchorNodeIds, nodeMap) {
  const surnames = anchorNodeIds
    .map((id) => {
      const node = nodeMap.get(id);
      if (!node) return null;
      return (node.data?.lastName || '').trim() || (node.data?.firstName || '').trim() || null;
    })
    .filter(Boolean);

  const unique = [...new Set(surnames)];
  return unique.slice(0, 2).join(' / ') || 'Inicio';
}
