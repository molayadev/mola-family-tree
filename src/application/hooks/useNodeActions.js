import { useCallback } from 'react';
import { generateId } from '../../domain/entities/Node';

/**
 * useNodeActions
 *
 * Encapsulates all node-level operations triggered from the NodeActionsModal:
 * add parents, add child, add spouse, add ex-spouse, delete, group children,
 * enter link mode, update node data, update/delete links.
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

    if (action === 'add_parents') {
      if (treeService.hasParents(edges, nodeId)) return;
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.addParents(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      const createdParents = result.nodes.slice(-2);
      if (createdParents.length > 0) setTimeout(() => keepNodesInViewport(createdParents), FIT_TO_SCREEN_DELAY);
      return;
    }

    if (action === 'add_child') {
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
    }

    if (action === 'add_spouse') {
      if (treeService.hasSpouse(edges, nodeId)) return;
      const partnerSet = new Set(treeService.getPartners(edges, nodeId));
      const options = nodes
        .filter(node => node.id !== nodeId && !partnerSet.has(node.id))
        .map(node => node.id);
      setPartnerSelection({ mode: 'spouse', sourceId: nodeId, options });
      closeActionsModal();
      return;
    }

    if (action === 'add_ex_spouse') {
      const options = nodes
        .filter(node => node.id !== nodeId)
        .map(node => node.id);
      setPartnerSelection({ mode: 'ex_spouse', sourceId: nodeId, options });
      closeActionsModal();
      return;
    }

    if (action === 'delete') {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.deleteNode(nodes, edges, nodeId);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      return;
    }

    if (action === 'group_children') {
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
      return;
    }

    if (action === 'link') {
      enterLinkingMode(nodeId);
    }
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
