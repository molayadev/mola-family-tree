import { useState } from 'react';
import { User, Upload, ClipboardPaste } from 'lucide-react';
import Button from '../common/Button';

const appVersion = __APP_VERSION__;

export default function LandingPage({ onLogin, onRegister, onImport, onImportFromText, hasLocalUsers }) {
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedJson, setPastedJson] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onImport(file);
    }
    e.target.value = '';
  };

  const handlePastedImport = () => {
    if (!pastedJson.trim()) {
      alert('Pega un JSON antes de importar.');
      return;
    }
    onImportFromText(pastedJson);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
            <label className="px-6 py-3 rounded-full font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 bg-transparent text-black hover:bg-gray-100 border border-gray-200 hover:border-gray-300 w-full text-sm cursor-pointer">
              <input type="file" className="absolute w-0 h-0 opacity-0 overflow-hidden" onChange={handleFileChange} aria-label="Seleccionar archivo JSON de respaldo para importar" />
              <Upload size={16} /> Importar Respaldo (JSON)
            </label>
            <button
              type="button"
              onClick={() => setShowPasteArea((prev) => !prev)}
              className="mt-3 px-6 py-3 rounded-full font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 bg-transparent text-black hover:bg-gray-100 border border-gray-200 hover:border-gray-300 w-full text-sm cursor-pointer"
            >
              <ClipboardPaste size={16} /> {showPasteArea ? 'Ocultar pegar JSON' : 'Pegar JSON'}
            </button>
            {showPasteArea && (
              <div className="mt-3 space-y-2">
                <textarea
                  value={pastedJson}
                  onChange={(e) => setPastedJson(e.target.value)}
                  placeholder="Pega aquí el contenido JSON del respaldo"
                  className="w-full min-h-36 rounded-2xl border border-gray-200 bg-white/90 p-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300"
                />
                <Button onClick={handlePastedImport} variant="secondary" className="w-full">
                  Importar JSON pegado
                </Button>
              </div>
            )}
          </div>
        </div>

        {!hasLocalUsers && (
          <p className="mt-6 text-sm text-gray-400">
            Los datos se guardarán localmente en este dispositivo.
          </p>
        )}

        <p className="mt-8 text-xs text-gray-300">v{appVersion}</p>
      </div>
    </div>
  );
}
