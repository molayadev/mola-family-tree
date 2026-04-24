import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePartnerSelection } from '../usePartnerSelection';

const makeProps = (overrides = {}) => ({
  nodes: [
    { id: 'src', data: { firstName: 'A', lastName: '' } },
    { id: 'existing', data: { firstName: 'B', lastName: '' } },
  ],
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
  keepNodesInViewport: vi.fn(),
  ...overrides,
});

describe('usePartnerSelection', () => {
  it('starts with null partnerSelection', () => {
    const { result } = renderHook(() => usePartnerSelection(makeProps()));
    expect(result.current.partnerSelection).toBeNull();
  });

  it('setPartnerSelection updates state', () => {
    const { result } = renderHook(() => usePartnerSelection(makeProps()));
    act(() => result.current.setPartnerSelection({ mode: 'spouse', sourceId: 'src', options: [] }));
    expect(result.current.partnerSelection).toEqual({ mode: 'spouse', sourceId: 'src', options: [] });
  });

  it('handleSelectPartnerAction does nothing when partnerSelection is null', () => {
    const props = makeProps();
    const { result } = renderHook(() => usePartnerSelection(props));
    act(() => result.current.handleSelectPartnerAction('NEW'));
    expect(props.treeService.addSpouse).not.toHaveBeenCalled();
  });

  it('handleSelectPartnerAction clears partnerSelection when sourceNode not found', () => {
    const props = makeProps();
    const { result } = renderHook(() => usePartnerSelection(props));
    act(() => result.current.setPartnerSelection({ mode: 'spouse', sourceId: 'nonexistent', options: [] }));
    act(() => result.current.handleSelectPartnerAction('NEW'));
    expect(result.current.partnerSelection).toBeNull();
    expect(props.treeService.addSpouse).not.toHaveBeenCalled();
  });

  it('dispatches spouse NEW action via strategy', () => {
    const props = makeProps();
    const { result } = renderHook(() => usePartnerSelection(props));
    act(() => result.current.setPartnerSelection({ mode: 'spouse', sourceId: 'src', options: [] }));
    act(() => result.current.handleSelectPartnerAction('NEW'));
    expect(props.treeService.addSpouse).toHaveBeenCalled();
    expect(props.saveAndUpdate).toHaveBeenCalled();
  });

  it('dispatches ex_spouse existing action via strategy', () => {
    const props = makeProps();
    const { result } = renderHook(() => usePartnerSelection(props));
    act(() => result.current.setPartnerSelection({ mode: 'ex_spouse', sourceId: 'src', options: [] }));
    act(() => result.current.handleSelectPartnerAction('existing'));
    expect(props.treeService.linkPartner).toHaveBeenCalledWith(
      props.nodes,
      props.edges,
      'src',
      'existing',
      'Divorciado',
    );
  });
});
