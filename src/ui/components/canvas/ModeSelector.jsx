/**
 * ModeSelector - Component para cambiar entre MODO GENEALÓGICO y MODO ATÓMICO
 * Responsive: funciona en desktop y mobile
 */

import { Users, Zap } from 'lucide-react';

export default function ModeSelector({ currentMode, onModeChange }) {
  const modes = [
    {
      id: 'genealogic',
      label: 'Genealógico',
      shortLabel: 'Gen.',
      icon: Users,
      description: 'Vista tradicional de árbol genealógico',
    },
    {
      id: 'atomic',
      label: 'Atómico',
      shortLabel: 'Atm.',
      icon: Zap,
      description: 'Núcleos familiares como átomos colapsables',
    },
  ];

  return (
    <div className="fixed top-20 left-4 md:top-28 md:left-6 z-50 pointer-events-auto">
      <div className="flex gap-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-1.5 border border-orange-200">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = currentMode === mode.id;

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              title={mode.description}
              className={`
                group relative px-3 md:px-4 py-2.5 rounded-xl transition-all duration-200
                flex items-center gap-2 font-medium text-sm whitespace-nowrap
                ${isActive
                  ? 'bg-orange-500 text-white shadow-md scale-105'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 hover:scale-105'
                }
              `}
            >
              <Icon size={20} />
              <span className="hidden sm:inline">{mode.label}</span>
              <span className="inline sm:hidden">{mode.shortLabel}</span>

              {/* Tooltip */}
              <div className="
                absolute bottom-full mb-3 left-1/2 -translate-x-1/2
                bg-gray-900 text-white text-xs px-3 py-2 rounded-lg
                whitespace-nowrap pointer-events-none
                opacity-0 group-hover:opacity-100 transition-opacity duration-200
              ">
                {mode.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
