import { useState, useRef, useCallback } from 'react';
import { chooseParentWithMotherPriority } from '../../domain/utils/lineageUtils';
import { getViewModeStrategy } from '../../domain/config/viewModeStrategies';

const FIT_TO_SCREEN_DELAY = 100;

/**
 * useViewMode
 *
 * Manages lineage view mode state, relatives-branch-mode filtering, and
 * the pending view-center flag used to defer fit-to-screen after a mode
 * change.
 */
export function useViewMode({ nodes, edges, focusNodeId, selectedNodeId, setFocusNodeId, setSelectedNodeId, parentChoiceByChildId, setParentChoiceByChildId, setOrganizeModalOpen }) {
  const [lineageViewMode, setLineageViewMode] = useState('relatives');
  const [relativesBranchMode, setRelativesBranchModeState] = useState(null);
  const pendingViewCenterRef = useRef(false);

  const handleViewModeChange = useCallback((nextMode) => {
    const strategy = getViewModeStrategy(nextMode);

    if (nextMode === 'all') {
      const firstNodeId = nodes[0]?.id || null;
      if (firstNodeId) {
        setFocusNodeId(firstNodeId);
        setSelectedNodeId(firstNodeId);
      }
      setRelativesBranchModeState(null);
      pendingViewCenterRef.current = true;
      setLineageViewMode(nextMode);
      return;
    }

    if (nextMode !== 'relatives') {
      setRelativesBranchModeState(null);
      if (!strategy.allowOrganize) setOrganizeModalOpen(false);
    }

    const hasNode = (nodeId) => Boolean(nodeId) && nodes.some(node => node.id === nodeId);
    const targetNodeId = hasNode(selectedNodeId)
      ? selectedNodeId
      : (hasNode(focusNodeId) ? focusNodeId : (nodes[0]?.id || null));

    if (targetNodeId) {
      setFocusNodeId(targetNodeId);

      if (nextMode === 'maternal' || nextMode === 'paternal') {
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        const parentIds = [...new Set(
          edges
            .filter(edge => edge.type === 'parent' && edge.to === targetNodeId)
            .map(edge => edge.from)
        )].filter(id => nodeMap.has(id));

        if (parentIds.length > 0) {
          const preferredParent = nextMode === 'maternal'
            ? parentIds.find(id => nodeMap.get(id)?.data?.gender === 'female')
            : parentIds.find(id => nodeMap.get(id)?.data?.gender === 'male');
          const fallbackParent = chooseParentWithMotherPriority(
            parentIds,
            nodeMap,
            parentChoiceByChildId?.[targetNodeId] || null,
          );
          const selectedParent = preferredParent || fallbackParent;
          if (selectedParent) {
            setParentChoiceByChildId(prev => ({ ...prev, [targetNodeId]: selectedParent }));
          }
        }
      }
    }

    pendingViewCenterRef.current = true;
    setLineageViewMode(nextMode);
  }, [
    selectedNodeId,
    focusNodeId,
    nodes,
    edges,
    parentChoiceByChildId,
    setFocusNodeId,
    setSelectedNodeId,
    setRelativesBranchMode,
    setParentChoiceByChildId,
    setOrganizeModalOpen,
  ]);

  return {
    lineageViewMode,
    setLineageViewMode,
    relativesBranchMode,
    setRelativesBranchMode: setRelativesBranchModeState,
    pendingViewCenterRef,
    handleViewModeChange,
  };
}
