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
