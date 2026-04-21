import { ExportImportService } from './ExportImportService';

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
      // Migrate legacy birthYear/deathYear data on load
      const nodes = (user.treeData?.nodes || []).map(ExportImportService.migrateNodeData);
      const edges = user.treeData?.edges || [];
      const customLinkTypes = ExportImportService.migrateCustomLinkTypes(user.treeData?.customLinkTypes || []);
      const familyGroups = ExportImportService.migrateFamilyGroups(user.treeData?.familyGroups || []);
      return {
        success: true,
        user: { username },
        treeData: { nodes, edges, customLinkTypes, familyGroups },
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
    this.storage.saveUserData(username, password, nodes, [], [], []);

    return {
      success: true,
      user: { username },
      treeData: { nodes, edges: [], customLinkTypes: [], familyGroups: [] },
    };
  }
}
