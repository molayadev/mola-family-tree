import { describe, it, expect, vi } from 'vitest';
import { NODE_ACTION_STRATEGIES, dispatchNodeAction } from '../nodeActionStrategies';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const makeNode = (id) => ({ id, x: 0, y: 0, data: { firstName: id, lastName: '' } });
const parentEdge = (from, to) => ({ id: `${from}-${to}`, from, to, type: 'parent' });
const spouseEdge = (from, to) => ({ id: `${from}-${to}`, from, to, type: 'spouse' });

const makeCtx = (overrides = {}) => ({
  nodeId: 'src',
  sourceNode: makeNode('src'),
  nodes: [makeNode('src'), makeNode('other')],
  edges: [],
  customLinkTypes: [],
  normalizedFamilyGroups: [],
  treeService: {
    hasParents: vi.fn(() => false),
    addParents: vi.fn(() => ({ nodes: [makeNode('mom'), makeNode('dad')], edges: [] })),
    getPartners: vi.fn(() => []),
    hasSpouse: vi.fn(() => false),
    deleteNode: vi.fn(() => ({ nodes: [], edges: [] })),
    hasChild: vi.fn(() => false),
  },
  undoService: { saveState: vi.fn() },
  saveAndUpdate: vi.fn(),
  closeActionsModal: vi.fn(),
  enterLinkingMode: vi.fn(),
  setPartnerSelection: vi.fn(),
  setHighlightedGroupId: vi.fn(),
  focusVisibleNodes: vi.fn(),
  keepNodesInViewport: vi.fn(),
  FIT_TO_SCREEN_DELAY: 0,
  ...overrides,
});

// ── NODE_ACTION_STRATEGIES structure ──────────────────────────────────────────
describe('NODE_ACTION_STRATEGIES', () => {
  it('has all expected action keys', () => {
    const expected = ['add_parents', 'add_child', 'add_spouse', 'add_ex_spouse', 'delete', 'group_children', 'link'];
    expected.forEach(key => expect(NODE_ACTION_STRATEGIES).toHaveProperty(key));
  });

  it('each strategy has an execute function', () => {
    Object.values(NODE_ACTION_STRATEGIES).forEach(strategy => {
      expect(typeof strategy.execute).toBe('function');
    });
  });
});

