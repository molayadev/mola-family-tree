import { useState, useEffect, useMemo, useCallback } from 'react';
import { Move } from 'lucide-react';
import { useCanvas } from '../../../application/hooks/useCanvas';
import CanvasHUD from './CanvasHUD';
import ZoomControls from './ZoomControls';
import RadialMenu from './RadialMenu';
import FamilyNode from './FamilyNode';
import FamilyEdge from './FamilyEdge';
import EditModal from '../modals/EditModal';
import LinksModal from '../modals/LinksModal';
import PartnerSelectionModal from '../modals/PartnerSelectionModal';

export default function FamilyCanvas({ username, nodes, edges, treeService, exportService, onSave, onLogout }) {
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [linksModalState, setLinksModalState] = useState({ isOpen: false, nodeId: null, expandedEdgeId: null });
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

  const handleLineClick = useCallback((edgeId, sourceNodeId) => {
    setLinksModalState({ isOpen: true, nodeId: sourceNodeId, expandedEdgeId: edgeId });
  }, []);

  const confirmAddChild = useCallback((sourceId, partnerId) => {
    const result = treeService.addChild(nodes, edges, sourceId, partnerId);
    saveAndUpdate(result.nodes, result.edges);
    setPartnerSelection(null);
    setTimeout(() => fitToScreen(result.nodes), 100);
  }, [nodes, edges, treeService, saveAndUpdate, fitToScreen]);

  const handleNodeAction = useCallback((action) => {
    if (!selectedNodeId) return;

    const sourceNode = nodes.find(n => n.id === selectedNodeId);

    if (action === 'add_parents') {
      const result = treeService.addParents(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'add_child') {
      const partners = treeService.getPartners(edges, selectedNodeId);
      if (partners.length > 0) {
        setPartnerSelection({ sourceId: selectedNodeId, partners });
        setSelectedNodeId(null);
        return;
      }
      confirmAddChild(selectedNodeId, null);
      return;
    } else if (action === 'add_spouse') {
      const result = treeService.addSpouse(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'add_ex_spouse') {
      const result = treeService.addExSpouse(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      setTimeout(() => fitToScreen(result.nodes), 100);
    } else if (action === 'manage_links') {
      setLinksModalState({ isOpen: true, nodeId: selectedNodeId, expandedEdgeId: null });
      setSelectedNodeId(null);
      return;
    } else if (action === 'edit') {
      setModalOpen(true);
      return;
    } else if (action === 'delete') {
      if (window.confirm('¿Eliminar a esta persona y sus conexiones?')) {
        const result = treeService.deleteNode(nodes, edges, selectedNodeId);
        saveAndUpdate(result.nodes, result.edges);
        setSelectedNodeId(null);
        setTimeout(() => fitToScreen(result.nodes), 100);
      }
    }
  }, [selectedNodeId, nodes, edges, treeService, saveAndUpdate, fitToScreen, confirmAddChild]);

  const handleUpdateNode = useCallback((nodeId, newData) => {
    const updatedNodes = treeService.updateNode(nodes, nodeId, newData);
    saveAndUpdate(updatedNodes, edges);
    setModalOpen(false);
  }, [nodes, edges, treeService, saveAndUpdate]);

  const handleUpdateLink = useCallback((edgeId, updates) => {
    const result = treeService.updateLink(nodes, edges, edgeId, updates, linksModalState.nodeId);
    saveAndUpdate(result.nodes, result.edges);
  }, [nodes, edges, treeService, linksModalState.nodeId, saveAndUpdate]);

  const handleDeleteLink = useCallback((edgeId) => {
    if (window.confirm('¿Seguro que deseas eliminar este vínculo? (La persona seguirá existiendo en el árbol)')) {
      const newEdges = treeService.deleteLink(edges, edgeId);
      saveAndUpdate(nodes, newEdges);
    }
  }, [nodes, edges, treeService, saveAndUpdate]);

  const handleExport = useCallback(() => {
    exportService.exportTree(username, nodes, edges);
  }, [username, nodes, edges, exportService]);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const menuPos = selectedNode ? {
    x: selectedNode.x * transform.k + transform.x,
    y: selectedNode.y * transform.k + transform.y,
  } : null;

  return (
    <div
      className="h-screen w-screen bg-[#F3F0EB] overflow-hidden relative font-sans text-gray-700 selection:bg-orange-200 touch-none"
      ref={canvasRef}
      onMouseDown={(e) => {
        const r = handleMouseDown(e, transform);
        if (r.clearSelection) setSelectedNodeId(null);
      }}
      onMouseMove={(e) => handleMouseMove(e, nodes, (n) => saveAndUpdate(n, edges), transform)}
      onMouseUp={() => handleMouseUp(() => saveAndUpdate(nodes, edges), setSelectedNodeId)}
      onMouseLeave={() => handleMouseUp(() => saveAndUpdate(nodes, edges), setSelectedNodeId)}
      onWheel={handleWheel}
      onTouchStart={(e) => {
        const r = handleTouchStart(e, transform);
        if (r.clearSelection) setSelectedNodeId(null);
      }}
      onTouchMove={(e) => handleTouchMove(e, nodes, (n) => saveAndUpdate(n, edges), transform)}
      onTouchEnd={() => handleTouchEnd(() => saveAndUpdate(nodes, edges), setSelectedNodeId)}
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

      {selectedNodeId && menuPos && (
        <RadialMenu
          x={menuPos.x}
          y={menuPos.y}
          zoom={transform.k}
          onClose={() => setSelectedNodeId(null)}
          onAction={handleNodeAction}
        />
      )}

      <PartnerSelectionModal
        selection={partnerSelection}
        nodes={nodes}
        onClose={() => setPartnerSelection(null)}
        onSelect={(partnerId) => confirmAddChild(partnerSelection.sourceId, partnerId)}
      />

      <LinksModal
        state={linksModalState}
        onClose={() => setLinksModalState({ isOpen: false, nodeId: null, expandedEdgeId: null })}
        nodes={nodes}
        edges={edges}
        onUpdateLink={handleUpdateLink}
        onDeleteLink={handleDeleteLink}
      />

      <EditModal
        node={nodes.find(n => n.id === selectedNodeId)}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleUpdateNode}
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
              isSelected={selectedNodeId === node.id}
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
