import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

/**
 * A collapsible fieldset wrapper.
 *
 * Props:
 *  - label       – header text
 *  - badge       – optional short text shown next to the label (e.g. age)
 *  - defaultOpen – whether the section starts expanded (default: false)
 *  - children    – content rendered when expanded
 */
export default function CollapsibleFieldset({ label, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <fieldset className="border border-orange-200 rounded-xl overflow-hidden">
      <legend className="contents">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-bold text-gray-500 uppercase tracking-wider hover:bg-orange-50 transition-colors"
        >
          {open
            ? <ChevronDown className="w-4 h-4 text-orange-400 shrink-0" />
            : <ChevronRight className="w-4 h-4 text-orange-400 shrink-0" />
          }
          <span>{label}</span>
          {badge && (
            <span className="ml-auto text-[11px] font-semibold text-orange-500 normal-case tracking-normal">
              {badge}
            </span>
          )}
        </button>
      </legend>
      {open && <div className="px-3 pb-3 space-y-3">{children}</div>}
    </fieldset>
  );
}
