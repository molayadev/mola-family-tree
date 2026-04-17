import { useMemo } from 'react';
import WheelPicker from './WheelPicker';

/**
 * A wheel-picker for selecting hours and minutes.
 *
 * `value` is a string "HH:mm" or empty/null.
 * `onChange(newTime)` is called when the user scrolls either column.
 */
export default function TimeWheelSelector({ value, onChange }) {
  const { hour, minute } = useMemo(() => {
    if (!value) return { hour: '', minute: '' };
    const [h, m] = value.split(':');
    return { hour: h || '', minute: m || '' };
  }, [value]);

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

  const handleHour = (v) => onChange(buildTime(v, minute));
  const handleMinute = (v) => onChange(buildTime(hour, v));

  return (
    <div className="flex gap-1.5 items-center">
      <WheelPicker options={hourOptions} value={hour} onChange={handleHour} className="flex-1" />
      <span className="text-gray-400 font-bold text-lg">:</span>
      <WheelPicker options={minuteOptions} value={minute} onChange={handleMinute} className="flex-1" />
    </div>
  );
}
