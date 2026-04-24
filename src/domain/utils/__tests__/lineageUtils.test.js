import { describe, it, expect } from 'vitest';
import {
  buildLineageVisibility,
  buildNodeParentControls,
  buildLineageColumnPositions,
  chooseParentWithMotherPriority,
} from '../lineageUtils';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const makeNode = (id, gender = 'unknown') => ({ id, x: 0, y: 0, data: { firstName: id, lastName: '', gender } });
const parentEdge = (from, to) => ({ id: `${from}-${to}`, from, to, type: 'parent' });
const spouseEdge = (from, to) => ({ id: `${from}-${to}`, from, to, type: 'spouse' });

// ── chooseParentWithMotherPriority ────────────────────────────────────────────
describe('chooseParentWithMotherPriority', () => {
  it('returns null for empty parents', () => {
    expect(chooseParentWithMotherPriority([], new Map())).toBeNull();
  });

  it('respects explicit preferredId', () => {
    const nodeMap = new Map([['m', makeNode('m', 'female')], ['d', makeNode('d', 'male')]]);
    expect(chooseParentWithMotherPriority(['m', 'd'], nodeMap, 'd')).toBe('d');
  });

  it('prefers mother when no preferredId', () => {
    const nodeMap = new Map([['m', makeNode('m', 'female')], ['d', makeNode('d', 'male')]]);
    expect(chooseParentWithMotherPriority(['d', 'm'], nodeMap)).toBe('m');
  });

  it('falls back to father when no mother', () => {
    const nodeMap = new Map([['d', makeNode('d', 'male')]]);
    expect(chooseParentWithMotherPriority(['d'], nodeMap)).toBe('d');
  });

  it('returns first parent when no gender info', () => {
    const nodeMap = new Map([['a', makeNode('a')], ['b', makeNode('b')]]);
    expect(chooseParentWithMotherPriority(['a', 'b'], nodeMap)).toBe('a');
  });
});

// ── buildNodeParentControls ──────────────────────────────────────────────────
describe('buildNodeParentControls', () => {
  it('returns empty options when nodeId is null', () => {
    const result = buildNodeParentControls([], [], null, {});
    expect(result).toEqual({ options: [], activeParentId: null });
  });

  it('returns empty options when node does not exist', () => {
    const result = buildNodeParentControls([], [], 'nonexistent', {});
    expect(result).toEqual({ options: [], activeParentId: null });
  });

  it('builds options from parent edges', () => {
    const nodes = [makeNode('child'), makeNode('mom', 'female'), makeNode('dad', 'male')];
    const edges = [parentEdge('mom', 'child'), parentEdge('dad', 'child')];
    const result = buildNodeParentControls(nodes, edges, 'child', {});
    expect(result.options).toHaveLength(2);
    const genders = result.options.map(o => o.gender);
    expect(genders).toContain('female');
    expect(genders).toContain('male');
  });

  it('picks mother as activeParentId by default', () => {
    const nodes = [makeNode('child'), makeNode('mom', 'female'), makeNode('dad', 'male')];
    const edges = [parentEdge('mom', 'child'), parentEdge('dad', 'child')];
    const result = buildNodeParentControls(nodes, edges, 'child', {});
    expect(result.activeParentId).toBe('mom');
  });
});

// ── buildLineageVisibility ───────────────────────────────────────────────────
describe('buildLineageVisibility', () => {
  it('returns all nodes for "all" mode', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const result = buildLineageVisibility(nodes, [], 'a', {}, 'all', null);
    expect(result.visibleNodeIds.size).toBe(3);
    expect(result.visibleNodeIds.has('a')).toBe(true);
    expect(result.visibleNodeIds.has('b')).toBe(true);
  });

  it('returns empty set for null focus when not "all" mode', () => {
    const result = buildLineageVisibility([], [], null, {}, 'relatives', null);
    expect(result.resolvedFocusNodeId).toBeNull();
    expect(result.visibleNodeIds.size).toBe(0);
  });

  it('includes focus node itself in "relatives" mode', () => {
    const nodes = [makeNode('focus'), makeNode('sibling')];
    const result = buildLineageVisibility(nodes, [], 'focus', {}, 'relatives', null);
    expect(result.visibleNodeIds.has('focus')).toBe(true);
  });

  it('includes ancestors in "lineage" mode', () => {
    const nodes = [makeNode('child'), makeNode('parent'), makeNode('grandparent')];
    const edges = [parentEdge('parent', 'child'), parentEdge('grandparent', 'parent')];
    const result = buildLineageVisibility(nodes, edges, 'child', {}, 'lineage', null);
    expect(result.visibleNodeIds.has('parent')).toBe(true);
    expect(result.visibleNodeIds.has('grandparent')).toBe(true);
  });

  it('includes descendants in "descendants" mode', () => {
    const nodes = [makeNode('root'), makeNode('child'), makeNode('grandchild')];
    const edges = [parentEdge('root', 'child'), parentEdge('child', 'grandchild')];
    const result = buildLineageVisibility(nodes, edges, 'root', {}, 'descendants', null);
    expect(result.visibleNodeIds.has('child')).toBe(true);
    expect(result.visibleNodeIds.has('grandchild')).toBe(true);
  });

  it('falls back to first node when focusNodeId not found', () => {
    const nodes = [makeNode('first'), makeNode('second')];
    const result = buildLineageVisibility(nodes, [], 'nonexistent', {}, 'all', null);
    expect(result.resolvedFocusNodeId).toBe('first');
  });

  it('includes partners in "relatives" mode', () => {
    const nodes = [makeNode('focus'), makeNode('partner')];
    const edges = [spouseEdge('focus', 'partner')];
    const result = buildLineageVisibility(nodes, edges, 'focus', {}, 'relatives', null);
    expect(result.visibleNodeIds.has('partner')).toBe(true);
  });
});

// ── buildLineageColumnPositions ───────────────────────────────────────────────
describe('buildLineageColumnPositions', () => {
  it('returns empty map when focusNodeId is null', () => {
    expect(buildLineageColumnPositions([], [], null).size).toBe(0);
  });

  it('returns empty map when focus node is not found', () => {
    const nodes = [makeNode('a')];
    expect(buildLineageColumnPositions(nodes, [], 'missing').size).toBe(0);
  });

  it('positions ancestors to the right of the focus node', () => {
    const nodes = [
      { id: 'child', x: 100, y: 100, data: { firstName: 'child', lastName: '', gender: 'unknown' } },
      { id: 'parent', x: 0, y: 0, data: { firstName: 'parent', lastName: '', gender: 'male' } },
    ];
    const edges = [parentEdge('parent', 'child')];
    const positions = buildLineageColumnPositions(nodes, edges, 'child');
    const parentPos = positions.get('parent');
    expect(parentPos).toBeDefined();
    expect(parentPos.x).toBeGreaterThan(100); // ancestor column is to the right
  });
});
