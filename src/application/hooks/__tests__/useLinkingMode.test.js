import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLinkingMode } from '../useLinkingMode';

describe('useLinkingMode', () => {
  const makeProps = (overrides = {}) => ({
    nodes: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    edges: [],
    customLinkTypes: [],
    treeService: {
      linkNodes: vi.fn(() => []),
    },
    saveAndUpdate: vi.fn(),
    closeActionsModal: vi.fn(),
    ...overrides,
  });

  it('initialises with no linking mode or target', () => {
    const { result } = renderHook(() => useLinkingMode(makeProps()));
    expect(result.current.linkingMode).toBeNull();
    expect(result.current.linkTarget).toBeNull();
  });

  it('enterLinkingMode sets sourceId and clears target', () => {
    const props = makeProps();
    const { result } = renderHook(() => useLinkingMode(props));

    act(() => result.current.enterLinkingMode('a'));

    expect(result.current.linkingMode).toEqual({ sourceId: 'a' });
    expect(result.current.linkTarget).toBeNull();
    expect(props.closeActionsModal).toHaveBeenCalled();
  });

  it('cancelLinkingMode clears both mode and target', () => {
    const { result } = renderHook(() => useLinkingMode(makeProps()));

    act(() => result.current.enterLinkingMode('a'));
    act(() => result.current.cancelLinkingMode());

    expect(result.current.linkingMode).toBeNull();
    expect(result.current.linkTarget).toBeNull();
  });

  it('handleLinkTargetSelected sets the target', () => {
    const { result } = renderHook(() => useLinkingMode(makeProps()));

    act(() => result.current.enterLinkingMode('a'));
    act(() => result.current.handleLinkTargetSelected('b'));

    expect(result.current.linkTarget).toBe('b');
  });

  it('handleLinkTargetSelected ignores selecting the source node', () => {
    const { result } = renderHook(() => useLinkingMode(makeProps()));

    act(() => result.current.enterLinkingMode('a'));
    act(() => result.current.handleLinkTargetSelected('a'));

    expect(result.current.linkTarget).toBeNull();
  });

  it('handleLinkTypeChosen calls treeService.linkNodes and clears state', () => {
    const props = makeProps();
    const { result } = renderHook(() => useLinkingMode(props));

    act(() => result.current.enterLinkingMode('a'));
    act(() => result.current.handleLinkTargetSelected('b'));
    act(() => result.current.handleLinkTypeChosen('spouse'));

    expect(props.treeService.linkNodes).toHaveBeenCalledWith(
      props.edges,
      'a',
      'b',
      'spouse',
      undefined,
      props.customLinkTypes,
    );
    expect(props.saveAndUpdate).toHaveBeenCalled();
    expect(result.current.linkingMode).toBeNull();
    expect(result.current.linkTarget).toBeNull();
  });

  it('handleLinkTypeChosen does nothing if linkingMode is not set', () => {
    const props = makeProps();
    const { result } = renderHook(() => useLinkingMode(props));

    act(() => result.current.handleLinkTypeChosen('spouse'));

    expect(props.treeService.linkNodes).not.toHaveBeenCalled();
  });
});
