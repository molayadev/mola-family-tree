import { useMemo } from 'react';
import WheelPicker from './WheelPicker';

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
export default function DateSelector({ value, onChange, minYear = 1900, maxYear }) {
  const today = new Date();
  const endYear = maxYear ?? today.getFullYear();

  const { day, month, year } = useMemo(() => {
    if (!value) return { day: '', month: '', year: '' };
    const [y, m, d] = value.split('-');
    return { day: d || '', month: m || '', year: y || '' };
  }, [value]);

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
  const handleDay = (v) => onChange(buildDate(v, month, year));
  const handleMonth = (newMonth) => {
    const maxDay = new Date(Number(year) || 2000, Number(newMonth), 0).getDate();
    const clamped = Number(day) > maxDay ? String(maxDay) : day;
    onChange(buildDate(clamped, newMonth, year));
  };
  const handleYear = (v) => onChange(buildDate(day, month, v));

  return (
    <div className="flex gap-1.5">
      <WheelPicker options={dayOptions} value={day} onChange={handleDay} className="w-[60px]" />
      <WheelPicker options={monthOptions} value={month} onChange={handleMonth} className="flex-1" />
      <WheelPicker options={yearOptions} value={year} onChange={handleYear} className="w-[80px]" />
    </div>
  );
}
