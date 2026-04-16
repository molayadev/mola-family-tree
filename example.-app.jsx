import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  User, 
  Trash2, 
  Edit2, 
  ZoomIn, 
  ZoomOut, 
  Download, 
  Upload, 
  LogOut, 
  Heart, 
  HeartCrack, // Nuevo icono para divorcios/ex-parejas
  ArrowUp, 
  ArrowDown, 
  MoreHorizontal,
  Target,
  Move,
  Link as LinkIcon // Importación corregida para evitar ReferenceError
} from 'lucide-react';

// --- CONFIGURACIÓN Y UTILIDADES ---

const STORAGE_KEY = 'familyCanvas_db_v1';

const COLORS = {
  male: { bg: 'bg-blue-100', border: 'border-blue-500', icon: 'text-blue-600' },
  female: { bg: 'bg-pink-100', border: 'border-pink-500', icon: 'text-pink-600' },
  unknown: { bg: 'bg-gray-100', border: 'border-gray-400', icon: 'text-gray-500' }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- COMPONENTES UI ---

const Button = ({ children, onClick, variant = 'primary', disabled = false, className = '' }) => {
  const baseStyle = "px-6 py-3 rounded-full font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2";
  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 shadow-lg hover:shadow-orange-500/30",
    secondary: "bg-white text-gray-700 border-2 border-gray-200 hover:border-orange-300 hover:bg-orange-50",
    outline: "border-2 border-white text-white hover:bg-white/10",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "bg-transparent text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-transparent hover:border-gray-200"
  };
  
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ label, type = "text", value, onChange, placeholder }) => (
  <div className="mb-4">
    <label className="block text-sm font-medium text-gray-600 mb-1 ml-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-4 py-2 rounded-xl border border-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
    />
  </div>
);

// --- PANTALLAS DE AUTENTICACIÓN ---

const LandingPage = ({ onLogin, onRegister, onImport, hasLocalUsers }) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
    }
    e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-[#FDFbf7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
         <div className="absolute top-10 left-10 w-64 h-64 rounded-full bg-orange-300 blur-3xl"></div>
         <div className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-blue-300 blur-3xl"></div>
      </div>

      <div className="z-10 text-center max-w-md w-full">
        <div className="mb-8 flex justify-center">
          <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
             <User size={48} className="text-orange-500" />
          </div>
        </div>
        <h1 className="text-4xl font-bold text-gray-800 mb-2">FamilyCanvas</h1>
        <p className="text-gray-500 mb-10 text-lg">Descubre tu historia, conecta generaciones.</p>
        
        <div className="space-y-4 flex flex-col">
          <Button variant="secondary" onClick={onLogin} disabled={!hasLocalUsers} className="w-full">
            {hasLocalUsers ? 'Continuar con mi árbol' : 'No hay árboles guardados'}
          </Button>
          
          <Button onClick={onRegister} className="w-full">
            Crear nuevo árbol
          </Button>

          <div className="relative w-full pt-4 border-t border-gray-200 mt-4">
             <input type="file" accept=".json" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
             <Button variant="ghost" onClick={() => fileInputRef.current.click()} className="w-full text-sm">
                <Upload size={16} /> Importar Respaldo (JSON)
             </Button>
          </div>
        </div>

        {!hasLocalUsers && (
          <p className="mt-6 text-sm text-gray-400">
            Los datos se guardarán localmente en este dispositivo.
          </p>
        )}
      </div>
    </div>
  );
};

