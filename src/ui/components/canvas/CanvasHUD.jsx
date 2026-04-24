import { useState } from 'react';

import { Target, Download, LogOut, Menu, X, Camera, Undo, Link as LinkIcon, Users, Sparkles, Trees, Globe, Scan, FolderInput } from 'lucide-react';

export default function CanvasHUD({
  username,
  nodeCount,
  zoom,
  onFitToScreen,
  onOpenOrganize,
  onManageLinkTypes,
  onOpenFamilyGroups,
  hasFamilyGroups,
  onExport,
  onSnapshot,
  onLogout,
  onUndo,
  canUndo,
  viewMode,
  onChangeViewMode,
  viewModeOptions = [],
  focusedNodeName = '',
  canOrganize = false,
  edgeCurveMode = 'curved',
  onToggleEdgeCurveMode = () => {},
  isFirebaseMode = false,
  onImport = null,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileQuickActionsOpen, setMobileQuickActionsOpen] = useState(false);

  const toggleMenu = () => setMenuOpen(prev => !prev);
  const closeMenu = () => setMenuOpen(false);
  const toggleMobileQuickActions = () => setMobileQuickActionsOpen(prev => !prev);
  const closeMobileQuickActions = () => setMobileQuickActionsOpen(false);
  const handleMobileQuickAction = (action) => {
    closeMobileQuickActions();
    action();
  };

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
          {focusedNodeName && (
            <p className="text-[11px] text-gray-500 mt-1">
              Nodo activo: <span className="font-semibold text-gray-700">{focusedNodeName}</span>
            </p>
          )}
          {viewModeOptions.length > 0 && (
            <div className="mt-2 inline-flex flex-wrap rounded-xl border border-gray-200 bg-white p-1 gap-1 max-w-[420px]">
              {viewModeOptions.map((mode) => (
                (() => {
                  const Icon = mode.icon;
                  return (
                    <button
                      key={mode.value}
                      onClick={() => onChangeViewMode(mode.value)}
                      title={mode.label}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-1.5 ${
                        viewMode === mode.value
                          ? 'bg-orange-500 text-white'
                          : 'text-gray-600 hover:bg-orange-50'
                      }`}
                    >
                      {Icon ? <Icon size={12} /> : null}
                      <span>{mode.shortLabel || mode.label}</span>
                    </button>
                  );
                })()
              ))}
            </div>
          )}
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
          {canOrganize && (
            <button
              onClick={onOpenOrganize}
              className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors"
              title="Organizar árbol"
            >
              <Sparkles size={20} className="text-orange-500" />
            </button>
          )}
          <button
            onClick={onToggleEdgeCurveMode}
            className="px-3 py-2 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors text-xs font-semibold text-gray-700"
            title={edgeCurveMode === 'curved' ? 'Cambiar a líneas geométricas' : 'Cambiar a líneas curvas'}
          >
            {edgeCurveMode === 'curved' ? 'Curvas' : 'Geométricas'}
          </button>
          <button onClick={onOpenFamilyGroups} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Grupos familiares">
            <Users size={20} className={`${hasFamilyGroups ? 'text-orange-600' : 'text-gray-600'}`} />
          </button>
          <button onClick={onSnapshot} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Descargar imagen">
            <Camera size={20} className="text-gray-600" />
          </button>
          <button onClick={onManageLinkTypes} className="p-3 bg-white hover:bg-purple-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Gestionar vínculos">
            <LinkIcon size={20} className="text-purple-500" />
          </button>
          <button onClick={onExport} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Exportar JSON">
            <Download size={20} className="text-gray-600" />
          </button>
          {isFirebaseMode && onImport && (
            <button onClick={onImport} className="p-3 bg-white hover:bg-blue-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Importar datos (JSON)">
              <FolderInput size={20} className="text-blue-500" />
            </button>
          )}
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
                {focusedNodeName && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    Activo: <span className="font-semibold text-gray-700">{focusedNodeName}</span>
                  </p>
                )}
              </div>

              {viewModeOptions.length > 0 && (
                <div className="px-2 pb-2">
                  <p className="text-[10px] text-gray-500 mb-2 px-1">
                    Vista: <span className="font-semibold text-gray-700">{viewModeOptions.find(mode => mode.value === viewMode)?.label || viewMode}</span>
                  </p>
                  <div
                    className="grid gap-2 rounded-xl border border-gray-200 bg-white p-2"
                    style={{ gridTemplateColumns: `repeat(${Math.min(3, viewModeOptions.length)}, minmax(0, 1fr))` }}
                  >
                    {viewModeOptions.map((mode) => {
                      const Icon = mode.icon;
                      return (
                        <button
                          key={mode.value}
                          onClick={() => handleAction(() => onChangeViewMode(mode.value))}
                          title={mode.label}
                          aria-label={mode.label}
                          className={`min-h-[56px] rounded-xl text-[10px] font-bold transition-colors flex flex-col items-center justify-center gap-1 ${
                            viewMode === mode.value
                              ? 'bg-orange-500 text-white'
                              : 'text-gray-600 hover:bg-orange-50'
                          }`}
                        >
                          {Icon ? <Icon size={16} /> : null}
                          <span>{mode.shortLabel || mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

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
                onClick={() => handleAction(onToggleEdgeCurveMode)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
              >
                <span className="w-[18px] h-[18px] rounded-full border border-gray-300 flex items-center justify-center text-[10px] font-bold text-gray-600">
                  ~
                </span>
                <span className="text-sm text-gray-700">
                  Líneas: {edgeCurveMode === 'curved' ? 'Curvas' : 'Geométricas'}
                </span>
              </button>

              <button
                onClick={() => handleAction(onOpenFamilyGroups)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-orange-50 active:bg-orange-100 transition-colors text-left"
              >
                <Users size={18} className={`${hasFamilyGroups ? 'text-orange-600' : 'text-gray-600'}`} />
                <span className="text-sm text-gray-700">Grupos familiares</span>
              </button>

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

              {isFirebaseMode && onImport && (
                <button
                  onClick={() => handleAction(onImport)}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-blue-50 active:bg-blue-100 transition-colors text-left"
                >
                  <FolderInput size={18} className="text-blue-500" />
                  <span className="text-sm text-gray-700">Importar datos</span>
                </button>
              )}

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

      {/* Mobile quick-actions FAB */}
      <div
        className="md:hidden absolute top-1/2 right-3 -translate-y-1/2 z-20 pointer-events-auto flex flex-col items-end gap-2"
        style={{ right: 'max(0.75rem, env(safe-area-inset-right))' }}
      >
        {mobileQuickActionsOpen && (
          <>
            <button
              onClick={() => handleMobileQuickAction(() => onChangeViewMode('all'))}
              className={`w-12 h-12 rounded-full shadow-lg border transition-all active:scale-95 flex items-center justify-center ${
                viewMode === 'all'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-100 hover:bg-orange-50'
              }`}
              title="Volver a vista Todo"
              aria-label="Volver a vista Todo"
            >
              <Globe size={18} />
            </button>

            <button
              onClick={() => handleMobileQuickAction(() => onChangeViewMode('relatives'))}
              className={`w-12 h-12 rounded-full shadow-lg border transition-all active:scale-95 flex items-center justify-center ${
                viewMode === 'relatives'
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'bg-white text-gray-700 border-gray-100 hover:bg-orange-50'
              }`}
              title="Volver a vista Árbol"
              aria-label="Volver a vista Árbol"
            >
              <Trees size={18} />
            </button>

            <button
              onClick={() => handleMobileQuickAction(onFitToScreen)}
              className="w-12 h-12 bg-white hover:bg-orange-50 active:scale-95 rounded-full shadow-lg border border-gray-100 flex items-center justify-center transition-all"
              title="Centrar vista"
              aria-label="Centrar vista"
            >
              <Target size={20} className="text-gray-700" />
            </button>
          </>
        )}

        <button
          onClick={toggleMobileQuickActions}
          className={`w-12 h-12 rounded-full shadow-lg border transition-all active:scale-95 flex items-center justify-center ${
            mobileQuickActionsOpen
              ? 'bg-orange-500 text-white border-orange-500'
              : 'bg-white text-gray-700 border-gray-100 hover:bg-orange-50'
          }`}
          title={mobileQuickActionsOpen ? 'Ocultar atajos' : 'Mostrar atajos'}
          aria-label={mobileQuickActionsOpen ? 'Ocultar atajos' : 'Mostrar atajos'}
          aria-expanded={mobileQuickActionsOpen}
        >
          <Scan size={18} />
        </button>
      </div>
    </>
  );
}
