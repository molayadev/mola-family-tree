import { useState } from 'react';
import { MoreHorizontal, Wand2 } from 'lucide-react';
import Button from '../common/Button';
import DateSelector from '../common/DateSelector';
import TimeWheelSelector from '../common/TimeWheelSelector';
import WheelPicker from '../common/WheelPicker';
import CollapsibleFieldset from '../common/CollapsibleFieldset';
import { TWIN_TYPES, ZODIAC_SIGNS } from '../../../domain/config/constants';
import { calculateAge } from '../../../domain/utils/dateUtils';
import useZodiac from '../../../application/hooks/useZodiac';

// Pre-mapped option arrays for WheelPicker (avoids re-creating on every render)
const ZODIAC_OPTIONS = ZODIAC_SIGNS.map(z => ({ value: z.value, label: z.label, icon: z.icon }));
const TWIN_OPTIONS = TWIN_TYPES.map(t => ({ value: t.value, label: t.label }));

export default function EditModal({ node, isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState(() => node ? { ...node.data } : {});
  const [zodiacAlert, setZodiacAlert] = useState(null);
  const { calculateZodiac } = useZodiac();

  if (!isOpen) return null;

  const age = calculateAge(formData.birthDate, formData.deathDate);
  const ageBadge = age !== null
    ? (formData.deathDate ? `(✝ ${age} años)` : `(${age} años)`)
    : '(--)';

  const handleAutoZodiac = () => {
    const { sunSign, moonSign, ascendantSign, errors } = calculateZodiac(formData);
    const updates = {};
    if (sunSign) updates.sunSign = sunSign;
    if (moonSign) updates.moonSign = moonSign;
    if (ascendantSign) updates.ascendantSign = ascendantSign;

    if (Object.keys(updates).length > 0) {
      setFormData(prev => ({ ...prev, ...updates }));
    }

    if (errors.length > 0) {
      setZodiacAlert(errors);
    } else {
      setZodiacAlert(null);
    }
  };

  const dismissAlert = () => setZodiacAlert(null);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#FFF8F0] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* ── Header ───────────────────────────────────────── */}
        <div className="bg-orange-400 p-4 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-lg">Editar Perfil</h3>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-1"><MoreHorizontal /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-grow">
          {/* ── Always-visible: Nombre, Apellido, Género ──── */}
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
                  type="button"
                  onClick={() => setFormData({ ...formData, gender: g })}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${formData.gender === g ? 'bg-orange-100 border-orange-500 text-orange-700 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  {g === 'male' ? 'Hombre' : g === 'female' ? 'Mujer' : 'Otro'}
                </button>
              ))}
            </div>
          </div>

          {/* ── Collapsible: Nacimiento y Fallecimiento ───── */}
          <CollapsibleFieldset label="Nacimiento y Fallecimiento" badge={ageBadge}>
            {/* Birth date */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-500 uppercase">Fecha de Nacimiento</label>
              <DateSelector
                value={formData.birthDate || ''}
                onChange={v => setFormData({ ...formData, birthDate: v })}
              />
            </div>

            {/* Birth time */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora de Nacimiento</label>
              <TimeWheelSelector
                value={formData.birthTime || ''}
                onChange={v => setFormData({ ...formData, birthTime: v })}
              />
            </div>

            {/* Location (lat, lon) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Latitud</label>
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm"
                  value={formData.birthLatitude ?? ''}
                  onChange={e => setFormData({ ...formData, birthLatitude: e.target.value })}
                  placeholder="Ej: 40.4168"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Longitud</label>
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm"
                  value={formData.birthLongitude ?? ''}
                  onChange={e => setFormData({ ...formData, birthLongitude: e.target.value })}
                  placeholder="Ej: -3.7038"
                />
              </div>
            </div>

            {/* Zodiac signs row + magic wand button */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-500 uppercase">Signos Zodiacales</label>
                <button
                  type="button"
                  onClick={handleAutoZodiac}
                  className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 transition-colors"
                  title="Calcular automáticamente"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Auto</span>
                </button>
              </div>

              {/* Alert banner */}
              {zodiacAlert && (
                <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold mb-0.5">Datos insuficientes:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        {zodiacAlert.map((err, i) => <li key={i}>{err}</li>)}
                      </ul>
                    </div>
                    <button type="button" onClick={dismissAlert} className="text-amber-500 hover:text-amber-700 font-bold shrink-0">✕</button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-0.5 text-center">Sol</label>
                  <WheelPicker
                    options={ZODIAC_OPTIONS}
                    value={formData.sunSign || ''}
                    onChange={v => setFormData({ ...formData, sunSign: v })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-0.5 text-center">Luna</label>
                  <WheelPicker
                    options={ZODIAC_OPTIONS}
                    value={formData.moonSign || ''}
                    onChange={v => setFormData({ ...formData, moonSign: v })}
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 uppercase mb-0.5 text-center">Ascendente</label>
                  <WheelPicker
                    options={ZODIAC_OPTIONS}
                    value={formData.ascendantSign || ''}
                    onChange={v => setFormData({ ...formData, ascendantSign: v })}
                  />
                </div>
              </div>
            </div>

            {/* Death date */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Fallecimiento</label>
              <DateSelector
                value={formData.deathDate || ''}
                onChange={v => setFormData({ ...formData, deathDate: v })}
              />
            </div>

            {/* Twin / multiple birth */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gemelo / Mellizo</label>
                <WheelPicker
                  options={TWIN_OPTIONS}
                  value={formData.twinType || ''}
                  onChange={v => setFormData({ ...formData, twinType: v })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Orden Nacimiento</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm"
                  value={formData.birthOrder || ''}
                  onChange={e => setFormData({ ...formData, birthOrder: e.target.value })}
                  placeholder={formData.twinType ? 'Ej. 1, 2...' : '--'}
                  disabled={!formData.twinType}
                  title={!formData.twinType ? 'Selecciona un tipo de gemelo/mellizo primero' : ''}
                />
              </div>
            </div>
          </CollapsibleFieldset>

          {/* ── Collapsible: Más información ──────────────── */}
          <CollapsibleFieldset label="Más información">
            <textarea
              className="w-full p-3 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none resize-none text-sm text-gray-600"
              rows="3"
              value={formData.additionalInfo || ''}
              onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })}
              placeholder="Nacionalidad, salud, anécdotas, profesión..."
            />
          </CollapsibleFieldset>
        </div>

        {/* ── Save button ──────────────────────────────────── */}
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <Button className="w-full" onClick={() => onSave(node.id, formData)}>Guardar Cambios</Button>
        </div>
      </div>
    </div>
  );
}
