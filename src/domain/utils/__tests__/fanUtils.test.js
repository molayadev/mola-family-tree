import { describe, it, expect } from 'vitest';
import {
  fanPolarToXY,
  fanArcPath,
  buildFanSlots,
  buildRadialPositions,
  FAN_FOCUS_R,
  FAN_MAX_GEN,
} from '../fanUtils';

// ── Fixtures ─────────────────────────────────────────────────────────────────
const makeNode = (id, x = 0, y = 0, gender = 'unknown') => ({ id, x, y, data: { firstName: id, gender } });
const parentEdge = (from, to) => ({ id: `${from}-${to}`, from, to, type: 'parent' });

// ── fanPolarToXY ──────────────────────────────────────────────────────────────
describe('fanPolarToXY', () => {
  it('returns correct x,y for angle 0 (left point)', () => {
    const result = fanPolarToXY(0, 0, 100, 0);
    expect(result.x).toBeCloseTo(-100);
    expect(result.y).toBeCloseTo(0);
  });

  it('returns correct x,y for angle 90 (top point)', () => {
    const result = fanPolarToXY(0, 0, 100, 90);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(-100);
  });

  it('returns correct x,y for angle 180 (right point)', () => {
    const result = fanPolarToXY(0, 0, 100, 180);
    expect(result.x).toBeCloseTo(100);
    expect(result.y).toBeCloseTo(0);
  });

  it('handles non-zero center coordinates', () => {
    const result = fanPolarToXY(50, 50, 100, 90);
    expect(result.x).toBeCloseTo(50);
    expect(result.y).toBeCloseTo(-50);
  });
});

// ── fanArcPath ────────────────────────────────────────────────────────────────
describe('fanArcPath', () => {
  it('returns a non-empty SVG path string for valid inputs', () => {
    const path = fanArcPath(0, 0, 50, 100, 10, 80);
    expect(typeof path).toBe('string');
    expect(path.startsWith('M')).toBe(true);
    expect(path.includes('A')).toBe(true);
    expect(path.endsWith('Z')).toBe(true);
  });

  it('returns empty string when end angle is not greater than start angle after gap', () => {
    // startDeg = 0, endDeg = 0.5 → after GAP(0.6) e <= s
    const path = fanArcPath(0, 0, 50, 100, 0, 0.5);
    expect(path).toBe('');
  });
});

// ── buildFanSlots ─────────────────────────────────────────────────────────────
describe('buildFanSlots', () => {
  it('returns null when focusNodeId is null', () => {
    expect(buildFanSlots([], [], null)).toBeNull();
  });

  it('returns null when focus node is not found', () => {
    const nodes = [makeNode('a')];
    expect(buildFanSlots(nodes, [], 'nonexistent')).toBeNull();
  });

  it('returns a fan data object with correct focus', () => {
    const nodes = [makeNode('focus', 200, 200)];
    const result = buildFanSlots(nodes, [], 'focus');
    expect(result).not.toBeNull();
    expect(result.focusNodeId).toBe('focus');
    expect(result.focusR).toBe(FAN_FOCUS_R);
    expect(result.cx).toBe(200);
    expect(result.cy).toBe(200);
  });

  it('generates rings based on ancestor depth', () => {
    const nodes = [makeNode('c'), makeNode('p'), makeNode('gp')];
    const edges = [parentEdge('p', 'c'), parentEdge('gp', 'p')];
    const result = buildFanSlots(nodes, edges, 'c');
    expect(result.rings.length).toBeGreaterThanOrEqual(2);
  });

  it('slots contain the right node ids for direct parents', () => {
    const nodes = [makeNode('child'), makeNode('mom', 0, 0, 'female'), makeNode('dad', 0, 0, 'male')];
    const edges = [parentEdge('mom', 'child'), parentEdge('dad', 'child')];
    const result = buildFanSlots(nodes, edges, 'child');
    const gen1Slots = result.rings.find(r => r.generation === 1)?.slots || [];
    const parentNodeIds = gen1Slots.map(s => s.nodeId).filter(Boolean);
    expect(parentNodeIds).toContain('mom');
    expect(parentNodeIds).toContain('dad');
  });

  it('does not exceed FAN_MAX_GEN rings', () => {
    // Build a deep chain 6 generations
    const nodeIds = ['n0', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6'];
    const nodes = nodeIds.map(id => makeNode(id));
    const edges = nodeIds.slice(1).map((id, i) => parentEdge(id, nodeIds[i]));
    const result = buildFanSlots(nodes, edges, 'n0');
    expect(result.rings.length).toBeLessThanOrEqual(FAN_MAX_GEN);
  });
});

// ── buildRadialPositions ──────────────────────────────────────────────────────
describe('buildRadialPositions', () => {
  it('returns empty map when focusNodeId is null', () => {
    expect(buildRadialPositions([], [], null).size).toBe(0);
  });

  it('positions focus node at cx/cy', () => {
    const nodes = [makeNode('focus', 100, 200)];
    const positions = buildRadialPositions(nodes, [], 'focus');
    const pos = positions.get('focus');
    expect(pos.x).toBe(100);
    expect(pos.y).toBe(200);
  });

  it('positions ancestors away from focus', () => {
    const nodes = [makeNode('child', 0, 0), makeNode('parent', 0, 0)];
    const edges = [parentEdge('parent', 'child')];
    const positions = buildRadialPositions(nodes, edges, 'child');
    const parentPos = positions.get('parent');
    expect(parentPos).toBeDefined();
    // Parent should be at a different position than the focus
    const childPos = positions.get('child');
    const dist = Math.sqrt((parentPos.x - childPos.x) ** 2 + (parentPos.y - childPos.y) ** 2);
    expect(dist).toBeGreaterThan(0);
  });
});
