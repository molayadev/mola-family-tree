import { describe, it, expect } from 'vitest';
import {
  normalizeFamilyGroups,
  computeHiddenNodeIds,
  buildAutoFamilyGroups,
  normalizeGroupColor,
  randomGroupEmoji,
  randomGroupColor,
} from '../groupUtils';

// ── Fixtures ────────────────────────────────────────────────────────────────
const makeNode = (id, x = 0, y = 0) => ({ id, x, y, data: { firstName: 'Test', lastName: 'User' } });
const makeEdge = (from, to, type = 'parent') => ({ id: `${from}-${to}`, from, to, type });

// ── normalizeFamilyGroups ────────────────────────────────────────────────────
describe('normalizeFamilyGroups', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeFamilyGroups([], [])).toEqual([]);
    expect(normalizeFamilyGroups(null, [])).toEqual([]);
    expect(normalizeFamilyGroups(undefined, [])).toEqual([]);
  });

  it('filters out nodes that are not in the tree', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const groups = [{ id: 'g1', label: 'Test', emoji: '👶', color: '#fff', nodeIds: ['a', 'b', 'nonexistent'], collapsed: false }];
    const result = normalizeFamilyGroups(groups, nodes);
    expect(result[0].nodeIds).toEqual(['a', 'b']);
  });

  it('filters out groups with empty label', () => {
    const nodes = [makeNode('a')];
    const groups = [{ id: 'g1', label: '  ', emoji: '👶', color: '#fff', nodeIds: ['a'], collapsed: false }];
    const result = normalizeFamilyGroups(groups, nodes);
    expect(result).toHaveLength(0);
  });

  it('filters out groups with no valid nodes', () => {
    const nodes = [];
    const groups = [{ id: 'g1', label: 'Test', emoji: '👶', color: '#fff', nodeIds: ['a', 'b'], collapsed: false }];
    const result = normalizeFamilyGroups(groups, nodes);
    expect(result).toHaveLength(0);
  });

  it('deduplicates nodeIds within a group', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const groups = [{ id: 'g1', label: 'Test', emoji: '👶', color: '#fff', nodeIds: ['a', 'a', 'b'], collapsed: false }];
    const result = normalizeFamilyGroups(groups, nodes);
    expect(result[0].nodeIds).toEqual(['a', 'b']);
  });

  it('preserves collapsed flag', () => {
    const nodes = [makeNode('a')];
    const groups = [{ id: 'g1', label: 'Test', emoji: '👶', color: '#fff', nodeIds: ['a'], collapsed: true }];
    const result = normalizeFamilyGroups(groups, nodes);
    expect(result[0].collapsed).toBe(true);
  });

  it('assigns a fallback emoji if missing', () => {
    const nodes = [makeNode('a')];
    const groups = [{ id: 'g1', label: 'Test', color: '#fff', nodeIds: ['a'], collapsed: false }];
    const result = normalizeFamilyGroups(groups, nodes);
    expect(typeof result[0].emoji).toBe('string');
    expect(result[0].emoji.length).toBeGreaterThan(0);
  });
});

// ── computeHiddenNodeIds ─────────────────────────────────────────────────────
describe('computeHiddenNodeIds', () => {
  it('returns empty set when no isolation and no collapsed groups', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const groups = [{ id: 'g1', label: 'G1', emoji: '👶', color: '#fff', nodeIds: ['a', 'b'], collapsed: false }];
    const hidden = computeHiddenNodeIds(nodes, groups, null);
    expect(hidden.size).toBe(0);
  });

  it('hides members of collapsed groups', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const groups = [{ id: 'g1', label: 'G1', emoji: '👶', color: '#fff', nodeIds: ['a', 'b'], collapsed: true }];
    const hidden = computeHiddenNodeIds(nodes, groups, null);
    expect(hidden.has('a')).toBe(true);
    expect(hidden.has('b')).toBe(true);
    expect(hidden.has('c')).toBe(false);
  });

  it('hides all nodes outside isolated group', () => {
    const nodes = [makeNode('a'), makeNode('b'), makeNode('c')];
    const groups = [{ id: 'g1', label: 'G1', emoji: '👶', color: '#fff', nodeIds: ['a'], collapsed: false }];
    const hidden = computeHiddenNodeIds(nodes, groups, 'g1');
    expect(hidden.has('b')).toBe(true);
    expect(hidden.has('c')).toBe(true);
    expect(hidden.has('a')).toBe(false);
  });

  it('hides nothing when isolated group does not exist', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    const groups = [];
    const hidden = computeHiddenNodeIds(nodes, groups, 'nonexistent');
    expect(hidden.size).toBe(0);
  });
});

// ── normalizeGroupColor ──────────────────────────────────────────────────────
describe('normalizeGroupColor', () => {
  it('returns color if it is a non-empty string', () => {
    expect(normalizeGroupColor('#abc')).toBe('#abc');
  });

  it('returns fallback when color is empty/null/undefined', () => {
    expect(normalizeGroupColor('')).toBe('#F97316');
    expect(normalizeGroupColor(null)).toBe('#F97316');
    expect(normalizeGroupColor(undefined)).toBe('#F97316');
  });

  it('uses custom fallback', () => {
    expect(normalizeGroupColor('', '#999')).toBe('#999');
  });
});

// ── randomGroupEmoji / randomGroupColor ─────────────────────────────────────
describe('random helpers', () => {
  it('randomGroupEmoji returns a non-empty string', () => {
    const emoji = randomGroupEmoji();
    expect(typeof emoji).toBe('string');
    expect(emoji.length).toBeGreaterThan(0);
  });

  it('randomGroupColor returns a hex-like color', () => {
    const color = randomGroupColor();
    expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

// ── buildAutoFamilyGroups ────────────────────────────────────────────────────
describe('buildAutoFamilyGroups', () => {
  it('returns empty array for fewer than 2 nodes', () => {
    expect(buildAutoFamilyGroups([], [])).toEqual([]);
    expect(buildAutoFamilyGroups([makeNode('a')], [])).toEqual([]);
  });

  it('returns empty array when there are no edges', () => {
    const nodes = [makeNode('a'), makeNode('b')];
    expect(buildAutoFamilyGroups(nodes, [])).toEqual([]);
  });

  it('creates a group when there are parent edges', () => {
    const nodes = [makeNode('parent1'), makeNode('parent2'), makeNode('child1')];
    const edges = [
      makeEdge('parent1', 'child1', 'parent'),
    ];
    const result = buildAutoFamilyGroups(nodes, edges);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].nodeIds).toContain('parent1');
    expect(result[0].nodeIds).toContain('child1');
  });
});
