import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';

export default function AuthForm({ mode, onSubmit, onCancel }) {
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
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center p-6">
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
}
