import { useState, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import Button from '../common/Button';

export default function EditModal({ node, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...node?.data });

  useEffect(() => {
    if (node) setFormData({ ...node.data });
  }, [node]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#FFF8F0] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-orange-400 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg">Editar Perfil</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><MoreHorizontal /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-grow">
          <div className="flex gap-4">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
              <input
                className="w-full p-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none"
                value={formData.firstName || ''}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellido</label>
              <input
                className="w-full p-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none"
                value={formData.lastName || ''}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Género</label>
            <div className="flex gap-2">
              {['male', 'female', 'unknown'].map(g => (
                <button
                  key={g}
                  onClick={() => setFormData({ ...formData, gender: g })}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${formData.gender === g ? 'bg-orange-100 border-orange-500 text-orange-700 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
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
                onChange={e => setFormData({ ...formData, birthYear: e.target.value })}
                placeholder="Ej. 1990"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fallecimiento</label>
              <input
                type="number"
                className="w-full p-2 rounded-lg border border-orange-200 outline-none"
                value={formData.deathYear || ''}
                onChange={e => setFormData({ ...formData, deathYear: e.target.value })}
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
              onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })}
              placeholder="Nacionalidad, salud, anécdotas, profesión..."
            />
          </div>
        </div>
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <Button className="w-full" onClick={() => onSave(node.id, formData)}>Guardar Cambios</Button>
        </div>
      </div>
    </div>
  );
}
