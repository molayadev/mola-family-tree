import { isPartnerEdgeType } from '../config/constants';

/**
 * Given a list of parent node IDs, choose one using mother-first priority.
 * An explicit preference from `preferredId` is honoured when present.
 */
export const chooseParentWithMotherPriority = (parents, nodeMap, preferredId = null) => {
  if (!Array.isArray(parents) || parents.length === 0) return null;
  if (preferredId && parents.includes(preferredId)) return preferredId;
  const mother = parents.find((id) => nodeMap.get(id)?.data?.gender === 'female');
  if (mother) return mother;
  const father = parents.find((id) => nodeMap.get(id)?.data?.gender === 'male');
  if (father) return father;
  return parents[0];
};

/**
 * Build the list of parent branch options for a given node so the UI can
 * render the maternal / paternal branch-switch buttons.
 */
export const buildNodeParentControls = (nodes, edges, nodeId, parentChoiceByChildId) => {
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

/**
 * Compute screen-space column positions for the lineage (vertical tree) view.
 * Returns a Map<nodeId, {x, y}>.
 */
export const buildLineageColumnPositions = (nodes, edges, focusNodeId) => {
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

/**
 * Determine which nodes are visible in each lineage sub-mode and compute
 * focus-parent metadata for the HUD controls.
 *
 * Returns { resolvedFocusNodeId, visibleNodeIds, focusParentOptions, activeParentId }.
 */
export const buildLineageVisibility = (nodes, edges, focusNodeId, parentChoiceByChildId, viewMode, relativesBranchMode) => {
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
