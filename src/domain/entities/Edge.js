import { generateId } from './Node';

export function createEdge({ id, from, to, type, label }) {
  const resolvedType = type || 'parent';
  const defaultLabel = resolvedType === 'sibling' ? 'Hermano/a' : 'Biológico';
  return {
    id: id || generateId(),
    from,
    to,
    type: resolvedType,
    label: label || defaultLabel,
  };
}
