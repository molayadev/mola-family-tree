import { useState, useEffect, useMemo, useCallback } from 'react';
import { Move, Link as LinkIcon, X } from 'lucide-react';
import { isPartnerEdgeType } from '../../../domain/config/constants';
import { useCanvas } from '../../../application/hooks/useCanvas';
import { downloadTreeSnapshot } from '../../../application/services/SnapshotService';
import { getSiblingStatsByNode } from '../../../domain/utils/siblingUtils';
import CanvasHUD from './CanvasHUD';
import ZoomControls from './ZoomControls';
import FamilyNode from './FamilyNode';
import FamilyEdge from './FamilyEdge';
import NodeActionsModal from '../modals/NodeActionsModal';
import PartnerSelectionModal from '../modals/PartnerSelectionModal';
import LinkTypeSelectionModal from '../modals/LinkTypeSelectionModal';

export default function FamilyCanvas({ username, nodes, edges, treeService, exportService, onSave, onLogout }) {
  const [actionsModal, setActionsModal] = useState({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  const [actionsModalKey, setActionsModalKey] = useState(0);
  const [partnerSelection, setPartnerSelection] = useState(null);

  // Linking mode state
  const [linkingMode, setLinkingMode] = useState(null); // { sourceId } or null
  const [linkTarget, setLinkTarget] = useState(null);    // target nodeId or null

  // ── Collapse / expand family nuclei ──────────────────────────────────
  const [collapsedFamilies, setCollapsedFamilies] = useState(new Set());

  // A family nucleus = a set of parents that share at least one child
  const familyNuclei = useMemo(() => {
    const childParents = {};
    edges.forEach(e => {
      if (e.type === 'parent') {
        (childParents[e.to] ??= new Set()).add(e.from);
      }
    });
    const nucleiMap = {};
    Object.entries(childParents).forEach(([childId, parentSet]) => {
      const key = [...parentSet].sort().join(':');
      if (!nucleiMap[key]) nucleiMap[key] = { id: key, parents: [...parentSet], children: [] };
      nucleiMap[key].children.push(childId);
    });
    return Object.values(nucleiMap);
  }, [edges]);

  // Compute which node IDs are hidden due to collapsed families
  const hiddenNodeIds = useMemo(() => {
    if (collapsedFamilies.size === 0) return new Set();
    const hidden = new Set();
    const childrenOf = {};
    const partnersOf = {};
    edges.forEach(e => {
      if (e.type === 'parent') {
        (childrenOf[e.from] ??= []).push(e.to);
      } else if (isPartnerEdgeType(e.type)) {
        (partnersOf[e.from] ??= []).push(e.to);
        (partnersOf[e.to] ??= []).push(e.from);
      }
    });
    collapsedFamilies.forEach(familyId => {
      const nucleus = familyNuclei.find(n => n.id === familyId);
      if (!nucleus) return;
      const queue = [...nucleus.children];
      queue.forEach(id => hidden.add(id));
      let head = 0;
      while (head < queue.length) {
        const cur = queue[head++];
        (partnersOf[cur] || []).forEach(pid => {
          if (!hidden.has(pid) && !nucleus.parents.includes(pid)) {
            hidden.add(pid); queue.push(pid);
          }
        });
        (childrenOf[cur] || []).forEach(cid => {
          if (!hidden.has(cid)) { hidden.add(cid); queue.push(cid); }
        });
      }
    });
    return hidden;
  }, [collapsedFamilies, familyNuclei, edges]);

  const visibleNodes = useMemo(() => nodes.filter(n => !hiddenNodeIds.has(n.id)), [nodes, hiddenNodeIds]);
  const visibleEdges = useMemo(() => edges.filter(e => !hiddenNodeIds.has(e.from) && !hiddenNodeIds.has(e.to)), [edges, hiddenNodeIds]);
  const siblingStatsByNode = useMemo(() => getSiblingStatsByNode(nodes, edges), [nodes, edges]);

  const toggleCollapse = useCallback((familyId) => {
    setCollapsedFamilies(prev => {
      const next = new Set(prev);
      if (next.has(familyId)) next.delete(familyId);
      else next.add(familyId);
      return next;
    });
  }, []);

  const handleToggleCollapseAll = useCallback(() => {
    if (collapsedFamilies.size > 0) {
      setCollapsedFamilies(new Set());
    } else {
      setCollapsedFamilies(new Set(familyNuclei.map(n => n.id)));
    }
  }, [collapsedFamilies, familyNuclei]);

  // Collapse-toggle positions (rendered in SVG)
  const collapseToggles = useMemo(() => {
    return familyNuclei
      .filter(nucleus => nucleus.parents.some(pid => !hiddenNodeIds.has(pid)))
      .map(nucleus => {
        const isCollapsed = collapsedFamilies.has(nucleus.id);
        const parentNodes = nucleus.parents.map(pid => nodes.find(n => n.id === pid)).filter(Boolean);
        if (parentNodes.length === 0) return null;
        const avgX = parentNodes.reduce((s, n) => s + n.x, 0) / parentNodes.length;
        const maxY = Math.max(...parentNodes.map(n => n.y));
        return { id: nucleus.id, x: avgX, y: maxY + 70, parentMaxY: maxY, isCollapsed, childCount: nucleus.children.length };
      })
      .filter(Boolean);
  }, [familyNuclei, collapsedFamilies, hiddenNodeIds, nodes]);

  const {
    transform,
    setTransform,
    canvasRef,
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
    } else {
      setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, k: 1 });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const saveAndUpdate = useCallback((newNodes, newEdges) => {
    onSave(newNodes, newEdges);
  }, [onSave]);

  const openActionsModal = useCallback((nodeId, initialTab = null, expandedEdgeId = null) => {
    setActionsModal({ isOpen: true, nodeId, initialTab, expandedEdgeId });
    setActionsModalKey(k => k + 1);
  }, []);

  const closeActionsModal = useCallback(() => {
    setActionsModal({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  }, []);

  const handleLineClick = useCallback((edgeId, sourceNodeId) => {
    openActionsModal(sourceNodeId, 'links', edgeId);
  }, [openActionsModal]);

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
      // Guard: skip if node already has parents
      if (treeService.hasParents(edges, nodeId)) return;
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
      // Guard: skip if node already has a current spouse
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
      const result = treeService.deleteNode(nodes, edges, nodeId);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'link') {
      enterLinkingMode(nodeId);
    }
  }, [actionsModal.nodeId, nodes, edges, treeService, saveAndUpdate, fitToScreen, confirmAddChild, closeActionsModal, enterLinkingMode]);

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
    exportService.exportTree(username, nodes, edges);
  }, [username, nodes, edges, exportService]);

  const handleSnapshot = useCallback(() => {
    downloadTreeSnapshot(username, nodes, edges);
  }, [username, nodes, edges]);

  const handleOrganize = useCallback(() => {
    setCollapsedFamilies(new Set()); // expand all before reorganizing layout
    const organizedNodes = treeService.organizeByLevels(nodes, edges);
    saveAndUpdate(organizedNodes, edges);
    setTimeout(() => fitToScreen(organizedNodes), 100);
  }, [nodes, edges, treeService, saveAndUpdate, fitToScreen]);

  // ---- Linking mode ----
  const cancelLinkingMode = useCallback(() => {
    setLinkingMode(null);
    setLinkTarget(null);
  }, []);

  const handleLinkTargetSelected = useCallback((targetId) => {
    if (!linkingMode) return;
    if (targetId === linkingMode.sourceId) return; // can't link to self
    setLinkTarget(targetId);
  }, [linkingMode]);

  const handleLinkTypeChosen = useCallback((linkType) => {
    if (!linkingMode || !linkTarget) return;
    const newEdges = treeService.linkNodes(edges, linkingMode.sourceId, linkTarget, linkType);
    saveAndUpdate(nodes, newEdges);
    setLinkingMode(null);
    setLinkTarget(null);
  }, [linkingMode, linkTarget, edges, nodes, treeService, saveAndUpdate]);

  const handleNodePointerDownWrapped = useCallback((e, nodeId) => {
    if (linkingMode) {
      e.stopPropagation();
      e.preventDefault();
      handleLinkTargetSelected(nodeId);
      return;
    }
    handleNodePointerDown(e, nodeId, nodes);
  }, [linkingMode, handleLinkTargetSelected, handleNodePointerDown, nodes]);

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

  return (
    <div
      className="h-screen w-screen bg-[#F3F0EB] overflow-hidden relative font-sans text-gray-700 selection:bg-orange-200 touch-none"
      ref={canvasRef}
      onMouseDown={(e) => {
        handleMouseDown(e, transform);
      }}
      onMouseMove={(e) => handleMouseMove(e, nodes, (n) => saveAndUpdate(n, edges), transform)}
      onMouseUp={() => handleMouseUp(() => saveAndUpdate(nodes, edges), openActionsModal)}
      onMouseLeave={() => handleMouseUp(() => saveAndUpdate(nodes, edges), openActionsModal)}
      onWheel={handleWheel}
      onTouchStart={(e) => {
        handleTouchStart(e, transform);
      }}
      onTouchMove={(e) => handleTouchMove(e, nodes, (n) => saveAndUpdate(n, edges), transform)}
      onTouchEnd={() => handleTouchEnd(() => saveAndUpdate(nodes, edges), openActionsModal)}
      style={{ touchAction: 'none' }}
    >
      <CanvasHUD
        username={username}
        nodeCount={nodes.length}
        zoom={transform.k}
        onFitToScreen={() => fitToScreen(visibleNodes)}
        onOrganize={handleOrganize}
        onExport={handleExport}
        onSnapshot={handleSnapshot}
        onLogout={onLogout}
        hasFamilies={familyNuclei.length > 0}
        hasCollapsed={collapsedFamilies.size > 0}
        onToggleCollapseAll={handleToggleCollapseAll}
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
        disableSpouse={disableSpouseLink}
        onSelect={handleLinkTypeChosen}
        onClose={() => setLinkTarget(null)}
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

      <svg className="w-full h-full pointer-events-none">
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {visibleEdges.map(edge => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            return (
              <FamilyEdge
                key={edge.id}
                edge={edge}
                fromNode={from}
                toNode={to}
                onLineClick={handleLineClick}
              />
            );
          })}

          {/* Collapse / expand toggle dots */}
          {collapseToggles.map(toggle => (
            <g key={`ct-${toggle.id}`}>
              {toggle.isCollapsed && (
                <line
                  x1={toggle.x} y1={toggle.parentMaxY + 35}
                  x2={toggle.x} y2={toggle.y - 14}
                  stroke="#CBD5E1" strokeWidth="2" strokeDasharray="4,4"
                />
              )}
              <g
                className="pointer-events-auto cursor-pointer"
                onClick={(e) => { e.stopPropagation(); toggleCollapse(toggle.id); }}
              >
                <circle
                  cx={toggle.x} cy={toggle.y}
                  r={toggle.isCollapsed ? 14 : 9}
                  fill="white" stroke={toggle.isCollapsed ? '#F97316' : '#9CA3AF'}
                  strokeWidth="1.5"
                />
                <text
                  x={toggle.x} y={toggle.y + 4}
                  textAnchor="middle" fill={toggle.isCollapsed ? '#F97316' : '#6B7280'}
                  className={`${toggle.isCollapsed ? 'text-[11px]' : 'text-[10px]'} font-bold pointer-events-none select-none`}
                >
                  {toggle.isCollapsed ? `+${toggle.childCount}` : '−'}
                </text>
              </g>
            </g>
          ))}

          {visibleNodes.map(node => (
            <FamilyNode
              key={node.id}
              node={node}
              siblingStats={siblingStatsByNode[node.id]}
              isSelected={!linkingMode && actionsModal.nodeId === node.id}
              isDimmed={linkingMode && node.id !== linkingMode.sourceId && node.id !== linkTarget}
              isLinkTarget={linkingMode && node.id === linkTarget}
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
