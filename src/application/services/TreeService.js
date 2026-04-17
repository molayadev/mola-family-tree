import { createNode } from '../../domain/entities/Node';
import { createEdge } from '../../domain/entities/Edge';
import { EDGE_TYPES, PARTNER_EDGE_TYPES, isPartnerEdgeType, isBrokenLabel } from '../../domain/config/constants';

export class TreeService {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
  }

  save(username, nodes, edges) {
    this.storage.saveUserData(username, null, nodes, edges);
  }

  addParents(nodes, edges, sourceNode) {
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const xOffset = 80;
    const yOffset = 150;

    const father = createNode({
      x: sourceNode.x - xOffset,
      y: sourceNode.y - yOffset,
      firstName: 'Padre',
      gender: 'male',
    });
    const mother = createNode({
      x: sourceNode.x + xOffset,
      y: sourceNode.y - yOffset,
      firstName: 'Madre',
      gender: 'female',
    });

    newNodes.push(father, mother);
    newEdges.push(
      createEdge({ from: father.id, to: sourceNode.id, type: EDGE_TYPES.PARENT, label: 'Biológico' }),
      createEdge({ from: mother.id, to: sourceNode.id, type: EDGE_TYPES.PARENT, label: 'Biológico' }),
      createEdge({ from: father.id, to: mother.id, type: EDGE_TYPES.PARTNER, label: 'Casado/a' }),
    );

    return { nodes: newNodes, edges: newEdges };
  }

  addChild(nodes, edges, sourceId, partnerId) {
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const sourceNode = nodes.find(n => n.id === sourceId);
    const yOffset = 160;

    let childX = sourceNode.x;
    let childY = sourceNode.y + yOffset;

    if (partnerId) {
      const partnerNode = nodes.find(n => n.id === partnerId);
      if (partnerNode) {
        childX = (sourceNode.x + partnerNode.x) / 2;
        childY = Math.max(sourceNode.y, partnerNode.y) + yOffset;
      }
    } else {
      childX += (Math.random() - 0.5) * 40;
    }

    const child = createNode({
      x: childX,
      y: childY,
      firstName: 'Hijo',
      gender: 'unknown',
    });

    newNodes.push(child);
    newEdges.push(createEdge({ from: sourceId, to: child.id, type: EDGE_TYPES.PARENT, label: 'Biológico' }));

    if (partnerId) {
      newEdges.push(createEdge({ from: partnerId, to: child.id, type: EDGE_TYPES.PARENT, label: 'Biológico' }));
    }

    return { nodes: newNodes, edges: newEdges };
  }

  getPartnerOffset(edges, sourceId) {
    const existing = edges.filter(
      e => (e.from === sourceId || e.to === sourceId) && isPartnerEdgeType(e.type),
    ).length;
    const direction = existing % 2 === 0 ? 1 : -1;
    const multiplier = Math.floor(existing / 2) + 1;
    return 140 * multiplier * direction;
  }

  addSpouse(nodes, edges, sourceNode) {
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const offset = this.getPartnerOffset(edges, sourceNode.id);

    const spouse = createNode({
      x: sourceNode.x + offset,
      y: sourceNode.y,
      firstName: 'Cónyuge',
      gender: sourceNode.data.gender === 'male' ? 'female' : 'male',
    });

    newNodes.push(spouse);
    newEdges.push(createEdge({ from: sourceNode.id, to: spouse.id, type: EDGE_TYPES.PARTNER, label: 'Casado/a' }));

    return { nodes: newNodes, edges: newEdges };
  }

  addExSpouse(nodes, edges, sourceNode) {
    const newNodes = [...nodes];
    const newEdges = [...edges];
    const offset = this.getPartnerOffset(edges, sourceNode.id);

    const exSpouse = createNode({
      x: sourceNode.x + offset,
      y: sourceNode.y,
      firstName: 'Ex-pareja',
      gender: sourceNode.data.gender === 'male' ? 'female' : 'male',
    });

    newNodes.push(exSpouse);
    newEdges.push(createEdge({ from: sourceNode.id, to: exSpouse.id, type: EDGE_TYPES.PARTNER, label: 'Divorciado' }));

    return { nodes: newNodes, edges: newEdges };
  }

  deleteNode(nodes, edges, nodeId) {
    return {
      nodes: nodes.filter(n => n.id !== nodeId),
      edges: edges.filter(e => e.from !== nodeId && e.to !== nodeId),
    };
  }

  updateNode(nodes, nodeId, newData) {
    return nodes.map(n => (n.id === nodeId ? { ...n, data: newData } : n));
  }

  getPartners(edges, nodeId) {
    return edges
      .filter(e => (e.from === nodeId || e.to === nodeId) && isPartnerEdgeType(e.type))
      .map(e => (e.from === nodeId ? e.to : e.from));
  }

  updateLink(nodes, edges, edgeId, updates, contextNodeId) {
    const edgeToUpdate = edges.find(e => e.id === edgeId);
    if (!edgeToUpdate) return { nodes, edges };

    let newNodes = [...nodes];
    let finalTargetId = edgeToUpdate.from === contextNodeId ? edgeToUpdate.to : edgeToUpdate.from;

    if (updates.targetId) {
      if (updates.targetId === 'NEW') {
        const sourceNode = nodes.find(n => n.id === contextNodeId);
        let dy = 0;
        let dx = 100;
        if (edgeToUpdate.type === 'parent') {
          dy = edgeToUpdate.from === contextNodeId ? 150 : -150;
          dx = (Math.random() - 0.5) * 80;
        }

        const newNode = createNode({
          x: sourceNode.x + dx,
          y: sourceNode.y + dy,
          firstName: 'Nuevo',
          lastName: 'Familiar',
          gender: 'unknown',
        });
        finalTargetId = newNode.id;
        newNodes.push(newNode);
      } else {
        finalTargetId = updates.targetId;
      }
    }

    const newEdges = edges.map(e => {
      if (e.id === edgeId) {
        let updatedEdge = { ...e };
        if (updates.label !== undefined) updatedEdge.label = updates.label;
        if (updates.targetId !== undefined) {
          if (e.from === contextNodeId) updatedEdge.to = finalTargetId;
          else updatedEdge.from = finalTargetId;
        }
        return updatedEdge;
      }
      return e;
    });

    return { nodes: newNodes, edges: newEdges };
  }

  deleteLink(edges, edgeId) {
    return edges.filter(e => e.id !== edgeId);
  }

  hasSpouse(edges, nodeId) {
    return edges.some(
      e => (e.from === nodeId || e.to === nodeId) &&
        [EDGE_TYPES.SPOUSE, EDGE_TYPES.PARTNER].includes(e.type) &&
        !isBrokenLabel(e.label),
    );
  }

  hasParents(edges, nodeId) {
    return edges.some(
      e => e.to === nodeId && e.type === EDGE_TYPES.PARENT,
    );
  }

  /**
   * Organize every node in the tree as a proper genealogical tree.
   *
   * The algorithm:
   *  1. Group partners via union-find.
   *  2. Build a layout tree where each node is a partner-group and edges
   *     go from parent-groups to child-groups.
   *  3. Bottom-up: compute the width each subtree needs.
   *  4. Top-down: assign (x, y) so that every parent-group is centred
   *     directly above its children.
   *
   * Returns a new nodes array with updated x/y positions.
   */
  organizeByLevels(nodes, edges) {
    if (nodes.length === 0) return nodes;

    // ── Layout configuration ───────────────────────────────────────────
    const PARTNER_GAP = 100;   // horizontal distance between partners
    const CHILD_GAP = 160;     // horizontal gap between child subtrees
    const LEVEL_H = 200;       // vertical distance between generations
    const FAMILY_GAP = 240;    // gap between disconnected family trees

    // ── 1. Build adjacency helpers ─────────────────────────────────────
    const childrenOf = {};   // parentId → [childId]
    const parentsOf = {};    // childId  → [parentId]

    edges.forEach(e => {
      if (e.type === EDGE_TYPES.PARENT) {
        (childrenOf[e.from] ??= []).push(e.to);
        (parentsOf[e.to] ??= []).push(e.from);
      }
    });

    // ── 2. Union-Find to group partners ────────────────────────────────
    const uf = {};
    const find = (a) => {
      uf[a] ??= a;
      while (uf[a] !== a) { uf[a] = uf[uf[a]]; a = uf[a]; }
      return a;
    };
    const union = (a, b) => { uf[find(a)] = find(b); };

    edges.forEach(e => {
      if (isPartnerEdgeType(e.type)) union(e.from, e.to);
    });

    // groupMembers: union-find root → [member node ids]
    const groupMembers = {};
    nodes.forEach(n => {
      const root = find(n.id);
      (groupMembers[root] ??= []).push(n.id);
    });

    // ── 3. Build layout tree via BFS from root groups ──────────────────
    const layoutChildren = {};   // groupRoot → [childGroupRoot, …]
    const assigned = new Set();

    // Root groups: groups where at least one member has no parents
    const rootGroups = new Set();
    nodes.forEach(n => {
      if (!parentsOf[n.id] || parentsOf[n.id].length === 0) {
        rootGroups.add(find(n.id));
      }
    });

    const queue = [...rootGroups];
    queue.forEach(gr => assigned.add(gr));

    let head = 0;
    while (head < queue.length) {
      const gr = queue[head++];
      const members = groupMembers[gr] || [];
      const childGroupSet = new Set();

      members.forEach(mid => {
        (childrenOf[mid] || []).forEach(cid => {
          const cGr = find(cid);
          if (!assigned.has(cGr)) {
            childGroupSet.add(cGr);
            assigned.add(cGr);
          }
        });
      });

      if (childGroupSet.size > 0) {
        layoutChildren[gr] = [...childGroupSet];
        layoutChildren[gr].forEach(cg => queue.push(cg));
      }
    }

    // Catch any disconnected nodes as additional roots
    nodes.forEach(n => {
      const gr = find(n.id);
      if (!assigned.has(gr)) {
        rootGroups.add(gr);
        assigned.add(gr);
      }
    });

    // ── 4. Compute subtree widths (bottom-up, memoised) ────────────────
    const widthCache = {};

    function subtreeWidth(gr) {
      if (widthCache[gr] !== undefined) return widthCache[gr];

      const members = groupMembers[gr] || [];
      const memberWidth = Math.max(80, (members.length - 1) * PARTNER_GAP + 60);

      const children = layoutChildren[gr] || [];
      if (children.length === 0) {
        widthCache[gr] = memberWidth;
        return memberWidth;
      }

      let totalChildW = 0;
      children.forEach((cg, i) => {
        totalChildW += subtreeWidth(cg);
        if (i < children.length - 1) totalChildW += CHILD_GAP;
      });

      widthCache[gr] = Math.max(memberWidth, totalChildW);
      return widthCache[gr];
    }

    [...rootGroups].forEach(rg => subtreeWidth(rg));

    // ── 5. Assign positions (top-down) ─────────────────────────────────
    const posMap = {};

    function positionGroup(gr, centerX, level) {
      const members = groupMembers[gr] || [];

      // Centre the partner group at centerX
      const totalMemberW = (members.length - 1) * PARTNER_GAP;
      const startX = centerX - totalMemberW / 2;
      members.forEach((mid, i) => {
        posMap[mid] = { x: startX + i * PARTNER_GAP, y: level * LEVEL_H };
      });

      // Position child groups below, centred under the parent group
      const children = layoutChildren[gr] || [];
      if (children.length === 0) return;

      const childWidths = children.map(cg => subtreeWidth(cg));
      const totalChildW = childWidths.reduce((s, w) => s + w, 0)
        + (children.length - 1) * CHILD_GAP;

      let cursor = centerX - totalChildW / 2;
      children.forEach((cg, i) => {
        positionGroup(cg, cursor + childWidths[i] / 2, level + 1);
        cursor += childWidths[i] + CHILD_GAP;
      });
    }

    // Layout all root groups side by side, centred at x = 0
    const rootList = [...rootGroups];
    const rootWidths = rootList.map(rg => subtreeWidth(rg));
    const totalRootW = rootWidths.reduce((s, w) => s + w, 0)
      + Math.max(0, rootList.length - 1) * FAMILY_GAP;

    let cursor = -totalRootW / 2;
    rootList.forEach((rg, i) => {
      positionGroup(rg, cursor + rootWidths[i] / 2, 0);
      cursor += rootWidths[i] + FAMILY_GAP;
    });

    // ── 6. Return updated nodes ────────────────────────────────────────
    return nodes.map(n => ({
      ...n,
      x: posMap[n.id]?.x ?? n.x,
      y: posMap[n.id]?.y ?? n.y,
    }));
  }

  linkNodes(edges, sourceId, targetId, linkType, linkLabel) {
    const newEdges = [...edges];
    let from = sourceId;
    let to = targetId;
    let type = linkType;
    let label = linkLabel;

    if (type === 'child') {
      // "child" means target is child of source → parent edge from source to target
      type = EDGE_TYPES.PARENT;
      from = sourceId;
      to = targetId;
      if (!label) label = 'Biológico';
    } else if (type === 'parent') {
      // "parent" means target is parent of source → parent edge from target to source
      type = EDGE_TYPES.PARENT;
      from = targetId;
      to = sourceId;
      if (!label) label = 'Biológico';
    } else if (type === EDGE_TYPES.SPOUSE) {
      type = EDGE_TYPES.PARTNER;
      if (!label) label = 'Casado/a';
    } else if (type === EDGE_TYPES.EX_SPOUSE) {
      type = EDGE_TYPES.PARTNER;
      if (!label) label = 'Divorciado';
    }

    newEdges.push(createEdge({ from, to, type, label }));
    return newEdges;
  }
}
