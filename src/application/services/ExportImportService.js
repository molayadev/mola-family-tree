export class ExportImportService {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
  }

  exportTree(username, nodes, edges) {
    const userData = this.storage.getUserData(username);
    const userPass = userData?.password || '';

    const exportData = {
      user: username,
      password: userPass,
      nodes,
      edges,
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

  importTree(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target.result);
          if (!json.user || !json.nodes || !json.edges) {
            reject(new Error('El archivo no tiene el formato correcto.'));
            return;
          }

          // Migrate legacy birthYear / deathYear data
          const migratedNodes = json.nodes.map(ExportImportService.migrateNodeData);

          this.storage.importUserData(json.user, json.password, migratedNodes, json.edges);
          resolve(json.user);
        } catch {
          reject(new Error('Error al leer el archivo JSON.'));
        }
      };
      reader.readAsText(file);
    });
  }
}
