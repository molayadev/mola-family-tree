import { StoragePort } from '../../domain/ports/StoragePort';
import { STORAGE_KEY } from '../../domain/config/constants';

export class LocalStorageAdapter extends StoragePort {
  #getDb() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
  }

  #normalizeTreeData(record) {
    const treeData = record?.treeData || record || {};
    return {
      nodes: Array.isArray(treeData.nodes) ? treeData.nodes : [],
      edges: Array.isArray(treeData.edges) ? treeData.edges : [],
      customLinkTypes: Array.isArray(treeData.customLinkTypes) ? treeData.customLinkTypes : [],
      familyGroups: Array.isArray(treeData.familyGroups) ? treeData.familyGroups : [],
    };
  }

  #buildStoredUserRecord(password, nodes, edges, customLinkTypes = [], familyGroups = []) {
    const treeData = { nodes, edges, customLinkTypes, familyGroups };
    return {
      password,
      // Legacy-compatible flattened shape
      nodes,
      edges,
      customLinkTypes,
      familyGroups,
      // Current app shape
      treeData,
    };
  }

  #saveDb(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  getUsers() {
    return this.#getDb().users;
  }

  hasUsers() {
    return Object.keys(this.#getDb().users).length > 0;
  }

  getUserData(username) {
    const user = this.#getDb().users[username];
    if (!user) return null;
    return {
      password: user.password || '',
      treeData: this.#normalizeTreeData(user),
    };
  }

  saveUserData(username, password, nodes, edges, customLinkTypes = [], familyGroups = []) {
    const db = this.#getDb();
    const currentPass = password ?? db.users[username]?.password;
    db.users[username] = this.#buildStoredUserRecord(currentPass, nodes, edges, customLinkTypes, familyGroups);
    this.#saveDb(db);
  }

  importUserData(username, password, nodes, edges, customLinkTypes = [], familyGroups = []) {
    const db = this.#getDb();
    db.users[username] = this.#buildStoredUserRecord(password || '1234', nodes, edges, customLinkTypes, familyGroups);
    this.#saveDb(db);
  }
}
