import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { LocalStorageAdapter } from '../infrastructure/adapters/LocalStorageAdapter';
import { FirestoreAdapter } from '../infrastructure/adapters/FirestoreAdapter';
import { FirebaseAuthAdapter } from '../infrastructure/adapters/FirebaseAuthAdapter';
import { FirebaseAuthService } from '../application/services/FirebaseAuthService';
import { AuthService } from '../application/services/AuthService';
import { TreeService } from '../application/services/TreeService';
import { ExportImportService } from '../application/services/ExportImportService';
import { UndoService } from '../application/services/UndoService';
import { createNode } from '../domain/entities/Node';
import LandingPage from './components/auth/LandingPage';
import AuthForm from './components/auth/AuthForm';
import FamilyCanvas from './components/canvas/FamilyCanvas';

// Local storage adapter (always present for local-mode users)
const localStorageAdapter = new LocalStorageAdapter();
const firebaseAuthService = new FirebaseAuthService(new FirebaseAuthAdapter());

export default function App() {
  // ── Auth mode: 'local' | 'firebase' ────────────────────────────────────────
  const [authMode, setAuthMode] = useState(null); // null = unknown (checking Firebase session)

  const authService = useMemo(() => new AuthService(localStorageAdapter), []);
  const [treeService, setTreeService] = useState(() => new TreeService(localStorageAdapter));
  const [exportService, setExportService] = useState(() => new ExportImportService(localStorageAdapter));
  const undoService = useMemo(() => new UndoService(), []);

  const [view, setView] = useState('landing');
  const [currentUser, setCurrentUser] = useState(null);
  const [hasLocalUsersFlag, setHasLocalUsersFlag] = useState(() => authService.hasUsers());
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [customLinkTypes, setCustomLinkTypes] = useState([]);
  const [familyGroups, setFamilyGroups] = useState([]);
  const [firebaseLoading, setFirebaseLoading] = useState(true);

  const usernameRef = useRef(null);
  const latestTreeRef = useRef({ nodes: [], edges: [], customLinkTypes: [], familyGroups: [] });

  // ── Helper: bootstrap Firebase user into the canvas ────────────────────────
  const loadFirebaseUser = useCallback(async (firebaseUser) => {
    const firestoreAdapter = new FirestoreAdapter(firebaseUser.uid);
    const fbTreeService = new TreeService(firestoreAdapter);
    const fbExportService = new ExportImportService(firestoreAdapter);

    setTreeService(fbTreeService);
    setExportService(fbExportService);

    const displayName = firebaseUser.displayName || firebaseUser.email || firebaseUser.uid;
    usernameRef.current = firebaseUser.uid;
    setCurrentUser({ username: displayName, uid: firebaseUser.uid });

    // Navigate to canvas immediately so the user is not blocked by a full-page spinner.
    // The tree data will be filled in once the Firestore fetch completes below.
    setAuthMode('firebase');
    setFirebaseLoading(false);
    setView('canvas');

    const userData = await firestoreAdapter.getUserData();
    const loadedNodes = (userData.treeData.nodes || []).map(ExportImportService.migrateNodeData);
    const loadedEdges = userData.treeData.edges || [];
    const loadedCustomLinkTypes = ExportImportService.migrateCustomLinkTypes(userData.treeData.customLinkTypes || []);
    const loadedFamilyGroups = ExportImportService.migrateFamilyGroups(userData.treeData.familyGroups || []);

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

    if (loadedNodes.length === 0) {
      const initialNode = createNode({ id: 'root', x: 0, y: 0, firstName: 'Yo', gender: 'unknown' });
      await fbTreeService.save(firebaseUser.uid, [initialNode], [], loadedCustomLinkTypes, loadedFamilyGroups);
      setNodes([initialNode]);
      latestTreeRef.current = {
        nodes: [initialNode],
        edges: [],
        customLinkTypes: loadedCustomLinkTypes,
        familyGroups: loadedFamilyGroups,
      };
    }
  // State setters and refs are stable; no external deps needed
  }, []);

  // ── Listen for persistent Firebase session on mount ────────────────────────
  useEffect(() => {
    const unsubscribe = firebaseAuthService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await loadFirebaseUser(firebaseUser);
      } else {
        setAuthMode('local');
        setFirebaseLoading(false);
      }
    });
    return unsubscribe;
  // loadFirebaseUser is stable (empty deps useCallback)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshHasUsers = useCallback(() => {
    setHasLocalUsersFlag(authService.hasUsers());
  }, [authService]);

  // ── Google Sign-in ──────────────────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async () => {
    try {
      const firebaseUser = await firebaseAuthService.signInWithGoogle();
      await loadFirebaseUser(firebaseUser);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') {
        alert(`Error al iniciar sesión con Google: ${err.message}`);
      }
    }
  }, [loadFirebaseUser]);

  // ── Local login / register ─────────────────────────────────────────────────
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
      setAuthMode('local');
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
      setAuthMode('local');
      setView('canvas');
      return { success: true };
    }
    return { error: result.error };
  }, [authService, refreshHasUsers]);

  // ── Import (local landing page) ────────────────────────────────────────────
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

  // ── Import into Firestore (firebase mode, from canvas) ─────────────────────
  const handleFirebaseImportFromText = useCallback(async (rawJson) => {
    // Parse and validate first so we can update state immediately after saving
    const parsed = ExportImportService.parseImportData(rawJson);
    // Save the imported data to Firestore
    await exportService.importTreeFromText(rawJson);
    // Update React state so the canvas reflects the imported tree right away
    setNodes(parsed.nodes);
    setEdges(parsed.edges);
    setCustomLinkTypes(parsed.customLinkTypes);
    setFamilyGroups(parsed.familyGroups);
    latestTreeRef.current = {
      nodes: parsed.nodes,
      edges: parsed.edges,
      customLinkTypes: parsed.customLinkTypes,
      familyGroups: parsed.familyGroups,
    };
    return parsed.user;
  }, [exportService]);

  const handleFirebaseImport = useCallback(async (file) => {
    const rawJson = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error al leer el archivo JSON.'));
      reader.readAsText(file);
    });
    return handleFirebaseImportFromText(rawJson);
  }, [handleFirebaseImportFromText]);

  // ── Save ───────────────────────────────────────────────────────────────────
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

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = useCallback(async () => {
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

    if (authMode === 'firebase') {
      try {
        await firebaseAuthService.signOut();
      } catch {
        // ignore sign-out errors
      }
    }

    // Reset local tree state
    setTreeService(new TreeService(localStorageAdapter));
    setExportService(new ExportImportService(localStorageAdapter));
    setAuthMode('local');
    setView('landing');
    setCurrentUser(null);
    usernameRef.current = null;
    setNodes([]);
    setEdges([]);
    setCustomLinkTypes([]);
    setFamilyGroups([]);
    latestTreeRef.current = { nodes: [], edges: [], customLinkTypes: [], familyGroups: [] };
  }, [authMode, currentUser, treeService]);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (firebaseLoading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-300 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (view === 'landing') {
    return (
        <LandingPage
          onLogin={() => setView('login')}
          onRegister={() => setView('register')}
          onImport={handleImport}
          onImportFromText={handleImportFromText}
          hasLocalUsers={hasLocalUsersFlag}
          onGoogleSignIn={handleGoogleSignIn}
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
      isFirebaseMode={authMode === 'firebase'}
      onFirebaseImport={authMode === 'firebase' ? handleFirebaseImport : null}
      onFirebaseImportFromText={authMode === 'firebase' ? handleFirebaseImportFromText : null}
    />
  );
}
