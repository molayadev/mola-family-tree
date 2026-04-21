import { useState } from 'react';

import { Target, Download, LogOut, Menu, X, Camera, LayoutGrid, Minimize2, Maximize2, Undo, Link as LinkIcon } from 'lucide-react';

export default function CanvasHUD({ username, nodeCount, zoom, onFitToScreen, onOrganize, onManageLinkTypes, onExport, onSnapshot, onLogout, hasFamilies, hasCollapsed, onToggleCollapseAll, onUndo, canUndo }) {
  const [menuOpen, setMenuOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const closeMenu = () => setMenuOpen(false);

  const handleAction = (action) => {
    closeMenu();
    action();
  };

  return (
    <>
      {/* Desktop top bar – hidden on small screens */}
      <div className="hidden md:flex absolute top-0 left-0 w-full p-4 justify-between items-start pointer-events-none z-10">
        <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white pointer-events-auto">
          <h2 className="font-bold text-gray-800">Familia de {username}</h2>
          <p className="text-xs text-gray-500">{nodeCount} familiares • Zoom: {Math.round(zoom * 100)}%</p>
        </div>

        <div className="flex gap-2 pointer-events-auto">
          <button 
            onClick={onUndo} 
            disabled={!canUndo}
            className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white" 
            title="Deshacer (máx. 5 veces)"
          >
            <Undo size={20} className="text-gray-600" />
          </button>
          <button onClick={onFitToScreen} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Centrar Vista">
            <Target size={20} className="text-gray-600" />
          </button>
          <button onClick={onOrganize} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Organizar por niveles">
            <LayoutGrid size={20} className="text-gray-600" />
          </button>
          {hasFamilies && (
            <button onClick={onToggleCollapseAll} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title={hasCollapsed ? 'Expandir familias' : 'Colapsar familias'}>
              {hasCollapsed ? <Maximize2 size={20} className="text-gray-600" /> : <Minimize2 size={20} className="text-gray-600" />}
            </button>
          )}
          <button onClick={onSnapshot} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Descargar imagen">
            <Camera size={20} className="text-gray-600" />
          </button>
          <button onClick={onManageLinkTypes} className="p-3 bg-white hover:bg-purple-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Gestionar vínculos">
            <LinkIcon size={20} className="text-purple-500" />
          </button>
          <button onClick={onExport} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Exportar JSON">
            <Download size={20} className="text-gray-600" />
          </button>
          <button onClick={onLogout} className="p-3 bg-white hover:bg-red-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Salir">
            <LogOut size={20} className="text-red-500" />
          </button>
        </div>
      </div>

      {/* Mobile FAB menu – visible only on small screens */}
      <div className="md:hidden absolute top-4 left-4 z-20 pointer-events-auto">
        <button
          onClick={toggleMenu}
          className="w-12 h-12 bg-orange-500 hover:bg-orange-600 active:scale-95 rounded-full shadow-lg flex items-center justify-center transition-all"
          title="Menú"
          aria-expanded={menuOpen}
          aria-label="Menú"
        >
          {menuOpen
            ? <X size={22} className="text-white" />
            : <Menu size={22} className="text-white" />}
        </button>

        {menuOpen && (
          <>
            {/* Backdrop to close menu */}
            <div className="fixed inset-0 z-[-1]" role="presentation" aria-hidden="true" onClick={closeMenu} />

            <div className="absolute top-14 left-0 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-100 p-2 min-w-[200px] animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                <p className="font-bold text-gray-800 text-sm">Familia de {username}</p>
                <p className="text-[10px] text-gray-500">{nodeCount} familiares • Zoom: {Math.round(zoom * 100)}%</p>
              </div>

              <button
                onClick={() => handleAction(onUndo)}
                disabled={!canUndo}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:active:bg-white"
              >
                <Undo size={18} className="text-gray-600" />
                <span className="text-sm text-gray-700">Deshacer</span>
              </button>

              <button
                onClick={() => handleAction(onFitToScreen)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
              >
                <Target size={18} className="text-gray-600" />
                <span className="text-sm text-gray-700">Centrar vista</span>
              </button>

              <button
                onClick={() => handleAction(onOrganize)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
              >
                <LayoutGrid size={18} className="text-gray-600" />
                <span className="text-sm text-gray-700">Organizar por niveles</span>
              </button>

              {hasFamilies && (
                <button
                  onClick={() => handleAction(onToggleCollapseAll)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
                >
                  {hasCollapsed ? <Maximize2 size={18} className="text-gray-600" /> : <Minimize2 size={18} className="text-gray-600" />}
                  <span className="text-sm text-gray-700">{hasCollapsed ? 'Expandir familias' : 'Colapsar familias'}</span>
                </button>
              )}

              <button
                onClick={() => handleAction(onSnapshot)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
              >
                <Camera size={18} className="text-gray-600" />
                <span className="text-sm text-gray-700">Descargar imagen</span>
              </button>

              <button
                onClick={() => handleAction(onManageLinkTypes)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-purple-50 active:bg-purple-100 transition-colors text-left"
              >
                <LinkIcon size={18} className="text-purple-500" />
                <span className="text-sm text-gray-700">Gestionar vínculos</span>
              </button>

              <button
                onClick={() => handleAction(onExport)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
              >
                <Download size={18} className="text-gray-600" />
                <span className="text-sm text-gray-700">Exportar JSON</span>
              </button>

              <div className="border-t border-gray-100 mt-1 pt-1">
                <button
                  onClick={() => handleAction(onLogout)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-red-50 active:bg-red-100 transition-colors text-left"
                >
                  <LogOut size={18} className="text-red-500" />
                  <span className="text-sm text-red-600">Salir</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
