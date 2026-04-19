import { EDGE_TYPES, resolveEdgeLabel } from '../config/constants';

const AUTO_SIBLING_LABELS = {
  full: 'Hermano/a',
  half: 'Medio hermano/a',
  step: 'Hermanastro/a',
};

function buildParentsByChild(edges) {
  const map = new Map();
  edges.forEach((edge) => {
    if (edge.type !== EDGE_TYPES.PARENT) return;
    if (!map.has(edge.to)) map.set(edge.to, new Set());
    map.get(edge.to).add(edge.from);
  });
  return map;
}

function isMarriedEdge(edge) {
  if (edge.type === EDGE_TYPES.SPOUSE) return true;
  if (edge.type !== EDGE_TYPES.PARTNER) return false;
  return resolveEdgeLabel(edge) === 'Casado/a';
}

function buildMarriedPartnerMap(edges) {
  const map = new Map();
  edges.forEach((edge) => {
    if (!isMarriedEdge(edge)) return;
    if (!map.has(edge.from)) map.set(edge.from, new Set());
    if (!map.has(edge.to)) map.set(edge.to, new Set());
    map.get(edge.from).add(edge.to);
    map.get(edge.to).add(edge.from);
  });
  return map;
}

function classifySibling(nodeAId, nodeBId, parentsByChild, marriedPartnerMap) {
  const parentsA = parentsByChild.get(nodeAId) || new Set();
  const parentsB = parentsByChild.get(nodeBId) || new Set();
  const commonCount = [...parentsA].filter(pid => parentsB.has(pid)).length;

  // Two or more shared parents are treated as full siblings.
  if (commonCount >= 2) return 'full';
  if (commonCount === 1) return 'half';

  for (const parentA of parentsA) {
    const partners = marriedPartnerMap.get(parentA) || new Set();
    for (const parentB of parentsB) {
      if (partners.has(parentB)) return 'step';
    }
  }

  return null;
}

export function getSiblingsForNode(nodes, edges, nodeId) {
  const parentsByChild = buildParentsByChild(edges);
  const marriedPartnerMap = buildMarriedPartnerMap(edges);

  const explicitSiblingEdges = edges.filter(
    edge => edge.type === EDGE_TYPES.SIBLING && (edge.from === nodeId || edge.to === nodeId),
  );

  const relatedById = new Map();

  explicitSiblingEdges.forEach((edge) => {
    const targetId = edge.from === nodeId ? edge.to : edge.from;
    relatedById.set(targetId, {
      targetId,
      label: edge.label || AUTO_SIBLING_LABELS.full,
      kind: 'manual',
      edgeId: edge.id,
    });
  });

  nodes.forEach((node) => {
    if (node.id === nodeId || relatedById.has(node.id)) return;
    const type = classifySibling(nodeId, node.id, parentsByChild, marriedPartnerMap);
    if (!type) return;
    relatedById.set(node.id, {
      targetId: node.id,
      label: AUTO_SIBLING_LABELS[type],
      kind: type,
    });
  });

  return [...relatedById.values()];
}

export function getSiblingStatsByNode(nodes, edges) {
  const stats = {};
  nodes.forEach((node) => {
    const siblings = getSiblingsForNode(nodes, edges, node.id);
    stats[node.id] = {
      full: siblings.filter(s => s.label === AUTO_SIBLING_LABELS.full).length,
      half: siblings.filter(s => s.label === AUTO_SIBLING_LABELS.half).length,
      step: siblings.filter(s => s.label === AUTO_SIBLING_LABELS.step).length,
    };
  });
  return stats;
}
