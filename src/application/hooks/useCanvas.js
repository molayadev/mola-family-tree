import { useState, useCallback, useRef } from 'react';

export function useCanvas() {
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const canvasRef = useRef(null);
  const stateRef = useRef({
    mode: 'idle',
    startX: 0,
    startY: 0,
    initialTransform: { x: 0, y: 0 },
    initialNodePos: { x: 0, y: 0 },
    dragNodeId: null,
    hasMovedNode: false,
    initialDistance: 0,
    initialScale: 1,
  });

  const fitToScreen = useCallback((nodes) => {
    if (!nodes || nodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });

    const padding = 100;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;

    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const scaleX = screenW / width;
    const scaleY = screenH / height;
    let newScale = Math.min(scaleX, scaleY);
    newScale = Math.min(Math.max(newScale, 0.2), 1.5);

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const newX = (screenW / 2) - (midX * newScale);
    const newY = (screenH / 2) - (midY * newScale);

    setTransform({ x: newX, y: newY, k: newScale });
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const scaleFactor = 1.05;
    const direction = e.deltaY > 0 ? -1 : 1;

    setTransform(prev => {
      let newScale = prev.k * (direction > 0 ? scaleFactor : 1 / scaleFactor);
      newScale = Math.min(Math.max(0.1, newScale), 3);

      const mouseX = (e.clientX - prev.x) / prev.k;
      const mouseY = (e.clientY - prev.y) / prev.k;

      return {
        x: e.clientX - mouseX * newScale,
        y: e.clientY - mouseY * newScale,
        k: newScale,
      };
    });
  }, []);

  const handleTouchStart = useCallback((e, transformVal) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg') {
      if (e.touches.length === 1) {
        stateRef.current.mode = 'pan';
        stateRef.current.startX = e.touches[0].clientX;
        stateRef.current.startY = e.touches[0].clientY;
        stateRef.current.initialTransform = { ...transformVal };
        return { clearSelection: true };
      } else if (e.touches.length === 2) {
        stateRef.current.mode = 'zoom';
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY,
        );
        stateRef.current.initialDistance = dist;
        stateRef.current.initialScale = transformVal.k;
        stateRef.current.initialTransform = { ...transformVal };
      }
    }
    return {};
  }, []);

  const handleTouchMove = useCallback((e, nodes, setNodes, transformVal) => {
    if (stateRef.current.mode === 'pan' && e.touches.length === 1) {
      const dx = e.touches[0].clientX - stateRef.current.startX;
      const dy = e.touches[0].clientY - stateRef.current.startY;
      setTransform({
        ...transformVal,
        x: stateRef.current.initialTransform.x + dx,
        y: stateRef.current.initialTransform.y + dy,
      });
    } else if (stateRef.current.mode === 'zoom' && e.touches.length === 2) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY,
      );

      const scaleChange = dist / stateRef.current.initialDistance;
      let newScale = stateRef.current.initialScale * scaleChange;
      newScale = Math.min(Math.max(0.1, newScale), 3);

      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

      const worldX = (midX - stateRef.current.initialTransform.x) / stateRef.current.initialScale;
      const worldY = (midY - stateRef.current.initialTransform.y) / stateRef.current.initialScale;

      setTransform({
        x: midX - worldX * newScale,
        y: midY - worldY * newScale,
        k: newScale,
      });
    } else if (stateRef.current.mode === 'dragNode' && e.touches.length === 1) {
      const touch = e.touches[0];
      const dx = (touch.clientX - stateRef.current.startX) / transformVal.k;
      const dy = (touch.clientY - stateRef.current.startY) / transformVal.k;

      if (Math.hypot(dx, dy) > 5) {
        stateRef.current.hasMovedNode = true;
        const newNodes = nodes.map(n =>
          n.id === stateRef.current.dragNodeId
            ? { ...n, x: stateRef.current.initialNodePos.x + dx, y: stateRef.current.initialNodePos.y + dy }
            : n,
        );
        setNodes(newNodes);
      }
    }
  }, []);

  const handleTouchEnd = useCallback((onSave, onSelectNode) => {
    if (stateRef.current.mode === 'dragNode') {
      if (stateRef.current.hasMovedNode) {
        onSave();
      } else {
        onSelectNode(stateRef.current.dragNodeId);
      }
    }
    stateRef.current.mode = 'idle';
  }, []);

  const handleMouseDown = useCallback((e, transformVal) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg') {
      stateRef.current.mode = 'pan';
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.initialTransform = { ...transformVal };
      return { clearSelection: true };
    }
    return {};
  }, []);

  const handleMouseMove = useCallback((e, nodes, setNodes, transformVal) => {
    if (stateRef.current.mode === 'pan') {
      const dx = e.clientX - stateRef.current.startX;
      const dy = e.clientY - stateRef.current.startY;
      setTransform({
        ...transformVal,
        x: stateRef.current.initialTransform.x + dx,
        y: stateRef.current.initialTransform.y + dy,
      });
    } else if (stateRef.current.mode === 'dragNode') {
      const dx = (e.clientX - stateRef.current.startX) / transformVal.k;
      const dy = (e.clientY - stateRef.current.startY) / transformVal.k;

      if (Math.hypot(dx, dy) > 5) {
        stateRef.current.hasMovedNode = true;
        const newNodes = nodes.map(n =>
          n.id === stateRef.current.dragNodeId
            ? { ...n, x: stateRef.current.initialNodePos.x + dx, y: stateRef.current.initialNodePos.y + dy }
            : n,
        );
        setNodes(newNodes);
      }
    }
  }, []);

  const handleMouseUp = useCallback((onSave, onSelectNode) => {
    if (stateRef.current.mode === 'dragNode') {
      if (stateRef.current.hasMovedNode) {
        onSave();
      } else {
        onSelectNode(stateRef.current.dragNodeId);
      }
    }
    stateRef.current.mode = 'idle';
  }, []);

  const handleNodePointerDown = useCallback((e, nodeId, nodes) => {
    e.stopPropagation();
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    stateRef.current = {
      ...stateRef.current,
      mode: 'dragNode',
      startX: e.clientX || e.touches?.[0].clientX,
      startY: e.clientY || e.touches?.[0].clientY,
      dragNodeId: nodeId,
      initialNodePos: { x: node.x, y: node.y },
      hasMovedNode: false,
    };
  }, []);

  const zoomIn = useCallback(() => {
    setTransform(t => ({ ...t, k: Math.min(3, t.k + 0.2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform(t => ({ ...t, k: Math.max(0.1, t.k - 0.2) }));
  }, []);

  return {
    transform,
    setTransform,
    canvasRef,
    stateRef,
    fitToScreen,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleNodePointerDown,
    zoomIn,
    zoomOut,
  };
}
