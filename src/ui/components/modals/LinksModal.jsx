import { useState, useEffect } from 'react';
import { Link as LinkIcon, MoreHorizontal, Trash2, Edit2, ChevronDown, User } from 'lucide-react';
import Button from '../common/Button';
import { COLORS, PARTNER_LABELS, PARENT_LABELS } from '../../../domain/config/constants';

export default function LinksModal({ state, onClose, nodes, edges, onUpdateLink, onDeleteLink }) {
  const { isOpen, nodeId, expandedEdgeId } = state;
  const [localExpandedId, setLocalExpandedId] = useState(null);

  useEffect(() => {
    if (isOpen) setLocalExpandedId(expandedEdgeId);
  }, [isOpen, expandedEdgeId]);

  if (!isOpen || !nodeId) return null;

  const nodeEdges = edges.filter(e => e.from === nodeId || e.to === nodeId);
  const mainNode = nodes.find(n => n.id === nodeId);

  const getRelationDetails = (edge) => {
    const isSourceFrom = edge.from === nodeId;
    const targetId = isSourceFrom ? edge.to : edge.from;
    const targetNode = nodes.find(n => n.id === targetId);

    if (!targetNode) return null;

    const isPartner = edge.type === 'spouse' || edge.type === 'ex_spouse' || edge.type === 'partner';
    const currentLabel = edge.label || (edge.type === 'ex_spouse' ? 'Divorciado' : (isPartner ? 'Casado/a' : 'Biológico'));

    let displayTitle = currentLabel;
    const g = targetNode.data.gender;
    if (!isPartner) {
      if (isSourceFrom) displayTitle = g === 'male' ? 'Hijo' : (g === 'female' ? 'Hija' : 'Hijo/a');
      else displayTitle = g === 'male' ? 'Padre' : (g === 'female' ? 'Madre' : 'Progenitor');
    } else {
      if (currentLabel === 'Casado/a') displayTitle = g === 'male' ? 'Esposo' : (g === 'female' ? 'Esposa' : 'Cónyuge');
      if (currentLabel === 'Divorciado') displayTitle = g === 'male' ? 'Ex-esposo' : (g === 'female' ? 'Ex-esposa' : 'Ex-cónyuge');
    }

    return { targetId, targetNode, isPartner, currentLabel, displayTitle };
  };

  const getSuggestions = (edgeToEdit) => {
    if (edgeToEdit.type === 'partner' || edgeToEdit.type === 'spouse' || edgeToEdit.type === 'ex_spouse') return [];

    const isSourceFrom = edgeToEdit.from === nodeId;
    if (isSourceFrom) return [];

    const otherParentsEdges = nodeEdges.filter(e => (e.type === 'parent' || !e.type.includes('spouse')) && e.to === nodeId && e.id !== edgeToEdit.id);
    let suggestions = [];

    otherParentsEdges.forEach(opEdge => {
      const otherParentId = opEdge.from;
      const partners = edges.filter(e => (e.from === otherParentId || e.to === otherParentId) && ['spouse', 'ex_spouse', 'partner'].includes(e.type));
      partners.forEach(pEdge => {
        const partnerId = pEdge.from === otherParentId ? pEdge.to : pEdge.from;
        if (partnerId !== edgeToEdit.from) {
          suggestions.push(partnerId);
        }
      });
    });
    return [...new Set(suggestions)];
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#FFF8F0] w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

        <div className="bg-purple-500 p-4 flex justify-between items-center text-white shrink-0">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg flex items-center gap-2"><LinkIcon size={20} /> Vínculos</h3>
            <span className="text-xs text-purple-100 opacity-80">{mainNode?.data.firstName} {mainNode?.data.lastName}</span>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 rounded-full p-2 transition-colors"><MoreHorizontal size={20} /></button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-grow">
          {nodeEdges.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-4">No hay vínculos registrados para esta persona.</p>
          ) : (
            nodeEdges.map(edge => {
              const details = getRelationDetails(edge);
              if (!details) return null;
              const { targetId, targetNode, isPartner, currentLabel, displayTitle } = details;
              const suggestions = getSuggestions(edge);
              const isExpanded = localExpandedId === edge.id;

              return (
                <div key={edge.id} className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-sm ${isExpanded ? 'border-purple-300 ring-4 ring-purple-50' : 'border-gray-100 hover:border-purple-200'}`}>

                  <div
                    className="p-4 flex justify-between items-center cursor-pointer select-none"
                    onClick={() => setLocalExpandedId(isExpanded ? null : edge.id)}
                  >
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">{displayTitle}</span>
                      <span className="text-gray-800 font-semibold">{targetNode.data.firstName} {targetNode.data.lastName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-400">
                      {isExpanded ? <ChevronDown size={18} className="transform rotate-180" /> : <Edit2 size={16} className="opacity-50" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 pt-0 border-t border-gray-50 bg-gray-50/50 space-y-4 animate-in slide-in-from-top-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Estado de la Relación</label>
                        <select
                          className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-purple-400 outline-none text-sm text-gray-700 bg-white shadow-sm"
                          value={currentLabel}
                          onChange={(e) => onUpdateLink(edge.id, { label: e.target.value })}
                        >
                          {(isPartner ? PARTNER_LABELS : PARENT_LABELS).map(l => (
                            <option key={l} value={l}>{l}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Persona Vinculada</label>
                        <select
                          className="w-full p-2.5 rounded-xl border border-gray-200 focus:border-purple-400 outline-none text-sm text-gray-700 bg-white shadow-sm"
                          value={targetId}
                          onChange={(e) => onUpdateLink(edge.id, { targetId: e.target.value })}
                        >
                          <option value={targetId}>{targetNode.data.firstName} {targetNode.data.lastName}</option>
                          <option value="NEW">✨ Crear y enlazar nueva persona...</option>

                          {suggestions.length > 0 && (
                            <optgroup label="Sugerencias inteligentes">
                              {suggestions.map(sId => {
                                const s = nodes.find(n => n.id === sId);
                                if (!s) return null;
                                return <option key={sId} value={sId}>{s.data.firstName} {s.data.lastName}</option>;
                              })}
                            </optgroup>
                          )}

                          <optgroup label="Todos los familiares en el árbol">
                            {nodes.filter(n => n.id !== nodeId && n.id !== targetId).map(n => (
                              <option key={n.id} value={n.id}>{n.data.firstName} {n.data.lastName}</option>
                            ))}
                          </optgroup>
                        </select>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => onDeleteLink(edge.id)}
                          className="flex items-center gap-1 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 px-3 py-2 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} /> Eliminar Vínculo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="p-4 bg-white border-t border-gray-100 shrink-0">
          <Button className="w-full" onClick={onClose} variant="secondary">Hecho</Button>
        </div>
      </div>
    </div>
  );
}
