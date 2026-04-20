import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import Button from '../common/Button';
import { LINK_VISUAL_TYPES } from '../../../domain/config/constants';
import { generateId } from '../../../domain/entities/Node';

const DEFAULT_COLOR = '#8B5CF6';

const createDraftLinkType = () => ({
  id: generateId(),
  name: '',
  visualType: 'solid',
  color: DEFAULT_COLOR,
});

export default function LinkTypesManagerModal({ isOpen, initialLinkTypes, onClose, onSave }) {
  const [draft, setDraft] = useState(() => initialLinkTypes);

  if (!isOpen) return null;

  const updateItem = (id, updates) => {
    setDraft(prev => prev.map(item => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    setDraft(prev => prev.filter(item => item.id !== id));
  };

  const addItem = () => {
    setDraft(prev => [...prev, createDraftLinkType()]);
  };

  const handleSave = () => {
    const sanitized = draft
      .map(item => ({
        id: item.id,
        name: (item.name || '').trim(),
        visualType: item.visualType,
        color: item.color || DEFAULT_COLOR,
      }))
      .filter(item => item.name.length > 0);
    onSave(sanitized);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="bg-purple-500 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg">Gestionar tipos de vínculo</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2 transition-colors"><X size={20} /></button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3 flex-grow">
          {draft.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">Aún no hay vínculos personalizados.</p>
          )}

          {draft.map(item => (
            <div key={item.id} className="grid grid-cols-12 gap-2 items-center border border-gray-200 rounded-2xl p-3">
              <input
                value={item.name}
                onChange={e => updateItem(item.id, { name: e.target.value })}
                className="col-span-5 p-2 rounded-xl border border-gray-200 outline-none text-sm"
                placeholder="Nombre del vínculo"
              />
              <select
                value={item.visualType}
                onChange={e => updateItem(item.id, { visualType: e.target.value })}
                className="col-span-4 p-2 rounded-xl border border-gray-200 outline-none text-sm bg-white"
              >
                {LINK_VISUAL_TYPES.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                type="color"
                value={item.color}
                onChange={e => updateItem(item.id, { color: e.target.value })}
                className="col-span-2 h-10 w-full rounded-xl border border-gray-200 bg-white cursor-pointer"
                title="Color del vínculo"
              />
              <button
                onClick={() => removeItem(item.id)}
                className="col-span-1 h-10 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"
                title="Eliminar tipo"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-100 flex items-center gap-2">
          <button onClick={addItem} className="px-3 py-2 rounded-xl bg-purple-50 text-purple-700 text-sm font-semibold hover:bg-purple-100 transition-colors flex items-center gap-1">
            <Plus size={16} /> Añadir vínculo
          </button>
          <div className="ml-auto flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
