import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Move, Pencil } from 'lucide-react';
import { isPartnerEdgeType, isBrokenLabel, resolveEdgeLabel } from '../../../domain/config/constants';
import { modeAllowsOrganize } from '../../../domain/config/viewModeStrategies';
import { VIEW_MODE_OPTIONS_WITH_ICONS } from '../../config/viewModeIcons';
import { normalizeFamilyGroups, computeHiddenNodeIds, buildAutoFamilyGroups, normalizeGroupColor, randomGroupEmoji } from '../../../domain/utils/groupUtils';
import { buildLineageVisibility, buildLineageColumnPositions, buildNodeParentControls } from '../../../domain/utils/lineageUtils';
import { buildFanSlots, buildRadialPositions } from '../../../domain/utils/fanUtils';
import { useCanvas } from '../../../application/hooks/useCanvas';
import { useNodeActions } from '../../../application/hooks/useNodeActions';
import { useGroupActions } from '../../../application/hooks/useGroupActions';
import { useLinkingMode } from '../../../application/hooks/useLinkingMode';
import { usePartnerSelection } from '../../../application/hooks/usePartnerSelection';
import { useViewMode } from '../../../application/hooks/useViewMode';
import { downloadTreeSnapshot } from '../../../application/services/SnapshotService';
import { computeLupaLevel, getLupaInitialAnchor } from '../../../application/utils/lupaLayout';
import CanvasHUD from './CanvasHUD';
import ZoomControls from './ZoomControls';
import FamilyNode from './FamilyNode';
import FamilyEdge from './FamilyEdge';
import LupaBagNode from './LupaBagNode';
import FanChartRenderer from './FanChartRenderer';
import CanvasNodeControls from './CanvasNodeControls';
import LinkingModeBanner from './LinkingModeBanner';
import LupaOverlay from './LupaOverlay';
import GroupDraftPanel from './GroupDraftPanel';
import CollapsedGroupMenu from './CollapsedGroupMenu';
import NodeActionsModal from '../modals/NodeActionsModal';
import PartnerSelectionModal from '../modals/PartnerSelectionModal';
import LinkTypeSelectionModal from '../modals/LinkTypeSelectionModal';
import LinkTypesManagerModal from '../modals/LinkTypesManagerModal';
import FamilyGroupsModal from '../modals/FamilyGroupsModal';
import OrganizeTreeModal from '../modals/OrganizeTreeModal';

const FIT_TO_SCREEN_DELAY = 100;

