/**
 * StoragePort - Interface for storage adapters.
 *
 * Any adapter implementing this port must provide:
 *
 * getUsers() => { [username]: { password, treeData: { nodes, edges } } }
 * hasUsers() => boolean
 * getUserData(username) => { password, treeData: { nodes, edges } } | null
 * saveUserData(username, password, nodes, edges) => void
 * importUserData(username, password, nodes, edges) => void
 */

export class StoragePort {
  getUsers() { throw new Error('Not implemented'); }
  hasUsers() { throw new Error('Not implemented'); }
  getUserData(/* username */) { throw new Error('Not implemented'); }
  saveUserData(/* username, password, nodes, edges */) { throw new Error('Not implemented'); }
  importUserData(/* username, password, nodes, edges */) { throw new Error('Not implemented'); }
}