const AuthForm = ({ mode, onSubmit, onCancel }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Por favor completa todos los campos');
      return;
    }
    const result = onSubmit(username, password);
    if (result?.error) setError(result.error);
  };

  return (
    <div className="min-h-screen bg-[#FDFbf7] flex items-center justify-center p-6">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full border border-orange-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          {mode === 'login' ? 'Bienvenido de nuevo' : 'Comienza tu legado'}
        </h2>
        
        {error && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">{error}</div>}

        <form onSubmit={handleSubmit}>
          <Input label="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Ej. familia_perez" />
          <Input label="Clave de acceso" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="******" />
          
          <div className="mt-8 space-y-3">
            <Button className="w-full" onClick={handleSubmit}>
              {mode === 'login' ? 'Entrar' : 'Crear Árbol'}
            </Button>
            <button type="button" onClick={onCancel} className="w-full py-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- COMPONENTES DEL CANVAS Y MODALES ---

const RadialMenu = ({ x, y, onClose, onAction, zoom }) => {
  const scale = 1 / Math.max(0.5, zoom); 

  // Botones más grandes (w-14 h-14 = 56px) para facilitar clic en móviles
  const btnStyle = "absolute w-14 h-14 bg-white rounded-full shadow-xl border-2 border-orange-100 flex items-center justify-center hover:bg-orange-50 active:scale-95 transition-all";
  const textStyle = "absolute top-16 bg-white/95 px-3 py-1 rounded-lg text-xs font-semibold text-gray-700 shadow-md whitespace-nowrap pointer-events-none";

  return (
    <div 
      className="absolute pointer-events-none z-50 flex items-center justify-center"
      style={{ left: x, top: y, width: 0, height: 0 }}
    >
      <div 
        className="relative pointer-events-auto animate-in fade-in zoom-in duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        {/* Aro decorativo central más amplio */}
        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-orange-200/50 pointer-events-none"></div>

        {/* Padres (Norte: -90 deg) */}
        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -28, top: -138 }} onClick={(e) => { e.stopPropagation(); onAction('add_parents'); }}>
           <div className={btnStyle}><ArrowUp size={24} className="text-orange-500" /></div>
           <span className={textStyle}>Padres</span>
        </div>

        {/* Hijo (Sur: 90 deg) */}
        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -28, top: 82 }} onClick={(e) => { e.stopPropagation(); onAction('add_child'); }}>
           <div className={btnStyle}><ArrowDown size={24} className="text-orange-500" /></div>
           <span className={textStyle}>Hijo</span>
        </div>

        {/* Cónyuge (Este: 0 deg) */}
        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: 82, top: -28 }} onClick={(e) => { e.stopPropagation(); onAction('add_spouse'); }}>
           <div className={btnStyle}><Heart size={24} className="text-pink-500" /></div>
           <span className={textStyle}>Cónyuge</span>
        </div>

        {/* Ex-pareja (Sureste: 45 deg) */}
        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: 50, top: 50 }} onClick={(e) => { e.stopPropagation(); onAction('add_ex_spouse'); }}>
           <div className={`${btnStyle} border-gray-200 hover:bg-gray-50`}><HeartCrack size={24} className="text-gray-400" /></div>
           <span className={textStyle}>Ex-pareja</span>
        </div>
        
        {/* Editar (Oeste: 180 deg) */}
        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -138, top: -28 }} onClick={(e) => { e.stopPropagation(); onAction('edit'); }}>
           <div className={btnStyle}><Edit2 size={24} className="text-blue-500" /></div>
           <span className={textStyle}>Editar</span>
        </div>

        {/* Vínculos (Noroeste: -135 deg) */}
        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -106, top: -106 }} onClick={(e) => { e.stopPropagation(); onAction('manage_links'); }}>
           <div className={`${btnStyle} border-purple-200 hover:bg-purple-50`}><LinkIcon size={24} className="text-purple-500" /></div>
           <span className={textStyle}>Vínculos</span>
        </div>

        {/* Eliminar (Suroeste: 135 deg) */}
         <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -106, top: 50 }} onClick={(e) => { e.stopPropagation(); onAction('delete'); }}>
           <div className={`${btnStyle} border-red-100 hover:bg-red-50`}><Trash2 size={24} className="text-red-500" /></div>
           <span className={textStyle}>Eliminar</span>
        </div>

      </div>
      <div className="fixed inset-0 z-[-1]" onClick={onClose}></div>
    </div>
  );
};

const PartnerSelectionModal = ({ selection, nodes, onClose, onSelect }) => {
  if (!selection) return null;
  
  return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in">
        <div className="bg-white p-6 rounded-3xl shadow-xl max-w-sm w-full animate-in zoom-in duration-200">
           <h3 className="font-bold text-xl mb-2 text-gray-800">Añadir Hijo</h3>
           <p className="text-gray-500 text-sm mb-6">¿Con quién tuvo este hijo? El sistema conectará al hijo con ambos padres automáticamente.</p>
           
           <div className="space-y-3">
              {selection.partners.map(pId => {
                 const p = nodes.find(n => n.id === pId);
                 if(!p) return null;
                 return (
                     <button 
                       key={pId} 
                       className="w-full p-4 text-left border-2 border-orange-100 rounded-2xl hover:bg-orange-50 hover:border-orange-300 transition-colors flex items-center gap-3 shadow-sm"
                       onClick={() => onSelect(pId)}
                     >
                        <div className={`p-2 rounded-full ${COLORS[p.data.gender]?.bg || COLORS.unknown.bg}`}>
                          <User size={20} className={COLORS[p.data.gender]?.icon || COLORS.unknown.icon} />
                        </div>
                        <span className="font-bold text-gray-700">{p.data.firstName} {p.data.lastName}</span>
                     </button>
                 )
              })}
              
              <div className="relative py-4 flex items-center">
                 <div className="flex-grow border-t border-gray-200"></div>
                 <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase font-bold">O alternativamente</span>
                 <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button 
                 className="w-full p-4 text-center border-2 border-gray-100 rounded-2xl hover:bg-gray-50 hover:border-gray-300 transition-colors text-gray-500 font-medium"
                 onClick={() => onSelect(null)}
              >
                 Padre/Madre Desconocido (Solo)
              </button>
           </div>
           
           <button onClick={onClose} className="mt-6 w-full py-2 text-gray-400 hover:text-gray-600 font-medium">Cancelar</button>
        </div>
     </div>
  )
}

