import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Move, Link as LinkIcon, X, Eye, Pencil, GitBranch, ArrowUp, ArrowDown, Users, Venus, Mars, CircleDot } from 'lucide-react';
import { isPartnerEdgeType, isBrokenLabel, resolveEdgeLabel } from '../../../domain/config/constants';
import { generateId } from '../../../domain/entities/Node';
import { useCanvas } from '../../../application/hooks/useCanvas';
import { downloadTreeSnapshot } from '../../../application/services/SnapshotService';
import CanvasHUD from './CanvasHUD';
import ZoomControls from './ZoomControls';
import FamilyNode from './FamilyNode';
import FamilyEdge from './FamilyEdge';
import NodeActionsModal from '../modals/NodeActionsModal';
import PartnerSelectionModal from '../modals/PartnerSelectionModal';
import LinkTypeSelectionModal from '../modals/LinkTypeSelectionModal';
import LinkTypesManagerModal from '../modals/LinkTypesManagerModal';
import FamilyGroupsModal from '../modals/FamilyGroupsModal';
import OrganizeTreeModal from '../modals/OrganizeTreeModal';
import Input from '../common/Input';

const GROUP_EMOJIS = ['👨‍👩‍👧', '👨‍👩‍👧‍👦', '👩‍👩‍👦', '👨‍👨‍👧', '🏡', '💞', '🌳', '💫', '🫶', '✨'];
const GROUP_COLORS = ['#F97316', '#7C3AED', '#0891B2', '#16A34A', '#DC2626', '#EA580C', '#4F46E5', '#D946EF'];
const LINEAGE_VIEW_MODES = [
  { value: 'relatives', label: 'Mi árbol', shortLabel: 'Árbol', icon: Users },
  { value: 'ancestors', label: 'Ancestros', shortLabel: 'Asc.', icon: ArrowUp },
  { value: 'descendants', label: 'Descendencia', shortLabel: 'Desc.', icon: ArrowDown },
  { value: 'lineage', label: 'Linaje', shortLabel: 'Linaje', icon: GitBranch },
  { value: 'radial', label: 'Vista radial', shortLabel: 'Radial', icon: CircleDot },
  { value: 'all', label: 'Todo', shortLabel: 'Todo', icon: Users },
];
const FIT_TO_SCREEN_DELAY = 100;

const randomGroupEmoji = () => GROUP_EMOJIS[Math.floor(Math.random() * GROUP_EMOJIS.length)];
const randomGroupColor = () => GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
const normalizeGroupColor = (color, fallback = '#F97316') => (
  typeof color === 'string' && color.trim() ? color.trim() : fallback
);

