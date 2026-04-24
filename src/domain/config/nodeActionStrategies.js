import { generateId } from '../entities/Node';

/**
 * NODE_ACTION_STRATEGIES
 *
 * Strategy pattern for node actions triggered from NodeActionsModal.
 * Each key corresponds to an action string and exposes an `execute(ctx)`
 * function that carries out the action using a context object.
 *
 * Adding a new action requires only adding a new key here — no if/else
 * chains or switch statements needed anywhere in the codebase.
 *
 * Context shape (ctx):
 *   nodeId                  – id of the node being acted upon
 *   sourceNode              – full node object
 *   nodes, edges            – current graph data
 *   customLinkTypes         – custom link type definitions
 *   normalizedFamilyGroups  – current family groups (normalised)
 *   treeService             – domain service
 *   undoService             – undo/redo service
 *   saveAndUpdate           – persists updated graph data
 *   closeActionsModal       – closes the actions modal
 *   enterLinkingMode        – activates linking mode for nodeId
 *   setPartnerSelection     – opens partner-selection UI
 *   setHighlightedGroupId   – highlights a group on the canvas
 *   focusVisibleNodes       – re-centres visible nodes in viewport
 *   keepNodesInViewport     – keeps a set of nodes visible
 *   FIT_TO_SCREEN_DELAY     – debounce delay for fit-to-screen
 */
export const NODE_ACTION_STRATEGIES = {
  add_parents: {
    execute(ctx) {
      const { nodeId, sourceNode, nodes, edges, customLinkTypes, normalizedFamilyGroups, treeService, undoService, saveAndUpdate, closeActionsModal, keepNodesInViewport, FIT_TO_SCREEN_DELAY } = ctx;
      if (treeService.hasParents(edges, nodeId)) return;
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.addParents(nodes, edges, sourceNode);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
      const createdParents = result.nodes.slice(-2);
      if (createdParents.length > 0) {
        setTimeout(() => keepNodesInViewport(createdParents), FIT_TO_SCREEN_DELAY);
      }
    },
  },

  add_child: {
    execute(ctx) {
      const { nodeId, nodes, edges, treeService, setPartnerSelection, closeActionsModal } = ctx;
      const partners = treeService.getPartners(edges, nodeId);
      const partnerSet = new Set(partners);
      const candidates = [...new Set(nodes.filter(n => n.id !== nodeId).map(n => n.id))];
      const orderedCandidates = [...partners, ...candidates.filter(id => !partnerSet.has(id))];
      setPartnerSelection({ mode: 'child', sourceId: nodeId, preferredOptionIds: partners, options: orderedCandidates });
      closeActionsModal();
    },
  },

  add_spouse: {
    execute(ctx) {
      const { nodeId, nodes, edges, treeService, setPartnerSelection, closeActionsModal } = ctx;
      if (treeService.hasSpouse(edges, nodeId)) return;
      const partnerSet = new Set(treeService.getPartners(edges, nodeId));
      const options = nodes.filter(n => n.id !== nodeId && !partnerSet.has(n.id)).map(n => n.id);
      setPartnerSelection({ mode: 'spouse', sourceId: nodeId, options });
      closeActionsModal();
    },
  },

  add_ex_spouse: {
    execute(ctx) {
      const { nodeId, nodes, setPartnerSelection, closeActionsModal } = ctx;
      const options = nodes.filter(n => n.id !== nodeId).map(n => n.id);
      setPartnerSelection({ mode: 'ex_spouse', sourceId: nodeId, options });
      closeActionsModal();
    },
  },

  delete: {
    execute(ctx) {
      const { nodeId, nodes, edges, customLinkTypes, normalizedFamilyGroups, treeService, undoService, saveAndUpdate, closeActionsModal } = ctx;
      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);
      const result = treeService.deleteNode(nodes, edges, nodeId);
      saveAndUpdate(result.nodes, result.edges);
      closeActionsModal();
    },
  },

  group_children: {
    execute(ctx) {
      const { nodeId, sourceNode, nodes, edges, customLinkTypes, normalizedFamilyGroups, undoService, saveAndUpdate, closeActionsModal, setHighlightedGroupId, focusVisibleNodes } = ctx;
      const validNodeIds = new Set(nodes.map(n => n.id));
      const childIds = [...new Set(
        edges
          .filter(e => e.type === 'parent' && e.from === nodeId)
          .map(e => e.to),
      )].filter(id => validNodeIds.has(id));

      if (childIds.length === 0) return;

      const existingGroup = normalizedFamilyGroups.find(g =>
        g.nodeIds.length === childIds.length && childIds.every(id => g.nodeIds.includes(id)),
      );

      undoService.saveState(nodes, edges, customLinkTypes, normalizedFamilyGroups);

      let savedGroupId;
      let nextGroups;

      if (existingGroup) {
        savedGroupId = existingGroup.id;
        nextGroups = normalizedFamilyGroups.map(g =>
          g.id === existingGroup.id ? { ...g, collapsed: true } : g,
        );
      } else {
        savedGroupId = `family-group-${generateId()}`;
        const parentName = `${sourceNode?.data?.firstName || 'Familiar'} ${sourceNode?.data?.lastName || ''}`.trim();
        nextGroups = [
          ...normalizedFamilyGroups,
          { id: savedGroupId, label: `Hijos de ${parentName}`, emoji: '👶', color: '#0EA5E9', nodeIds: childIds, collapsed: true },
        ];
      }

      saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
      setHighlightedGroupId(savedGroupId);
      closeActionsModal();
      focusVisibleNodes(nextGroups);
    },
  },

  link: {
    execute(ctx) {
      const { nodeId, enterLinkingMode } = ctx;
      enterLinkingMode(nodeId);
    },
  },
};

/**
 * Dispatches a node action using the strategy pattern.
 * If the action key is not found, logs a warning without throwing.
 *
 * @param {string} action – action key (e.g. 'add_child', 'delete')
 * @param {object} ctx    – context object (see NODE_ACTION_STRATEGIES jsdoc)
 */
export function dispatchNodeAction(action, ctx) {
  const strategy = NODE_ACTION_STRATEGIES[action];
  if (!strategy) {
    console.warn(`[useNodeActions] action '${action}' not found`);
    return;
  }
  strategy.execute(ctx);
}
