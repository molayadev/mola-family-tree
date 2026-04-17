import { useState, useEffect, useRef } from 'react';
import {
  X,
  ArrowDown,
  ArrowUp,
  Heart,
  HeartCrack,
  Link as LinkIcon,
  Edit2,
  Trash2,
  LogOut,
  ChevronDown,
  User,
  Waypoints,
  Wand2,
} from 'lucide-react';
import Button from '../common/Button';
import DateSelector from '../common/DateSelector';
import CollapsibleFieldset from '../common/CollapsibleFieldset';
import {
  COLORS,
  PARTNER_LABELS,
  PARENT_LABELS,
  TWIN_TYPES,
  ZODIAC_SIGNS,
  isPartnerEdgeType,
  resolveEdgeLabel,
} from '../../../domain/config/constants';
import { formatNodeDates, calculateAge } from '../../../domain/utils/dateUtils';
import useZodiac from '../../../application/hooks/useZodiac';

export default function NodeActionsModal({
  node,
  isOpen,
  onClose,
  onAction,
  // Edit props
  onSaveEdit,
  // Links props
  nodes,
  edges,
  onUpdateLink,
  onDeleteLink,
  initialTab,
  initialExpandedEdgeId,
  // Restriction flags
  hasParents,
  hasSpouse,
}) {
  const [activeTab, setActiveTab] = useState(initialTab || null);
  const [formData, setFormData] = useState(() => node ? { ...node.data } : {});
  const [localExpandedId, setLocalExpandedId] = useState(initialExpandedEdgeId || null);
  const [zodiacAlert, setZodiacAlert] = useState(null);
  const { calculateZodiac } = useZodiac();
  // Guard: prevent accidental taps on quick-action buttons right after the modal opens
  const readyRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      readyRef.current = false;
      const timer = setTimeout(() => { readyRef.current = true; }, 350);
      return () => clearTimeout(timer);
    }
    readyRef.current = false;
  }, [isOpen]);

  if (!isOpen || !node) return null;

  const nodeId = node.id;
  const nodeEdges = edges.filter(e => e.from === nodeId || e.to === nodeId);

  const handleQuickAction = (action) => {
    if (!readyRef.current) return; // Ignore accidental taps before guard expires
    onAction(action);
  };

  const handleTabClick = (tab) => {
    if (tab === 'exit') {
      onClose();
      return;
    }
    setActiveTab(activeTab === tab ? null : tab);
  };

  // ---- Links helpers ----
  const getRelationDetails = (edge) => {
    const isSourceFrom = edge.from === nodeId;
    const targetId = isSourceFrom ? edge.to : edge.from;
    const targetNode = nodes.find(n => n.id === targetId);
    if (!targetNode) return null;

    const isPartner = isPartnerEdgeType(edge.type);
    const currentLabel = resolveEdgeLabel(edge);

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
      const partners = edges.filter(e => (e.from === otherParentId || e.to === otherParentId) && isPartnerEdgeType(e.type));
      partners.forEach(pEdge => {
        const partnerId = pEdge.from === otherParentId ? pEdge.to : pEdge.from;
        if (partnerId !== edgeToEdit.from) {
          suggestions.push(partnerId);
        }
      });
    });
    return [...new Set(suggestions)];
  };

  const quickBtnClass = 'flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all active:scale-95 min-w-0 flex-1';

  const disabledBtnClass = 'flex flex-col items-center justify-center gap-1 p-3 rounded-2xl border-2 transition-all min-w-0 flex-1 opacity-40 cursor-not-allowed';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#FFF8F0] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-orange-500 px-5 py-3 flex justify-between items-center text-white shrink-0">
          <h3 className="font-bold text-base uppercase tracking-wider">Acciones</h3>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-full p-1.5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Node info */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-3">
          <div className={`p-2 rounded-full ${COLORS[node.data.gender]?.bg || COLORS.unknown.bg}`}>
            <User size={20} className={COLORS[node.data.gender]?.icon || COLORS.unknown.icon} />
          </div>
          <div>
            <span className="font-bold text-gray-800">{node.data.firstName} {node.data.lastName}</span>
            {formatNodeDates(node.data) && (
              <span className="text-xs text-gray-400 ml-2">
                {node.data.deathDate ? formatNodeDates(node.data) : `* ${formatNodeDates(node.data)}`}
              </span>
            )}
          </div>
        </div>

        {/* Quick actions row */}
        <div className="px-5 pt-2 pb-1">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Acciones rápidas</p>
          <div className="grid grid-cols-5 gap-2">
            <button
              className={`${quickBtnClass} border-orange-200 bg-white hover:bg-orange-50 hover:border-orange-400`}
              onClick={() => handleQuickAction('add_child')}
            >
              <ArrowDown size={22} className="text-orange-500" />
              <span className="text-[10px] font-bold text-gray-600">Hijo</span>
            </button>
            <button
              className={hasParents ? `${disabledBtnClass} border-gray-200 bg-gray-50` : `${quickBtnClass} border-orange-200 bg-white hover:bg-orange-50 hover:border-orange-400`}
              onClick={() => !hasParents && handleQuickAction('add_parents')}
              disabled={hasParents}
              title={hasParents ? 'Ya tiene padres registrados' : ''}
            >
              <ArrowUp size={22} className={hasParents ? 'text-gray-300' : 'text-orange-500'} />
              <span className="text-[10px] font-bold text-gray-600">{hasParents ? 'Tiene padres' : 'Padres'}</span>
            </button>
            <button
              className={hasSpouse ? `${disabledBtnClass} border-gray-200 bg-gray-50` : `${quickBtnClass} border-pink-200 bg-white hover:bg-pink-50 hover:border-pink-400`}
              onClick={() => !hasSpouse && handleQuickAction('add_spouse')}
              disabled={hasSpouse}
              title={hasSpouse ? 'Ya tiene cónyuge registrado' : ''}
            >
              <Heart size={22} className={hasSpouse ? 'text-gray-300' : 'text-pink-500'} />
              <span className="text-[10px] font-bold text-gray-600">{hasSpouse ? 'Tiene pareja' : 'Esposa'}</span>
            </button>
            <button
              className={`${quickBtnClass} border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-400`}
              onClick={() => handleQuickAction('add_ex_spouse')}
            >
              <HeartCrack size={22} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-600">Ex</span>
            </button>
            <button
              className={`${quickBtnClass} border-green-200 bg-white hover:bg-green-50 hover:border-green-400`}
              onClick={() => handleQuickAction('link')}
            >
              <Waypoints size={22} className="text-green-500" />
              <span className="text-[10px] font-bold text-gray-600">Vincular</span>
            </button>
          </div>
        </div>

        {/* Action tabs row */}
        <div className="px-5 pt-3 pb-2">
          <div className="grid grid-cols-4 gap-2">
            <button
              className={`${quickBtnClass} ${activeTab === 'links' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-purple-200 bg-white hover:bg-purple-50 hover:border-purple-400'}`}
              onClick={() => handleTabClick('links')}
            >
              <LinkIcon size={22} className={activeTab === 'links' ? 'text-purple-600' : 'text-purple-400'} />
              <span className="text-[10px] font-bold">Vínculos</span>
            </button>
            <button
              className={`${quickBtnClass} ${activeTab === 'edit' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-blue-200 bg-white hover:bg-blue-50 hover:border-blue-400'}`}
              onClick={() => handleTabClick('edit')}
            >
              <Edit2 size={22} className={activeTab === 'edit' ? 'text-blue-600' : 'text-blue-400'} />
              <span className="text-[10px] font-bold">Editar</span>
            </button>
            <button
              className={`${quickBtnClass} ${activeTab === 'delete' ? 'border-red-500 bg-red-50 text-red-700' : 'border-red-200 bg-white hover:bg-red-50 hover:border-red-400'}`}
              onClick={() => handleTabClick('delete')}
            >
              <Trash2 size={22} className={activeTab === 'delete' ? 'text-red-600' : 'text-red-400'} />
              <span className="text-[10px] font-bold">Borrar</span>
            </button>
            <button
              className={`${quickBtnClass} border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-400`}
              onClick={() => handleTabClick('exit')}
            >
              <LogOut size={22} className="text-gray-400" />
              <span className="text-[10px] font-bold text-gray-600">Salir</span>
            </button>
          </div>
        </div>

        {/* Content area */}
        {activeTab && (
          <div className="border-t border-orange-100 overflow-y-auto flex-grow">
            {/* Links Tab */}
            {activeTab === 'links' && (
              <div className="p-4 space-y-3">
                <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Vínculos de {node.data.firstName}</p>
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
            )}

            {/* Edit Tab */}
            {activeTab === 'edit' && (() => {
              const age = calculateAge(formData.birthDate, formData.deathDate);
              const ageBadge = age !== null
                ? (formData.deathDate ? `(✝ ${age} años)` : `(${age} años)`)
                : '(--)';

              const handleAutoZodiac = () => {
                const { sunSign, moonSign, ascendantSign, errors } = calculateZodiac(formData);
                const updates = {};
                if (sunSign) updates.sunSign = sunSign;
                if (moonSign) updates.moonSign = moonSign;
                if (ascendantSign) updates.ascendantSign = ascendantSign;
                if (Object.keys(updates).length > 0) {
                  setFormData(prev => ({ ...prev, ...updates }));
                }
                setZodiacAlert(errors.length > 0 ? errors : null);
              };

              return (
              <div className="p-4 space-y-4">
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Editar perfil</p>

                {/* ── Always visible: Nombre, Apellido, Género ── */}
                <div className="flex gap-4">
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                    <input
                      className="w-full p-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none"
                      value={formData.firstName || ''}
                      onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                    />
                  </div>
                  <div className="w-1/2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellido</label>
                    <input
                      className="w-full p-2 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none"
                      value={formData.lastName || ''}
                      onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Género</label>
                  <div className="flex gap-2">
                    {['male', 'female', 'unknown'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${formData.gender === g ? 'bg-orange-100 border-orange-500 text-orange-700 font-bold shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                      >
                        {g === 'male' ? 'Hombre' : g === 'female' ? 'Mujer' : 'Otro'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Collapsible: Nacimiento y Fallecimiento ── */}
                <CollapsibleFieldset label="Nacimiento y Fallecimiento" badge={ageBadge}>
                  {/* Birth date */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase">Fecha de Nacimiento</label>
                    <DateSelector
                      value={formData.birthDate || ''}
                      onChange={v => setFormData({ ...formData, birthDate: v })}
                    />
                  </div>

                  {/* Birth time */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Hora de Nacimiento</label>
                    <input
                      type="time"
                      className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm"
                      value={formData.birthTime || ''}
                      onChange={e => setFormData({ ...formData, birthTime: e.target.value })}
                    />
                  </div>

                  {/* Location (lat, lon) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Latitud</label>
                      <input
                        type="number"
                        step="any"
                        min="-90"
                        max="90"
                        className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm"
                        value={formData.birthLatitude ?? ''}
                        onChange={e => setFormData({ ...formData, birthLatitude: e.target.value })}
                        placeholder="Ej: 40.4168"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Longitud</label>
                      <input
                        type="number"
                        step="any"
                        min="-180"
                        max="180"
                        className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm"
                        value={formData.birthLongitude ?? ''}
                        onChange={e => setFormData({ ...formData, birthLongitude: e.target.value })}
                        placeholder="Ej: -3.7038"
                      />
                    </div>
                  </div>

                  {/* Zodiac signs row + magic wand button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-500 uppercase">Signos Zodiacales</label>
                      <button
                        type="button"
                        onClick={handleAutoZodiac}
                        className="flex items-center gap-1 text-xs text-orange-500 hover:text-orange-700 transition-colors"
                        title="Calcular automáticamente"
                      >
                        <Wand2 className="w-4 h-4" />
                        <span>Auto</span>
                      </button>
                    </div>

                    {/* Alert banner */}
                    {zodiacAlert && (
                      <div className="mb-2 p-2 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-800">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold mb-0.5">Datos insuficientes:</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {zodiacAlert.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                          </div>
                          <button type="button" onClick={() => setZodiacAlert(null)} className="text-amber-500 hover:text-amber-700 font-bold shrink-0">✕</button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-0.5 text-center">Sol</label>
                        <select
                          className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm bg-white text-center"
                          value={formData.sunSign || ''}
                          aria-label="Seleccionar signo solar"
                          onChange={e => setFormData({ ...formData, sunSign: e.target.value })}
                        >
                          {ZODIAC_SIGNS.map(sign => (
                            <option key={`sun-${sign.value || 'empty'}`} value={sign.value} title={sign.label}>{sign.icon} {sign.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-0.5 text-center">Luna</label>
                        <select
                          className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm bg-white text-center"
                          value={formData.moonSign || ''}
                          aria-label="Seleccionar signo lunar"
                          onChange={e => setFormData({ ...formData, moonSign: e.target.value })}
                        >
                          {ZODIAC_SIGNS.map(sign => (
                            <option key={`moon-${sign.value || 'empty'}`} value={sign.value} title={sign.label}>{sign.icon} {sign.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 uppercase mb-0.5 text-center">Ascendente</label>
                        <select
                          className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm bg-white text-center"
                          value={formData.ascendantSign || ''}
                          aria-label="Seleccionar signo ascendente"
                          onChange={e => setFormData({ ...formData, ascendantSign: e.target.value })}
                        >
                          {ZODIAC_SIGNS.map(sign => (
                            <option key={sign.value || 'empty'} value={sign.value} title={sign.label}>{sign.icon} {sign.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Death date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fecha de Fallecimiento</label>
                    <DateSelector
                      value={formData.deathDate || ''}
                      onChange={v => setFormData({ ...formData, deathDate: v })}
                    />
                  </div>

                  {/* Twin / multiple birth */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Gemelo / Mellizo</label>
                      <select
                        className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm bg-white"
                        value={formData.twinType || ''}
                        onChange={e => setFormData({ ...formData, twinType: e.target.value })}
                      >
                        {TWIN_TYPES.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Orden Nacimiento</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full p-2 rounded-lg border border-orange-200 outline-none text-sm"
                        value={formData.birthOrder || ''}
                        onChange={e => setFormData({ ...formData, birthOrder: e.target.value })}
                        placeholder={formData.twinType ? 'Ej. 1, 2...' : '--'}
                        disabled={!formData.twinType}
                        title={!formData.twinType ? 'Selecciona un tipo de gemelo/mellizo primero' : ''}
                      />
                    </div>
                  </div>
                </CollapsibleFieldset>

                {/* ── Collapsible: Más información ── */}
                <CollapsibleFieldset label="Más información">
                  <textarea
                    className="w-full p-3 rounded-lg border border-orange-200 focus:ring-2 focus:ring-orange-300 outline-none resize-none text-sm text-gray-600"
                    rows="3"
                    value={formData.additionalInfo || ''}
                    onChange={e => setFormData({ ...formData, additionalInfo: e.target.value })}
                    placeholder="Nacionalidad, salud, anécdotas, profesión..."
                  />
                </CollapsibleFieldset>

                <Button className="w-full" onClick={() => onSaveEdit(node.id, formData)}>Guardar Cambios</Button>
              </div>
              );
            })()}

            {/* Delete Tab */}
            {activeTab === 'delete' && (
              <div className="p-6 text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 size={32} className="text-red-500" />
                </div>
                <p className="text-gray-800 font-bold text-lg">¿Eliminar a {node.data.firstName}?</p>
                <p className="text-gray-500 text-sm">
                  Se eliminará a esta persona y todas sus conexiones del árbol.
                  <br />
                  <span className="text-red-500 font-bold">Esta acción no se puede deshacer.</span>
                </p>
                <div className="flex gap-3 pt-2">
                  <Button
                    className="flex-1"
                    variant="secondary"
                    onClick={() => setActiveTab(null)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1"
                    variant="danger"
                    onClick={() => onAction('delete')}
                  >
                    <Trash2 size={16} /> Eliminar
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