// ── dispatchNodeAction: unknown action ────────────────────────────────────────
describe('dispatchNodeAction – unknown action', () => {
  it('logs a warning and does not throw', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const ctx = makeCtx();
    expect(() => dispatchNodeAction('nonexistent_action', ctx)).not.toThrow();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('nonexistent_action'));
    expect(ctx.saveAndUpdate).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ── add_parents ───────────────────────────────────────────────────────────────
describe('dispatchNodeAction – add_parents', () => {
  it('calls treeService.addParents and saves state', () => {
    const ctx = makeCtx();
    dispatchNodeAction('add_parents', ctx);
    expect(ctx.undoService.saveState).toHaveBeenCalled();
    expect(ctx.treeService.addParents).toHaveBeenCalled();
    expect(ctx.saveAndUpdate).toHaveBeenCalled();
    expect(ctx.closeActionsModal).toHaveBeenCalled();
  });

  it('does nothing when node already has parents', () => {
    const ctx = makeCtx({ treeService: { ...makeCtx().treeService, hasParents: vi.fn(() => true) } });
    dispatchNodeAction('add_parents', ctx);
    expect(ctx.treeService.addParents).not.toHaveBeenCalled();
  });
});

// ── add_child ─────────────────────────────────────────────────────────────────
describe('dispatchNodeAction – add_child', () => {
  it('calls setPartnerSelection with mode=child', () => {
    const ctx = makeCtx();
    dispatchNodeAction('add_child', ctx);
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(expect.objectContaining({ mode: 'child', sourceId: 'src' }));
    expect(ctx.closeActionsModal).toHaveBeenCalled();
  });

  it('lists partners first in options', () => {
    const ctx = makeCtx({
      treeService: { ...makeCtx().treeService, getPartners: vi.fn(() => ['other']) },
    });
    dispatchNodeAction('add_child', ctx);
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(
      expect.objectContaining({ preferredOptionIds: ['other'] }),
    );
  });
});

// ── add_spouse ────────────────────────────────────────────────────────────────
describe('dispatchNodeAction – add_spouse', () => {
  it('calls setPartnerSelection with mode=spouse', () => {
    const ctx = makeCtx();
    dispatchNodeAction('add_spouse', ctx);
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(expect.objectContaining({ mode: 'spouse' }));
  });

  it('does nothing when node already has a spouse', () => {
    const ctx = makeCtx({ treeService: { ...makeCtx().treeService, hasSpouse: vi.fn(() => true) } });
    dispatchNodeAction('add_spouse', ctx);
    expect(ctx.setPartnerSelection).not.toHaveBeenCalled();
  });
});

// ── add_ex_spouse ─────────────────────────────────────────────────────────────
describe('dispatchNodeAction – add_ex_spouse', () => {
  it('calls setPartnerSelection with mode=ex_spouse', () => {
    const ctx = makeCtx();
    dispatchNodeAction('add_ex_spouse', ctx);
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(expect.objectContaining({ mode: 'ex_spouse' }));
  });
});

// ── delete ────────────────────────────────────────────────────────────────────
describe('dispatchNodeAction – delete', () => {
  it('saves undo state and deletes the node', () => {
    const ctx = makeCtx();
    dispatchNodeAction('delete', ctx);
    expect(ctx.undoService.saveState).toHaveBeenCalled();
    expect(ctx.treeService.deleteNode).toHaveBeenCalledWith(ctx.nodes, ctx.edges, 'src');
    expect(ctx.saveAndUpdate).toHaveBeenCalled();
    expect(ctx.closeActionsModal).toHaveBeenCalled();
  });
});

// ── group_children ────────────────────────────────────────────────────────────
describe('dispatchNodeAction – group_children', () => {
  it('does nothing when node has no children', () => {
    const ctx = makeCtx({ edges: [] });
    dispatchNodeAction('group_children', ctx);
    expect(ctx.undoService.saveState).not.toHaveBeenCalled();
  });

  it('creates a new group for children', () => {
    const ctx = makeCtx({
      edges: [parentEdge('src', 'other')],
      nodes: [makeNode('src'), makeNode('other')],
    });
    dispatchNodeAction('group_children', ctx);
    expect(ctx.undoService.saveState).toHaveBeenCalled();
    expect(ctx.saveAndUpdate).toHaveBeenCalled();
    expect(ctx.setHighlightedGroupId).toHaveBeenCalled();
    expect(ctx.closeActionsModal).toHaveBeenCalled();
    const [,,,groups] = ctx.saveAndUpdate.mock.calls[0];
    expect(groups[0].nodeIds).toContain('other');
  });

  it('collapses existing group when children already grouped', () => {
    const existingGroup = { id: 'g1', label: 'Hijos', emoji: '👶', color: '#fff', nodeIds: ['other'], collapsed: false };
    const ctx = makeCtx({
      edges: [parentEdge('src', 'other')],
      nodes: [makeNode('src'), makeNode('other')],
      normalizedFamilyGroups: [existingGroup],
    });
    dispatchNodeAction('group_children', ctx);
    const [,,,groups] = ctx.saveAndUpdate.mock.calls[0];
    expect(groups[0].collapsed).toBe(true);
  });
});

// ── link ──────────────────────────────────────────────────────────────────────
describe('dispatchNodeAction – link', () => {
  it('calls enterLinkingMode with the nodeId', () => {
    const ctx = makeCtx();
    dispatchNodeAction('link', ctx);
    expect(ctx.enterLinkingMode).toHaveBeenCalledWith('src');
  });
});
