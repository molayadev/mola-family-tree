export class ExportImportService {
  constructor(storageAdapter) {
    this.storage = storageAdapter;
  }

  static hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /**
   * Parse, validate and migrate a JSON backup string without saving it.
   * Returns { user, password, nodes, edges, customLinkTypes, familyGroups }.
   * Throws if the JSON is malformed or missing required keys.
   */
  static parseImportData(rawJson) {
    try {
      const json = JSON.parse(rawJson);
      const hasRequiredKeys = json &&
        ExportImportService.hasOwn(json, 'user') &&
        ExportImportService.hasOwn(json, 'nodes') &&
        ExportImportService.hasOwn(json, 'edges');

      if (!hasRequiredKeys || !Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
        throw new Error('El archivo no tiene el formato correcto.');
      }

      return {
        user: json.user,
        password: json.password,
        nodes: json.nodes.map(ExportImportService.migrateNodeData),
        edges: json.edges.map(ExportImportService.migrateEdgeData),
        customLinkTypes: ExportImportService.migrateCustomLinkTypes(json.customLinkTypes || []),
        familyGroups: ExportImportService.migrateFamilyGroups(json.familyGroups || []),
      };
    } catch (error) {
      if (error.message === 'El archivo no tiene el formato correcto.') {
        throw error;
      }
      throw new Error('Error al leer el archivo JSON.');
    }
  }

  parseAndImportJson(rawJson) {
    const parsed = ExportImportService.parseImportData(rawJson);
    this.storage.importUserData(
      String(parsed.user ?? ''),
      String(parsed.password ?? ''),
      parsed.nodes,
      parsed.edges,
      parsed.customLinkTypes,
      parsed.familyGroups,
    );
    return parsed.user;
  }

  exportTree(username, nodes, edges, customLinkTypes = [], familyGroups = []) {
    const userData = this.storage.getUserData(username);
    const userPass = userData?.password || '';

    const exportData = {
      user: username,
      password: userPass,
      nodes: nodes.map(ExportImportService.migrateNodeData),
      edges: edges.map(ExportImportService.migrateEdgeData),
    };

    if (customLinkTypes.length > 0) {
      exportData.customLinkTypes = ExportImportService.migrateCustomLinkTypes(customLinkTypes);
    }

    if (familyGroups.length > 0) {
      exportData.familyGroups = ExportImportService.migrateFamilyGroups(familyGroups);
    }

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

    // Ensure legacy fields always exist in persisted JSON
    if (migrated.firstName === undefined) migrated.firstName = '';
    if (migrated.lastName === undefined) migrated.lastName = '';
    if (migrated.gender === undefined) migrated.gender = 'unknown';
    if (migrated.additionalInfo === undefined) migrated.additionalInfo = '';

    // Ensure new fields exist
    if (migrated.birthDate === undefined) migrated.birthDate = '';
    if (migrated.birthTime === undefined) migrated.birthTime = '';
    if (migrated.deathDate === undefined) migrated.deathDate = '';
    if (migrated.twinType === undefined) migrated.twinType = '';
    if (migrated.birthOrder === undefined) migrated.birthOrder = '';
    if (migrated.ascendantSign === undefined) migrated.ascendantSign = '';
    if (migrated.sunSign === undefined) migrated.sunSign = '';
    if (migrated.moonSign === undefined) migrated.moonSign = '';
    if (migrated.birthLatitude === undefined) migrated.birthLatitude = '';
    if (migrated.birthLongitude === undefined) migrated.birthLongitude = '';

    return { ...node, data: migrated };
  }

  static migrateEdgeData(edge) {
    const migrated = { ...edge };
    if (migrated.id === undefined) migrated.id = '';
    if (migrated.from === undefined) migrated.from = '';
    if (migrated.to === undefined) migrated.to = '';
    if (migrated.type === undefined) migrated.type = 'parent';
    if (migrated.label === undefined) migrated.label = migrated.type === 'sibling' ? 'Hermano/a' : 'Biológico';
    if (migrated.customLinkId === undefined) migrated.customLinkId = '';
    if (migrated.styleMode === undefined) migrated.styleMode = '';
    if (migrated.styleColor === undefined) migrated.styleColor = '';
    return migrated;
  }

  static migrateCustomLinkTypes(customLinkTypes) {
    if (!Array.isArray(customLinkTypes)) return [];
    const validModes = new Set(['solid', 'dashed', 'badge']);
    return customLinkTypes
      .filter(Boolean)
      .map((item, index) => {
        const name = String(item.name || '').trim();
        const visualType = validModes.has(item.visualType) ? item.visualType : 'solid';
        const sanitizedSeed = `${name}-${visualType}-${index}`
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        const deterministicId = `legacy-${sanitizedSeed || index}`;
        return {
          id: String(item.id || deterministicId),
          name,
          visualType,
          color: typeof item.color === 'string' && item.color.trim() ? item.color.trim() : '#8B5CF6',
        };
      })
      .filter(item => item.name.length > 0);
  }

  static migrateFamilyGroups(familyGroups) {
    if (!Array.isArray(familyGroups)) return [];
    return familyGroups
      .filter(Boolean)
      .map((item, index) => {
        const nodeIds = Array.isArray(item.nodeIds)
          ? item.nodeIds.filter(id => id !== null && id !== undefined && id !== '').map(String)
          : [];
        return {
          id: String(item.id || `family-group-${index}`),
          label: String(item.label || '').trim(),
          emoji: String(item.emoji || '👨‍👩‍👧'),
          color: typeof item.color === 'string' && item.color.trim() ? item.color.trim() : '#F97316',
          nodeIds: [...new Set(nodeIds)],
          collapsed: Boolean(item.collapsed),
        };
      })
      .filter(item => item.nodeIds.length > 0);
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
