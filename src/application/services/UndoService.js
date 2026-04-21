/**
 * UndoService manages the undo history for the family tree.
 * It maintains a stack of up to 5 previous states (nodes, edges, and customLinkTypes).
 * This service does NOT support redo functionality - only undo.
 */
export class UndoService {
  constructor() {
    this.maxHistorySize = 5;
    this.history = []; // Stack of previous states: [{ nodes, edges, customLinkTypes }, ...]
  }

  /**
   * Save the current state (nodes, edges, and customLinkTypes) to the history stack.
   * This should be called BEFORE performing any action that should be undoable.
   * 
   * @param {Array} nodes - Current nodes array
   * @param {Array} edges - Current edges array
   * @param {Array} customLinkTypes - Current custom link types array
   */
  saveState(nodes, edges, customLinkTypes = []) {
    // Create deep copies to avoid reference issues
    const state = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      customLinkTypes: JSON.parse(JSON.stringify(customLinkTypes)),
    };

    this.history.push(state);

    // Keep only the last 5 states
    if (this.history.length > this.maxHistorySize) {
      this.history.shift(); // Remove the oldest state
    }
  }

  /**
   * Undo the last action by retrieving the previous state.
   * Returns null if there's no history to undo.
   * 
   * @returns {Object|null} Previous state { nodes, edges, customLinkTypes } or null if no history
   */
  undo() {
    if (this.history.length === 0) {
      return null; // Nothing to undo
    }

    // Get the last saved state and remove it from history
    const previousState = this.history.pop();
    return previousState;
  }

  /**
   * Check if there are states available to undo.
   * 
   * @returns {boolean} True if undo is possible
   */
  canUndo() {
    return this.history.length > 0;
  }

  /**
   * Get the current history size.
   * 
   * @returns {number} Number of states in history
   */
  getHistorySize() {
    return this.history.length;
  }

  /**
   * Clear all history.
   */
  clearHistory() {
    this.history = [];
  }
}
