import { useState, useCallback } from 'react';
import { dispatchPartnerAction } from '../../domain/config/partnerActionStrategies';

const FIT_TO_SCREEN_DELAY = 100;

/**
 * usePartnerSelection
 *
 * Manages the partner-selection modal used when adding a child, spouse, or
 * ex-spouse. Uses the PARTNER_ACTION_STRATEGIES for the actual operations.
 */
export function usePartnerSelection({
  nodes,
  edges,
  customLinkTypes,
  normalizedFamilyGroups,
  treeService,
  undoService,
  saveAndUpdate,
  setFocusNodeId,
  keepNodesInViewport,
}) {
  const [partnerSelection, setPartnerSelection] = useState(null);

  const handleSelectPartnerAction = useCallback((selectionValue) => {
    if (!partnerSelection) return;
    const { sourceId, mode } = partnerSelection;
    const sourceNode = nodes.find(node => node.id === sourceId);
    if (!sourceNode) {
      setPartnerSelection(null);
      return;
    }

    dispatchPartnerAction(mode, selectionValue, {
      sourceId,
      sourceNode,
      nodes,
      edges,
      customLinkTypes,
      normalizedFamilyGroups,
      treeService,
      undoService,
      saveAndUpdate,
      setFocusNodeId,
      setPartnerSelection,
      keepNodesInViewport,
      FIT_TO_SCREEN_DELAY,
    });
  }, [
    partnerSelection,
    nodes,
    edges,
    customLinkTypes,
    normalizedFamilyGroups,
    treeService,
    undoService,
    saveAndUpdate,
    setFocusNodeId,
    keepNodesInViewport,
  ]);

  return {
    partnerSelection,
    setPartnerSelection,
    handleSelectPartnerAction,
  };
}
