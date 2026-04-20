export class ExportImportService {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
  }

  parseAndImportJson(rawJson) {
    try {
      const json = JSON.parse(rawJson);
      if (!json.user || !json.nodes || !json.edges) {
        throw new Error('El archivo no tiene el formato correcto.');
      }

      const migratedNodes = json.nodes.map(ExportImportService.migrateNodeData);
      const migratedCustomLinkTypes = ExportImportService.migrateCustomLinkTypes(json.customLinkTypes || []);
      this.storage.importUserData(json.user, json.password, migratedNodes, json.edges, migratedCustomLinkTypes);
      return json.user;
    } catch (error) {
      if (error.message === 'El archivo no tiene el formato correcto.') {
        throw error;
      }
      throw new Error('Error al leer el archivo JSON.');
    }
  }

  exportTree(username, nodes, edges, customLinkTypes = []) {
    const userData = this.storage.getUserData(username);
    const userPass = userData?.password || '';

    const exportData = {
      user: username,
      password: userPass,
      nodes,
      edges,
      customLinkTypes,
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `${username}_arbol.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  /**
   * Migrate legacy node data that used birthYear / deathYear (number or string)
   * into the new birthDate / birthTime / deathDate format.
   *
   * Rules (from the requirements):
   *   • birthYear → birthDate = '<year>-01-01', birthTime = '00:00'
   *   • deathYear → deathDate is left blank (empty string)
   */
  static migrateNodeData(node) {
    const d = node.data || {};

    // Already migrated – nothing to do
    if (d.birthDate !== undefined && d.birthYear === undefined) return node;

    const migrated = { ...d };

    if (d.birthYear && !d.birthDate) {
      const year = String(d.birthYear).trim();
      if (year) {
        migrated.birthDate = `${year.padStart(4, '0')}-01-01`;
        migrated.birthTime = '00:00';
      }
    }

    // Death year: leave deathDate blank per requirements
    if (d.deathYear && !d.deathDate) {
      migrated.deathDate = '';
    }

    // Remove legacy fields
    delete migrated.birthYear;
    delete migrated.deathYear;

    // Ensure new fields exist
    if (migrated.birthDate === undefined) migrated.birthDate = '';
    if (migrated.birthTime === undefined) migrated.birthTime = '';
    if (migrated.deathDate === undefined) migrated.deathDate = '';
    if (migrated.twinType === undefined) migrated.twinType = '';
    if (migrated.birthOrder === undefined) migrated.birthOrder = '';

    return { ...node, data: migrated };
  }

  static migrateCustomLinkTypes(customLinkTypes) {
    if (!Array.isArray(customLinkTypes)) return [];
    const validModes = new Set(['solid', 'dashed', 'badge']);
    return customLinkTypes
      .filter(Boolean)
      .map((item) => ({
        id: String(item.id || crypto.randomUUID()),
        name: String(item.name || '').trim(),
        visualType: validModes.has(item.visualType) ? item.visualType : 'solid',
        color: typeof item.color === 'string' && item.color.trim() ? item.color.trim() : '#8B5CF6',
      }))
      .filter(item => item.name.length > 0);
  }

  importTree(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedUser = this.parseAndImportJson(e.target.result);
          resolve(importedUser);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsText(file);
    });
  }

  importTreeFromText(rawJson) {
    return Promise.resolve(this.parseAndImportJson(rawJson));
  }
}
