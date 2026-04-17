export const STORAGE_KEY = 'familyCanvas_db_v1';

export const COLORS = {
  male: { bg: 'bg-blue-100', border: 'border-blue-500', icon: 'text-blue-600' },
  female: { bg: 'bg-pink-100', border: 'border-pink-500', icon: 'text-pink-600' },
  unknown: { bg: 'bg-gray-100', border: 'border-gray-400', icon: 'text-gray-500' },
};

// ── Edge / link type constants ────────────────────────────────────────

/** Internal edge type values stored on each edge object */
export const EDGE_TYPES = {
  PARENT: 'parent',
  PARTNER: 'partner',
  SPOUSE: 'spouse',
  EX_SPOUSE: 'ex_spouse',
};

/** All edge type values that represent a partner-like relationship */
export const PARTNER_EDGE_TYPES = [EDGE_TYPES.SPOUSE, EDGE_TYPES.EX_SPOUSE, EDGE_TYPES.PARTNER];

/** Check whether an edge type represents a partner relationship */
export const isPartnerEdgeType = (type) => PARTNER_EDGE_TYPES.includes(type);

// ── Label constants ──────────────────────────────────────────────────

export const PARTNER_LABELS = [
  'Casado/a', 'Divorciado', 'Separado/a', 'Enviudado',
  'Comprometido/a', 'Pareja', 'Amigos', 'Anulación', 'Desconocido', 'Otros',
];

export const PARENT_LABELS = [
  'Biológico', 'Adoptivo', 'Padrastro/Madrastra', 'Guarda legal', 'Desconocido',
];

/** Labels that indicate a broken / past relationship (dashed lines, muted colors) */
export const BROKEN_LABELS = ['Divorciado', 'Separado/a', 'Progenitores'];

/** Check whether a label corresponds to a broken relationship */
export const isBrokenLabel = (label) => BROKEN_LABELS.includes(label);

// ── Default labels per edge type ─────────────────────────────────────

export const DEFAULT_LABELS = {
  [EDGE_TYPES.PARENT]: 'Biológico',
  [EDGE_TYPES.PARTNER]: 'Casado/a',
  [EDGE_TYPES.SPOUSE]: 'Casado/a',
  [EDGE_TYPES.EX_SPOUSE]: 'Divorciado',
};

/** Resolve the display label for an edge */
export const resolveEdgeLabel = (edge) => {
  if (edge.label) return edge.label;
  if (edge.type === EDGE_TYPES.EX_SPOUSE) return 'Divorciado';
  if (isPartnerEdgeType(edge.type)) return 'Casado/a';
  return 'Biológico';
};

// ── Link-type selection (used when the user manually links two nodes) ─

export const LINK_TYPES = [
  { value: 'child', label: 'Hijo/a', description: 'El nodo seleccionado será hijo/a' },
  { value: 'parent', label: 'Padre/Madre', description: 'El nodo seleccionado será padre/madre' },
  { value: EDGE_TYPES.SPOUSE, label: 'Cónyuge', description: 'Vínculo matrimonial activo' },
  { value: EDGE_TYPES.EX_SPOUSE, label: 'Ex-pareja', description: 'Relación pasada o divorciada' },
];

// ── Twin / multiple birth constants ──────────────────────────────────

export const TWIN_TYPES = [
  { value: '', label: 'Ninguno' },
  { value: 'twins', label: 'Gemelos (idénticos)' },
  { value: 'fraternal', label: 'Mellizos (fraternos)' },
];

// ── Zodiac constants ───────────────────────────────────────────────────

export const ZODIAC_SIGNS = [
  { value: '', icon: '--' },
  { value: 'aries', icon: '♈' },
  { value: 'taurus', icon: '♉' },
  { value: 'gemini', icon: '♊' },
  { value: 'cancer', icon: '♋' },
  { value: 'leo', icon: '♌' },
  { value: 'virgo', icon: '♍' },
  { value: 'libra', icon: '♎' },
  { value: 'scorpio', icon: '♏' },
  { value: 'sagittarius', icon: '♐' },
  { value: 'capricorn', icon: '♑' },
  { value: 'aquarius', icon: '♒' },
  { value: 'pisces', icon: '♓' },
];

// ── All possible bond/link values (superset) ─────────────────────────

export const ALL_BOND_TYPES = [
  ...Object.values(EDGE_TYPES),
  'child', // virtual type used in link-type selection
];
