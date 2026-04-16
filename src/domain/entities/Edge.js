import { generateId } from './Node';

export function createEdge({ id, from, to, type, label }) {
  return {
    id: id || generateId(),
    from,
    to,
    type: type || 'parent',
    label: label || 'Biológico',
  };
}
