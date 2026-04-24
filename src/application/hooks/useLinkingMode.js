import { useState, useCallback } from 'react';

/**
 * useLinkingMode
 *
 * Manages the two-step manual node-linking flow:
 *   1. User triggers "Link" → linking mode is activated with a source node.
 *   2. User taps a target node → LinkTypeSelectionModal appears.
 *   3. User picks a link type → edge is created.
 */
export function useLinkingMode({
  nodes,
  edges,
  customLinkTypes,
  treeService,
  saveAndUpdate,
  closeActionsModal,
}) {
  const [linkingMode, setLinkingMode] = useState(null); // { sourceId } | null
  const [linkTarget, setLinkTarget] = useState(null);   // target nodeId | null

  const enterLinkingMode = useCallback((sourceId) => {
    closeActionsModal();
    setLinkingMode({ sourceId });
    setLinkTarget(null);
  }, [closeActionsModal]);

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

  return {
    linkingMode,
    linkTarget,
    setLinkTarget,
    enterLinkingMode,
    cancelLinkingMode,
    handleLinkTargetSelected,
    handleLinkTypeChosen,
  };
}
