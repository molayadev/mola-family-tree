import { useRef, useEffect, useCallback } from 'react';

const ITEM_HEIGHT = 36;
const VISIBLE_ITEMS = 3;

/**
 * A scroll-snap wheel / drum picker that replaces native `<select>`.
 *
 * Props:
 *  - options    – Array of { value, label, icon? }
 *  - value      – Currently selected value
 *  - onChange   – Called with the new value when user scrolls
 *  - className  – Extra CSS classes for the outer wrapper
 */
export default function WheelPicker({ options, value, onChange, className = '' }) {
  const scrollRef = useRef(null);
  const debounceRef = useRef(null);
  const suppressScrollRef = useRef(false);

  const containerHeight = ITEM_HEIGHT * VISIBLE_ITEMS;
  const padding = (containerHeight - ITEM_HEIGHT) / 2;

  const selectedIndex = Math.max(0, options.findIndex(o => o.value === value));

  /* ── Scroll to the correct position on mount ────────────────────── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    suppressScrollRef.current = true;
    el.scrollTop = selectedIndex * ITEM_HEIGHT;
    // Allow a frame for the browser to settle before enabling scroll handler
    requestAnimationFrame(() => { suppressScrollRef.current = false; });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Re-scroll when value changes externally (e.g. auto-calc) ─── */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = selectedIndex * ITEM_HEIGHT;
    if (Math.abs(el.scrollTop - target) > 2) {
      suppressScrollRef.current = true;
      el.scrollTo({ top: target, behavior: 'smooth' });
      setTimeout(() => { suppressScrollRef.current = false; }, 300);
    }
  }, [value, selectedIndex]);

  /* ── Detect which item is centred after scrolling stops ────────── */
  const handleScroll = useCallback(() => {
    if (suppressScrollRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(idx, options.length - 1));
      if (options[clamped]?.value !== value) {
        onChange(options[clamped].value);
      }
    }, 80);
  }, [options, value, onChange]);

  /* ── Cleanup timer on unmount ─────────────────────────────────── */
  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  /* ── Click an item to scroll to it ────────────────────────────── */
  const scrollToIndex = (i) => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-orange-200 bg-white ${className}`}
      style={{ height: containerHeight }}
    >
      {/* Highlight band – sits behind the centred item */}
      <div
        className="absolute inset-x-0 pointer-events-none z-10 border-y border-orange-300 bg-orange-50/50"
        style={{ top: padding, height: ITEM_HEIGHT }}
      />

      {/* Scrollable column */}
      <div
        ref={scrollRef}
        className="h-full overflow-y-auto wheel-picker-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          WebkitOverflowScrolling: 'touch',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        }}
        onScroll={handleScroll}
      >
        {/* Top spacer so the first item can be centred */}
        <div style={{ height: padding }} />

        {options.map((opt, i) => (
          <div
            key={opt.value ?? `wp-${i}`}
            className="flex items-center justify-center text-sm select-none cursor-default"
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
            onClick={() => scrollToIndex(i)}
          >
            {opt.icon != null && <span className="mr-1">{opt.icon}</span>}
            <span className="truncate">{opt.label}</span>
          </div>
        ))}

        {/* Bottom spacer so the last item can be centred */}
        <div style={{ height: padding }} />
      </div>
    </div>
  );
}
