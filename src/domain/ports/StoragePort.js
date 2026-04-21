/**
 * StoragePort - Interface for storage adapters.
 *
 * Any adapter implementing this port must provide:
 *
 * getUsers() => { [username]: { password, treeData: { nodes, edges, customLinkTypes, familyGroups } } }
 * hasUsers() => boolean
 * getUserData(username) => { password, treeData: { nodes, edges, customLinkTypes, familyGroups } } | null
 * saveUserData(username, password, nodes, edges, customLinkTypes, familyGroups) => void
 * importUserData(username, password, nodes, edges, customLinkTypes, familyGroups) => void
 */

export class StoragePort {
  getUsers() { throw new Error('Not implemented'); }
  hasUsers() { throw new Error('Not implemented'); }
  getUserData(/* username */) { throw new Error('Not implemented'); }
  saveUserData(/* username, password, nodes, edges, customLinkTypes, familyGroups */) { throw new Error('Not implemented'); }
  importUserData(/* username, password, nodes, edges, customLinkTypes, familyGroups */) { throw new Error('Not implemented'); }
}
