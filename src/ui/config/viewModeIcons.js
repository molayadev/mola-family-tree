import { ArrowUp, ArrowDown, GitBranch, CircleDot, Trees, Globe } from 'lucide-react';
import { VIEW_MODE_STRATEGIES, VIEW_MODE_OPTIONS } from '../../domain/config/viewModeStrategies';

/**
 * VIEW_MODE_ICON_MAP
 *
 * Maps the iconName string from a VIEW_MODE_STRATEGIES entry to its Lucide
 * React component. Kept in the presentation layer to maintain clean layering:
 * domain config stays UI-free and icons are resolved only at render time.
 */
export const VIEW_MODE_ICON_MAP = {
  Trees,
  ArrowUp,
  ArrowDown,
  GitBranch,
  CircleDot,
  Globe,
};

/**
 * Returns the Lucide icon component for a given view mode value.
 */
export const getViewModeIcon = (mode) => {
  const strategy = VIEW_MODE_STRATEGIES[mode];
  return strategy ? (VIEW_MODE_ICON_MAP[strategy.iconName] ?? Globe) : Globe;
};

/**
 * Re-export VIEW_MODE_OPTIONS augmented with the resolved icon component,
 * ready for use in UI components such as CanvasHUD.
 */
export const VIEW_MODE_OPTIONS_WITH_ICONS = VIEW_MODE_OPTIONS.map(strategy => ({
  ...strategy,
  icon: VIEW_MODE_ICON_MAP[strategy.iconName] ?? Globe,
}));