export default function FamilyCanvas({ username, nodes, edges, customLinkTypes, familyGroups, treeService, exportService, undoService, onSave, onLogout }) {
  // ── Modal state ────────────────────────────────────────────────────────────
  const [actionsModal, setActionsModal] = useState({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  const [actionsModalKey, setActionsModalKey] = useState(0);
  const [linkTypesModalOpen, setLinkTypesModalOpen] = useState(false);
  const [organizeModalOpen, setOrganizeModalOpen] = useState(false);

  // ── Focus / selection state ────────────────────────────────────────────────
  const [focusNodeId, setFocusNodeId] = useState(() => nodes[0]?.id || null);
  const [selectedNodeId, setSelectedNodeId] = useState(() => nodes[0]?.id || null);
  const [parentChoiceByChildId, setParentChoiceByChildId] = useState({});

  // ── Organisation state ─────────────────────────────────────────────────────
  const [organizationMode, setOrganizationMode] = useState('none');
  const [lupaStack, setLupaStack] = useState([]);
  const [expandedLupaBagIds, setExpandedLupaBagIds] = useState(() => new Set());
  const [edgeCurveMode, setEdgeCurveMode] = useState('curved');
  const [collapsedParentNucleusKeys, setCollapsedParentNucleusKeys] = useState(() => new Set());

  const autoGroupsInitializedRef = useRef(false);

  // ── Derived / normalised data ──────────────────────────────────────────────
  const normalizedFamilyGroups = useMemo(() => normalizeFamilyGroups(familyGroups, nodes), [familyGroups, nodes]);

  // ── View mode hook ─────────────────────────────────────────────────────────
  const {
    lineageViewMode,
    setLineageViewMode,
    relativesBranchMode,
    setRelativesBranchMode,
    pendingViewCenterRef,
    handleViewModeChange,
  } = useViewMode({
    nodes,
    edges,
    focusNodeId,
    selectedNodeId,
    setFocusNodeId,
    setSelectedNodeId,
    parentChoiceByChildId,
    setParentChoiceByChildId,
    setOrganizeModalOpen,
  });

  // ── Canvas interaction hook ────────────────────────────────────────────────
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

  // ── Lineage visibility ─────────────────────────────────────────────────────
  const lineageVisibility = useMemo(
    () => buildLineageVisibility(nodes, edges, focusNodeId, parentChoiceByChildId, lineageViewMode, relativesBranchMode),
    [nodes, edges, focusNodeId, parentChoiceByChildId, lineageViewMode, relativesBranchMode],
  );

  const canUseOrganize = modeAllowsOrganize(lineageViewMode);
  const canUseParentNucleusGrouping = organizationMode !== 'lupa' && (lineageViewMode === 'relatives' || lineageViewMode === 'all');

  // ── Modal helpers ──────────────────────────────────────────────────────────
  const openActionsModal = useCallback((nodeId, initialTab = null, expandedEdgeId = null) => {
    setActionsModal({ isOpen: true, nodeId, initialTab, expandedEdgeId });
    setActionsModalKey(k => k + 1);
  }, []);

  const closeActionsModal = useCallback(() => {
    setActionsModal({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  }, []);

  // ── Save helpers ───────────────────────────────────────────────────────────
  const saveAndUpdate = useCallback((newNodes, newEdges, newCustomLinkTypes, newFamilyGroups) => {
    const resolvedCustomLinkTypes = newCustomLinkTypes ?? customLinkTypes;
    const resolvedFamilyGroups = normalizeFamilyGroups(newFamilyGroups ?? normalizedFamilyGroups, newNodes);
    onSave(newNodes, newEdges, resolvedCustomLinkTypes, resolvedFamilyGroups);
  }, [onSave, customLinkTypes, normalizedFamilyGroups]);

  // Track if we need to save state before node movement
  const nodeMovementStateRef = useRef({ savedForCurrentDrag: false });

  const saveAndUpdateWithUndo = useCallback((newNodes, newEdges, newCustomLinkTypes, newFamilyGroups) => {
    if (!nodeMovementStateRef.current.savedForCurrentDrag) {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      nodeMovementStateRef.current.savedForCurrentDrag = true;
    }
    const resolvedCustomLinkTypes = newCustomLinkTypes ?? customLinkTypes;
    const resolvedFamilyGroups = newFamilyGroups ?? normalizedFamilyGroups;
    onSave(newNodes, newEdges, resolvedCustomLinkTypes, resolvedFamilyGroups);
  }, [onSave, nodes, edges, customLinkTypes, normalizedFamilyGroups, undoService]);

  const handleDragEnd = useCallback(() => {
    nodeMovementStateRef.current.savedForCurrentDrag = false;
  }, []);

  // ── Keep nodes in viewport after creation ──────────────────────────────────
  const keepNodesInViewport = useCallback((targetNodes) => {
    if (!Array.isArray(targetNodes) || targetNodes.length === 0) return;
    const isMobile = window.innerWidth < 768;
    const horizontalMargin = 20;
    const topMargin = isMobile ? 92 : 78;
    const bottomMargin = isMobile ? 84 : 40;
    setTransform((prev) => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const nodeScreenRadius = Math.max(26, 32 * prev.k);
      targetNodes.forEach((node) => {
        const screenX = prev.x + (node.x * prev.k);
        const screenY = prev.y + (node.y * prev.k);
        minX = Math.min(minX, screenX - nodeScreenRadius);
        maxX = Math.max(maxX, screenX + nodeScreenRadius);
        minY = Math.min(minY, screenY - nodeScreenRadius);
        maxY = Math.max(maxY, screenY + nodeScreenRadius);
      });
      if (!Number.isFinite(minX) || !Number.isFinite(minY)) return prev;
      const viewportLeft = horizontalMargin;
      const viewportRight = window.innerWidth - horizontalMargin;
      const viewportTop = topMargin;
      const viewportBottom = window.innerHeight - bottomMargin;
      let deltaX = 0, deltaY = 0;
      if (minX < viewportLeft) deltaX = viewportLeft - minX;
      if (maxX + deltaX > viewportRight) deltaX += viewportRight - (maxX + deltaX);
      if (minY < viewportTop) deltaY = viewportTop - minY;
      if (maxY + deltaY > viewportBottom) deltaY += viewportBottom - (maxY + deltaY);
      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) return prev;
      return { ...prev, x: prev.x + deltaX, y: prev.y + deltaY };
    });
  }, [setTransform]);

  // ── Group actions hook ─────────────────────────────────────────────────────
  const {
    isolatedGroupId,
    setIsolatedGroupId,
    highlightedGroupId,
    setHighlightedGroupId,
    groupDraft,
    setGroupDraft,
    collapsedGroupMenu,
    setCollapsedGroupMenu,
    familyGroupsModalOpen,
    setFamilyGroupsModalOpen,
    focusVisibleNodes,
    selectGroupFromNode,
    handleShowOnlyGroup,
    handleToggleCollapseGroup,
    handleExpandAllGroups,
    handleStartCreateGroup,
    handleStartEditGroup,
    handleSaveGroupDraft,
    handleDeleteGroup,
    handleIdentifyGroupMembers,
    handleCancelGroupDraft,
    handleStartEditMembers,
    updateGroupDraftField,
    toggleGroupDraftNode,
  } = useGroupActions({
    nodes,
    edges,
    customLinkTypes,
    normalizedFamilyGroups,
    undoService,
    saveAndUpdate,
    fitToScreen,
    lineageVisibility,
  });

  // ── Linking mode hook ──────────────────────────────────────────────────────
  const {
    linkingMode,
    linkTarget,
    setLinkTarget,
    enterLinkingMode,
    cancelLinkingMode,
    handleLinkTargetSelected,
    handleLinkTypeChosen,
  } = useLinkingMode({
    nodes,
    edges,
    customLinkTypes,
    treeService,
    saveAndUpdate,
    closeActionsModal,
  });

  // ── Partner selection hook ─────────────────────────────────────────────────
  const {
    partnerSelection,
    setPartnerSelection,
    handleSelectPartnerAction,
  } = usePartnerSelection({
    nodes,
    edges,
    customLinkTypes,
    normalizedFamilyGroups,
    treeService,
    undoService,
    saveAndUpdate,
    setFocusNodeId,
    keepNodesInViewport,
  });

  // ── Node actions hook ──────────────────────────────────────────────────────
  const {
    handleNodeAction,
    handleUpdateNode,
    handleUpdateLink,
    handleDeleteLink,
  } = useNodeActions({
    actionsModal,
    nodes,
    edges,
    customLinkTypes,
    normalizedFamilyGroups,
    treeService,
    undoService,
    saveAndUpdate,
    closeActionsModal,
    enterLinkingMode,
    setPartnerSelection,
    setFocusNodeId,
    setHighlightedGroupId,
    focusVisibleNodes,
    keepNodesInViewport,
    FIT_TO_SCREEN_DELAY,
  });

  // ── Computed visibility and positions ─────────────────────────────────────
  const lineageHiddenNodeIds = useMemo(() => {
    const hidden = new Set();
    if (groupDraft) return hidden;
    nodes.forEach((node) => {
      if (!lineageVisibility.visibleNodeIds.has(node.id)) hidden.add(node.id);
    });
    return hidden;
  }, [nodes, lineageVisibility.visibleNodeIds, groupDraft]);

  const parentNucleusMap = useMemo(() => {
    if (!canUseParentNucleusGrouping) return new Map();

    const nodeMap = new Map(nodes.map(node => [node.id, node]));
    const childrenByParentKey = new Map();
    const childrenByParentId = new Map();
    const partnersByNodeId = new Map();
    const allPartnersByNodeId = new Map();

    edges.forEach((edge) => {
      if (edge.type === 'parent') {
        const childId = edge.to;
        const parentIds = [...new Set(
          edges
            .filter(item => item.type === 'parent' && item.to === childId)
            .map(item => item.from)
        )].filter(id => nodeMap.has(id));

        if (!childrenByParentId.has(edge.from)) childrenByParentId.set(edge.from, new Set());
        childrenByParentId.get(edge.from).add(childId);

        if (parentIds.length !== 2) return;

        const sortedParents = [...parentIds].sort();
        const pairKey = sortedParents.join('|');
        if (!childrenByParentKey.has(pairKey)) childrenByParentKey.set(pairKey, new Set());
        childrenByParentKey.get(pairKey).add(childId);
        return;
      }

      if (isPartnerEdgeType(edge.type) && !isBrokenLabel(resolveEdgeLabel(edge))) {
        if (!partnersByNodeId.has(edge.from)) partnersByNodeId.set(edge.from, new Set());
        if (!partnersByNodeId.has(edge.to)) partnersByNodeId.set(edge.to, new Set());
        partnersByNodeId.get(edge.from).add(edge.to);
        partnersByNodeId.get(edge.to).add(edge.from);
      }

      if (isPartnerEdgeType(edge.type)) {
        if (!allPartnersByNodeId.has(edge.from)) allPartnersByNodeId.set(edge.from, new Set());
        if (!allPartnersByNodeId.has(edge.to)) allPartnersByNodeId.set(edge.to, new Set());
        allPartnersByNodeId.get(edge.from).add(edge.to);
        allPartnersByNodeId.get(edge.to).add(edge.from);
      }
    });

    const getFamilyName = (node) => {
      const lastName = (node?.data?.lastName || '').trim();
      if (lastName) return lastName;
      return (node?.data?.firstName || '').trim() || '?';
    };

    const result = new Map();
    childrenByParentKey.forEach((childSet, pairKey) => {
      const parentIds = pairKey.split('|');
      const parentNodes = parentIds.map(id => nodeMap.get(id)).filter(Boolean);
      if (parentNodes.length !== 2) return;

      const parentA = parentNodes.find(n => n.data?.gender === 'male') || parentNodes[0];
      const parentB = parentNodes.find(n => n.id !== parentA.id) || parentNodes[1];

      const collapsedNodeIds = new Set();
      const queue = [...childSet];
      const visited = new Set();

      while (queue.length > 0) {
        const currentId = queue.shift();
        if (!currentId || visited.has(currentId)) continue;
        visited.add(currentId);
        collapsedNodeIds.add(currentId);

        const partners = [...(allPartnersByNodeId.get(currentId) || new Set())];
        partners.forEach((partnerId) => {
          if (nodeMap.has(partnerId)) {
            collapsedNodeIds.add(partnerId);
            if (!visited.has(partnerId)) queue.push(partnerId);
          }
        });

        const children = [...(childrenByParentId.get(currentId) || new Set())];
        children.forEach((descId) => {
          if (!visited.has(descId)) queue.push(descId);
        });
      }

      result.set(pairKey, {
        key: pairKey,
        parentIds,
        childIds: [...childSet],
        collapsedNodeIds: [...collapsedNodeIds],
        x: (parentNodes[0].x + parentNodes[1].x) / 2,
        y: (parentNodes[0].y + parentNodes[1].y) / 2,
        label: `Hijos ${getFamilyName(parentA)} ${getFamilyName(parentB)}`,
        count: childSet.size,
      });
    });

    return result;
  }, [canUseParentNucleusGrouping, nodes, edges]);

  const groupHiddenIds = useMemo(
    () => computeHiddenNodeIds(nodes, normalizedFamilyGroups, isolatedGroupId),
    [nodes, normalizedFamilyGroups, isolatedGroupId],
  );

  const collapsedParentNucleusHiddenNodeIds = useMemo(() => {
    const hidden = new Set();
    if (!canUseParentNucleusGrouping || groupDraft || collapsedParentNucleusKeys.size === 0) return hidden;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const otherHiddenIds = new Set([...groupHiddenIds, ...lineageHiddenNodeIds]);

    const edgesByNode = new Map();
    const allPartnersByNodeId = new Map();
    const childrenByParentId = new Map();

    edges.forEach(edge => {
      if (!edgesByNode.has(edge.from)) edgesByNode.set(edge.from, []);
      if (!edgesByNode.has(edge.to)) edgesByNode.set(edge.to, []);
      edgesByNode.get(edge.from).push(edge);
      edgesByNode.get(edge.to).push(edge);

      if (isPartnerEdgeType(edge.type)) {
        if (!allPartnersByNodeId.has(edge.from)) allPartnersByNodeId.set(edge.from, new Set());
        if (!allPartnersByNodeId.has(edge.to)) allPartnersByNodeId.set(edge.to, new Set());
        allPartnersByNodeId.get(edge.from).add(edge.to);
        allPartnersByNodeId.get(edge.to).add(edge.from);
      }
      if (edge.type === 'parent') {
        if (!childrenByParentId.has(edge.from)) childrenByParentId.set(edge.from, new Set());
        childrenByParentId.get(edge.from).add(edge.to);
      }
    });

    collapsedParentNucleusKeys.forEach((nucleusKey) => {
      const nucleus = parentNucleusMap.get(nucleusKey);
      if (!nucleus) return;

      const nucleusParentIdSet = new Set(nucleus.parentIds);

      const initialCandidates = new Set();
      const bfsQueue = [...nucleus.childIds];
      const bfsVisited = new Set();
      while (bfsQueue.length > 0) {
        const currentId = bfsQueue.shift();
        if (!currentId || bfsVisited.has(currentId) || !nodeMap.has(currentId)) continue;
        bfsVisited.add(currentId);
        initialCandidates.add(currentId);
        (allPartnersByNodeId.get(currentId) || new Set()).forEach(partnerId => {
          if (!bfsVisited.has(partnerId)) bfsQueue.push(partnerId);
        });
        (childrenByParentId.get(currentId) || new Set()).forEach(childId => {
          if (!bfsVisited.has(childId)) bfsQueue.push(childId);
        });
      }

      const safeNodes = new Set(nucleus.parentIds);
      const safeQueue = [...nucleus.parentIds];
      while (safeQueue.length > 0) {
        const id = safeQueue.shift();
        (edgesByNode.get(id) || []).forEach(edge => {
          const otherId = edge.from === id ? edge.to : edge.from;
          if (!initialCandidates.has(otherId) && !safeNodes.has(otherId) &&
              !otherHiddenIds.has(otherId) && nodeMap.has(otherId)) {
            safeNodes.add(otherId);
            safeQueue.push(otherId);
          }
        });
      }

      const candidates = new Set(initialCandidates);
      let changed = true;
      while (changed) {
        changed = false;
        candidates.forEach(nodeId => {
          const hasConnectionToSafe = (edgesByNode.get(nodeId) || []).some(edge => {
            const otherId = edge.from === nodeId ? edge.to : edge.from;
            if (nucleusParentIdSet.has(otherId)) return false;
            return safeNodes.has(otherId);
          });
          if (hasConnectionToSafe) {
            candidates.delete(nodeId);
            safeNodes.add(nodeId);
            changed = true;
          }
        });
      }

      const reachableFromCandidates = new Set(candidates);
      const expandQueue = [...candidates];
      while (expandQueue.length > 0) {
        const id = expandQueue.shift();
        (edgesByNode.get(id) || []).forEach(edge => {
          const otherId = edge.from === id ? edge.to : edge.from;
          if (!reachableFromCandidates.has(otherId) && !otherHiddenIds.has(otherId) &&
              !nucleusParentIdSet.has(otherId) && nodeMap.has(otherId)) {
            reachableFromCandidates.add(otherId);
            expandQueue.push(otherId);
          }
        });
      }

      reachableFromCandidates.forEach(nodeId => {
        if (!safeNodes.has(nodeId)) candidates.add(nodeId);
      });

      changed = true;
      while (changed) {
        changed = false;
        candidates.forEach(nodeId => {
          const hasConnectionToSafe = (edgesByNode.get(nodeId) || []).some(edge => {
            const otherId = edge.from === nodeId ? edge.to : edge.from;
            if (nucleusParentIdSet.has(otherId)) return false;
            return safeNodes.has(otherId) && !candidates.has(otherId);
          });
          if (hasConnectionToSafe) {
            candidates.delete(nodeId);
            safeNodes.add(nodeId);
            changed = true;
          }
        });
      }

      candidates.forEach(nodeId => hidden.add(nodeId));
    });

    return hidden;
  }, [canUseParentNucleusGrouping, groupDraft, collapsedParentNucleusKeys, parentNucleusMap, nodes, edges, groupHiddenIds, lineageHiddenNodeIds]);

  const effectiveHiddenNodeIds = useMemo(() => {
    if (groupDraft) return new Set();
    const merged = new Set(groupHiddenIds);
    lineageHiddenNodeIds.forEach(nodeId => merged.add(nodeId));
    collapsedParentNucleusHiddenNodeIds.forEach(nodeId => merged.add(nodeId));
    return merged;
  }, [groupDraft, groupHiddenIds, lineageHiddenNodeIds, collapsedParentNucleusHiddenNodeIds]);

  const visibleNodes = useMemo(
    () => nodes.filter(n => !effectiveHiddenNodeIds.has(n.id)),
    [nodes, effectiveHiddenNodeIds],
  );

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

  // ── Lupa mode data ─────────────────────────────────────────────────────────
  const lupaData = useMemo(() => {
    if (organizationMode !== 'lupa') return null;
    const currentAnchorIds = lupaStack.length > 0
      ? lupaStack[lupaStack.length - 1].anchorNodeIds
      : getLupaInitialAnchor(nodes, edges, focusNodeId);
    return computeLupaLevel(nodes, edges, currentAnchorIds, expandedLupaBagIds);
  }, [organizationMode, lupaStack, nodes, edges, focusNodeId, expandedLupaBagIds]);

  const lupaVisibleNodes = useMemo(() => {
    if (!lupaData) return [];
    return nodes
      .filter((n) => lupaData.visibleRegularNodeIds.has(n.id))
      .map((n) => {
        const pos = lupaData.positions.get(n.id);
        return pos ? { ...n, ...pos } : n;
      });
  }, [lupaData, nodes]);

  const lupaBagNodes = useMemo(() => {
    if (!lupaData) return [];
    return lupaData.bagNodes.map((bag) => {
      const pos = lupaData.positions.get(bag.id);
      return pos ? { ...bag, ...pos } : bag;
    });
  }, [lupaData]);

  const lupaRenderedEdges = useMemo(() => {
    if (!lupaData) return [];
    const nodeMap = new Map(lupaVisibleNodes.map((n) => [n.id, n]));
    const result = [];
    edges.forEach((edge) => {
      if (!lupaData.visibleEdgeIds.has(edge.id)) return;
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) return;
      result.push({ edge, fromNode, toNode, renderKey: `lupa-${edge.id}` });
    });
    return result;
  }, [lupaData, edges, lupaVisibleNodes]);

  const lupaBagEdges = useMemo(() => {
    if (!lupaData) return [];
    const nodeMap = new Map(lupaVisibleNodes.map((n) => [n.id, n]));
    const bagPosMap = new Map(lupaBagNodes.map((b) => [b.id, b]));
    return lupaData.syntheticBagEdges
      .map((bagEdge) => {
        const bag = bagPosMap.get(bagEdge.toBagId);
        if (!bag) return null;
        const anchorNodesForEdge = bagEdge.fromAnchorIds
          .map((id) => nodeMap.get(id))
          .filter(Boolean);
        if (anchorNodesForEdge.length === 0) return null;
        const fromX = anchorNodesForEdge.reduce((s, n) => s + n.x, 0) / anchorNodesForEdge.length;
        const fromY = anchorNodesForEdge.reduce((s, n) => s + n.y, 0) / anchorNodesForEdge.length;
        return { fromNode: { x: fromX, y: fromY }, toNode: { x: bag.x, y: bag.y }, renderKey: bagEdge.id };
      })
      .filter(Boolean);
  }, [lupaData, lupaVisibleNodes, lupaBagNodes]);

  const lupaFitNodes = useMemo(() => {
    if (!lupaData) return [];
    const bagVirtual = lupaBagNodes.map((b) => ({ id: b.id, x: b.x, y: b.y }));
    return [...lupaVisibleNodes, ...bagVirtual];
  }, [lupaData, lupaVisibleNodes, lupaBagNodes]);

  // ── Collapsed group bubbles ────────────────────────────────────────────────
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

  // ── Rendered edges ─────────────────────────────────────────────────────────
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
          const midX = (left.fromNode.x + right.fromNode.x) / 2;
          const curveControlY = Math.min(left.fromNode.y, right.fromNode.y) - 28;
          const curveMidY = 0.25 * left.fromNode.y + 0.5 * curveControlY + 0.25 * right.fromNode.y;
          const junctionNode = {
            id: left.edge.from,
            x: midX,
            y: organizationMode === 'atomic' ? curveMidY : (left.fromNode.y + right.fromNode.y) / 2,
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

  // ── Group colour/highlight helpers ─────────────────────────────────────────
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

  // ── Event handlers ─────────────────────────────────────────────────────────
  const handleCenterCurrentView = useCallback(() => {
    if (organizationMode === 'lupa') {
      fitToScreen(lupaFitNodes.length > 0 ? lupaFitNodes : nodes);
      return;
    }
    if (lineageViewMode === 'radial' && radialFitBoundsNodes) {
      fitToScreen(radialFitBoundsNodes);
      return;
    }
    fitToScreen(displayedVisibleNodes.length > 0 ? displayedVisibleNodes : nodes);
  }, [organizationMode, lupaFitNodes, lineageViewMode, radialFitBoundsNodes, fitToScreen, displayedVisibleNodes, nodes]);

  const handleLineClick = useCallback((edgeId, sourceNodeId) => {
    if (lineageViewMode !== 'relatives') return;
    setSelectedNodeId(sourceNodeId);
    setFocusNodeId(sourceNodeId);
    openActionsModal(sourceNodeId, 'links', edgeId);
    selectGroupFromNode(sourceNodeId);
  }, [lineageViewMode, openActionsModal, selectGroupFromNode]);

  const handleLupaBagClick = useCallback((bag) => {
    setExpandedLupaBagIds((prev) => {
      if (prev.has(bag.id)) {
        const next = new Set(prev);
        next.delete(bag.id);
        return next;
      } else {
        return new Set([bag.id]);
      }
    });
  }, []);

  const handleLupaExit = useCallback(() => {
    setLupaStack([]);
    setExpandedLupaBagIds(new Set());
    setOrganizationMode('none');
  }, []);

  const toggleParentNucleusCollapse = useCallback((nucleusKey) => {
    setCollapsedParentNucleusKeys((prev) => {
      const next = new Set(prev);
      if (next.has(nucleusKey)) next.delete(nucleusKey);
      else next.add(nucleusKey);
      return next;
    });
  }, []);

  const handleSelectNode = useCallback((nodeId) => {
    if (lineageViewMode !== 'relatives' && lineageViewMode !== 'all') return;
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

  const handleNodePointerDownWrapped = useCallback((e, nodeId) => {
    const isSyntheticMouseAfterTouch = (
      e.type === 'mousedown'
      && Date.now() - stateRef.current.lastTouchEndTime < 500
    );
    if (isSyntheticMouseAfterTouch) return;

    if (groupDraft) {
      e.stopPropagation();
      e.preventDefault();
      toggleGroupDraftNode(nodeId);
      return;
    }

    if (linkingMode) {
      e.stopPropagation();
      e.preventDefault();
      handleLinkTargetSelected(nodeId);
      return;
    }

    handleNodePointerDown(e, nodeId, nodes);
  }, [groupDraft, linkingMode, toggleGroupDraftNode, handleLinkTargetSelected, handleNodePointerDown, nodes, stateRef]);

  const handleExport = useCallback(() => {
    exportService.exportTree(username, nodes, edges, customLinkTypes, normalizedFamilyGroups);
  }, [username, nodes, edges, customLinkTypes, normalizedFamilyGroups, exportService]);

  const handleSnapshot = useCallback(() => {
    downloadTreeSnapshot(username, nodes, edges);
  }, [username, nodes, edges]);

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
  }, [undoService, saveAndUpdate, fitToScreen, setIsolatedGroupId, setHighlightedGroupId]);

  const handleApplyOrganization = useCallback((mode) => {
    if (!canUseOrganize) return;
    if (!['levels', 'atomic', 'aizado', 'lupa'].includes(mode)) return;

    undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups, { organizationMode });

    if (mode === 'atomic') {
      setOrganizationMode('atomic');
      setOrganizeModalOpen(false);
      return;
    }

    if (mode === 'lupa') {
      setLupaStack([]);
      setExpandedLupaBagIds(new Set());
      setOrganizationMode('lupa');
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

  const handleSaveCustomLinkTypes = useCallback((nextCustomLinkTypes) => {
    const syncedEdges = treeService.syncCustomLinkEdges(edges, nextCustomLinkTypes);
    saveAndUpdate(nodes, syncedEdges, nextCustomLinkTypes);
    setLinkTypesModalOpen(false);
  }, [treeService, edges, nodes, saveAndUpdate]);

  // ── Effects ────────────────────────────────────────────────────────────────
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
    if (organizationMode === 'lupa') return;
    const nodesForFit = lineageViewMode === 'radial'
      ? radialFitBoundsNodes
      : displayedVisibleNodes;
    if (!nodesForFit || nodesForFit.length === 0) return;
    const timer = setTimeout(() => fitToScreen(nodesForFit), FIT_TO_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [
    lineageViewMode,
    relativesBranchMode,
    parentChoiceByChildId,
    isolatedGroupId,
    groupDraft,
    organizationMode,
    lineageVisibility.resolvedFocusNodeId,
    fitToScreen,
  ]);

  useEffect(() => {
    if (organizationMode !== 'lupa') return;
    if (lupaFitNodes.length === 0) return;
    const timer = setTimeout(() => fitToScreen(lupaFitNodes), FIT_TO_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [organizationMode, lupaStack, fitToScreen]);

  useEffect(() => {
    if (!pendingViewCenterRef.current) return;
    pendingViewCenterRef.current = false;
    const timer = setTimeout(() => handleCenterCurrentView(), FIT_TO_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [lineageViewMode, relativesBranchMode, organizationMode, handleCenterCurrentView]);

  useEffect(() => {
    if (nodes.length === 0) return;
    const hasNode = (nodeId) => Boolean(nodeId) && nodes.some(node => node.id === nodeId);
    const needsSelectedUpdate = !hasNode(selectedNodeId);
    const needsFocusUpdate = !hasNode(focusNodeId);
    if (needsSelectedUpdate) setTimeout(() => setSelectedNodeId(nodes[0].id), 0);
    if (needsFocusUpdate) setTimeout(() => setFocusNodeId(nodes[0].id), 0);
  }, [nodes, selectedNodeId, focusNodeId]);

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

  // ── Derived modal/control props ────────────────────────────────────────────
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
  const showTreeControls = Boolean((lineageViewMode === 'relatives' || lineageViewMode === 'all') && controlsNode);
  const isControlsNodeActive = Boolean(
    controlsNode
    && (
      lineageViewMode === 'all'
      || controlsNode.id === lineageVisibility.resolvedFocusNodeId
    ),
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

  // ── Render ─────────────────────────────────────────────────────────────────
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
        viewModeOptions={VIEW_MODE_OPTIONS_WITH_ICONS}
        focusedNodeName={focusedNode ? `${focusedNode.data.firstName} ${focusedNode.data.lastName}`.trim() : ''}
        canOrganize={canUseOrganize}
        edgeCurveMode={edgeCurveMode}
        onToggleEdgeCurveMode={() => setEdgeCurveMode(prev => (prev === 'curved' ? 'geometric' : 'curved'))}
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

      {linkingMode && !linkTarget && (
        <LinkingModeBanner onCancel={cancelLinkingMode} />
      )}

      {groupDraft && (
        <GroupDraftPanel
          groupDraft={groupDraft}
          onFieldChange={updateGroupDraftField}
          onSave={handleSaveGroupDraft}
          onCancel={handleCancelGroupDraft}
          onRandomEmoji={() => updateGroupDraftField('emoji', randomGroupEmoji())}
        />
      )}

      <CollapsedGroupMenu
        group={selectedCollapsedGroup}
        position={collapsedGroupMenuPosition}
        onExpand={() => handleToggleCollapseGroup(selectedCollapsedGroup.id)}
        onEditMembers={() => handleStartEditMembers(selectedCollapsedGroup.id)}
        onOpenManager={() => {
          setFamilyGroupsModalOpen(true);
          setCollapsedGroupMenu(null);
          setHighlightedGroupId(selectedCollapsedGroup.id);
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      />

      <svg className="w-full h-full pointer-events-none">
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {/* ── Lupa mode rendering ─────────────────────────────────────────── */}
          {organizationMode === 'lupa' && lupaData && (
            <>
              {lupaRenderedEdges.map(({ edge, fromNode, toNode, renderKey }) => (
                <FamilyEdge
                  key={renderKey}
                  edge={edge}
                  fromNode={fromNode}
                  toNode={toNode}
                  onLineClick={() => {}}
                  curveMode={edgeCurveMode}
                />
              ))}

              {lupaBagEdges.map(({ fromNode, toNode, renderKey }) => {
                const d = edgeCurveMode === 'curved'
                  ? (() => {
                      const startY = fromNode.y;
                      const endY = toNode.y - 34;
                      const controlY = startY + ((endY - startY) * 0.5);
                      return `M ${fromNode.x} ${startY} C ${fromNode.x} ${controlY}, ${toNode.x} ${controlY}, ${toNode.x} ${endY}`;
                    })()
                  : (() => {
                      const midY = (fromNode.y + toNode.y) / 2;
                      return `M ${fromNode.x} ${fromNode.y} L ${fromNode.x} ${midY} L ${toNode.x} ${midY} L ${toNode.x} ${toNode.y - 34}`;
                    })();
                return (
                  <path
                    key={renderKey}
                    d={d}
                    stroke="#16a34a"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="5,3"
                  />
                );
              })}

              {lupaVisibleNodes.map((node) => (
                <FamilyNode
                  key={node.id}
                  node={node}
                  isSelected={false}
                  isDimmed={false}
                  isLinkTarget={false}
                  isGroupMemberHighlighted={false}
                  groupHighlightColor={null}
                  defaultGroupColor={null}
                  onPointerDown={() => {}}
                />
              ))}

              {lupaBagNodes.map((bag) => (
                <LupaBagNode
                  key={bag.id}
                  bag={bag}
                  onClick={handleLupaBagClick}
                />
              ))}
            </>
          )}

          {/* ── Normal (non-lupa) rendering ─────────────────────────────────── */}
          {organizationMode !== 'lupa' && lineageViewMode !== 'radial' && renderedEdges.map(({ edge, fromNode, toNode, renderKey }) => (
            <FamilyEdge
              key={renderKey}
              edge={edge}
              fromNode={fromNode}
              toNode={toNode}
              onLineClick={handleLineClick}
              curveMode={edgeCurveMode}
            />
          ))}

          {organizationMode !== 'lupa' && [...collapsedGroupBubbleMap.values()].map((bubble) => (
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

          {canUseParentNucleusGrouping && [...parentNucleusMap.values()]
            .filter((nucleus) => nucleus.parentIds.every(parentId => !effectiveHiddenNodeIds.has(parentId)))
            .map((nucleus) => {
            const isCollapsed = collapsedParentNucleusKeys.has(nucleus.key);
            const toggleNucleus = (e) => {
              e.stopPropagation();
              if (e.type === 'mousedown' && Date.now() - stateRef.current.lastTouchEndTime < 500) return;
              toggleParentNucleusCollapse(nucleus.key);
            };
            return (
              <g key={`parent-nucleus-${nucleus.key}`} className="pointer-events-auto cursor-pointer" onMouseDown={toggleNucleus} onTouchStart={toggleNucleus}>
                {isCollapsed ? (
                  <>
                    <circle cx={nucleus.x} cy={nucleus.y + 28} r="28" fill="white" stroke="#16a34a" strokeWidth="2.5" />
                    <text x={nucleus.x} y={nucleus.y + 23} textAnchor="middle" fontSize="19" fontWeight="700" fill="#15803d" className="pointer-events-none select-none">
                      {nucleus.count}
                    </text>
                    <text x={nucleus.x} y={nucleus.y + 38} textAnchor="middle" fontSize="9" fill="#16a34a" className="pointer-events-none select-none">
                      hijos
                    </text>
                  </>
                ) : (
                  <>
                    <circle cx={nucleus.x} cy={nucleus.y + 28} r="14" fill="#ffffff" stroke="#111827" strokeWidth="1.5" />
                    <text x={nucleus.x} y={nucleus.y + 33} textAnchor="middle" className="text-[14px] font-bold fill-gray-800 pointer-events-none select-none">
                      -
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {organizationMode !== 'lupa' && showTreeControls && controlsRenderNode && !effectiveHiddenNodeIds.has(controlsRenderNode.id) && (
            <CanvasNodeControls
              controlsRenderNode={controlsRenderNode}
              controlsNode={controlsNode}
              showTreeParentFilters={showTreeParentFilters}
              showTreeEyeButton={showTreeEyeButton}
              nodeParentControls={nodeParentControls}
              lineageViewMode={lineageViewMode}
              stateRef={stateRef}
              setSelectedNodeId={setSelectedNodeId}
              setFocusNodeId={setFocusNodeId}
              setParentChoiceByChildId={setParentChoiceByChildId}
              setRelativesBranchMode={setRelativesBranchMode}
              setLineageViewMode={setLineageViewMode}
              pendingViewCenterRef={pendingViewCenterRef}
              onOpenActionsModal={openActionsModal}
            />
          )}

          {/* Pencil button on selected/focused node in lineage mode */}
          {controlsRenderNode && lineageViewMode === 'lineage' && lineageAncestorNodeIds.has(controlsRenderNode.id) && !effectiveHiddenNodeIds.has(controlsRenderNode.id) && (
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
                      if (Date.now() - stateRef.current.lastTouchEndTime < 500) return;
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

          {/* Fan chart (radial mode only) */}
          {lineageViewMode === 'radial' && fanData && (
            <FanChartRenderer
              fanData={fanData}
              nodes={nodes}
              selectedNodeId={selectedNodeId}
              openedNodeId={actionsModal.nodeId}
              stateRef={stateRef}
              onOpenActionsModal={openActionsModal}
              renderedNodeById={renderedNodeById}
            />
          )}

          {organizationMode !== 'lupa' && lineageViewMode !== 'radial' && displayedVisibleNodes.map(node => (
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

      {organizationMode === 'lupa' && (
        <LupaOverlay onExit={handleLupaExit} />
      )}

      {nodes.length > 1 && organizationMode !== 'lupa' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-xs pointer-events-none bg-white/50 px-3 py-1 rounded-full whitespace-nowrap">
          <Move size={12} className="inline mr-1" /> Arrastra o toca las líneas de unión
        </div>
      )}
    </div>
  );
}
