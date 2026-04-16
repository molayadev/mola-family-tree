import {
  ArrowUp,
  ArrowDown,
  Heart,
  HeartCrack,
  Edit2,
  Trash2,
  Link as LinkIcon,
} from 'lucide-react';

export default function RadialMenu({ x, y, onClose, onAction, zoom }) {
  const scale = 1 / Math.max(0.5, zoom);

  const btnStyle = 'absolute w-14 h-14 bg-white rounded-full shadow-xl border-2 border-orange-100 flex items-center justify-center hover:bg-orange-50 active:scale-95 transition-all';
  const textStyle = 'absolute top-16 bg-white/95 px-3 py-1 rounded-lg text-xs font-semibold text-gray-700 shadow-md whitespace-nowrap pointer-events-none';

  return (
    <div
      className="absolute pointer-events-none z-50 flex items-center justify-center"
      style={{ left: x, top: y, width: 0, height: 0 }}
    >
      <div
        className="relative pointer-events-auto animate-in fade-in zoom-in duration-200"
        style={{ transform: `scale(${scale})` }}
      >
        <div className="absolute -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full border-2 border-orange-200/50 pointer-events-none"></div>

        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -28, top: -138 }} onClick={(e) => { e.stopPropagation(); onAction('add_parents'); }}>
          <div className={btnStyle}><ArrowUp size={24} className="text-orange-500" /></div>
          <span className={textStyle}>Padres</span>
        </div>

        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -28, top: 82 }} onClick={(e) => { e.stopPropagation(); onAction('add_child'); }}>
          <div className={btnStyle}><ArrowDown size={24} className="text-orange-500" /></div>
          <span className={textStyle}>Hijo</span>
        </div>

        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: 82, top: -28 }} onClick={(e) => { e.stopPropagation(); onAction('add_spouse'); }}>
          <div className={btnStyle}><Heart size={24} className="text-pink-500" /></div>
          <span className={textStyle}>Cónyuge</span>
        </div>

        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: 50, top: 50 }} onClick={(e) => { e.stopPropagation(); onAction('add_ex_spouse'); }}>
          <div className={`${btnStyle} border-gray-200 hover:bg-gray-50`}><HeartCrack size={24} className="text-gray-400" /></div>
          <span className={textStyle}>Ex-pareja</span>
        </div>

        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -138, top: -28 }} onClick={(e) => { e.stopPropagation(); onAction('edit'); }}>
          <div className={btnStyle}><Edit2 size={24} className="text-blue-500" /></div>
          <span className={textStyle}>Editar</span>
        </div>

        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -106, top: -106 }} onClick={(e) => { e.stopPropagation(); onAction('manage_links'); }}>
          <div className={`${btnStyle} border-purple-200 hover:bg-purple-50`}><LinkIcon size={24} className="text-purple-500" /></div>
          <span className={textStyle}>Vínculos</span>
        </div>

        <div className="absolute flex flex-col items-center cursor-pointer group" style={{ left: -106, top: 50 }} onClick={(e) => { e.stopPropagation(); onAction('delete'); }}>
          <div className={`${btnStyle} border-red-100 hover:bg-red-50`}><Trash2 size={24} className="text-red-500" /></div>
          <span className={textStyle}>Eliminar</span>
        </div>
      </div>
      <div className="fixed inset-0 z-[-1]" onClick={onClose}></div>
    </div>
  );
}
