/**
 * AtomicCanvas - Vista atómica donde cada núcleo familiar es un "átomo" colapsable
 * Características:
 * - Nódoscon al menos 1 hijo se colapsan en un único nodo grande
 * - Filtros: mostrar todo, ascendientes, descendientes
 * - Vista de linaje integrada (mostrar linaje ascendente/descendente)
 * - Líneas curvas (como en screenshot)
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Users, ArrowUp, ArrowDown, GitBranch, X } from 'lucide-react';
import { isPartnerEdgeType, isBrokenLabel } from '../../../domain/config/constants';
import { generateId } from '../../../domain/entities/Node';
import { useCanvas } from '../../../application/hooks/useCanvas';
import { downloadTreeSnapshot } from '../../../application/services/SnapshotService';
import {
  buildAutoFamilyAtoms,
  detectFamilyNucleiParents,
  calculateAtomPosition,
  getAtomRepresentativeNode,
  filterAtomicNodes,
  buildAtomicLineage,
} from '../../../application/utils/atomicTreeUtils';
import CanvasHUD from './CanvasHUD';
import ZoomControls from './ZoomControls';
import ModeSelector from './ModeSelector';
import FamilyNode from './FamilyNode';
import FamilyEdge from './FamilyEdge';
import NodeActionsModal from '../modals/NodeActionsModal';
import PartnerSelectionModal from '../modals/PartnerSelectionModal';
import LinkTypeSelectionModal from '../modals/LinkTypeSelectionModal';
import LinkTypesManagerModal from '../modals/LinkTypesManagerModal';
import FamilyGroupsModal from '../modals/FamilyGroupsModal';
import Input from '../common/Input';

const ATOMIC_FILTER_MODES = [
  { value: 'all', label: 'Mostrar todo', shortLabel: 'Todo', icon: Users },
  { value: 'ancestors', label: 'Ascendientes', shortLabel: 'Asc.', icon: ArrowUp },
  { value: 'descendants', label: 'Descendientes', shortLabel: 'Desc.', icon: ArrowDown },
  { value: 'lineage', label: 'Linaje', shortLabel: 'Linaje', icon: GitBranch },
];
const FIT_TO_SCREEN_DELAY = 100;

export default function AtomicCanvas({
  username,
  nodes,
  edges,
  customLinkTypes,
  familyGroups,
  treeService,
  exportService,
  undoService,
  onSave,
  onLogout,
  onModeChange,
}) {
  const [actionsModal, setActionsModal] = useState({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  const [actionsModalKey, setActionsModalKey] = useState(0);
  const [partnerSelection, setPartnerSelection] = useState(null);
  const [focusNodeId, setFocusNodeId] = useState(() => nodes[0]?.id || null);
  const [selectedNodeId, setSelectedNodeId] = useState(() => nodes[0]?.id || null);
  const [atomicFilterMode, setAtomicFilterMode] = useState('all');
  const [linkTypesModalOpen, setLinkTypesModalOpen] = useState(false);
  const [familyGroupsModalOpen, setFamilyGroupsModalOpen] = useState(false);

  // Linking mode state
  const [linkingMode, setLinkingMode] = useState(null);
  const [linkTarget, setLinkTarget] = useState(null);

  const atomsRef = useRef([]);
  const nucleiParentsRef = useRef(new Set());

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

  // Detectar núcleos familiares
  useEffect(() => {
    nucleiParentsRef.current = detectFamilyNucleiParents(nodes, edges);
  }, [nodes, edges]);

  // Construir átomos automáticamente
  useEffect(() => {
    atomsRef.current = buildAutoFamilyAtoms(nodes, edges);
  }, [nodes, edges]);

  // Calcular nódosvisibles según filtro
  const visibleNodeIds = useMemo(() => {
    const filtered = filterAtomicNodes(nodes, edges, focusNodeId, atomicFilterMode);

    if (atomicFilterMode === 'lineage') {
      const lineageData = buildAtomicLineage(nodes, edges, focusNodeId);
      return lineageData.all;
    }

    return filtered;
  }, [nodes, edges, focusNodeId, atomicFilterMode]);

  // Construir nódosrepresentantes de átomos
  const atomRepresentatives = useMemo(() => {
    const map = new Map();
    atomsRef.current.forEach(atom => {
      const representative = getAtomRepresentativeNode(atom, nodes);
      if (representative) {
        map.set(atom.id, representative);

        // Agregar referencia al mapa de nódospara renderizado
        representative.isAtomicNode = true;
        representative.atomData = atom;
      }
    });
    return map;
  }, [nodes]);

  // Renderizar nódosfinales (nódosiniciales o átomos colapsados)
  const renderedNodes = useMemo(() => {
    const result = [];
    const atomMembersSet = new Set();

    atomsRef.current.forEach(atom => {
      atom.nodeIds.forEach(id => atomMembersSet.add(id));
    });

    // Agregar átomos
    atomRepresentatives.forEach(representative => {
      if (visibleNodeIds.has(representative.id)) {
        result.push(representative);
      }
    });

    // Agregar nódosque NO están en átomos
    nodes.forEach(node => {
      if (!atomMembersSet.has(node.id) && visibleNodeIds.has(node.id)) {
        result.push(node);
      }
    });

    return result;
  }, [nodes, atomRepresentatives, visibleNodeIds]);

  // Renderizar aristas
  const renderedEdges = useMemo(() => {
    const result = [];
    const nodeMap = new Map(renderedNodes.map(n => [n.id, n]));
    const dedupe = new Set();

    edges.forEach(edge => {
      // No renderizar aristas internas de átomos
      if (
        nodeMap.has(edge.from) && nodeMap.has(edge.to) &&
        nodeMap.get(edge.from)?.isAtomicNode && nodeMap.get(edge.to)?.isAtomicNode
      ) {
        return;
      }

      // No renderizar aristas dentro de un mismo átomo
      const fromAtom = atomsRef.current.find(a => a.nodeIds.includes(edge.from));
      const toAtom = atomsRef.current.find(a => a.nodeIds.includes(edge.to));
      if (fromAtom && toAtom && fromAtom.id === toAtom.id) {
        return;
      }

      const key = `${edge.from}-${edge.to}`;
      if (dedupe.has(key)) return;
      dedupe.add(key);

      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);

      if (fromNode && toNode) {
        result.push({
          ...edge,
          fromNode,
          toNode,
          sourceNodeId: edge.from,
          styleColor: edge.type === 'parent' ? '#111827' : '#9ca3af',
          styleDash: isBrokenLabel(edge.label) ? '6,4' : '0',
        });
      }
    });

    return result;
  }, [renderedNodes, edges]);

  const handleCenterCurrentView = useCallback(() => {
    fitToScreen(renderedNodes.length > 0 ? renderedNodes : nodes);
  }, [renderedNodes, nodes, fitToScreen]);

  // Initialize view on mount
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => fitToScreen(nodes), FIT_TO_SCREEN_DELAY);
      return () => clearTimeout(timer);
    }
    setTransform({ x: window.innerWidth / 2, y: window.innerHeight / 2, k: 1 });
  }, []);

  useEffect(() => {
    if (!focusNodeId || renderedNodes.length === 0) return;
    const timer = setTimeout(() => fitToScreen(renderedNodes), FIT_TO_SCREEN_DELAY);
    return () => clearTimeout(timer);
  }, [focusNodeId, atomicFilterMode, renderedNodes, fitToScreen]);

  useEffect(() => {
    if (nodes.length === 0) return;
    const hasNode = (nodeId) => Boolean(nodeId) && nodes.some(node => node.id === nodeId);
    if (!hasNode(selectedNodeId)) setSelectedNodeId(nodes[0].id);
    if (!hasNode(focusNodeId)) setFocusNodeId(nodes[0].id);
  }, [nodes, selectedNodeId, focusNodeId]);

  const nodeMovementStateRef = useRef({ savedForCurrentDrag: false });

  const saveAndUpdate = useCallback((newNodes, newEdges, newCustomLinkTypes, newFamilyGroups) => {
    onSave(newNodes, newEdges, newCustomLinkTypes || customLinkTypes, newFamilyGroups || familyGroups);
  }, [onSave, customLinkTypes, familyGroups]);

  const saveAndUpdateWithUndo = useCallback((newNodes, newEdges) => {
    if (!nodeMovementStateRef.current.savedForCurrentDrag) {
      undoService.saveState(nodes, edges, customLinkTypes, familyGroups);
      nodeMovementStateRef.current.savedForCurrentDrag = true;
    }
    saveAndUpdate(newNodes, newEdges);
  }, [nodes, edges, customLinkTypes, familyGroups, saveAndUpdate, undoService]);

  const handleDragEnd = useCallback(() => {
    nodeMovementStateRef.current.savedForCurrentDrag = false;
  }, []);

  const openActionsModal = useCallback((nodeId, initialTab = null, expandedEdgeId = null) => {
    setActionsModal({ isOpen: true, nodeId, initialTab, expandedEdgeId });
    setActionsModalKey(k => k + 1);
  }, []);

  const closeActionsModal = useCallback(() => {
    setActionsModal({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  }, []);

  const handleSelectNode = useCallback((nodeId) => {
    setSelectedNodeId(nodeId);
    setFocusNodeId(nodeId);
  }, []);

  const handleMouseUpCallback = useCallback(() => {
    handleDragEnd();
    handleMouseUp(() => saveAndUpdate(nodes, edges), handleSelectNode);
  }, [handleDragEnd, handleMouseUp, nodes, edges, saveAndUpdate, handleSelectNode]);

  const handleTouchEndCallback = useCallback(() => {
    handleDragEnd();
    handleTouchEnd(() => saveAndUpdate(nodes, edges), handleSelectNode);
  }, [handleDragEnd, handleTouchEnd, nodes, edges, saveAndUpdate, handleSelectNode]);

  const actionsModalNode = useMemo(() => {
    const atomicNode = atomRepresentatives.get(actionsModal.nodeId);
    if (atomicNode) return atomicNode;
    return nodes.find(n => n.id === actionsModal.nodeId);
  }, [nodes, actionsModal.nodeId, atomRepresentatives]);

  const handleExport = useCallback(() => {
    exportService.exportTree(username, nodes, edges, customLinkTypes, familyGroups);
  }, [username, nodes, edges, customLinkTypes, familyGroups, exportService]);

  const handleSnapshot = useCallback(() => {
    downloadTreeSnapshot(username, nodes, edges);
  }, [username, nodes, edges]);

  const handleUndo = useCallback(() => {
    const previousState = undoService.undo();
    if (!previousState) return;
    saveAndUpdate(previousState.nodes, previousState.edges, previousState.customLinkTypes, previousState.familyGroups || []);
    setTimeout(() => fitToScreen(previousState.nodes), FIT_TO_SCREEN_DELAY);
  }, [undoService, saveAndUpdate, fitToScreen]);

  const canUndo = useMemo(() => undoService.canUndo(), [undoService, nodes, edges, familyGroups]);

  const handleFilterChange = useCallback((nextFilter) => {
    setAtomicFilterMode(nextFilter);
  }, []);

  const handleNodePointerDownWrapped = useCallback((e, nodeId) => {
    const isSyntheticMouseAfterTouch = (
      e.type === 'mousedown'
      && Date.now() - stateRef.current.lastTouchEndTime < 500
    );
    if (isSyntheticMouseAfterTouch) return;

    if (linkingMode) {
      e.stopPropagation();
      e.preventDefault();
      setLinkTarget(nodeId);
      return;
    }

    handleNodePointerDown(e, nodeId, nodes);
  }, [linkingMode, handleNodePointerDown, nodes, stateRef]);

  const enterLinkingMode = useCallback((sourceId) => {
    closeActionsModal();
    setLinkingMode({ sourceId });
    setLinkTarget(null);
  }, [closeActionsModal]);

  const cancelLinkingMode = useCallback(() => {
    setLinkingMode(null);
    setLinkTarget(null);
  }, []);

  const handleLinkTypeChosen = useCallback((linkType) => {
    if (!linkingMode || !linkTarget) return;
    const newEdges = treeService.linkNodes(edges, linkingMode.sourceId, linkTarget, linkType, undefined, customLinkTypes);
    saveAndUpdate(nodes, newEdges);
    setLinkingMode(null);
    setLinkTarget(null);
  }, [linkingMode, linkTarget, edges, nodes, customLinkTypes, treeService, saveAndUpdate]);

  const sourceNodeForLink = useMemo(
    () => linkingMode ? nodes.find(n => n.id === linkingMode.sourceId) : null,
    [linkingMode, nodes],
  );

  const targetNodeForLink = useMemo(
    () => linkTarget ? nodes.find(n => n.id === linkTarget) : null,
    [linkTarget, nodes],
  );

  const handleSaveCustomLinkTypes = useCallback((nextCustomLinkTypes) => {
    const syncedEdges = treeService.syncCustomLinkEdges(edges, nextCustomLinkTypes);
    saveAndUpdate(nodes, syncedEdges, nextCustomLinkTypes);
    setLinkTypesModalOpen(false);
  }, [treeService, edges, nodes, saveAndUpdate]);

  return (
    <div
      className="h-screen w-screen bg-[#F3F0EB] overflow-hidden relative font-sans text-gray-700 selection:bg-orange-200 touch-none"
      ref={canvasRef}
      onMouseDown={(e) => {
        handleMouseDown(e, transform);
      }}
      onMouseMove={(e) => handleMouseMove(e, nodes, (n) => saveAndUpdateWithUndo(n, edges), transform)}
      onMouseUp={handleMouseUpCallback}
      onMouseLeave={handleMouseUpCallback}
      onWheel={handleWheel}
      onTouchStart={(e) => {
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
        onManageLinkTypes={() => setLinkTypesModalOpen(true)}
        onOpenFamilyGroups={() => setFamilyGroupsModalOpen(true)}
        hasFamilyGroups={false}
        onExport={handleExport}
        onSnapshot={handleSnapshot}
        onLogout={onLogout}
        onUndo={handleUndo}
        canUndo={canUndo}
        viewMode={atomicFilterMode}
        onChangeViewMode={handleFilterChange}
        viewModeOptions={ATOMIC_FILTER_MODES}
        focusedNodeName={nodes.find(n => n.id === focusNodeId) ? `${nodes.find(n => n.id === focusNodeId)?.data?.firstName} ${nodes.find(n => n.id === focusNodeId)?.data?.lastName}`.trim() : ''}
      />

      <ZoomControls onZoomIn={zoomIn} onZoomOut={zoomOut} />

      <ModeSelector currentMode="atomic" onModeChange={onModeChange} />

      <svg
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0',
        }}
      >
        {renderedEdges.map(edge => (
          <FamilyEdge
            key={edge.id}
            edge={edge}
            isHighlighted={false}
            styleColor={edge.styleColor}
            styleDash={edge.styleDash}
          />
        ))}
      </svg>

      <svg
        className="absolute inset-0 pointer-events-auto"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
          transformOrigin: '0 0',
        }}
        onClick={(e) => {
          // Click en el fondo del SVG cierra modales
          if (e.target === e.currentTarget) {
            setSelectedNodeId(null);
          }
        }}
      >
        <g>
          {renderedNodes.map(node => (
            <g
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNodeId(node.id);
                openActionsModal(node.id);
              }}
            >
              <FamilyNode
                node={node}
                isSelected={node.id === selectedNodeId}
                isDimmed={false}
                isLinkTarget={linkingMode && node.id === linkTarget}
                isGroupMemberHighlighted={false}
                groupHighlightColor={undefined}
                defaultGroupColor={undefined}
                onPointerDown={(e, id) => handleNodePointerDownWrapped(e, id)}
                isAtom={node.isAtomicNode}
                zoom={transform.k}
              />
            </g>
          ))}
        </g>
      </svg>

      <NodeActionsModal
        key={actionsModalKey}
        node={actionsModalNode}
        isOpen={actionsModal.isOpen}
        onClose={closeActionsModal}
        onAction={() => {}}
        onSaveEdit={() => {}}
        nodes={nodes}
        edges={edges}
        onUpdateLink={() => {}}
        onDeleteLink={() => {}}
        initialTab={actionsModal.initialTab}
        initialExpandedEdgeId={actionsModal.expandedEdgeId}
        hasParents={false}
        hasSpouse={false}
        hasChildren={false}
        lineageAncestorMode={false}
        allowGroupChildrenAction={false}
      />

      {linkTypesModalOpen && (
        <LinkTypesManagerModal
          isOpen={linkTypesModalOpen}
          initialLinkTypes={customLinkTypes}
          onClose={() => setLinkTypesModalOpen(false)}
          onSave={handleSaveCustomLinkTypes}
        />
      )}

      {/* Linking mode banner */}
      {linkingMode && !linkTarget && (
        <div className="absolute top-16 md:top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-green-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3">
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
    </div>
  );
}
