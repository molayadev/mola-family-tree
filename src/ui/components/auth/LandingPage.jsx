import { useRef, useState } from 'react';
import { User, Upload, ClipboardPaste } from 'lucide-react';
import Button from '../common/Button';

const appVersion = __APP_VERSION__;

export default function LandingPage({ onLogin, onRegister, onImport, onImportFromText, hasLocalUsers, onGoogleSignIn }) {
  const [showPasteArea, setShowPasteArea] = useState(false);
  const [pastedJson, setPastedJson] = useState('');
  const fileInputRef = useRef(null);

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

          {onGoogleSignIn && (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="px-6 py-3 rounded-full font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-3 bg-white text-gray-700 hover:bg-gray-50 border border-gray-300 hover:border-gray-400 w-full text-sm shadow-sm cursor-pointer"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continuar con Google
            </button>
          )}

          <div className="relative w-full pt-4 border-t border-gray-200 mt-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-3 rounded-full font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center gap-2 bg-transparent text-black hover:bg-gray-100 border border-gray-200 hover:border-gray-300 w-full text-sm cursor-pointer"
            >
              <Upload size={16} /> Importar Respaldo (JSON)
            </button>
            <input ref={fileInputRef} type="file" className="sr-only" onChange={handleFileChange} aria-label="Seleccionar archivo JSON de respaldo para importar" />
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
