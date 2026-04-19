import { useMemo, useState } from 'react';
import { ListFilter } from 'lucide-react';
import WheelPicker from './WheelPicker';
import Button from './Button';

export default function WheelInputModalSelector({
  value,
  onChange,
  options,
  placeholder = '--',
  displayValue,
  title = 'Seleccionar valor',
  icon = ListFilter,
  className = '',
  wheelClassName = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value ?? '');

  const Icon = icon;
  const canOpenModal = Boolean(Icon);

  const resolvedDisplayValue = useMemo(() => {
    if (displayValue) return displayValue;
    const selected = options.find(o => o.value === value);
    return selected?.label || '';
  }, [displayValue, options, value]);

  const open = () => {
    if (!canOpenModal) return;
    setDraftValue(value ?? '');
    setIsOpen(true);
  };

  const close = () => setIsOpen(false);
  const accept = () => {
    onChange(draftValue);
    close();
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex-1 min-h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm text-gray-700 flex items-center">
          {resolvedDisplayValue || <span className="text-gray-400">{placeholder}</span>}
        </div>

        {canOpenModal && (
          <button
            type="button"
            onClick={open}
            className="shrink-0 w-10 h-10 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-500 flex items-center justify-center transition-colors"
            title={title}
          >
            <Icon size={18} />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={close}
        >
          <div
            className="bg-[#FFF8F0] rounded-2xl shadow-2xl w-full max-w-sm p-4 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-bold text-gray-800">{title}</h4>
            <WheelPicker
              options={options}
              value={draftValue}
              onChange={setDraftValue}
              className={wheelClassName}
            />
            <div className="flex gap-2">
              <Button className="flex-1" variant="secondary" onClick={close}>Cancelar</Button>
              <Button className="flex-1" onClick={accept}>Aceptar</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