const LinksModal = ({ nodeId, isOpen, onClose, nodes, edges, onUpdateLink, onDeleteLink }) => {
  if (!isOpen || !nodeId) return null;

  const nodeEdges = edges.filter(e => e.from === nodeId || e.to === nodeId);

  const getEdgeDetails = (edge) => {
    const isSourceFrom = edge.from === nodeId;
    const targetId = isSourceFrom ? edge.to : edge.from;
    const targetNode = nodes.find(n => n.id === targetId);
    
    let label = '';
    if (edge.type === 'parent') {
       label = isSourceFrom ? 'Hijo/a' : 'Padre/Madre';
    } else if (edge.type === 'spouse') {
       label = 'Cónyuge';
    } else if (edge.type === 'ex_spouse') {
       label = 'Ex-pareja';
    }
    return { targetId, targetNode, label };
  };

  // Generar sugerencias inteligentes (ej. si cambias un padre, sugiere las parejas de la madre actual)
  const getSuggestions = (edgeToEdit) => {
     if(edgeToEdit.type !== 'parent') return [];
     const isSourceFrom = edgeToEdit.from === nodeId;
     if(isSourceFrom) return []; 
     
     const otherParentsEdges = nodeEdges.filter(e => e.type === 'parent' && e.to === nodeId && e.id !== edgeToEdit.id);
     let suggestions = [];
     
     otherParentsEdges.forEach(opEdge => {
        const otherParentId = opEdge.from;
        const partners = edges.filter(e => (e.from === otherParentId || e.to === otherParentId) && (e.type === 'spouse' || e.type === 'ex_spouse'));
        partners.forEach(pEdge => {
           const partnerId = pEdge.from === otherParentId ? pEdge.to : pEdge.from;
           if(partnerId !== edgeToEdit.from) {
              suggestions.push(partnerId);
           }
        });
     });
     return [...new Set(suggestions)];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#FFF8F0] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-purple-500 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg flex items-center gap-2"><LinkIcon size={20}/> Gestor de Vínculos</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><MoreHorizontal /></button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {nodeEdges.length === 0 ? (
             <p className="text-gray-500 text-sm text-center py-4">No hay vínculos registrados para esta persona.</p>
          ) : (
             nodeEdges.map(edge => {
               const { targetId, label } = getEdgeDetails(edge);
               const suggestions = getSuggestions(edge);

               return (
                 <div key={edge.id} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-purple-600 uppercase tracking-wide bg-purple-50 px-2 py-1 rounded">{label}</span>
                       <button onClick={() => onDeleteLink(edge.id)} className="text-red-400 hover:text-red-600 p-1" title="Eliminar vínculo">
                          <Trash2 size={16} />
                       </button>
                    </div>
                    
                    <select 
                       className="w-full p-2 rounded-lg border border-gray-200 focus:border-purple-400 outline-none text-sm text-gray-700 bg-gray-50"
                       value={targetId}
                       onChange={(e) => onUpdateLink(edge.id, e.target.value)}
                    >
                       <option disabled value={targetId}>{nodes.find(n => n.id === targetId)?.data?.firstName} {nodes.find(n => n.id === targetId)?.data?.lastName}</option>
                       <option value="NEW">✨ Crear nueva persona...</option>
                       
                       {suggestions.length > 0 && (
                          <optgroup label="Sugerencias (Parejas relacionadas)">
                             {suggestions.map(sId => {
                                const s = nodes.find(n => n.id === sId);
                                if(!s) return null;
                                return <option key={sId} value={sId}>{s.data.firstName} {s.data.lastName}</option>
                             })}
                          </optgroup>
                       )}

                       <optgroup label="Todos los familiares">
                          {nodes.filter(n => n.id !== nodeId).map(n => (
                             <option key={n.id} value={n.id}>{n.data.firstName} {n.data.lastName}</option>
                          ))}
                       </optgroup>
                    </select>
                 </div>
               );
             })
          )}
          <Button className="w-full mt-4" onClick={onClose} variant="secondary">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ node, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({ ...node?.data });

  useEffect(() => {
    if (node) setFormData({ ...node.data });
  }, [node]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#FFF8F0] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-orange-400 p-4 flex justify-between items-center text-white">
          <h3 className="font-bold text-lg">Editar Perfil</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><MoreHorizontal /></button>
        </div>
        
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
              <input 
                className="w-full p-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none" 
                value={formData.firstName || ''}
                onChange={e => setFormData({...formData, firstName: e.target.value})}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellido</label>
              <input 
                className="w-full p-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none" 
                value={formData.lastName || ''}
                onChange={e => setFormData({...formData, lastName: e.target.value})}
              />
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Género</label>
             <div className="flex gap-2">
               {['male', 'female', 'unknown'].map(g => (
                 <button 
                   key={g}
                   onClick={() => setFormData({...formData, gender: g})}
                   className={`flex-1 py-2 rounded-lg text-sm border ${formData.gender === g ? 'bg-orange-100 border-orange-500 text-orange-700 font-bold' : 'bg-white border-gray-200 text-gray-500'}`}
                 >
                   {g === 'male' ? 'Hombre' : g === 'female' ? 'Mujer' : 'Otro'}
                 </button>
               ))}
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nacimiento (Año)</label>
               <input 
                  type="number"
                  className="w-full p-2 rounded-lg border border-orange-200 outline-none" 
                  value={formData.birthYear || ''}
                  onChange={e => setFormData({...formData, birthYear: e.target.value})}
                  placeholder="Ej. 1990"
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fallecimiento</label>
               <input 
                  type="number"
                  className="w-full p-2 rounded-lg border border-orange-200 outline-none" 
                  value={formData.deathYear || ''}
                  onChange={e => setFormData({...formData, deathYear: e.target.value})}
                  placeholder="Ej. 2020"
               />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Información Adicional (Opcional)</label>
            <textarea
              className="w-full p-3 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none resize-none text-sm text-gray-600"
              rows="3"
              value={formData.additionalInfo || ''}
              onChange={e => setFormData({...formData, additionalInfo: e.target.value})}
              placeholder="Ej. Nacionalidad italiana, diabetes tipo 1, matrimonios previos, anécdotas..."
            />
          </div>

          <Button className="w-full mt-4" onClick={() => onSave(node.id, formData)}>
            Guardar Cambios
          </Button>
        </div>
      </div>
    </div>
  );
};

