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

          this.storage.importUserData(json.user, json.password, json.nodes, json.edges);
          resolve(json.user);
        } catch {
          reject(new Error('Error al leer el archivo JSON.'));
        }
      };
      reader.readAsText(file);
    });
  }
}
