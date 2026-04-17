import { useMemo } from 'react';

const MONTHS = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

/**
 * A day / month / year dropdown selector that is easier to use than
 * the native date input — especially for dates far in the past.
 *
 * `value` is an ISO date string "YYYY-MM-DD" or empty/null.
 * `onChange(newIsoDate)` is called whenever one of the selects changes.
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

  const handleDay = (e) => onChange(buildDate(e.target.value, month, year));
  const handleMonth = (e) => {
    const newMonth = e.target.value;
    const maxDay = new Date(Number(year) || 2000, Number(newMonth), 0).getDate();
    const clamped = Number(day) > maxDay ? String(maxDay) : day;
    onChange(buildDate(clamped, newMonth, year));
  };
  const handleYear = (e) => onChange(buildDate(day, month, e.target.value));

  const selectClass = 'p-2 rounded-lg border border-orange-200 outline-none text-sm bg-white appearance-none text-center';

  return (
    <div className="flex gap-1.5">
      {/* Day */}
      <select className={`${selectClass} w-[60px]`} value={day} onChange={handleDay}>
        <option value="">Día</option>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const v = String(i + 1).padStart(2, '0');
          return <option key={v} value={v}>{i + 1}</option>;
        })}
      </select>

      {/* Month */}
      <select className={`${selectClass} flex-1`} value={month} onChange={handleMonth}>
        <option value="">Mes</option>
        {MONTHS.map((label, i) => {
          const v = String(i + 1).padStart(2, '0');
          return <option key={v} value={v}>{label}</option>;
        })}
      </select>

      {/* Year – descending so recent years are at the top */}
      <select className={`${selectClass} w-[80px]`} value={year} onChange={handleYear}>
        <option value="">Año</option>
        {Array.from({ length: endYear - minYear + 1 }, (_, i) => {
          const y = String(endYear - i);
          return <option key={y} value={y}>{y}</option>;
        })}
      </select>
    </div>
  );
}
