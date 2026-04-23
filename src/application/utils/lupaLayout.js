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
 * Strategy:
 *  1. Identify the "lineage path" (direct descendants of anchor in focus)
 *  2. Show lineage nodes expanded by default
 *  3. Group all collateral nodes (siblings, uncles, cousins) as bags
 *  4. Accordion mode: only one bag expanded at a time
 *
 * @param {Array}  nodes         — all tree nodes
 * @param {Array}  edges         — all tree edges
 * @param {Array}  anchorNodeIds — IDs of the anchor nodes at this level
 * @param {Set<string>} expandedBagIds — IDs of expanded bags (only one should be expanded)
 * @returns {{
 *   visibleRegularNodeIds: Set<string>,
 *   bagNodes: Array,
 *   visibleEdgeIds: Set<string>,
 *   syntheticBagEdges: Array,
 *   positions: Map<string, {x: number, y: number}>
 * }}
 */
export function computeLupaLevel(nodes, edges, anchorNodeIds, expandedBagIds = new Set()) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const anchorSet = new Set(anchorNodeIds);

  // ── Build relationship maps ────────────────────────────────────────────────
  const childrenByParent = new Map();
  const partnersByNode = new Map();
  const parentsByChild = new Map();

  edges.forEach((edge) => {
    if (edge.type === 'parent') {
      if (!childrenByParent.has(edge.from)) childrenByParent.set(edge.from, []);
      childrenByParent.get(edge.from).push(edge.to);
      if (!parentsByChild.has(edge.to)) parentsByChild.set(edge.to, []);
      parentsByChild.get(edge.to).push(edge.from);
      return;
    }

    if (isPartnerEdgeType(edge.type)) {
      if (!partnersByNode.has(edge.from)) partnersByNode.set(edge.from, []);
      if (!partnersByNode.has(edge.to)) partnersByNode.set(edge.to, []);
      partnersByNode.get(edge.from).push(edge.to);
      partnersByNode.get(edge.to).push(edge.from);
    }
  });

  // ── Identify lineage path (direct line from ancestors through focus to primary descendant) ──
  // Primary anchor is the first one (assuming it's the focus node + partners)
  const primaryAnchorId = anchorNodeIds.length > 0 ? anchorNodeIds[0] : null;
  const lineagePath = new Set(anchorNodeIds); // Start with all anchors

  // Include ALL parents of the primary anchor in linaje (both mother and father if documented)
  const directParents = (parentsByChild.get(primaryAnchorId) || [])
    .filter(id => nodeMap.has(id));
  
  directParents.forEach(parentId => lineagePath.add(parentId));

  // Helper: prefer mother over father for choosing lineage continuation upward
  const chooseLineageParent = (parentIds) => {
    if (parentIds.length === 0) return null;
    // Prefer mother (female)
    const mother = parentIds.find(id => nodeMap.get(id)?.data?.gender === 'female');
    if (mother) return mother;
    // Fallback to first parent if no mother
    return parentIds[0];
  };

  // Add all ancestors in a direct line back (preferring mother for genealogical continuity)
  const ancestors = [];
  let currentId = primaryAnchorId;
  const visited = new Set([primaryAnchorId]);
  // Visit all direct parents first
  (parentsByChild.get(primaryAnchorId) || []).forEach(p => visited.add(p));
  
  while (currentId && ancestors.length < 20) { // Safety limit
    const parents = (parentsByChild.get(currentId) || [])
      .filter(id => nodeMap.has(id) && !visited.has(id));
    if (parents.length === 0) break;
    // Choose mother-first logic for cultural/genealogical continuity
    currentId = chooseLineageParent(parents);
    if (!currentId) break;
    visited.add(currentId);
    ancestors.push(currentId);
    lineagePath.add(currentId);
  }

  // Add the primary descendant line (first child by birth order or position)
  currentId = primaryAnchorId;
  visited.clear();
  visited.add(primaryAnchorId);
  const descendants = [];
  while (currentId) {
    const children = (childrenByParent.get(currentId) || [])
      .filter(id => nodeMap.has(id) && !visited.has(id))
      .filter(id => !anchorSet.has(id)); // Don't go back to anchors
    if (children.length === 0) break;
    // Choose first child (typically eldest)
    currentId = children[0];
    visited.add(currentId);
    descendants.push(currentId);
    lineagePath.add(currentId);
  }

  // ── Identify collateral nodes (siblings, uncles, etc.) ────────────────────
  const colateralRoots = new Set(); // Primary nodes of collateral branches (siblings, etc.)

  // Add siblings of anchor node
  if (primaryAnchorId) {
    const anchorParents = parentsByChild.get(primaryAnchorId) || [];
    anchorParents.forEach((parentId) => {
      (childrenByParent.get(parentId) || []).forEach((siblingId) => {
        if (!lineagePath.has(siblingId) && siblingId !== primaryAnchorId) {
          colateralRoots.add(siblingId);
        }
      });
    });
  }

  // Add siblings of DIRECT PARENTS (aunts/uncles of focus node)
  directParents.forEach((parentId) => {
    const parentGrandparents = parentsByChild.get(parentId) || [];
    parentGrandparents.forEach((grandparentId) => {
      (childrenByParent.get(grandparentId) || []).forEach((uncleId) => {
        if (!lineagePath.has(uncleId) && uncleId !== parentId) {
          colateralRoots.add(uncleId);
        }
      });
    });
  });

  // Add siblings of each ancestor (uncles/aunts)
  ancestors.forEach((ancestorId) => {
    const ancestorParents = parentsByChild.get(ancestorId) || [];
    ancestorParents.forEach((parentId) => {
      (childrenByParent.get(parentId) || []).forEach((uncleId) => {
        if (!lineagePath.has(uncleId) && uncleId !== ancestorId) {
          colateralRoots.add(uncleId);
        }
      });
    });
  });

  // ── Build collateral bags by root ───────────────────────────────────────
  const bagNodes = [];
  const expandedBagContexts = [];
  const colateralNodesByBag = new Map(); // bagId → Set of all nodes in this collateral branch

  [...colateralRoots].forEach((rootId) => {
    const bagId = `bag:${rootId}`;
    const isExpanded = expandedBagIds.has(bagId);

    // Collect all members of this collateral branch (root + partners + all descendants)
    const branchMembers = new Set([rootId]);
    const partners = (partnersByNode.get(rootId) || []).filter(id => nodeMap.has(id));
    partners.forEach(p => branchMembers.add(p));

    // Add all descendants of this collateral branch
    const queue = [rootId];
    const visited = new Set([rootId]);
    while (queue.length > 0) {
      const currentId = queue.shift();
      const children = childrenByParent.get(currentId) || [];
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          visited.add(childId);
          branchMembers.add(childId);
          // Add partners of this child
          const childPartners = (partnersByNode.get(childId) || []).filter(id => nodeMap.has(id));
          childPartners.forEach(p => branchMembers.add(p));
          queue.push(childId);
        }
      });
    }

    colateralNodesByBag.set(bagId, branchMembers);

    // Create bag visual
    const memberIds = [...branchMembers];
    const label = bagLabel(memberIds, nodeMap);
    const memberNodes = memberIds.map((id) => nodeMap.get(id)).filter(Boolean);
    const cx = memberNodes.reduce((s, n) => s + n.x, 0) / (memberNodes.length || 1);
    const cy = memberNodes.reduce((s, n) => s + n.y, 0) / (memberNodes.length || 1);

    bagNodes.push({
      id: bagId,
      type: 'bag',
      x: cx,
      y: cy,
      label,
      memberNodeIds: memberIds,
      primaryNodeId: rootId,
      childrenCount: (childrenByParent.get(rootId) || []).length,
      isExpanded,
    });

    if (isExpanded) {
      expandedBagContexts.push({
        bagId,
        memberIds,
        childIds: [...visited].filter(id => id !== rootId && !partners.includes(id)),
      });
    }
  });

  // ── Layout: compute clean positions ──────────────────────────────────────
  //
  // Strategy:
  //   – Lineage nodes: vertical spine from ancestors through focus to descendants
  //   – Collateral bags below lineage, spread horizontally
  //
  // We derive the "origin" from the focus node (primary anchor).

  const LINEAGE_GAP_V = 200;  // Vertical gap between lineage generations
  const BAG_ROW_OFFSET = 350; // Where bags appear below lineage
  const BAG_GAP = 180;        // Horizontal gap between bags
  const MEMBER_ROW_OFFSET = 120;
  const GRANDCHILD_ROW_OFFSET = 230;
  const MEMBER_GAP = 110;
  const GRANDCHILD_GAP = 130;

  const focusNode = nodeMap.get(primaryAnchorId);
  const originX = focusNode?.x || 0;
  const originY = focusNode?.y || 0;

  const positions = new Map();

  /** Returns the horizontal offset to centre item `index` of `total` with a given `gap`. */
  const centeredOffset = (index, total, gap) => (index - (total - 1) / 2) * gap;

  // Position lineage ancestors (vertically upward from focus)
  ancestors.reverse(); // Top ancestor first for positioning
  ancestors.forEach((ancestorId, index) => {
    positions.set(ancestorId, {
      x: originX,
      y: originY - (ancestors.length - index) * LINEAGE_GAP_V,
    });
  });

  // Position focus anchor
  if (primaryAnchorId) {
    positions.set(primaryAnchorId, { x: originX, y: originY });
  }

  // Position DIRECT PARENTS horizontally (side by side, one generation above focus)
  if (directParents.length > 0) {
    const parentGap = 140;
    directParents.forEach((parentId, index) => {
      positions.set(parentId, {
        x: originX + centeredOffset(index, directParents.length, parentGap),
        y: originY - LINEAGE_GAP_V,
      });
    });
  }

  // Position lineage descendants (vertically downward from focus)
  descendants.forEach((descendantId, index) => {
    positions.set(descendantId, {
      x: originX,
      y: originY + (index + 1) * LINEAGE_GAP_V,
    });
  });

  // Position collateral bags horizontally below lineage
  const bagCount = bagNodes.length;
  bagNodes.forEach((bag, i) => {
    positions.set(bag.id, {
      x: originX + centeredOffset(i, bagCount, BAG_GAP),
      y: originY + BAG_ROW_OFFSET,
    });
  });

  // Position expanded bag internals
  expandedBagContexts.forEach((context) => {
    const bagPos = positions.get(context.bagId);
    if (!bagPos) return;

    const memberCount = context.memberIds.length;
    context.memberIds.forEach((memberId, index) => {
      positions.set(memberId, {
        x: bagPos.x + centeredOffset(index, memberCount, MEMBER_GAP),
        y: bagPos.y + MEMBER_ROW_OFFSET,
      });
    });

    const childCountForBag = context.childIds.length;
    context.childIds.forEach((childId, index) => {
      positions.set(childId, {
        x: bagPos.x + centeredOffset(index, childCountForBag, GRANDCHILD_GAP),
        y: bagPos.y + GRANDCHILD_ROW_OFFSET,
      });
    });
  });

  // ── Visible edge IDs ─────────────────────────────────────────────────────
  // Show edges within lineage and within expanded bags
  const visibleEdgeIds = new Set();
  const visibleRegularNodeIds = new Set([...lineagePath]); // Start with lineage

  // Add edges between lineage nodes
  edges.forEach((edge) => {
    if (isPartnerEdgeType(edge.type) && lineagePath.has(edge.from) && lineagePath.has(edge.to)) {
      visibleEdgeIds.add(edge.id);
    }
    if (edge.type === 'parent' && lineagePath.has(edge.from) && lineagePath.has(edge.to)) {
      visibleEdgeIds.add(edge.id);
    }
  });

  // Add nodes and edges from expanded bags
  const expandedMembersByBagId = new Map(
    expandedBagContexts.map((context) => [context.bagId, new Set(context.memberIds)]),
  );
  const expandedChildrenByBagId = new Map(
    expandedBagContexts.map((context) => [context.bagId, new Set(context.childIds)]),
  );

  expandedBagContexts.forEach((context) => {
    const members = expandedMembersByBagId.get(context.bagId);
    const children = expandedChildrenByBagId.get(context.bagId);
    if (!members || !children) return;

    // Add visible nodes from this expanded bag
    context.memberIds.forEach(id => visibleRegularNodeIds.add(id));
    context.childIds.forEach(id => visibleRegularNodeIds.add(id));

    // Add edges within expanded bag
    edges.forEach((edge) => {
      if (isPartnerEdgeType(edge.type) && members.has(edge.from) && members.has(edge.to)) {
        visibleEdgeIds.add(edge.id);
      }
      if (edge.type === 'parent' && members.has(edge.from) && children.has(edge.to)) {
        visibleEdgeIds.add(edge.id);
      }
    });
  });

  // ── Synthetic bag connector edges ─────────────────────────────────────────
  // Only show edges from lineage to bags (visual hierarchy)
  const syntheticBagEdges = bagNodes.map((bag) => ({
    id: `bag-edge:${bag.id}`,
    type: 'bag_connector',
    fromAnchorIds: [primaryAnchorId],
    toBagId: bag.id,
  }));

  return {
    visibleRegularNodeIds,
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
