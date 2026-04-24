/**
 * PARTNER_ACTION_STRATEGIES
 *
 * Centralised strategy object for each partner-selection modal mode.
 * Replaces the cascading `if (mode === 'child') ... else if (mode === 'spouse')
 * ...` block inside `handleSelectPartnerAction`.
 *
 * Each strategy receives a context object with all the dependencies it needs
 * and returns either a result or performs the side-effects itself.
 *
 * Shape:
 *   handleNew(ctx)      – called when the user picks "NEW" (create a new node)
 *   handleExisting(ctx) – called when the user picks an existing node id
 */

export const PARTNER_ACTION_STRATEGIES = {
  child: {
    /**
     * User wants to add a brand-new person as the other parent and immediately
     * attach a child to both.
     */
    handleNew({ sourceId, sourceNode, nodes, edges, treeService, saveAndUpdate, undoService, customLinkTypes, normalizedFamilyGroups, setFocusNodeId, setPartnerSelection, keepNodesInViewport, FIT_TO_SCREEN_DELAY }) {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const withPartner = treeService.addSpouse(nodes, edges, sourceNode);
      const createdPartner = withPartner.nodes[withPartner.nodes.length - 1];
      const result = treeService.addChild(
        withPartner.nodes,
        withPartner.edges,
        sourceId,
        createdPartner?.id || null,
      );
      saveAndUpdate(result.nodes, result.edges);
      const createdChild = result.nodes[result.nodes.length - 1];
      const nodesToKeepVisible = [];
      if (createdPartner) nodesToKeepVisible.push(createdPartner);
      if (createdChild) nodesToKeepVisible.push(createdChild);
      setFocusNodeId(createdChild?.id || sourceId);
      setPartnerSelection(null);
      if (nodesToKeepVisible.length > 0) {
        setTimeout(() => keepNodesInViewport(nodesToKeepVisible), FIT_TO_SCREEN_DELAY);
      }
    },

    handleExisting({ sourceId, selectionValue, nodes, edges, treeService, saveAndUpdate, undoService, customLinkTypes, normalizedFamilyGroups, setFocusNodeId, setPartnerSelection, keepNodesInViewport, FIT_TO_SCREEN_DELAY }) {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.addChild(nodes, edges, sourceId, selectionValue);
      saveAndUpdate(result.nodes, result.edges);
      const createdChild = result.nodes[result.nodes.length - 1];
      setPartnerSelection(null);
      if (createdChild) {
        setFocusNodeId(createdChild.id);
        setTimeout(() => keepNodesInViewport([createdChild]), FIT_TO_SCREEN_DELAY);
      }
    },
  },

  spouse: {
    handleNew({ sourceId, sourceNode, nodes, edges, treeService, saveAndUpdate, undoService, customLinkTypes, normalizedFamilyGroups, setFocusNodeId, setPartnerSelection, keepNodesInViewport, FIT_TO_SCREEN_DELAY }) {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.addSpouse(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      const createdSpouse = result.nodes[result.nodes.length - 1];
      setFocusNodeId(createdSpouse?.id || sourceId);
      setPartnerSelection(null);
      if (createdSpouse) setTimeout(() => keepNodesInViewport([createdSpouse]), FIT_TO_SCREEN_DELAY);
    },

    handleExisting({ sourceId, selectionValue, nodes, edges, treeService, saveAndUpdate, undoService, customLinkTypes, normalizedFamilyGroups, setFocusNodeId, setPartnerSelection }) {
      if (!selectionValue) {
        setPartnerSelection(null);
        return;
      }
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.linkPartner(nodes, edges, sourceId, selectionValue, 'Casado/a');
      saveAndUpdate(result.nodes, result.edges);
      setFocusNodeId(selectionValue || sourceId);
      setPartnerSelection(null);
    },
  },

  ex_spouse: {
    handleNew({ sourceId, sourceNode, nodes, edges, treeService, saveAndUpdate, undoService, customLinkTypes, normalizedFamilyGroups, setFocusNodeId, setPartnerSelection, keepNodesInViewport, FIT_TO_SCREEN_DELAY }) {
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.addExSpouse(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      const createdEx = result.nodes[result.nodes.length - 1];
      setFocusNodeId(createdEx?.id || sourceId);
      setPartnerSelection(null);
      if (createdEx) setTimeout(() => keepNodesInViewport([createdEx]), FIT_TO_SCREEN_DELAY);
    },

    handleExisting({ sourceId, selectionValue, nodes, edges, treeService, saveAndUpdate, undoService, customLinkTypes, normalizedFamilyGroups, setFocusNodeId, setPartnerSelection }) {
      if (!selectionValue) {
        setPartnerSelection(null);
        return;
      }
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.linkPartner(nodes, edges, sourceId, selectionValue, 'Divorciado');
      saveAndUpdate(result.nodes, result.edges);
      setFocusNodeId(selectionValue || sourceId);
      setPartnerSelection(null);
    },
  },
};

/**
 * Dispatch a partner-selection action using the strategy pattern.
 * Falls back silently if the mode is unknown.
 *
 * @param {string} mode   – 'child' | 'spouse' | 'ex_spouse'
 * @param {string} value  – selected node id or 'NEW'
 * @param {object} ctx    – all dependencies needed by the strategy methods
 */
export const dispatchPartnerAction = (mode, value, ctx) => {
  const strategy = PARTNER_ACTION_STRATEGIES[mode];
  if (!strategy) return;

  if (value === 'NEW') {
    strategy.handleNew(ctx);
  } else {
    strategy.handleExisting({ ...ctx, selectionValue: value });
  }
};