const normalizeFamilyGroups = (groups, nodes) => {
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

const computeHiddenNodeIds = (nodes, groups, isolatedGroupId) => {
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

const buildAutoFamilyGroups = (nodes, edges) => {
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

const chooseParentWithMotherPriority = (parents, nodeMap, preferredId = null) => {
  if (!Array.isArray(parents) || parents.length === 0) return null;
  if (preferredId && parents.includes(preferredId)) return preferredId;
  const mother = parents.find((id) => nodeMap.get(id)?.data?.gender === 'female');
  if (mother) return mother;
  const father = parents.find((id) => nodeMap.get(id)?.data?.gender === 'male');
  if (father) return father;
  return parents[0];
};

const buildNodeParentControls = (nodes, edges, nodeId, parentChoiceByChildId) => {
  if (!nodeId) return { options: [], activeParentId: null };

  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  if (!nodeMap.has(nodeId)) return { options: [], activeParentId: null };

  const parentIds = [...new Set(
    edges
      .filter(edge => edge.type === 'parent' && edge.to === nodeId)
      .map(edge => edge.from)
  )].filter(id => nodeMap.has(id));

  const options = parentIds.map((parentId, index) => {
    const parentNode = nodeMap.get(parentId);
    const gender = parentNode?.data?.gender || 'unknown';
    const branchShortLabel = gender === 'female' ? 'M' : (gender === 'male' ? 'P' : `${index + 1}`);
    return {
      id: parentId,
      gender,
      branchShortLabel,
      label: `${parentNode?.data?.firstName || 'Rama'} ${parentNode?.data?.lastName || ''}`.trim(),
    };
  });

  const activeParentId = chooseParentWithMotherPriority(
    parentIds,
    nodeMap,
    parentChoiceByChildId?.[nodeId] || null,
  );

  return { options, activeParentId };
};

const buildLineageColumnPositions = (nodes, edges, focusNodeId) => {
  if (!focusNodeId) return new Map();

  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const focusNode = nodeMap.get(focusNodeId);
  if (!focusNode) return new Map();

  const parentsByChild = new Map();
  edges.forEach((edge) => {
    if (edge.type !== 'parent') return;
    if (!parentsByChild.has(edge.to)) parentsByChild.set(edge.to, []);
    parentsByChild.get(edge.to).push(edge.from);
  });

  const orderParents = (parentIds) => [...new Set(parentIds)]
    .filter(id => nodeMap.has(id))
    .sort((a, b) => {
      const genderWeight = (gender) => {
        if (gender === 'male') return 0;
        if (gender === 'female') return 1;
        return 2;
      };

      const aNode = nodeMap.get(a);
      const bNode = nodeMap.get(b);
      const aWeight = genderWeight(aNode?.data?.gender);
      const bWeight = genderWeight(bNode?.data?.gender);
      if (aWeight !== bWeight) return aWeight - bWeight;

      const aName = `${aNode?.data?.firstName || ''} ${aNode?.data?.lastName || ''}`.trim();
      const bName = `${bNode?.data?.firstName || ''} ${bNode?.data?.lastName || ''}`.trim();
      return aName.localeCompare(bName);
    });

  const metaByNodeId = new Map([[focusNodeId, { generation: 0, slot: 0 }]]);
  const queue = [{ nodeId: focusNodeId, generation: 0, slot: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    const parentIds = orderParents(parentsByChild.get(current.nodeId) || []);

    parentIds.forEach((parentId, index) => {
      const nextGeneration = current.generation + 1;
      const nextSlot = (current.slot * 2) + index;
      const existing = metaByNodeId.get(parentId);

      if (!existing || nextGeneration < existing.generation || (nextGeneration === existing.generation && nextSlot < existing.slot)) {
        metaByNodeId.set(parentId, { generation: nextGeneration, slot: nextSlot });
        queue.push({ nodeId: parentId, generation: nextGeneration, slot: nextSlot });
      }
    });
  }

  const nodesByGeneration = new Map();
  metaByNodeId.forEach((meta, nodeId) => {
    if (!nodesByGeneration.has(meta.generation)) nodesByGeneration.set(meta.generation, []);
    nodesByGeneration.get(meta.generation).push({ nodeId, slot: meta.slot });
  });

  const isMobileViewport = typeof window !== 'undefined' && window.innerWidth < 768;
  const columnGap = isMobileViewport ? 200 : 260;
  const rowGap = isMobileViewport ? 130 : 160;
  const positions = new Map();

  [...nodesByGeneration.entries()].forEach(([generation, entries]) => {
    const ordered = entries.sort((a, b) => a.slot - b.slot);
    ordered.forEach((entry, index) => {
      const yOffset = (index - ((ordered.length - 1) / 2)) * rowGap;
      positions.set(entry.nodeId, {
        x: focusNode.x + (generation * columnGap),
        y: focusNode.y + yOffset,
      });
    });
  });

  return positions;
};

// Fan chart (radial view): angle convention → 0=left, 90=top(up), 180=right
// Coord formula: x = cx - r*cos(θ), y = cy - r*sin(θ)   (Y flipped because SVG Y increases down)
const fanPolarToXY = (cx, cy, r, angleDeg) => {
  const θ = (angleDeg * Math.PI) / 180;
  return { x: cx - r * Math.cos(θ), y: cy - r * Math.sin(θ) };
};

const fanArcPath = (cx, cy, innerR, outerR, startDeg, endDeg) => {
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

const FAN_RING_WIDTHS = [0, 120, 100, 85, 75, 65]; // index = generation
const FAN_FOCUS_R = 55;
const FAN_MAX_GEN = 5;

const buildFanInnerRadii = () => {
  const radii = [0, FAN_FOCUS_R];
  for (let g = 2; g <= FAN_MAX_GEN; g++) {
    radii[g] = radii[g - 1] + (FAN_RING_WIDTHS[g - 1] || 65);
  }
  return radii;
};
const FAN_INNER_RADII = buildFanInnerRadii();

const getFanSectorColor = (gen, slot, numSlots, hasNode) => {
  if (!hasNode) return '#f8fafc';
  const isLeft = slot < numSlots / 2;
  const lightness = Math.min(91, 76 + gen * 3);
  return isLeft ? `hsl(208, 65%, ${lightness}%)` : `hsl(338, 60%, ${lightness}%)`;
};

const buildFanSlots = (nodes, edges, focusNodeId) => {
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

const buildRadialPositions = (nodes, edges, focusNodeId) => {
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

const buildLineageVisibility = (nodes, edges, focusNodeId, parentChoiceByChildId, viewMode, relativesBranchMode) => {
  const effectiveViewMode = viewMode === 'relatives' && (relativesBranchMode === 'maternal' || relativesBranchMode === 'paternal')
    ? relativesBranchMode
    : viewMode;
  const nodeMap = new Map(nodes.map(node => [node.id, node]));
  const parentsByChild = new Map();
  const childrenByParent = new Map();
  const partnersByNode = new Map();

  edges.forEach((edge) => {
    if (edge.type === 'parent') {
      if (!parentsByChild.has(edge.to)) parentsByChild.set(edge.to, []);
      parentsByChild.get(edge.to).push(edge.from);
      if (!childrenByParent.has(edge.from)) childrenByParent.set(edge.from, []);
      childrenByParent.get(edge.from).push(edge.to);
      return;
    }

    if (!isPartnerEdgeType(edge.type)) return;
    if (!partnersByNode.has(edge.from)) partnersByNode.set(edge.from, []);
    if (!partnersByNode.has(edge.to)) partnersByNode.set(edge.to, []);
    partnersByNode.get(edge.from).push(edge.to);
    partnersByNode.get(edge.to).push(edge.from);
  });

  const resolvedFocusNodeId = (
    focusNodeId && nodeMap.has(focusNodeId)
      ? focusNodeId
      : (nodes[0]?.id || null)
  );
  const visibleNodeIds = new Set();

  const addNode = (nodeId) => {
    if (!nodeMap.has(nodeId)) return;
    visibleNodeIds.add(nodeId);
  };

  const addNodePartners = (nodeId) => {
    (partnersByNode.get(nodeId) || []).forEach((partnerId) => addNode(partnerId));
  };

  const getUniqueParents = (childId) => [...new Set(parentsByChild.get(childId) || [])]
    .filter(id => nodeMap.has(id));

  const chooseParentByMode = (parents, childId, mode) => {
    if (!Array.isArray(parents) || parents.length === 0) return null;

    const explicitChoice = parentChoiceByChildId?.[childId] || null;
    if (explicitChoice && parents.includes(explicitChoice)) return explicitChoice;

    if (mode === 'maternal') {
      const mother = parents.find((id) => nodeMap.get(id)?.data?.gender === 'female');
      if (mother) return mother;
    }

    if (mode === 'paternal') {
      const father = parents.find((id) => nodeMap.get(id)?.data?.gender === 'male');
      if (father) return father;
    }

    return chooseParentWithMotherPriority(parents, nodeMap, explicitChoice);
  };

  const getAncestorPath = (startNodeId, mode) => {
    const path = [];
    const visited = new Set();
    let currentChildId = startNodeId;

    while (currentChildId && !visited.has(currentChildId)) {
      visited.add(currentChildId);
      const parents = getUniqueParents(currentChildId);
      if (parents.length === 0) break;
      const selectedParent = chooseParentByMode(parents, currentChildId, mode);
      if (!selectedParent) break;
      path.push(selectedParent);
      currentChildId = selectedParent;
    }

    return path;
  };

  const addDescendants = (nodeId) => {
    const queue = [nodeId];
    const visited = new Set();
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);
      addNode(currentId);
      addNodePartners(currentId);
      (childrenByParent.get(currentId) || []).forEach((childId) => {
        addNode(childId);
        queue.push(childId);
      });
    }
  };

  const addSiblingsWithFamilies = (nodeId) => {
    const siblings = new Set();
    getUniqueParents(nodeId).forEach((parentId) => {
      (childrenByParent.get(parentId) || []).forEach((childId) => {
        if (childId !== nodeId) siblings.add(childId);
      });
    });

    siblings.forEach((siblingId) => {
      addNode(siblingId);
      addNodePartners(siblingId);
      addDescendants(siblingId);
    });
  };

  const collectAllAncestors = (startNodeId) => {
    const ancestors = new Set();
    const stack = [startNodeId];

    while (stack.length > 0) {
      const currentId = stack.pop();
      getUniqueParents(currentId).forEach((parentId) => {
        if (ancestors.has(parentId)) return;
        ancestors.add(parentId);
        stack.push(parentId);
      });
    }

    return [...ancestors];
  };

  if (!resolvedFocusNodeId) {
    return {
      resolvedFocusNodeId: null,
      visibleNodeIds,
      focusParentOptions: [],
      activeParentId: null,
    };
  }

  if (effectiveViewMode === 'all') {
    nodes.forEach((node) => addNode(node.id));
    return {
      resolvedFocusNodeId,
      visibleNodeIds,
      focusParentOptions: [],
      activeParentId: null,
    };
  }

  const focusParentsRaw = [...new Set(parentsByChild.get(resolvedFocusNodeId) || [])]
    .filter(id => nodeMap.has(id));
  const focusParentOptions = focusParentsRaw.map((parentId, index) => {
    const parentNode = nodeMap.get(parentId);
    const gender = parentNode?.data?.gender || 'unknown';
    const branchShortLabel = gender === 'female' ? 'M' : (gender === 'male' ? 'P' : `${index + 1}`);
    return {
      id: parentId,
      gender,
      branchShortLabel,
      label: `${parentNode?.data?.firstName || 'Rama'} ${parentNode?.data?.lastName || ''}`.trim(),
    };
  });

  addNode(resolvedFocusNodeId);
  if (effectiveViewMode !== 'lineage' && effectiveViewMode !== 'radial') {
    addNodePartners(resolvedFocusNodeId);
  }

  if (effectiveViewMode === 'descendants' || effectiveViewMode === 'relatives') {
    addDescendants(resolvedFocusNodeId);
  }

  let activeParentId = null;
  if (effectiveViewMode === 'radial') {
    activeParentId = chooseParentWithMotherPriority(
      focusParentsRaw,
      nodeMap,
      parentChoiceByChildId?.[resolvedFocusNodeId] || null,
    );
    const allAncestors = collectAllAncestors(resolvedFocusNodeId);
    allAncestors.forEach((ancestorId) => {
      addNode(ancestorId);
    });
  } else if (effectiveViewMode === 'lineage') {
    activeParentId = chooseParentWithMotherPriority(
      focusParentsRaw,
      nodeMap,
      parentChoiceByChildId?.[resolvedFocusNodeId] || null,
    );

    const allAncestors = collectAllAncestors(resolvedFocusNodeId);
    allAncestors.forEach((ancestorId) => {
      addNode(ancestorId);
    });
  } else if (effectiveViewMode === 'ancestors' || effectiveViewMode === 'relatives') {
    if (effectiveViewMode === 'relatives') {
      activeParentId = chooseParentWithMotherPriority(
        focusParentsRaw,
        nodeMap,
        parentChoiceByChildId?.[resolvedFocusNodeId] || null,
      );

      const allAncestors = collectAllAncestors(resolvedFocusNodeId);
      allAncestors.forEach((ancestorId) => {
        addNode(ancestorId);
        addNodePartners(ancestorId);
        addSiblingsWithFamilies(ancestorId);
        addDescendants(ancestorId);
      });

      addSiblingsWithFamilies(resolvedFocusNodeId);
    } else {
      const ancestorPath = getAncestorPath(resolvedFocusNodeId, effectiveViewMode);
      activeParentId = ancestorPath[0] || null;
      ancestorPath.forEach((ancestorId) => {
        addNode(ancestorId);
        addNodePartners(ancestorId);
        addSiblingsWithFamilies(ancestorId);
      });
    }
  } else if (effectiveViewMode === 'maternal' || effectiveViewMode === 'paternal') {
    const rootParent = chooseParentByMode(getUniqueParents(resolvedFocusNodeId), resolvedFocusNodeId, effectiveViewMode);
    activeParentId = rootParent || null;

    if (rootParent) {
      const branchAncestors = [rootParent, ...getAncestorPath(rootParent, effectiveViewMode)];
      branchAncestors.forEach((ancestorId) => {
        addNode(ancestorId);
        addNodePartners(ancestorId);
        addSiblingsWithFamilies(ancestorId);
        addDescendants(ancestorId);
      });
    } else {
      // No parent of requested branch exists: keep current family context visible.
      addDescendants(resolvedFocusNodeId);
    }
  } else {
    activeParentId = chooseParentWithMotherPriority(
      focusParentsRaw,
      nodeMap,
      parentChoiceByChildId?.[resolvedFocusNodeId] || null,
    );
  }

  return {
    resolvedFocusNodeId,
    visibleNodeIds,
    focusParentOptions,
    activeParentId,
  };
};

export default function FamilyCanvas({ username, nodes, edges, customLinkTypes, familyGroups, treeService, exportService, undoService, onSave, onLogout }) {
  const [actionsModal, setActionsModal] = useState({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  const [actionsModalKey, setActionsModalKey] = useState(0);
  const [partnerSelection, setPartnerSelection] = useState(null);
  const [focusNodeId, setFocusNodeId] = useState(() => nodes[0]?.id || null);
  const [selectedNodeId, setSelectedNodeId] = useState(() => nodes[0]?.id || null);
  const [lineageViewMode, setLineageViewMode] = useState('relatives');
  const [relativesBranchMode, setRelativesBranchMode] = useState(null);
  const [parentChoiceByChildId, setParentChoiceByChildId] = useState({});
  const [linkTypesModalOpen, setLinkTypesModalOpen] = useState(false);
  const [familyGroupsModalOpen, setFamilyGroupsModalOpen] = useState(false);
  const [isolatedGroupId, setIsolatedGroupId] = useState(null);
  const [highlightedGroupId, setHighlightedGroupId] = useState(null);
  const [groupDraft, setGroupDraft] = useState(null);
  const [collapsedGroupMenu, setCollapsedGroupMenu] = useState(null); // { groupId, x, y }
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);
  const [organizationMode, setOrganizationMode] = useState('none');

  // Linking mode state
  const [linkingMode, setLinkingMode] = useState(null); // { sourceId } or null
  const [linkTarget, setLinkTarget] = useState(null);    // target nodeId or null

  const autoGroupsInitializedRef = useRef(false);

  const normalizedFamilyGroups = useMemo(() => normalizeFamilyGroups(familyGroups, nodes), [familyGroups, nodes]);

  const lineageVisibility = useMemo(
    () => buildLineageVisibility(nodes, edges, focusNodeId, parentChoiceByChildId, lineageViewMode, relativesBranchMode),
    [nodes, edges, focusNodeId, parentChoiceByChildId, lineageViewMode, relativesBranchMode],
  );

  const hiddenNodeIds = useMemo(
    () => computeHiddenNodeIds(nodes, normalizedFamilyGroups, isolatedGroupId),
    [nodes, normalizedFamilyGroups, isolatedGroupId],
  );

  const lineageHiddenNodeIds = useMemo(() => {
    const hidden = new Set();
    if (groupDraft) return hidden;
    nodes.forEach((node) => {
      if (!lineageVisibility.visibleNodeIds.has(node.id)) hidden.add(node.id);
    });
    return hidden;
  }, [nodes, lineageVisibility.visibleNodeIds, groupDraft]);

  const effectiveHiddenNodeIds = useMemo(() => {
    if (groupDraft) return new Set();
    const merged = new Set(hiddenNodeIds);
    lineageHiddenNodeIds.forEach(nodeId => merged.add(nodeId));
    return merged;
  }, [groupDraft, hiddenNodeIds, lineageHiddenNodeIds]);

  const visibleNodes = useMemo(
    () => nodes.filter(n => !effectiveHiddenNodeIds.has(n.id)),
    [nodes, effectiveHiddenNodeIds],
  );

  const canUseOrganize = lineageViewMode === 'relatives' || lineageViewMode === 'all';

  const lineageColumnPositions = useMemo(() => {
    const focusId = lineageVisibility.resolvedFocusNodeId;
    if (lineageViewMode === 'lineage') return buildLineageColumnPositions(nodes, edges, focusId);
    if (lineageViewMode === 'radial') return buildRadialPositions(nodes, edges, focusId);
    return new Map();
  }, [lineageViewMode, nodes, edges, lineageVisibility.resolvedFocusNodeId]);

  const lineageAncestorNodeIds = useMemo(() => {
    if (lineageViewMode !== 'lineage' && lineageViewMode !== 'radial') return new Set();
    const focusId = lineageVisibility.resolvedFocusNodeId;
    if (!focusId) return new Set();

    const parentsByChild = new Map();
    edges.forEach((edge) => {
      if (edge.type !== 'parent') return;
      if (!parentsByChild.has(edge.to)) parentsByChild.set(edge.to, []);
      parentsByChild.get(edge.to).push(edge.from);
    });

    const ancestorIds = new Set();
    const stack = [focusId];
    while (stack.length > 0) {
      const currentId = stack.pop();
      const parentIds = [...new Set(parentsByChild.get(currentId) || [])];
      parentIds.forEach((parentId) => {
        if (ancestorIds.has(parentId)) return;
        ancestorIds.add(parentId);
        stack.push(parentId);
      });
    }

    return ancestorIds;
  }, [lineageViewMode, edges, lineageVisibility.resolvedFocusNodeId]);

  const fanData = useMemo(() => {
    if (lineageViewMode !== 'radial') return null;
    return buildFanSlots(nodes, edges, lineageVisibility.resolvedFocusNodeId);
  }, [lineageViewMode, nodes, edges, lineageVisibility.resolvedFocusNodeId]);

  const radialFitBoundsNodes = useMemo(() => {
    if (lineageViewMode !== 'radial' || !fanData || fanData.rings.length === 0) return null;
    const lastRing = fanData.rings[fanData.rings.length - 1];
    const maxR = lastRing.outerR;
    const cx = fanData.cx;
    const cy = fanData.cy;
    const focusR = fanData.focusR || 0;

    // Virtual bounds so fit/center includes full fan geometry, not only node centers.
    return [
      { id: 'fan-left', x: cx - maxR, y: cy },
      { id: 'fan-right', x: cx + maxR, y: cy },
      { id: 'fan-top', x: cx, y: cy - maxR },
      { id: 'fan-bottom', x: cx, y: cy + focusR },
    ];
  }, [lineageViewMode, fanData]);

  const renderedNodeById = useMemo(() => {
    const map = new Map();
    nodes.forEach((node) => {
      const forcedPosition = lineageColumnPositions.get(node.id);
      map.set(node.id, forcedPosition ? { ...node, ...forcedPosition } : node);
    });
    return map;
  }, [nodes, lineageColumnPositions]);

  const displayedVisibleNodes = useMemo(
    () => visibleNodes.map(node => renderedNodeById.get(node.id) || node),
    [visibleNodes, renderedNodeById],
  );

  const collapsedGroupByNodeId = useMemo(() => {
    if (groupDraft) return new Map();
    const map = new Map();
    normalizedFamilyGroups
      .filter(group => group.collapsed)
      .forEach((group) => {
        group.nodeIds.forEach((nodeId) => map.set(nodeId, group.id));
      });
    return map;
  }, [normalizedFamilyGroups, groupDraft]);

  const collapsedGroupBubbleMap = useMemo(() => {
    if (groupDraft) return new Map();
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const bubbleMap = new Map();

    normalizedFamilyGroups
      .filter(group => group.collapsed)
      .forEach((group) => {
        if (isolatedGroupId && isolatedGroupId !== group.id) return;
        const members = group.nodeIds.map(id => nodeMap.get(id)).filter(Boolean);
        if (members.length === 0) return;

        const x = members.reduce((sum, node) => sum + node.x, 0) / members.length;
        const y = members.reduce((sum, node) => sum + node.y, 0) / members.length;
        bubbleMap.set(group.id, {
          id: `collapsed-group-${group.id}`,
          groupId: group.id,
          x,
          y,
          label: group.label,
          emoji: group.emoji,
          color: normalizeGroupColor(group.color),
        });
      });

    return bubbleMap;
  }, [nodes, normalizedFamilyGroups, isolatedGroupId, groupDraft]);

  const renderedEdges = useMemo(() => {
    const nodeMap = renderedNodeById;
    const dedupe = new Set();
    const output = [];

    const resolveRenderedEndpoints = (edge) => {
      const fromHidden = effectiveHiddenNodeIds.has(edge.from);
      const toHidden = effectiveHiddenNodeIds.has(edge.to);
      const fromCollapsedGroup = collapsedGroupByNodeId.get(edge.from);
      const toCollapsedGroup = collapsedGroupByNodeId.get(edge.to);

      let fromNode = nodeMap.get(edge.from);
      let toNode = nodeMap.get(edge.to);

      if (fromHidden || toHidden) {
        if (fromHidden && fromCollapsedGroup) {
          const bubble = collapsedGroupBubbleMap.get(fromCollapsedGroup);
          if (bubble) fromNode = { id: edge.from, x: bubble.x, y: bubble.y };
        }
        if (toHidden && toCollapsedGroup) {
          const bubble = collapsedGroupBubbleMap.get(toCollapsedGroup);
          if (bubble) toNode = { id: edge.to, x: bubble.x, y: bubble.y };
        }

        const canRenderFromCollapsed = !fromHidden || Boolean(fromCollapsedGroup);
        const canRenderToCollapsed = !toHidden || Boolean(toCollapsedGroup);
        if (!canRenderFromCollapsed || !canRenderToCollapsed) return null;

        if (fromHidden && toHidden && fromCollapsedGroup === toCollapsedGroup) return null;
      }

      if (!fromNode || !toNode) return null;

      return { fromNode, toNode };
    };

    const pushRenderedEdge = (edge, fromNode, toNode, suffix = '') => {
      const key = [
        edge.type,
        edge.id || edge.sourceNodeId || suffix,
        suffix,
        `${Math.round(fromNode.x)}:${Math.round(fromNode.y)}`,
        `${Math.round(toNode.x)}:${Math.round(toNode.y)}`,
      ].join('|');

      if (dedupe.has(key)) return;
      dedupe.add(key);
      output.push({ edge, fromNode, toNode, renderKey: key });
    };

    const parentEdgesByChildId = new Map();
    const partnerEdgeByPairKey = new Map();

    edges.forEach((edge) => {
      if (isPartnerEdgeType(edge.type)) {
        const pairKey = [edge.from, edge.to].sort().join('|');
        const existing = partnerEdgeByPairKey.get(pairKey);
        if (!existing) {
          partnerEdgeByPairKey.set(pairKey, edge);
        } else {
          const existingBroken = existing.type === 'ex_spouse' || isBrokenLabel(resolveEdgeLabel(existing));
          const nextBroken = edge.type === 'ex_spouse' || isBrokenLabel(resolveEdgeLabel(edge));
          if (existingBroken && !nextBroken) partnerEdgeByPairKey.set(pairKey, edge);
        }
      }

      if (edge.type === 'parent') {
        if (!parentEdgesByChildId.has(edge.to)) parentEdgesByChildId.set(edge.to, []);
        parentEdgesByChildId.get(edge.to).push(edge);
        return;
      }

      const rendered = resolveRenderedEndpoints(edge);
      if (!rendered) return;
      pushRenderedEdge(edge, rendered.fromNode, rendered.toNode);
    });

    parentEdgesByChildId.forEach((childParentEdges, childId) => {
      const renderedParents = childParentEdges
        .map((edge) => {
          const rendered = resolveRenderedEndpoints(edge);
          if (!rendered) return null;
          return { edge, fromNode: rendered.fromNode, toNode: rendered.toNode };
        })
        .filter(Boolean);

      if (renderedParents.length === 0) return;

      const childNode = renderedParents[0].toNode;
      const uniqueByParent = new Map();
      renderedParents.forEach((entry) => {
        if (!uniqueByParent.has(entry.edge.from)) uniqueByParent.set(entry.edge.from, entry);
      });
      const uniqueParents = [...uniqueByParent.values()];

      if (uniqueParents.length === 2) {
        const parentIds = uniqueParents.map(item => item.edge.from).sort();
        const pairKey = parentIds.join('|');
        const partnerEdge = partnerEdgeByPairKey.get(pairKey);

        if (partnerEdge) {
          const [left, right] = [...uniqueParents].sort((a, b) => a.fromNode.x - b.fromNode.x);
          const relationLabel = resolveEdgeLabel(partnerEdge);
          const isBroken = partnerEdge.type === 'ex_spouse' || isBrokenLabel(relationLabel);
          // In atomic (curved) mode the partner line is a quadratic Bézier with its control
          // point arched 28px above the higher parent.  The true midpoint (t=0.5) of that
          // curve is: 0.25*P0 + 0.5*P_ctrl + 0.25*P2, which differs from the straight-line
          // midpoint only in Y.  We use that formula so the child branch visually originates
          // from the centre of the curve rather than from the air next to a parent node.
          const midX = (left.fromNode.x + right.fromNode.x) / 2;
          const straightMidY = (left.fromNode.y + right.fromNode.y) / 2;
          const curveControlY = Math.min(left.fromNode.y, right.fromNode.y) - 28;
          const curveMidY = 0.25 * left.fromNode.y + 0.5 * curveControlY + 0.25 * right.fromNode.y;
          const junctionNode = {
            id: left.edge.from,
            x: midX,
            y: organizationMode === 'atomic' ? curveMidY : straightMidY,
          };
          const connectorEdge = {
            id: `parent-bundle-${childId}-${pairKey}`,
            type: 'parent_bundle',
            sourceNodeId: left.edge.from,
            styleColor: '#F9A8D4',
            styleDash: isBroken ? '6,4' : '0',
          };
          pushRenderedEdge(connectorEdge, junctionNode, childNode, `bundle-${childId}`);
          return;
        }
      }

      uniqueParents.forEach(({ edge, fromNode }) => {
        const singleParentEdge = {
          ...edge,
          sourceNodeId: edge.from,
          styleColor: '#111827',
          styleDash: '0',
        };
        pushRenderedEdge(singleParentEdge, fromNode, childNode, `single-${edge.id || `${edge.from}-${edge.to}`}`);
      });
    });

    return output;
  }, [renderedNodeById, edges, effectiveHiddenNodeIds, collapsedGroupByNodeId, collapsedGroupBubbleMap, organizationMode]);

  const nodeGroupColorById = useMemo(() => {
    const map = new Map();
    normalizedFamilyGroups.forEach((group) => {
      const groupColor = normalizeGroupColor(group.color);
      group.nodeIds.forEach((nodeId) => {
        if (!map.has(nodeId)) map.set(nodeId, groupColor);
      });
    });
    return map;
  }, [normalizedFamilyGroups]);

  const highlightedGroupNodeIds = useMemo(() => {
    const group = normalizedFamilyGroups.find(item => item.id === highlightedGroupId);
    return new Set(group?.nodeIds || []);
  }, [normalizedFamilyGroups, highlightedGroupId]);

  const highlightedGroupColor = useMemo(() => {
    const group = normalizedFamilyGroups.find(item => item.id === highlightedGroupId);
    return normalizeGroupColor(group?.color);
  }, [normalizedFamilyGroups, highlightedGroupId]);

  const {
    transform,
    setTransform,
    canvasRef,
    stateRef,
    fitToScreen,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleNodePointerDown,
    zoomIn,
    zoomOut,
  } = useCanvas();

  const handleCenterCurrentView = useCallback(() => {
    if (lineageViewMode === 'radial' && radialFitBoundsNodes) {
      fitToScreen(radialFitBoundsNodes);
      return;
    }
    fitToScreen(displayedVisibleNodes.length > 0 ? displayedVisibleNodes : nodes);
  }, [lineageViewMode, radialFitBoundsNodes, fitToScreen, displayedVisibleNodes, nodes]);

  // Initialize view on mount
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => fitToScreen(nodes), FIT_TO_SCREEN_DELAY);
      return () => clearTimeout(timer);
    }
    setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, k: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lineageVisibility.resolvedFocusNodeId) return;
    if (groupDraft) return;
    const nodesForFit = lineageViewMode === 'radial'
      ? radialFitBoundsNodes
      : displayedVisibleNodes;
    if (!nodesForFit || nodesForFit.length === 0) return;
    const timer = setTimeout(() => fitToScreen(nodesForFit), FIT_TO_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [
    lineageVisibility.resolvedFocusNodeId,
    lineageViewMode,
    parentChoiceByChildId,
    isolatedGroupId,
    groupDraft,
    displayedVisibleNodes,
    radialFitBoundsNodes,
    fitToScreen,
  ]);

  useEffect(() => {
    if (nodes.length === 0) return;
    const hasNode = (nodeId) => Boolean(nodeId) && nodes.some(node => node.id === nodeId);
    if (!hasNode(selectedNodeId)) setSelectedNodeId(nodes[0].id);
    if (!hasNode(focusNodeId)) setFocusNodeId(nodes[0].id);
  }, [nodes, selectedNodeId, focusNodeId]);

  // Track if we need to save state before node movement
  const nodeMovementStateRef = useRef({ savedForCurrentDrag: false });

  const saveAndUpdate = useCallback((newNodes, newEdges, newCustomLinkTypes, newFamilyGroups) => {
    const resolvedCustomLinkTypes = newCustomLinkTypes ?? customLinkTypes;
    const resolvedFamilyGroups = normalizeFamilyGroups(newFamilyGroups ?? normalizedFamilyGroups, newNodes);
    onSave(newNodes, newEdges, resolvedCustomLinkTypes, resolvedFamilyGroups);
  }, [onSave, customLinkTypes, normalizedFamilyGroups]);

  // Auto-generate groups on first data load
  useEffect(() => {
    if (autoGroupsInitializedRef.current) return;
    if (nodes.length === 0) return;

    autoGroupsInitializedRef.current = true;
    if (normalizedFamilyGroups.length > 0) return;

    const generated = buildAutoFamilyGroups(nodes, edges);
    if (generated.length === 0) return;

    saveAndUpdate(nodes, edges, customLinkTypes, generated);
  }, [nodes, edges, customLinkTypes, normalizedFamilyGroups.length, saveAndUpdate]);

  // Wrapper for node movement that saves state on first move
  const saveAndUpdateWithUndo = useCallback((newNodes, newEdges, newCustomLinkTypes, newFamilyGroups) => {
    if (!nodeMovementStateRef.current.savedForCurrentDrag) {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      nodeMovementStateRef.current.savedForCurrentDrag = true;
    }
    const resolvedCustomLinkTypes = newCustomLinkTypes ?? customLinkTypes;
    const resolvedFamilyGroups = newFamilyGroups ?? normalizedFamilyGroups;
    onSave(newNodes, newEdges, resolvedCustomLinkTypes, resolvedFamilyGroups);
  }, [onSave, nodes, edges, customLinkTypes, normalizedFamilyGroups, undoService]);

  // Reset the flag when drag ends
  const handleDragEnd = useCallback(() => {
    nodeMovementStateRef.current.savedForCurrentDrag = false;
  }, []);

  const openActionsModal = useCallback((nodeId, initialTab = null, expandedEdgeId = null) => {
    setCollapsedGroupMenu(null);
    setActionsModal({ isOpen: true, nodeId, initialTab, expandedEdgeId });
    setActionsModalKey(k => k + 1);
  }, []);

  const closeActionsModal = useCallback(() => {
    setActionsModal({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  }, []);

  const selectGroupFromNode = useCallback((nodeId) => {
    const group = normalizedFamilyGroups.find(item => item.nodeIds.includes(nodeId));
    setHighlightedGroupId(group?.id || null);
  }, [normalizedFamilyGroups]);

  const handleLineClick = useCallback((edgeId, sourceNodeId) => {
    if (lineageViewMode !== 'relatives') return;
    setSelectedNodeId(sourceNodeId);
    setFocusNodeId(sourceNodeId);
    openActionsModal(sourceNodeId, 'links', edgeId);
    selectGroupFromNode(sourceNodeId);
  }, [lineageViewMode, openActionsModal, selectGroupFromNode]);

  const focusVisibleNodes = useCallback((nextGroups, nextIsolatedGroupId = isolatedGroupId) => {
    const groupHidden = computeHiddenNodeIds(nodes, nextGroups, nextIsolatedGroupId);
    const nextVisible = nodes.filter(node => (
      !groupHidden.has(node.id)
      && lineageVisibility.visibleNodeIds.has(node.id)
    ));
    setTimeout(() => fitToScreen(nextVisible.length > 0 ? nextVisible : nodes), FIT_TO_SCREEN_DELAY);
  }, [nodes, isolatedGroupId, fitToScreen, lineageVisibility.visibleNodeIds]);

  const confirmAddChild = useCallback((sourceId, partnerId) => {
    undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
    const result = treeService.addChild(nodes, edges, sourceId, partnerId);
    saveAndUpdate(result.nodes, result.edges);
    setPartnerSelection(null);
    const createdChild = result.nodes[result.nodes.length - 1];
    if (createdChild) setFocusNodeId(createdChild.id);
    setTimeout(() => fitToScreen(result.nodes), FIT_TO_SCREEN_DELAY);
  }, [nodes, edges, customLinkTypes, normalizedFamilyGroups, treeService, saveAndUpdate, fitToScreen, undoService]);

  const handleSelectPartnerAction = useCallback((selectionValue) => {
    if (!partnerSelection) return;
    const sourceId = partnerSelection.sourceId;
    const sourceNode = nodes.find(node => node.id === sourceId);
    if (!sourceNode) {
      setPartnerSelection(null);
      return;
    }

    if (partnerSelection.mode === 'child') {
      if (selectionValue === 'NEW') {
        undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
        const withPartner = treeService.addSpouse(nodes, edges, sourceNode);
        const createdPartner = withPartner.nodes[withPartner.nodes.length - 1];
        const result = treeService.addChild(
          withPartner.nodes,
          withPartner.edges,
          sourceId,
          createdPartner?.id || null,
        );
        saveAndUpdate(result.nodes, result.edges);
        const createdChild = result.nodes[result.nodes.length - 1];
        setFocusNodeId(createdChild?.id || sourceId);
        setPartnerSelection(null);
        setTimeout(() => fitToScreen(result.nodes), FIT_TO_SCREEN_DELAY);
        return;
      }
      confirmAddChild(sourceId, selectionValue);
      return;
    }

    if (partnerSelection.mode === 'spouse') {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      if (selectionValue === 'NEW') {
        const result = treeService.addSpouse(nodes, edges, sourceNode);
        saveAndUpdate(result.nodes, result.edges);
        const createdSpouse = result.nodes[result.nodes.length - 1];
        setFocusNodeId(createdSpouse?.id || sourceId);
        setPartnerSelection(null);
        setTimeout(() => fitToScreen(result.nodes), FIT_TO_SCREEN_DELAY);
        return;
      }
      if (!selectionValue) {
        setPartnerSelection(null);
        return;
      }
      const result = treeService.linkPartner(nodes, edges, sourceId, selectionValue, 'Casado/a');
      saveAndUpdate(result.nodes, result.edges);
      setFocusNodeId(selectionValue || sourceId);
      setPartnerSelection(null);
      setTimeout(() => fitToScreen(nodes), FIT_TO_SCREEN_DELAY);
      return;
    }

    if (partnerSelection.mode === 'ex_spouse') {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      if (selectionValue === 'NEW') {
        const result = treeService.addExSpouse(nodes, edges, sourceNode);
        saveAndUpdate(result.nodes, result.edges);
        const createdEx = result.nodes[result.nodes.length - 1];
        setFocusNodeId(createdEx?.id || sourceId);
        setPartnerSelection(null);
        setTimeout(() => fitToScreen(result.nodes), FIT_TO_SCREEN_DELAY);
        return;
      }
      if (!selectionValue) {
        setPartnerSelection(null);
        return;
      }
      const result = treeService.linkPartner(nodes, edges, sourceId, selectionValue, 'Divorciado');
      saveAndUpdate(result.nodes, result.edges);
      setFocusNodeId(selectionValue || sourceId);
      setPartnerSelection(null);
      setTimeout(() => fitToScreen(nodes), FIT_TO_SCREEN_DELAY);
    }
  }, [partnerSelection, nodes, edges, customLinkTypes, normalizedFamilyGroups, undoService, treeService, saveAndUpdate, fitToScreen, confirmAddChild]);

  const enterLinkingMode = useCallback((sourceId) => {
    closeActionsModal();
    setLinkingMode({ sourceId });
    setLinkTarget(null);
  }, [closeActionsModal]);

  const handleNodeAction = useCallback((action) => {
    const nodeId = actionsModal.nodeId;
    if (!nodeId) return;

    const sourceNode = nodes.find(n => n.id === nodeId);

    if (action === 'add_parents') {
      if (treeService.hasParents(edges, nodeId)) return;
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.addParents(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      setTimeout(() => fitToScreen(result.nodes), FIT_TO_SCREEN_DELAY);
    } else if (action === 'add_child') {
      const partners = treeService.getPartners(edges, nodeId);
      const partnerSet = new Set(partners);
      const candidates = [...new Set(nodes
        .filter(node => node.id !== nodeId)
        .map(node => node.id))];
      const orderedCandidates = [...partners, ...candidates.filter(id => !partnerSet.has(id))];
      setPartnerSelection({
        mode: 'child',
        sourceId: nodeId,
        preferredOptionIds: partners,
        options: orderedCandidates,
      });
      closeActionsModal();
      return;
    } else if (action === 'add_spouse') {
      if (treeService.hasSpouse(edges, nodeId)) return;
      const partnerSet = new Set(treeService.getPartners(edges, nodeId));
      const options = nodes
        .filter(node => node.id !== nodeId && !partnerSet.has(node.id))
        .map(node => node.id);
      setPartnerSelection({
        mode: 'spouse',
        sourceId: nodeId,
        options,
      });
      closeActionsModal();
      return;
    } else if (action === 'add_ex_spouse') {
      const options = nodes
        .filter(node => node.id !== nodeId)
        .map(node => node.id);
      setPartnerSelection({
        mode: 'ex_spouse',
        sourceId: nodeId,
        options,
      });
      closeActionsModal();
      return;
    } else if (action === 'delete') {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.deleteNode(nodes, edges, nodeId);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      setTimeout(() => fitToScreen(result.nodes), FIT_TO_SCREEN_DELAY);
    } else if (action === 'group_children') {
      const validNodeIds = new Set(nodes.map(node => node.id));
      const childIds = [...new Set(
        edges
          .filter(edge => edge.type === 'parent' && edge.from === nodeId)
          .map(edge => edge.to)
      )].filter(id => validNodeIds.has(id));

      if (childIds.length === 0) return;

      const existingGroup = normalizedFamilyGroups.find((group) => (
        group.nodeIds.length === childIds.length
        && childIds.every(childId => group.nodeIds.includes(childId))
      ));

      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);

      let savedGroupId;
      let nextGroups;

      if (existingGroup) {
        savedGroupId = existingGroup.id;
        nextGroups = normalizedFamilyGroups.map((group) => (
          group.id === existingGroup.id
            ? { ...group, collapsed: true }
            : group
        ));
      } else {
        savedGroupId = `family-group-${generateId()}`;
        const parentName = `${sourceNode?.data?.firstName || 'Familiar'} ${sourceNode?.data?.lastName || ''}`.trim();
        nextGroups = [
          ...normalizedFamilyGroups,
          {
            id: savedGroupId,
            label: `Hijos de ${parentName}`,
            emoji: '👶',
            color: '#0EA5E9',
            nodeIds: childIds,
            collapsed: true,
          },
        ];
      }

      saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
      setHighlightedGroupId(savedGroupId);
      closeActionsModal();
      focusVisibleNodes(nextGroups);
    } else if (action === 'link') {
      enterLinkingMode(nodeId);
    }
  }, [actionsModal.nodeId, nodes, edges, customLinkTypes, normalizedFamilyGroups, treeService, saveAndUpdate, fitToScreen, closeActionsModal, enterLinkingMode, undoService, focusVisibleNodes]);

  const handleUpdateNode = useCallback((nodeId, newData) => {
    const updatedNodes = treeService.updateNode(nodes, nodeId, newData);
    saveAndUpdate(updatedNodes, edges);
    closeActionsModal();
  }, [nodes, edges, treeService, saveAndUpdate, closeActionsModal]);

  const handleUpdateLink = useCallback((edgeId, updates) => {
    const result = treeService.updateLink(nodes, edges, edgeId, updates, actionsModal.nodeId);
    saveAndUpdate(result.nodes, result.edges);
  }, [nodes, edges, treeService, actionsModal.nodeId, saveAndUpdate]);

  const handleDeleteLink = useCallback((edgeId) => {
    if (window.confirm('¿Seguro que deseas eliminar este vínculo? (La persona seguirá existiendo en el árbol)')) {
      const newEdges = treeService.deleteLink(edges, edgeId);
      saveAndUpdate(nodes, newEdges);
    }
  }, [nodes, edges, treeService, saveAndUpdate]);

  const handleExport = useCallback(() => {
    exportService.exportTree(username, nodes, edges, customLinkTypes, normalizedFamilyGroups);
  }, [username, nodes, edges, customLinkTypes, normalizedFamilyGroups, exportService]);

  const handleSnapshot = useCallback(() => {
    downloadTreeSnapshot(username, nodes, edges);
  }, [username, nodes, edges]);

  // ---- Undo functionality ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canUndo = useMemo(() => undoService.canUndo(), [undoService, nodes, edges, normalizedFamilyGroups]);

  const handleUndo = useCallback(() => {
    const previousState = undoService.undo();
    if (!previousState) return;

    setIsolatedGroupId(null);
    setHighlightedGroupId(null);
    setOrganizationMode(previousState.uiState?.organizationMode ?? 'none');
    saveAndUpdate(
      previousState.nodes,
      previousState.edges,
      previousState.customLinkTypes,
      previousState.familyGroups || [],
    );
    setTimeout(() => fitToScreen(previousState.nodes), FIT_TO_SCREEN_DELAY);
  }, [undoService, saveAndUpdate, fitToScreen]);

  const handleApplyOrganization = useCallback((mode) => {
    if (!canUseOrganize) return;
    if (!['levels', 'atomic', 'aizado'].includes(mode)) return;

    undoService.saveState(
      nodes,
      edges,
      customLinkTypes,
      normalizedFamilyGroups,
      { organizationMode },
    );

    if (mode === 'atomic') {
      setOrganizationMode('atomic');
      setOrganizeModalOpen(false);
      return;
    }

    const organizedNodes = mode === 'levels'
      ? treeService.organizeByBirthLevels(nodes, edges)
      : treeService.organizeAizado(nodes, edges);

    setOrganizationMode(mode);
    saveAndUpdate(organizedNodes, edges, customLinkTypes, normalizedFamilyGroups);
    setOrganizeModalOpen(false);
    setTimeout(() => fitToScreen(organizedNodes), FIT_TO_SCREEN_DELAY);
  }, [
    canUseOrganize,
    customLinkTypes,
    edges,
    fitToScreen,
    nodes,
    normalizedFamilyGroups,
    organizationMode,
    saveAndUpdate,
    treeService,
    undoService,
  ]);

  // ---- Family groups actions ----
  const handleShowOnlyGroup = useCallback((groupId) => {
    const nextIsolated = isolatedGroupId === groupId ? null : groupId;
    const nextGroups = normalizedFamilyGroups.map(group => (
      group.id === groupId ? { ...group, collapsed: false } : group
    ));

    if (nextIsolated === null) {
      setIsolatedGroupId(null);
      focusVisibleNodes(nextGroups, null);
      return;
    }

    setIsolatedGroupId(groupId);
    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    setHighlightedGroupId(groupId);
    focusVisibleNodes(nextGroups, groupId);
  }, [isolatedGroupId, normalizedFamilyGroups, nodes, edges, customLinkTypes, saveAndUpdate, focusVisibleNodes]);

  const handleToggleCollapseGroup = useCallback((groupId) => {
    const nextGroups = normalizedFamilyGroups.map(group => (
      group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
    ));
    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    focusVisibleNodes(nextGroups);
    setCollapsedGroupMenu(null);
  }, [nodes, edges, customLinkTypes, normalizedFamilyGroups, saveAndUpdate, focusVisibleNodes]);

  const handleExpandAllGroups = useCallback(() => {
    const hadCollapsed = normalizedFamilyGroups.some(group => group.collapsed);
    setIsolatedGroupId(null);

    const nextGroups = normalizedFamilyGroups.map(group => ({ ...group, collapsed: false }));
    if (hadCollapsed) {
      saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    }

    setHighlightedGroupId(null);
    focusVisibleNodes(nextGroups, null);
  }, [normalizedFamilyGroups, nodes, edges, customLinkTypes, saveAndUpdate, focusVisibleNodes]);

  const handleStartCreateGroup = useCallback(() => {
    setGroupDraft({
      mode: 'create',
      id: '',
      label: '',
      emoji: randomGroupEmoji(),
      color: randomGroupColor(),
      nodeIds: [],
    });
    setFamilyGroupsModalOpen(false);
    setCollapsedGroupMenu(null);
  }, []);

  const handleStartEditGroup = useCallback((groupId) => {
    const existing = normalizedFamilyGroups.find(group => group.id === groupId);
    if (!existing) return;

    setGroupDraft({
      mode: 'edit',
      id: existing.id,
      label: existing.label,
      emoji: existing.emoji,
      color: normalizeGroupColor(existing.color),
      nodeIds: [...existing.nodeIds],
    });
    setFamilyGroupsModalOpen(false);
    setCollapsedGroupMenu(null);
  }, [normalizedFamilyGroups]);

  const handleSaveGroupDraft = useCallback(() => {
    if (!groupDraft) return;
    if (!groupDraft.label.trim() || groupDraft.nodeIds.length === 0) return;

    let nextGroups;
    let savedGroupId;

    if (groupDraft.mode === 'create') {
      savedGroupId = `family-group-${generateId()}`;
      nextGroups = [
        ...normalizedFamilyGroups,
        {
          id: savedGroupId,
          label: groupDraft.label.trim(),
          emoji: groupDraft.emoji,
          color: normalizeGroupColor(groupDraft.color, randomGroupColor()),
          nodeIds: [...new Set(groupDraft.nodeIds)],
          collapsed: false,
        },
      ];
    } else {
      savedGroupId = groupDraft.id;
      const editedGroup = normalizedFamilyGroups.find(group => group.id === groupDraft.id);
      const editedGroupCurrentColor = normalizeGroupColor(editedGroup?.color);
      nextGroups = normalizedFamilyGroups.map(group => (
        group.id === groupDraft.id
          ? {
            ...group,
            label: groupDraft.label.trim(),
            emoji: groupDraft.emoji,
            color: normalizeGroupColor(groupDraft.color, editedGroupCurrentColor),
            nodeIds: [...new Set(groupDraft.nodeIds)],
          }
          : group
      ));
    }

    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    setHighlightedGroupId(savedGroupId);
    setGroupDraft(null);
    focusVisibleNodes(nextGroups);
  }, [groupDraft, nodes, edges, customLinkTypes, normalizedFamilyGroups, saveAndUpdate, focusVisibleNodes]);

  const handleDeleteGroup = useCallback((groupId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este grupo familiar?')) return;

    const nextGroups = normalizedFamilyGroups.filter(group => group.id !== groupId);

    if (isolatedGroupId === groupId) setIsolatedGroupId(null);
    if (highlightedGroupId === groupId) setHighlightedGroupId(null);

    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    focusVisibleNodes(nextGroups, isolatedGroupId === groupId ? null : isolatedGroupId);
    setCollapsedGroupMenu(null);
  }, [nodes, edges, customLinkTypes, normalizedFamilyGroups, isolatedGroupId, highlightedGroupId, saveAndUpdate, focusVisibleNodes]);

  const handleIdentifyGroupMembers = useCallback((groupId) => {
    setHighlightedGroupId(groupId);
  }, []);

  const handleCancelGroupDraft = useCallback(() => {
    setGroupDraft(null);
  }, []);

  const handleStartEditMembers = useCallback((groupId) => {
    handleStartEditGroup(groupId);
  }, [handleStartEditGroup]);

  // ---- Linking mode ----
  const cancelLinkingMode = useCallback(() => {
    setLinkingMode(null);
    setLinkTarget(null);
  }, []);

  const handleLinkTargetSelected = useCallback((targetId) => {
    if (!linkingMode) return;
    if (targetId === linkingMode.sourceId) return;
    setLinkTarget(targetId);
  }, [linkingMode]);

  const handleLinkTypeChosen = useCallback((linkType) => {
    if (!linkingMode || !linkTarget) return;
    const newEdges = treeService.linkNodes(edges, linkingMode.sourceId, linkTarget, linkType, undefined, customLinkTypes);
    saveAndUpdate(nodes, newEdges);
    setLinkingMode(null);
    setLinkTarget(null);
  }, [linkingMode, linkTarget, edges, nodes, customLinkTypes, treeService, saveAndUpdate]);

  const handleSaveCustomLinkTypes = useCallback((nextCustomLinkTypes) => {
    const syncedEdges = treeService.syncCustomLinkEdges(edges, nextCustomLinkTypes);
    saveAndUpdate(nodes, syncedEdges, nextCustomLinkTypes);
    setLinkTypesModalOpen(false);
  }, [treeService, edges, nodes, saveAndUpdate]);

  const handleNodePointerDownWrapped = useCallback((e, nodeId) => {
    const isSyntheticMouseAfterTouch = (
      e.type === 'mousedown'
      && Date.now() - stateRef.current.lastTouchEndTime < 500
    );
    if (isSyntheticMouseAfterTouch) return;

    if (groupDraft) {
      e.stopPropagation();
      e.preventDefault();
      setGroupDraft((prev) => {
        if (!prev) return prev;
        const isSelected = prev.nodeIds.includes(nodeId);
        return {
          ...prev,
          nodeIds: isSelected ? prev.nodeIds.filter(id => id !== nodeId) : [...prev.nodeIds, nodeId],
        };
      });
      return;
    }

    if (linkingMode) {
      e.stopPropagation();
      e.preventDefault();
      handleLinkTargetSelected(nodeId);
      return;
    }

    handleNodePointerDown(e, nodeId, nodes);
  }, [groupDraft, linkingMode, handleLinkTargetSelected, handleNodePointerDown, nodes, stateRef]);

  const handleViewModeChange = useCallback((nextMode) => {
    if (nextMode === 'all') {
      const firstNodeId = nodes[0]?.id || null;
      if (firstNodeId) {
        setFocusNodeId(firstNodeId);
        setSelectedNodeId(firstNodeId);
      }
      setRelativesBranchMode(null);
      setLineageViewMode(nextMode);
      return;
    }

    if (nextMode !== 'relatives') {
      setRelativesBranchMode(null);
      setOrganizeModalOpen(false);
    }

    const hasNode = (nodeId) => Boolean(nodeId) && nodes.some(node => node.id === nodeId);
    const targetNodeId = hasNode(selectedNodeId)
      ? selectedNodeId
      : (hasNode(focusNodeId) ? focusNodeId : (nodes[0]?.id || null));

    if (targetNodeId) {
      setFocusNodeId(targetNodeId);

      if (nextMode === 'radial') {
        // radial shares same logic as lineage — nothing extra needed
      } else if (nextMode === 'maternal' || nextMode === 'paternal') {
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        const parentIds = [...new Set(
          edges
            .filter(edge => edge.type === 'parent' && edge.to === targetNodeId)
            .map(edge => edge.from)
        )].filter(id => nodeMap.has(id));

        if (parentIds.length > 0) {
          const preferredParent = nextMode === 'maternal'
            ? parentIds.find(id => nodeMap.get(id)?.data?.gender === 'female')
            : parentIds.find(id => nodeMap.get(id)?.data?.gender === 'male');
          const fallbackParent = chooseParentWithMotherPriority(
            parentIds,
            nodeMap,
            parentChoiceByChildId?.[targetNodeId] || null,
          );
          const selectedParent = preferredParent || fallbackParent;
          if (selectedParent) {
            setParentChoiceByChildId(prev => ({ ...prev, [targetNodeId]: selectedParent }));
          }
        }
      }
    }

    setLineageViewMode(nextMode);
  }, [selectedNodeId, focusNodeId, nodes, edges, parentChoiceByChildId]);

  const handleSelectNode = useCallback((nodeId) => {
    if (lineageViewMode !== 'relatives') return;
    setSelectedNodeId(nodeId);
    selectGroupFromNode(nodeId);
  }, [lineageViewMode, selectGroupFromNode]);

  const handleMouseUpCallback = useCallback(() => {
    handleDragEnd();
    handleMouseUp(() => saveAndUpdate(nodes, edges), handleSelectNode);
  }, [handleDragEnd, handleMouseUp, nodes, edges, saveAndUpdate, handleSelectNode]);

  const handleTouchEndCallback = useCallback(() => {
    handleDragEnd();
    handleTouchEnd(() => saveAndUpdate(nodes, edges), handleSelectNode);
  }, [handleDragEnd, handleTouchEnd, nodes, edges, saveAndUpdate, handleSelectNode]);

  const sourceNodeForLink = useMemo(
    () => linkingMode ? nodes.find(n => n.id === linkingMode.sourceId) : null,
    [linkingMode, nodes],
  );
  const targetNodeForLink = useMemo(
    () => linkTarget ? nodes.find(n => n.id === linkTarget) : null,
    [linkTarget, nodes],
  );
  const disableSpouseLink = useMemo(() => {
    if (!linkingMode || !linkTarget) return false;
    return treeService.hasSpouse(edges, linkingMode.sourceId) || treeService.hasSpouse(edges, linkTarget);
  }, [linkingMode, linkTarget, edges, treeService]);

  const actionsModalNode = useMemo(() => nodes.find(n => n.id === actionsModal.nodeId), [nodes, actionsModal.nodeId]);
  const focusedNode = useMemo(() => nodes.find(n => n.id === lineageVisibility.resolvedFocusNodeId) || null, [nodes, lineageVisibility.resolvedFocusNodeId]);
  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) || null, [nodes, selectedNodeId]);
  const controlsNode = selectedNode || focusedNode;
  const controlsRenderNode = useMemo(
    () => (controlsNode ? (renderedNodeById.get(controlsNode.id) || controlsNode) : null),
    [controlsNode, renderedNodeById],
  );
  const nodeParentControls = useMemo(
    () => buildNodeParentControls(nodes, edges, controlsNode?.id || null, parentChoiceByChildId),
    [nodes, edges, controlsNode?.id, parentChoiceByChildId],
  );
  const showTreeControls = Boolean(lineageViewMode === 'relatives' && controlsNode);
  const isControlsNodeActive = Boolean(
    controlsNode
    && controlsNode.id === lineageVisibility.resolvedFocusNodeId,
  );
  const showTreeParentFilters = Boolean(isControlsNodeActive && nodeParentControls.options.length > 0);
  const showTreeEyeButton = Boolean(showTreeControls && !isControlsNodeActive);

  const actionsModalHasParents = useMemo(() => {
    if (!actionsModal.nodeId) return false;
    return treeService.hasParents(edges, actionsModal.nodeId);
  }, [actionsModal.nodeId, edges, treeService]);

  const actionsModalHasSpouse = useMemo(() => {
    if (!actionsModal.nodeId) return false;
    return treeService.hasSpouse(edges, actionsModal.nodeId);
  }, [actionsModal.nodeId, edges, treeService]);

  const actionsModalHasChildren = useMemo(() => {
    if (!actionsModal.nodeId) return false;
    return edges.some(edge => edge.type === 'parent' && edge.from === actionsModal.nodeId);
  }, [actionsModal.nodeId, edges]);

  const actionsModalIsLineageAncestor = useMemo(() => (
    (lineageViewMode === 'lineage' || lineageViewMode === 'radial')
    && Boolean(actionsModal.nodeId)
    && (
      lineageAncestorNodeIds.has(actionsModal.nodeId)
      || (lineageViewMode === 'radial' && actionsModal.nodeId === lineageVisibility.resolvedFocusNodeId)
    )
  ), [lineageViewMode, actionsModal.nodeId, lineageAncestorNodeIds, lineageVisibility.resolvedFocusNodeId]);

  const allowGroupChildrenAction = lineageViewMode !== 'lineage' && lineageViewMode !== 'radial';

  const selectedCollapsedGroup = useMemo(
    () => normalizedFamilyGroups.find(group => group.id === collapsedGroupMenu?.groupId) || null,
    [normalizedFamilyGroups, collapsedGroupMenu],
  );

  const collapsedGroupMenuPosition = useMemo(() => {
    if (!collapsedGroupMenu) return null;
    return {
      left: transform.x + (collapsedGroupMenu.x * transform.k),
      top: transform.y + (collapsedGroupMenu.y * transform.k),
    };
  }, [collapsedGroupMenu, transform]);

  return (
    <div
      className="h-screen w-screen bg-[#F3F0EB] overflow-hidden relative font-sans text-gray-700 selection:bg-orange-200 touch-none"
      ref={canvasRef}
      onMouseDown={(e) => {
        if (e.target instanceof Element && e.target.closest('[data-collapsed-group-menu="true"]')) return;
        setCollapsedGroupMenu(null);
        handleMouseDown(e, transform);
      }}
      onMouseMove={(e) => handleMouseMove(e, nodes, (n) => saveAndUpdateWithUndo(n, edges), transform)}
      onMouseUp={handleMouseUpCallback}
      onMouseLeave={handleMouseUpCallback}
      onWheel={handleWheel}
      onTouchStart={(e) => {
        if (e.target instanceof Element && e.target.closest('[data-collapsed-group-menu="true"]')) return;
        setCollapsedGroupMenu(null);
        handleTouchStart(e, transform);
      }}
      onTouchMove={(e) => handleTouchMove(e, nodes, (n) => saveAndUpdateWithUndo(n, edges), transform)}
      onTouchEnd={handleTouchEndCallback}
      style={{ touchAction: 'none' }}
    >
      <CanvasHUD
        username={username}
        nodeCount={nodes.length}
        zoom={transform.k}
        onFitToScreen={handleCenterCurrentView}
        onOpenOrganize={() => {
          if (!canUseOrganize) return;
          setOrganizeModalOpen(true);
        }}
        onManageLinkTypes={() => setLinkTypesModalOpen(true)}
        onOpenFamilyGroups={() => setFamilyGroupsModalOpen(true)}
        hasFamilyGroups={normalizedFamilyGroups.length > 0}
        onExport={handleExport}
        onSnapshot={handleSnapshot}
        onLogout={onLogout}
        onUndo={handleUndo}
        canUndo={canUndo}
        viewMode={lineageViewMode}
        onChangeViewMode={handleViewModeChange}
        viewModeOptions={LINEAGE_VIEW_MODES}
        focusedNodeName={focusedNode ? `${focusedNode.data.firstName} ${focusedNode.data.lastName}`.trim() : ''}
        canOrganize={canUseOrganize}
      />

      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />

      <NodeActionsModal
        key={actionsModalKey}
        node={actionsModalNode}
        isOpen={actionsModal.isOpen}
        onClose={closeActionsModal}
        onAction={handleNodeAction}
        onSaveEdit={handleUpdateNode}
        nodes={nodes}
        edges={edges}
        onUpdateLink={handleUpdateLink}
        onDeleteLink={handleDeleteLink}
        initialTab={actionsModal.initialTab}
        initialExpandedEdgeId={actionsModal.expandedEdgeId}
        hasParents={actionsModalHasParents}
        hasSpouse={actionsModalHasSpouse}
        hasChildren={actionsModalHasChildren}
        lineageAncestorMode={actionsModalIsLineageAncestor}
        allowGroupChildrenAction={allowGroupChildrenAction}
      />

      <PartnerSelectionModal
        selection={partnerSelection}
        nodes={nodes}
        onClose={() => setPartnerSelection(null)}
        onSelect={handleSelectPartnerAction}
      />

      <LinkTypeSelectionModal
        sourceNode={sourceNodeForLink}
        targetNode={targetNodeForLink}
        customLinkTypes={customLinkTypes}
        disableSpouse={disableSpouseLink}
        onSelect={handleLinkTypeChosen}
        onClose={() => setLinkTarget(null)}
      />

      {linkTypesModalOpen && (
        <LinkTypesManagerModal
          isOpen={linkTypesModalOpen}
          initialLinkTypes={customLinkTypes}
          onClose={() => setLinkTypesModalOpen(false)}
          onSave={handleSaveCustomLinkTypes}
        />
      )}

      <FamilyGroupsModal
        isOpen={familyGroupsModalOpen}
        groups={normalizedFamilyGroups}
        isolatedGroupId={isolatedGroupId}
        onClose={() => {
          setFamilyGroupsModalOpen(false);
          setGroupDraft(null);
        }}
        onShowOnly={handleShowOnlyGroup}
        onToggleCollapse={handleToggleCollapseGroup}
        onExpandAll={handleExpandAllGroups}
        onStartCreate={handleStartCreateGroup}
        onStartEdit={handleStartEditGroup}
        onStartEditMembers={handleStartEditMembers}
        onDelete={handleDeleteGroup}
        onIdentifyMembers={handleIdentifyGroupMembers}
      />

      <OrganizeTreeModal
        isOpen={organizeModalOpen}
        onClose={() => setOrganizeModalOpen(false)}
        onSelectMode={handleApplyOrganization}
        onUndo={handleUndo}
        canUndo={canUndo}
      />

      {/* Linking mode banner */}
      {linkingMode && !linkTarget && (
        <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
            <LinkIcon size={18} />
            <span className="text-sm font-bold">Toca el nodo que quieres vincular</span>
            <button
              onClick={cancelLinkingMode}
              className="ml-2 p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Cancelar"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {groupDraft && (
        <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="w-[min(90vw,460px)] bg-white/95 backdrop-blur-md text-gray-700 p-4 rounded-2xl shadow-xl border border-orange-200">
            <div className="flex items-start gap-2">
              <div className="w-16">
                <label htmlFor="group-emoji-input" className="block text-xs font-semibold text-gray-500 mb-1">Emoji</label>
                <input
                  id="group-emoji-input"
                  type="text"
                  value={groupDraft.emoji}
                  onChange={(e) => setGroupDraft(prev => (prev ? { ...prev, emoji: e.target.value } : prev))}
                  className="w-full px-2 py-2 rounded-lg border border-gray-300 text-center text-xl"
                  placeholder="🙂"
                />
              </div>
              <div className="flex-1">
                <Input
                  label="Alias del grupo"
                  value={groupDraft.label}
                  onChange={(e) => setGroupDraft(prev => (prev ? { ...prev, label: e.target.value } : prev))}
                  placeholder="Ej. Familia de Ana y Carlos"
                />
              </div>
            </div>
            <div className="mb-3">
              <label htmlFor="group-color-input-canvas" className="block text-xs font-semibold text-gray-500 mb-1">Color del grupo</label>
              <input
                id="group-color-input-canvas"
                type="color"
                value={groupDraft.color}
                onChange={(e) => setGroupDraft(prev => (prev ? { ...prev, color: e.target.value } : prev))}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-2"
              />
            </div>
            <p className="text-xs text-gray-600 mb-3">
              Edición de miembros: toca nodos para seleccionar o deseleccionar. Seleccionados: {groupDraft.nodeIds.length}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleSaveGroupDraft}
                disabled={!groupDraft.label.trim() || groupDraft.nodeIds.length === 0}
                className="px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-sm font-semibold"
              >
                Aceptar
              </button>
              <button
                onClick={handleCancelGroupDraft}
                className="px-3 py-2 rounded-xl bg-white border border-gray-300 hover:bg-gray-100 text-sm font-semibold text-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={() => setGroupDraft(prev => (prev ? { ...prev, emoji: randomGroupEmoji() } : prev))}
                className="px-3 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-semibold"
              >
                Emoji random
              </button>
            </div>
          </div>
        </div>
      )}

      {collapsedGroupMenuPosition && selectedCollapsedGroup && (
        <div
          className="absolute z-30 pointer-events-auto"
          data-collapsed-group-menu="true"
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          style={{
            left: `${collapsedGroupMenuPosition.left}px`,
            top: `${collapsedGroupMenuPosition.top}px`,
            transform: 'translate(-50%, -110%)',
          }}
        >
          <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-2 min-w-[190px]">
            <p className="text-xs font-semibold text-gray-700 px-2 pb-2">
              {selectedCollapsedGroup.emoji} {selectedCollapsedGroup.label}
            </p>
            <div className="space-y-1">
              <button
                onClick={() => handleToggleCollapseGroup(selectedCollapsedGroup.id)}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-orange-50 text-xs font-semibold text-orange-700"
              >
                Expandir grupo
              </button>
              <button
                onClick={() => handleStartEditMembers(selectedCollapsedGroup.id)}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-blue-50 text-xs font-semibold text-blue-700"
              >
                Editar miembros
              </button>
              <button
                onClick={() => {
                  setFamilyGroupsModalOpen(true);
                  setCollapsedGroupMenu(null);
                  setHighlightedGroupId(selectedCollapsedGroup.id);
                }}
                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-gray-100 text-xs font-semibold text-gray-700"
              >
                Abrir gestión de grupos
              </button>
            </div>
          </div>
        </div>
      )}

      <svg className="w-full h-full pointer-events-none">
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {lineageViewMode !== 'radial' && renderedEdges.map(({ edge, fromNode, toNode, renderKey }) => {
            return (
              <FamilyEdge
                key={renderKey}
                edge={edge}
                fromNode={fromNode}
                toNode={toNode}
                onLineClick={handleLineClick}
                curveMode={organizationMode === 'atomic' ? 'curved' : 'geometric'}
              />
            );
          })}

          {[...collapsedGroupBubbleMap.values()].map((bubble) => (
            <g
              key={bubble.id}
              className="pointer-events-auto cursor-pointer"
              onMouseDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setCollapsedGroupMenu((prev) => (
                  prev?.groupId === bubble.groupId
                    ? null
                    : { groupId: bubble.groupId, x: bubble.x, y: bubble.y }
                ));
              }}
            >
              <circle cx={bubble.x} cy={bubble.y} r="42" fill="white" stroke={bubble.color} strokeWidth="2.5" />
              <circle cx={bubble.x} cy={bubble.y + 2} r="35" fill={bubble.color} opacity="0.12" />
              <text x={bubble.x} y={bubble.y - 6} textAnchor="middle" className="text-[18px] pointer-events-none">
                {bubble.emoji}
              </text>
              <text x={bubble.x} y={bubble.y + 13} textAnchor="middle" className="text-[10px] font-bold fill-gray-700 pointer-events-none">
                {bubble.label}
              </text>
            </g>
          ))}

          {controlsRenderNode && showTreeControls && (
            <g
              className="pointer-events-auto"
              transform={`translate(${controlsRenderNode.x}, ${controlsRenderNode.y - 56})`}
            >
              <foreignObject
                x={-70}
                y={-12}
                width={140}
                height={24}
              >
                <div className="w-full h-full flex items-center justify-center gap-1">
                  {showTreeParentFilters && nodeParentControls.options.slice(0, 2).map((option) => {
                    const isActive = nodeParentControls.activeParentId === option.id;
                    const ParentIcon = option.gender === 'female'
                      ? Venus
                      : (option.gender === 'male' ? Mars : GitBranch);
                    const branchMode = option.gender === 'female'
                      ? 'maternal'
                      : (option.gender === 'male' ? 'paternal' : 'ancestors');
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(controlsNode.id);
                          setFocusNodeId(controlsNode.id);
                          setParentChoiceByChildId(prev => ({ ...prev, [controlsNode.id]: option.id }));
                          setRelativesBranchMode(branchMode);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          setSelectedNodeId(controlsNode.id);
                          setFocusNodeId(controlsNode.id);
                          setParentChoiceByChildId(prev => ({ ...prev, [controlsNode.id]: option.id }));
                          setRelativesBranchMode(branchMode);
                        }}
                        className={`w-5 h-5 rounded-full text-white flex items-center justify-center ${
                          isActive ? 'bg-orange-500' : 'bg-slate-400'
                        }`}
                        title={option.label}
                      >
                        <ParentIcon size={11} />
                      </button>
                    );
                  })}

                  {showTreeEyeButton && (
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(controlsNode.id);
                        setFocusNodeId(controlsNode.id);
                        setRelativesBranchMode(null);
                      }}
                      onTouchStart={(e) => {
                        e.stopPropagation();
                        setSelectedNodeId(controlsNode.id);
                        setFocusNodeId(controlsNode.id);
                        setRelativesBranchMode(null);
                      }}
                      className="w-5 h-5 rounded-full border border-slate-300 bg-white text-slate-600 flex items-center justify-center"
                      title="Activar perspectiva"
                    >
                      <Eye size={12} />
                    </button>
                  )}

                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      openActionsModal(controlsNode.id);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      openActionsModal(controlsNode.id);
                    }}
                    className="w-5 h-5 rounded-full border border-orange-300 bg-white text-orange-600 flex items-center justify-center"
                    title="Editar acciones"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </foreignObject>
            </g>
          )}

          {/* Pencil button on selected/focused node in lineage mode (not radial — fan chart handles it) */}
          {controlsRenderNode && lineageViewMode === 'lineage' && lineageAncestorNodeIds.has(controlsRenderNode.id) && (
            <g
              className="pointer-events-auto"
              transform={`translate(${controlsRenderNode.x}, ${controlsRenderNode.y - 56})`}
            >
              <foreignObject x={-12} y={-12} width={24} height={24}>
                <div className="w-full h-full flex items-center justify-center">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      openActionsModal(controlsNode.id);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      openActionsModal(controlsNode.id);
                    }}
                    className="w-5 h-5 rounded-full border border-orange-300 bg-white/90 text-orange-600 flex items-center justify-center shadow-sm"
                    title="Editar / Añadir padres"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </foreignObject>
            </g>
          )}

          {/* Plus indicator on unselected leaf ancestors in lineage mode (not radial — fan chart handles it) */}
          {/* Fan chart rendering (radial mode only) */}
          {lineageViewMode === 'radial' && fanData && (() => {
            const { cx, cy, focusR, focusNodeId: fanFocusId, rings } = fanData;
            const focusRenderNode = renderedNodeById.get(fanFocusId);
            const fcx = focusRenderNode?.x ?? cx;
            const fcy = focusRenderNode?.y ?? cy;
            const allNodes = new Map(nodes.map(n => [n.id, n]));

            return (
              <g>
                {/* Outer half-circle border */}
                {rings.length > 0 && (() => {
                  const lastRing = rings[rings.length - 1];
                  const maxR = lastRing.outerR;
                  const left = fanPolarToXY(fcx, fcy, maxR, 0);
                  const right = fanPolarToXY(fcx, fcy, maxR, 180);
                  return (
                    <path
                      d={`M ${left.x} ${left.y} A ${maxR} ${maxR} 0 0 0 ${right.x} ${right.y}`}
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth={1}
                    />
                  );
                })()}

                {/* Arc sectors */}
                {rings.flatMap(ring =>
                  ring.slots.map(slot => {
                    const path = fanArcPath(fcx, fcy, slot.innerR, slot.outerR, slot.startAngle, slot.endAngle);
                    const fill = getFanSectorColor(slot.gen, slot.slotIndex, slot.numSlots, !!slot.nodeId);
                    const isSelected = slot.nodeId && (slot.nodeId === selectedNodeId || slot.nodeId === actionsModal.nodeId);
                    const midAngle = (slot.startAngle + slot.endAngle) / 2;
                    const midR = (slot.innerR + slot.outerR) / 2;
                    const textPos = fanPolarToXY(fcx, fcy, midR, midAngle);
                    const textRotation = midAngle - 90;
                    const node = slot.nodeId ? allNodes.get(slot.nodeId) : null;
                    const label = node
                      ? [node.data?.firstName, node.data?.lastName].filter(Boolean).join(' ') || '?'
                      : null;

                    // Font size decreases with generation
                    const fontSize = Math.max(7, 13 - slot.gen * 1.5);

                    if (slot.nodeId) {
                      return (
                        <g
                          key={`fan-${slot.gen}-${slot.slotIndex}`}
                          className="pointer-events-auto cursor-pointer"
                          onMouseDown={(e) => { e.stopPropagation(); openActionsModal(slot.nodeId); }}
                          onTouchStart={(e) => { e.stopPropagation(); openActionsModal(slot.nodeId); }}
                        >
                          <path
                            d={path}
                            fill={fill}
                            stroke={isSelected ? '#f97316' : '#cbd5e1'}
                            strokeWidth={isSelected ? 2 : 0.8}
                          />
                          {label && (
                            <text
                              x={textPos.x}
                              y={textPos.y}
                              textAnchor="middle"
                              dominantBaseline="middle"
                              fontSize={fontSize}
                              fontWeight="500"
                              fill="#1e293b"
                              transform={`rotate(${textRotation}, ${textPos.x}, ${textPos.y})`}
                              className="pointer-events-none select-none"
                              style={{ maxWidth: `${slot.outerR - slot.innerR - 8}px` }}
                            >
                              {label.length > 14 ? `${label.slice(0, 13)}…` : label}
                            </text>
                          )}
                        </g>
                      );
                    }

                    // Empty slot — visual only (no quick-add button)
                    return (
                      <g key={`fan-empty-${slot.gen}-${slot.slotIndex}`}>
                        <path
                          d={path}
                          fill={fill}
                          stroke="#e2e8f0"
                          strokeWidth={0.8}
                          strokeDasharray="2 2"
                        />
                      </g>
                    );
                  })
                )}

                {/* Focus node center circle */}
                <circle
                  cx={fcx}
                  cy={fcy}
                  r={focusR - 2}
                  fill="white"
                  stroke="#cbd5e1"
                  strokeWidth={1.5}
                  className="pointer-events-auto cursor-pointer"
                  onMouseDown={(e) => { e.stopPropagation(); openActionsModal(fanFocusId); }}
                  onTouchStart={(e) => { e.stopPropagation(); openActionsModal(fanFocusId); }}
                />
                {(() => {
                  const focusNodeData = allNodes.get(fanFocusId);
                  const name = focusNodeData
                    ? [focusNodeData.data?.firstName, focusNodeData.data?.lastName].filter(Boolean).join(' ') || '?'
                    : '?';
                  const words = name.split(' ');
                  return (
                    <text
                      x={fcx}
                      y={fcy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={12}
                      fontWeight="600"
                      fill="#1e293b"
                      className="pointer-events-none select-none"
                    >
                      {words.slice(0, 2).map((word, i) => (
                        <tspan key={i} x={fcx} dy={i === 0 ? (words.length > 1 ? '-0.6em' : '0') : '1.2em'}>
                          {word}
                        </tspan>
                      ))}
                    </text>
                  );
                })()}
              </g>
            );
          })()}

          {lineageViewMode !== 'radial' && displayedVisibleNodes.map(node => (
            <FamilyNode
              key={node.id}
              node={node}
              isSelected={!linkingMode && (selectedNodeId === node.id || actionsModal.nodeId === node.id)}
              isDimmed={
                (linkingMode && node.id !== linkingMode.sourceId && node.id !== linkTarget)
                || (Boolean(groupDraft) && !groupDraft.nodeIds.includes(node.id))
              }
              isLinkTarget={linkingMode && node.id === linkTarget}
              isGroupMemberHighlighted={highlightedGroupNodeIds.has(node.id) || (groupDraft?.nodeIds.includes(node.id) ?? false)}
              groupHighlightColor={groupDraft?.color || highlightedGroupColor}
              defaultGroupColor={nodeGroupColorById.get(node.id)}
              onPointerDown={(e, id) => handleNodePointerDownWrapped(e, id)}
            />
          ))}
        </g>
      </svg>

      {nodes.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-xs pointer-events-none bg-white/50 px-3 py-1 rounded-full whitespace-nowrap">
          <Move size={12} className="inline mr-1" /> Arrastra o toca las líneas de unión
        </div>
      )}
    </div>
  );
}
