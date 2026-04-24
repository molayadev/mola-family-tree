import { useState, useCallback } from 'react';
import { generateId } from '../../domain/entities/Node';
import { normalizeGroupColor, randomGroupEmoji, randomGroupColor, normalizeFamilyGroups, computeHiddenNodeIds } from '../../domain/utils/groupUtils';

const FIT_TO_SCREEN_DELAY = 100;

/**
 * useGroupActions
 *
 * Manages all family-group state and operations:
 * create, edit, delete, collapse/expand, isolate, highlight, and
 * the canvas group-draft overlay (select-by-tap mode).
 */
export function useGroupActions({
  nodes,
  edges,
  customLinkTypes,
  normalizedFamilyGroups,
  undoService,
  saveAndUpdate,
  fitToScreen,
  lineageVisibility,
}) {
  const [isolatedGroupId, setIsolatedGroupId] = useState(null);
  const [highlightedGroupId, setHighlightedGroupId] = useState(null);
  const [groupDraft, setGroupDraft] = useState(null);
  const [collapsedGroupMenu, setCollapsedGroupMenu] = useState(null);
  const [familyGroupsModalOpen, setFamilyGroupsModalOpen] = useState(false);

  const focusVisibleNodes = useCallback((nextGroups, nextIsolatedGroupId = isolatedGroupId) => {
    const groupHidden = computeHiddenNodeIds(nodes, nextGroups, nextIsolatedGroupId);
    const nextVisible = nodes.filter(node => (
      !groupHidden.has(node.id)
      && lineageVisibility.visibleNodeIds.has(node.id)
    ));
    setTimeout(() => fitToScreen(nextVisible.length > 0 ? nextVisible : nodes), FIT_TO_SCREEN_DELAY);
  }, [nodes, isolatedGroupId, fitToScreen, lineageVisibility.visibleNodeIds]);

  const handleShowOnlyGroup = useCallback((groupId) => {
    const nextIsolated = isolatedGroupId === groupId ? null : groupId;
    const nextGroups = normalizedFamilyGroups.map(group => (
      group.id === groupId ? { ...group, collapsed: false } : group
    ));

    if (nextIsolated === null) {
      setIsolatedGroupId(null);
      focusVisibleNodes(nextGroups, null);
      return;
    }

    setIsolatedGroupId(groupId);
    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    setHighlightedGroupId(groupId);
    focusVisibleNodes(nextGroups, groupId);
  }, [isolatedGroupId, normalizedFamilyGroups, nodes, edges, customLinkTypes, saveAndUpdate, focusVisibleNodes]);

  const handleToggleCollapseGroup = useCallback((groupId) => {
    const nextGroups = normalizedFamilyGroups.map(group => (
      group.id === groupId ? { ...group, collapsed: !group.collapsed } : group
    ));
    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    focusVisibleNodes(nextGroups);
    setCollapsedGroupMenu(null);
  }, [nodes, edges, customLinkTypes, normalizedFamilyGroups, saveAndUpdate, focusVisibleNodes]);

  const handleExpandAllGroups = useCallback(() => {
    const hadCollapsed = normalizedFamilyGroups.some(group => group.collapsed);
    setIsolatedGroupId(null);

    const nextGroups = normalizedFamilyGroups.map(group => ({ ...group, collapsed: false }));
    if (hadCollapsed) {
      saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    }

    setHighlightedGroupId(null);
    focusVisibleNodes(nextGroups, null);
  }, [normalizedFamilyGroups, nodes, edges, customLinkTypes, saveAndUpdate, focusVisibleNodes]);

  const handleStartCreateGroup = useCallback(() => {
    setGroupDraft({
      mode: 'create',
      id: '',
      label: '',
      emoji: randomGroupEmoji(),
      color: randomGroupColor(),
      nodeIds: [],
    });
    setFamilyGroupsModalOpen(false);
    setCollapsedGroupMenu(null);
  }, []);

  const handleStartEditGroup = useCallback((groupId) => {
    const existing = normalizedFamilyGroups.find(group => group.id === groupId);
    if (!existing) return;

    setGroupDraft({
      mode: 'edit',
      id: existing.id,
      label: existing.label,
      emoji: existing.emoji,
      color: normalizeGroupColor(existing.color),
      nodeIds: [...existing.nodeIds],
    });
    setFamilyGroupsModalOpen(false);
    setCollapsedGroupMenu(null);
  }, [normalizedFamilyGroups]);

  const handleSaveGroupDraft = useCallback(() => {
    if (!groupDraft) return;
    if (!groupDraft.label.trim() || groupDraft.nodeIds.length === 0) return;

    let nextGroups;
    let savedGroupId;

    if (groupDraft.mode === 'create') {
      savedGroupId = `family-group-${generateId()}`;
      nextGroups = [
        ...normalizedFamilyGroups,
        {
          id: savedGroupId,
          label: groupDraft.label.trim(),
          emoji: groupDraft.emoji,
          color: normalizeGroupColor(groupDraft.color, randomGroupColor()),
          nodeIds: [...new Set(groupDraft.nodeIds)],
          collapsed: false,
        },
      ];
    } else {
      savedGroupId = groupDraft.id;
      const editedGroup = normalizedFamilyGroups.find(group => group.id === groupDraft.id);
      const editedGroupCurrentColor = normalizeGroupColor(editedGroup?.color);
      nextGroups = normalizedFamilyGroups.map(group => (
        group.id === groupDraft.id
          ? {
            ...group,
            label: groupDraft.label.trim(),
            emoji: groupDraft.emoji,
            color: normalizeGroupColor(groupDraft.color, editedGroupCurrentColor),
            nodeIds: [...new Set(groupDraft.nodeIds)],
          }
          : group
      ));
    }

    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    setHighlightedGroupId(savedGroupId);
    setGroupDraft(null);
    focusVisibleNodes(nextGroups);
  }, [groupDraft, nodes, edges, customLinkTypes, normalizedFamilyGroups, saveAndUpdate, focusVisibleNodes]);

  const handleDeleteGroup = useCallback((groupId) => {
    if (!window.confirm('¿Seguro que deseas eliminar este grupo familiar?')) return;

    const nextGroups = normalizedFamilyGroups.filter(group => group.id !== groupId);

    if (isolatedGroupId === groupId) setIsolatedGroupId(null);
    if (highlightedGroupId === groupId) setHighlightedGroupId(null);

    saveAndUpdate(nodes, edges, customLinkTypes, nextGroups);
    focusVisibleNodes(nextGroups, isolatedGroupId === groupId ? null : isolatedGroupId);
    setCollapsedGroupMenu(null);
  }, [nodes, edges, customLinkTypes, normalizedFamilyGroups, isolatedGroupId, highlightedGroupId, saveAndUpdate, focusVisibleNodes]);

  const handleIdentifyGroupMembers = useCallback((groupId) => {
    setHighlightedGroupId(groupId);
  }, []);

  const handleCancelGroupDraft = useCallback(() => {
    setGroupDraft(null);
  }, []);

  const handleStartEditMembers = useCallback((groupId) => {
    handleStartEditGroup(groupId);
  }, [handleStartEditGroup]);

  const selectGroupFromNode = useCallback((nodeId) => {
    const group = normalizedFamilyGroups.find(item => item.nodeIds.includes(nodeId));
    setHighlightedGroupId(group?.id || null);
  }, [normalizedFamilyGroups]);

  const updateGroupDraftField = useCallback((field, value) => {
    setGroupDraft(prev => (prev ? { ...prev, [field]: value } : prev));
  }, []);

  const toggleGroupDraftNode = useCallback((nodeId) => {
    setGroupDraft((prev) => {
      if (!prev) return prev;
      const isSelected = prev.nodeIds.includes(nodeId);
      return {
        ...prev,
        nodeIds: isSelected ? prev.nodeIds.filter(id => id !== nodeId) : [...prev.nodeIds, nodeId],
      };
    });
  }, []);

  return {
    // State
    isolatedGroupId,
    setIsolatedGroupId,
    highlightedGroupId,
    setHighlightedGroupId,
    groupDraft,
    setGroupDraft,
    collapsedGroupMenu,
    setCollapsedGroupMenu,
    familyGroupsModalOpen,
    setFamilyGroupsModalOpen,
    // Derived helpers
    focusVisibleNodes,
    selectGroupFromNode,
    // Actions
    handleShowOnlyGroup,
    handleToggleCollapseGroup,
    handleExpandAllGroups,
    handleStartCreateGroup,
    handleStartEditGroup,
    handleSaveGroupDraft,
    handleDeleteGroup,
    handleIdentifyGroupMembers,
    handleCancelGroupDraft,
    handleStartEditMembers,
    updateGroupDraftField,
    toggleGroupDraftNode,
  };
}
