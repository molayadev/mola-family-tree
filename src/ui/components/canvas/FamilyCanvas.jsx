import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Move, Link as LinkIcon, X } from 'lucide-react';
import { isPartnerEdgeType, isBrokenLabel } from '../../../domain/config/constants';
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
import Input from '../common/Input';

const GROUP_EMOJIS = ['👨‍👩‍👧', '👨‍👩‍👧‍👦', '👩‍👩‍👦', '👨‍👨‍👧', '🏡', '💞', '🌳', '💫', '🫶', '✨'];
const GROUP_COLORS = ['#F97316', '#7C3AED', '#0891B2', '#16A34A', '#DC2626', '#EA580C', '#4F46E5', '#D946EF'];

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

const computeVisibleNodes = (nodes, groups, isolatedGroupId) => {
  const hidden = computeHiddenNodeIds(nodes, groups, isolatedGroupId);
  return nodes.filter(n => !hidden.has(n.id));
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

export default function FamilyCanvas({ username, nodes, edges, customLinkTypes, familyGroups, treeService, exportService, undoService, onSave, onLogout }) {
  const [actionsModal, setActionsModal] = useState({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  const [actionsModalKey, setActionsModalKey] = useState(0);
  const [partnerSelection, setPartnerSelection] = useState(null);
  const [linkTypesModalOpen, setLinkTypesModalOpen] = useState(false);
  const [familyGroupsModalOpen, setFamilyGroupsModalOpen] = useState(false);
  const [isolatedGroupId, setIsolatedGroupId] = useState(null);
  const [highlightedGroupId, setHighlightedGroupId] = useState(null);
  const [groupDraft, setGroupDraft] = useState(null);
  const [collapsedGroupMenu, setCollapsedGroupMenu] = useState(null); // { groupId, x, y }

  // Linking mode state
  const [linkingMode, setLinkingMode] = useState(null); // { sourceId } or null
  const [linkTarget, setLinkTarget] = useState(null);    // target nodeId or null

  const autoGroupsInitializedRef = useRef(false);

  const normalizedFamilyGroups = useMemo(() => normalizeFamilyGroups(familyGroups, nodes), [familyGroups, nodes]);

  const hiddenNodeIds = useMemo(
    () => computeHiddenNodeIds(nodes, normalizedFamilyGroups, isolatedGroupId),
    [nodes, normalizedFamilyGroups, isolatedGroupId],
  );

  const effectiveHiddenNodeIds = useMemo(
    () => (groupDraft ? new Set() : hiddenNodeIds),
    [groupDraft, hiddenNodeIds],
  );

  const visibleNodes = useMemo(
    () => nodes.filter(n => !effectiveHiddenNodeIds.has(n.id)),
    [nodes, effectiveHiddenNodeIds],
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
    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const dedupe = new Set();
    const output = [];

    edges.forEach((edge) => {
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
        if (!canRenderFromCollapsed || !canRenderToCollapsed) return;

        if (fromHidden && toHidden && fromCollapsedGroup === toCollapsedGroup) return;
      }

      if (!fromNode || !toNode) return;

      const key = [
        edge.type,
        edge.label || '',
        `${Math.round(fromNode.x)}:${Math.round(fromNode.y)}`,
        `${Math.round(toNode.x)}:${Math.round(toNode.y)}`,
      ].join('|');

      if (dedupe.has(key)) return;
      dedupe.add(key);

      output.push({ edge, fromNode, toNode, renderKey: key });
    });

    return output;
  }, [nodes, edges, effectiveHiddenNodeIds, collapsedGroupByNodeId, collapsedGroupBubbleMap]);

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

  // Initialize view on mount
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => fitToScreen(nodes), 100);
      return () => clearTimeout(timer);
    }
    setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, k: 1 });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    openActionsModal(sourceNodeId, 'links', edgeId);
    selectGroupFromNode(sourceNodeId);
  }, [openActionsModal, selectGroupFromNode]);

  const focusVisibleNodes = useCallback((nextGroups, nextIsolatedGroupId = isolatedGroupId) => {
    const nextVisible = computeVisibleNodes(nodes, nextGroups, nextIsolatedGroupId);
    setTimeout(() => fitToScreen(nextVisible.length > 0 ? nextVisible : nodes), 100);
  }, [nodes, isolatedGroupId, fitToScreen]);

  const confirmAddChild = useCallback((sourceId, partnerId) => {
    const result = treeService.addChild(nodes, edges, sourceId, partnerId);
    saveAndUpdate(result.nodes, result.edges);
    setPartnerSelection(null);
    setTimeout(() => fitToScreen(result.nodes), 100);
  }, [nodes, edges, treeService, saveAndUpdate, fitToScreen]);

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
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'add_child') {
      const partners = treeService.getPartners(edges, nodeId);
      if (partners.length > 0) {
        setPartnerSelection({ sourceId: nodeId, partners });
        closeActionsModal();
        return;
      }
      confirmAddChild(nodeId, null);
      closeActionsModal();
      return;
    } else if (action === 'add_spouse') {
      if (treeService.hasSpouse(edges, nodeId)) return;
      const result = treeService.addSpouse(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'add_ex_spouse') {
      const result = treeService.addExSpouse(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'delete') {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.deleteNode(nodes, edges, nodeId);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'link') {
      enterLinkingMode(nodeId);
    }
  }, [actionsModal.nodeId, nodes, edges, customLinkTypes, normalizedFamilyGroups, treeService, saveAndUpdate, fitToScreen, confirmAddChild, closeActionsModal, enterLinkingMode, undoService]);

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

  const handleOrganize = useCallback(() => {
    undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
    const expandedGroups = normalizedFamilyGroups.map(group => ({ ...group, collapsed: false }));
    setIsolatedGroupId(null);
    const organizedNodes = treeService.organizeByLevels(nodes, edges);
    saveAndUpdate(organizedNodes, edges, customLinkTypes, expandedGroups);
    setTimeout(() => fitToScreen(organizedNodes), 100);
  }, [nodes, edges, customLinkTypes, normalizedFamilyGroups, treeService, saveAndUpdate, fitToScreen, undoService]);

  // ---- Undo functionality ----
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const canUndo = useMemo(() => undoService.canUndo(), [undoService, nodes, edges, normalizedFamilyGroups]);

  const handleUndo = useCallback(() => {
    const previousState = undoService.undo();
    if (!previousState) return;

    setIsolatedGroupId(null);
    setHighlightedGroupId(null);
    saveAndUpdate(
      previousState.nodes,
      previousState.edges,
      previousState.customLinkTypes,
      previousState.familyGroups || [],
    );
    setTimeout(() => fitToScreen(previousState.nodes), 100);
  }, [undoService, saveAndUpdate, fitToScreen]);

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

  const handleSelectNode = useCallback((nodeId) => {
    openActionsModal(nodeId);
    selectGroupFromNode(nodeId);
  }, [openActionsModal, selectGroupFromNode]);

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

  const actionsModalHasParents = useMemo(() => {
    if (!actionsModal.nodeId) return false;
    return treeService.hasParents(edges, actionsModal.nodeId);
  }, [actionsModal.nodeId, edges, treeService]);

  const actionsModalHasSpouse = useMemo(() => {
    if (!actionsModal.nodeId) return false;
    return treeService.hasSpouse(edges, actionsModal.nodeId);
  }, [actionsModal.nodeId, edges, treeService]);

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
        if (e.target.closest?.('[data-collapsed-group-menu="true"]')) return;
        setCollapsedGroupMenu(null);
        handleMouseDown(e, transform);
      }}
      onMouseMove={(e) => handleMouseMove(e, nodes, (n) => saveAndUpdateWithUndo(n, edges), transform)}
      onMouseUp={handleMouseUpCallback}
      onMouseLeave={handleMouseUpCallback}
      onWheel={handleWheel}
      onTouchStart={(e) => {
        if (e.target.closest?.('[data-collapsed-group-menu="true"]')) return;
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
        onFitToScreen={() => fitToScreen(visibleNodes.length > 0 ? visibleNodes : nodes)}
        onOrganize={handleOrganize}
        onManageLinkTypes={() => setLinkTypesModalOpen(true)}
        onOpenFamilyGroups={() => setFamilyGroupsModalOpen(true)}
        hasFamilyGroups={normalizedFamilyGroups.length > 0}
        onExport={handleExport}
        onSnapshot={handleSnapshot}
        onLogout={onLogout}
        onUndo={handleUndo}
        canUndo={canUndo}
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
      />

      <PartnerSelectionModal
        selection={partnerSelection}
        nodes={nodes}
        onClose={() => setPartnerSelection(null)}
        onSelect={(partnerId) => confirmAddChild(partnerSelection.sourceId, partnerId)}
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
          {renderedEdges.map(({ edge, fromNode, toNode, renderKey }) => {
            return (
              <FamilyEdge
                key={renderKey}
                edge={edge}
                fromNode={fromNode}
                toNode={toNode}
                onLineClick={handleLineClick}
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

          {visibleNodes.map(node => (
            <FamilyNode
              key={node.id}
              node={node}
              isSelected={!linkingMode && actionsModal.nodeId === node.id}
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
