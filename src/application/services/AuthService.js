export class AuthService {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
  }

  hasUsers() {
    return this.storage.hasUsers();
  }

  login(username, password) {
    const user = this.storage.getUserData(username);
    if (user && user.password === password) {
      return {
        success: true,
        user: { username },
        treeData: user.treeData || { nodes: [], edges: [] },
      };
    }
    return { success: false, error: 'Credenciales inválidas' };
  }

  register(username, password, initialNode) {
    const existing = this.storage.getUserData(username);
    if (existing) {
      return { success: false, error: 'El usuario ya existe' };
    }

    const nodes = initialNode ? [initialNode] : [];
    this.storage.saveUserData(username, password, nodes, []);

    return {
      success: true,
      user: { username },
      treeData: { nodes, edges: [] },
    };
  }
}
