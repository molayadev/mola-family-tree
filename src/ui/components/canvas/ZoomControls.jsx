import { ZoomIn, ZoomOut } from 'lucide-react';

export default function ZoomControls({ onZoomIn, onZoomOut }) {
  return (
    <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-auto z-10">
      <button
        onClick={onZoomIn}
        className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-orange-50 active:scale-95 transition-transform"
      >
        <ZoomIn size={24} className="text-gray-600" />
      </button>
      <button
        onClick={onZoomOut}
        className="p-3 bg-white rounded-xl shadow-lg border border-gray-100 hover:bg-orange-50 active:scale-95 transition-transform"
      >
        <ZoomOut size={24} className="text-gray-600" />
      </button>
    </div>
  );
}
