/**
 * VIEW_MODE_STRATEGIES
 *
 * Centralised configuration object for each lineage view mode.
 * Instead of scattering `if (lineageViewMode === 'xxx')` checks across the
 * codebase, handlers and metadata are co-located here.
 *
 * Icon components are intentionally NOT imported here to keep the domain layer
 * free of UI dependencies. Use VIEW_MODE_ICON_MAP in the presentation layer
 * to resolve iconName → icon component.
 *
 * Shape per strategy:
 *   value        – the internal string key used in state
 *   label        – human-readable full label (shown in tooltips / menu)
 *   shortLabel   – abbreviated label for compact buttons
 *   iconName     – string key resolved by the UI layer (VIEW_MODE_ICON_MAP)
 *   showPartners – whether partner nodes are shown for the focus node
 *   showControls – whether the tree-controls overlay is rendered
 *   usesColumnPositions  – whether lineage column layout is applied
 *   usesRadialPositions  – whether radial/fan layout is applied
 *   allowOrganize        – whether the "Organize tree" action is enabled
 */
export const VIEW_MODE_STRATEGIES = {
  relatives: {
    value: 'relatives',
    label: 'Mi árbol',
    shortLabel: 'Árbol',
    iconName: 'Trees',
    showPartners: true,
    showControls: true,
    usesColumnPositions: false,
    usesRadialPositions: false,
    allowOrganize: true,
  },
  ancestors: {
    value: 'ancestors',
    label: 'Ancestros',
    shortLabel: 'Asc.',
    iconName: 'ArrowUp',
    showPartners: true,
    showControls: false,
    usesColumnPositions: false,
    usesRadialPositions: false,
    allowOrganize: false,
  },
  descendants: {
    value: 'descendants',
    label: 'Descendencia',
    shortLabel: 'Desc.',
    iconName: 'ArrowDown',
    showPartners: true,
    showControls: false,
    usesColumnPositions: false,
    usesRadialPositions: false,
    allowOrganize: false,
  },
  lineage: {
    value: 'lineage',
    label: 'Linaje',
    shortLabel: 'Linaje',
    iconName: 'GitBranch',
    showPartners: false,
    showControls: true,
    usesColumnPositions: true,
    usesRadialPositions: false,
    allowOrganize: false,
  },
  radial: {
    value: 'radial',
    label: 'Vista radial',
    shortLabel: 'Radial',
    iconName: 'CircleDot',
    showPartners: false,
    showControls: false,
    usesColumnPositions: false,
    usesRadialPositions: true,
    allowOrganize: false,
  },
  all: {
    value: 'all',
    label: 'Todo',
    shortLabel: 'Todo',
    iconName: 'Globe',
    showPartners: true,
    showControls: true,
    usesColumnPositions: false,
    usesRadialPositions: false,
    allowOrganize: true,
  },
};

/** Ordered list for UI rendering (HUD buttons, menus, etc.) */
export const VIEW_MODE_OPTIONS = Object.values(VIEW_MODE_STRATEGIES);

/**
 * Returns the strategy for a given view mode value, falling back to 'all'.
 * @param {string} mode
 * @returns {object}
 */
export const getViewModeStrategy = (mode) => VIEW_MODE_STRATEGIES[mode] ?? VIEW_MODE_STRATEGIES.all;

/**
 * Returns true when the given mode uses column-based lineage positions.
 */
export const modeUsesColumnPositions = (mode) => getViewModeStrategy(mode).usesColumnPositions;

/**
 * Returns true when the given mode uses radial/fan positions.
 */
export const modeUsesRadialPositions = (mode) => getViewModeStrategy(mode).usesRadialPositions;

/**
 * Returns true when the organize-tree action is allowed in this mode.
 */
export const modeAllowsOrganize = (mode) => getViewModeStrategy(mode).allowOrganize;