// --- APLICACIÓN PRINCIPAL ---

export default function FamilyTreeApp() {
  const [view, setView] = useState('landing'); 
  const [currentUser, setCurrentUser] = useState(null);
  const [hasLocalUsers, setHasLocalUsers] = useState(false);

  // Canvas State
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  
  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [linksModalOpenId, setLinksModalOpenId] = useState(null);
  const [partnerSelection, setPartnerSelection] = useState(null); // { sourceId: '', partners: [] }
  
  // Touch / Drag / Zoom State References
  const canvasRef = useRef(null);
  const stateRef = useRef({
    mode: 'idle', 
    startX: 0,
    startY: 0,
    initialTransform: { x: 0, y: 0 },
    initialNodePos: { x: 0, y: 0 },
    dragNodeId: null,
    hasMovedNode: false, 
    initialDistance: 0,
    initialScale: 1
  });

  useEffect(() => {
    checkLocalUsers();
  }, []);

  const checkLocalUsers = () => {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
    setHasLocalUsers(Object.keys(db.users).length > 0);
  };

  const fitToScreen = (currentNodes = nodes) => {
    if (currentNodes.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentNodes.forEach(n => {
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x);
      maxY = Math.max(maxY, n.y);
    });

    const padding = 100;
    minX -= padding; minY -= padding;
    maxX += padding; maxY += padding;

    const width = maxX - minX;
    const height = maxY - minY;
    
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;

    const scaleX = screenW / width;
    const scaleY = screenH / height;
    let newScale = Math.min(scaleX, scaleY);
    
    newScale = Math.min(Math.max(newScale, 0.2), 1.5); 

    const midX = (minX + maxX) / 2;
    const midY = (minY + maxY) / 2;

    const newX = (screenW / 2) - (midX * newScale);
    const newY = (screenH / 2) - (midY * newScale);

    setTransform({ x: newX, y: newY, k: newScale });
  };

  const saveUserData = (user, newNodes, newEdges) => {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
    const currentPass = db.users[user.username]?.password;
    
    db.users[user.username] = {
      password: currentPass, 
      treeData: { nodes: newNodes, edges: newEdges }
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handleLogin = (username, password) => {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
    const user = db.users[username];
    if (user && user.password === password) {
      setCurrentUser({ username });
      const loadedNodes = user.treeData?.nodes || [];
      setNodes(loadedNodes);
      setEdges(user.treeData?.edges || []);
      
      setView('canvas');
      
      setTimeout(() => {
        if (loadedNodes.length > 0) fitToScreen(loadedNodes);
        else {
           const initialNode = { id: 'root', x: 0, y: 0, data: { firstName: 'Yo', lastName: '', gender: 'unknown' }};
           saveUserData({ username }, [initialNode], []);
           setTransform({ x: window.innerWidth/2, y: window.innerHeight/2, k: 1 });
        }
      }, 100);

      return { success: true };
    }
    return { error: 'Credenciales inválidas' };
  };

  const handleRegister = (username, password) => {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
    if (db.users[username]) return { error: 'El usuario ya existe' };
    
    const initialNode = {
      id: generateId(),
      x: 0,
      y: 0,
      data: { firstName: 'Yo', lastName: '', gender: 'unknown' }
    };

    const newUser = {
      password,
      treeData: { nodes: [initialNode], edges: [] }
    };

    db.users[username] = newUser;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    
    setCurrentUser({ username });
    setNodes([initialNode]);
    setEdges([]);
    setTransform({ x: window.innerWidth/2, y: window.innerHeight/2, k: 1 });
    checkLocalUsers();
    setView('canvas');
    return { success: true };
  };

  const handleImport = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.user || !json.nodes || !json.edges) {
          alert("El archivo no tiene el formato correcto.");
          return;
        }

        const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
        db.users[json.user] = {
          password: json.password || '1234', 
          treeData: { nodes: json.nodes, edges: json.edges }
        };

        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
        checkLocalUsers(); 
        alert(`¡Árbol de ${json.user} importado con éxito! Ahora puedes iniciar sesión.`);
      } catch (error) {
        alert("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  // --- LÓGICA DE EVENTOS (MOUSE + TOUCH) ---

  const handleWheel = (e) => {
    e.preventDefault();
    const scaleFactor = 1.05;
    const direction = e.deltaY > 0 ? -1 : 1;
    let newScale = transform.k * (direction > 0 ? scaleFactor : 1 / scaleFactor);
    newScale = Math.min(Math.max(0.1, newScale), 3);

    const mouseX = (e.clientX - transform.x) / transform.k;
    const mouseY = (e.clientY - transform.y) / transform.k;

    const newX = e.clientX - mouseX * newScale;
    const newY = e.clientY - mouseY * newScale;

    setTransform({ x: newX, y: newY, k: newScale });
  };

  const handleTouchStart = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg') {
       if (e.touches.length === 1) {
          stateRef.current.mode = 'pan';
          stateRef.current.startX = e.touches[0].clientX;
          stateRef.current.startY = e.touches[0].clientY;
          stateRef.current.initialTransform = { ...transform };
          setSelectedNodeId(null);
       } else if (e.touches.length === 2) {
          stateRef.current.mode = 'zoom';
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          stateRef.current.initialDistance = dist;
          stateRef.current.initialScale = transform.k;
          stateRef.current.initialTransform = { ...transform };
       }
    }
  };

  const handleTouchMove = (e) => {
    if (stateRef.current.mode === 'pan' && e.touches.length === 1) {
       const dx = e.touches[0].clientX - stateRef.current.startX;
       const dy = e.touches[0].clientY - stateRef.current.startY;
       setTransform({
         ...transform,
         x: stateRef.current.initialTransform.x + dx,
         y: stateRef.current.initialTransform.y + dy
       });
    } else if (stateRef.current.mode === 'zoom' && e.touches.length === 2) {
       e.preventDefault();
       const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
       );
       
       const scaleChange = dist / stateRef.current.initialDistance;
       let newScale = stateRef.current.initialScale * scaleChange;
       newScale = Math.min(Math.max(0.1, newScale), 3);

       const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
       const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;

       const worldX = (midX - stateRef.current.initialTransform.x) / stateRef.current.initialScale;
       const worldY = (midY - stateRef.current.initialTransform.y) / stateRef.current.initialScale;

       const newX = midX - worldX * newScale;
       const newY = midY - worldY * newScale;

       setTransform({ x: newX, y: newY, k: newScale });
    } else if (stateRef.current.mode === 'dragNode' && e.touches.length === 1) {
       const touch = e.touches[0];
       const dx = (touch.clientX - stateRef.current.startX) / transform.k;
       const dy = (touch.clientY - stateRef.current.startY) / transform.k;
       
       if (Math.hypot(dx, dy) > 5) {
          stateRef.current.hasMovedNode = true;
          const newNodes = nodes.map(n => 
             n.id === stateRef.current.dragNodeId 
               ? { ...n, x: stateRef.current.initialNodePos.x + dx, y: stateRef.current.initialNodePos.y + dy }
               : n
           );
           setNodes(newNodes);
       }
    }
  };

  const handleTouchEnd = () => {
    if (stateRef.current.mode === 'dragNode') {
      if (stateRef.current.hasMovedNode) {
         saveUserData(currentUser, nodes, edges);
      } else {
         setSelectedNodeId(stateRef.current.dragNodeId);
      }
    }
    stateRef.current.mode = 'idle';
  };

  const handleMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === 'svg') {
      stateRef.current.mode = 'pan';
      stateRef.current.startX = e.clientX;
      stateRef.current.startY = e.clientY;
      stateRef.current.initialTransform = { ...transform };
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = (e) => {
    if (stateRef.current.mode === 'pan') {
      const dx = e.clientX - stateRef.current.startX;
      const dy = e.clientY - stateRef.current.startY;
      setTransform({
        ...transform,
        x: stateRef.current.initialTransform.x + dx,
        y: stateRef.current.initialTransform.y + dy
      });
    } else if (stateRef.current.mode === 'dragNode') {
      const dx = (e.clientX - stateRef.current.startX) / transform.k;
      const dy = (e.clientY - stateRef.current.startY) / transform.k;
      
      if (Math.hypot(dx, dy) > 5) {
          stateRef.current.hasMovedNode = true;
          const newNodes = nodes.map(n => 
            n.id === stateRef.current.dragNodeId 
              ? { ...n, x: stateRef.current.initialNodePos.x + dx, y: stateRef.current.initialNodePos.y + dy }
              : n
          );
          setNodes(newNodes);
      }
    }
  };

  const handleMouseUp = () => {
    if (stateRef.current.mode === 'dragNode') {
       if (stateRef.current.hasMovedNode) {
          saveUserData(currentUser, nodes, edges);
       } else {
          setSelectedNodeId(stateRef.current.dragNodeId);
       }
    }
    stateRef.current.mode = 'idle';
  };

  const handleNodeMouseDown = (e, nodeId) => {
    e.stopPropagation();
    e.preventDefault();
    const node = nodes.find(n => n.id === nodeId);
    stateRef.current = {
      ...stateRef.current,
      mode: 'dragNode',
      startX: e.clientX || e.touches?.[0].clientX,
      startY: e.clientY || e.touches?.[0].clientY,
      dragNodeId: nodeId,
      initialNodePos: { x: node.x, y: node.y },
      hasMovedNode: false
    };
  };

  // --- LÓGICA DE ÁRBOL Y PAREJAS ---

  // Calcula una posición X para que las múltiples parejas/exparejas no se superpongan
  const getPartnerOffset = (sourceId) => {
      const existing = edges.filter(e => (e.from === sourceId || e.to === sourceId) && (e.type === 'spouse' || e.type === 'ex_spouse')).length;
      const direction = existing % 2 === 0 ? 1 : -1; // Alterna derecha/izquierda
      const multiplier = Math.floor(existing / 2) + 1;
      return 140 * multiplier * direction; 
  };

  const confirmAddChild = (sourceId, partnerId) => {
      const sourceNode = nodes.find(n => n.id === sourceId);
      let newNodes = [...nodes];
      let newEdges = [...edges];

      const childId = generateId();
      const Y_OFFSET = 160;
      
      let childX = sourceNode.x;
      let childY = sourceNode.y + Y_OFFSET;

      if (partnerId) {
          const partnerNode = nodes.find(n => n.id === partnerId);
          if (partnerNode) {
              childX = (sourceNode.x + partnerNode.x) / 2; // Posiciona en el centro de los dos padres
              childY = Math.max(sourceNode.y, partnerNode.y) + Y_OFFSET;
          }
      } else {
          childX += (Math.random() - 0.5) * 40; // Pequeño desvío si es hijo único/desconocido
      }

      const child = { id: childId, x: childX, y: childY, data: { firstName: 'Hijo', gender: 'unknown' } };
      newNodes.push(child);
      
      // Conectar con el padre principal
      newEdges.push({ id: generateId(), from: sourceId, to: childId, type: 'parent' });
      
      // Conectar con la pareja seleccionada (si aplica)
      if (partnerId) {
          newEdges.push({ id: generateId(), from: partnerId, to: childId, type: 'parent' });
      }

      saveUserData(currentUser, newNodes, newEdges);
      setPartnerSelection(null);
      setTimeout(() => fitToScreen(newNodes), 100);
  };

  const handleNodeAction = (action) => {
    if (!selectedNodeId) return;
    
    const sourceNode = nodes.find(n => n.id === selectedNodeId);
    let newNodes = [...nodes];
    let newEdges = [...edges];

    const Y_OFFSET = 150;
    const X_OFFSET = 80;

    if (action === 'add_parents') {
      const fatherId = generateId();
      const motherId = generateId();
      const father = { id: fatherId, x: sourceNode.x - X_OFFSET, y: sourceNode.y - Y_OFFSET, data: { firstName: 'Padre', gender: 'male' } };
      const mother = { id: motherId, x: sourceNode.x + X_OFFSET, y: sourceNode.y - Y_OFFSET, data: { firstName: 'Madre', gender: 'female' } };

      newNodes.push(father, mother);
      newEdges.push(
        { id: generateId(), from: fatherId, to: sourceNode.id, type: 'parent' },
        { id: generateId(), from: motherId, to: sourceNode.id, type: 'parent' },
        { id: generateId(), from: fatherId, to: motherId, type: 'spouse' }
      );
    } 
    else if (action === 'add_child') {
      // 1. Buscar todas las parejas y exparejas actuales
      const partners = edges
         .filter(e => (e.from === selectedNodeId || e.to === selectedNodeId) && (e.type === 'spouse' || e.type === 'ex_spouse'))
         .map(e => e.from === selectedNodeId ? e.to : e.from);
         
      if (partners.length > 0) {
         // Si tiene parejas, abrimos el modal para elegir
         setPartnerSelection({ sourceId: selectedNodeId, partners });
         setSelectedNodeId(null); // Ocultar menú radial
         return; 
      }
      
      // Si no tiene historial de parejas registradas, añadir directo
      confirmAddChild(selectedNodeId, null);
      return;
    }
    else if (action === 'add_spouse') {
       const spouseId = generateId();
       const offset = getPartnerOffset(sourceNode.id);
       const spouse = {
         id: spouseId,
         x: sourceNode.x + offset, 
         y: sourceNode.y,
         data: { firstName: 'Cónyuge', gender: sourceNode.data.gender === 'male' ? 'female' : 'male' }
       };
       newNodes.push(spouse);
       newEdges.push({ id: generateId(), from: sourceNode.id, to: spouseId, type: 'spouse' });
    }
    else if (action === 'add_ex_spouse') {
       const exId = generateId();
       const offset = getPartnerOffset(sourceNode.id);
       const exSpouse = {
         id: exId,
         x: sourceNode.x + offset, 
         y: sourceNode.y,
         data: { firstName: 'Ex-pareja', gender: sourceNode.data.gender === 'male' ? 'female' : 'male' }
       };
       newNodes.push(exSpouse);
       newEdges.push({ id: generateId(), from: sourceNode.id, to: exId, type: 'ex_spouse' });
    }
    else if (action === 'manage_links') {
       setLinksModalOpenId(selectedNodeId);
       setSelectedNodeId(null);
       return;
    }
    else if (action === 'edit') {
       setModalOpen(true);
       return; 
    }
    else if (action === 'delete') {
       if (window.confirm("¿Eliminar a esta persona y sus conexiones?")) {
         newNodes = newNodes.filter(n => n.id !== selectedNodeId);
         newEdges = newEdges.filter(e => e.from !== selectedNodeId && e.to !== selectedNodeId);
         setSelectedNodeId(null);
       }
    }

    saveUserData(currentUser, newNodes, newEdges);
    
    if (['add_parents', 'add_spouse', 'add_ex_spouse', 'delete'].includes(action)) {
       setTimeout(() => fitToScreen(newNodes), 100);
    }
  };

  const handleUpdateNode = (nodeId, newData) => {
    const updatedNodes = nodes.map(n => n.id === nodeId ? { ...n, data: newData } : n);
    saveUserData(currentUser, updatedNodes, edges);
    setModalOpen(false);
  };

  const handleUpdateLink = (edgeId, newTargetId) => {
     const edgeToUpdate = edges.find(e => e.id === edgeId);
     if (!edgeToUpdate) return;

     let newNodes = [...nodes];
     let finalTargetId = newTargetId;
     const sourceNodeId = linksModalOpenId;

     if (newTargetId === 'NEW') {
        finalTargetId = generateId();
        const sourceNode = nodes.find(n => n.id === sourceNodeId);
        
        let dy = 0; let dx = 100;
        if (edgeToUpdate.type === 'parent') {
           dy = edgeToUpdate.from === sourceNodeId ? 150 : -150;
           dx = (Math.random() - 0.5) * 80;
        }

        const newNode = {
           id: finalTargetId,
           x: sourceNode.x + dx,
           y: sourceNode.y + dy,
           data: { firstName: 'Nuevo', lastName: 'Familiar', gender: 'unknown' }
        };
        newNodes.push(newNode);
     }

     const newEdges = edges.map(e => {
        if (e.id === edgeId) {
           if (e.from === sourceNodeId) {
              return { ...e, to: finalTargetId };
           } else {
              return { ...e, from: finalTargetId };
           }
        }
        return e;
     });

     saveUserData(currentUser, newNodes, newEdges);
  };

  const handleDeleteLink = (edgeId) => {
     if (window.confirm("¿Seguro que deseas eliminar este vínculo? (La persona seguirá existiendo en el árbol)")) {
        const newEdges = edges.filter(e => e.id !== edgeId);
        saveUserData(currentUser, nodes, newEdges);
     }
  };

  const handleExport = () => {
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"users": {}}');
    const userPass = db.users[currentUser.username]?.password || '';

    const exportData = {
       user: currentUser.username,
       password: userPass,
       nodes,
       edges
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", `${currentUser.username}_arbol.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  // --- RENDER ---

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId), [nodes, selectedNodeId]);
  const menuPos = selectedNode ? {
     x: selectedNode.x * transform.k + transform.x,
     y: selectedNode.y * transform.k + transform.y
  } : null;

  if (view === 'landing') return <LandingPage onLogin={() => setView('login')} onRegister={() => setView('register')} onImport={handleImport} hasLocalUsers={hasLocalUsers} />;
  if (view === 'login') return <AuthForm mode="login" onSubmit={handleLogin} onCancel={() => setView('landing')} />;
  if (view === 'register') return <AuthForm mode="register" onSubmit={handleRegister} onCancel={() => setView('landing')} />;

  return (
    <div 
      className="h-screen w-screen bg-[#F3F0EB] overflow-hidden relative font-sans text-gray-700 selection:bg-orange-200 touch-none"
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'none' }}
    >
      
      {/* HUD SUPERIOR */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white pointer-events-auto">
          <h2 className="font-bold text-gray-800">Familia de {currentUser.username}</h2>
          <p className="text-xs text-gray-500">{nodes.length} familiares • Zoom: {Math.round(transform.k * 100)}%</p>
        </div>
        
        <div className="flex gap-2 pointer-events-auto">
           <button onClick={() => fitToScreen()} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Centrar Vista">
              <Target size={20} className="text-gray-600"/>
           </button>
           <button onClick={handleExport} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Exportar JSON">
              <Download size={20} className="text-gray-600"/>
           </button>
           <button onClick={() => setView('landing')} className="p-3 bg-white hover:bg-red-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Salir">
              <LogOut size={20} className="text-red-500"/>
           </button>
        </div>
      </div>

      {/* CONTROLES DE ZOOM INFERIORES */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-auto z-10">
        <button 
           onClick={() => setTransform(t => ({ ...t, k: Math.min(3, t.k + 0.2) }))} 
           className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-orange-50 active:scale-95 transition-transform"
        >
           <ZoomIn size={24} className="text-gray-600"/>
        </button>
        <button 
           onClick={() => setTransform(t => ({ ...t, k: Math.max(0.1, t.k - 0.2) }))} 
           className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-orange-50 active:scale-95 transition-transform"
        >
           <ZoomOut size={24} className="text-gray-600"/>
        </button>
      </div>

      {/* MENÚ RADIAL */}
      {selectedNodeId && menuPos && (
        <RadialMenu 
          x={menuPos.x} 
          y={menuPos.y} 
          zoom={transform.k}
          onClose={() => setSelectedNodeId(null)}
          onAction={handleNodeAction}
        />
      )}

      {/* MODAL SELECCIÓN DE PADRE (Para añadir hijos) */}
      <PartnerSelectionModal 
         selection={partnerSelection} 
         nodes={nodes} 
         onClose={() => setPartnerSelection(null)} 
         onSelect={(partnerId) => confirmAddChild(partnerSelection.sourceId, partnerId)} 
      />

      {/* MODAL GESTIÓN DE VÍNCULOS */}
      <LinksModal
         nodeId={linksModalOpenId}
         isOpen={!!linksModalOpenId}
         onClose={() => setLinksModalOpenId(null)}
         nodes={nodes}
         edges={edges}
         onUpdateLink={handleUpdateLink}
         onDeleteLink={handleDeleteLink}
      />

      {/* MODAL EDICIÓN */}
      <EditModal 
        node={nodes.find(n => n.id === selectedNodeId)} 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        onSave={handleUpdateNode}
      />

      {/* LIENZO SVG */}
      <svg className="w-full h-full pointer-events-none">
        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}>
          
          {/* Conexiones */}
          {edges.map(edge => {
            const from = nodes.find(n => n.id === edge.from);
            const to = nodes.find(n => n.id === edge.to);
            if (!from || !to) return null;

            let d = '';
            const isSpouse = edge.type === 'spouse';
            const isExSpouse = edge.type === 'ex_spouse';
            
            if (isSpouse || isExSpouse) {
              // Línea recta para parejas
              d = `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
            } else {
              // Curva suave para descendencia/ascendencia
              d = `M ${from.x} ${from.y} C ${from.x} ${from.y + 75}, ${to.x} ${to.y - 75}, ${to.x} ${to.y}`;
            }

            // Colorear dependiendo del tipo
            const strokeColor = isSpouse ? '#F9A8D4' : (isExSpouse ? '#9CA3AF' : '#CBD5E1');

            return (
               <g key={edge.id}>
                 {/* Línea Sombra */}
                 <path d={d} stroke="white" strokeWidth="6" fill="none" opacity="0.8" />
                 {/* Línea Principal */}
                 <path 
                    d={d} 
                    stroke={strokeColor} 
                    strokeWidth="2" 
                    fill="none" 
                    strokeDasharray={isSpouse || isExSpouse ? "5,5" : "0"} 
                 />
                 {/* Nudo de unión para parejas */}
                 {(isSpouse || isExSpouse) && (
                    <circle cx={(from.x + to.x)/2} cy={(from.y + to.y)/2} r="4" fill={strokeColor} />
                 )}
               </g>
            );
          })}

          {/* Nodos */}
          {nodes.map(node => {
            const style = COLORS[node.data.gender] || COLORS.unknown;
            const isSelected = selectedNodeId === node.id;
            const isDragging = stateRef.current.dragNodeId === node.id;
            
            return (
              <g 
                key={node.id} 
                transform={`translate(${node.x}, ${node.y})`}
                className={`pointer-events-auto cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-80' : ''}`}
                onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                onTouchStart={(e) => handleNodeMouseDown(e, node.id)}
              >
                <circle r="32" fill="black" opacity="0.1" cy="4" />
                <circle 
                  r="30" 
                  className={`${style.bg} ${isSelected ? 'stroke-orange-400 stroke-[4px]' : 'stroke-white stroke-[3px]'} transition-all`}
                />
                
                <foreignObject x="-20" y="-20" width="40" height="40" className="pointer-events-none">
                   <div className={`w-full h-full flex items-center justify-center ${style.icon}`}>
                      <User size={24} strokeWidth={2.5} />
                   </div>
                </foreignObject>

                <text y="48" textAnchor="middle" className="text-[10px] font-bold fill-gray-700 uppercase tracking-wider bg-white/80 rounded px-1 pointer-events-none">
                   {node.data.firstName}
                </text>
                <text y="60" textAnchor="middle" className="text-[9px] fill-gray-500 pointer-events-none">
                   {node.data.deathYear ? `${node.data.birthYear || '?'} - ${node.data.deathYear}` : node.data.birthYear || ''}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      
      {/* Guía visual */}
      {nodes.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-gray-400 text-xs pointer-events-none bg-white/50 px-3 py-1 rounded-full whitespace-nowrap">
           <Move size={12} className="inline mr-1" /> Arrastra los nodos para organizar
        </div>
      )}

    </div>
  );
}
