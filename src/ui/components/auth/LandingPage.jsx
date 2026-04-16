import { useRef } from 'react';
import { User, Upload } from 'lucide-react';
import Button from '../common/Button';

export default function LandingPage({ onLogin, onRegister, onImport, hasLocalUsers }) {
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
}
