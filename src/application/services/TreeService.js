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
   * Organise every node in the tree by generation level.
   * Parents sit above their children; partners share the same row.
   * Returns a new nodes array with updated x/y positions.
   */
  organizeByLevels(nodes, edges) {
    if (nodes.length === 0) return nodes;

    // ── 1. Build adjacency helpers ──────────────────────────────────────
    const childrenOf = {};   // parentId → [childId]
    const parentsOf = {};    // childId  → [parentId]
    const partnersOf = {};   // nodeId   → [partnerId]

    edges.forEach(e => {
      if (e.type === EDGE_TYPES.PARENT) {
        if (!childrenOf[e.from]) childrenOf[e.from] = [];
        childrenOf[e.from].push(e.to);
        if (!parentsOf[e.to]) parentsOf[e.to] = [];
        parentsOf[e.to].push(e.from);
      } else if (isPartnerEdgeType(e.type)) {
        if (!partnersOf[e.from]) partnersOf[e.from] = [];
        partnersOf[e.from].push(e.to);
        if (!partnersOf[e.to]) partnersOf[e.to] = [];
        partnersOf[e.to].push(e.from);
      }
    });

    // ── 2. Group partners into "family units" via union-find ────────────
    const parent = {};
    const find = (a) => {
      if (parent[a] === undefined) parent[a] = a;
      while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; }
      return a;
    };
    const union = (a, b) => { parent[find(a)] = find(b); };

    edges.forEach(e => {
      if (isPartnerEdgeType(e.type)) union(e.from, e.to);
    });

    // ── 3. Assign generation levels via BFS ─────────────────────────────
    const level = {};
    const nodeIds = new Set(nodes.map(n => n.id));

    // Find root nodes (those with no parents)
    const roots = nodes.filter(n => !parentsOf[n.id] || parentsOf[n.id].length === 0);

    // BFS from every root
    const queue = [];
    roots.forEach(r => {
      if (level[r.id] === undefined) {
        level[r.id] = 0;
        queue.push(r.id);
      }
    });

    // If there are disconnected nodes with no parent info, assign them level 0
    nodes.forEach(n => {
      if (level[n.id] === undefined) {
        level[n.id] = 0;
        queue.push(n.id);
      }
    });

    let head = 0;
    while (head < queue.length) {
      const cur = queue[head++];
      const curLevel = level[cur];

      // Partners share the same level
      (partnersOf[cur] || []).forEach(pid => {
        if (level[pid] === undefined && nodeIds.has(pid)) {
          level[pid] = curLevel;
          queue.push(pid);
        }
      });

      // Children go one level below
      (childrenOf[cur] || []).forEach(cid => {
        if (level[cid] === undefined && nodeIds.has(cid)) {
          level[cid] = curLevel + 1;
          queue.push(cid);
        }
      });

      // Parents go one level above
      (parentsOf[cur] || []).forEach(pid => {
        if (level[pid] === undefined && nodeIds.has(pid)) {
          level[pid] = curLevel - 1;
          queue.push(pid);
        }
      });
    }

    // ── 4. Normalize levels so minimum is 0 ─────────────────────────────
    const minLevel = Math.min(...Object.values(level));
    Object.keys(level).forEach(k => { level[k] -= minLevel; });

    // ── 5. Group nodes by level, keeping family units together ──────────
    const levelGroups = {};
    nodes.forEach(n => {
      const lv = level[n.id] ?? 0;
      if (!levelGroups[lv]) levelGroups[lv] = [];
      levelGroups[lv].push(n.id);
    });

    // Within each level, sort so partner-units are contiguous
    Object.keys(levelGroups).forEach(lv => {
      levelGroups[lv].sort((a, b) => {
        const ga = find(a);
        const gb = find(b);
        if (ga < gb) return -1;
        if (ga > gb) return 1;
        return 0;
      });
    });

    // ── 6. Compute x/y positions ────────────────────────────────────────
    const HORIZONTAL_GAP = 160;   // gap between nodes on the same level
    const VERTICAL_GAP = 200;     // gap between levels
    const PARTNER_GAP = 120;      // tighter gap between partners

    const posMap = {};

    const sortedLevels = Object.keys(levelGroups).map(Number).sort((a, b) => a - b);
    sortedLevels.forEach(lv => {
      const group = levelGroups[lv];

      // Build sub-groups of partner-units
      const subGroups = [];
      let currentUnit = null;

      group.forEach(nid => {
        const root = find(nid);
        if (!currentUnit || currentUnit.root !== root) {
          currentUnit = { root, members: [] };
          subGroups.push(currentUnit);
        }
        currentUnit.members.push(nid);
      });

      // Calculate total width of this level
      let totalWidth = 0;
      subGroups.forEach((sg, i) => {
        totalWidth += (sg.members.length - 1) * PARTNER_GAP;
        if (i > 0) totalWidth += HORIZONTAL_GAP;
      });

      // Center the level around x = 0
      let cursor = -totalWidth / 2;
      subGroups.forEach((sg, i) => {
        if (i > 0) cursor += HORIZONTAL_GAP;
        sg.members.forEach((nid, j) => {
          if (j > 0) cursor += PARTNER_GAP;
          posMap[nid] = { x: cursor, y: lv * VERTICAL_GAP };
        });
      });
    });

    // ── 7. Return updated nodes ─────────────────────────────────────────
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
