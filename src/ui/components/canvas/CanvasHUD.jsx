import { Target, Download, LogOut } from 'lucide-react';

export default function CanvasHUD({ username, nodeCount, zoom, onFitToScreen, onExport, onLogout }) {
  return (
    <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start pointer-events-none z-10">
      <div className="bg-white/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-white pointer-events-auto">
        <h2 className="font-bold text-gray-800">Familia de {username}</h2>
        <p className="text-xs text-gray-500">{nodeCount} familiares • Zoom: {Math.round(zoom * 100)}%</p>
      </div>

      <div className="flex gap-2 pointer-events-auto">
        <button onClick={onFitToScreen} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Centrar Vista">
          <Target size={20} className="text-gray-600" />
        </button>
        <button onClick={onExport} className="p-3 bg-white hover:bg-orange-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Exportar JSON">
          <Download size={20} className="text-gray-600" />
        </button>
        <button onClick={onLogout} className="p-3 bg-white hover:bg-red-50 rounded-xl shadow-sm border border-gray-100 transition-colors" title="Salir">
          <LogOut size={20} className="text-red-500" />
        </button>
      </div>
    </div>
  );
}
