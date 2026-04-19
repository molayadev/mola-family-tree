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
   *  4. Top-down: assign (x, y) so that every parent-group is centered
   *     directly above its children.
   *
   * Returns a new nodes array with updated x/y positions.
   */
  organizeByLevels(nodes, edges) {
    if (nodes.length === 0) return nodes;

    /** Horizontal spacing between partners in the same group. */
    const PARTNER_GAP = 110;
    /** Vertical spacing between family generations. */
    const LEVEL_H = 190;
    /** Horizontal spacing between groups that share a level. */
    const GROUP_GAP = 170;
    /** Horizontal spacing between disconnected family components. */
    const FAMILY_GAP = 260;

    const childrenOf = {};
    const parentsOf = {};
    edges.forEach(e => {
      if (e.type !== EDGE_TYPES.PARENT) return;
      (childrenOf[e.from] ??= []).push(e.to);
      (parentsOf[e.to] ??= []).push(e.from);
    });

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

    const groupMembers = {};
    nodes.forEach(n => {
      const root = find(n.id);
      (groupMembers[root] ??= []).push(n.id);
    });

    const allGroups = Object.keys(groupMembers);
    const layoutChildren = {};
    const layoutParents = {};
    allGroups.forEach(gr => {
      layoutChildren[gr] = new Set();
      layoutParents[gr] = new Set();
    });

    edges.forEach(e => {
      if (e.type !== EDGE_TYPES.PARENT) return;
      const fromGroup = find(e.from);
      const toGroup = find(e.to);
      if (fromGroup === toGroup) return;
      layoutChildren[fromGroup].add(toGroup);
      layoutParents[toGroup].add(fromGroup);
    });

    const anchorGroup = find(nodes[0].id);
    const groupLevel = {};
    const componentGroups = new Set();
    const queue = [anchorGroup];
    groupLevel[anchorGroup] = 0;
    componentGroups.add(anchorGroup);

    let head = 0;
    while (head < queue.length) {
      const current = queue[head++];
      const currentLevel = groupLevel[current];
      [...layoutChildren[current]].forEach(child => {
        if (groupLevel[child] === undefined) {
          groupLevel[child] = currentLevel + 1;
          componentGroups.add(child);
          queue.push(child);
        }
      });
      [...layoutParents[current]].forEach(parent => {
        if (groupLevel[parent] === undefined) {
          groupLevel[parent] = currentLevel - 1;
          componentGroups.add(parent);
          queue.push(parent);
        }
      });
    }

    const groupX = {};
    const groupWidth = {};
    allGroups.forEach((gr) => {
      const members = groupMembers[gr];
      const avgX = members.reduce((sum, id) => {
        const node = nodes.find(n => n.id === id);
        return sum + (node?.x ?? 0);
      }, 0) / members.length;
      groupX[gr] = avgX;
      groupWidth[gr] = Math.max((members.length - 1) * PARTNER_GAP, 0);
    });
    groupX[anchorGroup] = 0;

    // RELAXATION_PASSES controls weighted-averaging iterations (35% previous position, 65% neighbor centroid)
    // to stabilize horizontal placement and reduce overlap.
    const RELAXATION_PASSES = 10;
    const PREVIOUS_WEIGHT = 0.35;
    const NEIGHBOR_WEIGHT = 0.65;
    for (let i = 0; i < RELAXATION_PASSES; i++) {
      [...componentGroups].forEach((gr) => {
        if (gr === anchorGroup) return;
        const neighbors = [...layoutChildren[gr], ...layoutParents[gr]];
        if (neighbors.length === 0) return;
        const target = neighbors.reduce((sum, n) => sum + (groupX[n] ?? 0), 0) / neighbors.length;
        groupX[gr] = groupX[gr] * PREVIOUS_WEIGHT + target * NEIGHBOR_WEIGHT;
      });
    }

    const levelGroups = {};
    [...componentGroups].forEach((gr) => {
      const level = groupLevel[gr] ?? 0;
      (levelGroups[level] ??= []).push(gr);
    });

    Object.values(levelGroups).forEach((groupsAtLevel) => {
      groupsAtLevel.sort((a, b) => groupX[a] - groupX[b]);
      let previousGroup = null;
      groupsAtLevel.forEach((gr, idx) => {
        const desired = groupX[gr];
        if (idx === 0) {
          groupX[gr] = desired;
          previousGroup = gr;
          return;
        }

        const minCenterDistance = (((groupWidth[previousGroup] ?? 0) + (groupWidth[gr] ?? 0)) / 2) + GROUP_GAP;
        const minPos = groupX[previousGroup] + minCenterDistance;
        groupX[gr] = Math.max(desired, minPos);
        previousGroup = gr;
      });
    });

    const disconnected = allGroups.filter(gr => !componentGroups.has(gr));
    let disconnectedCursor = Math.max(...Object.values(groupX), 0) + FAMILY_GAP;
    disconnected.forEach((gr) => {
      groupLevel[gr] = 0;
      groupX[gr] = disconnectedCursor;
      disconnectedCursor += FAMILY_GAP;
    });

    const posMap = {};
    allGroups.forEach((gr) => {
      const members = groupMembers[gr];
      const centerX = groupX[gr] ?? 0;
      const y = (groupLevel[gr] ?? 0) * LEVEL_H;
      const startX = centerX - ((members.length - 1) * PARTNER_GAP) / 2;
      members.forEach((memberId, index) => {
        posMap[memberId] = { x: startX + (index * PARTNER_GAP), y };
      });
    });

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
    } else if (type === EDGE_TYPES.SIBLING) {
      type = EDGE_TYPES.SIBLING;
      if (!label) label = 'Hermano/a';
    }

    newEdges.push(createEdge({ from, to, type, label }));
    return newEdges;
  }
}
