import { describe, it, expect, vi } from 'vitest';
import {
  VIEW_MODE_STRATEGIES,
  VIEW_MODE_OPTIONS,
  getViewModeStrategy,
  modeUsesColumnPositions,
  modeUsesRadialPositions,
  modeAllowsOrganize,
} from '../viewModeStrategies';
import {
  PARTNER_ACTION_STRATEGIES,
  dispatchPartnerAction,
} from '../partnerActionStrategies';

// ── VIEW_MODE_STRATEGIES ─────────────────────────────────────────────────────
describe('VIEW_MODE_STRATEGIES', () => {
  it('has all expected mode keys', () => {
    const expectedKeys = ['relatives', 'ancestors', 'descendants', 'lineage', 'radial', 'all'];
    expectedKeys.forEach(key => {
      expect(VIEW_MODE_STRATEGIES).toHaveProperty(key);
    });
  });

  it('each strategy has required properties', () => {
    Object.values(VIEW_MODE_STRATEGIES).forEach(strategy => {
      expect(strategy).toHaveProperty('value');
      expect(strategy).toHaveProperty('label');
      expect(strategy).toHaveProperty('icon');
      expect(typeof strategy.showPartners).toBe('boolean');
      expect(typeof strategy.showControls).toBe('boolean');
      expect(typeof strategy.usesColumnPositions).toBe('boolean');
      expect(typeof strategy.usesRadialPositions).toBe('boolean');
      expect(typeof strategy.allowOrganize).toBe('boolean');
    });
  });

  it('VIEW_MODE_OPTIONS is an array of all strategies', () => {
    expect(Array.isArray(VIEW_MODE_OPTIONS)).toBe(true);
    expect(VIEW_MODE_OPTIONS.length).toBe(Object.keys(VIEW_MODE_STRATEGIES).length);
  });
});

describe('getViewModeStrategy', () => {
  it('returns the correct strategy for a known mode', () => {
    expect(getViewModeStrategy('relatives').value).toBe('relatives');
    expect(getViewModeStrategy('radial').value).toBe('radial');
  });

  it('falls back to "all" strategy for unknown modes', () => {
    expect(getViewModeStrategy('nonexistent').value).toBe('all');
  });
});

describe('modeUsesColumnPositions', () => {
  it('returns true only for lineage mode', () => {
    expect(modeUsesColumnPositions('lineage')).toBe(true);
    expect(modeUsesColumnPositions('relatives')).toBe(false);
    expect(modeUsesColumnPositions('radial')).toBe(false);
    expect(modeUsesColumnPositions('all')).toBe(false);
  });
});

describe('modeUsesRadialPositions', () => {
  it('returns true only for radial mode', () => {
    expect(modeUsesRadialPositions('radial')).toBe(true);
    expect(modeUsesRadialPositions('lineage')).toBe(false);
    expect(modeUsesRadialPositions('relatives')).toBe(false);
  });
});

describe('modeAllowsOrganize', () => {
  it('returns true for relatives and all', () => {
    expect(modeAllowsOrganize('relatives')).toBe(true);
    expect(modeAllowsOrganize('all')).toBe(true);
  });

  it('returns false for lineage and radial', () => {
    expect(modeAllowsOrganize('lineage')).toBe(false);
    expect(modeAllowsOrganize('radial')).toBe(false);
  });
});

// ── PARTNER_ACTION_STRATEGIES ────────────────────────────────────────────────
describe('PARTNER_ACTION_STRATEGIES', () => {
  it('has strategies for child, spouse and ex_spouse', () => {
    expect(PARTNER_ACTION_STRATEGIES).toHaveProperty('child');
    expect(PARTNER_ACTION_STRATEGIES).toHaveProperty('spouse');
    expect(PARTNER_ACTION_STRATEGIES).toHaveProperty('ex_spouse');
  });

  it('each strategy has handleNew and handleExisting', () => {
    Object.values(PARTNER_ACTION_STRATEGIES).forEach(strategy => {
      expect(typeof strategy.handleNew).toBe('function');
      expect(typeof strategy.handleExisting).toBe('function');
    });
  });
});

describe('dispatchPartnerAction', () => {
  const makeCtx = (overrides = {}) => ({
    sourceId: 'src',
    sourceNode: { id: 'src', data: {} },
    nodes: [],
    edges: [],
    customLinkTypes: [],
    normalizedFamilyGroups: [],
    treeService: {
      addSpouse: vi.fn(() => ({ nodes: [{ id: 'newSpouse' }], edges: [] })),
      addChild: vi.fn(() => ({ nodes: [{ id: 'newChild' }], edges: [] })),
      addExSpouse: vi.fn(() => ({ nodes: [{ id: 'newEx' }], edges: [] })),
      linkPartner: vi.fn(() => ({ nodes: [], edges: [] })),
    },
    undoService: { saveState: vi.fn() },
    saveAndUpdate: vi.fn(),
    setFocusNodeId: vi.fn(),
    setPartnerSelection: vi.fn(),
    keepNodesInViewport: vi.fn(),
    FIT_TO_SCREEN_DELAY: 0,
    ...overrides,
  });

  it('calls treeService.addSpouse then addChild for child mode with NEW', () => {
    const ctx = makeCtx();
    dispatchPartnerAction('child', 'NEW', ctx);
    expect(ctx.undoService.saveState).toHaveBeenCalled();
    expect(ctx.treeService.addSpouse).toHaveBeenCalled();
    expect(ctx.treeService.addChild).toHaveBeenCalled();
    expect(ctx.saveAndUpdate).toHaveBeenCalled();
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(null);
  });

  it('calls treeService.addSpouse for spouse mode with NEW', () => {
    const ctx = makeCtx();
    dispatchPartnerAction('spouse', 'NEW', ctx);
    expect(ctx.treeService.addSpouse).toHaveBeenCalled();
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(null);
  });

  it('calls setPartnerSelection(null) for spouse mode with null', () => {
    const ctx = makeCtx();
    dispatchPartnerAction('spouse', null, ctx);
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(null);
    expect(ctx.treeService.addSpouse).not.toHaveBeenCalled();
  });

  it('calls treeService.addExSpouse for ex_spouse mode with NEW', () => {
    const ctx = makeCtx();
    dispatchPartnerAction('ex_spouse', 'NEW', ctx);
    expect(ctx.treeService.addExSpouse).toHaveBeenCalled();
    expect(ctx.setPartnerSelection).toHaveBeenCalledWith(null);
  });

  it('calls treeService.linkPartner for existing ex_spouse', () => {
    const ctx = makeCtx();
    dispatchPartnerAction('ex_spouse', 'existingId', ctx);
    expect(ctx.treeService.linkPartner).toHaveBeenCalledWith(
      ctx.nodes,
      ctx.edges,
      ctx.sourceId,
      'existingId',
      'Divorciado',
    );
  });

  it('does nothing for unknown mode', () => {
    const ctx = makeCtx();
    expect(() => dispatchPartnerAction('unknown_mode', 'NEW', ctx)).not.toThrow();
    expect(ctx.saveAndUpdate).not.toHaveBeenCalled();
  });
});
