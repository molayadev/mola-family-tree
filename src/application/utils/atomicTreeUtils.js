/**
 * Utilities para construir y trabajar con átomos (núcleos familiares colapsables)
 * en el MODO ATÓMICO
 */

/**
 * Construye el núcleo familiar para un nodo padre/madre
 * Incluye: padre + madre + cónyuge(s) + hijos
 * @param {string} parentId - ID del padre/madre
 * @param {Array} nodes - Lista de nodos
 * @param {Array} edges - Lista de aristas
 * @returns {Object} núcleo familiar con IDs y metadata
 */
export const buildFamilyNucleus = (parentId, nodes, edges) => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  if (!nodeMap.has(parentId)) return null;

  const nucleus = {
    parentIds: new Set(),
    childIds: new Set(),
    spouseIds: new Set(),
    allMemberIds: new Set([parentId]),
  };

  // Encontrar padres
  edges.forEach(edge => {
    if (edge.type === 'parent' && edge.to === parentId) {
      nucleus.parentIds.add(edge.from);
      nucleus.allMemberIds.add(edge.from);
    }
  });

  // Encontrar cónyuges
  edges.forEach(edge => {
    if (edge.type.includes('Casado') || edge.type === 'Divorciado') {
      if (edge.from === parentId) {
        nucleus.spouseIds.add(edge.to);
        nucleus.allMemberIds.add(edge.to);
      } else if (edge.to === parentId) {
        nucleus.spouseIds.add(edge.from);
        nucleus.allMemberIds.add(edge.from);
      }
    }
  });

  // Encontrar hijos
  edges.forEach(edge => {
    if (edge.type === 'parent' && edge.from === parentId) {
      nucleus.childIds.add(edge.to);
      nucleus.allMemberIds.add(edge.to);
    }
  });

  // Si hay cónyuge, también incluir sus hijos (hijos del núcleo)
  nucleus.spouseIds.forEach(spouseId => {
    edges.forEach(edge => {
      if (edge.type === 'parent' && edge.from === spouseId) {
        nucleus.childIds.add(edge.to);
        nucleus.allMemberIds.add(edge.to);
      }
    });
  });

  return {
    ...nucleus,
    parentIds: Array.from(nucleus.parentIds),
    childIds: Array.from(nucleus.childIds),
    spouseIds: Array.from(nucleus.spouseIds),
    allMemberIds: Array.from(nucleus.allMemberIds),
    hasChildren: nucleus.childIds.size > 0,
    hasSpouse: nucleus.spouseIds.size > 0,
    isFamilyNucleus: nucleus.childIds.size > 0,
  };
};

/**
 * Detecta todos los nódosque forman un núcleo familiar
 * (padre/madre con al menos 1 hijo)
 * @param {Array} nodes
 * @param {Array} edges
 * @returns {Set} IDs de nódosque son núcleos familiares
 */
export const detectFamilyNucleiParents = (nodes, edges) => {
  const nucleiParents = new Set();
  const childrenByParent = new Map();

  edges.forEach(edge => {
    if (edge.type === 'parent') {
      if (!childrenByParent.has(edge.from)) {
        childrenByParent.set(edge.from, []);
      }
      childrenByParent.get(edge.from).push(edge.to);
    }
  });

  // Un núcleo familiar existe si un nodo tiene al menos 1 hijo
  childrenByParent.forEach((children, parentId) => {
    if (children.length > 0 && nodes.some(n => n.id === parentId)) {
      nucleiParents.add(parentId);
    }
  });

  return nucleiParents;
};

/**
 * Agrupa nódosautomáticamente por núcleo familiar para vista atómica
 * Cada átomo representa: [padres + cónyuges + hijos]
 * @param {Array} nodes
 * @param {Array} edges
 * @returns {Array} grupos automáticos de átomos
 */
export const buildAutoFamilyAtoms = (nodes, edges) => {
  if (nodes.length < 2 || edges.length === 0) return [];

  const nucleiParents = detectFamilyNucleiParents(nodes, edges);
  const alreadyGrouped = new Set();
  const atoms = [];
  let atomIndex = 1;

  nucleiParents.forEach(parentId => {
    if (alreadyGrouped.has(parentId)) return;

    const nucleus = buildFamilyNucleus(parentId, nodes, edges);
    if (!nucleus) return;

    // Marcar todos los miembros como agrupados
    nucleus.allMemberIds.forEach(id => alreadyGrouped.add(id));

    atoms.push({
      id: `atom-${atomIndex}`,
      type: 'family_atom',
      label: `Familia - ${nodes.find(n => n.id === parentId)?.data?.firstName || 'Núcleo'}`,
      nodeIds: nucleus.allMemberIds,
      collapsed: true, // Los átomos se colapsan por defecto
      isCollapsible: true,
      hasChildren: nucleus.hasChildren,
      primaryParentId: parentId,
      parentIds: nucleus.parentIds,
      childIds: nucleus.childIds,
      spouseIds: nucleus.spouseIds,
    });

    atomIndex++;
  });

  return atoms;
};

