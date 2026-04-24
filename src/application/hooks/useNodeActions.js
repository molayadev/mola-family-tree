import { useCallback } from 'react';
import { dispatchNodeAction } from '../../domain/config/nodeActionStrategies';

/**
 * useNodeActions
 *
 * Encapsulates all node-level operations triggered from the NodeActionsModal.
 * Actions are dispatched via NODE_ACTION_STRATEGIES (strategy pattern), so
 * adding a new action only requires a new key in nodeActionStrategies.js –
 * no if/else chains needed here.
 */
export function useNodeActions({
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
}) {
  const handleNodeAction = useCallback((action) => {
    const nodeId = actionsModal.nodeId;
    if (!nodeId) return;

    const sourceNode = nodes.find(n => n.id === nodeId);

    dispatchNodeAction(action, {
      nodeId,
      sourceNode,
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
      setHighlightedGroupId,
      focusVisibleNodes,
      keepNodesInViewport,
      FIT_TO_SCREEN_DELAY,
    });
  }, [
    actionsModal.nodeId,
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
    setHighlightedGroupId,
    focusVisibleNodes,
    keepNodesInViewport,
    FIT_TO_SCREEN_DELAY,
  ]);

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

  return {
    handleNodeAction,
    handleUpdateNode,
    handleUpdateLink,
    handleDeleteLink,
  };
}

