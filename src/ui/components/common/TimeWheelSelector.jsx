import { useMemo, useState } from 'react';
import { Clock3 } from 'lucide-react';
import WheelPicker from './WheelPicker';
import Button from './Button';

/**
 * A wheel-picker for selecting hours and minutes.
 *
 * `value` is a string "HH:mm" or empty/null.
 * `onChange(newTime)` is called when the user scrolls either column.
 */
export default function TimeWheelSelector({ value, onChange, icon = Clock3 }) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value || '');
  const activeValue = isOpen ? draftValue : value;
  const { hour, minute } = useMemo(() => {
    if (!activeValue) return { hour: '', minute: '' };
    const [h, m] = activeValue.split(':');
    return { hour: h || '', minute: m || '' };
  }, [activeValue]);

  const hourOptions = useMemo(() => [
    { value: '', label: 'HH' },
    ...Array.from({ length: 24 }, (_, i) => {
      const v = String(i).padStart(2, '0');
      return { value: v, label: v };
    }),
  ], []);

  const minuteOptions = useMemo(() => [
    { value: '', label: 'MM' },
    ...Array.from({ length: 60 }, (_, i) => {
      const v = String(i).padStart(2, '0');
      return { value: v, label: v };
    }),
  ], []);

  const buildTime = (h, m) => {
    if (!h && !m) return '';
    return `${h || '00'}:${m || '00'}`;
  };

  const handleHour = (v) => setDraftValue(buildTime(v, minute));
  const handleMinute = (v) => setDraftValue(buildTime(hour, v));
  const Icon = icon;
  const open = () => {
    setDraftValue(value || '');
    setIsOpen(true);
  };
  const onInputKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    open();
  };
  const display = value || '';

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          readOnly
          role="button"
          tabIndex={0}
          aria-label={`Hora seleccionada: ${display || 'ninguna'}`}
          value={display || 'HH:mm'}
          onClick={open}
          onKeyDown={onInputKeyDown}
          className={`flex-1 min-h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm ${display ? 'text-gray-700' : 'text-gray-400'}`}
        />
        {Icon && (
          <button
            type="button"
            onClick={open}
            className="shrink-0 w-10 h-10 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-500 flex items-center justify-center transition-colors"
            title="Seleccionar hora"
          >
            <Icon size={18} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#FFF8F0] rounded-2xl shadow-2xl w-full max-w-sm p-4 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-bold text-gray-800">Seleccionar hora</h4>
            <div className="flex gap-1.5 items-center">
              <WheelPicker options={hourOptions} value={hour} onChange={handleHour} className="flex-1" />
              <span className="text-gray-400 font-bold text-lg">:</span>
              <WheelPicker options={minuteOptions} value={minute} onChange={handleMinute} className="flex-1" />
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" variant="secondary" onClick={() => setIsOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1"
                onClick={() => {
                  onChange(draftValue);
                  setIsOpen(false);
                }}
              >
                Aceptar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