/**
 * Calcula la posición del "átomo" (promedio de posiciones de miembros)
 * @param {Array} nodeIds - IDs de miembros del átomo
 * @param {Array} nodes - Lista de nodos
 * @returns {Object} { x, y }
 */
export const calculateAtomPosition = (nodeIds, nodes) => {
  const members = nodeIds
    .map(id => nodes.find(n => n.id === id))
    .filter(Boolean);

  if (members.length === 0) return { x: 0, y: 0 };

  const x = members.reduce((sum, n) => sum + n.x, 0) / members.length;
  const y = members.reduce((sum, n) => sum + n.y, 0) / members.length;

  return { x, y };
};

/**
 * Obtiene la visualización de un átomo (nodo único que lo representa)
 * @param {Object} atom - Definición del átomo
 * @param {Array} nodes - Lista de nodos
 * @returns {Object} nodo representante del átomo
 */
export const getAtomRepresentativeNode = (atom, nodes) => {
  const primaryParent = nodes.find(n => n.id === atom.primaryParentId);
  if (!primaryParent) return null;

  const position = calculateAtomPosition(atom.nodeIds, nodes);
  return {
    id: atom.id,
    type: 'atom',
    x: position.x,
    y: position.y,
    data: {
      firstName: atom.label.split(' - ')[1] || 'Familia',
      lastName: '',
      gender: 'unknown',
    },
    atomMembers: atom.nodeIds,
    isAtom: true,
    collapsed: atom.collapsed,
  };
};

/**
 * Filtra nódosvisibles en modo atómico según criterio
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string} focusNodeId - Nodo de enfoque
 * @param {string} filterMode - 'all' | 'ancestors' | 'descendants'
 * @returns {Set} IDs de nódosvisibles
 */
export const filterAtomicNodes = (nodes, edges, focusNodeId, filterMode = 'all') => {
  if (filterMode === 'all') {
    return new Set(nodes.map(n => n.id));
  }

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  if (!nodeMap.has(focusNodeId)) {
    return new Set();
  }

  const visibleIds = new Set([focusNodeId]);

  if (filterMode === 'ancestors' || filterMode === 'all') {
    const visitedAncestors = new Set();
    const queue = [focusNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visitedAncestors.has(currentId)) continue;
      visitedAncestors.add(currentId);

      edges.forEach(edge => {
        if (edge.type === 'parent' && edge.to === currentId) {
          if (!visitedAncestors.has(edge.from)) {
            visibleIds.add(edge.from);
            queue.push(edge.from);
          }
        }
      });
    }
  }

  if (filterMode === 'descendants' || filterMode === 'all') {
    const visitedDescendants = new Set();
    const queue = [focusNodeId];

    while (queue.length > 0) {
      const currentId = queue.shift();
      if (visitedDescendants.has(currentId)) continue;
      visitedDescendants.add(currentId);

      edges.forEach(edge => {
        if (edge.type === 'parent' && edge.from === currentId) {
          if (!visitedDescendants.has(edge.to)) {
            visibleIds.add(edge.to);
            queue.push(edge.to);
          }
        }
      });
    }
  }

  return visibleIds;
};

/**
 * Construye un mapa de linaje para un nodo en modo atómico
 * Muestra tanto ancestros como descendientes del nodo seleccionado
 * @param {Array} nodes
 * @param {Array} edges
 * @param {string} focusNodeId
 * @returns {Object} { ancestors, descendants, all }
 */
export const buildAtomicLineage = (nodes, edges, focusNodeId) => {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  if (!nodeMap.has(focusNodeId)) {
    return { ancestors: new Set(), descendants: new Set(), all: new Set([focusNodeId]) };
  }

  const ancestors = new Set();
  const descendants = new Set();

  // Construir ancestros
  const ancestorQueue = [focusNodeId];
  const ancestorVisited = new Set();

  while (ancestorQueue.length > 0) {
    const currentId = ancestorQueue.shift();
    if (ancestorVisited.has(currentId)) continue;
    ancestorVisited.add(currentId);

    edges.forEach(edge => {
      if (edge.type === 'parent' && edge.to === currentId) {
        if (!ancestors.has(edge.from)) {
          ancestors.add(edge.from);
          ancestorQueue.push(edge.from);
        }
      }
    });
  }

  // Construir descendientes
  const descendantQueue = [focusNodeId];
  const descendantVisited = new Set();

  while (descendantQueue.length > 0) {
    const currentId = descendantQueue.shift();
    if (descendantVisited.has(currentId)) continue;
    descendantVisited.add(currentId);

    edges.forEach(edge => {
      if (edge.type === 'parent' && edge.from === currentId) {
        if (!descendants.has(edge.to)) {
          descendants.add(edge.to);
          descendantQueue.push(edge.to);
        }
      }
    });
  }

  const all = new Set([focusNodeId, ...ancestors, ...descendants]);

  return { ancestors, descendants, all };
};
