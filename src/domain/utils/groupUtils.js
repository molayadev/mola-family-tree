import { isPartnerEdgeType, isBrokenLabel } from '../config/constants';

/** Random group visual helpers */
const GROUP_EMOJIS = ['👨‍👩‍👧', '👨‍👩‍👧‍👦', '👩‍👩‍👦', '👨‍👨‍👧', '🏡', '💞', '🌳', '💫', '🫶', '✨'];
const GROUP_COLORS = ['#F97316', '#7C3AED', '#0891B2', '#16A34A', '#DC2626', '#EA580C', '#4F46E5', '#D946EF'];

export const randomGroupEmoji = () => GROUP_EMOJIS[Math.floor(Math.random() * GROUP_EMOJIS.length)];
export const randomGroupColor = () => GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];

export const normalizeGroupColor = (color, fallback = '#F97316') => (
  typeof color === 'string' && color.trim() ? color.trim() : fallback
);

/**
 * Sanitize and normalise a raw family-groups array so every group has all
 * required fields and only contains node IDs that exist in the current tree.
 */
export const normalizeFamilyGroups = (groups, nodes) => {
  const validNodeIds = new Set(nodes.map(n => n.id));
  return (Array.isArray(groups) ? groups : [])
    .filter(Boolean)
    .map((group, index) => {
      const nodeIds = Array.isArray(group.nodeIds)
        ? [...new Set(group.nodeIds.filter(id => validNodeIds.has(id)))]
        : [];
      return {
        id: String(group.id || `family-group-${index}`),
        label: String(group.label || '').trim(),
        emoji: String(group.emoji || randomGroupEmoji()),
        color: normalizeGroupColor(group.color),
        nodeIds,
        collapsed: Boolean(group.collapsed),
      };
    })
    .filter(group => group.label.length > 0 && group.nodeIds.length > 0);
};

/**
 * Return the set of node IDs that should be hidden given the current group
 * collapse / isolation state.
 */
export const computeHiddenNodeIds = (nodes, groups, isolatedGroupId) => {
  const hidden = new Set();
  const allNodeIds = new Set(nodes.map(n => n.id));

  if (isolatedGroupId) {
    const isolated = groups.find(group => group.id === isolatedGroupId);
    if (isolated) {
      const visibleSet = new Set(isolated.nodeIds);
      allNodeIds.forEach((id) => {
        if (!visibleSet.has(id)) hidden.add(id);
      });
    }
  }

  groups.forEach((group) => {
    if (!group.collapsed) return;
    group.nodeIds.forEach((id) => {
      if (allNodeIds.has(id)) hidden.add(id);
    });
  });

  return hidden;
};

/**
 * Automatically derive nuclear-family groups from the current edges.
 * Only creates groups when the tree has at least 2 nodes and 1 edge.
 */
export const buildAutoFamilyGroups = (nodes, edges) => {
  if (nodes.length < 2 || edges.length === 0) return [];

  const childrenOf = {};
  const childParents = {};
  const spouseMap = {};

  edges.forEach((edge) => {
    if (edge.type === 'parent') {
      (childrenOf[edge.from] ??= []).push(edge.to);
      (childParents[edge.to] ??= new Set()).add(edge.from);
      return;
    }

    if (!isPartnerEdgeType(edge.type) || isBrokenLabel(edge.label)) return;

    (spouseMap[edge.from] ??= new Set()).add(edge.to);
    (spouseMap[edge.to] ??= new Set()).add(edge.from);
  });

  const nuclei = Object.values(childParents)
    .map((set) => [...set].sort())
    .filter((parents) => parents.length > 0);

  const uniqueNucleiKeys = [...new Set(nuclei.map((parents) => parents.join(':')))];

  return uniqueNucleiKeys.map((key, index) => {
    const parents = key.split(':').filter(Boolean);
    const children = Object.entries(childParents)
      .filter(([, parentSet]) => [...parentSet].sort().join(':') === key)
      .map(([childId]) => childId);

    const members = new Set([...parents, ...children]);

    children.forEach((childId) => {
      (childrenOf[childId] || []).forEach((grandchildId) => members.add(grandchildId));
      (spouseMap[childId] || new Set()).forEach((spouseId) => members.add(spouseId));
    });

    return {
      id: `auto-family-group-${index + 1}`,
      label: `Núcleo familiar ${index + 1}`,
      emoji: randomGroupEmoji(),
      color: randomGroupColor(),
      nodeIds: [...members],
      collapsed: false,
    };
  });
};
