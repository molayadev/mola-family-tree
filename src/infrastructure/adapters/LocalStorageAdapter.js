import { StoragePort } from '../../domain/ports/StoragePort';
import { STORAGE_KEY } from '../../domain/config/constants';

export class LocalStorageAdapter extends StoragePort {
  #getDb() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
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
    return user || null;
  }

  saveUserData(username, password, nodes, edges) {
    const db = this.#getDb();
    const currentPass = password ?? db.users[username]?.password;
    db.users[username] = {
      password: currentPass,
      treeData: { nodes, edges },
    };
    this.#saveDb(db);
  }

  importUserData(username, password, nodes, edges) {
    const db = this.#getDb();
    db.users[username] = {
      password: password || '1234',
      treeData: { nodes, edges },
    };
    this.#saveDb(db);
  }
}
