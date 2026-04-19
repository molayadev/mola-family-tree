import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import WheelPicker from './WheelPicker';
import Button from './Button';

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/**
 * A day / month / year wheel-picker selector that is easier to use than
 * the native date input — especially on mobile devices and for dates
 * far in the past.
 *
 * `value` is an ISO date string "YYYY-MM-DD" or empty/null.
 * `onChange(newIsoDate)` is called whenever the user scrolls a column.
 */
export default function DateSelector({ value, onChange, minYear = 1900, maxYear, icon = CalendarDays }) {
  const today = new Date();
  const endYear = maxYear ?? today.getFullYear();
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value || '');

  const activeValue = isOpen ? draftValue : value;

  const { day, month, year } = useMemo(() => {
    if (!activeValue) return { day: '', month: '', year: '' };
    const [y, m, d] = activeValue.split('-');
    return { day: d || '', month: m || '', year: y || '' };
  }, [activeValue]);

  const daysInMonth = useMemo(() => {
    if (!year || !month) return 31;
    return new Date(Number(year), Number(month), 0).getDate();
  }, [year, month]);

  const buildDate = (d, m, y) => {
    if (!y) return '';
    const yy = y.padStart(4, '0');
    const mm = (m || '01').padStart(2, '0');
    const dd = (d || '01').padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  };

  /* ── Option lists ─────────────────────────────────────────────── */
  const dayOptions = useMemo(() => [
    { value: '', label: 'Día' },
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const v = String(i + 1).padStart(2, '0');
      return { value: v, label: String(i + 1) };
    }),
  ], [daysInMonth]);

  const monthOptions = useMemo(() => [
    { value: '', label: 'Mes' },
    ...MONTHS.map((label, i) => ({
      value: String(i + 1).padStart(2, '0'),
      label,
    })),
  ], []);

  const yearOptions = useMemo(() => [
    { value: '', label: 'Año' },
    ...Array.from({ length: endYear - minYear + 1 }, (_, i) => {
      const y = String(endYear - i);
      return { value: y, label: y };
    }),
  ], [endYear, minYear]);

  /* ── Handlers ─────────────────────────────────────────────────── */
  const handleDay = (v) => setDraftValue(buildDate(v, month, year));
  const handleMonth = (newMonth) => {
    const maxDay = new Date(Number(year) || 2000, Number(newMonth), 0).getDate();
    const clamped = Number(day) > maxDay ? String(maxDay) : day;
    setDraftValue(buildDate(clamped, newMonth, year));
  };
  const handleYear = (v) => setDraftValue(buildDate(day, month, v));

  const Icon = icon;
  const display = value
    ? `${day || 'dd'}/${month ? MONTHS[Number(month) - 1]?.toLowerCase() : 'mmm'}/${year || 'yyyy'}`
    : '';

  return (
    <>
      <div className="flex items-center gap-2">
        <input
          readOnly
          aria-label={`Fecha seleccionada: ${display || 'ninguna'}`}
          value={display || 'dd/mmm/yyyy'}
          className={`flex-1 min-h-10 px-3 rounded-lg border border-orange-200 bg-white text-sm ${display ? 'text-gray-700' : 'text-gray-400'}`}
        />

        {Icon && (
          <button
            type="button"
            onClick={() => {
              setDraftValue(value || '');
              setIsOpen(true);
            }}
            className="shrink-0 w-10 h-10 rounded-lg border border-orange-200 bg-white hover:bg-orange-50 text-orange-500 flex items-center justify-center transition-colors"
            title="Seleccionar fecha"
          >
            <Icon size={18} />
          </button>
        )}
      </div>

      {isOpen && Icon && (
        <div
          className="fixed inset-0 z-[140] bg-black/40 backdrop-blur-sm p-4 flex items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-[#FFF8F0] rounded-2xl shadow-2xl w-full max-w-md p-4 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="font-bold text-gray-800">Seleccionar fecha</h4>
            <div className="flex gap-1.5">
              <WheelPicker options={dayOptions} value={day} onChange={handleDay} className="w-[72px]" />
              <WheelPicker options={monthOptions} value={month} onChange={handleMonth} className="flex-1" />
              <WheelPicker options={yearOptions} value={year} onChange={handleYear} className="w-[96px]" />
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
