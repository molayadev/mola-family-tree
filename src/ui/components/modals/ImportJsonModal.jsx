import { useRef, useState } from 'react';
import { Upload, ClipboardPaste, X } from 'lucide-react';
import Button from '../common/Button';

export default function ImportJsonModal({ isOpen, onClose, onImport, onImportFromText }) {
  const [pastedJson, setPastedJson] = useState('');
  const [activeTab, setActiveTab] = useState('file');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
      e.target.value = '';
      onClose();
    }
  };

  const handlePastedImport = () => {
    if (!pastedJson.trim()) {
      alert('Pega un JSON antes de importar.');
      return;
    }
    onImportFromText(pastedJson);
    setPastedJson('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Importar datos al árbol</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Cerrar"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4">
          {/* Tabs */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 mb-4 gap-1">
            <button
              onClick={() => setActiveTab('file')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'file'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Upload size={15} />
              Desde archivo
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === 'paste'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <ClipboardPaste size={15} />
              Pegar JSON
            </button>
          </div>

          {activeTab === 'file' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Selecciona un archivo JSON exportado desde FamilyCanvas para importarlo a tu árbol en la nube.
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="secondary"
                className="w-full flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                Seleccionar archivo JSON
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="sr-only"
                onChange={handleFileChange}
                aria-label="Seleccionar archivo JSON para importar"
              />
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                Pega el contenido JSON de un respaldo exportado desde FamilyCanvas.
              </p>
              <textarea
                value={pastedJson}
                onChange={(e) => setPastedJson(e.target.value)}
                placeholder='{"user":"...", "nodes":[...], "edges":[...]}'
                className="w-full min-h-40 rounded-2xl border border-gray-200 bg-white/90 p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono"
              />
              <Button onClick={handlePastedImport} className="w-full">
                Importar JSON pegado
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
