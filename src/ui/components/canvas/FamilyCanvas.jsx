import { useState, useEffect, useMemo, useCallback } from 'react';
import { Move } from 'lucide-react';
import { useCanvas } from '../../../application/hooks/useCanvas';
import CanvasHUD from './CanvasHUD';
import ZoomControls from './ZoomControls';
import FamilyNode from './FamilyNode';
import FamilyEdge from './FamilyEdge';
import NodeActionsModal from '../modals/NodeActionsModal';
import PartnerSelectionModal from '../modals/PartnerSelectionModal';

export default function FamilyCanvas({ username, nodes, edges, treeService, exportService, onSave, onLogout }) {
  const [actionsModal, setActionsModal] = useState({ isOpen: false, nodeId: null, initialTab: null, expandedEdgeId: null });
  const [actionsModalKey, setActionsModalKey] = useState(0);
  const [partnerSelection, setPartnerSelection] = useState(null);

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

  const handleNodeAction = useCallback((action) => {
    const nodeId = actionsModal.nodeId;
    if (!nodeId) return;

    const sourceNode = nodes.find(n => n.id === nodeId);

    if (action === 'add_parents') {
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
    }
  }, [actionsModal.nodeId, nodes, edges, treeService, saveAndUpdate, fitToScreen, confirmAddChild, closeActionsModal]);

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

  const actionsModalNode = useMemo(() => nodes.find(n => n.id === actionsModal.nodeId), [nodes, actionsModal.nodeId]);

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
        onFitToScreen={() => fitToScreen(nodes)}
        onExport={handleExport}
        onLogout={onLogout}
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
      />

      <PartnerSelectionModal
        selection={partnerSelection}
        nodes={nodes}
        onClose={() => setPartnerSelection(null)}
        onSelect={(partnerId) => confirmAddChild(partnerSelection.sourceId, partnerId)}
      />

      <svg className="w-full h-full pointer-events-none">
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          {edges.map(edge => {
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

          {nodes.map(node => (
            <FamilyNode
              key={node.id}
              node={node}
              isSelected={actionsModal.nodeId === node.id}
              onPointerDown={(e, id) => handleNodePointerDown(e, id, nodes)}
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
