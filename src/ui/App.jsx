import { useState, useMemo, useCallback, useRef } from 'react';
import { LocalStorageAdapter } from '../infrastructure/adapters/LocalStorageAdapter';
import { AuthService } from '../application/services/AuthService';
import { TreeService } from '../application/services/TreeService';
import { ExportImportService } from '../application/services/ExportImportService';
import { UndoService } from '../application/services/UndoService';
import { createNode } from '../domain/entities/Node';
import LandingPage from './components/auth/LandingPage';
import AuthForm from './components/auth/AuthForm';
import FamilyCanvas from './components/canvas/FamilyCanvas';

// Wire up adapters (swap LocalStorageAdapter for FirestoreAdapter, etc.)
const storageAdapter = new LocalStorageAdapter();

export default function App() {
  const authService = useMemo(() => new AuthService(storageAdapter), []);
  const treeService = useMemo(() => new TreeService(storageAdapter), []);
  const exportService = useMemo(() => new ExportImportService(storageAdapter), []);
  const undoService = useMemo(() => new UndoService(), []);

  const [view, setView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [hasLocalUsersFlag, setHasLocalUsersFlag] = useState(() => authService.hasUsers());
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [customLinkTypes, setCustomLinkTypes] = useState([]);
  const [familyGroups, setFamilyGroups] = useState([]);

  const usernameRef = useRef(null);
  const latestTreeRef = useRef({ nodes: [], edges: [], customLinkTypes: [], familyGroups: [] });

  const refreshHasUsers = useCallback(() => {
    setHasLocalUsersFlag(authService.hasUsers());
  }, [authService]);

  const handleLogin = useCallback((username, password) => {
    const result = authService.login(username, password);
    if (result.success) {
      setCurrentUser(result.user);
      const loadedNodes = result.treeData.nodes || [];
      const loadedEdges = result.treeData.edges || [];
      const loadedCustomLinkTypes = result.treeData.customLinkTypes || [];
      const loadedFamilyGroups = result.treeData.familyGroups || [];

      usernameRef.current = result.user.username;
      setNodes(loadedNodes);
      setEdges(loadedEdges);
      setCustomLinkTypes(loadedCustomLinkTypes);
      setFamilyGroups(loadedFamilyGroups);
      latestTreeRef.current = {
        nodes: loadedNodes,
        edges: loadedEdges,
        customLinkTypes: loadedCustomLinkTypes,
        familyGroups: loadedFamilyGroups,
      };
      setView('canvas');

      if (loadedNodes.length === 0) {
        const initialNode = createNode({ id: 'root', x: 0, y: 0, firstName: 'Yo', gender: 'unknown' });
        treeService.save(username, [initialNode], [], loadedCustomLinkTypes, loadedFamilyGroups);
        setNodes([initialNode]);
        latestTreeRef.current = {
          nodes: [initialNode],
          edges: [],
          customLinkTypes: loadedCustomLinkTypes,
          familyGroups: loadedFamilyGroups,
        };
      }
      return { success: true };
    }
    return { error: result.error };
  }, [authService, treeService]);

  const handleRegister = useCallback((username, password) => {
    const initialNode = createNode({ x: 0, y: 0, firstName: 'Yo', gender: 'unknown' });
    const result = authService.register(username, password, initialNode);
    if (result.success) {
      setCurrentUser(result.user);
      usernameRef.current = result.user.username;
      setNodes(result.treeData.nodes);
      setEdges(result.treeData.edges);
      setCustomLinkTypes(result.treeData.customLinkTypes || []);
      setFamilyGroups(result.treeData.familyGroups || []);
      latestTreeRef.current = {
        nodes: result.treeData.nodes,
        edges: result.treeData.edges,
        customLinkTypes: result.treeData.customLinkTypes || [],
        familyGroups: result.treeData.familyGroups || [],
      };
      refreshHasUsers();
      setView('canvas');
      return { success: true };
    }
    return { error: result.error };
  }, [authService, refreshHasUsers]);

  const handleImport = useCallback(async (file) => {
    try {
      const importedUser = await exportService.importTree(file);
      refreshHasUsers();
      alert(`¡Árbol de ${importedUser} importado con éxito! Ahora puedes iniciar sesión.`);
    } catch (err) {
      alert(err.message);
    }
  }, [exportService, refreshHasUsers]);

  const handleImportFromText = useCallback(async (rawJson) => {
    try {
      const importedUser = await exportService.importTreeFromText(rawJson);
      refreshHasUsers();
      alert(`¡Árbol de ${importedUser} importado con éxito! Ahora puedes iniciar sesión.`);
    } catch (err) {
      alert(err.message);
    }
  }, [exportService, refreshHasUsers]);

  const handleSave = useCallback((newNodes, newEdges, newCustomLinkTypes = customLinkTypes, newFamilyGroups = familyGroups) => {
    latestTreeRef.current = {
      nodes: newNodes,
      edges: newEdges,
      customLinkTypes: newCustomLinkTypes,
      familyGroups: newFamilyGroups,
    };

    setNodes(newNodes);
    setEdges(newEdges);
    setCustomLinkTypes(newCustomLinkTypes);
    setFamilyGroups(newFamilyGroups);

    const username = usernameRef.current || currentUser?.username;
    if (!username) return;
    treeService.save(username, newNodes, newEdges, newCustomLinkTypes, newFamilyGroups);
  }, [currentUser, treeService, customLinkTypes, familyGroups]);

  const handleLogout = useCallback(() => {
    const username = usernameRef.current || currentUser?.username;
    if (username) {
      const latestTree = latestTreeRef.current;
      treeService.save(
        username,
        latestTree.nodes,
        latestTree.edges,
        latestTree.customLinkTypes,
        latestTree.familyGroups,
      );
    }

    setView('landing');
    setCurrentUser(null);
    usernameRef.current = null;
    setNodes([]);
    setEdges([]);
    setCustomLinkTypes([]);
    setFamilyGroups([]);
    latestTreeRef.current = { nodes: [], edges: [], customLinkTypes: [], familyGroups: [] };
  }, []);

  if (view === 'landing') {
    return (
        <LandingPage
          onLogin={() => setView('login')}
          onRegister={() => setView('register')}
          onImport={handleImport}
          onImportFromText={handleImportFromText}
          hasLocalUsers={hasLocalUsersFlag}
        />
      );
  }

  if (view === 'login') {
    return <AuthForm mode="login" onSubmit={handleLogin} onCancel={() => setView('landing')} />;
  }

  if (view === 'register') {
    return <AuthForm mode="register" onSubmit={handleRegister} onCancel={() => setView('landing')} />;
  }

  return (
    <FamilyCanvas
      username={currentUser.username}
      nodes={nodes}
      edges={edges}
      customLinkTypes={customLinkTypes}
      familyGroups={familyGroups}
      treeService={treeService}
      exportService={exportService}
      undoService={undoService}
      onSave={handleSave}
      onLogout={handleLogout}
    />
  );
}
